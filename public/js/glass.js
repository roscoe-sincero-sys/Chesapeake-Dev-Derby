// "Glass Bridge Deploy" (Tempered vs. Untested Prod Panes): high-altitude Squid-Game-inspired
// glass catwalk suspended over a pitch-black data-center chasm illuminated by twin rows of warm
// golden carnival bulbs, distant blinking emerald/crimson server-rack LEDs, brushed-gunmetal steel
// bridge rails, reflective glass pane pairs (TESTED cyan edge-glow vs. UNTESTED PROD shatter bursts),
// Pink-jumpsuit Scrum Guards with glowing circle/triangle/square Jira masks on the DEPLOYED TO PROD
// gantry, tracksuit devs with numbered vests (01–30) & portrait faces, DARK MODE blackout flash,
// 0.4x slow-mo final leap, domino-shatter bridge detonation & 360-degree PROD gantry victory orbit!

import * as THREE from 'three';
import { mat, box, ball, cyl, torus, plane, at, canvasTexture, FONT_UI, FONT_MONO, roundRect } from './util3d.js';
import { Particles } from './effects.js';
import { DEVELOPER_KINDS } from './deathmatch-sim.js';
import {
  GlassSim,
  PAIR_SPACING,
  LANE_OFFSET_X,
  pairZ,
  DEFAULT_GLASS_DURATION,
  DEFAULT_GLASS_RULE,
} from './glass-sim.js';

const STEP = 1 / 60;
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

/** Glowing overhead DEPLOYED TO PROD gantry billboard texture. */
function makeProdBannerTexture() {
  return canvasTexture(1024, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, '#0f172a');
    g.addColorStop(0.5, '#1e1b4b');
    g.addColorStop(1, '#0f172a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, w - 20, h - 20);

    ctx.fillStyle = '#38bdf8';
    ctx.font = `900 72px ${FONT_UI}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DEPLOY TO CLINIC', w / 2, 108);

    ctx.fillStyle = '#ffd43b';
    ctx.font = `800 30px ${FONT_MONO}`;
    ctx.fillText('○ AIRBAGS DEPLOYED  ·  △ STILL LATE  ·  □ ZERO CONCERN', w / 2, 192);
  });
}

/** Numbered chest vest texture ("01".."30") for tracksuit devs. */
function makeVestTexture(vestNum, bgColor) {
  return canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f8fafc';
    roundRect(ctx, 18, 22, w - 36, h - 44, 14);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.font = `900 58px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(vestNum, w / 2, h / 2 + 2);
  });
}

/** Upright high-contrast player nameplate sprite. */
function makeGlassTag(name, vest, color) {
  const tex = canvasTexture(256, 64, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    roundRect(ctx, 10, 8, w - 20, h - 16, 14);
    ctx.fillStyle = 'rgba(10, 14, 24, 0.94)';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = '#f8f9fa';
    ctx.font = `700 22px ${FONT_UI}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const short = name.length > 12 ? `${name.slice(0, 11)}…` : name;
    ctx.fillText(`#${vest} ${short}`, w / 2, h / 2 + 1);
  });
  const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(2.25, 0.56, 1);
  sprite.position.set(0, 2.48, 0);
  return { sprite, tex, spriteMat };
}

