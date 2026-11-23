// "Tubig-Tubig Gauntlet" (Line-Blocking Dash): twilight Filipino barangay street with glowing
// cyan water lines (tubig), traffic cones, crisscross banderitas, warm streetlamps, painted
// LOCALHOST & STAGING endzones, wide-stance patrolling blockers with translucent red Reach
// Zones, vertical center-spine Patotot roamer, Claw-of-Destiny bobblehead street runners,
// splash-ring eliminations, and slow-motion final crossing camera.

import * as THREE from 'three';
import { mat, box, ball, cyl, cone, torus, plane, at, canvasTexture, FONT_UI, FONT_MONO, roundRect } from './util3d.js';
import { Particles } from './effects.js';
import { DEVELOPER_KINDS } from './deathmatch-sim.js';
import { AUDIENCE_KINDS } from './audience.js';
import {
  planTubigMatch,
  sampleTubigRunner,
  sampleLineBlocker,
  samplePatotot,
  COURT_HALF_W,
  DEFAULT_TUBIG_DURATION,
  DEFAULT_TUBIG_RULE,
} from './tubig-sim.js';

const portraitLoader = new THREE.TextureLoader();
const portraitTexCache = new Map();

function getDeveloperPortraitTexture(id) {
  if (!portraitTexCache.has(id)) {
    const tex = portraitLoader.load(`./assets/developers/${id}.png`);
    tex.colorSpace = THREE.SRGBColorSpace;
    portraitTexCache.set(id, tex);
  }
  return portraitTexCache.get(id);
}

/** Dark twilight asphalt street texture with damp water-sheen speckles. */
function makeWetAsphaltTexture() {
  const tex = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#151a26';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 2200; i++) {
      const x = (i * 53) % w;
      const y = (i * 97) % h;
      ctx.fillStyle = i % 4 === 0 ? 'rgba(56, 189, 248, 0.055)' : 'rgba(6, 8, 14, 0.24)';
      ctx.fillRect(x, y, 2, 2);
    }
  });
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 10);
  return tex;
}

/** Painted street chalk banner texture for LOCALHOST / PROD and STAGING endzones. */
function makeEndzoneTexture(title, sub, accent) {
  return canvasTexture(512, 96, (ctx, w, h) => {
    ctx.fillStyle = 'rgba(14, 22, 36, 0.9)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 5;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 32px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, w / 2, 36);
    ctx.fillStyle = accent;
    ctx.font = `700 18px ${FONT_UI}`;
    ctx.fillText(sub, w / 2, 70);
  });
}

