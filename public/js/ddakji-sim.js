// "Ddakji Flip-Out" (Paper-Tile Slam Royale): single-axis edge-pivot flip kinematics,
// radial air-blast impulses (Δω & Δvy), damp puddle 1.8x vulnerability, oversized foil-stamped
// CHEOL-DDAKJI drops (3.0x blast), Courtyard Champion vs. First-Flipped (Recruiter) rules,
// and 10s–120s scaling. Pure logic (no Three.js, no DOM) for Node tests & headless fallback.

import { MAX_NAMES } from './data-rules.js';

export const MIN_DDAKJI_PLAYERS = 2;
export const MAX_DDAKJI_PLAYERS = MAX_NAMES; // 30

export const DDAKJI_DURATIONS = [
  { seconds: 120, variant: 'championship', label: '120s', text: '120s · 3-Round Seoul Courtyard Championship' },
  { seconds: 60, variant: 'championship', label: '60s', text: '60s · 3-Round Seoul Courtyard Championship' },
  { seconds: 30, variant: 'royale', label: '30s', text: '30s · Schoolyard Courtyard Royale' },
  { seconds: 15, variant: 'subway', label: '15s', text: '15s · Subway Platform Quick Slap' },
  { seconds: 10, variant: 'subway', label: '10s', text: '10s · Subway Platform Quick Slap' },
];
export const DEFAULT_DDAKJI_DURATION = 15;
export const DEFAULT_DDAKJI_RULE = 'champion';

export function normalizeDdakjiDuration(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_DDAKJI_DURATION;
  let best = DDAKJI_DURATIONS[0].seconds;
  let dist = Math.abs(n - best);
  for (const step of DDAKJI_DURATIONS) {
    const d = Math.abs(n - step.seconds);
    if (d < dist) { best = step.seconds; dist = d; }
  }
  return best;
}

export function ddakjiVariant(seconds) {
  const s = normalizeDdakjiDuration(seconds);
  if (s <= 15) return { id: 'subway', label: 'Subway Platform Quick Slap', courtRadius: 8.4, volleys: 3, cheolDrops: 1, puddles: 0 };
  if (s <= 30) return { id: 'royale', label: 'Schoolyard Courtyard Royale', courtRadius: 10.0, volleys: 5, cheolDrops: 2, puddles: 2 };
  return { id: 'championship', label: '3-Round Seoul Courtyard Championship', courtRadius: 11.4, volleys: 7, cheolDrops: 3, puddles: 3 };
}

/** Exact dev-humor popups from docs/ddakji_flip_out_paper_tile_slam_royale_game_mode_spec.md. */
export const DDAKJI_POPUPS = {
  cleanFlip: [
    'New security feature screwed prod',
    'Rolling back server time as a service',
  ],
  cheol: [
    'Ekmaatra-ji derailed by common sense again',
    'Crushed by unavailable audit logs',
  ],
  whiff: [
    'Defeated by a graveyard of patay buttons.',
    'URL edits banned. Broke reports. Fix: add ?ReturnUrl=',
  ],
  puddle: [
    'Piped userLogs.db to /dev/null',
    "New group policy stopped SQL Server restarts",
    'Blocked by PanganodSilab 502',
  ],
  doubleFlip: [
    'IYAHAY NA! Cascade failure',
    'BadalJwala 502 blast wave',
  ],
};

export const TILE_SIZE = 1.65;
export const TILE_THICK = 0.16;

const TILE_PALETTE = [
  { main: '#e63946', fold: '#ff6b6b', trim: '#ffd166' },
  { main: '#2563eb', fold: '#60a5fa', trim: '#e0f2fe' },
  { main: '#10b981', fold: '#34d399', trim: '#d1fae5' },
  { main: '#f59e0b', fold: '#fbbf24', trim: '#fef3c7' },
  { main: '#8b5cf6', fold: '#a78bfa', trim: '#ede9fe' },
  { main: '#ec4899', fold: '#f472b6', trim: '#fce7f3' },
  { main: '#06b6d4', fold: '#22d3ee', trim: '#cffafe' },
  { main: '#f97316', fold: '#fb923c', trim: '#ffedd5' },
];

function pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export class DdakjiSim {
  constructor({ names, duration = DEFAULT_DDAKJI_DURATION, rule = DEFAULT_DDAKJI_RULE, rng = Math.random }) {
    if (!Array.isArray(names) || names.length < MIN_DDAKJI_PLAYERS || names.length > MAX_DDAKJI_PLAYERS) {
      throw new Error(`Ddakji Flip-Out requires ${MIN_DDAKJI_PLAYERS}–${MAX_DDAKJI_PLAYERS} players.`);
    }
    this.rng = rng;
    this.duration = normalizeDdakjiDuration(duration);
    this.rule = rule === 'recruiter' ? 'recruiter' : 'champion';
    this.variant = ddakjiVariant(this.duration);
    this.courtRadius = this.variant.courtRadius;
    this.time = 0;
    this.done = false;
    this.winner = null;
    this.events = [];

    // Fair 1/N pre-roll for the standup leader
    const n = names.length;
    this.targetWinnerId = Math.floor(rng() * n);

    // Optional damp neon puddle zones (30s+ modes)
    this.puddles = [];
    for (let i = 0; i < this.variant.puddles; i++) {
      const a = (i / Math.max(1, this.variant.puddles)) * Math.PI * 2 + 0.55;
      const dist = this.courtRadius * 0.48;
      this.puddles.push({ x: Math.cos(a) * dist, z: Math.sin(a) * dist, r: 2.35 });
    }

    // Build slam volley schedule
    const volleyCount = this.variant.volleys;
    this.volleys = [];
    const firstAt = Math.min(1.6, this.duration * 0.14);
    const lastAt = this.duration * 0.82;
    for (let v = 0; v < volleyCount; v++) {
      const frac = volleyCount === 1 ? 1 : v / (volleyCount - 1);
      this.volleys.push({
        index: v,
        at: firstAt + frac * (lastAt - firstAt),
        fired: false,
        isFinal: v === volleyCount - 1,
      });
    }
    this.volleysFired = 0;

    // Schedule giant CHEOL-DDAKJI drops between volleys
    this.cheolDrops = [];
    for (let c = 0; c < this.variant.cheolDrops; c++) {
      const at = this.duration * (0.38 + (c / Math.max(1, this.variant.cheolDrops)) * 0.34);
      const ang = rng() * Math.PI * 2;
      this.cheolDrops.push({
        at,
        fired: false,
        x: Math.cos(ang) * (this.courtRadius * 0.22),
        z: Math.sin(ang) * (this.courtRadius * 0.22),
      });
    }
    this.cheol = { active: false, x: 0, z: 0, y: 14, timer: 0 };

    // Assign elimination waves to non-winners in Champion mode so eliminations spread across all volleys
    const others = [];
    for (let i = 0; i < n; i++) {
      if (i !== this.targetWinnerId) others.push(i);
    }
    for (let i = others.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [others[i], others[j]] = [others[j], others[i]];
    }
    const targetVolleyMap = new Map();
    others.forEach((id, idx) => {
      // Keep the final runner-up for the dramatic last volley!
      if (idx === others.length - 1) {
        targetVolleyMap.set(id, volleyCount - 1);
      } else {
        const wave = Math.floor((idx / Math.max(1, others.length - 1)) * Math.max(1, volleyCount - 1));
        targetVolleyMap.set(id, clamp(wave, 0, volleyCount - 1));
      }
    });

    // Scatter folded-paper tiles in rings across the twilight courtyard
    const cols = Math.ceil(Math.sqrt(n));
    this.tiles = names.map((name, i) => {
      const ring = Math.floor(i / 8);
      const inRing = Math.min(8, n - ring * 8);
      const posInRing = i % 8;
      const baseAngle = (posInRing / Math.max(1, inRing)) * Math.PI * 2 + ring * 0.45 + (rng() - 0.5) * 0.25;
      const maxR = this.courtRadius * 0.78;
      const dist = n <= 4
        ? 2.2 + (i % 2) * 1.1
        : clamp(1.9 + ring * 2.3 + (rng() - 0.5) * 0.5, 1.4, maxR);
      const palette = TILE_PALETTE[i % TILE_PALETTE.length];
      return {
        id: i,
        name,
        palette,
        color: palette.main,
        x: Math.cos(baseAngle) * dist,
        z: Math.sin(baseAngle) * dist,
        y: 2.8 + (i % cols) * 0.45, // Flutter down during KKA-RA! intro
        vy: 0,
        yaw: (rng() - 0.5) * 0.7,
        theta: 0, // [0, Math.PI]: 0 = face-up, PI/2 = edge balance, PI = flipped
        omega: 0,
        flipAxisX: 1,
        flipAxisZ: 0,
        hopT: 0,
        hopDur: 0,
        hopStartX: 0,
        hopStartZ: 0,
        hopEndX: 0,
        hopEndZ: 0,
        flipped: false,
        flippedAt: Infinity,
        isTargetWinner: i === this.targetWinnerId,
        targetVolley: targetVolleyMap.get(i) ?? 0,
        inPuddle: false,
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
    let c = 0;
    for (const tile of this.tiles) if (!tile.flipped) c++;
    return c;
  }

  isInPuddle(x, z) {
    for (const p of this.puddles) {
      if (Math.hypot(x - p.x, z - p.z) <= p.r) return true;
    }
    return false;
  }

  /** Triggers an air-blast shockwave at (sx, sz) with kinetic energy Es. */
  applyAirBlast(sx, sz, energy, isCheol = false) {
    const R_BLAST = isCheol ? 6.8 : 4.2;
    const w = TILE_SIZE;
    const g = 18.0;
    const kappa = 6.2;
    const beta = 1.45;
    const lambda = 3.2;

    this.emit({ type: 'shock', x: sx, z: sz, radius: R_BLAST, isCheol });

    let flippedThisBlast = 0;
    for (const tile of this.tiles) {
      if (tile.flipped) continue;
      const dx = tile.x - sx;
      const dz = tile.z - sz;
      const d = Math.hypot(dx, dz);
      if (d < 0.05 && !isCheol) continue;

      tile.inPuddle = this.isInPuddle(tile.x, tile.z);
      const puddleMult = tile.inPuddle ? 1.8 : 1.0;
      const ux = d > 0.001 ? dx / d : 1;
      const uz = d > 0.001 ? dz / d : 0;
      // Horizontal edge axis perpendicular to radial blast vector: y_hat x r_hat = (uz, 0, -ux)
      tile.flipAxisX = uz;
      tile.flipAxisZ = -ux;

      const protectedNow = this.rule === 'champion'
        ? (tile.isTargetWinner || tile.targetVolley > this.volleysFired)
        : !tile.isTargetWinner;

      const rawOmega = (kappa * energy * puddleMult) / (w * (1 + (d / R_BLAST) ** 2));
      const hopVy = beta * energy * Math.exp(-d / lambda);

      if (protectedNow) {
        // Dramatic close-call wobble (up to ~76 deg) that rocks safely back flat!
        const safeKick = Math.min(rawOmega * 0.55, Math.sqrt((3 * g) / w) * 0.72);
        tile.omega = Math.max(tile.omega, safeKick);
        tile.vy = Math.max(tile.vy, Math.min(hopVy * 0.55, 4.2));
      } else {
        // Scheduled for elimination on this volley (or Recruiter first-flip victim)
        const minFlipOmega = Math.sqrt((3 * g) / w) * 1.18;
        const kick = Math.max(rawOmega, d < R_BLAST * 1.65 ? minFlipOmega : rawOmega * 0.9);
        tile.omega = Math.max(tile.omega, kick);
        tile.vy = Math.max(tile.vy, Math.min(hopVy + 2.4, 7.6));
        if (kick >= minFlipOmega) flippedThisBlast++;
      }
    }
    return flippedThisBlast;
  }

  fireVolley(volley) {
    this.volleysFired = volley.index;
    const alive = this.tiles.filter((t) => !t.flipped);
    if (alive.length <= 1) return;

    this.emit({ type: 'volley', volley, remaining: alive.length });

    // Pick slammers who hop toward nearby rivals and slam onto the stone
    const slammers = volley.isFinal
      ? [alive.find((t) => t.isTargetWinner) ?? alive[0]]
      : alive.slice(0, Math.min(alive.length, 4));

    const targets = alive.filter((t) => (
      this.rule === 'champion'
        ? (!t.isTargetWinner && t.targetVolley <= volley.index)
        : t.isTargetWinner
    ));

    slammers.forEach((s, idx) => {
      const victim = targets[idx % Math.max(1, targets.length)] ?? alive[(idx + 1) % alive.length];
      if (!victim || victim === s) return;
      const ang = Math.atan2(victim.z - s.z, victim.x - s.x);
      const landDist = Math.max(0.95, Math.hypot(victim.x - s.x, victim.z - s.z) - 1.25);
      const tx = clamp(s.x + Math.cos(ang) * landDist, -this.courtRadius * 0.82, this.courtRadius * 0.82);
      const tz = clamp(s.z + Math.sin(ang) * landDist, -this.courtRadius * 0.82, this.courtRadius * 0.82);
      s.hopStartX = s.x;
      s.hopStartZ = s.z;
      s.hopEndX = tx;
      s.hopEndZ = tz;
      s.hopDur = volley.isFinal ? 0.45 : 0.36;
      s.hopT = s.hopDur;
    });

    // Guarantee every target scheduled for this volley catches a direct edge blast
    for (const victim of targets) {
      const offAng = this.rng() * Math.PI * 2;
      const sx = victim.x + Math.cos(offAng) * 1.1;
      const sz = victim.z + Math.sin(offAng) * 1.1;
      const energy = volley.isFinal ? 2.6 : 2.25;
      this.applyAirBlast(sx, sz, energy, false);
    }

    // Occasional whiff popup for comedy on mid-round volleys
    if (!volley.isFinal && this.rng() < 0.4) {
      this.emit({ type: 'whiff', popup: pick(DDAKJI_POPUPS.whiff, this.rng) });
    }
  }

  step(dt) {
    if (this.done) return;
    this.time += dt;
    const t = this.time;

    // Trigger slam volleys
    for (const v of this.volleys) {
      if (!v.fired && t >= v.at) {
        v.fired = true;
        this.fireVolley(v);
      }
    }

    // Trigger giant CHEOL-DDAKJI drop
    for (const cd of this.cheolDrops) {
      if (!cd.fired && t >= cd.at) {
        cd.fired = true;
        this.cheol.active = true;
        this.cheol.x = cd.x;
        this.cheol.z = cd.z;
        this.cheol.y = 14.0;
        this.cheol.timer = 1.65;
        this.cheol.impacted = false;
        this.emit({ type: 'cheol', popup: pick(DDAKJI_POPUPS.cheol, this.rng) });
      }
    }

    // Animate giant CHEOL-DDAKJI slam & fade-lift
    if (this.cheol.active) {
      this.cheol.timer -= dt;
      if (!this.cheol.impacted) {
        this.cheol.y -= 38 * dt;
        if (this.cheol.y <= 0.25) {
          this.cheol.y = 0.25;
          this.cheol.impacted = true;
          this.applyAirBlast(this.cheol.x, this.cheol.z, 3.0 * 2.1, true);
        }
      } else if (this.cheol.timer <= 0.5) {
        this.cheol.y += 18 * dt;
      }
      if (this.cheol.timer <= 0) {
        this.cheol.active = false;
      }
    }

    // Integrate tile flutter-in, hops, and exact edge-pivot tipping kinematics
    const g = 18.0;
    const w = TILE_SIZE;
    const damp = 1.35;
    let newlyFlipped = 0;

    for (const tile of this.tiles) {
      // Hop arc toward rival before slam
      if (tile.hopT > 0) {
        tile.hopT = Math.max(0, tile.hopT - dt);
        const p = 1 - tile.hopT / Math.max(0.001, tile.hopDur);
        tile.x = tile.hopStartX + (tile.hopEndX - tile.hopStartX) * p;
        tile.z = tile.hopStartZ + (tile.hopEndZ - tile.hopStartZ) * p;
        tile.y = Math.sin(p * Math.PI) * 2.6;
        if (tile.hopT === 0) {
          tile.y = 0;
          this.emit({ type: 'slam', x: tile.x, z: tile.z });
        }
      } else if (tile.y > 0 || tile.vy !== 0) {
        // Vertical flutter / air-blast hop gravity
        tile.vy -= 22.0 * dt;
        tile.y += tile.vy * dt;
        if (tile.y <= 0) {
          tile.y = 0;
          tile.vy = Math.abs(tile.vy) > 2.0 ? -tile.vy * 0.24 : 0;
        }
      }

      if (tile.flipped) {
        // Settle crisply onto face-down PI
        if (tile.theta < Math.PI) {
          tile.theta = Math.min(Math.PI, tile.theta + Math.max(8, tile.omega) * dt);
        }
        continue;
      }

      // Edge-pivot gravitational torque: θ'' = -(3g / 2w) * cos(θ) - c * θ'
      if (tile.theta > 0 || tile.omega > 0) {
        const protectedNow = this.rule === 'champion'
          ? (tile.isTargetWinner || tile.targetVolley > this.volleysFired)
          : !tile.isTargetWinner;

        const alpha = -((3 * g) / (2 * w)) * Math.cos(tile.theta) - damp * tile.omega;
        tile.omega += alpha * dt;
        tile.theta += tile.omega * dt;

        // Guard protected tiles from crossing 84 degrees so they always give dramatic close-call saves!
        const safeCap = (84 * Math.PI) / 180;
        if (protectedNow && tile.theta > safeCap) {
          tile.theta = safeCap;
          tile.omega = -Math.abs(tile.omega) * 0.55 - 1.2;
        }

        if (tile.theta <= 0) {
          tile.theta = 0;
          tile.omega = 0;
        } else if (tile.theta >= Math.PI) {
          tile.theta = Math.PI;
          tile.omega = 0;
          tile.flipped = true;
          tile.flippedAt = t;
          newlyFlipped++;
          const pool = tile.inPuddle
            ? DDAKJI_POPUPS.puddle
            : newlyFlipped >= 2
              ? DDAKJI_POPUPS.doubleFlip
              : DDAKJI_POPUPS.cleanFlip;
          const popup = pick(pool, this.rng);
          this.emit({ type: 'flipped', tile, popup, remaining: this.activeCount() });

          if (this.rule === 'recruiter' && !this.winner) {
            this.winner = tile;
            this.done = true;
            this.emit({ type: 'winner', tile });
            return;
          }
        }
      }
    }

    // Check Courtyard Champion win condition or guaranteed on-time finale cap
    const remaining = this.tiles.filter((tile) => !tile.flipped);
    if (this.rule === 'champion' && (remaining.length <= 1 || t >= this.duration)) {
      const champ = remaining.find((tile) => tile.isTargetWinner) ?? remaining[0] ?? this.tiles[this.targetWinnerId];
      for (const tile of remaining) {
        if (tile !== champ) {
          tile.flipped = true;
          tile.theta = Math.PI;
          tile.flippedAt = t;
        }
      }
      champ.flipped = false;
      champ.theta = 0;
      champ.omega = 0;
      this.winner = champ;
      this.done = true;
      this.emit({ type: 'winner', tile: champ });
    } else if (this.rule === 'recruiter' && t >= this.duration && !this.winner) {
      const victim = this.tiles[this.targetWinnerId];
      victim.flipped = true;
      victim.theta = Math.PI;
      victim.flippedAt = t;
      this.winner = victim;
      this.done = true;
      this.emit({ type: 'winner', tile: victim });
    }
  }

  standings() {
    return [...this.tiles].sort((a, b) => {
      if (a === this.winner) return -1;
      if (b === this.winner) return 1;
      if (a.flipped !== b.flipped) return a.flipped ? 1 : -1;
      if (a.flipped && b.flipped) return b.flippedAt - a.flippedAt;
      return a.theta - b.theta;
    });
  }
}

/** Runs a full Ddakji Flip-Out match headlessly (for unit tests & no-WebGL fallback). */
export function runDdakjiHeadless(names, { duration = DEFAULT_DDAKJI_DURATION, rule = DEFAULT_DDAKJI_RULE, rng = Math.random } = {}) {
  const sim = new DdakjiSim({ names, duration, rule, rng });
  const maxTime = normalizeDdakjiDuration(duration) + 4;
  while (!sim.done && sim.time < maxTime) sim.step(1 / 60);
  return sim;
}
