// "The Claw of Destiny": 3D Arcade Claw Machine with choreographed physics,
// 14-developer bobblehead gachapon capsules, animated joystick, VIP Lounge shelf,
// scanning spotlight, dynamic Chute Cam, and floating dev-excuse callouts.

import * as THREE from 'three';
import { mat, box, ball, cyl, cone, torus, plane, at, canvasTexture, FONT_UI, FONT_MONO, roundRect } from './util3d.js';
import { Particles } from './effects.js';
import { DEVELOPER_KINDS } from './deathmatch-sim.js';
import { planClawMatch, CABINET_MARQUEES } from './claw-sim.js';

const portraitLoader = new THREE.TextureLoader();
const portraitTexCache = new Map();

/** Loads and caches the cropped 256x256 reference portrait texture for developer `id`. */
function getDeveloperPortraitTexture(id) {
  if (!portraitTexCache.has(id)) {
    const tex = portraitLoader.load(`./assets/developers/${id}.png`);
    tex.colorSpace = THREE.SRGBColorSpace;
    portraitTexCache.set(id, tex);
  }
  return portraitTexCache.get(id);
}

const PIT_HALF_X = 4.4;
const PIT_HALF_Z = 3.6;
const FLOOR_Y = 0.0;
const CAPSULE_R = 0.62;
const CEIL_Y = 7.4;
const CHUTE_X = -3.1;
const CHUTE_Z = 2.4;
const CHUTE_R = 1.25;

