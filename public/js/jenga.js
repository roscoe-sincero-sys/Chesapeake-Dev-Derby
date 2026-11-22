// "Dependency Jenga" (3D Collapsing Tower): authentic 3:1 maple/birch wooden Jenga tower with
// laser-etched package labels above a glowing PROD OUTAGE ZONE pit, all 2-30 devs standing solidly
// on the flat top platform, grounded base tier with realistic hinge-tier wobble & micro-shudder,
// automated `npm audit fix --force` cursor, live STABILITY hologram, and directional 0.35x slow-mo
// topple collapse where the winner lands safely on the glowing `LTS-support` block.

import * as THREE from 'three';
import { mat, box, ball, cyl, cone, torus, plane, at, canvasTexture, FONT_UI, FONT_MONO, roundRect } from './util3d.js';
import { Particles } from './effects.js';
import { DEVELOPER_KINDS } from './deathmatch-sim.js';
import { buildDeveloperModel } from './deathmatch-avatars.js';
import {
  planJengaMatch,
  towerSwayAt,
  stabilityAt,
  perchPositions,
  SAFE_BLOCKS,
  KEYSTONE_BLOCKS,
  DEFAULT_JENGA_DURATION,
  BLOCK_LENGTH,
  BLOCK_WIDTH,
  BLOCK_HEIGHT,
  SLOW_MO_SCALE,
} from './jenga-sim.js';

const WOOD_PALETTES = [
  ['#e3c598', '#d8b683', '#cba56f'],
  ['#dcb988', '#cfab77', '#c29b64'],
  ['#e8cda4', '#dcbe8e', '#cfa976'],
];

/** Authentic maple/birch Jenga wood texture with natural grain and crisp laser-etched package label. */
function makeBlockLabelTexture(label, isKeystone, woodTone = 0, isLts = false) {
  return canvasTexture(512, 96, (ctx, w, h) => {
    if (isLts) {
      ctx.fillStyle = '#12362a';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#20c997';
      ctx.lineWidth = 7;
      ctx.strokeRect(4, 4, w - 8, h - 8);
      ctx.fillStyle = '#96f2d7';
    } else if (isKeystone) {
      // Glowing crimson load-bearing keystone block
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, '#4f101e');
      grad.addColorStop(0.5, '#6b1629');
      grad.addColorStop(1, '#4f101e');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#ff335c';
      ctx.lineWidth = 7;
      ctx.strokeRect(4, 4, w - 8, h - 8);
      ctx.fillStyle = '#ffe3e8';
    } else {
      // Natural warm maple/birch Jenga wood grain + subtle chamfer edge + dark laser-etched text
      const pal = WOOD_PALETTES[woodTone % WOOD_PALETTES.length];
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, pal[0]);
      grad.addColorStop(0.55, pal[1]);
      grad.addColorStop(1, pal[2]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Fine organic wood-grain fibers
      ctx.strokeStyle = 'rgba(112, 74, 34, 0.16)';
      ctx.lineWidth = 1.8;
      for (let y = 8; y < h; y += 9) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(w * 0.3, y + Math.sin(y) * 2.5, w * 0.7, y - Math.cos(y) * 2.5, w, y);
        ctx.stroke();
      }

      // Subtle bevel edge frame so individual stacked Jenga blocks read unmistakably cleanly
      ctx.strokeStyle = 'rgba(72, 46, 20, 0.45)';
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, w - 4, h - 4);

      // Subtle laser-etched dark wood text
      ctx.fillStyle = '#2d1c0c';
    }
    ctx.font = `800 30px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const text = label.length > 26 ? `${label.slice(0, 25)}…` : label;
    ctx.fillText(text, w / 2, h / 2 + 1);
  });
}

/** Natural wood top/end grain texture so Jenga blocks look genuinely wooden from every angle. */
function makeWoodGrainTexture(woodTone = 0, isKeystone = false, isLts = false) {
  return canvasTexture(256, 128, (ctx, w, h) => {
    if (isLts) {
      ctx.fillStyle = '#154233';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#20c997';
      ctx.lineWidth = 5;
      ctx.strokeRect(3, 3, w - 6, h - 6);
      return;
    }
    if (isKeystone) {
      ctx.fillStyle = '#5c1222';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#ff335c';
      ctx.lineWidth = 5;
      ctx.strokeRect(3, 3, w - 6, h - 6);
      return;
    }
    const pal = WOOD_PALETTES[woodTone % WOOD_PALETTES.length];
    ctx.fillStyle = pal[1];
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(112, 74, 34, 0.18)';
    ctx.lineWidth = 2;
    for (let y = 10; y < h; y += 12) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y + ((y % 24) - 12) * 0.15);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(72, 46, 20, 0.35)';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, w - 4, h - 4);
  });
}

/** Builds a single realistic 3:1 wooden Jenga block mesh with cached material lookup. */
function createBlockMesh(label, isKeystone, woodTone, texCache, disposables, isLts = false) {
  const key = `${isLts ? 'lts' : isKeystone ? 'key' : `w${woodTone}`}:${label}`;
  let mats = texCache.get(key);
  if (!mats) {
    const sideTex = makeBlockLabelTexture(label, isKeystone, woodTone, isLts);
    const grainTex = makeWoodGrainTexture(woodTone, isKeystone, isLts);
    disposables.push(sideTex, grainTex);
    const labelMat = new THREE.MeshStandardMaterial({
      map: sideTex,
      roughness: isKeystone || isLts ? 0.38 : 0.72,
      metalness: isKeystone || isLts ? 0.16 : 0.02,
      emissive: isLts ? '#20c997' : isKeystone ? '#ff2a55' : '#000000',
      emissiveIntensity: isLts ? 0.45 : isKeystone ? 0.65 : 0,
    });
    const woodMat = new THREE.MeshStandardMaterial({
      map: grainTex,
      roughness: 0.76,
      metalness: 0.02,
      emissive: isLts ? '#20c997' : isKeystone ? '#c92a2a' : '#000000',
      emissiveIntensity: isLts ? 0.25 : isKeystone ? 0.3 : 0,
    });
    disposables.push(labelMat, woodMat);
    // BoxGeometry faces: +x, -x, +y, -y, +z, -z (long side faces are +z and -z)
    mats = [woodMat, woodMat, woodMat, woodMat, labelMat, labelMat];
    texCache.set(key, mats);
  }
  const geo = new THREE.BoxGeometry(BLOCK_LENGTH - 0.05, BLOCK_HEIGHT - 0.03, BLOCK_WIDTH - 0.05);
  disposables.push(geo);
  return new THREE.Mesh(geo, mats);
}

/** Draws the Wall 1 conference-room whiteboard: funny itemized plan to lie to SOC about Jenga Connect audit logs. */
function makeSocWhiteboardTexture() {
  return canvasTexture(1024, 512, (ctx, w, h) => {
    // Glossy off-white porcelain whiteboard surface with subtle dry-erase ghosting
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#f8fafc');
    bg.addColorStop(1, '#eef2f6');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Subtle faint marker smudges
    ctx.fillStyle = 'rgba(180, 198, 218, 0.14)';
    ctx.fillRect(60, 120, 420, 46);
    ctx.fillRect(520, 290, 340, 38);

    // Header (blue dry-erase marker)
    ctx.fillStyle = '#1864ab';
    ctx.font = `900 34px ${FONT_UI}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('JENGA CONNECT — SOC AUDIT LOG PLAN', 36, 48);

    // Red dry-erase underline + cheeky stamp
    ctx.strokeStyle = '#c92a2a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(34, 70);
    ctx.lineTo(728, 70);
    ctx.stroke();

    ctx.save();
    ctx.translate(878, 56);
    ctx.rotate(-0.08);
    ctx.strokeStyle = '#c92a2a';
    ctx.lineWidth = 4;
    roundRect(ctx, -106, -24, 212, 48, 8);
    ctx.stroke();
    ctx.fillStyle = '#c92a2a';
    ctx.font = `900 22px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText('CONFIDENTIAL!', 0, 2);
    ctx.restore();

    // Subtitle
    ctx.fillStyle = '#495057';
    ctx.font = `700 21px ${FONT_UI}`;
    ctx.textAlign = 'left';
    ctx.fillText('Official talking points for SOC review (when audit logs are 100% live):', 36, 102);

    // Funny itemized plan
    const items = [
      ['1.', 'Tell SOC audit logs "aren\'t implemented yet" (tentative Q4 2039 roadmap).'],
      ['2.', 'Move /var/log/jenga-connect-audit.log into /tmp/.definitely-not-logs'],
      ['3.', 'Claim userLogin requires an "800-column legacy schema refactor" first.'],
      ['4.', 'Rename eventLog.db  ->  dev_survivor_votes_backup.old'],
      ['5.', 'Blame SOC for not being clear until SOC drops it.'],
      ['6.', 'CLOSE Splunk & Kibana tabs BEFORE sharing screen with SOC!!'],
    ];
    let y = 148;
    for (let i = 0; i < items.length; i++) {
      ctx.fillStyle = i === 5 ? '#c92a2a' : '#1864ab';
      ctx.font = `900 24px ${FONT_MONO}`;
      ctx.fillText(items[i][0], 40, y);
      ctx.fillStyle = i === 5 ? '#a61e4d' : '#212529';
      ctx.font = `700 23px ${FONT_UI}`;
      ctx.fillText(items[i][1], 84, y);
      y += 46;
    }

    // Bottom red sticky warning box
    ctx.fillStyle = '#fff5f5';
    roundRect(ctx, 36, 424, w - 72, 62, 12);
    ctx.fill();
    ctx.strokeStyle = '#e03131';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = '#c92a2a';
    ctx.font = `900 25px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText('REMINDER: Jenga Connect audit logs ARE running 24/7 — ACT SURPRISED!', w / 2, 456);
  });
}

