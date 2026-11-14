import { nameKey } from './eligibility.js';

const KEY = 'derby-lobby-settings';

export function normalizeSpeed(value) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(7, Math.max(1, Math.round(value))) : 2;
}

export function readLobbySettings(getStorage = () => window.sessionStorage) {
  try {
    const saved = JSON.parse(getStorage().getItem(KEY));
    if (saved && !Array.isArray(saved) && typeof saved === 'object') {
      const absent = Array.isArray(saved.absent) ? saved.absent : [];
      return {
        absent: new Set(absent.filter((name) => typeof name === 'string' && name.trim()).slice(0, 30).map(nameKey)),
        speed: normalizeSpeed(saved.speed),
      };
    }
  } catch {
    // Private browsing, disabled storage, or malformed saved data must not break the lobby.
  }
  return { absent: new Set(), speed: 2 };
}

export function writeLobbySettings(settings, getStorage = () => window.sessionStorage) {
  try {
    getStorage().setItem(KEY, JSON.stringify({ absent: [...settings.absent], speed: normalizeSpeed(settings.speed) }));
    return true;
  } catch {
    return false;
  }
}

export function retainRosterAbsences(absent, names) {
  const roster = new Set(names.map(nameKey));
  return new Set([...absent].filter((key) => roster.has(key)));
}