function hashName(name) {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Billboarded nameplate over each gachapon capsule. */
function makeCapsuleTag(name, accent) {
  const tex = canvasTexture(256, 56, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#14171f';
    roundRect(ctx, 8, 8, w - 16, h - 16, 10);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#f8f9fa';
    ctx.font = `700 22px ${FONT_UI}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = name.length > 15 ? `${name.slice(0, 14)}…` : name;
    ctx.fillText(label, w / 2, h / 2 + 1);
  });
  const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(2.05, 0.48, 1);
  sprite.position.y = 0.96;
  return { sprite, tex, spriteMat };
}

/** Builds a clear gachapon sphere containing a developer bobblehead with the reference face texture. */
function buildGachaponCapsule(player, disposables) {
  const k = player.kind;
  const root = new THREE.Group();

  // Lower colored capsule shell
  const bottomGeo = new THREE.SphereGeometry(CAPSULE_R, 18, 12, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5);
  const bottomMat = new THREE.MeshStandardMaterial({ color: k.accent, roughness: 0.35, metalness: 0.15 });
  const bottom = new THREE.Mesh(bottomGeo, bottomMat);
  bottom.castShadow = true;
  root.add(bottom);

  // Upper clear dome
  const topGeo = new THREE.SphereGeometry(CAPSULE_R, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const topMat = new THREE.MeshStandardMaterial({
    color: '#e8f4ff',
    roughness: 0.12,
    metalness: 0.1,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
  });
  const top = new THREE.Mesh(topGeo, topMat);
  root.add(top);

  // Equatorial seam ring
  root.add(at(torus(CAPSULE_R * 1.005, 0.032, mat('#f8f9fa', { roughness: 0.3 })), 0, 0, 0, Math.PI / 2, 0, 0));

  // Developer bobblehead inside the capsule using the actual cropped reference portrait!
  const bobble = new THREE.Group();
  const neck = at(cyl(0.06, 0.08, 0.22, mat(k.shirt)), 0, -0.24, 0);
  const rim = at(cyl(0.41, 0.41, 0.12, mat(k.accent, { roughness: 0.35, metalness: 0.2 }), 24), 0, 0.08, 0, Math.PI / 2, 0, 0);
  const portraitTex = getDeveloperPortraitTexture(k.id);
  const faceMat = new THREE.MeshStandardMaterial({ map: portraitTex, roughness: 0.35, metalness: 0.05 });
  const faceGeo = new THREE.CircleGeometry(0.38, 24);
  const faceFront = new THREE.Mesh(faceGeo, faceMat);
  faceFront.position.set(0, 0.08, 0.066);
  const faceBack = new THREE.Mesh(faceGeo, faceMat);
  faceBack.rotation.y = Math.PI;
  faceBack.position.set(0, 0.08, -0.066);
  bobble.add(neck, rim, faceFront, faceBack);
  root.add(bobble);

  const tag = makeCapsuleTag(player.name, k.accent);
  root.add(tag.sprite);

  disposables.push(bottomGeo, bottomMat, topGeo, topMat, faceGeo, faceMat, tag.tex, tag.spriteMat);
  return { root, bobble, tag };
}

/** Builds the 3D arcade claw machine cabinet, animated joystick, gantry, 3-prong claw, and VIP shelf. */
function buildClawCabinet(scene, marqueeText, disposables) {
  scene.background = new THREE.Color('#0c1020');
  scene.fog = new THREE.Fog('#0c1020', 24, 62);

  scene.add(new THREE.HemisphereLight('#b8d4ff', '#2a1836', 0.95));
  const key = new THREE.DirectionalLight('#fff5e4', 1.55);
  key.position.set(8, 18, 12);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -12, right: 12, top: 14, bottom: -6, near: 2, far: 45 });
  scene.add(key);

  const neonCyan = mat('#38bdf8', { emissive: '#38bdf8', emissiveIntensity: 0.9 });
  const neonPink = mat('#f06595', { emissive: '#f06595', emissiveIntensity: 0.9 });
  const neonGold = mat('#f2b817', { emissive: '#f2b817', emissiveIntensity: 0.85 });
  const bodyMat = mat('#1d2336', { roughness: 0.5, metalness: 0.25 });
  const trimMat = mat('#2c3552', { roughness: 0.4, metalness: 0.45 });

  // Lower arcade cabinet pedestal
  scene.add(at(box(PIT_HALF_X * 2 + 1.0, 3.8, PIT_HALF_Z * 2 + 1.2, bodyMat), 0, -2.0, 0));
  // Floor of the prize pit
  const floorMat = mat('#252d47', { roughness: 0.7, metalness: 0.1 });
  scene.add(at(box(PIT_HALF_X * 2 + 0.2, 0.25, PIT_HALF_Z * 2 + 0.2, floorMat), 0, -0.13, 0));

  // Glowing Prize Chute at front-left corner
  scene.add(at(cyl(CHUTE_R, CHUTE_R, 0.36, mat('#090b12', { roughness: 0.9 })), CHUTE_X, -0.05, CHUTE_Z));
  const chuteRim = at(torus(CHUTE_R, 0.11, neonGold), CHUTE_X, 0.12, CHUTE_Z, Math.PI / 2, 0, 0);
  scene.add(chuteRim);
  const chuteLight = new THREE.PointLight('#f2b817', 12, 8, 1.5);
  chuteLight.position.set(CHUTE_X, 0.8, CHUTE_Z);
  scene.add(chuteLight);

  // Corner pillars & glass enclosure
  const pillarX = PIT_HALF_X + 0.3;
  const pillarZ = PIT_HALF_Z + 0.3;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      scene.add(at(box(0.42, CEIL_Y + 0.8, 0.42, trimMat), sx * pillarX, (CEIL_Y + 0.4) / 2, sz * pillarZ));
      scene.add(at(box(0.1, CEIL_Y + 0.6, 0.1, sx * sz > 0 ? neonCyan : neonPink), sx * (pillarX + 0.18), (CEIL_Y + 0.4) / 2, sz * (pillarZ + 0.18)));
    }
  }
  const glassMat = new THREE.MeshStandardMaterial({
    color: '#c7e5ff',
    roughness: 0.08,
    metalness: 0.15,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
  });
  disposables.push(glassMat);
  scene.add(at(plane(PIT_HALF_X * 2 + 0.4, CEIL_Y, glassMat), 0, CEIL_Y / 2, -pillarZ));
  scene.add(at(plane(PIT_HALF_Z * 2 + 0.4, CEIL_Y, glassMat), -pillarX, CEIL_Y / 2, 0, 0, Math.PI / 2, 0));
  scene.add(at(plane(PIT_HALF_Z * 2 + 0.4, CEIL_Y, glassMat), pillarX, CEIL_Y / 2, 0, 0, -Math.PI / 2, 0));

  // Top marquee header ("STANDUP-O-MATIC" or "THE ALGORITHM")
  scene.add(at(box(PIT_HALF_X * 2 + 1.1, 1.55, PIT_HALF_Z * 2 + 1.1, bodyMat), 0, CEIL_Y + 0.85, 0));
  const marqueeTex = canvasTexture(512, 128, (ctx, w, h) => {
    ctx.fillStyle = '#14172a';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#f2b817';
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.fillStyle = '#f2b817';
    ctx.font = `900 44px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(marqueeText, w / 2, h / 2 - 10);
    ctx.fillStyle = '#38bdf8';
    ctx.font = `700 20px ${FONT_UI}`;
    ctx.fillText('THE CLAW OF DESTINY', w / 2, h / 2 + 30);
  });
  disposables.push(marqueeTex);
  const marqueeMat = new THREE.MeshStandardMaterial({ map: marqueeTex, emissiveMap: marqueeTex, emissive: '#ffffff', emissiveIntensity: 0.55 });
  disposables.push(marqueeMat);
  scene.add(at(plane(PIT_HALF_X * 2 + 0.5, 1.25, marqueeMat), 0, CEIL_Y + 0.85, pillarZ + 0.28));

  // Marquee chaser LEDs
  const leds = [];
  for (let i = -5; i <= 5; i++) {
    const ledMat = new THREE.MeshStandardMaterial({ color: '#ffe066', emissive: '#ffe066', emissiveIntensity: 0.9 });
    disposables.push(ledMat);
    const led = at(ball(0.11, ledMat), i * 0.82, CEIL_Y + 0.14, pillarZ + 0.34);
    scene.add(led);
    leds.push({ mesh: led, mat: ledMat, idx: i + 5 });
  }

  // Front control console: animated 3D Joystick + DROP button + "INSERT STORY POINTS" coin slot
  scene.add(at(box(PIT_HALF_X * 2 + 0.8, 0.7, 1.4, trimMat), 0, -0.45, pillarZ + 0.75));
  const joystickPivot = new THREE.Group();
  joystickPivot.position.set(-1.3, -0.1, pillarZ + 0.85);
  joystickPivot.add(at(cyl(0.06, 0.06, 0.65, mat('#ced4da', { metalness: 0.85, roughness: 0.2 })), 0, 0.32, 0));
  joystickPivot.add(at(ball(0.22, mat('#e03131', { roughness: 0.25, metalness: 0.1 })), 0, 0.68, 0));
  scene.add(joystickPivot);
  // Big arcade DROP button
  scene.add(at(cyl(0.28, 0.32, 0.18, neonGold), 0.15, -0.05, pillarZ + 0.85));

  // Glowing INSERT STORY POINTS coin slot
  const coinTex = canvasTexture(256, 96, (ctx, w, h) => {
    ctx.fillStyle = '#14171f';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = '#ffe066';
    ctx.font = `800 22px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('INSERT STORY', w / 2, 34);
    ctx.fillText('POINTS', w / 2, 64);
  });
  disposables.push(coinTex);
  const coinMat = new THREE.MeshStandardMaterial({ map: coinTex, emissiveMap: coinTex, emissive: '#ffffff', emissiveIntensity: 0.45 });
  disposables.push(coinMat);
  scene.add(at(plane(1.9, 0.72, coinMat), 2.3, -0.45, pillarZ + 1.48));

  // VIP Lounge shelf outside the right glass wall for cooldown teammates
  const vipShelf = new THREE.Group();
  vipShelf.position.set(pillarX + 1.1, 1.4, 0);
  vipShelf.add(at(box(1.5, 0.2, 4.4, trimMat), 0, 0, 0));
  const vipTex = canvasTexture(256, 64, (ctx, w, h) => {
    ctx.fillStyle = '#1f1633';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#f2b817';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = '#f2b817';
    ctx.font = `800 26px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VIP LOUNGE', w / 2, h / 2 + 1);
  });
  disposables.push(vipTex);
  const vipMat = new THREE.MeshStandardMaterial({ map: vipTex });
  disposables.push(vipMat);
  vipShelf.add(at(plane(1.4, 0.36, vipMat), 0, -0.25, 2.22));
  scene.add(vipShelf);

  // Overhead X/Z gantry rails + mechanical claw ("THE STANDUP")
  const railZ = at(box(PIT_HALF_X * 2, 0.22, 0.24, mat('#868e96', { metalness: 0.7 })), 0, CEIL_Y - 0.15, 0);
  scene.add(railZ);

  const gantry = new THREE.Group();
  gantry.position.set(0, CEIL_Y - 0.35, 0);
  gantry.add(at(box(1.2, 0.4, 1.0, trimMat), 0, 0, 0));
  const standupTex = canvasTexture(256, 64, (ctx, w, h) => {
    ctx.fillStyle = '#c5122f';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 30px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('THE STANDUP', w / 2, h / 2 + 1);
  });
  disposables.push(standupTex);
  const standupMat = new THREE.MeshStandardMaterial({ map: standupTex });
  disposables.push(standupMat);
  gantry.add(at(plane(1.3, 0.34, standupMat), 0, 0, 0.52));
  scene.add(gantry);

  // Telescoping cable
  const cable = at(cyl(0.05, 0.05, 1, mat('#ced4da', { metalness: 0.8 })), 0, -0.5, 0);
  gantry.add(cable);

  // 3-pronged mechanical claw head
  const clawHead = new THREE.Group();
  clawHead.position.set(0, -1.2, 0);
  clawHead.add(at(cyl(0.32, 0.24, 0.36, mat('#adb5bd', { metalness: 0.75, roughness: 0.25 })), 0, 0, 0));
  const prongs = [];
  const prongMat = mat('#e9ecef', { metalness: 0.85, roughness: 0.2 });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const pivot = new THREE.Group();
    pivot.rotation.y = a;
    pivot.position.set(0, -0.12, 0);
    const arm = new THREE.Group();
    arm.add(at(box(0.09, 0.72, 0.12, prongMat), 0.28, -0.34, 0, 0, 0, 0.35));
    arm.add(at(box(0.08, 0.62, 0.1, prongMat), 0.36, -0.84, 0, 0, 0, -0.45));
    pivot.add(arm);
    clawHead.add(pivot);
    prongs.push(arm);
  }
  gantry.add(clawHead);

  // Downward circular scanning spotlight disc on the pit floor
  const spotDisc = at(
    torus(1.2, 0.08, mat('#38bdf8', { emissive: '#38bdf8', emissiveIntensity: 1.2 })),
    0, 0.08, 0, Math.PI / 2, 0, 0,
  );
  scene.add(spotDisc);
  const spotLight = new THREE.PointLight('#38bdf8', 14, 10, 1.6);
  spotLight.position.set(0, 3.0, 0);
  scene.add(spotLight);

  return {
    railZ,
    gantry,
    cable,
    clawHead,
    prongs,
    joystickPivot,
    spotDisc,
    spotLight,
    chuteRim,
    chuteLight,
    leds,
    vipShelf,
    setClaw(x, y, z, openAmount) {
      const cx = Math.max(-PIT_HALF_X + 0.6, Math.min(PIT_HALF_X - 0.6, x));
      const cz = Math.max(-PIT_HALF_Z + 0.6, Math.min(PIT_HALF_Z - 0.6, z));
      const cy = Math.max(0.95, Math.min(CEIL_Y - 1.1, y));
      railZ.position.z = cz;
      gantry.position.set(cx, CEIL_Y - 0.35, cz);
      const dropLen = Math.max(0.4, CEIL_Y - 0.35 - cy);
      cable.scale.y = dropLen;
      cable.position.y = -dropLen / 2;
      clawHead.position.y = -dropLen;
      for (const arm of prongs) arm.rotation.z = openAmount * 0.58;
      spotDisc.position.set(cx, 0.08, cz);
      spotLight.position.set(cx, cy + 1.2, cz);
    },
  };
}

