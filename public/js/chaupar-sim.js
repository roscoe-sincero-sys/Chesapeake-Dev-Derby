// "Chaupar Cowrie-Clash" (Boardroom Edition): ancient North Indian cross-board Chaupar (Pachisi)
// unrolled across a varnished teak Indian corporate conference table. Giant cowrie shells (kaudi)
// rain down for 1/2/4/6/12/25 (PACHEES!) parabolic pawn hops, KAAT DIYA! knockout cuts flicking
// rival pawns into the rolling metal office wastebasket, SHAKUNI LOADED ROLL! safe-square betrayals,
// Polycom speakerphone "AM I AUDIBLE?!" tremor waves, Crown the Charkoni vs. First Cut rules,
// and 10s–120s scaling. Pure logic (no Three.js, no DOM) for Node unit tests & headless fallback.

import { MAX_NAMES } from './data-rules.js';

export const MIN_CHAUPAR_PLAYERS = 2;
export const MAX_CHAUPAR_PLAYERS = MAX_NAMES; // 30

export const CHAUPAR_DURATIONS = [
  { seconds: 120, variant: 'allhands', label: '120s', text: '120s · All-Hands Quarterly Boardroom Derby' },
  { seconds: 60, variant: 'allhands', label: '60s', text: '60s · All-Hands Quarterly Boardroom Derby' },
  { seconds: 30, variant: 'boardroom', label: '30s', text: '30s · Full Boardroom Chaupar' },
  { seconds: 15, variant: 'sync', label: '15s', text: '15s · Quick Status Sync' },
  { seconds: 10, variant: 'sync', label: '10s', text: '10s · Quick Status Sync' },
];
export const DEFAULT_CHAUPAR_DURATION = 15;
export const DEFAULT_CHAUPAR_RULE = 'throne';

export function normalizeChauparDuration(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_CHAUPAR_DURATION;
  let best = CHAUPAR_DURATIONS[0].seconds;
  let dist = Math.abs(n - best);
  for (const step of CHAUPAR_DURATIONS) {
    const d = Math.abs(n - step.seconds);
    if (d < dist) { best = step.seconds; dist = d; }
  }
  return best;
}

export function chauparVariant(seconds) {
  const s = normalizeChauparDuration(seconds);
  if (s <= 15) return { id: 'sync', label: 'Quick Status Sync', armTiles: 6, volleyInterval: 2.2 };
  if (s <= 30) return { id: 'boardroom', label: 'Full Boardroom Chaupar', armTiles: 8, volleyInterval: 2.8 };
  return { id: 'allhands', label: 'All-Hands Quarterly Boardroom Derby', armTiles: 8, volleyInterval: 3.4 };
}

/** Exact dev-humor popups from docs/chaupar_cowrie_clash_boardroom_edition_game_mode_spec.md. */
export const CHAUPAR_POPUPS = {
  cut: [
    'Cut by Ekmaatra-ji — back to Sprint 0!',
    'Oshitsuke security feature gekichin\'d prod',
  ],
  shakuni: [
    'Yuiitsu-sama blames you for not being clear',
    'Nag-inusarang Agalon derailed by common sense again',
  ],
  speaker: [
    'Blocked by MeghJwala 502',
    'BadalJwala 502 echo feedback!',
  ],
  chai: [
    'Blocked by dead SSL certs',
    'URL edits banned. Fix: add ?ReturnUrl=',
  ],
  projector: [
    'You\'re on your own! Tables secretly recreated from scratch',
    'Stepped on ekmaatra group policy land mine',
  ],
};

export const TILE_SIZE = 1.18;
export const CHARKONI_HALF = 1.78;
export const BIN_POS = { x: 11.8, y: -2.4, z: 9.2 };

const PAWN_COLORS = ['#38bdf8', '#ff6b6b', '#51cf66', '#ffd43b', '#cc5de8', '#ff922b', '#20c997', '#f06595'];

function pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

/**
 * Maps an arm index (0=South, 1=East, 2=North, 3=West) and discrete path progress m in [0..maxTile]
 * to a 2D tabletop coordinate (x, z). Outer lane runs outward, wraps at the tip, then marches
 * inward down the center crimson/emerald home lane straight into the central Charkoni (0, 0).
 */
