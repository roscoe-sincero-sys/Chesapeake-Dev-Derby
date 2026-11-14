import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRoster, pickRandomRacer } from '../public/js/eligibility.js';

test('immediate picks exclude absentees and recent winners', () => {
  const roster = buildRoster(['Ada', 'Grace', 'Linus', 'Hedy'], [{ name: 'Ada' }]);
  const absent = new Set(['grace']);
  assert.equal(pickRandomRacer(roster, absent, () => 0), 'Linus');
  assert.equal(pickRandomRacer(roster, absent, () => 0.999999), 'Hedy');
  assert.equal(pickRandomRacer(roster, new Set(['grace', 'hedy'])), null);
});

test('immediate pick partitions the random range equally among eligible racers', () => {
  const roster = buildRoster(['Ada', 'Grace', 'Linus'], []);
  const picked = Array.from({ length: 300 }, (_, i) => pickRandomRacer(roster, new Set(), () => (i + 0.5) / 300));
  for (const name of ['Ada', 'Grace', 'Linus']) assert.equal(picked.filter((n) => n === name).length, 100);
});
