import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { prepareWrestlerModels, buildRig, pose, lowestBodyPoint } from './wrestlers.js';
import { WRESTLER_KINDS, planMatch } from './wrestle-sim.js';
import { mulberry32 } from './sim.js';
import { WrestleMatch } from './wrestle.js';
import { WRESTLER_LOOKS } from './wrestler-looks.js';

const $ = (id) => document.getElementById(id);
const viewport = $('viewport');
const requested = new URLSearchParams(location.search).get('character');
const first = Object.hasOwn(WRESTLER_LOOKS, requested) ? requested : 'ghatotkacha';
const requestedOpponent = new URLSearchParams(location.search).get('opponent');
const second = Object.hasOwn(WRESTLER_LOOKS, requestedOpponent) && requestedOpponent !== first ? requestedOpponent : first === 'abhimanyu' ? 'ghatotkacha' : 'abhimanyu';
let kinds = [first, second].map((id) => WRESTLER_KINDS.find((k) => k.id === id));
let renderer, controls, scene, camera;
let rigs = [], originals = [];
let match = null, poseName = 'guard', elapsed = 0, paused = false, original = false, replay = 0;
let cameraView = 'front';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

function replacePair() {
  if (match) endMatch();
  for (const rig of [...rigs, ...originals]) {
    scene.remove(rig.root);
    if (rig.disposeBody) rig.disposeBody();
    else {
      rig.root.traverse((o) => { if (o.geometry?.type === 'LatheGeometry') o.geometry.dispose(); });
      for (const material of rig.owned) material.dispose();
    }
  }
  kinds = [$('left-character').value, $('right-character').value].map((id) => WRESTLER_KINDS.find((k) => k.id === id));
  rigs = kinds.map((kind, i) => buildRig(kind, i ? '#d6b15d' : '#9c7bc1'));
  originals = kinds.map((kind, i) => buildRig(kind, i ? '#d6b15d' : '#9c7bc1', { original: true }));
  for (const rig of [...rigs, ...originals]) scene.add(rig.root);
  for (const [i, side] of ['left', 'right'].entries()) {
    const other = kinds[1 - i].id;
    for (const option of $(`${side}-character`).options) option.disabled = option.value === other;
    const notes = $(`${side}-notes`);
    notes.querySelector('.eyebrow').textContent = `${side.toUpperCase()} WARRIOR / ${kinds[i].style.toUpperCase()}`;
    notes.querySelector('h2').textContent = kinds[i].label;
    notes.querySelector('p:last-child').textContent = WRESTLER_LOOKS[kinds[i].id].description;
  }
  $('prototype-scene').setAttribute('aria-label', `3D preview of ${kinds[0].label} and ${kinds[1].label}`);
  const url = new URL(location.href);
  url.searchParams.set('character', kinds[0].id);
  url.searchParams.set('opponent', kinds[1].id);
  history.replaceState(null, '', url);
  replay = 0;
  elapsed = 0;
}

function studioCamera(view = 'front') {
  cameraView = view;
  controls.enabled = true;
  const lowPose = poseName === 'fall' || poseName === 'sit';
  const targetY = view === 'detail' ? 2.05 : lowPose ? 0.9 : 1.6;
  const aspect = viewport.clientWidth / viewport.clientHeight;
  const distance = Math.max(1, 1.1 / aspect);
  const [x, y, z] = { front: [0.4, lowPose ? 2 : 2.8, -8.4], back: [0, lowPose ? 2 : 2.8, 8.4], detail: [0, 2.7, -5.2] }[view];
  camera.position.set(x * distance, targetY + (y - targetY) * distance, z * distance);
  controls.target.set(0, targetY, 0);
  controls.update();
  document.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
  $('view-label').textContent = `COSTUME STUDY / ${view === 'back' ? 'BACK & GEAR' : view.toUpperCase()}`;
}

