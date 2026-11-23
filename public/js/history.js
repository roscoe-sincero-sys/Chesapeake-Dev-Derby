// Winner history page (#133 phase 2): Broadcast Hall of Fame stats, Match log & All-Time Standings,
// mode filter chips, and live name search.

import { displayNames, nameKey } from './eligibility.js';
import { request, cell, dateAndTime, MODE, MODE_COUNT, startBackground } from './page-common.js';
import { computeHistoryStats } from './history-stats.js';

const $ = (id) => document.getElementById(id);

// Keyboard users start on the first control on the page.
$('back-to-lobby').focus();

const state = {
  history: [],
  shown: new Map(),
  stats: null,
  view: 'log', // 'log' | 'standings'
  modeFilter: 'all', // 'all' | 'race' | 'wrestle' | 'skip'
  query: '',
};

const showName = (name) => state.shown.get(nameKey(name)) ?? name;

function renderStats(stats) {
  const strip = $('stat-strip');
  if (!stats || !stats.total) {
    strip.hidden = true;
    return;
  }
  strip.hidden = false;

  if (stats.leader) {
    $('stat-leader').textContent = stats.leader.names.join(' & ');
    const w = stats.leader.wins;
    $('stat-leader-sub').textContent = `${w} win${w === 1 ? '' : 's'} · ${stats.leader.sharePct}% of picks`;
  } else {
    $('stat-leader').textContent = '—';
    $('stat-leader-sub').textContent = '';
  }

  if (stats.underdog) {
    $('stat-underdog').textContent = stats.underdog.name;
    $('stat-underdog-sub').textContent = stats.underdog.neverWon
      ? 'Never led yet!'
      : `${stats.underdog.picksAgo} pick${stats.underdog.picksAgo === 1 ? '' : 's'} since last win`;
  } else {
    $('stat-underdog').textContent = 'Everyone eligible';
    $('stat-underdog-sub').textContent = '';
  }

  const mix = stats.modeMix;
  const bar = $('stat-mix-bar');
  bar.replaceChildren();
  const modeMeta = [
    ['race', 'mix-race', '🏁'], ['wrestle', 'mix-wrestle', '🤼'], ['deathmatch', 'mix-deathmatch', '🔫'],
    ['claw', 'mix-claw', '🕹️'], ['plinko', 'mix-plinko', '🎰'], ['freeze', 'mix-freeze', '🚦'],
    ['launchpad', 'mix-launchpad', '🚀'], ['jenga', 'mix-jenga', '🧱'], ['cannon', 'mix-cannon', '💣'],
    ['golf', 'mix-golf', '⛳'], ['rto', 'mix-rto', '🏢'], ['tumba', 'mix-tumba', '🩴'],
    ['karang', 'mix-karang', '🎋'], ['tubig', 'mix-tubig', '💧'], ['domino', 'mix-domino', '🁣'],
    ['pole', 'mix-pole', '🌴'], ['taw', 'mix-taw', '🔮'], ['ddakji', 'mix-ddakji', '🟥'],
    ['nokabe', 'mix-nokabe', '📺'], ['mahjong', 'mix-mahjong', '🀄'], ['khokho', 'mix-khokho', '🪑'],
    ['chaupar', 'mix-chaupar', '🐚'], ['glass', 'mix-glass', '🌉'], ['skip', 'mix-skip', '🎲'], ['unknown', 'mix-unknown', '❔'],
  ];
  for (const [key, cls] of modeMeta) {
    if (!mix[key].count) continue;
    const seg = document.createElement('span');
    seg.className = `mix-seg ${cls}`;
    seg.style.flexGrow = String(mix[key].count);
    bar.append(seg);
  }
  const activeModes = modeMeta
    .filter(([key]) => key !== 'unknown' && mix[key].count > 0)
    .sort((a, b) => mix[b[0]].count - mix[a[0]].count);
  const top3 = activeModes.slice(0, 3).map(([key, , icon]) => `${icon} ${mix[key].count}`);
  const rest = activeModes.length - top3.length;
  $('stat-mix-sub').textContent = rest > 0 ? `${top3.join(' · ')} · +${rest} more` : top3.join(' · ');

  // Populate the compact mode filter dropdown & hide 0-count chips for a clean single-row rail.
  const select = $('mode-select');
  if (select) {
    select.replaceChildren();
    const allOpt = document.createElement('option');
    allOpt.value = 'all';
    allOpt.textContent = `All modes (${stats.total})`;
    select.append(allOpt);
    for (const [key] of activeModes) {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = `${MODE[key] ?? key} (${mix[key].count})`;
      select.append(opt);
    }
    select.value = state.modeFilter;
  }
  for (const btn of document.querySelectorAll('#mode-filters button[data-mode]')) {
    const m = btn.dataset.mode;
    btn.hidden = m !== 'all' && (!mix[m] || mix[m].count === 0);
  }
}

function makeNameCell(rawName, sittingOut) {
  const shownName = showName(rawName);
  const td = cell(shownName, 'who');
  if (shownName !== rawName) td.title = rawName;
  if (sittingOut) {
    const pill = document.createElement('span');
    pill.className = 'cooldown-pill';
    pill.textContent = 'Sitting out';
    td.append(' ', pill);
  }
  return td;
}

