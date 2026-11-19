// App entry point: loads the roster, runs the lobby, starts races and saves the winner.

import { Game, runHeadless } from './game.js';
import { Hud, who } from './hud.js';
import { prepareWrestlerModels } from './wrestlers.js';
import { planMatch, MIN_WRESTLERS, MAX_WRESTLERS, WRESTLER_KINDS } from './wrestle-sim.js';
import { Sfx } from './audio.js';
import { RACER_KINDS } from './racers.js';
import { buildRoster, selectRacers, pickRandomRacer, nameKey, displayNames, sortByDisplayName, selectAbsentees } from './eligibility.js';
import { mulberry32 } from './sim.js';
import { apiFetch, DEMO } from './api.js';
import { endSession, resumeSession } from './session.js';
import { readLobbySettings, writeLobbySettings, retainRosterAbsences, normalizeSpeed, RACE_LENGTHS, DEFAULT_SPEED, speedToStep, stepToSpeed } from './lobby-settings.js';

const $ = (id) => document.getElementById(id);


// Optional URL switches, handy for demos and testing:
//   ?seed=123   replay the same race every time
//   ?speed=4    starting race speed: 1, 2, 4, 8 or 12 (other values snap to the nearest)
const params = new URLSearchParams(location.search);
const seed = params.has('seed') ? Number(params.get('seed')) || 0 : null;
const savedSettings = readLobbySettings();
let speed = params.has('speed') ? normalizeSpeed(Number(params.get('speed')) || DEFAULT_SPEED) : savedSettings.speed;
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
  phase: 'lobby', // lobby | race | results
  pendingWinner: null,
  raceStartedAt: null,
};

/** The on-screen form of a stored name. */
const show = (name) => state.shown.get(nameKey(name)) ?? name;
/** The stored name behind a name shown in the race. */
const stored = (name) => state.raceNames.get(name) ?? name;

const sfx = new Sfx();
const hud = new Hud();
let game = null;

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
    $('run').disabled = $('pick').disabled = true;
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
 * When the lobby first opens, put keyboard focus on Start race, so Enter still starts the race.
 * If there aren't enough racers yet, use the first usable control in the lobby panel instead.
 * Only on first load, and never if the user has already moved focus somewhere.
 */
function focusLobbyOnce() {
  if (initialFocusDone) return;
  initialFocusDone = true;
  if (document.activeElement && document.activeElement !== document.body) return;
  const target = !$('run').disabled
    ? $('run')
    : $('lobby').querySelector('button:not([disabled]):not([hidden]), a[href], input:not([disabled]), summary');
  target?.focus({ preventScroll: true });
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
  // aria-disabled (not disabled) keeps the count limit's explanation reachable.
  const canWrestle = racing >= MIN_WRESTLERS && racing <= MAX_WRESTLERS;
  const explanation = canWrestle
    ? `You need ${MIN_WRESTLERS} to ${MAX_WRESTLERS} wrestlers. ${racing} ready to wrestle.`
    : `You need ${MIN_WRESTLERS} to ${MAX_WRESTLERS} wrestlers. ${racing} ${racing === 1 ? 'is' : 'are'} checked.`;
  for (const [id, description] of [['wrestle', 'Original character models.'], ['wrestle-hd', 'Detailed character models.']]) {
    $(id).setAttribute('aria-disabled', String(!canWrestle || state.phase === 'loading'));
    $(`${id}-tip`).textContent = `${description} ${explanation}`;
  }
  $('run-hint').textContent = racing < 2 ? 'Select at least two racers.' : `${racing} racers on the grid — may the best tab win. Let's go see it in your virtual meeting room.`;
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
  const racers = selectRacers(state.roster, state.absent).map(show);
  if (racers.length < 2) return;
  state.raceNames = new Map(selectRacers(state.roster, state.absent).map((name) => [show(name), name]));
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
    saveWinner(stored(sim.winner.name), 'race');
    return;
  }

  const lineup = game.startRace(racers, { rng, timeScale: speed });
  hud.begin(lineup);
  $('quit').textContent = '✕ Quit race';
  $('quit').hidden = false;
}

// ------------------------------------------------------------------ wrestling

/** Feed lines for a ring-out, in the thrower's style. */
const THROW_TEXT = {
  overhead: (h, v) => `${who(h)} (Bhima) lifted ${who(v)} overhead and tossed them out`,
  bruiser: (h, v) => `${who(h)} (Kichaka) muscled ${who(v)} over the top rope`,
  patient: (h, v) => `${who(h)} (Karna) turned ${who(v)}'s charge into a throw over the ropes`,
  composed: (h, v) => `${who(h)} (Shikhandi) caught ${who(v)} off balance and over the ropes`,
  illusion: (h, v) => `${who(h)} (Ghatotkacha) feinted with an illusion, then threw ${who(v)} out`,
  crowd: (h, v) => `${who(h)} (Dushasana) crowded ${who(v)} into the ropes and over`,
  rebound: (h, v) => `${who(h)} (Satyaki) came off the ropes and took ${who(v)} over the top`,
};

