// "Karang Derby" (3D Bamboo Stilt Wobble Race): fairness-first 1/N pre-rolled pacing curves,
// inverted-pendulum balance wobble physics, bipedal stilt stride oscillators, scripted fiesta &
// tech-debt hazards (snapped legacy bamboo, low banderita/CAT-6 snags, PanganodSilab crosswind,
// pole tangles, spilled-coffee slicks), and Bamboo vs. Bagol (coconut shell) stilt styles.
// Pure logic (no Three.js, no DOM), so it runs in Node for unit tests and headless fallback.

import { MAX_NAMES } from './data-rules.js';

export const MIN_KARANG_PLAYERS = 2;
export const MAX_KARANG_PLAYERS = MAX_NAMES; // 30

export const KARANG_DURATIONS = [
  { seconds: 120, variant: 'relay', label: '120s', text: '120s · Grand Cebu-Chesapeake Relay' },
  { seconds: 60, variant: 'relay', label: '60s', text: '60s · Grand Cebu-Chesapeake Relay' },
  { seconds: 30, variant: 'derby', label: '30s', text: '30s · Fiesta Obstacle Derby' },
  { seconds: 15, variant: 'sprint', label: '15s', text: '15s · Barangay Sprint' },
  { seconds: 10, variant: 'sprint', label: '10s', text: '10s · Barangay Sprint' },
];
export const DEFAULT_KARANG_DURATION = 15;
export const DEFAULT_KARANG_STILTS = 'bamboo';

export function normalizeKarangDuration(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_KARANG_DURATION;
  let best = KARANG_DURATIONS[0].seconds;
  let dist = Math.abs(n - best);
  for (const step of KARANG_DURATIONS) {
    const d = Math.abs(n - step.seconds);
    if (d < dist) { best = step.seconds; dist = d; }
  }
  return best;
}

export function karangVariant(seconds) {
  const s = normalizeKarangDuration(seconds);
  if (s <= 15) return { id: 'sprint', label: 'Barangay Sprint', length: 64, allowRecovery: false };
  if (s <= 30) return { id: 'derby', label: 'Fiesta Obstacle Derby', length: 120, allowRecovery: true };
  return { id: 'relay', label: 'Grand Cebu-Chesapeake Relay', length: 180, allowRecovery: true };
}

/** Exact dev-humor popups from docs/karang_derby_game_mode_spec.md. */
export const KARANG_POPUPS = {
  snap: ['Leaned on do-not-touch-utils-safe-to-delete', 'Blocked by pan-os software license'],
  snag: ['Clotheslined by common sense', "Zabardasti feature paksit'd prod", 'URL edits banned. Fix: add ?ReturnUrl='],
  tangle: ["Tumba'd the user table!", "Failed to read Iklauti-ji's mind"],
  wind: ['PanganodSilab 500 Crosswind', 'Prod is down — PANAGAN!'],
  slick: ["Unstable Iklauti-ji's mind", 'IYAHAY NA!'],
};

export const BOULEVARD_HALF_W = 8.4;
export const START_Z = 0;

const RUNNER_COLORS = [
  '#ff6b6b', '#4dabf7', '#51cf66', '#ffd43b', '#cc5de8', '#ff922b',
  '#20c997', '#f06595', '#748ffc', '#a9e34b', '#3bc9db', '#fcc419',
];

function pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

/**
 * Plans a full, fairness-first Karang Derby race for 2..30 players.
 * Every player has an exact 1/N chance of winning the photo-finish teeter across the ribbon.
 */
