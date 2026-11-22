// The lobby in a real browser (#117): it takes a third mode, or six, with no change to its markup or CSS.
// Stand-in modes are added through ?test before the page's scripts run (window.derbyTestModes), with a
// stub start that records what it was given; Arena also brings its own How to play <template>. Checks
// selection by keyboard (every card a Tab stop), each mode's options, the player-limit messages, the shared Start and Enter,
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
async function openLobby(t, { extra, names = NAMES, width = 1366, height = 768, mobile = false, reducedMotion = false }) {
  const base = await startServer(t, names);
  const send = await openBrowser(t);
  const page = pageHelpers(send);
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
  // Without motion there's no fade-in either, so what shows can be measured straight after a change.
  if (reducedMotion) await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await send('Page.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `(${installModes})(${extra})` });
  const load = async (query = '') => {
    await send('Page.navigate', { url: `${base}/?test${query}` });
    // The readiness line stays empty until the team list has loaded.
    await page.until(`document.getElementById('readiness').textContent !== ''`, 30000, 'the lobby');
  };
  await load();
  /** A key press; `text` for keys that type something (Space), which buttons need to act on. */
  const key = async (key, code, keyCode, text) => {
    for (const type of ['keyDown', 'keyUp']) {
      await send('Input.dispatchKeyEvent', { type, key, code, windowsVirtualKeyCode: keyCode, ...(text && type === 'keyDown' ? { text } : {}) });
    }
  };
  /** A real tap (mouse press and release) at the centre of what `selector` finds, or at `dx` px from its left. */
  const tap = async (selector, dx = null) => {
    const r = await page.evaluate(`(() => { const r = document.querySelector('${selector}').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; })()`);
    const x = dx === null ? r[0] + r[2] / 2 : r[0] + dx;
    const y = r[1] + r[3] / 2;
    for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
  };
  /** Leaves the lobby for another page of the app (one that saves no lobby settings). */
  const leave = async (path) => {
    await send('Page.navigate', { url: `${base}/${path}` });
    await page.until(`document.readyState === 'complete' && location.pathname.endsWith('${path}')`, 30000, path);
  };
  return { send, ...page, load, key, tap, leave };
}

/** What the lobby shows for the selected mode. */
const LOBBY = `(() => {
  const active = document.querySelector('.mode-config:not(.inactive)');
  return {
    selected: document.querySelector('.mode-card[aria-pressed="true"]').dataset.mode,
    pressed: [...document.querySelectorAll('.mode-card[aria-pressed="true"]')].map((c) => c.dataset.mode),
    focus: document.activeElement.id || document.activeElement.dataset.mode || document.activeElement.tagName,
    count: document.getElementById('racer-count').textContent,
    start: document.getElementById('start').textContent,
    startDisabled: document.getElementById('start').disabled,
    readiness: document.getElementById('readiness').textContent,
    cards: [...document.querySelectorAll('.mode-card')].map((c) => [...c.querySelectorAll('span')].map((s) => s.textContent).join(' ')),
    panel: active && active.querySelector('h3').textContent,
    howToPlayBtn: active?.querySelector('.how-to-play-btn')?.textContent ?? null,
    lobbyShown: !document.getElementById('lobby').hidden,
    calls: window.derbyTestCalls,
  };
})()`;

test('a third mode joins the lobby as one more card, with its own options, limits and Start', { skip, timeout: 120000 }, async (t) => {
  const { evaluate, until, load, key, leave } = await openLobby(t, { extra: 1 });
  const tab = () => key('Tab', 'Tab', 9);
  // With its text, like a real key, so a focused button acts on it.
  const enter = () => key('Enter', 'Enter', 13, '\r');
  let lobby = await evaluate(LOBBY);
  assert.equal(lobby.cards.length, 7);
  assert.deepEqual(lobby.cards[6], '🎯 Arena 2–4 players · 6 checked ✓');
  assert.equal(lobby.selected, 'race', 'a browser that has never chosen starts on Race');
  assert.equal(lobby.focus, 'start', 'focus starts on Start');
  // Every button, including the cards and choices the lobby builds, has a name (no "empty button").
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('button')]
    .filter((b) => !b.textContent.trim() && !b.getAttribute('aria-label') && !b.getAttribute('aria-labelledby')).map((b) => b.outerHTML)`), []);

  // Tab reaches every card in turn, not only the selected one; Enter on a card only selects it.
  await evaluate(`document.querySelector('.mode-card[aria-pressed="true"]').focus()`);
  await tab();
  assert.equal((await evaluate(LOBBY)).focus, 'rumble');
  await tab();
  assert.equal((await evaluate(LOBBY)).focus, 'deathmatch');
  await tab();
  assert.equal((await evaluate(LOBBY)).focus, 'claw');
  await tab();
  assert.equal((await evaluate(LOBBY)).focus, 'plinko');
  await tab();
  assert.equal((await evaluate(LOBBY)).focus, 'freeze');
  await tab();
  assert.equal((await evaluate(LOBBY)).focus, 'arena');
  await enter();
  lobby = await evaluate(LOBBY);
  assert.equal(lobby.selected, 'arena');
  assert.deepEqual(lobby.pressed, ['arena'], 'only the selected card is pressed');
  assert.equal(lobby.focus, 'arena', 'focus stays on the card');
  assert.ok(lobby.lobbyShown);
  assert.deepEqual(lobby.calls, []);
  assert.equal(lobby.panel, 'Arena options');
  assert.equal(lobby.howToPlayBtn, 'How to play');
  // Opening How to play shows Arena's guide in a pop-up dialog without expanding the options dock.
  const dockHeight = await evaluate(`Math.round(document.getElementById('mode-options').getBoundingClientRect().height)`);
  await evaluate(`document.querySelector('.mode-config[data-mode="arena"] .how-to-play-btn').click()`);
  assert.equal(await evaluate(`document.getElementById('guide-dialog').open`), true);
  assert.match(await evaluate(`document.getElementById('guide-dialog-body').textContent`), /Knock everyone off the arena/);
  assert.equal(await evaluate(`Math.round(document.getElementById('mode-options').getBoundingClientRect().height)`), dockHeight);
  await evaluate(`document.getElementById('guide-close').click()`);
  assert.equal(await evaluate(`document.getElementById('guide-dialog').open`), false);
  await evaluate(`document.querySelector('.mode-card[data-mode="arena"]').focus()`);

  // Six checked don't fit 2–4: said beside a disabled Start, which Enter can't get round.
  assert.equal(lobby.start, '▶ Start arena');
  assert.ok(lobby.startDisabled);
  assert.equal(lobby.readiness, 'Arena supports 2–4 players. 6 are checked — uncheck 2. Review team list');
  await enter();
  assert.deepEqual(await evaluate('window.derbyTestCalls'), []);

  // Review team list goes to the roster; unchecking two makes it fit.
  await evaluate(`document.querySelector('#readiness button').click()`);
  assert.ok(await evaluate(`!!document.activeElement.closest('#roster')`), 'focus is in the team list');
  await evaluate(`[...document.querySelectorAll('#roster input')].slice(0, 2).forEach((box) => box.click())`);
  lobby = await evaluate(LOBBY);
  assert.equal(lobby.count, '4 playing');
  assert.equal(lobby.startDisabled, false);
  assert.equal(lobby.readiness, '4 contenders ready — last one standing leads standup.');
  assert.equal(lobby.cards[6], '🎯 Arena 2–4 players ✓');

  // Its options, by keyboard: Tab from the card through the toggle's three choices (Space picks one),
  // then to the slider (the arrow keys move it). The lobby draws them with its own controls.
  const map = `[...document.querySelectorAll('[data-option="arena-map"] .segment')].filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.dataset.value)`;
  assert.deepEqual(await evaluate(map), ['docks']);
  await evaluate(`document.querySelector('.mode-card[data-mode="arena"]').focus()`);
  for (const value of ['docks', 'bridge', 'lighthouse']) {
    await tab();
    assert.equal(await evaluate('document.activeElement.dataset.value'), value, `Tab reached ${await evaluate('document.activeElement.outerHTML.slice(0, 90)')}`);
  }
  await key(' ', 'Space', 32, ' ');
  assert.deepEqual(await evaluate(map), ['lighthouse']);
  await tab();
  assert.equal(await evaluate('document.activeElement.id'), 'opt-arena-rounds');
  await key('ArrowRight', 'ArrowRight', 39);
  assert.equal(await evaluate(`document.getElementById('opt-arena-rounds').getAttribute('aria-valuetext')`), '5 rounds');

  // Enter on the slider starts the selected mode, with its options, through the shared Start.
  await enter();
  lobby = await evaluate(LOBBY);
  assert.equal(lobby.calls.length, 1);
  assert.equal(lobby.calls[0].mode, 'arena');
  assert.deepEqual(lobby.calls[0].options, { map: 'lighthouse', rounds: 5 });
  assert.equal(lobby.calls[0].names.length, 4);
  assert.ok(!lobby.lobbyShown);

  // Quit: back on Start, ready to go again.
  await evaluate(`document.getElementById('quit').click()`);
  await until(`document.activeElement.id === 'start'`, 10000, 'focus on Start after Quit');

  // A reload keeps the mode, its options and attendance, and Enter on Start starts it again.
  await load();
  lobby = await evaluate(LOBBY);
  assert.equal(lobby.selected, 'arena');
  assert.equal(lobby.count, '4 playing');
  assert.deepEqual(await evaluate(map), ['lighthouse']);
  assert.equal(await evaluate(`document.getElementById('opt-arena-rounds').value`), '2');
  assert.equal(lobby.focus, 'start');
  await enter();
  await until('window.derbyTestCalls.length === 1 && document.getElementById("lobby").hidden', 10000, 'Arena to start from Start');
  await evaluate(`document.getElementById('quit').click()`);
  await until(`!document.getElementById('lobby').hidden`, 10000, 'the lobby after Quit');

  // A new tab, for the next meeting: everyone is present again, but the game and its options are kept.
  // (Cleared from another page: the lobby, still reloading the team list after Quit, saves attendance.)
  await leave('history.html');
  await evaluate('sessionStorage.clear()');
  await load();
  lobby = await evaluate(LOBBY);
  assert.equal(lobby.selected, 'arena');
  assert.equal(lobby.count, '6 playing');
  assert.deepEqual(await evaluate(map), ['lighthouse']);

  // Back to the race: attendance is shared, and the race's options are still its own.
  await evaluate(`document.querySelector('.mode-card[data-mode="race"]').click()`);
  lobby = await evaluate(LOBBY);
  assert.equal(lobby.start, '▶ Start race');
  assert.equal(lobby.count, '6 playing');
  assert.equal(lobby.panel, 'Race options');

  // How to play opens as a pop-up dialog, so the options area never expands when viewing a long guide.
  const area = `Math.round(document.getElementById('mode-options').getBoundingClientRect().height)`;
  const closed = await evaluate(area);
  await evaluate(`document.querySelector('.mode-config[data-mode="race"] .how-to-play-btn').click()`);
  assert.equal(await evaluate(`document.getElementById('guide-dialog').open`), true);
  assert.equal(await evaluate(area), closed, 'the options area stays compact while the guide pop-up is open');
  await evaluate(`document.getElementById('guide-close').click()`);
  assert.equal(await evaluate(`document.getElementById('guide-dialog').open`), false);
});

test('on a phone, the whole Who’s here row folds and unfolds the team list, and shows who’s absent', { skip, timeout: 120000 }, async (t) => {
  const { evaluate, tap } = await openLobby(t, { extra: 0, width: 390, height: 844, mobile: true });
  const state = () => evaluate(`[document.getElementById('team-toggle').getAttribute('aria-expanded'),
    getComputedStyle(document.getElementById('team-body')).display, document.getElementById('team-toggle').textContent.replace(/\\s+/g, ' ').trim()]`);
  assert.deepEqual(await state(), ['false', 'none', 'Who’s here 6 playing'], 'six ready: folded');
  // A tap on the count, not the label, opens it.
  await tap('#team-summary');
  assert.deepEqual((await state()).slice(0, 2), ['true', 'block']);
  await evaluate(`document.querySelector('#roster input').click()`);
  assert.equal((await state())[2], 'Who’s here 5 playing · 1 absent');
  // And a tap at the far end of the row, by the arrow, folds it again.
  const width = await evaluate(`document.getElementById('team-toggle').getBoundingClientRect().width`);
  await tap('#team-toggle', width - 10);
  assert.deepEqual(await state(), ['false', 'none', 'Who’s here 5 playing · 1 absent']);
});

test('Broadcast HUD (#123 phase 1): open 3D stage at 1366 x 768 with 30 names, and collapsible Lineup Drawer', { skip, timeout: 120000 }, async (t) => {
  const names = Array.from({ length: 30 }, (_, i) => `Teammate ${i + 1}`);
  const { evaluate, key } = await openLobby(t, { extra: 0, names, width: 1366, height: 768, mobile: false, reducedMotion: true });
  const measure = () => evaluate(`(() => {
    const stage = document.querySelector('.lobby-stage').getBoundingClientRect();
    const drawer = document.getElementById('roster-section').getBoundingClientRect();
    const lobby = document.getElementById('lobby');
    const openWidth = Math.max(0, stage.width - drawer.width - 36);
    return {
      vscroll: document.documentElement.scrollHeight > innerHeight || lobby.scrollHeight > lobby.clientHeight,
      openRatio: (openWidth * stage.height) / (innerWidth * innerHeight),
      collapsed: document.getElementById('roster-section').classList.contains('drawer-collapsed'),
      drawerWidth: Math.round(drawer.width),
      expandedAttr: document.getElementById('drawer-toggle').getAttribute('aria-expanded'),
    };
  })()`);

  const open = await measure();
  assert.equal(open.vscroll, false, '30 names scroll inside the drawer, never the page');
  assert.ok(open.openRatio >= 0.5, `at least half of 1366 x 768 is open 3D stage (got ${(open.openRatio * 100).toFixed(1)}%)`);
  assert.equal(open.collapsed, false);
  assert.equal(open.expandedAttr, 'true');

  // Unchecking a teammate updates #attendance-status in the Launch zone without shifting #roster.
  const rosterTop = await evaluate(`Math.round(document.getElementById('roster').getBoundingClientRect().top)`);
  assert.ok(rosterTop > 0, 'roster is visible on screen');
  await evaluate(`document.querySelector('#roster input').click()`);
  assert.equal(await evaluate(`Math.round(document.getElementById('roster').getBoundingClientRect().top)`), rosterTop, 'marking absent does not shift the roster');
  assert.match(await evaluate(`document.getElementById('attendance-status').textContent`), /1 person marked absent/);
  assert.ok(await evaluate(`!!document.getElementById('attendance-status').closest('.lobby-foot')`), 'absent count sits in the Launch zone');

  // Modals sit outside the pointer-events: none stage, so Reset and How to play buttons are clickable.
  assert.equal(await evaluate(`getComputedStyle(document.getElementById('reset-dialog')).pointerEvents`), 'auto');
  assert.equal(await evaluate(`getComputedStyle(document.getElementById('guide-dialog')).pointerEvents`), 'auto');

  // H collapses the Lineup Drawer for a full-bleed spectator view, and H expands it again.
  await key('h', 'KeyH', 72, 'h');
  const collapsed = await measure();
  assert.equal(collapsed.collapsed, true);
  assert.equal(collapsed.expandedAttr, 'false');
  assert.ok(collapsed.openRatio > open.openRatio, 'collapsing the drawer opens even more 3D stage');

  // Switching to Rumble (2–12 players) with 29 checked and clicking Review team list auto-expands & highlights the drawer.
  await evaluate(`document.querySelector('.mode-card[data-mode="rumble"]').click()`);
  const highlighted = await evaluate(`(() => {
    document.querySelector('#readiness button').click();
    return document.getElementById('roster-section').classList.contains('attention');
  })()`);
  assert.equal(highlighted, true, 'Review team list highlights the drawer');
  const reopened = await measure();
  assert.equal(reopened.collapsed, false, 'Review team list reopens the collapsed drawer');
  assert.ok(await evaluate(`!!document.activeElement.closest('#roster')`), 'focus is inside the roster');
});

test('Live 3D Stage (#123 phase 2): reacts to mode switches, roster toggles, Classic/HD, and fallback modes', { skip, timeout: 120000 }, async (t) => {
  const { evaluate, until, leave, load } = await openLobby(t, { extra: 1, width: 1366, height: 768, mobile: false, reducedMotion: true });
  const hasWebgl = await evaluate('Boolean(window.derbyTest.game)');
  if (!hasWebgl) return; // Software WebGL is expected in CI; skip stage assertions only if WebGL is disabled.

  const stage = () => evaluate('window.derbyTest.game.stageState()');
  // Derby Race starts with all 6 teammates idling on the starting grid.
  assert.deepEqual(await stage(), { mode: 'race-grid', count: 6 });

  // Unchecking 2 teammates removes them from the 3D starting grid live.
  await evaluate(`[...document.querySelectorAll('#roster input')].slice(0, 2).forEach((box) => box.click())`);
  assert.deepEqual(await stage(), { mode: 'race-grid', count: 4 });

  // Switching to Let's Rumble transitions the 3D stage to the wrestling ring (Classic by default) with the 4 teammates.
  await evaluate(`document.querySelector('.mode-card[data-mode="rumble"]').click()`);
  assert.deepEqual(await stage(), { mode: 'wrestle-ring', count: 4, modelStyle: 'classic', requestedStyle: 'classic' });

  // Toggling HD swaps the wrestlers in the ring to HD models live on stage.
  await evaluate(`document.querySelector('[data-option="rumble-models"] .segment[data-value="hd"]').click()`);
  await until(`window.derbyTest.game.stageState().modelStyle === 'hd'`, 20000, 'HD models to swap in on stage');
  assert.deepEqual(await stage(), { mode: 'wrestle-ring', count: 4, modelStyle: 'hd', requestedStyle: 'hd' });

  // Toggling a teammate while in HD updates incrementally without flashing back to Classic or rebuilding everyone.
  await evaluate(`document.querySelectorAll('#roster input')[2].click()`);
  assert.deepEqual(await stage(), { mode: 'wrestle-ring', count: 3, modelStyle: 'hd', requestedStyle: 'hd' });
  await evaluate(`document.querySelectorAll('#roster input')[2].click()`);
  assert.deepEqual(await stage(), { mode: 'wrestle-ring', count: 4, modelStyle: 'hd', requestedStyle: 'hd' });

  // Edit team list and Full history share the same mode-reactive 3D background (wrestle-ring here).
  for (const subpage of ['roster.html', 'history.html']) {
    await leave(subpage);
    await until(`window.derby?.stageState?.().mode === 'wrestle-ring' && window.derby.stageState().count === 4`, 15000, `${subpage} to show wrestling ring`);
  }
  await load();

  // A third mode without a stagePreview hook (Arena) falls back cleanly to the Chesapeake Bay fly-over.
  await evaluate(`document.querySelector('.mode-card[data-mode="arena"]').click()`);
  assert.deepEqual(await stage(), { mode: 'flyover', count: 0 });

  // Standup Deathmatch stages its QuakeWorld 3D arena and opens the live lobby In-call messages preview.
  await evaluate(`document.querySelector('.mode-card[data-mode="deathmatch"]').click()`);
  assert.deepEqual(await stage(), { mode: 'deathmatch-arena', count: 4 });
  assert.equal(await evaluate(`document.getElementById('dm-lobby-chat').hidden`), false, 'lobby preview chat shows for Standup Deathmatch');
  assert.ok(await evaluate(`document.querySelectorAll('#dm-lobby-chat-list .dm-msg').length >= 1`), 'lobby preview chat streams messages');

  // Claw of Destiny stages the 3D arcade cabinet with settling dev gachapon capsules.
  await evaluate(`document.querySelector('.mode-card[data-mode="claw"]').click()`);
  assert.deepEqual(await stage(), { mode: 'claw-cabinet', count: 4 });
  assert.equal(await evaluate(`document.getElementById('dm-lobby-chat').hidden`), true, 'lobby preview chat hides when leaving Deathmatch');

  // Kanban Plinko stages the tilted 3D vertical Kanban pinball board with marbles in The Backlog hopper.
  await evaluate(`document.querySelector('.mode-card[data-mode="plinko"]').click()`);
  assert.deepEqual(await stage(), { mode: 'plinko-board', count: 4 });

  // Code Freeze stages the neon CI/CD sprint runway with the 14-developer runners.
  await evaluate(`document.querySelector('.mode-card[data-mode="freeze"]').click()`);
  assert.deepEqual(await stage(), { mode: 'freeze-runway', count: 4 });

  // Phase 3: Broadcast chyron shows live highlights, and Surprise me switches to another eligible mode.
  assert.equal(await evaluate(`document.getElementById('chyron').hidden`), false, 'chyron is visible on wide screen');
  assert.ok(await evaluate(`document.getElementById('chyron-tag').textContent.length > 0`));
  assert.equal(await evaluate(`document.getElementById('surprise-mode').disabled`), false);
  const beforeSurprise = await evaluate(`document.querySelector('.mode-card[aria-pressed="true"]').dataset.mode`);
  await evaluate(`document.getElementById('surprise-mode').click()`);
  const afterSurprise = await evaluate(`document.querySelector('.mode-card[aria-pressed="true"]').dataset.mode`);
  assert.notEqual(afterSurprise, beforeSurprise, 'Surprise me picks a different eligible mode');
});

test('Standup Deathmatch runs Google Meet shared-screen match, rolls back clock to 0:45, and crowns invitee at 0:00', { skip, timeout: 120000 }, async (t) => {
  const { evaluate, until, load } = await openLobby(t, { extra: 0, width: 1366, height: 768, mobile: false, reducedMotion: true });
  await load('&mode=deathmatch&seed=77&dmSpeed=25');
  const hasWebgl = await evaluate('Boolean(window.derbyTest.game)');
  if (!hasWebgl) return;

  await evaluate(`document.getElementById('start').click()`);
  await until(`!document.getElementById('dm-meet').hidden`, 10000, 'Google Meet deathmatch overlay');
  await until(`document.querySelectorAll('#dm-console .dm-con-line').length > 0`, 10000, 'Quake obituary console');
  await until(`document.getElementById('dm-clock').classList.contains('rolled-back')`, 15000, 'clock rollback to 0:45');
  await until(`!document.getElementById('dm-leaderboard').hidden`, 20000, '0:00 frag leaderboard');

  const board = await evaluate(`(() => ({
    cols: document.getElementById('dm-leaderboard-grid').classList.contains('dm-lb-one-col') ? 1 : 2,
    rows: document.querySelectorAll('#dm-leaderboard-grid .dm-lb-row').length,
    chatCount: document.querySelectorAll('#dm-chat-list .dm-msg').length,
    consoleLines: document.querySelectorAll('#dm-console .dm-con-line').length,
    chatText: document.getElementById('dm-chat-list').textContent,
  }))()`);
  assert.equal(board.cols, 1, '6 invitees (< 16) uses single-column leaderboard');
  assert.equal(board.rows, NAMES.length, 'leaderboard includes invitees only (excludes NPCs)');
  assert.ok(board.consoleLines <= 4 && board.consoleLines >= 1, 'Quake console caps at 4 visible lines');
  assert.ok(board.chatCount >= 10, 'In-call messages populated during match');
  assert.match(board.chatText, /Who rolled back the server clock\?/);
  assert.match(board.chatText, /Time travel as a service/);

  // Clicking Announce Meeting Leader transitions cleanly to the winner card.
  await evaluate(`document.getElementById('dm-continue').click()`);
  await until(`!document.getElementById('results').hidden`, 10000, 'winner card after leaderboard');
});

test('Claw of Destiny runs 3D arcade claw round with dev excuses and drops winner down the chute', { skip, timeout: 120000 }, async (t) => {
  const { evaluate, until, load } = await openLobby(t, { extra: 0, width: 1366, height: 768, mobile: false, reducedMotion: true });
  await load('&mode=claw&seed=19&clawDuration=10');
  const hasWebgl = await evaluate('Boolean(window.derbyTest.game)');
  if (!hasWebgl) return;

  await evaluate(`document.getElementById('start').click()`);
  await until(`!document.getElementById('results').hidden`, 25000, 'Claw of Destiny winner card');
  assert.match(await evaluate(`document.getElementById('winner-kind').textContent`), /prize chute/);
});

test('Kanban Plinko runs 2.5D vertical pinball gauntlet and crowns first marble into Prod', { skip, timeout: 120000 }, async (t) => {
  const { evaluate, until, load } = await openLobby(t, { extra: 0, width: 1366, height: 768, mobile: false, reducedMotion: true });
  await load('&mode=plinko&seed=29&plinkoDuration=10');
  const hasWebgl = await evaluate('Boolean(window.derbyTest.game)');
  if (!hasWebgl) return;

  await evaluate(`document.getElementById('start').click()`);
  await until(`!document.getElementById('plinko-ticker').hidden`, 10000, 'Kanban Plinko live leader ticker');
  await until(`!document.getElementById('results').hidden`, 25000, 'Kanban Plinko winner card');
  assert.match(await evaluate(`document.getElementById('winner-kind').textContent`), /Prod/);
});

test('Code Freeze runs Red Light Green Light survival sprint and crowns winner', { skip, timeout: 120000 }, async (t) => {
  const { evaluate, until, load } = await openLobby(t, { extra: 0, width: 1366, height: 768, mobile: false, reducedMotion: true });
  await load('&mode=freeze&seed=41&freezeDuration=10');
  const hasWebgl = await evaluate('Boolean(window.derbyTest.game)');
  if (!hasWebgl) return;

  await evaluate(`document.getElementById('start').click()`);
  await until(`!document.getElementById('freeze-banner').hidden`, 10000, 'Code Freeze status banner');
  await until(`!document.getElementById('results').hidden`, 25000, 'Code Freeze winner card');
  assert.match(await evaluate(`document.getElementById('winner-kind').textContent`), /RELEASE|standing/);
});

test('Broadcast Studio shell (#133 phase 1): shared header, open 3D stage, and mouse-wheel scrolling on long history', { skip, timeout: 120000 }, async (t) => {
  const base = await startServer(t, NAMES);
  for (let i = 0; i < 40; i++) {
    const res = await fetch(`${base}/api/winners`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: base },
      body: JSON.stringify({ name: NAMES[i % NAMES.length], mode: i % 2 ? 'wrestle' : 'race', absent: [] }),
    });
    assert.equal(res.status, 200);
  }
  const send = await openBrowser(t);
  const page = pageHelpers(send);
  await send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
  await send('Page.enable');
  await send('Page.navigate', { url: `${base}/history.html` });
  await page.until(`document.querySelectorAll('#history-rows tr').length === 40`, 20000, '40 history rows');

  const before = await page.evaluate(`(() => {
    const s = document.querySelector('.studio-scroll');
    const p = document.querySelector('.studio-panel').getBoundingClientRect();
    return {
      overflow: s.scrollHeight > s.clientHeight,
      openRatio: (innerWidth - p.width - 36) / innerWidth,
      backHref: document.getElementById('back-to-lobby')?.getAttribute('href'),
    };
  })()`);
  assert.equal(before.overflow, true, '40 rows scroll inside .studio-scroll');
  assert.ok(before.openRatio >= 0.4, `at least 40% open 3D stage beside the Studio Panel (got ${(before.openRatio * 100).toFixed(1)}%)`);
  assert.equal(before.backHref, './');

  const scrollBox = await page.evaluate(`(() => { const r = document.querySelector('.studio-scroll').getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
  await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: scrollBox.x, y: scrollBox.y, deltaX: 0, deltaY: 360 });
  await page.until(`document.querySelector('.studio-scroll').scrollTop > 0`, 5000, 'mouse wheel to scroll history');

  // Phase 2: Broadcast Stat Strip, mode filter chips, name search, and Standings view.
  assert.equal(await page.evaluate(`document.getElementById('stat-strip').hidden`), false);
  await page.evaluate(`document.querySelector('#mode-filters button[data-mode="race"]').click()`);
  assert.equal(await page.evaluate(`document.querySelectorAll('#history-rows tr').length`), 20, 'Race filter shows 20 of 40');
  await page.evaluate(`document.getElementById('view-standings').click()`);
  assert.equal(await page.evaluate(`document.getElementById('standings-table').hidden`), false);
  assert.equal(await page.evaluate(`document.querySelectorAll('#standings-rows tr').length`), NAMES.length);
  await page.evaluate(`(() => { const s = document.getElementById('history-search'); s.value = 'Ada'; s.dispatchEvent(new Event('input')); })()`);
  assert.equal(await page.evaluate(`document.querySelectorAll('#standings-rows tr').length`), 1, 'name search narrows standings');

  // Phase 3: Roster Studio — interactive chips, Quick Add, Bulk Paste toggle, and live 3D stage update.
  await send('Page.navigate', { url: `${base}/roster.html` });
  await page.until(`document.querySelectorAll('#roster-chips .roster-chip').length === ${NAMES.length}`, 20000, 'roster chips');
  await page.evaluate(`(() => { const i = document.getElementById('add-name'); i.value = 'Katherine'; document.getElementById('add-name-btn').click(); })()`);
  assert.equal(await page.evaluate(`document.querySelectorAll('#roster-chips .roster-chip').length`), NAMES.length + 1, 'Quick Add adds a chip');
  assert.equal(await page.evaluate(`document.getElementById('discard-names').hidden`), false, 'Discard appears when dirty');
  await page.evaluate(`document.getElementById('view-bulk').click()`);
  assert.equal(await page.evaluate(`document.getElementById('bulk-panel').hidden`), false);
  assert.match(await page.evaluate(`document.getElementById('names').value`), /Katherine/);
  await page.evaluate(`document.getElementById('discard-names').click()`);
  assert.equal(await page.evaluate(`document.querySelectorAll('#roster-chips .roster-chip').length`), NAMES.length, 'Discard restores saved list');

  // Phase 4: Mobile phone viewports (390 x 844 and 320 x 568) have zero horizontal overflow on Studio pages.
  for (const [w, h] of [[390, 844], [320, 568]]) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: true });
    for (const url of [`${base}/history.html`, `${base}/roster.html`]) {
      await send('Page.navigate', { url });
      await page.until(`document.querySelector('.studio-panel') !== null`, 15000, `${url} at ${w}x${h}`);
      const hscroll = await page.evaluate(`document.documentElement.scrollWidth > innerWidth`);
      assert.equal(hscroll, false, `${url} at ${w}x${h} has no horizontal scroll`);
    }
  }
});

