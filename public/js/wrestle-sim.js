// "Let's Rumble": the battle royal's shared rules and script. Pure logic (no Three.js, no DOM),
// so it runs in Node for tests. The 3D ring (wrestle.js) only acts out the plan made here.
//
// Fairness: when the bell rings, the elimination order is drawn uniformly at random, so every
// wrestler is equally likely to be the last one in the ring. When and where each ring-out happens is
// drawn afterwards and never changes that. The match has its own pacing (see GAPS and matchLength);
// the lobby's Race length slider does not affect it.

import { shuffle } from './sim.js';
import { SIGN_VARIANTS } from './sign-variants.js';

export const MIN_WRESTLERS = 2;
export const MAX_WRESTLERS = 12;

/**
 * The 12-character Mahabharata roster. Each name is dealt one from a shuffled bag; a match has at
 * most 12 wrestlers, so nobody shares a character. Each `style` drives how they move, throw and survive.
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
  callout: 1.5, // "Roscoe is out!" while the camera, still circling, watches the landing
  reset: 0.4,
  finalHold: 1.2, // the last two circle each other
  closeCall: 2.6, // one of them teeters on the top rope and survives
  victory: 3,
};

/**
 * Ring-out timing (#96). After a landing, the next ring-out starts a pause drawn from [min, max] seconds
 * later, so they aren't evenly spaced. While at least `minInRing` are in the ring, two independent
 * ring-outs sometimes (`chance`) run side by side, starting up to `offset` seconds apart so they land
 * within a second of each other.
 */
export const GAPS = { min: 0.9, max: 3.3, together: { chance: 0.35, minInRing: 4, offset: 0.9 } };

const TO_LANDING = PACE.approach + PACE.grapple + PACE.throw;
const ELIMINATION = TO_LANDING + PACE.callout + PACE.reset;

/**
 * The longest a match with `n` wrestlers can last, in seconds, up to the victory. Matches vary (the
 * pauses between ring-outs are random, and some ring-outs happen together), and are usually shorter.
 */
export function matchLength(n) {
  const before = Math.max(0, n - 3) * (TO_LANDING + Math.max(GAPS.max, PACE.callout + PACE.reset)) + (n > 2 ? ELIMINATION : 0);
  return PACE.intro + before + PACE.finalHold + PACE.closeCall + ELIMINATION;
}

/**
 * Plans a battle royal for `names` (2 to 12). Returns:
 *   wrestlers    [{ id, name, kind }]
 *   order        ids in elimination order; the last one is the winner
 *   winner       id of the winner
 *   beats        the script, in time order (see below)
 *   duration     seconds until the victory beat starts
 * Beat types: intro; elimination { victim, thrower, side, spot, final, start, grappleAt, throwAt,
 * landAt, end }; final { pair }; closeCall { wrestler, other, side, spot }; victory { winner }.
 * Sides are 0: +x, 1: -x, 2: +z, 3: -z; `spot` is how far along that side (-2.8..2.8).
 */
export function planMatch(names, rng = Math.random) {
  if (!Array.isArray(names) || names.length < MIN_WRESTLERS || names.length > MAX_WRESTLERS) {
    throw new Error(`A battle royal needs ${MIN_WRESTLERS} to ${MAX_WRESTLERS} wrestlers.`);
  }
  return buildPlan(names, rng);
}

/** A named, read-only preview for comparing populations without using the team roster. */
export function planRosterPreview(count = WRESTLER_KINDS.length, rng = Math.random) {
  if (!Number.isInteger(count) || count < MIN_WRESTLERS || count > WRESTLER_KINDS.length) {
    throw new Error(`A roster preview needs ${MIN_WRESTLERS} to ${WRESTLER_KINDS.length} wrestlers.`);
  }
  const plan = buildPlan(Array.from({ length: count }, (_, i) => `Warrior ${i + 1}`), rng);
  for (const wrestler of plan.wrestlers) wrestler.name = wrestler.kind.label;
  return plan;
}

