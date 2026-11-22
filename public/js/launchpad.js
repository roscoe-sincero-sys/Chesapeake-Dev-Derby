// "Launchpad Roulette" (Rocket Ignition Chaos): coastal Chesapeake Bay launch complex, quirky
// low-poly rockets with cosmetic flair, dynamic daylight -> twilight -> starry space skybox,
// cloud deck, confetti pops, tiny stall parachutes, and dynamic hero/climb/orbit camera.

import * as THREE from 'three';
import { mat, box, ball, cyl, cone, torus, plane, at, canvasTexture, FONT_UI, FONT_MONO, roundRect } from './util3d.js';
import { Particles } from './effects.js';
import {
  planLaunchMatch,
  padFormation,
  sampleRocketState,
  DEFAULT_LAUNCH_DURATION,
} from './launchpad-sim.js';

const SKY_DAY = new THREE.Color('#6db4e8');
const SKY_TWILIGHT = new THREE.Color('#1a2859');
const SKY_SPACE = new THREE.Color('#060914');

/** Crisp upright billboarded nameplate beside each rocket. */
function makeRocketTag(name, color) {
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
  sprite.scale.set(2.4, 0.54, 1);
  sprite.position.set(0, 3.6, 0);
  return { sprite, tex, spriteMat };
}

/** Procedural soft billowing cumulus puff texture with sunlit crown and cool shadowed base. */
function makeCloudPuffTexture() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const lobes = [
      { x: 0.50, y: 0.48, r: 0.34, top: 'rgba(255,255,255,0.92)', mid: 'rgba(228,238,249,0.58)' },
      { x: 0.32, y: 0.55, r: 0.25, top: 'rgba(250,253,255,0.85)', mid: 'rgba(212,226,242,0.52)' },
      { x: 0.68, y: 0.56, r: 0.26, top: 'rgba(248,252,255,0.85)', mid: 'rgba(208,223,240,0.50)' },
      { x: 0.44, y: 0.36, r: 0.23, top: 'rgba(255,255,255,0.95)', mid: 'rgba(236,244,252,0.55)' },
      { x: 0.60, y: 0.38, r: 0.21, top: 'rgba(255,255,255,0.92)', mid: 'rgba(232,241,250,0.52)' },
      { x: 0.50, y: 0.64, r: 0.27, top: 'rgba(196,213,232,0.68)', mid: 'rgba(156,178,204,0.34)' },
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

/** Shared aerospace hull texture with subtle panel seams and NASA-style roll-pattern band. */
function makeHullRollTexture(accentColor) {
  return canvasTexture(256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#eef2f6';
    ctx.fillRect(0, 0, w, h);
    // Subtle metallic vertical panel seams
    ctx.strokeStyle = 'rgba(110, 124, 142, 0.28)';
    ctx.lineWidth = 2;
    for (let x = 0; x < w; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    // Horizontal stage seam lines
    ctx.strokeStyle = 'rgba(90, 102, 118, 0.35)';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.36);
    ctx.lineTo(w, h * 0.36);
    ctx.moveTo(0, h * 0.72);
    ctx.lineTo(w, h * 0.72);
    ctx.stroke();
    // Player mission-color stripe band
    ctx.fillStyle = accentColor;
    ctx.fillRect(0, h * 0.40, w, h * 0.24);
    // Black-and-white roll-pattern calibration band (Saturn V style)
    const sq = 16;
    for (let x = 0; x < w; x += sq) {
      ctx.fillStyle = (x / sq) % 2 === 0 ? '#1b2029' : '#f8f9fa';
      ctx.fillRect(x, h * 0.76, sq, 12);
    }
  });
}

/** Shared smooth ogive nosecone geometry (LatheGeometry). */
function createOgiveGeo(radius = 0.44, height = 1.12) {
  const pts = [];
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = t * height;
    const r = radius * Math.pow(Math.cos(t * Math.PI * 0.5), 0.78);
    pts.push(new THREE.Vector2(Math.max(0.005, r), y));
  }
  return new THREE.LatheGeometry(pts, 20);
}

/** Shared parabolic rocket engine bell nozzle geometry. */
function createNozzleGeo(throat = 0.11, exit = 0.26, height = 0.42) {
  const pts = [
    new THREE.Vector2(throat * 1.15, height),
    new THREE.Vector2(throat, height * 0.74),
    new THREE.Vector2(throat * 1.55, height * 0.38),
    new THREE.Vector2(exit, 0),
    new THREE.Vector2(exit * 0.86, 0.03),
    new THREE.Vector2(throat * 0.85, height * 0.72),
  ];
  return new THREE.LatheGeometry(pts, 16);
}

