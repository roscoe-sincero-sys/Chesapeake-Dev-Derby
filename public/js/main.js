// App entry point: loads the roster, runs the lobby, starts the selected game mode and saves the winner.
// The modes themselves (race, rumble) live in modes.js.

import { Game } from './game.js';
import { Hud } from './hud.js';
import { Sfx } from './audio.js';
import { buildRoster, selectRacers, pickRandomRacer, nameKey, displayNames, sortByDisplayName, selectAbsentees } from './eligibility.js';
import { mulberry32, cryptoRandom } from './sim.js';
import { apiFetch, DEMO } from './api.js';
import { endSession, resumeSession } from './session.js';
import { readLobbySettings, writeLobbySettings, retainRosterAbsences } from './lobby-settings.js';
import { normalizeSpeed, DEFAULT_SPEED } from './race-lengths.js';
import { MODES, findMode, fitsPlayers, modeOptions, playersText, capacityText } from './modes.js';
import { buildChyronLines } from './chyron.js';
import { LobbyMeetChat } from './deathmatch.js';

const $ = (id) => document.getElementById(id);


// Optional URL switches, handy for demos and testing:
//   ?seed=123     replay the same race every time
//   ?speed=4      starting race speed: 1, 2, 4, 8 or 12 (other values snap to the nearest)
//   ?mode=rumble  starting game mode: race or rumble (an unknown mode is ignored)
//   ?test         expose the game and HUD as window.derbyTest (the browser tests use it), and add any
//                 stand-in modes the tests put in window.derbyTestModes (see test/lobby-browser.test.js)
const params = new URLSearchParams(location.search);
const testMode = !DEMO && params.has('test');
const seed = params.has('seed') ? Number(params.get('seed')) || 0 : null;
if (testMode && Array.isArray(window.derbyTestModes)) MODES.push(...window.derbyTestModes);
const savedSettings = readLobbySettings();
if (params.has('speed')) savedSettings.options.race.speed = normalizeSpeed(Number(params.get('speed')) || DEFAULT_SPEED);
if (MODES.some((mode) => mode.id === params.get('mode'))) savedSettings.mode = params.get('mode');
let attendanceRestored = savedSettings.absent.size > 0;
let settingsSaved = true;
let initialFocusDone = false;
let teamOpenDecided = false;
let lastReadiness = '';

const state = {
  names: [],
  winners: [],
  history: [],
  roster: [],
  shown: new Map(), // nameKey -> on-screen name (email addresses shortened when unambiguous)
  raceNames: new Map(), // on-screen name -> stored name, for the game in progress
  absent: savedSettings.absent, // unticked nameKeys, retained within this browser tab
  mode: savedSettings.mode, // the selected mode's id, kept in this browser
  options: savedSettings.options, // each mode's option values, kept in this browser: { race: { speed }, rumble: { models } }
  phase: 'lobby', // lobby | loading | race | results | exiting
  loaded: false, // the team list has arrived from the server
  progress: '', // what a loading mode is doing ("Preparing HD characters…"), shown beside Start
  pendingWinner: null,
};

/** The on-screen form of a stored name. */
const show = (name) => state.shown.get(nameKey(name)) ?? name;
/** The stored name behind a name shown in the game. */
const stored = (name) => state.raceNames.get(name) ?? name;

const sfx = new Sfx();
const hud = new Hud();
const lobbyMeetChat = new LobbyMeetChat($('dm-lobby-chat'), $('dm-lobby-chat-list'), $('dm-lobby-chat-time'));
let game = null;
if (testMode) window.derbyTest = { hud, get game() { return game; } };

// ------------------------------------------------------------------ server

async function api(path, options) {
  let response;
  try {
    response = await apiFetch(path, options);
  } catch {
    throw new Error('Lost connection to the app. Ask the host to restart it, then tap Retry.');
  }
  let body = null;
  try {
    body = await response.json();
  } catch {
    /* handled below */
  }
  if (!response.ok) throw new Error(body?.error || `Server error (${response.status})`);
  return body;
}

