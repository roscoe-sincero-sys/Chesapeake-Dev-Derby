// "RTO Mini-Golf" (Indoor Office Cubicle Open): moody late-afternoon IT floor with acoustic
// drop ceiling & parabolic-louver fluorescent troffer lights, venetian-blind sunset windows,
// speckled commercial carpet, duct-taped emerald putting mats, fabric cubicles with monitors &
// sticky notes, propped-open server racks with catenary ethernet cables, spinning 5-caster
// ergonomic desk chairs, wedge 3-ring binder ramps, floor cable protectors, BadalJwala jammed
// multifunction copier, spilled iced coffee puddles with Wet Floor A-frame signs, ?ReturnUrl=
// security detour, retired hardware bumpers, oversized tipped-over "WORLD'S OKAYEST DEVELOPER"
// ceramic coffee mug, and Claw-of-Destiny developer bobblehead capsules rolling down the aisle!

import * as THREE from 'three';
import { mat, box, ball, cyl, cone, torus, plane, at, canvasTexture, FONT_UI, FONT_MONO, roundRect } from './util3d.js';
import { Particles } from './effects.js';
import { DEVELOPER_KINDS } from './deathmatch-sim.js';
import {
  RtoSim,
  buildRtoCourse,
  rtoHeightAt,
  isCopierJammed,
  DEFAULT_RTO_DURATION,
  RTO_BALL_RADIUS,
  RTO_CUP_RADIUS,
} from './rto-sim.js';

const STEP = 1 / 60;
const CAPSULE_R = RTO_BALL_RADIUS * 1.46;

const portraitLoader = new THREE.TextureLoader();
const portraitTexCache = new Map();

/** Loads and caches the cropped 256x256 reference portrait texture for developer `id` (shared with Claw of Destiny). */
function getDeveloperPortraitTexture(id) {
  if (!portraitTexCache.has(id)) {
    const tex = portraitLoader.load(`./assets/developers/${id}.png`);
    tex.colorSpace = THREE.SRGBColorSpace;
    portraitTexCache.set(id, tex);
  }
  return portraitTexCache.get(id);
}

/** Commercial dark-gray speckled office carpet tile texture. */
function makeCarpetTexture() {
  const tex = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#242830';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(10, 12, 16, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, w - 2, h - 2);
    ctx.beginPath();
    ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h);
    ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
    ctx.stroke();
    for (let i = 0; i < 2000; i++) {
      const x = (i * 53) % w;
      const y = (i * 97) % h;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(255,255,255,0.045)' : 'rgba(8,10,14,0.14)';
      ctx.fillRect(x, y, 2, 2);
    }
  });
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(18, 24);
  return tex;
}

/** Acoustic suspended drop-ceiling tile grid texture. */
function makeCeilingGridTexture() {
  const tex = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#2d333f';
    ctx.fillRect(0, 0, w, h);
    // T-bar metal suspension grid
    ctx.strokeStyle = '#495264';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, w - 4, h - 4);
    ctx.beginPath();
    ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h);
    ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
    ctx.stroke();
    // Acoustic pinhole stippling
    for (let i = 0; i < 650; i++) {
      ctx.fillStyle = 'rgba(10, 12, 18, 0.25)';
      ctx.fillRect((i * 37) % w, (i * 71) % h, 2, 2);
    }
  });
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(12, 16);
  return tex;
}

/** Roll-out emerald felt putting mat with nap weave and neon-green gaffer edge tape. */
function makePuttingMatTexture() {
  const tex = canvasTexture(256, 512, (ctx, w, h) => {
    ctx.fillStyle = '#1b8a4b';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 2400; i++) {
      const x = (i * 41) % w;
      const y = (i * 83) % h;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.05)';
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 12]);
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#51cf66';
    ctx.fillRect(0, 0, 10, h);
    ctx.fillRect(w - 10, 0, 10, h);
  });
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 5);
  return tex;
}

/** Gray-blue acoustic cubicle fabric weave texture. */
function makeCubicleFabricTexture() {
  const tex = canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#4a5568';
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 3) {
      ctx.fillStyle = y % 6 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.08)';
      ctx.fillRect(0, y, w, 1.5);
    }
    for (let x = 0; x < w; x += 4) {
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      ctx.fillRect(x, 0, 1, h);
    }
  });
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  return tex;
}

/** Glowing dark-mode IDE monitor texture for cubicle desks. */
function makeMonitorTexture() {
  return canvasTexture(128, 96, (ctx, w, h) => {
    ctx.fillStyle = '#0f141e';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#192132';
    ctx.fillRect(0, 0, 22, h);
    ctx.fillStyle = '#25314a';
    ctx.fillRect(0, 0, w, 8);
    const colors = ['#74c0fc', '#a9e34b', '#ffd43b', '#ff8787', '#da77f2', '#ced4da'];
    for (let y = 14; y < h - 8; y += 7) {
      const indent = 28 + ((y * 7) % 18);
      const len = 24 + ((y * 13) % 58);
      ctx.fillStyle = colors[(y / 7) % colors.length | 0];
      ctx.fillRect(indent, y, len, 3);
    }
  });
}

/** Yellow A-frame Wet Floor sign texture with caution triangle and slipping figure. */
function makeWetFloorTexture() {
  return canvasTexture(128, 192, (ctx, w, h) => {
    ctx.fillStyle = '#fcc419';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#1d2128';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(w / 2, 26);
    ctx.lineTo(w - 22, 118);
    ctx.lineTo(22, 118);
    ctx.closePath();
    ctx.stroke();
    // Stylized slipping person silhouette
    ctx.fillStyle = '#1d2128';
    ctx.beginPath();
    ctx.arc(w / 2 + 4, 64, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(w / 2 + 2, 72); ctx.lineTo(w / 2 - 6, 94);
    ctx.moveTo(w / 2 - 6, 94); ctx.lineTo(w / 2 + 12, 108);
    ctx.moveTo(w / 2 - 6, 94); ctx.lineTo(w / 2 - 16, 108);
    ctx.stroke();
    ctx.font = `900 18px ${FONT_UI}`;
    ctx.textAlign = 'center';
    ctx.fillText('CAUTION', w / 2, 146);
    ctx.font = `800 15px ${FONT_UI}`;
    ctx.fillText('WET FLOOR', w / 2, 170);
  });
}

/** Venetian-blind late-afternoon office window texture. */
function makeBlindsWindowTexture() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#364f78');
    grad.addColorStop(0.55, '#c97a4b');
    grad.addColorStop(1, '#f2b866');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    // Horizontal venetian blind slats
    for (let y = 0; y < h; y += 12) {
      ctx.fillStyle = 'rgba(28, 34, 46, 0.78)';
      ctx.fillRect(0, y, w, 7);
    }
    // Mullion frame
    ctx.strokeStyle = '#1c222e';
    ctx.lineWidth = 10;
    ctx.strokeRect(0, 0, w, h);
    ctx.beginPath();
    ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h);
    ctx.stroke();
  });
}