/** Shared swept aerospace delta fin geometry. */
function createDeltaFinGeo(scale = 1) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0.56 * scale, -0.14 * scale);
  shape.lineTo(0.52 * scale, 0.26 * scale);
  shape.lineTo(0.06 * scale, 0.92 * scale);
  shape.lineTo(0, 0.92 * scale);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.055, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2 });
  geo.translate(0, 0, -0.0275);
  return geo;
}

/** Builds a detailed aerospace rocket with ogive fairing, roll-pattern fuselage, LOX feedline, swept fins, SRB pods, engine bell, multi-layer flame, parachute & orbit flag. */
function buildRocketModel(r, disposables) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const hullTex = makeHullRollTexture(r.color);
  disposables.push(hullTex);
  const hullMat = new THREE.MeshStandardMaterial({ map: hullTex, roughness: 0.34, metalness: 0.18 });
  const accentMat = mat(r.color, { roughness: 0.35, metalness: 0.28 });
  const whiteMat = mat('#f1f4f8', { roughness: 0.32, metalness: 0.14 });
  const darkMetal = mat('#21262e', { roughness: 0.42, metalness: 0.72 });
  const gunmetal = mat('#3d4552', { roughness: 0.36, metalness: 0.8 });
  const silverMat = mat('#d0d7de', { roughness: 0.28, metalness: 0.82 });
  disposables.push(hullMat);

  // Upper core fuselage (aerospace white with roll-pattern & mission stripe)
  body.add(at(cyl(0.41, 0.44, 1.56, hullMat, 20), 0, 1.84, 0));
  // Interstage decoupling collar & fairing ring
  body.add(at(cyl(0.445, 0.455, 0.22, darkMetal, 20), 0, 1.12, 0));
  body.add(at(torus(0.42, 0.026, silverMat), 0, 2.62, 0, Math.PI / 2, 0, 0));
  // External LOX feedline / avionics raceway down the side
  body.add(at(cyl(0.036, 0.036, 1.48, silverMat, 8), -0.43, 1.84, 0.08));
  body.add(at(box(0.06, 0.08, 0.09, darkMetal), -0.42, 2.38, 0.08));
  body.add(at(box(0.06, 0.08, 0.09, darkMetal), -0.42, 1.38, 0.08));

  // Recessed cockpit viewport with metallic bezel & glossy sky-blue glass
  body.add(at(torus(0.155, 0.032, gunmetal), 0, 2.06, 0.42));
  body.add(at(cyl(0.145, 0.145, 0.06, mat('#38bdf8', { roughness: 0.12, metalness: 0.4, emissive: '#0ea5e9', emissiveIntensity: 0.45 }), 16), 0, 2.06, 0.40, Math.PI / 2, 0, 0));

  // Nosecone fairing (curved aerodynamic ogive, or quirky coffee-mug fairing)
  if (r.flair === 'coffee-nose') {
    body.add(at(cyl(0.36, 0.42, 0.68, whiteMat, 18), 0, 2.94, 0));
    body.add(at(torus(0.36, 0.03, accentMat), 0, 3.28, 0, Math.PI / 2, 0, 0));
    body.add(at(torus(0.16, 0.048, whiteMat), 0.4, 2.94, 0));
  } else {
    const ogiveGeo = createOgiveGeo(0.42, 1.08);
    disposables.push(ogiveGeo);
    const nose = new THREE.Mesh(ogiveGeo, whiteMat);
    nose.position.y = 2.62;
    body.add(nose);
    // Metallic nose tip cap & accent ring
    body.add(at(cyl(0.03, 0.12, 0.16, accentMat, 14), 0, 3.63, 0));
    body.add(at(torus(0.37, 0.022, accentMat), 0, 2.86, 0, Math.PI / 2, 0, 0));
  }
  if (r.flair === 'duct-tape') {
    body.add(at(cyl(0.455, 0.46, 0.20, silverMat, 18), 0, 1.72, 0, 0, 0, 0.05));
  }
  if (r.flair === 'antenna') {
    body.add(at(cyl(0.022, 0.032, 0.68, silverMat, 8), 0, 3.92, 0));
    body.add(at(ball(0.065, mat('#ff6b6b', { emissive: '#ff6b6b', emissiveIntensity: 1.0 })), 0, 4.28, 0));
  }

  // Detachable lower booster stage + swept delta fins + twin strap-on SRB pods + engine bells
  const booster = new THREE.Group();
  booster.add(at(cyl(0.45, 0.49, 1.06, whiteMat, 20), 0, 0.56, 0));
  booster.add(at(cyl(0.48, 0.50, 0.18, darkMetal, 20), 0, 0.12, 0));
  booster.add(at(cyl(0.46, 0.46, 0.14, accentMat, 20), 0, 0.94, 0));

  // Parabolic main engine bell nozzle + glowing combustion throat
  const mainNozzleGeo = createNozzleGeo(0.14, 0.30, 0.42);
  disposables.push(mainNozzleGeo);
  const mainNozzle = new THREE.Mesh(mainNozzleGeo, gunmetal);
  mainNozzle.position.y = -0.34;
  booster.add(mainNozzle);
  booster.add(at(cyl(0.18, 0.12, 0.06, mat('#ff922b', { emissive: '#ff6b00', emissiveIntensity: 1.2 }), 12), 0, -0.22, 0));

  // Twin side-mounted solid rocket booster (SRB) pods with nosecaps & mini nozzles
  const srbNozzleGeo = createNozzleGeo(0.06, 0.13, 0.22);
  disposables.push(srbNozzleGeo);
  for (const side of [-1, 1]) {
    const sx = side * 0.58;
    booster.add(at(cyl(0.14, 0.15, 0.96, whiteMat, 14), sx, 0.54, 0));
    booster.add(at(cone(0.14, 0.32, accentMat, 14), sx, 1.18, 0));
    booster.add(at(box(0.16, 0.07, 0.08, darkMetal), side * 0.48, 0.84, 0));
    booster.add(at(box(0.16, 0.07, 0.08, darkMetal), side * 0.48, 0.24, 0));
    const sn = new THREE.Mesh(srbNozzleGeo, gunmetal);
    sn.position.set(sx, -0.14, 0);
    booster.add(sn);
  }

  // Swept aerodynamic delta fins (4 fins, oversized for 'big-fins' flair)
  const finScale = r.flair === 'big-fins' ? 1.38 : 1.0;
  const finGeo = createDeltaFinGeo(finScale);
  disposables.push(finGeo);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const fin = new THREE.Mesh(finGeo, i % 2 === 0 ? accentMat : darkMetal);
    fin.position.set(Math.cos(a) * 0.45, 0.12, Math.sin(a) * 0.45);
    fin.rotation.y = -a;
    booster.add(fin);
  }

  // Multi-layered volumetric exhaust plume (white-hot Mach core + golden inner + translucent outer cone)
  const flame = new THREE.Group();
  flame.position.set(0, -0.34, 0);
  flame.add(at(cone(0.32, 1.65, mat('#ff6b00', { emissive: '#ff5400', emissiveIntensity: 1.6, transparent: true, opacity: 0.72 }), 12), 0, -0.82, 0, Math.PI, 0, 0));
  flame.add(at(cone(0.20, 1.25, mat('#ffd43b', { emissive: '#ffbe0b', emissiveIntensity: 2.0, transparent: true, opacity: 0.88 }), 10), 0, -0.60, 0, Math.PI, 0, 0));
  flame.add(at(cone(0.11, 0.72, mat('#ffffff', { emissive: '#fff9db', emissiveIntensity: 2.4 }), 8), 0, -0.34, 0, Math.PI, 0, 0));
  for (const side of [-1, 1]) {
    flame.add(at(cone(0.11, 0.85, mat('#ff922b', { emissive: '#ff6b00', emissiveIntensity: 1.8, transparent: true, opacity: 0.8 }), 8), side * 0.58, -0.24, 0, Math.PI, 0, 0));
  }
  flame.visible = false;
  booster.add(flame);
  root.add(booster);

  // Comically tiny parachute (shown on Mid-Air Stall!)
  const chute = new THREE.Group();
  chute.position.set(0, 3.7, 0);
  chute.add(at(ball(0.45, mat('#ff6b6b', { roughness: 0.6 }), 1.25, 0.55, 1.25), 0, 0.55, 0));
  chute.add(at(cyl(0.015, 0.015, 0.6, silverMat, 4), -0.2, 0.25, 0, 0, 0, -0.25));
  chute.add(at(cyl(0.015, 0.015, 0.6, silverMat, 4), 0.2, 0.25, 0, 0, 0, 0.25));
  chute.visible = false;
  body.add(chute);

  // Tiny deployable orbit flag/satellite (shown on winner at orbit!)
  const flag = new THREE.Group();
  flag.position.set(0.55, 2.35, 0);
  flag.add(at(cyl(0.03, 0.03, 0.9, silverMat, 6), 0, 0.45, 0));
  flag.add(at(box(0.65, 0.36, 0.04, mat('#f2b817', { emissive: '#f2b817', emissiveIntensity: 0.6 })), 0.34, 0.72, 0));
  flag.visible = false;
  body.add(flag);

  const tag = makeRocketTag(r.name, r.color);
  tag.sprite.position.set(0, 4.15, 0);
  root.add(tag.sprite);
  disposables.push(tag.tex, tag.spriteMat);

  return { root, body, booster, flame, chute, flag, tag };
}

