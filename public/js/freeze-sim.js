// "Code Freeze" (Red Light, Green Light): 3D stop-and-go survival sprint simulation.
// Pure logic (no Three.js, no DOM), so it runs in Node for unit tests and headless fallback.

import { shuffle } from './sim.js';
import { MAX_NAMES } from './data-rules.js';
import { DEVELOPER_KINDS } from './deathmatch-sim.js';

export const MIN_FREEZE_PLAYERS = 2;
export const MAX_FREEZE_PLAYERS = MAX_NAMES; // 30

export const FREEZE_DURATIONS = [
  { seconds: 120, variant: 'enterprise', label: '120s', text: '120s · Enterprise' },
  { seconds: 60, variant: 'enterprise', label: '60s', text: '60s · Enterprise' },
  { seconds: 30, variant: 'standard', label: '30s', text: '30s · Standard' },
  { seconds: 15, variant: 'hotfix', label: '15s', text: '15s · Hotfix Dash' },
  { seconds: 10, variant: 'hotfix', label: '10s', text: '10s · Hotfix Dash' },
];
export const DEFAULT_FREEZE_DURATION = 30;

export function normalizeFreezeDuration(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_FREEZE_DURATION;
  let best = FREEZE_DURATIONS[0].seconds;
  let dist = Math.abs(n - best);
  for (const step of FREEZE_DURATIONS) {
    const d = Math.abs(n - step.seconds);
    if (d < dist) { best = step.seconds; dist = d; }
  }
  return best;
}

export function freezeVariant(seconds) {
  const s = normalizeFreezeDuration(seconds);
  if (s <= 15) return 'hotfix';
  if (s <= 30) return 'standard';
  return 'enterprise';
}

/** Exact dev-themed elimination popups from docs/code_freeze_game_mode_spec.md. */
export const FREEZE_EXCUSES = [
  'Blamed for not being clear!',
  'Made secret Ekmaatra hotfixes!',
  'Added ?ReturnUrl= to URLs.',
  'Created four 800-columns tables.',
  'Rolled back the server clock!',
  'Voted off the team!',
];

/** Builds runway geometry and cycle tuning for the chosen duration variant. */
export function buildFreezeCourse(duration = DEFAULT_FREEZE_DURATION) {
  const seconds = normalizeFreezeDuration(duration);
  const variant = freezeVariant(seconds);
  const length = variant === 'hotfix' ? 42 : variant === 'standard' ? 76 : seconds >= 120 ? 155 : 112;
  const halfWidth = 7.2;

  const checkpoints = variant === 'enterprise'
    ? [{ z: length * 0.34, label: 'STAGING' }, { z: length * 0.68, label: 'UAT' }]
    : [];

  // Slippery Tech Debt Ice patches (double braking slide distance during Enterprise Deployment)
  const iceZones = variant === 'enterprise'
    ? [
        { zStart: length * 0.22, zEnd: length * 0.31 },
        { zStart: length * 0.54, zEnd: length * 0.64 },
        { zStart: length * 0.78, zEnd: length * 0.87 },
      ]
    : [];

  return {
    seconds,
    variant,
    length,
    halfWidth,
    checkpoints,
    iceZones,
    zapChance: variant === 'hotfix' ? 0.50 : variant === 'standard' ? 0.36 : 0.28,
    allowFakeout: variant === 'standard' || variant === 'enterprise',
  };
}

/**
 * Deterministic 1D/2D stop-and-go sprint simulation for Code Freeze.
 * States: 'GREEN' (SPRINT OPEN) -> 'YELLOW' (PR IN REVIEW) -> 'RED' (CODE FREEZE!).
 * Fairness: every surviving runner draws burst speed and braking reaction from identical distributions.
 */