/** Builds an office conference chair tucked around the boardroom table. */
function buildOfficeChair(x, z, rotY) {
  const g = new THREE.Group();
  g.position.set(x, -4.6, z);
  g.rotation.y = rotY;
  const fabric = mat('#2b303a', { roughness: 0.85 });
  const chrome = mat('#adb5bd', { roughness: 0.25, metalness: 0.85 });
  // Base & stem
  g.add(at(cyl(0.14, 0.14, 2.0, chrome, 8), 0, 1.0, 0));
  g.add(at(cyl(1.05, 1.15, 0.16, chrome, 5), 0, 0.12, 0));
  // Seat cushion
  g.add(at(box(2.1, 0.28, 2.0, fabric), 0, 2.1, 0));
  // Tall ergonomic backrest
  g.add(at(box(1.95, 2.5, 0.24, fabric), 0, 3.45, -0.92, -0.1, 0, 0));
  // Armrests
  g.add(at(box(0.16, 0.72, 1.3, fabric), -1.0, 2.65, -0.15));
  g.add(at(box(0.16, 0.72, 1.3, fabric), 1.0, 2.65, -0.15));
  return g;
}

/**
 * Builds the 3D executive conference room:
 * - Walnut conference table with laptops, coffee mugs & speakerphone right under the Jenga tower
 * - Wall 1 (Back Wall): Giant dry-erase Whiteboard with the "Jenga Connect" SOC audit-log plan
 * - Wall 2 (Right Wall): Giant live wall-mounted Stability / Build Health / Lean status monitor
 * - Wall 3 (Left Wall): Daylight Chesapeake Bay glass windows
 * - Wall 4 (Front Wall): Boardroom double doors
 */