/** How the close call ends, by who's on the ropes (or who is pulling them back). */
function closeCallText(w, other) {
  const saved = {
    counter: 'slips free at the ropes!',
    duck: 'ducks out low under the ropes!',
    shapeshift: 'changes form and slips free!',
  }[w.kind.style] ?? (other.kind.style === 'centre' ? `is pulled back to the centre by ${other.kind.label}!` : 'hangs on at the ropes!');
  return `Close call — ${who(w)} ${saved}`;
}

/** Rumble shares one set of rules; model style only selects the character renderer. */
async function wrestle(modelStyle = 'classic') {
  if (state.phase !== 'lobby') return;
  const storedNames = selectRacers(state.roster, state.absent);
  if (storedNames.length < MIN_WRESTLERS || storedNames.length > MAX_WRESTLERS) return;
  const names = storedNames.map(show);
  state.raceNames = new Map(storedNames.map((name) => [show(name), name]));
  sfx.unlock();
  let useStyle = modelStyle;
  let hdFallback = false;
  if (game && modelStyle === 'hd') {
    state.phase = 'loading';
    $('status').textContent = 'Preparing HD characters…';
    $('wrestle').setAttribute('aria-disabled', 'true');
    $('wrestle-hd').setAttribute('aria-disabled', 'true');
    try {
      await prepareWrestlerModels();
      $('status').textContent = '';
    } catch (error) {
      console.warn('Free character assets unavailable; using the original roster.', error);
      $('status').textContent = 'Character models could not load. Using the original wrestlers for this match.';
      useStyle = 'classic';
      hdFallback = true;
    }
    if (state.phase !== 'loading') return;
  }
  const rng = seed === null ? Math.random : mulberry32(seed);
  state.phase = 'race';
  $('lobby').hidden = true;

  if (!game) {
    // No WebGL: the same draw, decided instantly.
    const plan = planMatch(names, rng);
    const winner = plan.wrestlers[plan.winner];
    hud.showWinner(winner.name, null, null, 0, `Won the battle royal as ${winner.kind.label} (decided off-screen).`, { kicker: 'Leads today’s standup' });
    state.phase = 'results';
    saveWinner(stored(winner.name), 'wrestle');
    return;
  }

  const lineup = game.startWrestle(names, {
    rng,
    modelStyle: useStyle,
    onEvent: (e) => {
      if (e.type === 'bell') hud.note('🔔 Ding ding! Last one in the ring leads today’s standup.', true);
      else if (e.type === 'out') {
        hud.wrestleOut(e.victim.id);
        hud.outCallout(e.victim.name);
        hud.note(THROW_TEXT[e.thrower.kind.style]?.(e.thrower, e.victim) ?? `${who(e.thrower)} (${e.thrower.kind.label}) threw ${who(e.victim)} over the top rope`);
      } else if (e.type === 'final') hud.note(`Final two: ${who(e.pair[0])} vs ${who(e.pair[1])}`, true);
      else if (e.type === 'closeCall') hud.note(closeCallText(e.wrestler, e.other)); else if (e.type === 'showman') hud.note(`${who(e.wrestler)} plays to the crowd 👑`);
    },
    onWinner: (w) => {
      state.phase = 'results';
      $('quit').hidden = true;
      hud.callout(`${w.name} leads today’s standup!`, 2400);
      hud.showWinner(w.name, null, null, 2600, `Won the battle royal as ${w.kind.label}`, {
        kicker: 'Leads today’s standup',
        // The card says who won as whom: fade the floating name tags so they don't compete with it.
        onShown: () => game?.wrestle?.fadeNameTags(),
      });
      saveWinner(stored(w.name), 'wrestle');
    },
  });
  hud.beginWrestle(lineup);
  if (hdFallback) hud.note('HD models could not load. This match uses the original models.', true);
  $('quit').textContent = '✕ Quit match';
  $('quit').hidden = false;
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
  $('run').focus({ preventScroll: true });
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
        onRaceStart: () => { state.raceStartedAt = performance.now(); },
        onFrame: (sim) => hud.frame(sim),
        onEvent: (event) => hud.event(event),
        onWinner: (racer, kind) => {
          state.phase = 'results';
          $('quit').hidden = true;
          const elapsed = (performance.now() - state.raceStartedAt) / 1000;
          hud.showWinner(racer.name, kind, elapsed, 2600 / speed);
          // Save immediately, so the result is recorded even if the tab is closed.
          saveWinner(stored(racer.name), 'race');
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
    speed = stepToSpeed(step);
    const { seconds } = RACE_LENGTHS[step];
    const length = `About ${seconds} seconds${speed === DEFAULT_SPEED ? ' (default)' : ''}`;
    $('speed-value').textContent = length;
    slider.setAttribute('aria-valuetext', length);
    slider.style.setProperty('--fill', `${(step / (RACE_LENGTHS.length - 1)) * 100}%`);
    saveLobbySettings();
    updateAttendanceStatus();
  };
  slider.value = speedToStep(speed);
  slider.addEventListener('input', showSpeed);
  showSpeed();

  $('run').addEventListener('click', run);
  for (const [id, style] of [['wrestle', 'classic'], ['wrestle-hd', 'hd']]) {
    $(id).addEventListener('click', () => {
      if ($(id).getAttribute('aria-disabled') !== 'true') wrestle(style);
    });
  }
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