export function planKarangMatch(names, { duration = DEFAULT_KARANG_DURATION, stilts = DEFAULT_KARANG_STILTS, rng = Math.random } = {}) {
  if (!Array.isArray(names) || names.length < MIN_KARANG_PLAYERS || names.length > MAX_KARANG_PLAYERS) {
    throw new Error(`Karang Derby needs ${MIN_KARANG_PLAYERS}–${MAX_KARANG_PLAYERS} players.`);
  }
  const dur = normalizeKarangDuration(duration);
  const variant = karangVariant(dur);
  const stiltStyle = stilts === 'bagol' ? 'bagol' : 'bamboo';
  const n = names.length;

  const startAt = Math.min(1.8, dur * 0.14);
  const finishAt = dur - 0.5;
  const raceDur = Math.max(4.0, finishAt - startAt);
  const finishZ = -variant.length;

  // Fairness-first 1/N winner roll + 2 close-call contenders
  const winnerId = Math.floor(rng() * n);
  const others = Array.from({ length: n }, (_, i) => i).filter((i) => i !== winnerId);
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }
  const runnerUpId = others[0] ?? null;
  const closeIds = new Set(others.slice(0, Math.min(3, others.length)));

  // Wind gust window mid-race
  const windAt = startAt + raceDur * 0.48;
  const windEnd = windAt + Math.min(2.6, raceDur * 0.22);

  // Arrange 2–10 players in 1 row, 11–30 in 2–3 staggered rows
  const perRow = n <= 10 ? n : Math.ceil(n / (n <= 20 ? 2 : 3));
  const spanX = Math.min(BOULEVARD_HALF_W * 1.62, Math.max(3.6, (perRow - 1) * 1.45));
  const hazardKinds = ['snap', 'snag', 'tangle', 'slick'];

  const runners = names.map((name, id) => {
    const row = Math.floor(id / perRow);
    const col = id % perRow;
    const inRow = Math.min(perRow, n - row * perRow);
    const laneX = inRow === 1 ? 0 : ((col / (inRow - 1)) - 0.5) * spanX;
    const startZ = START_Z + row * 1.9;

    const isWinner = id === winnerId;
    const isRunnerUp = id === runnerUpId;
    const isClose = closeIds.has(id);

    // Organic lead-swapping sinusoidal pace parameters
    const waveFreq = 1.6 + rng() * 1.8;
    const wavePhase = rng() * Math.PI * 2;
    const waveAmp = isWinner ? 0.045 : 0.065;

    // Scripted wipeout / stumble event
    let wipeout = null;
    if (isRunnerUp) {
      // Dramatic photo-finish clothesline right before the tape!
      wipeout = {
        at: finishAt - Math.min(0.65, raceDur * 0.08),
        kind: 'snag',
        popup: pick(KARANG_POPUPS.snag, rng),
        permanent: true,
      };
    } else if (!isWinner && !isClose && rng() < 0.72) {
      const kind = pick(hazardKinds, rng);
      wipeout = {
        at: startAt + raceDur * (0.24 + rng() * 0.55),
        kind,
        popup: pick(KARANG_POPUPS[kind], rng),
        permanent: !variant.allowRecovery || rng() < 0.55,
      };
    }

    // Target finish progress (1.0 = crosses ribbon at finishAt)
    const targetFrac = isWinner
      ? 1.01
      : isRunnerUp
        ? 0.975
        : isClose
          ? 0.91 + rng() * 0.055
          : 0.62 + rng() * 0.26;

    return {
      id,
      name,
      color: RUNNER_COLORS[id % RUNNER_COLORS.length],
      laneX,
      startZ,
      isWinner,
      isRunnerUp,
      isClose,
      waveFreq,
      wavePhase,
      waveAmp,
      targetFrac,
      wobbleFreq: 3.2 + rng() * 2.2,
      wobblePhase: rng() * Math.PI * 2,
      wipeout,
    };
  });

  // Static boulevard hazard props (low banderitas, coffee slicks, checkpoint arches)
  const slicks = [
    { x: -3.2, z: finishZ * 0.34, r: 2.2 },
    { x: 3.1, z: finishZ * 0.66, r: 2.3 },
  ];

  return {
    duration: dur,
    variant,
    stilts: stiltStyle,
    startAt,
    finishAt,
    raceDur,
    length: variant.length,
    finishZ,
    windAt,
    windEnd,
    windPopup: pick(KARANG_POPUPS.wind, rng),
    slicks,
    runners,
    winnerId,
    winner: runners[winnerId],
  };
}

