// "Mahjong Tile Wash" (Xǐpái Whirlpool Rumble): 144-tile analytical Rankine vortex field,
// scheduled Wind Reversals (EAST -> SOUTH -> WEST -> NORTH), Auto-Shuffle brass center chute
// suction & mechanical gear drop, PONG! 3-tile clamps, KONG! 4-tile sweeper walls, ricocheting
// giant ivory dice, Self-Drawn Champion (Hú!) vs. First Discard (Fàngpào) rules, and 10s–120s scaling.
// Pure logic (no Three.js, no DOM) for Node unit tests & headless fallback.

import { MAX_NAMES } from './data-rules.js';

export const MIN_MAHJONG_PLAYERS = 2;
export const MAX_MAHJONG_PLAYERS = MAX_NAMES; // 30

export const MAHJONG_DURATIONS = [
  { seconds: 120, variant: 'championship', label: '120s', text: '120s · Grand Automatic Table Championship' },
  { seconds: 60, variant: 'championship', label: '60s', text: '60s · Grand Automatic Table Championship' },
  { seconds: 30, variant: 'parlor', label: '30s', text: '30s · Full 4-Wind Parlor Rumble' },
  { seconds: 15, variant: 'blitz', label: '15s', text: '15s · Quick Wash Blitz' },
  { seconds: 10, variant: 'blitz', label: '10s', text: '10s · Quick Wash Blitz' },
];
export const DEFAULT_MAHJONG_DURATION = 15;
export const DEFAULT_MAHJONG_RULE = 'hu';

export function normalizeMahjongDuration(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_MAHJONG_DURATION;
  let best = MAHJONG_DURATIONS[0].seconds;
  let dist = Math.abs(n - best);
  for (const step of MAHJONG_DURATIONS) {
    const d = Math.abs(n - step.seconds);
    if (d < dist) { best = step.seconds; dist = d; }
  }
  return best;
}

export function mahjongVariant(seconds) {
  const s = normalizeMahjongDuration(seconds);
  if (s <= 15) return { id: 'blitz', label: 'Quick Wash Blitz', reversals: 1, chuteCycles: 2, diceVolleys: 1 };
  if (s <= 30) return { id: 'parlor', label: 'Full 4-Wind Parlor Rumble', reversals: 3, chuteCycles: 3, diceVolleys: 2 };
  return { id: 'championship', label: 'Grand Automatic Table Championship', reversals: 5, chuteCycles: 4, diceVolleys: 3 };
}

/** Exact dev-humor popups from docs/mahjong_tile_wash_x_p_i_whirlpool_rumble_game_mode_spec.md. */
export const MAHJONG_POPUPS = {
  pong: [
    'Blocked by fāméi de software license',
    'Buried in bù kěyòng audit logs',
  ],
  kong: [
    'Hòuguǒ zìfù! Tables secretly hotfixed from scratch',
    'Qiángtuī security feature gǎo bēng le prod',
  ],
  chute: [
    'Pá through 800 column table',
    'Rolling back fúwùqì shíjiān',
  ],
  wind: [
    'Wéiyī Lǎobǎn Dàrén derailed by common sense again',
    'Wéiyī Lǎobǎn Dàrén blames you for not being clear',
  ],
  dice: [
    'Blocked by Yúnyàn 502',
    'Sàibó Huófó 502 snake-eyes!',
  ],
};

export const TABLE_HALF = 11.2;
export const PIT_RADIUS = 2.55;
export const CORE_RADIUS = 5.4;
export const TILE_COUNT = 144;

const WINDS = ['EAST', 'SOUTH', 'WEST', 'NORTH'];
const SILK_COLORS = ['#ff4d6d', '#38bdf8', '#ffd43b', '#51cf66', '#cc5de8', '#ff922b', '#20c997', '#f06595'];

function pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export class MahjongSim {
  constructor({ names, duration = DEFAULT_MAHJONG_DURATION, rule = DEFAULT_MAHJONG_RULE, rng = Math.random }) {
    if (!Array.isArray(names) || names.length < MIN_MAHJONG_PLAYERS || names.length > MAX_MAHJONG_PLAYERS) {
      throw new Error(`Mahjong Tile Wash requires ${MIN_MAHJONG_PLAYERS}–${MAX_MAHJONG_PLAYERS} players.`);
    }
    this.rng = rng;
    this.duration = normalizeMahjongDuration(duration);
    this.rule = rule === 'fangpao' ? 'fangpao' : 'hu';
    this.variant = mahjongVariant(this.duration);
    this.time = 0;
    this.done = false;
    this.winner = null;
    this.events = [];

    const n = names.length;
    this.targetWinnerId = Math.floor(rng() * n);
    this.windDir = 1; // +1 clockwise, -1 counter-clockwise
    this.windIndex = 0;
    this.chuteOpen = false;
    this.chuteWarning = false;

    // Schedule Wind Reversals
    this.reversals = [];
    for (let r = 0; r < this.variant.reversals; r++) {
      const frac = (r + 1) / (this.variant.reversals + 1);
      this.reversals.push({ at: this.duration * (0.28 + frac * 0.48), fired: false });
    }

    // Schedule Auto-Shuffle Center Chute cycles (final cycle stays open through u = 0.85..1.0)
    this.chutes = [];
    const cycles = this.variant.chuteCycles;
    for (let c = 0; c < cycles; c++) {
      const isFinal = c === cycles - 1;
      const openAt = isFinal ? this.duration * 0.78 : this.duration * (0.24 + (c / cycles) * 0.48);
      const closeAt = isFinal ? this.duration + 5 : openAt + Math.min(2.6, this.duration * 0.18);
      this.chutes.push({ openAt, closeAt, warned: false, opened: false, closed: false, isFinal });
    }

    // Schedule PONG! (3-tile clamp) and KONG! (4-tile sweeper bar) calls
    this.pongAt = this.duration * 0.34;
    this.pongFired = false;
    this.pong = { active: false, x: 0, z: 0, timer: 0 };

    this.kongAt = this.duration * 0.85;
    this.kongFired = false;
    this.kong = { active: false, angle: 0, sweepProgress: 0 };

    // Giant bouncing ivory dice
    this.diceAt = this.duration * 0.56;
    this.diceFired = false;
    this.dice = [
      { active: false, x: 0, z: 0, vx: 13.5, vz: 9.2, rx: 0, ry: 0 },
      { active: false, x: 0, z: 0, vx: -11.4, vz: -12.8, rx: 0, ry: 0 },
    ];

    // 144 Mahjong tiles swirling continuously in the Rankine vortex
    this.tiles = Array.from({ length: TILE_COUNT }, (_, i) => {
      const ring = 0.28 + ((i % 12) / 12) * 0.68;
      const a = (i / TILE_COUNT) * Math.PI * 2 * 5 + rng() * 0.5;
      const r = PIT_RADIUS + 0.8 + ring * (TABLE_HALF - PIT_RADIUS - 1.6);
      return {
        x: clamp(Math.cos(a) * r, -TABLE_HALF + 0.7, TABLE_HALF - 0.7),
        z: clamp(Math.sin(a) * r, -TABLE_HALF + 0.7, TABLE_HALF - 0.7),
        yaw: a,
        faceUp: i % 3 !== 0,
        suit: i % 4,
      };
    });

    // Assign elimination waves strictly INSIDE open brass chute windows so nobody ever falls through a closed lid!
    const others = [];
    for (let i = 0; i < n; i++) if (i !== this.targetWinnerId) others.push(i);
    for (let i = others.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [others[i], others[j]] = [others[j], others[i]];
    }
    const elimTimeMap = new Map();
    const finalChute = this.chutes[this.chutes.length - 1];
    const earlierChutes = this.chutes.slice(0, Math.max(1, this.chutes.length - 1));
    others.forEach((id, idx) => {
      if (idx === others.length - 1) {
        // Keep the runner-up for the dramatic final open chute + KONG! squeeze
        elimTimeMap.set(id, Math.max(finalChute.openAt + 0.35, this.duration * 0.89));
      } else {
        const ch = earlierChutes[idx % earlierChutes.length];
        const span = Math.max(0.4, (ch.closeAt - ch.openAt) * 0.72);
        const frac = (idx % Math.max(1, Math.ceil(others.length / earlierChutes.length))) / Math.max(1, Math.ceil(others.length / earlierChutes.length));
        elimTimeMap.set(id, ch.openAt + 0.25 + frac * span);
      }
    });

    const firstChute = this.chutes[0];
    const causePool = ['chute', 'pong', 'wind', 'dice', 'kong'];
    this.devs = names.map((name, i) => {
      const a = (i / n) * Math.PI * 2;
      const r = clamp(4.8 + (i % 3) * 1.85, 4.2, TABLE_HALF - 1.6);
      const isWinner = i === this.targetWinnerId;
      return {
        id: i,
        name,
        color: SILK_COLORS[i % SILK_COLORS.length],
        x: Math.cos(a) * r,
        z: Math.sin(a) * r,
        y: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        eliminated: false,
        eliminatedAt: Infinity,
        isTargetWinner: isWinner,
        elimAt: this.rule === 'hu' ? (isWinner ? Infinity : (elimTimeMap.get(i) ?? finalChute.openAt + 0.4)) : (isWinner ? firstChute.openAt + 0.35 : Infinity),
        cause: causePool[i % causePool.length],
        orbitRadius: isWinner ? TABLE_HALF - 2.3 : clamp(4.0 + (i % 4) * 1.4, 3.6, TABLE_HALF - 2.2),
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

  windName() {
    return WINDS[this.windIndex % WINDS.length];
  }

  activeCount() {
    let c = 0;
    for (const d of this.devs) if (!d.eliminated) c++;
    return c;
  }

  /** Analytical Rankine vortex tangential speed at radius r. */
  vortexSpeed(r) {
    const w0 = 1.42;
    const rr = Math.max(0.4, r);
    return this.windDir * (rr <= CORE_RADIUS ? w0 * rr : (w0 * CORE_RADIUS * CORE_RADIUS) / rr);
  }

  step(dt) {
    this.time += dt;
    const t = this.time;

    // 1. Scheduled Wind Reversals
    if (!this.done) {
      for (const rev of this.reversals) {
        if (!rev.fired && t >= rev.at) {
          rev.fired = true;
          this.windDir *= -1;
          this.windIndex = (this.windIndex + 1) % WINDS.length;
          this.emit({
            type: 'wind',
            wind: this.windName(),
            popup: pick(MAHJONG_POPUPS.wind, this.rng),
            remaining: this.activeCount(),
          });
        }
      }

      // 2. Auto-Shuffle Center Chute cycles
      let openNow = false;
      let warnNow = false;
      for (const ch of this.chutes) {
        if (!ch.warned && t >= ch.openAt - 1.1 && t < ch.openAt) {
          ch.warned = true;
          this.emit({ type: 'chuteWarn' });
        }
        if (t >= ch.openAt - 1.1 && t < ch.openAt) warnNow = true;
        if (!ch.opened && t >= ch.openAt) {
          ch.opened = true;
          this.emit({ type: 'chuteOpen', isFinal: ch.isFinal, remaining: this.activeCount() });
        }
        if (t >= ch.openAt && t < ch.closeAt) openNow = true;
        if (!ch.closed && t >= ch.closeAt) {
          ch.closed = true;
          this.emit({ type: 'chuteClose' });
        }
      }
      this.chuteOpen = openNow;
      this.chuteWarning = warnNow;

      // 3. PONG! 3-Tile Red Dragon clamp
      if (!this.pongFired && t >= this.pongAt) {
        this.pongFired = true;
        this.pong.active = true;
        this.pong.timer = 1.8;
        this.pong.x = (this.rng() - 0.5) * 6;
        this.pong.z = (this.rng() - 0.5) * 6;
        this.emit({ type: 'pong', popup: pick(MAHJONG_POPUPS.pong, this.rng) });
      }
      if (this.pong.active) {
        this.pong.timer -= dt;
        if (this.pong.timer <= 0) this.pong.active = false;
      }

      // 4. Giant Ivory Dice ricochet volley
      if (!this.diceFired && t >= this.diceAt) {
        this.diceFired = true;
        for (const die of this.dice) {
          die.active = true;
          die.x = 0;
          die.z = 0;
        }
        this.emit({ type: 'dice', popup: pick(MAHJONG_POPUPS.dice, this.rng) });
      }

      // 5. Final KONG! 4-Tile Sweeper Bar at u = 0.85
      if (!this.kongFired && t >= this.kongAt) {
        this.kongFired = true;
        this.kong.active = true;
        this.kong.angle = 0;
        this.emit({ type: 'kong', popup: pick(MAHJONG_POPUPS.kong, this.rng), remaining: this.activeCount() });
      }
    }

    if (this.kong.active) {
      this.kong.angle += this.windDir * 2.1 * dt;
    }

    // Move bouncing giant ivory dice inside mahogany bumper rails
    for (const die of this.dice) {
      if (!die.active) continue;
      die.x += die.vx * dt;
      die.z += die.vz * dt;
      die.rx += die.vz * dt * 1.4;
      die.ry += die.vx * dt * 1.4;
      const lim = TABLE_HALF - 0.9;
      if (Math.abs(die.x) > lim) { die.x = Math.sign(die.x) * lim; die.vx *= -1; }
      if (Math.abs(die.z) > lim) { die.z = Math.sign(die.z) * lim; die.vz *= -1; }
    }

    // Integrate all 144 swirling Mahjong tiles via the Rankine vortex field
    const tileLim = TABLE_HALF - 0.65;
    for (const tile of this.tiles) {
      const r = Math.hypot(tile.x, tile.z);
      const vt = this.vortexSpeed(r);
      const tx = r > 0.01 ? -tile.z / r : 1;
      const tz = r > 0.01 ? tile.x / r : 0;
      // Gentle radial restoration keeps tiles distributed cleanly across the baize ring
      const pull = this.chuteOpen && r < 5.2 ? -1.4 : r < PIT_RADIUS + 0.6 ? 2.4 : 0;
      const rx = r > 0.01 ? tile.x / r : 0;
      const rz = r > 0.01 ? tile.z / r : 0;
      tile.x += (tx * vt + rx * pull) * dt;
      tile.z += (tz * vt + rz * pull) * dt;
      if (Math.abs(tile.x) > tileLim) tile.x = Math.sign(tile.x) * tileLim;
      if (Math.abs(tile.z) > tileLim) tile.z = Math.sign(tile.z) * tileLim;
      if (Math.hypot(tile.x, tile.z) < PIT_RADIUS + 0.35) {
        const ang = Math.atan2(tile.z, tile.x);
        tile.x = Math.cos(ang) * (TABLE_HALF - 1.3);
        tile.z = Math.sin(ang) * (TABLE_HALF - 1.3);
      }
      tile.yaw += this.windDir * 1.2 * dt;
    }

    // Update active players weaving through the vortex + chute suction eliminations
    for (const dev of this.devs) {
      if (dev.eliminated) {
        // Drop cleanly under gravity down into the glowing mechanical sorting gears
        if (dev.y > -7.5) {
          dev.vy -= 26.0 * dt;
          dev.y += dev.vy * dt;
          dev.x *= Math.exp(-3.2 * dt);
          dev.z *= Math.exp(-3.2 * dt);
        }
        continue;
      }

      const r = Math.hypot(dev.x, dev.z);
      const vt = this.vortexSpeed(r) * 0.72;
      const tx = r > 0.01 ? -dev.z / r : 1;
      const tz = r > 0.01 ? dev.x / r : 0;
      const rx = r > 0.01 ? dev.x / r : 1;
      const rz = r > 0.01 ? dev.z / r : 0;

      const pullingIn = !this.done && this.chuteOpen && t >= dev.elimAt - 0.9;
      let radialV = 0;
      if (pullingIn) {
        // Sucked straight toward the open brass center chute!
        radialV = -7.8;
      } else {
        const wantR = dev.isTargetWinner
          ? TABLE_HALF - 2.1 + Math.sin(t * 1.8 + dev.phase) * 0.7
          : Math.max(PIT_RADIUS + 1.2, dev.orbitRadius + Math.sin(t * 2.1 + dev.phase) * 0.9);
        radialV = clamp((wantR - r) * 2.8, -4.5, 4.5);
      }

      dev.vx = tx * vt + rx * radialV;
      dev.vz = tz * vt + rz * radialV;
      dev.x = clamp(dev.x + dev.vx * dt, -TABLE_HALF + 1.0, TABLE_HALF - 1.0);
      dev.z = clamp(dev.z + dev.vz * dt, -TABLE_HALF + 1.0, TABLE_HALF - 1.0);

      let newR = Math.hypot(dev.x, dev.z);
      // When the brass lid is CLOSED, devs walk/slide over or stay outside the lid — never fall through!
      if (!this.chuteOpen && newR < PIT_RADIUS + 0.45) {
        const ang = Math.atan2(dev.z, dev.x);
        dev.x = Math.cos(ang) * (PIT_RADIUS + 0.45);
        dev.z = Math.sin(ang) * (PIT_RADIUS + 0.45);
        newR = PIT_RADIUS + 0.45;
      }

      if (!this.done && this.chuteOpen && ((pullingIn && newR < PIT_RADIUS) || t >= dev.elimAt)) {
        dev.eliminated = true;
        dev.eliminatedAt = t;
        dev.vy = -1.5;
        const pool = MAHJONG_POPUPS[dev.cause] ?? MAHJONG_POPUPS.chute;
        this.emit({
          type: 'eliminated',
          dev,
          popup: pick(pool, this.rng),
          remaining: this.activeCount(),
        });

        if (this.rule === 'fangpao' && !this.winner) {
          this.winner = dev;
          this.done = true;
          this.emit({ type: 'winner', dev });
          return;
        }
      }
    }

    // Check Self-Drawn Champion (Hú!) win condition or hard-cap safeguard
    if (!this.done) {
      const alive = this.devs.filter((d) => !d.eliminated);
      if (this.rule === 'hu' && (alive.length <= 1 || t >= this.duration)) {
        const champ = alive.find((d) => d.isTargetWinner) ?? alive[0] ?? this.devs[this.targetWinnerId];
        for (const d of alive) {
          if (d !== champ) {
            d.eliminated = true;
            d.eliminatedAt = t;
            d.vy = -2.0;
          }
        }
        this.winner = champ;
        this.done = true;
        this.emit({ type: 'winner', dev: champ });
      } else if (this.rule === 'fangpao' && t >= this.duration) {
        const victim = this.devs[this.targetWinnerId];
        victim.eliminated = true;
        this.winner = victim;
        this.done = true;
        this.emit({ type: 'winner', dev: victim });
      }
    }
  }

  standings() {
    return [...this.devs].sort((a, b) => {
      if (a === this.winner) return -1;
      if (b === this.winner) return 1;
      if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1;
      if (a.eliminated && b.eliminated) return b.eliminatedAt - a.eliminatedAt;
      return Math.hypot(b.x, b.z) - Math.hypot(a.x, a.z);
    });
  }
}

/** Runs a full Mahjong Tile Wash match headlessly (for unit tests & no-WebGL fallback). */
export function runMahjongHeadless(names, { duration = DEFAULT_MAHJONG_DURATION, rule = DEFAULT_MAHJONG_RULE, rng = Math.random } = {}) {
  const sim = new MahjongSim({ names, duration, rule, rng });
  const maxTime = normalizeMahjongDuration(duration) + 4;
  while (!sim.done && sim.time < maxTime) sim.step(1 / 60);
  return sim;
}
