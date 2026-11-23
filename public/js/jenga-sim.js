// "Dependency Jenga" (3D Collapsing Tower): Guided Instability + Realistic Topple Collapse planner.
// Pure logic (no Three.js, no DOM), so it runs in Node for unit tests and headless fallback.

import { shuffle } from './sim.js';
import { MAX_NAMES } from './data-rules.js';

export const MIN_JENGA_PLAYERS = 2;
export const MAX_JENGA_PLAYERS = MAX_NAMES; // 30

export const JENGA_DURATIONS = [
  { seconds: 120, variant: 'monolith', label: '120s', text: '120s · Full Monolith Migration' },
  { seconds: 60, variant: 'monolith', label: '60s', text: '60s · Full Monolith Migration' },
  { seconds: 30, variant: 'major', label: '30s', text: '30s · Major Version Bump' },
  { seconds: 15, variant: 'friday', label: '15s', text: '15s · Friday Patch' },
  { seconds: 10, variant: 'friday', label: '10s', text: '10s · Friday Patch' },
];
export const DEFAULT_JENGA_DURATION = 15;

export function normalizeJengaDuration(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_JENGA_DURATION;
  let best = JENGA_DURATIONS[0].seconds;
  let dist = Math.abs(n - best);
  for (const step of JENGA_DURATIONS) {
    const d = Math.abs(n - step.seconds);
    if (d < dist) { best = step.seconds; dist = d; }
  }
  return best;
}

export function jengaVariant(seconds) {
  const s = normalizeJengaDuration(seconds);
  if (s <= 15) return { id: 'friday', label: 'Friday Patch', tiers: 12, pulls: 3, fakeOuts: 0, stackOnTop: false };
  if (s <= 30) return { id: 'major', label: 'Major Version Bump', tiers: 18, pulls: 6, fakeOuts: 2, stackOnTop: false };
  return { id: 'monolith', label: 'Full Monolith Migration', tiers: 24, pulls: s >= 120 ? 11 : 8, fakeOuts: 2, stackOnTop: true };
}

/** Exact dependency block catalogs and elimination excuses from docs/dependency_jenga_game_mode_spec.md. */
export const SAFE_BLOCKS = [
  'lamha.js',
  'jquery-1.9.min.js',
  'is-even',
  'is-odd',
  'todo-fix-never',
  'node_tables (200 GB)',
  'temp-hotfix-1999',
];

export const KEYSTONE_BLOCKS = [
  'blamed-for-not-being-clear',
  'do-not-touch-utils-x',
  'auth-v9-final2-draft7-actual4',
  'core-business-dont-ask-why.php',
  'load-bearing-hotfix',
];

export const JENGA_EXCUSES = [
  'Failed to rollback server clock',
  'Failed to renew software license!',
  'Failed to make WORD docs readible',
  'Failed to complete an already completed migration',
  'Failed to explain it a sixth time',
  'Blamed for not being clear',
  '16+ char passwords deprecated in v2',
];

export const CURSOR_LABELS = ['npm audit fix --force', 'DEPENDABOT', 'npm update --legacy-peer-deps'];

// Authentic 3:1 Jenga block ratio (3 blocks side-by-side form a crisp 6.0 x 6.0 square tower).
export const BLOCK_LENGTH = 6.0;
export const BLOCK_WIDTH = 2.0;
export const BLOCK_HEIGHT = 0.78;
export const SLOW_MO_SCALE = 0.35;

/**
 * Places ALL active players (2..30) solidly on top of the flat 6.0 x 6.0 Jenga rooftop
 * well inside the perimeter so nobody ever floats in mid-air beside the tower.
 */
export function perchPositions(count, tiers) {
  const topY = tiers * BLOCK_HEIGHT;
  const spots = [];
  const cols = count <= 2 ? count : count <= 4 ? 2 : count <= 9 ? 3 : count <= 16 ? 4 : count <= 25 ? 5 : 6;
  const rows = Math.ceil(count / cols);
  const maxSpan = BLOCK_LENGTH * 0.76; // 4.56 inside 6.0 footprint -> >= 0.72 margin from every edge!
  const spanX = cols <= 1 ? 0 : Math.min(maxSpan, (cols - 1) * 1.12);
  const spanZ = rows <= 1 ? 0 : Math.min(maxSpan, (rows - 1) * 1.08);

  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const inRow = Math.min(cols, count - row * cols);
    const rowSpanX = inRow <= 1 ? 0 : (spanX * (inRow - 1)) / Math.max(1, cols - 1);
    const x = inRow === 1 ? 0 : ((col / (inRow - 1)) - 0.5) * rowSpanX;
    const z = rows === 1 ? 0 : ((row / (rows - 1)) - 0.5) * spanZ;
    spots.push({ x, y: topY, z, tier: tiers - 1, onTop: true });
  }
  return spots;
}