function endMatch() {
  if (match) match.dispose();
  match = null;
  $('match-status').hidden = true;
  $('watch-match').innerHTML = 'Watch a two-character match <span>↗</span>';
  $('orbit-hint').textContent = 'Drag to orbit · Scroll to zoom';
  studioCamera();
  document.querySelectorAll('[data-pose]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pose === poseName)));
  $('motion-label').textContent = document.querySelector(`[data-pose="${poseName}"]`).textContent.replace(/^\s*\d+\s*/, '').trim().toUpperCase();
}

function selectPose(name) {
  if (match) endMatch();
  poseName = name;
  elapsed = 0;
  studioCamera(cameraView);
  document.querySelectorAll('[data-pose]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pose === name)));
  $('motion-label').textContent = document.querySelector(`[data-pose="${name}"]`).textContent.replace(/^\s*\d+\s*/, '').trim().toUpperCase();
}

function createStage() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color('#151720');
  scene.fog = new THREE.Fog('#151720', 15, 34);
  camera = new THREE.PerspectiveCamera(36, 1, 0.1, 80);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 3.5;
  controls.maxDistance = 17;
  controls.maxPolarAngle = Math.PI / 2 - 0.01;
  scene.add(new THREE.HemisphereLight('#cbd9f4', '#34283c', 2.1));
  const key = new THREE.DirectionalLight('#ffe3c6', 3.3);
  key.position.set(-3.5, 6, -5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 6, bottom: -4 });
  key.shadow.bias = -0.0002;
  key.shadow.normalBias = 0.025;
  key.shadow.radius = 3;
  scene.add(key);
  const rim = new THREE.DirectionalLight('#b2a0f8', 2.7);
  rim.position.set(1, 4, 3);
  scene.add(rim);
  const fill = new THREE.DirectionalLight('#8cceee', 1.3);
  fill.position.set(4, 2, -3);
  scene.add(fill);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: '#20222d', roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.025;
  floor.receiveShadow = true;
  scene.add(floor);
  const grid = new THREE.GridHelper(24, 48, '#393945', '#2a2c36');
  grid.position.y = -0.021;
  scene.add(grid);
  for (const [i, x] of [1.2, -1.3].entries()) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(i === 0 ? 0.77 : 0.61, i === 0 ? 0.78 : 0.62, 96),
      new THREE.MeshBasicMaterial({ color: i === 0 ? '#80629a' : '#58849a', side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, -0.015, 0);
    scene.add(ring);
  }
  // Half-unit ticks make the relative scale easy to assess without implying real-world heights.
  const points = [];
  for (let y = 0; y <= 3.5; y += 0.25) points.push(new THREE.Vector3(2.5, y, 0.5), new THREE.Vector3(2.5 - (y % 0.5 === 0 ? 0.16 : 0.07), y, 0.5));
  points.push(new THREE.Vector3(2.5, 0, 0.5), new THREE.Vector3(2.5, 3.5, 0.5));
  scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: '#64606d' })));
  studioCamera();
}

function resize() {
  const width = viewport.clientWidth, height = viewport.clientHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  match?.resize(width / height);
  if (!match) studioCamera(cameraView);
}

function renderStudio() {
  for (const [i, rig] of [...rigs, ...originals].entries()) {
    rig.root.visible = i < 2 ? !original : original;
    const character = i % 2;
    rig.root.position.set(character === 0 ? 1.2 : -1.3, 0, 0);
    rig.root.rotation.set(0, character === 0 ? -0.12 : 0.12, 0);
    const phase = elapsed * 5 + character * 0.12;
    const poses = {
      guard: { guard: 0.8, crouch: 0.15, look: Math.sin(elapsed) * 0.05 },
      walk: { walk: phase, stride: 0.6, guard: 0.4, crouch: 0.15 },
      grapple: { armsForward: 1, crouch: 0.35 + Math.sin(elapsed * 2) * 0.1, lean: 0.25 },
      lift: { armsUp: 0.7 + Math.sin(elapsed * 1.8) * 0.3, crouch: 0.12 },
      fall: { spread: 0.4, flail: 0.15, walk: phase },
      sit: { sit: 1, look: 0.2, armsForward: 0.3 },
      victory: { armsUp: 1, spread: 0.25, walk: phase, stride: 0.04 },
    };
    if (!rig.root.visible) continue;
    pose(rig, poses[poseName]);
    if (poseName === 'fall') {
      rig.root.rotation.x = Math.PI / 2;
      rig.root.position.y -= lowestBodyPoint(rig);
    } else if (poseName === 'sit') {
      rig.root.position.y -= lowestBodyPoint(rig);
    }
  }
  controls.update();
  renderer.render(scene, camera);
}