for (const [width, height, mobile] of [[1366, 768, false], [390, 844, true], [320, 568, true]]) {
  test(`six modes, one with a long name, fit a ${width} x ${height} screen with Start in one place`, { skip, timeout: 120000 }, async (t) => {
    const names = Array.from({ length: 13 }, (_, i) => `Teammate ${i + 1}`);
    const { evaluate } = await openLobby(t, { extra: 0, names, width, height, mobile, reducedMotion: true });
    const ids = await evaluate(`[...document.querySelectorAll('.mode-card')].map((c) => c.dataset.mode)`);
    assert.deepEqual(ids, ['race', 'rumble', 'deathmatch', 'claw', 'plinko', 'freeze']);
    const starts = new Set();
    for (const id of ids) {
      await evaluate(`document.querySelector('.mode-card[data-mode="${id}"]').click()`);
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
          shown: [...document.querySelectorAll('.mode-config')].filter((p) => getComputedStyle(p).visibility === 'visible').map((p) => p.dataset.mode),
          label: document.getElementById('start').textContent,
        };
      })()`);
      const at = `${id} at ${width} x ${height}`;
      assert.ok(!s.hscroll, `${at}: no sideways scrolling`);
      assert.ok(s.oneRow, `${at}: Just pick and Start in one row`);
      assert.deepEqual(s.shown, [id], `${at}: its options show, and no others`);
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
