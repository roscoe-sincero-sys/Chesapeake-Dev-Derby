// "Rum-Shop Domino Slam" (Table-Shaking Shockwave Survival): fairness-first 1/N pre-rolled
// tabletop survival simulation with colossal double-six POSE! slams, 0-0 Deadlock freezes,
// KNOCK-KNOCK! vertical tremors, radial shockwave knockback impulses, 2.5D tabletop friction,
// gravity edge drops, Champion vs. Six-Love rules, and 10s–120s duration scaling.
// Pure logic (no Three.js, no DOM), so it runs in Node for unit tests and headless fallback.

import { MAX_NAMES } from './data-rules.js';

export const MIN_DOMINO_PLAYERS = 2;
export const MAX_DOMINO_PLAYERS = MAX_NAMES; // 30

export const DOMINO_DURATIONS = [
  { seconds: 120, variant: 'championship', label: '120s', text: '120s · First-to-Six Championship' },
  { seconds: 60, variant: 'championship', label: '60s', text: '60s · First-to-Six Championship' },
  { seconds: 30, variant: 'clash', label: '30s', text: '30s · Bottom-House Clash' },
  { seconds: 15, variant: 'blitz', label: '15s', text: '15s · Quick Hand Blitz' },
  { seconds: 10, variant: 'blitz', label: '10s', text: '10s · Quick Hand Blitz' },
];
export const DEFAULT_DOMINO_DURATION = 15;
export const DEFAULT_DOMINO_RULE = 'champion';

export function normalizeDominoDuration(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_DOMINO_DURATION;
  let best = DOMINO_DURATIONS[0].seconds;
  let dist = Math.abs(n - best);
  for (const step of DOMINO_DURATIONS) {
    const d = Math.abs(n - step.seconds);
    if (d < dist) { best = step.seconds; dist = d; }
  }
  return best;
}

export function dominoVariant(seconds) {
  const s = normalizeDominoDuration(seconds);
  if (s <= 15) return { id: 'blitz', label: 'Quick Hand Blitz', slams: 6, knocks: 1 };
  if (s <= 30) return { id: 'clash', label: 'Bottom-House Clash', slams: 10, knocks: 2 };
  return { id: 'championship', label: 'First-to-Six Championship', slams: 14, knocks: 3 };
}

/** Exact dev-humor popups from docs/rum_shop_domino_slam_game_mode_spec.md. */
export const DOMINO_POPUPS = {
  pose: [
    'POSE! Prod is down — PANAGAN!',
    "Zabardasti feature paksit'd prod",
    'Mandatory untested script deploy',
  ],
  deadlock: [
    'Blocked by 800 column table!',
    'Blocked by pan-os software license',
    'Blocked by PanganodSilab 500',
  ],
  knock: [
    'Passing the ticket to another team',
    'URL edits banned. Fix: add ?ReturnUrl=',
  ],
  cup: [
    "Tumba'd the user table!",
    'Knocked off by BadalJwala 500',
    'Got blamed for not being clear',
  ],
  pinch: [
    'Nag-inusarang Agalon derailed by common sense again',
    "Failed to read Ekmaatra-ji's mind",
  ],
};

export const TABLE_HALF_W = 11.5;
export const TABLE_HALF_D = 8.2;
export const TILE_W = 3.2;
export const TILE_D = 1.6;
export const TILE_H = 0.55;
export const SHADOW_LEAD = 0.8;

const PLAYER_COLORS = [
  '#ff6b6b', '#4dabf7', '#51cf66', '#ffd43b', '#cc5de8', '#ff922b',
  '#20c997', '#f06595', '#748ffc', '#a9e34b', '#3bc9db', '#fcc419',
];

function pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

