// "Launchpad Roulette" (Rocket Ignition Chaos): choreographed parametric rocket launch planner.
// Pure logic (no Three.js, no DOM), so it runs in Node for unit tests and headless fallback.

import { shuffle } from './sim.js';
import { MAX_NAMES } from './data-rules.js';

export const MIN_LAUNCH_PLAYERS = 2;
export const MAX_LAUNCH_PLAYERS = MAX_NAMES; // 30

export const LAUNCH_DURATIONS = [
  { seconds: 120, variant: 'orbital', label: '120s', text: '120s · Orbital Gauntlet' },
  { seconds: 60, variant: 'orbital', label: '60s', text: '60s · Orbital Gauntlet' },
  { seconds: 30, variant: 'twostage', label: '30s', text: '30s · Two-Stage' },
  { seconds: 15, variant: 'hotfix', label: '15s', text: '15s · Hotfix Launch' },
  { seconds: 10, variant: 'hotfix', label: '10s', text: '10s · Hotfix Launch' },
];
export const DEFAULT_LAUNCH_DURATION = 15;

export function normalizeLaunchDuration(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_LAUNCH_DURATION;
  let best = LAUNCH_DURATIONS[0].seconds;
  let dist = Math.abs(n - best);
  for (const step of LAUNCH_DURATIONS) {
    const d = Math.abs(n - step.seconds);
    if (d < dist) { best = step.seconds; dist = d; }
  }
  return best;
}

export function launchVariant(seconds) {
  const s = normalizeLaunchDuration(seconds);
  if (s <= 15) return 'hotfix';
  if (s <= 30) return 'twostage';
  return 'orbital';
}

/** Exact 6 rocket failure archetypes & dev-humor popups from docs/launchpad_roulette_game_mode_spec.md. */
export const FAILURE_ARCHETYPES = {
  padFizzle: {
    id: 'padFizzle',
    label: 'The Pad Fizzle',
    popups: ['Oops. That was pr0dI. I needed pr0dL.', '16 chars secret is too big'],
  },
  corkscrew: {
    id: 'corkscrew',
    label: 'The Corkscrew',
    popups: ['Failed to add ?returnUrl= to URL', '800 columns is not enough'],
  },
  sidewaysVeer: {
    id: 'sidewaysVeer',
    label: 'The Sideways Veer',
    popups: ['Rolled back the server clock', 'Failed to ping before flushing'],
  },
  prematureStaging: {
    id: 'prematureStaging',
    label: 'Premature Staging',
    popups: ['SSL Certs Ran Out of Fuel', 'Stabbed by Null pointer'],
  },
  midAirStall: {
    id: 'midAirStall',
    label: 'Mid-Air Stall',
    popups: ['Common sense leak', 'Engine was voted off the team!'],
  },
  cloudHeartbreak: {
    id: 'cloudHeartbreak',
    label: 'The Cloud-Deck Heartbreak',
    popups: ['Blamed for not being clear', '500 Internal Server Error'],
  },
};

const EARLY_FAILURES = ['padFizzle', 'prematureStaging', 'sidewaysVeer'];
const MID_FAILURES = ['corkscrew', 'sidewaysVeer', 'midAirStall'];

const ROCKET_COLORS = [
  '#ff6b6b', '#4dabf7', '#51cf66', '#ffd43b', '#cc5de8', '#ff922b',
  '#20c997', '#f06595', '#748ffc', '#a9e34b', '#3bc9db', '#fcc419',
];
const FLAIRS = ['duct-tape', 'big-fins', 'coffee-nose', 'antenna'];

/**
 * Responsive launchpad formation:
 * - 2..10 players: clean single curved arc
 * - 11..30 players: staggered 2..3 row amphitheater grid
 */
export function padFormation(count) {
  const spots = [];
  if (count <= 10) {
    const radius = 14;
    const span = Math.min(1.5, Math.max(0.45, (count - 1) * 0.16));
    for (let i = 0; i < count; i++) {
      const a = count === 1 ? 0 : -span / 2 + (i / (count - 1)) * span;
      spots.push({ x: Math.sin(a) * radius, z: (1 - Math.cos(a)) * radius * 0.65 });
    }
    return spots;
  }
  const rows = count <= 20 ? 2 : 3;
  const perRow = Math.ceil(count / rows);
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    const inRow = Math.min(perRow, count - row * perRow);
    const width = Math.min(22, (inRow - 1) * 2.3);
    const x = inRow === 1 ? 0 : -width / 2 + (col / (inRow - 1)) * width + (row % 2 ? 0.55 : -0.55);
    const z = row * 3.1;
    spots.push({ x, z });
  }
  return spots;
}