/** Builds a volumetric-style cumulus cloud cluster from layered soft billboard sprites. */
function buildCloudCluster(cloudTex, x, y, z, scale, opacity, disposables) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  const puffs = [
    { dx: 0, dy: 0.3, dz: 0, sx: 1.25, sy: 0.72, tint: '#ffffff', op: 1.0 },
    { dx: -1.45, dy: -0.1, dz: 0.35, sx: 0.95, sy: 0.58, tint: '#edf4fc', op: 0.92 },
    { dx: 1.5, dy: -0.05, dz: -0.25, sx: 1.02, sy: 0.62, tint: '#f0f6fd', op: 0.92 },
    { dx: -0.55, dy: 0.85, dz: -0.2, sx: 0.82, sy: 0.56, tint: '#ffffff', op: 0.96 },
    { dx: 0.65, dy: 0.78, dz: 0.25, sx: 0.78, sy: 0.52, tint: '#ffffff', op: 0.95 },
    { dx: 0.1, dy: -0.42, dz: 0.4, sx: 1.38, sy: 0.46, tint: '#c8d9ec', op: 0.78 },
  ];
  for (const p of puffs) {
    const sMat = new THREE.SpriteMaterial({
      map: cloudTex,
      color: p.tint,
      transparent: true,
      opacity: opacity * p.op,
      depthWrite: false,
    });
    disposables.push(sMat);
    const sp = new THREE.Sprite(sMat);
    sp.position.set(p.dx * scale, p.dy * scale, p.dz * scale);
    sp.scale.set(5.2 * p.sx * scale, 4.4 * p.sy * scale, 1);
    group.add(sp);
  }
  return group;
}

