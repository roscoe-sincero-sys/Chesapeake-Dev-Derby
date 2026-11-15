// "Let's Wrestle Instead": the battle royal's rules and script. Pure logic (no Three.js, no DOM),
// so it runs in Node for tests. The 3D ring (wrestle.js) only acts out the plan made here.
//
// Fairness: when the bell rings, the elimination order is drawn uniformly at random, so every
// wrestler is equally likely to be the last one in the ring. The match has its own pacing, which
// depends only on the number of wrestlers; the lobby's Race length slider does not affect it.

import { shuffle } from './sim.js';

export const MIN_WRESTLERS = 2;
export const MAX_WRESTLERS = 10;

/**
 * The Mahabharata characters available so far. Each name is dealt one, and every character
 * appears before any repeats. More of the 12-character roster can be added here and in wrestlers.js.
 */
export const WRESTLER_KINDS = [
  { id: 'bhima', label: 'Bhima', emoji: '💪', style: 'overhead', blurb: 'Power wrestler with a two-handed overhead toss' },
  { id: 'jarasandha', label: 'Jarasandha', emoji: '👑', style: 'centre', blurb: 'A grappler who keeps pulling opponents back to center ring' },
  { id: 'duryodhana', label: 'Duryodhana', emoji: '🎭', style: 'showman', blurb: 'A showman who plays to the crowd after a ring-out' },
  { id: 'arjuna', label: 'Arjuna', emoji: '🏹', style: 'counter', blurb: 'A precision wrestler who slips out of holds and counters quickly' },
];

/** Seconds for each part of the match. Fixed: the Race length slider does not change these. */
export const PACE = {
  intro: 4.5, // the bell rings while the camera orbits the ring
  approach: 1.6, // thrower and victim meet at the ropes
  grapple: 1.2,
  throw: 1.3, // over the top rope and down to the floor
  callout: 1.5, // "Roscoe is out!" while the camera holds on the landing
  reset: 0.4,
  finalHold: 1.2, // the last two circle each other
  closeCall: 2.6, // one of them teeters on the top rope and survives
  victory: 3,
};

const ELIMINATION = PACE.approach + PACE.grapple + PACE.throw + PACE.callout + PACE.reset;

/** Length of a match with `n` wrestlers, in seconds, up to the victory. */
export function matchLength(n) {
  return PACE.intro + (n - 1) * ELIMINATION + PACE.finalHold + PACE.closeCall;
}

/**
 * Plans a battle royal for `names` (2 to 10). Returns:
 *   wrestlers    [{ id, name, kind }]
 *   order        ids in elimination order; the last one is the winner
 *   winner       id of the winner
 *   beats        the script, in time order (see below)
 *   duration     seconds until the victory beat starts
 * Beat types: intro; elimination { victim, thrower, side, spot, final, start, grappleAt, throwAt,
 * landAt, end }; final { pair }; closeCall { wrestler, other, side, spot }; victory { winner }.
 * Sides are 0: +x, 1: -x, 2: +z, 3: -z; `spot` is how far along that side (-2.5..2.5).
 */
export function planMatch(names, rng = Math.random) {
  if (!Array.isArray(names) || names.length < MIN_WRESTLERS || names.length > MAX_WRESTLERS) {
    throw new Error(`A battle royal needs ${MIN_WRESTLERS} to ${MAX_WRESTLERS} wrestlers.`);
  }
  let bag = [];
  const wrestlers = names.map((name, id) => {
    if (!bag.length) bag = shuffle(WRESTLER_KINDS.map((_, k) => k), rng);
    return { id, name, kind: WRESTLER_KINDS[bag.pop()] };
  });

  // The bell rings: draw the elimination order uniformly at random. The last one left wins.
  const order = shuffle(wrestlers.map((w) => w.id), rng);
  const winner = order[order.length - 1];
  const pickSide = () => Math.floor(rng() * 4);
  const pickSpot = () => -2.5 + rng() * 5;

  const beats = [{ type: 'intro', start: 0, end: PACE.intro }];
  let t = PACE.intro;
  const inRing = new Set(order);
  for (let k = 0; k < order.length - 1; k++) {
    const victim = order[k];
    const final = inRing.size === 2;
    const others = [...inRing].filter((id) => id !== victim);
    if (final) {
      const [a, b] = order.slice(-2);
      beats.push({ type: 'final', pair: [a, b], start: t, end: t + PACE.finalHold });
      t += PACE.finalHold;
      // One close call at the ropes before the last throw; either of the two can be the one
      // who nearly goes over, and they survive it.
      const teeter = rng() < 0.5 ? a : b;
      beats.push({ type: 'closeCall', wrestler: teeter, other: teeter === a ? b : a, side: pickSide(), spot: pickSpot(), start: t, end: t + PACE.closeCall });
      t += PACE.closeCall;
    }
    const thrower = others[Math.floor(rng() * others.length)];
    const grappleAt = t + PACE.approach;
    const throwAt = grappleAt + PACE.grapple;
    const landAt = throwAt + PACE.throw;
    beats.push({ type: 'elimination', victim, thrower, side: pickSide(), spot: pickSpot(), final, start: t, grappleAt, throwAt, landAt, end: landAt + PACE.callout + PACE.reset });
    t = landAt + PACE.callout + PACE.reset;
    inRing.delete(victim);
  }
  beats.push({ type: 'victory', winner, start: t, end: t + PACE.victory });
  return { wrestlers, order, winner, beats, duration: t };
}