/** Upright high-contrast player nameplate sprite. */
function makeRtoTag(name, color) {
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
  sprite.scale.set(2.3, 0.58, 1);
  sprite.position.set(0, 1.18, 0);
  return { sprite, tex, spriteMat };
}

/**
 * Builds a Claw-of-Destiny developer bobblehead inside a glossy rolling gachapon capsule!
 * Outer `shell` rolls with velocity while inner `bobble` stays upright and wobbles dynamically.
 */
function buildBobbleheadRoller(name, kind, color, disposables) {
  const root = new THREE.Group();
  const shell = new THREE.Group();

  // Lower colored capsule hemisphere
  const bottomGeo = new THREE.SphereGeometry(CAPSULE_R, 18, 12, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5);
  const bottomMat = new THREE.MeshStandardMaterial({ color: kind.accent ?? color, roughness: 0.32, metalness: 0.16 });
  shell.add(new THREE.Mesh(bottomGeo, bottomMat));

  // Upper crystal-clear dome
  const topGeo = new THREE.SphereGeometry(CAPSULE_R, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const topMat = new THREE.MeshStandardMaterial({
    color: '#e8f4ff',
    roughness: 0.1,
    metalness: 0.12,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
  });
  shell.add(new THREE.Mesh(topGeo, topMat));

  // Equatorial white seam ring
  shell.add(at(torus(CAPSULE_R * 1.005, 0.028, mat('#f8f9fa', { roughness: 0.3 })), 0, 0, 0, Math.PI / 2, 0, 0));
  root.add(shell);

  // Upright spring-mounted developer bobblehead portrait (matches Claw of Destiny)
  const bobble = new THREE.Group();
  const scale = CAPSULE_R / 0.62;
  bobble.scale.setScalar(scale);
  const neck = at(cyl(0.06, 0.08, 0.22, mat(kind.shirt ?? '#343a40')), 0, -0.24, 0);
  const rim = at(cyl(0.41, 0.41, 0.12, mat(kind.accent ?? color, { roughness: 0.35, metalness: 0.2 }), 24), 0, 0.08, 0, Math.PI / 2, 0, 0);
  const portraitTex = getDeveloperPortraitTexture(kind.id);
  const faceMat = new THREE.MeshStandardMaterial({ map: portraitTex, roughness: 0.32, metalness: 0.05 });
  const faceGeo = new THREE.CircleGeometry(0.38, 24);
  const faceFront = new THREE.Mesh(faceGeo, faceMat);
  faceFront.position.set(0, 0.08, 0.066);
  const faceBack = new THREE.Mesh(faceGeo, faceMat);
  faceBack.rotation.y = Math.PI;
  faceBack.position.set(0, 0.08, -0.066);
  bobble.add(neck, rim, faceFront, faceBack);
  root.add(bobble);

  const tag = makeRtoTag(name, kind.accent ?? color);
  root.add(tag.sprite);

  disposables.push(bottomGeo, bottomMat, topGeo, topMat, faceGeo, faceMat, tag.tex, tag.spriteMat);
  return { root, shell, bobble };
}

/** Builds a realistic recessed 2x4 parabolic-louver ceiling troffer light fixture. */
function buildTrofferLight(x, y, z, includePointLight) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const frameMat = mat('#868e96', { roughness: 0.35, metalness: 0.72 });
  const diffuserMat = mat('#fff9eb', { emissive: '#eef4ff', emissiveIntensity: 1.55, roughness: 0.2 });

  // Outer aluminum frame housing
  g.add(at(box(4.8, 0.18, 1.65, frameMat), 0, 0.04, 0));
  // Glowing frosted acrylic light diffuser
  g.add(at(box(4.5, 0.06, 1.4, diffuserMat), 0, -0.05, 0));
  // Parabolic metallic cross-louvers (breaks up the flat rectangle into realistic office cells)
  for (let i = -3; i <= 3; i++) {
    g.add(at(box(0.05, 0.14, 1.42, frameMat), i * 0.62, -0.08, 0));
  }
  g.add(at(box(4.52, 0.14, 0.05, frameMat), 0, -0.08, -0.35));
  g.add(at(box(4.52, 0.14, 0.05, frameMat), 0, -0.08, 0.35));

  if (includePointLight) {
    const pt = new THREE.PointLight('#eef4ff', 28, 28, 1.5);
    pt.position.set(0, -0.5, 0);
    g.add(pt);
  }
  return g;
}

/** Builds a realistic 5-caster spinning ergonomic mesh office chair. */
function buildDeskChair(ch, cy, disposables) {
  const group = new THREE.Group();
  group.position.set(ch.x, cy, ch.z);

  const blackNylon = mat('#1c2026', { roughness: 0.55, metalness: 0.15 });
  const chromeMat = mat('#dee2e6', { roughness: 0.18, metalness: 0.88 });
  const meshMat = mat('#2a313c', { roughness: 0.82 });
  const trimBlue = mat('#339af0', { roughness: 0.45 });

  // Tapered 5-star caster wheelbase with dual hooded rolling wheels
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const leg = new THREE.Group();
    leg.rotation.y = a;
    leg.add(at(cyl(0.055, 0.08, ch.radius * 0.88, blackNylon, 8), 0, 0.24, ch.radius * 0.44, Math.PI / 2 + 0.12, 0, 0));
    // Hooded caster fork + dual wheels
    leg.add(at(cyl(0.09, 0.1, 0.1, blackNylon, 10), 0, 0.16, ch.radius * 0.84));
    leg.add(at(cyl(0.11, 0.11, 0.05, blackNylon, 12), -0.05, 0.11, ch.radius * 0.84, 0, 0, Math.PI / 2));
    leg.add(at(cyl(0.11, 0.11, 0.05, blackNylon, 12), 0.05, 0.11, ch.radius * 0.84, 0, 0, Math.PI / 2));
    group.add(leg);
  }
  // Telescoping pneumatic chrome lift cylinder + ribbed shroud
  group.add(at(cyl(0.12, 0.14, 0.45, blackNylon, 14), 0, 0.46, 0));
  group.add(at(cyl(0.08, 0.08, 0.62, chromeMat, 14), 0, 0.85, 0));
  // Under-seat tilt tension mechanism & height lever
  group.add(at(box(0.55, 0.14, 0.55, blackNylon), 0, 1.14, 0));
  group.add(at(cyl(0.02, 0.02, 0.55, chromeMat, 6), 0.35, 1.14, 0.1, 0, 0, Math.PI / 2));
  // Contoured rounded seat pan + waterfall cushion
  const seatPts = [
    new THREE.Vector2(0.01, 0),
    new THREE.Vector2(0.58, 0.02),
    new THREE.Vector2(0.66, 0.1),
    new THREE.Vector2(0.58, 0.19),
    new THREE.Vector2(0.01, 0.2),
  ];
  const seatGeo = new THREE.LatheGeometry(seatPts, 20);
  disposables.push(seatGeo);
  const seat = new THREE.Mesh(seatGeo, meshMat);
  seat.scale.set(1.02, 1, 0.96);
  seat.position.set(0, 1.18, 0);
  group.add(seat);
  group.add(at(torus(0.62, 0.035, trimBlue), 0, 1.24, 0, Math.PI / 2, 0, 0));

  // Sculpted T-armrests with padded polyurethane tops
  for (const sx of [-0.68, 0.68]) {
    group.add(at(cyl(0.04, 0.05, 0.46, chromeMat, 8), sx, 1.46, 0.04));
    group.add(at(box(0.14, 0.06, 0.66, blackNylon), sx, 1.72, 0.02));
  }
  // Curved ergonomic spine + mesh backrest frame + adjustable headrest
  group.add(at(cyl(0.07, 0.09, 1.15, blackNylon, 10), 0, 1.75, -0.56, -0.14, 0, 0));
  group.add(at(box(1.06, 1.32, 0.09, meshMat), 0, 2.04, -0.62, -0.1, 0, 0));
  group.add(at(box(1.12, 0.08, 0.12, blackNylon), 0, 2.7, -0.68, -0.1, 0, 0));
  group.add(at(box(1.12, 0.08, 0.12, blackNylon), 0, 1.4, -0.56, -0.1, 0, 0));
  group.add(at(box(0.68, 0.24, 0.13, meshMat), 0, 2.9, -0.68, -0.05, 0, 0));

  return group;
}

