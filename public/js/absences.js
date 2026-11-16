// Absentee list: who was marked absent at each pick, newest first. Read from the winner history,
// where each result saved from version 1.2.0 on records the teammates unticked in the lobby.

import { displayNames, nameKey, absenteeRows } from './eligibility.js';
import { request, cell, dateAndTime, MODE, startBackground } from './page-common.js';

const $ = (id) => document.getElementById(id);

// Keyboard users start on the first control on the page.
$('back-to-lobby').focus();

function summaryText({ rows, logged, absences, unlogged }) {
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const older = unlogged ? ` ${plural(unlogged, 'earlier pick')} came before absentees were logged.` : '';
  if (!logged) return `No absentees logged yet. They are recorded with every pick from now on.${older}`;
  if (!rows.length) return `Nobody was marked absent in the ${plural(logged, 'pick')} logged so far.${older}`;
  return `${plural(rows.length, 'pick')} of ${logged} had someone absent (${plural(absences, 'absence')} in all).${older}`;
}

async function load() {
  const summary = $('absence-summary');
  $('reload-absences').hidden = true;
  summary.className = 'hint';
  summary.textContent = 'Loading absentees...';
  try {
    const [{ history }, roster] = await Promise.all([
      request('/api/history'),
      request('/api/state').catch(() => ({ names: [] })),
    ]);
    const result = absenteeRows(history);
    // Shorten email addresses the same way as the lobby, checking clashes against everyone listed.
    const everyone = [...roster.names, ...history.flatMap((h) => [h.name, ...(h.absent ?? [])])];
    const shown = displayNames([...new Set(everyone)]);
    const show = (name) => shown.get(nameKey(name)) ?? name;
    const tbody = $('absence-rows');
    tbody.replaceChildren();
    for (const row of result.rows) {
      const tr = document.createElement('tr');
      const [day, time] = dateAndTime(row.date);
      const absent = cell(row.absent.map(show).join(', '), 'who');
      absent.title = row.absent.join('\n');
      const picked = cell(show(row.name), 'picked');
      picked.title = row.name;
      tr.append(cell(String(row.number), 'num'), cell(day), cell(time), absent, cell(MODE[row.mode] ?? '—', `mode ${row.mode ?? 'unknown'}`), picked);
      tbody.append(tr);
    }
    $('absence-table').hidden = !result.rows.length;
    summary.textContent = summaryText(result);
  } catch (err) {
    summary.className = 'hint error-text';
    summary.textContent = err.status === 404
      ? 'The derby is still running an older version. Restart it: close the derby window (or press Ctrl+C where it is running), start it again with start.cmd or npm start, then reload this page.'
      : `Could not load the absentees: ${err.message}`;
    $('reload-absences').hidden = false;
  }
}

$('reload-absences').addEventListener('click', load);
load();

startBackground();
