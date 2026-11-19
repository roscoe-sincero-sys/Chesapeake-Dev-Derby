// Ring-out callouts in a real browser (#107): two long names at once, on a phone held either way, with
// the roster folded or open, the match's Mute and Quit buttons showing, and the phone turning while the
// message is up. Drives headless Chrome over
// the DevTools protocol; skipped when there's no Chrome (or no built-in WebSocket, before Node 22).
import test from 'node:test';
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
const skip = !chrome ? 'no Chrome found (set CHROME_PATH)' : typeof WebSocket === 'undefined' ? 'needs Node 22+ (WebSocket)' : false;

/** Starts headless Chrome and returns a DevTools session on its page: `send(method, params)`. */
async function openBrowser(t) {
  const profile = await mkdtemp(path.join(os.tmpdir(), 'derby-chrome-'));
  const proc = spawn(chrome, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
  t.after(async () => {
    proc.kill();
    await new Promise((resolve) => setTimeout(resolve, 300));
    await rm(profile, { recursive: true, force: true }).catch(() => {});
  });
  let port;
  for (let i = 0; i < 100 && !port; i++) {
    port = (await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8').catch(() => '')).split('\n')[0];
    if (!port) await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(port, 'Chrome started');
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

test('paired ring-out callouts with long names stay on screen, off the roster and the toolbar, through a rotation', { skip, timeout: 60000 }, async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'derby-srv-'));
  await writeFile(path.join(dir, 'names.json'), JSON.stringify({ names: ['Ada', 'Grace'] }));
  const server = createServer({ dataDir: dir });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(dir, { recursive: true, force: true });
  });
  const send = await openBrowser(t);
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };
  const screen = (width, height) => send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: true });

  await screen(390, 844);
  await send('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/` });
  for (let i = 0; i < 100 && (await evaluate('document.readyState').catch(() => '')) !== 'complete'; i++) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  // Twelve wrestlers with 34-character names (the longest a display name can be), and the toolbar as
  // in a match: Mute and Quit.
  await evaluate(`(async () => {
    const { Hud, outText } = await import('/js/hud.js');
    const kind = { label: 'Bhima', blurb: '' };
    const name = (i) => String(i).padStart(2, '0') + ' Alexandria Charlotte Montgomery';
    const quit = document.getElementById('quit');
    quit.textContent = '✕ Quit match';
    quit.hidden = false;
    document.getElementById('toolbar').hidden = false;
    // The page's own HUD listens on the toggle too: leave only this one, so a click toggles once.
    const toggle = document.getElementById('ring-toggle');
    toggle.replaceWith(toggle.cloneNode(true));
    window.testHud = new Hud();
    testHud.beginWrestle(Array.from({ length: 12 }, (_, i) => ({ id: i, name: name(i + 1), color: '#c33', kind })));
    window.showPair = () => testHud.callout(outText([name(5), name(10)]), 60000);
  })()`);
  const check = async (label, { wide = false } = {}) => {
    // Two frames for the resize (and any re-placement) to land.
    await evaluate('new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))');
    const s = await evaluate(`(() => {
      const box = (el) => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }; };
      const c = document.getElementById('countdown');
      const shown = ['ring-roster', 'ring-toggle', 'mute', 'quit'].map((id) => document.getElementById(id)).filter((el) => el.offsetHeight > 0);
      return {
        view: { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight },
        callout: box(c), clipped: c.scrollWidth > c.clientWidth + 1 || c.scrollHeight > c.clientHeight + 1,
        font: parseFloat(getComputedStyle(c).fontSize), shown: shown.map((el) => ({ id: el.id, ...box(el) })), text: c.textContent,
      };
    })()`);
    const c = s.callout;
    assert.match(s.text, /are out!$/, `${label}: the callout is up`);
    assert.ok(c.left >= 0 && c.top >= 0 && c.right <= s.view.width && c.bottom <= s.view.height,
      `${label}: callout ${JSON.stringify(c)} inside the ${s.view.width} x ${s.view.height} screen`);
    assert.ok(!s.clipped, `${label}: none of the text is cut off`);
    assert.ok(s.font >= 14, `${label}: still readable (${s.font}px)`);
    assert.deepEqual(s.shown.filter((r) => r.id === 'mute' || r.id === 'quit').length, 2, `${label}: Mute and Quit are showing`);
    for (const r of s.shown) {
      const apart = c.right <= r.left || c.left >= r.right || c.bottom <= r.top || c.top >= r.bottom;
      assert.ok(apart, `${label}: callout ${JSON.stringify(c)} clear of #${r.id} ${JSON.stringify(r)}`);
    }
    // Where there's room for it, a wide banner, not the names broken up down a narrow strip.
    if (wide) assert.ok(c.right - c.left >= 0.85 * s.view.width, `${label}: ${Math.round(c.right - c.left)} px wide of ${s.view.width}`);
  };
  const toggle = () => evaluate("document.getElementById('ring-toggle').click()");

  await evaluate('showPair()');
  await check('portrait, roster folded', { wide: true });
  await toggle();
  await check('portrait, roster open');
  await screen(844, 390); // turned while the message is up
  await check('turned to landscape, roster open');
  await toggle();
  await check('landscape, roster folded');
  await evaluate('showPair()');
  await check('landscape, new message');
  await toggle();
  await check('landscape, roster opened');
  await screen(390, 844);
  await check('turned back to portrait, roster open');
  await toggle();
  await check('portrait, roster folded again', { wide: true });
  await screen(1280, 800); // a laptop: the whole roster shows
  await check('laptop');
});
