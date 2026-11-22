// "Tumba Lata" (Slipper-Slinging Server Raid): glowing twilight Filipino fiesta street with
// crisscross banderitas, warm streetlamps, neon SARI-SARI DEV SHOP storefront, glowing cyan
// chalk badlis & circle, shiny ribbed PROD SERVER tin can, caffeinated AI Bantay, spinning
// colorful tsinelas (flip-flops), Claw-of-Destiny bobblehead street runners, and 4-shot camera.

import * as THREE from 'three';
import { mat, box, ball, cyl, cone, torus, plane, at, canvasTexture, FONT_UI, FONT_MONO, roundRect } from './util3d.js';
import { Particles } from './effects.js';
import { DEVELOPER_KINDS } from './deathmatch-sim.js';
import {
  planTumbaMatch,
  sampleSlipperState,
  sampleCanState,
  samplePlayerState,
  sampleBantayState,
  BADLIS_Z,
  CAN_HOME_Z,
  STREET_HALF_W,
  DEFAULT_TUMBA_DURATION,
} from './tumba-sim.js';

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

/** Weathered dark twilight asphalt street texture with subtle aggregate & dashed lane divider. */
function makeAsphaltTexture() {
  const tex = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#1b1f2a';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 2200; i++) {
      const x = (i * 47) % w;
      const y = (i * 89) % h;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(255,255,255,0.045)' : 'rgba(5,7,12,0.22)';
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.fillStyle = 'rgba(255, 212, 59, 0.22)';
    ctx.fillRect(w / 2 - 3, 24, 6, 86);
    ctx.fillRect(w / 2 - 3, 152, 6, 86);
  });
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 12);
  return tex;
}

/** Shiny metallic PROD SERVER tin-can label texture with red/amber warning band. */
function makeProdCanTexture() {
  return canvasTexture(512, 256, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, '#ced4da');
    grad.addColorStop(0.25, '#f8f9fa');
    grad.addColorStop(0.5, '#adb5bd');
    grad.addColorStop(0.75, '#f1f3f5');
    grad.addColorStop(1, '#ced4da');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    // Ribbed tin lines
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    for (const y of [22, 34, 222, 234]) ctx.fillRect(0, y, w, 4);
    // Red/amber PROD SERVER wrapper label
    ctx.fillStyle = '#c92a2a';
    ctx.fillRect(0, 56, w, 144);
    ctx.fillStyle = '#f59f00';
    ctx.fillRect(0, 56, w, 14);
    ctx.fillRect(0, 186, w, 14);
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 48px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PROD SERVER', w / 2, 118);
    ctx.fillStyle = '#ffe066';
    ctx.font = `700 22px ${FONT_MONO}`;
    ctx.fillText('DO NOT KNOCK OVER', w / 2, 162);
  });
}