function buildPlan(names, rng) {
  let bag = [];
  const wrestlers = names.map((name, id) => {
    if (!bag.length) bag = shuffle(WRESTLER_KINDS.map((_, k) => k), rng);
    return { id, name, kind: WRESTLER_KINDS[bag.pop()] };
  });

  // The bell rings: draw the elimination order uniformly at random. The last one left wins. Everything
  // drawn after this (who throws, where and when) is presentation: it never changes who wins.
  const order = shuffle(wrestlers.map((w) => w.id), rng);
  const winner = order[order.length - 1];
  const pickSide = () => Math.floor(rng() * 4);
  const pickSpot = () => -2.5 + rng() * 5;

  const beats = [{ type: 'intro', start: 0, end: PACE.intro }];
  const outs = [];
  const elimination = (fields, start) => {
    const grappleAt = start + PACE.approach;
    const throwAt = grappleAt + PACE.grapple;
    const landAt = throwAt + PACE.throw;
    return { type: 'elimination', ...fields, start, grappleAt, throwAt, landAt, end: landAt + PACE.callout + PACE.reset };
  };
  const overlapping = (from) => outs.filter((o) => o.start < from + ELIMINATION && o.end > from);
  let t = PACE.intro; // earliest start for the next ring-out
  let k = 0;
  while (k < order.length - 1) {
    const inRing = order.slice(k);
    if (inRing.length === 2) {
      // Final two: they circle, one of them has a close call at the ropes and survives it, then the
      // last throw. Nothing else is going on in the ring by then.
      const [a, b] = inRing;
      let s = outs.length ? Math.max(...outs.map((o) => o.end)) : PACE.intro;
      beats.push({ type: 'final', pair: [a, b], start: s, end: s + PACE.finalHold });
      s += PACE.finalHold;
      const teeter = rng() < 0.5 ? a : b;
      beats.push({ type: 'closeCall', wrestler: teeter, other: teeter === a ? b : a, side: pickSide(), spot: pickSpot(), start: s, end: s + PACE.closeCall });
      s += PACE.closeCall;
      outs.push(elimination({ victim: a, thrower: b, side: pickSide(), spot: pickSpot(), final: true, together: false }, s));
      k++;
      continue;
    }
    // Sometimes two ring-outs at once, on neighbouring sides, while enough are left in the ring.
    const together = inRing.length >= GAPS.together.minInRing && rng() < GAPS.together.chance;
    const victims = together ? [order[k], order[k + 1]] : [order[k]];
    const offsets = together ? [0, 0.15 + rng() * (GAPS.together.offset - 0.15)] : [0];
    // A wrestler is in at most one scripted exchange at a time. Whoever is still finishing one (a
    // thrower squaring up after a landing) sits this one out; if that leaves too few, wait for them.
    const assign = (start) => {
      const taken = new Set();
      for (const o of overlapping(start)) taken.add(o.victim).add(o.thrower);
      if (victims.some((v) => taken.has(v))) return null;
      const free = inRing.filter((id) => !victims.includes(id) && !taken.has(id));
      if (free.length < victims.length) return null;
      return victims.map(() => free.splice(Math.floor(rng() * free.length), 1)[0]);
    };
    let start = t;
    let throwers = assign(start);
    if (!throwers) {
      start = Math.max(start, ...overlapping(start).map((o) => o.end));
      throwers = assign(start);
    }
    // Two at once go over the same side, at opposite ends of the rope: each pair has its own rope
    // area, and the two landings stay close enough together for one camera shot (#95, #96).
    const end = rng() < 0.5 ? -1 : 1;
    const pairSide = pickSide();
    const pairSpots = [end * (2.2 + rng() * 0.6), -end * (2.2 + rng() * 0.6)];
    victims.forEach((victim, i) => {
      const from = start + offsets[i];
      const others = overlapping(from);
      let side = pickSide();
      let spot = pickSpot();
      if (together) {
        side = pairSide;
        spot = pairSpots[i];
      } else if (others.length) {
        // Starting while the last one is still sitting up at ringside: a neighbouring side, on the
        // corner nearer that one, with room between them (about 4.8 apart where they meet).
        const near = meetPoint(others.at(-1).side, others.at(-1).spot);
        side = others.at(-1).side < 2 ? (near.z >= 0 ? 2 : 3) : near.x >= 0 ? 0 : 1;
        let best = Infinity;
        for (let tries = 0; tries < 12; tries++) {
          const s = pickSpot();
          const miss = Math.max(...others.map((o) => Math.abs(spread(meetPoint(o.side, o.spot), meetPoint(side, s)) - 4.8)));
          if (miss < best) {
            best = miss;
            spot = s;
          }
        }
      }
      outs.push(elimination({ victim, thrower: throwers[i], side, spot, final: false, together }, from));
    });
    k += victims.length;
    // The next one starts a varied pause after this landing (the later one, if two landed).
    t = outs.at(-1).landAt + GAPS.min + rng() * (GAPS.max - GAPS.min);
  }
  beats.push(...outs);
  beats.sort((a, b) => a.start - b.start);
  const duration = outs.at(-1).end;
  beats.push({ type: 'victory', winner, start: duration, end: duration + PACE.victory });
  return { wrestlers, order, winner, beats, duration };
}

