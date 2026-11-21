// Pre-match broadcast chyron (#123 phase 3): builds lively one-line ticker items from the current
// roster, recent winners, and history.json — pure logic, no DOM or network dependencies.

import { nameKey, selectRacers } from './eligibility.js';

function shortDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Computes rotating broadcast chyron items: `[{ tag, text }]`.
 * - Underdog / longest drought among currently checked-in players (from `history`, newest first).
 * - Most recent winner sitting out (from `winners`, oldest first).
 * - Live stage hype for the selected mode.
 */
export function buildChyronLines({ roster = [], absent = new Set(), winners = [], history = [], show = (n) => n, mode = null } = {}) {
  const lines = [];
  const readyNames = selectRacers(roster, absent);

  // 1. Live stage hype for the active mode.
  if (mode && readyNames.length >= 2) {
    if (mode.id === 'race') {
      lines.push({ tag: 'ON GRID', text: `${readyNames.length} racers idling on the Chesapeake Bay Bridge.` });
    } else if (mode.id === 'rumble') {
      lines.push({ tag: 'RING LIVE', text: `${readyNames.length} wrestlers warming up for the battle royal.` });
    } else {
      lines.push({ tag: 'UP NEXT', text: `${mode.name} — ${readyNames.length} players ready.` });
    }
  }

  // 2. Underdog / drought callout from winner history (history is newest-first).
  if (readyNames.length >= 2 && history.length > 0) {
    const lastSeen = new Map();
    history.forEach((entry, idx) => {
      const k = nameKey(entry.name);
      if (!lastSeen.has(k)) lastSeen.set(k, idx);
    });
    let bestName = null;
    let bestGap = -1;
    let neverWon = false;
    for (const name of readyNames) {
      const k = nameKey(name);
      if (!lastSeen.has(k)) {
        if (!neverWon) {
          neverWon = true;
          bestName = name;
          bestGap = Infinity;
        }
      } else if (!neverWon) {
        const gap = lastSeen.get(k);
        if (gap > bestGap) {
          bestGap = gap;
          bestName = name;
        }
      }
    }
    if (bestName && neverWon) {
      lines.push({ tag: 'UNDERDOG', text: `${show(bestName)} has yet to lead a meeting — could today be the day?` });
    } else if (bestName && bestGap >= 3) {
      lines.push({ tag: 'UNDERDOG', text: `${show(bestName)} hasn’t led in ${bestGap} picks.` });
    }
  }

  // 3. Most recent winner on cooldown.
  if (winners.length > 0) {
    const latest = winners[winners.length - 1];
    const when = shortDate(latest.date);
    lines.push({
      tag: 'COOLDOWN',
      text: `${show(latest.name)}${when ? ` (${when})` : ''} won last — sits out 3 picks.`,
    });
  }

  return lines;
}