async function loadState() {
  const status = $('status');
  try {
    const [data, hist] = await Promise.all([
      api('/api/state'),
      api('/api/history').catch(() => ({ history: [] })),
    ]);
    state.names = data.names;
    state.history = Array.isArray(hist?.history) ? hist.history : [];
    state.loaded = true;
    state.shown = displayNames(state.names);
    state.absent = retainRosterAbsences(state.absent, state.names);
    saveLobbySettings();
    state.winners = data.winners;
    state.roster = buildRoster(state.names, state.winners);
    status.className = '';
    status.replaceChildren();
    const notes = [...data.warnings];
    if (!game) notes.unshift('3D is not available in this browser, so games are decided off-screen and the winner shown straight away.');
    if (!state.names.length) notes.unshift('The team list is empty. Use Edit team list to add names.');
    if (notes.length) {
      status.className = 'warn';
      const list = document.createElement('ul');
      for (const note of notes) {
        const li = document.createElement('li');
        li.textContent = note;
        list.append(li);
      }
      status.append(list);
    }
    renderLobby();
    focusLobbyOnce();
  } catch (err) {
    status.className = 'error';
    status.textContent = `Could not load the team list: ${err.message} `;
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.textContent = 'Retry';
    retry.onclick = loadState;
    status.append(retry);
    $('check-all').disabled = $('check-none').disabled = true;
    $('sitting-out').hidden = true;
    $('reset-winners').hidden = true;
    $('start').disabled = $('pick').disabled = true;
  }
}

async function saveWinner(name, mode) {
  state.pendingWinner = name;
  state.pendingMode = mode;
  hud.saveStatus('Saving the result…');
  try {
    const data = await api('/api/winners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Who was marked absent is logged with the result (Full history → Absentee list).
      body: JSON.stringify({ name, mode, absent: selectAbsentees(state.roster, state.absent) }),
    });
    state.winners = data.winners;
    state.pendingWinner = null;
    // The three-pick rule applies however someone won.
    hud.saveStatus(
      data?.warning
        ? `Saved. ${show(name)} sits out the next three picks. ${data.warning}`
        : `Saved. ${show(name)} sits out the next three picks.`,
      'ok',
    );
  } catch (err) {
    hud.saveStatus(`Could not save the winner: ${err.message}`, 'error');
  }
}

// ------------------------------------------------------------------ lobby

