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

/** How each way of winning (WIN_MODES in data-rules.js) is labelled in the Full history and Absentee list. */
export const MODE = {
  race: '🏁 Race',
  skip: '🎲 Skip',
  wrestle: '🤼 Wrestle',
  deathmatch: '🔫 Deathmatch',
};

/** How the Full history summary counts each way of winning ("4 by race"), in the order it lists them. */
export const MODE_COUNT = {
  race: 'by race',
  wrestle: 'by wrestling',
  deathmatch: 'by deathmatch',
  skip: 'skipped',
};

/** Populates the Top Broadcast Bar's version pill and wires the Mute button on studio sub-pages. */
function initStudioChrome(sfx) {
  const versionEl = document.getElementById('app-version');
  if (versionEl) {
    request('/api/version')
      .then(({ version }) => {
        if (typeof version !== 'string' || !version) return;
        versionEl.textContent = `v${version}`;
        versionEl.hidden = false;
      })
      .catch(() => { /* older server without /api/version */ });
  }
  const mute = document.getElementById('mute');
  if (mute && sfx) {
    const showMute = () => {
      mute.textContent = sfx.muted ? '🔇' : '🔊';
      mute.setAttribute('aria-pressed', String(sfx.muted));
    };
    mute.addEventListener('click', () => {
      sfx.unlock();
      sfx.setMuted(!sfx.muted);
      showMute();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'm' && !e.target.closest('input, textarea, select, [contenteditable]') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        mute.click();
      }
    });
    showMute();
  }
}

/**
 * The same live 3D stage background as the lobby (Derby Race bridge or Let's Rumble wrestling ring,
 * matching the selected mode and options), without making the page depend on WebGL: if 3D is
 * unavailable it keeps its plain background.
 */
export function startBackground() {
  Promise.all([
    import('./game.js'),
    import('./audio.js'),
    import('./lobby-settings.js'),
    import('./modes.js'),
    import('./eligibility.js'),
  ])
    .then(async ([{ Game }, { Sfx }, { readLobbySettings }, { findMode }, { buildRoster, selectRacers, displayNames, nameKey }]) => {
      const sfx = new Sfx();
      initStudioChrome(sfx);
      const game = new Game(document.getElementById('scene'), {}, sfx);
      window.derby = game;
      const saved = readLobbySettings();
      const mode = findMode(saved.mode);
      if (!mode.stagePreview) return;
      const options = saved.options[mode.id];
      // Switch to the selected mode's stage immediately (avoids flashing the bridge when Rumble is active).
      if (mode.id !== 'race') mode.stagePreview(game, { names: [], options });
      try {
        const res = await apiFetch('/api/state');
        if (!res.ok) return;
        const data = await res.json();
        const roster = buildRoster(data.names ?? [], data.winners ?? []);
        const shown = displayNames(data.names ?? []);
        const names = selectRacers(roster, saved.absent).map((n) => shown.get(nameKey(n)) ?? n);
        mode.stagePreview(game, { names, options });
      } catch {
        /* Keep the empty stage or fly-over if /api/state is unavailable. */
      }
    })
    .catch((err) => {
      document.getElementById('scene').hidden = true;
      console.warn('3D background is unavailable.', err);
    });
}