/** Builds a realistic standing corporate executive guard (tailored suit, tie, face, hair, glasses & Jira-shape clipboard) at the DEPLOY TO CLINIC gantry! */
function buildExecutiveGuard(x, y, z, shape, idx = 0) {
  const profiles = [
    { suit: '#1f2937', shirt: '#f8fafc', tie: '#dc2626', skin: '#c68652', hair: '#1a1614', hairStyle: 'part', glasses: true, beard: true },
    { suit: '#181c24', shirt: '#ffffff', tie: '#d97706', skin: '#d8a47f', hair: '#4a4e57', hairStyle: 'swept', glasses: true, beard: false },
    { suit: '#1e3a5f', shirt: '#e0f2fe', tie: '#e11d48', skin: '#8d5524', hair: '#151210', hairStyle: 'bun', glasses: false, beard: false },
  ];
  const p = profiles[idx % profiles.length];

  const g = new THREE.Group();
  g.position.set(x, y, z);

  const suitMat = mat(p.suit, { roughness: 0.6, metalness: 0.08 });
  const shirtMat = mat(p.shirt, { roughness: 0.5 });
  const tieMat = mat(p.tie, { roughness: 0.35, metalness: 0.12 });
  const skinMat = mat(p.skin, { roughness: 0.58 });
  const hairMat = mat(p.hair, { roughness: 0.72 });
  const shoeMat = mat('#111318', { roughness: 0.24, metalness: 0.25 });
  const chromeMat = mat('#ced4da', { roughness: 0.2, metalness: 0.85 });

  // Tailored trousers & polished leather dress shoes
  for (const s of [-1, 1]) {
    g.add(at(cyl(0.115, 0.095, 0.88, suitMat, 10), s * 0.16, 0.5, 0));
    g.add(at(box(0.15, 0.1, 0.28, shoeMat), s * 0.16, 0.05, 0.05));
  }

  // Tailored suit jacket, rounded shoulders, dress shirt V-front, angled lapels, pocket square & silk necktie
  g.add(at(box(0.62, 0.72, 0.34, suitMat), 0, 1.32, 0));
  for (const s of [-1, 1]) {
    g.add(at(ball(0.15, suitMat), s * 0.33, 1.59, 0));
  }
  g.add(at(box(0.22, 0.48, 0.05, shirtMat), 0, 1.44, 0.165));
  g.add(at(cyl(0.11, 0.12, 0.1, shirtMat, 10), 0, 1.7, 0.01));
  g.add(at(box(0.09, 0.44, 0.06, suitMat), -0.14, 1.44, 0.175, 0, 0, -0.18));
  g.add(at(box(0.09, 0.44, 0.06, suitMat), 0.14, 1.44, 0.175, 0, 0, 0.18));
  g.add(at(box(0.08, 0.045, 0.02, shirtMat), 0.2, 1.52, 0.185, 0, 0, 0.12));
  g.add(at(box(0.072, 0.068, 0.055, tieMat), 0, 1.63, 0.188));
  g.add(at(box(0.07, 0.4, 0.04, tieMat), 0, 1.39, 0.192));
  g.add(at(box(0.075, 0.018, 0.046, chromeMat), 0, 1.43, 0.198));

  // Left arm relaxed at side; right arm holding up a glowing executive clipboard with Jira priority badge (○ / △ / □)
  g.add(at(cyl(0.09, 0.075, 0.64, suitMat, 10), -0.39, 1.28, 0.02, 0, 0, 0.1));
  g.add(at(cyl(0.07, 0.068, 0.06, shirtMat, 10), -0.42, 0.94, 0.02));
  g.add(at(box(0.085, 0.11, 0.09, skinMat), -0.43, 0.86, 0.02));

  g.add(at(cyl(0.09, 0.075, 0.36, suitMat, 10), 0.39, 1.42, 0.08, -0.35, 0, -0.14));
  g.add(at(cyl(0.075, 0.068, 0.34, suitMat, 10), 0.42, 1.25, 0.26, Math.PI / 2 - 0.35, 0, 0));
  g.add(at(cyl(0.066, 0.064, 0.05, shirtMat, 10), 0.42, 1.31, 0.41, Math.PI / 2 - 0.35, 0, 0));
  g.add(at(box(0.09, 0.08, 0.1, skinMat), 0.42, 1.33, 0.47));

  // Executive clipboard with glowing ○, △, or □ emblem
  const board = new THREE.Group();
  board.position.set(0.42, 1.48, 0.52);
  board.rotation.x = -0.25;
  board.add(box(0.38, 0.48, 0.04, mat('#1e293b', { roughness: 0.4 })));
  board.add(at(box(0.16, 0.06, 0.06, chromeMat), 0, 0.22, 0.02));
  const glowMat = mat('#f8fafc', { emissive: '#38bdf8', emissiveIntensity: 1.8 });
  if (shape === 'circle') {
    board.add(at(torus(0.1, 0.02, glowMat), 0, -0.02, 0.03));
  } else if (shape === 'triangle') {
    board.add(at(cyl(0.12, 0.12, 0.02, glowMat, 3), 0, -0.02, 0.03, Math.PI / 2, 0, 0));
  } else {
    board.add(at(box(0.18, 0.18, 0.025, glowMat), 0, -0.02, 0.03));
  }
  g.add(board);

  // Realistic executive head, neck, ears, nose, eyes, brows, styled hair, glasses & Bluetooth earpiece
  g.add(at(cyl(0.075, 0.085, 0.14, skinMat, 10), 0, 1.76, 0.01));
  const head = new THREE.Group();
  head.position.set(0, 1.96, 0.02);
  g.add(head);

  const cranium = ball(0.21, skinMat);
  cranium.scale.set(0.92, 1.08, 0.96);
  head.add(cranium);
  head.add(at(ball(0.04, skinMat), -0.195, -0.01, -0.01));
  head.add(at(ball(0.04, skinMat), 0.195, -0.01, -0.01));
  head.add(at(box(0.038, 0.065, 0.05, skinMat), 0, -0.01, 0.2));

  const whiteMat = mat('#f8fafc', { roughness: 0.2 });
  const darkMat = mat('#111827', { roughness: 0.2 });
  for (const s of [-1, 1]) {
    head.add(at(ball(0.026, whiteMat), s * 0.068, 0.035, 0.182));
    head.add(at(ball(0.016, darkMat), s * 0.068, 0.035, 0.2));
    head.add(at(box(0.062, 0.015, 0.02, hairMat), s * 0.068, 0.078, 0.186, 0, 0, -s * 0.12));
  }
  head.add(at(box(0.068, 0.016, 0.02, mat('#8c4a3e', { roughness: 0.6 })), 0, -0.085, 0.188));

  if (p.beard) {
    head.add(at(box(0.09, 0.024, 0.03, hairMat), 0, -0.056, 0.194));
    const chin = ball(0.115, hairMat);
    chin.scale.set(1.06, 0.7, 0.84);
    head.add(at(chin, 0, -0.125, 0.1));
  }

  const hairCap = ball(0.215, hairMat);
  hairCap.scale.set(0.95, 0.85, 1.0);
  head.add(at(hairCap, 0, 0.075, -0.025));
  if (p.hairStyle === 'part') {
    head.add(at(box(0.28, 0.08, 0.22, hairMat), 0.03, 0.19, 0.04, 0, 0, -0.08));
  } else if (p.hairStyle === 'bun') {
    head.add(at(ball(0.105, hairMat), 0, 0.12, -0.22));
  } else {
    head.add(at(box(0.32, 0.1, 0.28, hairMat), 0, 0.18, -0.02, -0.15, 0, 0));
  }

  if (p.glasses) {
    const lensMat = mat('#cbd5e1', { roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.35 });
    for (const s of [-1, 1]) {
      head.add(at(torus(0.046, 0.008, chromeMat), s * 0.07, 0.035, 0.205));
      head.add(at(cyl(0.042, 0.042, 0.006, lensMat, 12), s * 0.07, 0.035, 0.205, Math.PI / 2, 0, 0));
      head.add(at(box(0.012, 0.012, 0.22, chromeMat), s * 0.125, 0.038, 0.1));
    }
    head.add(at(box(0.048, 0.01, 0.01, chromeMat), 0, 0.038, 0.208));
  }

  // Glowing cyan executive Bluetooth earpiece
  head.add(at(cyl(0.04, 0.04, 0.022, darkMat, 10), 0.215, 0.0, 0.0, 0, 0, Math.PI / 2));
  head.add(at(ball(0.013, mat('#38bdf8', { emissive: '#38bdf8', emissiveIntensity: 1.8 })), 0.228, 0.014, 0.01));

  return g;
}

/** Builds a realistic arched-davit highway bridge lamp post with cobra-head luminaire & warm light cone! */
function buildHighwayLampPost(side, z, steelMat, concreteMat, lampGlowMat, coneMat, disposables) {
  const g = new THREE.Group();
  g.position.set(side * 11.0, 0, z);
  const darkMetal = mat('#2a323f', { roughness: 0.42, metalness: 0.78 });

  // Bolted concrete mounting plinth + flared octagonal steel base flange
  g.add(at(box(0.68, 0.65, 0.68, concreteMat), 0, 0.32, 0));
  g.add(at(cyl(0.18, 0.26, 0.42, darkMetal, 8), 0, 0.84, 0));
  // Tapered galvanized steel mast
  g.add(at(cyl(0.085, 0.165, 7.2, steelMat, 10), 0, 4.45, 0));
  // Smooth arched gooseneck davit arm curving out over the asphalt lane
  const armCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 7.75, 0),
    new THREE.Vector3(-side * 0.45, 8.65, 0),
    new THREE.Vector3(-side * 1.45, 9.05, 0),
    new THREE.Vector3(-side * 2.45, 8.88, 0),
  ]);
  const armGeo = new THREE.TubeGeometry(armCurve, 14, 0.068, 8, false);
  disposables.push(armGeo);
  g.add(new THREE.Mesh(armGeo, steelMat));

  // Die-cast aluminum cobra-head luminaire housing + warm glowing LED lens + soft downward light cone
  const headX = -side * 2.75;
  const headY = 8.84;
  g.add(at(box(1.15, 0.22, 0.52, darkMetal), headX, headY, 0, 0, 0, side * 0.06));
  g.add(at(box(0.86, 0.12, 0.4, steelMat), headX + side * 0.08, headY + 0.12, 0, 0, 0, side * 0.06));
  g.add(at(box(0.82, 0.08, 0.36, lampGlowMat), headX - side * 0.06, headY - 0.12, 0, 0, 0, side * 0.06));
  // Soft volumetric dusk light cone illuminating the outer accident lane
  g.add(at(cyl(0.32, 3.6, 8.5, coneMat, 16, true), headX - side * 0.15, headY - 4.4, 0));

  return g;
}

