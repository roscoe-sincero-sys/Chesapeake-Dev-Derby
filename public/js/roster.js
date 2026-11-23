// Roster Studio (#133 phase 3): interactive Roster Chips + Quick Add, Bulk Text / Calendar-Invite
// Paste, live capacity & mode-fit indicators, and live 3D stage preview as teammates change.

// Keyboard users start on the first control on the page.
document.getElementById('back-to-lobby').focus();

import { apiFetch } from './api.js';
import { parseNames, MAX_NAMES } from './data-rules.js';
import { displayNames, nameKey } from './eligibility.js';
import { MODES, findMode, fitsPlayers, playersText } from './modes.js';
import { readLobbySettings } from './lobby-settings.js';
import { startBackground } from './page-common.js';

const $ = (id) => document.getElementById(id);

const form = $('roster-form');
const namesInput = $('names');
const addInput = $('add-name');
const addBtn = $('add-name-btn');
const saveBtn = $('save-names');
const discardBtn = $('discard-names');
const retryBtn = $('reload-names');
const statusEl = $('editor-status');
const parseEl = $('parse-preview');

let savedList = [];
let dirty = false;
let view = 'chips'; // 'chips' | 'bulk'
let stageTimer = null;

async function request(url, options) {
  let response;
  try {
    response = await apiFetch(url, options);
  } catch {
    throw new Error('Lost connection to the app. Ask the host to restart it, then tap Retry.');
  }
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || `Server error (${response.status})`);
  return body;
}

/** Updates the live 3D stage beside the editor so teammates appear/disappear as you edit. */
function syncLiveStage(parsedNames) {
  if (!window.derby) return;
  try {
    const saved = readLobbySettings();
    const mode = findMode(saved.mode);
    if (!mode.stagePreview) return;
    const shown = displayNames(parsedNames);
    const displayList = parsedNames.map((n) => shown.get(nameKey(n)) ?? n);
    mode.stagePreview(window.derby, { names: displayList, options: saved.options[mode.id] });
  } catch {
    /* Non-critical: stage preview must never interfere with editing. */
  }
}

function scheduleStageSync(parsedNames, immediate = false) {
  clearTimeout(stageTimer);
  if (immediate) {
    syncLiveStage(parsedNames);
  } else {
    stageTimer = setTimeout(() => syncLiveStage(parsedNames), 220);
  }
}

function setDirty(next) {
  dirty = next;
  discardBtn.hidden = !dirty;
  if (dirty) {
    statusEl.className = 'studio-status';
    statusEl.textContent = 'Unsaved changes.';
  }
}

function renderParsed({ immediateStage = false } = {}) {
  const { names: parsed, warnings } = parseNames(namesInput.value.split(/\r?\n/));
  $('roster-cap').textContent = `${parsed.length} / ${MAX_NAMES}`;

  // Mode-fit pills: show a compact ready summary and only list modes that don't meet player criteria.
  const strip = $('mode-fit-strip');
  strip.replaceChildren();
  const unfit = MODES.filter((mode) => !fitsPlayers(mode, parsed.length));
  if (unfit.length === 0) {
    const pill = document.createElement('span');
    pill.className = 'fit-pill ok';
    pill.textContent = `✓ All ${MODES.length} games ready`;
    strip.append(pill);
  } else if (unfit.length === MODES.length) {
    const pill = document.createElement('span');
    pill.className = 'fit-pill warn';
    pill.textContent = '⚠ Add at least 2 teammates to play';
    strip.append(pill);
  } else {
    const summary = document.createElement('span');
    summary.className = 'fit-pill ok';
    summary.textContent = `✓ ${MODES.length - unfit.length} of ${MODES.length} games ready`;
    strip.append(summary);
    for (const mode of unfit) {
      const pill = document.createElement('span');
      pill.className = 'fit-pill warn';
      pill.textContent = `⚠ ${mode.name} (${playersText(mode)})`;
      strip.append(pill);
    }
  }

  // Interactive Roster Chips.
  const shown = displayNames(parsed);
  const chips = $('roster-chips');
  chips.replaceChildren();
  for (const raw of parsed) {
    const display = shown.get(nameKey(raw)) ?? raw;
    const li = document.createElement('li');
    li.className = 'roster-chip';
    const label = document.createElement('span');
    label.className = 'chip-name';
    label.textContent = display;
    if (display !== raw) label.title = raw;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'chip-remove';
    remove.textContent = '×';
    remove.setAttribute('aria-label', `Remove ${display}`);
    remove.addEventListener('click', () => {
      const next = parsed.filter((n) => nameKey(n) !== nameKey(raw));
      namesInput.value = next.join('\n');
      setDirty(true);
      renderParsed({ immediateStage: true });
    });
    li.append(label, remove);
    chips.append(li);
  }
  $('chips-empty').hidden = parsed.length > 0;

  // Live parse warnings (calendar labels, duplicates, 30-name cap).
  parseEl.textContent = warnings.join(' ');
  parseEl.hidden = !warnings.length;

  scheduleStageSync(parsed, immediateStage);
}