/** Lightweight rigid-sphere settling & collision solver for the gachapon pile. */
function stepCapsulePhysics(bodies, dt, { allowChute = false } = {}) {
  const minX = -PIT_HALF_X + CAPSULE_R + 0.1;
  const maxX = PIT_HALF_X - CAPSULE_R - 0.1;
  const minZ = -PIT_HALF_Z + CAPSULE_R + 0.1;
  const maxZ = PIT_HALF_Z - CAPSULE_R - 0.1;

  for (const b of bodies) {
    if (b.attached || b.inChute) continue;
    b.vy -= 18 * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.z += b.vz * dt;

    // Floor & chute hole check
    const overChute = Math.hypot(b.x - CHUTE_X, b.z - CHUTE_Z) < CHUTE_R - 0.15;
    if (allowChute && b.dropTarget && overChute) {
      if (b.y < -2.6) b.inChute = true;
    } else if (b.y < FLOOR_Y + CAPSULE_R) {
      b.y = FLOOR_Y + CAPSULE_R;
      if (b.vy < -1.5) b.vy = -b.vy * 0.25;
      else b.vy = 0;
      b.vx *= 0.84;
      b.vz *= 0.84;
    }

    // Keep settled pile out of the prize chute opening unless dropping into it
    if (!b.dropTarget && overChute && b.y < 1.3) {
      const dx = b.x - CHUTE_X;
      const dz = b.z - CHUTE_Z;
      const d = Math.hypot(dx, dz) || 0.01;
      const push = (CHUTE_R + CAPSULE_R * 0.65) / d;
      b.x = CHUTE_X + dx * push;
      b.z = CHUTE_Z + dz * push;
    }

    // Cabinet glass walls
    if (b.x < minX) { b.x = minX; b.vx = Math.abs(b.vx) * 0.35; }
    if (b.x > maxX) { b.x = maxX; b.vx = -Math.abs(b.vx) * 0.35; }
    if (b.z < minZ) { b.z = minZ; b.vz = Math.abs(b.vz) * 0.35; }
    if (b.z > maxZ) { b.z = maxZ; b.vz = -Math.abs(b.vz) * 0.35; }
  }

  // Pairwise sphere-sphere separation
  const minDist = CAPSULE_R * 2.02;
  for (let i = 0; i < bodies.length; i++) {
    const a = bodies[i];
    if (a.attached || a.inChute) continue;
    for (let j = i + 1; j < bodies.length; j++) {
      const b = bodies[j];
      if (b.attached || b.inChute) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dz = b.z - a.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 > 0.0001 && d2 < minDist * minDist) {
        const d = Math.sqrt(d2);
        const overlap = (minDist - d) * 0.5;
        const nx = dx / d;
        const ny = dy / d;
        const nz = dz / d;
        a.x -= nx * overlap; a.y = Math.max(FLOOR_Y + CAPSULE_R, a.y - ny * overlap); a.z -= nz * overlap;
        b.x += nx * overlap; b.y = Math.max(FLOOR_Y + CAPSULE_R, b.y + ny * overlap); b.z += nz * overlap;
      }
    }
  }
}