function formatDate(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function renderLobby() {
  const list = $('roster');
  list.replaceChildren();
  for (const entry of sortByDisplayName(state.roster, state.shown)) {
    const key = nameKey(entry.name);
    const li = document.createElement('li');
    const label = document.createElement('label');
    const box = document.createElement('input');
    box.type = 'checkbox';
    const name = document.createElement('span');
    name.className = 'name';
    const shownName = show(entry.name);
    name.textContent = shownName;
    if (shownName !== entry.name) name.title = entry.name; // full email on hover only when shortened
    label.append(box, name);

    if (entry.eligible) {
      box.checked = !state.absent.has(key);
      li.classList.toggle('absent', !box.checked);
      box.addEventListener('change', () => {
        if (box.checked) state.absent.delete(key);
        else state.absent.add(key);
        li.classList.toggle('absent', !box.checked);
        attendanceRestored = false;
        sfx.unlock();
        sfx.play('tick', 0.04);
        saveLobbySettings();
        updateReadiness();
      });
    } else {
      // One of the last three winners: shown, but cannot be entered.
      const ago = entry.recentWin.racesAgo;
      box.disabled = true;
      box.checked = false;
      li.className = 'ineligible';
      const badge = document.createElement('span');
      badge.className = 'badge';
      const wait = 4 - ago;
      badge.textContent = `Sits out ${wait} more pick${wait === 1 ? '' : 's'}`;
      const text = document.createElement('span');
      text.className = 'who';
      text.append(name, badge);
      label.append(text);
    }
    li.append(label);
    list.append(li);
  }

  // The last three winners, newest first: "Sitting out: Barbara (Nov 18), Ken (Nov 14)". Their roster
  // tiles are marked too.
  const recent = $('recent');
  recent.replaceChildren();
  if (!state.winners.length) recent.textContent = 'No winners yet — everyone is eligible.';
  else recent.append('Sitting out: ');
  [...state.winners].reverse().forEach((winner, i) => {
    const name = document.createElement('b');
    name.textContent = show(winner.name);
    const when = formatDate(winner.date);
    recent.append(...(i ? [', '] : []), name, ...(when ? [` (${when})`] : []));
  });

  $('check-all').disabled = $('check-none').disabled = !state.names.length;
  $('sitting-out').hidden = !state.names.length;
  $('reset-winners').hidden = !state.winners.length;
  // On phones the team list starts folded, unless there aren't enough people ready to play.
  if (!teamOpenDecided) {
    teamOpenDecided = true;
    setTeamOpen(selectRacers(state.roster, state.absent).length < 2);
  }
  updateReadiness();
}

/** Folds or unfolds the team list (only phones show the fold). */
function setTeamOpen(open) {
  $('roster-section').classList.toggle('collapsed', !open);
  $('team-toggle').setAttribute('aria-expanded', String(open));
}

/** Collapses or expands the desktop left Lineup Drawer ("Spectator / Hype" mode, H key). */
function setDrawerOpen(open) {
  $('roster-section').classList.toggle('drawer-collapsed', !open);
  const btn = $('drawer-toggle');
  btn.setAttribute('aria-expanded', String(open));
  btn.textContent = open ? '◂' : '▸';
  btn.setAttribute('aria-label', open ? 'Hide lineup' : 'Show lineup');
}

let attentionTimer = null;

/** Opens the team list, highlights it briefly, and puts focus on it so attendance can be adjusted. */
function reviewTeam() {
  setTeamOpen(true);
  setDrawerOpen(true);
  const drawer = $('roster-section');
  drawer.classList.remove('attention');
  void drawer.offsetWidth;
  drawer.classList.add('attention');
  clearTimeout(attentionTimer);
  attentionTimer = setTimeout(() => drawer.classList.remove('attention'), 1200);
  $('roster').scrollTop = 0;
  const target = $('roster').querySelector('input:not([disabled])') ?? $('check-all');
  target.focus({ preventScroll: true });
  target.scrollIntoView({ block: 'nearest' });
}

let guideReturnFocus = null;

/** Opens the "How to play" pop-up dialog for `mode`, keeping the Bottom Command Dock compact. */
function openGuide(mode, trigger) {
  const template = document.getElementById(`guide-${mode.guide}`);
  if (!template) return;
  const dialog = $('guide-dialog');
  $('guide-title').textContent = `How to play — ${mode.name}`;
  const body = $('guide-dialog-body');
  body.replaceChildren(template.content.cloneNode(true));
  mode.fillGuide?.(body);
  guideReturnFocus = trigger ?? document.activeElement;
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
  $('guide-close').focus({ preventScroll: true });
}

/** Asks for confirmation, then clears the recent-winner list so everyone is eligible again. */
function confirmResetWinners() {
  const dialog = $('reset-dialog');
  if (typeof dialog.showModal !== 'function') {
    // Very old browsers without <dialog>: fall back to the built-in confirm box.
    if (window.confirm('Reset the last three winners? Everyone will be able to play again.')) resetWinners();
    return;
  }
  dialog.returnValue = '';
  dialog.showModal();
}

async function resetWinners() {
  const status = $('reset-status');
  status.hidden = false;
  status.className = 'hint';
  status.textContent = 'Resetting…';
  try {
    const data = await api('/api/winners', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    state.winners = data.winners;
    state.roster = buildRoster(state.names, state.winners);
    renderLobby();
    status.textContent = 'List reset. Everyone can play again.';
    // Reset has gone (there are no winners now): focus the team list, or Start where it's folded away.
    if ($('check-all').getClientRects().length) $('check-all').focus({ preventScroll: true });
    else focusSetup();
  } catch (err) {
    status.className = 'hint error-text';
    status.textContent = `Could not reset the list: ${err.message}`;
  }
}

/** The first control in the lobby that can take focus and is on screen. */
function firstUsableControl() {
  const candidates = $('lobby').querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), summary');
  return [...candidates].find((el) => el.getClientRects().length);
}

/**
 * Focus for a keyboard user setting up a game: Start if the selected game can start (so Enter starts it),
 * otherwise the selected mode's card.
 */
function focusSetup() {
  const start = $('start');
  const target = !start.disabled ? start : document.querySelector('.mode-card[aria-pressed="true"]') ?? firstUsableControl();
  // Start is always on screen (in the sticky action bar on phones); a card may need scrolling to.
  target?.focus({ preventScroll: target === start });
}

/**
 * When the lobby first opens, put keyboard focus on Start, so Enter starts the selected game. If the
 * headcount doesn't fit it, on the selected mode's card instead.
 * Only on first load, and never if the user has already moved focus somewhere.
 */
function focusLobbyOnce() {
  if (initialFocusDone) return;
  initialFocusDone = true;
  if (document.activeElement && document.activeElement !== document.body) return;
  focusSetup();
}

function saveLobbySettings() {
  settingsSaved = writeLobbySettings({ absent: state.absent, mode: state.mode, options: state.options });
}

function updateAttendanceStatus() {
  const count = state.absent.size;
  const parts = [];
  if (count) parts.push(`${count} ${count === 1 ? 'person' : 'people'} ${attendanceRestored ? 'still ' : ''}marked absent.`);
  if (!settingsSaved) parts.push('Browser storage is unavailable. Attendance, the game and its settings cannot be kept after leaving or reloading this page.');
  $('attendance-status').textContent = parts.join(' ');
  $('attendance-status').hidden = !parts.length;
}

/** Syncs the live 3D lobby stage (#123 phase 2) to the selected mode, its options, and checked-in teammates. */
function syncStage() {
  if (state.phase !== 'lobby' || !state.loaded) {
    lobbyMeetChat.stop();
    return;
  }
  const mode = findMode(state.mode);
  if (mode.id === 'deathmatch') lobbyMeetChat.start();
  else lobbyMeetChat.stop();
  if (!game) return;
  try {
    const names = selectRacers(state.roster, state.absent).map(show);
    const sittingOut = state.winners.map((w) => show(w.name));
    const options = state.options[mode.id];
    if (mode.stagePreview) mode.stagePreview(game, { names, options, sittingOut });
    else game.showFlyover();
  } catch (err) {
    console.warn('Lobby 3D stage preview unavailable; falling back to fly-over.', err);
    game.showFlyover();
  }
}

let chyronLines = [];
let chyronIdx = 0;
let chyronTimer = null;
let launchTimer = null;

function renderChyronLine() {
  const bar = $('chyron');
  if (!chyronLines.length) {
    bar.hidden = true;
    return;
  }
  const item = chyronLines[chyronIdx % chyronLines.length];
  $('chyron-tag').textContent = item.tag;
  $('chyron-text').textContent = item.text;
  bar.hidden = false;
}

/** Updates the pre-match broadcast chyron from roster, winners, history, and selected mode. */
function updateChyron() {
  if (!state.loaded) return;
  const next = buildChyronLines({
    roster: state.roster,
    absent: state.absent,
    winners: state.winners,
    history: state.history,
    show,
    mode: findMode(state.mode),
  });
  const sig = next.map((l) => `${l.tag}:${l.text}`).join('|');
  const prevSig = chyronLines.map((l) => `${l.tag}:${l.text}`).join('|');
  chyronLines = next;
  if (sig !== prevSig) chyronIdx = 0;
  renderChyronLine();
  clearInterval(chyronTimer);
  const reduced = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (chyronLines.length > 1 && !reduced) {
    chyronTimer = setInterval(() => {
      if (state.phase !== 'lobby') return;
      chyronIdx = (chyronIdx + 1) % chyronLines.length;
      renderChyronLine();
    }, 6000);
  }
}

/** Picks a random eligible game mode (preferring a different one when 2+ fit) and switches the stage to it. */
function surpriseMode() {
  const ready = selectRacers(state.roster, state.absent).length;
  const eligible = MODES.filter((m) => fitsPlayers(m, ready));
  if (eligible.length < 2) return;
  const others = eligible.filter((m) => m.id !== state.mode);
  const pool = others.length ? others : eligible;
  const picked = pool[Math.floor(cryptoRandom() * pool.length)];
  selectMode(picked.id);
  sfx.unlock();
  sfx.play('switch', 0.05);
  document.querySelector(`.mode-card[data-mode="${picked.id}"]`)?.focus({ preventScroll: true });
}

/** Hides the lobby with the 220 ms Curtain-Part glide (instant under reduced motion or ?test stubs). */
function hideLobby() {
  const lobby = $('lobby');
  clearTimeout(launchTimer);
  const reduced = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const instant = reduced || !game || (testMode && Array.isArray(window.derbyTestModes));
  if (instant) {
    lobby.classList.remove('launching');
    lobby.hidden = true;
    return;
  }
  lobby.classList.add('launching');
  launchTimer = setTimeout(() => {
    if (state.phase !== 'lobby') {
      lobby.hidden = true;
      lobby.classList.remove('launching');
    }
  }, 230);
}

/**
 * Everything that depends on who's ready and which game is selected: the count, each card's player range
 * (in red, with the headcount, when it doesn't fit), Start's label and state, and the readiness line.
 */
function updateReadiness() {
  updateAttendanceStatus();
  syncStage();
  updateChyron();
  const ready = selectRacers(state.roster, state.absent).length;
  const mode = findMode(state.mode);
  const fits = fitsPlayers(mode, ready);
  $('racer-count').textContent = `${ready} playing`;
  // The phone's folded summary row: "12 playing · 2 absent".
  const absent = state.absent.size;
  $('team-summary').replaceChildren(el('span', 'count', `${ready} playing`), ...(absent ? [` · ${absent} absent`] : []));
  $('pick').disabled = ready < 2;
  $('surprise-mode').disabled = !state.loaded || MODES.filter((m) => fitsPlayers(m, ready)).length < 2;

  for (const card of $('mode-cards').children) {
    const cardMode = findMode(card.dataset.mode);
    const cardFits = !state.loaded || fitsPlayers(cardMode, ready);
    card.classList.toggle('misfit', !cardFits);
    card.querySelector('.mode-players').textContent = cardFits ? playersText(cardMode) : `${playersText(cardMode)} · ${ready} checked`;
  }

  const start = $('start');
  start.textContent = `▶ Start ${mode.verb}`;
  start.disabled = !fits;
  // While a game loads (HD models) Start keeps focus, but nothing else can launch.
  if (state.phase === 'loading') start.setAttribute('aria-disabled', 'true');
  else start.removeAttribute('aria-disabled');

  // The readiness line is a live region: only rewrite it when what it says changes.
  const eligible = state.roster.filter((entry) => entry.eligible).length;
  const loading = state.phase === 'loading' && state.progress;
  const fix = !state.loaded || loading ? '' : !state.names.length || (!fits && ready < mode.players.min && eligible < mode.players.min) ? 'edit' : fits ? '' : 'review';
  const text = loading ? state.progress : !state.loaded ? '' : !state.names.length ? 'The team list is empty.' : fits ? mode.ready(ready) : capacityText(mode, ready);
  if (`${text}|${fix}` === lastReadiness) return;
  lastReadiness = `${text}|${fix}`;
  const line = $('readiness');
  line.classList.toggle('blocked', state.loaded && !fits && !loading);
  line.replaceChildren(text);
  if (fix === 'review') {
    const review = document.createElement('button');
    review.type = 'button';
    review.className = 'link';
    review.textContent = 'Review team list';
    review.addEventListener('click', reviewTeam);
    line.append(' ', review);
  } else if (fix === 'edit') {
    const edit = document.createElement('a');
    edit.className = 'link';
    edit.href = 'roster.html';
    edit.textContent = 'Edit team list';
    line.append(' ', edit);
  }
}

// ------------------------------------------------------------------ mode cards and options

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

let modePage = 0;

/** Responsive cards per page matching CSS breakpoints: 8 on phones, 12 on laptops (4x3), 15 on 1600px+ (5x3), 18 on 1840px+ (6x3). */
function modesPerPage() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (h <= 500 || w < 1000) return 8;
  if (w >= 1840) return 18;
  if (w >= 1600) return 15;
  return 12;
}