/** Builds a tracksuit developer with numbered vest (01–30) and developer portrait head! */
function buildBridgePlayer(name, vest, kind, color, disposables) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const suitMat = mat(color, { roughness: 0.52 });
  const vestTex = makeVestTexture(vest, color);
  const vestMat = new THREE.MeshStandardMaterial({ map: vestTex, roughness: 0.48 });
  disposables.push(vestTex, vestMat);

  const leftLeg = at(cyl(0.09, 0.08, 0.62, suitMat, 8), -0.14, 0.31, 0);
  const rightLeg = at(cyl(0.09, 0.08, 0.62, suitMat, 8), 0.14, 0.31, 0);
  body.add(leftLeg, rightLeg);
  body.add(at(box(0.46, 0.72, 0.28, vestMat), 0, 0.98, 0));
  const leftArm = at(cyl(0.07, 0.06, 0.54, suitMat, 8), -0.32, 1.04, 0);
  const rightArm = at(cyl(0.07, 0.06, 0.54, suitMat, 8), 0.32, 1.04, 0);
  body.add(leftArm, rightArm);

  const head = new THREE.Group();
  head.position.set(0, 1.66, 0);
  head.add(at(cyl(0.41, 0.41, 0.14, mat(kind.accent ?? color, { roughness: 0.35 }), 24), 0, 0, 0, Math.PI / 2, 0, 0));
  const portraitTex = getDeveloperPortraitTexture(kind.id);
  const faceMat = new THREE.MeshStandardMaterial({ map: portraitTex, roughness: 0.32 });
  const faceGeo = new THREE.CircleGeometry(0.38, 24);
  const front = new THREE.Mesh(faceGeo, faceMat);
  front.position.set(0, 0, 0.076);
  const back = new THREE.Mesh(faceGeo, faceMat);
  back.rotation.y = Math.PI;
  back.position.set(0, 0, -0.076);
  head.add(front, back);
  body.add(head);

  const tag = makeGlassTag(name, vest, color);
  root.add(tag.sprite);
  disposables.push(faceGeo, faceMat, tag.tex, tag.spriteMat);
  return { root, body, leftLeg, rightLeg, leftArm, rightArm, head };
}

/** Weathered highway asphalt texture with crisp painted lane markings. */
function makeAsphaltLaneTexture() {
  const tex = canvasTexture(256, 512, (ctx, w, h) => {
    ctx.fillStyle = '#2b3038';
    ctx.fillRect(0, 0, w, h);
    // Subtle road aggregate grain
    for (let i = 0; i < 420; i++) {
      const x = (i * 73) % w;
      const y = (i * 137) % h;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.08)';
      ctx.fillRect(x, y, 3, 3);
    }
    // Outer solid white edge stripe & inner solid yellow curb stripe
    ctx.fillStyle = '#e9ecef';
    ctx.fillRect(14, 0, 8, h);
    ctx.fillStyle = '#fcc419';
    ctx.fillRect(w - 22, 0, 8, h);
    // Dashed center white lane divider
    ctx.fillStyle = '#f1f3f5';
    for (let y = 20; y < h; y += 92) {
      ctx.fillRect(w / 2 - 4, y, 8, 44);
    }
  });
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 5);
  return tex;
}

