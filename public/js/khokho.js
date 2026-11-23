// "Kho-Kho Relay Blitz" (Swivel-Chair Boardroom Edition): late-evening Indian IT executive
// conference room with midnight-slate geometric carpet, glowing cyan floor cable-trays,
// matte-walnut central conference table spine lined with alternating leather executive swivel
// chairs (N-S-N-S) with glowing directional LEDs, West Rolling Projector Cart & East Stainless-
// Steel Chai & Samosa Trolley, chaotic microservices whiteboard, frosted glass corridor walls,
// animated bobblehead devs, neon-sparking rolling P1 ESCALATION chaser, 0.4x slow-motion
// diving Tappaa finale, and 360-degree boardroom victory orbit!

import * as THREE from 'three';
import { mat, box, ball, cyl, torus, plane, at, canvasTexture, FONT_UI, FONT_MONO, roundRect } from './util3d.js';
import { Particles } from './effects.js';
import { DEVELOPER_KINDS } from './deathmatch-sim.js';
import {
  KhokhoSim,
  AISLE_HALF_Z,
  DEFAULT_KHOKHO_DURATION,
  DEFAULT_KHOKHO_RULE,
} from './khokho-sim.js';

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

/** Midnight-slate geometric office carpet texture with subtle floor tile grid. */
function makeOfficeCarpetTexture() {
  const tex = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#1e2536';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#242c40';
    ctx.fillRect(0, 0, w / 2, h / 2);
    ctx.fillRect(w / 2, h / 2, w / 2, h / 2);
    ctx.strokeStyle = 'rgba(10, 14, 22, 0.45)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, w / 2, h / 2);
    ctx.strokeRect(w / 2, h / 2, w / 2, h / 2);
  });
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 12);
  return tex;
}

/** Chaotic Indian IT Boardroom Microservices & Kho-Kho Escalation Whiteboard (Back Wall). */
function makeBoardroomWhiteboardTexture() {
  return canvasTexture(1024, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#f8fafc');
    g.addColorStop(1, '#edf2f7');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#1864ab';
    ctx.font = `900 34px ${FONT_UI}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('KHO-KHO P1 ESCALATION ARCHITECTURE', 36, 48);

    ctx.strokeStyle = '#e03131';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(34, 72); ctx.lineTo(700, 72); ctx.stroke();

    // Chaotic microservices boxes & tangled arrows
    const boxes = [
      [60, 120, 180, 62, 'API GATEWAY', '#1971c2'],
      [340, 110, 210, 62, 'LEGACY MONOLITH', '#c92a2a'],
      [680, 120, 220, 62, 'CUTTING CHAI SVC', '#e67700'],
      [140, 270, 210, 62, '800-COL TABLE', '#7950f2'],
      [500, 270, 220, 62, 'MEGHJWALA 502', '#c92a2a'],
    ];
    ctx.strokeStyle = '#495057';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(240, 150); ctx.lineTo(340, 140);
    ctx.moveTo(550, 140); ctx.lineTo(680, 150);
    ctx.moveTo(440, 172); ctx.lineTo(245, 270);
    ctx.moveTo(440, 172); ctx.lineTo(610, 270);
    ctx.moveTo(350, 300); ctx.lineTo(500, 300);
    ctx.stroke();

    for (const [bx, by, bw, bh, label, col] of boxes) {
      ctx.fillStyle = '#ffffff';
      roundRect(ctx, bx, by, bw, bh, 10);
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.font = `900 18px ${FONT_MONO}`;
      ctx.textAlign = 'center';
      ctx.fillText(label, bx + bw / 2, by + bh / 2 + 1);
    }

    ctx.fillStyle = '#fff5f5';
    roundRect(ctx, 36, 410, w - 72, 66, 12);
    ctx.fill();
    ctx.strokeStyle = '#e03131';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = '#c92a2a';
    ctx.font = `900 24px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText('RULE: SLAP A CHAIR BACK & YELL "KHO!" TO REASSIGN THE P1 TICKET!', w / 2, 444);
  });
}

/** Secondary Side-Wall Whiteboard: Paper Trail Project for Cyber Defense Center (CDC) (Right Wall). */
function makeOnCallWhiteboardTexture() {
  return canvasTexture(1536, 768, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#f8fafc');
    g.addColorStop(1, '#eef2f6');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Subtle whiteboard grid lines
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
    ctx.lineWidth = 1;
    for (let x = 64; x < w; x += 64) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 64; y < h; y += 64) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Top classification banner: TOP SECRET/SCI
    ctx.fillStyle = '#fef08a';
    roundRect(ctx, w / 2 - 220, 14, 440, 42, 8);
    ctx.fill();
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = '#b91c1c';
    ctx.font = `900 28px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TOP SECRET/SCI', w / 2, 36);

    // Board Title
    ctx.fillStyle = '#0f172a';
    ctx.font = `900 38px ${FONT_UI}`;
    ctx.textAlign = 'left';
    ctx.fillText('Paper Trail Project for Cyber Defense Center (CDC)', 44, 92);

    ctx.strokeStyle = '#1971c2';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(42, 118); ctx.lineTo(w - 42, 118); ctx.stroke();

    const steps = [
      ['1.', ['जब तक CDC हार न मान ले, स्पष्ट न होने के लिए CDC को दोष दें।'], '#1864ab'],
      ['2.', ['Inform CDC that you are buried under unavailable paper trails.'], '#2b8a3e'],
      ['3.', [
        'Tell CDC you will setup a Google Meet, tell CDC you\'ll invite key people,',
        'do not invite key people, hide participant list in meeting invite.',
      ], '#d9480f'],
      ['4.', [
        'Hotfix the userLogin table from scratch due to PRIMARY KEY schema change',
        'to force edits to stored procedures and dependent tables and reports',
      ], '#c92a2a'],
      ['5.', ['Blame subordinate for not copying the paper trail when he already did'], '#5f3dc4'],
      ['6.', ['Threaten PIP for attending CDC meeting and call it working as a team'], '#0b7285'],
      ['7.', ['Setup up new group policy that set paper trail permissions to /dev/null'], '#1864ab'],
      ['8.', ['Create new security feature that blocks access to userLogin and eventLogs reports'], '#2b8a3e'],
      ['9.', ['Roll back the server time so logins suddenly get very confused about what year it is.'], '#d9480f'],
      ['10.', [
        'जो भी in a car accident की वजह से काम पर देर से आए, उसे ईमेल से फटकार भेजें,',
        'और फिर पेपर ट्रेल की एक्सेस रद्द कर दें।',
      ], '#c92a2a'],
    ];

    let y = 148;
    const lineH = 31;
    const stepGap = 11;
    for (const [num, lines, col] of steps) {
      ctx.fillStyle = col;
      ctx.font = `900 26px ${FONT_MONO}`;
      ctx.textAlign = 'right';
      ctx.fillText(num, 96, y);

      ctx.fillStyle = '#1e293b';
      ctx.font = `700 25px ${FONT_UI}`;
      ctx.textAlign = 'left';
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], 112, y + i * lineH);
      }
      y += lines.length * lineH + stepGap;
    }

    // Bottom reminder banner
    ctx.fillStyle = '#fff9db';
    roundRect(ctx, 44, 686, w - 88, 62, 12);
    ctx.fill();
    ctx.strokeStyle = '#e03131';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = '#b91c1c';
    ctx.font = `900 28px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText('REMINDER: Proxy Card System run 24/7 - ACT SURPRISED!', w / 2, 718);
  });
}

