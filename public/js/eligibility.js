// Who is allowed to race. Pure logic, shared by the lobby UI and the tests.

/** Case- and whitespace-insensitive key used to compare names. */
export function nameKey(name) {
  return String(name).trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Combines the roster with the recent-winner history.
 * A name is `eligible` unless it won one of the last three races.
 * `winners` is `[{ name, date }]`, oldest first.
 */
export function buildRoster(names, winners) {
  const recent = new Map();
  winners.forEach((w, i) => recent.set(nameKey(w.name), { ...w, racesAgo: winners.length - i }));
  return names.map((name) => {
    const win = recent.get(nameKey(name)) || null;
    return { name, eligible: !win, recentWin: win };
  });
}

/**
 * The names that will actually race: eligible and still ticked as present.
 * `absent` is a Set of nameKeys the user has unticked.
 */
export function selectRacers(roster, absent = new Set()) {
  return roster.filter((entry) => entry.eligible && !absent.has(nameKey(entry.name))).map((entry) => entry.name);
}

/** A uniform immediate pick from the same eligible, present racers as a race. */
export function pickRandomRacer(roster, absent = new Set(), rng = Math.random) {
  const racers = selectRacers(roster, absent);
  return racers.length >= 2 ? racers[Math.floor(rng() * racers.length)] : null;
}
