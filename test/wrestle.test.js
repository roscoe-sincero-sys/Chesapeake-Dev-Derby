import test from 'node:test';
import assert from 'node:assert/strict';
import { planMatch, planRosterPreview, pairUp, matchLength, PACE, WRESTLER_KINDS, MIN_WRESTLERS, MAX_WRESTLERS } from '../public/js/wrestle-sim.js';
import { mulberry32 } from '../public/js/sim.js';

const names = (n) => Array.from({ length: n }, (_, i) => `Wrestler ${i + 1}`);

test('the twelve-character performance preview uses every character and a full elimination plan', () => {
  const plan = planRosterPreview(12, mulberry32(17));
  assert.equal(plan.wrestlers.length, 12);
  assert.deepEqual(new Set(plan.wrestlers.map((w) => w.kind.id)), new Set(WRESTLER_KINDS.map((k) => k.id)));
  assert.ok(plan.wrestlers.every((w) => w.name === w.kind.label));
  assert.equal(plan.beats.filter((b) => b.type === 'elimination').length, 11);
  assert.equal(plan.beats.at(-1).winner, plan.winner);
  assert.equal(plan.duration, matchLength(12));
  assert.throws(() => planRosterPreview(13), /2 to 12/);
  assert.throws(() => planRosterPreview(10.5), /2 to 12/);
});

test('ten- and twelve-character previews use the same opening ten characters for a given seed', () => {
  const ten = planRosterPreview(10, mulberry32(17));
  const twelve = planRosterPreview(12, mulberry32(17));
  assert.deepEqual(ten.wrestlers.map((w) => w.kind.id), twelve.wrestlers.slice(0, 10).map((w) => w.kind.id));
});

test('a battle royal needs 2 to 12 wrestlers', () => {
  assert.equal(MIN_WRESTLERS, 2);
  assert.equal(MAX_WRESTLERS, 12);
  assert.throws(() => planMatch(names(1)), /2 to 12/);
  assert.throws(() => planMatch(names(13)), /2 to 12/);
  for (let n = 2; n <= MAX_WRESTLERS; n++) assert.equal(planMatch(names(n), mulberry32(n)).wrestlers.length, n);
});

test('the last wrestler in the ring wins, and everyone else is thrown out once', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const n = 2 + (seed % (MAX_WRESTLERS - 1));
    const plan = planMatch(names(n), mulberry32(seed));
    const outs = plan.beats.filter((b) => b.type === 'elimination');
    assert.equal(outs.length, n - 1);
    assert.deepEqual(outs.map((b) => b.victim), plan.order.slice(0, -1));
    assert.equal(plan.winner, plan.order[n - 1]);
    assert.equal(new Set(plan.order).size, n);
    assert.equal(plan.beats.at(-1).type, 'victory');
    assert.equal(plan.beats.at(-1).winner, plan.winner);
    // Throwers are still in the ring, and never throw themselves.
    const inRing = new Set(plan.order);
    for (const b of outs) {
      assert.notEqual(b.thrower, b.victim);
      assert.ok(inRing.has(b.thrower) && inRing.has(b.victim));
      inRing.delete(b.victim);
    }
  }
});

test('every wrestler is equally likely to win (elimination order drawn uniformly)', () => {
  const n = 4;
  const matches = 4000;
  const wins = new Array(n).fill(0);
  const rng = mulberry32(2026);
  for (let i = 0; i < matches; i++) wins[planMatch(names(n), rng).winner]++;
  const expected = matches / n;
  // Chi-square with 3 degrees of freedom: 16.27 is the 0.1% critical value.
  const chi2 = wins.reduce((s, w) => s + (w - expected) ** 2 / expected, 0);
  assert.ok(chi2 < 16.27, `wins look biased: ${wins.join(', ')} (chi2 ${chi2.toFixed(1)})`);
});

test('all 12 roster characters are available, and nobody in a match shares a character', () => {
  assert.deepEqual(WRESTLER_KINDS.map((k) => k.label), [
    'Bhima', 'Jarasandha', 'Duryodhana', 'Kichaka', 'Arjuna', 'Karna',
    'Abhimanyu', 'Ghatotkacha', 'Hidimbi', 'Dushasana', 'Shikhandi', 'Satyaki',
  ]);
  assert.equal(new Set(WRESTLER_KINDS.map((k) => k.style)).size, 12, 'each has their own style');
  const seen = new Set();
  for (let seed = 1; seed <= 60; seed++) {
    const plan = planMatch(names(MAX_WRESTLERS), mulberry32(seed));
    const kinds = plan.wrestlers.map((w) => w.kind.id);
    assert.equal(new Set(kinds).size, kinds.length, 'a match never repeats a character');
    kinds.forEach((k) => seen.add(k));
  }
  assert.equal(seen.size, 12, 'every character gets picked');
});

