// "Standup Mini-Golf" (3D Simultaneous Putt-Putt): floating Chesapeake Bay resort putt-putt
// course with mowed astroturf, weathered wood-grain timber rails, raked sand bunkers, Dutch
// clapboard Sprint Review Windmills with lattice sails, steel BadalJwala Firewall laser portals,
// fluted chrome Scope Creep mushroom bumpers, dimpled rolling golf balls, scenic Chesapeake Bay
// archipelago with lighthouse & sailboat, drifting volumetric cumulus clouds, and Cup Cam.

import * as THREE from 'three';
import { mat, box, ball, cyl, cone, torus, plane, at, canvasTexture, FONT_UI, FONT_MONO, roundRect } from './util3d.js';
import { Particles } from './effects.js';
import { buildSailboat } from './scenery.js';
import {
  GolfSim,
  buildGolfCourse,
  courseHeightAt,
  isFirewallClosed,
  DEFAULT_GOLF_DURATION,
  BALL_RADIUS,
  CUP_RADIUS,
} from './golf-sim.js';

const STEP = 1 / 60;

/** Procedural soft billowing cumulus puff texture with sunlit crown and cool shadowed underside. */
function makeCloudPuffTexture() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const lobes = [
      { x: 0.50, y: 0.48, r: 0.34, top: 'rgba(255,255,255,0.94)', mid: 'rgba(228,238,249,0.58)' },
      { x: 0.32, y: 0.55, r: 0.25, top: 'rgba(250,253,255,0.86)', mid: 'rgba(212,226,242,0.52)' },
      { x: 0.68, y: 0.56, r: 0.26, top: 'rgba(248,252,255,0.86)', mid: 'rgba(208,223,240,0.50)' },
      { x: 0.44, y: 0.36, r: 0.23, top: 'rgba(255,255,255,0.96)', mid: 'rgba(236,244,252,0.56)' },
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

function buildCloudCluster(cloudTex, x, y, z, scale, disposables) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  for (const p of [
    { dx: 0, dy: 0.3, dz: 0, sx: 1.25, sy: 0.72, tint: '#ffffff', op: 0.92 },
    { dx: -1.5, dy: -0.1, dz: 0.35, sx: 0.96, sy: 0.58, tint: '#edf4fc', op: 0.86 },
    { dx: 1.5, dy: -0.05, dz: -0.25, sx: 1.02, sy: 0.62, tint: '#f0f6fd', op: 0.86 },
    { dx: -0.5, dy: 0.82, dz: -0.2, sx: 0.82, sy: 0.56, tint: '#ffffff', op: 0.9 },
    { dx: 0.6, dy: 0.76, dz: 0.2, sx: 0.78, sy: 0.52, tint: '#ffffff', op: 0.88 },
    { dx: 0.1, dy: -0.42, dz: 0.4, sx: 1.35, sy: 0.46, tint: '#c8d9ec', op: 0.72 },
  ]) {
    const sMat = new THREE.SpriteMaterial({ map: cloudTex, color: p.tint, transparent: true, opacity: p.op, depthWrite: false });
    disposables.push(sMat);
    const sp = new THREE.Sprite(sMat);
    sp.position.set(p.dx * scale, p.dy * scale, p.dz * scale);
    sp.scale.set(5.4 * p.sx * scale, 4.4 * p.sy * scale, 1);
    group.add(sp);
  }
  return group;
}

/** Procedural dimpled golf ball texture with glossy white shell and team-colored alignment stripe. */
function makeGolfBallTexture(accentColor) {
  return canvasTexture(256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, w, h);
    // Bold team-colored alignment band around the equator
    ctx.fillStyle = accentColor;
    ctx.fillRect(0, h * 0.38, w, h * 0.24);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(0, h * 0.48, w, h * 0.04);
    // Crisp hexagonal golf-ball dimple grid
    for (let row = 0; row < 10; row++) {
      const y = (row + 0.5) * (h / 10);
      const offset = (row % 2) * 8;
      for (let x = offset; x < w; x += 16) {
        ctx.fillStyle = 'rgba(40, 50, 68, 0.16)';
        ctx.beginPath();
        ctx.arc(x, y, 4.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.beginPath();
        ctx.arc(x - 1, y - 1, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
}

/** Procedural mowed resort putting-green astroturf texture with subtle blade speckle. */
function makeTurfTexture(repeatY) {
  const tex = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#2a8f45';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#33a552';
    for (let y = 0; y < h; y += 32) ctx.fillRect(0, y, w, 16);
    // Fine turf grain speckle
    for (let i = 0; i < 650; i++) {
      const x = (i * 73) % w;
      const y = (i * 137) % h;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(12,50,20,0.08)';
      ctx.fillRect(x, y, 2, 2);
    }
  }, { repeat: true });
  tex.repeat.set(3, repeatY);
  return tex;
}

/** Procedural weathered marina timber plank grain texture. */
function makeTimberTexture() {
  return canvasTexture(256, 64, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#8d623d');
    g.addColorStop(0.5, '#7a5230');
    g.addColorStop(1, '#613f22');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(42, 24, 10, 0.28)';
    ctx.lineWidth = 2;
    for (let y = 6; y < h; y += 8) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(w * 0.35, y + Math.sin(y) * 2, w * 0.7, y - Math.cos(y) * 2, w, y);
      ctx.stroke();
    }
  }, { repeat: true });
}