/** Updates which page of game modes is shown and refreshes the ◀ 1 / N ▶ pager controls. */
function setModePage(page) {
  const perPage = modesPerPage();
  const totalPages = Math.max(1, Math.ceil(MODES.length / perPage));
  modePage = Math.max(0, Math.min(totalPages - 1, page));
  const start = modePage * perPage;
  const end = start + perPage;
  const cards = [...$('mode-cards').children];
  cards.forEach((card, i) => {
    card.hidden = i < start || i >= end;
  });
  const pager = $('mode-pager');
  if (pager) {
    pager.hidden = totalPages <= 1;
    $('mode-page-label').textContent = `${modePage + 1} / ${totalPages}`;
    $('mode-prev').disabled = modePage === 0;
    $('mode-next').disabled = modePage >= totalPages - 1;
  }
}

/** Selects a mode (it doesn't start it): flips to its page, shows its options, and updates Start. Focus stays put. */
function selectMode(id) {
  state.mode = findMode(id).id;
  saveLobbySettings();
  const idx = MODES.findIndex((m) => m.id === state.mode);
  if (idx >= 0) setModePage(Math.floor(idx / modesPerPage()));
  for (const card of $('mode-cards').children) card.setAttribute('aria-pressed', String(card.dataset.mode === state.mode));
  for (const panel of $('mode-options').children) {
    const inactive = panel.dataset.mode !== state.mode;
    panel.classList.toggle('inactive', inactive);
  }
  updateReadiness();
}