/** Builds scenic Chesapeake Bay islands (sandy shoals, grassy hills, coastal pines, lighthouse & tracking dome). */
function buildBayIslands(scene, disposables) {
  const shallowMat = mat('#3c8a96', { roughness: 0.4, transparent: true, opacity: 0.45 });
  const sandMat = mat('#d9c598', { roughness: 0.92 });
  const grassMat = mat('#4a7c44', { roughness: 0.88 });
  const hillMat = mat('#3b6937', { roughness: 0.9 });
  const trunkMat = mat('#5c4033', { roughness: 0.9 });
  const pineMat = mat('#2d5a34', { roughness: 0.85 });
  const pineDarkMat = mat('#224729', { roughness: 0.85 });
  const rockMat = mat('#6c757d', { roughness: 0.92 });
  const whiteMat = mat('#f4f6f8', { roughness: 0.35 });
  const redMat = mat('#c92a2a', { roughness: 0.4 });
  const beaconMat = new THREE.MeshStandardMaterial({ color: '#ffe066', emissive: '#ffd43b', emissiveIntensity: 1.5 });
  disposables.push(beaconMat);

  const islands = [
    { x: -34, z: -26, r: 10.5, h: 2.8, trees: 7, lighthouse: true },
    { x: 36, z: -24, r: 9.5, h: 2.4, trees: 6, radar: true },
    { x: -58, z: -56, r: 16.0, h: 4.2, trees: 10 },
    { x: -12, z: -64, r: 13.5, h: 3.4, trees: 8 },
    { x: 26, z: -68, r: 15.0, h: 3.9, trees: 9 },
    { x: 64, z: -52, r: 14.0, h: 3.6, trees: 8 },
    { x: -46, z: 6, r: 8.5, h: 2.0, trees: 5 },
    { x: 48, z: 8, r: 9.0, h: 2.1, trees: 5 },
  ];

  for (let idx = 0; idx < islands.length; idx++) {
    const isl = islands[idx];
    const g = new THREE.Group();
    g.position.set(isl.x, -0.58, isl.z);

    // Subtle turquoise shallow-water halo
    g.add(at(cyl(isl.r * 1.24, isl.r * 1.32, 0.06, shallowMat, 18), 0, 0.04, 0));
    // Sandy beach base
    g.add(at(cyl(isl.r * 0.88, isl.r * 1.08, 0.55, sandMat, 18), 0, 0.25, 0));
    // Layered grassy hills
    g.add(at(ball(isl.r * 0.72, grassMat, 1.05, isl.h / (isl.r * 0.72), 0.92), -isl.r * 0.08, 0.35, isl.r * 0.05));
    g.add(at(ball(isl.r * 0.48, hillMat, 1.1, (isl.h * 0.85) / (isl.r * 0.48), 0.95), isl.r * 0.24, 0.32, -isl.r * 0.12));

    // Coastal loblolly pines & boulders
    for (let t = 0; t < isl.trees; t++) {
      const a = (t / isl.trees) * Math.PI * 2 + idx * 0.7;
      const dist = isl.r * (0.22 + ((t * 37) % 10) * 0.045);
      const tx = Math.cos(a) * dist;
      const tz = Math.sin(a) * dist;
      const groundY = 0.55 + Math.max(0, 1 - dist / (isl.r * 0.8)) * (isl.h * 0.62);
      const s = 0.75 + ((t + idx) % 3) * 0.25;
      g.add(at(cyl(0.12 * s, 0.18 * s, 1.0 * s, trunkMat, 6), tx, groundY + 0.5 * s, tz));
      g.add(at(cone(0.72 * s, 1.5 * s, t % 2 === 0 ? pineMat : pineDarkMat, 7), tx, groundY + 1.45 * s, tz));
      g.add(at(cone(0.52 * s, 1.2 * s, pineMat, 7), tx, groundY + 2.15 * s, tz));
    }
    g.add(at(ball(0.75, rockMat, 1.3, 0.65, 1.0), isl.r * 0.58, 0.5, isl.r * 0.32));

    // Iconic Chesapeake Bay lighthouse on the left-horizon island
    if (isl.lighthouse) {
      const ly = 0.55 + isl.h * 0.72;
      g.add(at(cyl(0.68, 0.96, 4.2, whiteMat, 12), 0, ly + 2.1, 0));
      g.add(at(cyl(0.74, 0.74, 0.45, redMat, 12), 0, ly + 4.35, 0));
      g.add(at(cyl(0.55, 0.55, 0.7, beaconMat, 10), 0, ly + 4.85, 0));
      g.add(at(cone(0.82, 0.85, redMat, 12), 0, ly + 5.6, 0));
    }

    // Coastal spaceport tracking radar dome on the right-horizon island
    if (isl.radar) {
      const ry = 0.55 + isl.h * 0.7;
      g.add(at(cyl(1.15, 1.35, 1.2, mat('#495057', { roughness: 0.7 }), 12), 0, ry + 0.6, 0));
      g.add(at(ball(1.35, whiteMat), 0, ry + 1.9, 0));
    }

    scene.add(g);
  }
}