/** Pre-generates a clean non-overlapping chain of domino slams across the hardwood tabletop. */
export function buildDominoSlams(duration, rng) {
  const variant = dominoVariant(duration);
  const firstSlam = Math.min(2.2, duration * 0.16);
  const finalSlam = duration * 0.88;
  const count = variant.slams;

  // Deterministic non-overlapping tabletop coordinates spiraling outward from center (6-6 POSE!)
  const spots = [
    { x: 0, z: 0, rot: 0, a: 6, b: 6, kind: 'pose' },
    { x: 3.6, z: 0.2, rot: 0, a: 6, b: 4, kind: 'chain' },
    { x: -3.6, z: -0.2, rot: 0, a: 6, b: 3, kind: 'chain' },
    { x: 0.1, z: -3.0, rot: Math.PI / 2, a: 0, b: 0, kind: 'deadlock' },
    { x: 6.2, z: -2.4, rot: Math.PI / 2, a: 4, b: 5, kind: 'pinch' },
    { x: -6.2, z: 2.4, rot: Math.PI / 2, a: 3, b: 2, kind: 'pinch' },
    { x: 3.4, z: 3.4, rot: 0, a: 5, b: 1, kind: 'chain' },
    { x: -3.4, z: -3.4, rot: 0, a: 2, b: 6, kind: 'chain' },
    { x: 7.2, z: 2.2, rot: 0, a: 0, b: 0, kind: 'deadlock' },
    { x: -7.2, z: -2.2, rot: 0, a: 4, b: 4, kind: 'pinch' },
    { x: 0.2, z: 4.6, rot: 0, a: 5, b: 5, kind: 'chain' },
    { x: 5.5, z: -5.0, rot: 0, a: 3, b: 3, kind: 'pinch' },
    { x: -5.5, z: 5.0, rot: 0, a: 1, b: 1, kind: 'chain' },
    { x: 0, z: 0.4, rot: Math.PI / 2, a: 6, b: 0, kind: 'sixlove' },
  ];

  const slams = [];
  for (let i = 0; i < count; i++) {
    const isFinal = i === count - 1;
    const at = count === 1 ? finalSlam : firstSlam + (i / (count - 1)) * (finalSlam - firstSlam);
    const base = isFinal
      ? { x: 2.4, z: 1.8, rot: 0.25, a: 6, b: 0, kind: 'sixlove' }
      : spots[i % (spots.length - 1)];
    const kind = isFinal ? 'sixlove' : base.kind;
    const popupKind = kind === 'pose' ? 'pose' : kind === 'deadlock' ? 'deadlock' : 'pinch';
    slams.push({
      index: i,
      at,
      shadowAt: Math.max(0.2, at - SHADOW_LEAD),
      x: base.x,
      z: base.z,
      rot: base.rot,
      a: base.a,
      b: base.b,
      kind,
      popup: pick(DOMINO_POPUPS[popupKind], rng),
      landed: false,
      shadowShown: false,
    });
  }

  // Schedule KNOCK-KNOCK! vertical table tremors between slams
  const knocks = [];
  for (let k = 0; k < variant.knocks; k++) {
    const frac = (k + 1) / (variant.knocks + 1);
    knocks.push({
      at: firstSlam + (finalSlam - firstSlam) * frac,
      popup: pick(DOMINO_POPUPS.knock, rng),
      fired: false,
    });
  }

  return { variant, slams, knocks };
}

/**
 * Real-time 2.5D tabletop shockwave survival simulation for 2..30 players.
 */
