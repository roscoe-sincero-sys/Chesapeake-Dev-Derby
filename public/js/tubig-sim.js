// "Tubig-Tubig Gauntlet" (Line-Blocking Dash): fairness-first 1/N pre-rolled street-court
// choreography, 4–5 horizontal water lines (Linter, Code Review, QA Gate, CAB Approval) +
// vertical center-spine Patotot roamer, 3-state runner juke/dash kinematics (LOCALHOST ->
// STAGING -> PROD), Champion vs. Classic Tag (Ikaw Na!) rules, and 10s–120s duration scaling.
// Pure logic (no Three.js, no DOM), so it runs in Node for unit tests and headless fallback.

import { MAX_NAMES } from './data-rules.js';

export const MIN_TUBIG_PLAYERS = 2;
export const MAX_TUBIG_PLAYERS = MAX_NAMES; // 30

export const TUBIG_DURATIONS = [
  { seconds: 120, variant: 'tournament', label: '120s', text: '120s · Barangay Knockout Tournament' },
  { seconds: 60, variant: 'tournament', label: '60s', text: '60s · Barangay Knockout Tournament' },
  { seconds: 30, variant: 'pipeline', label: '30s', text: '30s · Full Deployment Pipeline' },
  { seconds: 15, variant: 'sprint', label: '15s', text: '15s · Hotfix Sprint' },
  { seconds: 10, variant: 'sprint', label: '10s', text: '10s · Hotfix Sprint' },
];
export const DEFAULT_TUBIG_DURATION = 15;
export const DEFAULT_TUBIG_RULE = 'champion';

export function normalizeTubigDuration(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_TUBIG_DURATION;
  let best = TUBIG_DURATIONS[0].seconds;
  let dist = Math.abs(n - best);
  for (const step of TUBIG_DURATIONS) {
    const d = Math.abs(n - step.seconds);
    if (d < dist) { best = step.seconds; dist = d; }
  }
  return best;
}

export function tubigVariant(seconds) {
  const s = normalizeTubigDuration(seconds);
  if (s <= 15) return { id: 'sprint', label: 'Hotfix Sprint', lineCount: 4, courtLen: 26 };
  if (s <= 30) return { id: 'pipeline', label: 'Full Deployment Pipeline', lineCount: 5, courtLen: 34 };
  return { id: 'tournament', label: 'Barangay Knockout Tournament', lineCount: 5, courtLen: 38 };
}

/** Exact dev-humor tag popups from docs/tubig_tubig_gauntlet_game_mode_spec.md. */
export const TUBIG_POPUPS = {
  linter: [
    'Blocked by pan-os software license',
    'URL edits banned. Fix: add ?ReturnUrl=',
    'Missing semicolon — BALIK!',
  ],
  review: [
    'Nitpick: rename all new tables with the -x',
    'Ekmaatra-ji blames you for not being clear',
  ],
  qa: [
    'Blocked by PanganodSilab 500',
    'BadalJwala rate-limited you',
    "Zabardasti feature paksit'd prod",
  ],
  cab: [
    'Ekmaatra-ji derailed by common sense again',
    'Nag-inusarang Agalon derailed by common sense again',
  ],
  patotot: [
    'Ekmaatra is doing a flyby — PANAGAN!',
    "Tumba'd the user table!",
  ],
};

export const COURT_HALF_W = 8.4;
export const LOCALHOST_Z = 14.0;

const RUNNER_COLORS = [
  '#ff6b6b', '#4dabf7', '#51cf66', '#ffd43b', '#cc5de8', '#ff922b',
  '#20c997', '#f06595', '#748ffc', '#a9e34b', '#3bc9db', '#fcc419',
];

const BLOCKER_DEFS = [
  { key: 'linter', label: 'LINTER', color: '#ff6b6b', speed: 2.8 },
  { key: 'review', label: 'CODE REVIEW', color: '#fcc419', speed: 2.3 },
  { key: 'qa', label: 'QA GATE', color: '#ff922b', speed: 2.5 },
  { key: 'cab', label: 'CAB APPROVAL', color: '#cc5de8', speed: 2.1 },
  { key: 'qa', label: 'PROD SIGN-OFF', color: '#38bdf8', speed: 2.6 },
];

function pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