/**
 * Plans a full Dependency Jenga round with fairness-first 1/N winner selection,
 * realistic Jenga pulls (base stays flush on table, progressive bend above pulled tiers,
 * micro-shudders on extraction, then directional topple into slow-mo collapse on keystone removal).
 */
export function planJengaMatch(names, { duration = DEFAULT_JENGA_DURATION, rng = Math.random } = {}) {
  if (!Array.isArray(names) || names.length < MIN_JENGA_PLAYERS || names.length > MAX_JENGA_PLAYERS) {
    throw new Error(`Dependency Jenga needs ${MIN_JENGA_PLAYERS}–${MAX_JENGA_PLAYERS} players.`);
  }

  const dur = normalizeJengaDuration(duration);
  const variant = jengaVariant(dur);
  const tiers = variant.tiers;

  // Fair 1/N pre-rolled winner
  const winnerIndex = Math.floor(rng() * names.length);

  // Build authentic Jenga tower stack (3 blocks per tier, alternating 0° and 90°).
  // Put the fatal keystone at tier 2, slot 1 (with adjacent slots 0 & 2 already precariously missing
  // or removed early on longer modes so the keystone looks unmistakably load-bearing!).
  const blocks = [];
  const keystoneTier = Math.min(2, tiers - 4);
  const keystoneSlot = 1;
  const keystoneLabel = KEYSTONE_BLOCKS[Math.floor(rng() * KEYSTONE_BLOCKS.length)];
  let blockId = 0;

  for (let tier = 0; tier < tiers; tier++) {
    const rotated = tier % 2 === 1;
    for (let slot = 0; slot < 3; slot++) {
      const isKeystone = tier === keystoneTier && slot === keystoneSlot;
      const offset = (slot - 1) * BLOCK_WIDTH;
      const label = isKeystone
        ? keystoneLabel
        : SAFE_BLOCKS[(tier * 3 + slot + Math.floor(rng() * SAFE_BLOCKS.length)) % SAFE_BLOCKS.length];
      // Start with two open outer gaps on the keystone tier so it's visibly balancing on ONE center keystone
      // (classic iconic Jenga "single center block" tension!).
      const preMissing = tier === keystoneTier && slot !== keystoneSlot;
      blocks.push({
        id: blockId++,
        tier,
        slot,
        rotated,
        localX: rotated ? offset : 0,
        localY: (tier + 0.5) * BLOCK_HEIGHT,
        localZ: rotated ? 0 : offset,
        jitterX: (rng() - 0.5) * 0.05,
        jitterZ: (rng() - 0.5) * 0.05,
        jitterYaw: (rng() - 0.5) * 0.014,
        woodTone: Math.floor(rng() * 3),
        label,
        isKeystone,
        preMissing,
        pulledAt: preMissing ? 0 : null,
        stackOnTopAt: null,
        stackTier: null,
        stackSlot: null,
        pullDir: rng() < 0.5 ? 1 : -1,
      });
    }
  }

  // Phase timings scaled to duration slider
  const revealEnd = Math.min(2.0, dur * 0.14);
  const collapseDuration = Math.min(4.2, Math.max(2.9, dur * 0.25));
  const keystoneDuration = Math.min(1.8, Math.max(1.2, dur * 0.12));
  const collapseAt = Math.max(revealEnd + 2.4, dur - collapseDuration);
  const keystoneStart = collapseAt - keystoneDuration;

  // Candidate non-keystone tiers (never pull from tier 0 base or top 2 tiers, just like real Jenga rules!)
  const candidateTiers = shuffle(
    Array.from({ length: Math.max(1, tiers - 4) }, (_, i) => i + 1).filter((t) => t !== keystoneTier),
    rng,
  );
  const regularPullCount = Math.max(1, variant.pulls - 1);
  const pullWindow = Math.max(1.8, keystoneStart - revealEnd);
  const actions = [];

  const totalSlots = regularPullCount + variant.fakeOuts;
  const fakeSlotIndices = new Set();
  for (let f = 0; f < variant.fakeOuts; f++) {
    fakeSlotIndices.add(Math.min(totalSlots - 2, 1 + f * 2));
  }

  let pullIdx = 0;
  const pulledOrder = [];
  for (let s = 0; s < totalSlots; s++) {
    const t0 = revealEnd + (s / totalSlots) * pullWindow;
    const t1 = revealEnd + ((s + 0.82) / totalSlots) * pullWindow;
    const tier = candidateTiers[s % candidateTiers.length];
    const isFake = fakeSlotIndices.has(s) && pullIdx < regularPullCount;
    // Pick a pullable block from this tier (leave at least 1 supporting block per tier!)
    const remainingInTier = blocks.filter((b) => b.tier === tier && !b.isKeystone && !b.preMissing && b.pulledAt === null);
    const blk = remainingInTier.length > 1
      ? remainingInTier[Math.floor(rng() * remainingInTier.length)]
      : blocks.find((b) => b.tier >= 1 && b.tier < tiers - 2 && !b.isKeystone && !b.preMissing && b.pulledAt === null);
    if (!blk) continue;

    if (isFake) {
      actions.push({
        type: 'fakeout',
        startAt: t0,
        endAt: t1,
        blockId: blk.id,
        tier: blk.tier,
        label: blk.label,
        cursorLabel: CURSOR_LABELS[s % CURSOR_LABELS.length],
        stackOnTop: false,
        impulse: 0.012,
        shedDevs: [],
      });
    } else {
      pullIdx++;
      blk.pulledAt = t1;
      let stackTier = null;
      let stackSlot = null;
      if (variant.stackOnTop) {
        stackTier = tiers + Math.floor((pullIdx - 1) / 3);
        stackSlot = (pullIdx - 1) % 3;
        blk.stackOnTopAt = t1 + 0.55;
        blk.stackTier = stackTier;
        blk.stackSlot = stackSlot;
      }
      const action = {
        type: 'pull',
        startAt: t0,
        endAt: t1,
        blockId: blk.id,
        tier: blk.tier,
        label: blk.label,
        cursorLabel: CURSOR_LABELS[pullIdx % CURSOR_LABELS.length],
        stackOnTop: variant.stackOnTop,
        stackTier,
        stackSlot,
        impulse: 0.018 + (pullIdx / regularPullCount) * 0.028,
        shedDevs: [],
      };
      actions.push(action);
      pulledOrder.push(action);
    }
  }

  // Fatal Keystone pull (Phase 3) — sliding out the lone center block at tier 2 causes real topple!
  const keystoneBlock = blocks.find((b) => b.isKeystone);
  keystoneBlock.pulledAt = collapseAt;
  actions.push({
    type: 'keystone',
    startAt: keystoneStart,
    endAt: collapseAt,
    blockId: keystoneBlock.id,
    tier: keystoneBlock.tier,
    label: keystoneBlock.label,
    cursorLabel: 'npm audit fix --force',
    stackOnTop: false,
    impulse: 0.055,
    shedDevs: [],
  });

  // Assign ALL players solidly onto the rooftop!
  // Put outer-edge players on early tremor slips and keep 3..5 finalists (including winner) near center for collapse.
  const perches = perchPositions(names.length, tiers);
  // Sort perches from outermost edge to center so early falls come naturally from the outer edges!
  const perchIndicesByEdge = perches
    .map((p, i) => ({ i, d: Math.hypot(p.x, p.z) }))
    .sort((a, b) => b.d - a.d)
    .map((o) => o.i);

  const nonWinnerIndices = shuffle(
    names.map((_, i) => i).filter((i) => i !== winnerIndex),
    rng,
  );
  const finalistCount = Math.min(names.length, Math.max(2, Math.min(5, Math.ceil(names.length * 0.4))));
  const earlyElimCount = Math.max(0, names.length - finalistCount);
  const earlyElims = nonWinnerIndices.slice(0, earlyElimCount);
  const collapseLosers = nonWinnerIndices.slice(earlyElimCount);

  // Map outer perches to early-eliminated players, inner perches to finalists & winner!
  const assignedPerches = new Array(names.length);
  const orderedDevs = [...earlyElims, ...collapseLosers, winnerIndex];
  orderedDevs.forEach((devId, rank) => {
    assignedPerches[devId] = perches[perchIndicesByEdge[rank]];
  });

  if (pulledOrder.length > 0) {
    earlyElims.forEach((devId, idx) => {
      const targetPull = pulledOrder[idx % pulledOrder.length];
      targetPull.shedDevs.push(devId);
    });
  }

  // Topple direction aligns perpendicular to the keystone pull axis (realistic Jenga tip-over!)
  const toppleAngle = keystoneBlock.rotated ? 0 : Math.PI / 2;
  const toppleSign = rng() < 0.5 ? 1 : -1;
  const leanDirX = Math.cos(toppleAngle) * toppleSign;
  const leanDirZ = Math.sin(toppleAngle) * toppleSign;

  const players = names.map((name, id) => {
    const isWinner = id === winnerIndex;
    const perch = assignedPerches[id];
    // Natural slide-off direction: outward from their edge of the rooftop!
    const outwardAngle = Math.hypot(perch.x, perch.z) > 0.1
      ? Math.atan2(perch.z, perch.x)
      : Math.atan2(leanDirZ, leanDirX) + (rng() - 0.5) * 1.2;
    return {
      id,
      name,
      isWinner,
      perch,
      fallAt: null,
      floorAt: null,
      excuse: JENGA_EXCUSES[(id + Math.floor(rng() * JENGA_EXCUSES.length)) % JENGA_EXCUSES.length],
      ejectAngle: outwardAngle,
      ejectSpeed: 2.2 + rng() * 1.8,
    };
  });

  for (const act of pulledOrder) {
    act.shedDevs.forEach((devId, j) => {
      players[devId].fallAt = act.endAt + 0.08 + j * 0.14;
      players[devId].floorAt = players[devId].fallAt + 1.15;
    });
  }

  const collapseSpread = Math.max(0.95, collapseDuration - 1.1);
  collapseLosers.forEach((devId, idx) => {
    const frac = collapseLosers.length === 1 ? 0.5 : idx / (collapseLosers.length - 1);
    players[devId].fallAt = collapseAt + 0.06 + frac * 0.24;
    players[devId].floorAt = collapseAt + 1.05 + frac * collapseSpread;
  });
  players[winnerIndex].fallAt = collapseAt + 0.08;
  players[winnerIndex].floorAt = null;

  const winnerAt = collapseAt + collapseDuration;

  return {
    duration: winnerAt,
    requestedDuration: dur,
    variant,
    tiers,
    keystoneTier,
    blocks,
    actions,
    players,
    winner: players[winnerIndex],
    winnerIndex,
    revealEnd,
    keystoneStart,
    collapseAt,
    winnerAt,
    leanDirX,
    leanDirZ,
  };
}

