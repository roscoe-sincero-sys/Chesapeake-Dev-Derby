// App entry point: loads the roster, runs the lobby, starts the selected game mode and saves the winner.
// The modes themselves (race, rumble) live in modes.js.

import { Game } from './game.js';
import { Hud } from './hud.js';
import { WRESTLER_KINDS } from './wrestle-sim.js';
import { Sfx } from './audio.js';
import { RACER_KINDS } from './racers.js';
import { buildRoster, selectRacers, pickRandomRacer, nameKey, displayNames, sortByDisplayName, selectAbsentees } from './eligibility.js';
import { mulberry32 } from './sim.js';
import { apiFetch, DEMO } from './api.js';
import { endSession, resumeSession } from './session.js';
import { readLobbySettings, writeLobbySettings, retainRosterAbsences } from './lobby-settings.js';
import { normalizeSpeed, RACE_LENGTHS, DEFAULT_SPEED, speedToStep, stepToSpeed } from './race-lengths.js';
import { MODES, findMode, fitsPlayers, modeOptions } from './modes.js';

const $ = (id) => document.getElementById(id);


// Optional URL switches, handy for demos and testing:
//   ?seed=123     replay the same race every time
//   ?speed=4      starting race speed: 1, 2, 4, 8 or 12 (other values snap to the nearest)
//   ?mode=rumble  starting game mode: race or rumble (an unknown mode is ignored)
//   ?test         expose the game and HUD as window.derbyTest (the browser tests use it)
const params = new URLSearchParams(location.search);
const seed = params.has('seed') ? Number(params.get('seed')) || 0 : null;
const savedSettings = readLobbySettings();
if (params.has('speed')) savedSettings.options.race.speed = normalizeSpeed(Number(params.get('speed')) || DEFAULT_SPEED);
if (MODES.some((mode) => mode.id === params.get('mode'))) savedSettings.mode = params.get('mode');
let attendanceRestored = savedSettings.absent.size > 0;
let settingsSaved = true;
let initialFocusDone = false;

const state = {
  names: [],
  winners: [],
  roster: [],
  shown: new Map(), // nameKey -> on-screen name (email addresses shortened when unambiguous)
  raceNames: new Map(), // on-screen name -> stored name, for the race in progress
  absent: savedSettings.absent, // unticked nameKeys, retained within this browser tab
  mode: savedSettings.mode, // the selected mode's id, retained within this browser tab
  options: savedSettings.options, // each mode's option values: { race: { speed }, rumble: { models } }
  phase: 'lobby', // lobby | loading | race | results | exiting
  pendingWinner: null,
};

/**
 * The lobby's launch buttons, until mode cards replace them (#117): each starts a mode with some of its
 * options preset. Buttons with a `tip` use aria-disabled rather than disabled when the headcount doesn't
 * fit, so they stay focusable and the tooltip explaining the player limit can still be read.
 */
const LAUNCHERS = [
  { id: 'run', mode: 'race', options: {} },
  { id: 'wrestle', mode: 'rumble', options: { models: 'classic' }, tip: 'Original character models.' },
  { id: 'wrestle-hd', mode: 'rumble', options: { models: 'hd' }, tip: 'Detailed character models.' },
];

/** The launch button for the selected mode and options (Enter, and focus on opening the lobby). */
function selectedLauncher() {
  const options = state.options[state.mode] ?? {};
  return LAUNCHERS.find((launcher) => launcher.mode === state.mode
    && Object.entries(launcher.options).every(([id, value]) => options[id] === value)) ?? LAUNCHERS[0];
}

function launcherBlocked(launcher) {
  const button = $(launcher.id);
  return button.disabled || button.getAttribute('aria-disabled') === 'true';
}

function setLauncherBlocked(launcher, blocked) {
  if (launcher.tip) $(launcher.id).setAttribute('aria-disabled', String(blocked));
  else $(launcher.id).disabled = blocked;
}

/** The on-screen form of a stored name. */
const show = (name) => state.shown.get(nameKey(name)) ?? name;
/** The stored name behind a name shown in the race. */
const stored = (name) => state.raceNames.get(name) ?? name;