/** Upright high-contrast player nameplate sprite. */
function makeKhokhoTag(name, color) {
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
  sprite.scale.set(2.15, 0.54, 1);
  sprite.position.set(0, 2.5, 0);
  return { sprite, tex, spriteMat };
}

const EXEC_PROFILES = [
  { suit: '#1f2937', shirt: '#f8fafc', tie: '#d97706', skin: '#c68652', hair: '#1a1614', hairStyle: 'part', glasses: true, beard: true, headset: true },
  { suit: '#1e3a5f', shirt: '#e0f2fe', tie: '#dc2626', skin: '#8d5524', hair: '#14110f', hairStyle: 'bun', glasses: false, beard: false, headset: true },
  { suit: '#2d3138', shirt: '#ffffff', tie: '#2563eb', skin: '#d8a47f', hair: '#4a4e57', hairStyle: 'swept', glasses: true, beard: false, headset: false },
  { suit: '#3b2f2f', shirt: '#fef3c7', tie: '#059669', skin: '#a86b3c', hair: '#1c1816', hairStyle: 'part', glasses: false, beard: true, headset: false },
  { suit: '#262b36', shirt: '#f1f5f9', tie: '#9333ea', skin: '#e0b088', hair: '#2a2018', hairStyle: 'bob', glasses: true, beard: false, headset: true },
  { suit: '#1b2838', shirt: '#f8fafc', tie: '#e11d48', skin: '#7a4924', hair: '#151210', hairStyle: 'swept', glasses: false, beard: true, headset: true },
];