/**
 * Evaluates the tower's realistic Jenga tilt angle (in radians) above the keystone hinge tier:
 * - Phase 1 & 2: stays realistically upright (0° -> ~4.2° subtle progressive creep + crisp micro-shudder on each pull!)
 * - Phase 3 (fatal keystone sliding past halfway): accelerates smoothly from ~4.2° past 16° into a genuine Jenga topple!
 */
export function towerSwayAt(plan, t) {
  const clampedT = Math.min(t, plan.collapseAt);
  let osc = Math.sin(clampedT * 2.1) * 0.004; // almost imperceptible idle creak (~0.2°)
  let pullsDone = 0;
  const regularPulls = Math.max(1, plan.actions.filter((a) => a.type === 'pull').length);

  for (const act of plan.actions) {
    if (act.type === 'pull' && clampedT >= act.endAt) pullsDone++;
    if (clampedT >= act.startAt) {
      const dt = clampedT - act.startAt;
      const zeta = act.type === 'fakeout' ? 3.2 : 1.8;
      const omega = act.type === 'fakeout' ? 14.0 : 9.5;
      osc += act.impulse * Math.exp(-zeta * dt) * Math.sin(omega * dt);
    }
  }

  // Subtle realistic creep (max ~4.2° = 0.073 rad) during safe pulls — never an awkward flagpole tilt!
  const creep = (pullsDone / regularPulls) * 0.068;

  // Genuine tipping-point topple ONLY once the fatal keystone slides past halfway in Phase 3:
  let tipple = 0;
  if (clampedT >= plan.keystoneStart) {
    const kf = (clampedT - plan.keystoneStart) / Math.max(0.1, plan.collapseAt - plan.keystoneStart);
    // Ease-in cubic tipping curve: stays calm while cursor locks on, then visibly tips past 16° at release!
    tipple = Math.pow(kf, 2.6) * 0.25;
  }

  return creep + tipple + osc;
}

/** Returns structural BUILD HEALTH / STABILITY percentage (100 -> 0) for the hologram meter. */
export function stabilityAt(plan, t) {
  if (t >= plan.collapseAt) return 0;
  const pulls = plan.actions.filter((a) => a.type === 'pull');
  let done = 0;
  for (const a of pulls) {
    if (t >= a.endAt) done++;
    else if (t >= a.startAt) done += (t - a.startAt) / Math.max(0.1, a.endAt - a.startAt);
  }
  const frac = pulls.length ? done / pulls.length : 0;
  let pct = 100 - frac * 76;
  if (t >= plan.keystoneStart) {
    const kf = (t - plan.keystoneStart) / Math.max(0.1, plan.collapseAt - plan.keystoneStart);
    pct = Math.max(4, pct - kf * 20);
  }
  return Math.max(0, Math.min(100, Math.round(pct)));
}
