// Data rules shared by the local server (lib/store.js) and the browser-only demo (demo-api.js):
// names, the team list limits, calendar labels, the last three winners and the full history.
// Pure functions only (no files, no DOM), so both use exactly the same rules.

export const MAX_NAMES = 30;
export const MAX_WINNERS = 3;
export const MAX_NAME_LENGTH = 40;
/** The full history keeps this many results (years of daily meetings) before dropping the oldest. */
export const MAX_HISTORY = 5000;
/** How a winner was chosen. */
export const WIN_MODES = ['race', 'skip', 'wrestle', 'deathmatch', 'claw', 'plinko', 'freeze', 'launchpad', 'jenga'];

/**
 * Words that calendar apps put on their own line in a pasted attendee list (role, response, or
 * work location) rather than anyone's name. Matched against a whole line, ignoring case and
 * surrounding brackets or colons, so "Optional", "(Organizer)" and "Telework:" are all skipped.
 */
export const CALENDAR_LABELS = [
  'organizer', 'organiser', 'required', 'optional', 'required attendee', 'optional attendee', 'resource',
  'accepted', 'tentative', 'declined', 'no response', "didn't respond", 'did not respond', 'awaiting response',
  'home', 'office', 'in office', 'in the office', 'telework', 'teleworking', 'remote', 'in person', 'out of office',
];
const CALENDAR_LABEL_SET = new Set(CALENDAR_LABELS);

/** True if a line pasted from a calendar invite is a label like "Organizer" or "Telework", not a person. */
export function isCalendarLabel(text) {
  const bare = String(text).trim().replace(/\s+/g, ' ').replace(/^[\s([{]+|[\s)\]}:;,.]+$/g, '').toLowerCase().replace(/’/g, "'");
  return CALENDAR_LABEL_SET.has(bare);
}

