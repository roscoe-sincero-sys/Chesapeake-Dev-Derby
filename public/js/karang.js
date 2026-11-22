// "Karang Derby" (3D Bamboo Stilt Wobble Race): glowing twilight Cebu-meets-Chesapeake fiesta
// boulevard with cobblestone asphalt, glowing paper lanterns, crisscross banderitas & dangling
// CAT-6 cables, wooden barricades with cheering crowd silhouettes, segmented bamboo (kawayan) or
// coconut-shell (bagol) stilts, Claw-of-Destiny bobblehead stilt-walkers with floating balance
// meters, PanganodSilab crosswind streaks, and dramatic slow-motion ribbon finish cam.

import * as THREE from 'three';
import { mat, box, ball, cyl, cone, torus, plane, at, canvasTexture, FONT_UI, FONT_MONO, roundRect } from './util3d.js';
import { Particles } from './effects.js';
import { DEVELOPER_KINDS } from './deathmatch-sim.js';
import {
  planKarangMatch,
  sampleKarangRunner,
  BOULEVARD_HALF_W,
  START_Z,
  DEFAULT_KARANG_DURATION,
  DEFAULT_KARANG_STILTS,
} from './karang-sim.js';

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

/** Dark twilight cobblestone-and-asphalt fiesta boulevard texture. */
function makeCobbleRoadTexture() {
  const tex = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#1b1f2c';
    ctx.fillRect(0, 0, w, h);
    // Subtle cobblestone rows
    for (let row = 0; row < 16; row++) {
      const y = row * 16;
      const off = (row % 2) * 16;
      for (let col = -1; col < 9; col++) {
        const x = col * 32 + off;
        ctx.fillStyle = (row + col) % 2 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.12)';
        ctx.fillRect(x + 1, y + 1, 30, 14);
      }
    }
    // Faint glowing fiesta lane stripes
    ctx.fillStyle = 'rgba(255, 212, 59, 0.25)';
    ctx.fillRect(10, 0, 4, h);
    ctx.fillRect(w - 14, 0, 4, h);
  });
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 28);
  return tex;
}

/** Upright player nameplate sprite above each tall stilt-walker. */
function makeKarangTag(name, color) {
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
  sprite.scale.set(2.35, 0.58, 1);
  return { sprite, tex, spriteMat };
}

/** Builds a segmented bamboo (kawayan) stilt pole with node rings, footrest block & glowing color tape. */
function buildBambooPole(color, height = 3.2) {
  const g = new THREE.Group();
  const bambooMat = mat('#829e4c', { roughness: 0.58 });
  const nodeMat = mat('#4f632b', { roughness: 0.72 });
  const tapeMat = mat(color, { emissive: color, emissiveIntensity: 0.65, roughness: 0.4 });
  const woodMat = mat('#8c6b4a', { roughness: 0.8 });

  // Main segmented bamboo shaft
  g.add(at(cyl(0.06, 0.068, height, bambooMat, 10), 0, height / 2, 0));
  for (let y = 0.5; y < height - 0.2; y += 0.58) {
    g.add(at(torus(0.066, 0.015, nodeMat), 0, y, 0, Math.PI / 2, 0, 0));
  }
  // Glowing team-color grip tape bands
  g.add(at(cyl(0.066, 0.066, 0.22, tapeMat, 10), 0, height * 0.72, 0));
  g.add(at(cyl(0.068, 0.068, 0.16, tapeMat, 10), 0, 0.45, 0));
  // Notched wooden footrest at stilt standing height (~1.65m up)
  g.add(at(box(0.24, 0.12, 0.34, woodMat), 0, 1.65, -0.06));
  return g;
}

