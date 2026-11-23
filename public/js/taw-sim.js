// "Schoolyard Taw Knockout" (Ring-Out Marbles): 2D elastic glass-on-glass sphere collisions,
// rogue heavy chrome STEELIE BOLER (mass 6.0) boss marble, timed RE-PITCH! volleys, shrinking
// chalk ring boundary R_ring(t), Ring Champion vs. KEEPSIES! rules, and 10s–120s scaling.
// Pure logic (no Three.js, no DOM), so it runs in Node for unit tests and headless fallback.

import { MAX_NAMES } from './data-rules.js';

export const MIN_TAW_PLAYERS = 2;
export const MAX_TAW_PLAYERS = MAX_NAMES; // 30

export const TAW_DURATIONS = [
  { seconds: 120, variant: 'championship', label: '120s', text: '120s · Georgetown Keepsies Championship' },
  { seconds: 60, variant: 'championship', label: '60s', text: '60s · Georgetown Keepsies Championship' },
  { seconds: 30, variant: 'ringout', label: '30s', text: '30s · Bottom-House Ring-Out' },
  { seconds: 15, variant: 'recess', label: '15s', text: '15s · Recess Quick Break' },
  { seconds: 10, variant: 'recess', label: '10s', text: '10s · Recess Quick Break' },
];
export const DEFAULT_TAW_DURATION = 15;
export const DEFAULT_TAW_RULE = 'champion';

export function normalizeTawDuration(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_TAW_DURATION;
  let best = TAW_DURATIONS[0].seconds;
  let dist = Math.abs(n - best);
  for (const step of TAW_DURATIONS) {
    const d = Math.abs(n - step.seconds);
    if (d < dist) { best = step.seconds; dist = d; }
  }
  return best;
}

export function tawVariant(seconds) {
  const s = normalizeTawDuration(seconds);
  if (s <= 15) return { id: 'recess', label: 'Recess Quick Break', baseRadius: 8.6, volleys: 3, steeliePasses: 1 };
  if (s <= 30) return { id: 'ringout', label: 'Bottom-House Ring-Out', baseRadius: 10.2, volleys: 5, steeliePasses: 2 };
  return { id: 'championship', label: 'Georgetown Keepsies Championship', baseRadius: 11.4, volleys: 7, steeliePasses: 3 };
}

/** Exact dev-humor popups from docs/schoolyard_taw_knockout_game_mode_spec.md. */
export const TAW_POPUPS = {
  knockout: [
    "Zabardasti feature paksit'd prod",
    "Knocked out by Ekmaatra-ji's blame game",
  ],
  steelie: [
    'Ekmaatra-ji derailed by common sense again',
    "Failed to read Ekmaatra-ji's mind",
    'Unscheduled Ekmaatra-ji override!',
  ],
  fudging: [
    'FUDGING! URL edits banned. Fix: add ?ReturnUrl=',
    'Blocked by pan-os software license',
  ],
  kiss: [
    'Ekmaatra-ji is on the hunt — PANAGAN!',
    'IYAHAY NA! Chain-reaction Ekmaatra-ji hotfixes',
  ],
  pebble: [
    "Tripped on Ekmaatra-ji's secretly recreated tables",
    "Databases knocked out by Ekmaatra-ji's group policy push",
  ],
};

export const MARBLE_RADIUS = 0.56;
export const STEELIE_RADIUS = 1.05;

const MARBLE_STYLES = [
  { kind: 'catseye', color: '#4dabf7', accent: '#ffffff' },
  { kind: 'aggie', color: '#ff6b6b', accent: '#ffd43b' },
  { kind: 'milky', color: '#51cf66', accent: '#d8f5a2' },
  { kind: 'catseye', color: '#ffd43b', accent: '#fff9db' },
  { kind: 'aggie', color: '#cc5de8', accent: '#eebefa' },
  { kind: 'milky', color: '#ff922b', accent: '#ffe8cc' },
  { kind: 'catseye', color: '#20c997', accent: '#c3fae8' },
  { kind: 'aggie', color: '#f06595', accent: '#ffdeeb' },
];

function pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