// ------------------------------------------------------------------ VIP Lounge Shelf Helper

/** Populates the outside VIP LOUNGE shelf with cooldown / sitting-out teammates. */
function buildVipCapsules(vipShelf, sittingOut = [], disposables) {
  const guests = [];
  const list = sittingOut.slice(-3);
  list.forEach((name, i) => {
    const h = hashName(name);
    const kind = DEVELOPER_KINDS[h % DEVELOPER_KINDS.length];
    const visual = buildGachaponCapsule({ id: 100 + i, name, kind }, disposables);
    const z = list.length === 1 ? 0 : (i - (list.length - 1) / 2) * 1.45;
    visual.root.position.set(0, CAPSULE_R + 0.1, z);
    vipShelf.add(visual.root);
    guests.push({ visual, phase: (h % 628) / 100 });
  });
  return guests;
}

// ------------------------------------------------------------------ Lobby 3D Stage (Settling Pile)

export class ClawStage {
  constructor(aspect = 16 / 9, initialNames = [], sittingOut = []) {
    this.t = 0;
    this.orbit = 0.28;
    this.names = [];
    this.sittingOut = [];
    this.bodies = [];
    this.vipGuests = [];
    this.disposables = [];

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(46, aspect, 0.3, 140);
    this.cabinet = buildClawCabinet(this.scene, CABINET_MARQUEES[0], this.disposables);
    this.setLineup(initialNames, sittingOut);
    this.resize(aspect);
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 1 ? 58 : 45;
    this.camera.updateProjectionMatrix();
  }