function buildJengaArena(scene, towerHeight, disposables) {
  scene.background = new THREE.Color('#cfd8e3');
  scene.fog = new THREE.Fog('#cfd8e3', 65, 150);

  // Bright natural office + recessed ceiling troffer lighting
  scene.add(new THREE.HemisphereLight('#f4f8ff', '#5c4b3c', 1.15));
  const ceilingLight = new THREE.DirectionalLight('#fff8ec', 1.35);
  ceilingLight.position.set(10, 26, 14);
  scene.add(ceilingLight);
  const windowLight = new THREE.DirectionalLight('#d8ecff', 0.65);
  windowLight.position.set(-22, 14, 4);
  scene.add(windowLight);

  const HALF_W = 28;
  const HALF_D = 26;
  const FLOOR_Y = -4.6;
  const CEIL_Y = Math.max(22, towerHeight + 8);
  const ROOM_H = CEIL_Y - FLOOR_Y;
  const WALL_MID_Y = (CEIL_Y + FLOOR_Y) / 2;

  // Office carpet floor with subtle geometric tile weave
  const carpetTex = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#333b48';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#3a4352';
    ctx.fillRect(0, 0, w / 2, h / 2);
    ctx.fillRect(w / 2, h / 2, w / 2, h / 2);
    ctx.strokeStyle = 'rgba(20, 24, 32, 0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, w / 2, h / 2);
    ctx.strokeRect(w / 2, h / 2, w / 2, h / 2);
  }, { repeat: true });
  carpetTex.repeat.set(14, 14);
  disposables.push(carpetTex);
  const carpetMat = new THREE.MeshStandardMaterial({ map: carpetTex, roughness: 0.94 });
  disposables.push(carpetMat);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(HALF_W * 2, HALF_D * 2), carpetMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = FLOOR_Y;
  scene.add(floor);

  // Drop ceiling with glowing recessed LED office troffer lights
  const ceilMat = mat('#e9edf2', { roughness: 0.9 });
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(HALF_W * 2, HALF_D * 2), ceilMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = CEIL_Y;
  scene.add(ceil);
  const trofferMat = mat('#ffffff', { emissive: '#fff8e8', emissiveIntensity: 1.1 });
  for (const lx of [-12, 0, 12]) {
    for (const lz of [-10, 8]) {
      scene.add(at(box(5.4, 0.14, 2.2, trofferMat), lx, CEIL_Y - 0.08, lz));
    }
  }

  // Modern conference room walls + walnut wainscoting + dark baseboard
  const wallMat = mat('#dde3ec', { roughness: 0.88 });
  const wainscotMat = mat('#5c3d28', { roughness: 0.65 });
  const trimMat = mat('#2c221c', { roughness: 0.6 });
  // Back wall (Wall 1: Whiteboard wall, z = -HALF_D)
  scene.add(at(plane(HALF_W * 2, ROOM_H, wallMat), 0, WALL_MID_Y, -HALF_D));
  scene.add(at(box(HALF_W * 2, 4.0, 0.18, wainscotMat), 0, FLOOR_Y + 2.0, -HALF_D + 0.09));
  scene.add(at(box(HALF_W * 2, 0.25, 0.24, trimMat), 0, FLOOR_Y + 4.05, -HALF_D + 0.12));
  // Right wall (Wall 2: Stability/Health/Lean status display wall, x = +HALF_W)
  scene.add(at(plane(HALF_D * 2, ROOM_H, wallMat), HALF_W, WALL_MID_Y, 0, 0, -Math.PI / 2, 0));
  scene.add(at(box(0.18, 4.0, HALF_D * 2, wainscotMat), HALF_W - 0.09, FLOOR_Y + 2.0, 0));
  scene.add(at(box(0.24, 0.25, HALF_D * 2, trimMat), HALF_W - 0.12, FLOOR_Y + 4.05, 0));
  // Left wall (Wall 3: Conference room daylight windows, x = -HALF_W)
  scene.add(at(plane(HALF_D * 2, ROOM_H, wallMat), -HALF_W, WALL_MID_Y, 0, 0, Math.PI / 2, 0));
  scene.add(at(box(0.18, 4.0, HALF_D * 2, wainscotMat), -HALF_W + 0.09, FLOOR_Y + 2.0, 0));
  const skyWinTex = canvasTexture(512, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#6db4e8');
    g.addColorStop(0.68, '#bfe1fa');
    g.addColorStop(0.7, '#34748c');
    g.addColorStop(1, '#225366');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    ctx.beginPath(); ctx.arc(130, 76, 36, 0, Math.PI * 2); ctx.arc(170, 72, 44, 0, Math.PI * 2); ctx.arc(210, 80, 32, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(360, 62, 28, 0, Math.PI * 2); ctx.arc(395, 58, 36, 0, Math.PI * 2); ctx.fill();
  });
  disposables.push(skyWinTex);
  const winMat = new THREE.MeshBasicMaterial({ map: skyWinTex });
  disposables.push(winMat);
  scene.add(at(plane(32, 12.5, winMat), -HALF_W + 0.14, 7.6, 0, 0, Math.PI / 2, 0));
  const mullionMat = mat('#3c4452', { roughness: 0.4, metalness: 0.7 });
  for (const wz of [-16, -5.3, 5.3, 16]) {
    scene.add(at(box(0.32, 13.0, 0.35, mullionMat), -HALF_W + 0.2, 7.6, wz));
  }
  scene.add(at(box(0.35, 0.4, 32.6, mullionMat), -HALF_W + 0.2, 1.3, 0));
  scene.add(at(box(0.35, 0.4, 32.6, mullionMat), -HALF_W + 0.2, 13.9, 0));
  // Front wall (Wall 4: Boardroom double doors, z = +HALF_D)
  scene.add(at(plane(HALF_W * 2, ROOM_H, wallMat), 0, WALL_MID_Y, HALF_D, 0, Math.PI, 0));
  scene.add(at(box(7.4, 9.6, 0.28, wainscotMat), 0, FLOOR_Y + 4.8, HALF_D - 0.15));

  // ---- WALL 1 (Back Wall): Giant Dry-Erase Whiteboard with the "Jenga Connect" SOC Audit-Log Plan ----
  const wbTex = makeSocWhiteboardTexture();
  disposables.push(wbTex);
  const wbMat = new THREE.MeshStandardMaterial({ map: wbTex, roughness: 0.22, metalness: 0.04 });
  disposables.push(wbMat);
  const wbX = -3.0;
  const wbY = 7.6;
  const wbZ = -HALF_D + 0.22;
  const wbW = 24.5;
  const wbH = 12.2;
  const alumMat = mat('#ced4da', { roughness: 0.3, metalness: 0.8 });
  scene.add(at(box(wbW + 0.7, wbH + 0.7, 0.26, alumMat), wbX, wbY, wbZ - 0.1));
  scene.add(at(plane(wbW, wbH, wbMat), wbX, wbY, wbZ + 0.05));
  // Marker tray + colorful dry-erase markers & eraser
  scene.add(at(box(wbW + 0.4, 0.24, 0.72, alumMat), wbX, wbY - wbH / 2 - 0.3, wbZ + 0.28));
  scene.add(at(cyl(0.08, 0.08, 1.1, mat('#c92a2a'), 8), wbX - 5.2, wbY - wbH / 2 - 0.1, wbZ + 0.44, 0, 0, Math.PI / 2));
  scene.add(at(cyl(0.08, 0.08, 1.1, mat('#1864ab'), 8), wbX - 3.6, wbY - wbH / 2 - 0.1, wbZ + 0.44, 0, 0, Math.PI / 2));
  scene.add(at(cyl(0.08, 0.08, 1.1, mat('#212529'), 8), wbX - 2.0, wbY - wbH / 2 - 0.1, wbZ + 0.44, 0, 0, Math.PI / 2));
  scene.add(at(box(1.3, 0.32, 0.48, mat('#495057')), wbX + 1.5, wbY - wbH / 2 - 0.02, wbZ + 0.42));

  // ---- WALL 2 (Right Wall): Giant Wall-Mounted Status Display (Stability, Build Health & Tower Lean) ----
  const holoCanvas = document.createElement('canvas');
  holoCanvas.width = 1024;
  holoCanvas.height = 512;
  const holoCtx = holoCanvas.getContext('2d');
  const holoTex = new THREE.CanvasTexture(holoCanvas);
  holoTex.colorSpace = THREE.SRGBColorSpace;
  disposables.push(holoTex);
  const tvMat = new THREE.MeshBasicMaterial({ map: holoTex });
  disposables.push(tvMat);
  const tvX = HALF_W - 0.28;
  const tvY = 7.6;
  const tvZ = -2.2;
  const tvW = 22.0;
  const tvH = 11.0;
  // Matte-black wall-mounted 4K TV bezel + glowing status bar LED
  scene.add(at(box(0.45, tvH + 0.85, tvW + 0.85, mat('#161a24', { roughness: 0.35, metalness: 0.6 })), tvX + 0.1, tvY, tvZ));
  const tvScreen = new THREE.Mesh(new THREE.PlaneGeometry(tvW, tvH), tvMat);
  tvScreen.position.set(tvX - 0.16, tvY, tvZ);
  tvScreen.rotation.y = -Math.PI / 2;
  scene.add(tvScreen);
  const tvLedMat = new THREE.MeshStandardMaterial({ color: '#20c997', emissive: '#20c997', emissiveIntensity: 1.4 });
  disposables.push(tvLedMat);
  scene.add(at(box(0.22, 0.18, tvW * 0.6, tvLedMat), tvX - 0.16, tvY - tvH / 2 - 0.32, tvZ));

  // ---- Conference Room Table (Jenga tower rests directly on top at y = 0.45!) ----
  const tableTex = canvasTexture(512, 256, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, '#5a3a24');
    grad.addColorStop(0.5, '#6b472d');
    grad.addColorStop(1, '#543520');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(35, 18, 8, 0.22)';
    ctx.lineWidth = 2;
    for (let y = 6; y < h; y += 10) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y + Math.sin(y) * 2); ctx.stroke();
    }
    // Subtle dark desk mat outline under the Jenga zone
    ctx.strokeStyle = 'rgba(242, 184, 23, 0.45)';
    ctx.lineWidth = 4;
    ctx.strokeRect(w * 0.27, h * 0.18, w * 0.46, h * 0.64);
  });
  disposables.push(tableTex);
  const tableTopMat = new THREE.MeshStandardMaterial({ map: tableTex, roughness: 0.36, metalness: 0.08 });
  disposables.push(tableTopMat);
  const TABLE_W = 22.0;
  const TABLE_D = 13.0;
  scene.add(at(box(TABLE_W, 0.54, TABLE_D, tableTopMat), 0, 0.18, 0));
  // Dark beveled table edge & recessed brass cable grommet strip
  scene.add(at(box(TABLE_W + 0.24, 0.18, TABLE_D + 0.24, mat('#2c1d13', { roughness: 0.5 })), 0, -0.02, 0));
  scene.add(at(box(0.9, 0.04, 1.8, mat('#495057', { metalness: 0.7 })), -7.6, 0.46, 0));
  scene.add(at(box(0.9, 0.04, 1.8, mat('#495057', { metalness: 0.7 })), 7.6, 0.46, 0));
  // Twin sturdy conference table pedestal legs down to carpet floor
  const legMat = mat('#252a34', { roughness: 0.45, metalness: 0.65 });
  scene.add(at(box(1.6, 4.5, 5.2, legMat), -6.5, -2.35, 0));
  scene.add(at(box(1.6, 4.5, 5.2, legMat), 6.5, -2.35, 0));
  scene.add(at(box(14.0, 0.6, 0.8, legMat), 0, -3.5, 0));

  // Conference room props on the table corners (laptops, coffee mugs, conference speakerphone puck)
  const laptopSilver = mat('#ced4da', { roughness: 0.28, metalness: 0.78 });
  const screenMat = mat('#1e293b', { emissive: '#38bdf8', emissiveIntensity: 0.45 });
  for (const [lx, lz, ry] of [[-8.6, 4.1, 0.45], [8.4, -3.9, -2.6]]) {
    const lap = new THREE.Group();
    lap.position.set(lx, 0.46, lz);
    lap.rotation.y = ry;
    lap.add(at(box(2.1, 0.08, 1.45, laptopSilver), 0, 0.04, 0));
    lap.add(at(box(2.1, 1.35, 0.08, laptopSilver), 0, 0.72, -0.72, -0.22, 0, 0));
    lap.add(at(box(1.9, 1.15, 0.04, screenMat), 0, 0.72, -0.68, -0.22, 0, 0));
    scene.add(lap);
  }
  // Coffee mugs & conference spider speakerphone
  for (const [mx, mz, col] of [[-6.4, 4.6, '#f8f9fa'], [6.8, 4.4, '#f2b817'], [-8.2, -4.2, '#4dabf7']]) {
    scene.add(at(cyl(0.26, 0.24, 0.56, mat(col, { roughness: 0.3 }), 12), mx, 0.73, mz));
  }
  scene.add(at(cyl(0.85, 0.95, 0.2, mat('#1f242d', { roughness: 0.45, metalness: 0.3 }), 6), 8.2, 0.55, 0.8));

  // 8 ergonomic rolling conference chairs tucked around the table
  for (const cx of [-6.8, -2.2, 2.2, 6.8]) {
    scene.add(buildOfficeChair(cx, -7.8, 0));
    scene.add(buildOfficeChair(cx, 7.8, Math.PI));
  }

  // Live updating Wall 2 Status Display renderer (Stability, Build Health, Tower Lean + inclinometer)
  let lastDrawnKey = '';
  const updateHologram = (pct, leanDeg, statusText) => {
    const healthLabel = statusText === 'COLLAPSE!' ? 'PROD DOWN!' : pct > 60 ? 'NOMINAL' : pct > 30 ? 'DEGRADED' : 'CRITICAL';
    const color = pct > 60 ? '#20c997' : pct > 30 ? '#f59f00' : '#ff2a55';
    const key = `${pct}|${Math.round(leanDeg)}|${healthLabel}`;
    if (key === lastDrawnKey) return;
    lastDrawnKey = key;
    tvLedMat.color.set(color);
    tvLedMat.emissive.set(color);

    const ctx = holoCtx;
    const w = holoCanvas.width;
    const h = holoCanvas.height;
    ctx.fillStyle = '#0f1523';
    ctx.fillRect(0, 0, w, h);

    // Subtle dashboard grid & accent border
    ctx.strokeStyle = color;
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, w - 20, h - 20);

    // Top bar
    ctx.fillStyle = '#8fa3bf';
    ctx.font = `800 28px ${FONT_MONO}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('JENGA CONNECT · TOWER STATUS', 40, 56);

    // BUILD HEALTH pill
    ctx.fillStyle = color;
    roundRect(ctx, w - 310, 30, 270, 52, 12);
    ctx.fill();
    ctx.fillStyle = '#0f1523';
    ctx.font = `900 28px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText(`HEALTH: ${healthLabel}`, w - 175, 57);

    // Left panel: STABILITY big readout + progress bar
    ctx.fillStyle = '#161f33';
    roundRect(ctx, 40, 112, 560, 354, 16);
    ctx.fill();
    ctx.fillStyle = '#9db0cc';
    ctx.font = `800 26px ${FONT_MONO}`;
    ctx.textAlign = 'left';
    ctx.fillText('STRUCTURAL STABILITY', 68, 158);
    ctx.fillStyle = color;
    ctx.font = `900 112px ${FONT_MONO}`;
    ctx.fillText(`${pct}%`, 68, 274);

    // Segmented progress bar
    ctx.fillStyle = '#24304a';
    roundRect(ctx, 68, 372, 504, 52, 14);
    ctx.fill();
    ctx.fillStyle = color;
    roundRect(ctx, 68, 372, Math.max(18, (504 * pct) / 100), 52, 14);
    ctx.fill();

    // Right panel: TOWER LEAN readout + inclinometer arc gauge
    ctx.fillStyle = '#161f33';
    roundRect(ctx, 632, 112, 352, 354, 16);
    ctx.fill();
    ctx.fillStyle = '#9db0cc';
    ctx.font = `800 26px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText('TOWER LEAN', 808, 158);

    // Inclinometer gauge arc
    const cx = 808;
    const cy = 330;
    const rad = 112;
    ctx.strokeStyle = '#2b3957';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    // Warning zones
    ctx.strokeStyle = color;
    ctx.lineWidth = 14;
    const clampedDeg = Math.min(35, Math.max(0, leanDeg));
    const needleAngle = -Math.PI / 2 + (clampedDeg / 35) * (Math.PI * 0.35);
    ctx.beginPath();
    ctx.arc(cx, cy, rad, -Math.PI / 2, needleAngle);
    ctx.stroke();
    // Needle
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(needleAngle) * (rad - 12), cy + Math.sin(needleAngle) * (rad - 12));
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.font = `900 58px ${FONT_MONO}`;
    ctx.fillText(`${Math.round(leanDeg)}°`, cx, 412);

    holoTex.needsUpdate = true;
  };
  updateHologram(100, 0, 'OK');

  return { beaconMats: [tvLedMat], updateHologram };
}

/** Builds the glowing 3D `npm audit fix --force` / `DEPENDABOT` automated pointer cursor. */
function buildCursor(disposables) {
  const group = new THREE.Group();
  const pointerMat = mat('#38bdf8', { emissive: '#38bdf8', emissiveIntensity: 1.4, roughness: 0.2 });
  const shaft = at(cyl(0.14, 0.14, 1.4, pointerMat, 12), 0, 0, 0.9, Math.PI / 2, 0, 0);
  const tip = at(cone(0.36, 0.72, pointerMat, 12), 0, 0, -0.05, -Math.PI / 2, 0, 0);
  const ring = at(torus(0.42, 0.05, mat('#ffe066', { emissive: '#f59f00', emissiveIntensity: 1.2 })), 0, 0, 0.45);
  group.add(shaft, tip, ring);

  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 448;
  labelCanvas.height = 72;
  const labelCtx = labelCanvas.getContext('2d');
  const labelTex = new THREE.CanvasTexture(labelCanvas);
  labelTex.colorSpace = THREE.SRGBColorSpace;
  disposables.push(labelTex);
  const spriteMat = new THREE.SpriteMaterial({ map: labelTex, transparent: true, depthTest: false });
  disposables.push(spriteMat);
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(5.0, 0.8, 1);
  sprite.position.set(0, 1.1, 0.6);
  group.add(sprite);

  let currentText = '';
  const setLabel = (text, danger = false) => {
    const key = `${danger ? '!' : ''}${text}`;
    if (key === currentText) return;
    currentText = key;
    const ctx = labelCtx;
    const w = labelCanvas.width;
    const h = labelCanvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = danger ? '#3d0e1a' : '#121a2d';
    roundRect(ctx, 6, 6, w - 12, h - 12, 12);
    ctx.fill();
    ctx.strokeStyle = danger ? '#ff2a55' : '#38bdf8';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = danger ? '#ffd6dc' : '#e6f4ff';
    ctx.font = `800 24px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2 + 1);
    labelTex.needsUpdate = true;
    pointerMat.color.set(danger ? '#ff2a55' : '#38bdf8');
    pointerMat.emissive.set(danger ? '#ff2a55' : '#38bdf8');
  };
  setLabel('npm audit fix --force', false);

  return { group, setLabel };
}

