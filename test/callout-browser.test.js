// Ring-out callouts in a real browser (#107): two long names at once, on a phone held either way, with
// the roster folded or open, the match's Mute and Quit buttons showing, and the phone turning while the
// message is up; and in a live HD match, clear of the landings they announce. Drives headless Chrome
// over the DevTools protocol; skipped when there's no Chrome (or no built-in WebSocket, before Node 22),
// unless DERBY_BROWSER_TESTS=required (as in CI's browser job), when they fail instead.
import test from 'node:test';
import assert from 'node:assert/strict';
import { skip, openBrowser, startServer } from './browser.js';

// It starts Chrome first on a cold CI runner, which can take most of a minute on its own.
test('paired ring-out callouts with long names stay on screen, off the roster and the toolbar, through a rotation', { skip, timeout: 120000 }, async (t) => {
  const base = await startServer(t, ['Ada', 'Grace']);
  const send = await openBrowser(t);
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };
  const screen = (width, height) => send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: true });

  await screen(390, 844);
  await send('Page.navigate', { url: `${base}/` });
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
    // The roster's button, where it shows, clear of Mute and Quit too (so a tap on it reaches it).
    const button = s.shown.find((r) => r.id === 'ring-toggle');
    for (const r of s.shown.filter((x) => x.id === 'mute' || x.id === 'quit')) {
      if (!button) break;
      const apart = button.right <= r.left || button.left >= r.right || button.bottom <= r.top || button.top >= r.bottom;
      assert.ok(apart, `${label}: the roster button ${JSON.stringify(button)} clear of #${r.id} ${JSON.stringify(r)}`);
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
  await screen(320, 568); // a small phone: no room for the roster's button beside Mute and Quit
  await check('320 px phone, roster folded');
  await toggle();
  await check('320 px phone, roster open');
});

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
 * Opens the app in headless Chrome on a `width` x `height` screen with the twelve long names, on the
 * stepped clock (still running in real time until `steppedClock.start()`), and starts the seed-17 HD
 * match. Returns the DevTools session and `evaluate(expression)`.
 */
