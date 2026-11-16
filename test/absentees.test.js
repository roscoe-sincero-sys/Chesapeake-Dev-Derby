// Issue #88: who was marked absent is logged with each pick, and listed newest first.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createServer } from '../server.js';
import { checkAbsentees, parseHistory } from '../public/js/data-rules.js';
import { buildRoster, selectAbsentees, absenteeRows, nameKey } from '../public/js/eligibility.js';
import { createDemoApi } from '../public/js/demo-api.js';

const NAMES = ['Ada', 'Grace', 'Linus', 'Hedy', 'Alan'];

test('checkAbsentees keeps only people who could have taken part, in team-list order', () => {
  const recent = [{ name: 'Hedy', date: null }];
  assert.deepEqual(checkAbsentees(NAMES, recent, 'Ada', ['alan', 'Grace', 'GRACE', 'Hedy', 'Ada', 'Nobody']), ['Grace', 'Alan']);
  assert.deepEqual(checkAbsentees(NAMES, recent, 'Ada', undefined), [], 'an older page sends nothing');
  assert.deepEqual(checkAbsentees(NAMES, recent, 'Ada', []), []);
  for (const bad of ['Grace', [1], { names: [] }, Array.from({ length: 31 }, () => 'Ada')]) {
    assert.throws(() => checkAbsentees(NAMES, recent, 'Ada', bad), (err) => err.statusCode === 400);
  }
});

test('the lobby reports unticked people as absent, but not recent winners sitting out', () => {
  const roster = buildRoster(NAMES, [{ name: 'Hedy', date: null }]);
  const unticked = new Set(['Grace', 'Hedy'].map(nameKey));
  assert.deepEqual(selectAbsentees(roster, unticked), ['Grace']);
  assert.deepEqual(selectAbsentees(roster, new Set()), []);
});

test('the history keeps absentees per pick; results saved before logging have none', () => {
  const history = parseHistory({ history: [
    { name: 'Ada', date: '2026-01-01T10:00:00Z', mode: 'race' },
    { name: 'Grace', date: '2026-01-02T10:00:00Z', mode: 'skip', absent: [' Linus ', 7, ''] },
    { name: 'Linus', date: '2026-01-03T10:00:00Z', mode: 'wrestle', absent: [] },
  ] });
  assert.equal('absent' in history[0], false);
  assert.deepEqual(history[1].absent, ['Linus']);
  assert.deepEqual(history[2].absent, []);
});

test('absenteeRows lists picks with someone absent, keeping their Winner history numbers', () => {
  const newestFirst = [
    { name: 'Alan', date: 'd5', mode: 'race', absent: ['Grace', 'Hedy'] },
    { name: 'Linus', date: 'd4', mode: 'wrestle', absent: [] },
    { name: 'Hedy', date: 'd3', mode: 'skip', absent: ['Ada'] },
    { name: 'Grace', date: 'd2', mode: 'race' },
    { name: 'Ada', date: 'd1', mode: 'race' },
  ];
  const { rows, logged, absences, unlogged } = absenteeRows(newestFirst);
  assert.deepEqual(rows.map((r) => [r.number, r.name, r.absent.join('+')]), [[5, 'Alan', 'Grace+Hedy'], [3, 'Hedy', 'Ada']]);
  assert.deepEqual({ logged, absences, unlogged }, { logged: 3, absences: 3, unlogged: 2 });
  assert.deepEqual(absenteeRows([]), { rows: [], logged: 0, absences: 0, unlogged: 0 });
});

async function startServer(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'derby-abs-'));
  await writeFile(path.join(dir, 'names.json'), JSON.stringify({ names: NAMES }));
  const server = createServer({ dataDir: dir });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(dir, { recursive: true, force: true });
  });
  return { base: `http://127.0.0.1:${server.address().port}`, dir };
}
const post = (base, body) =>
  fetch(`${base}/api/winners`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify(body) });

test('POST /api/winners logs absentees in history.json and GET /api/history returns them', async (t) => {
  const { base, dir } = await startServer(t);
  assert.equal((await post(base, { name: 'Hedy', mode: 'race' })).status, 200, 'an older page without "absent"');
  assert.equal((await post(base, { name: 'Ada', mode: 'skip', absent: ['Grace', 'hedy', 'Nobody', 'Ada'] })).status, 200);
  assert.equal((await post(base, { name: 'Linus', mode: 'wrestle', absent: 'Grace' })).status, 400);
  const saved = JSON.parse(await readFile(path.join(dir, 'history.json'), 'utf8'));
  assert.deepEqual(saved.history.map((h) => h.absent), [[], ['Grace']], 'Hedy sat out as a recent winner; unknown names and the winner are dropped');
  const { history } = await (await fetch(`${base}/api/history`)).json();
  assert.deepEqual(history.map((h) => [h.name, h.absent]), [['Ada', ['Grace']], ['Hedy', []]]);
  const winners = JSON.parse(await readFile(path.join(dir, 'winners.json'), 'utf8'));
  assert.deepEqual(winners.winners.map((w) => w.name), ['Hedy', 'Ada'], 'the rejected save changed nothing');
});

test('the online demo logs absentees by the same rules', async () => {
  const m = new Map();
  const api = createDemoApi({ storage: { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }, names: NAMES });
  const send = (body) => api.fetch('/api/winners', { method: 'POST', body: JSON.stringify(body) });
  assert.equal((await send({ name: 'Hedy' })).status, 200);
  assert.equal((await send({ name: 'Ada', mode: 'skip', absent: ['Grace', 'Hedy', 'Ada'] })).status, 200);
  assert.equal((await send({ name: 'Linus', absent: [3] })).status, 400);
  const { history } = await (await api.fetch('/api/history')).json();
  assert.deepEqual(history.map((h) => [h.name, h.absent]), [['Ada', ['Grace']], ['Hedy', []]]);
});