/**
 * Plans a full, fairness-first Tubig-Tubig Gauntlet match for 2..30 players.
 * Supports both 'champion' (first to complete LOCALHOST -> STAGING -> PROD) and 'tag' (first tagged = Ikaw Na!).
 */
export function planTubigMatch(names, { duration = DEFAULT_TUBIG_DURATION, rule = DEFAULT_TUBIG_RULE, rng = Math.random } = {}) {
  if (!Array.isArray(names) || names.length < MIN_TUBIG_PLAYERS || names.length > MAX_TUBIG_PLAYERS) {
    throw new Error(`Tubig-Tubig Gauntlet needs ${MIN_TUBIG_PLAYERS}–${MAX_TUBIG_PLAYERS} players.`);
  }
  const dur = normalizeTubigDuration(duration);
  const variant = tubigVariant(dur);
  const modeRule = rule === 'tag' ? 'tag' : 'champion';
  const n = names.length;

  const startAt = Math.min(1.8, dur * 0.14);
  const finishAt = modeRule === 'tag' ? Math.min(dur - 0.6, startAt + Math.max(4.5, dur * 0.42)) : dur - 0.5;
  const raceDur = Math.max(4.0, finishAt - startAt);
  const stagingZ = LOCALHOST_Z - variant.courtLen;

  // Build horizontal water lines evenly spaced between LOCALHOST and STAGING
  const lines = [];
  for (let i = 0; i < variant.lineCount; i++) {
    const frac = (i + 1) / (variant.lineCount + 1);
    const def = BLOCKER_DEFS[i % BLOCKER_DEFS.length];
    lines.push({
      index: i,
      key: def.key,
      label: def.label,
      color: def.color,
      z: LOCALHOST_Z - variant.courtLen * frac,
      speed: def.speed,
      phase: rng() * Math.PI * 2,
    });
  }

  // Fairness-first 1/N winner roll + 1–2 close finalists
  const winnerId = Math.floor(rng() * n);
  const others = Array.from({ length: n }, (_, i) => i).filter((i) => i !== winnerId);
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }
  const runnerUpId = others[0] ?? null;
  const closeIds = new Set(others.slice(0, Math.min(2, others.length)));

  // Fan 2..30 runners cleanly across the LOCALHOST curb
  const perRow = n <= 12 ? n : Math.ceil(n / 2);
  const spanX = Math.min(COURT_HALF_W * 1.65, Math.max(3.6, (perRow - 1) * 1.35));

  const runners = names.map((name, id) => {
    const row = Math.floor(id / perRow);
    const col = id % perRow;
    const inRow = Math.min(perRow, n - row * perRow);
    const homeX = inRow === 1 ? 0 : ((col / (inRow - 1)) - 0.5) * spanX;
    const homeZ = LOCALHOST_Z + 1.2 + row * 1.35;

    const isWinner = id === winnerId;
    const isRunnerUp = id === runnerUpId;
    const isClose = closeIds.has(id);

    // Side-lane juke oscillation parameters
    const jukeAmp = 1.6 + rng() * 1.8;
    const jukeFreq = 2.6 + rng() * 1.8;
    const jukePhase = rng() * Math.PI * 2;
    const turnAt = startAt + raceDur * (isWinner ? 0.50 : 0.48 + rng() * 0.08);

    // Scripted splash tag event aligned to the EXACT time & X-coordinate when the runner crosses that water line!
    let splash = null;
    const calcSplash = (lineIdx, onReturn, usePatotot = false) => {
      const line = lines[lineIdx];
      let at;
      if (usePatotot) {
        const zFrac = 0.25 + rng() * 0.55;
        at = onReturn
          ? turnAt + (finishAt - turnAt) * zFrac
          : startAt + (turnAt - startAt) * zFrac;
      } else if (!onReturn) {
        const zFrac = Math.max(0.08, Math.min(0.95, (homeZ - line.z) / Math.max(1, homeZ - stagingZ)));
        at = startAt + (turnAt - startAt) * zFrac;
      } else {
        const endZ = LOCALHOST_Z - 1.2;
        const zFrac = Math.max(0.08, Math.min(0.96, (line.z - stagingZ) / Math.max(1, endZ - stagingZ)));
        at = turnAt + (finishAt - turnAt) * zFrac;
      }
      const key = usePatotot ? 'patotot' : line.key;
      return {
        at,
        lineIndex: usePatotot ? -1 : lineIdx,
        key,
        z: usePatotot ? (LOCALHOST_Z - variant.courtLen * 0.5) : line.z,
        popup: pick(TUBIG_POPUPS[key], rng),
      };
    };

    if (modeRule === 'tag') {
      if (isWinner) {
        const lineIdx = Math.floor(rng() * Math.min(2, lines.length));
        splash = calcSplash(lineIdx, false, false);
        splash.at = finishAt;
      }
    } else if (isRunnerUp) {
      // Dramatic slow-mo tag half a step from freedom on the final exit line!
      splash = calcSplash(0, true, false);
      splash.at = finishAt - Math.min(0.65, raceDur * 0.07);
    } else if (!isWinner) {
      // Nearly every other runner gets caught by a patrolling blocker on either the outbound or return leg!
      const surviveToEnd = isClose && rng() < 0.25;
      if (!surviveToEnd) {
        const usePatotot = rng() < 0.22;
        const onReturn = isClose ? true : rng() < 0.45;
        const lineIdx = Math.floor(rng() * lines.length);
        splash = calcSplash(lineIdx, onReturn, usePatotot);
      }
    }

    // Bleacher seat on the sideline after getting splashed
    const bleacherSide = id % 2 === 0 ? -1 : 1;
    const bleacherX = bleacherSide * (COURT_HALF_W + 2.2);
    const bleacherZ = LOCALHOST_Z - 3 - ((id * 2.1) % (variant.courtLen - 4));

    return {
      id,
      name,
      color: RUNNER_COLORS[id % RUNNER_COLORS.length],
      homeX,
      homeZ,
      isWinner,
      isRunnerUp,
      isClose,
      turnAt,
      jukeAmp,
      jukeFreq,
      jukePhase,
      splash,
      bleacherX,
      bleacherZ,
    };
  });

  const flushAt = startAt + raceDur * 0.82;

  const plan = {
    duration: dur,
    variant,
    rule: modeRule,
    startAt,
    finishAt,
    raceDur,
    flushAt,
    localhostZ: LOCALHOST_Z,
    stagingZ,
    lines,
    runners,
    winnerId,
    winner: runners[winnerId],
  };

  // Precompute exact intercept (x, z) for every scheduled splash so blockers physically sprint over & tag them!
  for (const r of plan.runners) {
    if (!r.splash) continue;
    const pos = sampleActivePath(r, plan, r.splash.at);
    r.splash.x = r.splash.lineIndex === -1 ? 0 : pos.x;
    r.splash.z = r.splash.lineIndex === -1 ? pos.z : plan.lines[r.splash.lineIndex].z;
  }

  return plan;
}

