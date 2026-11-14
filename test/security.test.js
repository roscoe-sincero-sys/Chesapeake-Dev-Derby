import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawnSync } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import path from 'node:path';
import os from 'node:os';
import { createServer } from '../server.js';
import { openBrowserUnlessConnected } from '../lib/browser-session.js';

async function launch(t, options = {}) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'derby-security-test-'));
  await writeFile(path.join(dir, 'names.json'), '{"names":["Ada","Grace"]}');
  await writeFile(path.join(dir, 'winners.json'), '{"winners":[]}');
  const server = createServer({ dataDir: dir, ...options });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
    await rm(dir, { recursive: true, force: true });
  });
  return { server, dir, base: `http://127.0.0.1:${server.address().port}` };
}

function request(base, route, { method = 'GET', headers = {}, body, omitHost = false } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(base + route, { method, headers, setHost: !omitHost, agent: false }, (res) => {
      let text = '';
      res.on('data', (chunk) => { text += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text }));
    });
    req.on('error', reject);
    req.end(body);
  });
}

async function snapshot(dir) {
  return Promise.all(['names.json', 'winners.json'].map((f) => readFile(path.join(dir, f), 'utf8')));
}

test('cross-origin and origin-less mutations cannot change stored data', async (t) => {
  const { base, dir } = await launch(t);
  const before = await snapshot(dir);
  for (const [route, method, body] of [
    ['/api/winners', 'POST', '{"name":"Ada"}'],
    ['/api/winners', 'DELETE', '{}'],
    ['/api/names', 'PUT', '{"names":["Injected"]}'],
  ]) {
    for (const extra of [
      {}, { Origin: 'null' }, { Origin: 'http://untrusted.example' },
      { Origin: base + '.untrusted.example' },
      { Origin: base, 'Sec-Fetch-Site': 'cross-site' },
      { Origin: base, 'Sec-Fetch-Site': 'same-site' },
      { Origin: base, 'Sec-Fetch-Site': 'none' },
      { 'Sec-Fetch-Site': 'cross-site' },
      { Origin: 'null', 'Sec-Fetch-Site': 'same-origin' },
    ]) {
      const result = await request(base, route, { method, body,
        headers: { 'Content-Type': 'application/json', ...extra } });
      assert.equal(result.status, 403, JSON.stringify(extra));
      assert.equal(result.headers['access-control-allow-origin'], undefined);
      assert.deepEqual(await snapshot(dir), before);
    }
  }
});

test('JSON media type is mandatory even for same-origin writes', async (t) => {
  const { base, dir } = await launch(t);
  const before = await snapshot(dir);
  for (const [route, method, body] of [
    ['/api/winners', 'POST', '{"name":"Ada"}'], ['/api/winners', 'DELETE', '{}'], ['/api/names', 'PUT', '{"names":[]}'],
  ]) {
    for (const type of [undefined, 'text/plain', 'application/x-www-form-urlencoded', 'multipart/form-data', 'application/json.evil', 'application/json, text/plain']) {
      const headers = { Origin: base };
      if (type) headers['Content-Type'] = type;
      assert.equal((await request(base, route, { method, body, headers })).status, 415);
      assert.deepEqual(await snapshot(dir), before);
    }
  }
});

test('same-origin browser metadata and explicit API Origin permit valid writes', async (t) => {
  const { base } = await launch(t);
  assert.equal((await request(base, '/api/names', { method: 'PUT', body: '{"names":["Ada","Grace"]}',
    headers: { 'Sec-Fetch-Site': 'same-origin', 'Content-Type': 'application/json; charset=utf-8' } })).status, 200);
  assert.equal((await request(base, '/api/winners', { method: 'POST', body: '{"name":"Ada"}',
    headers: { Origin: base, 'Content-Type': 'application/json' } })).status, 200);
});

