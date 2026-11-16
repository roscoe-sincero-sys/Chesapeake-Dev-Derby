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

/**
 * Who was marked absent: people who could have taken part (not recent winners sitting out) but were
 * unticked. These are logged with each result.
 */
export function selectAbsentees(roster, absent = new Set()) {
  return roster.filter((entry) => entry.eligible && absent.has(nameKey(entry.name))).map((entry) => entry.name);
}

/** A uniform immediate pick from the same eligible, present racers as a race. */
export function pickRandomRacer(roster, absent = new Set(), rng = Math.random) {
  const racers = selectRacers(roster, absent);
  return racers.length >= 2 ? racers[Math.floor(rng() * racers.length)] : null;
}

const EMAIL = /^([^\s@]+)@[^\s@]+\.[^\s@]+$/;

/**
 * How each roster name is shown on screen. A name that looks like an email address is shortened
 * to its local part (tony.stark@ultron.com → tony.stark), unless that would clash with another
 * name on the list (tony.stark@vision.com, or a plain "Tony.Stark"); then the full address is kept.
 * Returns a Map from nameKey(name) to the display name. Stored names are never changed.
 */
export function displayNames(names) {
  const local = (name) => EMAIL.exec(String(name).trim())?.[1] ?? null;
  const counts = new Map();
  const bump = (key) => counts.set(key, (counts.get(key) || 0) + 1);
  for (const name of names) {
    const part = local(name);
    bump(nameKey(part ?? name));
  }
  const shown = new Map();
  for (const name of names) {
    const part = local(name);
    shown.set(nameKey(name), part && counts.get(nameKey(part)) === 1 ? part : name);
  }
  return shown;
}

const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

/** Sorts roster entries alphabetically by how they are shown (case-insensitive, numbers in order). */
export function sortByDisplayName(entries, shown) {
  const label = (entry) => shown.get(nameKey(entry.name)) ?? entry.name;
  return [...entries].sort((a, b) => collator.compare(label(a), label(b)) || collator.compare(a.name, b.name));
}

/**
 * The rows to show and the numbers for the summary. `history` is newest first, as the server sends it;
 * each row keeps its pick number from the Winner history so the two lists line up.
 */
export function absenteeRows(history) {
  const rows = [];
  let logged = 0;
  let absences = 0;
  history.forEach((entry, i) => {
    if (!Array.isArray(entry.absent)) return; // saved before absentees were logged
    logged++;
    if (!entry.absent.length) return;
    absences += entry.absent.length;
    rows.push({ number: history.length - i, ...entry });
  });
  return { rows, logged, absences, unlogged: history.length - logged };
}
