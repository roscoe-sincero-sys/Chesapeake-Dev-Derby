import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PoleSim,
  runPoleHeadless,
  buildPoleBands,
  normalizePoleDuration,
  poleVariant,
  POLE_DURATIONS,
  POLE_POPUPS,
  MIN_POLE_PLAYERS,
  MAX_POLE_PLAYERS,
} from '../public/js/pole-sim.js';

function seededRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

test('Greasy Pole duration variants scale pole height and hazard bands', () => {
  assert.deepEqual(POLE_DURATIONS.map((d) => d.seconds), [120, 60, 30, 15, 10]);
  assert.equal(normalizePoleDuration(12), 10);
  assert.equal(normalizePoleDuration(28), 30);
  assert.equal(normalizePoleDuration('bad'), 15);
  assert.ok(poleVariant(15).height < poleVariant(30).height);
  assert.ok(poleVariant(30).height < poleVariant(120).height);
  assert.equal(buildPoleBands(22, 4).length, 4);
});

test('PoleSim enforces bounds and finishes cleanly in Summit and Mud-Drop modes', () => {
  assert.throws(() => new PoleSim({ names: ['Solo'] }));
  assert.throws(() => new PoleSim({ names: Array.from({ length: MAX_POLE_PLAYERS + 1 }, (_, i) => `D${i}`) }));
  assert.equal(MIN_POLE_PLAYERS, 2);

  for (const rule of ['summit', 'muddrop']) {
    for (const duration of [10, 15, 30]) {
      const names = ['Ada', 'Grace', 'Linus', 'Hedy', 'Alan', 'Margaret'];
      const sim = runPoleHeadless(names, { duration, rule, rng: seededRng(1300 + duration) });
      assert.equal(sim.done, true);
      assert.ok(sim.winner && names.includes(sim.winner.name));
      for (const c of sim.climbers) {
        assert.ok(Number.isFinite(c.theta) && Number.isFinite(c.y) && Number.isFinite(c.vy));
      }
    }
  }
});

test('Greasy Pole catalog contains all spec dev-humor popups', () => {
  assert.ok(POLE_POPUPS.mud.includes('Ekmaatra-ji still setting up an internal SSL cert for public website'));
  assert.ok(POLE_POPUPS.grease.includes("Ekmaatra-ji's secret hotfixes recreates vital tables"));
  assert.ok(POLE_POPUPS.static.includes('Ekmaatra-ji says you were not being clear'));
  assert.ok(POLE_POPUPS.domino.includes('IYAHAY NA! Ekmaatra-ji is on a witch hunt!'));
  assert.ok(POLE_POPUPS.splinter.includes('Ekmaatra-ji rolling back server clock to June 1996'));
});