/** Builds a detailed enterprise BadalJwala multifunction copier with jammed paper sheets & pulsing barrier. */
function buildCopierObstacle(cp, cy, W, disposables) {
  const group = new THREE.Group();
  group.position.set(0, cy, cp.z);

  const bodyWhite = mat('#dfe4ea', { roughness: 0.48 });
  const darkSlate = mat('#262b34', { roughness: 0.55, metalness: 0.25 });
  const glassMat = mat('#1a2230', { roughness: 0.1, metalness: 0.4 });
  const paperMat = mat('#ffffff', { roughness: 0.85, side: THREE.DoubleSide });
  const amberLed = mat('#ff922b', { emissive: '#fd7e14', emissiveIntensity: 1.8 });

  const copier = new THREE.Group();
  copier.position.set(-W + 1.35, 0, 0);
  // Rolling stand & main chassis
  copier.add(at(box(2.2, 2.1, 1.9, bodyWhite), 0, 1.08, 0));
  copier.add(at(box(2.26, 0.14, 1.96, darkSlate), 0, 2.14, 0));
  // Recessed center output bin with crinkled jammed paper sticking out!
  copier.add(at(box(1.4, 0.42, 1.5, darkSlate), -0.15, 1.72, 0.22));
  copier.add(at(plane(0.7, 0.85, paperMat), 0.1, 1.62, 1.05, -0.95, 0.25, 0.15));
  copier.add(at(plane(0.65, 0.8, paperMat), -0.25, 1.68, 1.02, -1.15, -0.3, -0.1));
  // 3 pull-out paper cassette drawers with handles & fill gauges
  for (const ty of [0.36, 0.78, 1.2]) {
    copier.add(at(box(1.88, 0.34, 0.08, bodyWhite), 0, ty, 0.96));
    copier.add(at(box(0.5, 0.07, 0.08, darkSlate), 0, ty + 0.04, 1.01));
  }
  // Hinged ADF scanner lid propped slightly open with glowing scan bar
  copier.add(at(box(2.15, 0.16, 1.75, bodyWhite), 0, 2.38, -0.05, -0.12, 0, 0));
  copier.add(at(plane(1.9, 1.5, glassMat), 0, 2.22, 0, -Math.PI / 2, 0, 0));
  // Tilted touchscreen control panel with glowing amber JAM alert
  copier.add(at(box(0.82, 0.28, 0.42, darkSlate), 0.76, 2.32, 0.82, 0.48, 0, 0));
  copier.add(at(box(0.42, 0.18, 0.06, amberLed), 0.76, 2.38, 0.96, 0.48, 0, 0));
  group.add(copier);

  // Overhead gantry sign "BADALJWALA COPIER · 500 JAM"
  const signTex = canvasTexture(512, 96, (ctx, w, h) => {
    ctx.fillStyle = '#151922';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#ff922b';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = '#ff922b';
    ctx.font = `900 32px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BADALJWALA COPIER · 500', w / 2, h / 2);
  });
  disposables.push(signTex);
  const signMat = new THREE.MeshStandardMaterial({ map: signTex, emissive: '#d9480f', emissiveIntensity: 0.4 });
  disposables.push(signMat);
  group.add(at(cyl(0.11, 0.12, 3.3, darkSlate, 10), W - 0.45, 1.65, 0));
  group.add(at(box(W * 2 - 0.5, 0.52, 0.22, darkSlate), 0, 3.2, 0));
  group.add(at(plane(W * 1.45, 0.48, signMat), 0, 3.2, 0.13));

  // Pulsing orange paper-tray laser/arm barrier
  const bar = new THREE.Group();
  const beamMat = mat('#ff922b', { emissive: '#f76707', emissiveIntensity: 1.5, transparent: true, opacity: 0.78 });
  bar.add(at(box(W * 1.9, 0.48, 0.18, beamMat), 0, 0.48, 0));
  bar.add(at(box(W * 1.9, 0.1, 0.24, mat('#ffe066', { emissive: '#fab005', emissiveIntensity: 1.6 })), 0, 0.74, 0));
  group.add(bar);

  return { group, bar };
}

/** Builds a glossy organic spilled iced-coffee puddle with domed cup, ice cubes & painted Wet Floor sign. */
function buildCoffeePuddle(cp, cy, wetSignMat) {
  const group = new THREE.Group();
  group.position.set(cp.x, cy + 0.03, cp.z);

  const coffeeMat = mat('#442614', { roughness: 0.08, metalness: 0.18, transparent: true, opacity: 0.9 });
  const creamMat = mat('#c89f78', { roughness: 0.25, transparent: true, opacity: 0.65 });
  const iceMat = mat('#e7f5ff', { roughness: 0.1, transparent: true, opacity: 0.75 });

  // Multi-lobe organic spill shape
  const main = cyl(1, 1, 0.035, coffeeMat, 24);
  main.scale.set(cp.rx, 1, cp.rz);
  group.add(main);
  const lobe = cyl(0.6, 0.6, 0.035, coffeeMat, 18);
  lobe.scale.set(cp.rx * 0.75, 1, cp.rz * 0.65);
  group.add(at(lobe, cp.rx * 0.35, 0, cp.rz * 0.25));
  const swirl = cyl(0.5, 0.5, 0.04, creamMat, 16);
  swirl.scale.set(cp.rx * 0.65, 1, cp.rz * 0.55);
  group.add(at(swirl, -0.2, 0.008, -0.15));

  // Scattered translucent ice cubes
  for (const [ix, iz] of [[-0.4, 0.3], [0.25, -0.35], [0.55, 0.15], [-0.15, -0.55]]) {
    group.add(at(box(0.18, 0.14, 0.18, iceMat), ix * cp.rx * 0.6, 0.07, iz * cp.rz * 0.6, 0.2, ix * 3, 0.1));
  }

  // Tipped clear iced-coffee cup with dome lid & green straw
  const cupGroup = new THREE.Group();
  cupGroup.position.set(-cp.rx * 0.48, 0.18, cp.rz * 0.38);
  cupGroup.rotation.set(Math.PI / 2, 0, 0.55);
  cupGroup.add(cyl(0.2, 0.13, 0.52, mat('#f1f3f5', { roughness: 0.12, transparent: true, opacity: 0.6 }), 14));
  cupGroup.add(at(ball(0.2, mat('#f8f9fa', { roughness: 0.12, transparent: true, opacity: 0.55 }), 1, 0.55, 1), 0, 0.26, 0));
  cupGroup.add(at(cyl(0.025, 0.025, 0.68, mat('#2f9e44'), 6), 0, 0.36, 0));
  group.add(cupGroup);

  // Realistic yellow A-frame Wet Floor sign with painted caution graphic
  const sign = new THREE.Group();
  sign.position.set(cp.rx * 0.56, 0, -cp.rz * 0.45);
  const yellowBack = mat('#fcc419', { roughness: 0.4 });
  sign.add(at(box(0.58, 0.94, 0.05, yellowBack), 0, 0.44, -0.15, 0.22, 0, 0));
  sign.add(at(box(0.58, 0.94, 0.05, yellowBack), 0, 0.44, 0.15, -0.22, 0, 0));
  sign.add(at(plane(0.54, 0.88, wetSignMat), 0, 0.44, 0.18, -0.22, 0, 0));
  group.add(sign);

  return group;
}

/** Builds a realistic retired-hardware bumper (tapered CRT monitor, detailed Dell tower, or labeled paper reams). */
function buildHardwareBumper(bmp, by, disposables) {
  const group = new THREE.Group();
  group.position.set(bmp.x, by, bmp.z);

  if (bmp.kind === 'crt') {
    const beige = mat('#d6ccb8', { roughness: 0.7 });
    const screen = mat('#133020', { emissive: '#2f9e44', emissiveIntensity: 0.95, roughness: 0.14 });
    // Swivel pedestal + main front bezel + tapered CRT tube housing behind
    group.add(at(cyl(bmp.r * 0.6, bmp.r * 0.72, 0.22, beige, 14), 0, 0.11, 0));
    group.add(at(box(bmp.r * 1.44, 1.16, bmp.r * 0.72, beige), 0, 0.82, 0.2));
    group.add(at(cyl(bmp.r * 0.5, bmp.r * 0.82, bmp.r * 0.82, beige, 4), 0, 0.82, -0.35, -Math.PI / 2, Math.PI / 4, 0));
    group.add(at(box(bmp.r * 1.12, 0.84, 0.08, screen), 0, 0.86, 0.54));
    group.add(at(ball(0.05, mat('#51cf66', { emissive: '#40c057', emissiveIntensity: 1.8 })), bmp.r * 0.48, 0.36, 0.58));
  } else if (bmp.kind === 'dell') {
    const tower = mat('#1f2329', { roughness: 0.45, metalness: 0.4 });
    const bezel = mat('#343a40', { roughness: 0.38, metalness: 0.3 });
    group.add(at(box(bmp.r * 0.88, 1.48, bmp.r * 1.56, tower), -0.22, 0.74, 0));
    group.add(at(box(bmp.r * 0.8, 1.38, 0.08, bezel), -0.22, 0.74, bmp.r * 0.78));
    // Optical drive bays + glowing blue Dell power ring
    group.add(at(box(bmp.r * 0.62, 0.14, 0.06, mat('#14171d')), -0.22, 1.24, bmp.r * 0.82));
    group.add(at(box(bmp.r * 0.62, 0.14, 0.06, mat('#14171d')), -0.22, 1.06, bmp.r * 0.82));
    group.add(at(torus(0.06, 0.02, mat('#339af0', { emissive: '#339af0', emissiveIntensity: 2.0 })), -0.22, 0.84, bmp.r * 0.83));
    group.add(at(box(bmp.r * 0.88, 0.54, bmp.r * 1.42, tower), 0.38, 0.27, 0.1, 0, 0.28, 0));
  } else {
    const reamTex = canvasTexture(128, 64, (ctx, w, h) => {
      ctx.fillStyle = '#e7f5ff';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#1c7ed6';
      ctx.fillRect(0, 0, w, 16);
      ctx.fillStyle = '#ffffff';
      ctx.font = `900 11px ${FONT_UI}`;
      ctx.textAlign = 'center';
      ctx.fillText('COPY PAPER · 500', w / 2, 12);
      ctx.fillStyle = '#1864ab';
      ctx.font = `800 14px ${FONT_MONO}`;
      ctx.fillText('8.5 x 11', w / 2, 42);
    });
    disposables.push(reamTex);
    const reamMat = new THREE.MeshStandardMaterial({ map: reamTex, roughness: 0.65 });
    disposables.push(reamMat);
    for (let i = 0; i < 4; i++) {
      group.add(at(box(bmp.r * 1.38, 0.26, bmp.r * 1.05, reamMat), 0, 0.13 + i * 0.27, 0, 0, (i % 2) * 0.18, 0));
    }
  }
  return group;
}

/** Builds a wedge-shaped sideways 3-ring binder ramp with white spine sleeve & fanned paper sheets. */
function buildBinderWedge(x, z, len, height, color, disposables) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(len, 0);
  shape.lineTo(len, height);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.55, bevelEnabled: false });
  geo.rotateY(Math.PI / 2);
  disposables.push(geo);
  const g = new THREE.Group();
  g.position.set(x - 0.27, 0, z + len / 2);
  g.add(new THREE.Mesh(geo, mat(color, { roughness: 0.45 })));
  // White paper block tucked inside the binder covers
  g.add(at(box(0.46, height * 0.72, len * 0.85, mat('#f8f9fa', { roughness: 0.85 })), 0.27, height * 0.36, -len * 0.52));
  return g;
}

/** Builds the oversized tipped-over "WORLD'S OKAYEST DEVELOPER / LEAD STANDUP" glazed ceramic mug + potted ferns. */
function buildCoffeeMugCup(cup, cupY, disposables) {
  const group = new THREE.Group();
  group.position.set(cup.x, cupY, cup.z);

  const ceramicTex = canvasTexture(512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#228be6';
    ctx.fillRect(0, 0, w, 22);
    ctx.fillRect(0, h - 22, w, 22);
    ctx.fillStyle = '#1b2430';
    ctx.font = `900 34px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText("WORLD'S OKAYEST", w / 2, 90);
    ctx.fillStyle = '#e03131';
    ctx.font = `900 36px ${FONT_MONO}`;
    ctx.fillText('DEVELOPER', w / 2, 144);
    ctx.fillStyle = '#495057';
    ctx.font = `700 22px ${FONT_UI}`;
    ctx.fillText('LEAD STANDUP', w / 2, 196);
  });
  disposables.push(ceramicTex);
  const mugMat = new THREE.MeshStandardMaterial({ map: ceramicTex, roughness: 0.18, metalness: 0.1, side: THREE.DoubleSide });
  disposables.push(mugMat);

  // Putting-return cup hole & emerald rim
  group.add(at(cyl(RTO_CUP_RADIUS, RTO_CUP_RADIUS, 0.1, mat('#0c1018'), 24), 0, 0.02, 0));
  group.add(at(torus(RTO_CUP_RADIUS + 0.06, 0.08, mat('#51cf66', { emissive: '#2f9e44', emissiveIntensity: 0.9 })), 0, 0.08, 0, Math.PI / 2, 0, 0));

  // Oversized glazed ceramic coffee mug lying on its side with rolled lip & C-handle
  const mugBody = new THREE.Group();
  mugBody.position.set(0, 1.08, -1.18);
  const cylGeo = new THREE.CylinderGeometry(1.08, 1.02, 2.25, 28, 1, true);
  disposables.push(cylGeo);
  const bodyMesh = new THREE.Mesh(cylGeo, mugMat);
  bodyMesh.rotation.x = Math.PI / 2;
  mugBody.add(bodyMesh);
  mugBody.add(at(torus(1.08, 0.06, mat('#f8f9fa', { roughness: 0.16 })), 0, 0, 1.12));
  mugBody.add(at(cyl(1.02, 1.02, 0.14, mat('#e9ecef', { roughness: 0.2 }), 26), 0, 0, -1.08, Math.PI / 2, 0, 0));
  mugBody.add(at(torus(0.58, 0.13, mat('#f8f9fa', { roughness: 0.18 })), 1.1, 0, -0.08));
  group.add(mugBody);

  // Flanking potted office ferns in terracotta planters with soil & curved fronds
  const potMat = mat('#9c522d', { roughness: 0.82 });
  const soilMat = mat('#2b1d14', { roughness: 0.95 });
  const leafMat = mat('#2b8a3e', { roughness: 0.65 });
  for (const sx of [-2.45, 2.45]) {
    group.add(at(cyl(0.45, 0.3, 0.74, potMat, 16), sx, 0.37, -0.82));
    group.add(at(torus(0.44, 0.055, potMat), sx, 0.72, -0.82, Math.PI / 2, 0, 0));
    group.add(at(cyl(0.41, 0.41, 0.05, soilMat, 14), sx, 0.71, -0.82));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      group.add(at(cone(0.24, 1.05, leafMat, 6), sx + Math.cos(a) * 0.26, 0.98, -0.82 + Math.sin(a) * 0.26, Math.sin(a) * 0.48, 0, -Math.cos(a) * 0.48));
    }
  }
  return group;
}

