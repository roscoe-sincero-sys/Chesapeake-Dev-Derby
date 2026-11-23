// "Rum-Shop Domino Slam" (Table-Shaking Shockwave Survival): scarred mahogany/pine rum-shop
// tabletop with chalk PROD vs BUGS score tally, warm hanging Edison veranda bulbs, bouncing
// translucent red/amber plastic cups & shiny bottle caps, colossal glossy 3D dominoes with
// brass spinners & glowing pips, expanding shockwave rings, micro-camera shake, 40ms hit-stop,
// and Claw-of-Destiny bobblehead devs scrambling to stay on the table!

import * as THREE from 'three';
import { mat, box, ball, cyl, torus, plane, at, canvasTexture, FONT_UI, FONT_MONO, roundRect } from './util3d.js';
import { Particles } from './effects.js';
import { DEVELOPER_KINDS } from './deathmatch-sim.js';
import {
  DominoSim,
  TABLE_HALF_W,
  TABLE_HALF_D,
  TILE_W,
  TILE_D,
  TILE_H,
  DEFAULT_DOMINO_DURATION,
  DEFAULT_DOMINO_RULE,
} from './domino-sim.js';

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

/** Scarred mahogany rum-shop tabletop texture with wood planks, glass ring stains & chalk PROD vs BUGS tally. */
function makeTabletopTexture() {
  return canvasTexture(1024, 768, (ctx, w, h) => {
    ctx.fillStyle = '#4a2c1a';
    ctx.fillRect(0, 0, w, h);

    // Horizontal weathered hardwood planks
    const planks = 8;
    const ph = h / planks;
    for (let i = 0; i < planks; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#52321e' : '#452817';
      ctx.fillRect(0, i * ph, w, ph - 3);
      ctx.fillStyle = '#24140b';
      ctx.fillRect(0, (i + 1) * ph - 3, w, 3);
      // Wood grain streaks
      for (let g = 0; g < 22; g++) {
        ctx.fillStyle = g % 2 === 0 ? 'rgba(255,215,165,0.045)' : 'rgba(18,8,2,0.08)';
        ctx.fillRect(0, i * ph + (g / 22) * ph, w, 2);
      }
    }

    // Subtle rum-glass ring stains
    ctx.strokeStyle = 'rgba(255, 232, 200, 0.12)';
    ctx.lineWidth = 4;
    for (const [rx, ry, rr] of [[170, 140, 44], [830, 620, 48], [760, 160, 38], [210, 610, 42]]) {
      ctx.beginPath();
      ctx.arc(rx, ry, rr, 0, Math.PI * 2);
      ctx.stroke();
    }

    // White chalk score tally along the front rim: PROD vs BUGS
    ctx.strokeStyle = 'rgba(248, 249, 250, 0.72)';
    ctx.fillStyle = 'rgba(248, 249, 250, 0.78)';
    ctx.font = `900 26px ${FONT_MONO}`;
    ctx.fillText('PROD', 58, h - 54);
    ctx.fillText('BUGS', 220, h - 54);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(46, h - 42); ctx.lineTo(320, h - 42);
    ctx.moveTo(185, h - 78); ctx.lineTo(185, h - 14);
    // Tally marks
    for (let t = 0; t < 4; t++) {
      ctx.moveTo(64 + t * 16, h - 34); ctx.lineTo(64 + t * 16, h - 14);
    }
    ctx.moveTo(56, h - 18); ctx.lineTo(120, h - 32);
    for (let t = 0; t < 3; t++) {
      ctx.moveTo(228 + t * 16, h - 34); ctx.lineTo(228 + t * 16, h - 14);
    }
    ctx.stroke();
  });
}

