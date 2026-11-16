// Issue #88: the background fly-over carries on from page to page instead of restarting.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFlyover, writeFlyover, MAX_AGE_MS } from '../public/js/flyover-handoff.js';

const memory = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) };
};

test('the next page carries on from where the last one left off, plus the time spent getting there', () => {
  const storage = memory();
  writeFlyover(storage, { flyT: 42.5, clock: 300 }, 1_000_000);
  assert.deepEqual(readFlyover(storage, 1_001_500), { flyT: 44, clock: 301.5 });
});

test('nothing saved, unreadable, too old or from the future: start from the beginning', () => {
  assert.equal(readFlyover(memory()), null);
  assert.equal(readFlyover(null), null);
  const storage = memory();
  storage.setItem('derby-flyover', '{oops');
  assert.equal(readFlyover(storage), null);
  storage.setItem('derby-flyover', JSON.stringify({ flyT: 'x', clock: 1, at: 0 }));
  assert.equal(readFlyover(storage, 10), null);
  writeFlyover(storage, { flyT: 10, clock: 10 }, 5_000);
  assert.equal(readFlyover(storage, 5_000 + MAX_AGE_MS + 1), null);
  assert.equal(readFlyover(storage, 4_000), null);
});

test('saving never throws, even where storage is blocked or the numbers are broken', () => {
  const full = { setItem() { throw new Error('QuotaExceededError'); }, getItem: () => null };
  assert.doesNotThrow(() => writeFlyover(full, { flyT: 1, clock: 1 }));
  assert.doesNotThrow(() => writeFlyover(null, { flyT: 1, clock: 1 }));
  const storage = memory();
  writeFlyover(storage, { flyT: NaN, clock: 1 });
  assert.equal(storage.getItem('derby-flyover'), null);
});