test('untrusted session requests cannot suppress browser opening or schedule shutdown', async (t) => {
  const { base, server, dir } = await launch(t, { exitOnClose: true, shutdownDelay: 50 });
  const before = await snapshot(dir);
  let connected = 0;
  let opened = 0;
  server.on('browser-connected', () => connected++);
  const decision = openBrowserUnlessConnected(server, () => opened++, 150);
  for (const headers of [{}, { Origin: 'null' }, { Origin: 'http://untrusted.example' },
    { 'Sec-Fetch-Site': 'cross-site' }, { Origin: base, 'Sec-Fetch-Site': 'same-site' }]) {
    assert.equal((await request(base, '/api/session', { headers })).status, 403);
  }
  assert.equal(await decision, true);
  await delay(100);
  assert.equal(opened, 1);
  assert.equal(connected, 0);
  assert.equal(server.listening, true);
  assert.deepEqual(await snapshot(dir), before);
});

test('untrusted Host headers are rejected before static, state, write, or session routes', async (t) => {
  const { base, server, dir } = await launch(t, { exitOnClose: true });
  const before = await snapshot(dir);
  let connected = 0;
  server.on('browser-connected', () => connected++);
  const port = server.address().port;
  for (const host of [`untrusted.example:${port}`, `localhost.untrusted.example:${port}`,
    `127.0.0.1.untrusted.example:${port}`, `localhost:${port + 1}`, 'localhost:',
    `localhost@untrusted.example:${port}`, `127.1:${port}`, `2130706433:${port}`,
    `localhost:${port}/path`, 'localhost', '[::1]:bad']) {
    for (const [route, method, body] of [['/', 'GET'], ['/api/state', 'GET'], ['/api/session', 'GET'],
      ['/api/names', 'PUT', '{"names":[]}'], ['/api/winners', 'POST', '{"name":"Ada"}']]) {
      const result = await request(base, route, { method, body, headers: {
        Host: host, Origin: `http://${host}`, 'Content-Type': 'application/json',
        'X-Forwarded-Host': `localhost:${port}`, 'X-Forwarded-For': '127.0.0.1',
      } });
      assert.equal(result.status, 421, `${host} ${route}`);
      assert.doesNotMatch(result.text, /"names"|"winners"|<!doctype/i);
    }
  }
  const noHost = await request(base, '/api/state', { omitHost: true });
  assert.ok(noHost.status >= 400 && noHost.status < 500);
  assert.equal(connected, 0);
  assert.deepEqual(await snapshot(dir), before);
});

test('approved loopback hosts use the bound port and preserve origin separation', async (t) => {
  const { base, server } = await launch(t);
  const port = server.address().port;
  for (const host of [`localhost:${port}`, `LOCALHOST:${port}`, `127.0.0.1:${port}`, `[::1]:${port}`]) {
    assert.equal((await request(base, '/api/state', { headers: { Host: host } })).status, 200);
  }
  assert.equal((await request(base, '/api/winners', { method: 'POST', body: '{"name":"Ada"}',
    headers: { Host: `localhost:${port}`, Origin: base, 'Content-Type': 'application/json' } })).status, 403);
});

test('HTML, HEAD, and error responses prohibit framing', async (t) => {
  const { base } = await launch(t);
  for (const [route, method] of [['/', 'GET'], ['/roster.html', 'GET'], ['/roster.html', 'HEAD'],
    ['/missing.html', 'GET'], ['/api/session', 'GET']]) {
    const result = await request(base, route, { method });
    assert.equal(result.headers['content-security-policy'], "frame-ancestors 'none'");
    assert.equal(result.headers['x-frame-options'], 'DENY');
  }
});

test('the CLI refuses non-loopback listen hosts', () => {
  const result = spawnSync(process.execPath, ['server.js'], {
    env: { ...process.env, HOST: '0.0.0.0' }, encoding: 'utf8', timeout: 3000, windowsHide: true,
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /local access only/);
});

test('IPv6 loopback works when available', async (t) => {
  const server = createServer();
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '::1', resolve);
    });
  } catch (err) {
    if (['EAFNOSUPPORT', 'EADDRNOTAVAIL'].includes(err.code)) return t.skip('IPv6 loopback unavailable');
    throw err;
  }
  t.after(() => new Promise((resolve) => server.close(resolve)));
  assert.equal((await request(`http://[::1]:${server.address().port}`, '/')).status, 200);
});