function watchMatch() {
  endMatch();
  const plan = planMatch(['Warrior 1', 'Warrior 2'], mulberry32(7));
  // Preview alternates the winner's costume to exercise both throw directions. It never saves results.
  for (const w of plan.wrestlers) {
    w.kind = kinds[(w.id === plan.winner ? 0 : 1) ^ (replay % 2)];
    w.name = w.kind.label;
  }
  replay++;
  match = new WrestleMatch(plan.wrestlers.map((w) => w.name), {
    previewPlan: plan,
    onEvent(e) {
      if (e.type === 'bell') $('match-status').textContent = 'The bell rings. Last warrior in the ring wins.';
      if (e.type === 'grapple') $('match-status').textContent = `${e.thrower.kind.label} grapples with ${e.victim.kind.label}.`;
      if (e.type === 'throw') $('match-status').textContent = `${e.thrower.kind.label} sends ${e.victim.kind.label} over the ropes.`;
      if (e.type === 'out') $('match-status').textContent = `${e.victim.kind.label} is out. Watch the landing and recovery.`;
    },
    onWinner(w) {
      $('match-status').textContent = `${w.kind.label} wins this preview. Replay to reverse the roles.`;
      $('watch-match').textContent = 'Replay with roles reversed ↗';
    },
  });
  paused = false;
  $('pause').textContent = 'Pause motion';
  $('pause').setAttribute('aria-pressed', 'false');
  controls.enabled = false;
  $('match-status').hidden = false;
  $('match-status').textContent = 'The warriors enter the ring…';
  $('watch-match').textContent = 'Restart with roles reversed ↗';
  $('view-label').textContent = 'TWO-CHARACTER MATCH / PREVIEW';
  $('motion-label').textContent = 'SCRIPTED BATTLE ROYAL';
  document.querySelectorAll('[data-pose]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
  $('orbit-hint').textContent = 'Choose a pose or camera view to return to the studio';
  resize();
}

async function init() {
  try {
    renderer = new THREE.WebGLRenderer({ canvas: $('prototype-scene'), antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    createStage();
    resize();
    await prepareWrestlerModels();
    for (const [i, side] of ['left', 'right'].entries()) {
      const select = $(`${side}-character`);
      for (const kind of WRESTLER_KINDS) select.add(new Option(kind.label, kind.id));
      select.value = kinds[i].id;
      select.disabled = false;
      select.addEventListener('change', replacePair);
    }
    replacePair();
    $('loading').hidden = true;
    $('watch-match').disabled = false;
    new ResizeObserver(resize).observe(viewport);
    document.querySelectorAll('[data-pose]').forEach((b) => b.addEventListener('click', () => selectPose(b.dataset.pose)));
    document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => { if (match) endMatch(); studioCamera(b.dataset.view); }));
    $('pause').addEventListener('click', () => {
      paused = !paused;
      $('pause').textContent = paused ? 'Resume motion' : 'Pause motion';
      $('pause').setAttribute('aria-pressed', String(paused));
    });
    $('compare').addEventListener('click', () => {
      if (match) endMatch();
      original = !original;
      $('compare').textContent = original ? 'Show new models' : 'Show original models';
      $('compare').setAttribute('aria-pressed', String(original));
      $('view-label').textContent = original ? 'ORIGINAL PROCEDURAL MODELS' : 'FREE UNIVERSAL BASE CHARACTERS';
    });
    $('watch-match').addEventListener('click', watchMatch);
    let last = performance.now();
    renderer.setAnimationLoop((now) => {
      const dt = Math.min(1 / 30, (now - last) / 1000);
      last = now;
      if (!paused && !document.hidden) elapsed += dt;
      if (match) {
        if (!paused && !document.hidden) match.update(dt);
        renderer.render(match.scene, match.camera);
      } else renderStudio();
    });
    // Keep the default view still when reduced motion is requested; explicit poses remain available.
    if (reducedMotion.matches) { paused = true; $('pause').textContent = 'Resume motion'; $('pause').setAttribute('aria-pressed', 'true'); }
  } catch (error) {
    console.error(error);
    $('loading').textContent = 'The character preview could not load. Check that WebGL is available, then reload to retry.';
  }
}

$('watch-match').disabled = true;
init();