/** Builds a realistic Bagol (coconut-shell) stilt unit with half-coconut & taut glowing rope. */
function buildBagolShell(color) {
  const g = new THREE.Group();
  const shellMat = mat('#5c3a21', { roughness: 0.88 });
  const ropeMat = mat(color, { emissive: color, emissiveIntensity: 0.6, roughness: 0.5 });
  const shellGeo = new THREE.SphereGeometry(0.22, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55);
  const shell = new THREE.Mesh(shellGeo, shellMat);
  shell.position.y = 0.02;
  g.add(shell);
  // Taut rope rising up to the dev's hand
  g.add(at(cyl(0.018, 0.018, 1.35, ropeMat, 6), 0, 0.72, -0.05));
  return g;
}

/**
 * Builds an articulated stilt-walker with a Claw-of-Destiny bobblehead portrait, windmilling arms,
 * bamboo or bagol stilts, and a curved balance-meter halo that flashes red before a wipeout!
 */
function buildStiltWalker(name, kind, color, stiltStyle, disposables) {
  const root = new THREE.Group();
  const pivot = new THREE.Group(); // Tilts around ground contact for inverted-pendulum wobble!
  root.add(pivot);

  const isBagol = stiltStyle === 'bagol';
  const standY = isBagol ? 0.24 : 1.72;

  const leftStilt = isBagol ? buildBagolShell(color) : buildBambooPole(color, 3.25);
  leftStilt.position.set(-0.28, 0, 0);
  const rightStilt = isBagol ? buildBagolShell(color) : buildBambooPole(color, 3.25);
  rightStilt.position.set(0.28, 0, 0);
  pivot.add(leftStilt, rightStilt);

  // Articulated developer body perched on the stilts
  const body = new THREE.Group();
  body.position.set(0, standY, 0);
  const shirtMat = mat(kind.shirt ?? color, { roughness: 0.6 });
  const pantsMat = mat('#2b303a', { roughness: 0.85 });

  // Legs
  body.add(at(cyl(0.1, 0.09, 0.68, pantsMat, 8), -0.22, 0.34, 0));
  body.add(at(cyl(0.1, 0.09, 0.68, pantsMat, 8), 0.22, 0.34, 0));
  // Torso
  body.add(at(cyl(0.27, 0.23, 0.78, shirtMat, 12), 0, 1.06, 0));
  // Windmilling arms (pivoting at shoulders)
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.34, 1.35, 0);
  leftArm.add(at(cyl(0.08, 0.07, 0.64, shirtMat, 8), -0.22, -0.1, 0, 0, 0, Math.PI / 2 - 0.35));
  const rightArm = new THREE.Group();
  rightArm.position.set(0.34, 1.35, 0);
  rightArm.add(at(cyl(0.08, 0.07, 0.64, shirtMat, 8), 0.22, -0.1, 0, 0, 0, -Math.PI / 2 + 0.35));
  body.add(leftArm, rightArm);

  // Claw-of-Destiny bobblehead portrait head
  const head = new THREE.Group();
  head.position.set(0, 1.78, 0);
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
  body.add(head);

  // Curved Balance Meter halo above the head (green -> amber -> red)
  const meterMat = new THREE.MeshStandardMaterial({
    color: '#51cf66',
    emissive: '#40c057',
    emissiveIntensity: 1.4,
    roughness: 0.3,
  });
  const meter = at(torus(0.48, 0.045, meterMat), 0, 2.32, 0, Math.PI / 2, 0, 0);
  body.add(meter);

  const tag = makeKarangTag(name, kind.accent ?? color);
  tag.sprite.position.set(0, 2.82, 0);
  body.add(tag.sprite);

  pivot.add(body);
  disposables.push(faceGeo, faceMat, meterMat, tag.tex, tag.spriteMat);

  return { root, pivot, body, leftStilt, rightStilt, leftArm, rightArm, head, meterMat };
}