function setView(next) {
  view = next;
  const isChips = view === 'chips';
  $('view-chips').setAttribute('aria-pressed', String(isChips));
  $('view-bulk').setAttribute('aria-pressed', String(!isChips));
  $('chips-panel').hidden = !isChips;
  $('bulk-panel').hidden = isChips;
  $('quick-add-row').hidden = !isChips;
  if (!isChips) namesInput.focus({ preventScroll: true });
}

function addFromQuickInput() {
  const raw = addInput.value.trim();
  if (!raw) return;
  const current = parseNames(namesInput.value.split(/\r?\n/)).names;
  const incoming = raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  namesInput.value = [...current, ...incoming].join('\n');
  addInput.value = '';
  setDirty(true);
  renderParsed({ immediateStage: true });
  addInput.focus({ preventScroll: true });
}

async function load() {
  retryBtn.hidden = true;
  statusEl.textContent = 'Loading team list...';
  statusEl.className = 'studio-status';
  try {
    const data = await request('/api/state');
    savedList = data.names;
    namesInput.value = data.names.join('\n');
    namesInput.disabled = saveBtn.disabled = addInput.disabled = addBtn.disabled = false;
    setDirty(false);
    statusEl.textContent = data.warnings.join(' ');
    renderParsed({ immediateStage: false });
  } catch (err) {
    // Allow repairing an unreadable or missing roster through this screen.
    namesInput.disabled = saveBtn.disabled = addInput.disabled = addBtn.disabled = false;
    statusEl.className = 'studio-status error';
    statusEl.textContent = `Could not load the team list: ${err.message} Retry loading, or enter a replacement team list and save.`;
    retryBtn.hidden = false;
  }
}

$('view-chips').addEventListener('click', () => setView('chips'));
$('view-bulk').addEventListener('click', () => setView('bulk'));
addBtn.addEventListener('click', addFromQuickInput);
addInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    addFromQuickInput();
  }
});
namesInput.addEventListener('input', () => {
  setDirty(true);
  renderParsed({ immediateStage: false });
});
discardBtn.addEventListener('click', () => {
  namesInput.value = savedList.join('\n');
  setDirty(false);
  statusEl.className = 'studio-status';
  statusEl.textContent = 'Changes discarded.';
  renderParsed({ immediateStage: true });
});
retryBtn.addEventListener('click', load);
window.addEventListener('beforeunload', (event) => {
  if (dirty) { event.preventDefault(); event.returnValue = ''; }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  saveBtn.disabled = namesInput.disabled = addInput.disabled = addBtn.disabled = true;
  statusEl.className = 'studio-status';
  statusEl.textContent = 'Saving team list...';
  try {
    const data = await request('/api/names', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ names: namesInput.value.split(/\r?\n/) }),
    });
    savedList = data.names;
    namesInput.value = data.names.join('\n');
    setDirty(false);
    statusEl.className = 'studio-status ok';
    statusEl.textContent = `Team list saved (${data.names.length} names). ${data.warnings.join(' ')}`;
    retryBtn.hidden = true;
    renderParsed({ immediateStage: true });
  } catch (err) {
    statusEl.className = 'studio-status error';
    statusEl.textContent = `Could not save the team list: ${err.message}`;
  } finally {
    saveBtn.disabled = namesInput.disabled = addInput.disabled = addBtn.disabled = false;
    saveBtn.focus({ preventScroll: true });
  }
});

load();

// Reuse the lobby's live 3D stage background without making roster editing depend on WebGL.
startBackground();