function setOption(mode, id, value) {
  state.options[mode.id] = modeOptions(mode, { ...state.options[mode.id], [id]: value });
  saveLobbySettings();
  updateAttendanceStatus();
  syncStage();
}

/** The controls a mode's options can use (see modes.js). Each returns the element for one option. */
const OPTION_CONTROLS = {
  /** A stepped slider with a read-out and a scale (the race length). */
  range(mode, option) {
    const id = `opt-${mode.id}-${option.id}`;
    const wrap = el('div', 'option range-option');
    const head = el('div', 'option-head');
    const label = el('label', 'option-label', option.label);
    label.htmlFor = id;
    const output = el('output', 'option-value');
    output.htmlFor = id;
    head.append(label, output);
    const input = document.createElement('input');
    input.type = 'range';
    input.id = id;
    input.min = 0;
    input.max = option.steps.length - 1;
    input.step = 1;
    input.value = Math.max(0, option.steps.findIndex((step) => step.value === state.options[mode.id][option.id]));
    const scale = el('div', 'range-scale');
    scale.setAttribute('aria-hidden', 'true');
    for (const step of option.steps) scale.append(el('span', null, step.label));
    const show = () => {
      const index = Number(input.value);
      const step = option.steps[index];
      const text = `${step.text ?? step.label}${step.value === option.default ? ' (default)' : ''}`;
      output.textContent = text;
      input.setAttribute('aria-valuetext', text);
      input.style.setProperty('--fill', `${(index / (option.steps.length - 1)) * 100}%`);
    };
    input.addEventListener('input', () => {
      setOption(mode, option.id, option.steps[Number(input.value)].value);
      show();
    });
    show();
    wrap.append(head, input, scale);
    return wrap;
  },

  /**
   * A pill toggle (Classic | HD): one button per choice, the chosen one pressed. Every choice is its own
   * Tab stop; Space or Enter chooses it.
   */
  segmented(mode, option) {
    const name = `opt-${mode.id}-${option.id}`;
    const wrap = el('div', 'option segmented-option');
    const label = el('span', 'option-label', option.label);
    label.id = `${name}-label`;
    const group = el('div', 'segments');
    group.setAttribute('role', 'group');
    group.setAttribute('aria-labelledby', label.id);
    group.dataset.option = `${mode.id}-${option.id}`;
    for (const choice of option.choices) {
      const segment = el('button', 'segment');
      segment.type = 'button';
      segment.dataset.value = choice.value;
      segment.setAttribute('aria-pressed', String(state.options[mode.id][option.id] === choice.value));
      const tick = el('span', 'tick', '✓');
      tick.setAttribute('aria-hidden', 'true');
      segment.append(tick, el('span', null, choice.label));
      segment.addEventListener('click', () => {
        setOption(mode, option.id, choice.value);
        for (const other of group.children) other.setAttribute('aria-pressed', String(other === segment));
      });
      group.append(segment);
    }
    wrap.append(label, group);
    return wrap;
  },

  /** A secondary link (Preview wrestlers ›). */
  link(mode, option) {
    const link = el('a', 'link option-link', option.label);
    link.href = option.href;
    const arrow = el('span', null, ' ›');
    arrow.setAttribute('aria-hidden', 'true');
    link.append(arrow);
    return link;
  },
};

