// "Nōkabe Wall Crunch" (Japanese Game-Show "Hole in the Wall"): sliding styrofoam wall
// kinematics, 4-DOF limb pose-matching clearance model (Clean Pass / Foam Graze / Wall Crunch),
// moving-goalpost shifts, painted fake cutouts, dunk-tank knockback & buoyancy bobbing,
// Dry Champion vs. Dunk-Tank Canary (First Splash) rules, and 10s–120s scaling.
// Pure logic (no Three.js, no DOM) for Node unit tests & headless fallback.

import { MAX_NAMES } from './data-rules.js';

export const MIN_NOKABE_PLAYERS = 2;
export const MAX_NOKABE_PLAYERS = MAX_NAMES; // 30

export const NOKABE_DURATIONS = [
  { seconds: 120, variant: 'championship', label: '120s', text: '120s · Grand Tokyo Soundstage Championship' },
  { seconds: 60, variant: 'championship', label: '60s', text: '60s · Grand Tokyo Soundstage Championship' },
  { seconds: 30, variant: 'episode', label: '30s', text: '30s · Full Variety-Show Episode' },
  { seconds: 15, variant: 'blitz', label: '15s', text: '15s · Prime-Time 3-Wall Blitz' },
  { seconds: 10, variant: 'blitz', label: '10s', text: '10s · Prime-Time 3-Wall Blitz' },
];
export const DEFAULT_NOKABE_DURATION = 15;
export const DEFAULT_NOKABE_RULE = 'dry';

export function normalizeNokabeDuration(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_NOKABE_DURATION;
  let best = NOKABE_DURATIONS[0].seconds;
  let dist = Math.abs(n - best);
  for (const step of NOKABE_DURATIONS) {
    const d = Math.abs(n - step.seconds);
    if (d < dist) { best = step.seconds; dist = d; }
  }
  return best;
}

export function nokabeVariant(seconds) {
  const s = normalizeNokabeDuration(seconds);
  if (s <= 15) return { id: 'blitz', label: 'Prime-Time 3-Wall Blitz', walls: 3 };
  if (s <= 30) return { id: 'episode', label: 'Full Variety-Show Episode', walls: 6 };
  return { id: 'championship', label: 'Grand Tokyo Soundstage Championship', walls: 9 };
}

/** Exact dev-humor popups from docs/Nōkabe_wall_crunch_game_show_hole_in_the_wall_game_mode_spec.md. */
export const NOKABE_POPUPS = {
  warmup: [
    'Group policy hotfix stops SQL Server restarts',
    'URL edits banned. Breaks reports. Fix: add ?ReturnUrl=',
  ],
  pretzel: [
    'Yuiitsu-kakka blames you for not being clear',
    'Yuiitsu-kakka derailed by common sense again',
  ],
  goalpost: [
    "Muriyari security feature bakuha'd prod",
    'Renamed the dbo.user table to dbo.user-x!',
  ],
  trap: [
    '16+ char passwords deprecated in v2',
    'Blocked by PanganodSilab 502',
    'BadalJwala 502 wall-slammed you!',
  ],
  graze: [
    '自己責任！ Tables secretly recreated from scratch',
  ],
};

/** 4-DOF target poses for each cutout silhouette shape. */
export const POSE_PRESETS = {
  tpose: { label: 'SIMPLE HOTFIX', torso: 0, leftArm: 1.52, rightArm: -1.52, legs: 0.25 },
  pretzel: { label: 'WCAG PRETZEL', torso: 0.42, leftArm: 2.55, rightArm: -0.65, legs: 0.72 },
  salute: { label: 'MID-SPRINT PIVOT', torso: -0.35, leftArm: 0.35, rightArm: -2.65, legs: 0.55 },
  keyhole: { label: 'PROD CUTOVER', torso: 0, leftArm: 2.85, rightArm: -2.85, legs: 0.12 },
};

export const POOL_Y = -3.6;
export const WALL_START_Z = -32.0;
export const DOCK_Z = 0.0;

const HELMET_COLORS = ['#ff4d6d', '#38bdf8', '#4ade80', '#facc15', '#c084fc', '#fb923c', '#2dd4bf', '#f472b6'];

function pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export class NokabeSim {
  constructor({ names, duration = DEFAULT_NOKABE_DURATION, rule = DEFAULT_NOKABE_RULE, rng = Math.random }) {
    if (!Array.isArray(names) || names.length < MIN_NOKABE_PLAYERS || names.length > MAX_NOKABE_PLAYERS) {
      throw new Error(`Nōkabe Wall Crunch requires ${MIN_NOKABE_PLAYERS}–${MAX_NOKABE_PLAYERS} players.`);
    }
    this.rng = rng;
    this.duration = normalizeNokabeDuration(duration);
    this.rule = rule === 'canary' ? 'canary' : 'dry';
    this.variant = nokabeVariant(this.duration);
    this.time = 0;
    this.done = false;
    this.winner = null;
    this.events = [];

    const n = names.length;
    this.dockHalfW = clamp(5.8 + n * 0.26, 6.8, 12.8);
    this.bayCount = n <= 4 ? 1 : n <= 10 ? 2 : n <= 18 ? 3 : 4;
    this.targetWinnerId = Math.floor(rng() * n);

    // Build incoming styrofoam walls schedule (final wall impacts cleanly at 0.88 * duration)
    const wallCount = this.variant.walls;
    const firstImpact = Math.min(3.6, this.duration * 0.3);
    const lastImpact = this.duration * 0.88;
    const poseSeq = ['tpose', 'pretzel', 'salute', 'keyhole'];
    this.walls = [];
    for (let w = 0; w < wallCount; w++) {
      const frac = wallCount === 1 ? 1 : w / (wallCount - 1);
      const impactAt = firstImpact + frac * (lastImpact - firstImpact);
      const travelTime = clamp((lastImpact - firstImpact) / Math.max(1, wallCount - 1) * 0.82, 2.2, 3.8);
      const poseKind = w === wallCount - 1 ? 'keyhole' : poseSeq[w % poseSeq.length];
      const bays = [];
      const span = this.dockHalfW * 1.48;
      for (let b = 0; b < this.bayCount; b++) {
        const bx = this.bayCount === 1 ? 0 : -span / 2 + (b / (this.bayCount - 1)) * span;
        bays.push({ x: bx, isFake: false });
      }
      // On mid-round walls with 2+ bays, occasionally mark one extra painted fake cutout
      const hasFakeTrap = w > 0 && w < wallCount - 1 && this.bayCount >= 2;
      const fakeX = hasFakeTrap ? (rng() < 0.5 ? -this.dockHalfW * 0.84 : this.dockHalfW * 0.84) : null;
      const goalpostShift = w > 0 && w % 2 === 1 ? (rng() < 0.5 ? -1.4 : 1.4) : 0;

      this.walls.push({
        index: w,
        poseKind,
        label: POSE_PRESETS[poseKind].label,
        startAt: Math.max(0.4, impactAt - travelTime),
        impactAt,
        travelTime,
        z: WALL_START_Z,
        active: false,
        announced: false,
        passed: false,
        bays,
        fakeX,
        goalpostShift,
        shifted: false,
        isFinal: w === wallCount - 1,
      });
    }

    // Assign scripted failure walls to non-winners (spread across walls, keeping runner-up for final wall!)
    const others = [];
    for (let i = 0; i < n; i++) if (i !== this.targetWinnerId) others.push(i);
    for (let i = others.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [others[i], others[j]] = [others[j], others[i]];
    }
    const failWallMap = new Map();
    others.forEach((id, idx) => {
      if (idx === others.length - 1) {
        failWallMap.set(id, wallCount - 1);
      } else {
        const wave = Math.floor((idx / Math.max(1, others.length - 1)) * Math.max(1, wallCount - 1));
        failWallMap.set(id, clamp(wave, 0, wallCount - 1));
      }
    });

    const flavors = ['warmup', 'pretzel', 'goalpost', 'trap'];
    const winnerGrazeWall = wallCount >= 2 ? wallCount - 2 : -1;

    this.devs = names.map((name, i) => {
      const startX = n === 1 ? 0 : -this.dockHalfW * 0.82 + (i / (n - 1)) * (this.dockHalfW * 1.64);
      const isWinner = i === this.targetWinnerId;
      return {
        id: i,
        name,
        color: HELMET_COLORS[i % HELMET_COLORS.length],
        x: startX,
        targetX: startX,
        y: 0,
        z: DOCK_Z + ((i % 3) - 1) * 0.25,
        vx: 0,
        vy: 0,
        vz: 0,
        pose: { torso: 0, leftArm: 0.2, rightArm: -0.2, legs: 0.1 },
        state: 'dock', // 'dock' | 'flying' | 'swimming'
        dunkedAt: Infinity,
        isTargetWinner: isWinner,
        failWall: this.rule === 'dry' ? (isWinner ? -1 : (failWallMap.get(i) ?? 0)) : (isWinner ? 0 : -1),
        failFlavor: flavors[i % flavors.length],
        grazeWall: isWinner ? winnerGrazeWall : -1,
        bobPhase: rng() * Math.PI * 2,
        wobbleT: 0,
      };
    });
  }

  emit(e) {
    this.events.push(e);
  }

  drainEvents() {
    const out = this.events;
    this.events = [];
    return out;
  }

  dryCount() {
    let c = 0;
    for (const d of this.devs) if (d.state === 'dock') c++;
    return c;
  }

  activeWall() {
    return this.walls.find((w) => w.active && !w.passed) ?? null;
  }

  evaluateWallImpact(wall) {
    wall.passed = true;
    const preset = POSE_PRESETS[wall.poseKind];
    const wallSpeed = Math.abs(WALL_START_Z) / wall.travelTime;
    let waveDunks = 0;

    for (const dev of this.devs) {
      if (dev.state !== 'dock') continue;

      const shouldFail = this.rule === 'dry'
        ? (!dev.isTargetWinner && dev.failWall <= wall.index)
        : dev.isTargetWinner;

      if (shouldFail) {
        dev.state = 'flying';
        dev.dunkedAt = this.time;
        dev.vz = wallSpeed * 0.62 + 3.5;
        dev.vy = 5.4 + this.rng() * 1.8;
        dev.vx = (this.rng() - 0.5) * 3.2;
        waveDunks++;
        const pool = wall.goalpostShift !== 0 && dev.failFlavor === 'goalpost'
          ? NOKABE_POPUPS.goalpost
          : wall.fakeX !== null && dev.failFlavor === 'trap'
            ? NOKABE_POPUPS.trap
            : wall.poseKind === 'pretzel'
              ? NOKABE_POPUPS.pretzel
              : NOKABE_POPUPS.warmup;
        this.emit({
          type: 'crunch',
          dev,
          wall,
          popup: pick(pool, this.rng),
          remaining: this.dryCount(),
        });

        if (this.rule === 'canary' && !this.winner) {
          this.winner = dev;
          this.done = true;
          this.emit({ type: 'winner', dev });
          return;
        }
      } else if (dev.grazeWall === wall.index) {
        // Dramatic KIRI-KIRI CLEAR! foam graze near-miss
        dev.wobbleT = 1.1;
        this.emit({
          type: 'graze',
          dev,
          popup: pick(NOKABE_POPUPS.graze, this.rng),
        });
      } else {
        // Clean pass!
        dev.pose = { ...preset };
      }
    }

    this.emit({ type: 'wallClear', wall, waveDunks, remaining: this.dryCount() });

    // Check Dry Champion completion
    const dry = this.devs.filter((d) => d.state === 'dock');
    if (this.rule === 'dry' && (dry.length <= 1 || wall.isFinal)) {
      const champ = dry.find((d) => d.isTargetWinner) ?? dry[0] ?? this.devs[this.targetWinnerId];
      for (const d of dry) {
        if (d !== champ) {
          d.state = 'flying';
          d.dunkedAt = this.time;
          d.vz = wallSpeed * 0.65 + 4.0;
          d.vy = 5.8;
        }
      }
      this.winner = champ;
      this.done = true;
      this.emit({ type: 'winner', dev: champ });
    }
  }

  step(dt) {
    this.time += dt;
    const t = this.time;

    // Advance incoming styrofoam walls
    if (!this.done) {
      for (const wall of this.walls) {
        if (!wall.announced && t >= wall.startAt) {
          wall.announced = true;
          wall.active = true;
          this.emit({ type: 'wallStart', wall, remaining: this.dryCount() });
        }
        if (wall.active && !wall.passed) {
          const p = clamp((t - wall.startAt) / wall.travelTime, 0, 1);
          // Smooth accelerating rail curve: z_start -> z_dock
          wall.z = WALL_START_Z + (DOCK_Z - WALL_START_Z) * (0.65 * p + 0.35 * p * p);
          if (wall.goalpostShift !== 0 && !wall.shifted && p >= 0.62) {
            wall.shifted = true;
            for (const b of wall.bays) {
              b.x = clamp(b.x + wall.goalpostShift, -this.dockHalfW * 0.82, this.dockHalfW * 0.82);
            }
            this.emit({ type: 'goalpost', wall });
          }
          if (t >= wall.impactAt) {
            wall.z = DOCK_Z;
            this.evaluateWallImpact(wall);
          }
        } else if (wall.passed && wall.active) {
          // Let wall glide past dock & fade out behind
          wall.z += 16 * dt;
          if (wall.z > 14) wall.active = false;
        }
      }
    }

    // Update dev scrambling, 4-DOF pose convergence, knockback flight & dunk-tank buoyancy
    const incoming = this.activeWall();
    const targetPreset = incoming ? POSE_PRESETS[incoming.poseKind] : POSE_PRESETS.tpose;
    const damp = Math.min(1, dt * 6.5);

    for (const dev of this.devs) {
      if (dev.state === 'dock') {
        if (dev.wobbleT > 0) dev.wobbleT = Math.max(0, dev.wobbleT - dt);
        if (incoming) {
          const willFail = this.rule === 'dry'
            ? (!dev.isTargetWinner && dev.failWall <= incoming.index)
            : dev.isTargetWinner;
          // Pick nearest open bay (or drift off-center / into fake cutout if scheduled to fail)
          let bestBay = incoming.bays[0];
          let bestD = Infinity;
          for (const b of incoming.bays) {
            const d = Math.abs(dev.x - b.x);
            if (d < bestD) { bestD = d; bestBay = b; }
          }
          dev.targetX = willFail
            ? (incoming.fakeX !== null && dev.failFlavor === 'trap'
              ? incoming.fakeX
              : clamp(bestBay.x + (dev.id % 2 === 0 ? 1.85 : -1.85), -this.dockHalfW * 0.9, this.dockHalfW * 0.9))
            : clamp(bestBay.x + ((dev.id % 3) - 1) * 0.22, -this.dockHalfW * 0.9, this.dockHalfW * 0.9);
          dev.x += (dev.targetX - dev.x) * Math.min(1, dt * 3.8);

          // Converge 4-DOF limb pose (failers strike hilariously wrong poses!)
          const want = willFail
            ? { torso: -targetPreset.torso * 1.2, leftArm: -0.4, rightArm: 0.4, legs: 0.85 }
            : targetPreset;
          dev.pose.torso += (want.torso - dev.pose.torso) * damp;
          dev.pose.leftArm += (want.leftArm - dev.pose.leftArm) * damp;
          dev.pose.rightArm += (want.rightArm - dev.pose.rightArm) * damp;
          dev.pose.legs += (want.legs - dev.pose.legs) * damp;
        }
      } else if (dev.state === 'flying') {
        dev.vy -= 22.0 * dt;
        dev.x += dev.vx * dt;
        dev.y += dev.vy * dt;
        dev.z += dev.vz * dt;
        if (dev.y <= POOL_Y) {
          dev.y = POOL_Y;
          dev.state = 'swimming';
          this.emit({ type: 'splash', dev, x: dev.x, z: dev.z });
        }
      } else if (dev.state === 'swimming') {
        // Buoyant sine-wave bobbing in the turquoise dunk tank!
        dev.y = POOL_Y + Math.sin(t * 3.2 + dev.bobPhase) * 0.22;
      }
    }

    // Hard duration safeguard
    if (!this.done && t >= this.duration) {
      const pickDev = this.devs[this.targetWinnerId];
      this.winner = pickDev;
      this.done = true;
      this.emit({ type: 'winner', dev: pickDev });
    }
  }

  standings() {
    return [...this.devs].sort((a, b) => {
      if (a === this.winner) return -1;
      if (b === this.winner) return 1;
      if ((a.state === 'dock') !== (b.state === 'dock')) return a.state === 'dock' ? -1 : 1;
      return b.dunkedAt - a.dunkedAt;
    });
  }
}

/** Runs a full Nōkabe Wall Crunch match headlessly (for unit tests & no-WebGL fallback). */
export function runNokabeHeadless(names, { duration = DEFAULT_NOKABE_DURATION, rule = DEFAULT_NOKABE_RULE, rng = Math.random } = {}) {
  const sim = new NokabeSim({ names, duration, rule, rng });
  const maxTime = normalizeNokabeDuration(duration) + 4;
  while (!sim.done && sim.time < maxTime) sim.step(1 / 60);
  return sim;
}
