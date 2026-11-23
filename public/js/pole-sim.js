// "Greasy Pole Scramble" (Mashramani Slip-and-Slide): 3D cylindrical pole climbing kinematics,
// 2-state CLIMBING / SLIPPING grip physics with viscous grease drag, angular repulsion, domino-
// avalanche teammate collisions, Summit Champion vs. Mud-Drop rules, and 10s–120s duration scaling.
// Pure logic (no Three.js, no DOM), so it runs in Node for unit tests and headless fallback.

import { MAX_NAMES } from './data-rules.js';

export const MIN_POLE_PLAYERS = 2;
export const MAX_POLE_PLAYERS = MAX_NAMES; // 30

export const POLE_DURATIONS = [
  { seconds: 120, variant: 'towers', label: '120s', text: '120s · Republic Day Knockout Towers' },
  { seconds: 60, variant: 'towers', label: '60s', text: '60s · Republic Day Knockout Towers' },
  { seconds: 30, variant: 'mash', label: '30s', text: '30s · Full Mashramani Climb' },
  { seconds: 15, variant: 'blitz', label: '15s', text: '15s · Village Fair Blitz' },
  { seconds: 10, variant: 'blitz', label: '10s', text: '10s · Village Fair Blitz' },
];
export const DEFAULT_POLE_DURATION = 15;
export const DEFAULT_POLE_RULE = 'summit';

export function normalizePoleDuration(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_POLE_DURATION;
  let best = POLE_DURATIONS[0].seconds;
  let dist = Math.abs(n - best);
  for (const step of POLE_DURATIONS) {
    const d = Math.abs(n - step.seconds);
    if (d < dist) { best = step.seconds; dist = d; }
  }
  return best;
}

export function poleVariant(seconds) {
  const s = normalizePoleDuration(seconds);
  if (s <= 15) return { id: 'blitz', label: 'Village Fair Blitz', height: 14, bands: 2 };
  if (s <= 30) return { id: 'mash', label: 'Full Mashramani Climb', height: 22, bands: 4 };
  return { id: 'towers', label: 'Republic Day Knockout Towers', height: 26, bands: 4 };
}

/** Exact dev-humor popups from docs/greasy_pole_scramble_mashramani_slip_and_slide_game_mode_spec.md. */
export const POLE_POPUPS = {
  mud: ['Ekmaatra-ji still setting up an internal SSL cert for public website'],
  grease: [
    "Ekmaatra-ji's secret hotfixes recreates vital tables",
    'Ekmaatra-ji bans URL edits. Broke reports. Fix: add ?ReturnUrl= to URL',
  ],
  static: [
    'Ekmaatra-ji says you were not being clear',
    "Zabardasti security feature paksit'd prod",
  ],
  domino: ['IYAHAY NA! Ekmaatra-ji is on a witch hunt!'],
  splinter: [
    'Ekmaatra-ji rolled out an 800-column table aur gir gaya',
    'Ekmaatra-ji rolling back server clock to June 1996',
  ],
};

export const POLE_RADIUS = 0.85;
export const CLIMBER_OFFSET = 0.42;

const CLIMBER_COLORS = [
  '#ff6b6b', '#4dabf7', '#51cf66', '#ffd43b', '#cc5de8', '#ff922b',
  '#20c997', '#f06595', '#748ffc', '#a9e34b', '#3bc9db', '#fcc419',
];

function pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

/** Builds glowing grease/static hazard bands spaced up the cedar pole. */
export function buildPoleBands(height, bandCount) {
  const bands = [];
  for (let i = 0; i < bandCount; i++) {
    const frac = 0.28 + (i / Math.max(1, bandCount)) * 0.56;
    const kind = i % 2 === 0 ? 'grease' : 'static';
    bands.push({
      y: height * frac,
      halfH: 0.9,
      kind,
      slickness: kind === 'grease' ? 0.55 : 0.42,
    });
  }
  return bands;
}

/**
 * Real-time 3D cylindrical greasy-pole climbing simulation for 2..30 players.
 */
