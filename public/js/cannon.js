// "Deploy Cannon" (3D Human Cannonball Volley): wooden Chesapeake Bay pier with brass circus
// cannons, striped windsock, bobbing concentric bullseye barge (DEV / QA / STAGING / PROD),
// reverse-solved parabolic human cannonballs with aviator goggles, capes, smoke trails, rogue
// seagulls, tiny cocktail umbrellas, expanding water splash rings, and dramatic Barge Cam.

import * as THREE from 'three';
import { mat, box, ball, cyl, cone, torus, plane, at, canvasTexture, FONT_UI, FONT_MONO, roundRect } from './util3d.js';
import { Particles } from './effects.js';
import {
  planCannonMatch,
  cannonBattery,
  bargePosAt,
  sampleShotState,
  DEFAULT_CANNON_DURATION,
  BARGE_BASE_Z,
  BARGE_RADIUS,
  SLOW_MO_SCALE,
} from './cannon-sim.js';

/** Crisp upright billboarded nameplate above each cannonball developer. */
function makeCannonTag(name, color) {
  const tex = canvasTexture(256, 56, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#121622';
    roundRect(ctx, 8, 8, w - 16, h - 16, 10);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#f8f9fa';
    ctx.font = `700 22px ${FONT_UI}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = name.length > 14 ? `${name.slice(0, 13)}…` : name;
    ctx.fillText(label, w / 2, h / 2 + 1);
  });
  const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(2.8, 0.62, 1);
  sprite.position.set(0, 1.85, 0);
  return { sprite, tex, spriteMat };
}

/** Builds a gleaming brass circus cannon on a wooden carriage with recoiling barrel pivot. */
function buildCannonMesh(disposables) {
  const root = new THREE.Group();
  const woodMat = mat('#6e472b', { roughness: 0.8 });
  const ironMat = mat('#2b303a', { roughness: 0.45, metalness: 0.75 });
  const brassMat = mat('#d9a441', { roughness: 0.26, metalness: 0.85 });
  const brassDark = mat('#a67624', { roughness: 0.35, metalness: 0.8 });

  // Wooden carriage cheeks & wheels
  root.add(at(box(0.24, 0.72, 1.45, woodMat), -0.46, 0.44, 0));
  root.add(at(box(0.24, 0.72, 1.45, woodMat), 0.46, 0.44, 0));
  root.add(at(box(1.0, 0.22, 1.25, woodMat), 0, 0.22, 0.05));
  for (const sx of [-0.62, 0.62]) {
    for (const sz of [-0.46, 0.46]) {
      root.add(at(cyl(0.28, 0.28, 0.14, ironMat, 12), sx, 0.28, sz, 0, 0, Math.PI / 2));
    }
  }

  // Pivoting gleaming brass barrel
  const barrelPivot = new THREE.Group();
  barrelPivot.position.set(0, 0.88, 0.15);
  const barrel = new THREE.Group();
  barrel.add(at(cyl(0.34, 0.44, 2.2, brassMat, 16), 0, 0, -0.75, Math.PI / 2, 0, 0));
  barrel.add(at(torus(0.36, 0.06, brassDark), 0, 0, -1.82));
  barrel.add(at(torus(0.42, 0.05, brassDark), 0, 0, -0.35));
  barrel.add(at(ball(0.42, brassDark), 0, 0, 0.38));
  barrel.add(at(ball(0.15, brassMat), 0, 0, 0.82));
  // Glowing fuse spark tip on the breech
  const sparkMat = new THREE.MeshStandardMaterial({ color: '#ffe066', emissive: '#ff922b', emissiveIntensity: 1.8 });
  disposables.push(sparkMat);
  const spark = at(ball(0.11, sparkMat), 0, 0.46, 0.26);
  barrel.add(spark);

  barrelPivot.add(barrel);
  barrelPivot.rotation.x = 0.58; // tilted skyward toward the Chesapeake bullseye barge!
  root.add(barrelPivot);

  return { root, barrelPivot, barrel, spark };
}

/** Builds a launched human-cannonball developer with color-coded helmet, aviator goggles, cape & cocktail umbrella chute. */
function buildCannonballDev(shot, disposables) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const suitMat = mat(shot.color, { roughness: 0.45 });
  const skinMat = mat('#f1c29b', { roughness: 0.65 });
  const darkMat = mat('#212529', { roughness: 0.5 });
  const goggleMat = mat('#38bdf8', { roughness: 0.15, metalness: 0.5, emissive: '#0ea5e9', emissiveIntensity: 0.5 });

  // Torso, head, color-coded helmet & aviator goggles
  body.add(at(cyl(0.34, 0.38, 0.86, suitMat, 12), 0, 0.55, 0));
  body.add(at(ball(0.34, skinMat), 0, 1.18, 0));
  body.add(at(ball(0.36, suitMat, 1.0, 0.65, 1.0), 0, 1.32, 0));
  // Tiny aviator goggles
  body.add(at(cyl(0.11, 0.11, 0.09, goggleMat, 10), -0.14, 1.22, -0.28, Math.PI / 2, 0, 0));
  body.add(at(cyl(0.11, 0.11, 0.09, goggleMat, 10), 0.14, 1.22, -0.28, Math.PI / 2, 0, 0));
  // Flowing stunt cape
  body.add(at(box(0.55, 0.72, 0.06, mat('#f2b817', { roughness: 0.5 })), 0, 0.62, 0.36, 0.35, 0, 0));
  // Arms & boots
  body.add(at(cyl(0.09, 0.09, 0.55, suitMat, 8), -0.44, 0.82, 0, 0, 0, 0.9));
  body.add(at(cyl(0.09, 0.09, 0.55, suitMat, 8), 0.44, 0.82, 0, 0, 0, -0.9));
  body.add(at(box(0.18, 0.24, 0.28, darkMat), -0.16, 0.08, 0));
  body.add(at(box(0.18, 0.24, 0.28, darkMat), 0.16, 0.08, 0));

  // Tiny cocktail umbrella / emergency parachute (shown on Emergency Chute archetype!)
  const chute = new THREE.Group();
  chute.position.set(0, 1.65, 0);
  chute.add(at(cyl(0.025, 0.025, 0.95, mat('#e9ecef'), 6), 0, 0.45, 0));
  chute.add(at(cone(0.95, 0.42, mat('#ff6b6b', { roughness: 0.5 }), 8), 0, 1.0, 0));
  chute.visible = false;
  root.add(chute);

  // Rogue Chesapeake Bay seagull (flashes in on Seagull Interception!)
  const gull = new THREE.Group();
  gull.add(at(ball(0.32, mat('#ffffff'), 1.5, 0.7, 0.8), 0, 0, 0));
  gull.add(at(box(1.5, 0.06, 0.38, mat('#dee2e6')), 0, 0.08, 0));
  gull.add(at(cone(0.08, 0.26, mat('#f59f00'), 6), 0.56, 0, 0, 0, 0, -Math.PI / 2));
  gull.visible = false;
  root.add(gull);

  const tag = makeCannonTag(shot.name, shot.color);
  root.add(tag.sprite);
  disposables.push(tag.tex, tag.spriteMat);

  return { root, body, chute, gull, tag };
}

/** Builds the floating concentric target barge (DEV / QA / STAGING / golden PROD bullseye). */
function buildTargetBarge(disposables) {
  const group = new THREE.Group();
  const hullMat = mat('#343a40', { roughness: 0.75, metalness: 0.35 });
  const rimMat = mat('#f2b817', { roughness: 0.5 });

  // Weathered flat-deck barge hull + yellow bumper rail
  group.add(at(cyl(BARGE_RADIUS + 0.45, BARGE_RADIUS + 0.1, 1.15, hullMat, 32), 0, 0, 0));
  group.add(at(torus(BARGE_RADIUS + 0.4, 0.18, rimMat), 0, 0.52, 0, Math.PI / 2, 0, 0));

  // Painted concentric target deck texture (DEV -> QA -> STAGING -> golden PROD bullseye)
  const deckTex = canvasTexture(512, 512, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const rings = [
      { r: 248, fill: '#2b3446', stroke: '#4dabf7', label: 'DEV', ly: 34, col: '#a5d8ff' },
      { r: 186, fill: '#1e3a34', stroke: '#20c997', label: 'QA', ly: 92, col: '#96f2d7' },
      { r: 124, fill: '#452b10', stroke: '#f59f00', label: 'STAGING', ly: 152, col: '#ffe066' },
      { r: 62, fill: '#f2b817', stroke: '#ffffff', label: 'PROD', ly: cy, col: '#1c1400' },
    ];
    for (const ring of rings) {
      ctx.beginPath();
      ctx.arc(cx, cy, ring.r, 0, Math.PI * 2);
      ctx.fillStyle = ring.fill;
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = ring.stroke;
      ctx.stroke();
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const ring of rings) {
      ctx.fillStyle = ring.col;
      ctx.font = `900 ${ring.label === 'PROD' ? 32 : 24}px ${FONT_MONO}`;
      ctx.fillText(ring.label, cx, ring.ly);
    }
  });
  disposables.push(deckTex);
  const deckMat = new THREE.MeshStandardMaterial({ map: deckTex, roughness: 0.55 });
  disposables.push(deckMat);
  const deck = new THREE.Mesh(new THREE.CircleGeometry(BARGE_RADIUS + 0.1, 32), deckMat);
  deck.rotation.x = -Math.PI / 2;
  deck.position.y = 0.59;
  group.add(deck);

  // Floating sign board behind the barge: "PROD / LEAD STANDUP"
  const signTex = canvasTexture(512, 96, (ctx, w, h) => {
    ctx.fillStyle = '#141724';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#f2b817';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = '#f2b817';
    ctx.font = `900 34px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PROD / LEAD STANDUP', w / 2, h / 2 + 2);
  });
  disposables.push(signTex);
  const signMat = new THREE.MeshStandardMaterial({ map: signTex, emissiveMap: signTex, emissive: '#ffffff', emissiveIntensity: 0.45 });
  disposables.push(signMat);
  group.add(at(box(0.26, 3.6, 0.26, hullMat), -4.2, 2.0, -BARGE_RADIUS + 0.4));
  group.add(at(box(0.26, 3.6, 0.26, hullMat), 4.2, 2.0, -BARGE_RADIUS + 0.4));
  group.add(at(plane(9.4, 1.8, signMat), 0, 3.8, -BARGE_RADIUS + 0.55));

  return group;
}

