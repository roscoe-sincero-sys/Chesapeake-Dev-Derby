// The browser-only GitHub Pages demo: its in-browser store, and the demo build.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createDemoApi, DEMO_NAMES } from '../public/js/demo-api.js';
import { DEMO } from '../public/js/config.js';
import { crowdSigns } from '../public/js/wrestle-sim.js';
import { SIGN_VARIANTS } from '../public/js/sign-variants.js';
import { mulberry32 } from '../public/js/sim.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}
const json = (method, body) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const call = async (api, url, options) => {
  const res = await api.fetch(url, options);
  return { status: res.status, body: res.status === 204 ? null : await res.json() };
};

test('the repository build is the local app; only the demo build switches demo mode on', () => {
  assert.equal(DEMO, false);
});

test('the demo starts with characters from Maharadia Lawana, and reports its version', async () => {
  const api = createDemoApi({ storage: memoryStorage(), version: '1.2.3' });
  assert.deepEqual((await call(api, 'api/version')).body, { version: '1.2.3' });
  assert.deepEqual((await call(api, '/api/state')).body, { names: DEMO_NAMES, winners: [], warnings: [] });
  assert.deepEqual(DEMO_NAMES, ['Radia Mangandiri', 'Radia Mangawarna', 'Potre Malaila Ganding', 'Laksamana', 'Maharadia Lawana', 'Kabayan']);
  assert.equal((await call(api, '/api/session')).status, 204, 'no launcher to keep alive');
  assert.equal((await call(api, '/api/nope')).status, 404);
});

test('the demo team list follows the same rules as the server', async () => {
  const api = createDemoApi({ storage: memoryStorage() });
  const saved = await call(api, '/api/names', json('PUT', { names: ['Kabayan', 'Organizer', 'kabayan', 'Laksamana', '  '] }));
  assert.equal(saved.status, 200);
  assert.deepEqual(saved.body.names, ['Kabayan', 'Laksamana']);
  assert.match(saved.body.warnings.join(' '), /calendar label/);
  assert.match(saved.body.warnings.join(' '), /duplicate/);
  const tooMany = await call(api, '/api/names', json('PUT', { names: Array.from({ length: 31 }, (_, i) => `P${i}`) }));
  assert.equal(tooMany.status, 400);
  assert.equal((await call(api, '/api/names', { method: 'PUT', body: '{nope' })).status, 400);
  assert.deepEqual((await call(api, '/api/state')).body.names, ['Kabayan', 'Laksamana'], 'bad saves change nothing');
});

test('demo winners: last three, full history newest first with race/skip/wrestle, reset keeps history', async () => {
  let clock = 0;
  const api = createDemoApi({ storage: memoryStorage(), now: () => new Date(Date.UTC(2026, 10, 15, 12, clock++)).toISOString() });
  for (const [name, mode] of [['Kabayan', 'race'], ['Laksamana', 'skip'], ['Radia Mangandiri', 'wrestle'], ['Maharadia Lawana', undefined]]) {
    assert.equal((await call(api, '/api/winners', json('POST', { name, mode }))).status, 200);
  }
  const state = (await call(api, '/api/state')).body;
  assert.deepEqual(state.winners.map((w) => w.name), ['Laksamana', 'Radia Mangandiri', 'Maharadia Lawana']);
  const history = (await call(api, '/api/history')).body.history;
  assert.deepEqual(history.map((h) => `${h.name}:${h.mode}`), ['Maharadia Lawana:race', 'Radia Mangandiri:wrestle', 'Laksamana:skip', 'Kabayan:race']);
  assert.equal((await call(api, '/api/winners', json('POST', { name: 'Nobody' }))).status, 400);
  assert.equal((await call(api, '/api/winners', json('POST', { name: 'Kabayan', mode: 'coin' }))).status, 400);
  assert.deepEqual((await call(api, '/api/winners', json('DELETE', {}))).body, { winners: [] });
  assert.equal((await call(api, '/api/history')).body.history.length, 4, 'reset keeps the history');
});

test('demo data survives a reload, and broken saved data starts again from the sample team', async () => {
  const storage = memoryStorage();
  const first = createDemoApi({ storage });
  await call(first, '/api/names', json('PUT', { names: ['Kabayan', 'Laksamana'] }));
  await call(first, '/api/winners', json('POST', { name: 'Kabayan', mode: 'race' }));
  const state = (await call(createDemoApi({ storage }), '/api/state')).body;
  assert.deepEqual(state.names, ['Kabayan', 'Laksamana']);
  assert.deepEqual(state.winners.map((w) => w.name), ['Kabayan']);
  storage.setItem('derby-demo-v1', '{not json');
  assert.deepEqual((await call(createDemoApi({ storage }), '/api/state')).body.names, DEMO_NAMES);
});

test('with no sign variants, the crowd shows the regular signs whatever the names (as in the demo)', () => {
  const triggers = Object.values(SIGN_VARIANTS).map((v) => v.match);
  const text = crowdSigns(triggers, mulberry32(5), {}).map((s) => s.join(' / '));
  assert.equal(text.length, 15);
  assert.ok(text.includes('WEIGHT CLASS / 12–15 CHARS / ONLY!'));
  assert.ok(text.includes("LET'S ROLL BACK THE CLOCK!"));
  assert.ok(text.some((s) => /^I blame \/ .+ \/ for not being clear\.$/.test(s)));
  assert.ok(text.some((s) => s.endsWith(' / clicks dead buttons / as a hobby.')));
});

