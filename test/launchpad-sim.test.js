import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MIN_LAUNCH_PLAYERS,
  MAX_LAUNCH_PLAYERS,
  LAUNCH_DURATIONS,
  DEFAULT_LAUNCH_DURATION,
  normalizeLaunchDuration,
  launchVariant,
  FAILURE_ARCHETYPES,
  padFormation,
  planLaunchMatch,
  sampleRocketState,
} from '../public/js/launchpad-sim.js';

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('Launchpad Roulette duration normalization and 3 scaling variants', () => {
  assert.deepEqual(LAUNCH_DURATIONS.map((d) => d.seconds), [120, 60, 30, 15, 10]);
  assert.equal(DEFAULT_LAUNCH_DURATION, 15);
  assert.equal(normalizeLaunchDuration(12), 10);
  assert.equal(normalizeLaunchDuration(25), 30);
  assert.equal(normalizeLaunchDuration('bad'), DEFAULT_LAUNCH_DURATION);

  assert.equal(launchVariant(10), 'hotfix');
  assert.equal(launchVariant(15), 'hotfix');
  assert.equal(launchVariant(30), 'twostage');
  assert.equal(launchVariant(60), 'orbital');
  assert.equal(launchVariant(120), 'orbital');
});

test('padFormation uses shallow arc for 2-10 players and multi-row amphitheater for 11-30', () => {
  const small = padFormation(6);
  assert.equal(small.length, 6);
  const smallZSpan = Math.max(...small.map((p) => p.z)) - Math.min(...small.map((p) => p.z));
  assert.ok(smallZSpan < 4, '2-10 players sit on a shallow arc');

  const large = padFormation(24);
  assert.equal(large.length, 24);
  const distinctZ = new Set(large.map((p) => Math.round(p.z)));
  assert.ok(distinctZ.size >= 2, '11-30 players use multi-row amphitheater');
});

test('planLaunchMatch enforces player limits, fair winner selection, and staggered failures', () => {
  assert.throws(() => planLaunchMatch(['Solo']));
  const tooMany = Array.from({ length: MAX_LAUNCH_PLAYERS + 1 }, (_, i) => `Dev ${i}`);
  assert.throws(() => planLaunchMatch(tooMany));

  const names = ['Ada', 'Grace', 'Linus', 'Hedy', 'Alan', 'Margaret', 'Ken', 'Barbara'];
  const plan = planLaunchMatch(names, { duration: 30, rng: seeded(51) });
  assert.equal(plan.rockets.length, names.length);
  assert.ok(names.includes(plan.winner.name));
  assert.equal(plan.rockets.filter((r) => r.isWinner).length, 1);
  assert.ok(plan.stageSepAt > plan.countdownEnd && plan.stageSepAt < plan.duration);

  const losers = plan.rockets.filter((r) => !r.isWinner);
  assert.equal(losers.length, names.length - 1);
  for (const r of losers) {
    assert.ok(r.failureTime > plan.countdownEnd && r.failureTime < plan.duration, `${r.name} failureTime in flight`);
    assert.ok(Object.hasOwn(FAILURE_ARCHETYPES, r.failureType), `known archetype ${r.failureType}`);
    assert.ok(FAILURE_ARCHETYPES[r.failureType].popups.includes(r.popup), `popup matches archetype`);
  }
  assert.ok(losers.some((r) => r.failureType === 'cloudHeartbreak'), 'final decoy gets cloudHeartbreak');

  // Uniform winner fairness across many seeds
  const counts = new Map(names.map((n) => [n, 0]));
  for (let s = 1; s <= 400; s++) {
    const p = planLaunchMatch(names, { duration: 15, rng: seeded(s) });
    counts.set(p.winner.name, counts.get(p.winner.name) + 1);
  }
  for (const [n, c] of counts) {
    assert.ok(c >= 20 && c <= 90, `${n} won ${c}/400 times`);
  }
});

test('sampleRocketState climbs cleanly for winner and triggers failure physics for losers', () => {
  const names = ['Ada', 'Grace', 'Linus', 'Hedy'];
  const plan = planLaunchMatch(names, { duration: 15, rng: seeded(7) });

  const wStart = sampleRocketState(plan.winner, 0, plan);
  const wEnd = sampleRocketState(plan.winner, plan.duration, plan);
  assert.equal(wStart.y, 0);
  assert.equal(wStart.alive, true);
  assert.ok(wEnd.y >= plan.orbitAltitude - 1, 'winner reaches orbit altitude');
  assert.equal(wEnd.alive, true);

  const loser = plan.rockets.find((r) => !r.isWinner);
  const lBefore = sampleRocketState(loser, Math.max(0, loser.failureTime - 0.1), plan);
  const lAfter = sampleRocketState(loser, loser.failureTime + 0.5, plan);
  assert.equal(lBefore.alive, true);
  assert.equal(lAfter.alive, false);
});

test('30-player launch plans cleanly without NaN coordinates', () => {
  const names = Array.from({ length: MAX_LAUNCH_PLAYERS }, (_, i) => `Dev ${i + 1}`);
  const plan = planLaunchMatch(names, { duration: 60, rng: seeded(99) });
  assert.equal(plan.rockets.length, 30);
  assert.equal(MIN_LAUNCH_PLAYERS, 2);
  for (const r of plan.rockets) {
    const st = sampleRocketState(r, plan.duration * 0.5, plan);
    assert.ok(Number.isFinite(st.x) && Number.isFinite(st.y) && Number.isFinite(st.z));
  }
});