export class FreezeSim {
  constructor({ names, duration = DEFAULT_FREEZE_DURATION, rng = Math.random }) {
    if (!Array.isArray(names) || names.length < MIN_FREEZE_PLAYERS || names.length > MAX_FREEZE_PLAYERS) {
      throw new Error(`Code Freeze needs ${MIN_FREEZE_PLAYERS} to ${MAX_FREEZE_PLAYERS} players.`);
    }
    this.rng = rng;
    this.course = buildFreezeCourse(duration);
    this.time = 0;
    this.light = 'GREEN'; // 'GREEN' | 'YELLOW' | 'RED'
    this.lightT = 0;
    this.lightDuration = this.nextGreenDuration();
    this.redSweepZ = this.course.length;
    this.cycle = 1;
    this.emergencyDeploy = false;
    this.done = false;
    this.winner = null;
    this.winReason = null; // 'finish' | 'survivor'
    this.events = [];

    let bag = [];
    const nextKind = () => {
      if (!bag.length) bag = shuffle(DEVELOPER_KINDS.map((_, i) => i), rng);
      return DEVELOPER_KINDS[bag.pop()];
    };

    const cols = Math.min(10, names.length);
    const laneSpan = Math.min(this.course.halfWidth * 1.7, cols * 1.35);
    this.runners = names.map((name, id) => {
      const col = id % cols;
      const row = Math.floor(id / cols);
      const x = cols === 1 ? 0 : -laneSpan / 2 + (col / (cols - 1)) * laneSpan;
      return {
        id,
        name,
        kind: nextKind(),
        x,
        z: -row * 1.35,
        vz: 0,
        targetSpeed: 5.5 + rng() * 3.0,
        brakeDecel: 12 + rng() * 8,
        reactionDelay: 0.05 + rng() * 0.28,
        brakeTimer: 0,
        state: 'SPRINTING', // 'SPRINTING' | 'BRAKING' | 'FROZEN' | 'ZAPPED'
        zappedAt: null,
        scannedThisRed: false,
      };
    });

    this.events.push({ type: 'light', light: 'GREEN', text: '🟢 SPRINT OPEN — GO!' });
  }

  nextGreenDuration() {
    const base = this.course.variant === 'hotfix' ? 2.1 : this.course.variant === 'standard' ? 2.7 : 3.2;
    return base + this.rng() * 1.4;
  }

  drainEvents() {
    const out = this.events;
    this.events = [];
    return out;
  }

  aliveRunners() {
    return this.runners.filter((r) => r.state !== 'ZAPPED');
  }

  standings() {
    return [...this.runners].sort((a, b) => {
      const aDead = a.state === 'ZAPPED';
      const bDead = b.state === 'ZAPPED';
      if (aDead !== bDead) return aDead ? 1 : -1;
      return b.z - a.z;
    });
  }

  isOnIce(z) {
    return this.course.iceZones.some((ice) => z >= ice.zStart && z <= ice.zEnd);
  }

  enterGreen() {
    this.light = 'GREEN';
    this.lightT = 0;
    this.lightDuration = this.emergencyDeploy ? 6.0 : this.nextGreenDuration();
    this.cycle++;
    for (const r of this.runners) {
      if (r.state === 'ZAPPED') continue;
      r.state = 'SPRINTING';
      r.targetSpeed = (this.emergencyDeploy ? 9.5 : 5.4) + this.rng() * 3.4;
      r.scannedThisRed = false;
    }
    this.events.push({ type: 'light', light: 'GREEN', text: '🟢 SPRINT OPEN!' });
  }

  enterYellow() {
    this.light = 'YELLOW';
    this.lightT = 0;
    this.lightDuration = 0.45 + this.rng() * 0.22;
    this.isFakeout = this.course.allowFakeout && !this.emergencyDeploy && this.cycle > 1 && this.rng() < 0.22;

    for (const r of this.runners) {
      if (r.state === 'ZAPPED') continue;
      r.state = 'BRAKING';
      r.brakeTimer = 0;
      // Fair per-cycle braking roll: some runners skid/twitch too far and get caught by the Red laser!
      const slipRoll = this.rng() < this.course.zapChance;
      r.willSlip = slipRoll;
      r.reactionDelay = slipRoll ? 0.45 + this.rng() * 0.35 : 0.04 + this.rng() * 0.14;
      r.brakeDecel = slipRoll ? 1.8 + this.rng() * 1.4 : 16 + this.rng() * 7;
    }
    this.events.push({ type: 'light', light: 'YELLOW', text: '🟡 PR IN REVIEW…' });
  }

  enterRed() {
    this.light = 'RED';
    this.lightT = 0;
    this.lightDuration = this.course.variant === 'hotfix' ? 1.7 : 2.1;
    this.redSweepZ = this.course.length;
    for (const r of this.runners) {
      if (r.state !== 'ZAPPED') r.scannedThisRed = false;
    }
    this.events.push({ type: 'light', light: 'RED', text: '🔴 CODE FREEZE!' });
  }

