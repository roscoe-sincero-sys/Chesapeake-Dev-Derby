// "The Claw of Destiny": 3D Arcade Claw Machine choreographed physics planner.
// Pure logic (no Three.js, no DOM), so it runs in Node for tests and headless fallback.

import { shuffle } from './sim.js';
import { MAX_NAMES } from './data-rules.js';
import { DEVELOPER_KINDS } from './deathmatch-sim.js';

export const MIN_CLAW_PLAYERS = 2;
export const MAX_CLAW_PLAYERS = MAX_NAMES; // 30

/** Duration choices matching the app's 10s–120s slider scale (left-to-right: longest to shortest). */
export const CLAW_DURATIONS = [
  { seconds: 120, variant: 'elimination', label: '120s', text: '120s · Elimination' },
  { seconds: 60, variant: 'elimination', label: '60s', text: '60s · Elimination' },
  { seconds: 30, variant: 'rigged', label: '30s', text: '30s · Rigged' },
  { seconds: 15, variant: 'quick', label: '15s', text: '15s · Quick' },
  { seconds: 10, variant: 'quick', label: '10s', text: '10s · Quick' },
];
export const DEFAULT_CLAW_DURATION = 15;

/** Snaps any saved or URL duration value to the nearest offered step. */
export function normalizeClawDuration(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_CLAW_DURATION;
  let best = CLAW_DURATIONS[0].seconds;
  let dist = Math.abs(n - best);
  for (const step of CLAW_DURATIONS) {
    const d = Math.abs(n - step.seconds);
    if (d < dist) { best = step.seconds; dist = d; }
  }
  return best;
}

/** Returns 'quick' (10-15s), 'rigged' (30s), or 'elimination' (60-120s). */
export function clawVariant(seconds) {
  const s = normalizeClawDuration(seconds);
  if (s <= 15) return 'quick';
  if (s <= 30) return 'rigged';
  return 'elimination';
}

/** Exact dev-themed decoy excuses from docs/the_claw_of_destiny_game_mode_spec.md. */
export const CLAW_EXCUSES = {
  immediate: [
    'Blocked by Common Sense',
    'In another meeting',
    'SSL Certs Expired',
  ],
  midair: [
    'Was not clear',
    'Had URL Modified',
  ],
  rim: [
    'Testing in production',
    'Rolling back server clock',
    'Busy scrolling 800 columns',
  ],
  weakGrip: '500 Internal Server Error',
};

export const CABINET_MARQUEES = ['STANDUP-O-MATIC', 'THE ALGORITHM'];

/**
 * Plans a full choreographed Claw of Destiny round for `names` (2..30).
 *
 * Fairness: `winnerId` is drawn uniformly at random at the start of the round. All fake-outs,
 * decoys, weak-grip drops, and elimination-pit attempts are choreographed around that winner so
 * every active player has an exact 1/N probability of dropping down the prize chute.
 */