/** Procedural soft billowing cumulus cloud puff texture. */
function makeCloudPuffTexture() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const lobes = [
      { x: 0.50, y: 0.48, r: 0.34, top: 'rgba(255,255,255,0.92)', mid: 'rgba(228,238,249,0.56)' },
      { x: 0.32, y: 0.55, r: 0.25, top: 'rgba(250,253,255,0.85)', mid: 'rgba(212,226,242,0.50)' },
      { x: 0.68, y: 0.56, r: 0.26, top: 'rgba(248,252,255,0.85)', mid: 'rgba(208,223,240,0.48)' },
      { x: 0.44, y: 0.36, r: 0.23, top: 'rgba(255,255,255,0.95)', mid: 'rgba(236,244,252,0.54)' },
      { x: 0.60, y: 0.38, r: 0.21, top: 'rgba(255,255,255,0.92)', mid: 'rgba(232,241,250,0.50)' },
    ];
    for (const l of lobes) {
      const cx = l.x * w;
      const cy = l.y * h;
      const rad = l.r * w;
      const g = ctx.createRadialGradient(cx - rad * 0.14, cy - rad * 0.18, rad * 0.08, cx, cy, rad);
      g.addColorStop(0, l.top);
      g.addColorStop(0.55, l.mid);
      g.addColorStop(1, 'rgba(200,218,238,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function buildCloudCluster(cloudTex, x, y, z, scale, disposables) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  for (const p of [
    { dx: 0, dy: 0.3, dz: 0, sx: 1.25, sy: 0.72, tint: '#ffffff' },
    { dx: -1.5, dy: -0.1, dz: 0.3, sx: 0.95, sy: 0.58, tint: '#edf4fc' },
    { dx: 1.5, dy: -0.05, dz: -0.2, sx: 1.0, sy: 0.62, tint: '#f0f6fd' },
    { dx: 0.3, dy: 0.75, dz: 0.1, sx: 0.85, sy: 0.55, tint: '#ffffff' },
  ]) {
    const sMat = new THREE.SpriteMaterial({ map: cloudTex, color: p.tint, transparent: true, opacity: 0.88, depthWrite: false });
    disposables.push(sMat);
    const sp = new THREE.Sprite(sMat);
    sp.position.set(p.dx * scale, p.dy * scale, p.dz * scale);
    sp.scale.set(5.4 * p.sx * scale, 4.4 * p.sy * scale, 1);
    group.add(sp);
  }
  return group;
}