/** Procedural high-detail lunar surface texture with basaltic maria, impact craters & Tycho rays. */
function makeFullMoonTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const r = w * 0.48;
    ctx.clearRect(0, 0, w, h);

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    // Base sunlit lunar regolith with soft limb shading
    const base = ctx.createRadialGradient(cx - r * 0.12, cy - r * 0.14, r * 0.08, cx, cy, r);
    base.addColorStop(0, '#fffdf5');
    base.addColorStop(0.55, '#ede7d5');
    base.addColorStop(0.86, '#cfc7b2');
    base.addColorStop(1, '#9c9584');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);

    // Realistic lunar maria (Sea of Tranquility, Mare Imbrium, Oceanus Procellarum, Mare Serenitatis)
    const maria = [
      { x: 0.36, y: 0.38, rx: 0.19, ry: 0.15, rot: -0.3, a: 0.34 },
      { x: 0.57, y: 0.34, rx: 0.13, ry: 0.12, rot: 0.2, a: 0.30 },
      { x: 0.64, y: 0.50, rx: 0.14, ry: 0.11, rot: -0.2, a: 0.32 },
      { x: 0.28, y: 0.56, rx: 0.16, ry: 0.18, rot: 0.4, a: 0.28 },
      { x: 0.47, y: 0.54, rx: 0.12, ry: 0.09, rot: 0.1, a: 0.25 },
      { x: 0.72, y: 0.44, rx: 0.07, ry: 0.06, rot: 0, a: 0.36 }, // Mare Crisium
    ];
    for (const m of maria) {
      ctx.save();
      ctx.translate(m.x * w, m.y * h);
      ctx.rotate(m.rot);
      const mg = ctx.createRadialGradient(0, 0, m.rx * w * 0.1, 0, 0, m.rx * w);
      mg.addColorStop(0, `rgba(92, 96, 108, ${m.a})`);
      mg.addColorStop(0.65, `rgba(104, 108, 120, ${m.a * 0.72})`);
      mg.addColorStop(1, 'rgba(110, 114, 126, 0)');
      ctx.fillStyle = mg;
      ctx.scale(1, m.ry / m.rx);
      ctx.beginPath();
      ctx.arc(0, 0, m.rx * w, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Fine surface regolith mottling
    for (let i = 0; i < 600; i++) {
      const a = (i * 2.39996) % (Math.PI * 2);
      const d = Math.sqrt((i % 200) / 200) * r * 0.96;
      const x = cx + Math.cos(a) * d;
      const y = cy + Math.sin(a) * d;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,248,0.08)' : 'rgba(72,76,88,0.09)';
      ctx.beginPath();
      ctx.arc(x, y, 2 + (i % 6), 0, Math.PI * 2);
      ctx.fill();
    }

    // Crisp impact craters with subtle shadow & bright sunlit rim
    const craters = [
      [0.44, 0.76, 16], [0.34, 0.48, 13], [0.58, 0.62, 11], [0.66, 0.34, 9],
      [0.29, 0.36, 10], [0.51, 0.42, 8], [0.42, 0.64, 9], [0.62, 0.72, 12],
      [0.36, 0.70, 7], [0.54, 0.26, 8], [0.70, 0.58, 8], [0.24, 0.48, 7],
    ];
    for (const [fx, fy, cr] of craters) {
      const x = fx * w;
      const y = fy * h;
      ctx.fillStyle = 'rgba(78, 82, 94, 0.28)';
      ctx.beginPath();
      ctx.arc(x - cr * 0.14, y - cr * 0.14, cr, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 253, 240, 0.38)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(x + cr * 0.08, y + cr * 0.08, cr * 0.92, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Subtle Tycho ejecta rays radiating from the southern crater
    const tx = 0.44 * w;
    const ty = 0.76 * h;
    ctx.strokeStyle = 'rgba(255, 253, 242, 0.18)';
    ctx.lineWidth = 2.2;
    for (let i = 0; i < 9; i++) {
      const ang = -2.6 + i * 0.42;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx + Math.cos(ang) * 145, ty + Math.sin(ang) * 145);
      ctx.stroke();
    }

    ctx.restore();
  });
}

