import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { parseNames, parseWinners, addWinner, createStore, MAX_NAMES } from '../lib/store.js';
import { buildRoster, selectRacers, nameKey } from '../public/js/eligibility.js';

async function tempDir(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'derby-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

test('parseNames accepts an array or { names }', () => {
  assert.deepEqual(parseNames(['Ada', 'Grace']).names, ['Ada', 'Grace']);
  assert.deepEqual(parseNames({ names: ['Ada', 'Grace'] }).names, ['Ada', 'Grace']);
  assert.throws(() => parseNames({ people: [] }), /names\.json/);
});

test('parseNames trims, drops blanks and duplicates, and warns', () => {
  const { names, warnings } = parseNames(['  Ada  ', 'ada', '', 42, 'Grace   Hopper']);
  assert.deepEqual(names, ['Ada', 'Grace Hopper']);
  assert.equal(warnings.length, 2);
});

test('parseNames caps the roster at 30', () => {
  const many = Array.from({ length: 34 }, (_, i) => `Person ${i + 1}`);
  const { names, warnings } = parseNames(many);
  assert.equal(names.length, MAX_NAMES);
  assert.equal(names.at(-1), 'Person 30');
  assert.match(warnings.join(' '), /first 30/);
});

test('parseWinners tolerates strings, objects and junk, keeping the newest three', () => {
  assert.deepEqual(parseWinners(null), []);
  assert.deepEqual(parseWinners({ winners: ['Ada', { name: 'Grace', date: '2026-01-01' }, {}, 7] }), [
    { name: 'Ada', date: null },
    { name: 'Grace', date: '2026-01-01' },
  ]);
  assert.deepEqual(
    parseWinners(['A', 'B', 'C', 'D']).map((w) => w.name),
    ['B', 'C', 'D'],
  );
});

test('addWinner appends, and replaces the oldest once there are three', () => {
  let winners = [];
  winners = addWinner(winners, 'Ada', 'd1');
  winners = addWinner(winners, 'Grace', 'd2');
  winners = addWinner(winners, 'Linus', 'd3');
  assert.deepEqual(winners.map((w) => w.name), ['Ada', 'Grace', 'Linus']);
  winners = addWinner(winners, 'Hedy', 'd4');
  assert.deepEqual(winners.map((w) => w.name), ['Grace', 'Linus', 'Hedy']);
  assert.equal(winners.at(-1).date, 'd4');
});

test('store records winners to winners.json and rotates out the oldest', async (t) => {
  const dir = await tempDir(t);
  await writeFile(path.join(dir, 'names.json'), JSON.stringify({ names: ['Ada', 'Grace', 'Linus', 'Hedy', 'Alan'] }));
  const store = createStore(dir);

  assert.deepEqual(await store.loadWinners(), [], 'missing winners.json means no winners yet');

  for (const name of ['Ada', 'Grace', 'Linus']) await store.recordWinner(name);
  let saved = JSON.parse(await readFile(path.join(dir, 'winners.json'), 'utf8'));
  assert.deepEqual(saved.winners.map((w) => w.name), ['Ada', 'Grace', 'Linus']);
  assert.ok(!Number.isNaN(Date.parse(saved.winners[0].date)), 'stores an ISO date');

  await store.recordWinner('hedy'); // case-insensitive match, stored with roster spelling
  saved = JSON.parse(await readFile(path.join(dir, 'winners.json'), 'utf8'));
  assert.deepEqual(saved.winners.map((w) => w.name), ['Grace', 'Linus', 'Hedy']);

  await assert.rejects(store.recordWinner('Mallory'), /not in names\.json/);
});

test('store handles concurrent saves and a BOM in names.json', async (t) => {
  const dir = await tempDir(t);
  await writeFile(path.join(dir, 'names.json'), '﻿["A","B","C","D"]');
  const store = createStore(dir);
  await Promise.all(['A', 'B', 'C', 'D'].map((n) => store.recordWinner(n)));
  const winners = await store.loadWinners();
  assert.deepEqual(winners.map((w) => w.name), ['B', 'C', 'D']);
});

test('store reports broken JSON clearly', async (t) => {
  const dir = await tempDir(t);
  await writeFile(path.join(dir, 'names.json'), '{ nope');
  await assert.rejects(createStore(dir).loadNames(), /names\.json is not valid JSON/);
});

test('roster marks the last three winners as ineligible', () => {
  const names = ['Ada', 'Grace', 'Linus', 'Hedy', 'Alan'];
  const winners = [
    { name: 'Grace', date: null },
    { name: 'ALAN', date: null },
    { name: 'Someone Who Left', date: null },
  ];
  const roster = buildRoster(names, winners);
  assert.deepEqual(
    roster.map((r) => r.eligible),
    [true, false, true, true, false],
  );
  assert.equal(roster[1].recentWin.racesAgo, 3);
  assert.equal(roster[4].recentWin.racesAgo, 2);
});

test('selectRacers leaves out recent winners and anyone unticked', () => {
  const roster = buildRoster(['Ada', 'Grace', 'Linus', 'Hedy'], [{ name: 'Grace', date: null }]);
  assert.deepEqual(selectRacers(roster), ['Ada', 'Linus', 'Hedy']);
  assert.deepEqual(selectRacers(roster, new Set([nameKey('linus')])), ['Ada', 'Hedy']);
  // Unticking cannot make a recent winner eligible, and ticking is the default.
  assert.deepEqual(selectRacers(roster, new Set([nameKey('Grace')])), ['Ada', 'Linus', 'Hedy']);
});