/** Samples a runner's 2D court kinematics & juke/splash state at match time `t`. */
export function sampleTubigRunner(r, plan, t) {
  if (t < plan.startAt) {
    return {
      x: r.homeX,
      z: r.homeZ,
      juking: false,
      splashed: false,
      splashProgress: 0,
      returning: false,
      finished: false,
      facing: Math.PI,
    };
  }

  // Splashed by a blocker -> brief splash stagger then step off to the sideline bleachers
  if (r.splash && t >= r.splash.at) {
    const since = t - r.splash.at;
    const splashProgress = Math.min(1, since / 0.9);
    const pre = sampleActivePath(r, plan, r.splash.at);
    if (since < 0.75) {
      return {
        x: pre.x,
        z: pre.z,
        juking: false,
        splashed: true,
        splashProgress,
        returning: pre.returning,
        finished: false,
        facing: pre.facing,
      };
    }
    const moveU = Math.min(1, (since - 0.75) / 1.1);
    return {
      x: pre.x + (r.bleacherX - pre.x) * moveU,
      z: pre.z + (r.bleacherZ - pre.z) * moveU,
      juking: false,
      splashed: true,
      splashProgress: 1,
      returning: false,
      finished: false,
      facing: r.bleacherX > 0 ? -Math.PI / 2 : Math.PI / 2,
    };
  }

  return sampleActivePath(r, plan, t);
}