/** Procedural double-six domino top-face texture with divider bar, brass spinner & neon-coded pips. */
function makeDominoFaceTexture(a, b, kind) {
  return canvasTexture(512, 256, (ctx, w, h) => {
    const isDark = kind === 'sixlove';
    ctx.fillStyle = isDark ? '#141720' : '#f7f3e8';
    ctx.fillRect(0, 0, w, h);

    // Outer beveled border
    const borderCol = kind === 'pose' ? '#f59f00' : kind === 'deadlock' ? '#22b8cf' : kind === 'sixlove' ? '#ff6b6b' : '#2b303a';
    ctx.strokeStyle = borderCol;
    ctx.lineWidth = 10;
    ctx.strokeRect(8, 8, w - 16, h - 16);

    // Center divider groove
    ctx.fillStyle = isDark ? '#ffd43b' : '#2b303a';
    ctx.fillRect(w / 2 - 4, 24, 8, h - 48);

    // Draw pips for value `val` inside left (offsetX = 0) or right (offsetX = w/2) half
    const pipColor = kind === 'pose' ? '#e67700' : kind === 'deadlock' ? '#15aabf' : kind === 'sixlove' ? '#ffd43b' : '#1a1e26';
    const pipLayout = {
      0: [],
      1: [[0.5, 0.5]],
      2: [[0.28, 0.28], [0.72, 0.72]],
      3: [[0.28, 0.28], [0.5, 0.5], [0.72, 0.72]],
      4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
      5: [[0.28, 0.28], [0.72, 0.28], [0.5, 0.5], [0.28, 0.72], [0.72, 0.72]],
      6: [[0.26, 0.26], [0.5, 0.26], [0.74, 0.26], [0.26, 0.74], [0.5, 0.74], [0.74, 0.74]],
    };
    const drawHalf = (val, ox) => {
      ctx.fillStyle = pipColor;
      for (const [px, py] of (pipLayout[val] ?? [])) {
        ctx.beginPath();
        ctx.arc(ox + px * (w / 2), py * h, 17, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    drawHalf(a, 0);
    drawHalf(b, w / 2);
  });
}

/** Upright high-contrast player nameplate sprite. */
function makeDominoTag(name, color) {
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
  sprite.position.set(0, 2.45, 0);
  return { sprite, tex, spriteMat };
}

/** Builds a glossy colossal 3D domino slab with brass center spinner pin & glowing pip face. */
function buildDominoTile(slam, disposables) {
  const g = new THREE.Group();
  const faceTex = makeDominoFaceTexture(slam.a, slam.b, slam.kind);
  disposables.push(faceTex);
  const bodyColor = slam.kind === 'sixlove' ? '#181c26' : '#f2ede0';
  const sideMat = mat(bodyColor, { roughness: 0.22, metalness: 0.12 });
  const topMat = new THREE.MeshStandardMaterial({
    map: faceTex,
    roughness: 0.2,
    metalness: 0.1,
    emissive: slam.kind === 'pose' ? '#f59f00' : slam.kind === 'deadlock' ? '#22b8cf' : slam.kind === 'sixlove' ? '#ff6b6b' : '#000000',
    emissiveIntensity: slam.kind === 'chain' || slam.kind === 'pinch' ? 0 : 0.3,
  });
  disposables.push(topMat);

  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(TILE_W, TILE_H, TILE_D),
    [sideMat, sideMat, topMat, sideMat, sideMat, sideMat],
  );
  disposables.push(slab.geometry);
  g.add(slab);
  // Metallic brass center spinner pin!
  g.add(at(cyl(0.14, 0.14, 0.06, mat('#e6b84c', { roughness: 0.2, metalness: 0.88 }), 14), 0, TILE_H / 2 + 0.02, 0));
  return g;
}

/** Builds an animated bobblehead tabletop runner (Claw-of-Destiny portrait). */
function buildTableRunner(name, kind, color, disposables) {
  const root = new THREE.Group();
  const shirtMat = mat(kind.shirt ?? color, { roughness: 0.6 });
  const pantsMat = mat('#2b303a', { roughness: 0.85 });

  const leftLeg = at(cyl(0.09, 0.08, 0.6, pantsMat, 8), -0.14, 0.3, 0);
  const rightLeg = at(cyl(0.09, 0.08, 0.6, pantsMat, 8), 0.14, 0.3, 0);
  root.add(leftLeg, rightLeg);
  root.add(at(cyl(0.24, 0.2, 0.72, shirtMat, 12), 0, 0.96, 0));
  const leftArm = at(cyl(0.07, 0.06, 0.52, shirtMat, 8), -0.32, 1.04, 0);
  const rightArm = at(cyl(0.07, 0.06, 0.52, shirtMat, 8), 0.32, 1.04, 0);
  root.add(leftArm, rightArm);

  const head = new THREE.Group();
  head.position.set(0, 1.64, 0);
  head.add(at(cyl(0.4, 0.4, 0.14, mat(kind.accent ?? color, { roughness: 0.35 }), 24), 0, 0, 0, Math.PI / 2, 0, 0));
  const portraitTex = getDeveloperPortraitTexture(kind.id);
  const faceMat = new THREE.MeshStandardMaterial({ map: portraitTex, roughness: 0.35 });
  const faceGeo = new THREE.CircleGeometry(0.37, 24);
  const front = new THREE.Mesh(faceGeo, faceMat);
  front.position.set(0, 0, 0.076);
  const back = new THREE.Mesh(faceGeo, faceMat);
  back.rotation.y = Math.PI;
  back.position.set(0, 0, -0.076);
  head.add(front, back);
  root.add(head);

  const tag = makeDominoTag(name, kind.accent ?? color);
  root.add(tag.sprite);
  disposables.push(faceGeo, faceMat, tag.tex, tag.spriteMat);

  return { root, leftLeg, rightLeg, leftArm, rightArm, head };
}

/** Builds a high-back leather executive conference room chair positioned around the boardroom table. */
function buildConferenceChair(x, z, yaw) {
  const g = new THREE.Group();
  g.position.set(x, -8.5, z);
  g.rotation.y = yaw;
  const leather = mat('#232730', { roughness: 0.48, metalness: 0.12 });
  const chrome = mat('#ced4da', { roughness: 0.2, metalness: 0.85 });

  // 5-star chrome base + pneumatic column
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    g.add(at(cyl(0.08, 0.08, 2.0, chrome, 6), Math.cos(a) * 0.9, 0.35, Math.sin(a) * 0.9, 0, -a, Math.PI / 2));
  }
  g.add(at(cyl(0.18, 0.22, 4.2, chrome, 10), 0, 2.2, 0));
  // Padded seat & tall executive backrest (visible rising above the table rim!)
  g.add(at(box(3.4, 0.55, 3.2, leather), 0, 4.5, 0));
  g.add(at(box(3.2, 5.4, 0.55, leather), 0, 7.4, -1.45, -0.08, 0, 0));
  // Curved chrome armrests
  for (const sx of [-1.85, 1.85]) {
    g.add(at(box(0.24, 1.6, 0.24, chrome), sx, 5.4, 0));
    g.add(at(box(0.32, 0.22, 2.2, leather), sx, 6.2, -0.1));
  }
  return g;
}

/** Builds the office conference room surrounding the domino table (walls, ceiling troffers, whiteboard, TV, glass wall, blinds & chairs). */
function buildConferenceRoom(scene, disposables) {
  const ROOM_W = 27;
  const ROOM_D = 23;
  const FLOOR_Y = -8.5;
  const CEIL_Y = 18.5;
  const WALL_H = CEIL_Y - FLOOR_Y;
  const WALL_MID_Y = (CEIL_Y + FLOOR_Y) / 2;

  // Commercial speckled carpet floor & acoustic drop ceiling
  const carpetTex = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#252a34';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(12, 15, 22, 0.45)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, w - 2, h - 2);
    for (let i = 0; i < 1600; i++) {
      ctx.fillStyle = i % 3 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(8,10,16,0.12)';
      ctx.fillRect((i * 53) % w, (i * 97) % h, 2, 2);
    }
  });
  carpetTex.wrapS = THREE.RepeatWrapping;
  carpetTex.wrapT = THREE.RepeatWrapping;
  carpetTex.repeat.set(10, 10);

  const ceilTex = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#323846';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#4e586d';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, w - 4, h - 4);
    ctx.beginPath();
    ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h);
    ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
    ctx.stroke();
  });
  ceilTex.wrapS = THREE.RepeatWrapping;
  ceilTex.wrapT = THREE.RepeatWrapping;
  ceilTex.repeat.set(9, 8);

  const carpetMat = new THREE.MeshStandardMaterial({ map: carpetTex, roughness: 0.95 });
  const ceilMat = new THREE.MeshStandardMaterial({ map: ceilTex, roughness: 0.92 });
  disposables.push(carpetTex, ceilTex, carpetMat, ceilMat);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W * 2, ROOM_D * 2), carpetMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = FLOOR_Y;
  scene.add(floor);

  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W * 2, ROOM_D * 2), ceilMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = CEIL_Y;
  scene.add(ceil);

  // 4 painted boardroom walls with dark walnut baseboard & chair-rail molding
  const wallMat = mat('#363d4d', { roughness: 0.88 });
  const accentWallMat = mat('#2c3342', { roughness: 0.88 });
  const trimMat = mat('#3b2416', { roughness: 0.72 });
  scene.add(at(box(ROOM_W * 2, WALL_H, 0.5, wallMat), 0, WALL_MID_Y, -ROOM_D));
  scene.add(at(box(ROOM_W * 2, WALL_H, 0.5, accentWallMat), 0, WALL_MID_Y, ROOM_D));
  scene.add(at(box(0.5, WALL_H, ROOM_D * 2, wallMat), ROOM_W, WALL_MID_Y, 0));
  scene.add(at(box(0.5, WALL_H, ROOM_D * 2, accentWallMat), -ROOM_W, WALL_MID_Y, 0));
  // Chair rail molding
  scene.add(at(box(ROOM_W * 2 - 0.6, 0.35, 0.2, trimMat), 0, -0.8, -ROOM_D + 0.3));
  scene.add(at(box(0.2, 0.35, ROOM_D * 2 - 0.6, trimMat), ROOM_W - 0.3, -0.8, 0));

  // Recessed parabolic-louver fluorescent ceiling troffers
  const frameMat = mat('#868e96', { roughness: 0.35, metalness: 0.72 });
  const diffMat = mat('#fffbf0', { emissive: '#eef4ff', emissiveIntensity: 1.45 });
  for (const tx of [-9, 9]) {
    for (const tz of [-7, 7]) {
      scene.add(at(box(7.2, 0.22, 2.4, frameMat), tx, CEIL_Y - 0.12, tz));
      scene.add(at(box(6.8, 0.08, 2.0, diffMat), tx, CEIL_Y - 0.2, tz));
    }
  }
  const roomLight = new THREE.PointLight('#f4f7ff', 42, 48, 1.4);
  roomLight.position.set(0, CEIL_Y - 1.8, 0);
  scene.add(roomLight);

  // Wall 1 (-Z): Dry-erase conference room whiteboard with domino-slam sprint notes
  const wbTex = canvasTexture(512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#adb5bd';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = '#1864ab';
    ctx.font = `900 28px ${FONT_UI}`;
    ctx.fillText('CONFERENCE ROOM B · STANDUP', 26, 48);
    ctx.fillStyle = '#c92a2a';
    ctx.font = `700 22px ${FONT_MONO}`;
    ctx.fillText('• POSE 6-6 = PROD DEPLOY', 34, 102);
    ctx.fillStyle = '#2b8a3e';
    ctx.fillText('• 0-0 DEADLOCK = CALL DBA', 34, 144);
    ctx.fillStyle = '#d9480f';
    ctx.fillText('• SIX-LOVE = BUY COFFEE!', 34, 186);
    ctx.fillStyle = '#495057';
    ctx.font = `700 18px ${FONT_UI}`;
    ctx.fillText('DO NOT ERASE (HR APPROVED)', 34, 228);
  });
  const wbMat = new THREE.MeshStandardMaterial({ map: wbTex, roughness: 0.25 });
  disposables.push(wbTex, wbMat);
  scene.add(at(box(16.6, 8.6, 0.25, mat('#adb5bd', { metalness: 0.6 })), 0, 6.2, -ROOM_D + 0.4));
  scene.add(at(plane(16.0, 8.0, wbMat), 0, 6.2, -ROOM_D + 0.56));
  scene.add(at(box(16.4, 0.24, 0.55, mat('#868e96', { metalness: 0.6 })), 0, 1.9, -ROOM_D + 0.6));

  // Wall 2 (+X): Mounted 4K Conference Room TV Display
  const tvTex = canvasTexture(512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#0d1320';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, w - 12, h - 12);
    ctx.fillStyle = '#38bdf8';
    ctx.font = `900 26px ${FONT_MONO}`;
    ctx.fillText('BOARDROOM STATUS · LIVE', 28, 48);
    ctx.fillStyle = '#51cf66';
    ctx.font = `800 32px ${FONT_MONO}`;
    ctx.fillText('DOMINO SLAM · SPRINT 42', 28, 114);
    ctx.fillStyle = '#ffd43b';
    ctx.font = `700 22px ${FONT_UI}`;
    ctx.fillText('Table Integrity: SHAKING', 28, 168);
    ctx.fillStyle = '#ff8787';
    ctx.fillText('Noise Complaint Level: MAX', 28, 208);
  });
  const tvMat = new THREE.MeshStandardMaterial({ map: tvTex, emissive: '#1c7ed6', emissiveIntensity: 0.45 });
  disposables.push(tvTex, tvMat);
  scene.add(at(box(0.35, 8.4, 15.6, mat('#151820', { roughness: 0.3, metalness: 0.5 })), ROOM_W - 0.45, 6.2, 0));
  scene.add(at(plane(14.8, 7.6, tvMat), ROOM_W - 0.66, 6.2, 0, 0, -Math.PI / 2, 0));

  // Wall 3 (-X): Frosted glass conference room partition with brushed aluminum mullions
  const glassMat = mat('#99c2dc', { roughness: 0.18, metalness: 0.15, transparent: true, opacity: 0.28 });
  scene.add(at(plane(24, 15, glassMat), -ROOM_W + 0.45, 3.5, 0, 0, Math.PI / 2, 0));
  for (const gz of [-12, -4, 4, 12]) {
    scene.add(at(box(0.3, 15.4, 0.35, frameMat), -ROOM_W + 0.45, 3.5, gz));
  }

  // Wall 4 (+Z): Venetian-blind office windows visible during the 360-degree victory orbit
  const blindTex = canvasTexture(256, 256, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#364f78');
    grad.addColorStop(0.55, '#c97a4b');
    grad.addColorStop(1, '#f2b866');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 12) {
      ctx.fillStyle = 'rgba(28, 34, 46, 0.72)';
      ctx.fillRect(0, y, w, 6);
    }
    ctx.strokeStyle = '#1c222e';
    ctx.lineWidth = 10;
    ctx.strokeRect(0, 0, w, h);
  });
  const blindMat = new THREE.MeshStandardMaterial({ map: blindTex, emissive: '#c97a4b', emissiveIntensity: 0.5 });
  disposables.push(blindTex, blindMat);
  for (const wx of [-11, 0, 11]) {
    scene.add(at(plane(8.5, 9.5, blindMat), wx, 6.2, ROOM_D - 0.4, 0, Math.PI, 0));
  }

  // Executive leather conference chairs tucked around all 4 sides of the mahogany table
  for (const cx of [-6.5, 0, 6.5]) {
    scene.add(buildConferenceChair(cx, -TABLE_HALF_D - 2.2, 0));
    scene.add(buildConferenceChair(cx, TABLE_HALF_D + 2.2, Math.PI));
  }
  scene.add(buildConferenceChair(-TABLE_HALF_W - 2.3, 0, Math.PI / 2));
  scene.add(buildConferenceChair(TABLE_HALF_W + 2.3, 0, -Math.PI / 2));
}

