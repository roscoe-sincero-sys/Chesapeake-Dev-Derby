// The race lengths the lobby offers, and how a speed maps to and from a slider position.
// Pure functions only: shared by the mode registry (modes.js) and the saved lobby settings.

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
