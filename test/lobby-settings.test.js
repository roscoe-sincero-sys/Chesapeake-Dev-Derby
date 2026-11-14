import test from 'node:test';
import assert from 'node:assert/strict';
import { readLobbySettings, writeLobbySettings, retainRosterAbsences } from '../public/js/lobby-settings.js';
import { buildRoster, selectRacers } from '../public/js/eligibility.js';

function storage(initial = null) {
  let value = initial;
  return () => ({ getItem: () => value, setItem: (_key, next) => { value = next; } });
}

test('attendance and speed survive a settings round trip', () => {
  const getStorage = storage();
  assert.equal(writeLobbySettings({ absent: new Set(['ada', 'grace']), speed: 5 }, getStorage), true);
  const restored = readLobbySettings(getStorage);
  assert.deepEqual([...restored.absent], ['ada', 'grace']);
  assert.equal(restored.speed, 5);
  assert.deepEqual(selectRacers(buildRoster(['Ada', 'Grace', 'Linus', 'Hedy'], []), restored.absent), ['Linus', 'Hedy']);
});

test('roster edits keep absences, drop removed names, and admit new joiners', () => {
  const absent = retainRosterAbsences(new Set(['ada', 'grace']), [' ADA ', 'Linus', 'New Joiner']);
  assert.deepEqual([...absent], ['ada']);
  assert.deepEqual(selectRacers(buildRoster(['Ada', 'Linus', 'New Joiner'], []), absent), ['Linus', 'New Joiner']);
  assert.deepEqual([...retainRosterAbsences(absent, [])], []);
});

test('recent-winner exclusion is independent of saved attendance', () => {
  const roster = buildRoster(['Ada', 'Grace', 'Linus', 'Hedy'], [{ name: 'Grace' }]);
  assert.deepEqual(selectRacers(roster, new Set(['ada'])), ['Linus', 'Hedy']);
});

test('corrupt saved settings fall back safely and normalize valid names and speeds', () => {
  for (const raw of ['not json', 'null', '[]', '{"absent":42,"speed":"bad"}']) {
    assert.deepEqual(readLobbySettings(storage(raw)), { absent: new Set(), speed: 2 });
  }
  const restored = readLobbySettings(storage('{"absent":[" Ada ","ADA",null,42,""],"speed":99}'));
  assert.deepEqual([...restored.absent], ['ada']);
  assert.equal(restored.speed, 7);
  assert.equal(readLobbySettings(storage('{"speed":-5}')).speed, 1);
});

test('clearing attendance persists and unavailable storage does not throw', () => {
  const getStorage = storage('{"absent":["ada"],"speed":8}');
  writeLobbySettings({ absent: new Set(), speed: 8 }, getStorage);
  assert.equal(readLobbySettings(getStorage).absent.size, 0);
  const blocked = () => { throw new Error('Storage disabled'); };
  assert.deepEqual(readLobbySettings(blocked), { absent: new Set(), speed: 2 });
  assert.equal(writeLobbySettings({ absent: new Set(), speed: 8 }, blocked), false);
});