export class PoleSim {
  constructor({ names, duration = DEFAULT_POLE_DURATION, rule = DEFAULT_POLE_RULE, rng = Math.random } = {}) {
    if (!Array.isArray(names) || names.length < MIN_POLE_PLAYERS || names.length > MAX_POLE_PLAYERS) {
      throw new Error(`Greasy Pole Scramble needs ${MIN_POLE_PLAYERS}–${MAX_POLE_PLAYERS} players.`);
    }
    this.rng = rng;
    this.duration = normalizePoleDuration(duration);
    this.rule = rule === 'muddrop' ? 'muddrop' : 'summit';
    this.variant = poleVariant(this.duration);
    this.height = this.variant.height;
    this.bands = buildPoleBands(this.height, this.variant.bands);
    this.time = 0;
    this.startAt = Math.min(1.8, this.duration * 0.14);
    this.started = false;
    this.done = false;
    this.winner = null;
    this.events = [];

    const n = names.length;
    this.targetWinnerId = Math.floor(rng() * n);
    const others = Array.from({ length: n }, (_, i) => i).filter((i) => i !== this.targetWinnerId);
    this.runnerUpId = others[Math.floor(rng() * others.length)] ?? null;

    this.climbers = names.map((name, id) => {
      const theta = (id / n) * Math.PI * 2;
      return {
        id,
        name,
        color: CLIMBER_COLORS[id % CLIMBER_COLORS.length],
        theta,
        y: 0.1,
        vy: 0,
        state: 'ready', // 'ready' | 'climbing' | 'slipping' | 'chalking'
        chalkTimer: 0,
        slipCooldown: 0,
        hasClimbed: false,
        burstFreq: 2.2 + rng() * 1.8,
        burstPhase: rng() * Math.PI * 2,
        baseSpeed: (this.height / Math.max(5.5, this.duration - this.startAt)) * (1.15 + rng() * 0.35),
        isTargetWinner: id === this.targetWinnerId,
        isRunnerUp: id === this.runnerUpId,
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

  standings() {
    return [...this.climbers].sort((a, b) => b.y - a.y);
  }

  localSlickness(y) {
    for (const b of this.bands) {
      if (Math.abs(y - b.y) <= b.halfH) return b;
    }
    return null;
  }

  triggerSlip(c, kind, impulse = -4.5) {
    if (c.state === 'slipping' || c.y < 1.2) return;
    c.state = 'slipping';
    c.vy = Math.min(c.vy, impulse);
    c.slipCooldown = 2.4;
    this.emit({ type: 'slip', climber: c, kind, popup: pick(POLE_POPUPS[kind] ?? POLE_POPUPS.grease, this.rng) });
  }

  step(dt) {
    if (this.done) return;
    this.time += dt;
    const t = this.time;

    if (!this.started && t >= this.startAt) {
      this.started = true;
      for (const c of this.climbers) c.state = 'climbing';
      this.emit({ type: 'start' });
    }
    if (!this.started) return;

    const progress = (t - this.startAt) / Math.max(3, this.duration - this.startAt);
    const inSafeguard = progress >= 0.76;

    // 1. Update each climber's vertical grip physics
    for (const c of this.climbers) {
      if (c.slipCooldown > 0) c.slipCooldown = Math.max(0, c.slipCooldown - dt);

      if (c.state === 'chalking') {
        c.chalkTimer -= dt;
        if (c.chalkTimer <= 0) c.state = 'climbing';
        continue;
      }

      if (c.state === 'climbing') {
        const band = this.localSlickness(c.y);
        let slick = band ? band.slickness : 0;
        let speed = c.baseSpeed * (0.85 + 0.32 * Math.sin(t * c.burstFreq + c.burstPhase));

        if (this.rule === 'summit') {
          if (c.isTargetWinner && inSafeguard) {
            slick *= 0.12;
            const remDist = Math.max(0.5, this.height - c.y);
            const remTime = Math.max(0.35, this.duration - 0.35 - t);
            speed = Math.max(speed * 1.45, remDist / remTime);
          } else if (!c.isTargetWinner && c.y > this.height * 0.88) {
            // Keep non-winners from stealing the summit right before the climax
            speed *= 0.25;
            if (c.slipCooldown <= 0 && (c.isRunnerUp ? progress >= 0.90 : true)) {
              this.triggerSlip(c, c.isRunnerUp ? 'grease' : 'splinter', -6.8);
              continue;
            }
          }
        } else if (this.rule === 'muddrop' && c.isTargetWinner && c.y >= 2.8 && c.slipCooldown <= 0) {
          this.triggerSlip(c, 'grease', -9.2);
          continue;
        }

        c.vy = speed * (1 - slick);
        c.y += c.vy * dt;
        if (c.y >= 2.2) c.hasClimbed = true;

        // Random hazard slip inside grease/static bands
        if (band && c.slipCooldown <= 0 && !(c.isTargetWinner && this.rule === 'summit' && inSafeguard)) {
          const slipChance = (band.kind === 'grease' ? 0.55 : 0.45) * dt;
          if (this.rng() < slipChance) {
            this.triggerSlip(c, band.kind, -5.2 - this.rng() * 2.5);
          }
        }

        // Summit flag grab!
        if (this.rule === 'summit' && c.y >= this.height) {
          c.y = this.height;
          c.vy = 0;
          this.winner = c;
          this.done = true;
          this.emit({ type: 'winner', climber: c });
          return;
        }
      } else if (c.state === 'slipping') {
        // Gravity minus viscous grease drag
        const g = 18.0;
        const cGrease = 1.15;
        c.vy += (-g + cGrease * Math.abs(c.vy)) * dt;
        c.y += c.vy * dt;

        // Domino-avalanche collision: knock climbing teammates right below into a chain slide!
        for (const other of this.climbers) {
          if (other === c || other.state !== 'climbing') continue;
          if (other.isTargetWinner && this.rule === 'summit' && inSafeguard) continue;
          const dy = c.y - other.y;
          let dTheta = Math.abs(c.theta - other.theta);
          if (dTheta > Math.PI) dTheta = Math.PI * 2 - dTheta;
          if (dy > 0 && dy < 1.25 && dTheta < 0.55 && other.slipCooldown <= 0) {
            this.triggerSlip(other, 'domino', c.vy * 0.9);
          }
        }

        // Hit the glossy mud pit at y <= 0.1 (SPLORCH!)
        if (c.y <= 0.1) {
          c.y = 0.1;
          c.vy = 0;
          this.emit({ type: 'splorch', climber: c });
          if (this.rule === 'muddrop' && c.hasClimbed && !this.winner) {
            this.winner = c;
            this.done = true;
            this.emit({ type: 'winner', climber: c });
            return;
          }
          c.state = 'chalking';
          c.chalkTimer = this.duration <= 15 ? 0.65 : 1.3;
        }
      }
    }

    // 2. Mild angular repulsion around the 360-degree pole so climbers never overlap
    for (let i = 0; i < this.climbers.length; i++) {
      for (let j = i + 1; j < this.climbers.length; j++) {
        const a = this.climbers[i];
        const b = this.climbers[j];
        if (Math.abs(a.y - b.y) > 1.3) continue;
        let diff = b.theta - a.theta;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        if (Math.abs(diff) < 0.36) {
          const push = (diff >= 0 ? 1 : -1) * 1.4 * dt;
          a.theta -= push;
          b.theta += push;
        }
      }
    }

    // Hard-cap guarantee so round never exceeds duration + 1s
    if (t >= this.duration + 0.8 && !this.done) {
      const champ = this.climbers[this.targetWinnerId];
      if (this.rule === 'summit') champ.y = this.height;
      this.winner = champ;
      this.done = true;
      this.emit({ type: 'winner', climber: champ });
    }
  }
}

/** Runs a full Greasy Pole Scramble match headlessly (for unit tests & no-WebGL fallback). */
export function runPoleHeadless(names, { duration = DEFAULT_POLE_DURATION, rule = DEFAULT_POLE_RULE, rng = Math.random } = {}) {
  const sim = new PoleSim({ names, duration, rule, rng });
  const maxTime = normalizePoleDuration(duration) + 4;
  while (!sim.done && sim.time < maxTime) sim.step(1 / 60);
  return sim;
}