function renderTables() {
  const q = state.query.trim().toLowerCase();
  const isLog = state.view === 'log';
  $('view-log').setAttribute('aria-pressed', String(isLog));
  $('view-standings').setAttribute('aria-pressed', String(!isLog));
  $('mode-filters').hidden = !isLog;
  const select = $('mode-select');
  if (select) {
    select.hidden = !isLog;
    select.value = state.modeFilter;
  }
  for (const btn of $('mode-filters').querySelectorAll('button')) {
    btn.setAttribute('aria-pressed', String(btn.dataset.mode === state.modeFilter));
  }

  const sitting = state.stats?.sittingOutKeys ?? new Set();

  if (isLog) {
    const rows = $('history-rows');
    rows.replaceChildren();
    let shownCount = 0;
    state.history.forEach((entry, i) => {
      if (state.modeFilter !== 'all' && entry.mode !== state.modeFilter) return;
      const display = showName(entry.name);
      if (q && !display.toLowerCase().includes(q) && !entry.name.toLowerCase().includes(q)) return;
      shownCount++;
      const tr = document.createElement('tr');
      const [day, time] = dateAndTime(entry.date);
      tr.append(
        cell(String(state.history.length - i), 'num'),
        makeNameCell(entry.name, i < 3 && sitting.has(nameKey(entry.name))),
        cell(day),
        cell(time),
        cell(MODE[entry.mode] ?? '—', `mode ${entry.mode ?? 'unknown'}`),
      );
      rows.append(tr);
    });
    $('history-table').hidden = shownCount === 0;
    $('standings-table').hidden = true;
    $('history-empty').hidden = state.history.length === 0 || shownCount > 0;
  } else {
    const rows = $('standings-rows');
    rows.replaceChildren();
    const list = (state.stats?.standings ?? []).filter((row) => !q || row.shown.toLowerCase().includes(q) || row.name.toLowerCase().includes(q));
    const modeIcons = [
      ['race', '🏁'], ['wrestle', '🤼'], ['deathmatch', '🔫'], ['claw', '🕹️'], ['plinko', '🎰'],
      ['freeze', '🚦'], ['launchpad', '🚀'], ['jenga', '🧱'], ['cannon', '💣'], ['golf', '⛳'],
      ['rto', '🏢'], ['tumba', '🩴'], ['karang', '🎋'], ['tubig', '💧'], ['domino', '🁣'],
      ['pole', '🌴'], ['taw', '🔮'], ['ddakji', '🟥'], ['nokabe', '📺'], ['mahjong', '🀄'],
      ['khokho', '🪑'], ['chaupar', '🐚'], ['glass', '🌉'], ['skip', '🎲'],
    ];
    for (const row of list) {
      const tr = document.createElement('tr');
      const [day] = dateAndTime(row.lastDate);
      const topModes = modeIcons
        .filter(([k]) => row[k] > 0)
        .sort((a, b) => row[b[0]] - row[a[0]])
        .slice(0, 3)
        .map(([k, icon]) => `${icon} ${row[k]}`)
        .join(' · ');
      tr.append(
        cell(`#${row.rank}`, 'num'),
        makeNameCell(row.name, row.sittingOut),
        cell(String(row.total), 'num'),
        cell(topModes || '—', 'mode'),
        cell(row.total ? day : '—'),
      );
      rows.append(tr);
    }
    $('history-table').hidden = true;
    $('standings-table').hidden = list.length === 0;
    $('history-empty').hidden = list.length > 0;
  }
}

async function load() {
  const summary = $('history-summary');
  $('reload-history').hidden = true;
  summary.className = 'hint';
  summary.textContent = 'Loading history...';
  try {
    const [{ history, warning }, roster] = await Promise.all([
      request('/api/history'),
      request('/api/state').catch(() => ({ names: [], winners: [] })),
    ]);
    state.history = history;
    const rosterNames = roster.names ?? [];
    const winners = roster.winners ?? [];
    state.shown = displayNames([...new Set([...rosterNames, ...history.map((h) => h.name)])]);
    state.stats = computeHistoryStats({ history, rosterNames, winners, show: showName });

    const playedModes = Object.keys(MODE_COUNT).filter((m) => m !== 'skip' && history.some((h) => h.mode === m)).length;
    const skipped = history.filter((h) => h.mode === 'skip').length;
    const games = history.length - skipped;
    const baseSummary = history.length
      ? `${history.length} result${history.length === 1 ? '' : 's'} across ${playedModes} game mode${playedModes === 1 ? '' : 's'} · ${games} game${games === 1 ? '' : 's'}, ${skipped} skipped.`
      : 'No winners yet. Results appear here after each game or pick.';
    summary.textContent = warning ? `${baseSummary} ${warning}` : baseSummary;

    $('history-controls').hidden = !history.length;
    renderStats(state.stats);
    renderTables();
  } catch (err) {
    summary.className = 'hint error-text';
    summary.textContent = err.status === 404
      ? 'The derby is still running an older version without the winner history. Restart it: close the derby window (or press Ctrl+C where it is running), start it again with start.cmd or npm start, then reload this page.'
      : `Could not load the history: ${err.message}`;
    $('reload-history').hidden = false;
  }
}

$('view-log').addEventListener('click', () => { state.view = 'log'; renderTables(); });
$('view-standings').addEventListener('click', () => { state.view = 'standings'; renderTables(); });
$('mode-filters').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-mode]');
  if (!btn) return;
  state.modeFilter = btn.dataset.mode;
  renderTables();
});
$('mode-select')?.addEventListener('change', (e) => {
  state.modeFilter = e.target.value;
  renderTables();
});
$('history-search').addEventListener('input', (e) => {
  state.query = e.target.value;
  renderTables();
});
$('reload-history').addEventListener('click', load);
load();

startBackground();