// ------------------------------------------------------------------ Lobby 3D Stage

export class JengaStage {
  constructor(aspect = 16 / 9, initialNames = []) {
    this.t = 0;
    this.names = [];
    this.models = [];
    this.disposables = [];
    this.tiers = 12;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(48, aspect, 0.3, 260);
    this.arena = buildJengaArena(this.scene, this.tiers * BLOCK_HEIGHT, this.disposables);

    // Base tiers stay flat on the pedestal; upper stack pivots subtly above the classic single-keystone gap!
    this.baseGroup = new THREE.Group();
    this.baseGroup.position.y = 0.45;
    this.scene.add(this.baseGroup);

    this.hingeY = 2.5 * BLOCK_HEIGHT;
    this.upperPivot = new THREE.Group();
    this.upperPivot.position.y = this.hingeY;
    this.baseGroup.add(this.upperPivot);

    this.texCache = new Map();
    for (let tier = 0; tier < this.tiers; tier++) {
      const rotated = tier % 2 === 1;
      for (let slot = 0; slot < 3; slot++) {
        // Classic iconic Jenga gaps: single center keystone on tier 2 + a couple open slots higher up!
        if (tier === 2 && slot !== 1) continue;
        if (tier === 5 && slot === 0) continue;
        if (tier === 8 && slot === 2) continue;
        const isKeystone = tier === 2 && slot === 1;
        const label = isKeystone ? KEYSTONE_BLOCKS[1] : SAFE_BLOCKS[(tier * 3 + slot) % SAFE_BLOCKS.length];
        const mesh = createBlockMesh(label, isKeystone, (tier + slot) % 3, this.texCache, this.disposables);
        const offset = (slot - 1) * BLOCK_WIDTH;
        const jx = (((tier * 7 + slot * 13) % 5) - 2) * 0.012;
        const jz = (((tier * 11 + slot * 5) % 5) - 2) * 0.012;
        const absY = (tier + 0.5) * BLOCK_HEIGHT;
        if (tier <= 2) {
          mesh.position.set((rotated ? offset : 0) + jx, absY, (rotated ? 0 : offset) + jz);
          if (rotated) mesh.rotation.y = Math.PI / 2;
          this.baseGroup.add(mesh);
        } else {
          mesh.position.set((rotated ? offset : 0) + jx, absY - this.hingeY, (rotated ? 0 : offset) + jz);
          if (rotated) mesh.rotation.y = Math.PI / 2;
          this.upperPivot.add(mesh);
        }
      }
    }

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
    for (const m of this.models) {
      this.upperPivot.remove(m.visual.root);
      m.visual.dispose();
    }
    this.models = [];
    this.names = [...names];

    const spots = perchPositions(names.length, this.tiers);
    const scale = names.length > 16 ? 0.54 : 0.64;
    names.forEach((name, i) => {
      const kind = DEVELOPER_KINDS[i % DEVELOPER_KINDS.length];
      const visual = buildDeveloperModel({ name, kind, isNpc: false });
      visual.weaponGroup.visible = false;
      visual.root.scale.setScalar(scale);
      visual.root.position.set(spots[i].x, spots[i].y - this.hingeY, spots[i].z);
      this.upperPivot.add(visual.root);
      this.models.push({ visual, phase: i * 1.1 });
    });
  }

