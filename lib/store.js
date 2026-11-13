// Reads the roster (names.json) and reads/writes the recent-winner history (winners.json).
// Pure helpers are exported separately so they can be unit-tested without touching disk.

import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import path from 'node:path';

export const MAX_NAMES = 30;
export const MAX_WINNERS = 3;
export const MAX_NAME_LENGTH = 40;

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

  for (const entry of list) {
    if (typeof entry !== 'string' || !entry.trim()) {
      skippedInvalid++;
      continue;
    }
    let name = entry.trim().replace(/\s+/g, ' ');
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

  /** Records a race winner. Rejects names that are not on the roster. */
  function recordWinner(name) {
    const run = async () => {
      const { names } = await loadNames();
      const match = names.find((n) => nameKey(n) === nameKey(name));
      if (!match) {
        const err = new Error(`"${name}" is not in names.json`);
        err.statusCode = 400;
        throw err;
      }
      const winners = addWinner(await loadWinners(), match);
      await saveWinners(winners);
      return winners;
    };
    const result = writeQueue.then(run, run);
    writeQueue = result.catch(() => {});
    return result;
  }

  return { namesFile, winnersFile, loadNames, loadWinners, recordWinner };
}