/** Soft, organic multi-lobe radial smoke puff texture for realistic rising radiator smoke. */
function makeSmokePuffTexture() {
  return canvasTexture(128, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const puffs = [
      [64, 64, 46, 'rgba(185, 194, 206, 0.55)'],
      [48, 56, 32, 'rgba(215, 222, 232, 0.45)'],
      [80, 60, 30, 'rgba(155, 165, 178, 0.45)'],
      [62, 78, 30, 'rgba(120, 130, 145, 0.40)'],
    ];
    for (const [cx, cy, r, col] of puffs) {
      const g = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
      g.addColorStop(0, col);
      g.addColorStop(0.6, col.replace(/[\d.]+\)$/, '0.18)'));
      g.addColorStop(1, 'rgba(160, 170, 185, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/** Builds a realistic commuter car (sculpted hood, sloped windshields, pillars, grille, mirrors, alloy wheels & animated radiator smoke)! */
function buildAccidentCar({
  x, z, color = '#e03131', rotY = 0, tiltX = 0, tiltZ = 0,
  isSuv = false, isVan = false, hoodPop = false, airbag = false,
  hazardMat = null, smokeTex = null, smokePlumes = null, disposables = null,
}) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.set(tiltX, rotY, tiltZ);
  if (Math.abs(tiltZ) > 2.2) g.position.y = 1.5; // Rolled upside-down on its roof!

  const bodyMat = mat(color, { roughness: 0.24, metalness: 0.52 });
  const darkTrim = mat('#1a1e26', { roughness: 0.72, metalness: 0.2 });
  const glassMat = mat('#162231', { roughness: 0.08, metalness: 0.78 });
  const chromeMat = mat('#dee2e6', { roughness: 0.18, metalness: 0.92 });
  const tireMat = mat('#13161b', { roughness: 0.9 });
  const alloyMat = mat('#ced4da', { roughness: 0.22, metalness: 0.88 });
  const headMat = mat('#fff9db', { emissive: '#ffe066', emissiveIntensity: 1.8 });
  const tailMat = mat('#ff6b6b', { emissive: '#e03131', emissiveIntensity: 1.8 });
  const plateMat = mat('#f1f3f5', { roughness: 0.4 });

  const carW = isVan ? 2.16 : isSuv ? 2.02 : 1.92;
  const carL = isVan ? 4.65 : isSuv ? 4.35 : 4.22;
  const deckY = 0.42;
  const lowerH = isVan ? 0.92 : isSuv ? 0.74 : 0.62;
  const beltY = deckY + lowerH;

  // Dark underbody rocker skirt + sculpted main lower body + slight nose taper
  g.add(at(box(carW - 0.08, 0.18, carL - 0.12, darkTrim), 0, deckY, 0));
  g.add(at(box(carW, lowerH, carL - 0.28, bodyMat), 0, deckY + lowerH / 2, 0));
  // Front hood fascia & rear trunk deck
  g.add(at(box(carW - 0.06, lowerH * 0.82, 0.95, bodyMat), 0, deckY + lowerH * 0.42, -carL / 2 + 0.46, 0.06, 0, 0));
  g.add(at(box(carW - 0.06, lowerH * 0.88, 0.82, bodyMat), 0, deckY + lowerH * 0.45, carL / 2 - 0.4));

  // Front & rear molded bumpers (crooked slightly if crashed!) + license plates + radiator grille
  const bumpTwist = hoodPop ? 0.06 : 0;
  g.add(at(box(carW + 0.06, 0.26, 0.26, darkTrim), 0, deckY + 0.1, -carL / 2 - 0.05, 0, 0, bumpTwist));
  g.add(at(box(carW + 0.06, 0.26, 0.26, darkTrim), 0, deckY + 0.1, carL / 2 + 0.05));
  g.add(at(box(carW * 0.46, 0.24, 0.08, darkTrim), 0, deckY + 0.36, -carL / 2 - 0.02));
  g.add(at(box(carW * 0.42, 0.04, 0.1, chromeMat), 0, deckY + 0.4, -carL / 2 - 0.03));
  g.add(at(box(carW * 0.42, 0.04, 0.1, chromeMat), 0, deckY + 0.31, -carL / 2 - 0.03));
  g.add(at(box(0.46, 0.16, 0.04, plateMat), 0, deckY + 0.14, -carL / 2 - 0.18));
  g.add(at(box(0.46, 0.16, 0.04, plateMat), 0, deckY + 0.16, carL / 2 + 0.18));

  // Sculpted Greenhouse Cabin (angled front windshield, roof panel, angled rear window & A/B/C pillars)
  const cabH = isVan ? 0.78 : isSuv ? 0.64 : 0.56;
  const roofL = isVan ? 3.15 : isSuv ? 2.15 : 1.55;
  const roofZ = isVan ? 0.34 : isSuv ? 0.38 : 0.24;
  const cabW = carW - 0.28;
  // Roof panel
  g.add(at(box(cabW, 0.09, roofL, bodyMat), 0, beltY + cabH, roofZ));
  // Tinted side windows core
  g.add(at(box(cabW - 0.02, cabH - 0.06, roofL + 0.28, glassMat), 0, beltY + cabH / 2, roofZ));
  // Sloped front windshield
  const frontGlassZ = roofZ - roofL / 2 - 0.24;
  g.add(at(box(cabW - 0.06, cabH * 1.18, 0.07, glassMat), 0, beltY + cabH * 0.5, frontGlassZ, 0.54, 0, 0));
  // Sloped rear window
  const rearGlassZ = roofZ + roofL / 2 + (isVan ? 0.04 : 0.22);
  g.add(at(box(cabW - 0.06, cabH * (isVan ? 1.0 : 1.16), 0.07, glassMat), 0, beltY + cabH * 0.5, rearGlassZ, isVan ? -0.1 : -0.5, 0, 0));
  // Body-colored A, B, C pillars & side wing mirrors
  for (const s of [-1, 1]) {
    g.add(at(box(0.08, cabH * 1.18, 0.09, bodyMat), s * (cabW / 2 - 0.02), beltY + cabH * 0.5, frontGlassZ, 0.54, 0, 0));
    g.add(at(box(0.08, cabH, 0.1, darkTrim), s * (cabW / 2 + 0.01), beltY + cabH * 0.5, roofZ - 0.08));
    g.add(at(box(0.08, cabH * 1.12, 0.12, bodyMat), s * (cabW / 2 - 0.02), beltY + cabH * 0.5, rearGlassZ, isVan ? -0.1 : -0.48, 0, 0));
    // Side wing mirrors & chrome door handles
    g.add(at(box(0.22, 0.13, 0.14, bodyMat), s * (carW / 2 + 0.08), beltY + 0.12, frontGlassZ - 0.05));
    g.add(at(box(0.04, 0.05, 0.22, chromeMat), s * (carW / 2 + 0.01), beltY - 0.12, roofZ - 0.25));
  }

  // Crashed popped/buckled hood over dark engine bay + animated wispy radiator smoke plume!
  if (hoodPop) {
    // Dark engine bay block under open hood
    g.add(at(box(carW - 0.45, 0.28, 0.95, darkTrim), 0, beltY - 0.04, -carL / 2 + 0.65));
    g.add(at(box(0.65, 0.24, 0.55, mat('#495057', { metalness: 0.7 })), 0, beltY + 0.08, -carL / 2 + 0.65));
    // Buckled open hood angled upward
    g.add(at(box(carW - 0.18, 0.09, 1.24, bodyMat), 0, beltY + 0.36, -carL / 2 + 0.8, 0.52, 0, 0.05));
    if (smokeTex && smokePlumes) {
      const plumeOrigin = new THREE.Vector3(0, beltY + 0.25, -carL / 2 + 0.55);
      const puffs = [];
      for (let i = 0; i < 8; i++) {
        const smMat = new THREE.SpriteMaterial({
          map: smokeTex,
          transparent: true,
          depthWrite: false,
          opacity: 0.5,
        });
        disposables?.push(smMat);
        const sp = new THREE.Sprite(smMat);
        g.add(sp);
        puffs.push({ sprite: sp, mat: smMat, phase: i / 8, drift: (i % 3 - 1) * 0.22 });
      }
      smokePlumes.push({ origin: plumeOrigin, puffs });
    }
  }

  // Optional puffed white AirbagFlare 502 visible inside front windshield!
  if (airbag) {
    const bag = ball(0.32, mat('#f8fafc', { roughness: 0.45, emissive: '#e2e8f0', emissiveIntensity: 0.25 }));
    bag.scale.set(1.15, 0.95, 0.75);
    g.add(at(bag, -0.34, beltY + 0.24, frontGlassZ + 0.18));
  }

  // Detailed 4 wheels with dark wheel wells, rubber tires & brushed-alloy hubs
  for (const [wx, wz] of [[-carW / 2 - 0.02, -carL * 0.31], [carW / 2 + 0.02, -carL * 0.31], [-carW / 2 - 0.02, carL * 0.31], [carW / 2 + 0.02, carL * 0.31]]) {
    g.add(at(cyl(0.41, 0.41, 0.24, darkTrim, 14), wx * 0.94, 0.44, wz, 0, 0, Math.PI / 2));
    g.add(at(cyl(0.37, 0.37, 0.26, tireMat, 16), wx, 0.37, wz, 0, 0, Math.PI / 2));
    g.add(at(cyl(0.22, 0.22, 0.28, alloyMat, 12), wx, 0.37, wz, 0, 0, Math.PI / 2));
    g.add(at(cyl(0.08, 0.08, 0.3, darkTrim, 8), wx, 0.37, wz, 0, 0, Math.PI / 2));
  }

  // Projector headlights, red wrap-around taillights & blinking amber hazard lights
  for (const sx of [-carW * 0.35, carW * 0.35]) {
    g.add(at(box(0.38, 0.15, 0.08, chromeMat), sx, deckY + 0.42, -carL / 2 - 0.01));
    g.add(at(box(0.3, 0.11, 0.09, headMat), sx, deckY + 0.42, -carL / 2 - 0.02));
    g.add(at(box(0.42, 0.17, 0.08, tailMat), sx, deckY + 0.44, carL / 2 + 0.01));
    if (hazardMat) {
      g.add(at(box(0.16, 0.12, 0.1, hazardMat), sx * 1.24, deckY + 0.42, -carL / 2 - 0.02));
      g.add(at(box(0.16, 0.12, 0.1, hazardMat), sx * 1.24, deckY + 0.44, carL / 2 + 0.02));
    }
  }
  return g;
}

/** Builds an orange traffic cone with reflective white collar. */
function buildTrafficCone(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const orange = mat('#fd7e14', { roughness: 0.45 });
  g.add(at(box(0.46, 0.06, 0.46, orange), 0, 0.03, 0));
  g.add(at(cyl(0.06, 0.19, 0.62, orange, 10), 0, 0.34, 0));
  g.add(at(cyl(0.1, 0.13, 0.12, mat('#f8fafc', { emissive: '#ffffff', emissiveIntensity: 0.35 }), 10), 0, 0.44, 0));
  return g;
}

/** Builds a tall steel highway suspension bridge tower with cross-bracing. */
function buildSuspensionTower(z, steelMat) {
  const g = new THREE.Group();
  g.position.set(0, 0, z);
  for (const side of [-1, 1]) {
    g.add(at(box(1.35, 34, 1.45, steelMat), side * 11.4, 7.5, 0));
  }
  g.add(at(box(23.5, 1.35, 1.1, steelMat), 0, 21.5, 0));
  g.add(at(box(23.5, 1.0, 0.9, steelMat), 0, 14.5, 0));
  return g;
}

/** Builds the 4-lane commuter suspension bridge: 2 middle glass-panel lanes + 2 outer street lanes with car accidents! */
function buildGlassArena(scene, pairs, disposables) {
  scene.background = new THREE.Color('#162338');
  scene.fog = new THREE.Fog('#162338', 58, 170);

  const hemi = new THREE.HemisphereLight('#c5d8f0', '#1c2433', 1.05);
  scene.add(hemi);
  const key = new THREE.DirectionalLight('#ffd8a8', 1.35);
  key.position.set(16, 28, 18);
  scene.add(key);

  const pairCount = pairs.length;
  const startZ = pairZ(0, pairCount);
  const prodZ = pairZ(pairCount + 1, pairCount);
  const bridgeLen = startZ - prodZ;
  const midZ = (startZ + prodZ) / 2;

  // Shimmering deep-blue dusk river/bay water far below the bridge (y = -18)
  scene.add(at(plane(240, 240, mat('#0f2742', { roughness: 0.22, metalness: 0.45 })), 0, -18, midZ, -Math.PI / 2, 0, 0));

  const steelMat = mat('#3b4657', { roughness: 0.38, metalness: 0.78 });
  const towerMat = mat('#8c2d2d', { roughness: 0.45, metalness: 0.55 }); // Iconic bridge red-oxide steel towers
  const concreteMat = mat('#868e96', { roughness: 0.85 });
  const deckMat = mat('#2b3038', { roughness: 0.72 });

  // Tall Suspension Bridge Towers & Sweeping Steel Cables
  scene.add(buildSuspensionTower(startZ + 2.5, towerMat));
  scene.add(buildSuspensionTower(prodZ - 2.5, towerMat));
  for (const side of [-1, 1]) {
    const cx = side * 11.4;
    const cablePts = [];
    for (let i = 0; i <= 16; i++) {
      const u = i / 16;
      const cz = (startZ + 2.5) - u * (bridgeLen + 5);
      const sag = Math.sin(u * Math.PI) * 11.5;
      cablePts.push(new THREE.Vector3(cx, 23.0 - sag, cz));
      if (i > 0 && i < 16 && i % 2 === 0) {
        const hangerH = 23.0 - sag;
        scene.add(at(cyl(0.06, 0.06, hangerH, steelMat, 6), cx, hangerH / 2, cz));
      }
    }
    const cableCurve = new THREE.CatmullRomCurve3(cablePts);
    const cableGeo = new THREE.TubeGeometry(cableCurve, 24, 0.22, 6, false);
    disposables.push(cableGeo);
    scene.add(new THREE.Mesh(cableGeo, steelMat));
  }

  // Start & Finish Full-Width Highway Bridge Approaches (connecting all 4 lanes!)
  scene.add(at(box(22.6, 0.75, 7.2, deckMat), 0, -0.38, startZ + 2.6));
  scene.add(at(box(22.6, 0.75, 7.4, deckMat), 0, -0.38, prodZ - 2.7));
  const pinkTrim = mat('#f43f5e', { emissive: '#e11d48', emissiveIntensity: 1.5 });
  scene.add(at(box(6.2, 0.14, 0.2, pinkTrim), 0, 0.04, startZ - 0.95));
  scene.add(at(box(6.2, 0.14, 0.2, pinkTrim), 0, 0.04, prodZ + 0.95));

  // TWO OUTER REGULAR STREET LANES (Left x = -7.0, Right x = +7.0) flanking the middle glass chasm!
  const asphaltTex = makeAsphaltLaneTexture();
  const asphaltMat = new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.86 });
  disposables.push(asphaltTex, asphaltMat);
  const LANE_W = 7.4;
  for (const side of [-1, 1]) {
    const lx = side * 7.0;
    // Concrete bridge deck slab + asphalt street surface
    scene.add(at(box(LANE_W, 0.75, bridgeLen + 2.0, concreteMat), lx, -0.38, midZ));
    scene.add(at(plane(LANE_W, bridgeLen + 2.0, asphaltMat), lx, 0.01, midZ, -Math.PI / 2, 0, side === 1 ? Math.PI : 0));
    // Outer concrete Jersey barrier & steel bridge guardrail
    scene.add(at(box(0.55, 1.05, bridgeLen + 14.5, concreteMat), side * 10.95, 0.52, midZ));
    scene.add(at(box(0.18, 0.18, bridgeLen + 14.5, steelMat), side * 11.15, 1.45, midZ));
    // Inner low hazard curb separating street lanes from the middle glass panels
    scene.add(at(box(0.36, 0.34, bridgeLen + 1.0, concreteMat), side * 3.15, 0.17, midZ));
  }

  // Realistic arched-davit Highway Streetlights lining both outer bridge barriers
  const lampGlowMat = new THREE.MeshStandardMaterial({ color: '#fff3bf', emissive: '#ffd43b', emissiveIntensity: 1.9 });
  const coneMat = new THREE.MeshBasicMaterial({
    color: '#ffe8a3',
    transparent: true,
    opacity: 0.08,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  disposables.push(lampGlowMat, coneMat);
  const lampCount = Math.max(4, Math.floor(pairCount / 2) + 1);
  for (let i = 0; i < lampCount; i++) {
    const lz = startZ - (i / Math.max(1, lampCount - 1)) * bridgeLen;
    for (const side of [-1, 1]) {
      scene.add(buildHighwayLampPost(side, lz, steelMat, concreteMat, lampGlowMat, coneMat, disposables));
    }
  }

  // Blinking amber hazard lights, pulsing red road flares & animated wispy smoke plumes for car accidents!
  const hazardMat = new THREE.MeshStandardMaterial({ color: '#ff922b', emissive: '#ff922b', emissiveIntensity: 2.2 });
  const flareMat = new THREE.MeshStandardMaterial({ color: '#ff6b6b', emissive: '#ef4444', emissiveIntensity: 2.4 });
  const smokeTex = makeSmokePuffTexture();
  disposables.push(hazardMat, flareMat, smokeTex);
  const smokePlumes = [];

  // Stage comical car accidents along BOTH outer street lanes!
  const zAt = (u) => startZ - u * bridgeLen;
  // 1. Left Lane (front): Rear-end fender bender (Red SUV rear-ended a Blue Sedan, popped hood + rising smoke!)
  scene.add(buildAccidentCar({ x: -7.2, z: zAt(0.18), color: '#228be6', rotY: 0.08, hazardMat }));
  scene.add(buildAccidentCar({ x: -6.9, z: zAt(0.18) + 4.2, color: '#e03131', rotY: -0.14, isSuv: true, hoodPop: true, airbag: true, hazardMat, smokeTex, smokePlumes, disposables }));
  scene.add(buildTrafficCone(-4.6, zAt(0.18) + 2.1));
  scene.add(buildTrafficCone(-4.8, zAt(0.18) + 5.8));

  // 2. Right Lane (front): Spun-out yellow hatchback nose-first into the concrete Jersey barrier + AirbagFlare 502!
  scene.add(buildAccidentCar({ x: 7.4, z: zAt(0.28), color: '#fab005', rotY: -0.78, tiltX: -0.05, airbag: true, hoodPop: true, hazardMat, smokeTex, smokePlumes, disposables }));
  scene.add(buildTrafficCone(4.8, zAt(0.28) - 1.8));
  scene.add(buildTrafficCone(5.0, zAt(0.28) + 2.2));
  scene.add(at(cyl(0.12, 0.12, 0.25, flareMat, 8), 5.2, 0.12, zAt(0.28) + 3.2));

  // 3. Left Lane (mid-far): Upside-down rolled silver sedan on its roof with red emergency road flares!
  scene.add(buildAccidentCar({ x: -6.8, z: zAt(0.64), color: '#adb5bd', rotY: 0.35, tiltZ: Math.PI - 0.12, hazardMat }));
  scene.add(at(cyl(0.12, 0.12, 0.25, flareMat, 8), -4.6, 0.12, zAt(0.64) + 2.6));
  scene.add(at(cyl(0.12, 0.12, 0.25, flareMat, 8), -4.8, 0.12, zAt(0.64) - 2.6));

  // 4. Right Lane (mid-far): Commuter pileup behind a stalled white delivery van!
  scene.add(buildAccidentCar({ x: 7.1, z: zAt(0.74), color: '#f1f3f5', rotY: Math.PI + 0.06, isVan: true, hazardMat }));
  scene.add(buildAccidentCar({ x: 6.7, z: zAt(0.74) - 4.4, color: '#2b8a3e', rotY: Math.PI - 0.22, hoodPop: true, airbag: true, hazardMat, smokeTex, smokePlumes, disposables }));
  scene.add(buildTrafficCone(4.7, zAt(0.74) - 2.1));

  // Overhead glowing "DEPLOY TO PROD" highway gantry arch & Pink Scrum Guards at the finish!
  const bannerTex = makeProdBannerTexture();
  bannerTex.anisotropy = 4;
  const bannerMat = new THREE.MeshBasicMaterial({ map: bannerTex });
  disposables.push(bannerTex, bannerMat);
  scene.add(at(box(0.45, 7.2, 0.45, steelMat), -5.2, 3.6, prodZ - 4.4));
  scene.add(at(box(0.45, 7.2, 0.45, steelMat), 5.2, 3.6, prodZ - 4.4));
  scene.add(at(box(11.4, 3.0, 0.35, steelMat), 0, 6.2, prodZ - 4.4));
  scene.add(at(plane(10.8, 2.6, bannerMat), 0, 6.2, prodZ - 4.2));

  scene.add(buildExecutiveGuard(-3.8, 0, prodZ - 3.0, 'circle', 0));
  scene.add(buildExecutiveGuard(0, 0, prodZ - 3.6, 'triangle', 1));
  scene.add(buildExecutiveGuard(3.8, 0, prodZ - 3.0, 'square', 2));

  // Brushed-gunmetal center catwalk support I-beams framing the two middle glass lanes
  for (const bx of [-LANE_OFFSET_X - 1.15, 0, LANE_OFFSET_X + 1.15]) {
    scene.add(at(box(0.24, 0.36, bridgeLen, steelMat), bx, -0.22, midZ));
  }

  // Twin strings of warm golden bulbs lining the two middle glass lanes!
  const bulbMat = new THREE.MeshStandardMaterial({
    color: '#ffe066',
    emissive: '#f59f00',
    emissiveIntensity: 2.2,
    roughness: 0.2,
  });
  disposables.push(bulbMat);
  const bulbs = [];
  for (let i = 0; i <= pairCount + 1; i++) {
    const bz = startZ - i * PAIR_SPACING;
    for (const side of [-1, 1]) {
      const b = at(ball(0.18, bulbMat), side * (LANE_OFFSET_X + 1.22), 0.16, bz);
      scene.add(b);
      bulbs.push(b);
    }
  }

  // Semi-transparent glass pane pairs in the TWO MIDDLE LANES with cyan edge-glow once proven safe!
  const paneVisuals = pairs.map((pair) => {
    const makePane = (side) => {
      const g = new THREE.Group();
      g.position.set(side * LANE_OFFSET_X, -0.05, pair.z);
      const glassMat = new THREE.MeshStandardMaterial({
        color: '#bae6fd',
        emissive: '#0ea5e9',
        emissiveIntensity: 0.22,
        roughness: 0.08,
        metalness: 0.25,
        transparent: true,
        opacity: 0.44,
      });
      const edgeMat = new THREE.MeshStandardMaterial({
        color: '#64748b',
        emissive: '#38bdf8',
        emissiveIntensity: 0.15,
        roughness: 0.3,
        metalness: 0.7,
      });
      disposables.push(glassMat, edgeMat);
      g.add(box(2.1, 0.08, 2.35, glassMat));
      g.add(at(box(2.16, 0.1, 0.09, edgeMat), 0, 0, -1.16));
      g.add(at(box(2.16, 0.1, 0.09, edgeMat), 0, 0, 1.16));
      scene.add(g);
      return { group: g, glassMat, edgeMat };
    };
    return {
      sim: pair,
      left: makePane(-1),
      right: makePane(1),
    };
  });

  return { hemi, key, bulbMat, lampGlowMat, coneMat, hazardMat, flareMat, smokePlumes, bulbs, paneVisuals, startZ, prodZ };
}

/** Animates rising, drifting, expanding wispy radiator smoke plumes on crashed bridge cars. */
function updateSmokePlumes(plumes, t) {
  for (const plume of plumes) {
    for (const p of plume.puffs) {
      const u = (p.phase + t * 0.28) % 1;
      p.sprite.position.set(
        plume.origin.x + Math.sin(u * 5 + p.phase * 10) * 0.22 + u * (0.45 + p.drift),
        plume.origin.y + u * 2.6,
        plume.origin.z + u * 0.35,
      );
      const scale = 0.65 + u * 1.65;
      p.sprite.scale.set(scale, scale, 1);
      p.mat.opacity = Math.sin(u * Math.PI) * 0.58;
    }
  }
}

// ------------------------------------------------------------------ Lobby 3D Stage

export class GlassStage {
  constructor(aspect = 16 / 9, initialNames = [], { duration = DEFAULT_GLASS_DURATION } = {}) {
    this.t = 0;
    this.names = [];
    this.models = [];
    this.disposables = [];
    const previewSim = new GlassSim({ names: initialNames.length >= 2 ? initialNames : ['Ada', 'Grace'], duration });

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(48, aspect, 0.3, 200);
    this.arena = buildGlassArena(this.scene, previewSim.pairs, this.disposables);
    this.pairCount = previewSim.pairCount;
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

    const colors = ['#0ca678', '#15aabf', '#228be6', '#fab005', '#fd7e14', '#be4bdb'];
    names.forEach((name, i) => {
      const kind = DEVELOPER_KINDS[i % DEVELOPER_KINDS.length];
      const vest = String(i + 1).padStart(2, '0');
      const dev = buildBridgePlayer(name, vest, kind, colors[i % colors.length], this.disposables);
      const col = i % 5;
      const row = Math.floor(i / 5);
      dev.root.position.set((col - 2) * 1.1, 0, this.arena.startZ + 0.8 + row * 0.85);
      dev.body.rotation.y = Math.PI; // Facing down the glass bridge toward PROD
      this.scene.add(dev.root);
      this.models.push({ ...dev, phase: i * 0.7 });
    });
  }

  update(dt, reduced = false) {
    if (!reduced) this.t += dt;
    const t = this.t;
    const hazardOn = Math.floor(t * 2.4) % 2 === 0;
    this.arena.hazardMat.emissiveIntensity = hazardOn ? 2.6 : 0.2;
    this.arena.flareMat.emissiveIntensity = 1.6 + Math.sin(t * 14) * 0.9;
    updateSmokePlumes(this.arena.smokePlumes, t);
    for (const m of this.models) {
      if (!reduced) {
        m.head.rotation.z = Math.sin(t * 4.0 + m.phase) * 0.12;
        m.leftArm.rotation.x = Math.sin(t * 3.4 + m.phase) * 0.25;
        m.rightArm.rotation.x = -Math.sin(t * 3.4 + m.phase) * 0.25;
      }
    }
    const ang = reduced ? 0.35 : Math.sin(t * 0.24) * 0.65;
    const midZ = (this.arena.startZ + this.arena.prodZ) / 2;
    this.camera.position.set(Math.sin(ang) * 15.5, 9.2, this.arena.startZ + 9.5);
    this.camera.lookAt(0, 1.0, midZ - 2.0);
  }

  dispose() {
    for (const d of this.disposables) d.dispose?.();
  }
}

// ------------------------------------------------------------------ Live Match

export class GlassMatch {
  constructor(names, { duration = DEFAULT_GLASS_DURATION, rule = DEFAULT_GLASS_RULE, rng = Math.random, sfx = null, onEvent = null, onWinner = null } = {}) {
    this.sim = new GlassSim({ names, duration, rule, rng });
    this.sfx = sfx;
    this.onEvent = onEvent;
    this.onWinner = onWinner;
    this.accumulator = 0;
    this.victoryTime = 0;
    this.shake = 0;
    this.winnerAnnounced = false;
    this.disposables = [];

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.3, 200);
    this.arena = buildGlassArena(this.scene, this.sim.pairs, this.disposables);
    this.particles = new Particles(this.scene);

    this.playerVisuals = this.sim.players.map((p, i) => {
      const kind = DEVELOPER_KINDS[i % DEVELOPER_KINDS.length];
      const vis = buildBridgePlayer(p.name, p.vest, kind, p.color, this.disposables);
      vis.root.position.set(p.x, p.y, p.z);
      vis.body.rotation.y = Math.PI;
      this.scene.add(vis.root);
      return { sim: p, ...vis };
    });

    this.camPos = new THREE.Vector3(11.5, 9.5, this.arena.startZ + 8.5);
    this.camLook = new THREE.Vector3(0, 0.6, this.arena.startZ - 6);
    this.resize(window.innerWidth / window.innerHeight);
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 1 ? 62 : 48;
    this.camera.updateProjectionMatrix();
  }

  update(realDt) {
    const inFinalSlowMo = !this.sim.done && this.sim.time > this.sim.duration * 0.85 && this.sim.time < this.sim.duration * 0.96;
    const dt = inFinalSlowMo ? realDt * 0.4 : realDt;

    this.accumulator += dt;
    let steps = 0;
    while (this.accumulator >= STEP && steps < 8) {
      this.sim.step(STEP);
      this.accumulator -= STEP;
      steps++;
      for (const e of this.sim.drainEvents()) this.handleEvent(e);
    }

    if (this.sim.done) this.victoryTime += realDt;
    const t = this.sim.time;

    // DARK MODE lights-out effect on carnival bulbs, streetlights & bridge lighting + blinking car hazards
    const dark = this.sim.darkModeT > 0;
    this.arena.bulbMat.emissiveIntensity = dark ? 0.12 : 2.2 + Math.sin(t * 7) * 0.25;
    this.arena.lampGlowMat.emissiveIntensity = dark ? 0.15 : 1.9;
    this.arena.coneMat.opacity = dark ? 0.01 : 0.08;
    this.arena.key.intensity = dark ? 0.38 : 1.35;
    this.arena.hazardMat.emissiveIntensity = Math.floor(t * 2.6) % 2 === 0 ? 2.8 : 0.18;
    this.arena.flareMat.emissiveIntensity = 1.6 + Math.sin(t * 15) * 0.95;
    updateSmokePlumes(this.arena.smokePlumes, t);

    // Sync glass pane intact state & proven safe cyan glow
    for (const pv of this.arena.paneVisuals) {
      const p = pv.sim;
      pv.left.group.visible = p.leftIntact;
      pv.right.group.visible = p.rightIntact;
      if (p.proven) {
        const safeVis = p.safeSide === -1 ? pv.left : pv.right;
        safeVis.edgeMat.emissiveIntensity = 1.65;
        safeVis.glassMat.emissiveIntensity = 0.55;
      }
    }

    // Sync tracksuit developers leaping & plummeting into the server chasm
    let frontZ = this.arena.startZ;
    for (const pv of this.playerVisuals) {
      const p = pv.sim;
      const winHop = this.sim.winner === p && !p.fallen ? Math.abs(Math.sin(this.victoryTime * 6.5)) * 0.65 : 0;
      pv.root.position.set(p.x, p.y + winHop, p.z);
      if (!p.fallen && p.z < frontZ) frontZ = p.z;

      if (p.fallen) {
        pv.body.rotation.x += realDt * 6.5;
        pv.body.rotation.z += realDt * 5.2;
        pv.leftArm.rotation.z = 2.2;
        pv.rightArm.rotation.z = -2.2;
      } else {
        const jumping = p.hopT < 1;
        pv.body.rotation.x = jumping ? -0.22 : 0;
        pv.body.rotation.z = 0;
        pv.body.rotation.y = this.sim.winner === p ? 0 : Math.PI;
        const swing = jumping ? Math.sin(p.hopT * Math.PI) * 0.9 : Math.sin(t * 6 + p.phase) * 0.12;
        pv.leftLeg.rotation.x = swing;
        pv.rightLeg.rotation.x = -swing;
        pv.leftArm.rotation.x = -swing;
        pv.rightArm.rotation.x = swing;
        if (this.sim.winner === p) {
          pv.leftArm.rotation.z = 2.4;
          pv.rightArm.rotation.z = -2.4;
        }
      }
    }

    this.particles.update(realDt);

    // Dynamic Camera: Side-Rail Diagonal Chase -> Reverse PROD Gantry Slow-Mo -> 360° Victory Orbit
    if (this.shake > 0) this.shake = Math.max(0, this.shake - realDt * 4.5);
    const kickY = Math.sin(t * 50) * this.shake * 0.55;
    const wantPos = new THREE.Vector3();
    const wantLook = new THREE.Vector3(0, 0.8, frontZ - 2.0);

    if (this.sim.winner) {
      const orbitAng = this.victoryTime * 0.28;
      const focusZ = this.sim.rule === 'canary' ? this.sim.winner.z : this.arena.prodZ - 1.5;
      wantPos.set(Math.sin(orbitAng) * 13.5, 5.2, focusZ + Math.cos(orbitAng) * 12.5);
      wantLook.set(0, 1.8, focusZ);
    } else if (inFinalSlowMo) {
      wantPos.set(-7.5, 4.2, this.arena.prodZ - 4.5);
      wantLook.set(0, 1.0, this.arena.prodZ + 4.5);
    } else {
      wantPos.set(10.8, 8.2 + kickY, frontZ + 9.2);
    }

    this.camPos.lerp(wantPos, Math.min(1, realDt * 4.5));
    this.camLook.lerp(wantLook, Math.min(1, realDt * 5.0));
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
  }

  handleEvent(e) {
    if (e.type === 'shatter') {
      this.sfx?.play?.('glassShatter');
      this.shake = 0.6;
      this.particles.burst(new THREE.Vector3(e.x, 0.1, e.z), {
        count: 22,
        colors: ['#e0f2fe', '#7dd3fc', '#38bdf8', '#ffffff'],
        speed: 5.5,
        up: 2.8,
        life: 0.9,
        size: 0.18,
        gravity: 16,
      });
    } else if (e.type === 'safe') {
      this.sfx?.play?.('glassRing');
      this.onEvent?.({
        type: 'status',
        text: `🌉 BRIDGE PROGRESS: PAIR ${e.pair} / ${this.sim.pairCount} · ALIVE: ${e.alive}`,
        tone: 'default',
      });
    } else if (e.type === 'shove') {
      this.sfx?.play?.('glassShatter');
      this.onEvent?.({ type: 'status', text: '⚠️ HESITATION FREEZE — BUS-SHOVE ON THE CATWALK!', tone: 'yellow' });
      this.onEvent?.({ type: 'note', text: `🚌 SHOVE: “${e.popup}”`, important: true });
    } else if (e.type === 'darkmode') {
      this.sfx?.play?.('glassDark');
      this.onEvent?.({ type: 'status', text: '🌑 DARK MODE! BRIDGE BULBS SWITCHED OFF!', tone: 'red' });
      this.onEvent?.({ type: 'note', text: `🌑 LIGHTS OUT: “${e.popup}”`, important: true });
    } else if (e.type === 'fall') {
      this.onEvent?.({
        type: 'status',
        text: `💥 404 FLOOR NOT FOUND! PAIR ${e.pair} / ${this.sim.pairCount} · ALIVE: ${e.alive}`,
        tone: e.alive <= 3 ? 'red' : 'yellow',
      });
      this.onEvent?.({ type: 'note', text: `💥 #${e.player.vest} ${e.player.name}: “${e.popup}”`, important: false });
    } else if (e.type === 'winner' && !this.winnerAnnounced) {
      this.winnerAnnounced = true;
      this.sfx?.play?.('glassWin');
      this.sfx?.fanfare?.();
      this.particles.burst(new THREE.Vector3(0, 2.2, this.arena.prodZ - 1.5), {
        count: 72,
        colors: ['#ffd43b', '#38bdf8', '#f43f5e', '#51cf66', '#ffffff'],
        speed: 7.5,
        up: 9.2,
        life: 1.9,
        size: 0.25,
        gravity: 12,
      });
      this.onWinner?.(e.player, this.sim);
    }
  }

  dispose() {
    for (const d of this.disposables) d.dispose?.();
  }
}