/** Builds a realistic, tailored seated executive (suit, lapels, shirt, tie, seated legs, hands, face, hair, glasses/headset). */
function buildSeatedExecutive(variantIdx = 0, isChaser = false) {
  const p = isChaser
    ? { suit: '#181c24', shirt: '#f8fafc', tie: '#e03131', skin: '#b97b4b', hair: '#3b3f47', hairStyle: 'swept', glasses: true, beard: true, headset: true }
    : EXEC_PROFILES[Math.abs(variantIdx) % EXEC_PROFILES.length];

  const exec = new THREE.Group();
  const suitMat = mat(p.suit, { roughness: 0.62, metalness: 0.08 });
  const pantsMat = mat(p.suit, { roughness: 0.68, metalness: 0.05 });
  const shirtMat = mat(p.shirt, { roughness: 0.5 });
  const tieMat = mat(p.tie, { roughness: 0.36, metalness: 0.12 });
  const skinMat = mat(p.skin, { roughness: 0.58 });
  const hairMat = mat(p.hair, { roughness: 0.72 });
  const shoeMat = mat('#111318', { roughness: 0.25, metalness: 0.22 });
  const frameMat = mat('#ced4da', { roughness: 0.2, metalness: 0.85 });

  // Seated pelvis & tailored trousers (thighs resting on cushion + calves dropping to floor + polished oxfords)
  exec.add(at(box(0.56, 0.18, 0.44, pantsMat), 0, 0.94, 0.06));
  for (const s of [-1, 1]) {
    // Thigh forward on chair cushion
    exec.add(at(cyl(0.115, 0.105, 0.48, pantsMat, 10), s * 0.16, 0.94, 0.34, Math.PI / 2, 0, 0));
    // Knee joint
    exec.add(at(ball(0.105, pantsMat), s * 0.16, 0.93, 0.56));
    // Lower leg / shin angled slightly forward
    exec.add(at(cyl(0.095, 0.078, 0.68, pantsMat, 10), s * 0.16, 0.58, 0.6, 0.08, 0, 0));
    // Polished leather dress shoe
    exec.add(at(box(0.14, 0.09, 0.27, shoeMat), s * 0.16, 0.22, 0.68));
  }

  // Tailored torso, shoulders, crisp shirt V-front, angled suit lapels, pocket square & silk tie
  const torso = new THREE.Group();
  torso.position.set(0, 1.0, 0.02);
  torso.rotation.x = isChaser ? 0.12 : 0.03; // chaser leans forward aggressively
  exec.add(torso);

  torso.add(at(box(0.58, 0.62, 0.32, suitMat), 0, 0.31, 0));
  // Rounded tailored shoulders
  for (const s of [-1, 1]) {
    torso.add(at(ball(0.145, suitMat), s * 0.31, 0.55, 0));
  }
  // Crisp dress shirt V-panel + collar
  torso.add(at(box(0.2, 0.44, 0.05, shirtMat), 0, 0.41, 0.155));
  torso.add(at(cyl(0.11, 0.12, 0.1, shirtMat, 10), 0, 0.64, 0.02));
  // Suit jacket lapels & breast pocket square
  torso.add(at(box(0.09, 0.4, 0.06, suitMat), -0.13, 0.42, 0.165, 0, 0, -0.18));
  torso.add(at(box(0.09, 0.4, 0.06, suitMat), 0.13, 0.42, 0.165, 0, 0, 0.18));
  torso.add(at(box(0.075, 0.045, 0.02, shirtMat), 0.19, 0.49, 0.175, 0, 0, 0.12));
  // Necktie knot & blade + brass tie bar
  torso.add(at(box(0.07, 0.065, 0.055, tieMat), 0, 0.59, 0.178));
  torso.add(at(box(0.068, 0.38, 0.04, tieMat), 0, 0.37, 0.182));
  torso.add(at(box(0.072, 0.016, 0.046, frameMat), 0, 0.4, 0.188));

  // Articulated arms in suit sleeves with white cuffs resting on armrests
  for (const s of [-1, 1]) {
    // Upper arm
    torso.add(at(cyl(0.09, 0.08, 0.38, suitMat, 10), s * 0.38, 0.36, 0.05, -0.22, 0, s * 0.18));
    // Elbow
    torso.add(at(ball(0.08, suitMat), s * 0.43, 0.19, 0.12));
    // Forearm forward along armrest
    torso.add(at(cyl(0.075, 0.065, 0.36, suitMat, 10), s * 0.46, 0.18, 0.3, Math.PI / 2 - 0.06, 0, -s * 0.06));
    // Crisp white shirt cuff
    torso.add(at(cyl(0.066, 0.064, 0.05, shirtMat, 10), s * 0.47, 0.17, 0.48, Math.PI / 2, 0, 0));
    // Hand resting naturally on armrest end
    torso.add(at(box(0.08, 0.065, 0.12, skinMat), s * 0.47, 0.165, 0.55));
  }

  // Realistic head, neck, ears, nose, expressive eyes, brows, hair & optional glasses/beard/headset
  torso.add(at(cyl(0.075, 0.085, 0.14, skinMat, 10), 0, 0.7, 0.02));
  const head = new THREE.Group();
  head.position.set(0, 0.89, 0.03);
  torso.add(head);

  const cranium = ball(0.21, skinMat);
  cranium.scale.set(0.92, 1.08, 0.96);
  head.add(cranium);
  // Ears & subtle nose
  head.add(at(ball(0.042, skinMat), -0.195, -0.01, -0.01));
  head.add(at(ball(0.042, skinMat), 0.195, -0.01, -0.01));
  head.add(at(box(0.038, 0.065, 0.05, skinMat), 0, -0.01, 0.2));

  // Eyes (sclera + dark iris), eyebrows & mouth
  const whiteMat = mat('#f8fafc', { roughness: 0.2 });
  const darkMat = mat('#111827', { roughness: 0.2 });
  for (const s of [-1, 1]) {
    head.add(at(ball(0.026, whiteMat), s * 0.068, 0.035, 0.182));
    head.add(at(ball(0.016, darkMat), s * 0.068, 0.035, 0.2));
    head.add(at(box(0.062, 0.015, 0.02, hairMat), s * 0.068, 0.078, 0.186, 0, 0, isChaser ? -s * 0.18 : 0));
  }
  head.add(at(box(0.068, 0.016, 0.02, mat('#8c4a3e', { roughness: 0.6 })), 0, -0.085, 0.188));

  // Optional neat beard/mustache
  if (p.beard) {
    head.add(at(box(0.09, 0.024, 0.03, hairMat), 0, -0.056, 0.194));
    const chinBeard = ball(0.12, hairMat);
    chinBeard.scale.set(1.08, 0.72, 0.85);
    head.add(at(chinBeard, 0, -0.125, 0.1));
  }

  // Styled executive hair
  const hairCap = ball(0.215, hairMat);
  hairCap.scale.set(0.95, 0.85, 1.0);
  head.add(at(hairCap, 0, 0.075, -0.025));
  if (p.hairStyle === 'part') {
    head.add(at(box(0.28, 0.08, 0.22, hairMat), 0.03, 0.19, 0.04, 0, 0, -0.08));
  } else if (p.hairStyle === 'bun') {
    head.add(at(ball(0.105, hairMat), 0, 0.12, -0.22));
  } else if (p.hairStyle === 'bob') {
    head.add(at(box(0.41, 0.24, 0.22, hairMat), 0, -0.02, -0.08));
  } else {
    // Swept-back senior executive hair
    head.add(at(box(0.32, 0.1, 0.28, hairMat), 0, 0.18, -0.02, -0.15, 0, 0));
  }

  // Optional executive eyeglasses
  if (p.glasses) {
    const lensMat = mat('#cbd5e1', { roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.35 });
    for (const s of [-1, 1]) {
      head.add(at(torus(0.046, 0.008, frameMat), s * 0.07, 0.035, 0.205));
      head.add(at(cyl(0.042, 0.042, 0.006, lensMat, 12), s * 0.07, 0.035, 0.205, Math.PI / 2, 0, 0));
      // Temple arm to ear
      head.add(at(box(0.012, 0.012, 0.22, frameMat), s * 0.125, 0.038, 0.1));
    }
    head.add(at(box(0.048, 0.01, 0.01, frameMat), 0, 0.038, 0.208));
  }

  // Optional Bluetooth / On-Call conference headset
  if (p.headset) {
    const hsMat = mat('#111827', { roughness: 0.3, metalness: 0.6 });
    head.add(at(cyl(0.045, 0.045, 0.024, hsMat, 10), 0.215, 0.0, 0.0, 0, 0, Math.PI / 2));
    head.add(at(box(0.014, 0.014, 0.18, hsMat), 0.16, -0.055, 0.11, 0.15, -0.45, 0));
    head.add(at(ball(0.014, mat('#38bdf8', { emissive: '#38bdf8', emissiveIntensity: 1.8 })), 0.228, 0.015, 0.01));
  }

  return exec;
}