/** Builds the moody late-afternoon IT cubicle floor, drop ceiling, parabolic troffer lights & server racks. */
function buildOfficeFloor(scene, L, W, disposables) {
  const carpetTex = makeCarpetTexture();
  const ceilingTex = makeCeilingGridTexture();
  const fabricTex = makeCubicleFabricTexture();
  const monTex = makeMonitorTexture();
  const blindsTex = makeBlindsWindowTexture();
  disposables.push(carpetTex, ceilingTex, fabricTex, monTex, blindsTex);

  const carpetMat = new THREE.MeshStandardMaterial({ map: carpetTex, roughness: 0.95 });
  const ceilingMat = new THREE.MeshStandardMaterial({ map: ceilingTex, roughness: 0.92 });
  const fabricMat = new THREE.MeshStandardMaterial({ map: fabricTex, roughness: 0.9 });
  const monMat = new THREE.MeshStandardMaterial({ map: monTex, emissive: '#1c7ed6', emissiveIntensity: 0.65 });
  const blindsMat = new THREE.MeshStandardMaterial({ map: blindsTex, emissive: '#c97a4b', emissiveIntensity: 0.55 });
  disposables.push(carpetMat, ceilingMat, fabricMat, monMat, blindsMat);

  const trimMat = mat('#2b303a', { roughness: 0.55, metalness: 0.35 });
  const deskMat = mat('#8c6b4a', { roughness: 0.72 });
  const rackMat = mat('#181c24', { roughness: 0.5, metalness: 0.5 });
  const stickyYellow = mat('#ffe066', { roughness: 0.6 });
  const stickyPink = mat('#ff8787', { roughness: 0.6 });
  const stickyCyan = mat('#74c0fc', { roughness: 0.6 });

  // Commercial carpet floor + suspended acoustic tile ceiling
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(180, L + 90), carpetMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -0.18, -L / 2);
  scene.add(floor);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(160, L + 70), ceilingMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, 13.8, -L / 2);
  scene.add(ceiling);

  // Perimeter office walls with warm late-afternoon venetian-blind windows along the back wall
  const wallMat = mat('#2a313e', { roughness: 0.88 });
  scene.add(at(box(120, 14.5, 0.6, wallMat), 0, 7.0, -L - 12));
  scene.add(at(box(0.6, 14.5, L + 40, wallMat), -W - 14, 7.0, -L / 2));
  scene.add(at(box(0.6, 14.5, L + 40, wallMat), W + 14, 7.0, -L / 2));
  for (const wx of [-12, 0, 12]) {
    scene.add(at(plane(7.5, 5.4, blindsMat), wx, 5.8, -L - 11.6));
  }

  // Recessed 2x4 parabolic-louver ceiling troffers (with real PointLights on alternating fixtures)
  let lightIdx = 0;
  for (let z = -6; z > -L - 2; z -= 14) {
    scene.add(buildTrofferLight(0, 13.65, z, lightIdx % 2 === 0));
    scene.add(buildTrofferLight(-W - 6, 13.65, z, false));
    scene.add(buildTrofferLight(W + 6, 13.65, z, false));
    lightIdx++;
  }

  // Cubicle bays flanking left and right sides with dual monitors, stands, keyboards & sticky notes
  const baySpacing = 7.6;
  for (let z = -4; z > -L + 4; z -= baySpacing) {
    for (const side of [-1, 1]) {
      const cx = side * (W + 0.55);
      scene.add(at(box(0.28, 3.1, baySpacing - 0.5, fabricMat), cx, 1.45, z));
      scene.add(at(box(0.34, 0.14, baySpacing - 0.44, trimMat), cx, 3.04, z));
      scene.add(at(box(6.2, 3.1, 0.24, fabricMat), cx + side * 3.1, 1.45, z + baySpacing / 2));
      scene.add(at(box(6.24, 0.14, 0.3, trimMat), cx + side * 3.1, 3.04, z + baySpacing / 2));

      // Sticky notes cluster on cubicle wall
      scene.add(at(box(0.03, 0.32, 0.32, stickyYellow), cx - side * 0.16, 2.38, z - 1.1));
      scene.add(at(box(0.03, 0.32, 0.32, stickyPink), cx - side * 0.16, 2.3, z - 0.68));
      scene.add(at(box(0.03, 0.32, 0.32, stickyCyan), cx - side * 0.16, 1.94, z - 0.9));

      // Desk, monitor stand, dual angled monitors, keyboard & mouse
      const dx = cx + side * 2.4;
      scene.add(at(box(3.8, 0.14, 2.2, deskMat), dx, 1.65, z));
      scene.add(at(box(0.14, 1.65, 2.0, trimMat), dx + side * 1.6, 0.82, z));
      scene.add(at(cyl(0.06, 0.08, 0.42, trimMat, 8), dx - side * 0.4, 1.92, z - 0.62));
      scene.add(at(box(1.38, 0.84, 0.08, trimMat), dx - side * 0.4, 2.42, z - 0.6, 0, -side * 0.3, 0));
      scene.add(at(plane(1.26, 0.72, monMat), dx - side * 0.4, 2.42, z - 0.54, 0, -side * 0.3, 0));
      scene.add(at(box(0.95, 0.04, 0.34, trimMat), dx - side * 0.4, 1.75, z + 0.25));
      scene.add(at(box(0.14, 0.05, 0.22, trimMat), dx - side * 0.4 + 0.72, 1.75, z + 0.25));
    }
  }

  // Propped-open 42U server racks with blinking LEDs & catenary ethernet cables
  const leds = [];
  for (const side of [-1, 1]) {
    const rx = side * (W + 3.2);
    const rz = -L + 4.5;
    scene.add(at(box(2.2, 5.2, 2.2, rackMat), rx, 2.5, rz));
    for (let u = 0; u < 6; u++) {
      const ledMat = mat(u % 2 === 0 ? '#51cf66' : '#fcc419', {
        emissive: u % 2 === 0 ? '#40c057' : '#fab005',
        emissiveIntensity: 1.8,
      });
      const led = at(box(0.18, 0.08, 0.06, ledMat), rx - side * 0.4, 0.9 + u * 0.68, rz + 1.12);
      scene.add(led);
      leds.push({ mesh: led, phase: u * 1.1 + side });
    }
    // Draped catenary ethernet cables hanging out of the rack
    const cableCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(rx - side * 0.6, 3.6, rz + 1.1),
      new THREE.Vector3(rx - side * 1.1, 2.4, rz + 1.5),
      new THREE.Vector3(rx - side * 0.5, 1.4, rz + 1.1),
    ]);
    const cableGeo = new THREE.TubeGeometry(cableCurve, 14, 0.045, 6, false);
    disposables.push(cableGeo);
    scene.add(new THREE.Mesh(cableGeo, mat(side < 0 ? '#339af0' : '#fcc419', { roughness: 0.5 })));
  }
  return { leds };
}