/** Procedural raked bunker sand texture for Procurement Sand Traps. */
function makeSandTexture() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#e7cf9e';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(176, 142, 86, 0.42)';
    ctx.lineWidth = 5;
    for (let r = 18; r < w; r += 16) {
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,250,235,0.28)' : 'rgba(155,122,70,0.2)';
      ctx.fillRect((i * 59) % w, (i * 97) % h, 2, 2);
    }
  });
}

/** Procedural shimmering Chesapeake Bay water texture. */
function makeBayWaterTexture() {
  const tex = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#1f5a70';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(140, 210, 232, 0.14)';
    ctx.lineWidth = 3;
    for (let y = 12; y < h; y += 22) {
      ctx.beginPath();
      for (let x = 0; x <= w; x += 16) {
        const wy = y + Math.sin((x / w) * Math.PI * 4 + y) * 3;
        if (x === 0) ctx.moveTo(x, wy);
        else ctx.lineTo(x, wy);
      }
      ctx.stroke();
    }
  }, { repeat: true });
  tex.repeat.set(18, 18);
  return tex;
}

/** Crisp upright billboarded nameplate above each golf ball. */
function makeGolfTag(name, color) {
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
  sprite.scale.set(2.3, 0.52, 1);
  sprite.position.set(0, 1.05, 0);
  return { sprite, tex, spriteMat };
}

/** Builds a detailed coastal Dutch clapboard Sprint Review Windmill with wooden lattice canvas sails. */
function buildWindmillObstacle(wm, wy, disposables) {
  const group = new THREE.Group();
  group.position.set(wm.x, wy, wm.z);

  const stoneMat = mat('#8d99ae', { roughness: 0.88 });
  const clapboardMat = mat('#f4f1ea', { roughness: 0.65 });
  const shingleMat = mat('#8b2635', { roughness: 0.72 });
  const woodFrame = mat('#5c3a21', { roughness: 0.78 });
  const sailCloth = mat('#fff8e6', { roughness: 0.6, side: THREE.DoubleSide });
  const brassMat = mat('#d9a441', { roughness: 0.3, metalness: 0.8 });
  const windowGlow = mat('#ffe066', { emissive: '#ffbe0b', emissiveIntensity: 0.9 });

  // Stone masonry base piers flanking the center ball tunnel
  const sideX = wm.radius + 0.55;
  for (const sx of [-sideX, sideX]) {
    group.add(at(cyl(0.82, 0.98, 2.2, stoneMat, 8), sx, 1.1, 0));
    group.add(at(cyl(0.7, 0.82, 1.8, clapboardMat, 8), sx, 3.0, 0));
    // Warm cottage window
    group.add(at(box(0.42, 0.55, 0.08, windowGlow), sx, 2.9, 0.72));
    group.add(at(box(0.48, 0.06, 0.1, woodFrame), sx, 2.9, 0.74));
  }

  // Timber arch lintel & upper octagonal mill cupola with shingled dome roof
  group.add(at(box(sideX * 2 + 1.4, 0.55, 1.45, woodFrame), 0, 3.75, 0));
  group.add(at(cyl(1.35, 1.85, 2.2, clapboardMat, 8), 0, 5.0, 0));
  // Shingled conical cupola roof + weathervane spire
  group.add(at(cone(2.1, 1.9, shingleMat, 8), 0, 6.95, 0));
  group.add(at(cyl(0.05, 0.05, 0.9, brassMat, 6), 0, 8.2, 0));
  group.add(at(ball(0.14, brassMat), 0, 8.65, 0));

  // Brass axle hub & 4 realistic wooden lattice-framed canvas windmill sails!
  const rotor = new THREE.Group();
  rotor.position.set(0, 3.6, 0.95);
  rotor.add(at(cyl(0.32, 0.36, 0.65, brassMat, 12), 0, 0, -0.1, Math.PI / 2, 0, 0));
  rotor.add(at(ball(0.32, brassMat), 0, 0, 0.22));
  for (let i = 0; i < 4; i++) {
    const sail = new THREE.Group();
    sail.rotation.z = (i * Math.PI) / 2;
    const len = wm.radius * 1.12;
    // Main timber spar
    sail.add(at(box(0.14, len, 0.12, woodFrame), 0, len * 0.5, 0));
    // Lattice crossbars & cream canvas sail sheet offset to one side of the spar
    sail.add(at(plane(0.68, len * 0.72, sailCloth), 0.36, len * 0.58, 0.02));
    for (let r = 0; r < 5; r++) {
      sail.add(at(box(0.76, 0.05, 0.06, woodFrame), 0.34, len * (0.26 + r * 0.16), 0.05));
    }
    sail.add(at(box(0.05, len * 0.72, 0.06, woodFrame), 0.70, len * 0.58, 0.05));
    rotor.add(sail);
  }
  group.add(rotor);
  return { group, rotor };
}

