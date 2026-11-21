// High-detail stylized 3D developer models for Standup Deathmatch, faithfully modeled after the
// 14 developer reference portraits in docs/ (12 core devs by GPT 6.1 SOL + 13th Ray + 14th Chevron).
// Co-authored by Antigravity (Gemini 4 Neon) and GPT 6.1 SOL (High).

import * as THREE from 'three';
import { mat, box, ball, cyl, cone, torus, capsule, at, canvasTexture, FONT_UI, FONT_MONO, roundRect } from './util3d.js';

// Cache per-persona face & torso canvas textures so 30 players share textures with zero GC churn.
const faceTexCache = new Map();
const torsoTexCache = new Map();
let cardboardSignTex = null;

/** Draws an expressive cartoon/stylized face texture matching each developer's reference portrait. */
function getFaceTexture(k) {
  if (faceTexCache.has(k.id)) return faceTexCache.get(k.id);
  const tex = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = k.skin;
    ctx.fillRect(0, 0, w, h);

    // Subtle cheek blush
    ctx.fillStyle = 'rgba(220, 110, 95, 0.18)';
    ctx.beginPath(); ctx.ellipse(78, 152, 22, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(178, 152, 22, 12, 0, 0, Math.PI * 2); ctx.fill();

    // Eyebrows
    ctx.strokeStyle = k.id === 'walter' ? '#8d99ae' : k.hair;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    const browY = k.id === 'finn' ? 92 : 98;
    ctx.beginPath(); ctx.moveTo(74, browY); ctx.quadraticCurveTo(96, browY - 7, 114, browY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(142, browY); ctx.quadraticCurveTo(160, browY - 7, 182, browY); ctx.stroke();

    // Eyes (Ray has red-tinted sunglasses mounted in 3D, Sam has sleepy half-closed eyes)
    if (k.id === 'sam') {
      ctx.strokeStyle = '#1f242d';
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(96, 124, 14, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
      ctx.beginPath(); ctx.arc(160, 124, 14, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
    } else {
      for (const ex of [96, 160]) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.ellipse(ex, 124, 14, 16, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1b1f2a';
        ctx.beginPath(); ctx.arc(ex, 125, 8.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(ex - 3, 120, 3.2, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Nose
    ctx.strokeStyle = 'rgba(90, 55, 35, 0.45)';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(128, 128); ctx.lineTo(124, 148); ctx.lineTo(132, 150); ctx.stroke();

    // Facial hair / mouth
    if (k.id === 'walter' || k.id === 'bruno' || k.id === 'aman' || k.id === 'ben') {
      ctx.fillStyle = k.id === 'walter' ? '#c8ced6' : k.hair;
      ctx.beginPath();
      ctx.moveTo(64, 154);
      ctx.quadraticCurveTo(128, 232, 192, 154);
      ctx.quadraticCurveTo(128, 182, 64, 154);
      ctx.fill();
      // Mustache
      ctx.beginPath();
      ctx.ellipse(110, 166, 20, 8, -0.15, 0, Math.PI * 2);
      ctx.ellipse(146, 166, 20, 8, 0.15, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mouth expression
    if (k.id === 'sam') {
      // Big sleepy yawn
      ctx.fillStyle = '#6e2329';
      ctx.beginPath(); ctx.ellipse(128, 178, 16, 20, 0, 0, Math.PI * 2); ctx.fill();
    } else if (k.id === 'chevron') {
      // Calm confident half-smile
      ctx.strokeStyle = '#3b241d';
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(108, 174); ctx.quadraticCurveTo(132, 182, 152, 168); ctx.stroke();
    } else {
      ctx.strokeStyle = '#3b241d';
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(128, 166, 18, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    }
  });
  faceTexCache.set(k.id, tex);
  return tex;
}

/** Draws each developer's signature shirt / hoodie graphic from the reference portraits. */
function getTorsoTexture(k) {
  if (torsoTexCache.has(k.id)) return torsoTexCache.get(k.id);
  const tex = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = k.shirt;
    ctx.fillRect(0, 0, w, h);

    if (k.id === 'walter') {
      // Red & navy plaid flannel shirt
      ctx.fillStyle = '#1d3557';
      for (let x = 0; x < w; x += 44) ctx.fillRect(x, 0, 16, h);
      for (let y = 0; y < h; y += 44) ctx.fillRect(0, y, w, 14);
      ctx.strokeStyle = '#e63946';
      ctx.lineWidth = 4;
      for (let x = 8; x < w; x += 44) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 7; y < h; y += 44) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    } else if (k.id === 'alex') {
      // Retro sunset stripes + </> code emblem
      const stripes = ['#ff6b6b', '#ffa94d', '#ffd43b', '#51cf66', '#339af0'];
      stripes.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(24, 62 + i * 20, w - 48, 16); });
      ctx.fillStyle = '#14171f';
      ctx.font = `900 58px ${FONT_MONO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('</>', w / 2, 114);
    } else if (k.id === 'ben') {
      // Green Space Invaders + pixel hearts tee
      ctx.fillStyle = '#94f279';
      const inv = [
        '  #     #  ',
        '   #   #   ',
        '  #######  ',
        ' ## ### ## ',
        '###########',
        '# ####### #',
        '# #     # #',
        '   ## ##   ',
      ];
      inv.forEach((row, r) => {
        for (let c = 0; c < row.length; c++) {
          if (row[c] === '#') ctx.fillRect(58 + c * 13, 56 + r * 13, 11, 11);
        }
      });
      ctx.fillStyle = '#ff6b6b';
      ctx.font = `700 28px ${FONT_UI}`;
      ctx.textAlign = 'center';
      ctx.fillText('♥  ♥  ♥', w / 2, 198);
    } else if (k.id === 'elliot') {
      // Blue dress shirt + code-brace tie + pocket protector with 3 colored pens
      ctx.fillStyle = '#1b3a5c';
      ctx.beginPath(); ctx.moveTo(116, 18); ctx.lineTo(140, 18); ctx.lineTo(148, 210); ctx.lineTo(128, 236); ctx.lineTo(108, 210); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#74c0fc';
      ctx.font = `700 24px ${FONT_MONO}`;
      ctx.textAlign = 'center';
      ctx.fillText('{ }', 128, 90);
      ctx.fillText('{ }', 128, 145);
      // Pocket protector on left chest
      ctx.fillStyle = '#e9ecef';
      ctx.fillRect(166, 72, 46, 54);
      ctx.fillStyle = '#e03131'; ctx.fillRect(174, 52, 7, 26);
      ctx.fillStyle = '#2f9e44'; ctx.fillRect(186, 50, 7, 28);
      ctx.fillStyle = '#1971c2'; ctx.fillRect(198, 54, 7, 24);
    } else if (k.id === 'sam') {
      // Grey ZZZ sheep hoodie
      ctx.fillStyle = '#f8f9fa';
      ctx.font = `900 44px ${FONT_MONO}`;
      ctx.textAlign = 'center';
      ctx.fillText('Z Z Z', w / 2, 92);
      // Cute fluffy sheep icon
      ctx.beginPath();
      for (const [cx, cy] of [[112, 148], [128, 140], [144, 148], [128, 158]]) {
        ctx.arc(cx, cy, 16, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.fillStyle = '#212529';
      ctx.beginPath(); ctx.arc(154, 152, 10, 0, Math.PI * 2); ctx.fill();
    } else if (k.id === 'mei') {
      // Dark cat hoodie with cute cat face & whiskers
      ctx.strokeStyle = '#da77f2';
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(128, 128, 44, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#da77f2';
      ctx.beginPath(); ctx.moveTo(92, 96); ctx.lineTo(100, 66); ctx.lineTo(118, 86); ctx.fill();
      ctx.beginPath(); ctx.moveTo(164, 96); ctx.lineTo(156, 66); ctx.lineTo(138, 86); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(114, 124, 6, 0, Math.PI * 2); ctx.arc(142, 124, 6, 0, Math.PI * 2); ctx.fill();
      ctx.font = `700 22px ${FONT_MONO}`;
      ctx.textAlign = 'center';
      ctx.fillText('=^.^=', 128, 152);
    } else if (k.id === 'aman') {
      // Space astronaut t-shirt
      ctx.fillStyle = '#ffd43b';
      for (const [sx, sy] of [[44, 52], [202, 68], [58, 188], [210, 178]]) {
        ctx.beginPath(); ctx.arc(sx, sy, 4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#e9ecef';
      ctx.beginPath(); ctx.arc(128, 108, 32, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#339af0';
      ctx.beginPath(); ctx.ellipse(128, 108, 22, 16, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#dee2e6';
      roundRect(ctx, 100, 142, 56, 52, 12); ctx.fill();
    } else if (k.id === 'priya') {
      // Burgundy knit cardigan over cream top
      ctx.fillStyle = '#f8f0e3';
      ctx.beginPath(); ctx.moveTo(100, 0); ctx.lineTo(156, 0); ctx.lineTo(128, 112); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e6c280';
      for (let y = 128; y <= 212; y += 28) {
        ctx.beginPath(); ctx.arc(128, y, 5, 0, Math.PI * 2); ctx.fill();
      }
    } else if (k.id === 'chevron') {
      // Dark grey zip-up hoodie with crisp silver zipper & subtle chevron badge
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(128, 12); ctx.lineTo(128, h); ctx.stroke();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(164, 72); ctx.lineTo(182, 86); ctx.lineTo(200, 72); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(164, 88); ctx.lineTo(182, 102); ctx.lineTo(200, 88); ctx.stroke();
    } else if (k.id === 'zoe') {
      // Dark hoodie with Android + crescent moon pins
      ctx.fillStyle = '#69db7c';
      ctx.beginPath(); ctx.arc(82, 88, 16, Math.PI, 0); ctx.fill();
      ctx.fillRect(66, 90, 32, 22);
      ctx.fillStyle = '#ffe066';
      ctx.beginPath(); ctx.arc(178, 92, 15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = k.shirt;
      ctx.beginPath(); ctx.arc(185, 88, 13, 0, Math.PI * 2); ctx.fill();
    } else if (k.id === 'finn') {
      // Olive open jacket over dark tee
      ctx.fillStyle = '#212529';
      ctx.fillRect(92, 0, 72, h);
      ctx.fillStyle = '#fcc419';
      ctx.beginPath(); ctx.moveTo(132, 68); ctx.lineTo(112, 116); ctx.lineTo(130, 116); ctx.lineTo(118, 164); ctx.lineTo(148, 108); ctx.lineTo(128, 108); ctx.closePath(); ctx.fill();
    } else if (k.id === 'maya') {
      // Dark hoodie with subtle >_ prompt emblem & drawstrings
      ctx.strokeStyle = '#ced4da';
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(112, 10); ctx.lineTo(112, 92); ctx.moveTo(144, 10); ctx.lineTo(144, 92); ctx.stroke();
      ctx.fillStyle = '#69db7c';
      ctx.font = `900 42px ${FONT_MONO}`;
      ctx.textAlign = 'center';
      ctx.fillText('>_', 128, 148);
    } else {
      // Default hoodie/tee with accent chest bar (Bruno, Ray)
      ctx.fillStyle = k.accent;
      ctx.fillRect(36, 96, w - 72, 26);
    }
  });
  torsoTexCache.set(k.id, tex);
  return tex;
}

/** Cardboard cubicle texture for Ray (13th dev) with the two iconic taped signs. */
function getCardboardSignTexture() {
  if (cardboardSignTex) return cardboardSignTex;
  cardboardSignTex = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#c49a62';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#9c7542';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    // Top taped white sign
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(18, 22, w - 36, 92);
    ctx.fillStyle = '#1f1f1f';
    ctx.font = `800 22px ${FONT_UI}`;
    ctx.textAlign = 'center';
    ctx.fillText('10 MILLION,', w / 2, 58);
    ctx.fillText('BEST MONEY CAN BUY', w / 2, 90);
    // Bottom taped white sign
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(18, 136, w - 36, 96);
    ctx.fillStyle = '#1f1f1f';
    ctx.font = `700 20px ${FONT_UI}`;
    ctx.fillText('CLOSE YOUR EYES,', w / 2, 174);
    ctx.fillText("YOU WON'T SEE THE GLARE", w / 2, 206);
  });
  return cardboardSignTex;
}

/** Builds a floating Quake-style nameplate sprite above a developer. */
function makeNameTag(text, accent, isNpc = false) {
  const tex = canvasTexture(256, 64, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = isNpc ? '#2c2e33' : '#14171f';
    roundRect(ctx, 8, 10, w - 16, h - 20, 10);
    ctx.fill();
    ctx.strokeStyle = isNpc ? '#868e96' : accent;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = isNpc ? '#ced4da' : '#f8f9fa';
    ctx.font = `700 24px ${FONT_UI}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = text.length > 16 ? `${text.slice(0, 15)}…` : text;
    ctx.fillText(label, w / 2, h / 2 + 1);
  });
  const spriteMat = new THREE.SpriteMaterial({ map: tex, depthTest: true, transparent: true });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(2.9, 0.72, 1);
  sprite.position.y = 2.8;
  return { sprite, tex, spriteMat };
}

/** Adds 3D glasses frames to the developer's head. */
function addGlasses(headGroup, frameColor = '#1f242d', lensColor = '#dbeafe', emissive = null) {
  const fMat = mat(frameColor, { roughness: 0.35, metalness: 0.4 });
  const lMat = mat(lensColor, { roughness: 0.15, metalness: 0.2, ...(emissive ? { emissive, emissiveIntensity: 0.55 } : {}) });
  headGroup.add(at(box(0.2, 0.12, 0.05, lMat), -0.12, 0.03, 0.31));
  headGroup.add(at(box(0.2, 0.12, 0.05, lMat), 0.12, 0.03, 0.31));
  headGroup.add(at(box(0.46, 0.03, 0.06, fMat), 0, 0.09, 0.32));
  headGroup.add(at(box(0.06, 0.03, 0.06, fMat), 0, 0.03, 0.32));
}

/** Adds neck headphones (Zoe & Mei). */
function addNeckHeadphones(body, color) {
  const hpMat = mat(color, { roughness: 0.35, metalness: 0.3 });
  body.add(at(torus(0.24, 0.04, hpMat, Math.PI * 1.3), 0, 1.48, 0.04, Math.PI / 2, 0, -Math.PI * 0.15));
  body.add(at(cyl(0.08, 0.08, 0.07, hpMat, 12), -0.22, 1.46, 0.14, 0, 0, Math.PI / 2));
  body.add(at(cyl(0.08, 0.08, 0.07, hpMat, 12), 0.22, 1.46, 0.14, 0, 0, Math.PI / 2));
}

/**
 * Builds a stylized, recognizable 3D developer avatar matching the 14 reference portraits in docs/.
 */
export function buildDeveloperModel(player) {
  const k = player.kind;
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  // Legs + shoes
  const pantsColor = k.id === 'alex' ? '#7c6a53' : player.isNpc ? '#343a40' : '#222836';
  const pantsMat = mat(pantsColor, { roughness: 0.85 });
  const shoeMat = mat('#1a1d24', { roughness: 0.6 });
  const legL = new THREE.Group();
  legL.position.set(-0.17, 0.72, 0);
  legL.add(at(cyl(0.11, 0.095, 0.62, pantsMat, 10), 0, -0.31, 0));
  legL.add(at(box(0.22, 0.14, 0.32, shoeMat), 0, -0.65, 0.05));
  const legR = new THREE.Group();
  legR.position.set(0.17, 0.72, 0);
  legR.add(at(cyl(0.11, 0.095, 0.62, pantsMat, 10), 0, -0.31, 0));
  legR.add(at(box(0.22, 0.14, 0.32, shoeMat), 0, -0.65, 0.05));
  body.add(legL, legR);

  // Torso with custom reference shirt/hoodie graphic on front & back
  const shirtSideMat = mat(k.shirt, { roughness: 0.8 });
  const torsoMat = new THREE.MeshStandardMaterial({ map: getTorsoTexture(k), roughness: 0.78 });
  const torsoMats = [shirtSideMat, shirtSideMat, shirtSideMat, shirtSideMat, torsoMat, torsoMat];
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.82, 0.42), torsoMats);
  torso.position.set(0, 1.12, 0);
  torso.castShadow = true;
  body.add(torso);

  // Rounded shoulders + arms (sleeveless skin arms for Ray, tattooed forearms for Bruno)
  const sleeveColor = k.id === 'ray' ? k.skin : k.shirt;
  const sleeveMat = mat(sleeveColor, { roughness: 0.75 });
  const forearmMat = mat(k.id === 'bruno' ? '#9c7e6e' : k.id === 'ray' ? k.skin : k.shirt, { roughness: 0.75 });
  const handMat = mat(k.skin, { roughness: 0.7 });

  const armL = new THREE.Group();
  armL.position.set(-0.46, 1.4, 0);
  armL.add(at(cyl(0.1, 0.09, 0.36, sleeveMat, 10), 0, -0.18, 0));
  armL.add(at(cyl(0.085, 0.08, 0.28, forearmMat, 10), 0, -0.46, 0.06, -0.35, 0, 0));
  armL.add(at(ball(0.09, handMat), 0, -0.6, 0.12));

  const armR = new THREE.Group();
  armR.position.set(0.46, 1.4, 0);
  armR.add(at(cyl(0.1, 0.09, 0.36, sleeveMat, 10), 0, -0.18, 0.06, -0.5, 0, 0));
  armR.add(at(cyl(0.085, 0.08, 0.28, forearmMat, 10), 0, -0.34, 0.26, -1.2, 0, 0));
  armR.add(at(ball(0.09, handMat), 0, -0.38, 0.42));
  body.add(armL, armR);

  // Head with expressive reference-matched face plate on the front!
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.84, 0);
  const headSphere = ball(0.32, mat(k.skin, { roughness: 0.68 }), 1.0, 1.04, 0.96);
  headGroup.add(headSphere);
  // Curved face badge on the front of the head
  const faceMat = new THREE.MeshStandardMaterial({ map: getFaceTexture(k), roughness: 0.65 });
  const faceGeo = new THREE.SphereGeometry(0.325, 16, 12, -Math.PI * 0.34, Math.PI * 0.68, Math.PI * 0.22, Math.PI * 0.56);
  const faceMesh = new THREE.Mesh(faceGeo, faceMat);
  faceMesh.rotation.y = Math.PI / 2; // align front of sphere with +Z
  headGroup.add(faceMesh);
  // Ears
  headGroup.add(at(ball(0.065, mat(k.skin)), -0.32, 0, 0));
  headGroup.add(at(ball(0.065, mat(k.skin)), 0.32, 0, 0));
  body.add(headGroup);

  // Bespoke 3D hair, headwear, glasses & developer props matching each of the 14 portraits!
  const hairMat = mat(k.hair, { roughness: 0.82 });
  switch (k.id) {
    case 'maya':
      headGroup.add(at(ball(0.34, hairMat, 1.02, 0.72, 1.04), 0, 0.14, -0.04));
      headGroup.add(at(ball(0.16, hairMat, 0.9, 1.4, 0.9), 0, 0.28, -0.32, -0.5, 0, 0)); // high ponytail
      // Sticker-covered laptop strapped to left arm
      armL.add(at(box(0.06, 0.34, 0.44, mat('#adb5bd', { metalness: 0.5 })), -0.08, -0.45, 0.1));
      armL.add(at(box(0.07, 0.1, 0.1, mat('#ff6b6b')), -0.09, -0.38, 0.04));
      armL.add(at(box(0.07, 0.1, 0.1, mat('#339af0')), -0.09, -0.5, 0.18));
      break;
    case 'walter':
      // Silver curly hair & thick silver beard + glasses
      for (const [x, y, z] of [[-0.22, 0.22, 0], [0, 0.28, -0.05], [0.22, 0.22, 0], [-0.26, 0.1, -0.15], [0.26, 0.1, -0.15], [0, 0.18, -0.26]]) {
        headGroup.add(at(ball(0.15, hairMat), x, y, z));
      }
      headGroup.add(at(ball(0.24, hairMat, 1.05, 0.85, 0.8), 0, -0.22, 0.14));
      addGlasses(headGroup, '#2b2d42');
      break;
    case 'zoe':
      // Purple curly hair cluster + glasses + neck headphones
      for (const [x, y, z] of [[-0.26, 0.2, 0], [0.26, 0.2, 0], [0, 0.3, -0.04], [-0.3, 0.02, -0.08], [0.3, 0.02, -0.08], [0, 0.15, -0.26]]) {
        headGroup.add(at(ball(0.16, hairMat), x, y, z));
      }
      addGlasses(headGroup, '#1a1b1e');
      addNeckHeadphones(body, '#2b2d42');
      break;
    case 'finn':
      // Wild spiky hair + yellow lightning energy drink can in left hand
      for (let i = -2; i <= 2; i++) {
        headGroup.add(at(cone(0.1, 0.32, hairMat, 5), i * 0.1, 0.3, -0.04, -0.15, 0, -i * 0.22));
      }
      headGroup.add(at(ball(0.32, hairMat, 1.02, 0.65, 1.02), 0, 0.15, -0.06));
      armL.add(at(cyl(0.065, 0.065, 0.22, mat('#fcc419', { emissive: '#fab005', emissiveIntensity: 0.3 })), 0, -0.56, 0.16));
      break;
    case 'bruno':
      // Shiny bald head + huge twirled beard + custom purple/white mechanical keyboard on left arm
      headGroup.add(at(ball(0.28, hairMat, 1.1, 1.05, 0.85), 0, -0.26, 0.14));
      headGroup.add(at(cone(0.06, 0.22, hairMat, 6), -0.24, -0.16, 0.24, 0, 0, 1.2));
      headGroup.add(at(cone(0.06, 0.22, hairMat, 6), 0.24, -0.16, 0.24, 0, 0, -1.2));
      armL.add(at(box(0.44, 0.06, 0.18, mat('#845ef7')), 0.06, -0.56, 0.22, 0.4, 0.3, 0));
      armL.add(at(box(0.38, 0.08, 0.13, mat('#f8f9fa')), 0.06, -0.54, 0.22, 0.4, 0.3, 0));
      break;
    case 'aman':
      // Wrapped navy blue turban + dark beard
      headGroup.add(at(ball(0.37, mat('#1b3a6b', { roughness: 0.7 }), 1.06, 0.82, 1.06), 0, 0.22, -0.02));
      headGroup.add(at(torus(0.28, 0.09, mat('#142c52', { roughness: 0.7 })), 0, 0.16, 0.02, Math.PI / 2, 0.15, 0));
      headGroup.add(at(ball(0.22, hairMat, 1.0, 0.78, 0.75), 0, -0.22, 0.15));
      break;
    case 'priya':
      // Curly hair with high bun + glasses + notebook in left hand
      headGroup.add(at(ball(0.34, hairMat, 1.04, 0.72, 1.04), 0, 0.14, -0.04));
      headGroup.add(at(ball(0.17, hairMat), 0, 0.42, -0.12));
      addGlasses(headGroup, '#4a2511');
      armL.add(at(box(0.22, 0.3, 0.05, mat('#f8f9fa')), 0.04, -0.54, 0.18, -0.3, 0.3, 0));
      break;
    case 'mei':
      // Sleek black bob + glowing purple cat-ear headphones + neck headphones
      headGroup.add(at(ball(0.35, hairMat, 1.04, 0.85, 1.05), 0, 0.12, -0.05));
      headGroup.add(at(torus(0.34, 0.04, mat('#343a40'), Math.PI), 0, 0.12, 0));
      headGroup.add(at(cone(0.11, 0.24, mat('#cc5de8', { emissive: '#cc5de8', emissiveIntensity: 0.9 }), 4), -0.22, 0.44, 0, 0, 0, 0.2));
      headGroup.add(at(cone(0.11, 0.24, mat('#cc5de8', { emissive: '#cc5de8', emissiveIntensity: 0.9 }), 4), 0.22, 0.44, 0, 0, 0, -0.2));
      addNeckHeadphones(body, '#495057');
      break;
    case 'alex':
      // Curly brown hair + thick glasses
      for (const [x, y, z] of [[-0.2, 0.24, 0.04], [0, 0.3, 0], [0.2, 0.24, 0.04], [-0.24, 0.16, -0.18], [0.24, 0.16, -0.18]]) {
        headGroup.add(at(ball(0.15, hairMat), x, y, z));
      }
      addGlasses(headGroup, '#111111');
      break;
    case 'ben':
      // Curly brown hair + neat beard
      for (const [x, y, z] of [[-0.18, 0.24, 0.02], [0, 0.29, -0.02], [0.18, 0.24, 0.02], [0, 0.18, -0.22]]) {
        headGroup.add(at(ball(0.15, hairMat), x, y, z));
      }
      headGroup.add(at(ball(0.22, hairMat, 1.0, 0.72, 0.75), 0, -0.22, 0.14));
      break;
    case 'elliot':
      // Neatly side-parted hair + glasses
      headGroup.add(at(ball(0.33, hairMat, 1.02, 0.65, 1.02), 0, 0.18, -0.04));
      headGroup.add(at(box(0.26, 0.1, 0.16, hairMat), 0.08, 0.28, 0.14, 0, 0, -0.18));
      addGlasses(headGroup, '#2b2d42');
      break;
    case 'sam':
      // Messy sleepy hair + giant sloth cappuccino mug in left hand
      for (const [x, y, z] of [[-0.2, 0.24, 0.05], [0.06, 0.3, 0.02], [0.22, 0.22, -0.02], [-0.14, 0.22, -0.2], [0.14, 0.2, -0.2]]) {
        headGroup.add(at(ball(0.15, hairMat), x, y, z));
      }
      armL.add(at(cyl(0.1, 0.09, 0.2, mat('#f8f9fa')), 0, -0.58, 0.18));
      armL.add(at(cyl(0.085, 0.085, 0.03, mat('#6f4e37')), 0, -0.48, 0.18));
      break;
    case 'ray': {
      // 13th dev: long wavy hair + red-tinted sunglasses + iconic $10M cardboard cubicle shield on back!
      headGroup.add(at(ball(0.35, hairMat, 1.05, 0.78, 1.05), 0, 0.14, -0.04));
      headGroup.add(at(box(0.68, 0.56, 0.24, hairMat), 0, -0.06, -0.22));
      addGlasses(headGroup, '#1f242d', '#ff2a55', '#ff2a55');
      const boardMat = new THREE.MeshStandardMaterial({ map: getCardboardSignTexture(), roughness: 0.92 });
      const sideMat = mat('#b08952', { roughness: 0.95 });
      const shield = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.15, 0.08), [sideMat, sideMat, sideMat, sideMat, boardMat, boardMat]);
      shield.position.set(0, 1.38, -0.32);
      shield.castShadow = true;
      body.add(shield);
      break;
    }
    case 'chevron':
    default:
      // 14th dev: short clean dark hair, sleek silhouette
      headGroup.add(at(ball(0.33, hairMat, 1.02, 0.68, 1.04), 0, 0.16, -0.04));
      break;
  }

  // Signature Quake weapon mounted in right hand
  const weaponGroup = new THREE.Group();
  const wColor = k.weapon.color;
  weaponGroup.add(at(box(0.15, 0.18, 0.82, mat('#2c3038', { metalness: 0.6, roughness: 0.35 })), 0, 0, 0.34));
  weaponGroup.add(at(cyl(0.06, 0.075, 0.44, mat(wColor, { emissive: wColor, emissiveIntensity: 0.8 })), 0, 0.02, 0.78, Math.PI / 2, 0, 0));
  weaponGroup.add(at(capsule(0.035, 0.3, mat(wColor, { emissive: wColor, emissiveIntensity: 0.9 })), 0, 0.12, 0.42, 0, Math.PI / 2, 0));
  weaponGroup.position.set(0.46, 1.04, 0.42);
  body.add(weaponGroup);

  // Quad Deploy / Glare Shield glowing aura
  const aura = at(
    torus(0.72, 0.06, mat('#4c6ef5', { emissive: '#4c6ef5', emissiveIntensity: 1.2 }), Math.PI * 2),
    0, 1.05, 0, Math.PI / 2, 0, 0,
  );
  aura.visible = false;
  root.add(aura);

  const tag = makeNameTag(player.name, k.accent, player.isNpc);
  root.add(tag.sprite);

  return {
    root,
    body,
    legL,
    legR,
    weaponGroup,
    aura,
    tag,
    dispose() {
      tag.tex.dispose();
      tag.spriteMat.dispose();
      torsoMat.dispose();
      faceMat.dispose();
      faceGeo.dispose();
    },
  };
}
