import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MIN_GOLF_PLAYERS,
  MAX_GOLF_PLAYERS,
  GOLF_DURATIONS,
  DEFAULT_GOLF_DURATION,
  normalizeGolfDuration,
  golfVariant,
  GOLF_HAZARD_POPUPS,
  buildGolfCourse,
  courseHeightAt,
  GolfSim,
  runGolfHeadless,
} from '../public/js/golf-sim.js';

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('Standup Mini-Golf duration normalization and 3 course variants match spec', () => {
  assert.deepEqual(GOLF_DURATIONS.map((d) => d.seconds), [120, 60, 30, 15, 10]);
  assert.equal(DEFAULT_GOLF_DURATION, 15);
  assert.equal(normalizeGolfDuration(12), 10);
  assert.equal(normalizeGolfDuration(40), 30);
  assert.equal(normalizeGolfDuration('bad'), DEFAULT_GOLF_DURATION);

  assert.equal(golfVariant(15).id, 'par1');
  assert.equal(golfVariant(30).id, 'par3');
  assert.equal(golfVariant(30).firewall, true);
  assert.equal(golfVariant(60).id, 'championship');
  assert.equal(golfVariant(60).windmills, 2);

  for (const key of ['windmill', 'firewall', 'sand', 'water', 'bumper', 'detour']) {
    assert.ok(Array.isArray(GOLF_HAZARD_POPUPS[key]) && GOLF_HAZARD_POPUPS[key].length >= 1);
  }
});

test('courseHeightAt slopes smoothly up to the elevated DEPLOY TO PROD putting green', () => {
  const c = buildGolfCourse(30);
  assert.equal(courseHeightAt(c, 0, -2), 0);
  const midRamp = courseHeightAt(c, 0, (c.greenRampStartZ + c.greenFlatZ) / 2);
  assert.ok(midRamp > 0.3 && midRamp < c.greenHeight);
  assert.ok(courseHeightAt(c, 3, c.cup.z) > 1.5);
  assert.ok(courseHeightAt(c, c.cup.x, c.cup.z) < courseHeightAt(c, c.cup.x + 2.5, c.cup.z), 'cup has inward funnel dip');
});

test('GolfSim enforces 2..30 player bounds and finishes cleanly across variants and player counts', () => {
  assert.equal(MIN_GOLF_PLAYERS, 2);
  assert.equal(MAX_GOLF_PLAYERS, 30);
  assert.throws(() => new GolfSim({ names: ['Solo'] }));
  assert.throws(() => new GolfSim({ names: Array.from({ length: 31 }, (_, i) => `Dev ${i}`) }));

  for (const [count, duration, seed] of [[2, 10, 11], [8, 30, 22], [30, 15, 33]]) {
    const names = Array.from({ length: count }, (_, i) => `Dev ${i + 1}`);
    const sim = runGolfHeadless(names, { duration, rng: seeded(seed) });
    assert.equal(sim.done, true, `completed for ${count} players (${duration}s)`);
    assert.ok(sim.winner && names.includes(sim.winner.name));
    assert.equal(sim.winner.sunk, true);
    for (const b of sim.balls) {
      assert.ok(Number.isFinite(b.x) && Number.isFinite(b.y) && Number.isFinite(b.z));
    }
  }
});
