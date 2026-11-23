import test from 'node:test';
import assert from 'node:assert/strict';
import {
  KhokhoSim,
  runKhokhoHeadless,
  MIN_KHOKHO_PLAYERS,
  MAX_KHOKHO_PLAYERS,
  KHOKHO_DURATIONS,
  DEFAULT_KHOKHO_DURATION,
  DEFAULT_KHOKHO_RULE,
  normalizeKhokhoDuration,
  khokhoVariant,
  KHOKHO_POPUPS,
} from '../public/js/khokho-sim.js';

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

test('Kho-Kho Relay Blitz durations and variants normalize cleanly', () => {
  assert.deepEqual(KHOKHO_DURATIONS.map((d) => d.seconds), [120, 60, 30, 15, 10]);
  assert.equal(DEFAULT_KHOKHO_DURATION, 15);
  assert.equal(DEFAULT_KHOKHO_RULE, 'elusive');
  assert.equal(normalizeKhokhoDuration(15), 15);
  assert.equal(normalizeKhokhoDuration(28), 30);
  assert.equal(normalizeKhokhoDuration('bad'), 15);
  assert.equal(khokhoVariant(10).chairs, 6);
  assert.equal(khokhoVariant(30).chairs, 8);
  assert.equal(khokhoVariant(120).chairs, 8);
  assert.ok(Object.keys(KHOKHO_POPUPS).length >= 5);
});

test('KhokhoSim enforces player bounds and completes cleanly in Elusive and First P1 rules', () => {
  assert.throws(() => new KhokhoSim({ names: ['Solo'] }));
  const tooMany = Array.from({ length: MAX_KHOKHO_PLAYERS + 1 }, (_, i) => `P${i + 1}`);
  assert.throws(() => new KhokhoSim({ names: tooMany }));

  const names = ['Ada', 'Grace', 'Linus', 'Hedy', 'Alan', 'Margaret'];
  for (const rule of ['elusive', 'p1']) {
    for (const duration of [10, 15, 30]) {
      const sim = runKhokhoHeadless(names, { duration, rule, rng: seeded(2026 + duration) });
      assert.equal(sim.done, true, `rule=${rule} duration=${duration} finishes`);
      assert.ok(sim.winner, `rule=${rule} duration=${duration} has winner`);
      assert.ok(names.includes(sim.winner.name));
      assert.equal(sim.runners.length, names.length);
      for (const r of sim.runners) {
        assert.ok(Number.isFinite(r.x) && Number.isFinite(r.z), 'finite runner coords');
      }
      assert.equal(sim.standings().length, names.length);
    }
  }
  assert.equal(MIN_KHOKHO_PLAYERS, 2);
});

test('KhokhoSim victory scene keeps runners and chasers clear of the projector cart and chai trolley', () => {
  const names = ['Ada', 'Grace', 'Linus', 'Hedy', 'Alan', 'Margaret'];
  const sim = runKhokhoHeadless(names, { duration: 15, rule: 'elusive', rng: seeded(42) });
  // Place a chaser and the winner right next to the end carts when victory starts
  sim.chasers[0].x = sim.spineHalfL + 2.2;
  sim.chasers[0].z = 0.2;
  sim.winner.x = -sim.spineHalfL - 1.5;
  sim.winner.z = 0.1;

  for (let i = 0; i < 180; i++) sim.step(1 / 60);

  for (const c of sim.chasers) {
    if (!c.active) continue;
    assert.ok(Math.abs(c.x) < sim.spineHalfL - 1.5, `chaser x=${c.x} should settle clear of end carts`);
    assert.ok(Math.abs(c.z) > 2.5, `chaser z=${c.z} should stay in open aisle`);
  }
  assert.ok(Math.abs(sim.winner.x) < sim.spineHalfL - 1.5, `winner x=${sim.winner.x} should celebrate clear of end carts`);
  assert.ok(Math.abs(sim.winner.z) > 2.5, `winner z=${sim.winner.z} should celebrate in open aisle`);
});
