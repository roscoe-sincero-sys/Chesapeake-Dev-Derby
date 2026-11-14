import { nameKey } from './eligibility.js';

const KEY = 'derby-lobby-settings';

/**
 * The race lengths the lobby slider offers, longest first. `speed` is how much faster
 * than normal the race runs; a race at 1x takes about 120 seconds.
 */
export const RACE_LENGTHS = [
  { seconds: 120, speed: 1 },
  { seconds: 60, speed: 2 },
  { seconds: 30, speed: 4 },
  { seconds: 15, speed: 8 },
  { seconds: 10, speed: 12 },
];
export const DEFAULT_SPEED = 2;

/**
 * Snaps any number to the nearest offered speed (compared on a log scale, so 3x
 * becomes 4x and 6x becomes 8x). Anything that is not a positive number gives the default.
 */
export function normalizeSpeed(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_SPEED;
  const target = Math.log(Math.max(value, 0.01));
  let best = RACE_LENGTHS[0].speed;
  for (const { speed } of RACE_LENGTHS) {
    if (Math.abs(Math.log(speed) - target) < Math.abs(Math.log(best) - target)) best = speed;
  }
  return best;
}

/** Position of a speed on the slider (0 = longest race). */
export function speedToStep(speed) {
  return RACE_LENGTHS.findIndex((option) => option.speed === normalizeSpeed(speed));
}

/** The speed for a slider position. */
export function stepToSpeed(step) {
  const index = Math.min(RACE_LENGTHS.length - 1, Math.max(0, Math.round(Number(step) || 0)));
  return RACE_LENGTHS[index].speed;
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
  return { absent: new Set(), speed: DEFAULT_SPEED };
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
