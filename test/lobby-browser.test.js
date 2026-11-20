// The lobby in a real browser (#117): it takes a third mode, or six, with no change to its markup or CSS.
// Stand-in modes are added through ?test before the page's scripts run (window.derbyTestModes), with a
// stub start that records what it was given; Arena also brings its own How to play <template>. Checks
// selection by keyboard, each mode's options, the player-limit messages, the shared Start and Enter,
// focus, saved settings, and the layout from a laptop down to a 320 px phone.
import test from 'node:test';
import assert from 'node:assert/strict';
import { skip, openBrowser, startServer, pageHelpers } from './browser.js';

/**
 * Runs in the page before its scripts: adds `extra` stand-in modes after Race and Rumble. Arena always
 * comes first; up to three more make six in all, one with a very long name. Each start is recorded in
 * window.derbyTestCalls and leaves the lobby as a real game would.
 */
function installModes(extra) {
  window.derbyTestCalls = [];
  const start = (id) => (ctx, options) => {
    window.derbyTestCalls.push({ mode: id, names: ctx.names, options });
    ctx.setPhase('race');
    ctx.hideLobby();
    ctx.showQuit('✕ Quit');
  };
  const mode = (id, fields) => ({
    id,
    winMode: 'race',
    icon: '🎯',
    verb: id,
    guide: id,
    options: [],
    ready: (n) => `${n} ready for ${fields.name}.`,
    start: start(id),
    ...fields,
  });
  window.derbyTestModes = [
    mode('arena', {
      name: 'Arena',
      tagline: 'Third-person arena: the last one standing leads standup.',
      players: { min: 2, max: 4 },
      options: [
        { id: 'map', type: 'segmented', label: 'Map', default: 'docks', choices: [
          { value: 'docks', label: 'Docks' }, { value: 'bridge', label: 'Bridge' }, { value: 'lighthouse', label: 'Lighthouse' },
        ] },
        { id: 'rounds', type: 'range', label: 'Rounds', default: 3, steps: [1, 3, 5].map((value) => ({ value, label: `${value}`, text: `${value} rounds` })) },
      ],
      ready: (n) => `${n} contenders ready — last one standing leads standup.`,
    }),
    mode('quiz', { icon: '❓', name: 'Quiz', tagline: 'No options at all.', players: { min: 2, max: 30 } }),
    mode('relay', { icon: '🏃', name: 'Relay', tagline: 'Teams of three or more.', players: { min: 3, max: 8 } }),
    mode('regatta', {
      icon: '⛵',
      name: 'The Extraordinarily Long Chesapeake Bay Championship Regatta',
      tagline: 'A long name has to wrap inside its card.',
      players: { min: 2, max: 30 },
      options: [{ id: 'notes', type: 'link', label: 'Read the sailing instructions', href: 'history.html' }],
    }),
  ].slice(0, extra);
  // Arena's How to play, as a mode would add it to index.html.
  document.addEventListener('readystatechange', () => {
    if (document.readyState !== 'interactive') return;
    const guide = document.createElement('template');
    guide.id = 'guide-arena';
    guide.innerHTML = '<p>Knock everyone off the arena to win.</p>';
    document.body.append(guide);
  });
}

const NAMES = ['Ada', 'Grace', 'Linus', 'Hedy', 'Barbara', 'Ken'];

/** Opens the lobby with `extra` stand-in modes on a `width` x `height` screen. */
async function openLobby(t, { extra, names = NAMES, width = 1366, height = 768, mobile = false }) {
  const base = await startServer(t, names);
  const send = await openBrowser(t);
  const page = pageHelpers(send);
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
  await send('Page.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `(${installModes})(${extra})` });
  const load = async (query = '') => {
    await send('Page.navigate', { url: `${base}/?test${query}` });
    // The readiness line stays empty until the team list has loaded.
    await page.until(`document.getElementById('readiness').textContent !== ''`, 30000, 'the lobby');
  };
  await load();
  const key = async (key, code, keyCode) => {
    for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key, code, windowsVirtualKeyCode: keyCode });
  };
  return { send, ...page, load, key };
}