function sampleActivePath(r, plan, t) {
  const half = Math.max(0.5, r.turnAt - plan.startAt);
  const back = Math.max(0.5, plan.finishAt - r.turnAt);

  if (t <= r.turnAt) {
    // Outbound leg: LOCALHOST -> STAGING with stop-and-go juke rhythm
    const u = Math.min(1, (t - plan.startAt) / half);
    const stutter = Math.sin(u * Math.PI * plan.lines.length * 2) * 0.025;
    const z = r.homeZ + (plan.stagingZ - r.homeZ) * Math.max(0, Math.min(1, u + stutter));
    const juke = Math.sin(t * r.jukeFreq + r.jukePhase) * r.jukeAmp * Math.sin(u * Math.PI);
    const x = Math.max(-COURT_HALF_W + 0.7, Math.min(COURT_HALF_W - 0.7, r.homeX * 0.75 + juke));
    return {
      x,
      z,
      juking: Math.abs(stutter) > 0.014,
      splashed: false,
      splashProgress: 0,
      returning: false,
      finished: false,
      facing: Math.PI,
    };
  }

  // Return leg: STAGING -> PROD (LOCALHOST exit)
  const u = Math.min(1.06, (t - r.turnAt) / back);
  const endZ = r.isWinner ? plan.localhostZ + 1.4 : plan.localhostZ - 1.2;
  const z = plan.stagingZ + (endZ - plan.stagingZ) * Math.min(1, u);
  const juke = Math.sin(t * (r.jukeFreq * 1.15) + r.jukePhase) * r.jukeAmp * Math.sin(Math.min(1, u) * Math.PI);
  const x = Math.max(-COURT_HALF_W + 0.7, Math.min(COURT_HALF_W - 0.7, r.homeX * 0.65 - juke));
  return {
    x,
    z,
    juking: Math.sin(u * Math.PI * 6) > 0.5,
    splashed: false,
    splashProgress: 0,
    returning: true,
    finished: r.isWinner && t >= plan.finishAt,
    facing: 0,
  };
}

/** Samples a horizontal line blocker's 1D rail position — actively sprints to intercept scheduled tags! */
export function sampleLineBlocker(line, plan, t) {
  const overtime = t > plan.startAt + plan.raceDur * 0.5 ? 1.38 : 1.0;
  let x = Math.sin(t * line.speed * overtime + line.phase) * (COURT_HALF_W - 1.1);
  let lunging = false;

  // Find nearest upcoming or just-landed tag on this line within +-0.75s
  let best = null;
  let bestDist = 0.75;
  for (const r of plan.runners) {
    if (!r.splash || r.splash.lineIndex !== line.index) continue;
    const dt = Math.abs(t - r.splash.at);
    if (dt < bestDist) {
      bestDist = dt;
      best = r.splash;
    }
  }
  if (best && Number.isFinite(best.x)) {
    const w = Math.cos((bestDist / 0.75) * (Math.PI / 2));
    const blend = w * w;
    x = x + (best.x - x) * blend;
    lunging = bestDist < 0.24;
  }
  return { x, z: line.z, overtime: overtime > 1, lunging };
}

/** Samples the center-spine Patotot roamer patrolling x = 0 and lunging to intercept center-lane tags. */
export function samplePatotot(plan, t) {
  const zMin = plan.lines.at(-1).z;
  const zMax = plan.lines[0].z;
  const mid = (zMin + zMax) / 2;
  const amp = (zMax - zMin) / 2;
  const overtime = t > plan.startAt + plan.raceDur * 0.5 ? 1.35 : 1.0;
  let z = mid + Math.sin(t * 2.1 * overtime) * amp;
  let lunging = false;

  let best = null;
  let bestDist = 0.75;
  for (const r of plan.runners) {
    if (!r.splash || r.splash.lineIndex !== -1) continue;
    const dt = Math.abs(t - r.splash.at);
    if (dt < bestDist) {
      bestDist = dt;
      best = r.splash;
    }
  }
  if (best && Number.isFinite(best.z)) {
    const w = Math.cos((bestDist / 0.75) * (Math.PI / 2));
    z = z + (best.z - z) * (w * w);
    lunging = bestDist < 0.24;
  }
  return { x: 0, z, overtime: overtime > 1, lunging };
}