/** Builds a high-back black leather executive swivel chair with directional LED chevron & seated executive! */
function buildSwivelChairStation(chair, includeBenchDev, variantIdx = 0, isChaser = false) {
  const g = new THREE.Group();
  g.position.set(chair.x, 0, chair.side * 1.15);
  const swivel = new THREE.Group();
  swivel.rotation.y = chair.side === 1 ? 0 : Math.PI;
  g.add(swivel);

  const leather = mat('#1c2028', { roughness: 0.42, metalness: 0.14 });
  const chrome = mat('#ced4da', { roughness: 0.2, metalness: 0.88 });
  const ledCol = chair.side === 1 ? '#38bdf8' : '#ffd43b';
  const ledMat = mat(ledCol, { emissive: ledCol, emissiveIntensity: 1.5 });

  // 5-star chrome caster base + hydraulic cylinder + under-seat directional LED ring
  swivel.add(at(cyl(0.62, 0.68, 0.1, chrome, 5), 0, 0.08, 0));
  swivel.add(at(cyl(0.08, 0.08, 0.65, chrome, 8), 0, 0.4, 0));
  swivel.add(at(torus(0.55, 0.04, ledMat), 0, 0.14, 0, Math.PI / 2, 0, 0));
  // Seat cushion, tall executive backrest & armrests
  swivel.add(at(box(1.15, 0.16, 1.1, leather), 0, 0.78, 0));
  swivel.add(at(box(1.08, 1.45, 0.16, leather), 0, 1.54, -0.48, -0.08, 0, 0));
  swivel.add(at(box(0.12, 0.42, 0.78, leather), -0.58, 1.05, -0.05));
  swivel.add(at(box(0.12, 0.42, 0.78, leather), 0.58, 1.05, -0.05));

  if (includeBenchDev) {
    swivel.add(buildSeatedExecutive(variantIdx, isChaser));
  }

  return { root: g, swivel, baseYaw: chair.side === 1 ? 0 : Math.PI };
}

/** Builds the West Rolling Projector Cart with glowing cyan projection lens! */
function buildProjectorCart(x) {
  const g = new THREE.Group();
  g.position.set(x, 0, 0);
  const steel = mat('#495057', { roughness: 0.4, metalness: 0.78 });
  const shelf = mat('#212529', { roughness: 0.55 });
  for (const [lx, lz] of [[-0.65, -0.55], [0.65, -0.55], [-0.65, 0.55], [0.65, 0.55]]) {
    g.add(at(cyl(0.05, 0.05, 1.85, steel, 8), lx, 0.92, lz));
  }
  g.add(at(box(1.5, 0.1, 1.3, shelf), 0, 0.45, 0));
  g.add(at(box(1.5, 0.1, 1.3, shelf), 0, 1.85, 0));
  // Projector unit + glowing cyan lens beam
  g.add(at(box(0.95, 0.34, 0.78, mat('#e9ecef', { roughness: 0.35 })), 0, 2.08, 0));
  g.add(at(cyl(0.14, 0.14, 0.12, mat('#38bdf8', { emissive: '#38bdf8', emissiveIntensity: 2.0 }), 12), -0.5, 2.08, 0, 0, 0, Math.PI / 2));
  return g;
}

/** Builds the East Stainless-Steel Chai & Samosa Trolley with glinting cutting-chai cups! */
function buildChaiTrolley(x) {
  const g = new THREE.Group();
  g.position.set(x, 0, 0);
  const chrome = mat('#dee2e6', { roughness: 0.2, metalness: 0.9 });
  for (const [lx, lz] of [[-0.7, -0.55], [0.7, -0.55], [-0.7, 0.55], [0.7, 0.55]]) {
    g.add(at(cyl(0.05, 0.05, 1.75, chrome, 8), lx, 0.88, lz));
  }
  g.add(at(box(1.6, 0.09, 1.3, chrome), 0, 0.5, 0));
  g.add(at(box(1.6, 0.09, 1.3, chrome), 0, 1.65, 0));
  // Brass chai kettle + 4 glinting cutting-chai glasses + golden samosa plate!
  g.add(at(cyl(0.24, 0.28, 0.48, mat('#e6b84c', { roughness: 0.25, metalness: 0.85 }), 12), -0.35, 1.94, 0));
  const glassMat = mat('#ffd8a8', { emissive: '#f59f00', emissiveIntensity: 0.35, roughness: 0.15 });
  for (const [gx, gz] of [[0.25, -0.25], [0.55, -0.25], [0.25, 0.25], [0.55, 0.25]]) {
    g.add(at(cyl(0.09, 0.07, 0.26, glassMat, 10), gx, 1.82, gz));
  }
  return g;
}

/** Builds an animated office-casual bobblehead runner with developer portrait face! */
function buildBoardroomRunner(name, kind, color, disposables) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const shirtMat = mat(color, { roughness: 0.55 });
  const pantsMat = mat('#212529', { roughness: 0.85 });
  const leftLeg = at(cyl(0.09, 0.08, 0.6, pantsMat, 8), -0.14, 0.3, 0);
  const rightLeg = at(cyl(0.09, 0.08, 0.6, pantsMat, 8), 0.14, 0.3, 0);
  body.add(leftLeg, rightLeg);
  body.add(at(cyl(0.24, 0.2, 0.72, shirtMat, 12), 0, 0.96, 0));
  const leftArm = at(cyl(0.07, 0.06, 0.52, shirtMat, 8), -0.32, 1.04, 0);
  const rightArm = at(cyl(0.07, 0.06, 0.52, shirtMat, 8), 0.32, 1.04, 0);
  body.add(leftArm, rightArm);

  const head = new THREE.Group();
  head.position.set(0, 1.64, 0);
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

  const tag = makeKhokhoTag(name, color);
  root.add(tag.sprite);
  disposables.push(faceGeo, faceMat, tag.tex, tag.spriteMat);
  return { root, body, leftLeg, rightLeg, leftArm, rightArm, head };
}

/** Builds a rolling neon-amber P1 ESCALATION chaser seated on a blazing swivel chair! */
function buildRollingChaser(label, disposables) {
  const g = new THREE.Group();
  const chair = buildSwivelChairStation({ x: 0, side: 1 }, true, 0, true);
  chair.root.position.set(0, 0, 0);
  g.add(chair.root);
  const glowRing = at(torus(0.85, 0.09, mat('#ff922b', { emissive: '#ff6b00', emissiveIntensity: 2.0 })), 0, 0.15, 0, Math.PI / 2, 0, 0);
  g.add(glowRing);
  const tag = makeKhokhoTag(label, '#ff922b');
  tag.sprite.position.y = 2.65;
  g.add(tag.sprite);
  disposables.push(tag.tex, tag.spriteMat);
  return g;
}

