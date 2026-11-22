import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MIN_JENGA_PLAYERS,
  MAX_JENGA_PLAYERS,
  JENGA_DURATIONS,
  DEFAULT_JENGA_DURATION,
  normalizeJengaDuration,
  jengaVariant,
  SAFE_BLOCKS,
  KEYSTONE_BLOCKS,
  JENGA_EXCUSES,
  perchPositions,
  planJengaMatch,
  towerSwayAt,
  stabilityAt,
} from '../public/js/jenga-sim.js';

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('Dependency Jenga duration normalization and 3 scaling variants match spec', () => {
  assert.deepEqual(JENGA_DURATIONS.map((d) => d.seconds), [120, 60, 30, 15, 10]);
  assert.equal(DEFAULT_JENGA_DURATION, 15);
  assert.equal(normalizeJengaDuration(12), 10);
  assert.equal(normalizeJengaDuration(40), 30);
  assert.equal(normalizeJengaDuration('bad'), DEFAULT_JENGA_DURATION);

  const friday = jengaVariant(15);
  assert.equal(friday.id, 'friday');
  assert.equal(friday.tiers, 12);
  assert.equal(friday.pulls, 3);
  assert.equal(friday.fakeOuts, 0);
  assert.equal(friday.stackOnTop, false);

  const major = jengaVariant(30);
  assert.equal(major.id, 'major');
  assert.equal(major.tiers, 18);
  assert.ok(major.fakeOuts >= 1);
  assert.equal(major.stackOnTop, false);

  const monolith = jengaVariant(60);
  assert.equal(monolith.id, 'monolith');
  assert.equal(monolith.tiers, 24);
  assert.equal(monolith.stackOnTop, true);
});

test('perchPositions places all 2-30 players solidly on top of the 6.0 x 6.0 Jenga rooftop', () => {
  const small = perchPositions(6, 12);
  assert.equal(small.length, 6);
  assert.ok(small.every((p) => p.onTop && Math.abs(p.x) <= 2.6 && Math.abs(p.z) <= 2.6));

  const full = perchPositions(30, 24);
  assert.equal(full.length, 30);
  assert.ok(full.every((p) => p.onTop && Math.abs(p.x) <= 2.6 && Math.abs(p.z) <= 2.6), 'zero floating players off the edges');
});

test('planJengaMatch enforces bounds, fair 1/N winner selection, and exact block/excuse catalogs', () => {
  assert.equal(MIN_JENGA_PLAYERS, 2);
  assert.equal(MAX_JENGA_PLAYERS, 30);
  assert.throws(() => planJengaMatch(['Solo']));
  assert.throws(() => planJengaMatch(Array.from({ length: 31 }, (_, i) => `Dev ${i}`)));

  const names = ['Ada', 'Grace', 'Linus', 'Hedy', 'Alan', 'Margaret', 'Ken', 'Barbara'];
  const p30 = planJengaMatch(names, { duration: 30, rng: seeded(61) });
  assert.equal(p30.blocks.length, 18 * 3);
  assert.equal(p30.blocks.filter((b) => b.isKeystone).length, 1);
  assert.ok(p30.actions.some((a) => a.type === 'fakeout'), '30s variant includes Fake-Out Taps');
  assert.equal(p30.actions[p30.actions.length - 1].type, 'keystone');

  const keystone = p30.blocks.find((b) => b.isKeystone);
  assert.ok(KEYSTONE_BLOCKS.includes(keystone.label));
  for (const b of p30.blocks.filter((x) => !x.isKeystone)) {
    assert.ok(SAFE_BLOCKS.includes(b.label));
  }
  for (const pl of p30.players) {
    assert.ok(JENGA_EXCUSES.includes(pl.excuse));
  }
  assert.equal(p30.winner.floorAt, null, 'winner stays off PROD DOWN floor');
  for (const loser of p30.players.filter((x) => !x.isWinner)) {
    assert.ok(loser.fallAt !== null && loser.floorAt > loser.fallAt);
  }

  // 60s Full Monolith Migration enables Stack-On-Top Rebuilding
  const p60 = planJengaMatch(names, { duration: 60, rng: seeded(62) });
  assert.equal(p60.tiers, 24);
  assert.ok(p60.actions.some((a) => a.type === 'pull' && a.stackOnTop && a.stackTier >= 24));

  // Uniform winner fairness across seeds
  const counts = new Map(names.map((n) => [n, 0]));
  for (let s = 1; s <= 400; s++) {
    const plan = planJengaMatch(names, { duration: 15, rng: seeded(s) });
    counts.set(plan.winner.name, counts.get(plan.winner.name) + 1);
  }
  for (const [n, c] of counts) {
    assert.ok(c >= 20 && c <= 90, `${n} won ${c}/400 times`);
  }
});

test('towerSwayAt stays realistically upright during safe pulls and tips past 15 degrees at fatal keystone pull', () => {
  const names = ['Ada', 'Grace', 'Linus', 'Hedy', 'Alan', 'Margaret'];
  const plan = planJengaMatch(names, { duration: 15, rng: seeded(73) });
  assert.equal(stabilityAt(plan, 0), 100);
  assert.ok(stabilityAt(plan, plan.keystoneStart) < 40);
  assert.equal(stabilityAt(plan, plan.collapseAt), 0);

  // During safe pulls (before fatal keystone), tower stays realistically upright (< 8°)
  let maxSafeDeg = 0;
  for (let t = 0; t < plan.keystoneStart; t += 0.05) {
    const deg = Math.abs((towerSwayAt(plan, t) * 180) / Math.PI);
    if (deg > maxSafeDeg) maxSafeDeg = deg;
  }
  assert.ok(maxSafeDeg < 8, `expected realistic safe-phase lean < 8° (got ${maxSafeDeg.toFixed(1)}°)`);

  // During fatal keystone extraction, tower tips past 15° into collapse!
  let maxKeystoneDeg = 0;
  for (let t = plan.keystoneStart; t <= plan.collapseAt; t += 0.05) {
    const deg = Math.abs((towerSwayAt(plan, t) * 180) / Math.PI);
    if (deg > maxKeystoneDeg) maxKeystoneDeg = deg;
  }
  assert.ok(maxKeystoneDeg >= 15, `expected tipping lean >= 15° at collapse (got ${maxKeystoneDeg.toFixed(1)}°)`);
});