  setLineup(names = [], sittingOut = []) {
    const sameNames = names.length === this.names.length && names.every((n, i) => n === this.names[i]);
    const sameVip = sittingOut.length === this.sittingOut.length && sittingOut.every((n, i) => n === this.sittingOut[i]);
    if (sameNames && sameVip) return;

    if (!sameVip) {
      for (const g of this.vipGuests) this.cabinet.vipShelf.remove(g.visual.root);
      this.sittingOut = [...sittingOut];
      this.vipGuests = buildVipCapsules(this.cabinet.vipShelf, this.sittingOut, this.disposables);
    }
    if (sameNames) return;
    for (const b of this.bodies) this.scene.remove(b.visual.root);
    this.bodies = [];
    this.names = [...names];

    const used = new Set();
    names.forEach((name, i) => {
      const h = hashName(name);
      let kindIdx = h % DEVELOPER_KINDS.length;
      if (used.size < DEVELOPER_KINDS.length) {
        while (used.has(kindIdx)) kindIdx = (kindIdx + 1) % DEVELOPER_KINDS.length;
        used.add(kindIdx);
      }
      const player = { id: i, name, kind: DEVELOPER_KINDS[kindIdx] };
      const visual = buildGachaponCapsule(player, this.disposables);
      const col = i % 5;
      const row = Math.floor(i / 5);
      const x = -2.2 + col * 1.25 + ((h % 100) / 100 - 0.5) * 0.4;
      const z = -2.2 + (row % 4) * 1.2 + (((h >> 8) % 100) / 100 - 0.5) * 0.4;
      const y = 1.8 + Math.floor(i / 10) * 1.4 + (i % 3) * 0.4;
      visual.root.position.set(x, y, z);
      this.scene.add(visual.root);
      this.bodies.push({ player, visual, x, y, z, vx: 0, vy: 0, vz: 0, phase: (h % 628) / 100 });
    });
  }