/** Builds the office conference room mahogany domino table, chairs, whiteboard, TV, cups & bottle caps! */
function buildDominoArena(scene, disposables) {
  scene.background = new THREE.Color('#1a202c');
  scene.fog = new THREE.Fog('#1a202c', 45, 110);

  scene.add(new THREE.HemisphereLight('#e6f0ff', '#1c202a', 0.95));
  const key = new THREE.DirectionalLight('#fff5e4', 1.3);
  key.position.set(10, 26, 12);
  scene.add(key);

  buildConferenceRoom(scene, disposables);

  // Scarred mahogany conference tabletop with beveled apron rim
  const topTex = makeTabletopTexture();
  disposables.push(topTex);
  const topMat = new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.6, metalness: 0.08 });
  const rimMat = mat('#361e10', { roughness: 0.7 });
  disposables.push(topMat);

  const table = new THREE.Mesh(
    new THREE.BoxGeometry(TABLE_HALF_W * 2, 0.85, TABLE_HALF_D * 2),
    [rimMat, rimMat, topMat, rimMat, rimMat, rimMat],
  );
  disposables.push(table.geometry);
  table.position.y = -0.425;
  scene.add(table);

  // Heavy walnut conference-table pedestals down to the carpeted floor
  for (const lx of [-TABLE_HALF_W + 2.4, TABLE_HALF_W - 2.4]) {
    scene.add(at(box(1.4, 7.7, TABLE_HALF_D * 1.15, rimMat), lx, -4.65, 0));
  }

  // Oversized translucent rum-shop plastic cups & shiny bottle caps that bounce on every slam!
  const props = [];
  const cupSpecs = [
    { x: -TABLE_HALF_W + 1.4, z: -TABLE_HALF_D + 1.4, color: '#e03131' },
    { x: TABLE_HALF_W - 1.5, z: -TABLE_HALF_D + 1.6, color: '#f59f00' },
    { x: TABLE_HALF_W - 1.4, z: TABLE_HALF_D - 1.5, color: '#e03131' },
  ];
  for (const cs of cupSpecs) {
    const cup = new THREE.Group();
    const cupMat = mat(cs.color, { roughness: 0.25, transparent: true, opacity: 0.82 });
    cup.add(at(cyl(0.82, 0.56, 2.1, cupMat, 18), 0, 1.05, 0));
    cup.add(at(torus(0.82, 0.06, mat('#f8f9fa', { roughness: 0.3 })), 0, 2.08, 0, Math.PI / 2, 0, 0));
    cup.position.set(cs.x, 0, cs.z);
    scene.add(cup);
    props.push({ mesh: cup, baseY: 0, vy: 0, tilt: 0 });
  }

  // Scattered shiny bottle caps
  for (const [cx, cz, col] of [[-7.5, 4.8, '#ffd43b'], [6.8, -4.5, '#4dabf7'], [-5.2, -5.4, '#51cf66'], [7.4, 3.8, '#ff6b6b']]) {
    const cap = at(cyl(0.36, 0.38, 0.1, mat(col, { roughness: 0.3, metalness: 0.78 }), 14), cx, 0.05, cz);
    scene.add(cap);
    props.push({ mesh: cap, baseY: 0.05, vy: 0, tilt: 0 });
  }

  return { props };
}