export class DominoSim {
  constructor({ names, duration = DEFAULT_DOMINO_DURATION, rule = DEFAULT_DOMINO_RULE, rng = Math.random } = {}) {
    if (!Array.isArray(names) || names.length < MIN_DOMINO_PLAYERS || names.length > MAX_DOMINO_PLAYERS) {
      throw new Error(`Rum-Shop Domino Slam needs ${MIN_DOMINO_PLAYERS}–${MAX_DOMINO_PLAYERS} players.`);
    }
    this.rng = rng;
    this.duration = normalizeDominoDuration(duration);
    this.rule = rule === 'sixlove' ? 'sixlove' : 'champion';
    const { variant, slams, knocks } = buildDominoSlams(this.duration, rng);
    this.variant = variant;
    this.slams = slams;
    this.knocks = knocks;
    this.time = 0;
    this.done = false;
    this.winner = null;
    this.events = [];

    // Fairness-first 1/N pre-roll for the standup leader
    const n = names.length;
    this.targetWinnerId = Math.floor(rng() * n);
    this.slamsLanded = 0;

    // Distribute non-winner eliminations evenly across all slams so Slam 0 (POSE!) only knocks off a few early stragglers
    const others = Array.from({ length: n }, (_, i) => i).filter((i) => i !== this.targetWinnerId);
    for (let i = others.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [others[i], others[j]] = [others[j], others[i]];
    }
    const targetSlamById = new Map();
    const totalSlams = this.slams.length;
    others.forEach((id, rank) => {
      // Spread evenly from Slam 0 up to the final SIX-LOVE slam, reserving the final rank(s) for the climax
      const slamIdx = others.length === 1
        ? totalSlams - 1
        : Math.min(totalSlams - 1, Math.floor((rank / others.length) * totalSlams));
      targetSlamById.set(id, slamIdx);
    });

    // Arrange players across the open hardwood tabletop
    this.players = names.map((name, id) => {
      const a = (id / n) * Math.PI * 2 + rng() * 0.25;
      const rad = 2.4 + (id % 3) * 1.2;
      const x = Math.cos(a) * rad * 1.2;
      const z = Math.sin(a) * rad * 0.8;
      return {
        id,
        name,
        color: PLAYER_COLORS[id % PLAYER_COLORS.length],
        x,
        y: 0,
        z,
        vx: 0,
        vy: 0,
        vz: 0,
        slowTimer: 0,
        eliminated: false,
        eliminatedAt: null,
        isTargetWinner: id === this.targetWinnerId,
        targetSlam: targetSlamById.get(id) ?? totalSlams,
        wanderPhase: rng() * Math.PI * 2,
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

  activeCount() {
    return this.players.filter((p) => !p.eliminated).length;
  }

  applyShockwave(sx, sz, J0, Jy, R0, lambda, slamIndex = 0, isFinalSlam = false) {
    for (const p of this.players) {
      if (p.eliminated) continue;
      const dx = p.x - sx;
      const dz = p.z - sz;
      const d = Math.max(0.4, Math.hypot(dx, dz));
      const rx = dx / d;
      const rz = dz / d;

      const doomedThisSlam = this.rule === 'champion'
        ? (!p.isTargetWinner && (isFinalSlam || p.targetSlam <= slamIndex))
        : p.isTargetWinner;

      if (doomedThisSlam) {
        // Blast this wave's victims cleanly toward the nearest beveled table edge!
        const ex = p.x >= 0 ? 1 : -1;
        const ez = p.z >= 0 ? 1 : -1;
        p.vx += ex * (13.5 + this.rng() * 3.5);
        p.vz += ez * (10.5 + this.rng() * 3.0);
        p.vy = Math.max(p.vy, 7.0);
      } else {
        // Surviving players take a dramatic bouncy jostle across the wood without flying off yet
        const mult = p.isTargetWinner && this.rule === 'champion' ? 0.28 : 0.45;
        const horiz = (J0 / (1 + (d / R0) * (d / R0))) * mult;
        const vert = Jy * Math.exp(-d / lambda) * 0.65;
        p.vx += rx * horiz;
        p.vz += rz * horiz;
        p.vy = Math.max(p.vy, vert);
      }
    }
  }

  step(dt) {
    if (this.done) return;
    this.time += dt;
    const t = this.time;

    // Trigger incoming domino shadows & heavy tile slams
    for (const s of this.slams) {
      if (!s.shadowShown && t >= s.shadowAt) {
        s.shadowShown = true;
        this.emit({ type: 'shadow', slam: s });
      }
      if (!s.landed && t >= s.at) {
        s.landed = true;
        this.slamsLanded = s.index + 1;
        const isPose = s.kind === 'pose';
        const isSix = s.kind === 'sixlove';
        const isDeadlock = s.kind === 'deadlock';
        const J0 = isPose || isSix ? 16.5 : 13.5;
        const Jy = isPose || isSix ? 7.8 : 5.8;
        this.applyShockwave(s.x, s.z, J0, Jy, 5.2, 8.5, s.index, isSix);
        if (isDeadlock) {
          for (const p of this.players) {
            if (!p.eliminated && Math.hypot(p.x - s.x, p.z - s.z) < 6.0) p.slowTimer = 1.6;
          }
        }
        this.emit({ type: 'slam', slam: s });
      }
    }

    // Trigger KNOCK-KNOCK! vertical table tremors
    for (const k of this.knocks) {
      if (!k.fired && t >= k.at) {
        k.fired = true;
        for (const p of this.players) {
          if (p.eliminated) continue;
          p.vy = Math.max(p.vy, 7.6);
          p.vx += (this.rng() - 0.5) * (p.isTargetWinner && this.rule === 'champion' ? 1.5 : 6.0);
          p.vz += (this.rng() - 0.5) * (p.isTargetWinner && this.rule === 'champion' ? 1.5 : 5.0);
        }
        this.emit({ type: 'knock', knock: k });
      }
    }

    // Find next incoming shadow to dodge
    const nextShadow = this.slams.find((s) => s.shadowShown && !s.landed);

    // Integrate 2.5D tabletop motion, friction, gravity, and edge drop
    const g = 22.0;
    for (const p of this.players) {
      if (p.slowTimer > 0) p.slowTimer = Math.max(0, p.slowTimer - dt);

      if (!p.eliminated) {
        const speedMult = p.slowTimer > 0 ? 0.45 : 1.0;
        if (p.isTargetWinner && this.rule === 'champion') {
          // Steer smoothly toward safe interior pocket away from table edges & incoming shadows
          let tx = Math.sin(t * 0.9 + p.wanderPhase) * 3.8;
          let tz = Math.cos(t * 0.8 + p.wanderPhase) * 2.6;
          if (nextShadow && Math.hypot(p.x - nextShadow.x, p.z - nextShadow.z) < 4.5) {
            tx = nextShadow.x > 0 ? -4.2 : 4.2;
            tz = nextShadow.z > 0 ? -3.0 : 3.0;
          }
          p.vx += (tx - p.x) * 3.4 * dt * speedMult;
          p.vz += (tz - p.z) * 3.4 * dt * speedMult;
        } else {
          // Decoys scramble nervously around the tabletop
          const ax = Math.sin(t * 2.3 + p.wanderPhase) * 5.2;
          const az = Math.cos(t * 2.1 + p.wanderPhase) * 4.6;
          p.vx += ax * dt * speedMult;
          p.vz += az * dt * speedMult;
        }

        // Hardwood surface friction while grounded
        const drag = p.y <= 0.02 ? 2.4 : 0.45;
        const damp = Math.exp(-drag * dt);
        p.vx *= damp;
        p.vz *= damp;

        p.x += p.vx * dt;
        p.z += p.vz * dt;

        // Vertical hop & gravity
        if (p.y > 0 || p.vy > 0) {
          p.vy -= g * dt;
          p.y += p.vy * dt;
          if (p.y <= 0) {
            p.y = 0;
            p.vy = 0;
          }
        }

        // Check beveled table edge drop!
        const offTable = Math.abs(p.x) > TABLE_HALF_W || Math.abs(p.z) > TABLE_HALF_D;
        if (offTable) {
          const protectedNow = this.rule === 'champion'
            ? (p.isTargetWinner || p.targetSlam >= this.slamsLanded)
            : !p.isTargetWinner;
          if (protectedNow) {
            // Dramatic rim-catch recovery!
            p.x = Math.max(-TABLE_HALF_W + 0.65, Math.min(TABLE_HALF_W - 0.65, p.x));
            p.z = Math.max(-TABLE_HALF_D + 0.65, Math.min(TABLE_HALF_D - 0.65, p.z));
            p.vx *= -0.5;
            p.vz *= -0.5;
          } else {
            p.eliminated = true;
            p.eliminatedAt = t;
            const popup = pick(DOMINO_POPUPS.cup, this.rng);
            this.emit({ type: 'eliminated', player: p, popup, remaining: this.activeCount() });
            if (this.rule === 'sixlove' && !this.winner) {
              this.winner = p;
              this.done = true;
              this.emit({ type: 'winner', player: p });
              return;
            }
          }
        }
      } else {
        // Falling off the beveled edge into the dark abyss
        p.vy -= g * dt;
        p.x += p.vx * dt * 0.4;
        p.z += p.vz * dt * 0.4;
        p.y += p.vy * dt;
      }
    }

    // Check Champion win condition (sole survivor or duration cap reached)
    const remaining = this.players.filter((p) => !p.eliminated);
    if (this.rule === 'champion' && (remaining.length <= 1 || t >= this.duration)) {
      const champ = remaining.find((p) => p.isTargetWinner) ?? remaining[0] ?? this.players[this.targetWinnerId];
      for (const p of remaining) {
        if (p !== champ) {
          p.eliminated = true;
          p.eliminatedAt = t;
          p.vy = 4.5;
        }
      }
      this.winner = champ;
      this.done = true;
      this.emit({ type: 'winner', player: champ });
    } else if (this.rule === 'sixlove' && t >= this.duration && !this.winner) {
      const victim = this.players[this.targetWinnerId];
      victim.eliminated = true;
      this.winner = victim;
      this.done = true;
      this.emit({ type: 'winner', player: victim });
    }
  }
}

/** Runs a full Rum-Shop Domino Slam match headlessly (for unit tests & no-WebGL fallback). */
export function runDominoHeadless(names, { duration = DEFAULT_DOMINO_DURATION, rule = DEFAULT_DOMINO_RULE, rng = Math.random } = {}) {
  const sim = new DominoSim({ names, duration, rule, rng });
  const maxTime = normalizeDominoDuration(duration) + 4;
  while (!sim.done && sim.time < maxTime) sim.step(1 / 60);
  return sim;
}