  update(dt, reduced = false) {
    if (!reduced) {
      this.t += dt;
      this.orbit += dt * 0.14;
    }
    const t = this.t;
    stepCapsulePhysics(this.bodies, reduced ? 0.016 : Math.min(0.04, dt));

    const cx = Math.sin(t * 0.7) * 2.4;
    const cz = Math.cos(t * 0.5) * 1.8;
    this.cabinet.setClaw(cx, 5.2 + Math.sin(t * 1.4) * 0.35, cz, 0.35 + Math.sin(t * 2) * 0.15);
    this.cabinet.joystickPivot.rotation.z = -Math.cos(t * 0.7) * 0.25;
    this.cabinet.joystickPivot.rotation.x = -Math.sin(t * 0.5) * 0.25;

    for (const led of this.cabinet.leds) {
      const lit = Math.floor(t * 6 + led.idx) % 3 === 0;
      led.mat.emissiveIntensity = lit ? 1.4 : 0.2;
    }
    for (const b of this.bodies) {
      const nearSpot = Math.hypot(b.x - cx, b.z - cz) < 1.5;
      const jitter = !reduced && nearSpot ? Math.sin(t * 36 + b.phase) * 0.06 : 0;
      b.visual.root.position.set(b.x + jitter, b.y, b.z);
      b.visual.bobble.rotation.z = reduced ? 0 : Math.sin(t * 4 + b.phase) * 0.14;
    }
    for (const g of this.vipGuests) {
      g.visual.bobble.rotation.z = reduced ? 0 : Math.sin(t * 2.6 + g.phase) * 0.1;
    }

    const angle = Math.sin(this.orbit) * 0.48;
    this.camera.position.set(Math.sin(angle) * 13.8, 5.4, Math.cos(angle) * 13.8);
    this.camera.lookAt(0, 2.3, 0);
  }

  dispose() {
    for (const d of this.disposables) d.dispose?.();
  }
}

// ------------------------------------------------------------------ Live Match (Choreographed Physics)

export class ClawMatch {
  constructor(names, { duration = 15, sittingOut = [], rng = Math.random, sfx = null, onEvent = null, onWinner = null } = {}) {
    this.plan = planClawMatch(names, { duration, rng });
    this.rng = rng;
    this.sfx = sfx;
    this.onEvent = onEvent;
    this.onWinner = onWinner;

    this.t = 0;
    this.finished = false;
    this.winnerReported = false;
    this.clawX = 0;
    this.clawY = 5.4;
    this.clawZ = 0;
    this.clawOpen = 0.2;
    this.disposables = [];

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.25, 140);
    this.cabinet = buildClawCabinet(this.scene, this.plan.marquee, this.disposables);
    this.vipGuests = buildVipCapsules(this.cabinet.vipShelf, sittingOut, this.disposables);
    this.particles = new Particles(this.scene);

    // Spawn and pre-settle all developer gachapon capsules in the pit
    this.bodies = this.plan.players.map((player, i) => {
      const visual = buildGachaponCapsule(player, this.disposables);
      const col = i % 5;
      const row = Math.floor(i / 5);
      const x = -2.2 + col * 1.2 + (rng() - 0.5) * 0.35;
      const z = -2.3 + (row % 4) * 1.15 + (rng() - 0.5) * 0.35;
      const y = CAPSULE_R + Math.floor(i / 10) * 1.15 + rng() * 0.25;
      visual.root.position.set(x, y, z);
      this.scene.add(visual.root);
      return {
        player,
        visual,
        x,
        y,
        z,
        vx: 0,
        vy: 0,
        vz: 0,
        attached: false,
        attachOffset: { x: 0, y: 0, z: 0 },
        dropTarget: false,
        inChute: false,
        phase: rng() * Math.PI * 2,
      };
    });
    for (let s = 0; s < 45; s++) stepCapsulePhysics(this.bodies, 1 / 30);

    // Per-attempt runtime state flags
    this.attemptState = this.plan.attempts.map(() => ({
      announced: false,
      grabbed: false,
      releasedDecoys: new Set(),
      failedDropped: false,
      finalDropped: false,
    }));

