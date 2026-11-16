// Shared by the read-only pages (Full history, Absentee list): loading from the API, table cells,
// and the 3D background.

import { apiFetch } from './api.js';

/** GET an API route; throws an Error with `.status` (e.g. 404 from an older server) on failure. */
export async function request(url) {
  let response;
  try {
    response = await apiFetch(url);
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

export function cell(text, className) {
  const td = document.createElement('td');
  td.textContent = text;
  if (className) td.className = className;
  return td;
}

/** "Sun, Nov 15, 2026" and "6:10 PM", or dashes for a missing or broken date. */
export function dateAndTime(iso) {
  const when = iso ? new Date(iso) : null;
  if (!when || Number.isNaN(when.getTime())) return ['—', '—'];
  return [
    when.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }),
    when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
  ];
}

export const MODE = {
  race: '🏁 Race',
  skip: '🎲 Skip',
  wrestle: '🤼 Wrestle',
};

/**
 * The same slow fly-over of the course as the lobby (carrying on where the last page left it),
 * without making the page depend on WebGL: if 3D is unavailable it keeps its plain background.
 */
export function startBackground() {
  Promise.all([import('./game.js'), import('./audio.js')])
    .then(([{ Game }, { Sfx }]) => {
      new Game(document.getElementById('scene'), {}, new Sfx());
    })
    .catch((err) => {
      document.getElementById('scene').hidden = true;
      console.warn('3D background is unavailable.', err);
    });
}
