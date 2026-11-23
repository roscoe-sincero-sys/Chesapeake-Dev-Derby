import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DominoSim,
  runDominoHeadless,
  buildDominoSlams,
  normalizeDominoDuration,
  dominoVariant,
  DOMINO_DURATIONS,
  DOMINO_POPUPS,
  MIN_DOMINO_PLAYERS,
  MAX_DOMINO_PLAYERS,
} from '../public/js/domino-sim.js';

function seededRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

test('Domino Slam duration variants scale slam counts and knock tremors', () => {
  assert.deepEqual(DOMINO_DURATIONS.map((d) => d.seconds), [120, 60, 30, 15, 10]);
  assert.equal(normalizeDominoDuration(12), 10);
  assert.equal(normalizeDominoDuration(28), 30);
  assert.equal(normalizeDominoDuration('bad'), 15);
  assert.ok(dominoVariant(15).slams < dominoVariant(30).slams);
  assert.ok(dominoVariant(30).slams < dominoVariant(120).slams);
});

test('buildDominoSlams starts with Double-Six POSE! and finishes with SIX-LOVE!', () => {
  const { slams, knocks } = buildDominoSlams(30, seededRng(42));
  assert.equal(slams[0].kind, 'pose');
  assert.equal(slams[0].a, 6);
  assert.equal(slams[0].b, 6);
  assert.equal(slams.at(-1).kind, 'sixlove');
  assert.ok(knocks.length >= 2);
});

test('DominoSim enforces bounds and finishes cleanly in Champion and Six-Love rules', () => {
  assert.throws(() => new DominoSim({ names: ['Solo'] }));
  assert.throws(() => new DominoSim({ names: Array.from({ length: MAX_DOMINO_PLAYERS + 1 }, (_, i) => `D${i}`) }));
  assert.equal(MIN_DOMINO_PLAYERS, 2);

  for (const rule of ['champion', 'sixlove']) {
    for (const duration of [10, 15, 30]) {
      const names = ['Ada', 'Grace', 'Linus', 'Hedy', 'Alan', 'Margaret'];
      const sim = runDominoHeadless(names, { duration, rule, rng: seededRng(1100 + duration) });
      assert.equal(sim.done, true);
      assert.ok(sim.winner && names.includes(sim.winner.name));
      for (const p of sim.players) {
        assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z));
      }
    }
  }
});

test('Domino Slam Champion mode paces eliminations steadily instead of clearing the table on Slam 0', () => {
  const names = ['Ada', 'Grace', 'Linus', 'Hedy', 'Alan', 'Margaret', 'Ken', 'Dennis'];
  const sim = new DominoSim({ names, duration: 15, rule: 'champion', rng: seededRng(2026) });
  const afterFirstSlam = sim.slams[0].at + 1.2;
  while (sim.time < afterFirstSlam) sim.step(1 / 60);
  assert.ok(sim.activeCount() >= 5, `at least 5 of 8 should survive Slam 0 (got ${sim.activeCount()})`);
  while (!sim.done && sim.time < 20) sim.step(1 / 60);
  assert.equal(sim.done, true);
  assert.equal(sim.activeCount(), 1);
});

test('Domino Slam catalog contains all spec dev-humor popups', () => {
  assert.ok(DOMINO_POPUPS.pose.includes('POSE! Prod is down — PANAGAN!'));
  assert.ok(DOMINO_POPUPS.deadlock.includes('Blocked by 800 column table!'));
  assert.ok(DOMINO_POPUPS.knock.includes('Passing the ticket to another team'));
  assert.ok(DOMINO_POPUPS.cup.includes('Knocked off by BadalJwala 500'));
  assert.ok(DOMINO_POPUPS.pinch.includes("Failed to read Ekmaatra-ji's mind"));
});