/** Builds the complete indoor RTO Mini-Golf arena. */
function buildRtoArena(scene, course, disposables) {
  scene.background = new THREE.Color('#141922');
  scene.fog = new THREE.Fog('#141922', 52, 160);

  scene.add(new THREE.HemisphereLight('#c5d8f0', '#181c24', 0.95));
  const key = new THREE.DirectionalLight('#fff2db', 1.25);
  key.position.set(14, 32, 18);
  scene.add(key);
  const sunsetFill = new THREE.DirectionalLight('#f2a666', 0.55);
  sunsetFill.position.set(-16, 12, -course.length - 10);
  scene.add(sunsetFill);

  const L = course.length;
  const W = course.halfWidth;

  const { leds } = buildOfficeFloor(scene, L, W, disposables);

  // Roll-out green felt putting mat sculpted along the analytical heightmap
  const segX = 20;
  const segZ = 72;
  const turfGeo = new THREE.PlaneGeometry(W * 2, L, segX, segZ);
  turfGeo.rotateX(-Math.PI / 2);
  const pos = turfGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i) - L / 2;
    pos.setZ(i, z);
    pos.setY(i, rtoHeightAt(course, x, z));
  }
  turfGeo.computeVertexNormals();
  disposables.push(turfGeo);

  const matTex = makePuttingMatTexture();
  disposables.push(matTex);
  const turfMat = new THREE.MeshStandardMaterial({ map: matTex, roughness: 0.84 });
  disposables.push(turfMat);
  scene.add(new THREE.Mesh(turfGeo, turfMat));

  // Silver duct tape strips holding down the putting mat along the carpet seams
  const ductMat = mat('#adb5bd', { roughness: 0.42, metalness: 0.28 });
  for (let z = -3; z > -L + 3; z -= 6.5) {
    const y = rtoHeightAt(course, W, z) + 0.025;
    scene.add(at(box(1.1, 0.02, 0.36, ductMat), -W, y, z, 0, 0.08, 0));
    scene.add(at(box(1.1, 0.02, 0.36, ductMat), W, y, z, 0, -0.08, 0));
  }

  // Yellow-and-black floor cable protectors
  const cableBlack = mat('#212529', { roughness: 0.65 });
  const cableYellow = mat('#fcc419', { roughness: 0.45 });
  for (const cb of course.cableBumps) {
    scene.add(at(box(W * 1.96, 0.16, cb.width * 1.1, cableBlack), 0, 0.08, cb.z));
    scene.add(at(box(W * 1.94, 0.2, cb.width * 0.45, cableYellow), 0, 0.1, cb.z));
  }

  // Wedge-shaped 3-ring binder ramps flanking the Executive Green incline
  const rampMidZ = (course.greenRampStartZ + course.greenFlatZ) / 2;
  const rampLen = Math.abs(course.greenRampStartZ - course.greenFlatZ);
  scene.add(buildBinderWedge(-W + 0.32, rampMidZ, rampLen, course.greenHeight, '#1971c2', disposables));
  scene.add(buildBinderWedge(W - 0.32, rampMidZ, rampLen, course.greenHeight, '#c92a2a', disposables));

  // Tee-box BACKLOG duct-tape banner
  const teeTex = canvasTexture(512, 96, (ctx, w, h) => {
    ctx.fillStyle = '#146c3a';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#ffd43b';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 32px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BACKLOG · RTO TEE BOX', w / 2, h / 2);
  });
  disposables.push(teeTex);
  const teeMat = new THREE.MeshStandardMaterial({ map: teeTex, roughness: 0.75 });
  disposables.push(teeMat);
  scene.add(at(plane(W * 1.4, 1.3, teeMat), 0, 0.03, -0.95, -Math.PI / 2, 0, 0));

  // Spilled iced coffee puddles with painted Wet Floor signs
  const wetSignTex = makeWetFloorTexture();
  disposables.push(wetSignTex);
  const wetSignMat = new THREE.MeshStandardMaterial({ map: wetSignTex, roughness: 0.45 });
  disposables.push(wetSignMat);
  for (const cp of course.coffeePuddles) {
    const cy = rtoHeightAt(course, cp.x, cp.z);
    scene.add(buildCoffeePuddle(cp, cy, wetSignMat));
  }

  // Under-Desk Cable Abyss cutouts with tangled power strips
  const abyssMat = mat('#0a0c10', { roughness: 0.95 });
  for (const az of course.abyssZones) {
    const ax = (az.xMin + az.xMax) / 2;
    const azc = (az.zMin + az.zMax) / 2;
    const aw = az.xMax - az.xMin;
    const ad = az.zMax - az.zMin;
    const ay = rtoHeightAt(course, ax, azc) + 0.03;
    scene.add(at(box(aw, 0.05, ad, abyssMat), ax, ay, azc));
    scene.add(at(box(1.1, 0.14, 0.26, mat('#e9ecef')), ax, ay + 0.08, azc, 0, 0.4, 0));
    scene.add(at(torus(0.45, 0.04, mat('#fa5252')), ax - 0.3, ay + 0.09, azc + 0.3, Math.PI / 2, 0, 0));
    scene.add(at(torus(0.38, 0.04, mat('#339af0')), ax + 0.4, ay + 0.09, azc - 0.2, Math.PI / 2, 0, 0));
  }

  // Spinning 5-caster ergonomic desk chairs
  const chairMeshes = [];
  for (const ch of course.chairs) {
    const cy = rtoHeightAt(course, ch.x, ch.z);
    const chair = buildDeskChair(ch, cy, disposables);
    scene.add(chair);
    chairMeshes.push({ sim: ch, group: chair });
  }

  // BadalJwala Jammed Copier Gates
  const copierBars = [];
  for (const cp of course.copiers) {
    const cy = rtoHeightAt(course, 0, cp.z);
    const { group, bar } = buildCopierObstacle(cp, cy, W, disposables);
    scene.add(group);
    copierBars.push({ sim: cp, bar });
  }

  // Retired Hardware Bumpers (CRTs, Dell towers, labeled copy paper reams)
  for (const bmp of course.hardwareBumpers) {
    const by = rtoHeightAt(course, bmp.x, bmp.z);
    scene.add(buildHardwareBumper(bmp, by, disposables));
  }

  // ?ReturnUrl= Security Detour stanchion + sign
  const dy = rtoHeightAt(course, course.detour.x, course.detour.z);
  const detourTex = canvasTexture(256, 96, (ctx, w, h) => {
    ctx.fillStyle = '#c92a2a';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#ffe066';
    ctx.lineWidth = 5;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 28px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?ReturnUrl=', w / 2, h / 2);
  });
  disposables.push(detourTex);
  const detourMat = new THREE.MeshStandardMaterial({ map: detourTex, emissive: '#c92a2a', emissiveIntensity: 0.4 });
  disposables.push(detourMat);
  scene.add(at(cyl(course.detour.r, course.detour.r, 0.06, mat('#e03131', { emissive: '#c92a2a', emissiveIntensity: 0.6 }), 18), course.detour.x, dy + 0.03, course.detour.z));
  scene.add(at(cyl(0.24, 0.28, 0.1, mat('#212529'), 12), course.detour.x + 0.6, dy + 0.06, course.detour.z));
  scene.add(at(cyl(0.055, 0.055, 1.9, mat('#ced4da', { metalness: 0.8 }), 10), course.detour.x + 0.6, dy + 0.98, course.detour.z));
  scene.add(at(plane(2.1, 0.76, detourMat), course.detour.x + 0.6, dy + 1.95, course.detour.z + 0.05));

  // Executive Green tipped-over "WORLD'S OKAYEST DEVELOPER" ceramic coffee mug
  const cupY = rtoHeightAt(course, course.cup.x, course.cup.z);
  const mugGroup = buildCoffeeMugCup(course.cup, cupY, disposables);
  scene.add(mugGroup);

  return { chairMeshes, copierBars, mugGroup, leds, cupBaseY: cupY };
}

