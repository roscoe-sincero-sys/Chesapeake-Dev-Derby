import test from 'node:test';
import assert from 'node:assert/strict';
import { MODES, DEFAULT_MODE, findMode, fitsPlayers, optionValue, modeOptions, allModeOptions, playersText, capacityText } from '../public/js/modes.js';
import { WIN_MODES, checkWinner } from '../public/js/data-rules.js';
import { MODE, MODE_COUNT } from '../public/js/page-common.js';
import { MIN_WRESTLERS, MAX_WRESTLERS } from '../public/js/wrestle-sim.js';
import { DEFAULT_SPEED } from '../public/js/race-lengths.js';

test('every mode records a win the server accepts and the history pages can label', () => {
  for (const mode of MODES) {
    assert.ok(WIN_MODES.includes(mode.winMode), `${mode.id}: winMode "${mode.winMode}" is not in WIN_MODES`);
    assert.ok(MODE[mode.winMode], `${mode.id}: no MODE label for "${mode.winMode}"`);
    assert.ok(MODE_COUNT[mode.winMode], `${mode.id}: no MODE_COUNT wording for "${mode.winMode}"`);
  }
  // "Just pick someone" isn't a mode, but its results are labelled the same way.
  for (const winMode of WIN_MODES) {
    assert.ok(MODE[winMode], `no MODE label for "${winMode}"`);
    assert.ok(MODE_COUNT[winMode], `no MODE_COUNT wording for "${winMode}"`);
  }
});

test('the mode registry is complete and its ids are unique', () => {
  assert.equal(new Set(MODES.map((m) => m.id)).size, MODES.length);
  assert.ok(MODES.some((m) => m.id === DEFAULT_MODE));
  for (const mode of MODES) {
    for (const key of ['icon', 'name', 'verb', 'tagline', 'guide']) assert.equal(typeof mode[key], 'string', `${mode.id}.${key}`);
    assert.equal(typeof mode.start, 'function', `${mode.id}.start`);
    assert.equal(typeof mode.ready(5), 'string', `${mode.id}.ready`);
    assert.ok(mode.players.min >= 2 && mode.players.max >= mode.players.min, `${mode.id}.players`);
    assert.equal(new Set(mode.options.map((o) => o.id)).size, mode.options.length, `${mode.id} option ids`);
    for (const option of mode.options) {
      assert.ok(['range', 'segmented', 'link'].includes(option.type), `${mode.id}.${option.id} type`);
      if (option.type === 'link') continue;
      // The default must be one of the values offered.
      const offered = (option.steps ?? option.choices).map((c) => c.value);
      assert.ok(offered.includes(option.default), `${mode.id}.${option.id} default`);
    }
  }
});

test('race and rumble keep their player ranges and defaults', () => {
  const race = findMode('race');
  const rumble = findMode('rumble');
  assert.equal(race.winMode, 'race');
  assert.equal(rumble.winMode, 'wrestle');
  assert.deepEqual(rumble.players, { min: MIN_WRESTLERS, max: MAX_WRESTLERS });
  assert.deepEqual([0, 1, 2, 30].map((n) => fitsPlayers(race, n)), [false, false, true, true]);
  assert.deepEqual([1, 2, 12, 13].map((n) => fitsPlayers(rumble, n)), [false, true, true, false]);
  const dm = findMode('deathmatch');
  assert.equal(dm.winMode, 'deathmatch');
  assert.deepEqual([1, 2, 16, 30, 31].map((n) => fitsPlayers(dm, n)), [false, true, true, true, false]);
  const claw = findMode('claw');
  assert.equal(claw.winMode, 'claw');
  assert.deepEqual([1, 2, 16, 30, 31].map((n) => fitsPlayers(claw, n)), [false, true, true, true, false]);
  const plinko = findMode('plinko');
  assert.equal(plinko.winMode, 'plinko');
  assert.deepEqual([1, 2, 16, 30, 31].map((n) => fitsPlayers(plinko, n)), [false, true, true, true, false]);
  const freeze = findMode('freeze');
  assert.equal(freeze.winMode, 'freeze');
  assert.deepEqual([1, 2, 16, 30, 31].map((n) => fitsPlayers(freeze, n)), [false, true, true, true, false]);
  assert.deepEqual(allModeOptions(), { race: { speed: DEFAULT_SPEED }, rumble: { models: 'classic' }, deathmatch: {}, claw: { duration: 15 }, plinko: { duration: 30 }, freeze: { duration: 30 } });
});

test('unknown modes fall back to the default, and option values are checked', () => {
  for (const id of [undefined, null, '', 'arena', 42, {}]) assert.equal(findMode(id).id, DEFAULT_MODE);
  const rumble = findMode('rumble');
  const models = rumble.options.find((o) => o.id === 'models');
  assert.equal(optionValue(models, 'hd'), 'hd');
  assert.equal(optionValue(models, 'HD'), 'classic');
  // Links hold no value; unknown option ids are dropped.
  assert.deepEqual(modeOptions(rumble, { models: 'hd', preview: 'x', extra: 1 }), { models: 'hd' });
  assert.deepEqual(modeOptions(rumble, 'not an object'), { models: 'classic' });
  // The race speed snaps to the nearest offered length.
  assert.deepEqual(modeOptions(findMode('race'), { speed: 3 }), { speed: 4 });
  assert.deepEqual(modeOptions(findMode('race'), { speed: 'fast' }), { speed: DEFAULT_SPEED });
});

test('the server error for an unknown mode lists every accepted mode', () => {
  assert.throws(() => checkWinner(['Ada'], 'Ada', 'arena'), (err) => {
    assert.equal(err.statusCode, 400);
    for (const winMode of WIN_MODES) assert.ok(err.message.includes(`"${winMode}"`), err.message);
    return true;
  });
  assert.equal(checkWinner(['Ada'], 'ada', 'wrestle'), 'Ada');
});

test('cards and the readiness line state each mode’s player limits as text', () => {
  const race = findMode('race');
  const rumble = findMode('rumble');
  assert.equal(playersText(race), '2+ players');
  assert.equal(playersText(rumble), `${MIN_WRESTLERS}–${MAX_WRESTLERS} players`);
  assert.equal(capacityText(race, 5), '');
  assert.equal(capacityText(race, 1), 'Derby Race needs at least 2 players. 1 is checked.');
  assert.equal(capacityText(rumble, 0), 'Let’s Rumble needs at least 2 players. 0 are checked.');
  assert.equal(capacityText(rumble, 12), '');
  assert.equal(capacityText(rumble, 14), 'Let’s Rumble supports 2–12 players. 14 are checked — uncheck 2.');
});

test('every range step has a read-out, and every mode has a How to play template', async () => {
  const { readFile } = await import('node:fs/promises');
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  for (const mode of MODES) {
    assert.match(html, new RegExp(`<template id="guide-${mode.guide}">`), `${mode.id} How to play`);
    for (const option of mode.options.filter((o) => o.type === 'range')) {
      for (const step of option.steps) assert.ok(step.label && step.text, `${mode.id}.${option.id} step ${step.value}`);
    }
  }
});