  update(dt, reduced = false) {
    if (!reduced) this.t += dt;
    const t = this.t;
    // Authentic tiny Jenga creak (~1° max) pivoting above the single-keystone tier (base stays 100% flat!)
    const sway = reduced ? 0.008 : Math.sin(t * 1.6) * 0.016;
    this.upperPivot.rotation.z = sway;
    this.upperPivot.rotation.x = sway * 0.35;

    for (const m of this.models) {
      const wave = reduced ? 0 : Math.sin(t * 6 + m.phase) * 0.35;
      if (m.visual.leftArm) m.visual.leftArm.rotation.z = 2.4 + wave;
      if (m.visual.rightArm) m.visual.rightArm.rotation.z = -2.4 - wave;
    }

    // Frame the conference room from front-left so BOTH Wall 1 (SOC whiteboard) & Wall 2 (status TV) frame the tower!
    const ang = reduced ? -0.42 : -0.45 + Math.sin(t * 0.28) * 0.34;
    this.camera.position.set(Math.sin(ang) * 21.5, 9.6, Math.cos(ang) * 21.5);
    this.camera.lookAt(1.8, this.tiers * BLOCK_HEIGHT * 0.62, -1.6);
  }

  dispose() {
    for (const m of this.models) m.visual.dispose();
    for (const d of this.disposables) d.dispose?.();
  }
}

// ------------------------------------------------------------------ Live Match

export class JengaMatch {
  constructor(names, { duration = DEFAULT_JENGA_DURATION, rng = Math.random, sfx = null, onEvent = null, onWinner = null } = {}) {
    this.plan = planJengaMatch(names, { duration, rng });
    this.sfx = sfx;
    this.onEvent = onEvent;
    this.onWinner = onWinner;

    this.t = 0;
    this.collapsed = false;
    this.winnerReported = false;
    this.heartbeatTimer = 0;
    this.startedActions = new Set();
    this.completedActions = new Set();
    this.eliminatedSet = new Set();
    this.fallStartedSet = new Set();
    this.disposables = [];

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.3, 300);
    this.towerHeight = this.plan.tiers * BLOCK_HEIGHT;
    this.arena = buildJengaArena(this.scene, this.towerHeight, this.disposables);
    this.particles = new Particles(this.scene);