// ------------------------------------------------------------------ Lobby 3D Stage

export class DominoStage {
  constructor(aspect = 16 / 9, initialNames = []) {
    this.t = 0;
    this.names = [];
    this.models = [];
    this.disposables = [];

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(46, aspect, 0.3, 180);
    this.arena = buildDominoArena(this.scene, this.disposables);
    // Display a showcase Double-Six POSE! domino right on center table
    this.heroTile = buildDominoTile({ a: 6, b: 6, kind: 'pose' }, this.disposables);
    this.heroTile.position.set(0, TILE_H / 2, 0);
    this.scene.add(this.heroTile);

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

    const n = Math.max(1, names.length);
    names.forEach((name, i) => {
      const a = (i / n) * Math.PI * 2;
      const rad = 4.2 + (i % 2) * 1.4;
      const x = Math.cos(a) * rad * 1.3;
      const z = Math.sin(a) * rad * 0.9;
      const kind = DEVELOPER_KINDS[i % DEVELOPER_KINDS.length];
      const runner = buildTableRunner(name, kind, kind.accent, this.disposables);
      runner.root.position.set(x, 0, z);
      this.scene.add(runner.root);
      this.models.push({ ...runner, phase: i * 0.8 });
    });
  }

  update(dt, reduced = false) {
    if (!reduced) this.t += dt;
    const t = this.t;
    for (const m of this.models) {
      m.root.position.y = reduced ? 0 : Math.abs(Math.sin(t * 4.5 + m.phase)) * 0.16;
      m.head.rotation.z = reduced ? 0 : Math.sin(t * 4.5 + m.phase) * 0.14;
    }
    const sway = reduced ? 0 : Math.sin(t * 0.3) * 4.2;
    this.camera.position.set(sway, 14.5, 16.5);
    this.camera.lookAt(0, 0.5, 0);
  }