/** One mode's options panel: heading, tagline, its controls, and How to play. */
function renderOptions(mode) {
  const panel = el('section', 'mode-config');
  panel.dataset.mode = mode.id;
  panel.classList.toggle('inactive', mode.id !== state.mode);
  const heading = el('h3', 'area-title', `${mode.verb[0].toUpperCase()}${mode.verb.slice(1)} options`);
  heading.id = `options-${mode.id}-title`;
  panel.setAttribute('aria-labelledby', heading.id);
  const intro = el('div');
  intro.append(heading, el('p', 'mode-tagline', mode.tagline));
  panel.append(intro);
  for (const option of mode.options) panel.append(OPTION_CONTROLS[option.type](mode, option));
  const template = document.getElementById(`guide-${mode.guide}`);
  if (template) {
    const btn = el('button', 'link how-to-play-btn', 'How to play');
    btn.type = 'button';
    btn.addEventListener('click', () => openGuide(mode, btn));
    panel.append(btn);
  }
  return panel;
}

/** The mode cards and every mode's options panel, built once from the registry (modes.js). */
function renderModes() {
  for (const mode of MODES) {
    // One button per game, pressed when selected: every card is a Tab stop, and Space or Enter (or a
    // click) selects it. Selecting only selects; Start launches.
    const card = el('button', 'mode-card');
    card.type = 'button';
    card.dataset.mode = mode.id;
    card.setAttribute('aria-pressed', String(mode.id === state.mode));
    card.addEventListener('click', () => {
      if (state.mode !== mode.id) {
        sfx.unlock();
        sfx.play('switch', 0.05);
      }
      selectMode(mode.id);
    });
    const icon = el('span', 'mode-icon', mode.icon);
    const check = el('span', 'mode-check', '✓');
    icon.setAttribute('aria-hidden', 'true');
    check.setAttribute('aria-hidden', 'true');
    card.append(icon, el('span', 'mode-name', mode.name), el('span', 'mode-players', playersText(mode)), check);
    $('mode-cards').append(card);
    $('mode-options').append(renderOptions(mode));
  }
  $('mode-prev')?.addEventListener('click', () => {
    setModePage(modePage - 1);
    sfx.unlock();
    sfx.play('tick', 0.04);
  });
  $('mode-next')?.addEventListener('click', () => {
    setModePage(modePage + 1);
    sfx.unlock();
    sfx.play('tick', 0.04);
  });
  const activeIdx = Math.max(0, MODES.findIndex((m) => m.id === state.mode));
  setModePage(Math.floor(activeIdx / modesPerPage()));
  window.addEventListener('resize', () => {
    const idx = Math.max(0, MODES.findIndex((m) => m.id === state.mode));
    setModePage(Math.floor(idx / modesPerPage()));
  });
}