/** Builds the Chesapeake Bay pier, bollards, pier lanterns, whipping windsock, buoys, islands, clouds & barge. */
function buildCannonArena(scene, windKts, disposables) {
  scene.background = new THREE.Color('#6db4e8');
  scene.fog = new THREE.Fog('#6db4e8', 115, 340);

  scene.add(new THREE.HemisphereLight('#e4f3ff', '#1e4b5e', 1.15));
  const sun = new THREE.DirectionalLight('#fff2d6', 1.75);
  sun.position.set(24, 42, 30);
  scene.add(sun);

  // Chesapeake Bay water
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(600, 600),
    mat('#225c72', { roughness: 0.36, metalness: 0.16 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0;
  scene.add(water);

  // Scenic Chesapeake Bay islands framing the bay around the bullseye barge
  const sandMat = mat('#d9c598', { roughness: 0.92 });
  const grassMat = mat('#4a7c44', { roughness: 0.88 });
  const pineMat = mat('#2d5a34', { roughness: 0.85 });
  for (const isl of [
    { x: -46, z: -54, r: 14, h: 4.0, lighthouse: true },
    { x: 48, z: -62, r: 15, h: 4.2 },
    { x: -16, z: -98, r: 18, h: 5.0 },
    { x: 30, z: -102, r: 16, h: 4.5 },
  ]) {
    const g = new THREE.Group();
    g.position.set(isl.x, 0, isl.z);
    g.add(at(cyl(isl.r * 0.88, isl.r * 1.1, 0.7, sandMat, 16), 0, 0.2, 0));
    g.add(at(ball(isl.r * 0.7, grassMat, 1.05, isl.h / (isl.r * 0.7), 0.95), 0, 0.3, 0));
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      g.add(at(cone(0.9, 2.4, pineMat, 7), Math.cos(a) * isl.r * 0.45, isl.h * 0.6 + 1.2, Math.sin(a) * isl.r * 0.45));
    }
    if (isl.lighthouse) {
      g.add(at(cyl(0.75, 1.05, 5.2, mat('#f8f9fa'), 12), 0, isl.h * 0.8 + 2.6, 0));
      g.add(at(cone(1.0, 1.2, mat('#c92a2a'), 12), 0, isl.h * 0.8 + 5.7, 0));
    }
    scene.add(g);
  }

  // Drifting volumetric cumulus clouds across the Chesapeake sky
  const cloudTex = makeCloudPuffTexture();
  disposables.push(cloudTex);
  const clouds = [];
  for (const [cx, cy, cz, sc] of [
    [-34, 24, -44, 1.6], [-10, 29, -76, 1.9], [22, 26, -66, 1.7],
    [42, 22, -40, 1.5], [-26, 20, -24, 1.3], [16, 23, -28, 1.4],
    [0, 32, -96, 2.2], [-44, 28, -82, 1.8],
  ]) {
    const c = buildCloudCluster(cloudTex, cx, cy, cz, sc, disposables);
    scene.add(c);
    clouds.push({ group: c, baseX: cx, speed: 0.35 + (Math.abs(cx) % 4) * 0.1 });
  }

  // Wooden Chesapeake Bay pier deck + back parapet + timber pilings
  const plankMat = mat('#7c5534', { roughness: 0.88 });
  const postMat = mat('#4e3420', { roughness: 0.92 });
  scene.add(at(box(32, 0.85, 10.5, plankMat), 0, 0.45, 2.8));
  scene.add(at(box(31, 1.9, 3.6, plankMat), 0, 1.85, 5.2));
  for (let x = -14; x <= 14; x += 4) {
    scene.add(at(cyl(0.32, 0.36, 2.2, postMat, 8), x, -0.2, -2.0));
    scene.add(at(cyl(0.24, 0.28, 0.72, mat('#212529', { metalness: 0.5 }), 10), x, 1.18, -1.8));
  }

  // Pier lanterns
  const lanternMat = mat('#ffe066', { emissive: '#ffbe0b', emissiveIntensity: 1.6 });
  for (const lx of [-14.2, 14.2]) {
    scene.add(at(cyl(0.12, 0.14, 3.4, postMat, 8), lx, 2.4, -1.6));
    scene.add(at(ball(0.28, lanternMat), lx, 4.2, -1.6));
  }

  // Striped whipping windsock on the right corner of the pier!
  scene.add(at(cyl(0.08, 0.1, 4.8, mat('#adb5bd', { metalness: 0.7 }), 8), 15.2, 3.1, -1.6));
  const sockPivot = new THREE.Group();
  sockPivot.position.set(15.2, 5.3, -1.6);
  const sockRed = mat('#ff4d4d', { roughness: 0.6 });
  const sockWhite = mat('#f8f9fa', { roughness: 0.6 });
  for (let i = 0; i < 4; i++) {
    sockPivot.add(at(cyl(0.26 - i * 0.04, 0.3 - i * 0.04, 0.48, i % 2 === 0 ? sockRed : sockWhite, 10), 0.3 + i * 0.48, 0, 0, 0, 0, Math.PI / 2));
  }
  scene.add(sockPivot);

  // Floating distance buoys & water target rings around the bay
  const buoyRed = mat('#ff4d4d', { roughness: 0.4 });
  const buoyWhite = mat('#f8f9fa', { roughness: 0.4 });
  for (const [bx, bz] of [[-16, -24], [16, -24], [-22, BARGE_BASE_Z], [22, BARGE_BASE_Z], [-14, BARGE_BASE_Z - 20], [14, BARGE_BASE_Z - 20]]) {
    scene.add(at(cyl(0.42, 0.55, 0.85, buoyRed, 10), bx, 0.32, bz));
    scene.add(at(cyl(0.22, 0.35, 0.55, buoyWhite, 10), bx, 0.92, bz));
  }

  // Floating bullseye barge
  const barge = buildTargetBarge(disposables);
  barge.position.set(0, 0.35, BARGE_BASE_Z);
  scene.add(barge);

  return { barge, sockPivot, clouds, windKts };
}

// ------------------------------------------------------------------ Lobby 3D Stage

export class CannonStage {
  constructor(aspect = 16 / 9, initialNames = []) {
    this.t = 0;
    this.names = [];
    this.models = [];
    this.disposables = [];

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(48, aspect, 0.3, 360);
    this.arena = buildCannonArena(this.scene, 24, this.disposables);
    this.setLineup(initialNames);
    this.resize(aspect);
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 1 ? 62 : 48;
    this.camera.updateProjectionMatrix();
  }

  setLineup(names = []) {
    if (names.length === this.names.length && names.every((n, i) => n === this.names[i])) return;
    for (const m of this.models) {
      this.scene.remove(m.cannon.root);
      this.scene.remove(m.dev.root);
    }
    this.models = [];
    this.names = [...names];

    const battery = cannonBattery(Math.max(1, names.length));
    const colors = ['#ff6b6b', '#4dabf7', '#51cf66', '#ffd43b', '#cc5de8', '#ff922b', '#20c997', '#f06595'];
    names.forEach((name, i) => {
      const pad = battery[i];
      const cannon = buildCannonMesh(this.disposables);
      cannon.root.position.set(pad.x, pad.y, pad.z);
      this.scene.add(cannon.root);

      const dev = buildCannonballDev({ name, color: colors[i % colors.length] }, this.disposables);
      dev.root.position.set(pad.x, pad.y + 1.15, pad.z - 1.25);
      dev.root.scale.setScalar(0.75);
      this.scene.add(dev.root);
      this.models.push({ cannon, dev, phase: i * 0.9 });
    });
  }

  update(dt, reduced = false) {
    if (!reduced) this.t += dt;
    const t = this.t;
    this.arena.barge.position.y = 0.35 + (reduced ? 0 : Math.sin(t * 2.2) * 0.18);
    this.arena.sockPivot.rotation.y = reduced ? 0.3 : 0.35 + Math.sin(t * 9) * 0.25;
    if (!reduced) {
      for (const c of this.arena.clouds) c.group.position.x = c.baseX + Math.sin(t * 0.08 * c.speed) * 4;
    }
    for (const m of this.models) {
      m.cannon.spark.visible = !reduced && Math.sin(t * 18 + m.phase) > 0;
      m.dev.body.position.y = reduced ? 0 : Math.sin(t * 4 + m.phase) * 0.08;
    }
    const sway = reduced ? 0 : Math.sin(t * 0.28) * 6.0;
    this.camera.position.set(sway, 7.2, 16.5);
    this.camera.lookAt(0, 2.2, -16);
  }

  dispose() {
    for (const d of this.disposables) d.dispose?.();
  }
}

// ------------------------------------------------------------------ Live Match

export class CannonMatch {
  constructor(names, { duration = DEFAULT_CANNON_DURATION, rng = Math.random, sfx = null, onEvent = null, onWinner = null } = {}) {
    this.plan = planCannonMatch(names, { duration, rng });
    this.sfx = sfx;
    this.onEvent = onEvent;
    this.onWinner = onWinner;

    this.t = 0;
    this.fuseAnnounced = false;
    this.shipItAnnounced = false;
    this.winnerReported = false;
    this.firedSet = new Set();
    this.landedSet = new Set();
    this.gullSoundSet = new Set();
    this.trailTimer = 0;
    this.splashRings = [];
    this.closestM = Infinity;
    this.closestName = null;
    this.disposables = [];

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.3, 400);
    this.arena = buildCannonArena(this.scene, this.plan.windKts, this.disposables);
    this.particles = new Particles(this.scene);

    // Build brass cannons + human-cannonball devs
    this.shotVisuals = this.plan.shots.map((shot) => {
      const cannon = buildCannonMesh(this.disposables);
      cannon.root.position.set(shot.pad.x, shot.pad.y, shot.pad.z);
      this.scene.add(cannon.root);

      const dev = buildCannonballDev(shot, this.disposables);
      dev.root.position.set(shot.p0.x, shot.p0.y, shot.p0.z);
      this.scene.add(dev.root);
      return { sim: shot, cannon, dev, recoil: 0 };
    });

    this.camPos = new THREE.Vector3(-12, 6.2, 13.5);
    this.camLook = new THREE.Vector3(0, 2.4, -12);
    this.resize(window.innerWidth / window.innerHeight);
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 1 ? 64 : 50;
    this.camera.updateProjectionMatrix();
  }

  spawnSplashRing(x, z) {
    const ringMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, side: THREE.DoubleSide });
    const ringGeo = new THREE.RingGeometry(0.4, 0.95, 20);
    this.disposables.push(ringMat, ringGeo);
    const mesh = new THREE.Mesh(ringGeo, ringMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.08, z);
    this.scene.add(mesh);
    this.splashRings.push({ mesh, mat: ringMat, age: 0 });
  }

  update(realDt) {
    const p = this.plan;
    const inSlowMo = this.t >= p.slowMoStart && this.t < p.winner.landAt + 0.25;
    const dt = realDt * (inSlowMo ? SLOW_MO_SCALE : 1);
    this.t += dt;
    const t = this.t;

    // Update floating barge & whipping windsock
    const bPos = bargePosAt(p, t);
    this.arena.barge.position.set(bPos.x, bPos.y, bPos.z);
    this.arena.barge.rotation.z = Math.sin(t * 2.1) * 0.035;
    this.arena.sockPivot.rotation.y = 0.4 + Math.sin(t * 14) * 0.35;

    if (!this.fuseAnnounced) {
      this.fuseAnnounced = true;
      this.sfx?.play('cannonFuse', 0);
      this.onEvent?.({ type: 'status', text: `💨 CROSSWIND: ${p.windKts} KTS — SCOPE CREEP · AIMING…`, tone: 'yellow' });
    }
    if (!this.shipItAnnounced && t >= p.fireStart) {
      this.shipItAnnounced = true;
      this.onEvent?.({ type: 'note', text: '💣 SHIP IT! Full battery volley away!', important: true });
      this.onEvent?.({ type: 'status', text: `💣 SHIP IT! · CROSSWIND: ${p.windKts} KTS`, tone: 'green' });
    }

    this.trailTimer += realDt;
    const emitTrail = this.trailTimer >= 0.07;
    if (emitTrail) this.trailTimer = 0;

    let airborneSumX = 0;
    let airborneSumY = 0;
    let airborneSumZ = 0;
    let airborneCount = 0;

    for (const sv of this.shotVisuals) {
      const s = sv.sim;
      const st = sampleShotState(s, t, p);

      // Barrel crank-up during Phase 1 + recoil punch at launchAt
      if (t < p.fireStart) {
        sv.cannon.barrelPivot.rotation.x = 0.25 + (t / Math.max(0.1, p.fireStart)) * 0.42;
        sv.cannon.spark.visible = Math.sin(t * 26 + s.id) > 0;
      } else {
        sv.cannon.spark.visible = !this.firedSet.has(s.id) && Math.sin(t * 28 + s.id) > 0;
      }

      if (t >= s.launchAt && !this.firedSet.has(s.id)) {
        this.firedSet.add(s.id);
        sv.recoil = 1.0;
        this.sfx?.play('cannonBoom', 0.03);
        if (s.archetype !== 'pierDud') this.sfx?.play('cannonWhistle', 0.09);
        this.particles.burst(new THREE.Vector3(s.p0.x, s.p0.y, s.p0.z), {
          count: s.archetype === 'pierDud' ? 14 : 22,
          colors: s.archetype === 'pierDud' ? ['#495057', '#343a40', '#868e96'] : ['#ffffff', '#ffd43b', '#ff922b'],
          speed: s.archetype === 'pierDud' ? 3 : 6.5,
          up: 3,
          life: 0.9,
          size: 0.36,
          gravity: 1,
        });
      }
      if (sv.recoil > 0) {
        sv.recoil = Math.max(0, sv.recoil - realDt * 3.8);
        sv.cannon.barrel.position.z = sv.recoil * 0.55;
      }

      // Sync launched dev position, scale, rotation, parachute & seagull bonk
      sv.dev.root.visible = !st.splashed;
      sv.dev.root.position.set(st.x, st.y, st.z);
      sv.dev.root.scale.setScalar(st.airborne ? 1.35 : 1.0);
      sv.dev.body.rotation.x = st.airborne ? st.spin : 0;
      sv.dev.chute.visible = st.chuteOpen;
      sv.dev.gull.visible = st.seagullHit;
      if (st.seagullHit && !this.gullSoundSet.has(s.id)) {
        this.gullSoundSet.add(s.id);
        this.sfx?.play('cannonSquawk', 0.05);
      }

      if (st.airborne) {
        airborneSumX += st.x;
        airborneSumY += st.y;
        airborneSumZ += st.z;
        airborneCount++;
        if (emitTrail) {
          this.particles.burst(new THREE.Vector3(st.x, st.y, st.z), {
            count: 1,
            colors: [s.color, '#ffffff'],
            speed: 0.4,
            up: 0.2,
            life: 0.65,
            size: 0.24,
            gravity: 0,
          });
        }
      }

      // Splashdown / Bullseye impact events
      const impactTime = s.archetype === 'rimBounce' ? s.landAt + 0.72 : s.landAt;
      if (t >= impactTime && !this.landedSet.has(s.id)) {
        this.landedSet.add(s.id);
        if (s.distanceM < this.closestM) {
          this.closestM = s.distanceM;
          this.closestName = s.name;
          this.onEvent?.({
            type: 'status',
            text: `🎯 CLOSEST TO BULLSEYE: ${s.name} — ${s.distanceM.toFixed(1)}m`,
            tone: s.isWinner ? 'green' : 'yellow',
          });
        }
        if (s.isWinner) {
          this.sfx?.play('cannonBullseye', 0);
          this.particles.burst(new THREE.Vector3(bPos.x, bPos.y + 1.2, bPos.z), {
            count: 60,
            colors: ['#f2b817', '#51cf66', '#38bdf8', '#ff6b6b', '#ffffff'],
            speed: 9,
            up: 8,
            life: 2.2,
            size: 0.36,
            gravity: 4,
          });
        } else {
          this.sfx?.play('cannonSplash', 0.06);
          this.spawnSplashRing(st.x, st.z);
          this.particles.burst(new THREE.Vector3(st.x, 0.3, st.z), {
            count: 24,
            colors: ['#ffffff', '#a5d8ff', '#74c0fc'],
            speed: 5.5,
            up: 7.5,
            life: 1.0,
            size: 0.32,
            gravity: 9,
          });
          this.onEvent?.({ type: 'miss', shot: s, popup: s.popup });
        }
      }
    }

    // Animate expanding white water splash rings
    for (let i = this.splashRings.length - 1; i >= 0; i--) {
      const r = this.splashRings[i];
      r.age += realDt;
      const scale = 1 + r.age * 4.5;
      r.mesh.scale.set(scale, scale, 1);
      r.mat.opacity = Math.max(0, 0.9 - r.age * 0.75);
      if (r.age >= 1.25) {
        this.scene.remove(r.mesh);
        this.splashRings.splice(i, 1);
      }
    }

    if (!this.winnerReported && t >= p.winnerAt) {
      this.winnerReported = true;
      this.onWinner?.(p.winner, p);
    }

    this.particles.update(realDt);
    for (const c of this.arena.clouds) {
      c.group.position.x = c.baseX + t * c.speed;
    }

    // Dynamic 3-Shot Camera Choreography — ALWAYS keeping the bullseye barge, bay water, clouds & arcs in view!
    const wantPos = new THREE.Vector3();
    const wantLook = new THREE.Vector3();
    if (t < p.fireStart + 0.9) {
      const f = Math.min(1, t / Math.max(0.1, p.fireStart + 0.9));
      const shake = t >= p.fireStart ? Math.sin(t * 70) * 0.28 : 0;
      wantPos.set(-11 + f * 22 + shake, 6.2 + shake, 14.5);
      wantLook.set(0, 2.8, -22);
    } else if (t >= p.slowMoStart) {
      // Dramatic low-angle Barge Cam tilted skyward over the concentric PROD bullseye!
      wantPos.set(bPos.x + 12.5, 5.8, bPos.z + 18.5);
      wantLook.set(bPos.x, 3.0, bPos.z);
    } else if (airborneCount > 0) {
      // Elevated side-quarter Chesapeake Bay tracking shot: pier behind, soaring devs + clouds mid-frame, bullseye barge ahead!
      const az = airborneSumZ / airborneCount;
      const ay = Math.min(24, airborneSumY / airborneCount);
      wantPos.set(24, Math.max(12.5, ay * 0.72 + 7.5), Math.max(BARGE_BASE_Z + 18, az + 24));
      wantLook.set(bPos.x * 0.4, Math.max(3.5, ay * 0.45), Math.min(az - 8, BARGE_BASE_Z * 0.75));
    } else {
      wantPos.set(bPos.x + 14, 9.5, bPos.z + 20);
      wantLook.set(bPos.x, 2.2, bPos.z);
    }

    this.camPos.lerp(wantPos, Math.min(1, realDt * 4.2));
    this.camLook.lerp(wantLook, Math.min(1, realDt * 5.0));
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
  }

  dispose() {
    this.particles.clear();
    for (const d of this.disposables) d.dispose?.();
  }
}