/** Builds an industrial brushed-steel BadalJwala Firewall Gate with animated plasma laser beams. */
function buildFirewallObstacle(fw, fy, halfWidth, disposables) {
  const group = new THREE.Group();
  group.position.set(0, fy, fw.z);

  const steelMat = mat('#343a40', { roughness: 0.38, metalness: 0.78 });
  const hazardMat = mat('#f2b817', { roughness: 0.5 });
  const beaconMat = mat('#ff4d00', { emissive: '#ff4d00', emissiveIntensity: 1.6 });
  const span = halfWidth * 1.92;

  for (const sx of [-span / 2, span / 2]) {
    group.add(at(box(0.75, 0.35, 0.85, hazardMat), sx, 0.18, 0));
    group.add(at(box(0.55, 2.35, 0.65, steelMat), sx, 1.35, 0));
    group.add(at(ball(0.18, beaconMat), sx, 2.68, 0));
  }
  // Overhead gantry crossbar with "FIREWALL" LED plate
  group.add(at(box(span + 0.7, 0.36, 0.45, steelMat), 0, 2.48, 0));
  const fwTex = canvasTexture(256, 48, (ctx, w, h) => {
    ctx.fillStyle = '#1d1210';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#ff6b00';
    ctx.lineWidth = 4;
    ctx.strokeRect(3, 3, w - 6, h - 6);
    ctx.fillStyle = '#ff922b';
    ctx.font = `900 24px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BADALJWALA FIREWALL', w / 2, h / 2 + 1);
  });
  disposables.push(fwTex);
  const fwSignMat = new THREE.MeshBasicMaterial({ map: fwTex });
  disposables.push(fwSignMat);
  group.add(at(plane(4.6, 0.78, fwSignMat), 0, 2.52, 0.25));

  // Translucent plasma barrier + 3 bright horizontal laser emitters
  const barrier = new THREE.Group();
  const fieldMat = new THREE.MeshStandardMaterial({
    color: '#ff6b00',
    emissive: '#ff4d00',
    emissiveIntensity: 1.4,
    transparent: true,
    opacity: 0.42,
  });
  const laserMat = new THREE.MeshStandardMaterial({
    color: '#ffe066',
    emissive: '#ff922b',
    emissiveIntensity: 2.2,
  });
  disposables.push(fieldMat, laserMat);
  barrier.add(at(box(span - 0.5, 1.5, 0.1, fieldMat), 0, 0.85, 0));
  for (const ly of [0.35, 0.85, 1.35]) {
    barrier.add(at(cyl(0.055, 0.055, span - 0.5, laserMat, 8), 0, ly, 0, 0, 0, Math.PI / 2));
  }
  group.add(barrier);
  return { group, bar: barrier };
}

/** Builds a realistic fluted chrome arcade mushroom pop-bumper (LatheGeometry). */
function buildMushroomBumper(bmp, by, disposables) {
  const group = new THREE.Group();
  group.position.set(bmp.x, by, bmp.z);

  const chromeMat = mat('#ced4da', { roughness: 0.22, metalness: 0.88 });
  const skirtPts = [
    new THREE.Vector2(bmp.r * 1.06, 0),
    new THREE.Vector2(bmp.r * 0.82, 0.28),
    new THREE.Vector2(bmp.r * 0.62, 0.52),
    new THREE.Vector2(bmp.r * 0.75, 0.66),
  ];
  const skirtGeo = new THREE.LatheGeometry(skirtPts, 20);
  disposables.push(skirtGeo);
  group.add(new THREE.Mesh(skirtGeo, chromeMat));

  // Flared glossy neon-crimson mushroom cap
  const capPts = [
    new THREE.Vector2(bmp.r * 0.72, 0.62),
    new THREE.Vector2(bmp.r * 1.12, 0.76),
    new THREE.Vector2(bmp.r * 0.96, 1.02),
    new THREE.Vector2(bmp.r * 0.35, 1.12),
    new THREE.Vector2(0.01, 1.14),
  ];
  const capGeo = new THREE.LatheGeometry(capPts, 20);
  disposables.push(capGeo);
  const capMat = mat('#e03131', { roughness: 0.25, metalness: 0.2, emissive: '#c92a2a', emissiveIntensity: 0.5 });
  group.add(new THREE.Mesh(capGeo, capMat));
  // Glowing gold accent ring around the bumper rim
  group.add(at(torus(bmp.r * 0.98, 0.07, mat('#ffe066', { emissive: '#f59f00', emissiveIntensity: 1.1 })), 0, 0.76, 0, Math.PI / 2, 0, 0));
  return group;
}

/** Builds scenic Chesapeake Bay archipelago (8 islands, pines, boulders, striped lighthouse & anchored sailboat). */
function buildGolfArchipelago(scene, L, W, disposables) {
  const shallowMat = mat('#3c8a96', { roughness: 0.4, transparent: true, opacity: 0.42 });
  const sandMat = mat('#dcc79a', { roughness: 0.92 });
  const grassMat = mat('#487a42', { roughness: 0.88 });
  const hillMat = mat('#386634', { roughness: 0.9 });
  const trunkMat = mat('#5c4033', { roughness: 0.9 });
  const pineMat = mat('#2a5631', { roughness: 0.85 });
  const pineDark = mat('#1f4426', { roughness: 0.85 });
  const rockMat = mat('#6c757d', { roughness: 0.92 });
  const whiteMat = mat('#f8f9fa', { roughness: 0.35 });
  const redMat = mat('#c92a2a', { roughness: 0.4 });
  const beaconMat = mat('#ffe066', { emissive: '#ffd43b', emissiveIntensity: 1.8 });

  const islands = [
    { x: -W - 22, z: -L * 0.22, r: 12, h: 3.4, trees: 7 },
    { x: W + 24, z: -L * 0.30, r: 13, h: 3.8, trees: 8, boat: true },
    { x: -W - 24, z: -L * 0.78, r: 13.5, h: 3.6, trees: 7, lighthouse: true },
    { x: W + 26, z: -L * 0.82, r: 14.5, h: 4.1, trees: 8 },
    { x: -32, z: -L - 36, r: 19, h: 5.2, trees: 10 },
    { x: 6, z: -L - 44, r: 17, h: 4.6, trees: 9 },
    { x: 42, z: -L - 34, r: 18, h: 4.9, trees: 9 },
    { x: -W - 36, z: -L * 0.52, r: 15, h: 4.2, trees: 8 },
  ];

  const boats = [];
  for (let idx = 0; idx < islands.length; idx++) {
    const isl = islands[idx];
    const g = new THREE.Group();
    g.position.set(isl.x, -1.58, isl.z);

    g.add(at(cyl(isl.r * 1.24, isl.r * 1.32, 0.06, shallowMat, 18), 0, 0.05, 0));
    g.add(at(cyl(isl.r * 0.88, isl.r * 1.08, 0.65, sandMat, 18), 0, 0.3, 0));
    g.add(at(ball(isl.r * 0.72, grassMat, 1.05, isl.h / (isl.r * 0.72), 0.92), -isl.r * 0.08, 0.38, isl.r * 0.05));
    g.add(at(ball(isl.r * 0.46, hillMat, 1.1, (isl.h * 0.85) / (isl.r * 0.46), 0.95), isl.r * 0.22, 0.35, -isl.r * 0.1));

    for (let t = 0; t < isl.trees; t++) {
      const a = (t / isl.trees) * Math.PI * 2 + idx * 0.65;
      const dist = isl.r * (0.24 + ((t * 37) % 10) * 0.042);
      const tx = Math.cos(a) * dist;
      const tz = Math.sin(a) * dist;
      const gy = 0.6 + Math.max(0, 1 - dist / (isl.r * 0.82)) * (isl.h * 0.62);
      const s = 0.8 + ((t + idx) % 3) * 0.25;
      g.add(at(cyl(0.12 * s, 0.18 * s, 1.0 * s, trunkMat, 6), tx, gy + 0.5 * s, tz));
      g.add(at(cone(0.75 * s, 1.55 * s, t % 2 === 0 ? pineMat : pineDark, 7), tx, gy + 1.48 * s, tz));
      g.add(at(cone(0.54 * s, 1.2 * s, pineMat, 7), tx, gy + 2.18 * s, tz));
    }
    g.add(at(ball(0.85, rockMat, 1.35, 0.65, 1.0), isl.r * 0.56, 0.55, isl.r * 0.3));

    if (isl.lighthouse) {
      const ly = 0.6 + isl.h * 0.75;
      g.add(at(cyl(0.76, 1.1, 5.4, whiteMat, 14), 0, ly + 2.7, 0));
      g.add(at(cyl(0.95, 1.02, 1.1, redMat, 14), 0, ly + 1.8, 0));
      g.add(at(cyl(0.82, 0.88, 1.0, redMat, 14), 0, ly + 4.1, 0));
      g.add(at(cyl(0.95, 0.95, 0.2, mat('#212529'), 14), 0, ly + 5.45, 0));
      g.add(at(cyl(0.62, 0.62, 0.85, beaconMat, 12), 0, ly + 5.95, 0));
      g.add(at(cone(0.95, 1.05, redMat, 14), 0, ly + 6.85, 0));
    }

    scene.add(g);
  }

  // Realistic Chesapeake Bay sailboats (shared sculpted hull, cabin, rigging & billowing sails from Derby)
  const boatSpecs = [
    { x: W + 11, z: -L * 0.26, yaw: 0.65, color: '#e8e4d9', phase: 0.4 },
    { x: -W - 14, z: -L * 0.50, yaw: -0.95, color: '#d8dedb', phase: 2.3 },
    { x: W + 15, z: -L * 0.92, yaw: 2.35, color: '#e8dfcf', phase: 4.1 },
  ];
  for (const spec of boatSpecs) {
    const boat = buildSailboat(spec.color);
    boat.position.set(spec.x, -1.55, spec.z);
    boat.rotation.y = spec.yaw;
    scene.add(boat);
    boats.push({ group: boat, baseY: -1.55, phase: spec.phase });
  }
  return boats;
}

/** Builds the floating Chesapeake Bay resort putt-putt course with realistic textures, obstacles, islands & clouds. */
function buildGolfArena(scene, course, disposables) {
  scene.background = new THREE.Color('#6db4e8');
  scene.fog = new THREE.Fog('#6db4e8', 110, 340);

  scene.add(new THREE.HemisphereLight('#e6f4ff', '#1b4759', 1.2));
  const sun = new THREE.DirectionalLight('#fff3d9', 1.75);
  sun.position.set(22, 46, 20);
  scene.add(sun);

  const L = course.length;
  const W = course.halfWidth;

  // Shimmering Chesapeake Bay water below the floating course
  const waterTex = makeBayWaterTexture();
  disposables.push(waterTex);
  const waterMat = new THREE.MeshStandardMaterial({ map: waterTex, roughness: 0.32, metalness: 0.2 });
  disposables.push(waterMat);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.y = -1.6;
  scene.add(water);

  // Scenic Chesapeake Bay archipelago (8 islands, pines, lighthouse & Derby sailboats)
  const boats = buildGolfArchipelago(scene, L, W, disposables);

  // Drifting volumetric cumulus clouds across the sky
  const cloudTex = makeCloudPuffTexture();
  disposables.push(cloudTex);
  const clouds = [];
  for (const [cx, cy, cz, sc] of [
    [-42, 24, -L * 0.3, 1.7], [38, 26, -L * 0.35, 1.8], [-24, 28, -L * 0.85, 2.0],
    [28, 25, -L * 0.9, 1.7], [0, 32, -L - 36, 2.3], [-48, 29, -L - 20, 1.9],
    [48, 27, -L - 18, 1.9], [-12, 22, -L * 0.55, 1.4],
  ]) {
    const c = buildCloudCluster(cloudTex, cx, cy, cz, sc, disposables);
    scene.add(c);
    clouds.push({ group: c, baseX: cx, speed: 0.32 + (Math.abs(cx) % 4) * 0.08 });
  }

  // Nautical buoys flanking the floating course
  const buoyRed = mat('#e03131', { roughness: 0.4 });
  const buoyWhite = mat('#f8f9fa', { roughness: 0.4 });
  for (const [bx, bz] of [[-W - 7, -L * 0.25], [W + 7, -L * 0.4], [-W - 9, -L * 0.72], [W + 8, -L * 0.85]]) {
    scene.add(at(cyl(0.45, 0.62, 1.0, buoyRed, 12), bx, -1.2, bz));
    scene.add(at(cyl(0.24, 0.38, 0.6, buoyWhite, 12), bx, -0.45, bz));
    scene.add(at(ball(0.14, mat('#ffe066', { emissive: '#ffbe0b', emissiveIntensity: 1.4 })), bx, -0.05, bz));
  }

  // Mowed resort astroturf & weathered marina timber materials
  const turfTex = makeTurfTexture(Math.round(L / 4));
  const timberTex = makeTimberTexture();
  const sandTex = makeSandTexture();
  disposables.push(turfTex, timberTex, sandTex);
  const turfMat = new THREE.MeshStandardMaterial({ map: turfTex, roughness: 0.84 });
  const railMat = new THREE.MeshStandardMaterial({ map: timberTex, roughness: 0.78 });
  const sandMat = new THREE.MeshStandardMaterial({ map: sandTex, roughness: 0.96 });
  disposables.push(turfMat, railMat, sandMat);

  // Piecewise floating turf deck + timber under-hull
  const mainLen = Math.abs(course.greenRampStartZ);
  scene.add(at(box(W * 2, 0.7, mainLen, turfMat), 0, -0.35, -mainLen / 2));
  scene.add(at(box(W * 2 + 0.6, 0.9, mainLen + 0.4, railMat), 0, -1.1, -mainLen / 2));

  const rampLen = Math.abs(course.greenFlatZ - course.greenRampStartZ);
  const rampHyp = Math.hypot(rampLen, course.greenHeight);
  const rampPitch = Math.atan2(course.greenHeight, rampLen);
  scene.add(at(
    box(W * 2, 0.65, rampHyp + 0.2, turfMat),
    0,
    course.greenHeight / 2 - 0.34,
    (course.greenRampStartZ + course.greenFlatZ) / 2,
    rampPitch,
    0,
    0,
  ));

  const greenLen = Math.abs(-L - course.greenFlatZ);
  scene.add(at(box(W * 2, 0.7 + course.greenHeight, greenLen, turfMat), 0, (course.greenHeight - 0.7) / 2, course.greenFlatZ - greenLen / 2));

  // Weathered timber bumper rails + nautical corner bollards
  scene.add(at(box(0.48, 0.68, mainLen, railMat), -W - 0.22, 0.28, -mainLen / 2));
  scene.add(at(box(0.48, 0.68, mainLen, railMat), W + 0.22, 0.28, -mainLen / 2));
  scene.add(at(box(0.48, 0.68, greenLen + rampLen, railMat), -W - 0.22, course.greenHeight + 0.28, course.greenRampStartZ - (greenLen + rampLen) / 2));
  scene.add(at(box(0.48, 0.68, greenLen + rampLen, railMat), W + 0.22, course.greenHeight + 0.28, course.greenRampStartZ - (greenLen + rampLen) / 2));
  scene.add(at(box(W * 2 + 0.95, 0.68, 0.48, railMat), 0, 0.28, 0.1));
  scene.add(at(box(W * 2 + 0.95, 0.68, 0.48, railMat), 0, course.greenHeight + 0.28, -L - 0.1));
  const bollardMat = mat('#2b303a', { roughness: 0.45, metalness: 0.65 });
  for (const [px, py, pz] of [[-W - 0.22, 0.78, 0.1], [W + 0.22, 0.78, 0.1], [-W - 0.22, course.greenHeight + 0.78, -L - 0.1], [W + 0.22, course.greenHeight + 0.78, -L - 0.1]]) {
    scene.add(at(cyl(0.26, 0.3, 0.55, bollardMat, 10), px, py, pz));
  }

  // Legacy Code Water Hazard cutouts
  const hazardWaterMat = mat('#114358', { roughness: 0.22, metalness: 0.3, emissive: '#0c3040', emissiveIntensity: 0.4 });
  for (const wz of course.waterZones) {
    const ww = wz.xMax - wz.xMin;
    const wl = wz.zMax - wz.zMin;
    scene.add(at(box(ww, 0.08, wl, hazardWaterMat), (wz.xMin + wz.xMax) / 2, 0.02, (wz.zMin + wz.zMax) / 2));
  }

  // Raked Procurement Sand Traps with soft bevel lip
  for (const st of course.sandTraps) {
    const sy = courseHeightAt(course, st.x, st.z);
    scene.add(at(cyl(1, 1, 0.08, sandMat, 24), st.x, sy + 0.02, st.z, 0, 0, 0, st.rx, 1, st.rz));
    scene.add(at(torus(1, 0.06, mat('#c9ae78', { roughness: 0.95 })), st.x, sy + 0.04, st.z, Math.PI / 2, 0, 0, st.rx, st.rz, 1));
  }

  // Realistic fluted chrome Scope Creep mushroom pop-bumpers
  for (const bmp of course.bumpers) {
    const by = courseHeightAt(course, bmp.x, bmp.z);
    scene.add(buildMushroomBumper(bmp, by, disposables));
  }

  // Illuminated "One Quick Idea" Detour Chevron Boost Pad
  const detY = courseHeightAt(course, course.detour.x, course.detour.z);
  const boostTex = canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#0f2538';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 10;
    for (const y of [38, 72, 106]) {
      ctx.beginPath();
      ctx.moveTo(24, y);
      ctx.lineTo(w / 2, y - 24);
      ctx.lineTo(w - 24, y);
      ctx.stroke();
    }
  });
  disposables.push(boostTex);
  const boostMat = new THREE.MeshBasicMaterial({ map: boostTex });
  disposables.push(boostMat);
  scene.add(at(plane(course.detour.r * 1.8, course.detour.r * 1.8, boostMat), course.detour.x, detY + 0.04, course.detour.z, -Math.PI / 2, 0, 0));

  // Detailed Dutch clapboard Sprint Review Windmills
  const windmillRotors = [];
  for (const wm of course.windmills) {
    const wy = courseHeightAt(course, wm.x, wm.z);
    const built = buildWindmillObstacle(wm, wy, disposables);
    scene.add(built.group);
    windmillRotors.push({ rotor: built.rotor, sim: wm });
  }

  // Industrial steel BadalJwala Firewall Gates with laser beams
  const firewallBars = [];
  for (const fw of course.firewalls) {
    const fy = courseHeightAt(course, 0, fw.z);
    const built = buildFirewallObstacle(fw, fy, W, disposables);
    scene.add(built.group);
    firewallBars.push({ bar: built.bar, sim: fw });
  }

  // Glowing golden PROD / LEAD STANDUP Cup & animated popping flagstick
  const cupY = courseHeightAt(course, course.cup.x, course.cup.z);
  scene.add(at(cyl(CUP_RADIUS, CUP_RADIUS, 0.12, mat('#0d111a'), 24), course.cup.x, cupY + 0.02, course.cup.z));
  scene.add(at(torus(CUP_RADIUS + 0.06, 0.08, mat('#f2b817', { roughness: 0.25, metalness: 0.8, emissive: '#f2b817', emissiveIntensity: 0.8 })), course.cup.x, cupY + 0.08, course.cup.z, Math.PI / 2, 0, 0));

  const flagGroup = new THREE.Group();
  flagGroup.position.set(course.cup.x, cupY, course.cup.z);
  flagGroup.add(at(cyl(0.045, 0.055, 4.6, mat('#f8f9fa', { metalness: 0.5 }), 10), 0, 2.3, 0));
  flagGroup.add(at(ball(0.11, mat('#f2b817', { metalness: 0.8 })), 0, 4.65, 0));
  const flagTex = canvasTexture(256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#f2b817';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1b0f00';
    ctx.font = `900 32px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PROD', w / 2, 42);
    ctx.font = `800 22px ${FONT_MONO}`;
    ctx.fillText('STANDUP', w / 2, 88);
  });
  disposables.push(flagTex);
  const flagMat = new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide });
  disposables.push(flagMat);
  const pennant = at(plane(2.2, 1.08, flagMat), 1.1, 3.9, 0);
  flagGroup.add(pennant);
  scene.add(flagGroup);

  return { windmillRotors, firewallBars, flagGroup, pennant, clouds, boats, cupBaseY: cupY };
}

