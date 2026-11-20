// What the lobby remembers:
//   - attendance (who is marked absent) for this browser tab only, in sessionStorage: it survives reloads,
//     games and visits to the other pages, but tomorrow's new tab starts with everyone present;
//   - the selected game and each game's options in localStorage, so they're kept in this browser from one
//     meeting to the next (a browser that has never chosen starts on the race).

import { nameKey } from './eligibility.js';
import { DEFAULT_MODE, findMode, allModeOptions } from './modes.js';

/** Attendance, per tab. Before 1.7 this entry also held the race speed, then the game and its options. */
const TAB_KEY = 'derby-lobby-settings';
/** The selected game and every game's options, kept in this browser. */
const GAME_KEY = 'derby-lobby-game';

const BROWSER = { session: () => window.sessionStorage, local: () => window.localStorage };

const isObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

function readJson(getStorage, key) {
  try {
    const value = JSON.parse(getStorage().getItem(key));
    return isObject(value) ? value : null;
  } catch {
    // Private browsing, disabled storage, or malformed saved data must not break the lobby.
    return null;
  }
}

function writeJson(getStorage, key, value) {
  try {
    getStorage().setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** What a new browser starts with: everyone present, the default game, and every option at its default. */
export function defaultLobbySettings() {
  return { absent: new Set(), mode: DEFAULT_MODE, options: allModeOptions() };
}

/**
 * Reads `{ absent, mode, options: { race: { speed }, rumble: { models } } }`: attendance from this tab, the
 * game and its options from this browser. Until the browser has a saved game, one this tab saved before 1.7
 * is used, including a 1.6 race speed (`{ absent, speed }`). An unknown game falls back to the default one,
 * and a missing or invalid option value to that option's default. Unreadable storage gives the defaults.
 * `storage` is { session, local }, functions returning each storage (for tests).
 */
export function readLobbySettings(storage = BROWSER) {
  const tab = readJson(storage.session, TAB_KEY) ?? {};
  const game = readJson(storage.local, GAME_KEY) ?? tab;
  const options = isObject(game.options) ? { ...game.options } : {};
  if ('speed' in game) {
    // The 1.6 shape: its speed is the race's, unless a newer shape already has one.
    const race = isObject(options.race) ? options.race : {};
    if (!('speed' in race)) options.race = { ...race, speed: game.speed };
  }
  const absent = Array.isArray(tab.absent) ? tab.absent : [];
  return {
    absent: new Set(absent.filter((name) => typeof name === 'string' && name.trim()).slice(0, 30).map(nameKey)),
    mode: findMode(game.mode).id,
    options: allModeOptions(options),
  };
}

/** Saves attendance for this tab, and the game and its options for this browser. False if either won't store. */
export function writeLobbySettings(settings, storage = BROWSER) {
  const tabSaved = writeJson(storage.session, TAB_KEY, { absent: [...settings.absent] });
  const gameSaved = writeJson(storage.local, GAME_KEY, { mode: findMode(settings.mode).id, options: allModeOptions(settings.options) });
  return tabSaved && gameSaved;
}

export function retainRosterAbsences(absent, names) {
  const roster = new Set(names.map(nameKey));
  return new Set([...absent].filter((key) => roster.has(key)));
}