function setAll(present) {
  attendanceRestored = false;
  for (const entry of state.roster) {
    if (!entry.eligible) continue;
    if (present) state.absent.delete(nameKey(entry.name));
    else state.absent.add(nameKey(entry.name));
  }
  saveLobbySettings();
  renderLobby();
}

// ------------------------------------------------------------------ starting a mode

/**
 * Starts `mode` with its selected options. Click and Enter share this guard: only from the lobby (not
 * while another game is loading), and only if the headcount fits the mode now.
 */
async function start(mode) {
  if (state.phase !== 'lobby') return;
  const storedNames = selectRacers(state.roster, state.absent);
  if (!fitsPlayers(mode, storedNames.length)) return;
  state.raceNames = new Map(storedNames.map((name) => [show(name), name]));
  state.progress = '';
  sfx.unlock();
  await mode.start({
    names: storedNames.map(show),
    sittingOut: state.winners.map((w) => show(w.name)),
    rng: seed === null ? cryptoRandom : mulberry32(seed),
    game,
    hud,
    sfx,
    get phase() { return state.phase; },
    setPhase: (phase) => {
      state.phase = phase;
      updateReadiness();
    },
    setProgress: (text) => {
      state.progress = text;
      updateReadiness();
    },
    hideLobby,
    showQuit: (label) => {
      $('quit').textContent = label;
      $('quit').hidden = false;
    },
    hideQuit: () => { $('quit').hidden = true; },
    quit: backToLobby,
    saveWinner: (name) => saveWinner(stored(name), mode.winMode),
  }, state.options[mode.id]);
}

function startSelected() {
  if (!$('start').disabled) start(findMode(state.mode));
}

function pick() {
  if (state.phase !== 'lobby') return;
  const rng = seed === null ? cryptoRandom : mulberry32(seed);
  const winner = pickRandomRacer(state.roster, state.absent, rng);
  if (!winner) return;
  state.phase = 'results';
  $('lobby').hidden = true;
  hud.showWinner(show(winner), null, null, 0, 'Random pick — no game played.');
  saveWinner(winner, 'skip');
}

function backToLobby() {
  clearTimeout(launchTimer);
  $('lobby').classList.remove('launching');
  game?.clearRace();
  $('reset-status').hidden = true;
  if ($('plinko-ticker')) $('plinko-ticker').hidden = true;
  if ($('freeze-banner')) $('freeze-banner').hidden = true;
  hud.end();
  $('quit').hidden = true;
  $('lobby').hidden = false;
  state.phase = 'lobby';
  state.pendingWinner = null;
  // Focus goes back to the setup (Start, ready to go again), and once the team list has reloaded, to the
  // selected card if Start can no longer be used (the winner now sits out).
  updateReadiness();
  focusSetup();
  loadState().then(() => {
    if (!$('lobby').contains(document.activeElement) || document.activeElement.disabled) focusSetup();
  });
}

/**
 * Exit: stops the app (the local server) and shows a "closed" screen. Winners are saved as soon as
 * they're picked, so there's nothing to lose. If the server has already gone, the app is closed anyway.
 */