  step(dt) {
    if (this.done) return;
    this.time += dt;
    this.lightT += dt;

    // Timer Pacing Guardrail: "Emergency Deploy!" if running behind schedule near target duration
    const alive = this.aliveRunners();
    const leaderZ = alive.length ? Math.max(...alive.map((r) => r.z)) : 0;
    const remainingDist = Math.max(0, this.course.length - leaderZ);
    const timeLeft = this.course.seconds - this.time;
    if (!this.emergencyDeploy && timeLeft <= Math.max(4, remainingDist / 7.5)) {
      this.emergencyDeploy = true;
      this.events.push({ type: 'emergency', text: '🚨 Emergency Deploy! Full sprint to finish!' });
      if (this.light === 'RED') this.enterGreen();
    }

    // Light state machine transitions
    if (this.lightT >= this.lightDuration) {
      if (this.light === 'GREEN' && !this.emergencyDeploy) {
        this.enterYellow();
      } else if (this.light === 'YELLOW') {
        if (this.isFakeout) {
          this.events.push({ type: 'fakeout', text: '⚡ PR Approved! False alarm — keep sprinting!' });
          this.enterGreen();
        } else {
          this.enterRed();
        }
      } else if (this.light === 'RED') {
        // Check Last Dev Standing before starting next Green
        const survivors = this.aliveRunners();
        if (survivors.length === 1) {
          this.done = true;
          this.winner = survivors[0];
          this.winReason = 'survivor';
          this.events.push({ type: 'win', runner: this.winner, reason: 'survivor' });
          return;
        }
        this.enterGreen();
      }
    }

    // Move runners
    for (const r of this.runners) {
      if (r.state === 'ZAPPED') continue;
      if (this.light === 'GREEN') {
        const accel = this.emergencyDeploy ? 18 : 11;
        r.vz += (r.targetSpeed - r.vz) * Math.min(1, dt * accel * 0.45);
        r.z += r.vz * dt;
      } else {
        // YELLOW or RED: braking physics (Tech Debt Ice halves braking deceleration!)
        r.brakeTimer += dt;
        if (r.brakeTimer >= r.reactionDelay) {
          const iceFactor = this.isOnIce(r.z) ? 0.45 : 1.0;
          const floorSpeed = r.willSlip ? 1.1 : 0;
          r.vz = Math.max(floorSpeed, r.vz - r.brakeDecel * iceFactor * dt);
        }
        r.z += r.vz * dt;
        if (r.vz <= 0.15) {
          r.vz = 0;
          r.state = 'FROZEN';
        }
      }

      // First Across the Line win condition
      if (r.z >= this.course.length) {
        r.z = this.course.length;
        this.done = true;
        this.winner = r;
        this.winReason = 'finish';
        this.events.push({ type: 'win', runner: r, reason: 'finish' });
        return;
      }
    }

    // During RED: sweep the RELEASE MANAGER laser back down the runway and zap anyone still moving
    if (this.light === 'RED') {
      const sweepProgress = Math.min(1, this.lightT / Math.max(0.4, this.lightDuration * 0.72));
      this.redSweepZ = this.course.length * (1 - sweepProgress);

      const survivorsNow = this.aliveRunners();
      let remainingCount = survivorsNow.length;
      for (const r of survivorsNow) {
        if (r.scannedThisRed || r.z < this.redSweepZ) continue;
        r.scannedThisRed = true;
        // Never wipe out the very last standing runner
        if (r.vz > 0.35 && remainingCount > 1) {
          r.state = 'ZAPPED';
          r.vz = 0;
          r.zappedAt = this.time;
          remainingCount--;
          const excuse = FREEZE_EXCUSES[Math.floor(this.rng() * FREEZE_EXCUSES.length)];
          this.events.push({ type: 'zap', runner: r, excuse });
        }
      }

      if (remainingCount === 1) {
        const sole = this.aliveRunners()[0];
        this.done = true;
        this.winner = sole;
        this.winReason = 'survivor';
        this.events.push({ type: 'win', runner: sole, reason: 'survivor' });
      }
    }
  }
}

/** Runs a full Code Freeze round headlessly (for no-WebGL fallback & unit tests). */
export function runFreezeHeadless(names, { duration = DEFAULT_FREEZE_DURATION, rng = Math.random } = {}) {
  const sim = new FreezeSim({ names, duration, rng });
  const maxSteps = Math.ceil((sim.course.seconds + 30) * 60);
  for (let i = 0; i < maxSteps && !sim.done; i++) sim.step(1 / 60);
  return sim;
}
