import * as THREE from 'three';
import { prepareWrestlerModels } from './wrestlers.js';
import { planRosterPreview, PACE } from './wrestle-sim.js';
import { WrestleMatch } from './wrestle.js';
import { mulberry32 } from './sim.js';
import { summarizeFrames, assessPerformance, PERFORMANCE_TARGET } from './frame-stats.js';

const $ = (id) => document.getElementById(id);
const runs = [];
const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed')) || 17;
let renderer, match = null, run = null, environment;
let last = null, lastDisplay = 0, paused = false;

export function getPerformanceRuns() { return structuredClone(runs); }
export function getCurrentPerformanceRun() {
  return run ? { count: run.count, state: run.state, simulationSeconds: match?.t ?? 0,
    expectedSeconds: match ? match.plan.duration + PACE.victory : 0, samples: run.samples.length,
    remaining: match?.inRing().length, invalidReasons: [...run.invalidReasons] } : null;
}

function invalidate(reason) {
  if (run?.state === 'running' && !run.invalidReasons.includes(reason)) run.invalidReasons.push(reason);
}

function resize() {
  invalidate('Window size or pixel ratio changed.');
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(innerWidth, innerHeight, false);
  match?.resize(innerWidth / innerHeight);
  if (match && run?.state !== 'running') renderer.render(match.scene, match.camera);
  last = null;
}

function readEnvironment() {
  const gl = renderer.getContext();
  const debug = gl.getExtension('WEBGL_debug_renderer_info');
  const gpu = debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  return {
    userAgent: navigator.userAgent, gpu, softwareRenderer: /swiftshader|llvmpipe|software|basic render/i.test(gpu),
    cssWidth: innerWidth, cssHeight: innerHeight, pixelRatio: renderer.getPixelRatio(),
    drawWidth: renderer.domElement.width, drawHeight: renderer.domElement.height,
    hardwareConcurrency: navigator.hardwareConcurrency,
    contextAttributes: gl.getContextAttributes(),
  };
}

function updateDisplay() {
  if (!run) return;
  const recent = summarizeFrames(run.samples.slice(-120));
  $('fps').textContent = recent ? `${recent.fps.toFixed(1)} FPS` : 'Warming up';
  $('p95').textContent = recent ? `${recent.p95Ms.toFixed(1)} ms` : '—';
  $('work').textContent = recent ? `${recent.workP95Ms.toFixed(1)} ms` : '—';
  $('remaining').textContent = `${match.inRing().length} / ${run.count}`;
}

function finish(completed) {
  if (!run || run.state !== 'running') return;
  run.state = completed ? 'complete' : 'stopped';
  const report = {
    schemaVersion: 1, createdAt: run.createdAt, count: run.count, seed, completed,
    environment: run.environment, target: PERFORMANCE_TARGET,
    startupMs: run.startupMs, buildMs: run.buildMs, warmupSeconds: 2,
    wallSeconds: (performance.now() - run.startedAt) / 1000,
    simulationSeconds: match.t, expectedSeconds: match.plan.duration + PACE.victory,
    eliminations: run.eliminations, winner: match.wrestlers[match.plan.winner].kind.label,
    characters: match.wrestlers.map((w) => w.kind.id),
    allModelsSkinned: match.wrestlers.every((w) => w.rig.skinnedRig),
    invalidReasons: [...run.invalidReasons],
    overall: summarizeFrames(run.samples),
    fullRing: summarizeFrames(run.samples.filter((s) => s.remaining === run.count)),
    byRemaining: Object.fromEntries(Array.from({ length: run.count }, (_, i) => i + 1)
      .map((remaining) => [remaining, summarizeFrames(run.samples.filter((s) => s.remaining === remaining))])),
    memory: { geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures },
    notes: 'Full-window match renderer with the same antialiasing, shadows, pixel-ratio cap and dt cap as Game. '
      + 'Intervals are requestAnimationFrame pacing. Frame work is CPU update plus render submission, not GPU execution time. '
      + 'Includes the ring, crowd, labels, effects and all loaded characters; no meeting results are saved.',
  };
  report.assessment = assessPerformance(report);
  runs.push(report);
  const item = document.createElement('li');
  item.className = report.assessment.passed ? 'passed' : 'failed';
  const stats = report.overall;
  item.textContent = `${report.count} wrestlers: ${stats ? `${stats.fps.toFixed(1)} FPS · p95 ${stats.p95Ms.toFixed(1)} ms` : 'no sample'}. `
    + (report.assessment.passed ? 'Meets target on this device.' : report.assessment.reasons.join(' '));
  $('run-results').prepend(item);
  $('download-results').disabled = false;
  $('pause-run').disabled = true;
  $('run-status').textContent = completed
    ? `${report.winner} wins. ${report.assessment.passed ? 'Performance target met on this device.' : 'Review the results below.'}`
    : 'Run stopped. Start again to record a complete match.';
  updateDisplay();
}

