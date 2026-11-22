import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MIN_CANNON_PLAYERS,
  MAX_CANNON_PLAYERS,
  CANNON_DURATIONS,
  DEFAULT_CANNON_DURATION,
  normalizeCannonDuration,
  cannonVariant,
  CANNON_ARCHETYPES,
  cannonBattery,
  solveBallisticVelocity,
  planCannonMatch,
  sampleShotState,
  bargePosAt,
  GRAVITY,
} from '../public/js/cannon-sim.js';

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('Deploy Cannon duration normalization and 3 salvo variants match spec', () => {
  assert.deepEqual(CANNON_DURATIONS.map((d) => d.seconds), [120, 60, 30, 15, 10]);
  assert.equal(DEFAULT_CANNON_DURATION, 15);
  assert.equal(normalizeCannonDuration(12), 10);
  assert.equal(normalizeCannonDuration(40), 30);
  assert.equal(normalizeCannonDuration('bad'), DEFAULT_CANNON_DURATION);

  assert.equal(cannonVariant(15).id, 'volley');
  assert.equal(cannonVariant(15).movingBarge, false);
  assert.equal(cannonVariant(30).id, 'qualify');
  assert.equal(cannonVariant(30).twoStage, true);
  assert.equal(cannonVariant(60).id, 'showcase');
  assert.equal(cannonVariant(60).staggered, true);
});

test('cannonBattery uses single pier arc for 2-12 players and 2 stadium tiers for 13-30', () => {
  const small = cannonBattery(10);
  assert.equal(small.length, 10);
  assert.ok(small.every((p) => p.tier === 0));

  const large = cannonBattery(28);
  assert.equal(large.length, 28);
  assert.ok(large.some((p) => p.tier === 0) && large.some((p) => p.tier === 1));
});

test('solveBallisticVelocity lands at exact target coordinates at t = T', () => {
  const p0 = { x: -4, y: 2.2, z: 1 };
  const pT = { x: 3, y: 0.72, z: -48 };
  const T = 5.0;
  const v0 = solveBallisticVelocity(p0, pT, T, GRAVITY);
  const x = p0.x + v0.vx * T;
  const y = p0.y + v0.vy * T - 0.5 * GRAVITY * T * T;
  const z = p0.z + v0.vz * T;
  assert.ok(Math.abs(x - pT.x) < 1e-6);
  assert.ok(Math.abs(y - pT.y) < 1e-6);
  assert.ok(Math.abs(z - pT.z) < 1e-6);
});

test('planCannonMatch enforces bounds, fair 1/N winner selection, and exact mishap catalog', () => {
  assert.equal(MIN_CANNON_PLAYERS, 2);
  assert.equal(MAX_CANNON_PLAYERS, 30);
  assert.throws(() => planCannonMatch(['Solo']));
  assert.throws(() => planCannonMatch(Array.from({ length: 31 }, (_, i) => `Dev ${i}`)));

  const names = ['Ada', 'Grace', 'Linus', 'Hedy', 'Alan', 'Margaret', 'Ken', 'Barbara'];
  const plan = planCannonMatch(names, { duration: 15, rng: seeded(83) });
  assert.equal(plan.shots.length, names.length);
  assert.equal(plan.winner.distanceM, 0);
  assert.equal(plan.winner.archetype, 'bullseye');

  const losers = plan.shots.filter((s) => !s.isWinner);
  assert.ok(losers.some((s) => s.archetype === 'rimBounce'), 'reserves rimBounce for final decoy(s)');
  for (const s of losers) {
    assert.ok(Object.hasOwn(CANNON_ARCHETYPES, s.archetype));
    assert.ok(CANNON_ARCHETYPES[s.archetype].popups.includes(s.popup));
    assert.ok(s.distanceM > 0);
  }

  // Mid-flight coordinates must be finite and airborne above the bay
  for (const s of plan.shots) {
    const mid = sampleShotState(s, s.launchAt + s.flightDur * 0.5, plan);
    assert.equal(mid.airborne, true);
    assert.ok(Number.isFinite(mid.x) && Number.isFinite(mid.y) && Number.isFinite(mid.z), `${s.name} mid-flight finite`);
    assert.ok(mid.y > 1.5 && mid.y < 40, `${s.name} mid-flight apex reasonable (got ${mid.y})`);
  }

  // Winner lands dead-center on the barge
  const wEnd = sampleShotState(plan.winner, plan.winner.landAt + 0.1, plan);
  const bEnd = bargePosAt(plan, plan.winner.landAt + 0.1);
  assert.equal(wEnd.landed, true);
  assert.equal(wEnd.splashed, false);
  assert.ok(Math.hypot(wEnd.x - bEnd.x, wEnd.z - bEnd.z) < 0.1);

  // Uniform winner fairness across seeds
  const counts = new Map(names.map((n) => [n, 0]));
  for (let s = 1; s <= 400; s++) {
    const p = planCannonMatch(names, { duration: 15, rng: seeded(s) });
    counts.set(p.winner.name, counts.get(p.winner.name) + 1);
  }
  for (const [n, c] of counts) {
    assert.ok(c >= 20 && c <= 90, `${n} won ${c}/400 times`);
  }
});