test('pages use relative links and import map, so they work under a sub-path', async () => {
  for (const page of ['index.html', 'roster.html', 'history.html']) {
    const html = await readFile(path.join(ROOT, 'public', page), 'utf8');
    assert.doesNotMatch(html, /(?:href|src)="\/(?!\/)/, `${page} has a root-absolute link`);
    assert.match(html, /"three": "\.\/vendor\/three\/build\/three\.module\.js"/, `${page} import map`);
  }
});

test('npm run build:demo produces a self-contained demo with demo mode on and no data files', async (t) => {
  const out = await mkdtemp(path.join(os.tmpdir(), 'derby-demo-build-'));
  t.after(() => rm(out, { recursive: true, force: true }));
  const run = spawnSync(process.execPath, ['scripts/build-demo.mjs', out], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const pkg = JSON.parse(await readFile(path.join(ROOT, 'package.json'), 'utf8'));
  const config = await readFile(path.join(out, 'js', 'config.js'), 'utf8');
  assert.match(config, /export const DEMO = true;/);
  assert.ok(config.includes(`DEMO_VERSION = "${pkg.version}"`));
  for (const f of ['index.html', 'roster.html', 'history.html', 'js/main.js', 'js/demo-api.js', 'js/data-rules.js', 'css/style.css', 'vendor/three/build/three.module.js', 'vendor/three/LICENSE', '.nojekyll']) {
    await stat(path.join(out, f));
  }
  const all = await readdir(out, { recursive: true });
  assert.ok(!all.some((f) => /names\.json|winners\.json|history\.json/.test(f)), 'no data files in the demo');
  // No sign variants anywhere in the demo's files.
  const { SIGN_VARIANTS: built } = await import(pathToFileURL(path.join(out, 'js', 'sign-variants.js')));
  assert.deepEqual(built, {});
  // Every variant's trigger and its own lines (not those it shares with the regular sign, like "I blame").
  const regular = await readFile(path.join(ROOT, 'public', 'js', 'wrestle-sim.js'), 'utf8');
  const tells = Object.values(SIGN_VARIANTS).flatMap((v) => [v.match, ...v.lines.filter((l) => !regular.includes(l))]);
  assert.ok(tells.length > Object.keys(SIGN_VARIANTS).length);
  for (const f of all.filter((f) => /\.(js|html|css)$/.test(f) && !f.includes('vendor'))) {
    const text = (await readFile(path.join(out, f), 'utf8')).toLowerCase();
    for (const tell of tells) assert.ok(!text.includes(tell.toLowerCase()), `${f} contains "${tell}"`);
  }
  // The repository's own config stays the local app.
  assert.match(await readFile(path.join(ROOT, 'public', 'js', 'config.js'), 'utf8'), /export const DEMO = false;/);
});

test('Exit in the demo answers without losing anything', async () => {
  const storage = memoryStorage();
  const api = createDemoApi({ storage });
  await call(api, '/api/winners', json('POST', { name: 'Kabayan' }));
  assert.deepEqual((await call(api, 'api/exit', json('POST', {}))).body, { stopping: true });
  assert.deepEqual((await call(createDemoApi({ storage }), '/api/state')).body.winners.map((w) => w.name), ['Kabayan']);
});

test('the demo build stamps every page, script, style and Three.js link, so a deploy never mixes with cached files', async (t) => {
  const out = await mkdtemp(path.join(os.tmpdir(), 'derby-demo-stamp-'));
  t.after(() => rm(out, { recursive: true, force: true }));
  const build = () => spawnSync(process.execPath, ['scripts/build-demo.mjs', out], { cwd: ROOT, encoding: 'utf8' });
  const first = build();
  assert.equal(first.status, 0, first.stderr);
  const stamp = first.stdout.match(/build ([0-9a-f]{10})/)[1];
  assert.equal(build().stdout.match(/build ([0-9a-f]{10})/)[1], stamp, 'the same sources give the same stamp');

  for (const page of ['index.html', 'roster.html', 'history.html']) {
    const html = await readFile(path.join(out, page), 'utf8');
    const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]).filter((u) => !/^(?:data:|https?:|#)/.test(u));
    assert.ok(refs.length >= 3, page);
    for (const ref of refs) assert.ok(ref.endsWith(`?v=${stamp}`), `${page}: ${ref}`);
    assert.ok(html.includes(`three.module.js?v=${stamp}"`), `${page} import map`);
  }
  for (const f of (await readdir(path.join(out, 'js'))).filter((f) => f.endsWith('.js'))) {
    const js = await readFile(path.join(out, 'js', f), 'utf8');
    for (const [, url] of js.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)['"](\.[^'"]*)['"]/g)) {
      assert.ok(url.endsWith(`?v=${stamp}`), `js/${f}: ${url}`);
    }
  }
});