/** Builds the late-evening Indian IT Executive Boardroom, central walnut spine, swivel chairs & carts! */
function buildKhokhoArena(scene, spineHalfL, chairs, disposables) {
  scene.background = new THREE.Color('#131926');
  scene.fog = new THREE.Fog('#131926', 58, 155);

  scene.add(new THREE.HemisphereLight('#dbeafe', '#1e2433', 1.15));
  const key = new THREE.DirectionalLight('#fff5e0', 1.4);
  key.position.set(12, 26, 16);
  scene.add(key);
  const corridorGlow = new THREE.PointLight('#ffb74d', 38, 42, 1.4);
  corridorGlow.position.set(0, 8, -14);
  scene.add(corridorGlow);

  const HALF_W = 28;
  const HALF_D = 18;
  const CEIL_Y = 18;

  // Midnight-slate geometric office carpet floor
  const carpetTex = makeOfficeCarpetTexture();
  const carpetMat = new THREE.MeshStandardMaterial({ map: carpetTex, roughness: 0.92 });
  disposables.push(carpetTex, carpetMat);
  scene.add(at(plane(HALF_W * 2, HALF_D * 2, carpetMat), 0, 0, 0, -Math.PI / 2, 0, 0));

  // Glowing cyan floor cable-trays marking the Central Spine & North/South chase aisles
  const cableMat = mat('#38bdf8', { emissive: '#22d3ee', emissiveIntensity: 1.4 });
  scene.add(at(box(spineHalfL * 2 + 2.4, 0.04, 0.22, cableMat), 0, 0.02, 0));
  scene.add(at(box(spineHalfL * 2 + 4.8, 0.04, 0.14, cableMat), 0, 0.02, AISLE_HALF_Z));
  scene.add(at(box(spineHalfL * 2 + 4.8, 0.04, 0.14, cableMat), 0, 0.02, -AISLE_HALF_Z));

  // Modern glass & plaster executive boardroom walls
  const wallMat = mat('#2a3346', { roughness: 0.82 });
  const glassMat = mat('#64748b', { roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.35 });
  scene.add(at(plane(HALF_W * 2, CEIL_Y, wallMat), 0, CEIL_Y / 2, -HALF_D));
  scene.add(at(plane(HALF_D * 2, CEIL_Y, wallMat), -HALF_W, CEIL_Y / 2, 0, 0, Math.PI / 2, 0));
  scene.add(at(plane(HALF_D * 2, CEIL_Y, wallMat), HALF_W, CEIL_Y / 2, 0, 0, -Math.PI / 2, 0));
  scene.add(at(plane(HALF_W * 2, CEIL_Y, glassMat), 0, CEIL_Y / 2, HALF_D, 0, Math.PI, 0));

  // Back Wall (z = -HALF_D): Giant Chaotic Microservices & Kho-Kho Whiteboard!
  const alumMat = mat('#ced4da', { roughness: 0.3, metalness: 0.8 });
  const wbTex = makeBoardroomWhiteboardTexture();
  wbTex.anisotropy = 4;
  const wbMat = new THREE.MeshStandardMaterial({ map: wbTex, roughness: 0.24 });
  disposables.push(wbTex, wbMat);
  scene.add(at(box(24.6, 12.6, 0.26, alumMat), 0, 7.2, -HALF_D + 0.16));
  scene.add(at(plane(24.0, 12.0, wbMat), 0, 7.2, -HALF_D + 0.32));
  scene.add(at(box(24.2, 0.22, 0.65, alumMat), 0, 0.98, -HALF_D + 0.45));
  scene.add(at(cyl(0.07, 0.07, 0.95, mat('#c92a2a'), 8), -4.2, 1.15, -HALF_D + 0.56, 0, 0, Math.PI / 2));
  scene.add(at(cyl(0.07, 0.07, 0.95, mat('#1864ab'), 8), -2.8, 1.15, -HALF_D + 0.56, 0, 0, Math.PI / 2));
  scene.add(at(box(1.1, 0.28, 0.42, mat('#495057')), 1.8, 1.22, -HALF_D + 0.55));

  // Right Wall (x = +HALF_W): Second Dry-Erase Whiteboard (On-Call P1 War Room Checklist)
  const wb2Tex = makeOnCallWhiteboardTexture();
  wb2Tex.anisotropy = 4;
  const wb2Mat = new THREE.MeshStandardMaterial({ map: wb2Tex, roughness: 0.24 });
  disposables.push(wb2Tex, wb2Mat);
  const wb2W = 20.4;
  const wb2H = 10.6;
  const wb2Y = 7.4;
  scene.add(at(box(0.26, wb2H + 0.6, wb2W + 0.6, alumMat), HALF_W - 0.16, wb2Y, 0));
  const secretBoard = at(plane(wb2W, wb2H, wb2Mat), HALF_W - 0.32, wb2Y, 0, 0, -Math.PI / 2, 0);
  scene.add(secretBoard);
  scene.add(at(box(0.65, 0.22, wb2W + 0.2, alumMat), HALF_W - 0.45, wb2Y - wb2H / 2 - 0.28, 0));
  scene.add(at(cyl(0.07, 0.07, 0.95, mat('#2b8a3e'), 8), HALF_W - 0.56, wb2Y - wb2H / 2 - 0.1, -3.2, Math.PI / 2, 0, 0));
  scene.add(at(cyl(0.07, 0.07, 0.95, mat('#e67700'), 8), HALF_W - 0.56, wb2Y - wb2H / 2 - 0.1, -1.8, Math.PI / 2, 0, 0));
  scene.add(at(box(0.42, 0.28, 1.1, mat('#495057')), HALF_W - 0.55, wb2Y - wb2H / 2 - 0.04, 2.0));

  // Left Wall (x = -HALF_W): Tall Executive Boardroom Double Doors
  const walnut = mat('#543520', { roughness: 0.4 });
  const doorTrimMat = mat('#1c2028', { roughness: 0.5, metalness: 0.35 });
  const doorChromeMat = mat('#ced4da', { roughness: 0.22, metalness: 0.88 });
  const doorGlassMat = mat('#ffd8a8', { roughness: 0.2, metalness: 0.1, emissive: '#f59f00', emissiveIntensity: 0.32 });
  const DOOR_W = 8.4;
  const DOOR_H = 11.4;
  const doorX = -HALF_W + 0.18;
  // Outer dark aluminum doorframe
  scene.add(at(box(0.36, DOOR_H + 0.55, DOOR_W + 0.85, doorTrimMat), doorX - 0.04, DOOR_H / 2 + 0.22, 0));
  // Left & right walnut door leaves with center reveal gap
  scene.add(at(box(0.3, DOOR_H, DOOR_W / 2 - 0.08, walnut), doorX, DOOR_H / 2, -DOOR_W / 4 - 0.02));
  scene.add(at(box(0.3, DOOR_H, DOOR_W / 2 - 0.08, walnut), doorX, DOOR_H / 2, DOOR_W / 4 + 0.02));
  // Frosted warm-lit vision panels, brushed-chrome pull handles & kickplates
  for (const side of [-1, 1]) {
    scene.add(at(box(0.34, 6.4, 1.05, doorGlassMat), doorX, DOOR_H / 2 + 1.2, side * 1.35));
    scene.add(at(cyl(0.08, 0.08, 2.0, doorChromeMat, 10), doorX + 0.26, 4.9, side * 0.46));
    scene.add(at(box(0.33, 1.15, DOOR_W / 2 - 0.34, doorChromeMat), doorX, 0.62, side * (DOOR_W / 4 + 0.02)));
  }
  // Glowing green EXIT sign mounted above the door lintel
  const exitTex = canvasTexture(256, 96, (ctx, w, h) => {
    ctx.fillStyle = '#0f291e';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#51cf66';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, w - 12, h - 12);
    ctx.fillStyle = '#69db7c';
    ctx.font = `900 54px ${FONT_UI}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EXIT', w / 2, h / 2 + 2);
  });
  const exitMat = new THREE.MeshBasicMaterial({ map: exitTex });
  disposables.push(exitTex, exitMat);
  scene.add(at(box(0.32, 1.05, 2.75, doorTrimMat), doorX + 0.06, DOOR_H + 1.35, 0));
  scene.add(at(plane(2.5, 0.88, exitMat), doorX + 0.24, DOOR_H + 1.35, 0, 0, Math.PI / 2, 0));

  // Sleek Matte-Walnut Central Conference Table Spine (z = 0) with laptops
  const spineLen = spineHalfL * 2 - 2.6;
  scene.add(at(box(spineLen, 0.26, 1.55, walnut), 0, 1.32, 0));
  for (const lx of [-spineLen * 0.38, 0, spineLen * 0.38]) {
    scene.add(at(box(0.45, 1.32, 0.9, mat('#212529', { metalness: 0.7 })), lx, 0.66, 0));
  }
  const laptopMat = mat('#ced4da', { metalness: 0.75 });
  for (const ch of chairs) {
    scene.add(at(box(0.85, 0.05, 0.6, laptopMat), ch.x, 1.48, ch.side * 0.32));
  }

  // Alternating leather executive swivel chairs (N–S–N–S) with seated On-Call Bench executives!
  const chairVisuals = chairs.map((ch, i) => {
    const vis = buildSwivelChairStation(ch, true, i, false);
    scene.add(vis.root);
    return { sim: ch, ...vis };
  });

  // West Rolling Projector Cart & East Stainless-Steel Chai & Samosa Trolley
  const westCart = buildProjectorCart(-spineHalfL);
  const eastCart = buildChaiTrolley(spineHalfL);
  scene.add(westCart, eastCart);

  return { chairVisuals, westCart, eastCart, secretBoard };
}

// ------------------------------------------------------------------ 'S' / Projector Easter Egg Helpers

/** Computes the ideal camera pose framing the right-wall CDC whiteboard (20.4 x 10.6 at x=27.68, y=7.4, z=0). */
function cdcWhiteboardZoomPose(camera) {
  const tanHalfV = Math.tan(THREE.MathUtils.degToRad((camera.fov || 46) / 2));
  const tanHalfH = tanHalfV * Math.max(0.5, camera.aspect || 16 / 9);
  const distV = (10.6 * 1.12) / (2 * tanHalfV);
  const distH = (20.4 * 1.12) / (2 * tanHalfH);
  const dist = Math.min(26, Math.max(distV, distH));
  return {
    pos: new THREE.Vector3(27.68 - dist, 7.4, 0),
    look: new THREE.Vector3(27.68, 7.4, 0),
  };
}

/**
 * Binds both Easter egg triggers for zooming onto the right-wall CDC whiteboard:
 * 1) Pressing 'S' on the keyboard (ignoring inputs/textareas/modifiers)
 * 2) Clicking the West Rolling Projector Cart on the 3D canvas (or clicking the whiteboard while zoomed to return)
 */
function bindSecretWhiteboardTriggers({ isActive, getCamera, getTargets, isZoomed, onToggle }) {
  if (typeof window === 'undefined') return () => {};
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  const onKeyDown = (e) => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key !== 's' && e.key !== 'S') return;
    const tag = e.target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) return;
    if (!isActive()) return;
    onToggle();
  };

  const onClick = (e) => {
    if (e.button !== 0 || e.target?.tagName !== 'CANVAS') return;
    if (!isActive()) return;
    const rect = e.target.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, getCamera());
    const { projector, board } = getTargets();
    const targets = isZoomed() ? [projector, board].filter(Boolean) : [projector].filter(Boolean);
    if (targets.length && raycaster.intersectObjects(targets, true).length > 0) {
      onToggle();
    }
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('click', onClick);
  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('click', onClick);
  };
}

// ------------------------------------------------------------------ Lobby 3D Stage

export class KhokhoStage {
  constructor(aspect = 16 / 9, initialNames = [], { duration = DEFAULT_KHOKHO_DURATION } = {}) {
    this.t = 0;
    this.names = [];
    this.models = [];
    this.disposables = [];
    this.zoomSecretBoard = false;
    this._lastUpdateMs = 0;
    const previewSim = new KhokhoSim({ names: initialNames.length >= 2 ? initialNames : ['Ada', 'Grace'], duration });

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(46, aspect, 0.3, 180);
    this.arena = buildKhokhoArena(this.scene, previewSim.spineHalfL, previewSim.chairs, this.disposables);
    this.spineHalfL = previewSim.spineHalfL;
    this.camPos = new THREE.Vector3(0, 7.6, 16.0);
    this.camLook = new THREE.Vector3(0, 3.0, 0);
    this.unbindSecretKey = bindSecretWhiteboardTriggers({
      isActive: () => performance.now() - this._lastUpdateMs < 250,
      getCamera: () => this.camera,
      getTargets: () => ({ projector: this.arena.westCart, board: this.arena.secretBoard }),
      isZoomed: () => this.zoomSecretBoard,
      onToggle: () => { this.zoomSecretBoard = !this.zoomSecretBoard; },
    });
    this.setLineup(initialNames);
    this.resize(aspect);
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 1 ? 60 : 46;
    this.camera.updateProjectionMatrix();
  }

  setLineup(names = []) {
    if (names.length === this.names.length && names.every((n, i) => n === this.names[i])) return;
    for (const m of this.models) this.scene.remove(m.root);
    this.models = [];
    this.names = [...names];

    const colors = ['#38bdf8', '#ff6b6b', '#51cf66', '#ffd43b', '#cc5de8', '#ff922b'];
    const n = Math.max(1, names.length);
    names.forEach((name, i) => {
      const side = i % 2 === 0 ? 1 : -1;
      const x = n === 1 ? 0 : -this.spineHalfL * 0.78 + (i / (n - 1)) * (this.spineHalfL * 1.56);
      const kind = DEVELOPER_KINDS[i % DEVELOPER_KINDS.length];
      const dev = buildBoardroomRunner(name, kind, colors[i % colors.length], this.disposables);
      dev.root.position.set(x, 0, side * 4.5);
      dev.body.rotation.y = side === 1 ? Math.PI : 0;
      this.scene.add(dev.root);
      this.models.push({ ...dev, phase: i * 0.7 });
    });
  }

  update(dt, reduced = false) {
    this._lastUpdateMs = performance.now();
    if (!reduced) this.t += dt;
    const t = this.t;
    for (const m of this.models) {
      if (!reduced) {
        m.head.rotation.z = Math.sin(t * 4.2 + m.phase) * 0.14;
        m.leftArm.rotation.x = Math.sin(t * 3.8 + m.phase) * 0.35;
        m.rightArm.rotation.x = -Math.sin(t * 3.8 + m.phase) * 0.35;
      }
    }
    let wantPos;
    let wantLook;
    if (this.zoomSecretBoard) {
      ({ pos: wantPos, look: wantLook } = cdcWhiteboardZoomPose(this.camera));
    } else {
      const ang = reduced ? 0.12 : t * 0.18;
      wantPos = new THREE.Vector3(Math.sin(ang) * 20.5, 7.6, Math.cos(ang) * 16.0);
      wantLook = new THREE.Vector3(0, 3.0, 0);
    }
    const blend = reduced ? 1 : Math.min(1, dt * 6.0);
    this.camPos.lerp(wantPos, blend);
    this.camLook.lerp(wantLook, blend);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
  }

  dispose() {
    this.unbindSecretKey?.();
    for (const d of this.disposables) d.dispose?.();
  }
}

// ------------------------------------------------------------------ Live Match

export class KhokhoMatch {
  constructor(names, { duration = DEFAULT_KHOKHO_DURATION, rule = DEFAULT_KHOKHO_RULE, rng = Math.random, sfx = null, onEvent = null, onWinner = null } = {}) {
    this.sim = new KhokhoSim({ names, duration, rule, rng });
    this.sfx = sfx;
    this.onEvent = onEvent;
    this.onWinner = onWinner;
    this.accumulator = 0;
    this.victoryTime = 0;
    this.shake = 0;
    this.winnerAnnounced = false;
    this.disposables = [];

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.3, 180);
    this.arena = buildKhokhoArena(this.scene, this.sim.spineHalfL, this.sim.chairs, this.disposables);
    this.particles = new Particles(this.scene);

    this.chaserVisuals = [
      buildRollingChaser('🚨 P1 ESCALATION', this.disposables),
      buildRollingChaser('🚨 VP ESCALATION', this.disposables),
    ];
    for (const cv of this.chaserVisuals) this.scene.add(cv);

    this.runnerVisuals = this.sim.runners.map((r, i) => {
      const kind = DEVELOPER_KINDS[i % DEVELOPER_KINDS.length];
      const vis = buildBoardroomRunner(r.name, kind, r.color, this.disposables);
      vis.root.position.set(r.x, 0, r.z);
      this.scene.add(vis.root);
      return { sim: r, ...vis, yaw: 0 };
    });

    this.camPos = new THREE.Vector3(0, 14.2, 16.5);
    this.camLook = new THREE.Vector3(0, 1.2, 0);
    this.zoomSecretBoard = false;
    this._lastUpdateMs = 0;
    this.unbindSecretKey = bindSecretWhiteboardTriggers({
      isActive: () => performance.now() - this._lastUpdateMs < 250,
      getCamera: () => this.camera,
      getTargets: () => ({ projector: this.arena.westCart, board: this.arena.secretBoard }),
      isZoomed: () => this.zoomSecretBoard,
      onToggle: () => { this.zoomSecretBoard = !this.zoomSecretBoard; },
    });
    this.resize(window.innerWidth / window.innerHeight);
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 1 ? 60 : 46;
    this.camera.updateProjectionMatrix();
  }

  update(realDt) {
    this._lastUpdateMs = performance.now();
    const inFinalSlowMo = !this.sim.done && this.sim.time > this.sim.duration * 0.87 && this.sim.time < this.sim.duration * 0.96;
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

    // Sync damped 180-degree swivel chair spins on KHO! launches
    for (const cv of this.arena.chairVisuals) {
      const p = cv.sim.spinT / 0.75;
      cv.swivel.rotation.y = cv.baseYaw + (p > 0 ? Math.PI * (1 - p) * 2 : 0);
    }
    // Sync cart rattle wobble on 180-degree Cart-Whip reversals
    this.arena.westCart.rotation.z = Math.sin(t * 32) * this.sim.westWobbleT * 0.16;
    this.arena.eastCart.rotation.z = Math.sin(t * 32) * this.sim.eastWobbleT * 0.16;

    // Sync active rolling P1 ESCALATION chaser(s)
    this.sim.chasers.forEach((c, i) => {
      const vis = this.chaserVisuals[i];
      vis.visible = c.active;
      if (c.active) {
        vis.position.set(c.x, 0, c.z);
        vis.rotation.y = Math.atan2(c.vx, c.vz);
        vis.rotation.x = c.diveT > 0 ? 0.55 : 0;
      }
    });

    // Sync sprinting office-casual bobblehead runners
    for (const rv of this.runnerVisuals) {
      const r = rv.sim;
      const winHop = this.sim.winner === r && !r.tagged ? Math.abs(Math.sin(this.victoryTime * 6.5)) * 0.55 : 0;
      rv.root.position.set(r.x, winHop, r.z);
      const speed = Math.hypot(r.vx, r.vz);
      if (speed > 0.4) rv.yaw = Math.atan2(r.vx, r.vz);
      if (r.tagged) {
        rv.body.rotation.y += realDt * 4.5;
        rv.leftArm.rotation.z = 0.8;
        rv.rightArm.rotation.z = -0.8;
      } else {
        rv.body.rotation.y = rv.yaw;
        const swing = Math.sin(t * 15 + r.phase) * Math.min(1, speed / 6);
        rv.leftLeg.rotation.x = swing * 0.75;
        rv.rightLeg.rotation.x = -swing * 0.75;
        rv.leftArm.rotation.x = -swing * 0.85;
        rv.rightArm.rotation.x = swing * 0.85;
        rv.head.rotation.z = Math.sin(t * 10 + r.phase) * 0.14;
        if (this.sim.winner === r) {
          rv.leftArm.rotation.z = 2.4;
          rv.rightArm.rotation.z = -2.4;
        }
      }
    }

    this.particles.update(realDt);

    // Dynamic Camera: Overhead 3/4 Boardroom -> Projector-Cart Slow-Mo -> 360° Eye-Level Victory Orbit
    if (this.shake > 0) this.shake = Math.max(0, this.shake - realDt * 4.2);
    const kickY = Math.sin(t * 50) * this.shake * 0.55;
    const wantPos = new THREE.Vector3();
    const wantLook = new THREE.Vector3(0, 1.4, 0);

    if (this.zoomSecretBoard) {
      const pose = cdcWhiteboardZoomPose(this.camera);
      wantPos.copy(pose.pos);
      wantLook.copy(pose.look);
    } else if (this.sim.winner) {
      const orbitAng = this.victoryTime * 0.22;
      wantPos.set(Math.sin(orbitAng) * 18.5, 5.8, Math.cos(orbitAng) * 15.0);
      wantLook.set(this.sim.winner.x * 0.45, 3.0, this.sim.winner.z * 0.45);
    } else if (inFinalSlowMo) {
      wantPos.set(-this.sim.spineHalfL - 4.5, 3.4, 8.5);
      wantLook.set(-this.sim.spineHalfL * 0.5, 1.2, 0);
    } else {
      wantPos.set(this.sim.chasers[0].x * 0.22, 13.6 + kickY, 15.8);
    }

    const camRate = this.zoomSecretBoard ? 6.5 : 4.5;
    this.camPos.lerp(wantPos, Math.min(1, realDt * camRate));
    this.camLook.lerp(wantLook, Math.min(1, realDt * (camRate + 0.5)));
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
  }

  handleEvent(e) {
    if (e.type === 'kho') {
      this.sfx?.play?.('khokhoSlap');
      this.shake = 0.55;
      this.particles.burst(new THREE.Vector3(e.chair.x, 1.2, e.chair.side * 1.15), {
        count: 10,
        colors: ['#ffd43b', '#ff922b', '#ffffff'],
        speed: 4.5,
        up: 3.5,
        life: 0.45,
        size: 0.14,
        gravity: 11,
      });
      this.onEvent?.({
        type: 'status',
        text: `🪑 KHO! ${e.chain}x CHAIN · DODGED: ${e.remaining} / ${this.sim.runners.length}`,
        tone: 'yellow',
      });
      this.onEvent?.({ type: 'note', text: `🪑 KHO! “${e.popup}”`, important: false });
    } else if (e.type === 'whip') {
      if (e.post === 'east') this.sfx?.play?.('khokhoChai');
    } else if (e.type === 'vp') {
      this.sfx?.play?.('khokhoChime');
      this.shake = 0.8;
      this.onEvent?.({ type: 'status', text: '🚨 VP JOINED THE CALL! DOUBLE CHASER SURGE!', tone: 'red' });
      this.onEvent?.({ type: 'note', text: `📞 VP JOINED: “${e.popup}”`, important: true });
    } else if (e.type === 'tagged') {
      this.sfx?.play?.('khokhoSlap');
      this.particles.burst(new THREE.Vector3(e.runner.x, 1.3, e.runner.z), {
        count: 14,
        colors: ['#ffd43b', '#ff6b6b', '#ffffff'],
        speed: 4.8,
        up: 4.5,
        life: 0.6,
        size: 0.16,
        gravity: 12,
      });
      this.onEvent?.({
        type: 'status',
        text: `🪑 DODGED: ${e.remaining} / ${this.sim.runners.length} · KHO CHAIN: ${this.sim.khoChain}x`,
        tone: e.remaining <= 3 ? 'red' : 'yellow',
      });
      this.onEvent?.({ type: 'note', text: `🏷️ ${e.runner.name} ASSIGNED P1: “${e.popup}”`, important: false });
    } else if (e.type === 'winner' && !this.winnerAnnounced) {
      this.winnerAnnounced = true;
      this.sfx?.play?.('khokhoWin');
      this.sfx?.fanfare?.();
      this.particles.burst(new THREE.Vector3(e.runner.x, 1.6, e.runner.z), {
        count: 72,
        colors: ['#ffd43b', '#38bdf8', '#ff6b6b', '#51cf66', '#ffffff'],
        speed: 7.5,
        up: 9.0,
        life: 1.9,
        size: 0.25,
        gravity: 12,
      });
      this.onWinner?.(e.runner, this.sim);
    }
  }

  dispose() {
    this.unbindSecretKey?.();
    for (const d of this.disposables) d.dispose?.();
  }
}