export function planClawMatch(names, { duration = DEFAULT_CLAW_DURATION, rng = Math.random } = {}) {
  if (!Array.isArray(names) || names.length < MIN_CLAW_PLAYERS || names.length > MAX_CLAW_PLAYERS) {
    throw new Error(`The Claw of Destiny needs ${MIN_CLAW_PLAYERS} to ${MAX_CLAW_PLAYERS} players.`);
  }

  const seconds = normalizeClawDuration(duration);
  const variant = clawVariant(seconds);

  let bag = [];
  const nextKind = () => {
    if (!bag.length) bag = shuffle(DEVELOPER_KINDS.map((_, i) => i), rng);
    return DEVELOPER_KINDS[bag.pop()];
  };

  const players = names.map((name, id) => ({
    id,
    name,
    kind: nextKind(),
  }));

  const winnerId = players[Math.floor(rng() * players.length)].id;
  const marquee = CABINET_MARQUEES[Math.floor(rng() * CABINET_MARQUEES.length)];
  const otherIds = shuffle(players.filter((p) => p.id !== winnerId).map((p) => p.id), rng);

  const pickFrom = (arr) => arr[Math.floor(rng() * arr.length)];
  const pickOther = (exclude = new Set()) => {
    const pool = otherIds.filter((id) => !exclude.has(id));
    if (pool.length) return pool[Math.floor(rng() * pool.length)];
    return otherIds[Math.floor(rng() * otherIds.length)];
  };

  // Determine number of claw attempts based on duration variant:
  //   10-15s (Quick Grab):       1 attempt
  //   30s    (Rigged Arcade):    2 attempts (Attempt 1 weak grip -> 500 Internal Server Error)
  //   60s    (Elimination Pit):  3 attempts
  //   120s   (Elimination Pit):  5 attempts
  const attemptCount = variant === 'quick' ? 1 : variant === 'rigged' ? 2 : seconds >= 120 ? 5 : 3;
  const attempts = [];
  const slotDuration = seconds / attemptCount;

  let cursor = 0;
  for (let a = 0; a < attemptCount; a++) {
    const isFinal = a === attemptCount - 1;
    const start = roundT(cursor);
    const len = slotDuration;
    const end = roundT(start + len);

    // Phase proportions within an attempt:
    //   Hunt (fake-outs): 28%, Scoop (drop & clamp): 22%, Ascent & slips: 34%, Drop / release: 16%
    const huntEnd = roundT(start + len * 0.28);
    const scoopEnd = roundT(start + len * 0.50);
    const ascentEnd = roundT(start + len * 0.84);

    // Target capsule for this attempt
    const targetId = isFinal ? winnerId : pickOther();
    const used = new Set([targetId]);

    // 1-2 fake-out hover targets during Hunt
    const fakeCount = len >= 14 ? 2 : 1;
    const fakeouts = [];
    for (let f = 0; f < fakeCount; f++) {
      const fid = pickOther(used);
      used.add(fid);
      fakeouts.push(fid);
    }

    // Decoys scooped alongside the target (1-3 decoys scaled to team size on final grab, 0-1 on earlier grabs)
    const maxDecoys = Math.min(3, players.length - 1);
    const decoyCount = isFinal
      ? Math.max(1, Math.min(maxDecoys, players.length <= 3 ? 1 : players.length <= 6 ? 2 : 3))
      : Math.min(1, players.length - 2);

    const decoys = [];
    const stages = ['immediate', 'midair', 'rim'];
    for (let d = 0; d < decoyCount; d++) {
      const did = pickOther(used);
      used.add(did);
      const stage = stages[Math.min(stages.length - 1, decoyCount === 1 ? 2 : d)];
      const frac = stage === 'immediate' ? 0.2 : stage === 'midair' ? 0.55 : 0.88;
      const releaseAt = roundT(scoopEnd + (ascentEnd - scoopEnd) * frac);
      decoys.push({
        playerId: did,
        stage,
        releaseAt,
        excuse: pickFrom(CLAW_EXCUSES[stage]),
      });
    }

    // Non-final attempts drop their grabbed capsule before the chute ("weak arcade grip")
    const failRelease = isFinal
      ? null
      : {
          playerId: targetId,
          releaseAt: roundT(ascentEnd - (ascentEnd - scoopEnd) * 0.12),
          excuse: variant === 'rigged' ? CLAW_EXCUSES.weakGrip : pickFrom(CLAW_EXCUSES.rim),
        };

    attempts.push({
      index: a,
      isFinal,
      start,
      huntEnd,
      scoopEnd,
      ascentEnd,
      end,
      fakeouts,
      targetId,
      decoys,
      failRelease,
    });

    cursor = end;
  }

  return {
    players,
    winnerId,
    winner: players[winnerId],
    duration: seconds,
    variant,
    marquee,
    attempts,
  };
}

function roundT(t) {
  return Math.round(t * 1000) / 1000;
}