/** Glowing neon SARI-SARI DEV SHOP storefront sign texture. */
function makeSariSariSignTexture() {
  return canvasTexture(512, 128, (ctx, w, h) => {
    ctx.fillStyle = '#141328';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 7;
    ctx.strokeRect(6, 6, w - 12, h - 12);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.strokeRect(14, 14, w - 28, h - 28);
    ctx.fillStyle = '#ffe066';
    ctx.font = `900 38px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SARI-SARI DEV SHOP', w / 2, 52);
    ctx.fillStyle = '#74c0fc';
    ctx.font = `700 20px ${FONT_UI}`;
    ctx.fillText('3-IN-1 COFFEE · TSINELAS · HOTFIXES', w / 2, 94);
  });
}

/** Upright player nameplate sprite. */
function makeStreetTag(name, color) {
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
  sprite.position.set(0, 2.55, 0);
  return { sprite, tex, spriteMat };
}

let tsinelasGeos = null;

/** Builds and caches shared sculpted flip-flop (tsinelas) geometries: anatomical beveled sole + curved Y-straps. */
function getTsinelasGeometries() {
  if (tsinelasGeos) return tsinelasGeos;

  // Anatomical footprint outline (rounded heel -> contoured arch -> wider rounded toe box)
  const s = new THREE.Shape();
  s.moveTo(0, -0.44);
  s.bezierCurveTo(0.16, -0.44, 0.23, -0.34, 0.22, -0.16);
  s.bezierCurveTo(0.21, -0.02, 0.16, 0.10, 0.17, 0.24);
  s.bezierCurveTo(0.18, 0.38, 0.11, 0.45, 0, 0.45);
  s.bezierCurveTo(-0.11, 0.45, -0.18, 0.38, -0.17, 0.24);
  s.bezierCurveTo(-0.16, 0.10, -0.20, -0.02, -0.21, -0.16);
  s.bezierCurveTo(-0.22, -0.34, -0.15, -0.44, 0, -0.44);

  const topSole = new THREE.ExtrudeGeometry(s, {
    depth: 0.045,
    bevelEnabled: true,
    bevelThickness: 0.018,
    bevelSize: 0.016,
    bevelSegments: 3,
    curveSegments: 16,
  });
  topSole.rotateX(Math.PI / 2);

  const bottomSole = new THREE.ExtrudeGeometry(s, {
    depth: 0.032,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.014,
    bevelSegments: 2,
    curveSegments: 16,
  });
  bottomSole.rotateX(Math.PI / 2);

  // Smooth curved rubber Y-straps arching over the instep and meeting at the toe-post plug
  const leftStrapCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.18, 0.01, 0.06),
    new THREE.Vector3(-0.17, 0.14, -0.04),
    new THREE.Vector3(-0.08, 0.20, -0.16),
    new THREE.Vector3(0.0, 0.14, -0.26),
    new THREE.Vector3(0.0, 0.0, -0.27),
  ]);
  const rightStrapCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.18, 0.01, 0.06),
    new THREE.Vector3(0.17, 0.14, -0.04),
    new THREE.Vector3(0.08, 0.20, -0.16),
    new THREE.Vector3(0.0, 0.14, -0.26),
    new THREE.Vector3(0.0, 0.0, -0.27),
  ]);
  const leftStrap = new THREE.TubeGeometry(leftStrapCurve, 16, 0.028, 8, false);
  const rightStrap = new THREE.TubeGeometry(rightStrapCurve, 16, 0.028, 8, false);

  tsinelasGeos = { topSole, bottomSole, leftStrap, rightStrap };
  return tsinelasGeos;
}

/** Builds a realistic contoured 3D rubber flip-flop (tsinelas) with dual-layer sole and curved Y-straps! */
function buildTsinelas(color) {
  const g = new THREE.Group();
  const geos = getTsinelasGeometries();
  const footbedMat = mat('#f8f9fa', { roughness: 0.68 });
  const rubberMat = mat(color, { roughness: 0.42, emissive: color, emissiveIntensity: 0.22 });

  // Cushioned white EVA footbed + colored rubber outsole underneath
  const top = new THREE.Mesh(geos.topSole, footbedMat);
  top.position.y = 0.03;
  g.add(top);

  const bot = new THREE.Mesh(geos.bottomSole, rubberMat);
  bot.position.y = -0.018;
  g.add(bot);

  // Subtle colored heel-pad print on the footbed
  g.add(at(cyl(0.085, 0.085, 0.008, rubberMat, 14), 0, 0.052, 0.24));

  // Curved rubber Y-straps & molded toe-post collar
  g.add(new THREE.Mesh(geos.leftStrap, rubberMat));
  g.add(new THREE.Mesh(geos.rightStrap, rubberMat));
  g.add(at(cyl(0.042, 0.036, 0.045, rubberMat, 10), 0, 0.15, -0.255));

  g.scale.setScalar(1.08);
  return g;
}

/** Builds an animated street-game developer runner with a Claw-of-Destiny bobblehead portrait! */
function buildStreetRunner(name, kind, color, disposables) {
  const root = new THREE.Group();
  const shirtMat = mat(kind.shirt ?? color, { roughness: 0.65 });
  const pantsMat = mat('#2b303a', { roughness: 0.85 });
  const shoeMat = mat('#f8f9fa', { roughness: 0.7 });

  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.16, 0.72, 0);
  leftLeg.add(at(cyl(0.1, 0.09, 0.68, pantsMat, 8), 0, -0.34, 0));
  leftLeg.add(at(box(0.18, 0.12, 0.32, shoeMat), 0, -0.66, -0.06));
  root.add(leftLeg);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.16, 0.72, 0);
  rightLeg.add(at(cyl(0.1, 0.09, 0.68, pantsMat, 8), 0, -0.34, 0));
  rightLeg.add(at(box(0.18, 0.12, 0.32, shoeMat), 0, -0.66, -0.06));
  root.add(rightLeg);

  // Torso + swinging arms
  root.add(at(cyl(0.26, 0.22, 0.76, shirtMat, 12), 0, 1.12, 0));
  const leftArm = at(cyl(0.08, 0.07, 0.56, shirtMat, 8), -0.34, 1.18, 0);
  const rightArm = at(cyl(0.08, 0.07, 0.56, shirtMat, 8), 0.34, 1.18, 0);
  root.add(leftArm, rightArm);

  // Developer portrait bobblehead
  const head = new THREE.Group();
  head.position.set(0, 1.82, 0);
  head.add(at(cyl(0.42, 0.42, 0.14, mat(kind.accent ?? color, { roughness: 0.35 }), 24), 0, 0, 0, Math.PI / 2, 0, 0));
  const portraitTex = getDeveloperPortraitTexture(kind.id);
  const faceMat = new THREE.MeshStandardMaterial({ map: portraitTex, roughness: 0.35 });
  const faceGeo = new THREE.CircleGeometry(0.39, 24);
  const front = new THREE.Mesh(faceGeo, faceMat);
  front.position.set(0, 0, 0.076);
  const back = new THREE.Mesh(faceGeo, faceMat);
  back.rotation.y = Math.PI;
  back.position.set(0, 0, -0.076);
  head.add(front, back);
  root.add(head);

  const tag = makeStreetTag(name, kind.accent ?? color);
  root.add(tag.sprite);
  disposables.push(faceGeo, faceMat, tag.tex, tag.spriteMat);

  return { root, leftLeg, rightLeg, leftArm, rightArm, head };
}

/** Builds the overworked, caffeinated AI Bantay (Release Manager) clutching an oversized coffee mug. */
function buildBantay(disposables) {
  const root = new THREE.Group();
  const vestMat = mat('#f59f00', { roughness: 0.55, emissive: '#e67700', emissiveIntensity: 0.25 });
  const darkMat = mat('#1d2128', { roughness: 0.75 });
  const skinMat = mat('#e8b896', { roughness: 0.7 });
  const visorMat = mat('#38bdf8', { emissive: '#38bdf8', emissiveIntensity: 1.4 });

  const leftLeg = at(cyl(0.11, 0.1, 0.75, darkMat, 8), -0.18, 0.38, 0);
  const rightLeg = at(cyl(0.11, 0.1, 0.75, darkMat, 8), 0.18, 0.38, 0);
  root.add(leftLeg, rightLeg);
  root.add(at(cyl(0.32, 0.26, 0.88, vestMat, 12), 0, 1.18, 0));
  root.add(at(ball(0.32, skinMat), 0, 1.88, 0));
  // Glowing Release Manager visor (turns red in HUNTING MODE!)
  const visor = at(box(0.46, 0.14, 0.22, visorMat), 0, 1.92, 0.22);
  root.add(visor);
  // Oversized coffee mug clutched in right hand
  root.add(at(cyl(0.16, 0.14, 0.32, mat('#f8f9fa', { roughness: 0.2 }), 12), 0.45, 1.25, 0.26));
  root.add(at(torus(0.09, 0.025, mat('#f8f9fa')), 0.61, 1.25, 0.26));

  const tag = makeStreetTag('☕ BANTAY', '#fcc419');
  tag.sprite.position.y = 2.68;
  root.add(tag.sprite);
  disposables.push(tag.tex, tag.spriteMat);

  return { root, leftLeg, rightLeg, visor };
}

/** Builds the glowing twilight fiesta street, crisscross banderitas, streetlamps & SARI-SARI DEV SHOP. */
function buildTumbaArena(scene, disposables) {
  scene.background = new THREE.Color('#12162b');
  scene.fog = new THREE.Fog('#12162b', 42, 130);

  scene.add(new THREE.HemisphereLight('#748ffc', '#1b1828', 0.95));
  const moon = new THREE.DirectionalLight('#dbe4ff', 1.1);
  moon.position.set(16, 36, 18);
  scene.add(moon);

  // Weathered twilight asphalt street
  const asphaltTex = makeAsphaltTexture();
  disposables.push(asphaltTex);
  const asphaltMat = new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.9 });
  disposables.push(asphaltMat);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(STREET_HALF_W * 2, 84), asphaltMat);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0, -8);
  scene.add(road);

  // Raised concrete curbs & sidewalks
  const curbMat = mat('#495057', { roughness: 0.88 });
  const walkMat = mat('#343a40', { roughness: 0.9 });
  for (const side of [-1, 1]) {
    scene.add(at(box(0.5, 0.26, 84, curbMat), side * (STREET_HALF_W + 0.25), 0.13, -8));
    scene.add(at(box(10, 0.24, 84, walkMat), side * (STREET_HALF_W + 5.5), 0.12, -8));
  }

  // Glowing cyan chalk badlis throw line & center lata circle
  const chalkMat = mat('#3bc9db', { emissive: '#22b8cf', emissiveIntensity: 1.5, roughness: 0.3 });
  scene.add(at(box(STREET_HALF_W * 1.9, 0.03, 0.22, chalkMat), 0, 0.02, BADLIS_Z));
  scene.add(at(torus(1.25, 0.06, chalkMat), 0, 0.03, CAN_HOME_Z, Math.PI / 2, 0, 0));

  // Crisscross fiesta banderitas overhead!
  const flagColors = ['#ff6b6b', '#ffd43b', '#51cf66', '#339af0', '#f06595', '#ff922b'];
  const ropeMat = mat('#ced4da', { roughness: 0.8 });
  const banderitas = [];
  for (let row = 0; row < 5; row++) {
    const z1 = 10 - row * 7.5;
    const z2 = z1 - 3.5;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-STREET_HALF_W - 1.5, 7.8, z1),
      new THREE.Vector3(0, 6.2, (z1 + z2) / 2),
      new THREE.Vector3(STREET_HALF_W + 1.5, 7.8, z2),
    ]);
    const ropeGeo = new THREE.TubeGeometry(curve, 18, 0.03, 5, false);
    disposables.push(ropeGeo);
    scene.add(new THREE.Mesh(ropeGeo, ropeMat));

    for (let f = 1; f <= 13; f++) {
      const pt = curve.getPoint(f / 14);
      const col = flagColors[(row * 3 + f) % flagColors.length];
      const flag = at(cone(0.36, 0.72, mat(col, { emissive: col, emissiveIntensity: 0.45, roughness: 0.5 }), 3), pt.x, pt.y - 0.36, pt.z, Math.PI, 0, 0);
      scene.add(flag);
      banderitas.push({ mesh: flag, phase: row + f * 0.5 });
    }
  }

  // Warm twilight streetlamps (flash red during HUNTING MODE!)
  const poleMat = mat('#2b303a', { roughness: 0.5, metalness: 0.65 });
  const lampBulbs = [];
  const lampLights = [];
  for (const z of [8, -6, -20]) {
    for (const side of [-1, 1]) {
      const px = side * (STREET_HALF_W + 1.1);
      scene.add(at(cyl(0.11, 0.15, 7.8, poleMat, 10), px, 3.9, z));
      scene.add(at(box(1.9, 0.14, 0.14, poleMat), px - side * 0.85, 7.75, z));
      const bulbMat = new THREE.MeshStandardMaterial({ color: '#fff3bf', emissive: '#ffd43b', emissiveIntensity: 1.8 });
      disposables.push(bulbMat);
      const bulb = at(ball(0.28, bulbMat, 1.3, 0.65, 1.0), px - side * 1.55, 7.55, z);
      scene.add(bulb);
      lampBulbs.push(bulbMat);
      if (z !== -20) {
        const pt = new THREE.PointLight('#ffd8a8', 32, 24, 1.5);
        pt.position.set(px - side * 1.55, 7.0, z);
        scene.add(pt);
        lampLights.push(pt);
      }
    }
  }

  // SARI-SARI DEV SHOP storefront on the right sidewalk
  const shop = new THREE.Group();
  shop.position.set(STREET_HALF_W + 4.4, 0.24, -4.5);
  shop.add(at(box(5.2, 5.0, 9.2, mat('#2c3248', { roughness: 0.85 })), 0, 2.5, 0));
  // Corrugated awning roof
  shop.add(at(box(2.4, 0.16, 9.6, mat('#e03131', { roughness: 0.5 })), -3.2, 4.1, 0, 0, 0, 0.28));
  // Warm interior counter window + colorful snack jars
  shop.add(at(box(0.2, 2.1, 5.4, mat('#fff3bf', { emissive: '#fcc419', emissiveIntensity: 0.7 })), -2.55, 2.35, 0));
  shop.add(at(box(0.9, 0.16, 5.8, mat('#8c6b4a')), -2.9, 1.32, 0));
  for (let j = 0; j < 6; j++) {
    shop.add(at(cyl(0.14, 0.14, 0.34, mat(flagColors[j]), 8), -2.75, 1.56, -2.0 + j * 0.8));
  }
  // Neon SARI-SARI DEV SHOP sign
  const signTex = makeSariSariSignTexture();
  disposables.push(signTex);
  const signMat = new THREE.MeshStandardMaterial({ map: signTex, emissive: '#ffd43b', emissiveIntensity: 0.45 });
  disposables.push(signMat);
  shop.add(at(plane(7.8, 1.9, signMat), -2.65, 5.4, 0, 0, -Math.PI / 2, 0));
  scene.add(shop);

  // Barangay houses on the left sidewalk for cozy street framing
  for (const [hz, hcol] of [[5, '#3b4252'], [-8, '#4c3b4d'], [-21, '#2e4756']]) {
    scene.add(at(box(5.6, 5.4, 8.6, mat(hcol, { roughness: 0.88 })), -STREET_HALF_W - 4.6, 2.9, hz));
    scene.add(at(box(0.2, 1.4, 2.2, mat('#ffe066', { emissive: '#fcc419', emissiveIntensity: 0.65 })), -STREET_HALF_W - 1.75, 3.1, hz));
  }

  // Shiny ribbed PROD SERVER tin can (lata)
  const canTex = makeProdCanTexture();
  disposables.push(canTex);
  const canMat = new THREE.MeshStandardMaterial({ map: canTex, roughness: 0.28, metalness: 0.65 });
  disposables.push(canMat);
  const can = new THREE.Group();
  can.add(cyl(0.42, 0.42, 1.08, canMat, 22));
  can.add(at(torus(0.42, 0.03, mat('#e9ecef', { metalness: 0.85 })), 0, 0.53, 0, Math.PI / 2, 0, 0));
  can.add(at(torus(0.42, 0.03, mat('#e9ecef', { metalness: 0.85 })), 0, -0.53, 0, Math.PI / 2, 0, 0));
  can.position.set(0, 0.55, CAN_HOME_Z);
  scene.add(can);

  const bantay = buildBantay(disposables);
  bantay.root.position.set(0, 0, CAN_HOME_Z - 1.4);
  scene.add(bantay.root);

  return { can, bantay, banderitas, lampBulbs, lampLights };
}

// ------------------------------------------------------------------ Lobby 3D Stage

export class TumbaStage {
  constructor(aspect = 16 / 9, initialNames = []) {
    this.t = 0;
    this.names = [];
    this.models = [];
    this.disposables = [];

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(48, aspect, 0.3, 200);
    this.arena = buildTumbaArena(this.scene, this.disposables);
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
    const spanX = Math.min(STREET_HALF_W * 1.55, Math.max(4.0, (n - 1) * 1.35));
    names.forEach((name, i) => {
      const row = n > 10 ? Math.floor(i / 10) : 0;
      const inRow = n > 10 ? Math.min(10, n - row * 10) : n;
      const col = n > 10 ? i % 10 : i;
      const x = inRow === 1 ? 0 : ((col / (inRow - 1)) - 0.5) * spanX;
      const z = BADLIS_Z + 1.15 + row * 1.45;
      const kind = DEVELOPER_KINDS[i % DEVELOPER_KINDS.length];
      const runner = buildStreetRunner(name, kind, kind.accent, this.disposables);
      const slipper = buildTsinelas(kind.accent);
      slipper.position.set(0.4, 1.12, -0.35);
      runner.root.add(slipper);
      runner.root.position.set(x, 0, z);
      this.scene.add(runner.root);
      this.models.push({ ...runner, phase: i * 0.7 });
    });
  }

  update(dt, reduced = false) {
    if (!reduced) this.t += dt;
    const t = this.t;
    for (const m of this.models) {
      m.root.position.y = reduced ? 0 : Math.abs(Math.sin(t * 4.5 + m.phase)) * 0.16;
      m.head.rotation.z = reduced ? 0 : Math.sin(t * 4.5 + m.phase) * 0.12;
    }
    this.arena.bantay.root.position.x = reduced ? 0 : Math.sin(t * 1.8) * 1.6;
    if (!reduced) {
      for (const b of this.arena.banderitas) b.mesh.rotation.z = Math.sin(t * 3.5 + b.phase) * 0.18;
    }
    const sway = reduced ? 0 : Math.sin(t * 0.35) * 3.8;
    this.camera.position.set(sway, 6.2, BADLIS_Z + 10.5);
    this.camera.lookAt(0, 1.4, CAN_HOME_Z + 1.5);
  }

  dispose() {
    for (const d of this.disposables) d.dispose?.();
  }
}

// ------------------------------------------------------------------ Live Match

export class TumbaMatch {
  constructor(names, { duration = DEFAULT_TUMBA_DURATION, rng = Math.random, sfx = null, onEvent = null, onWinner = null } = {}) {
    this.plan = planTumbaMatch(names, { duration, rng });
    this.sfx = sfx;
    this.onEvent = onEvent;
    this.onWinner = onWinner;
    this.time = 0;
    this.hitStop = 0;
    this.done = false;
    this.disposables = [];

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.3, 200);
    this.arena = buildTumbaArena(this.scene, this.disposables);
    this.particles = new Particles(this.scene);

    this.runners = this.plan.players.map((p, i) => {
      const kind = DEVELOPER_KINDS[i % DEVELOPER_KINDS.length];
      const runner = buildStreetRunner(p.name, kind, p.color, this.disposables);
      runner.root.position.set(p.homeX, 0, p.homeZ);
      this.scene.add(runner.root);
      const slipper = buildTsinelas(p.color);
      this.scene.add(slipper);
      return { sim: p, ...runner, slipper };
    });

    this.volleyFlags = this.plan.volleys.map(() => ({
      thrown: false,
      hit: false,
      restored: false,
      ended: false,
      popupsSent: new Set(),
    }));

    this.camPos = new THREE.Vector3(0, 6.2, BADLIS_Z + 10.5);
    this.camLook = new THREE.Vector3(0, 1.4, CAN_HOME_Z + 1.5);
    this.resize(window.innerWidth / window.innerHeight);
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 1 ? 64 : 50;
    this.camera.updateProjectionMatrix();
  }

  update(realDt) {
    if (this.hitStop > 0) {
      this.hitStop -= realDt;
      this.particles.update(realDt * 0.25);
      return;
    }

    // Slow-motion (0.4x) right at the final tag for dramatic finish!
    const lastVolley = this.plan.volleys.at(-1);
    const inTagSlowMo = lastVolley && this.time > lastVolley.tagAt - 0.55 && this.time < lastVolley.tagAt + 0.35;
    const dt = inTagSlowMo ? realDt * 0.45 : realDt;
    if (!this.done) this.time += dt;
    const t = this.time;

    // Locate active volley
    let vIdx = this.plan.volleys.length - 1;
    for (let i = 0; i < this.plan.volleys.length; i++) {
      if (t < this.plan.volleys[i].endAt) { vIdx = i; break; }
    }
    const volley = this.plan.volleys[vIdx];
    const flags = this.volleyFlags[vIdx];

    // Trigger volley lifecycle events
    if (!flags.thrown && t >= volley.throwAt) {
      flags.thrown = true;
      this.sfx?.play?.('tumbaThrow');
      this.onEvent?.({ type: 'status', text: '🩴 BATO! TSINELAS VOLLEY AWAY!', tone: 'yellow' });
      this.onEvent?.({ type: 'note', text: `🩴 Volley ${vIdx + 1}: BATO! Everyone hurls their tsinelas!`, important: true });
    }
    if (!flags.hit && t >= volley.hitAt) {
      flags.hit = true;
      this.hitStop = 0.06; // Crisp 60ms impact freeze-frame
      this.sfx?.play?.('tumbaClang');
      this.particles.burst(new THREE.Vector3(0, 0.7, CAN_HOME_Z), {
        count: 34,
        colors: ['#ffd43b', '#ff922b', '#ff6b6b', '#ced4da'],
        speed: 7.5,
        up: 6.5,
        life: 0.9,
        size: 0.24,
        gravity: 14,
      });
      this.onEvent?.({ type: 'status', text: '💥 PROD DOWN! SCRAMBLE FOR YOUR TSINELAS!', tone: 'green' });
      this.onEvent?.({ type: 'note', text: `💥 TUMBA! “${volley.hitPopup}”`, important: true });
    }
    if (!flags.restored && t >= volley.restoreAt) {
      flags.restored = true;
      this.sfx?.play?.('tumbaRestore');
      this.onEvent?.({ type: 'status', text: '🚨 PROD RESTORED — HUNTING MODE!', tone: 'red' });
      this.onEvent?.({ type: 'note', text: '🚨 Bantay restored PROD SERVER — HUNTING MODE!', important: true });
    }
    if (!flags.ended && !volley.isFinal && t >= volley.endAt - 0.15) {
      flags.ended = true;
      this.onEvent?.({ type: 'note', text: '☕ Safe! Reload! Bantay chugs 3-in-1 coffee (CAFFEINE BOOST x2)!', important: true });
    }

    // Update runners & slippers
    let targetPos = { x: 0, z: BADLIS_Z - 1.2 };
    for (let i = 0; i < this.runners.length; i++) {
      const r = this.runners[i];
      const th = volley.throws[i];
      const ps = samplePlayerState(r.sim, th, volley, t);
      if (r.sim.isWinner) targetPos = ps;

      r.root.position.set(ps.x, ps.state === 'ready' ? Math.abs(Math.sin(t * 5 + i)) * 0.12 : 0, ps.z);
      const swing = ps.runPhase ? Math.sin(ps.runPhase) * 0.65 : 0;
      r.leftLeg.rotation.x = swing;
      r.rightLeg.rotation.x = -swing;
      r.leftArm.rotation.x = -swing * 0.8;
      r.rightArm.rotation.x = swing * 0.8;
      r.head.rotation.z = Math.sin(t * 6 + i) * 0.12;
      if (ps.state === 'flee') r.root.rotation.y = 0;
      else if (ps.state === 'seek') r.root.rotation.y = Math.PI;

      const ss = sampleSlipperState(th, volley, ps, t);
      r.slipper.position.set(ss.x, ss.y, ss.z);
      if (ss.phase === 'flight') {
        r.slipper.rotation.set(ss.spin * th.spinX, 0, ss.spin * th.spinZ);
      } else {
        r.slipper.rotation.set(0, r.sim.id * 0.6, 0);
      }

      // Emit occasional dev-humor throw / scramble popups
      if (th.popup && !th.isDirectHit && t >= th.landAt && !flags.popupsSent.has(`w${i}`) && flags.popupsSent.size < 4) {
        flags.popupsSent.add(`w${i}`);
        this.onEvent?.({ type: 'note', text: `🩴 ${r.sim.name}: “${th.popup}”`, important: false });
      }
      if (th.scramblePopup && t >= th.grabAt - 0.25 && !flags.popupsSent.has(`s${i}`) && flags.popupsSent.size < 6) {
        flags.popupsSent.add(`s${i}`);
        this.onEvent?.({ type: 'note', text: `🏃 ${r.sim.name}: “${th.scramblePopup}”`, important: false });
      }
    }

    // Update Bantay & PROD SERVER tin can
    const bs = sampleBantayState(volley, targetPos, t);
    this.arena.bantay.root.position.set(bs.x, 0, bs.z);
    const bSwing = bs.runPhase ? Math.sin(bs.runPhase) * 0.7 : 0;
    this.arena.bantay.leftLeg.rotation.x = bSwing;
    this.arena.bantay.rightLeg.rotation.x = -bSwing;
    this.arena.bantay.visor.material.emissive.set(bs.hunting ? '#ff2a2a' : '#38bdf8');

    // Flash streetlamps red during HUNTING MODE!
    const lampColor = bs.hunting ? '#ff4d4f' : '#ffd43b';
    for (const bm of this.arena.lampBulbs) bm.emissive.set(lampColor);
    for (const lt of this.arena.lampLights) lt.color.set(bs.hunting ? '#ff6b6b' : '#ffd8a8');

    const cs = sampleCanState(volley, bs, t);
    this.arena.can.position.set(cs.x, cs.y, cs.z);
    this.arena.can.rotation.set(cs.knocked ? Math.PI / 2 + cs.tumble : 0, cs.tumble * 0.5, cs.knocked ? cs.tumble * 0.7 : 0);

    for (const b of this.arena.banderitas) b.mesh.rotation.z = Math.sin(t * 3.5 + b.phase) * 0.18;

    // Trigger final TAG!
    if (volley.isFinal && !this.done && t >= volley.tagAt) {
      this.done = true;
      this.sfx?.play?.('tumbaTag');
      this.sfx?.fanfare?.();
      this.particles.burst(new THREE.Vector3(targetPos.x, 1.5, targetPos.z), {
        count: 65,
        colors: ['#ffd43b', '#ff6b6b', '#51cf66', '#38bdf8', '#ffffff'],
        speed: 7.5,
        up: 9.0,
        life: 1.9,
        size: 0.28,
        gravity: 12,
      });
      this.onWinner?.(this.plan.winner, this.plan);
    }

    this.particles.update(realDt);

    // 4-Shot Dynamic Camera Choreography
    const wantPos = new THREE.Vector3();
    const wantLook = new THREE.Vector3();
    if (t < volley.hitAt) {
      // Volley Shot: low dramatic 3/4 behind badlis
      wantPos.set(3.2, 4.4, BADLIS_Z + 8.5);
      wantLook.set(0, 1.5, CAN_HOME_Z);
    } else if (t < volley.hitAt + 1.1) {
      // Impact Cut: punch-in on the exploding tin can
      wantPos.set(4.5, 3.0, CAN_HOME_Z + 5.8);
      wantLook.set(cs.x, 1.1, cs.z);
    } else if (!volley.isFinal || t < volley.restoreAt) {
      // Scramble Cam: elevated angled street overview
      wantPos.set(0, 11.2, BADLIS_Z + 11.0);
      wantLook.set(0, 1.0, CAN_HOME_Z + 1.5);
    } else {
      // The Tag: tight zoom near the badlis line
      wantPos.set(targetPos.x + 4.8, 3.6, BADLIS_Z + 5.8);
      wantLook.set(targetPos.x, 1.4, targetPos.z);
    }

    this.camPos.lerp(wantPos, Math.min(1, realDt * 5.0));
    this.camLook.lerp(wantLook, Math.min(1, realDt * 5.5));
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
  }

  dispose() {
    for (const d of this.disposables) d.dispose?.();
  }
}
