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

test('characters are dealt so each appears before any repeats', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const plan = planMatch(names(10), mulberry32(seed));
    const kinds = plan.wrestlers.map((w) => w.kind.id);
    for (let start = 0; start + WRESTLER_KINDS.length <= kinds.length; start += WRESTLER_KINDS.length) {
      assert.equal(new Set(kinds.slice(start, start + WRESTLER_KINDS.length)).size, WRESTLER_KINDS.length);
    }
  }
  assert.deepEqual(WRESTLER_KINDS.map((k) => k.label), ['Bhima', 'Jarasandha', 'Duryodhana', 'Arjuna']);
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
