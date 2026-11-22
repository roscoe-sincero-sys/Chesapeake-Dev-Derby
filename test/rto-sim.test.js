import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RtoSim,
  runRtoHeadless,
  buildRtoCourse,
  rtoHeightAt,
  isCopierJammed,
  normalizeRtoDuration,
  rtoVariant,
  RTO_DURATIONS,
  RTO_HAZARD_POPUPS,
  MIN_RTO_PLAYERS,
  MAX_RTO_PLAYERS,
} from '../public/js/rto-sim.js';

function seededRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

test('RTO Mini-Golf duration variants scale the indoor office floor cleanly', () => {
  assert.deepEqual(RTO_DURATIONS.map((d) => d.seconds), [120, 60, 30, 15, 10]);
  assert.equal(normalizeRtoDuration(12), 10);
  assert.equal(normalizeRtoDuration(28), 30);
  assert.equal(normalizeRtoDuration('bad'), 15);

  const dash = rtoVariant(15);
  const mandate = rtoVariant(30);
  const champ = rtoVariant(120);
  assert.equal(dash.id, 'dash');
  assert.equal(mandate.id, 'mandate');
  assert.equal(champ.id, 'championship');
  assert.ok(dash.length < mandate.length && mandate.length < champ.length);
  assert.equal(dash.copier, false);
  assert.equal(mandate.copier, true);
  assert.equal(champ.chairs, 2);
});

test('rtoHeightAt creates cable bumps, binder ramp up to Executive Green, and mug funnel', () => {
  const c = buildRtoCourse(30);
  assert.equal(rtoHeightAt(c, 0, -2), 0);
  assert.ok(rtoHeightAt(c, 0, c.cableBumps[0].z) > 0.15, 'cable protector forms a speed bump');
  const greenRim = rtoHeightAt(c, 3.2, c.cup.z);
  const mugCenter = rtoHeightAt(c, c.cup.x, c.cup.z);
  assert.ok(greenRim > 1.0, 'Executive Green is elevated above the tee');
  assert.ok(mugCenter < greenRim, 'coffee mug center funnels inward');
});

test('isCopierJammed alternates between jammed and open phases', () => {
  const cp = { z: -20, period: 3.5, closedFrac: 0.36 };
  assert.equal(isCopierJammed(cp, 0.2), true);
  assert.equal(isCopierJammed(cp, 2.5), false);
});

test('RtoSim enforces player bounds and finishes deterministically with a valid winner', () => {
  assert.throws(() => new RtoSim({ names: ['Solo'] }));
  assert.throws(() => new RtoSim({ names: Array.from({ length: MAX_RTO_PLAYERS + 1 }, (_, i) => `D${i}`) }));
  assert.equal(MIN_RTO_PLAYERS, 2);

  for (const duration of [10, 15, 30, 60]) {
    const names = ['Ada', 'Grace', 'Linus', 'Hedy', 'Alan', 'Margaret'];
    const sim = runRtoHeadless(names, { duration, rng: seededRng(2026 + duration) });
    assert.equal(sim.done, true, `duration ${duration} finishes`);
    assert.ok(sim.winner, `duration ${duration} has a winner`);
    assert.ok(names.includes(sim.winner.name));
    assert.equal(sim.winner.sunk, true);
    assert.ok(sim.winner.strokes >= 1);
    for (const b of sim.balls) {
      assert.ok(Number.isFinite(b.x) && Number.isFinite(b.y) && Number.isFinite(b.z));
    }
  }
});

test('RTO Mini-Golf catalog contains all spec dev-humor hazard popups', () => {
  assert.ok(RTO_HAZARD_POPUPS.chair.includes('Blocked by khallas software license'));
  assert.ok(RTO_HAZARD_POPUPS.detour.includes('URL edits banned. Fix: add ?ReturnUrl='));
  assert.ok(RTO_HAZARD_POPUPS.copier.includes('BadalJwala 500 Internal Error'));
  assert.ok(RTO_HAZARD_POPUPS.coffee.includes('Waiting on developer poll results'));
  assert.ok(RTO_HAZARD_POPUPS.hardware.includes("Failed to read Iklauti-ji's mind"));
  assert.ok(RTO_HAZARD_POPUPS.abyss.includes('Rolling back server clock broke login'));
});
