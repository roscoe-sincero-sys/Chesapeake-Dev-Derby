// What the lobby keeps for this browser tab: who is marked absent, the selected game mode, and each
// mode's options. Kept in sessionStorage, so it survives reloads and visits to the other pages, but a new
// tab starts fresh.

import { nameKey } from './eligibility.js';
import { DEFAULT_MODE, findMode, allModeOptions } from './modes.js';

const KEY = 'derby-lobby-settings';

const isObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/** What a new tab starts with: everyone present, the default mode, and every option at its default. */
export function defaultLobbySettings() {
  return { absent: new Set(), mode: DEFAULT_MODE, options: allModeOptions() };
}

/**
 * Reads `{ absent, mode, options: { race: { speed }, rumble: { models } } }` for this tab.
 * Settings saved by 1.6 and earlier (`{ absent, speed }`) keep their race speed. An unknown mode falls back
 * to the default mode, and a missing or invalid option value to that option's default. Unreadable storage
 * or data gives the defaults.
 */
export function readLobbySettings(getStorage = () => window.sessionStorage) {
  try {
    const saved = JSON.parse(getStorage().getItem(KEY));
    if (isObject(saved)) {
      const absent = Array.isArray(saved.absent) ? saved.absent : [];
      const options = isObject(saved.options) ? { ...saved.options } : {};
      if ('speed' in saved) {
        // The old shape: its speed is the race's, unless the new shape already has one.
        const race = isObject(options.race) ? options.race : {};
        if (!('speed' in race)) options.race = { ...race, speed: saved.speed };
      }
      return {
        absent: new Set(absent.filter((name) => typeof name === 'string' && name.trim()).slice(0, 30).map(nameKey)),
        mode: findMode(saved.mode).id,
        options: allModeOptions(options),
      };
    }
  } catch {
    // Private browsing, disabled storage, or malformed saved data must not break the lobby.
  }
  return defaultLobbySettings();
}

/** Saves `{ absent, mode, options }` for this tab. Returns false if the browser won't store it. */
export function writeLobbySettings(settings, getStorage = () => window.sessionStorage) {
  try {
    getStorage().setItem(KEY, JSON.stringify({
      absent: [...settings.absent],
      mode: findMode(settings.mode).id,
      options: allModeOptions(settings.options),
    }));
    return true;
  } catch {
    return false;
  }
}

export function retainRosterAbsences(absent, names) {
  const roster = new Set(names.map(nameKey));
  return new Set([...absent].filter((key) => roster.has(key)));
}