/** What the lobby shows for the selected mode. */
const LOBBY = `(() => {
  const active = document.querySelector('.mode-config:not(.inactive)');
  return {
    selected: document.querySelector('input[name="mode"]:checked').value,
    focus: document.activeElement.id || document.activeElement.value || document.activeElement.tagName,
    count: document.getElementById('racer-count').textContent,
    start: document.getElementById('start').textContent,
    startDisabled: document.getElementById('start').disabled,
    readiness: document.getElementById('readiness').textContent,
    cards: [...document.querySelectorAll('.mode-card')].map((c) => [...c.querySelectorAll('span')].map((s) => s.textContent).join(' ')),
    panel: active && active.querySelector('h3').textContent,
    howToPlay: active?.querySelector('.how-to-play')?.textContent ?? null,
    lobbyShown: !document.getElementById('lobby').hidden,
    calls: window.derbyTestCalls,
  };
})()`;

test('a third mode joins the lobby as one more card, with its own options, limits and Start', { skip, timeout: 120000 }, async (t) => {
  const { evaluate, until, load, key } = await openLobby(t, { extra: 1 });
  let lobby = await evaluate(LOBBY);
  assert.equal(lobby.cards.length, 3);
  assert.deepEqual(lobby.cards[2], '🎯 Arena 2–4 players · 6 checked ✓');
  assert.equal(lobby.selected, 'race', 'a new tab starts on Race');
  assert.equal(lobby.focus, 'start', 'focus starts on Start');

  // Arrow keys move between the cards and only select: nothing starts.
  await evaluate(`document.querySelector('input[name="mode"]:checked').focus()`);
  await key('ArrowRight', 'ArrowRight', 39);
  await key('ArrowRight', 'ArrowRight', 39);
  lobby = await evaluate(LOBBY);
  assert.equal(lobby.selected, 'arena');
  assert.equal(lobby.focus, 'arena', 'focus stays on the card');
  assert.ok(lobby.lobbyShown);
  assert.deepEqual(lobby.calls, []);
  assert.equal(lobby.panel, 'Arena options');
  assert.match(lobby.howToPlay, /Knock everyone off the arena/);

  // Six checked don't fit 2–4: said beside a disabled Start, and Enter in the lobby does nothing.
  assert.equal(lobby.start, '▶ Start arena');
  assert.ok(lobby.startDisabled);
  assert.equal(lobby.readiness, 'Arena supports 2–4 players. 6 are checked — uncheck 2. Review team list');
  await evaluate('document.activeElement.blur()');
  await key('Enter', 'Enter', 13);
  assert.deepEqual(await evaluate('window.derbyTestCalls'), []);

  // Review team list goes to the roster; unchecking two makes it fit.
  await evaluate(`document.querySelector('#readiness button').click()`);
  assert.ok(await evaluate(`!!document.activeElement.closest('#roster')`), 'focus is in the team list');
  await evaluate(`[...document.querySelectorAll('#roster input')].slice(0, 2).forEach((box) => box.click())`);
  lobby = await evaluate(LOBBY);
  assert.equal(lobby.count, '4 playing');
  assert.equal(lobby.startDisabled, false);
  assert.equal(lobby.readiness, '4 contenders ready — last one standing leads standup.');
  assert.equal(lobby.cards[2], '🎯 Arena 2–4 players ✓');

  // Its options: a three-way toggle and a slider, drawn by the lobby's own controls.
  await evaluate(`document.querySelector('input[name="opt-arena-map"][value="lighthouse"]').click()`);
  await evaluate(`(() => { const s = document.getElementById('opt-arena-rounds'); s.value = 2; s.dispatchEvent(new Event('input')); })()`);
  assert.equal(await evaluate(`document.getElementById('opt-arena-rounds').getAttribute('aria-valuetext')`), '5 rounds');

  // Enter in the lobby starts the selected mode, with its options, through the shared Start.
  await evaluate('document.activeElement.blur()');
  await key('Enter', 'Enter', 13);
  lobby = await evaluate(LOBBY);
  assert.equal(lobby.calls.length, 1);
  assert.equal(lobby.calls[0].mode, 'arena');
  assert.deepEqual(lobby.calls[0].options, { map: 'lighthouse', rounds: 5 });
  assert.equal(lobby.calls[0].names.length, 4);
  assert.ok(!lobby.lobbyShown);

  // Quit: back on Start, ready to go again.
  await evaluate(`document.getElementById('quit').click()`);
  await until(`document.activeElement.id === 'start'`, 10000, 'focus on Start after Quit');

  // A reload keeps the mode, its options and attendance.
  await load();
  lobby = await evaluate(LOBBY);
  assert.equal(lobby.selected, 'arena');
  assert.equal(lobby.count, '4 playing');
  assert.equal(await evaluate(`document.querySelector('input[name="opt-arena-map"]:checked').value`), 'lighthouse');
  assert.equal(await evaluate(`document.getElementById('opt-arena-rounds').value`), '2');

  // Back to the race: attendance is shared, and the race's options are still its own.
  await evaluate(`document.querySelector('input[name="mode"][value="race"]').click()`);
  lobby = await evaluate(LOBBY);
  assert.equal(lobby.start, '▶ Start race');
  assert.equal(lobby.count, '4 playing');
  assert.equal(lobby.panel, 'Race options');
});

