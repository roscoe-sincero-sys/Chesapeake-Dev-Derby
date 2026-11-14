import test from 'node:test';
import assert from 'node:assert/strict';
import { readLobbySettings, writeLobbySettings, retainRosterAbsences, normalizeSpeed, speedToStep, stepToSpeed, RACE_LENGTHS } from '../public/js/lobby-settings.js';
import { buildRoster, selectRacers } from '../public/js/eligibility.js';

function storage(initial = null) {
  let value = initial;
  return () => ({ getItem: () => value, setItem: (_key, next) => { value = next; } });
}

test('attendance and speed survive a settings round trip', () => {
  const getStorage = storage();
  assert.equal(writeLobbySettings({ absent: new Set(['ada', 'grace']), speed: 8 }, getStorage), true);
  const restored = readLobbySettings(getStorage);
  assert.deepEqual([...restored.absent], ['ada', 'grace']);
  assert.equal(restored.speed, 8);
  assert.deepEqual(selectRacers(buildRoster(['Ada', 'Grace', 'Linus', 'Hedy'], []), restored.absent), ['Linus', 'Hedy']);
});

test('the slider offers 120, 60, 30, 15 and 10 second races', () => {
  assert.deepEqual(RACE_LENGTHS.map((o) => o.seconds), [120, 60, 30, 15, 10]);
  for (const { seconds, speed } of RACE_LENGTHS) assert.equal(Math.round(120 / speed), seconds);
  assert.deepEqual(RACE_LENGTHS.map((_, i) => stepToSpeed(i)), [1, 2, 4, 8, 12]);
  assert.deepEqual([1, 2, 4, 8, 12].map(speedToStep), [0, 1, 2, 3, 4]);
  assert.equal(stepToSpeed(-3), 1);
  assert.equal(stepToSpeed(99), 12);
});

test('older or hand-typed speeds snap to the nearest offered length', () => {
  // Speeds saved by earlier versions (1 to 7 or 10) and ?speed= values.
  assert.deepEqual([1, 3, 5, 6, 7, 10, 20].map(normalizeSpeed), [1, 4, 4, 8, 8, 12, 12]);
  assert.equal(normalizeSpeed(0), 1);
  assert.equal(normalizeSpeed(NaN), 2);
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
  assert.equal(restored.speed, 12);
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