/** Case- and whitespace-insensitive key used to compare names. */
export function nameKey(name) {
  return String(name).trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Normalises the contents of names.json.
 * Accepts either `["Ada", "Grace"]` or `{ "names": ["Ada", "Grace"] }`.
 * Returns the cleaned list plus human-readable warnings about anything that was dropped.
 */
export function parseNames(raw) {
  const list = Array.isArray(raw) ? raw : raw && Array.isArray(raw.names) ? raw.names : null;
  if (!list) {
    throw new Error('names.json must be an array of names or an object like { "names": [...] }');
  }

  const warnings = [];
  const seen = new Set();
  const names = [];
  let skippedInvalid = 0;
  let skippedDuplicate = 0;
  const skippedLabels = new Map(); // label as typed -> count

  for (const entry of list) {
    if (typeof entry !== 'string' || !entry.trim()) {
      skippedInvalid++;
      continue;
    }
    let name = entry.trim().replace(/\s+/g, ' ');
    if (isCalendarLabel(name)) {
      skippedLabels.set(name, (skippedLabels.get(name) || 0) + 1);
      continue;
    }
    if (name.length > MAX_NAME_LENGTH) {
      name = name.slice(0, MAX_NAME_LENGTH).trim();
      warnings.push(`"${name}…" was shortened to ${MAX_NAME_LENGTH} characters.`);
    }
    const key = nameKey(name);
    if (seen.has(key)) {
      skippedDuplicate++;
      continue;
    }
    seen.add(key);
    names.push(name);
  }

  if (skippedInvalid) warnings.push(`${skippedInvalid} blank or non-text entr${skippedInvalid === 1 ? 'y was' : 'ies were'} ignored.`);
  if (skippedLabels.size) {
    const count = [...skippedLabels.values()].reduce((a, b) => a + b, 0);
    const which = [...new Set([...skippedLabels.keys()].map((k) => k.replace(/^[\s([{]+|[\s)\]}:;,.]+$/g, '')))].join(', ');
    warnings.push(`${count} calendar label${count === 1 ? ' was' : 's were'} ignored (${which}).`);
  }
  if (skippedDuplicate) warnings.push(`${skippedDuplicate} duplicate name${skippedDuplicate === 1 ? ' was' : 's were'} ignored.`);
  if (names.length > MAX_NAMES) {
    warnings.push(`names.json has ${names.length} names; only the first ${MAX_NAMES} are used.`);
    names.length = MAX_NAMES;
  }
  return { names, warnings };
}

/**
 * Normalises the contents of winners.json into `[{ name, date }]`, oldest first,
 * keeping at most the newest MAX_WINNERS entries.
 * Accepts `{ "winners": [...] }` or a bare array; entries may be strings or `{ name, date }`.
 */
export function parseWinners(raw) {
  const list = Array.isArray(raw) ? raw : raw && Array.isArray(raw.winners) ? raw.winners : [];
  const winners = [];
  for (const entry of list) {
    if (typeof entry === 'string' && entry.trim()) {
      winners.push({ name: entry.trim(), date: null });
    } else if (entry && typeof entry.name === 'string' && entry.name.trim()) {
      winners.push({ name: entry.name.trim(), date: typeof entry.date === 'string' ? entry.date : null });
    }
  }
  return winners.slice(-MAX_WINNERS);
}

/**
 * Returns the new history after `name` wins: appended as the newest entry,
 * and if that takes the list past MAX_WINNERS the oldest entry is dropped.
 */
export function addWinner(winners, name, date = new Date().toISOString()) {
  const next = [...winners, { name: String(name).trim(), date }];
  return next.slice(-MAX_WINNERS);
}

/**
 * Normalises the contents of history.json into `[{ name, date, mode }]`, oldest first.
 * `mode` is one of WIN_MODES ('race', 'skip', 'wrestle'), or null for results recorded before the history existed.
 */
export function parseHistory(raw) {
  const list = Array.isArray(raw) ? raw : raw && Array.isArray(raw.history) ? raw.history : [];
  const history = [];
  for (const entry of list) {
    if (!entry || typeof entry.name !== 'string' || !entry.name.trim()) continue;
    const item = {
      name: entry.name.trim(),
      date: typeof entry.date === 'string' ? entry.date : null,
      mode: WIN_MODES.includes(entry.mode) ? entry.mode : null,
    };
    // Who was marked absent for that pick. Results saved before absentees were logged have no list.
    if (Array.isArray(entry.absent)) {
      item.absent = entry.absent.filter((n) => typeof n === 'string' && n.trim()).map((n) => n.trim());
    }
    history.push(item);
  }
  return history.slice(-MAX_HISTORY);
}

/**
 * Validates and cleans a team list save: `{ names: [...] }`. Calendar labels are dropped before the
 * size check, so a pasted invite with 30 people and their "Optional" / "Telework" lines still fits.
 * Returns parseNames()' result, or throws an Error with statusCode 400.
 */
export function validateRoster(raw) {
  if (!raw || !Array.isArray(raw.names) || raw.names.some((n) => typeof n !== 'string')) {
    throw Object.assign(new Error('Provide an object with a "names" array of text names.'), { statusCode: 400 });
  }
  const entries = raw.names.map((n) => n.trim().replace(/\s+/g, ' ')).filter((n) => n && !isCalendarLabel(n));
  const labels = raw.names.filter((n) => isCalendarLabel(n));
  if (entries.length > MAX_NAMES || entries.some((n) => n.length > MAX_NAME_LENGTH)) {
    throw Object.assign(new Error(`Use at most ${MAX_NAMES} names, each ${MAX_NAME_LENGTH} characters or fewer.`), { statusCode: 400 });
  }
  return parseNames({ names: [...entries, ...labels] });
}

/**
 * The teammates marked absent for a pick, as they are spelled on the team list, in team-list order.
 * Only people who could have taken part count: names not on the list, the winner, and recent winners
 * sitting out (`recent`, the last three winners before this pick) are left out; duplicates count once.
 * `absent` may be missing (an older page): that means nobody was recorded as absent.
 * Throws an Error with statusCode 400 when it isn't a list of names.
 */
export function checkAbsentees(names, recent, winner, absent) {
  if (absent === undefined || absent === null) return [];
  if (!Array.isArray(absent) || absent.length > MAX_NAMES || absent.some((n) => typeof n !== 'string')) {
    throw Object.assign(new Error(`"absent" must be a list of at most ${MAX_NAMES} names.`), { statusCode: 400 });
  }
  const wanted = new Set(absent.map(nameKey));
  const sittingOut = new Set(recent.map((w) => nameKey(w.name)));
  return names.filter((n) => wanted.has(nameKey(n)) && !sittingOut.has(nameKey(n)) && nameKey(n) !== nameKey(winner));
}

/** "a", "a or b", "a, b or c". */
function listOr(items) {
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} or ${items.at(-1)}`;
}

/**
 * Checks a winner against the team list and the allowed modes. Returns the name as it is spelled on
 * the list, or throws an Error with statusCode 400.
 */
export function checkWinner(names, name, mode) {
  if (!WIN_MODES.includes(mode)) {
    throw Object.assign(new Error(`"mode" must be ${listOr(WIN_MODES.map((m) => `"${m}"`))}.`), { statusCode: 400 });
  }
  const match = names.find((n) => nameKey(n) === nameKey(name));
  if (!match) throw Object.assign(new Error(`"${name}" is not in names.json`), { statusCode: 400 });
  return match;
}
