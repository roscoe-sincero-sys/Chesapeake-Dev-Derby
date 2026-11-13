import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createServer } from '../server.js';

async function startServer(t, names = ['Ada', 'Grace', 'Linus', 'Hedy']) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'derby-srv-'));
  await writeFile(path.join(dir, 'names.json'), JSON.stringify({ names }));
  const server = createServer({ dataDir: dir });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(dir, { recursive: true, force: true });
  });
  return { base: `http://127.0.0.1:${server.address().port}`, dir };
}

const post = (base, body) =>
  fetch(`${base}/api/winners`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: typeof body === 'string' ? body : JSON.stringify(body) });

test('GET /api/state returns names and winners', async (t) => {
  const { base } = await startServer(t);
  const res = await fetch(`${base}/api/state`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { names: ['Ada', 'Grace', 'Linus', 'Hedy'], winners: [], warnings: [] });
});

test('POST /api/winners saves the winner and keeps only the last three', async (t) => {
  const { base, dir } = await startServer(t);
  for (const name of ['Ada', 'Grace', 'Linus', 'Hedy']) {
    const res = await post(base, { name });
    assert.equal(res.status, 200);
  }
  const state = await (await fetch(`${base}/api/state`)).json();
  assert.deepEqual(state.winners.map((w) => w.name), ['Grace', 'Linus', 'Hedy']);
  const onDisk = JSON.parse(await readFile(path.join(dir, 'winners.json'), 'utf8'));
  assert.deepEqual(onDisk.winners.map((w) => w.name), ['Grace', 'Linus', 'Hedy']);
});

test('POST /api/winners rejects bad input', async (t) => {
  const { base } = await startServer(t);
  assert.equal((await post(base, {})).status, 400);
  assert.equal((await post(base, 'not json')).status, 400);
  assert.equal((await post(base, { name: 'Mallory' })).status, 400);
  assert.equal((await post(base, { name: 'x'.repeat(20_000) })).status, 413);
});

test('serves the game, Three.js, and blocks path traversal', async (t) => {
  const { base } = await startServer(t);
  const index = await fetch(`${base}/`);
  assert.equal(index.status, 200);
  assert.match(index.headers.get('content-type'), /text\/html/);
  assert.match(await index.text(), /Chesapeake Dev Derby/);

  const three = await fetch(`${base}/vendor/three/build/three.module.js`);
  assert.equal(three.status, 200);
  assert.match(three.headers.get('content-type'), /javascript/);
  await three.arrayBuffer();

  assert.equal((await fetch(`${base}/js/does-not-exist.js`)).status, 404);
  assert.equal((await fetch(`${base}/api/nope`)).status, 404);
  // Encoded "../" must not escape public/ or node_modules/three/ and reach the project's own files.
  for (const sneaky of ['/..%2Fpackage.json', '/..%2Fserver.js', '/vendor/three/..%2F..%2Fpackage.json', '/vendor/three/..%2F..%2Fdata%2Fnames.json', '/%2e%2e/%2e%2e/data/names.json']) {
    const res = await fetch(`${base}${sneaky}`);
    const text = await res.text();
    assert.ok(!text.includes('chesapeake-dev-derby') && !text.includes('createServer') && !text.includes('"names"'), `${sneaky} leaked a project file`);
  }
});

const putNames = (base, body) => fetch(`${base}/api/names`, {
  method: 'PUT', headers: { 'Content-Type': 'application/json', Origin: base },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});

test('roster edits persist, normalize duplicates, and preserve winner history', async (t) => {
  const { base, dir } = await startServer(t);
  await post(base, { name: 'Ada' });
  const before = await readFile(path.join(dir, 'winners.json'), 'utf8');
  const response = await putNames(base, { names: [' Grace  Hopper ', 'grace hopper', '', 'Linus'] });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.deepEqual(result.names, ['Grace Hopper', 'Linus']);
  assert.equal(result.warnings.length, 1);
  assert.deepEqual(JSON.parse(await readFile(path.join(dir, 'names.json'), 'utf8')).names, result.names);
  const state = await (await fetch(`${base}/api/state`)).json();
  assert.deepEqual(state.names, result.names);
  assert.equal(await readFile(path.join(dir, 'winners.json'), 'utf8'), before);
  assert.equal((await post(base, { name: 'Ada' })).status, 400);
  assert.equal((await post(base, { name: 'Linus' })).status, 200);
  assert.equal((await fetch(`${base}/roster.html`)).status, 200);
});

test('invalid roster edits leave the saved roster intact', async (t) => {
  const { base, dir } = await startServer(t);
  const before = await readFile(path.join(dir, 'names.json'), 'utf8');
  for (const body of [null, {}, [], { names: [42] }, { names: ['x'.repeat(41)] },
    { names: Array.from({ length: 31 }, (_, i) => `Racer ${i}`) }, 'not json']) {
    assert.equal((await putNames(base, body)).status, 400);
    assert.equal(await readFile(path.join(dir, 'names.json'), 'utf8'), before);
  }
  assert.equal((await putNames(base, { names: ['x'.repeat(20_000)] })).status, 413);
  assert.equal(await readFile(path.join(dir, 'names.json'), 'utf8'), before);
});

test('roster writes serialize and an empty roster can be saved', async (t) => {
  const { base } = await startServer(t);
  const responses = await Promise.all(['A', 'B', 'C'].map((n) => putNames(base, { names: [n] })));
  for (const response of responses) assert.equal(response.status, 200);
  const state = await (await fetch(`${base}/api/state`)).json();
  assert.equal(state.names.length, 1);
  assert.ok(['A', 'B', 'C'].includes(state.names[0]));
  assert.equal((await putNames(base, { names: [] })).status, 200);
  assert.deepEqual((await (await fetch(`${base}/api/state`)).json()).names, []);
});
