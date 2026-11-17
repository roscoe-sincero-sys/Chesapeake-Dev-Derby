// Pure frame-statistics helpers shared by the benchmark and its Node tests.
export const PERFORMANCE_TARGET = { minFps: 30, maxP95Ms: 50, minSamples: 120, maxLongFramePercent: 1 };

function percentile(sorted, p) {
  return sorted.length ? sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)] : null;
}

export function summarizeFrames(samples) {
  if (!samples.length) return null;
  const intervals = samples.map((s) => s.intervalMs).sort((a, b) => a - b);
  const work = samples.map((s) => s.updateMs + s.renderSubmissionMs).sort((a, b) => a - b);
  const totalMs = intervals.reduce((sum, ms) => sum + ms, 0);
  return {
    frames: samples.length,
    seconds: totalMs / 1000,
    fps: samples.length * 1000 / totalMs,
    medianMs: percentile(intervals, 0.5), p95Ms: percentile(intervals, 0.95), p99Ms: percentile(intervals, 0.99),
    workMedianMs: percentile(work, 0.5), workP95Ms: percentile(work, 0.95),
    updateMeanMs: samples.reduce((sum, s) => sum + s.updateMs, 0) / samples.length,
    renderSubmissionMeanMs: samples.reduce((sum, s) => sum + s.renderSubmissionMs, 0) / samples.length,
    longFramePercent: intervals.filter((ms) => ms > 100).length * 100 / samples.length,
    maxDrawCalls: Math.max(...samples.map((s) => s.drawCalls)),
    maxTriangles: Math.max(...samples.map((s) => s.triangles)),
  };
}

/** A successful run needs both a complete match and a sustained sample with everybody in-ring. */
export function assessPerformance(report) {
  const reasons = [...report.invalidReasons];
  if (!report.completed) reasons.push('Match did not finish.');
  if (!report.allModelsSkinned) reasons.push('Some characters used the original-model fallback.');
  if (report.eliminations !== report.count - 1) reasons.push('Not every elimination was observed.');
  for (const [label, stats] of [['Full match', report.overall], ['All wrestlers in the ring', report.fullRing]]) {
    if (!stats || stats.frames < PERFORMANCE_TARGET.minSamples) { reasons.push(`${label}: too few frame samples.`); continue; }
    if (stats.fps < PERFORMANCE_TARGET.minFps) reasons.push(`${label}: average below 30 FPS.`);
    if (stats.p95Ms > PERFORMANCE_TARGET.maxP95Ms) reasons.push(`${label}: p95 frame interval above 50 ms.`);
    if (stats.longFramePercent > PERFORMANCE_TARGET.maxLongFramePercent) reasons.push(`${label}: too many frames above 100 ms.`);
  }
  return { passed: reasons.length === 0, reasons };
}
