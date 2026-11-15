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
 * The 12-character Mahabharata roster. Each name is dealt one from a shuffled bag; a match has at
 * most 10 wrestlers, so nobody shares a character. Each `style` drives how they move, throw and survive.
 */
export const WRESTLER_KINDS = [
  { id: 'bhima', label: 'Bhima', emoji: '💪', style: 'overhead', blurb: 'Power wrestler with a two-handed overhead toss' },
  { id: 'jarasandha', label: 'Jarasandha', emoji: '👑', style: 'centre', blurb: 'A grappler who keeps pulling opponents back to center ring' },
  { id: 'duryodhana', label: 'Duryodhana', emoji: '🎭', style: 'showman', blurb: 'A showman who plays to the crowd after a ring-out' },
  { id: 'kichaka', label: 'Kichaka', emoji: '🪨', style: 'bruiser', blurb: 'A bruiser who tries to muscle opponents straight through the ropes' },
  { id: 'arjuna', label: 'Arjuna', emoji: '🏹', style: 'counter', blurb: 'A precision wrestler who slips out of holds and counters quickly' },
  { id: 'karna', label: 'Karna', emoji: '☀️', style: 'patient', blurb: 'A patient counterwrestler who turns a charge into a throw' },
  { id: 'abhimanyu', label: 'Abhimanyu', emoji: '🌀', style: 'duck', blurb: 'A quick mover who ducks between opponents when cornered' },
  { id: 'ghatotkacha', label: 'Ghatotkacha', emoji: '🌫️', style: 'illusion', blurb: 'A towering wrestler who uses an illusion to feint before a throw' },
  { id: 'hidimbi', label: 'Hidimbi', emoji: '🌙', style: 'shapeshift', blurb: 'A shapeshifter who changes form mid-grapple and slips free' },
  { id: 'dushasana', label: 'Dushasana', emoji: '😤', style: 'crowd', blurb: 'A pushy heel who crowds opponents against the ropes' },
  { id: 'shikhandi', label: 'Shikhandi', emoji: '🛡️', style: 'composed', blurb: 'A composed grappler who catches charging wrestlers off balance' },
  { id: 'satyaki', label: 'Satyaki', emoji: '🪶', style: 'rebound', blurb: 'A fast wrestler who rebounds off the ropes for a running takedown' },
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

/**
 * The hand-lettered signs in the crowd: one card per entry, each a list of lines. Some name a random
 * wrestler; each of those picks a different wrestler while there are enough, then names are reused.
 * Text is as the meeting asked for it; long lines are wrapped when the sign is drawn.
 */
export function crowdSigns(names, rng = Math.random) {
  const pool = shuffle([...names], rng);
  let next = 0;
  const pick = () => pool[next++ % pool.length];
  // Hidden Easter eggs: a sign changes when someone in the match has a particular name (anywhere
  // in it, any case, so "sharmila.parthiban@…" counts). A changed sign doesn't use up a name pick.
  const has = (who) => names.some((n) => String(n).toLowerCase().includes(who));
  // Megha's nickname: a wrestler named "Ruchie …" (as in SQL LIKE 'Ruchie %': Ruchie, a space, then
  // anything; any case) turns three signs into Megha's own. It takes priority over the Megha egg.
  const ruchie = names.some((n) => /^ruchie /i.test(String(n).trim()));
  const fanClub = ruchie ? ['GODDESS MEGHA', 'FAN CLUB'] : [pick().toUpperCase(), 'FAN CLUB'];
  const blame = ruchie ? ['I got blamed AGAIN', 'for not being clear.']
    : has('megha') ? ['I blame', 'Megha again for', 'not being clear.'] : ['I blame', pick(), 'for not being clear.'];
  const deadButtons = has('paul') ? ["Let's Watch Paul", 'click dead buttons'] : [pick(), 'clicks dead buttons', 'as a hobby.'];
  const bug = ruchie ? ['Megha smashes another BUG!'] : ['I made a BUG', 'I gave it to', pick()];
  return [
    fanClub,
    ['HANUMAN WAS HERE'],
    blame,
    ['15 mins lasts', 'for', 'three hours'],
    ['I CAME FOR THE 15-MINUTE MEETING'],
    deadButtons,
    bug,
    ['I’m just here to say “NO BLOCKERS”'],
    ['WE HAVE 2 MINUTES LEFT. WHO’S LEADING?'],
    ['ANYTHING for the PARKING LOT?'],
    has('betcy') ? ['Can you hear me?', "I can't hear you", 'Can you hear me?'] : ["LET'S ROLL BACK THE CLOCK!"],
    ['DRAG & DROP 2.0', 'THE ONLY WORKING DROP', 'IS A BODY SLAM'],
    ['800-COLUMN TABLE', 'KEEP SCROLLING →'],
    ['200 GB. TABLE', 'HEAVYWEIGHT CHAMP.'],
    has('sharmila') ? ['I order all wrestlers', 'must weigh', '12 to 15 chars only!'] : ['WEIGHT CLASS', '12–15 CHARS', 'ONLY!'],
  ];
}