export function armTilePos(arm, m, armTiles) {
  const maxTile = armTiles * 2 + 1;
  const clamped = Math.max(0, Math.min(maxTile, m));
  if (clamped >= maxTile) return { x: 0, z: 0 };

  let localX = 0;
  let localZ = 0;
  if (clamped < armTiles) {
    // Outer lane moving toward arm tip
    localX = TILE_SIZE;
    localZ = CHARKONI_HALF + (clamped + 0.5) * TILE_SIZE;
  } else if (clamped === armTiles) {
    // Tip turn tile
    localX = 0;
    localZ = CHARKONI_HALF + (armTiles - 0.5) * TILE_SIZE;
  } else {
    // Center home lane marching inward toward Charkoni (0, 0)
    const back = clamped - armTiles;
    localX = 0;
    localZ = CHARKONI_HALF + Math.max(0, armTiles - 0.5 - back) * TILE_SIZE;
  }

  // Rotate around Y by arm * 90 degrees (0=+Z South, 1=+X East, 2=-Z North, 3=-X West)
  const angles = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
  const a = angles[arm % 4];
  const c = Math.cos(a);
  const s = Math.sin(a);
  return {
    x: localX * c + localZ * s,
    z: -localX * s + localZ * c,
  };
}

export class ChauparSim {
  constructor({ names, duration = DEFAULT_CHAUPAR_DURATION, rule = DEFAULT_CHAUPAR_RULE, rng = Math.random }) {
    if (!Array.isArray(names) || names.length < MIN_CHAUPAR_PLAYERS || names.length > MAX_CHAUPAR_PLAYERS) {
      throw new Error(`Chaupar Cowrie-Clash requires ${MIN_CHAUPAR_PLAYERS}–${MAX_CHAUPAR_PLAYERS} players.`);
    }
    this.rng = rng;
    this.duration = normalizeChauparDuration(duration);
    this.rule = rule === 'firstcut' ? 'firstcut' : 'throne';
    this.variant = chauparVariant(this.duration);
    this.armTiles = this.variant.armTiles;
    this.maxTile = this.armTiles * 2 + 1;
    this.time = 0;
    this.done = false;
    this.winner = null;
    this.events = [];

    const n = names.length;
    this.targetWinnerId = Math.floor(rng() * n);
    this.lastRoll = 6;
    this.lastRollLabel = '6';
    this.nextVolleyAt = 1.6;
    this.shakuniAt = this.duration * 0.44;
    this.shakuniFired = false;
    this.shakuniT = 0;
    this.speakerAt = this.duration * 0.62;
    this.speakerFired = false;
    this.speakerPulseT = 0;
    this.pacheesAt = this.duration * 0.86;
    this.pacheesFired = false;
    this.hitStopT = 0;

    // 6 colossal cowrie shells bouncing in the teak margin zones
    const marginSpots = [
      [-6.8, 5.8], [-5.2, 6.9], [5.8, -6.2], [7.1, -5.0], [-6.4, -5.6], [6.2, 5.9],
    ];
    this.cowries = marginSpots.map(([bx, bz], i) => ({
      id: i,
      baseX: bx,
      baseZ: bz,
      x: bx,
      y: 0.18,
      z: bz,
      vy: 0,
      mouthUp: i % 2 === 0,
      rotY: rng() * Math.PI * 2,
      spin: 0,
    }));

    // Schedule cuts for non-winners (leaving 1–2 finalists to duel near Charkoni)
    const others = [];
    for (let i = 0; i < n; i++) if (i !== this.targetWinnerId) others.push(i);
    for (let i = others.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [others[i], others[j]] = [others[j], others[i]];
    }
    const cutTimeMap = new Map();
    others.forEach((id, idx) => {
      if (idx === others.length - 1) {
        // Runner-up cut right at the 0.88 * duration PACHEES! photo finish
        cutTimeMap.set(id, this.duration * 0.88);
      } else {
        const frac = idx / Math.max(1, others.length - 1);
        cutTimeMap.set(id, this.duration * (0.2 + frac * 0.62));
      }
    });

    const flavors = ['cut', 'shakuni', 'speaker', 'chai', 'projector'];
    this.pawns = names.map((name, i) => {
      const isWinner = i === this.targetWinnerId;
      const arm = i % 4;
      const startPos = armTilePos(arm, 0, this.armTiles);
      const slotOffset = Math.floor(i / 4);
      const microAng = (slotOffset * 2.39996) % (Math.PI * 2);
      const microR = slotOffset === 0 ? 0 : Math.min(0.42, 0.16 + slotOffset * 0.05);
      return {
        id: i,
        name,
        color: PAWN_COLORS[i % PAWN_COLORS.length],
        arm,
        tile: 0,
        fromX: startPos.x + Math.cos(microAng) * microR,
        fromZ: startPos.z + Math.sin(microAng) * microR,
        toX: startPos.x + Math.cos(microAng) * microR,
        toZ: startPos.z + Math.sin(microAng) * microR,
        x: startPos.x + Math.cos(microAng) * microR,
        y: 0,
        z: startPos.z + Math.sin(microAng) * microR,
        hopT: 1,
        hopDur: 0.35,
        hopPeak: 1.1,
        microOx: Math.cos(microAng) * microR,
        microOz: Math.sin(microAng) * microR,
        cut: false,
        cutAt: Infinity,
        flickT: 0,
        flickStartX: 0,
        flickStartZ: 0,
        binOx: (rng() - 0.5) * 1.1,
        binOz: (rng() - 0.5) * 1.1,
        isTargetWinner: isWinner,
        scheduledCutAt: this.rule === 'throne'
          ? (isWinner ? Infinity : (cutTimeMap.get(i) ?? this.duration * 0.5))
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

  activeCount() {
    let c = 0;
    for (const p of this.pawns) if (!p.cut) c++;
    return c;
  }

  throwCowries(forcedRoll = null) {
    const rolls = [1, 2, 4, 6, 12, 25];
    const roll = forcedRoll ?? pick(rolls, this.rng);
    this.lastRoll = roll;
    this.lastRollLabel = roll === 25 ? 'PACHEES! (25)' : String(roll);
    const upCount = roll === 25 ? 6 : Math.max(1, Math.min(5, Math.round(roll / 2)));
    this.cowries.forEach((c, idx) => {
      c.x = c.baseX + (this.rng() - 0.5) * 1.6;
      c.z = c.baseZ + (this.rng() - 0.5) * 1.6;
      c.y = 4.2 + this.rng() * 1.8;
      c.vy = -1.5 - this.rng() * 2.0;
      c.mouthUp = idx < upCount;
      c.spin = (this.rng() - 0.5) * 16;
    });
    this.emit({ type: 'cowrie', roll, label: this.lastRollLabel, remaining: this.activeCount() });
  }

  hopPawn(p, nextTile, peak = 1.15, dur = 0.42) {
    p.tile = Math.min(this.maxTile, nextTile);
    p.fromX = p.x;
    p.fromZ = p.z;
    const dest = armTilePos(p.arm, p.tile, this.armTiles);
    const atThrone = p.tile >= this.maxTile;
    p.toX = atThrone ? 0 : dest.x + p.microOx;
    p.toZ = atThrone ? 0 : dest.z + p.microOz;
    p.hopT = 0;
    p.hopDur = dur;
    p.hopPeak = peak;
  }

  step(dt) {
    this.time += dt;
    const t = this.time;

    if (this.shakuniT > 0) this.shakuniT = Math.max(0, this.shakuniT - dt);
    if (this.speakerPulseT > 0) this.speakerPulseT = Math.max(0, this.speakerPulseT - dt);
    if (this.hitStopT > 0) this.hitStopT = Math.max(0, this.hitStopT - dt);

    // 1. Update bouncing cowrie shells (damped restitution e = 0.55)
    for (const c of this.cowries) {
      if (c.y > 0.18 || Math.abs(c.vy) > 0.1) {
        c.vy -= 26 * dt;
        c.y += c.vy * dt;
        c.rotY += c.spin * dt;
        if (c.y <= 0.18) {
          c.y = 0.18;
          if (Math.abs(c.vy) > 1.2) {
            c.vy = -c.vy * 0.55;
            c.spin *= 0.6;
          } else {
            c.vy = 0;
            c.spin = 0;
          }
        }
      }
    }

    // 2. Scheduled cowrie-rain volleys & boardroom disruptions
    if (!this.done && t >= this.nextVolleyAt && t < this.pacheesAt - 0.5) {
      this.nextVolleyAt = t + this.variant.volleyInterval;
      this.throwCowries();
      // Advance surviving pawns along their cross lanes
      const prog = Math.min(0.84, t / this.duration);
      for (const p of this.pawns) {
        if (p.cut) continue;
        const targetTile = Math.min(this.maxTile - 1, Math.max(p.tile + 1, Math.floor(prog * (this.maxTile - 1)) + (p.isTargetWinner ? 1 : 0)));
        if (targetTile > p.tile) {
          const isBig = this.lastRoll >= 12;
          this.hopPawn(p, targetTile, isBig ? 2.3 : 1.15, isBig ? 0.55 : 0.38);
        }
      }
    }

    if (!this.done && !this.shakuniFired && t >= this.shakuniAt) {
      this.shakuniFired = true;
      this.shakuniT = 2.6;
      this.emit({ type: 'shakuni', popup: pick(CHAUPAR_POPUPS.shakuni, this.rng), remaining: this.activeCount() });
    }

    if (!this.done && !this.speakerFired && t >= this.speakerAt) {
      this.speakerFired = true;
      this.speakerPulseT = 2.2;
      this.emit({ type: 'speaker', popup: pick(CHAUPAR_POPUPS.speaker, this.rng), remaining: this.activeCount() });
    }

    if (!this.done && !this.pacheesFired && t >= this.pacheesAt) {
      this.pacheesFired = true;
      this.throwCowries(25);
      const champ = this.pawns[this.targetWinnerId];
      if (champ && !champ.cut && this.rule === 'throne') {
        this.hopPawn(champ, this.maxTile, 3.4, 0.95);
      }
      this.emit({ type: 'pachees', remaining: this.activeCount() });
    }

    // 3. Animate pawn parabolic hops & ballistic KAAT DIYA! wastebasket flicks
    for (const p of this.pawns) {
      if (p.cut) {
        p.flickT = Math.min(1, p.flickT + dt * 1.45);
        const u = p.flickT;
        p.x = p.flickStartX + (BIN_POS.x + p.binOx - p.flickStartX) * u;
        p.z = p.flickStartZ + (BIN_POS.z + p.binOz - p.flickStartZ) * u;
        p.y = (1 - u) * 0.2 + u * BIN_POS.y + Math.sin(u * Math.PI) * 5.2;
        continue;
      }

      if (p.hopT < 1) {
        p.hopT = Math.min(1, p.hopT + dt / Math.max(0.1, p.hopDur));
        const u = p.hopT;
        p.x = p.fromX + (p.toX - p.fromX) * u;
        p.z = p.fromZ + (p.toZ - p.fromZ) * u;
        p.y = 4 * p.hopPeak * u * (1 - u);
      } else {
        p.y = 0;
      }

      // Check scheduled KAAT DIYA! cut
      if (!this.done && t >= p.scheduledCutAt) {
        p.cut = true;
        p.cutAt = t;
        p.flickT = 0;
        p.flickStartX = p.x;
        p.flickStartZ = p.z;
        this.hitStopT = 0.04;
        const pool = CHAUPAR_POPUPS[p.flavor] ?? CHAUPAR_POPUPS.cut;
        this.emit({
          type: 'cut',
          pawn: p,
          popup: pick(pool, this.rng),
          remaining: this.activeCount(),
        });

        if (this.rule === 'firstcut' && !this.winner) {
          this.winner = p;
          this.done = true;
          this.emit({ type: 'winner', pawn: p });
          return;
        }
      }
    }

    // 4. Check Crown the Charkoni win condition
    if (!this.done && this.rule === 'throne') {
      const alive = this.pawns.filter((p) => !p.cut);
      const champ = this.pawns[this.targetWinnerId];
      const landedOnThrone = champ && !champ.cut && champ.tile >= this.maxTile && champ.hopT >= 1;
      if (landedOnThrone || alive.length <= 1 || t >= this.duration) {
        const winPawn = (champ && !champ.cut) ? champ : (alive[0] ?? this.pawns[this.targetWinnerId]);
        for (const p of alive) {
          if (p !== winPawn) {
            p.cut = true;
            p.cutAt = t;
            p.flickT = 0;
            p.flickStartX = p.x;
            p.flickStartZ = p.z;
          }
        }
        if (winPawn.tile < this.maxTile) {
          this.hopPawn(winPawn, this.maxTile, 2.6, 0.5);
        }
        this.winner = winPawn;
        this.done = true;
        this.emit({ type: 'winner', pawn: winPawn });
      }
    }
  }

  standings() {
    return [...this.pawns].sort((a, b) => {
      if (this.winner === a) return -1;
      if (this.winner === b) return 1;
      if (a.cut !== b.cut) return a.cut ? 1 : -1;
      if (b.tile !== a.tile) return b.tile - a.tile;
      return b.cutAt - a.cutAt;
    });
  }
}

export function runChauparHeadless(names, opts = {}) {
  const sim = new ChauparSim({ names, ...opts });
  const maxSteps = Math.ceil((sim.duration + 4) * 60);
  for (let i = 0; i < maxSteps && !sim.done; i++) sim.step(1 / 60);
  return sim;
}