const sfx = new Sfx();
const hud = new Hud();
let game = null;
if (params.has('test')) window.derbyTest = { hud, get game() { return game; } };

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
    const data = await api('/api/state');
    state.names = data.names;
    state.shown = displayNames(state.names);
    state.absent = retainRosterAbsences(state.absent, state.names);
    saveLobbySettings();
    state.winners = data.winners;
    state.roster = buildRoster(state.names, state.winners);
    status.className = '';
    status.replaceChildren();
    const notes = [...data.warnings];
    if (!game) notes.unshift('3D is not available in this browser, so the race will be run off-screen and the winner shown straight away.');
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
    $('recent-section').hidden = true;
    $('reset-winners').hidden = true;
    for (const launcher of LAUNCHERS) setLauncherBlocked(launcher, true);
    $('pick').disabled = true;
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
    // A wrestling win isn't a race: the three-pick rule applies however someone won.
    hud.saveStatus(`Saved. ${show(name)} sits out the next three ${mode === 'wrestle' ? 'picks' : 'races'}.`, 'ok');
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
    name.textContent = show(entry.name);
    name.title = entry.name; // full name on hover (shortened addresses, or long names cut off by the tile)
    label.append(box, name);

    if (entry.eligible) {
      box.checked = !state.absent.has(key);
      li.classList.toggle('absent', !box.checked);
      box.addEventListener('change', () => {
        if (box.checked) state.absent.delete(key);
        else state.absent.add(key);
        li.classList.toggle('absent', !box.checked);
        attendanceRestored = false;
        saveLobbySettings();
        updateRunButton();
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
      badge.textContent = `Sits out ${wait} more race${wait === 1 ? '' : 's'}`;
      const text = document.createElement('span');
      text.className = 'who';
      text.append(name, badge);
      label.append(text);
      label.title = `${show(entry.name)} won recently — eligible again in ${wait} race${wait === 1 ? '' : 's'}.`;
    }
    li.append(label);
    list.append(li);
  }

  const recent = $('recent');
  recent.replaceChildren();
  if (!state.winners.length) {
    const li = document.createElement('li');
    li.className = 'none';
    li.textContent = 'No races yet — everyone is eligible.';
    recent.append(li);
  }
  [...state.winners].reverse().forEach((winner) => {
    const li = document.createElement('li');
    li.textContent = `🏆 ${show(winner.name)}`;
    const when = formatDate(winner.date);
    if (when) {
      const span = document.createElement('span');
      span.className = 'when';
      span.textContent = when;
      li.append(span);
    }
    recent.append(li);
  });

  $('check-all').disabled = $('check-none').disabled = !state.names.length;
  $('recent-section').hidden = !state.names.length;
  $('reset-winners').hidden = !state.winners.length;
  updateRunButton();
}

/** Asks for confirmation, then clears the recent-winner list so everyone is eligible again. */
function confirmResetWinners() {
  const dialog = $('reset-dialog');
  if (typeof dialog.showModal !== 'function') {
    // Very old browsers without <dialog>: fall back to the built-in confirm box.
    if (window.confirm('Reset the last three winners? Everyone will be able to race again.')) resetWinners();
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
    status.textContent = 'List reset. Everyone can race again.';
    $('check-all').focus({ preventScroll: true });
  } catch (err) {
    status.className = 'hint error-text';
    status.textContent = `Could not reset the list: ${err.message}`;
  }
}

/**
 * When the lobby first opens, put keyboard focus on the selected mode's start button (Start race unless
 * this tab last played something else), so Enter starts it. If the headcount doesn't fit that mode, use
 * the first usable control in the lobby panel instead.
 * Only on first load, and never if the user has already moved focus somewhere.
 */
