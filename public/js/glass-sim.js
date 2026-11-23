// "Glass Bridge Deploy" (Tempered vs. Untested Prod Panes): high-altitude 50/50 glass catwalk
// spanning a pitch-black data-center chasm. Devs in numbered vests (01–30) leap across pairs of
// TESTED (TEMPERED) vs. UNTESTED PROD (FRAGILE) glass panes with parabolic hop arcs, mid-bridge
// hesitation freezes & bus-shoves, DARK MODE bridge bulb blackouts, sequential domino-shatter
// bridge detonation, Prod Survivor vs. Canary Deploy (First Fall) rules, and 10s–120s scaling.
// Pure logic (no Three.js, no DOM) for Node unit tests & headless fallback.

import { MAX_NAMES } from './data-rules.js';

export const MIN_GLASS_PLAYERS = 2;
export const MAX_GLASS_PLAYERS = MAX_NAMES; // 30

export const GLASS_DURATIONS = [
  { seconds: 120, variant: 'pipeline', label: '120s', text: '120s · 3-Bridge Release Pipeline' },
  { seconds: 60, variant: 'pipeline', label: '60s', text: '60s · 3-Bridge Release Pipeline' },
  { seconds: 30, variant: 'staging', label: '30s', text: '30s · Full Staging-to-Prod Crossing' },
  { seconds: 15, variant: 'hotfix', label: '15s', text: '15s · Hotfix Catwalk Blitz' },
  { seconds: 10, variant: 'hotfix', label: '10s', text: '10s · Hotfix Catwalk Blitz' },
];
export const DEFAULT_GLASS_DURATION = 15;
export const DEFAULT_GLASS_RULE = 'survivor';

export function normalizeGlassDuration(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_GLASS_DURATION;
  let best = GLASS_DURATIONS[0].seconds;
  let dist = Math.abs(n - best);
  for (const step of GLASS_DURATIONS) {
    const d = Math.abs(n - step.seconds);
    if (d < dist) { best = step.seconds; dist = d; }
  }
  return best;
}

export function glassVariant(seconds) {
  const s = normalizeGlassDuration(seconds);
  if (s <= 15) return { id: 'hotfix', label: 'Hotfix Catwalk Blitz', pairs: 6 };
  if (s <= 30) return { id: 'staging', label: 'Full Staging-to-Prod Crossing', pairs: 12 };
  return { id: 'pipeline', label: '3-Bridge Release Pipeline', pairs: 14 };
}

/** Exact dev-humor popups from docs/glass_bridge_deploy_game_mode_spec.md. */
export const GLASS_POPUPS = {
  shatter: [
    'In an accident? So? Here\'s your reprimand for car-accident tardiness.',
    'Traffic collision is not an approved excuse. Here\'s your tardiness reprimand.',
  ],
  shove: [
    'Ekmaatra-ji blames you for not being clear',
    'Ekmaatra-ji voluntold you for blame duty',
  ],
  squint: [
    'Drive accident victim to the clinic to cosplay as a concerned human',
    'FakeConcern 502 empathy blast wave',
  ],
  overload: [
    'Blocked by AirbagFlare 502: Unplanned merge at intersection',
  ],
  label: [
    'Loaded a deprecated \'Concerned Human\' SOP.',
  ],
};

export const PAIR_SPACING = 3.2;
export const LANE_OFFSET_X = 1.65;

/** Z-coordinate of bridge slot k: 0 = Start Gantry, 1..pairs = Glass Pairs, pairs+1 = PROD Gantry. */
export function pairZ(k, pairs) {
  const halfLen = ((pairs + 1) * PAIR_SPACING) / 2;
  return halfLen - k * PAIR_SPACING;
}

const SUIT_COLORS = ['#0ca678', '#15aabf', '#228be6', '#fab005', '#fd7e14', '#be4bdb', '#e64980', '#40c057'];

function pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

