// Ring-out callouts in a real browser (#107): two long names at once, on a phone held either way, with
// the roster folded or open, the match's Mute and Quit buttons showing, and the phone turning while the
// message is up; and in a live HD match, clear of the landings they announce. Drives headless Chrome
// over the DevTools protocol; skipped when there's no Chrome (or no built-in WebSocket, before Node 22),
// unless DERBY_BROWSER_TESTS=required (as in CI's browser job), when they fail instead.
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
const missing = !chrome ? 'no Chrome found (set CHROME_PATH)' : typeof WebSocket === 'undefined' ? 'needs Node 22+ (WebSocket)' : false;
// Where these must run (CI's browser job), a missing Chrome or old Node fails them rather than skipping.
const required = process.env.DERBY_BROWSER_TESTS === 'required';
const skip = required ? false : missing;

/** Starts headless Chrome and returns a DevTools session on its page: `send(method, params)`. */
async function openBrowser(t, flags = ['--disable-gpu']) {
  if (missing) assert.fail(`browser tests required, but ${missing}`);
  const profile = await mkdtemp(path.join(os.tmpdir(), 'derby-chrome-'));
  // CI's Ubuntu runners don't allow Chrome's sandbox; the page is only ever this test's own server.
  const sandbox = process.env.CI ? ['--no-sandbox'] : [];
  const proc = spawn(chrome, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', ...sandbox, ...flags, 'about:blank'], { stdio: 'ignore' });
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

/** Serves the app from a temporary data folder holding `names`; returns its address. */
async function startServer(t, names) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'derby-srv-'));
  await writeFile(path.join(dir, 'names.json'), JSON.stringify({ names }));
  const server = createServer({ dataDir: dir });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(dir, { recursive: true, force: true });
  });
  return `http://127.0.0.1:${server.address().port}`;
}

const LONG_NAMES = Array.from({ length: 12 }, (_, i) => `${String(i + 1).padStart(2, '0')} Alexandria Charlotte Montgomery`);

/**
 * A stepped clock for the page, so the live match plays the same on any machine, GPU or none: once
 * `steppedClock.start()` has run, `performance.now()` stands still between `steppedClock.step(ms)` calls,
 * and each step runs the timers that fall due (setTimeout, setInterval) and then one animation frame.
 * The game and the HUD then see exactly 60 frames a second, however long each takes to draw. (Under
 * software WebGL a real-time run manages about 2 frames a second, so ring-outs a moment apart in the
 * match reach the HUD seconds apart and never share a callout.)
 */
const STEPPED_CLOCK = `(() => {
  const real = {
    now: performance.now.bind(performance), setTimeout: setTimeout.bind(window), clearTimeout: clearTimeout.bind(window),
    setInterval: setInterval.bind(window), raf: requestAnimationFrame.bind(window), caf: cancelAnimationFrame.bind(window),
  };
  const OWN = 1e9; // ids above this are the stepped clock's
  let stepped = false, frozen = false, now = 0, seq = 0;
  const timers = new Map();
  let frames = new Map();
  const clock = () => (frozen ? now : real.now());
  const run = (fn, ...args) => { try { fn(...args); } catch (e) { reportError(e); } };
  const add = (fn, ms, args, every) => {
    const id = OWN + ++seq;
    timers.set(id, { at: clock() + Math.max(0, Number(ms) || 0), every: every ? Math.max(1, Number(ms) || 0) : 0, fn, args, seq });
    return id;
  };
  performance.now = clock;
  window.setTimeout = (fn, ms, ...args) => (stepped ? add(fn, ms, args, false) : real.setTimeout(fn, ms, ...args));
  window.setInterval = (fn, ms, ...args) => (stepped ? add(fn, ms, args, true) : real.setInterval(fn, ms, ...args));
  window.clearTimeout = window.clearInterval = (id) => (id > OWN ? timers.delete(id) : real.clearTimeout(id));
  window.requestAnimationFrame = (fn) => {
    if (!stepped) return real.raf(fn);
    frames.set(OWN + ++seq, fn);
    return OWN + seq;
  };
  window.cancelAnimationFrame = (id) => (id > OWN ? frames.delete(id) : real.caf(id));
  window.steppedClock = {
    /** From now on, time moves only by step(). Resolves once the frame already on its way has run. */
    async start() {
      stepped = true;
      await new Promise((r) => real.raf(() => real.raf(r)));
      now = real.now();
      frozen = true;
    },
    step(ms) {
      const end = now + ms;
      for (;;) {
        let next = null;
        for (const [id, t] of timers) if (t.at <= end && (!next || t.at < next.t.at || (t.at === next.t.at && t.seq < next.t.seq))) next = { id, t };
        if (!next) break;
        now = Math.max(now, next.t.at);
        if (next.t.every) Object.assign(next.t, { at: next.t.at + next.t.every, seq: ++seq });
        else timers.delete(next.id);
        if (typeof next.t.fn === 'function') run(next.t.fn, ...next.t.args);
      }
      now = end;
      const due = frames;
      frames = new Map();
      for (const fn of due.values()) run(fn, now);
    },
    /** Lets the browser breathe (real time): input, network, the DevTools connection. */
    pause: () => new Promise((r) => real.setTimeout(r, 0)),
  };
})()`;

/**
 * Plays the seed-17 HD match in headless Chrome on a `width` x `height` screen, on the stepped clock at
 * 60 frames a second, up to its first paired ring-out, and follows that callout while it's up. Each
 * frame: the callout, the controls, and each body it names, measured from the 3D scene (its mesh
 * projected through the match camera).
 */
