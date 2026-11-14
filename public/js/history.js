// Winner history page: every recorded result, newest first, with how it was decided.

import { displayNames, nameKey } from './eligibility.js';

const $ = (id) => document.getElementById(id);

const MODE = {
  race: '🏁 Race',
  skip: '🎲 Skip',
};

async function request(url) {
  let response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error('Lost connection to the app. Ask the host to restart it, then tap Retry.');
  }
  let body = null;
  try {
    body = await response.json();
  } catch {
    /* handled below */
  }
  if (!response.ok) throw Object.assign(new Error(body?.error || `Server error (${response.status})`), { status: response.status });
  return body;
}

function cell(text, className) {
  const td = document.createElement('td');
  td.textContent = text;
  if (className) td.className = className;
  return td;
}

async function load() {
  const summary = $('history-summary');
  $('reload-history').hidden = true;
  summary.className = 'hint';
  summary.textContent = 'Loading history...';
  try {
    const [{ history }, roster] = await Promise.all([
      request('/api/history'),
      request('/api/state').catch(() => ({ names: [] })),
    ]);
    // Shorten email addresses the same way as the lobby, checking clashes against everyone listed.
    const shown = displayNames([...new Set([...roster.names, ...history.map((h) => h.name)])]);
    const rows = $('history-rows');
    rows.replaceChildren();
    history.forEach((entry, i) => {
      const tr = document.createElement('tr');
      const when = entry.date ? new Date(entry.date) : null;
      const valid = when && !Number.isNaN(when.getTime());
      const name = cell(shown.get(nameKey(entry.name)) ?? entry.name, 'who');
      name.title = entry.name;
      tr.append(
        cell(String(history.length - i), 'num'),
        name,
        cell(valid ? when.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : '—'),
        cell(valid ? when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '—'),
        cell(MODE[entry.mode] ?? '—', `mode ${entry.mode ?? 'unknown'}`),
      );
      rows.append(tr);
    });
    $('history-table').hidden = !history.length;
    const races = history.filter((h) => h.mode === 'race').length;
    const skips = history.filter((h) => h.mode === 'skip').length;
    summary.textContent = history.length
      ? `${history.length} result${history.length === 1 ? '' : 's'}: ${races} by race, ${skips} skipped${history.length - races - skips ? `, ${history.length - races - skips} recorded before the history was kept (how unknown)` : ''}.`
      : 'No winners yet. Results appear here after each race or pick.';
  } catch (err) {
    summary.className = 'hint error-text';
    // Pages are read from disk on every request, but the server's API only changes when it restarts:
    // a server started before the winner history existed answers 404 here.
    summary.textContent = err.status === 404
      ? 'The derby is still running an older version without the winner history. Restart it: close the derby window (or press Ctrl+C where it is running), start it again with start.cmd or npm start, then reload this page.'
      : `Could not load the history: ${err.message}`;
    $('reload-history').hidden = false;
  }
}

$('reload-history').addEventListener('click', load);
load();