// ------------------------------------------------------------------ Lobby 3D Stage

export class RtoStage {
  constructor(aspect = 16 / 9, initialNames = [], { duration = DEFAULT_RTO_DURATION } = {}) {
    this.t = 0;
    this.names = [];
    this.models = [];
    this.disposables = [];
    this.course = buildRtoCourse(duration);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(48, aspect, 0.3, 240);
    this.arena = buildRtoArena(this.scene, this.course, this.disposables);
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
    const cols = Math.min(8, Math.max(2, Math.ceil(Math.sqrt(n * 1.6))));
    const spanX = Math.min(this.course.halfWidth * 1.48, (cols - 1) * 1.2);
    names.forEach((name, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const inRow = Math.min(cols, n - row * cols);
      const x = inRow === 1 ? 0 : ((col / (inRow - 1)) - 0.5) * (spanX * ((inRow - 1) / Math.max(1, cols - 1)));
      const z = -2.2 - row * 1.15;
      const kind = DEVELOPER_KINDS[i % DEVELOPER_KINDS.length];
      const visual = buildBobbleheadRoller(name, kind, kind.accent, this.disposables);
      visual.root.position.set(x, CAPSULE_R, z);
      this.scene.add(visual.root);
      this.models.push({ ...visual, baseX: x, phase: i * 0.85 });
    });
  }

