// Winner history page: every recorded result, newest first, with how it was decided.

import { displayNames, nameKey } from './eligibility.js';
import { request, cell, dateAndTime, MODE, MODE_COUNT, startBackground } from './page-common.js';

const $ = (id) => document.getElementById(id);

// Keyboard users start on the first control on the page.
$('back-to-lobby').focus();

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
      const [day, time] = dateAndTime(entry.date);
      const name = cell(shown.get(nameKey(entry.name)) ?? entry.name, 'who');
      name.title = entry.name;
      tr.append(
        cell(String(history.length - i), 'num'),
        name,
        cell(day),
        cell(time),
        cell(MODE[entry.mode] ?? '—', `mode ${entry.mode ?? 'unknown'}`),
      );
      rows.append(tr);
    });
    $('history-table').hidden = !history.length;
    const counts = Object.entries(MODE_COUNT).map(([mode, words]) => `${history.filter((h) => h.mode === mode).length} ${words}`);
    const unknown = history.filter((h) => !Object.hasOwn(MODE_COUNT, h.mode ?? '')).length;
    if (unknown) counts.push(`${unknown} recorded before the history was kept (how unknown)`);
    summary.textContent = history.length
      ? `${history.length} result${history.length === 1 ? '' : 's'}: ${counts.join(', ')}.`
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

startBackground();
