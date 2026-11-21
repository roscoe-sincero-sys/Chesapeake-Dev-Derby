import test from 'node:test';
import assert from 'node:assert/strict';
import { buildChyronLines } from '../public/js/chyron.js';
import { buildRoster } from '../public/js/eligibility.js';

test('chyron highlights never-won underdogs, drought streaks, cooldowns, and mode hype', () => {
  const names = ['Ada', 'Grace', 'Linus', 'Hedy', 'Ken'];
  const winners = [{ name: 'Ken', date: '2026-11-18T14:00:00Z' }];
  const roster = buildRoster(names, winners);
  // Newest-first history: Ken won 0 ago, Grace 1 ago, Ada 2 ago, Linus 3 ago; Hedy has never won.
  const history = [
    { name: 'Ken', mode: 'race' },
    { name: 'Grace', mode: 'wrestle' },
    { name: 'Ada', mode: 'race' },
    { name: 'Linus', mode: 'skip' },
  ];
  const lines = buildChyronLines({ roster, absent: new Set(), winners, history, mode: { id: 'race', name: 'Derby Race' } });
  assert.equal(lines.length, 3);
  assert.equal(lines[0].tag, 'ON GRID');
  assert.match(lines[0].text, /4 racers idling/);
  assert.equal(lines[1].tag, 'UNDERDOG');
  assert.match(lines[1].text, /Hedy has yet to lead/);
  assert.equal(lines[2].tag, 'COOLDOWN');
  assert.match(lines[2].text, /Ken/);
});

test('chyron reports longest drought when every ready player has won before', () => {
  const names = ['Ada', 'Grace', 'Linus', 'Ken'];
  const roster = buildRoster(names, []);
  const history = [
    { name: 'Ken', mode: 'race' },
    { name: 'Grace', mode: 'race' },
    { name: 'Ada', mode: 'wrestle' },
    { name: 'Linus', mode: 'race' },
  ];
  const lines = buildChyronLines({ roster, absent: new Set(), winners: [], history, mode: { id: 'rumble', name: 'Let’s Rumble' } });
  assert.equal(lines[0].tag, 'RING LIVE');
  assert.equal(lines[1].tag, 'UNDERDOG');
  assert.match(lines[1].text, /Linus hasn’t led in 3 picks/);
});

test('chyron skips absent players and returns empty when nobody is ready and no winners exist', () => {
  const roster = buildRoster(['Ada', 'Grace'], []);
  const lines = buildChyronLines({ roster, absent: new Set(['ada', 'grace']), winners: [], history: [], mode: { id: 'race', name: 'Derby Race' } });
  assert.deepEqual(lines, []);
});