/** Upright high-contrast nameplate sprite. */
function makeCourtTag(name, color, y = 2.5) {
  const tex = canvasTexture(256, 64, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    roundRect(ctx, 10, 8, w - 20, h - 16, 14);
    ctx.fillStyle = 'rgba(13, 18, 28, 0.92)';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = '#f8f9fa';
    ctx.font = `700 24px ${FONT_UI}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = name.length > 14 ? `${name.slice(0, 13)}…` : name;
    ctx.fillText(label, w / 2, h / 2 + 1);
  });
  const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(2.2, 0.56, 1);
  sprite.position.set(0, y, 0);
  return { sprite, tex, spriteMat };
}

/** Builds an animated bobblehead street runner (Claw-of-Destiny portrait + sprinting legs). */
function buildCourtRunner(name, kind, color, disposables) {
  const root = new THREE.Group();
  const shirtMat = mat(kind.shirt ?? color, { roughness: 0.6 });
  const pantsMat = mat('#2b303a', { roughness: 0.85 });
  const shoeMat = mat('#f8f9fa', { roughness: 0.7 });

  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.15, 0.7, 0);
  leftLeg.add(at(cyl(0.095, 0.085, 0.66, pantsMat, 8), 0, -0.33, 0));
  leftLeg.add(at(box(0.18, 0.11, 0.3, shoeMat), 0, -0.64, -0.05));
  root.add(leftLeg);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.15, 0.7, 0);
  rightLeg.add(at(cyl(0.095, 0.085, 0.66, pantsMat, 8), 0, -0.33, 0));
  rightLeg.add(at(box(0.18, 0.11, 0.3, shoeMat), 0, -0.64, -0.05));
  root.add(rightLeg);

  root.add(at(cyl(0.25, 0.21, 0.74, shirtMat, 12), 0, 1.1, 0));
  const leftArm = at(cyl(0.075, 0.065, 0.54, shirtMat, 8), -0.33, 1.16, 0);
  const rightArm = at(cyl(0.075, 0.065, 0.54, shirtMat, 8), 0.33, 1.16, 0);
  root.add(leftArm, rightArm);

  const head = new THREE.Group();
  head.position.set(0, 1.78, 0);
  head.add(at(cyl(0.41, 0.41, 0.14, mat(kind.accent ?? color, { roughness: 0.35 }), 24), 0, 0, 0, Math.PI / 2, 0, 0));
  const portraitTex = getDeveloperPortraitTexture(kind.id);
  const faceMat = new THREE.MeshStandardMaterial({ map: portraitTex, roughness: 0.35 });
  const faceGeo = new THREE.CircleGeometry(0.38, 24);
  const front = new THREE.Mesh(faceGeo, faceMat);
  front.position.set(0, 0, 0.076);
  const back = new THREE.Mesh(faceGeo, faceMat);
  back.rotation.y = Math.PI;
  back.position.set(0, 0, -0.076);
  head.add(front, back);
  root.add(head);

  const tag = makeCourtTag(name, kind.accent ?? color, 2.52);
  root.add(tag.sprite);
  disposables.push(faceGeo, faceMat, tag.tex, tag.spriteMat);

  return { root, leftLeg, rightLeg, leftArm, rightArm, head };
}

/** Builds a wide-stance patrolling line blocker with outstretched slapping arms, glowing visor & Reach Zone bar. */
function buildBlocker(label, color, isPatotot, disposables) {
  const root = new THREE.Group();
  const bodyMat = mat(color, { roughness: 0.45, emissive: color, emissiveIntensity: 0.28 });
  const darkMat = mat('#1d2128', { roughness: 0.75 });
  const visorMat = mat('#ff4d4f', { emissive: '#ff2a2a', emissiveIntensity: 1.6 });

  // Wide defensive stance legs
  root.add(at(cyl(0.11, 0.1, 0.74, darkMat, 8), -0.32, 0.37, 0, 0, 0, 0.16));
  root.add(at(cyl(0.11, 0.1, 0.74, darkMat, 8), 0.32, 0.37, 0, 0, 0, -0.16));
  // Torso
  root.add(at(cyl(0.33, 0.28, 0.88, bodyMat, 12), 0, 1.15, 0));
  // Wide outstretched tagging arms that wave menacingly!
  const leftArm = at(cyl(0.09, 0.08, 1.15, bodyMat, 8), -0.78, 1.38, 0, 0, 0, Math.PI / 2);
  const rightArm = at(cyl(0.09, 0.08, 1.15, bodyMat, 8), 0.78, 1.38, 0, 0, 0, -Math.PI / 2);
  root.add(leftArm, rightArm);
  // Head + glowing guard visor
  root.add(at(ball(0.32, mat('#e8b896', { roughness: 0.65 })), 0, 1.88, 0));
  root.add(at(box(0.46, 0.14, 0.22, visorMat), 0, 1.92, 0.22));

  // Translucent pulsing red Reach Zone bar projected along the water line
  const reachMat = mat('#ff4d4f', { emissive: '#ff2a2a', emissiveIntensity: 1.1, transparent: true, opacity: 0.32 });
  const reach = at(box(isPatotot ? 1.8 : 3.4, 0.04, isPatotot ? 2.6 : 0.75, reachMat), 0, 0.04, 0);
  root.add(reach);

  const tag = makeCourtTag(label, color, 2.7);
  root.add(tag.sprite);
  disposables.push(tag.tex, tag.spriteMat);

  return { root, leftArm, rightArm, reach };
}

/** Builds the glowing twilight Tubig-Tubig water-grid court, streetlamps, traffic cones, bleachers & banderitas. */
function buildTubigArena(scene, plan, disposables) {
  scene.background = new THREE.Color('#0f1426');
  scene.fog = new THREE.Fog('#0f1426', 48, 145);

  scene.add(new THREE.HemisphereLight('#74c0fc', '#161b2c', 1.0));
  const moon = new THREE.DirectionalLight('#e7f0ff', 1.2);
  moon.position.set(16, 38, 20);
  scene.add(moon);

  const W = COURT_HALF_W;
  const courtMidZ = (plan.localhostZ + plan.stagingZ) / 2;
  const courtLen = Math.abs(plan.localhostZ - plan.stagingZ);

  // Damp dark twilight asphalt road
  const roadTex = makeWetAsphaltTexture();
  disposables.push(roadTex);
  const roadMat = new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.68, metalness: 0.18 });
  disposables.push(roadMat);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(W * 2 + 4, courtLen + 26), roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0, courtMidZ);
  scene.add(road);

  // Sidewalks & 3-tier Chesapeake Dev Derby wildlife grandstands along both sides of the court!
  const walkMat = mat('#2b313f', { roughness: 0.88 });
  const concreteMat = mat('#8d96a6', { roughness: 0.85 });
  const steelMat = mat('#5c6470', { roughness: 0.5, metalness: 0.35 });
  const seatMats = [mat('#c92a2a', { roughness: 0.65 }), mat('#f2b817', { roughness: 0.65 }), mat('#f1f3f5', { roughness: 0.65 })];
  const fans = [];
  const tierDepth = 1.9;
  const tierRise = 0.82;
  const standLen = courtLen + 4;
  const bays = Math.max(6, Math.floor(standLen / 3.4));
  const bayLen = standLen / bays;

  for (const side of [-1, 1]) {
    scene.add(at(box(9.5, 0.22, courtLen + 26, walkMat), side * (W + 5.6), 0.11, courtMidZ));
    const stand = new THREE.Group();
    // Place stand behind the sideline bleacher strip where splashed runners step off
    const standEdgeX = side * (W + 3.4);
    stand.position.set(standEdgeX, 0.22, courtMidZ);
    if (side < 0) stand.rotation.y = Math.PI;

    // Front steel safety rail
    stand.add(at(box(0.08, 0.08, standLen, steelMat), 0.1, 0.9, 0));
    for (let p = 0; p <= bays; p++) {
      stand.add(at(box(0.08, 0.9, 0.08, steelMat), 0.1, 0.45, -standLen / 2 + p * bayLen));
    }

    // 3 stepped concrete tiers with Maryland red/gold/white stadium benches & cheering Derby wildlife!
    for (let tier = 0; tier < 3; tier++) {
      const top = 0.25 + tier * tierRise;
      const x0 = 0.35 + tier * tierDepth;
      stand.add(at(box(tierDepth, top, standLen, concreteMat), x0 + tierDepth / 2, top / 2, 0));
      stand.add(at(box(tierDepth * 0.34, 0.24, standLen - 0.2, seatMats[tier % seatMats.length]), x0 + tierDepth * 0.72, top + 0.12, 0));

      for (let b = 0; b < bays; b++) {
        const idx = (b * 3 + tier + (side > 0 ? 0 : 5)) % AUDIENCE_KINDS.length;
        const kind = AUDIENCE_KINDS[idx];
        const fan = kind.build();
        fan.object.traverse((o) => { o.castShadow = false; });
        const holder = new THREE.Group();
        holder.add(fan.object);
        holder.scale.setScalar(kind.scale * 0.92);
        const fz = -standLen / 2 + (b + 0.5) * bayLen;
        holder.position.set(x0 + tierDepth * 0.44, top, fz);
        // Spectator models face -Z; rotate +PI/2 so they face -X (inward toward the water court)
        holder.rotation.y = Math.PI / 2 + (((b + tier) % 3) - 1) * 0.18;
        stand.add(holder);
        fans.push({
          holder,
          top,
          tick: fan.tick,
          phase: (b * 1.3 + tier * 2.1 + (side > 0 ? 0 : 4.2)),
          rate: 7 + ((b + tier) % 4),
          hop: 0.12 + ((b + tier) % 3) * 0.06,
        });
      }
    }
    // Back stadium wall
    const backX = 0.35 + 3 * tierDepth;
    const backH = 0.25 + 2 * tierRise + 1.8;
    stand.add(at(box(0.22, backH, standLen, concreteMat), backX + 0.11, backH / 2, 0));
    scene.add(stand);
  }

  // Glowing cyan poured water lines (tubig): outer box + horizontal blocker lines + center vertical spine
  const waterLineMat = mat('#3bc9db', { emissive: '#22b8cf', emissiveIntensity: 1.75, roughness: 0.15 });
  // Sidelines
  scene.add(at(box(0.24, 0.03, courtLen, waterLineMat), -W, 0.025, courtMidZ));
  scene.add(at(box(0.24, 0.03, courtLen, waterLineMat), W, 0.025, courtMidZ));
  // Endlines (LOCALHOST & STAGING)
  scene.add(at(box(W * 2, 0.03, 0.26, waterLineMat), 0, 0.025, plan.localhostZ));
  scene.add(at(box(W * 2, 0.03, 0.26, waterLineMat), 0, 0.025, plan.stagingZ));
  // Vertical Center Spine (Patotot rail)
  scene.add(at(box(0.24, 0.03, courtLen, waterLineMat), 0, 0.025, courtMidZ));
  // Horizontal blocker lines
  for (const line of plan.lines) {
    scene.add(at(box(W * 2, 0.03, 0.26, waterLineMat), 0, 0.025, line.z));
  }

  // Glowing orange traffic cones at all 4 court corners
  const coneMat = mat('#ff6b2b', { emissive: '#e8590c', emissiveIntensity: 0.6, roughness: 0.45 });
  for (const cx of [-W - 0.35, W + 0.35]) {
    for (const cz of [plan.localhostZ + 0.35, plan.stagingZ - 0.35]) {
      scene.add(at(box(0.56, 0.08, 0.56, mat('#212529')), cx, 0.04, cz));
      scene.add(at(cone(0.24, 0.78, coneMat, 10), cx, 0.43, cz));
      scene.add(at(cyl(0.11, 0.15, 0.14, mat('#f8f9fa', { emissive: '#ffffff', emissiveIntensity: 0.5 }), 10), cx, 0.52, cz));
    }
  }

  // Painted chalk endzone banners (LOCALHOST / PROD <-> STAGING)
  const localTex = makeEndzoneTexture('LOCALHOST ↔ PROD', 'SAFE CURB · FINISH LINE', '#51cf66');
  const stageTex = makeEndzoneTexture('STAGING ZONE', 'TOUCH & TURN AROUND!', '#38bdf8');
  disposables.push(localTex, stageTex);
  const localMat = new THREE.MeshStandardMaterial({ map: localTex, roughness: 0.7 });
  const stageMat = new THREE.MeshStandardMaterial({ map: stageTex, roughness: 0.7 });
  disposables.push(localMat, stageMat);
  scene.add(at(plane(W * 1.4, 1.5, localMat), 0, 0.03, plan.localhostZ + 1.25, -Math.PI / 2, 0, 0));
  scene.add(at(plane(W * 1.4, 1.5, stageMat), 0, 0.03, plan.stagingZ - 1.25, -Math.PI / 2, 0, 0));

  // Warm corner streetlamps + crisscross fiesta banderitas overhead
  const poleMat = mat('#2b303a', { roughness: 0.5, metalness: 0.65 });
  for (const lz of [plan.localhostZ, plan.stagingZ]) {
    for (const side of [-1, 1]) {
      const px = side * (W + 1.4);
      scene.add(at(cyl(0.12, 0.16, 8.2, poleMat, 10), px, 4.1, lz));
      scene.add(at(box(1.8, 0.14, 0.14, poleMat), px - side * 0.8, 8.1, lz));
      scene.add(at(ball(0.28, mat('#fff3bf', { emissive: '#ffd43b', emissiveIntensity: 1.8 }), 1.2, 0.65, 1), px - side * 1.4, 7.9, lz));
      const pt = new THREE.PointLight('#ffe8cc', 30, 26, 1.5);
      pt.position.set(px - side * 1.4, 7.2, lz);
      scene.add(pt);
    }
  }

  const flagColors = ['#ff6b6b', '#ffd43b', '#51cf66', '#38bdf8', '#f06595'];
  const banderitas = [];
  for (let i = 0; i < 4; i++) {
    const bz = plan.localhostZ - 2 - (i / 3) * (courtLen - 4);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-W - 1.4, 8.0, bz),
      new THREE.Vector3(0, 6.7, bz - 1.2),
      new THREE.Vector3(W + 1.4, 8.0, bz - 2.4),
    ]);
    const ropeGeo = new THREE.TubeGeometry(curve, 16, 0.03, 5, false);
    disposables.push(ropeGeo);
    scene.add(new THREE.Mesh(ropeGeo, mat('#ced4da')));
    for (let f = 1; f <= 11; f++) {
      const pt = curve.getPoint(f / 12);
      const col = flagColors[(i * 3 + f) % flagColors.length];
      const flag = at(cone(0.32, 0.64, mat(col, { emissive: col, emissiveIntensity: 0.45 }), 3), pt.x, pt.y - 0.32, pt.z, Math.PI, 0, 0);
      scene.add(flag);
      banderitas.push({ mesh: flag, phase: i + f * 0.5 });
    }
  }

  // Horizontal line blockers + center-spine Patotot roamer
  const lineBlockers = plan.lines.map((line) => {
    const visual = buildBlocker(line.label, line.color, false, disposables);
    visual.root.position.set(0, 0, line.z);
    scene.add(visual.root);
    return { sim: line, ...visual };
  });
  const patotot = buildBlocker('👑 PATOTOT', '#3bc9db', true, disposables);
  patotot.root.position.set(0, 0, courtMidZ);
  scene.add(patotot.root);

  return { lineBlockers, patotot, banderitas, fans, courtMidZ };
}

// ------------------------------------------------------------------ Lobby 3D Stage

export class TubigStage {
  constructor(aspect = 16 / 9, initialNames = [], { duration = DEFAULT_TUBIG_DURATION, rule = DEFAULT_TUBIG_RULE } = {}) {
    this.t = 0;
    this.names = [];
    this.models = [];
    this.disposables = [];
    this.plan = planTubigMatch(initialNames.length >= 2 ? initialNames : ['Ada', 'Grace'], { duration, rule });

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(48, aspect, 0.3, 220);
    this.arena = buildTubigArena(this.scene, this.plan, this.disposables);
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
    for (const m of this.models) this.scene.remove(m.root);
    this.models = [];
    this.names = [...names];

    const n = Math.max(1, names.length);
    const perRow = n <= 12 ? n : Math.ceil(n / 2);
    const spanX = Math.min(COURT_HALF_W * 1.65, Math.max(3.6, (perRow - 1) * 1.35));
    names.forEach((name, i) => {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const inRow = Math.min(perRow, n - row * perRow);
      const x = inRow === 1 ? 0 : ((col / (inRow - 1)) - 0.5) * spanX;
      const z = this.plan.localhostZ + 1.2 + row * 1.35;
      const kind = DEVELOPER_KINDS[i % DEVELOPER_KINDS.length];
      const runner = buildCourtRunner(name, kind, kind.accent, this.disposables);
      runner.root.position.set(x, 0, z);
      this.scene.add(runner.root);
      this.models.push({ ...runner, phase: i * 0.7 });
    });
  }

  update(dt, reduced = false) {
    if (!reduced) this.t += dt;
    const t = this.t;
    for (const lb of this.arena.lineBlockers) {
      lb.root.position.x = reduced ? 0 : Math.sin(t * lb.sim.speed + lb.sim.phase) * (COURT_HALF_W - 1.5);
      lb.leftArm.rotation.z = Math.PI / 2 + Math.sin(t * 7 + lb.sim.index) * 0.25;
      lb.rightArm.rotation.z = -Math.PI / 2 - Math.sin(t * 7 + lb.sim.index) * 0.25;
    }
    const ps = samplePatotot(this.plan, reduced ? 0 : t);
    this.arena.patotot.root.position.set(ps.x, 0, ps.z);
    for (const m of this.models) {
      m.root.position.y = reduced ? 0 : Math.abs(Math.sin(t * 5 + m.phase)) * 0.14;
    }
    if (!reduced) {
      for (const b of this.arena.banderitas) b.mesh.rotation.z = Math.sin(t * 3.5 + b.phase) * 0.18;
      for (const fan of this.arena.fans) {
        fan.holder.position.y = fan.top + Math.abs(Math.sin((t * fan.rate + fan.phase) * 0.5)) * fan.hop;
        fan.tick(t + fan.phase);
      }
    }
    const sway = reduced ? 0 : Math.sin(t * 0.3) * 4.5;
    this.camera.position.set(sway, 16.5, this.plan.localhostZ + 14.5);
    this.camera.lookAt(0, 0.8, this.arena.courtMidZ);
  }

  dispose() {
    for (const d of this.disposables) d.dispose?.();
  }
}

// ------------------------------------------------------------------ Live Match

export class TubigMatch {
  constructor(names, { duration = DEFAULT_TUBIG_DURATION, rule = DEFAULT_TUBIG_RULE, rng = Math.random, sfx = null, onEvent = null, onWinner = null } = {}) {
    this.plan = planTubigMatch(names, { duration, rule, rng });
    this.sfx = sfx;
    this.onEvent = onEvent;
    this.onWinner = onWinner;
    this.time = 0;
    this.done = false;
    this.started = false;
    this.flushAnnounced = false;
    this.splashedSet = new Set();
    this.disposables = [];

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.3, 220);
    this.arena = buildTubigArena(this.scene, this.plan, this.disposables);
    this.particles = new Particles(this.scene);

    this.runners = this.plan.runners.map((r, i) => {
      const kind = DEVELOPER_KINDS[i % DEVELOPER_KINDS.length];
      const visual = buildCourtRunner(r.name, kind, r.color, this.disposables);
      visual.root.position.set(r.homeX, 0, r.homeZ);
      this.scene.add(visual.root);
      return { sim: r, ...visual };
    });

    this.camPos = new THREE.Vector3(0, 16.5, this.plan.localhostZ + 14.5);
    this.camLook = new THREE.Vector3(0, 0.8, this.arena.courtMidZ);
    this.resize(window.innerWidth / window.innerHeight);
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 1 ? 62 : 48;
    this.camera.updateProjectionMatrix();
  }

  update(realDt) {
    // 0.4x slow-motion final crossing!
    const inFinalSlowMo = this.time > this.plan.finishAt - 0.9 && this.time < this.plan.finishAt + 0.35;
    const dt = inFinalSlowMo ? realDt * 0.42 : realDt;
    if (!this.done) this.time += dt;
    const t = this.time;
    const p = this.plan;

    if (!this.started && t >= p.startAt) {
      this.started = true;
      this.sfx?.play?.('tubigWhistle');
      this.onEvent?.({ type: 'status', text: '💧 DEPLOY! — PANAGAN! CROSS TO STAGING & BACK!', tone: 'green' });
      this.onEvent?.({ type: 'note', text: '💧 Whistle blows! Everyone surges off LOCALHOST!', important: true });
    }

    if (!this.flushAnnounced && p.rule === 'champion' && t >= p.flushAt) {
      this.flushAnnounced = true;
      this.onEvent?.({ type: 'status', text: '⚡ PANGANODSILAB FLUSH — IYAHAY NA!', tone: 'yellow' });
      this.onEvent?.({ type: 'note', text: '⚡ PANGANODSILAB FLUSH — final dash to PROD!', important: true });
    }

    // Update horizontal line blockers & center Patotot (with visible lunge animation on tag!)
    for (const lb of this.arena.lineBlockers) {
      const bs = sampleLineBlocker(lb.sim, p, t);
      lb.root.position.set(bs.x, bs.lunging ? 0.25 : 0, bs.z);
      lb.root.scale.setScalar(bs.lunging ? 1.12 : 1.0);
      lb.leftArm.rotation.z = Math.PI / 2 + Math.sin(t * (bs.lunging ? 22 : 10) + lb.sim.index) * (bs.lunging ? 0.55 : 0.35);
      lb.rightArm.rotation.z = -Math.PI / 2 - Math.sin(t * (bs.lunging ? 22 : 10) + lb.sim.index) * (bs.lunging ? 0.55 : 0.35);
    }
    const ps = samplePatotot(p, t);
    this.arena.patotot.root.position.set(ps.x, ps.lunging ? 0.25 : 0, ps.z);
    this.arena.patotot.root.scale.setScalar(ps.lunging ? 1.12 : 1.0);
    this.arena.patotot.leftArm.rotation.z = Math.PI / 2 + Math.sin(t * (ps.lunging ? 22 : 11)) * (ps.lunging ? 0.55 : 0.35);
    this.arena.patotot.rightArm.rotation.z = -Math.PI / 2 - Math.sin(t * (ps.lunging ? 22 : 11)) * (ps.lunging ? 0.55 : 0.35);

    // Update runners & trigger water-splash eliminations
    let activeSumX = 0;
    let activeSumZ = 0;
    let activeCount = 0;
    let winnerPos = { x: 0, z: p.localhostZ };

    for (const r of this.runners) {
      const st = sampleTubigRunner(r.sim, p, t);
      r.root.position.set(st.x, st.splashed && st.splashProgress < 1 ? Math.sin(st.splashProgress * Math.PI) * 0.5 : 0, st.z);
      r.root.rotation.y = st.facing;

      const running = this.started && !st.splashed && !st.finished;
      const swing = running ? Math.sin(t * 16 + r.sim.id) * 0.65 : 0;
      r.leftLeg.rotation.x = swing;
      r.rightLeg.rotation.x = -swing;
      r.leftArm.rotation.x = -swing * 0.8;
      r.rightArm.rotation.x = swing * 0.8;
      r.head.rotation.z = st.juking ? Math.sin(t * 18 + r.sim.id) * 0.24 : 0;

      if (r.sim.isWinner) winnerPos = st;
      if (!st.splashed) {
        activeSumX += st.x;
        activeSumZ += st.z;
        activeCount++;
      }

      if (st.splashed && !this.splashedSet.has(r.sim.id)) {
        this.splashedSet.add(r.sim.id);
        this.sfx?.play?.('tubigSplash');
        // Leave a glowing cyan water-splash puddle ring right where the blocker tagged them!
        const puddle = at(cyl(1.1, 1.1, 0.03, mat('#3bc9db', { emissive: '#22b8cf', emissiveIntensity: 1.2, transparent: true, opacity: 0.65 }), 18), st.x, 0.035, st.z);
        this.scene.add(puddle);
        this.particles.burst(new THREE.Vector3(st.x, 0.8, st.z), {
          count: 32,
          colors: ['#3bc9db', '#74c0fc', '#ffffff'],
          speed: 6.0,
          up: 7.0,
          life: 0.9,
          size: 0.24,
          gravity: 13,
        });
        this.onEvent?.({ type: 'note', text: `💦 ${r.sim.name} SPLASHED: “${r.sim.splash.popup}”`, important: true });
      }
    }

    for (const b of this.arena.banderitas) b.mesh.rotation.z = Math.sin(t * 3.5 + b.phase) * 0.18;
    for (const fan of this.arena.fans) {
      fan.holder.position.y = fan.top + Math.abs(Math.sin((t * fan.rate + fan.phase) * 0.5)) * fan.hop;
      fan.tick(t + fan.phase);
    }

    // Trigger finish
    if (!this.done && t >= p.finishAt) {
      this.done = true;
      this.sfx?.play?.('tubigWin');
      this.sfx?.fanfare?.();
      this.particles.burst(new THREE.Vector3(winnerPos.x, 1.5, winnerPos.z), {
        count: 68,
        colors: ['#3bc9db', '#51cf66', '#ffd43b', '#ff6b6b', '#ffffff'],
        speed: 7.5,
        up: 9.2,
        life: 1.9,
        size: 0.28,
        gravity: 12,
      });
      this.onWinner?.(p.winner, p);
    }

    this.particles.update(realDt);

    // 3-Shot Dynamic Overhead Camera Choreography
    const wantPos = new THREE.Vector3();
    const wantLook = new THREE.Vector3();
    if (!this.started) {
      wantPos.set(Math.sin(t * 0.7) * 4.0, 16.5, p.localhostZ + 14.5);
      wantLook.set(0, 0.8, this.arena.courtMidZ);
    } else if (t > p.finishAt - 1.6) {
      // Punch-in angle down the final line for the winning dive / tag
      wantPos.set(winnerPos.x + 6.5, 6.2, winnerPos.z + 9.5);
      wantLook.set(winnerPos.x, 1.2, winnerPos.z);
    } else {
      const avgX = activeCount > 0 ? activeSumX / activeCount : 0;
      const avgZ = activeCount > 0 ? activeSumZ / activeCount : this.arena.courtMidZ;
      const zoom = activeCount <= 6 ? 13.5 : 17.5;
      wantPos.set(avgX * 0.45, zoom, avgZ + 14.5);
      wantLook.set(avgX * 0.55, 0.8, avgZ - 2.0);
    }

    this.camPos.lerp(wantPos, Math.min(1, realDt * 4.5));
    this.camLook.lerp(wantLook, Math.min(1, realDt * 5.0));
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
  }

  dispose() {
    for (const d of this.disposables) d.dispose?.();
  }
}