/**
 * Plans a full choreographed Launchpad Roulette round for `names` (2..30).
 * Fairness: draws `winnerId` uniformly at random (`1 / N`), then staggers comedic failure
 * archetypes for every other rocket between 25% and 92% of the flight duration.
 */
export function planLaunchMatch(names, { duration = DEFAULT_LAUNCH_DURATION, rng = Math.random } = {}) {
  if (!Array.isArray(names) || names.length < MIN_LAUNCH_PLAYERS || names.length > MAX_LAUNCH_PLAYERS) {
    throw new Error(`Launchpad Roulette needs ${MIN_LAUNCH_PLAYERS} to ${MAX_LAUNCH_PLAYERS} players.`);
  }

  const seconds = normalizeLaunchDuration(duration);
  const variant = launchVariant(seconds);
  const countdownEnd = 2.4;
  const orbitAltitude = variant === 'hotfix' ? 62 : variant === 'twostage' ? 105 : seconds >= 120 ? 185 : 145;
  const cloudAltitude = orbitAltitude * 0.84;
  const stageSepAt = variant === 'twostage' ? roundT(countdownEnd + (seconds - countdownEnd) * 0.5) : null;

  const spots = padFormation(names.length);
  const slotOrder = shuffle(names.map((_, i) => i), rng);
  const winnerId = Math.floor(rng() * names.length);

  // Order non-winners so failures stagger smoothly across [25%, 92%] of total duration
  const losers = shuffle(names.map((_, i) => i).filter((id) => id !== winnerId), rng);
  const finalDecoyCount = Math.min(losers.length, losers.length >= 3 ? 2 : 1);
  const earlyMidCount = losers.length - finalDecoyCount;

  const failureMap = new Map();
  losers.forEach((id, idx) => {
    const isFinalDecoy = idx >= earlyMidCount;
    let failureType;
    let failFrac;
    if (isFinalDecoy) {
      failureType = 'cloudHeartbreak';
      const sub = (idx - earlyMidCount + 0.5) / Math.max(1, finalDecoyCount);
      failFrac = 0.84 + sub * 0.08; // 84%..92% right below the cloud deck!
    } else {
      const q = (idx + 0.5) / Math.max(1, earlyMidCount);
      failFrac = 0.25 + q * 0.55; // 25%..80%
      const pool = q < 0.42 ? EARLY_FAILURES : MID_FAILURES;
      failureType = pool[Math.floor(rng() * pool.length)];
    }
    const arch = FAILURE_ARCHETYPES[failureType];
    const popup = arch.popups[Math.floor(rng() * arch.popups.length)];
    const failureTime = roundT(Math.max(countdownEnd + 0.25, seconds * failFrac));
    failureMap.set(id, {
      failureType,
      failureTime,
      popup,
      veerDir: rng() < 0.5 ? -1 : 1,
      spinRate: (rng() < 0.5 ? -1 : 1) * (8 + rng() * 5),
    });
  });

  const rockets = names.map((name, id) => {
    const pad = spots[slotOrder[id]];
    const fail = failureMap.get(id) ?? null;
    return {
      id,
      name,
      color: ROCKET_COLORS[id % ROCKET_COLORS.length],
      flair: FLAIRS[Math.floor(rng() * FLAIRS.length)],
      padX: pad.x,
      padZ: pad.z,
      isWinner: id === winnerId,
      survivalTime: fail ? fail.failureTime : seconds,
      failureType: fail?.failureType ?? null,
      failureTime: fail?.failureTime ?? null,
      popup: fail?.popup ?? null,
      veerDir: fail?.veerDir ?? 1,
      spinRate: fail?.spinRate ?? 0,
      wobblePhase: rng() * Math.PI * 2,
    };
  });

  return {
    rockets,
    winnerId,
    winner: rockets[winnerId],
    duration: seconds,
    variant,
    countdownEnd,
    stageSepAt,
    cloudAltitude,
    orbitAltitude,
  };
}

/**
 * Pure parametric flight evaluator for rocket `r` at match time `t`.
 * Returns `{ x, y, z, rx, rz, alive, failed, popped, parachute, boosterOffsetY }`.
 */
