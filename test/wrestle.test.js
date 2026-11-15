import test from 'node:test';
import assert from 'node:assert/strict';
import { planMatch, matchLength, PACE, WRESTLER_KINDS, MIN_WRESTLERS, MAX_WRESTLERS } from '../public/js/wrestle-sim.js';
import { mulberry32 } from '../public/js/sim.js';

const names = (n) => Array.from({ length: n }, (_, i) => `Wrestler ${i + 1}`);

test('a battle royal needs 2 to 10 wrestlers', () => {
  assert.equal(MIN_WRESTLERS, 2);
  assert.equal(MAX_WRESTLERS, 10);
  assert.throws(() => planMatch(names(1)), /2 to 10/);
  assert.throws(() => planMatch(names(11)), /2 to 10/);
  for (let n = 2; n <= 10; n++) assert.equal(planMatch(names(n), mulberry32(n)).wrestlers.length, n);
});

test('the last wrestler in the ring wins, and everyone else is thrown out once', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const n = 2 + (seed % 9);
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
  for (let n = 2; n <= 10; n++) {
    const a = planMatch(names(n), mulberry32(1));
    const b = planMatch(names(n), mulberry32(999));
    assert.equal(a.duration, b.duration);
    assert.ok(Math.abs(a.duration - matchLength(n)) < 1e-9);
  }
  assert.ok(matchLength(2) > 10 && matchLength(2) < 20, `2 wrestlers: ${matchLength(2)}s`);
  assert.ok(matchLength(10) > 45 && matchLength(10) < 70, `10 wrestlers: ${matchLength(10)}s`);
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

test('crowd signs: all twelve, and the random-wrestler signs pick different wrestlers before reusing', async () => {
  const { crowdSigns } = await import('../public/js/wrestle-sim.js');
  const four = ['Roscoe', 'Sincero', 'legion', 'I Cause Lags'];
  for (let seed = 1; seed <= 20; seed++) {
    const signs = crowdSigns(four, mulberry32(seed));
    assert.equal(signs.length, 12);
    const text = signs.map((s) => s.join(' / '));
    assert.ok(text.includes('HANUMAN WAS HERE'));
    assert.ok(text.includes('15 mins lasts / for / three hours'));
    assert.ok(text.includes('DRAG & DROP 2.0 / THE ONLY WORKING DROP IS A BODY SLAM'));
    assert.deepEqual([signs[2][0], signs[2][2]], ['I blame', 'for not being clear.']);
    assert.deepEqual(signs[6].slice(0, 2), ['I made a BUG', 'I gave it to']);
    // The four name slots: fan club, "I blame", the greyed-out buttons, "I gave it to".
    const picked = [
      signs[0][0].replace(/ FAN CLUB$/, ''),
      signs[2][1],
      signs[5][1],
      signs[6][2],
    ];
    assert.equal(new Set(picked.map((n) => n.toUpperCase())).size, 4, `four different wrestlers: ${picked}`);
    for (const n of picked) assert.ok(four.some((f) => f.toUpperCase() === n.toUpperCase()));
  }
  // Only two wrestlers: names are reused, alternating.
  const two = crowdSigns(['Ada', 'Grace'], mulberry32(3));
  const names2 = [two[0][0].replace(/ FAN CLUB$/, ''), two[2][1], two[5][1], two[6][2]];
  assert.equal(new Set(names2.map((n) => n.toUpperCase())).size, 2);
  assert.equal(names2[0].toUpperCase(), names2[2].toUpperCase());
  assert.equal(names2[1], names2[3]);
});