/**
 * Samples a stilt-walker's 3D kinematics & inverted-pendulum balance state at match time `t`.
 */
export function sampleKarangRunner(r, plan, t) {
  if (t < plan.startAt) {
    // Phase 1: SAKA NA! Wobbling in place behind the chalk line
    const leanZ = Math.sin(t * r.wobbleFreq + r.wobblePhase) * 0.14;
    const leanX = Math.cos(t * (r.wobbleFreq * 0.8) + r.wobblePhase) * 0.12;
    return {
      x: r.laneX,
      z: r.startZ,
      leanZ,
      leanX,
      stridePhase: 0,
      leftLift: 0,
      rightLift: 0,
      armFlail: Math.abs(leanZ) * 3.5,
      balanceDanger: 0.15,
      fallen: false,
      fallProgress: 0,
      snapped: false,
      finished: false,
    };
  }

  // Check if in a wipeout fall (or recovering after 2.5s on 30s+ courses)
  let fallen = false;
  let fallProgress = 0;
  let snapped = false;
  let effectiveT = t;
  if (r.wipeout && t >= r.wipeout.at) {
    const sinceFall = t - r.wipeout.at;
    if (r.wipeout.permanent || sinceFall < 2.5) {
      fallen = true;
      fallProgress = Math.min(1, sinceFall / 0.72);
      snapped = r.wipeout.kind === 'snap';
      effectiveT = r.wipeout.at;
    } else {
      effectiveT = t - 2.5;
    }
  }

  const u = Math.max(0, Math.min(1.06, (effectiveT - plan.startAt) / plan.raceDur));
  // Smooth organic progress with lead-swapping waves
  const wave = Math.sin(u * Math.PI * r.waveFreq + r.wavePhase) * r.waveAmp * Math.sin(u * Math.PI);
  const progress = Math.max(0, u * r.targetFrac + wave);
  const z = r.startZ + (plan.finishZ - r.startZ) * progress;
  const swayX = Math.sin(u * Math.PI * 2.5 + r.wobblePhase) * 0.45;

  // Inverted-pendulum balance wobble + PanganodSilab crosswind torque!
  const inWind = t >= plan.windAt && t <= plan.windEnd;
  const windTorque = inWind ? Math.sin(((t - plan.windAt) / (plan.windEnd - plan.windAt)) * Math.PI) * 0.42 : 0;
  let leanZ = Math.sin(t * r.wobbleFreq + r.wobblePhase) * 0.18 + windTorque * (r.isWinner ? 0.55 : 0.95);
  let leanX = Math.cos(t * (r.wobbleFreq * 0.85) + r.wobblePhase) * 0.16;

  // Photo-finish dramatic teeter for the winner right before the tape
  if (r.isWinner && u > 0.88 && u < 1.0) {
    leanZ += Math.sin((u - 0.88) * 45) * 0.24;
  }

  const stridePhase = (effectiveT - plan.startAt) * (plan.stilts === 'bagol' ? 10.5 : 7.2) + r.id * 0.9;
  const amp = plan.stilts === 'bagol' ? 0.28 : 0.65;
  const leftLift = fallen ? 0 : Math.max(0, Math.sin(stridePhase) * amp);
  const rightLift = fallen ? 0 : Math.max(0, -Math.sin(stridePhase) * amp);
  const balanceDanger = fallen ? 1 : Math.min(1, Math.hypot(leanZ, leanX) / 0.55);

  return {
    x: r.laneX + swayX,
    z,
    leanZ,
    leanX,
    stridePhase,
    leftLift,
    rightLift,
    armFlail: Math.min(1.4, Math.hypot(leanZ, leanX) * 2.8 + (inWind ? 0.45 : 0)),
    balanceDanger,
    fallen,
    fallProgress,
    snapped,
    finished: !fallen && z <= plan.finishZ,
  };
}
