// Reads the roster (names.json) and reads/writes the recent-winner list (winners.json, last three)
// and the full winner history (history.json, every result ever recorded).
// Pure helpers are exported separately so they can be unit-tested without touching disk.

import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { parseNames, parseWinners, parseHistory, addWinner, validateRoster, checkWinner, checkAbsentees, MAX_HISTORY } from '../public/js/data-rules.js';

// The rules themselves live in public/js/data-rules.js, shared with the browser-only demo.
export * from '../public/js/data-rules.js';

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
      const parsed = validateRoster(raw);
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
  /** Saves a pick: the winner, how it was decided, and who was marked absent (`absent`, names). */
  function recordWinner(name, mode = 'race', absent = []) {
    const run = async () => {
      const { names } = await loadNames();
      const match = checkWinner(names, name, mode);
      const recent = await loadWinners();
      const missing = checkAbsentees(names, recent, match, absent);
      const date = new Date().toISOString();
      const history = await loadHistory();
      const winners = addWinner(recent, match, date);
      await saveWinners(winners);
      await saveHistory([...history, { name: match, date, mode, absent: missing }]);
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