async function exitApp() {
  state.phase = 'exiting';
  $('exit-app').disabled = true;
  // Let go of the keep-alive connection first, so the server isn't cutting it off mid-stream.
  endSession();
  try {
    await api('api/exit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  } catch (err) {
    // "Lost connection" means the server is already gone; anything else, it's still running.
    if (!/Lost connection/.test(err.message)) {
      state.phase = 'lobby';
      resumeSession();
      $('exit-app').disabled = false;
      $('status').innerHTML = '';
      const p = document.createElement('p');
      p.className = 'error-text';
      p.textContent = `Could not close the app: ${err.message}`;
      $('status').append(p);
      return;
    }
  }
  game?.stop();
  $('lobby').hidden = true;
  $('scene').hidden = true;
  $('toolbar').hidden = true;
  if (DEMO) $('closed-text').textContent = 'Your team list and winners stay saved in this browser. You can close this tab, or reload it to play again.';
  $('closed').hidden = false;
  // A tab the app opened itself may close; most browsers keep other tabs open, and the message stays.
  window.close();
}

/** Shows the app's version next to its name in the lobby (stays hidden if the server doesn't say). */
async function showVersion() {
  try {
    const { version } = await api('/api/version');
    if (typeof version !== 'string' || !version) return;
    const el = $('app-version');
    el.textContent = `v${version}`;
    el.hidden = false;
  } catch {
    /* an older server without /api/version: just leave it out */
  }
}

function init() {
  try {
    game = new Game(
      $('scene'),
      {
        onCountdown: (text) => hud.countdown(text),
        onFrame: (sim) => hud.frame(sim),
        onEvent: (event) => hud.event(event),
      },
      sfx,
    );
    // Exposed for debugging from the browser console.
    window.derby = game;
  } catch (err) {
    console.warn('3D could not start, falling back to instant results.', err);
    game = null;
    $('scene').hidden = true;
  }

  showVersion();
  if (DEMO) {
    // The public demo: say so, and that everything stays in this browser.
    $('demo-badge').hidden = false;
    $('demo-note').hidden = false;
  }
  renderModes();
  // Stage non-race modes immediately so returning from Edit team / Full history never flashes the bridge.
  const initialMode = findMode(state.mode);
  if (game && initialMode.stagePreview && initialMode.id !== 'race') {
    try { initialMode.stagePreview(game, { names: [], options: state.options[initialMode.id] }); } catch { /* handled on loadState */ }
  }
  updateReadiness();

  $('start').addEventListener('click', startSelected);
  $('surprise-mode').addEventListener('click', surpriseMode);
  $('team-toggle').addEventListener('click', () => setTeamOpen($('roster-section').classList.contains('collapsed')));
  $('drawer-toggle').addEventListener('click', () => setDrawerOpen($('roster-section').classList.contains('drawer-collapsed')));
  $('pick').addEventListener('click', pick);
  $('exit-app').addEventListener('click', exitApp);
  $('check-all').addEventListener('click', () => setAll(true));
  $('check-none').addEventListener('click', () => setAll(false));
  $('back').addEventListener('click', backToLobby);
  $('reset-winners').addEventListener('click', confirmResetWinners);
  $('reset-dialog').addEventListener('close', () => {
    if ($('reset-dialog').returnValue === 'reset') resetWinners();
    else $('reset-winners').focus({ preventScroll: true });
  });
  $('guide-close').addEventListener('click', () => $('guide-dialog').close());
  $('guide-dialog').addEventListener('click', (e) => {
    if (e.target === $('guide-dialog')) $('guide-dialog').close();
  });
  $('guide-dialog').addEventListener('close', () => {
    if (document.activeElement === document.body || $('guide-dialog').contains(document.activeElement)) {
      guideReturnFocus?.focus?.({ preventScroll: true });
    }
    guideReturnFocus = null;
  });
  $('quit').addEventListener('click', backToLobby);
  $('retry-save').addEventListener('click', () => state.pendingWinner && saveWinner(state.pendingWinner, state.pendingMode));

  const mute = $('mute');
  const showMute = () => {
    mute.textContent = sfx.muted ? '🔇' : '🔊';
    mute.setAttribute('aria-pressed', String(sfx.muted));
  };
  mute.addEventListener('click', () => {
    sfx.unlock();
    sfx.setMuted(!sfx.muted);
    showMute();
  });
  showMute();

  document.addEventListener('keydown', (e) => {
    // Enter starts the selected game (if the headcount fits it) from anywhere in the lobby, including a
    // slider, but not from a button (a game card or choice, which Enter selects), link, checkbox or text field.
    const choice = e.target.matches?.('#lobby input[type="range"]');
    if (e.key === 'Enter' && state.phase === 'lobby' && (choice || !e.target.closest('button, summary, a, input, textarea, select'))) {
      e.preventDefault();
      startSelected();
    } else if (e.key.toLowerCase() === 'm' && !e.target.closest('input, textarea, select, [contenteditable]') && !e.ctrlKey && !e.metaKey && !e.altKey) {
      mute.click();
    } else if (e.key.toLowerCase() === 'h' && state.phase === 'lobby' && !e.target.closest('input, textarea, select, [contenteditable]') && !e.ctrlKey && !e.metaKey && !e.altKey) {
      setDrawerOpen($('roster-section').classList.contains('drawer-collapsed'));
    }
  });

  window.addEventListener('pageshow', (event) => {
    if (event.persisted && state.phase === 'lobby') loadState();
  });
  loadState();
}

init();