async function liveCallout(t, width, height, { mobile = false, openRoster = false } = {}) {
  const base = await startServer(t, LONG_NAMES);
  // The GPU where there is one, only to draw faster: the stepped clock keeps the match the same without.
  const send = await openBrowser(t, ['--autoplay-policy=no-user-gesture-required']);
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
  await send('Page.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: STEPPED_CLOCK });
  await send('Page.navigate', { url: `${base}/?seed=17&test` });
  const until = async (expression, ms, what) => {
    for (const end = Date.now() + ms; Date.now() < end;) {
      if (await evaluate(expression).catch(() => false)) return;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    assert.fail(`timed out waiting for ${what}`);
  };
  await until(`document.getElementById('wrestle-hd')?.getAttribute('aria-disabled') === 'false' && !!window.derbyTest?.game`, 60000, 'the HD match button');
  await evaluate("document.getElementById('wrestle-hd').click()");
  await until('!!window.derbyTest.game.wrestle', 120000, 'the HD match');
  if (openRoster) await evaluate("document.getElementById('ring-toggle').click()");
  // Step through the match to the first callout naming two wrestlers, and follow it every frame while it's up.
  return evaluate(`(async () => {
    const THREE = await import('three');
    const box = (r) => ({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
    const frames = [];
    const seen = [];
    await steppedClock.start();
    for (let step = 1; ; step++) {
      steppedClock.step(1000 / 60);
      if (step % 30 === 0) await steppedClock.pause();
      const c = document.getElementById('countdown');
      const text = c.classList.contains('callout') ? c.textContent : '';
      const match = window.derbyTest.game.wrestle;
      if (text && seen.at(-1) !== text) seen.push(text);
      if (/ are out!$/.test(text)) {
        const view = { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight };
        const bodies = match.wrestlers.filter((w) => text.includes(w.name)).map((w) => {
          const b = new THREE.Box3().setFromObject(w.rig.root, true);
          const r = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
          for (let i = 0; i < 8; i++) {
            const p = new THREE.Vector3(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).project(match.camera);
            const x = ((p.x + 1) / 2) * view.width;
            const y = ((1 - p.y) / 2) * view.height;
            r.left = Math.min(r.left, x); r.right = Math.max(r.right, x); r.top = Math.min(r.top, y); r.bottom = Math.max(r.bottom, y);
          }
          return { name: w.name, out: w.out, ...r };
        });
        const controls = ['ring-roster', 'ring-toggle', 'mute', 'quit'].map((id) => document.getElementById(id))
          .filter((el) => el.offsetHeight > 0).map((el) => ({ id: el.id, ...box(el.getBoundingClientRect()) }));
        frames.push({ t: match.t, view, text, callout: box(c.getBoundingClientRect()), font: parseFloat(getComputedStyle(c).fontSize), bodies, controls });
      } else if (frames.length) {
        return frames;
      }
      if (step > 60 * 120) throw new Error('no paired callout within 120 s of the match: at ' + match.t.toFixed(1) + ' s; callouts ' + JSON.stringify(seen));
    }
  })()`);
}

/** How much of `body` (a screen rectangle, clipped to the view) the callout `c` covers, 0 to 1. */
function covered(c, body, view) {
  const b = { left: Math.max(0, body.left), top: Math.max(0, body.top), right: Math.min(view.width, body.right), bottom: Math.min(view.height, body.bottom) };
  const area = Math.max(0, b.right - b.left) * Math.max(0, b.bottom - b.top);
  const w = Math.max(0, Math.min(c.right, b.right) - Math.max(c.left, b.left));
  const h = Math.max(0, Math.min(c.bottom, b.bottom) - Math.max(c.top, b.top));
  return area ? (w * h) / area : 0;
}

for (const [label, width, height, options] of [
  ['1280 x 800', 1280, 800, {}],
  ['844 x 390, roster open', 844, 390, { mobile: true, openRoster: true }],
]) {
  test(`live seed-17 HD match at ${label}: the paired callout leaves both landings in view and clears the controls`, { skip, timeout: 300000 }, async (t) => {
    const frames = await liveCallout(t, width, height, options);
    // A pair's callout is up for 2.1 s: every one of its frames, at 60 a second.
    assert.ok(frames.length >= 120, `followed the callout for ${frames.length} frames`);
    const first = frames[0];
    const at = (r) => `x ${Math.round(r.left)}–${Math.round(r.right)}, y ${Math.round(r.top)}–${Math.round(r.bottom)}`;
    t.diagnostic(`${first.text} at ${first.t.toFixed(2)} s, ${frames.length} frames: callout ${at(first.callout)}, ${first.font}px; `
      + first.bodies.map((b) => `${b.name.slice(0, 2)} ${at(b)}`).join('; '));
    assert.equal(first.bodies.length, 2, `the callout names two wrestlers: ${first.text}`);
    let worst = { share: 0 };
    for (const f of frames) {
      const c = f.callout;
      assert.ok(c.left >= 0 && c.top >= 0 && c.right <= f.view.width && c.bottom <= f.view.height, `${label} @${f.t.toFixed(2)}s: callout on screen`);
      assert.ok(f.font >= 14, `${label}: readable (${f.font}px)`);
      for (const r of f.controls) {
        const apart = c.right <= r.left || c.left >= r.right || c.bottom <= r.top || c.top >= r.bottom;
        assert.ok(apart, `${label} @${f.t.toFixed(2)}s: callout ${JSON.stringify(c)} clear of #${r.id} ${JSON.stringify(r)}`);
      }
      for (const b of f.bodies) {
        const share = covered(c, b, f.view);
        if (share > worst.share) worst = { share, name: b.name, t: f.t.toFixed(2), c, b };
      }
    }
    // None of either body under the callout at any frame while it's up.
    assert.equal(worst.share, 0, `${label}: the callout covers ${(worst.share * 100).toFixed(0)}% of ${worst.name} at ${worst.t}s (${JSON.stringify(worst)})`);
  });
}
