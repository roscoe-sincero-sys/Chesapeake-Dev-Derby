// App entry point: loads the roster, runs the lobby, starts races and saves the winner.

import { Game, runHeadless } from './game.js';
import { Hud } from './hud.js';
import { Sfx } from './audio.js';
import { RACER_KINDS } from './racers.js';
import { buildRoster, selectRacers, pickRandomRacer, nameKey } from './eligibility.js';
import { mulberry32 } from './sim.js';
import { readLobbySettings, writeLobbySettings, retainRosterAbsences, normalizeSpeed } from './lobby-settings.js';

const $ = (id) => document.getElementById(id);

// Optional URL switches, handy for demos and testing:
//   ?seed=123   replay the same race every time
//   ?speed=3    run the race faster (1 to 7)
const params = new URLSearchParams(location.search);
const seed = params.has('seed') ? Number(params.get('seed')) || 0 : null;
const savedSettings = readLobbySettings();
let speed = params.has('speed') ? normalizeSpeed(Number(params.get('speed')) || 2) : savedSettings.speed;
let attendanceRestored = savedSettings.absent.size > 0;
let settingsSaved = true;

const state = {
  names: [],
  winners: [],
  roster: [],
  absent: savedSettings.absent, // unticked nameKeys, retained within this browser tab
  phase: 'lobby', // lobby | race | results
  pendingWinner: null,
  raceStartedAt: null,
};

const sfx = new Sfx();
const hud = new Hud();
let game = null;

// ------------------------------------------------------------------ server

async function api(path, options) {
  let response;
  try {
    response = await fetch(path, options);
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
    $('run').disabled = $('pick').disabled = true;
  }
}

async function saveWinner(name) {
  state.pendingWinner = name;
  hud.saveStatus('Saving the result…');
  try {
    const data = await api('/api/winners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    state.winners = data.winners;
    state.pendingWinner = null;
    hud.saveStatus(`Saved. ${name} sits out the next three races.`, 'ok');
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
  for (const entry of state.roster) {
    const key = nameKey(entry.name);
    const li = document.createElement('li');
    const label = document.createElement('label');
    const box = document.createElement('input');
    box.type = 'checkbox';
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = entry.name;
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
      label.title = `${entry.name} won recently — eligible again in ${wait} race${wait === 1 ? '' : 's'}.`;
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
    li.textContent = `🏆 ${winner.name}`;
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
  updateRunButton();
}

function saveLobbySettings() {
  settingsSaved = writeLobbySettings({ absent: state.absent, speed });
}

function updateAttendanceStatus() {
  const count = state.absent.size;
  const parts = [];
  if (count) parts.push(`${count} ${count === 1 ? 'person' : 'people'} ${attendanceRestored ? 'still ' : ''}marked absent.`);
  if (!settingsSaved) parts.push('Browser storage is unavailable. Attendance and speed cannot be kept after leaving or reloading this page.');
  $('attendance-status').textContent = parts.join(' ');
  $('attendance-status').hidden = !parts.length;
}

function updateRunButton() {
  updateAttendanceStatus();
  const racing = selectRacers(state.roster, state.absent).length;
  $('racer-count').textContent = `${racing} racing`;
  $('run').disabled = $('pick').disabled = racing < 2;
  $('run-hint').textContent = racing < 2 ? 'Select at least two racers.' : `${racing} racers on the grid — may the best tab win.`;
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

// ------------------------------------------------------------------ racing

function run() {
  if (state.phase !== 'lobby') return;
  const racers = selectRacers(state.roster, state.absent);
  if (racers.length < 2) return;
  sfx.unlock();
  const rng = seed === null ? Math.random : mulberry32(seed);
  state.phase = 'race';
  $('lobby').hidden = true;

  if (!game) {
    // No WebGL: decide the race instantly and go straight to the result.
    const started = performance.now();
    const sim = runHeadless(racers, rng);
    const elapsed = (performance.now() - started) / 1000;
    hud.showWinner(sim.winner.name, null, elapsed, 0, `Race completed off-screen in ${elapsed.toFixed(1)}s.`);
    sim.standings().slice(1, 3).forEach((r, i) => hud.podium(i + 2, r.name));
    state.phase = 'results';
    saveWinner(sim.winner.name);
    return;
  }

  const lineup = game.startRace(racers, { rng, timeScale: speed });
  hud.begin(lineup);
  $('quit').hidden = false;
}

function pick() {
  if (state.phase !== 'lobby') return;
  const rng = seed === null ? Math.random : mulberry32(seed);
  const winner = pickRandomRacer(state.roster, state.absent, rng);
  if (!winner) return;
  state.phase = 'results';
  $('lobby').hidden = true;
  hud.showWinner(winner, null, null, 0, 'Random pick - race skipped.');
  saveWinner(winner);
}

function backToLobby() {
  game?.clearRace();
  hud.end();
  $('quit').hidden = true;
  $('lobby').hidden = false;
  state.phase = 'lobby';
  state.pendingWinner = null;
  loadState();
  $('run').focus({ preventScroll: true });
}

function init() {
  try {
    game = new Game(
      $('scene'),
      {
        onCountdown: (text) => hud.countdown(text),
        onRaceStart: () => { state.raceStartedAt = performance.now(); },
        onFrame: (sim) => hud.frame(sim),
        onEvent: (event) => hud.event(event),
        onWinner: (racer, kind) => {
          state.phase = 'results';
          $('quit').hidden = true;
          const elapsed = (performance.now() - state.raceStartedAt) / 1000;
          hud.showWinner(racer.name, kind, elapsed, 2600 / speed);
          // Save immediately, so the result is recorded even if the tab is closed.
          saveWinner(racer.name);
        },
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

  const slider = $('race-speed');
  const showSpeed = () => {
    speed = Number(slider.value);
    const length = `About ${Math.round(50 / speed)} seconds${speed === 2 ? ' (default)' : ''}`;
    $('speed-value').textContent = length;
    slider.setAttribute('aria-valuetext', length);
    slider.style.setProperty('--fill', `${(speed - 1) / 6 * 100}%`);
    saveLobbySettings();
    updateAttendanceStatus();
  };
  slider.value = speed;
  slider.addEventListener('input', showSpeed);
  showSpeed();

  $('run').addEventListener('click', run);
  $('pick').addEventListener('click', pick);
  $('check-all').addEventListener('click', () => setAll(true));
  $('check-none').addEventListener('click', () => setAll(false));
  $('back').addEventListener('click', backToLobby);
  $('quit').addEventListener('click', backToLobby);
  $('retry-save').addEventListener('click', () => state.pendingWinner && saveWinner(state.pendingWinner));

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
      run();
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