test('the final two get one close call before the last throw', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const plan = planMatch(names(2 + (seed % 9)), mulberry32(seed));
    const close = plan.beats.filter((b) => b.type === 'closeCall');
    assert.equal(close.length, 1);
    const last = plan.beats.filter((b) => b.type === 'elimination').at(-1);
    assert.ok(last.final);
    assert.ok(close[0].end <= last.start);
    assert.deepEqual(new Set([close[0].wrestler, close[0].other]), new Set(plan.order.slice(-2)));
  }
});

test('the match has its own pacing: length depends only on the number of wrestlers', () => {
  for (let n = 2; n <= MAX_WRESTLERS; n++) {
    const a = planMatch(names(n), mulberry32(1));
    const b = planMatch(names(n), mulberry32(999));
    assert.equal(a.duration, b.duration);
    assert.ok(Math.abs(a.duration - matchLength(n)) < 1e-9);
  }
  assert.ok(matchLength(2) > 10 && matchLength(2) < 20, `2 wrestlers: ${matchLength(2)}s`);
  assert.ok(matchLength(10) > 45 && matchLength(10) < 70, `10 wrestlers: ${matchLength(10)}s`);
  assert.ok(matchLength(12) > 70 && matchLength(12) < 80, `12 wrestlers: ${matchLength(12)}s`);
  // Beats run back to back, in order.
  const plan = planMatch(names(6), mulberry32(3));
  const timed = plan.beats.filter((b) => b.type !== 'victory');
  assert.equal(timed[0].start, 0);
  assert.equal(timed[0].end, PACE.intro);
  for (const b of plan.beats) assert.ok(b.end > b.start);
});

// ---------------------------------------------------------------- feet on the floor (issue #68 comment)

test('wrestlers stand on the ring: feet touch the floor and never go through it, in every pose', async () => {
  const { buildRig, pose, lowestFoot } = await import('../public/js/wrestlers.js');
  const poses = {
    neutral: {},
    ...Object.fromEntries([0, 0.8, 1.6, 2.4, 3.2, 4.0, 4.8, 5.6].map((p) => [`walk ${p}`, { walk: p, stride: 0.7, guard: 0.8, crouch: 0.25 }])),
    crouch: { crouch: 0.35, armsForward: 1, lean: 0.3 },
    deepCrouch: { crouch: 1 },
    overhead: { armsUp: 1, crouch: 0.2 },
    flail: { flail: 1, spread: 0.6, walk: 2 },
    teeter: { lean: -0.95, flail: 1, crouch: 0.15 },
    victory: { armsUp: 1, spread: 0.35, walk: 1, stride: 0.15 },
  };
  for (const kind of WRESTLER_KINDS) {
    const rig = buildRig(kind);
    for (const [name, p] of Object.entries(poses)) {
      pose(rig, p);
      const low = lowestFoot(rig);
      assert.ok(low >= -0.002, `${kind.label} ${name}: foot ${low.toFixed(3)} below the floor`);
      assert.ok(low <= 0.02, `${kind.label} ${name}: floating ${low.toFixed(3)} above the floor`);
    }
    pose(rig, { sit: 1 });
    assert.ok(lowestFoot(rig) >= -0.002, `${kind.label} sitting: foot through the floor`);
  }
});

// ---------------------------------------------------------------- crowd signs (issue #68 comment)

