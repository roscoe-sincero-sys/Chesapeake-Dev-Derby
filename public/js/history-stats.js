// Broadcast Hall of Fame stats (#133 phase 2): pure client-side analytics computed from
// history.json, the current roster, and the active 3-pick winner cooldown list.

import { nameKey } from './eligibility.js';

/**
 * Computes Broadcast Stat Strip & All-Time Standings from newest-first `history`.
 * `show` maps a stored name to its display form (e.g. shortened email).
 */
export function computeHistoryStats({ history = [], rosterNames = [], winners = [], show = (n) => n } = {}) {
  const sittingOutKeys = new Set(winners.map((w) => nameKey(w.name)));
  const total = history.length;

  // Mode mix counts (in display order).
  const modeCounts = { race: 0, wrestle: 0, skip: 0, unknown: 0 };
  const byKey = new Map();

  const ensure = (rawName) => {
    const key = nameKey(rawName);
    let entry = byKey.get(key);
    if (!entry) {
      entry = {
        key,
        name: rawName,
        shown: show(rawName),
        total: 0,
        race: 0,
        wrestle: 0,
        skip: 0,
        unknown: 0,
        lastDate: null,
        lastIndex: Infinity,
        sittingOut: sittingOutKeys.has(key),
      };
      byKey.set(key, entry);
    }
    return entry;
  };

  // Seed active roster members so 0-win teammates appear in Standings & Underdog calculations.
  for (const name of rosterNames) ensure(name);

  history.forEach((h, idx) => {
    const mode = h.mode === 'race' || h.mode === 'wrestle' || h.mode === 'skip' ? h.mode : 'unknown';
    modeCounts[mode]++;
    const entry = ensure(h.name);
    entry.total++;
    entry[mode]++;
    if (idx < entry.lastIndex) {
      entry.lastIndex = idx;
      entry.lastDate = h.date ?? null;
    }
  });

  // Ranked All-Time Standings: most wins -> most recent win -> alphabetical.
  const standings = [...byKey.values()].sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    if (a.lastIndex !== b.lastIndex) return a.lastIndex - b.lastIndex;
    return a.shown.localeCompare(b.shown, undefined, { sensitivity: 'base' });
  });
  let prevTotal = null;
  let currentRank = 0;
  standings.forEach((row, i) => {
    if (row.total !== prevTotal) {
      currentRank = i + 1;
      prevTotal = row.total;
    }
    row.rank = currentRank;
  });

  // All-Time Leader(s).
  let leader = null;
  if (total > 0 && standings.length > 0 && standings[0].total > 0) {
    const topWins = standings[0].total;
    const leaders = standings.filter((s) => s.total === topWins);
    leader = {
      names: leaders.map((l) => l.shown),
      wins: topWins,
      sharePct: Math.round((topWins / total) * 100),
    };
  }

  // Longest active drought (eligible roster member not currently sitting out).
  let underdog = null;
  if (rosterNames.length > 0 && total > 0) {
    const eligible = rosterNames
      .map((n) => byKey.get(nameKey(n)))
      .filter((e) => e && !e.sittingOut);
    if (eligible.length > 0) {
      eligible.sort((a, b) => {
        if (b.lastIndex !== a.lastIndex) return b.lastIndex - a.lastIndex;
        return a.shown.localeCompare(b.shown, undefined, { sensitivity: 'base' });
      });
      const pick = eligible[0];
      underdog = {
        name: pick.shown,
        neverWon: pick.lastIndex === Infinity,
        picksAgo: pick.lastIndex === Infinity ? null : pick.lastIndex,
      };
    }
  }

  const pct = (n) => (total ? Math.round((n / total) * 100) : 0);
  const modeMix = {
    total,
    race: { count: modeCounts.race, pct: pct(modeCounts.race) },
    wrestle: { count: modeCounts.wrestle, pct: pct(modeCounts.wrestle) },
    skip: { count: modeCounts.skip, pct: pct(modeCounts.skip) },
    unknown: { count: modeCounts.unknown, pct: pct(modeCounts.unknown) },
  };

  return { total, leader, underdog, modeMix, standings, sittingOutKeys };
}