  update(dt, reduced = false) {
    if (!reduced) this.t += dt;
    const t = this.t;
    for (const ch of this.arena.chairMeshes) {
      ch.group.rotation.y = reduced ? 0.5 : t * ch.sim.speed;
    }
    for (const cp of this.arena.copierBars) {
      cp.bar.visible = isCopierJammed(cp.sim, t);
    }
    if (!reduced) {
      for (const led of this.arena.leds) {
        led.mesh.visible = Math.sin(t * 5 + led.phase) > -0.2;
      }
    }
    for (const m of this.models) {
      m.root.position.x = m.baseX + (reduced ? 0 : Math.sin(t * 3.8 + m.phase) * 0.08);
      m.bobble.rotation.z = reduced ? 0 : Math.sin(t * 5.2 + m.phase) * 0.16;
    }
    const sway = reduced ? 0 : Math.sin(t * 0.3) * 4.4;
    this.camera.position.set(sway, 9.2, 8.6);
    this.camera.lookAt(0, 1.3, -18);
  }

  dispose() {
    for (const d of this.disposables) d.dispose?.();
  }
}

// ------------------------------------------------------------------ Live Match

export class RtoMatch {
  constructor(names, { duration = DEFAULT_RTO_DURATION, rng = Math.random, sfx = null, onEvent = null, onWinner = null } = {}) {
    this.sim = new RtoSim({ names, duration, rng });
    this.sfx = sfx;
    this.onEvent = onEvent;
    this.onWinner = onWinner;
    this.accumulator = 0;
    this.winnerAnnounced = false;
    this.leaderTimer = 0;
    this.trailTimer = 0;
    this.disposables = [];

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.3, 240);
    this.arena = buildRtoArena(this.scene, this.sim.course, this.disposables);
    this.particles = new Particles(this.scene);