/** Soft luminous twilight halo texture surrounding the full moon. */
function makeMoonHaloTexture() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const g = ctx.createRadialGradient(cx, cy, w * 0.14, cx, cy, w * 0.5);
    g.addColorStop(0, 'rgba(255, 249, 226, 0.62)');
    g.addColorStop(0.32, 'rgba(218, 232, 255, 0.24)');
    g.addColorStop(0.68, 'rgba(130, 165, 235, 0.07)');
    g.addColorStop(1, 'rgba(16, 21, 42, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

/** Places a realistic full moon with atmospheric halo and twilight stars high in the sky. */
function buildTwilightFullMoon(scene, L, disposables) {
  const moonZ = -L - 46;
  const moonX = -14;
  const moonY = 30;

  // Soft outer atmospheric twilight glow
  const haloTex = makeMoonHaloTexture();
  const haloMat = new THREE.SpriteMaterial({
    map: haloTex,
    transparent: true,
    depthWrite: false,
    fog: false,
    blending: THREE.AdditiveBlending,
  });
  const halo = new THREE.Sprite(haloMat);
  halo.position.set(moonX, moonY, moonZ - 1);
  halo.scale.set(44, 44, 1);
  scene.add(halo);

  // Crisp full moon disc with detailed maria & craters (fog: false so it stays luminous!)
  const moonTex = makeFullMoonTexture();
  const moonMat = new THREE.SpriteMaterial({
    map: moonTex,
    transparent: true,
    depthWrite: false,
    fog: false,
  });
  const moonSprite = new THREE.Sprite(moonMat);
  moonSprite.position.set(moonX, moonY, moonZ);
  moonSprite.scale.set(16.5, 16.5, 1);
  scene.add(moonSprite);

  // Subtle evening starfield scattered across the deep indigo sky
  const starPts = [];
  for (let i = 0; i < 95; i++) {
    const sx = ((i * 73) % 160) - 80;
    const sy = 16 + ((i * 41) % 44);
    const sz = -L - 40 - ((i * 29) % 30);
    starPts.push(sx, sy, sz);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPts, 3));
  const starMat = new THREE.PointsMaterial({ color: '#e7f0ff', size: 0.42, transparent: true, opacity: 0.72, fog: false });
  scene.add(new THREE.Points(starGeo, starMat));

  disposables.push(haloTex, haloMat, moonTex, moonMat, starGeo, starMat);
}