    this.camPos = new THREE.Vector3(6, 5.8, 12.8);
    this.camLook = new THREE.Vector3(0, 2.4, 0);
    this.resize(window.innerWidth / window.innerHeight);
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 1 ? 58 : 46;
    this.camera.updateProjectionMatrix();
  }

  update(dt) {
    this.t += dt;
    const t = this.t;

    // Locate current attempt
    const idx = this.plan.attempts.findIndex((a) => t >= a.start && t < a.end);
    const attempt = idx >= 0 ? this.plan.attempts[idx] : this.plan.attempts[this.plan.attempts.length - 1];
    const st = this.attemptState[attempt.index];
    const targetBody = this.bodies[attempt.targetId];

    const prevX = this.clawX;
    const prevZ = this.clawZ;
    let camMode = 'wide';

    if (t < attempt.huntEnd) {
      // Phase 1: The Hunt — hover over fake-outs, then zip to real target
      if (!st.announced) {
        st.announced = true;
        this.sfx?.play('clawWhir', 0.25);
        if (this.plan.attempts.length > 1) {
          this.onEvent?.({ type: 'attempt', text: `🕹️ Attempt ${attempt.index + 1} of ${this.plan.attempts.length}: scanning the pit…` });
        } else {
          this.onEvent?.({ type: 'attempt', text: '🕹️ THE STANDUP claw is scanning the developer pile…' });
        }
      }
      const q = (t - attempt.start) / Math.max(0.01, attempt.huntEnd - attempt.start);
      const stops = [...attempt.fakeouts.map((id) => this.bodies[id]), targetBody];
      const seg = Math.min(stops.length - 1, Math.floor(q * stops.length));
      const dest = stops[seg];
      this.clawX += (dest.x - this.clawX) * Math.min(1, dt * 6.5);
      this.clawZ += (dest.z - this.clawZ) * Math.min(1, dt * 6.5);
      this.clawY += (5.4 - this.clawY) * Math.min(1, dt * 5);
      this.clawOpen = 0.55;
      camMode = 'wide';
    } else if (t < attempt.scoopEnd) {
      // Phase 2: The Scoop — drop cable, open prongs, clamp onto target + decoys
      const q = (t - attempt.huntEnd) / Math.max(0.01, attempt.scoopEnd - attempt.huntEnd);
      this.clawX += (targetBody.x - this.clawX) * Math.min(1, dt * 10);
      this.clawZ += (targetBody.z - this.clawZ) * Math.min(1, dt * 10);
      if (q < 0.65) {
        if (q < 0.1) this.sfx?.play('clawDrop', 0.4);
        const dropY = Math.max(1.15, targetBody.y + 0.95);
        this.clawY += (dropY - this.clawY) * Math.min(1, dt * 8);
        this.clawOpen = 0.85;
      } else {
        this.clawOpen = 0.12;
        if (!st.grabbed) {
          st.grabbed = true;
          this.sfx?.play('pickup', 0.15);
          targetBody.attached = true;
          targetBody.attachOffset = { x: 0, y: -0.95, z: 0 };
          attempt.decoys.forEach((d, di) => {
            const db = this.bodies[d.playerId];
            db.attached = true;
            const ang = (di / Math.max(1, attempt.decoys.length)) * Math.PI * 2 + 0.5;
            db.attachOffset = { x: Math.cos(ang) * 0.58, y: -1.05 - (di % 2) * 0.18, z: Math.sin(ang) * 0.58 };
          });
        }
      }
      camMode = 'zoom';
    } else if (t < attempt.ascentEnd) {
      // Phase 3: Ascent & Heartbreak — rise & travel toward prize chute as decoys slip out
      const q = (t - attempt.scoopEnd) / Math.max(0.01, attempt.ascentEnd - attempt.scoopEnd);
      const liftY = 5.45;
      this.clawY += (liftY - this.clawY) * Math.min(1, dt * 3.8);
      if (q > 0.25) {
        const moveQ = (q - 0.25) / 0.75;
        this.clawX += (CHUTE_X - this.clawX) * Math.min(1, dt * (2.2 + moveQ * 2.5));
        this.clawZ += (CHUTE_Z - this.clawZ) * Math.min(1, dt * (2.2 + moveQ * 2.5));
      }
      this.clawOpen = 0.14;

      // Timed decoy releases with floating dev excuses
      for (const d of attempt.decoys) {
        if (!st.releasedDecoys.has(d.playerId) && t >= d.releaseAt) {
          st.releasedDecoys.add(d.playerId);
          const db = this.bodies[d.playerId];
          db.attached = false;
          db.vx = (this.rng() - 0.5) * 4.5;
          db.vy = 1.2;
          db.vz = (this.rng() - 0.5) * 4.5;
          this.sfx?.play(d.stage === 'rim' ? 'clawClank' : 'clawSlip', 0.1);
          this.onEvent?.({
            type: 'excuse',
            player: db.player,
            excuse: d.excuse,
            stage: d.stage,
          });
        }
      }

      // Non-final weak-grip release ("500 Internal Server Error")
      if (attempt.failRelease && !st.failedDropped && t >= attempt.failRelease.releaseAt) {
        st.failedDropped = true;
        targetBody.attached = false;
        targetBody.vx = 2.4 + this.rng() * 1.8;
        targetBody.vy = 0.8;
        targetBody.vz = -1.8 + (this.rng() - 0.5) * 2;
        this.clawOpen = 0.65;
        this.sfx?.play('clawClank', 0.1);
        this.onEvent?.({
          type: 'excuse',
          player: targetBody.player,
          excuse: attempt.failRelease.excuse,
          stage: 'weakGrip',
        });
      }
      camMode = attempt.isFinal && q > 0.62 ? 'chute' : 'zoom';
    } else {
      // Phase 4: The Drop!
      if (attempt.isFinal) {
        this.clawX += (CHUTE_X - this.clawX) * Math.min(1, dt * 8);
        this.clawZ += (CHUTE_Z - this.clawZ) * Math.min(1, dt * 8);
        this.clawY += (4.8 - this.clawY) * Math.min(1, dt * 4);
        this.clawOpen = 0.9;
        camMode = 'chute';

        if (!st.finalDropped) {
          st.finalDropped = true;
          targetBody.attached = false;
          targetBody.dropTarget = true;
          targetBody.x = CHUTE_X;
          targetBody.z = CHUTE_Z;
          targetBody.vx = 0;
          targetBody.vz = 0;
          targetBody.vy = -1.5;
          this.sfx?.play('clawWin', 0.1);
          this.particles.burst(new THREE.Vector3(CHUTE_X, 0.8, CHUTE_Z), {
            count: 42,
            colors: ['#f2b817', '#38bdf8', '#f06595', '#51cf66', '#ffffff'],
            speed: 6,
            up: 5,
            life: 2.2,
            size: 0.28,
            gravity: 6,
          });
          this.onEvent?.({ type: 'drop', player: targetBody.player });
        }

        if (!this.winnerReported && (targetBody.inChute || t >= attempt.end)) {
          this.winnerReported = true;
          this.finished = true;
          this.onWinner?.(this.plan.winner, this.plan);
        }
      } else {
        this.clawY += (5.4 - this.clawY) * Math.min(1, dt * 4);
        this.clawOpen = 0.4;
      }
    }

    // Update gantry, claw prongs & synced 3D arcade joystick
    this.cabinet.setClaw(this.clawX, this.clawY, this.clawZ, this.clawOpen);
    const vx = (this.clawX - prevX) / Math.max(0.001, dt);
    const vz = (this.clawZ - prevZ) / Math.max(0.001, dt);
    this.cabinet.joystickPivot.rotation.z = Math.max(-0.45, Math.min(0.45, -vx * 0.08));
    this.cabinet.joystickPivot.rotation.x = Math.max(-0.45, Math.min(0.45, vz * 0.08));

    // Sync attached capsules with subtle wobble
    for (const b of this.bodies) {
      if (b.attached) {
        const sway = Math.sin(t * 7 + b.phase) * 0.08;
        b.x = this.clawX + b.attachOffset.x + sway;
        b.y = this.clawY + b.attachOffset.y;
        b.z = this.clawZ + b.attachOffset.z;
      }
    }
    stepCapsulePhysics(this.bodies, Math.min(0.04, dt), { allowChute: true });

    // Visual sync + spotlight jitter
    for (const b of this.bodies) {
      const nearSpot = !b.attached && Math.hypot(b.x - this.clawX, b.z - this.clawZ) < 1.5;
      const jitter = nearSpot ? Math.sin(t * 40 + b.phase) * 0.07 : 0;
      b.visual.root.position.set(b.x + jitter, b.y, b.z);
      b.visual.root.visible = !b.inChute;
      b.visual.bobble.rotation.z = Math.sin(t * (nearSpot ? 16 : 4.5) + b.phase) * (nearSpot ? 0.25 : 0.12);
    }
    for (const g of this.vipGuests) {
      g.visual.bobble.rotation.z = Math.sin(t * 2.6 + g.phase) * 0.1;
    }

    // Flashing arcade LEDs (turbo flash on win!)
    const ledRate = this.winnerReported ? 18 : 6;
    for (const led of this.cabinet.leds) {
      const lit = Math.floor(t * ledRate + led.idx) % (this.winnerReported ? 2 : 3) === 0;
      led.mat.emissiveIntensity = lit ? 1.6 : 0.2;
    }

    this.particles.update(dt);

    // Dynamic camera cuts: 3/4 wide -> zoom -> dramatic low-angle Chute Cam
    const wantPos = new THREE.Vector3();
    const wantLook = new THREE.Vector3();
    if (camMode === 'chute') {
      wantPos.set(CHUTE_X + 3.8, 1.35, CHUTE_Z + 4.2);
      wantLook.set(CHUTE_X, 2.7, CHUTE_Z);
    } else if (camMode === 'zoom') {
      wantPos.set(this.clawX * 0.45 + 3.4, 4.3, 10.6);
      wantLook.set(this.clawX * 0.7, Math.max(1.5, this.clawY - 1.4), this.clawZ * 0.7);
    } else {
      wantPos.set(Math.sin(t * 0.3) * 4.5 + 2.5, 5.8, 13.6);
      wantLook.set(0, 2.5, 0);
    }
    this.camPos.lerp(wantPos, Math.min(1, dt * 4));
    this.camLook.lerp(wantLook, Math.min(1, dt * 5));
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
  }

  dispose() {
    this.particles.clear();
    for (const d of this.disposables) d.dispose?.();
  }
}