    this.ballVisuals = this.sim.balls.map((b, i) => {
      const kind = DEVELOPER_KINDS[i % DEVELOPER_KINDS.length];
      const visual = buildBobbleheadRoller(b.name, kind, b.color, this.disposables);
      visual.root.position.set(b.x, b.y + CAPSULE_R, b.z);
      this.scene.add(visual.root);
      return { sim: b, ...visual, phase: i * 0.9 };
    });

    this.camPos = new THREE.Vector3(0, 9.2, 8.6);
    this.camLook = new THREE.Vector3(0, 1.3, -18);
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

    for (const ch of this.arena.chairMeshes) {
      ch.group.rotation.y = t * ch.sim.speed;
    }
    for (const cp of this.arena.copierBars) {
      cp.bar.visible = isCopierJammed(cp.sim, t);
    }
    for (const led of this.arena.leds) {
      led.mesh.visible = Math.sin(t * 5 + led.phase) > -0.2;
    }

    this.trailTimer += realDt;
    const emitTrail = this.trailTimer >= 0.08;
    if (emitTrail) this.trailTimer = 0;

    for (const bv of this.ballVisuals) {
      const b = bv.sim;
      bv.root.position.set(b.x, b.y + (b.sunk ? -0.1 : CAPSULE_R), b.z);
      if (!b.sunk) {
        const speed = Math.hypot(b.vx, b.vz);
        // Outer gachapon shell rolls with authentic velocity while inner bobblehead stays upright & wobbles!
        bv.shell.rotation.x += (b.vz * realDt) / CAPSULE_R;
        bv.shell.rotation.z -= (b.vx * realDt) / CAPSULE_R;
        bv.bobble.rotation.z = Math.sin(t * (5 + speed * 0.8) + bv.phase) * Math.min(0.32, 0.1 + speed * 0.015);
        bv.bobble.rotation.x = Math.max(-0.25, Math.min(0.25, b.vz * 0.014));
      }
      if (!b.sunk && emitTrail && Math.hypot(b.vx, b.vz) > 2.2) {
        this.particles.burst(new THREE.Vector3(b.x, b.y + 0.14, b.z), {
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
          text: `🏢 1st: ${lead.name} • ${lead.distToPin.toFixed(1)}m to Mug`,
        });
      }
    }

    this.particles.update(realDt);

    // Dynamic 3-Shot Camera: Tee-Off -> Cubicle Follow -> Mug Cam
    const wantPos = new THREE.Vector3();
    const wantLook = new THREE.Vector3();
    const order = this.sim.standings();
    const top1 = order[0];
    if (!this.sim.teedOff) {
      wantPos.set(Math.sin(t * 0.8) * 3.0, 9.2, 8.6);
      wantLook.set(0, 1.3, -18);
    } else if (this.sim.winner || (top1 && top1.distToPin < 5.5)) {
      wantPos.set(c.cup.x + 5.6, this.arena.cupBaseY + 3.8, c.cup.z + 8.6);
      wantLook.set(c.cup.x, this.arena.cupBaseY + 0.8, c.cup.z - 0.6);
    } else {
      const topN = order.slice(0, Math.min(4, order.length));
      const avgX = topN.reduce((s, b) => s + b.x, 0) / topN.length;
      const avgZ = topN.reduce((s, b) => s + b.z, 0) / topN.length;
      const avgY = topN.reduce((s, b) => s + b.y, 0) / topN.length;
      wantPos.set(avgX * 0.45, avgY + 10.6, avgZ + 14.0);
      wantLook.set(avgX * 0.6, avgY + 0.9, avgZ - 7.5);
    }

    this.camPos.lerp(wantPos, Math.min(1, realDt * 4.2));
    this.camLook.lerp(wantLook, Math.min(1, realDt * 5.0));
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
  }

  handleEvent(e) {
    if (e.type === 'teeOff') {
      this.sfx?.play?.('golfPutt');
      this.onEvent?.({ type: 'note', text: '🏢 TEE OFF! Bobblehead cubicle chaos underway!', important: true });
    } else if (e.type === 'putt') {
      this.sfx?.play?.('golfPutt');
    } else if (e.type === 'wall') {
      this.sfx?.play?.('golfClack');
    } else if (e.type === 'lipout') {
      this.sfx?.play?.('golfClack');
      this.onEvent?.({ type: 'note', text: `😱 ${e.ball.name} lipped out of the coffee mug!`, important: true });
    } else if (e.type === 'hazard') {
      if (e.kind === 'abyss') {
        this.sfx?.play?.('golfSplash');
        this.particles.burst(new THREE.Vector3(e.x, 0.2, e.z), {
          count: 14,
          colors: ['#fa5252', '#ffd43b', '#ffffff'],
          speed: 3.8,
          up: 5.0,
          life: 0.7,
          size: 0.2,
          gravity: 11,
        });
      } else {
        this.sfx?.play?.('golfClack');
      }
      this.onEvent?.({ type: 'hazard', ball: e.ball, kind: e.kind, popup: e.popup });
    } else if (e.type === 'note') {
      this.onEvent?.(e);
    } else if (e.type === 'cup' && !this.winnerAnnounced) {
      this.winnerAnnounced = true;
      this.sfx?.play?.('golfCup');
      this.sfx?.fanfare?.();
      this.particles.burst(new THREE.Vector3(this.sim.course.cup.x, this.arena.cupBaseY + 1.0, this.sim.course.cup.z), {
        count: 65,
        colors: ['#ffd43b', '#51cf66', '#339af0', '#ff6b6b', '#ffffff'],
        speed: 7.5,
        up: 9.5,
        life: 1.9,
        size: 0.28,
        gravity: 12,
      });
      this.onWinner?.(e.ball, this.sim);
    }
  }

  dispose() {
    for (const d of this.disposables) d.dispose?.();
  }
}
