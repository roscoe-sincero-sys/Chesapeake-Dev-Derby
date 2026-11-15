// Reads the roster (names.json) and reads/writes the recent-winner list (winners.json, last three)
// and the full winner history (history.json, every result ever recorded).
// Pure helpers are exported separately so they can be unit-tested without touching disk.

import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import path from 'node:path';

export const MAX_NAMES = 30;
export const MAX_WINNERS = 3;
export const MAX_NAME_LENGTH = 40;
/** The full history keeps this many results (years of daily meetings) before dropping the oldest. */
export const MAX_HISTORY = 5000;
/** How a winner was chosen. */
export const WIN_MODES = ['race', 'skip', 'wrestle'];

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
 * `mode` is 'race', 'skip', or null for results recorded before the history existed.
 */
export function parseHistory(raw) {
  const list = Array.isArray(raw) ? raw : raw && Array.isArray(raw.history) ? raw.history : [];
  const history = [];
  for (const entry of list) {
    if (!entry || typeof entry.name !== 'string' || !entry.name.trim()) continue;
    history.push({
      name: entry.name.trim(),
      date: typeof entry.date === 'string' ? entry.date : null,
      mode: WIN_MODES.includes(entry.mode) ? entry.mode : null,
    });
  }
  return history.slice(-MAX_HISTORY);
}

async function readJson(file, fallback) {
  let text;
  try {
    text = await readFile(file, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT' && fallback !== undefined) return fallback;
    throw err;
  }
  // Tolerate a UTF-8 byte-order mark (Windows editors like to add one).
  text = text.replace(/^﻿/, '');
  if (!text.trim() && fallback !== undefined) return fallback;
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`${path.basename(file)} is not valid JSON: ${err.message}`);
  }
}

export function createStore(dataDir) {
  const namesFile = path.join(dataDir, 'names.json');
  const winnersFile = path.join(dataDir, 'winners.json');
  const historyFile = path.join(dataDir, 'history.json');
  // Serialises writes so two quick saves cannot interleave.
  let writeQueue = Promise.resolve();

  async function loadNames() {
    let raw;
    try {
      raw = await readJson(namesFile);
    } catch (err) {
      if (err.code === 'ENOENT') throw new Error(`Could not find ${namesFile}. Create it with a list of names.`);
      throw err;
    }
    return parseNames(raw);
  }

  async function loadWinners() {
    return parseWinners(await readJson(winnersFile, { winners: [] }));
  }

  async function saveWinners(winners) {
    await mkdir(dataDir, { recursive: true });
    const tmp = `${winnersFile}.tmp`;
    await writeFile(tmp, JSON.stringify({ winners }, null, 2) + '\n', 'utf8');
    await rename(tmp, winnersFile);
  }

  /**
   * The full history, oldest first. Before history.json exists (an install from before the history
   * was added), it starts from the recent winners in winners.json, with the mode unknown.
   */
  async function loadHistory() {
    const raw = await readJson(historyFile, null);
    if (raw !== null) return parseHistory(raw);
    return (await loadWinners()).map((w) => ({ name: w.name, date: w.date, mode: null }));
  }

  async function saveHistory(history) {
    await mkdir(dataDir, { recursive: true });
    const tmp = `${historyFile}.tmp`;
    await writeFile(tmp, JSON.stringify({ history: history.slice(-MAX_HISTORY) }, null, 2) + '\n', 'utf8');
    await rename(tmp, historyFile);
  }

  /** Validates and atomically replaces the roster without changing winner history. */
  function saveNames(raw) {
    const run = async () => {
      if (!raw || !Array.isArray(raw.names) || raw.names.some((n) => typeof n !== 'string')) {
        throw Object.assign(new Error('Provide an object with a "names" array of text names.'), { statusCode: 400 });
      }
      // Calendar labels are dropped before the size check, so a pasted invite with 30 people and
      // their "Optional" / "Telework" lines still fits.
      const entries = raw.names.map((n) => n.trim().replace(/\s+/g, ' ')).filter((n) => n && !isCalendarLabel(n));
      const labels = raw.names.filter((n) => isCalendarLabel(n));
      if (entries.length > MAX_NAMES || entries.some((n) => n.length > MAX_NAME_LENGTH)) {
        throw Object.assign(new Error(`Use at most ${MAX_NAMES} names, each ${MAX_NAME_LENGTH} characters or fewer.`), { statusCode: 400 });
      }
      const parsed = parseNames({ names: [...entries, ...labels] });
      await mkdir(dataDir, { recursive: true });
      const tmp = `${namesFile}.tmp`;
      await writeFile(tmp, JSON.stringify({ names: parsed.names }, null, 2) + '\n', 'utf8');
      await rename(tmp, namesFile);
      return parsed;
    };
    const result = writeQueue.then(run, run);
    writeQueue = result.catch(() => {});
    return result;
  }

  /**
   * Records a winner (`mode` 'race', 'skip' or 'wrestle') in both the recent list and the full history.
   * Rejects names that are not on the roster.
   */
  function recordWinner(name, mode = 'race') {
    const run = async () => {
      if (!WIN_MODES.includes(mode)) {
        throw Object.assign(new Error('"mode" must be "race", "skip" or "wrestle".'), { statusCode: 400 });
      }
      const { names } = await loadNames();
      const match = names.find((n) => nameKey(n) === nameKey(name));
      if (!match) {
        const err = new Error(`"${name}" is not in names.json`);
        err.statusCode = 400;
        throw err;
      }
      const date = new Date().toISOString();
      const history = await loadHistory();
      const winners = addWinner(await loadWinners(), match, date);
      await saveWinners(winners);
      await saveHistory([...history, { name: match, date, mode }]);
      return winners;
    };
    const result = writeQueue.then(run, run);
    writeQueue = result.catch(() => {});
    return result;
  }

  /** Empties the recent-winner history, so everyone on the roster is eligible again. */
  function clearWinners() {
    const run = async () => {
      // Resetting the recent list never touches the full history. On an older install, write the
      // history first so the results it starts from are not lost with winners.json.
      if ((await readJson(historyFile, null)) === null) await saveHistory(await loadHistory());
      await saveWinners([]);
      return [];
    };
    const result = writeQueue.then(run, run);
    writeQueue = result.catch(() => {});
    return result;
  }

  return { namesFile, winnersFile, historyFile, loadNames, loadWinners, loadHistory, saveNames, recordWinner, clearWinners };
}