// ------------------------------------------------------------------ Lobby 3D Stage

export class GolfStage {
  constructor(aspect = 16 / 9, initialNames = [], { duration = DEFAULT_GOLF_DURATION } = {}) {
    this.t = 0;
    this.names = [];
    this.models = [];
    this.disposables = [];
    this.course = buildGolfCourse(duration);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(48, aspect, 0.3, 380);
    this.arena = buildGolfArena(this.scene, this.course, this.disposables);
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

    const colors = ['#ff6b6b', '#4dabf7', '#51cf66', '#ffd43b', '#cc5de8', '#ff922b', '#20c997', '#f06595'];
    const n = Math.max(1, names.length);
    const cols = Math.min(8, Math.max(2, Math.ceil(Math.sqrt(n * 1.6))));
    const spanX = Math.min(this.course.halfWidth * 1.5, (cols - 1) * 1.15);
    names.forEach((name, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const inRow = Math.min(cols, n - row * cols);
      const x = inRow === 1 ? 0 : ((col / (inRow - 1)) - 0.5) * (spanX * ((inRow - 1) / Math.max(1, cols - 1)));
      const z = -2.2 - row * 1.05;
      const root = new THREE.Group();
      const color = colors[i % colors.length];
      const ballTex = makeGolfBallTexture(color);
      const ballMat = new THREE.MeshStandardMaterial({ map: ballTex, roughness: 0.22, metalness: 0.08 });
      this.disposables.push(ballTex, ballMat);
      root.add(ball(BALL_RADIUS, ballMat));
      const tag = makeGolfTag(name, color);
      root.add(tag.sprite);
      this.disposables.push(tag.tex, tag.spriteMat);
      root.position.set(x, BALL_RADIUS, z);
      this.scene.add(root);
      this.models.push({ root, baseX: x, phase: i * 0.8 });
    });
  }