test('crowd signs: all fifteen, and the random-wrestler signs pick different wrestlers before reusing', async () => {
  const { crowdSigns } = await import('../public/js/wrestle-sim.js');
  const four = ['Roscoe', 'Sincero', 'legion', 'I Cause Lags'];
  for (let seed = 1; seed <= 20; seed++) {
    const signs = crowdSigns(four, mulberry32(seed));
    assert.equal(signs.length, 15);
    const text = signs.map((s) => s.join(' / '));
    assert.ok(text.includes('HANUMAN WAS HERE'));
    assert.ok(text.includes('15 mins lasts / for / three hours'));
    assert.ok(text.includes('DRAG & DROP 2.0 / THE ONLY WORKING DROP / IS A BODY SLAM'));
    assert.ok(text.includes('800-COLUMN TABLE / KEEP SCROLLING →'));
    assert.ok(text.includes('200 GB. TABLE / HEAVYWEIGHT CHAMP.'));
    assert.ok(text.includes('WEIGHT CLASS / 12–15 CHARS / ONLY!'));
    assert.deepEqual([signs[2][0], signs[2][2]], ['I blame', 'for not being clear.']);
    assert.deepEqual(signs[6].slice(0, 2), ['I made a BUG', 'I gave it to']);
    assert.equal(signs[0][1], 'FAN CLUB');
    assert.equal(signs[0][0], signs[0][0].toUpperCase());
    assert.deepEqual(signs[5].slice(1), ['clicks dead buttons', 'as a hobby.']);
    // The four name slots: fan club, "I blame", dead buttons, "I gave it to".
    const picked = [
      signs[0][0],
      signs[2][1],
      signs[5][0],
      signs[6][2],
    ];
    assert.equal(new Set(picked.map((n) => n.toUpperCase())).size, 4, `four different wrestlers: ${picked}`);
    for (const n of picked) assert.ok(four.some((f) => f.toUpperCase() === n.toUpperCase()));
  }
  // Only two wrestlers: names are reused, alternating.
  const two = crowdSigns(['Ada', 'Grace'], mulberry32(3));
  const names2 = [two[0][0], two[2][1], two[5][0], two[6][2]];
  assert.equal(new Set(names2.map((n) => n.toUpperCase())).size, 2);
  assert.equal(names2[0].toUpperCase(), names2[2].toUpperCase());
  assert.equal(names2[1], names2[3]);
});

// ---------------------------------------------------------------- hidden sign Easter eggs

test('hidden Easter eggs: some signs change when a wrestler has a particular name', async () => {
  const { crowdSigns } = await import('../public/js/wrestle-sim.js');
  const text = (names) => crowdSigns(names, mulberry32(7)).map((s) => s.join(' / '));
  const plain = text(['Ada', 'Grace', 'Linus', 'Hedy']);
  assert.ok(plain.some((s) => /^I blame \/ .+ \/ for not being clear\.$/.test(s)));
  assert.ok(plain.some((s) => s.endsWith(' / clicks dead buttons / as a hobby.')));
  assert.ok(plain.includes('WEIGHT CLASS / 12–15 CHARS / ONLY!'));
  assert.ok(plain.includes("LET'S ROLL BACK THE CLOCK!"));

  // Megha: the "not being clear" sign.
  const megha = text(['Ada', 'Megha', 'Linus']);
  assert.ok(megha.includes('I blame / Megha again for / not being clear.'));
  // Paul (also inside a longer name, any case): the dead buttons sign.
  const paul = text(['Ada', 'paul schiro', 'Linus']);
  assert.ok(paul.includes("Let's Watch Paul / click dead buttons"));
  assert.ok(!paul.some((s) => s.includes('as a hobby.')));
  // Sharmila, even as an email address: the weight class sign.
  const sharmila = text(['Ada', 'sharmila.parthiban@example.gov', 'Linus']);
  assert.ok(sharmila.includes('I order all wrestlers / must weigh / 12 to 15 chars only!'));
  assert.ok(!sharmila.includes('WEIGHT CLASS / 12–15 CHARS / ONLY!'));
  // Betcy: the roll-back-the-clock sign.
  const betcy = text(['BETCY', 'Ada']);
  assert.ok(betcy.includes("Can you hear me? / I can't hear you / Can you hear me?"));
  assert.ok(!betcy.includes("LET'S ROLL BACK THE CLOCK!"));

  // All four at once: still 15 signs, and the two signs that still name someone pick different wrestlers.
  const all = crowdSigns(['Megha', 'Paul', 'Sharmila', 'Betcy'], mulberry32(9));
  assert.equal(all.length, 15);
  assert.notEqual(all[0][0].toUpperCase(), all[6][2].toUpperCase(), 'fan club and bug signs name different wrestlers');
});

// ---------------------------------------------------------------- thrown out: landing (issue #74)