/** Builds the coastal Chesapeake Bay launch complex, volumetric cloud deck, stars, and MISSION: STANDUP LED sign. */
function buildLaunchComplex(scene, pads, cloudAltitude, orbitAltitude, disposables) {
  scene.background = SKY_DAY.clone();
  scene.fog = new THREE.Fog(SKY_DAY.clone(), 65, 240);

  scene.add(new THREE.HemisphereLight('#d6eeff', '#2b4a5e', 1.15));
  const sun = new THREE.DirectionalLight('#fff2d6', 1.85);
  sun.position.set(22, 45, 28);
  scene.add(sun);

  // Chesapeake Bay ocean water
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(520, 520),
    mat('#265e73', { roughness: 0.38, metalness: 0.18 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = -0.6;
  scene.add(water);

  // Scenic Chesapeake Bay islands around the launch complex
  buildBayIslands(scene, disposables);

  // Concrete coastal launch deck
  scene.add(at(box(32, 0.8, 16, mat('#495057', { roughness: 0.88 })), 0, -0.4, 2.5));
  scene.add(at(box(32.4, 0.22, 16.4, mat('#f2b817', { roughness: 0.6 })), 0, 0.02, 2.5));

  // Individual glowing launchpads + gantry towers with umbilical swing-arms
  const beacons = [];
  const padMat = mat('#212529', { roughness: 0.7, metalness: 0.35 });
  const ringMat = mat('#ff922b', { emissive: '#ff922b', emissiveIntensity: 0.7 });
  const gantryMat = mat('#868e96', { roughness: 0.45, metalness: 0.65 });
  for (const p of pads) {
    scene.add(at(cyl(0.95, 1.1, 0.24, padMat, 16), p.x, 0.12, p.z));
    scene.add(at(torus(0.88, 0.07, ringMat), p.x, 0.24, p.z, Math.PI / 2, 0, 0));
    scene.add(at(box(0.14, 3.0, 0.14, gantryMat), p.x - 0.96, 1.5, p.z - 0.45));
    // Umbilical swing-arm reaching toward the upper stage
    scene.add(at(box(0.62, 0.07, 0.08, gantryMat), p.x - 0.65, 2.35, p.z - 0.22, 0, -0.38, 0));
    const bMat = new THREE.MeshStandardMaterial({ color: '#ff4d6d', emissive: '#ff4d6d', emissiveIntensity: 1.0 });
    disposables.push(bMat);
    const b = at(ball(0.11, bMat), p.x - 0.96, 3.1, p.z - 0.45);
    scene.add(b);
    beacons.push(bMat);
  }

  // Overhead Mission Control LED sign: "MISSION: STANDUP"
  const signTex = canvasTexture(512, 96, (ctx, w, h) => {
    ctx.fillStyle = '#141724';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#f2b817';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = '#f2b817';
    ctx.font = `900 40px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MISSION: STANDUP', w / 2, h / 2 + 2);
  });
  disposables.push(signTex);
  const signMat = new THREE.MeshStandardMaterial({ map: signTex, emissiveMap: signTex, emissive: '#ffffff', emissiveIntensity: 0.5 });
  disposables.push(signMat);
  scene.add(at(box(0.35, 8.4, 0.35, mat('#343a40')), -7, 4.2, -5.2));
  scene.add(at(box(0.35, 8.4, 0.35, mat('#343a40')), 7, 4.2, -5.2));
  scene.add(at(plane(14.5, 2.7, signMat), 0, 8.0, -5.0));

  // Volumetric-style cumulus clouds:
  // 1) Fair-weather horizon & mid-sky cumulus visible from the launchpad
  // 2) Dense billowing cloud deck at cloudAltitude that rockets punch through
  const cloudTex = makeCloudPuffTexture();
  disposables.push(cloudTex);
  const clouds = [];
  for (let i = 0; i < 10; i++) {
    const a = -2.6 + (i / 9) * 2.1;
    const rad = 34 + (i % 3) * 14;
    const c = buildCloudCluster(
      cloudTex,
      Math.cos(a) * rad,
      14 + (i % 4) * 6.5,
      Math.sin(a) * rad - 18,
      1.35 + (i % 3) * 0.45,
      0.86,
      disposables,
    );
    scene.add(c);
    clouds.push({ group: c, baseX: c.position.x, speed: 0.35 + (i % 3) * 0.14 });
  }
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    const rad = 7 + (i % 4) * 8.5;
    const c = buildCloudCluster(
      cloudTex,
      Math.cos(a) * rad,
      cloudAltitude + ((i % 3) - 1) * 2.4,
      Math.sin(a) * rad,
      1.55 + (i % 3) * 0.5,
      0.92,
      disposables,
    );
    scene.add(c);
    clouds.push({ group: c, baseX: c.position.x, speed: 0.25 + (i % 4) * 0.1 });
  }

  // Starfield above cloudAltitude for Prod Orbit!
  const starGeo = new THREE.BufferGeometry();
  const starPos = [];
  for (let i = 0; i < 260; i++) {
    const ang = i * 2.39996;
    const rad = 22 + (i % 15) * 3.5;
    starPos.push(Math.cos(ang) * rad, cloudAltitude + 4 + (i % 25) * 2.4, Math.sin(ang) * rad - 10);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: '#ffffff', size: 0.45 });
  disposables.push(starGeo, starMat);
  scene.add(new THREE.Points(starGeo, starMat));

  // Orbit ring marker at orbitAltitude
  scene.add(at(torus(16, 0.14, mat('#38bdf8', { emissive: '#38bdf8', emissiveIntensity: 1.0 })), 0, orbitAltitude, 0, Math.PI / 2, 0, 0));

  return { beacons, clouds };
}

// ------------------------------------------------------------------ Lobby 3D Stage

export class LaunchpadStage {
  constructor(aspect = 16 / 9, initialNames = []) {
    this.t = 0;
    this.names = [];
    this.models = [];
    this.disposables = [];

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(48, aspect, 0.3, 400);
    this.complex = buildLaunchComplex(this.scene, padFormation(Math.max(4, initialNames.length)), 52, 62, this.disposables);
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
    for (const m of this.models) this.scene.remove(m.visual.root);
    this.models = [];
    this.names = [...names];

    const colors = ['#ff6b6b', '#4dabf7', '#51cf66', '#ffd43b', '#cc5de8', '#ff922b', '#20c997', '#f06595'];
    const flairs = ['duct-tape', 'big-fins', 'coffee-nose', 'antenna'];
    const pads = padFormation(Math.max(1, names.length));
    names.forEach((name, i) => {
      const r = { name, color: colors[i % colors.length], flair: flairs[i % flairs.length] };
      const visual = buildRocketModel(r, this.disposables);
      visual.root.position.set(pads[i].x, 0.22, pads[i].z);
      this.scene.add(visual.root);
      this.models.push({ visual, pad: pads[i], phase: i * 1.1 });
    });
  }

  update(dt, reduced = false) {
    if (!reduced) this.t += dt;
    const t = this.t;
    for (let i = 0; i < this.complex.beacons.length; i++) {
      this.complex.beacons[i].emissiveIntensity = Math.sin(t * 5 + i) > 0 ? 1.5 : 0.2;
    }
    for (const m of this.models) {
      const rumble = reduced ? 0 : Math.sin(t * 18 + m.phase) * 0.025;
      m.visual.root.position.set(m.pad.x + rumble, 0.22, m.pad.z);
    }
    if (!reduced) {
      for (const c of this.complex.clouds) {
        c.group.position.x = c.baseX + Math.sin(t * 0.06 * c.speed) * 4.5;
      }
    }
    const sweep = reduced ? 0 : Math.sin(t * 0.3) * 6.5;
    this.camera.position.set(sweep, 5.2, 18.5);
    this.camera.lookAt(0, 2.8, 0);
  }

  dispose() {
    for (const d of this.disposables) d.dispose?.();
  }
}

// ------------------------------------------------------------------ Live Match

export class LaunchpadMatch {
  constructor(names, { duration = DEFAULT_LAUNCH_DURATION, rng = Math.random, sfx = null, onCountdown = null, onEvent = null, onWinner = null } = {}) {
    this.plan = planLaunchMatch(names, { duration, rng });
    this.sfx = sfx;
    this.onCountdown = onCountdown;
    this.onEvent = onEvent;
    this.onWinner = onWinner;

    this.t = 0;
    this.countShown = null;
    this.stageSepAnnounced = false;
    this.failedSet = new Set();
    this.winnerReported = false;
    this.exhaustTimer = 0;
    this.disposables = [];

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.3, 450);
    const pads = this.plan.rockets.map((r) => ({ x: r.padX, z: r.padZ }));
    this.complex = buildLaunchComplex(this.scene, pads, this.plan.cloudAltitude, this.plan.orbitAltitude, this.disposables);
    this.particles = new Particles(this.scene);

    this.rocketVisuals = this.plan.rockets.map((r) => {
      const visual = buildRocketModel(r, this.disposables);
      visual.root.position.set(r.padX, 0.22, r.padZ);
      this.scene.add(visual.root);
      return { sim: r, visual };
    });

    this.camPos = new THREE.Vector3(0, 5.5, 20);
    this.camLook = new THREE.Vector3(0, 2.5, 0);
    this.resize(window.innerWidth / window.innerHeight);
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 1 ? 64 : 50;
    this.camera.updateProjectionMatrix();
  }

  update(dt) {
    this.t += dt;
    const t = this.t;
    const p = this.plan;

    // NASA-style 3... 2... 1... DEPLOY! countdown
    const step = t < 0.7 ? '3' : t < 1.4 ? '2' : t < 2.1 ? '1' : t < p.countdownEnd + 0.6 ? 'DEPLOY!' : null;
    if (step && step !== this.countShown) {
      this.countShown = step;
      this.onCountdown?.(step);
      this.sfx?.play(step === 'DEPLOY!' ? 'launchRoar' : 'launchBeep', 0);
    }

    // Two-Stage Ascent mid-air Stage Separation callout
    if (p.stageSepAt && !this.stageSepAnnounced && t >= p.stageSepAt) {
      this.stageSepAnnounced = true;
      this.sfx?.play('boost', 0.1);
      this.onEvent?.({ type: 'note', text: '🔥 Stage Separation! Staging → Prod burn engaged!', important: true });
    }

    this.exhaustTimer += dt;
    const emitExhaust = this.exhaustTimer >= 0.09;
    if (emitExhaust) this.exhaustTimer = 0;

    const alivePositions = [];
    for (const { sim: r, visual } of this.rocketVisuals) {
      const st = sampleRocketState(r, t, p);
      visual.root.visible = !st.popped;
      visual.root.position.set(st.x, st.y + 0.22, st.z);
      visual.body.rotation.set(st.rx, 0, st.rz);
      visual.booster.position.y = st.boosterOffsetY;
      visual.flame.visible = t >= p.countdownEnd - 0.25 && st.alive;
      if (visual.flame.visible) {
        visual.flame.scale.y = 0.8 + Math.sin(t * 40 + r.id) * 0.35;
      }
      visual.chute.visible = st.parachute;
      visual.flag.visible = r.isWinner && t >= p.duration;

      if (st.alive) alivePositions.push(st);

      // Pooled exhaust smoke puffs
      if (emitExhaust && t >= p.countdownEnd - 0.4 && !st.popped && (st.alive || r.failureType === 'padFizzle')) {
        this.particles.burst(new THREE.Vector3(st.x, st.y, st.z), {
          count: st.alive ? 2 : 1,
          colors: st.alive ? ['#ffffff', '#ffd43b', '#ff922b'] : ['#495057', '#212529'],
          speed: 1.4,
          up: -1.5,
          life: 0.55,
          size: 0.3,
          gravity: 0,
        });
      }

      // Trigger comedic failure popup + audio + confetti/spark burst once at failureTime
      if (r.failureTime && t >= r.failureTime && !this.failedSet.has(r.id)) {
        this.failedSet.add(r.id);
        const burstColors = r.failureType === 'cloudHeartbreak'
          ? ['#ff6b6b', '#ffd43b', '#51cf66', '#4dabf7', '#cc5de8', '#ffffff']
          : ['#ff922b', '#ffd43b', '#868e96', '#ff4d6d'];
        this.particles.burst(new THREE.Vector3(st.x, st.y + 1.5, st.z), {
          count: r.failureType === 'cloudHeartbreak' ? 36 : 18,
          colors: burstColors,
          speed: 5.5,
          up: 2.5,
          life: 1.2,
          size: 0.28,
          gravity: 5,
        });
        const snd = r.failureType === 'corkscrew' || r.failureType === 'midAirStall' ? 'launchWhistle' : 'launchPop';
        this.sfx?.play(snd, 0.08);
        this.onEvent?.({ type: 'fail', rocket: r, popup: r.popup });
      }
    }

    // Winner reaches Prod Orbit!
    if (!this.winnerReported && t >= p.duration) {
      this.winnerReported = true;
      const wst = sampleRocketState(p.winner, p.duration, p);
      this.sfx?.play('launchOrbit', 0.1);
      this.particles.burst(new THREE.Vector3(wst.x, wst.y + 2, wst.z), {
        count: 50,
        colors: ['#f2b817', '#38bdf8', '#51cf66', '#ffffff'],
        speed: 7,
        up: 4,
        life: 2.5,
        size: 0.34,
        gravity: 1,
      });
      this.onWinner?.(p.winner, p);
    }

    this.particles.update(dt);
    for (const c of this.complex.clouds) {
      c.group.position.x = c.baseX + t * c.speed;
    }

    // Dynamic skybox color shift: coastal daylight -> twilight -> starry orbit
    const leaderY = alivePositions.length ? Math.max(...alivePositions.map((a) => a.y)) : p.orbitAltitude;
    const altFrac = Math.max(0, Math.min(1, leaderY / p.orbitAltitude));
    const skyColor = new THREE.Color();
    if (altFrac < 0.55) skyColor.lerpColors(SKY_DAY, SKY_TWILIGHT, altFrac / 0.55);
    else skyColor.lerpColors(SKY_TWILIGHT, SKY_SPACE, (altFrac - 0.55) / 0.45);
    this.scene.background.copy(skyColor);
    this.scene.fog.color.copy(skyColor);

    // Dynamic camera choreography: Pre-launch sweep -> Climb crane -> Orbit follow-cam
    const wantPos = new THREE.Vector3();
    const wantLook = new THREE.Vector3();
    if (t < p.countdownEnd) {
      const shake = t > p.countdownEnd - 0.9 ? Math.sin(t * 55) * 0.2 : 0;
      wantPos.set(Math.sin(t * 0.6) * 8 + shake, 4.8 + shake, 19.5);
      wantLook.set(0, 2.4, 0);
    } else if (alivePositions.length <= 2 || altFrac > 0.78) {
      const w = sampleRocketState(p.winner, Math.min(t, p.duration), p);
      wantPos.set(w.x + 6.5, w.y + 3.2, w.z + 11.5);
      wantLook.set(w.x, w.y + 1.8, w.z);
    } else {
      const avgX = alivePositions.reduce((s, a) => s + a.x, 0) / alivePositions.length;
      const avgY = alivePositions.reduce((s, a) => s + a.y, 0) / alivePositions.length;
      wantPos.set(avgX * 0.6, avgY + 4.5, 22 + Math.min(8, alivePositions.length * 0.35));
      wantLook.set(avgX * 0.8, avgY + 2.2, 0);
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