  update(dt, reduced = false) {
    if (!reduced) this.t += dt;
    const t = this.t;
    for (const wm of this.arena.windmillRotors) {
      wm.rotor.rotation.z = reduced ? 0.4 : t * wm.sim.speed;
    }
    for (const fw of this.arena.firewallBars) {
      fw.bar.visible = isFirewallClosed(fw.sim, t);
    }
    if (!reduced) {
      this.arena.pennant.rotation.y = Math.sin(t * 5) * 0.18;
      for (const c of this.arena.clouds) c.group.position.x = c.baseX + Math.sin(t * 0.07 * c.speed) * 4.5;
      for (const b of this.arena.boats) {
        b.group.position.y = b.baseY + Math.sin(t * 1.3 + b.phase) * 0.16;
        b.group.rotation.z = Math.sin(t * 0.9 + b.phase) * 0.055;
      }
    }
    for (const m of this.models) {
      m.root.position.x = m.baseX + (reduced ? 0 : Math.sin(t * 4 + m.phase) * 0.08);
    }
    const sway = reduced ? 0 : Math.sin(t * 0.28) * 5.2;
    this.camera.position.set(sway, 10.5, 9.8);
    this.camera.lookAt(0, 1.2, -18);
  }

  dispose() {
    for (const d of this.disposables) d.dispose?.();
  }
}