async function start(count) {
  if (run?.state === 'running') finish(false);
  if (match) { match.dispose(); match = null; }
  $('run-twelve').disabled = $('run-ten').disabled = true;
  $('run-status').textContent = `Preparing ${count} characters…`;
  try {
    const startupStart = performance.now();
    await prepareWrestlerModels();
    const plan = planRosterPreview(count, mulberry32(seed));
    const buildStart = performance.now();
    match = new WrestleMatch(plan.wrestlers.map((w) => w.name), {
      previewPlan: plan,
      onEvent(event) {
        if (event.type === 'out') run.eliminations++;
      },
    });
    const buildMs = performance.now() - buildStart;
    match.orbit = 0.4; // identical opening camera orientation for both populations
    match.resize(innerWidth / innerHeight);
    match.update(0);
    renderer.render(match.scene, match.camera);
    environment = readEnvironment();
    const startedAt = performance.now();
    run = { count, state: 'running', createdAt: new Date().toISOString(), startedAt,
      startupMs: startedAt - startupStart, buildMs, samples: [], eliminations: 0, invalidReasons: [],
      environment: { ...environment },
    };
    if (!match.wrestlers.every((w) => w.rig.skinnedRig)) invalidate('Some characters used the original-model fallback.');
    if (document.hidden) invalidate('Tab was hidden.');
    paused = false;
    last = null;
    $('pause-run').disabled = false;
    $('pause-run').textContent = 'Pause';
    $('pause-run').setAttribute('aria-pressed', 'false');
    $('gpu').textContent = `${environment.gpu} · ${environment.drawWidth} × ${environment.drawHeight} pixels`;
    $('performance-scene').setAttribute('aria-label', `${count}-wrestler battle royal performance test`);
    $('run-status').textContent = `${count} warriors enter. Recording through the victory; keep this tab visible.`;
    updateDisplay();
  } catch (error) {
    console.error(error);
    if (match) { match.dispose(); match = null; }
    run = null;
    $('run-status').textContent = 'The match could not load. Reload to retry.';
  } finally {
    $('run-twelve').disabled = $('run-ten').disabled = false;
  }
}

function frame(now) {
  if (!match || run?.state !== 'running' || paused || document.hidden) { last = null; return; }
  if (last === null) { last = now; return; }
  const intervalMs = now - last;
  last = now;
  if (intervalMs <= 0) return;
  const updateStart = performance.now();
  match.update(Math.min(0.1, intervalMs / 1000));
  const renderStart = performance.now();
  renderer.render(match.scene, match.camera);
  const renderEnd = performance.now();
  if (now - run.startedAt >= 2000) {
    run.samples.push({ intervalMs, updateMs: renderStart - updateStart, renderSubmissionMs: renderEnd - renderStart,
      remaining: match.inRing().length, drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles });
  }
  if (now - lastDisplay >= 500) { updateDisplay(); lastDisplay = now; }
  if (match.t >= match.plan.duration + PACE.victory) finish(true);
}

async function init() {
  try {
    renderer = new THREE.WebGLRenderer({ canvas: $('performance-scene'), antialias: true, powerPreference: 'high-performance' });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    resize();
    addEventListener('resize', resize);
    document.addEventListener('visibilitychange', () => { invalidate('Tab was hidden.'); last = null; });
    renderer.domElement.addEventListener('webglcontextlost', () => { invalidate('WebGL context was lost.'); finish(false); });
    $('run-twelve').addEventListener('click', () => start(12));
    $('run-ten').addEventListener('click', () => start(10));
    $('pause-run').addEventListener('click', () => {
      invalidate('Run was paused.'); paused = !paused; last = null;
      $('pause-run').textContent = paused ? 'Resume' : 'Pause';
      $('pause-run').setAttribute('aria-pressed', String(paused));
    });
    $('download-results').addEventListener('click', () => {
      const url = URL.createObjectURL(new Blob([JSON.stringify({ runs }, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = 'wrestling-performance.json'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    renderer.setAnimationLoop(frame);
    if (params.get('autostart') !== '0') await start(params.get('count') === '10' ? 10 : 12);
    else {
      await prepareWrestlerModels();
      $('run-twelve').disabled = $('run-ten').disabled = false;
      $('run-status').textContent = 'Ready. Run 12 or compare with 10.';
    }
  } catch (error) {
    console.error(error);
    $('run-status').textContent = 'This performance test requires WebGL. Enable hardware acceleration and reload.';
  }
}

init();