function focusLobbyOnce() {
  if (initialFocusDone) return;
  initialFocusDone = true;
  if (document.activeElement && document.activeElement !== document.body) return;
  const launcher = selectedLauncher();
  const target = !launcherBlocked(launcher)
    ? $(launcher.id)
    : $('lobby').querySelector('button:not([disabled]):not([hidden]):not([aria-disabled="true"]), a[href], input:not([disabled]), summary');
  target?.focus({ preventScroll: true });
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

function updateRunButton() {
  updateAttendanceStatus();
  const ready = selectRacers(state.roster, state.absent).length;
  $('racer-count').textContent = `${ready} racing`;
  $('pick').disabled = ready < 2;
  // While a mode loads (HD models), no other launch can start.
  const loading = state.phase === 'loading';
  for (const launcher of LAUNCHERS) {
    const mode = findMode(launcher.mode);
    const fits = fitsPlayers(mode, ready);
    setLauncherBlocked(launcher, !fits || loading);
    if (launcher.tip) {
      const { min, max } = mode.players;
      $(`${launcher.id}-tip`).textContent = `${launcher.tip} You need ${min} to ${max} wrestlers. ${fits ? `${ready} ready to wrestle.` : `${ready} ${ready === 1 ? 'is' : 'are'} checked.`}`;
    }
  }
  $('run-hint').textContent = ready < 2 ? 'Select at least two racers.' : findMode('race').ready(ready);
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
 * Starts `mode` with these option values (merged into its saved ones, which become this tab's choice).
 * Click and Enter share this guard: only from the lobby, and only if the headcount fits the mode now.
 */
async function start(mode, options = {}) {
  if (state.phase !== 'lobby') return;
  const storedNames = selectRacers(state.roster, state.absent);
  if (!fitsPlayers(mode, storedNames.length)) return;
  state.mode = mode.id;
  state.options[mode.id] = modeOptions(mode, { ...state.options[mode.id], ...options });
  saveLobbySettings();
  state.raceNames = new Map(storedNames.map((name) => [show(name), name]));
  sfx.unlock();
  await mode.start({
    names: storedNames.map(show),
    rng: seed === null ? Math.random : mulberry32(seed),
    game,
    hud,
    sfx,
    get phase() { return state.phase; },
    setPhase: (phase) => {
      state.phase = phase;
      updateRunButton();
    },
    setStatus: (text) => { $('status').textContent = text; },
    hideLobby: () => { $('lobby').hidden = true; },
    showQuit: (label) => {
      $('quit').textContent = label;
      $('quit').hidden = false;
    },
    hideQuit: () => { $('quit').hidden = true; },
    saveWinner: (name) => saveWinner(stored(name), mode.winMode),
  }, state.options[mode.id]);
}

function launch(launcher) {
  if (!launcherBlocked(launcher)) start(findMode(launcher.mode), launcher.options);
}

function pick() {
  if (state.phase !== 'lobby') return;
  const rng = seed === null ? Math.random : mulberry32(seed);
  const winner = pickRandomRacer(state.roster, state.absent, rng);
  if (!winner) return;
  state.phase = 'results';
  $('lobby').hidden = true;
  hud.showWinner(show(winner), null, null, 0, 'Random pick - race skipped.');
  saveWinner(winner, 'skip');
}

function backToLobby() {
  game?.clearRace();
  $('reset-status').hidden = true;
  hud.end();
  $('quit').hidden = true;
  $('lobby').hidden = false;
  state.phase = 'lobby';
  state.pendingWinner = null;
  loadState();
  // Back on the button that started the game just played.
  $(selectedLauncher().id).focus({ preventScroll: true });
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
    el.title = `Version ${version}`;
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

  $('guide-racers').textContent = RACER_KINDS.map((k) => `${k.emoji} ${k.label}`).join(' · ');
  showVersion();
  if (DEMO) {
    // The public demo: say so, and that everything stays in this browser.
    $('demo-badge').hidden = false;
    $('demo-note').hidden = false;
  }
  $('guide-wrestlers').textContent = WRESTLER_KINDS.map((k) => k.label).join(', ');

  const slider = $('race-speed');
  // The slider steps through the offered race lengths (longest on the left), not raw speeds.
  slider.min = 0;
  slider.max = RACE_LENGTHS.length - 1;
  slider.step = 1;
  const showSpeed = () => {
    const step = Number(slider.value);
    const speed = stepToSpeed(step);
    state.options.race.speed = speed;
    const { seconds } = RACE_LENGTHS[step];
    const length = `About ${seconds} seconds${speed === DEFAULT_SPEED ? ' (default)' : ''}`;
    $('speed-value').textContent = length;
    slider.setAttribute('aria-valuetext', length);
    slider.style.setProperty('--fill', `${(step / (RACE_LENGTHS.length - 1)) * 100}%`);
    saveLobbySettings();
    updateAttendanceStatus();
  };
  slider.value = speedToStep(state.options.race.speed);
  slider.addEventListener('input', showSpeed);
  showSpeed();

  for (const launcher of LAUNCHERS) $(launcher.id).addEventListener('click', () => launch(launcher));
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
    if (e.key === 'Enter' && state.phase === 'lobby' && !e.target.closest('button, summary, a, input, textarea, select')) {
      e.preventDefault();
      // Starts the selected mode (the one this tab last played), if the headcount fits it.
      launch(selectedLauncher());
    } else if (e.key.toLowerCase() === 'm' && !e.target.closest('input, textarea, select, [contenteditable]') && !e.ctrlKey && !e.metaKey && !e.altKey) {
      mute.click();
    }
  });

  window.addEventListener('pageshow', (event) => {
    if (event.persisted && state.phase === 'lobby') loadState();
  });
  loadState();
}

init();