// ------------------------------------------------------------------ Live Match

export class GolfMatch {
  constructor(names, { duration = DEFAULT_GOLF_DURATION, rng = Math.random, sfx = null, onEvent = null, onWinner = null } = {}) {
    this.sim = new GolfSim({ names, duration, rng });
    this.sfx = sfx;
    this.onEvent = onEvent;
    this.onWinner = onWinner;

    this.accumulator = 0;
    this.winnerReported = false;
    this.flagPop = 0;
    this.trailTimer = 0;
    this.leaderTimer = 0;
    this.disposables = [];

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.3, 400);
    this.arena = buildGolfArena(this.scene, this.sim.course, this.disposables);
    this.particles = new Particles(this.scene);

    this.ballVisuals = this.sim.balls.map((b) => {
      const root = new THREE.Group();
      const ballTex = makeGolfBallTexture(b.color);
      const ballMat = new THREE.MeshStandardMaterial({ map: ballTex, roughness: 0.22, metalness: 0.08 });
      this.disposables.push(ballTex, ballMat);
      const sphere = ball(BALL_RADIUS, ballMat);
      root.add(sphere);
      const tag = makeGolfTag(b.name, b.color);
      root.add(tag.sprite);
      this.disposables.push(tag.tex, tag.spriteMat);
      root.position.set(b.x, b.y + BALL_RADIUS, b.z);
      this.scene.add(root);
      return { sim: b, root, sphere };
    });

