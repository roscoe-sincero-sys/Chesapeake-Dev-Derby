// Hands the background fly-over from one page to the next (lobby ↔ Edit team list ↔ Full history ↔
// Absentee list), so it carries on instead of starting again from the start line on each page.
// Kept in this tab's sessionStorage; pure logic, so it is tested in Node.

const KEY = 'derby-flyover';
/** After this long away the fly-over simply starts again. */
export const MAX_AGE_MS = 30 * 60 * 1000;
/** Must match WrestleStage's orbit angular velocity (rad/s). */
const WRESTLE_ORBIT_RATE = 0.14;

/** Saves where the lobby 3D stage is: `flyT`, `clock`, and optional `stageTime` / `wrestleOrbit` / `wrestleT`. */
export function writeFlyover(storage, { flyT, clock, stageTime, wrestleOrbit, wrestleT }, now = Date.now()) {
  if (!storage || !Number.isFinite(flyT) || !Number.isFinite(clock)) return;
  const payload = { flyT, clock, at: now };
  if (Number.isFinite(stageTime) && stageTime >= 0) payload.stageTime = stageTime;
  if (Number.isFinite(wrestleOrbit)) payload.wrestleOrbit = wrestleOrbit;
  if (Number.isFinite(wrestleT) && wrestleT >= 0) payload.wrestleT = wrestleT;
  try {
    storage.setItem(KEY, JSON.stringify(payload));
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
  const out = { flyT: saved.flyT + away, clock: saved.clock + away };
  if (Number.isFinite(saved.stageTime) && saved.stageTime >= 0) out.stageTime = saved.stageTime + away;
  if (Number.isFinite(saved.wrestleOrbit)) out.wrestleOrbit = saved.wrestleOrbit + away * WRESTLE_ORBIT_RATE;
  if (Number.isFinite(saved.wrestleT) && saved.wrestleT >= 0) out.wrestleT = saved.wrestleT + away;
  return out;
}