async function startMatch(t, width, height, { mobile = false } = {}) {
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
  await send('Page.navigate', { url: `${base}/?seed=17&test&mode=rumble` });
  const until = async (expression, ms, what) => {
    for (const end = Date.now() + ms; Date.now() < end;) {
      if (await evaluate(expression).catch(() => false)) return;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    assert.fail(`timed out waiting for ${what}`);
  };
  // Rumble is selected by the URL; choose HD models, then Start.
  await until(`document.getElementById('start')?.disabled === false && !!window.derbyTest?.game`, 60000, 'the Start rumble button');
  await evaluate(`document.querySelector('[data-option="rumble-models"] [data-value="hd"]').click()`);
  assert.equal(await evaluate(`document.getElementById('start').textContent`), '▶ Start rumble');
  await evaluate("document.getElementById('start').click()");
  await until('!!window.derbyTest.game.wrestle', 120000, 'the HD match');
  return { send, evaluate };
}

/**
 * Plays the seed-17 HD match in headless Chrome on a `width` x `height` screen, on the stepped clock at
 * 60 frames a second, up to its first paired ring-out, and follows that callout while it's up. Each
 * frame: the callout, the controls, and each body it names, measured from the 3D scene (its mesh
 * projected through the match camera).
 */
async function liveCallout(t, width, height, { mobile = false, openRoster = false } = {}) {
  const { evaluate } = await startMatch(t, width, height, { mobile });
  if (openRoster) await evaluate("document.getElementById('ring-toggle').click()");
  // Step through the match to the first callout naming two wrestlers, and follow it every frame while it's up.
  return evaluate(`(async () => {
    const THREE = await import('three');
    const box = (r) => ({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
    const frames = [];
    const seen = [];
    await steppedClock.start();
    const began = Date.now();
    // Software WebGL draws slowly (CI has no GPU), and nothing here looks at pixels: until a callout is
    // up, draw one frame in ten and only bring the scene's positions up to date for the rest, as a draw
    // would; every frame is drawn while a callout is up.
    const renderer = window.derbyTest.game.renderer;
    const draw = renderer.render.bind(renderer);
    let drawing = true;
    renderer.render = (scene, camera) => {
      if (drawing) return draw(scene, camera);
      scene.updateMatrixWorld();
      if (camera.parent === null) camera.updateMatrixWorld();
    };
    for (let step = 1; ; step++) {
      drawing = step % 10 === 0 || document.getElementById('countdown').classList.contains('callout');
      steppedClock.step(1000 / 60);
      if (step % 300 === 0) await steppedClock.pause();
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
        return { frames, msPerStep: (Date.now() - began) / step, steps: step };
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
  test(`live seed-17 HD match at ${label}: the paired callout leaves both landings in view and clears the controls`, { skip, timeout: 600000 }, async (t) => {
    const { frames, msPerStep, steps } = await liveCallout(t, width, height, options);
    t.diagnostic(`${steps} steps, ${msPerStep.toFixed(1)} ms each`);
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

test('live HD match on a 320 x 568 phone: the roster button clears Mute and Quit, and a tap opens and closes the list', { skip, timeout: 300000 }, async (t) => {
  const { send, evaluate } = await startMatch(t, 320, 568, { mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  const state = () => evaluate(`(() => {
    const box = (el) => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }; };
    const toggle = document.getElementById('ring-toggle');
    const roster = document.getElementById('ring-roster');
    return {
      toggle: box(toggle), label: toggle.textContent, expanded: toggle.getAttribute('aria-expanded'),
      rosterShown: roster.offsetHeight > 0, roster: box(roster),
      controls: ['mute', 'quit'].map((id) => document.getElementById(id)).filter((el) => el.offsetHeight > 0).map((el) => ({ id: el.id, ...box(el) })),
    };
  })()`);
  const tap = async (x, y) => {
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await evaluate('new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))');
  };
  const s0 = await state();
  assert.match(s0.label, /in the ring$/, 'the roster is folded into its button');
  assert.equal(s0.controls.length, 2, 'Mute and Quit are showing');
  for (const r of s0.controls) {
    const apart = s0.toggle.right <= r.left || s0.toggle.left >= r.right || s0.toggle.bottom <= r.top || s0.toggle.top >= r.bottom;
    assert.ok(apart, `the roster button ${JSON.stringify(s0.toggle)} clear of #${r.id} ${JSON.stringify(r)}`);
  }
  // Tap where the button shows, anywhere along it: each point must reach the button, not Mute or Quit.
  const y = (s0.toggle.top + s0.toggle.bottom) / 2;
  for (const share of [0.1, 0.5, 0.9]) {
    const x = s0.toggle.left + (s0.toggle.right - s0.toggle.left) * share;
    const hit = await evaluate(`document.elementFromPoint(${x}, ${y})?.closest('button')?.id ?? null`);
    assert.equal(hit, 'ring-toggle', `a tap at (${Math.round(x)}, ${Math.round(y)}) reaches the roster button`);
  }
  const mute = await evaluate("document.getElementById('mute').textContent");
  const x = s0.toggle.left + (s0.toggle.right - s0.toggle.left) * 0.75;
  await tap(x, y);
  const opened = await state();
  assert.ok(opened.rosterShown && opened.expanded === 'true', `a tap opens the list: ${JSON.stringify(opened)}`);
  assert.ok(opened.roster.top >= opened.toggle.bottom, 'the list opens below its button');
  for (const r of opened.controls) {
    const apart = opened.roster.right <= r.left || opened.roster.left >= r.right || opened.roster.bottom <= r.top || opened.roster.top >= r.bottom;
    assert.ok(apart, `the open list clear of #${r.id}`);
  }
  await tap(x, y);
  const closed = await state();
  assert.ok(!closed.rosterShown && closed.expanded === 'false', `a second tap closes it: ${JSON.stringify(closed)}`);
  assert.equal(await evaluate("document.getElementById('mute').textContent"), mute, 'neither tap reached Mute');
});