    this.camPos = new THREE.Vector3(0, 10.5, 9.8);
    this.camLook = new THREE.Vector3(0, 1.2, -18);
    this.resize(window.innerWidth / window.innerHeight);
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 1 ? 64 : 50;
    this.camera.updateProjectionMatrix();
  }

  update(realDt) {
    this.accumulator += realDt;
    let steps = 0;
    while (this.accumulator >= STEP && steps < 8) {
      this.sim.step(STEP);
      this.accumulator -= STEP;
      steps++;
      for (const e of this.sim.drainEvents()) this.handleEvent(e);
    }

    const t = this.sim.time;
    const c = this.sim.course;

    for (const wm of this.arena.windmillRotors) {
      wm.rotor.rotation.z = t * wm.sim.speed;
    }
    for (const fw of this.arena.firewallBars) {
      fw.bar.visible = isFirewallClosed(fw.sim, t);
    }
    this.arena.pennant.rotation.y = Math.sin(t * 6) * 0.2;
    for (const cl of this.arena.clouds) {
      cl.group.position.x = cl.baseX + t * cl.speed;
    }
    for (const b of this.arena.boats) {
      b.group.position.y = b.baseY + Math.sin(t * 1.3 + b.phase) * 0.16;
      b.group.rotation.z = Math.sin(t * 0.9 + b.phase) * 0.055;
    }

    if (this.sim.winner) {
      this.flagPop = Math.min(1, this.flagPop + realDt * 4);
      this.arena.flagGroup.position.y = this.arena.cupBaseY + this.flagPop * 2.8;
    }

    // Sync dimpled rolling golf balls with authentic roll spin + colored trails
    this.trailTimer += realDt;
    const emitTrail = this.trailTimer >= 0.08;
    if (emitTrail) this.trailTimer = 0;

    for (const bv of this.ballVisuals) {
      const b = bv.sim;
      bv.root.position.set(b.x, b.y + (b.sunk ? -0.15 : BALL_RADIUS), b.z);
      if (!b.sunk) {
        bv.sphere.rotation.x += (b.vz * realDt) / BALL_RADIUS;
        bv.sphere.rotation.z -= (b.vx * realDt) / BALL_RADIUS;
      }
      if (!b.sunk && emitTrail && Math.hypot(b.vx, b.vz) > 2.2) {
        this.particles.burst(new THREE.Vector3(b.x, b.y + 0.12, b.z), {
          count: 1,
          colors: [b.color, '#ffffff'],
          speed: 0.3,
          up: 0.2,
          life: 0.45,
          size: 0.16,
          gravity: 0,
        });
      }
    }

    this.leaderTimer += realDt;
    if (this.leaderTimer >= 0.18 && this.sim.teedOff && !this.sim.done) {
      this.leaderTimer = 0;
      const lead = this.sim.standings()[0];
      if (lead) {
        this.onEvent?.({
          type: 'leader',
          text: `⛳ 1st: ${lead.name} • ${lead.distToPin.toFixed(1)}m to PROD`,
        });
      }
    }

    this.particles.update(realDt);

    // Dynamic 3-Shot Camera: Tee-Off -> Fairway Follow -> Cup Cam
    const wantPos = new THREE.Vector3();
    const wantLook = new THREE.Vector3();
    const order = this.sim.standings();
    const top1 = order[0];
    if (!this.sim.teedOff) {
      wantPos.set(Math.sin(t * 0.8) * 3.5, 10.5, 9.8);
      wantLook.set(0, 1.2, -18);
    } else if (this.sim.winner || (top1 && top1.distToPin < 5.5)) {
      wantPos.set(c.cup.x + 6.5, this.arena.cupBaseY + 4.8, c.cup.z + 9.2);
      wantLook.set(c.cup.x, this.arena.cupBaseY + 0.5, c.cup.z);
    } else {
      const topN = order.slice(0, Math.min(4, order.length));
      const avgX = topN.reduce((s, b) => s + b.x, 0) / topN.length;
      const avgZ = topN.reduce((s, b) => s + b.z, 0) / topN.length;
      const avgY = topN.reduce((s, b) => s + b.y, 0) / topN.length;
      wantPos.set(avgX * 0.5, avgY + 13.5, avgZ + 15.5);
      wantLook.set(avgX * 0.65, avgY + 0.6, avgZ - 7.5);
    }

    this.camPos.lerp(wantPos, Math.min(1, realDt * 4.2));
    this.camLook.lerp(wantLook, Math.min(1, realDt * 5.0));
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
  }

  handleEvent(e) {
    if (e.type === 'teeOff') {
      this.sfx?.play('golfPutt', 0);
      this.onEvent?.({ type: 'note', text: '⛳ TEE OFF! Simultaneous putt-putt chaos underway!', important: true });
    } else if (e.type === 'putt') {
      this.sfx?.play('golfPutt', 0.08);
    } else if (e.type === 'wall') {
      this.sfx?.play('golfClack', 0.08);
    } else if (e.type === 'lipout') {
      this.sfx?.play('golfClack', 0.04);
      this.onEvent?.({ type: 'note', text: `😱 ${e.ball.name} lipped out at the PROD cup!`, important: true });
    } else if (e.type === 'hazard') {
      if (e.kind === 'water') {
        this.sfx?.play('golfSplash', 0.05);
        this.particles.burst(new THREE.Vector3(e.x, 0.2, e.z), {
          count: 20,
          colors: ['#ffffff', '#a5d8ff', '#74c0fc'],
          speed: 5,
          up: 6,
          life: 0.9,
          size: 0.28,
          gravity: 9,
        });
      } else if (e.kind === 'sand') this.sfx?.play('golfSand', 0.08);
      else this.sfx?.play('golfBumper', 0.06);
      this.onEvent?.({ type: 'hazard', ball: e.ball, popup: e.popup });
    } else if (e.type === 'note') {
      this.onEvent?.(e);
    } else if (e.type === 'cup' && !this.winnerReported) {
      this.winnerReported = true;
      this.sfx?.play('golfCup', 0);
      this.particles.burst(new THREE.Vector3(this.sim.course.cup.x, this.arena.cupBaseY + 1.4, this.sim.course.cup.z), {
        count: 56,
        colors: ['#f2b817', '#51cf66', '#38bdf8', '#ff6b6b', '#ffffff'],
        speed: 8,
        up: 7,
        life: 2.2,
        size: 0.34,
        gravity: 4,
      });
      this.onWinner?.(e.ball, this.sim);
    }
  }

  dispose() {
    this.particles.clear();
    for (const d of this.disposables) d.dispose?.();
  }
}
