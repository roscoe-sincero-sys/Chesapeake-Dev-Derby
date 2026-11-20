import test from 'node:test';
import assert from 'node:assert/strict';
import { readLobbySettings, writeLobbySettings, retainRosterAbsences, defaultLobbySettings } from '../public/js/lobby-settings.js';
import { normalizeSpeed, speedToStep, stepToSpeed, RACE_LENGTHS } from '../public/js/race-lengths.js';
import { buildRoster, selectRacers } from '../public/js/eligibility.js';

function storage(initial = null) {
  let value = initial;
  return () => ({ getItem: () => value, setItem: (_key, next) => { value = next; } });
}

/** Settings with every option at its default, except those given. */
function settings({ absent = [], mode = 'race', speed = 2, models = 'classic' } = {}) {
  return { absent: new Set(absent), mode, options: { race: { speed }, rumble: { models } } };
}

test('attendance, mode and options survive a settings round trip', () => {
  const getStorage = storage();
  assert.equal(writeLobbySettings(settings({ absent: ['ada', 'grace'], mode: 'rumble', speed: 8, models: 'hd' }), getStorage), true);
  const restored = readLobbySettings(getStorage);
  assert.deepEqual(restored, settings({ absent: ['ada', 'grace'], mode: 'rumble', speed: 8, models: 'hd' }));
  assert.deepEqual(selectRacers(buildRoster(['Ada', 'Grace', 'Linus', 'Hedy'], []), restored.absent), ['Linus', 'Hedy']);
  assert.deepEqual(JSON.parse(getStorage().getItem()), { absent: ['ada', 'grace'], mode: 'rumble', options: { race: { speed: 8 }, rumble: { models: 'hd' } } });
});

test('a new tab starts on Race, with every option at its default', () => {
  assert.deepEqual(defaultLobbySettings(), settings());
  assert.deepEqual(readLobbySettings(storage()), settings());
});

test('settings saved by 1.6 and earlier keep their attendance and race length', () => {
  assert.deepEqual(readLobbySettings(storage('{"absent":["ada"],"speed":8}')), settings({ absent: ['ada'], speed: 8 }));
  // An old speed snaps to the nearest offered length, as before.
  assert.equal(readLobbySettings(storage('{"absent":[],"speed":3}')).options.race.speed, 4);
  // If both shapes are present, the new one wins.
  assert.equal(readLobbySettings(storage('{"speed":8,"options":{"race":{"speed":1}}}')).options.race.speed, 1);
  assert.equal(readLobbySettings(storage('{"speed":8,"options":{"race":{}}}')).options.race.speed, 8);
});

test('an unknown or missing mode falls back to Race and keeps the rest', () => {
  for (const mode of ['arena', '', 42, null, ['rumble'], { id: 'rumble' }]) {
    const raw = JSON.stringify({ absent: ['ada'], mode, options: { rumble: { models: 'hd' } } });
    assert.deepEqual(readLobbySettings(storage(raw)), settings({ absent: ['ada'], models: 'hd' }), JSON.stringify(mode));
  }
  // Writing an unknown mode saves Race instead.
  const getStorage = storage();
  writeLobbySettings(settings({ mode: 'arena' }), getStorage);
  assert.equal(readLobbySettings(getStorage).mode, 'race');
});

test('invalid option values fall back to their defaults', () => {
  const cases = [
    ['{"mode":"rumble","options":{"rumble":{"models":"4k"}}}', settings({ mode: 'rumble' })],
    ['{"mode":"rumble","options":{"rumble":"hd"}}', settings({ mode: 'rumble' })],
    ['{"options":{"race":{"speed":"fast"},"rumble":{"models":true}}}', settings()],
    ['{"options":[1,2]}', settings()],
    ['{"options":{"race":{"speed":99},"arena":{"lives":3}}}', settings({ speed: 12 })],
  ];
  for (const [raw, expected] of cases) assert.deepEqual(readLobbySettings(storage(raw)), expected, raw);
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
  for (const raw of ['not json', 'null', '[]', '"race"', '{"absent":42,"speed":"bad"}']) {
    assert.deepEqual(readLobbySettings(storage(raw)), settings(), raw);
  }
  const restored = readLobbySettings(storage('{"absent":[" Ada ","ADA",null,42,""],"speed":99}'));
  assert.deepEqual([...restored.absent], ['ada']);
  assert.equal(restored.options.race.speed, 12);
  assert.equal(readLobbySettings(storage('{"speed":-5}')).options.race.speed, 1);
});

test('clearing attendance persists and unavailable storage does not throw', () => {
  const getStorage = storage('{"absent":["ada"],"speed":8}');
  writeLobbySettings(settings({ speed: 8 }), getStorage);
  assert.equal(readLobbySettings(getStorage).absent.size, 0);
  const blocked = () => { throw new Error('Storage disabled'); };
  assert.deepEqual(readLobbySettings(blocked), settings());
  assert.equal(writeLobbySettings(settings({ mode: 'rumble', speed: 8 }), blocked), false);
  // A storage that throws only on writing (quota full, Safari private mode) also reports failure.
  const readOnly = () => ({ getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); } });
  assert.equal(writeLobbySettings(settings(), readOnly), false);
  assert.deepEqual(readLobbySettings(readOnly), settings());
});