/**
 * Real-time 2D elastic marble ring-out simulation for 2..30 players.
 */
export class TawSim {
  constructor({ names, duration = DEFAULT_TAW_DURATION, rule = DEFAULT_TAW_RULE, rng = Math.random } = {}) {
    if (!Array.isArray(names) || names.length < MIN_TAW_PLAYERS || names.length > MAX_TAW_PLAYERS) {
      throw new Error(`Schoolyard Taw Knockout needs ${MIN_TAW_PLAYERS}–${MAX_TAW_PLAYERS} players.`);
    }
    this.rng = rng;
    this.duration = normalizeTawDuration(duration);
    this.rule = rule === 'keepsies' ? 'keepsies' : 'champion';
    this.variant = tawVariant(this.duration);
    this.baseRadius = this.variant.baseRadius;
    this.ringRadius = this.baseRadius;
    this.time = 0;
    this.done = false;
    this.winner = null;
    this.events = [];

    // Schedule synchronized PITCH! / RE-PITCH! volleys & rogue STEELIE BOLER passes
    const firstPitch = Math.min(1.8, this.duration * 0.14);
    const lastPitch = this.duration * 0.88;
    const vCount = this.variant.volleys;
    this.volleys = [];
    for (let i = 0; i < vCount; i++) {
      const at = vCount === 1 ? lastPitch : firstPitch + (i / (vCount - 1)) * (lastPitch - firstPitch);
      this.volleys.push({ index: i, at, isFinal: i === vCount - 1, fired: false });
    }
    this.volleysFired = 0;

    this.steeliePasses = [];
    for (let s = 0; s < this.variant.steeliePasses; s++) {
      const frac = (s + 1) / (this.variant.steeliePasses + 1);
      const ang = rng() * Math.PI * 2;
      this.steeliePasses.push({
        at: firstPitch + (lastPitch - firstPitch) * frac,
        angle: ang,
        fired: false,
      });
    }

    this.steelie = {
      active: false,
      x: -24,
      z: 0,
      vx: 0,
      vz: 0,
      r: STEELIE_RADIUS,
      mass: 6.0,
    };

    // Fairness-first 1/N pre-roll + staggered wave elimination across volleys
    const n = names.length;
    this.targetWinnerId = Math.floor(rng() * n);
    const others = Array.from({ length: n }, (_, i) => i).filter((i) => i !== this.targetWinnerId);
    for (let i = others.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [others[i], others[j]] = [others[j], others[i]];
    }
    const targetVolleyById = new Map();
    others.forEach((id, rank) => {
      const vIdx = others.length === 1
        ? vCount - 1
        : Math.min(vCount - 1, Math.floor((rank / others.length) * vCount));
      targetVolleyById.set(id, vIdx);
    });

    // Arrange marbles in concentric rings inside the glowing chalk circle
    this.marbles = names.map((name, id) => {
      const a = (id / n) * Math.PI * 2 + rng() * 0.2;
      const rad = Math.min(this.baseRadius * 0.68, 2.0 + (id % 3) * 1.55);
      const style = MARBLE_STYLES[id % MARBLE_STYLES.length];
      return {
        id,
        name,
        style,
        color: style.color,
        x: Math.cos(a) * rad,
        z: Math.sin(a) * rad,
        vx: 0,
        vz: 0,
        r: MARBLE_RADIUS,
        mass: 1.0,
        eliminated: false,
        eliminatedAt: null,
        isTargetWinner: id === this.targetWinnerId,
        targetVolley: targetVolleyById.get(id) ?? vCount,
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
    return this.marbles.filter((m) => !m.eliminated).length;
  }

  fireVolley(v) {
    this.volleysFired = v.index + 1;
    for (const m of this.marbles) {
      if (m.eliminated) continue;
      const d = Math.max(0.2, Math.hypot(m.x, m.z));
      const doomedThisVolley = this.rule === 'champion'
        ? (!m.isTargetWinner && (v.isFinal || m.targetVolley <= v.index))
        : m.isTargetWinner;

      if (doomedThisVolley) {
        // High-speed outward carom aimed straight across the chalk boundary!
        const ox = m.x / d;
        const oz = m.z / d;
        const speed = 15.5 + this.rng() * 5.0;
        m.vx = ox * speed + (this.rng() - 0.5) * 3.5;
        m.vz = oz * speed + (this.rng() - 0.5) * 3.5;
      } else {
        // Safe inward glancing shot near center ring
        const ix = -m.x / d;
        const iz = -m.z / d;
        const tangent = (this.rng() - 0.5) * 1.1;
        const speed = 7.5 + this.rng() * 4.5;
        m.vx = (ix - iz * tangent) * speed;
        m.vz = (iz + ix * tangent) * speed;
      }
    }
    this.emit({ type: 'volley', volley: v });
  }

  step(dt) {
    if (this.done) return;
    this.time += dt;
    const t = this.time;

    // Gradually contract the glowing chalk ring after 72% of duration
    const closeStart = this.duration * 0.72;
    if (t > closeStart) {
      const u = Math.min(1, (t - closeStart) / Math.max(1, this.duration - closeStart));
      this.ringRadius = this.baseRadius * (1 - u * 0.36);
    }

    // Trigger PITCH! / RE-PITCH! volleys
    for (const v of this.volleys) {
      if (!v.fired && t >= v.at) {
        v.fired = true;
        this.fireVolley(v);
      }
    }

    // Trigger rogue chrome STEELIE BOLER bulldozing straight across center ring!
    for (const sp of this.steeliePasses) {
      if (!sp.fired && t >= sp.at) {
        sp.fired = true;
        const startDist = this.baseRadius + 7.5;
        this.steelie.active = true;
        this.steelie.x = Math.cos(sp.angle) * startDist;
        this.steelie.z = Math.sin(sp.angle) * startDist;
        this.steelie.vx = -Math.cos(sp.angle) * 18.5;
        this.steelie.vz = -Math.sin(sp.angle) * 18.5;
        this.emit({ type: 'steelie', popup: pick(TAW_POPUPS.steelie, this.rng) });
      }
    }

    // Move STEELIE BOLER
    if (this.steelie.active) {
      this.steelie.x += this.steelie.vx * dt;
      this.steelie.z += this.steelie.vz * dt;
      if (Math.hypot(this.steelie.x, this.steelie.z) > this.baseRadius + 10) {
        this.steelie.active = false;
      }
    }

    // Integrate marble rolling + dirt drag
    const drag = 1.65;
    const damp = Math.exp(-drag * dt);
    for (const m of this.marbles) {
      m.vx *= damp;
      m.vz *= damp;
      if (Math.hypot(m.vx, m.vz) < 0.08) { m.vx = 0; m.vz = 0; }
      m.x += m.vx * dt;
      m.z += m.vz * dt;
    }

    // Exact 2D elastic disc collisions (glass-on-glass, e = 0.94)
    const e = 0.94;
    let clackEmitted = false;
    for (let i = 0; i < this.marbles.length; i++) {
      const a = this.marbles[i];
      if (a.eliminated) continue;
      for (let j = i + 1; j < this.marbles.length; j++) {
        const b = this.marbles[j];
        if (b.eliminated) continue;
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const d = Math.hypot(dx, dz);
        const minD = a.r + b.r;
        if (d < minD && d > 0.0001) {
          const nx = dx / d;
          const nz = dz / d;
          const overlap = (minD - d) * 0.5;
          a.x -= nx * overlap;
          a.z -= nz * overlap;
          b.x += nx * overlap;
          b.z += nz * overlap;
          const rvx = b.vx - a.vx;
          const rvz = b.vz - a.vz;
          const vn = rvx * nx + rvz * nz;
          if (vn < 0) {
            const imp = -(1 + e) * vn / (1 / a.mass + 1 / b.mass);
            a.vx -= (imp / a.mass) * nx;
            a.vz -= (imp / a.mass) * nz;
            b.vx += (imp / b.mass) * nx;
            b.vz += (imp / b.mass) * nz;
            if (!clackEmitted && Math.abs(vn) > 2.2) {
              clackEmitted = true;
              this.emit({ type: 'clack', x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 });
            }
          }
        }
      }

      // Elastic collision with heavy chrome STEELIE BOLER (mass 6.0!)
      if (this.steelie.active) {
        const s = this.steelie;
        const dx = a.x - s.x;
        const dz = a.z - s.z;
        const d = Math.hypot(dx, dz);
        const minD = a.r + s.r;
        if (d < minD && d > 0.0001) {
          const nx = dx / d;
          const nz = dz / d;
          a.x = s.x + nx * minD;
          a.z = s.z + nz * minD;
          const rvx = a.vx - s.vx;
          const rvz = a.vz - s.vz;
          const vn = rvx * nx + rvz * nz;
          if (vn < 0) {
            const imp = -(1 + 0.95) * vn / (1 / a.mass + 1 / s.mass);
            a.vx += (imp / a.mass) * nx;
            a.vz += (imp / a.mass) * nz;
            this.emit({ type: 'steelieHit', x: a.x, z: a.z });
          }
        }
      }
    }

    // Check chalk-ring boundary elimination (|p| > ringRadius)
    for (const m of this.marbles) {
      if (m.eliminated) continue;
      const dist = Math.hypot(m.x, m.z);
      if (dist > this.ringRadius) {
        const protectedNow = this.rule === 'champion'
          ? (m.isTargetWinner || m.targetVolley >= this.volleysFired)
          : !m.isTargetWinner;
        if (protectedNow) {
          // Dramatic chalk-rim kiss & bounce back inside!
          const nx = m.x / dist;
          const nz = m.z / dist;
          m.x = nx * (this.ringRadius - 0.12);
          m.z = nz * (this.ringRadius - 0.12);
          m.vx = -nx * Math.max(2.4, Math.hypot(m.vx, m.vz) * 0.45);
          m.vz = -nz * Math.max(2.4, Math.hypot(m.vx, m.vz) * 0.45);
        } else {
          m.eliminated = true;
          m.eliminatedAt = t;
          const kinds = ['knockout', 'kiss', 'fudging', 'pebble'];
          const popup = pick(TAW_POPUPS[pick(kinds, this.rng)], this.rng);
          this.emit({ type: 'eliminated', marble: m, popup, remaining: this.activeCount() });
          if (this.rule === 'keepsies' && !this.winner) {
            this.winner = m;
            this.done = true;
            this.emit({ type: 'winner', marble: m });
            return;
          }
        }
      }
    }

    // Check Ring Champion win condition or duration cap
    const remaining = this.marbles.filter((m) => !m.eliminated);
    if (this.rule === 'champion' && (remaining.length <= 1 || t >= this.duration)) {
      const champ = remaining.find((m) => m.isTargetWinner) ?? remaining[0] ?? this.marbles[this.targetWinnerId];
      for (const m of remaining) {
        if (m !== champ) {
          m.eliminated = true;
          m.eliminatedAt = t;
          const d = Math.max(0.2, Math.hypot(m.x, m.z));
          m.vx = (m.x / d) * 14;
          m.vz = (m.z / d) * 14;
        }
      }
      this.winner = champ;
      this.done = true;
      this.emit({ type: 'winner', marble: champ });
    } else if (this.rule === 'keepsies' && t >= this.duration && !this.winner) {
      const victim = this.marbles[this.targetWinnerId];
      victim.eliminated = true;
      this.winner = victim;
      this.done = true;
      this.emit({ type: 'winner', marble: victim });
    }
  }

  standings() {
    return [...this.marbles].sort((a, b) => {
      if (a === this.winner) return -1;
      if (b === this.winner) return 1;
      if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1;
      if (a.eliminated && b.eliminated) return b.eliminatedAt - a.eliminatedAt;
      return Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z);
    });
  }
}

/** Runs a full Schoolyard Taw Knockout match headlessly (for unit tests & no-WebGL fallback). */
export function runTawHeadless(names, { duration = DEFAULT_TAW_DURATION, rule = DEFAULT_TAW_RULE, rng = Math.random } = {}) {
  const sim = new TawSim({ names, duration, rule, rng });
  const maxTime = normalizeTawDuration(duration) + 4;
  while (!sim.done && sim.time < maxTime) sim.step(1 / 60);
  return sim;
}