    // Grounded base group (tiers 0..keystoneTier stay firmly flat on the pedestal — never clip!)
    this.baseGroup = new THREE.Group();
    this.baseGroup.position.y = 0.45;
    this.scene.add(this.baseGroup);

    // Upper tower hinge pivots right atop the keystone tier (just like a real Jenga hinge failure!)
    this.hingeY = (this.plan.keystoneTier + 1) * BLOCK_HEIGHT;
    this.upperPivot = new THREE.Group();
    this.upperPivot.position.y = this.hingeY;
    this.baseGroup.add(this.upperPivot);

    // Per-tier sub-groups inside upperPivot for realistic horizontal pull shudder & shear
    this.tierGroups = new Map();
    for (let tier = this.plan.keystoneTier + 1; tier < this.plan.tiers + 6; tier++) {
      const tg = new THREE.Group();
      this.upperPivot.add(tg);
      this.tierGroups.set(tier, tg);
    }

    this.texCache = new Map();
    this.blockVisuals = this.plan.blocks.map((b) => {
      const mesh = createBlockMesh(b.label, b.isKeystone, b.woodTone, this.texCache, this.disposables);
      const isUpper = b.tier > this.plan.keystoneTier;
      const parent = isUpper ? this.tierGroups.get(b.tier) : this.baseGroup;
      const y = isUpper ? b.localY - this.hingeY : b.localY;
      mesh.position.set(b.localX + b.jitterX, y, b.localZ + b.jitterZ);
      mesh.rotation.y = (b.rotated ? Math.PI / 2 : 0) + b.jitterYaw;
      if (b.preMissing) mesh.visible = false;
      parent.add(mesh);
      return {
        sim: b,
        mesh,
        parent,
        baseX: mesh.position.x,
        baseY: y,
        baseZ: mesh.position.z,
        detached: b.preMissing,
        vel: new THREE.Vector3(),
        angVel: new THREE.Vector3(),
      };
    });

    // Winner's upright glowing LTS-support Jenga block (lands squarely on the pedestal!)
    this.ltsBlock = createBlockMesh('LTS-support', false, 0, this.texCache, this.disposables, true);
    this.ltsBlock.position.set(0, 0.84, 0);
    this.ltsBlock.visible = false;
    this.scene.add(this.ltsBlock);

    // Glowing 3D `npm audit fix --force` cursor
    this.cursor = buildCursor(this.disposables);
    this.cursor.group.position.set(6.5, 4, 6.5);
    this.scene.add(this.cursor.group);

    // Top-tier platform group so all 2-30 devs ride solidly on top of the upper Jenga stack!
    this.rooftopGroup = this.tierGroups.get(this.plan.tiers - 1);
    const devScale = this.plan.players.length > 16 ? 0.54 : 0.64;
    this.devVisuals = this.plan.players.map((p, i) => {
      const kind = DEVELOPER_KINDS[i % DEVELOPER_KINDS.length];
      const visual = buildDeveloperModel({ name: p.name, kind, isNpc: false });
      visual.weaponGroup.visible = false;
      visual.root.scale.setScalar(devScale);
      visual.root.position.set(p.perch.x, p.perch.y - this.hingeY, p.perch.z);
      this.rooftopGroup.add(visual.root);
      return {
        sim: p,
        visual,
        detached: false,
        vel: new THREE.Vector3(),
        startPos: new THREE.Vector3(),
        eliminated: false,
      };
    });