for (const [width, height, mobile] of [[1366, 768, false], [390, 844, true], [320, 568, true]]) {
  test(`six modes, one with a long name, fit a ${width} x ${height} screen with Start in one place`, { skip, timeout: 120000 }, async (t) => {
    const names = Array.from({ length: 13 }, (_, i) => `Teammate ${i + 1}`);
    const { evaluate, until } = await openLobby(t, { extra: 4, names, width, height, mobile });
    const ids = await evaluate(`[...document.querySelectorAll('input[name="mode"]')].map((r) => r.value)`);
    assert.deepEqual(ids, ['race', 'rumble', 'arena', 'quiz', 'relay', 'regatta']);
    const starts = new Set();
    for (const id of ids) {
      await evaluate(`document.querySelector('input[name="mode"][value="${id}"]').click()`);
      // Once the options' 120 ms crossfade has finished (slower on a busy software-drawn page), only the
      // selected mode's options are visible.
      await until(`[...document.querySelectorAll('.mode-config')].filter((p) => getComputedStyle(p).visibility === 'visible').length === 1`,
        5000, `only ${id}'s options to show`);
      const s = await evaluate(`(() => {
        const box = (el) => el.getBoundingClientRect();
        const lobby = document.getElementById('lobby');
        const start = box(document.getElementById('start'));
        const pick = box(document.getElementById('pick'));
        return {
          hscroll: document.documentElement.scrollWidth > innerWidth || lobby.scrollWidth > lobby.clientWidth,
          start: [Math.round(start.left), Math.round(start.top), Math.round(start.width), Math.round(start.height)],
          pick: [Math.round(pick.width), Math.round(pick.height)],
          oneRow: Math.abs(start.top - pick.top) < 2,
          cards: [...document.querySelectorAll('.mode-card')].map((c) => ({ w: c.offsetWidth, h: c.offsetHeight, cut: c.scrollWidth > c.clientWidth + 1 })),
          panel: document.querySelector('.mode-config:not(.inactive)').dataset.mode,
          shownPanels: [...document.querySelectorAll('.mode-config')].filter((p) => getComputedStyle(p).visibility === 'visible').length,
          label: document.getElementById('start').textContent,
        };
      })()`);
      const at = `${id} at ${width} x ${height}`;
      assert.ok(!s.hscroll, `${at}: no sideways scrolling`);
      assert.ok(s.oneRow, `${at}: Just pick and Start in one row`);
      assert.equal(s.panel, id, `${at}: its options show`);
      assert.equal(s.shownPanels, 1, `${at}: only its options show`);
      assert.equal(s.label, `▶ Start ${id}`);
      for (const card of s.cards) {
        assert.ok(card.w >= 140 && card.h >= 44, `${at}: card ${card.w} x ${card.h} is a big enough target`);
        assert.ok(!card.cut, `${at}: card text fits (wraps, not cut off)`);
      }
      assert.ok(s.start[2] >= 44 && s.start[3] >= 44 && s.pick[0] >= 44 && s.pick[1] >= 44, `${at}: action buttons are 44 px or more`);
      starts.add(s.start.join());
    }
    assert.equal(starts.size, 1, `Start stays in one place whichever mode is selected: ${[...starts].join(' | ')}`);
  });
}