export function sampleRocketState(r, t, plan) {
  const { countdownEnd, duration, orbitAltitude } = plan;
  if (t < countdownEnd) {
    // Rattling on the pad during 3... 2... 1...
    const rattle = t > countdownEnd - 1.4 ? Math.sin(t * 48 + r.wobblePhase) * 0.06 : 0;
    return { x: r.padX + rattle, y: 0, z: r.padZ, rx: 0, rz: rattle * 0.5, alive: true, failed: false, popped: false, parachute: false, boosterOffsetY: 0 };
  }

  const flightLen = Math.max(1, duration - countdownEnd);
  const climbAt = (time) => {
    const q = Math.max(0, Math.min(1, (time - countdownEnd) / flightLen));
    // Smooth accelerating ascent curve up to orbitAltitude
    return orbitAltitude * (0.28 * q + 0.72 * q * q);
  };

  if (!r.failureTime || t < r.failureTime) {
    const y = climbAt(t);
    const wobble = Math.sin(t * 5 + r.wobblePhase) * 0.18;
    const sepY = plan.stageSepAt && t >= plan.stageSepAt ? -(t - plan.stageSepAt) * 6 : 0;
    return {
      x: r.padX + wobble,
      y,
      z: r.padZ,
      rx: Math.cos(t * 4 + r.wobblePhase) * 0.04,
      rz: -wobble * 0.25,
      alive: true,
      failed: false,
      popped: false,
      parachute: false,
      boosterOffsetY: sepY,
    };
  }

  // Parametric failure curves after `r.failureTime`
  const dt = t - r.failureTime;
  const baseY = climbAt(r.failureTime);
  const baseX = r.padX;
  const baseZ = r.padZ;

  switch (r.failureType) {
    case 'padFizzle': {
      const hop = Math.max(0, 1.4 * dt - 4.5 * dt * dt);
      const tip = Math.min(Math.PI * 0.48, dt * 1.8) * r.veerDir;
      return { x: baseX + r.veerDir * Math.min(0.8, dt * 0.6), y: Math.min(baseY, 0.8) + hop, z: baseZ, rx: 0, rz: tip, alive: false, failed: true, popped: false, parachute: false, boosterOffsetY: 0 };
    }
    case 'prematureStaging': {
      // Cockpit stays on/near pad while booster shoots cleanly up into the sky!
      return { x: baseX, y: Math.max(0, baseY - dt * 2.5), z: baseZ, rx: 0, rz: Math.sin(dt * 8) * 0.12, alive: false, failed: true, popped: false, parachute: false, boosterOffsetY: dt * 26 };
    }
    case 'sidewaysVeer': {
      return {
        x: baseX + r.veerDir * dt * 18,
        y: baseY + dt * 2.5 - dt * dt * 1.2,
        z: baseZ - dt * 5,
        rx: 0.2,
        rz: -r.veerDir * Math.PI * 0.48,
        alive: false,
        failed: true,
        popped: dt > 1.6,
        parachute: false,
        boosterOffsetY: 0,
      };
    }
    case 'corkscrew': {
      const rad = 1.4 + dt * 2.4;
      const ang = dt * r.spinRate;
      return {
        x: baseX + Math.cos(ang) * rad,
        y: baseY + dt * 4.5 - dt * dt * 2.2,
        z: baseZ + Math.sin(ang) * rad,
        rx: Math.sin(ang) * 0.9,
        rz: Math.cos(ang) * 1.1,
        alive: false,
        failed: true,
        popped: dt > 1.1,
        parachute: false,
        boosterOffsetY: 0,
      };
    }
    case 'midAirStall': {
      // Engine cuts out -> comically tiny parachute deploys, drifting slowly downward
      return {
        x: baseX + Math.sin(dt * 2.4 + r.wobblePhase) * 1.1,
        y: Math.max(0, baseY + 1.2 - dt * 3.2),
        z: baseZ,
        rx: 0,
        rz: Math.sin(dt * 2.4) * 0.18,
        alive: false,
        failed: true,
        popped: false,
        parachute: true,
        boosterOffsetY: 0,
      };
    }
    case 'cloudHeartbreak':
    default: {
      return {
        x: baseX,
        y: baseY + dt * 1.5,
        z: baseZ,
        rx: dt * 3,
        rz: dt * 4,
        alive: false,
        failed: true,
        popped: true,
        parachute: false,
        boosterOffsetY: 0,
      };
    }
  }
}

function roundT(t) {
  return Math.round(t * 1000) / 1000;
}