    this.camPos = new THREE.Vector3(0, 4.2, 22);
    this.camLook = new THREE.Vector3(0, this.towerHeight * 0.5, 0);
    this.resize(window.innerWidth / window.innerHeight);
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 1 ? 64 : 50;
    this.camera.updateProjectionMatrix();
  }

  /** Realistic Jenga directional topple detachment: blocks cascade in the direction of the tip-over! */
  detachBlock(bv) {
    if (bv.detached) return;
    bv.detached = true;
    const worldPos = new THREE.Vector3();
    const worldQuat = new THREE.Quaternion();
    bv.mesh.getWorldPosition(worldPos);
    bv.mesh.getWorldQuaternion(worldQuat);
    bv.mesh.parent?.remove(bv.mesh);
    this.scene.add(bv.mesh);
    bv.mesh.position.copy(worldPos);
    bv.mesh.quaternion.copy(worldQuat);

    const p = this.plan;
    const heightFactor = Math.max(0, bv.sim.tier - p.keystoneTier) / Math.max(1, p.tiers);
    // Blocks above the hinge topple strongly in the lean direction; lower blocks shear & spill sideways
    const sideJitter = (((bv.sim.id * 17) % 11) - 5) * 0.42;
    const forwardSpeed = bv.sim.tier <= p.keystoneTier ? 0.8 + (bv.sim.id % 3) * 0.4 : 2.8 + heightFactor * 7.8;
    bv.vel.set(
      p.leanDirX * forwardSpeed + (-p.leanDirZ) * sideJitter,
      0.4 + heightFactor * 2.1,
      p.leanDirZ * forwardSpeed + p.leanDirX * sideJitter,
    );
    // Natural tumbling pitch aligned with the topple direction
    const tumble = (1.1 + heightFactor * 2.2) * (bv.sim.tier <= p.keystoneTier ? 0.4 : 1);
    bv.angVel.set(
      p.leanDirZ * tumble + ((bv.sim.id % 3) - 1) * 0.5,
      ((bv.sim.id % 5) - 2) * 0.35,
      -p.leanDirX * tumble + (((bv.sim.id + 1) % 3) - 1) * 0.5,
    );
  }

  detachDev(dv) {
    if (dv.detached) return;
    dv.detached = true;
    const worldPos = new THREE.Vector3();
    dv.visual.root.getWorldPosition(worldPos);
    dv.visual.root.parent?.remove(dv.visual.root);
    this.scene.add(dv.visual.root);
    dv.visual.root.position.copy(worldPos);
    dv.startPos.copy(worldPos);

    if (dv.sim.isWinner) {
      dv.vel.set(0, 3.8, 0);
    } else {
      dv.vel.set(
        Math.cos(dv.sim.ejectAngle) * dv.sim.ejectSpeed,
        1.6 + (dv.sim.id % 3) * 0.5,
        Math.sin(dv.sim.ejectAngle) * dv.sim.ejectSpeed,
      );
    }
  }

  update(dt) {
    this.t += dt;
    const t = this.t;
    const p = this.plan;

    // Blinking arena pit beacons
    for (let i = 0; i < this.arena.beaconMats.length; i++) {
      this.arena.beaconMats[i].emissiveIntensity = Math.sin(t * 7 + i) > 0 ? 1.8 : 0.25;
    }

    // Update realistic hinge-tier wobble & hologram before collapse
    const swayRad = towerSwayAt(p, t);
    const leanDeg = Math.abs((swayRad * 180) / Math.PI);
    const stab = stabilityAt(p, t);
    this.arena.updateHologram(stab, this.collapsed ? 90 : leanDeg, this.collapsed ? 'COLLAPSE!' : 'OK');
    this.onEvent?.({
      type: 'status',
      stability: stab,
      leanDeg: Math.round(leanDeg),
      remaining: p.players.length - this.eliminatedSet.size,
      total: p.players.length,
    });

    if (!this.collapsed) {
      // Base tiers 0..keystoneTier stay 100% flat on the pedestal; upper stack tips around the keystone hinge!
      this.upperPivot.rotation.z = -swayRad * p.leanDirX;
      this.upperPivot.rotation.x = swayRad * p.leanDirZ;
      if (leanDeg >= 15) {
        this.heartbeatTimer -= dt;
        if (this.heartbeatTimer <= 0) {
          this.heartbeatTimer = 0.5;
          this.sfx?.play('jengaHeartbeat', 0.1);
        }
      }
    }

    // Drive scheduled cursor pulls, fake-out taps, stack-on-top rebuilding, and keystone pull
    let activeAction = null;
    for (const tg of this.tierGroups.values()) {
      tg.position.set(0, 0, 0);
    }

    for (const act of p.actions) {
      const bv = this.blockVisuals[act.blockId];
      if (!bv) continue;

      if (t >= act.startAt && !this.startedActions.has(act)) {
        this.startedActions.add(act);
        if (act.type === 'keystone') {
          this.sfx?.play('jengaSiren', 0);
          this.onEvent?.({ type: 'note', text: `🚨 CRITICAL DEPENDENCY: npm audit fix --force targeting ${act.label}!`, important: true });
        } else {
          this.sfx?.play('jengaScrape', 0.06);
        }
      }

      if (t >= act.startAt && t <= act.endAt) {
        activeAction = act;
        const frac = (t - act.startAt) / Math.max(0.05, act.endAt - act.startAt);
        const dir = bv.sim.pullDir;
        let slide = 0;
        if (act.type === 'fakeout') {
          // Gently tap/nudge out 28%, hesitate, slide back flush!
          slide = Math.sin(frac * Math.PI) * 1.45 * dir;
        } else {
          // Realistic wood-friction stick-slip rattle, then smooth lengthwise extraction
          const rattle = frac < 0.28 ? Math.sin(frac * 95) * 0.12 : 0;
          const pull = frac < 0.28 ? 0 : (frac - 0.28) / 0.72;
          slide = (pull * (BLOCK_LENGTH + 2.6) + rattle) * dir;
        }
        if (bv.sim.rotated) bv.mesh.position.z = bv.baseZ + slide;
        else bv.mesh.position.x = bv.baseX + slide;

        // Subtle horizontal wood-friction shudder on tiers right above the pulled block!
        const shudderAmp = act.type === 'fakeout' ? 0.025 : 0.045;
        const shudder = Math.sin(t * 58) * shudderAmp;
        for (const [tierIdx, tg] of this.tierGroups) {
          if (tierIdx > act.tier) {
            if (bv.sim.rotated) tg.position.z = shudder * dir;
            else tg.position.x = shudder * dir;
          }
        }

        // Position glowing cursor at the protruding short end of the block
        const worldPos = new THREE.Vector3();
        bv.mesh.getWorldPosition(worldPos);
        const outOffset = bv.sim.rotated
          ? new THREE.Vector3(0, 0, dir * (BLOCK_LENGTH * 0.55 + 0.5))
          : new THREE.Vector3(dir * (BLOCK_LENGTH * 0.55 + 0.5), 0, 0);
        this.cursor.group.position.copy(worldPos).add(outOffset);
        this.cursor.group.lookAt(worldPos);
        this.cursor.setLabel(act.cursorLabel, act.type === 'keystone');
      } else if (t > act.endAt && !this.completedActions.has(act)) {
        this.completedActions.add(act);
        if (act.type === 'fakeout') {
          bv.mesh.position.set(bv.baseX, bv.baseY, bv.baseZ);
          this.onEvent?.({ type: 'note', text: `🤔 Dependabot reconsidered touching ${act.label}…`, important: false });
        } else if (act.type === 'pull') {
          if (act.stackOnTop && act.stackTier != null) {
            // 60s-120s Full Monolith Migration: place pulled block neatly onto the next top tier!
            const rot = act.stackTier % 2 === 1;
            const slotOffset = ((act.stackSlot ?? 1) - 1) * BLOCK_WIDTH;
            const targetGroup = this.tierGroups.get(act.stackTier) ?? this.rooftopGroup;
            bv.mesh.parent?.remove(bv.mesh);
            targetGroup.add(bv.mesh);
            bv.mesh.rotation.y = rot ? Math.PI / 2 : 0;
            bv.mesh.position.set(
              rot ? slotOffset : 0,
              (act.stackTier + 0.5) * BLOCK_HEIGHT - this.hingeY,
              rot ? 0 : slotOffset,
            );
            this.onEvent?.({ type: 'note', text: `📦 Re-stacked ${act.label} on top — tower growing top-heavy!`, important: true });
          } else {
            bv.mesh.visible = false;
            this.onEvent?.({ type: 'note', text: `🧱 Pulled ${act.label} — clean gap in tier ${act.tier + 1}!`, important: false });
          }
        }
      }
    }

    // Trigger Phase 4 Realistic Directional Slow-Motion Collapse at collapseAt!
    if (!this.collapsed && t >= p.collapseAt) {
      this.collapsed = true;
      this.cursor.group.visible = false;
      this.ltsBlock.visible = true;
      this.sfx?.play('jengaCollapse', 0);
      this.onEvent?.({ type: 'note', text: `💥 TIMBER! ${p.actions[p.actions.length - 1].label} pulled — SLOW-MO COLLAPSE!`, important: true });
      for (const bv of this.blockVisuals) {
        if (bv.mesh.visible) this.detachBlock(bv);
      }
      for (const dv of this.devVisuals) {
        if (!dv.detached) this.detachDev(dv);
      }
      this.particles.burst(new THREE.Vector3(0, this.hingeY + 0.4, 0), {
        count: 38,
        colors: ['#ff2a55', '#e3c598', '#f59f00', '#ffe066'],
        speed: 6.5,
        up: 4.5,
        life: 1.8,
        size: 0.32,
        gravity: 6,
      });
    }

    // Step detached rigid-body Jenga blocks (0.35x slow-mo gravity, bouncing onto conference table or carpet floor!)
    const physDt = this.collapsed ? dt * SLOW_MO_SCALE : dt;
    for (const bv of this.blockVisuals) {
      if (!bv.detached || !bv.mesh.visible) continue;
      bv.vel.y -= 18 * physDt;
      bv.mesh.position.addScaledVector(bv.vel, physDt);
      bv.mesh.rotation.x += bv.angVel.x * physDt;
      bv.mesh.rotation.y += bv.angVel.y * physDt;
      bv.mesh.rotation.z += bv.angVel.z * physDt;
      const onTable = Math.abs(bv.mesh.position.x) <= 11.0 && Math.abs(bv.mesh.position.z) <= 6.5;
      const floorY = onTable ? 0.84 : -4.22;
      if (bv.mesh.position.y < floorY) {
        bv.mesh.position.y = floorY;
        bv.vel.y *= -0.26;
        bv.vel.x *= 0.72;
        bv.vel.z *= 0.72;
        bv.angVel.multiplyScalar(0.68);
      }
    }

    // Update developer avatars perched solidly on the rooftop -> sliding off -> windmilling -> PROD DOWN vs LTS-support
    for (const dv of this.devVisuals) {
      const pl = dv.sim;
      if (!dv.detached && pl.fallAt !== null && t >= pl.fallAt) {
        this.detachDev(dv);
        if (!this.fallStartedSet.has(pl.id)) {
          this.fallStartedSet.add(pl.id);
          if (!pl.isWinner) this.sfx?.play('jengaFall', 0.08);
        }
      }

      if (!dv.detached) {
        const panic = Math.min(1, leanDeg / 10);
        const wave = Math.sin(t * (7 + panic * 8) + pl.id) * (0.35 + panic * 0.55);
        if (dv.visual.leftArm) dv.visual.leftArm.rotation.z = 2.3 + wave;
        if (dv.visual.rightArm) dv.visual.rightArm.rotation.z = -2.3 - wave;
      } else if (pl.isWinner) {
        const frac = Math.min(1, Math.max(0, (t - p.collapseAt) / Math.max(0.5, p.winnerAt - p.collapseAt)));
        const arcY = Math.sin(frac * Math.PI) * 3.6;
        const targetY = 1.24;
        dv.visual.root.position.set(
          dv.startPos.x * (1 - frac),
          dv.startPos.y * (1 - frac) + targetY * frac + arcY,
          dv.startPos.z * (1 - frac),
        );
        this.ltsBlock.position.set(dv.visual.root.position.x, 0.84, dv.visual.root.position.z);
        if (frac < 0.95) {
          dv.visual.root.rotation.y += dt * 2.8;
          if (dv.visual.leftArm) dv.visual.leftArm.rotation.z = 2.6 + Math.sin(t * 16) * 0.7;
          if (dv.visual.rightArm) dv.visual.rightArm.rotation.z = -2.6 - Math.sin(t * 16) * 0.7;
        } else {
          dv.visual.root.rotation.set(0, 0, 0);
          dv.visual.body.position.y = Math.abs(Math.sin(t * 6)) * 0.42;
        }
      } else if (!dv.eliminated) {
        const span = Math.max(0.4, (pl.floorAt ?? p.winnerAt) - (pl.fallAt ?? p.collapseAt));
        const frac = Math.min(1, Math.max(0, (t - (pl.fallAt ?? p.collapseAt)) / span));
        // Fall outward cleanly clear of the 8.8 x 8.8 pedestal into the glowing crimson PROD DOWN pit!
        const spread = 6.2 + (pl.id % 5) * 1.4;
        const x = dv.startPos.x + Math.cos(pl.ejectAngle) * spread * frac;
        const z = dv.startPos.z + Math.sin(pl.ejectAngle) * spread * frac;
        const y = dv.startPos.y * (1 - frac * frac) + Math.sin(frac * Math.PI) * 1.6;
        dv.visual.root.position.set(x, Math.max(0.05, y), z);
        dv.visual.root.rotation.x = frac * Math.PI * 2.1;
        dv.visual.root.rotation.z = frac * Math.PI * 1.7;
        if (dv.visual.leftArm) dv.visual.leftArm.rotation.z = 2.5 + Math.sin(t * 22 + pl.id) * 0.9;
        if (dv.visual.rightArm) dv.visual.rightArm.rotation.z = -2.5 - Math.sin(t * 22 + pl.id) * 0.9;

        if (pl.floorAt !== null && t >= pl.floorAt) {
          dv.eliminated = true;
          this.eliminatedSet.add(pl.id);
          dv.visual.root.visible = false;
          this.particles.burst(new THREE.Vector3(x, 0.4, z), {
            count: 20,
            colors: ['#ff2a55', '#ff6b6b', '#ffe066', '#ffffff'],
            speed: 5.5,
            up: 4.5,
            life: 0.95,
            size: 0.28,
            gravity: 7,
          });
          this.onEvent?.({
            type: 'elim',
            player: pl,
            excuse: pl.excuse,
            remaining: p.players.length - this.eliminatedSet.size,
            total: p.players.length,
          });
        }
      }
    }

    // Declare winner once sole survivor lands safely on LTS-support!
    if (!this.winnerReported && t >= p.winnerAt) {
      this.winnerReported = true;
      this.sfx?.play('jengaWin', 0);
      const wPos = this.devVisuals[p.winnerIndex].visual.root.position;
      this.particles.burst(new THREE.Vector3(wPos.x, wPos.y + 1.8, wPos.z), {
        count: 52,
        colors: ['#20c997', '#f2b817', '#38bdf8', '#ffffff'],
        speed: 7.5,
        up: 5.5,
        life: 2.2,
        size: 0.34,
        gravity: 4,
      });
      this.onWinner?.(p.winner, p);
    }

    this.particles.update(dt);

    // Dynamic 4-Phase Conference Room Camera Choreography (kept cleanly inside room walls, showcasing Whiteboard & Status TV!)
    const wantPos = new THREE.Vector3();
    const wantLook = new THREE.Vector3();
    if (t < p.revealEnd) {
      const f = t / Math.max(0.1, p.revealEnd);
      wantPos.set(-9.0 + f * 3.0, 4.2 + f * (this.towerHeight * 0.65), 19.5);
      wantLook.set(1.4, 2.8 + f * (this.towerHeight * 0.58), -1.6);
    } else if (t >= p.keystoneStart && t < p.collapseAt) {
      // Brief tight Keystone Cut-In onto the lone crimson keystone on the conference table!
      const kb = this.blockVisuals.find((b) => b.sim.isKeystone);
      const kPos = new THREE.Vector3(0, 2.4, 0);
      if (kb) kb.mesh.getWorldPosition(kPos);
      wantPos.set(kPos.x - 6.8, kPos.y + 1.9, kPos.z + 8.6);
      wantLook.copy(kPos);
    } else if (this.collapsed) {
      const wPos = this.devVisuals[p.winnerIndex].visual.root.position;
      wantPos.set(wPos.x - 7.0, Math.max(5.2, wPos.y + 4.2), wPos.z + 14.5);
      wantLook.set(wPos.x + 1.0, Math.max(1.4, wPos.y + 0.9), wPos.z - 1.0);
    } else {
      // Sweep smoothly across the conference room so both Wall 1 (SOC Whiteboard) & Wall 2 (Status TV) stay framed!
      const ang = -0.35 + Math.sin((t - p.revealEnd) * 0.42) * 0.52;
      const dist = Math.min(22.5, 19.0 + this.towerHeight * 0.2);
      wantPos.set(Math.sin(ang) * dist, Math.min(16.5, this.towerHeight * 0.68 + 2.8), Math.cos(ang) * dist);
      wantLook.set(1.6, this.towerHeight * 0.58, -1.6);
      if (!activeAction) {
        this.cursor.group.position.set(Math.cos(t * 1.4) * 6.5, this.towerHeight * 0.5, Math.sin(t * 1.4) * 6.5);
        this.cursor.group.lookAt(0, this.towerHeight * 0.5, 0);
      }
    }

    // Clamp camera safely inside conference room walls
    wantPos.x = Math.max(-24.5, Math.min(24.5, wantPos.x));
    wantPos.z = Math.max(-22.5, Math.min(22.5, wantPos.z));

    this.camPos.lerp(wantPos, Math.min(1, dt * 4.5));
    this.camLook.lerp(wantLook, Math.min(1, dt * 5.5));
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
  }

  dispose() {
    this.particles.clear();
    for (const dv of this.devVisuals) dv.visual.dispose();
    for (const d of this.disposables) d.dispose?.();
  }
}
