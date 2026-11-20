import test from 'node:test';
import assert from 'node:assert/strict';
import { readLobbySettings, writeLobbySettings, retainRosterAbsences, defaultLobbySettings } from '../public/js/lobby-settings.js';
import { normalizeSpeed, speedToStep, stepToSpeed, RACE_LENGTHS } from '../public/js/race-lengths.js';
import { buildRoster, selectRacers } from '../public/js/eligibility.js';

/** A fake storage holding one saved text (`initial`). */
function store(initial = null) {
  const s = { value: initial, getItem: () => s.value, setItem: (_key, next) => { s.value = next; } };
  return s;
}

/** The two storages the lobby uses: `session` for this tab, `local` for this browser. */
const browser = (session = store(), local = store()) => ({ session: () => session, local: () => local, tab: session, kept: local });

/** Settings with every option at its default, except those given. */
function settings({ absent = [], mode = 'race', speed = 2, models = 'classic' } = {}) {
  return { absent: new Set(absent), mode, options: { race: { speed }, rumble: { models } } };
}

test('attendance is kept for the tab, and the game and its options for the browser', () => {
  const b = browser();
  assert.equal(writeLobbySettings(settings({ absent: ['ada', 'grace'], mode: 'rumble', speed: 8, models: 'hd' }), b), true);
  const restored = readLobbySettings(b);
  assert.deepEqual(restored, settings({ absent: ['ada', 'grace'], mode: 'rumble', speed: 8, models: 'hd' }));
  assert.deepEqual(selectRacers(buildRoster(['Ada', 'Grace', 'Linus', 'Hedy'], []), restored.absent), ['Linus', 'Hedy']);
  assert.deepEqual(JSON.parse(b.tab.value), { absent: ['ada', 'grace'] });
  assert.deepEqual(JSON.parse(b.kept.value), { mode: 'rumble', options: { race: { speed: 8 }, rumble: { models: 'hd' } } });
});

test('a new tab (tomorrow’s meeting) keeps the game and its options, with everyone present again', () => {
  const kept = store();
  writeLobbySettings(settings({ absent: ['ada'], mode: 'rumble', models: 'hd', speed: 4 }), browser(store(), kept));
  assert.deepEqual(readLobbySettings(browser(store(), kept)), settings({ mode: 'rumble', models: 'hd', speed: 4 }));
});

test('a browser that has never chosen starts on Race, with every option at its default', () => {
  assert.deepEqual(defaultLobbySettings(), settings());
  assert.deepEqual(readLobbySettings(browser()), settings());
});

test('settings saved in the tab by 1.6 keep their attendance and race length', () => {
  const read = (raw) => readLobbySettings(browser(store(raw)));
  assert.deepEqual(read('{"absent":["ada"],"speed":8}'), settings({ absent: ['ada'], speed: 8 }));
  // An old speed snaps to the nearest offered length, as before.
  assert.equal(read('{"absent":[],"speed":3}').options.race.speed, 4);
  // If both shapes are present, the newer one wins.
  assert.equal(read('{"speed":8,"options":{"race":{"speed":1}}}').options.race.speed, 1);
  assert.equal(read('{"speed":8,"options":{"race":{}}}').options.race.speed, 8);
});

test('a game saved in the tab before 1.7 is used until the browser has its own, and then the browser’s wins', () => {
  const tab = '{"absent":["ada"],"mode":"rumble","options":{"rumble":{"models":"hd"}}}';
  assert.deepEqual(readLobbySettings(browser(store(tab))), settings({ absent: ['ada'], mode: 'rumble', models: 'hd' }));
  const kept = store('{"mode":"race","options":{"race":{"speed":12}}}');
  assert.deepEqual(readLobbySettings(browser(store(tab), kept)), settings({ absent: ['ada'], speed: 12 }));
  // Saving moves it: the tab then holds attendance only.
  const b = browser(store(tab));
  writeLobbySettings(readLobbySettings(b), b);
  assert.deepEqual(JSON.parse(b.tab.value), { absent: ['ada'] });
  assert.deepEqual(JSON.parse(b.kept.value).mode, 'rumble');
});

test('an unknown or missing game falls back to Race and keeps the rest', () => {
  for (const mode of ['arena', '', 42, null, ['rumble'], { id: 'rumble' }]) {
    const kept = store(JSON.stringify({ mode, options: { rumble: { models: 'hd' } } }));
    assert.deepEqual(readLobbySettings(browser(store('{"absent":["ada"]}'), kept)), settings({ absent: ['ada'], models: 'hd' }), JSON.stringify(mode));
  }
  // Writing an unknown game saves Race instead.
  const b = browser();
  writeLobbySettings(settings({ mode: 'arena' }), b);
  assert.equal(readLobbySettings(b).mode, 'race');
});

test('invalid option values fall back to their defaults', () => {
  const cases = [
    ['{"mode":"rumble","options":{"rumble":{"models":"4k"}}}', settings({ mode: 'rumble' })],
    ['{"mode":"rumble","options":{"rumble":"hd"}}', settings({ mode: 'rumble' })],
    ['{"options":{"race":{"speed":"fast"},"rumble":{"models":true}}}', settings()],
    ['{"options":[1,2]}', settings()],
    ['{"options":{"race":{"speed":99},"arena":{"lives":3}}}', settings({ speed: 12 })],
  ];
  for (const [raw, expected] of cases) assert.deepEqual(readLobbySettings(browser(store(), store(raw))), expected, raw);
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
    assert.deepEqual(readLobbySettings(browser(store(raw), store(raw))), settings(), raw);
  }
  const restored = readLobbySettings(browser(store('{"absent":[" Ada ","ADA",null,42,""],"speed":99}')));
  assert.deepEqual([...restored.absent], ['ada']);
  assert.equal(restored.options.race.speed, 12);
  assert.equal(readLobbySettings(browser(store('{"speed":-5}'))).options.race.speed, 1);
});

test('clearing attendance persists and unavailable storage does not throw', () => {
  const b = browser(store('{"absent":["ada"]}'), store('{"mode":"race","options":{"race":{"speed":8}}}'));
  writeLobbySettings(settings({ speed: 8 }), b);
  assert.equal(readLobbySettings(b).absent.size, 0);
  const blocked = () => { throw new Error('Storage disabled'); };
  assert.deepEqual(readLobbySettings({ session: blocked, local: blocked }), settings());
  assert.equal(writeLobbySettings(settings({ mode: 'rumble', speed: 8 }), { session: blocked, local: blocked }), false);
  // A storage that throws only on writing (quota full, Safari private mode) also reports failure.
  const readOnly = () => ({ getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); } });
  assert.equal(writeLobbySettings(settings(), { session: readOnly, local: readOnly }), false);
  assert.deepEqual(readLobbySettings({ session: readOnly, local: readOnly }), settings());
  // With only the browser's storage blocked, attendance is still kept for the tab, and the failure is reported.
  const tab = store();
  assert.equal(writeLobbySettings(settings({ absent: ['ada'], mode: 'rumble' }), { session: () => tab, local: blocked }), false);
  assert.deepEqual(readLobbySettings({ session: () => tab, local: blocked }), settings({ absent: ['ada'] }));
});