/** Builds the glowing twilight Cebu-meets-Chesapeake fiesta boulevard! */
function buildKarangArena(scene, plan, disposables) {
  scene.background = new THREE.Color('#10152a');
  scene.fog = new THREE.Fog('#10152a', 55, 185);

  scene.add(new THREE.HemisphereLight('#748ffc', '#1b1a2a', 1.0));
  const moon = new THREE.DirectionalLight('#e7f0ff', 1.25);
  moon.position.set(-14, 38, -24);
  scene.add(moon);

  const L = plan.length;
  const W = BOULEVARD_HALF_W;

  // Realistic glowing full moon & evening stars high above the fiesta boulevard
  buildTwilightFullMoon(scene, L, disposables);

  // Cobblestone fiesta boulevard
  const roadTex = makeCobbleRoadTexture();
  disposables.push(roadTex);
  const roadMat = new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.88 });
  disposables.push(roadMat);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, L + 34), roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0, -L / 2 - 4);
  scene.add(road);

  // Wooden Chesapeake-fiesta barricades + cheering crowd silhouettes along both sides
  const woodMat = mat('#5c4033', { roughness: 0.88 });
  const crowdMat = mat('#1d2233', { roughness: 0.9 });
  const lanternColors = ['#ff6b6b', '#ffd43b', '#38bdf8', '#51cf66', '#f06595'];
  const banderitas = [];

  for (const side of [-1, 1]) {
    const bx = side * (W + 0.55);
    scene.add(at(box(0.28, 1.15, L + 28, woodMat), bx, 0.58, -L / 2 - 2));
    for (let z = 4; z > -L - 12; z -= 6.5) {
      // Pier piling / fiesta post + glowing paper lantern
      scene.add(at(cyl(0.18, 0.22, 6.2, woodMat, 8), side * (W + 1.1), 3.1, z));
      const lCol = lanternColors[Math.abs(Math.round(z)) % lanternColors.length];
      scene.add(at(ball(0.36, mat(lCol, { emissive: lCol, emissiveIntensity: 1.5 }), 1, 1.25, 1), side * (W + 0.4), 5.6, z));
      // Cheering crowd silhouettes behind the barricade
      for (let c = 0; c < 2; c++) {
        const cz = z - c * 2.4;
        scene.add(at(cyl(0.26, 0.22, 1.35, crowdMat, 8), side * (W + 1.9 + c * 0.4), 0.7, cz));
        scene.add(at(ball(0.22, crowdMat), side * (W + 1.9 + c * 0.4), 1.62, cz));
      }
    }
  }

  // Crisscross low-hanging fiesta banderitas & dangling CAT-6 cables overhead
  const ropeMat = mat('#adb5bd', { roughness: 0.8 });
  for (let z = -4; z > -L + 4; z -= 11) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-W - 1.1, 6.2, z),
      new THREE.Vector3(0, 4.95, z - 1.5),
      new THREE.Vector3(W + 1.1, 6.2, z - 3.0),
    ]);
    const ropeGeo = new THREE.TubeGeometry(curve, 16, 0.03, 5, false);
    disposables.push(ropeGeo);
    scene.add(new THREE.Mesh(ropeGeo, ropeMat));

    for (let f = 1; f <= 11; f++) {
      const pt = curve.getPoint(f / 12);
      const col = lanternColors[(Math.abs(z) + f) % lanternColors.length];
      const flag = at(cone(0.34, 0.68, mat(col, { emissive: col, emissiveIntensity: 0.5 }), 3), pt.x, pt.y - 0.34, pt.z, Math.PI, 0, 0);
      scene.add(flag);
      banderitas.push({ mesh: flag, phase: z + f * 0.6 });
    }
  }

  // Chalk start line
  const chalkMat = mat('#3bc9db', { emissive: '#22b8cf', emissiveIntensity: 1.4 });
  scene.add(at(box(W * 1.9, 0.03, 0.22, chalkMat), 0, 0.02, START_Z - 0.6));

  // Spilled-coffee slick patches along the boulevard
  const slickMat = mat('#442614', { roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.88 });
  for (const sl of plan.slicks) {
    scene.add(at(cyl(sl.r, sl.r, 0.03, slickMat, 20), sl.x, 0.02, sl.z));
  }

  // Glowing orange PanganodSilab crosswind streak group (visible during wind gust!)
  const windGroup = new THREE.Group();
  const streakMat = mat('#ff922b', { emissive: '#f76707', emissiveIntensity: 1.8, transparent: true, opacity: 0.72 });
  for (let i = 0; i < 16; i++) {
    windGroup.add(at(box(5.5, 0.08, 0.08, streakMat), (i % 4 - 1.5) * 4.5, 1.5 + (i % 5) * 0.95, -L * (0.25 + (i / 16) * 0.55)));
  }
  windGroup.visible = false;
  scene.add(windGroup);

  // Glowing FINISH · LEAD STANDUP arch & breakable tape ribbon
  const archZ = plan.finishZ;
  const archMat = mat('#212529', { roughness: 0.45, metalness: 0.5 });
  const signTex = canvasTexture(512, 96, (ctx, w, h) => {
    ctx.fillStyle = '#121626';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#ffd43b';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = '#ffd43b';
    ctx.font = `900 36px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FINISH · LEAD STANDUP', w / 2, h / 2);
  });
  disposables.push(signTex);
  const signMat = new THREE.MeshStandardMaterial({ map: signTex, emissive: '#f59f00', emissiveIntensity: 0.45 });
  disposables.push(signMat);

  scene.add(at(cyl(0.24, 0.28, 7.6, archMat, 12), -W, 3.8, archZ));
  scene.add(at(cyl(0.24, 0.28, 7.6, archMat, 12), W, 3.8, archZ));
  scene.add(at(box(W * 2 + 0.6, 1.35, 0.4, archMat), 0, 7.3, archZ));
  scene.add(at(plane(W * 1.5, 1.15, signMat), 0, 7.3, archZ + 0.24));

  // Breakable glowing finish ribbon
  const ribbon = at(box(W * 1.9, 0.22, 0.06, mat('#ff6b6b', { emissive: '#fa5252', emissiveIntensity: 1.5 })), 0, 2.75, archZ);
  scene.add(ribbon);

  return { banderitas, windGroup, ribbon };
}

// ------------------------------------------------------------------ Lobby 3D Stage

export class KarangStage {
  constructor(aspect = 16 / 9, initialNames = [], { duration = DEFAULT_KARANG_DURATION, stilts = DEFAULT_KARANG_STILTS } = {}) {
    this.t = 0;
    this.names = [];
    this.stilts = stilts;
    this.models = [];
    this.disposables = [];
    this.plan = planKarangMatch(initialNames.length >= 2 ? initialNames : ['Ada', 'Grace'], { duration, stilts });

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(48, aspect, 0.3, 360);
    this.arena = buildKarangArena(this.scene, this.plan, this.disposables);
    this.setLineup(initialNames, { stilts });
    this.resize(aspect);
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 1 ? 62 : 48;
    this.camera.updateProjectionMatrix();
  }

  setLineup(names = [], { stilts = this.stilts } = {}) {
    if (stilts === this.stilts && names.length === this.names.length && names.every((n, i) => n === this.names[i])) return;
    for (const m of this.models) this.scene.remove(m.root);
    this.models = [];
    this.names = [...names];
    this.stilts = stilts;

    const n = Math.max(1, names.length);
    const perRow = n <= 10 ? n : Math.ceil(n / (n <= 20 ? 2 : 3));
    const spanX = Math.min(BOULEVARD_HALF_W * 1.62, Math.max(3.6, (perRow - 1) * 1.45));
    names.forEach((name, i) => {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const inRow = Math.min(perRow, n - row * perRow);
      const x = inRow === 1 ? 0 : ((col / (inRow - 1)) - 0.5) * spanX;
      const z = START_Z + row * 1.9;
      const kind = DEVELOPER_KINDS[i % DEVELOPER_KINDS.length];
      const walker = buildStiltWalker(name, kind, kind.accent, stilts, this.disposables);
      walker.root.position.set(x, 0, z);
      this.scene.add(walker.root);
      this.models.push({ ...walker, phase: i * 0.8 });
    });
  }

  update(dt, reduced = false) {
    if (!reduced) this.t += dt;
    const t = this.t;
    for (const m of this.models) {
      const wob = reduced ? 0 : Math.sin(t * 3.8 + m.phase) * 0.14;
      m.pivot.rotation.z = wob;
      m.leftArm.rotation.z = Math.sin(t * 6 + m.phase) * 0.35;
      m.rightArm.rotation.z = -Math.sin(t * 6 + m.phase) * 0.35;
    }
    if (!reduced) {
      for (const b of this.arena.banderitas) b.mesh.rotation.z = Math.sin(t * 3.5 + b.phase) * 0.18;
    }
    // Low-angle upward tilt looking up at the towering bamboo stilts against the banderitas
    const sway = reduced ? 0 : Math.sin(t * 0.32) * 3.4;
    this.camera.position.set(sway, 3.2, 11.2);
    this.camera.lookAt(0, 3.0, -14);
  }

  dispose() {
    for (const d of this.disposables) d.dispose?.();
  }
}

// ------------------------------------------------------------------ Live Match

export class KarangMatch {
  constructor(names, { duration = DEFAULT_KARANG_DURATION, stilts = DEFAULT_KARANG_STILTS, rng = Math.random, sfx = null, onEvent = null, onWinner = null } = {}) {
    this.plan = planKarangMatch(names, { duration, stilts, rng });
    this.sfx = sfx;
    this.onEvent = onEvent;
    this.onWinner = onWinner;
    this.time = 0;
    this.done = false;
    this.started = false;
    this.windAnnounced = false;
    this.clackTimer = 0;
    this.leaderTimer = 0;
    this.wipeoutsAnnounced = new Set();
    this.disposables = [];

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.3, 360);
    this.arena = buildKarangArena(this.scene, this.plan, this.disposables);
    this.particles = new Particles(this.scene);

    this.walkers = this.plan.runners.map((r, i) => {
      const kind = DEVELOPER_KINDS[i % DEVELOPER_KINDS.length];
      const w = buildStiltWalker(r.name, kind, r.color, this.plan.stilts, this.disposables);
      w.root.position.set(r.laneX, 0, r.startZ);
      this.scene.add(w.root);
      return { sim: r, ...w };
    });

    this.camPos = new THREE.Vector3(0, 3.2, 11.2);
    this.camLook = new THREE.Vector3(0, 3.0, -14);
    this.resize(window.innerWidth / window.innerHeight);
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 1 ? 64 : 50;
    this.camera.updateProjectionMatrix();
  }

  update(realDt) {
    // 0.45x slow-motion photo-finish teeter during the final 1.2s!
    const inPhotoFinish = this.time > this.plan.finishAt - 1.1 && this.time < this.plan.finishAt + 0.35;
    const dt = inPhotoFinish ? realDt * 0.45 : realDt;
    if (!this.done) this.time += dt;
    const t = this.time;
    const p = this.plan;

    if (!this.started && t >= p.startAt) {
      this.started = true;
      this.sfx?.play?.('karangClack');
      this.onEvent?.({ type: 'status', text: '🎋 DAGAN! STILT STOMP-OFF UNDERWAY!', tone: 'green' });
      this.onEvent?.({ type: 'note', text: '🎋 DAGAN! Hollow bamboo clacks thunder down the boulevard!', important: true });
    }

    // PanganodSilab crosswind gust
    const inWind = t >= p.windAt && t <= p.windEnd;
    this.arena.windGroup.visible = inWind;
    if (inWind) {
      this.arena.windGroup.position.x = ((t * 24) % 14) - 7;
      if (!this.windAnnounced) {
        this.windAnnounced = true;
        this.onEvent?.({ type: 'status', text: '💨 PANGANODSILAB 500 CROSSWIND GUST!', tone: 'yellow' });
        this.onEvent?.({ type: 'note', text: `💨 ${p.windPopup}`, important: true });
      }
    }

    // Periodic hollow bamboo / bagol clack cadence while racing
    if (this.started && !this.done) {
      this.clackTimer += realDt;
      const clackRate = p.stilts === 'bagol' ? 0.16 : 0.24;
      if (this.clackTimer >= clackRate) {
        this.clackTimer = 0;
        this.sfx?.play?.('karangClack');
      }
    }

    // Update every stilt-walker
    let leadZ = 0;
    let leadRunner = null;
    for (const w of this.walkers) {
      const st = sampleKarangRunner(w.sim, p, t);
      w.root.position.set(st.x, 0, st.z);

      if (st.fallen) {
        // Gravity-driven Timber Fall arc!
        w.pivot.rotation.z = (w.sim.id % 2 === 0 ? 1 : -1) * st.fallProgress * (Math.PI * 0.48);
        w.pivot.rotation.x = st.fallProgress * 0.35;
        if (!this.wipeoutsAnnounced.has(w.sim.id)) {
          this.wipeoutsAnnounced.add(w.sim.id);
          this.sfx?.play?.('karangSnap');
          this.particles.burst(new THREE.Vector3(st.x, 1.5, st.z), {
            count: 16,
            colors: ['#a9e34b', '#ffd43b', '#ff6b6b'],
            speed: 4.5,
            up: 5.5,
            life: 0.8,
            size: 0.2,
            gravity: 13,
          });
          this.onEvent?.({ type: 'note', text: `💥 ${w.sim.name}: “${w.sim.wipeout.popup}”`, important: w.sim.isRunnerUp });
        }
      } else {
        w.pivot.rotation.z = st.leanZ;
        w.pivot.rotation.x = st.leanX;
        w.leftStilt.position.y = st.leftLift;
        w.rightStilt.position.y = st.rightLift;
        w.leftArm.rotation.z = Math.sin(t * 11 + w.sim.id) * st.armFlail;
        w.rightArm.rotation.z = -Math.sin(t * 11 + w.sim.id) * st.armFlail;
      }

      // Color-shifting Balance Meter halo (green -> amber -> red)
      const col = st.balanceDanger > 0.72 ? '#ff4d4f' : st.balanceDanger > 0.42 ? '#fcc419' : '#51cf66';
      w.meterMat.color.set(col);
      w.meterMat.emissive.set(col);

      if (!st.fallen && (leadRunner === null || st.z < leadZ)) {
        leadZ = st.z;
        leadRunner = { name: w.sim.name, z: st.z };
      }
    }

    for (const b of this.arena.banderitas) b.mesh.rotation.z = Math.sin(t * (inWind ? 11 : 3.5) + b.phase) * (inWind ? 0.55 : 0.18);

    this.leaderTimer += realDt;
    if (this.leaderTimer >= 0.22 && this.started && !this.done && leadRunner && !inWind) {
      this.leaderTimer = 0;
      const rem = Math.max(0, Math.abs(p.finishZ - leadRunner.z));
      this.onEvent?.({ type: 'status', text: `🎋 1st: ${leadRunner.name} • ${rem.toFixed(1)}m to Finish`, tone: 'green' });
    }

    // Winner snaps the glowing finish ribbon!
    if (!this.done && t >= p.finishAt) {
      this.done = true;
      this.arena.ribbon.visible = false;
      this.sfx?.play?.('karangWin');
      this.sfx?.fanfare?.();
      this.particles.burst(new THREE.Vector3(p.winner.laneX, 2.8, p.finishZ), {
        count: 68,
        colors: ['#ffd43b', '#ff6b6b', '#51cf66', '#38bdf8', '#ffffff'],
        speed: 7.8,
        up: 9.2,
        life: 1.9,
        size: 0.28,
        gravity: 12,
      });
      this.onWinner?.(p.winner, p);
    }

    this.particles.update(realDt);

    // 3-Shot Dynamic Camera: Start Line Low-Angle -> Mid-Race Side Dolly -> Finish Line Ribbon Cam
    const wantPos = new THREE.Vector3();
    const wantLook = new THREE.Vector3();
    if (!this.started) {
      wantPos.set(Math.sin(t * 0.8) * 2.5, 3.0, 11.2);
      wantLook.set(0, 3.0, -14);
    } else if (t > p.finishAt - 2.2) {
      // Tight low-angle ribbon cam looking straight down the final stretch
      wantPos.set(4.5, 2.8, p.finishZ - 7.5);
      wantLook.set(0, 2.6, p.finishZ + 5.0);
    } else {
      // Elevated 3/4 sweeping side-dolly tracking the lead pack
      wantPos.set(10.5, 7.6, leadZ + 12.5);
      wantLook.set(0, 2.4, leadZ - 4.5);
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
