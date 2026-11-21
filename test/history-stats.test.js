import test from 'node:test';
import assert from 'node:assert/strict';
import { computeHistoryStats } from '../public/js/history-stats.js';

test('computeHistoryStats identifies all-time leader, ties, underdog drought, mode mix, and standings', () => {
  const rosterNames = ['Ada', 'Grace', 'Linus', 'Hedy', 'Ken'];
  const winners = [{ name: 'Ken', date: '2026-11-20T14:00:00Z' }];
  const history = [
    { name: 'Ken', date: '2026-11-20T14:00:00Z', mode: 'wrestle' },
    { name: 'Ada', date: '2026-11-19T14:00:00Z', mode: 'race' },
    { name: 'Grace', date: '2026-11-18T14:00:00Z', mode: 'wrestle' },
    { name: 'Ada', date: '2026-11-17T14:00:00Z', mode: 'skip' },
    { name: 'Linus', date: '2026-11-16T14:00:00Z', mode: null },
  ];
  const stats = computeHistoryStats({ history, rosterNames, winners });

  assert.deepEqual(stats.leader, { names: ['Ada'], wins: 2, sharePct: 40 });
  assert.deepEqual(stats.underdog, { name: 'Hedy', neverWon: true, picksAgo: null });
  assert.equal(stats.modeMix.total, 5);
  assert.deepEqual(stats.modeMix.race, { count: 1, pct: 20 });
  assert.deepEqual(stats.modeMix.wrestle, { count: 2, pct: 40 });
  assert.deepEqual(stats.modeMix.skip, { count: 1, pct: 20 });
  assert.deepEqual(stats.modeMix.unknown, { count: 1, pct: 20 });

  assert.equal(stats.standings[0].shown, 'Ada');
  assert.equal(stats.standings[0].rank, 1);
  assert.equal(stats.standings[0].total, 2);
  // Ken, Grace, Linus are tied at 1 win -> all rank 2.
  assert.deepEqual(stats.standings.slice(1, 4).map((s) => s.rank), [2, 2, 2]);
  assert.equal(stats.standings.find((s) => s.shown === 'Ken').sittingOut, true);
  assert.equal(stats.standings.at(-1).shown, 'Hedy');
  assert.equal(stats.standings.at(-1).total, 0);
});

test('computeHistoryStats reports longest drought when everyone on the roster has won', () => {
  const rosterNames = ['Ada', 'Grace', 'Linus'];
  const history = [
    { name: 'Ada', mode: 'race' },
    { name: 'Grace', mode: 'wrestle' },
    { name: 'Linus', mode: 'race' },
    { name: 'Grace', mode: 'race' },
  ];
  const stats = computeHistoryStats({ history, rosterNames, winners: [{ name: 'Ada' }] });
  assert.deepEqual(stats.leader, { names: ['Grace'], wins: 2, sharePct: 50 });
  assert.deepEqual(stats.underdog, { name: 'Linus', neverWon: false, picksAgo: 2 });
});

test('computeHistoryStats handles empty history cleanly', () => {
  const stats = computeHistoryStats({ history: [], rosterNames: ['Ada', 'Grace'], winners: [] });
  assert.equal(stats.total, 0);
  assert.equal(stats.leader, null);
  assert.equal(stats.underdog, null);
  assert.equal(stats.standings.length, 2);
});