  dispose() {
    for (const d of this.disposables) d.dispose?.();
  }
}

// ------------------------------------------------------------------ Live Match

export class DominoMatch {
  constructor(names, { duration = DEFAULT_DOMINO_DURATION, rule = DEFAULT_DOMINO_RULE, rng = Math.random, sfx = null, onEvent = null, onWinner = null } = {}) {
    this.sim = new DominoSim({ names, duration, rule, rng });
    this.sfx = sfx;
    this.onEvent = onEvent;
    this.onWinner = onWinner;
    this.accumulator = 0;
    this.hitStop = 0;
    this.shake = 0;
    this.victoryTime = 0;
    this.winnerAnnounced = false;
    this.disposables = [];

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.3, 180);
    this.arena = buildDominoArena(this.scene, this.disposables);
    this.particles = new Particles(this.scene);

    this.shadows = new Map();
    this.tiles = [];
    this.shockRings = [];

    this.runners = this.sim.players.map((p, i) => {
      const kind = DEVELOPER_KINDS[i % DEVELOPER_KINDS.length];
      const visual = buildTableRunner(p.name, kind, p.color, this.disposables);
      visual.root.position.set(p.x, 0, p.z);
      this.scene.add(visual.root);
      return { sim: p, ...visual };
    });

    this.camPos = new THREE.Vector3(0, 14.5, 16.5);
    this.camLook = new THREE.Vector3(0, 0.5, 0);
    this.resize(window.innerWidth / window.innerHeight);
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 1 ? 60 : 46;
    this.camera.updateProjectionMatrix();
  }

  update(realDt) {
    if (this.hitStop > 0) {
      this.hitStop -= realDt;
      this.particles.update(realDt * 0.25);
      return;
    }

    const lastSlam = this.sim.slams.at(-1);
    const inFinalSlowMo = lastSlam && this.sim.time > lastSlam.at - 0.55 && this.sim.time < lastSlam.at + 0.45;
    const dt = inFinalSlowMo ? realDt * 0.42 : realDt;

    this.accumulator += dt;
    let steps = 0;
    while (this.accumulator >= STEP && steps < 8) {
      this.sim.step(STEP);
      this.accumulator -= STEP;
      steps++;
      for (const e of this.sim.drainEvents()) this.handleEvent(e);
    }

    const t = this.sim.time;

    // Animate falling & landed dominoes
    for (const tile of this.tiles) {
      if (tile.y > TILE_H / 2) {
        tile.y = Math.max(TILE_H / 2, tile.y - realDt * 42);
        tile.mesh.position.y = tile.y;
      }
    }

    // Animate expanding shockwave rings
    for (let i = this.shockRings.length - 1; i >= 0; i--) {
      const sr = this.shockRings[i];
      sr.age += realDt;
      const u = sr.age / 0.65;
      if (u >= 1) {
        this.scene.remove(sr.mesh);
        this.shockRings.splice(i, 1);
      } else {
        sr.mesh.scale.setScalar(1 + u * 8.5);
        sr.mat.opacity = (1 - u) * 0.85;
      }
    }

    // Bounce cups & bottle caps after table slams
    for (const pr of this.arena.props) {
      if (pr.mesh.position.y > pr.baseY || pr.vy > 0) {
        pr.vy -= 22 * realDt;
        pr.mesh.position.y += pr.vy * realDt;
        if (pr.mesh.position.y <= pr.baseY) {
          pr.mesh.position.y = pr.baseY;
          pr.vy = 0;
        }
        pr.mesh.rotation.z = Math.sin(t * 20) * pr.tilt;
        pr.tilt *= 0.92;
      }
    }

    if (this.sim.done) this.victoryTime += realDt;

    // Sync bobblehead tabletop runners (and keep gravity running on fallen players after sim.done!)
    for (const r of this.runners) {
      const p = r.sim;
      if (this.sim.done && p.eliminated) {
        p.vy -= 26 * realDt;
        p.x += p.vx * realDt * 0.45;
        p.z += p.vz * realDt * 0.45;
        p.y += p.vy * realDt;
      }
      if (p.eliminated && p.y < -12) {
        r.root.visible = false;
        continue;
      }
      const victoryHop = this.sim.done && p === this.sim.winner && !p.eliminated
        ? Math.abs(Math.sin(this.victoryTime * 6.5)) * 0.45
        : 0;
      r.root.position.set(p.x, p.y + victoryHop, p.z);
      const speed = Math.hypot(p.vx, p.vz);
      const animT = this.sim.done ? this.victoryTime : t;
      const swing = p.eliminated ? animT * 18 : Math.sin(animT * 14 + p.id) * Math.min(0.7, speed * 0.15);
      r.leftLeg.rotation.x = swing;
      r.rightLeg.rotation.x = -swing;
      r.leftArm.rotation.z = p.eliminated ? Math.sin(animT * 20) * 1.3 : -swing * 0.5;
      r.rightArm.rotation.z = p.eliminated ? -Math.sin(animT * 20) * 1.3 : swing * 0.5;
      if (p.eliminated) r.root.rotation.x += realDt * 4.5;
    }

    this.particles.update(realDt);

    // Camera with damped vertical slam kick -> smooth 360-degree victory orbit circling the table!
    if (this.shake > 0) this.shake = Math.max(0, this.shake - realDt * 3.8);
    const kickY = Math.sin(t * 55) * this.shake * 0.75;
    const wantPos = new THREE.Vector3(Math.sin(t * 0.25) * 3.2, 14.5 + kickY, 16.5);
    const wantLook = new THREE.Vector3(0, 0.4, 0);
    if (this.sim.winner) {
      const orbitAng = this.victoryTime * 0.52;
      wantPos.set(Math.sin(orbitAng) * 18.0, 11.2, Math.cos(orbitAng) * 18.0);
      wantLook.set(0, 0.7, 0);
    }

    this.camPos.lerp(wantPos, Math.min(1, realDt * 5.0));
    this.camLook.lerp(wantLook, Math.min(1, realDt * 5.5));
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
  }

  handleEvent(e) {
    if (e.type === 'shadow') {
      const s = e.slam;
      const col = s.kind === 'pose' ? '#ffd43b' : s.kind === 'deadlock' ? '#3bc9db' : '#ff4d4f';
      const shMat = mat(col, { emissive: col, emissiveIntensity: 1.5, transparent: true, opacity: 0.45 });
      const sh = at(box(TILE_W * 1.08, 0.03, TILE_D * 1.08, shMat), s.x, 0.03, s.z, 0, s.rot, 0);
      this.scene.add(sh);
      this.shadows.set(s.index, sh);
    } else if (e.type === 'slam') {
      const s = e.slam;
      const sh = this.shadows.get(s.index);
      if (sh) { this.scene.remove(sh); this.shadows.delete(s.index); }

      const mesh = buildDominoTile(s, this.disposables);
      mesh.position.set(s.x, 6.5, s.z);
      mesh.rotation.y = s.rot;
      this.scene.add(mesh);
      this.tiles.push({ mesh, y: 6.5 });

      // Shockwave ring + chalk dust + cup bounce + micro-shake!
      const ringCol = s.kind === 'deadlock' ? '#3bc9db' : s.kind === 'sixlove' ? '#ff6b6b' : '#ffd43b';
      const ringMat = new THREE.MeshBasicMaterial({ color: ringCol, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
      const ringGeo = new THREE.RingGeometry(0.9, 1.35, 32);
      this.disposables.push(ringMat, ringGeo);
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(s.x, 0.05, s.z);
      this.scene.add(ring);
      this.shockRings.push({ mesh: ring, mat: ringMat, age: 0 });

      for (const pr of this.arena.props) {
        pr.vy = 4.2 + Math.random() * 2.5;
        pr.tilt = 0.25;
      }
      this.shake = s.kind === 'pose' || s.kind === 'sixlove' ? 1.0 : 0.65;
      if (s.kind === 'pose' || s.kind === 'sixlove') this.hitStop = 0.04;

      this.sfx?.play?.('dominoSlam');
      this.particles.burst(new THREE.Vector3(s.x, 0.4, s.z), {
        count: 24,
        colors: ['#f8f9fa', ringCol, '#ffd8a8'],
        speed: 6.5,
        up: 4.5,
        life: 0.75,
        size: 0.22,
        gravity: 12,
      });

      const tag = s.kind === 'pose' ? 'POSE!' : s.kind === 'sixlove' ? 'SIX-LOVE!' : s.kind === 'deadlock' ? '0–0 DEADLOCK!' : 'SLAM!';
      this.onEvent?.({ type: 'status', text: `🁣 ${tag} · ON TABLE: ${this.sim.activeCount()} / ${this.sim.players.length}`, tone: s.kind === 'sixlove' ? 'red' : 'yellow' });
      this.onEvent?.({ type: 'note', text: `🁣 ${tag} “${s.popup}”`, important: true });
    } else if (e.type === 'knock') {
      this.sfx?.play?.('dominoKnock');
      this.shake = 0.55;
      for (const pr of this.arena.props) { pr.vy = 5.5; pr.tilt = 0.3; }
      this.onEvent?.({ type: 'note', text: `✊ KNOCK-KNOCK! “${e.knock.popup}”`, important: true });
    } else if (e.type === 'eliminated') {
      this.sfx?.play?.('dominoDrop');
      this.onEvent?.({ type: 'status', text: `🁣 ON TABLE: ${e.remaining} / ${this.sim.players.length}`, tone: 'yellow' });
      this.onEvent?.({ type: 'note', text: `💥 ${e.player.name} blasted off the table: “${e.popup}”`, important: false });
    } else if (e.type === 'winner' && !this.winnerAnnounced) {
      this.winnerAnnounced = true;
      this.sfx?.play?.('dominoWin');
      this.sfx?.fanfare?.();
      this.particles.burst(new THREE.Vector3(e.player.x, 1.5, e.player.z), {
        count: 68,
        colors: ['#ffd43b', '#ff6b6b', '#51cf66', '#3bc9db', '#ffffff'],
        speed: 7.5,
        up: 9.2,
        life: 1.9,
        size: 0.28,
        gravity: 12,
      });
      this.onWinner?.(e.player, this.sim);
    }
  }

  dispose() {
    for (const d of this.disposables) d.dispose?.();
  }
}