// Where a thrower and victim meet at the ropes on `side`, `spot` along it (as wrestle.js stages it).
function meetPoint(side, spot) {
  const nx = side === 0 ? 1 : side === 1 ? -1 : 0;
  const nz = side === 2 ? 1 : side === 3 ? -1 : 0;
  return { x: nx * 5 - nz * spot, z: nz * 5 + nx * spot };
}
const spread = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

/**
 * Battle royal brawling: who each free wrestler is fighting right now. `free` lists the wrestlers in
 * the ring who aren't in a scripted moment (a throw or the close call), as { id, x, z, foe, last }.
 * Fights in progress carry on while both are free; everyone else pairs up with the nearest unpaired
 * wrestler, preferring someone new over the one they just broke away from (`last`). With an odd number
 * the one left over joins the nearest fight, two on one. Returns a Map of id → foe id; a wrestler alone
 * in the ring has none. Only who fights whom is decided here: it never changes who is eliminated.
 */
export function pairUp(free) {
  const byId = new Map(free.map((w) => [w.id, w]));
  const foes = new Map();
  for (const w of free) {
    const o = byId.get(w.foe);
    if (o && o.foe === w.id) foes.set(w.id, o.id);
  }
  const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z) + (a.last === b.id || b.last === a.id ? 6 : 0);
  const loose = free.filter((w) => !foes.has(w.id));
  while (loose.length >= 2) {
    let best = null;
    for (let i = 0; i < loose.length; i++) {
      for (let j = i + 1; j < loose.length; j++) {
        const d = gap(loose[i], loose[j]);
        if (!best || d < best.d) best = { i, j, d };
      }
    }
    const a = loose[best.i];
    const b = loose[best.j];
    foes.set(a.id, b.id);
    foes.set(b.id, a.id);
    loose.splice(best.j, 1);
    loose.splice(best.i, 1);
  }
  for (const w of loose) {
    let best = null;
    for (const o of free) {
      if (o === w) continue;
      const d = Math.hypot(o.x - w.x, o.z - w.z);
      if (!best || d < best.d) best = { id: o.id, d };
    }
    if (best) foes.set(w.id, best.id);
  }
  return foes;
}

/**
 * The hand-lettered signs in the crowd: one card per entry, each a list of lines. Some name a random
 * wrestler; each of those picks a different wrestler while there are enough, then names are reused.
 * Text is as the meeting asked for it; long lines are wrapped when the sign is drawn.
 */
export function crowdSigns(names, rng = Math.random, variants = SIGN_VARIANTS) {
  const pool = shuffle([...names], rng);
  let next = 0;
  const pick = () => pool[next++ % pool.length];
  // A sign may be swapped for a variant (sign-variants.js); a swapped sign doesn't use up a name pick.
  const variant = (key) => {
    const v = variants[key];
    return v && names.some((n) => String(n).toLowerCase().includes(v.match)) ? [...v.lines] : null;
  };
  const fanClub = [pick().toUpperCase(), 'FAN CLUB'];
  const blame = variant('blame') ?? ['I blame', pick(), 'for not being clear.'];
  const deadButtons = variant('deadButtons') ?? [pick(), 'clicks dead buttons', 'as a hobby.'];
  const bug = ['I made a BUG', 'I gave it to', pick()];
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
    variant('clock') ?? ["LET'S ROLL BACK THE CLOCK!"],
    ['DRAG & DROP 2.0', 'THE ONLY WORKING DROP', 'IS A BODY SLAM'],
    ['800-COLUMN TABLE', 'KEEP SCROLLING →'],
    ['200 GB. TABLE', 'HEAVYWEIGHT CHAMP.'],
    variant('weightClass') ?? ['WEIGHT CLASS', '12–15 CHARS', 'ONLY!'],
  ];
}
