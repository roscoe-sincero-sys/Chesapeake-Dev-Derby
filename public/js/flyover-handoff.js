// Hands the background fly-over from one page to the next (lobby ↔ Edit team list ↔ Full history ↔
// Absentee list), so it carries on instead of starting again from the start line on each page.
// Kept in this tab's sessionStorage; pure logic, so it is tested in Node.

const KEY = 'derby-flyover';
/** After this long away the fly-over simply starts again. */
export const MAX_AGE_MS = 30 * 60 * 1000;

/** Saves where the fly-over is: `flyT` (its seconds) and `clock` (the scenery's seconds). */
export function writeFlyover(storage, { flyT, clock }, now = Date.now()) {
  if (!storage || !Number.isFinite(flyT) || !Number.isFinite(clock)) return;
  try {
    storage.setItem(KEY, JSON.stringify({ flyT, clock, at: now }));
  } catch {
    /* storage full or blocked: the next page just starts from the beginning */
  }
}

/**
 * Where to carry on: the saved position moved on by the time spent getting to this page, so the
 * camera continues rather than jumping back. Null if there is nothing usable.
 */
export function readFlyover(storage, now = Date.now()) {
  if (!storage) return null;
  let saved;
  try {
    saved = JSON.parse(storage.getItem(KEY));
  } catch {
    return null;
  }
  if (!saved || !Number.isFinite(saved.flyT) || !Number.isFinite(saved.clock) || !Number.isFinite(saved.at)) return null;
  const away = (now - saved.at) / 1000;
  if (away < 0 || away * 1000 > MAX_AGE_MS || saved.flyT < 0 || saved.clock < 0) return null;
  return { flyT: saved.flyT + away, clock: saved.clock + away };
}
