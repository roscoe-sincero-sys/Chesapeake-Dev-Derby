// Shared by the browser tests: headless Chrome over the DevTools protocol, and the app on a temporary
// data folder. The tests are skipped when there's no Chrome (or no built-in WebSocket, before Node 22),
// unless DERBY_BROWSER_TESTS=required (as in CI's browser job), when they fail instead.
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createServer } from '../server.js';

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];
  for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    try {
      candidates.push(execFileSync('which', [name], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim());
    } catch { /* not installed */ }
  }
  return candidates.find((p) => p && existsSync(p));
}

const chrome = findChrome();
const missing = !chrome ? 'no Chrome found (set CHROME_PATH)' : typeof WebSocket === 'undefined' ? 'needs Node 22+ (WebSocket)' : false;
// Where these must run (CI's browser job), a missing Chrome or old Node fails them rather than skipping.
const required = process.env.DERBY_BROWSER_TESTS === 'required';
export const skip = required ? false : missing;

/** Starts headless Chrome and returns a DevTools session on its page: `send(method, params)`. */
export async function openBrowser(t, flags = ['--disable-gpu']) {
  if (missing) assert.fail(`browser tests required, but ${missing}`);
  const profile = await mkdtemp(path.join(os.tmpdir(), 'derby-chrome-'));
  // CI's Ubuntu runners don't allow Chrome's sandbox; the page is only ever this test's own server.
  const sandbox = process.env.CI ? ['--no-sandbox'] : [];
  const proc = spawn(chrome, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', ...sandbox, ...flags, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let errors = '';
  proc.stderr.on('data', (d) => { errors = (errors + d).slice(-4000); });
  t.after(async () => {
    proc.kill();
    await new Promise((resolve) => setTimeout(resolve, 300));
    await rm(profile, { recursive: true, force: true }).catch(() => {});
  });
  let port;
  // A cold CI runner can take a while to start Chrome the first time.
  for (let i = 0; i < 300 && !port && proc.exitCode === null; i++) {
    port = (await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8').catch(() => '')).split('\n')[0];
    if (!port) await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(port, `Chrome started (exit code ${proc.exitCode}): ${errors.trim() || 'no output'}`);
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const ws = new WebSocket(pages.find((p) => p.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  t.after(() => ws.close());
  let id = 0;
  const waiting = new Map();
  ws.onmessage = (msg) => {
    const data = JSON.parse(msg.data);
    if (waiting.has(data.id)) {
      waiting.get(data.id)(data);
      waiting.delete(data.id);
    }
  };
  return (method, params = {}) => new Promise((resolve, reject) => {
    waiting.set(++id, (data) => (data.error ? reject(new Error(data.error.message)) : resolve(data.result)));
    ws.send(JSON.stringify({ id, method, params }));
  });
}

/**
 * Serves the app from a temporary data folder holding `names` (and `winners`, the last three, oldest
 * first); returns its address.
 */
export async function startServer(t, names, winners = null) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'derby-srv-'));
  await writeFile(path.join(dir, 'names.json'), JSON.stringify({ names }));
  if (winners) await writeFile(path.join(dir, 'winners.json'), JSON.stringify({ winners }));
  const server = createServer({ dataDir: dir });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(dir, { recursive: true, force: true });
  });
  return `http://127.0.0.1:${server.address().port}`;
}

/**
 * Page helpers for a DevTools session: `evaluate(expression)` returns the value (awaiting promises), and
 * `until(expression, ms, what)` waits for it to be truthy.
 */
export function pageHelpers(send) {
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };
  const until = async (expression, ms, what) => {
    for (const end = Date.now() + ms; Date.now() < end;) {
      if (await evaluate(expression).catch(() => false)) return;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    assert.fail(`timed out waiting for ${what}`);
  };
  return { evaluate, until };
}
