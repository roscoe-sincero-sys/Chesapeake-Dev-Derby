import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import http from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import { createServer } from '../server.js';
import { openBrowserUnlessConnected } from '../lib/browser-session.js';

async function launch(t, exitOnClose = true) {
  const server = createServer({ exitOnClose, shutdownDelay: 200 });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const streams = [];
  t.after(async () => {
    for (const stream of streams) stream.destroy();
    if (server.listening) await new Promise((resolve) => {
      server.close(resolve);
      server.closeIdleConnections?.();
    });
  });
  async function tab() {
    const response = await new Promise((resolve, reject) => {
      http.get(`${base}/api/session`, { agent: false }, resolve).on('error', reject);
    });
    assert.equal(response.statusCode, 200);
    assert.match(response.headers['content-type'], /text\/event-stream/);
    streams.push(response);
    assert.match((await once(response, 'data'))[0].toString(), /connected/);
    return async () => {
      const closed = once(response, 'close');
      response.destroy();
      await closed;
    };
  }
  return { server, base, tab };
}

test('normal server does not enable browser-close shutdown', async (t) => {
  const { base, server } = await launch(t, false);
  assert.equal((await fetch(`${base}/api/session`)).status, 204);
  await delay(300);
  assert.equal(server.listening, true);
});

test('launcher waits for a tab, then stops after the last tab closes', { timeout: 10000 }, async (t) => {
  const { server, tab } = await launch(t);
  await delay(300);
  assert.equal(server.listening, true, 'must not stop before the browser opens');
  const closeTab = await tab();
  const closed = once(server, 'close');
  await closeTab();
  await closed;
  assert.equal(server.listening, false);
});

test('other tabs and reloads keep the launcher server alive', { timeout: 10000 }, async (t) => {
  const { server, tab } = await launch(t);
  const closeFirst = await tab();
  const closeSecond = await tab();
  await closeFirst();
  await delay(300);
  assert.equal(server.listening, true, 'another tab is still open');
  await closeSecond();
  const closeReplacement = await tab();
  await delay(300);
  assert.equal(server.listening, true, 'navigation/reload canceled shutdown');
  const closed = once(server, 'close');
  await closeReplacement();
  await closed;
  assert.equal(server.listening, false);
});


test('launcher opens the browser when no existing tab reconnects', async (t) => {
  const { server } = await launch(t);
  let opened = 0;
  assert.equal(await openBrowserUnlessConnected(server, () => opened++, 100), true);
  assert.equal(opened, 1);
});

test('a reconnecting tab suppresses opening another browser tab', async (t) => {
  const { server, tab } = await launch(t);
  let opened = 0;
  const pending = openBrowserUnlessConnected(server, () => opened++, 500);
  await tab();
  assert.equal(await pending, false);
  await delay(600);
  assert.equal(opened, 0);
});

test('stopping the server cancels a pending browser launch', async (t) => {
  const { server } = await launch(t);
  let opened = 0;
  const pending = openBrowserUnlessConnected(server, () => opened++, 500);
  await new Promise((resolve) => server.close(resolve));
  assert.equal(await pending, false);
  assert.equal(opened, 0);
});