export class GlassSim {
  constructor({ names, duration = DEFAULT_GLASS_DURATION, rule = DEFAULT_GLASS_RULE, rng = Math.random }) {
    if (!Array.isArray(names) || names.length < MIN_GLASS_PLAYERS || names.length > MAX_GLASS_PLAYERS) {
      throw new Error(`Glass Bridge Deploy requires ${MIN_GLASS_PLAYERS}–${MAX_GLASS_PLAYERS} players.`);
    }
    this.rng = rng;
    this.duration = normalizeGlassDuration(duration);
    this.rule = rule === 'canary' ? 'canary' : 'survivor';
    this.variant = glassVariant(this.duration);
    this.pairCount = this.variant.pairs;
    this.time = 0;
    this.done = false;
    this.winner = null;
    this.events = [];

    const n = names.length;
    this.targetWinnerId = Math.floor(rng() * n);
    this.maxPairReached = 0;
    this.darkModeAt = this.duration * 0.78;
    this.darkModeFired = false;
    this.darkModeT = 0;
    this.shoveAt = this.duration * 0.48;
    this.shoveFired = false;
    this.detonateAt = this.duration * 0.9;
    this.detonatedCount = 0;
    this.detonating = false;

    // Glass pane pairs: each pair has safeSide (-1 Left or +1 Right), proven flag, and intact state per side
    this.pairs = Array.from({ length: this.pairCount }, (_, idx) => {
      const k = idx + 1;
      return {
        index: k,
        z: pairZ(k, this.pairCount),
        safeSide: rng() < 0.5 ? -1 : 1,
        proven: false,
        leftIntact: true,
        rightIntact: true,
      };
    });

    // Stagger fall times for non-winners across [0.20..0.88] * duration (keeping runner-up for final slow-mo!)
    const others = [];
    for (let i = 0; i < n; i++) if (i !== this.targetWinnerId) others.push(i);
    for (let i = others.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [others[i], others[j]] = [others[j], others[i]];
    }
    const fallTimeMap = new Map();
    others.forEach((id, idx) => {
      if (idx === others.length - 1) {
        fallTimeMap.set(id, this.duration * 0.87);
      } else {
        const frac = idx / Math.max(1, others.length - 1);
        fallTimeMap.set(id, this.duration * (0.2 + frac * 0.6));
      }
    });

    const flavors = ['shatter', 'shove', 'squint', 'overload', 'label'];
    const startZ = pairZ(0, this.pairCount) + 1.1;
    this.players = names.map((name, i) => {
      const isWinner = i === this.targetWinnerId;
      const col = i % 5;
      const row = Math.floor(i / 5);
      const startX = (col - 2) * 0.95;
      const z0 = startZ + row * 0.72;
      return {
        id: i,
        vest: String(i + 1).padStart(2, '0'),
        name,
        color: SUIT_COLORS[i % SUIT_COLORS.length],
        slot: 0, // 0 = start gantry, 1..pairCount = bridge pairs, pairCount+1 = PROD gantry
        lane: 0, // -1 left, +1 right, 0 gantry
        x: startX,
        y: 0,
        z: z0,
        fromX: startX,
        fromZ: z0,
        toX: startX,
        toZ: z0,
        hopT: 1,
        hopDur: 0.36,
        hopPeak: 1.25,
        vy: 0,
        microOx: ((i % 3) - 1) * 0.28,
        microOz: ((Math.floor(i / 3) % 3) - 1) * 0.24,
        fallen: false,
        fallenAt: Infinity,
        finished: false,
        isTargetWinner: isWinner,
        fallAt: this.rule === 'survivor'
          ? (isWinner ? Infinity : (fallTimeMap.get(i) ?? this.duration * 0.5))
          : (isWinner ? this.duration * 0.28 : Infinity),
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

  aliveCount() {
    let c = 0;
    for (const p of this.players) if (!p.fallen) c++;
    return c;
  }

  shatterPane(pair, side) {
    const alreadyBroken = side === -1 ? !pair.leftIntact : !pair.rightIntact;
    if (alreadyBroken) return false;
    if (side === -1) pair.leftIntact = false;
    else pair.rightIntact = false;
    this.emit({ type: 'shatter', pair, side, x: side * LANE_OFFSET_X, z: pair.z });
    return true;
  }

  hopTo(p, nextSlot, lane, peak = 1.28, dur = 0.36) {
    p.slot = nextSlot;
    p.lane = lane;
    p.fromX = p.x;
    p.fromZ = p.z;
    if (nextSlot <= 0) {
      p.toX = p.microOx * 2;
      p.toZ = pairZ(0, this.pairCount) + 1.0;
    } else if (nextSlot > this.pairCount) {
      p.toX = p.microOx * 2.2;
      p.toZ = pairZ(this.pairCount + 1, this.pairCount) - 1.1;
    } else {
      const pair = this.pairs[nextSlot - 1];
      p.toX = lane * LANE_OFFSET_X + p.microOx;
      p.toZ = pair.z + p.microOz;
    }
    p.hopT = 0;
    p.hopDur = dur;
    p.hopPeak = peak;
  }

  step(dt) {
    this.time += dt;
    const t = this.time;

    if (this.darkModeT > 0) this.darkModeT = Math.max(0, this.darkModeT - dt);

    // 1. Mid-bridge hesitation & bus-shove event
    if (!this.done && !this.shoveFired && t >= this.shoveAt) {
      this.shoveFired = true;
      this.emit({
        type: 'shove',
        popup: pick(GLASS_POPUPS.shove, this.rng),
        alive: this.aliveCount(),
        pair: this.maxPairReached,
      });
    }

    // 2. DARK MODE lights-out flash before final pane sprint
    if (!this.done && !this.darkModeFired && t >= this.darkModeAt) {
      this.darkModeFired = true;
      this.darkModeT = Math.min(3.2, this.duration * 0.16);
      this.emit({
        type: 'darkmode',
        popup: pick(GLASS_POPUPS.squint, this.rng),
        alive: this.aliveCount(),
        pair: this.maxPairReached,
      });
    }

    // 3. Advance players along the glass bridge with parabolic leaps & shatter drops
    const launchStart = Math.min(1.4, this.duration * 0.12);
    const bridgeWindow = Math.max(4, this.duration * 0.88 - launchStart);

    for (const p of this.players) {
      if (p.fallen) {
        p.vy -= 30 * dt;
        p.y = Math.max(-28, p.y + p.vy * dt);
        continue;
      }

      if (p.hopT < 1) {
        p.hopT = Math.min(1, p.hopT + dt / Math.max(0.12, p.hopDur));
        const u = p.hopT;
        p.x = p.fromX + (p.toX - p.fromX) * u;
        p.z = p.fromZ + (p.toZ - p.fromZ) * u;
        p.y = 4 * p.hopPeak * u * (1 - u);
      } else {
        p.y = 0;
      }

      if (this.done) continue;

      // Check scheduled fragile-pane fall
      if (t >= p.fallAt) {
        const targetPairIdx = Math.max(1, Math.min(this.pairCount, Math.max(p.slot, Math.ceil(((t - launchStart) / bridgeWindow) * this.pairCount))));
        const pair = this.pairs[targetPairIdx - 1];
        const fragileSide = -pair.safeSide;
        p.slot = targetPairIdx;
        p.lane = fragileSide;
        p.x = fragileSide * LANE_OFFSET_X;
        p.z = pair.z;
        p.y = 0;
        p.vy = -2.0;
        p.fallen = true;
        p.fallenAt = t;
        this.maxPairReached = Math.max(this.maxPairReached, targetPairIdx);
        this.shatterPane(pair, fragileSide);
        pair.proven = true;

        const pool = GLASS_POPUPS[p.flavor] ?? GLASS_POPUPS.shatter;
        this.emit({
          type: 'fall',
          player: p,
          pair: targetPairIdx,
          popup: pick(pool, this.rng),
          alive: this.aliveCount(),
        });

        if (this.rule === 'canary' && !this.winner) {
          this.winner = p;
          this.done = true;
          this.emit({ type: 'winner', player: p });
          return;
        }
        continue;
      }

      // Queue next safe-pane hop once landed
      if (t >= launchStart && p.hopT >= 1 && !p.finished) {
        const frac = Math.max(0, Math.min(1, (t - launchStart) / bridgeWindow));
        const desiredSlot = Math.min(
          this.pairCount + 1,
          Math.floor(frac * (this.pairCount + 1)) + (p.isTargetWinner && frac > 0.88 ? 1 : 0),
        );
        if (desiredSlot > p.slot) {
          const nextSlot = p.slot + 1;
          if (nextSlot <= this.pairCount) {
            const pair = this.pairs[nextSlot - 1];
            pair.proven = true;
            this.maxPairReached = Math.max(this.maxPairReached, nextSlot);
            this.hopTo(p, nextSlot, pair.safeSide, 1.32, 0.34);
            this.emit({ type: 'safe', player: p, pair: nextSlot, alive: this.aliveCount() });
          } else if (p.isTargetWinner || this.aliveCount() <= 1) {
            p.finished = true;
            this.hopTo(p, this.pairCount + 1, 0, 1.85, 0.46);
          }
        }
      }
    }

    // 4. Sequential domino-shatter bridge detonation once winner leaps onto PROD gantry (or at 0.90 * duration)
    if (!this.done && this.rule === 'survivor') {
      const champ = this.players[this.targetWinnerId];
      const alive = this.players.filter((p) => !p.fallen);
      const reachedProd = champ && !champ.fallen && champ.slot > this.pairCount && champ.hopT >= 1;
      if (reachedProd || alive.length <= 1 || t >= this.duration) {
        const winPlayer = (champ && !champ.fallen) ? champ : (alive[0] ?? this.players[this.targetWinnerId]);
        for (const p of alive) {
          if (p !== winPlayer) {
            p.fallen = true;
            p.fallenAt = t;
            p.vy = -2.5;
          }
        }
        if (winPlayer.slot <= this.pairCount) {
          winPlayer.finished = true;
          this.hopTo(winPlayer, this.pairCount + 1, 0, 1.8, 0.42);
        }
        this.winner = winPlayer;
        this.done = true;
        this.detonating = true;
        this.emit({ type: 'winner', player: winPlayer });
      }
    }

    // Domino-shatter remaining intact panes behind the winner!
    if (this.detonating && this.detonatedCount < this.pairCount) {
      const want = Math.min(this.pairCount, Math.floor((t - Math.min(t, this.detonateAt)) * 12) + 1);
      while (this.detonatedCount < want) {
        const pair = this.pairs[this.detonatedCount];
        this.shatterPane(pair, -1);
        this.shatterPane(pair, 1);
        this.detonatedCount++;
      }
    }
  }

  standings() {
    return [...this.players].sort((a, b) => {
      if (this.winner === a) return -1;
      if (this.winner === b) return 1;
      if (a.fallen !== b.fallen) return a.fallen ? 1 : -1;
      if (b.slot !== a.slot) return b.slot - a.slot;
      return b.fallenAt - a.fallenAt;
    });
  }
}

export function runGlassHeadless(names, opts = {}) {
  const sim = new GlassSim({ names, ...opts });
  const maxSteps = Math.ceil((sim.duration + 4) * 60);
  for (let i = 0; i < maxSteps && !sim.done; i++) sim.step(1 / 60);
  return sim;
}
