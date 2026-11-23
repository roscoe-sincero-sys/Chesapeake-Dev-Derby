// "Kho-Kho Relay Blitz" (Swivel-Chair Boardroom Edition): directional half-plane lock chase,
// alternating N-S-N-S executive swivel-chair spine, KHO! 180-degree hydraulic launch chains,
// West Projector Cart & East Chai Trolley 180-degree Cart-Whip reversals, "VP JOINED THE CALL!"
// double-chaser surge, Elusive Champion vs. First Escalation (ASSIGNED P1!) rules, and 10s–120s scaling.
// Pure logic (no Three.js, no DOM) for Node unit tests & headless fallback.

import { MAX_NAMES } from './data-rules.js';

export const MIN_KHOKHO_PLAYERS = 2;
export const MAX_KHOKHO_PLAYERS = MAX_NAMES; // 30

export const KHOKHO_DURATIONS = [
  { seconds: 120, variant: 'gauntlet', label: '120s', text: '120s · 3-Meeting All-Hands Gauntlet' },
  { seconds: 60, variant: 'gauntlet', label: '60s', text: '60s · 3-Meeting All-Hands Gauntlet' },
  { seconds: 30, variant: 'boardroom', label: '30s', text: '30s · Full 8-Chair Executive Boardroom' },
  { seconds: 15, variant: 'huddle', label: '15s', text: '15s · Quick Huddle Blitz' },
  { seconds: 10, variant: 'huddle', label: '10s', text: '10s · Quick Huddle Blitz' },
];
export const DEFAULT_KHOKHO_DURATION = 15;
export const DEFAULT_KHOKHO_RULE = 'elusive';

export function normalizeKhokhoDuration(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_KHOKHO_DURATION;
  let best = KHOKHO_DURATIONS[0].seconds;
  let dist = Math.abs(n - best);
  for (const step of KHOKHO_DURATIONS) {
    const d = Math.abs(n - step.seconds);
    if (d < dist) { best = step.seconds; dist = d; }
  }
  return best;
}

export function khokhoVariant(seconds) {
  const s = normalizeKhokhoDuration(seconds);
  if (s <= 15) return { id: 'huddle', label: 'Quick Huddle Blitz', chairs: 6, spineHalfL: 8.6, khoCooldown: 0.7 };
  if (s <= 30) return { id: 'boardroom', label: 'Full 8-Chair Executive Boardroom', chairs: 8, spineHalfL: 10.6, khoCooldown: 0.9 };
  return { id: 'gauntlet', label: '3-Meeting All-Hands Gauntlet', chairs: 8, spineHalfL: 11.4, khoCooldown: 1.05 };
}

/** Exact dev-humor popups from docs/kho_kho_relay_blitz_swivel_chair_boardroom_edition_game_mode_spec.md. */
export const KHOKHO_POPUPS = {
  kho: [
    'KHO! Ticket silently reassigned to you!',
    'zorkoi security feature dubai dile prod',
  ],
  fakeKho: [
    'एकमेव साहेब blames you for not being clear',
    'ஒரே தலைவர் derailed by common sense again',
  ],
  tappaa: [
    'Rolling back the சர்வர் நேரம்',
    'Time travel ಸೇವೆಯಾಗಿ',
  ],
  cable: [
    'হোঁচট খেলাম by SQL Server group policy',
    'Swatahchya jababdarivar!! Tables secretly hotfixed from scratch',
  ],
  vp: [
    'Blocked by MeghJwala 502',
  ],
};

export const AISLE_HALF_Z = 7.4;

const RUNNER_COLORS = ['#38bdf8', '#ff6b6b', '#51cf66', '#ffd43b', '#cc5de8', '#ff922b', '#20c997', '#f06595'];

function pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export class KhokhoSim {
  constructor({ names, duration = DEFAULT_KHOKHO_DURATION, rule = DEFAULT_KHOKHO_RULE, rng = Math.random }) {
    if (!Array.isArray(names) || names.length < MIN_KHOKHO_PLAYERS || names.length > MAX_KHOKHO_PLAYERS) {
      throw new Error(`Kho-Kho Relay Blitz requires ${MIN_KHOKHO_PLAYERS}–${MAX_KHOKHO_PLAYERS} players.`);
    }
    this.rng = rng;
    this.duration = normalizeKhokhoDuration(duration);
    this.rule = rule === 'p1' ? 'p1' : 'elusive';
    this.variant = khokhoVariant(this.duration);
    this.spineHalfL = this.variant.spineHalfL;
    this.time = 0;
    this.done = false;
    this.winner = null;
    this.events = [];

    const n = names.length;
    this.targetWinnerId = Math.floor(rng() * n);
    this.khoChain = 0;
    this.nextKhoAt = 1.4;
    this.westWobbleT = 0;
    this.eastWobbleT = 0;
    this.vpSurgeAt = this.duration * 0.72;
    this.vpSurgeFired = false;

    // Alternating N–S–N–S leather executive swivel chairs along the central walnut table spine (z = 0)
    const cCount = this.variant.chairs;
    const span = (this.spineHalfL - 2.2) * 2;
    this.chairs = Array.from({ length: cCount }, (_, k) => ({
      index: k,
      x: -span / 2 + (k / Math.max(1, cCount - 1)) * span,
      z: 0,
      side: k % 2 === 0 ? 1 : -1, // +1 South (+Z), -1 North (-Z)
      spinT: 0,
    }));

    // Active P1 ESCALATION rolling-chair chaser(s)
    this.chasers = [
      { id: 0, active: true, x: -this.spineHalfL + 1.5, z: 3.4, vx: 11.5, vz: 0, dir: 1, half: 1, diveT: 0 },
      { id: 1, active: false, x: this.spineHalfL - 1.5, z: -3.4, vx: -11.5, vz: 0, dir: -1, half: -1, diveT: 0 },
    ];

    // Assign staggered tag waves to non-winners (keeping runner-up for 0.90 * duration final diving Tappaa!)
    const others = [];
    for (let i = 0; i < n; i++) if (i !== this.targetWinnerId) others.push(i);
    for (let i = others.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [others[i], others[j]] = [others[j], others[i]];
    }
    const tagTimeMap = new Map();
    others.forEach((id, idx) => {
      if (idx === others.length - 1) {
        tagTimeMap.set(id, this.duration * 0.9);
      } else {
        const frac = idx / Math.max(1, others.length - 1);
        tagTimeMap.set(id, this.duration * (0.2 + frac * 0.62));
      }
    });

    const flavors = ['kho', 'fakeKho', 'tappaa', 'cable', 'vp'];
    this.runners = names.map((name, i) => {
      const isWinner = i === this.targetWinnerId;
      const side = i % 2 === 0 ? 1 : -1;
      const startX = -this.spineHalfL * 0.8 + ((i % 7) / 6) * (this.spineHalfL * 1.6);
      const startZ = side * (3.2 + (i % 3) * 1.1);
      return {
        id: i,
        name,
        color: RUNNER_COLORS[i % RUNNER_COLORS.length],
        x: startX,
        z: startZ,
        vx: (side === 1 ? 1 : -1) * (5.6 + (i % 4) * 0.65),
        vz: 0,
        dir: side === 1 ? 1 : -1,
        laneZ: side * (3.3 + (i % 3) * 1.05),
        tagged: false,
        taggedAt: Infinity,
        isTargetWinner: isWinner,
        tagAt: this.rule === 'elusive' ? (isWinner ? Infinity : (tagTimeMap.get(i) ?? this.duration * 0.5)) : (isWinner ? this.duration * 0.3 : Infinity),
        flavor: flavors[i % flavors.length],
        phase: rng() * Math.PI * 2,
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
    for (const r of this.runners) if (!r.tagged) c++;
    return c;
  }

  step(dt) {
    this.time += dt;
    const t = this.time;

    if (this.westWobbleT > 0) this.westWobbleT = Math.max(0, this.westWobbleT - dt);
    if (this.eastWobbleT > 0) this.eastWobbleT = Math.max(0, this.eastWobbleT - dt);
    for (const ch of this.chairs) {
      if (ch.spinT > 0) ch.spinT = Math.max(0, ch.spinT - dt);
    }

    // 1. Trigger "VP JOINED THE CALL!" double-chaser surge at 0.72 * duration
    if (!this.done && !this.vpSurgeFired && t >= this.vpSurgeAt) {
      this.vpSurgeFired = true;
      this.chasers[1].active = true;
      this.emit({ type: 'vp', popup: pick(KHOKHO_POPUPS.vp, this.rng), remaining: this.activeCount() });
    }

    // 2. Scheduled KHO! Swivel-Chair handoffs along the central table spine
    if (!this.done && t >= this.nextKhoAt) {
      this.nextKhoAt = t + this.variant.khoCooldown + this.rng() * 0.45;
      const chaser = this.chasers[0];
      const chair = this.chairs[Math.floor(this.rng() * this.chairs.length)];
      chair.spinT = 0.75;
      chaser.x = chair.x;
      chaser.half = chair.side;
      chaser.z = chair.side * 1.4;
      chaser.dir = this.rng() < 0.5 ? 1 : -1;
      chaser.vx = chaser.dir * 13.5;
      chaser.vz = chair.side * 6.5;
      this.khoChain++;
      this.emit({
        type: 'kho',
        chair,
        chain: this.khoChain,
        popup: pick(KHOKHO_POPUPS.kho, this.rng),
        remaining: this.activeCount(),
      });
    }

    // 3. Move active rolling-chair chaser(s) with directional half-plane lock
    for (const c of this.chasers) {
      if (!c.active) continue;
      if (c.diveT > 0) c.diveT = Math.max(0, c.diveT - dt);

      if (this.done) {
        // Victory scene: coast smoothly into open aisle, well clear of the West Projector & East Chai carts
        const parkX = clamp(c.x, -(this.spineHalfL - 2.4), this.spineHalfL - 2.4);
        const parkZ = (c.z >= 0 ? 1 : -1) * Math.max(3.6, Math.min(AISLE_HALF_Z - 1.0, Math.abs(c.z)));
        c.vx = (parkX - c.x) * 2.4;
        c.vz = (parkZ - c.z) * 2.4;
        c.x += c.vx * dt;
        c.z += c.vz * dt;
        continue;
      }

      // Seek nearest active runner scheduled for tag, or patrol aisle
      const target = this.runners.find((r) => !r.tagged && t >= r.tagAt - 0.9);
      if (target) {
        const dx = target.x - c.x;
        const dz = target.z - c.z;
        const d = Math.max(0.1, Math.hypot(dx, dz));
        c.vx = (dx / d) * 15.5;
        c.vz = (dz / d) * 15.5;
      } else {
        c.vx = c.dir * 12.2;
        c.vz += (c.half * 4.2 - c.z) * 3.5 * dt;
        c.vz *= Math.exp(-3.0 * dt);
        if (c.x >= this.spineHalfL + 1.75 && c.dir > 0) {
          c.dir = -1;
          c.half *= -1;
          c.vx = c.dir * 12.2;
          this.eastWobbleT = 0.7;
        } else if (c.x <= -this.spineHalfL - 1.75 && c.dir < 0) {
          c.dir = 1;
          c.half *= -1;
          c.vx = c.dir * 12.2;
          this.westWobbleT = 0.7;
        }
      }
      c.x = clamp(c.x + c.vx * dt, -this.spineHalfL - 2.4, this.spineHalfL + 2.4);
      c.z = clamp(c.z + c.vz * dt, -AISLE_HALF_Z, AISLE_HALF_Z);
    }

    // 4. Update runners sprinting aisles, executing 180-deg Cart-Whip Reversals & chair-tag timeouts
    for (const r of this.runners) {
      if (r.tagged) {
        // Roll smoothly to the frosted-glass timeout bench along the South/North wall (clear of end carts)
        const benchX = clamp(r.x, -(this.spineHalfL - 1.8), this.spineHalfL - 1.8);
        const benchZ = (r.id % 2 === 0 ? 1 : -1) * (AISLE_HALF_Z + 1.4);
        r.x += (benchX - r.x) * Math.min(1, dt * 2.4);
        r.z += (benchZ - r.z) * Math.min(1, dt * 3.2);
        r.vx *= Math.exp(-4.0 * dt);
        r.vz = 0;
        continue;
      }

      if (this.done) {
        // Victory scene: winner celebrates in the open central aisle, well clear of Projector & Chai carts
        const celebX = clamp(r.x, -(this.spineHalfL - 2.6), this.spineHalfL - 2.6);
        const celebZ = (r.z >= 0 ? 1 : -1) * 4.4;
        r.vx = (celebX - r.x) * 2.8;
        r.vz = (celebZ - r.z) * 2.8;
        r.x += r.vx * dt;
        r.z += r.vz * dt;
        continue;
      }

      const speed = r.isTargetWinner ? 7.8 : 6.4;
      r.vx = r.dir * speed;
      r.vz = (r.laneZ - r.z) * 2.8 + Math.sin(t * 3.0 + r.phase) * 1.1;
      r.x += r.vx * dt;
      r.z = clamp(r.z + r.vz * dt, -AISLE_HALF_Z + 0.5, AISLE_HALF_Z - 0.5);

      // 180-degree Cart-Whip Reversal cleanly outside the West Projector Cart or East Chai Trolley!
      if (r.x >= this.spineHalfL + 1.75 && r.dir > 0) {
        r.dir = -1;
        r.laneZ = -r.laneZ;
        this.eastWobbleT = 0.8;
        this.emit({ type: 'whip', post: 'east', runner: r });
      } else if (r.x <= -this.spineHalfL - 1.75 && r.dir < 0) {
        r.dir = 1;
        r.laneZ = -r.laneZ;
        this.westWobbleT = 0.8;
        this.emit({ type: 'whip', post: 'west', runner: r });
      }

      // Check scheduled tag (with chaser diving Tappaa lunge!)
      if (!this.done && t >= r.tagAt) {
        r.tagged = true;
        r.taggedAt = t;
        this.chasers[0].diveT = 0.45;
        const pool = KHOKHO_POPUPS[r.flavor] ?? KHOKHO_POPUPS.tappaa;
        this.emit({
          type: 'tagged',
          runner: r,
          popup: pick(pool, this.rng),
          remaining: this.activeCount(),
        });

        if (this.rule === 'p1' && !this.winner) {
          this.winner = r;
          this.done = true;
          this.emit({ type: 'winner', runner: r });
          return;
        }
      }
    }

    // 5. Check Elusive Champion win condition or Outlook buzzer hard-cap
    if (!this.done) {
      const alive = this.runners.filter((r) => !r.tagged);
      if (this.rule === 'elusive' && (alive.length <= 1 || t >= this.duration)) {
        const champ = alive.find((r) => r.isTargetWinner) ?? alive[0] ?? this.runners[this.targetWinnerId];
        for (const r of alive) {
          if (r !== champ) {
            r.tagged = true;
            r.taggedAt = t;
          }
        }
        this.winner = champ;
        this.done = true;
        this.emit({ type: 'winner', runner: champ });
      } else if (this.rule === 'p1' && t >= this.duration) {
        const victim = this.runners[this.targetWinnerId];
        victim.tagged = true;
        this.winner = victim;
        this.done = true;
        this.emit({ type: 'winner', runner: victim });
      }
    }
  }

  standings() {
    return [...this.runners].sort((a, b) => {
      if (a === this.winner) return -1;
      if (b === this.winner) return 1;
      if (a.tagged !== b.tagged) return a.tagged ? 1 : -1;
      return b.taggedAt - a.taggedAt;
    });
  }
}

/** Runs a full Kho-Kho Relay Blitz match headlessly (for unit tests & no-WebGL fallback). */
export function runKhokhoHeadless(names, { duration = DEFAULT_KHOKHO_DURATION, rule = DEFAULT_KHOKHO_RULE, rng = Math.random } = {}) {
  const sim = new KhokhoSim({ names, duration, rule, rng });
  const maxTime = normalizeKhokhoDuration(duration) + 4;
  while (!sim.done && sim.time < maxTime) sim.step(1 / 60);
  return sim;
}
