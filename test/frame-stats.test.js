import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeFrames, assessPerformance } from '../public/js/frame-stats.js';

const sample = (intervalMs) => ({ intervalMs, updateMs: 2, renderSubmissionMs: 1, drawCalls: 450, triangles: 180000 });
const good = () => {
  const stats = summarizeFrames(Array.from({ length: 180 }, () => sample(1000 / 60)));
  return { count: 12, eliminations: 11, completed: true, allModelsSkinned: true, invalidReasons: [], overall: stats, fullRing: stats };
};

test('frame rate uses total elapsed time and percentiles expose slow frames', () => {
  const stats = summarizeFrames([sample(10), sample(30)]);
  assert.equal(stats.fps, 50);
  assert.equal(stats.p95Ms, 30);
  assert.equal(stats.workP95Ms, 3);
  assert.equal(stats.maxTriangles, 180000);
  assert.equal(summarizeFrames([]), null);
});

test('a complete stable twelve-character match can meet the performance target', () => {
  assert.deepEqual(assessPerformance(good()), { passed: true, reasons: [] });
});

test('a fast ending cannot hide poor performance while everybody is in the ring', () => {
  const report = good();
  report.fullRing = summarizeFrames(Array.from({ length: 180 }, () => sample(40)));
  assert.equal(assessPerformance(report).passed, false);
  assert.ok(assessPerformance(report).reasons.some((r) => r.includes('All wrestlers')));
});

test('incomplete, interrupted, tiny samples and original-model fallback cannot pass', () => {
  for (const patch of [{ completed: false }, { eliminations: 10 }, { allModelsSkinned: false },
    { invalidReasons: ['Tab was hidden.'] }, { fullRing: summarizeFrames([sample(16)]) }]) {
    assert.equal(assessPerformance({ ...good(), ...patch }).passed, false, JSON.stringify(patch));
  }
});

test('occasional long stalls are detected even when p95 and mean FPS look acceptable', () => {
  const report = good();
  report.overall = summarizeFrames([...Array.from({ length: 178 }, () => sample(16)), sample(150), sample(150)]);
  assert.ok(report.overall.fps > 30);
  assert.ok(report.overall.p95Ms < 50);
  assert.equal(assessPerformance(report).passed, false);
});