test('a thrown wrestler bounces twice off the floor, each bounce smaller, then lies still', async () => {
  const { bounce, BOUNCES } = await import('../public/js/wrestle.js');
  const samples = Array.from({ length: 200 }, (_, i) => bounce(i * 0.005));
  assert.ok(samples.every((h) => h >= 0), 'never below the floor');
  assert.equal(bounce(0), 0, 'lands at the floor');
  const peak = (from, to) => Math.max(...samples.filter((_, i) => i * 0.005 >= from && i * 0.005 < to));
  const first = peak(0, BOUNCES[0].end);
  const second = peak(BOUNCES[0].end, BOUNCES[1].end);
  assert.ok(first > 0.3, `first bounce ${first}`);
  assert.ok(second > 0.05 && second < first / 2, `second bounce ${second} is smaller`);
  assert.ok(bounce(BOUNCES[0].end) < 1e-9, 'touches down between bounces');
  assert.equal(bounce(BOUNCES[1].end + 0.01), 0, 'then lies still');
  assert.equal(bounce(5), 0);
});

test('lying on their back, every wrestler rests on their body, not propped up on a mace, bow or shield', async () => {
  const { buildRig, pose, lowestBodyPoint } = await import('../public/js/wrestlers.js');
  const THREE = await import('three');
  for (const kind of WRESTLER_KINDS) {
    const rig = buildRig(kind);
    rig.root.rotation.order = 'YXZ';
    rig.root.rotation.set(Math.PI / 2, 0, 0); // on the back, face up, as after a throw
    pose(rig, { spread: 0.4, look: 0.3 });
    // Settle the body onto the floor (y = 0) the way the arena does.
    rig.root.position.y -= lowestBodyPoint(rig);
    rig.root.updateMatrixWorld(true);
    assert.ok(Math.abs(lowestBodyPoint(rig)) < 1e-6, `${kind.label}: body touches the floor`);
    // The torso itself is close to the floor (no hovering on gear): its underside within 0.12.
    const torso = new THREE.Box3().setFromObject(rig.torso.children[1], true);
    assert.ok(torso.min.y < 0.12 * rig.root.scale.y, `${kind.label}: back ${torso.min.y.toFixed(2)} above the floor`);
  }
});

// #91: a battle royal, not a queue. Everyone free in the ring is fighting someone at the same time.
const spot = (id, x, z, extra = {}) => ({ id, x, z, foe: null, last: null, ...extra });

test('battle royal: every free wrestler is fighting someone, in pairs, all at once', () => {
  for (let n = 2; n <= 12; n++) {
    const free = Array.from({ length: n }, (_, i) => spot(i, Math.cos(i) * 4, Math.sin(i * 1.7) * 4));
    const foes = pairUp(free);
    assert.equal(foes.size, n, `${n} wrestlers: nobody stands idle`);
    for (const [id, foe] of foes) assert.notEqual(id, foe, 'nobody fights themselves');
    const mutual = [...foes].filter(([id, foe]) => foes.get(foe) === id).length;
    assert.equal(mutual, n - (n % 2), `${n} wrestlers: ${Math.floor(n / 2)} fights going on together`);
  }
});

test('battle royal: the odd one out joins the nearest fight, two on one', () => {
  const free = [spot(0, 0, 0), spot(1, 1, 0), spot(2, -4, 0), spot(3, -5, 0), spot(4, 2.5, 0)];
  const foes = pairUp(free);
  const loner = [...foes].find(([id, foe]) => foes.get(foe) !== id);
  assert.deepEqual(loner, [4, 1]);
});

test('battle royal: fights carry on, broken-up pairs look for someone new, and a lone wrestler has no foe', () => {
  const ongoing = [spot(0, 0, 0, { foe: 3 }), spot(1, 0.5, 0), spot(2, 5, 5), spot(3, 5, 4, { foe: 0 })];
  const foes = pairUp(ongoing);
  assert.equal(foes.get(0), 3, 'a fight in progress carries on even when someone else is nearer');
  assert.equal(foes.get(1), 2);
  const apart = pairUp([spot(0, 0, 0, { last: 1 }), spot(1, 1, 0, { last: 0 }), spot(2, 0.5, 2)]);
  const paired = [...apart].filter(([id, foe]) => apart.get(foe) === id).map(([id]) => id);
  assert.ok(paired.includes(2) && paired.length === 2, 'just broke away from each other: one of them squares up with someone new');
  assert.equal(pairUp([spot(0, 0, 0)]).size, 0);
  assert.equal(pairUp([]).size, 0);
});
