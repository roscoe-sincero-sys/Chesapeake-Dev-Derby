// "Ddakji Flip-Out" (Paper-Tile Slam Royale): twilight Seoul slate courtyard with wet neon
// reflections, traditional curved hanok roof silhouettes, glowing paper lanterns & alley signs,
// authentic 4-triangle origami folded-paper tiles (bright team face-up vs stark crimson FLIPPED
// underside), oversized foil-stamped CHEOL-DDAKJI slams, expanding air-blast shock-rings,
// 0.4x slow-motion 89-degree edge-teeter finale, and 360-degree victory orbit!

import * as THREE from 'three';
import { mat, box, ball, cyl, torus, plane, at, canvasTexture, FONT_UI, FONT_MONO, roundRect } from './util3d.js';
import { Particles } from './effects.js';
import { DEVELOPER_KINDS } from './deathmatch-sim.js';
import {
  DdakjiSim,
  TILE_SIZE,
  TILE_THICK,
  DEFAULT_DDAKJI_DURATION,
  DEFAULT_DDAKJI_RULE,
} from './ddakji-sim.js';

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

/** Warm golden Korean maru (traditional pine/cedar plank) floor texture. */
function makeMaruFloorTexture() {
  const tex = canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#9c6b3b';
    ctx.fillRect(0, 0, w, h);
    const planks = 8;
    const ph = h / planks;
    for (let i = 0; i < planks; i++) {
      const shade = i % 2 === 0 ? '#a87442' : '#946336';
      ctx.fillStyle = shade;
      ctx.fillRect(0, i * ph, w, ph - 3);
      ctx.fillStyle = '#5c3a1e';
      ctx.fillRect(0, (i + 1) * ph - 3, w, 3);
      // Subtle vertical plank join seam
      const joinX = ((i * 193 + 90) % (w - 80)) + 40;
      ctx.fillRect(joinX, i * ph, 2, ph);
      // Fine warm wood grain streaks
      for (let g = 0; g < 16; g++) {
        ctx.fillStyle = g % 2 === 0 ? 'rgba(255, 226, 185, 0.08)' : 'rgba(54, 28, 10, 0.08)';
        ctx.fillRect(0, i * ph + (g / 16) * ph, w, 2);
      }
    }
  });
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(7, 7);
  return tex;
}

/** Traditional Korean changhoji (hanji rice-paper & cedar lattice) sliding screen texture. */
function makeChanghojiTexture() {
  const tex = canvasTexture(512, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#fbf3e0');
    g.addColorStop(1, '#efe2c6');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // Fine hanji mulberry fiber flecks
    ctx.fillStyle = 'rgba(180, 152, 110, 0.14)';
    for (let i = 0; i < 600; i++) {
      ctx.fillRect((i * 73) % w, (i * 137) % h, 5, 1.5);
    }
    // Traditional Jeongja-sal (crisscross wooden lattice muntins)
    ctx.fillStyle = '#52341e';
    const cols = 6;
    const rows = 8;
    for (let c = 0; c <= cols; c++) ctx.fillRect((c / cols) * w - 4, 0, 8, h);
    for (let r = 0; r <= rows; r++) ctx.fillRect(0, (r / rows) * h - 4, w, 8);
    // Decorative outer cedar stile frame
    ctx.strokeStyle = '#3d2514';
    ctx.lineWidth = 22;
    ctx.strokeRect(11, 11, w - 22, h - 22);
  });
  return tex;
}

/** Traditional sumukhwa (Korean ink-wash mountain & pine) hanging scroll artwork. */
function makeInkScrollTexture() {
  return canvasTexture(256, 512, (ctx, w, h) => {
    // Silk brocade mounting border
    ctx.fillStyle = '#c8b48a';
    ctx.fillRect(0, 0, w, h);
    // Cream hanji painting panel
    ctx.fillStyle = '#f4ebd7';
    ctx.fillRect(20, 44, w - 40, h - 88);
    // Misty ink-wash Bukhansan mountain layers
    const drawPeak = (baseY, peakX, peakH, col) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(20, baseY);
      ctx.quadraticCurveTo(peakX - 45, baseY - peakH * 0.6, peakX, baseY - peakH);
      ctx.quadraticCurveTo(peakX + 55, baseY - peakH * 0.55, w - 20, baseY);
      ctx.closePath();
      ctx.fill();
    };
    drawPeak(320, 150, 175, 'rgba(62, 72, 82, 0.35)');
    drawPeak(370, 95, 145, 'rgba(42, 48, 56, 0.58)');
    drawPeak(425, 165, 115, 'rgba(28, 32, 38, 0.8)');
    // Red artist seal stamp (dojang)
    ctx.fillStyle = '#c92a2a';
    ctx.fillRect(w - 58, 76, 22, 22);
    // Top & bottom dark wooden scroll rollers
    ctx.fillStyle = '#2d1c10';
    ctx.fillRect(6, 12, w - 12, 16);
    ctx.fillRect(6, h - 28, w - 12, 16);
  });
}

/** Bukchon Hanok courtyard & Namsan Seoul Tower sunset window view. */
function makeSeoulWindowTexture() {
  return canvasTexture(1024, 512, (ctx, w, h) => {
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.72);
    sky.addColorStop(0, '#36588c');
    sky.addColorStop(0.5, '#7c8eb8');
    sky.addColorStop(0.85, '#f2b880');
    sky.addColorStop(1, '#ffd8a8');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Soft sunset clouds
    const drawCloud = (cx, cy, s) => {
      for (const [ox, oy, r] of [[-55, 8, 42], [-15, -10, 52], [35, -4, 48], [75, 12, 36]]) {
        const px = cx + ox * s;
        const py = cy + oy * s;
        const rad = r * s;
        const g = ctx.createRadialGradient(px, py - rad * 0.2, rad * 0.1, px, py, rad);
        g.addColorStop(0, 'rgba(255, 240, 220, 0.82)');
        g.addColorStop(0.6, 'rgba(244, 198, 170, 0.42)');
        g.addColorStop(1, 'rgba(244, 198, 170, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, rad, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    drawCloud(220, 125, 1.1);
    drawCloud(640, 100, 0.9);
    drawCloud(870, 145, 0.8);

    // Distant Namsan mountain & iconic Namsan Seoul Tower silhouette
    ctx.fillStyle = '#2c354c';
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.quadraticCurveTo(w * 0.28, h * 0.56, w * 0.55, h * 0.62);
    ctx.quadraticCurveTo(w * 0.78, h * 0.5, w, h * 0.68);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    // Namsan Seoul Tower spire
    const tx = w * 0.76;
    ctx.fillStyle = '#1e2433';
    ctx.fillRect(tx - 6, h * 0.34, 12, h * 0.24);
    ctx.fillRect(tx - 20, h * 0.31, 40, 18);
    ctx.fillRect(tx - 2.5, h * 0.2, 5, h * 0.12);
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.arc(tx, h * 0.2, 4, 0, Math.PI * 2);
    ctx.fill();

    // Foreground curved dark hanok tiled eaves (giwa)
    ctx.fillStyle = '#181c26';
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, h * 0.78);
    ctx.quadraticCurveTo(w * 0.25, h * 0.85, w * 0.52, h * 0.75);
    ctx.lineTo(w * 0.52, h);
    ctx.closePath();
    ctx.fill();
  });
}

/** Korean Hanok Executive Boardroom Whiteboard (Back Wall). */
function makeHanokBoardTexture() {
  return canvasTexture(1024, 512, (ctx, w, h) => {
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#fcfaf4');
    bg.addColorStop(1, '#f1ece0');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#1e3a8a';
    ctx.font = `900 36px ${FONT_UI}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('서울 회의실 — DDAKJI SPRINT REVIEW', 38, 52);

    ctx.strokeStyle = '#c92a2a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(36, 76); ctx.lineTo(680, 76);
    ctx.stroke();

    // Red Korean seal-style stamp
    ctx.save();
    ctx.translate(895, 58);
    ctx.rotate(-0.07);
    ctx.strokeStyle = '#c92a2a';
    ctx.lineWidth = 4;
    roundRect(ctx, -84, -24, 168, 48, 8);
    ctx.stroke();
    ctx.fillStyle = '#c92a2a';
    ctx.font = `900 22px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText('딱지치기!', 0, 2);
    ctx.restore();

    ctx.fillStyle = '#495057';
    ctx.font = `700 22px ${FONT_UI}`;
    ctx.textAlign = 'left';
    ctx.fillText('Official Hanok Boardroom Rules for Picking Today\'s Standup Lead:', 38, 112);

    const rules = [
      ['1.', 'Remove shoes at the maru step — no muddy prod deploys on the pine floor.'],
      ['2.', 'Slam cleanly with a crisp TTAK! (No illegally taped CHEOL-DDAKJI!).'],
      ['3.', 'If a tile teeters at 89°, hold your breath and blame DNS propagation.'],
      ['4.', 'Flipped tiles immediately show 404 — no ?ReturnUrl= appeals allowed.'],
      ['5.', 'Last unflipped dev claims the mic & leads today\'s standup!'],
    ];
    let y = 166;
    for (let i = 0; i < rules.length; i++) {
      ctx.fillStyle = i === 4 ? '#c92a2a' : '#1e3a8a';
      ctx.font = `900 25px ${FONT_MONO}`;
      ctx.fillText(rules[i][0], 42, y);
      ctx.fillStyle = i === 4 ? '#991b1b' : '#212529';
      ctx.font = `700 23px ${FONT_UI}`;
      ctx.fillText(rules[i][1], 88, y);
      y += 52;
    }

    ctx.fillStyle = '#fff5f5';
    roundRect(ctx, 38, 426, w - 76, 58, 12);
    ctx.fill();
    ctx.strokeStyle = '#e03131';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#c92a2a';
    ctx.font = `900 23px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText('BUKCHON HANOK HQ · GREEN TEA & HOTFIXES SERVED AT 10:00 AM', w / 2, 456);
  });
}

/** Authentic 4-triangle interlocking origami pinwheel crease pattern for face-up ddakji tile. */
function makeOrigamiTopTexture(palette) {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = palette.main;
    ctx.fillRect(0, 0, w, h);

    // 4 interlocking diagonal folded triangles
    const cx = w / 2;
    const cy = h / 2;
    const tris = [
      [[0, 0], [w, 0], [cx, cy], palette.fold],
      [[w, 0], [w, h], [cx, cy], palette.main],
      [[w, h], [0, h], [cx, cy], palette.fold],
      [[0, h], [0, 0], [cx, cy], palette.main],
    ];
    for (const [p1, p2, p3, col] of tris) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(p1[0], p1[1]);
      ctx.lineTo(p2[0], p2[1]);
      ctx.lineTo(p3[0], p3[1]);
      ctx.closePath();
      ctx.fill();
    }

    // Crisp origami fold crease lines & tucked center diamond
    ctx.strokeStyle = 'rgba(15, 20, 30, 0.42)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(w, h);
    ctx.moveTo(w, 0); ctx.lineTo(0, h);
    ctx.stroke();

    ctx.strokeStyle = palette.trim;
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, w - 20, h - 20);

    // Inner tucked paper flap highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.beginPath();
    ctx.moveTo(cx, 38); ctx.lineTo(w - 38, cy); ctx.lineTo(cx, h - 38); ctx.lineTo(38, cy);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 3;
    ctx.stroke();
  });
}

/** Stark matte charcoal underside stamped with glowing crimson FLIPPED / 404 icon. */
function makeFlippedBottomTexture() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#181b22';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#ff3b5c';
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.fillStyle = '#ff3b5c';
    ctx.font = `900 44px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FLIPPED', w / 2, h * 0.42);
    ctx.fillStyle = '#ff8787';
    ctx.font = `800 32px ${FONT_MONO}`;
    ctx.fillText('404', w / 2, h * 0.66);
  });
}

/** Oversized foil-stamped CHEOL-DDAKJI ("Mandatory Architecture Reorg") texture. */
function makeCheolTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#7f1d1d');
    g.addColorStop(0.5, '#b91c1c');
    g.addColorStop(1, '#450a0a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#ffd43b';
    ctx.lineWidth = 18;
    ctx.strokeRect(14, 14, w - 28, h - 28);
    // Reinforced diagonal tape cross
    ctx.strokeStyle = 'rgba(255, 212, 59, 0.55)';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(24, 24); ctx.lineTo(w - 24, h - 24);
    ctx.moveTo(w - 24, 24); ctx.lineTo(24, h - 24);
    ctx.stroke();
    ctx.fillStyle = '#fff3bf';
    ctx.font = `900 48px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CHEOL-DDAKJI', w / 2, h * 0.4);
    ctx.font = `800 28px ${FONT_UI}`;
    ctx.fillText('MANDATORY REORG', w / 2, h * 0.58);
  });
}

/** Neon Seoul alley signboard texture. */
function makeNeonSignTexture(title, sub, borderColor) {
  return canvasTexture(512, 160, (ctx, w, h) => {
    ctx.fillStyle = '#0f1420';
    roundRect(ctx, 8, 8, w - 16, h - 16, 16);
    ctx.fill();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.fillStyle = '#f8f9fa';
    ctx.font = `900 44px ${FONT_UI}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, w / 2, h * 0.42);
    ctx.fillStyle = borderColor;
    ctx.font = `800 26px ${FONT_MONO}`;
    ctx.fillText(sub, w / 2, h * 0.75);
  });
}

/** Upright high-contrast player nameplate sprite. */
function makeDdakjiTag(name, color) {
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
  sprite.position.set(0, 1.35, 0);
  return { sprite, tex, spriteMat };
}

/** Builds an authentic beveled origami ddakji tile with developer portrait on top & crimson FLIPPED underside. */
function buildDdakjiTile(name, kind, palette, bottomMat, disposables) {
  const root = new THREE.Group();
  const pivot = new THREE.Group();
  root.add(pivot);

  const topTex = makeOrigamiTopTexture(palette);
  const topMat = new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.42, metalness: 0.06 });
  const sideMat = mat(palette.trim, { roughness: 0.55 });
  const geo = new THREE.BoxGeometry(TILE_SIZE, TILE_THICK, TILE_SIZE);
  // BoxGeometry face order: +x, -x, +y (top), -y (bottom), +z, -z
  const mesh = new THREE.Mesh(geo, [sideMat, sideMat, topMat, bottomMat, sideMat, sideMat]);
  mesh.position.y = TILE_THICK / 2;
  pivot.add(mesh);

  // Developer portrait printed flush on the unflipped origami top face!
  const portraitTex = getDeveloperPortraitTexture(kind.id);
  const faceGeo = new THREE.CircleGeometry(TILE_SIZE * 0.35, 28);
  const faceMat = new THREE.MeshStandardMaterial({ map: portraitTex, roughness: 0.36, metalness: 0.04 });
  const faceMesh = new THREE.Mesh(faceGeo, faceMat);
  faceMesh.rotation.x = -Math.PI / 2;
  faceMesh.position.y = TILE_THICK + 0.012;
  pivot.add(faceMesh);
  // Crisp paper-trim border ring framing the portrait
  pivot.add(at(torus(TILE_SIZE * 0.355, 0.032, mat(palette.trim, { roughness: 0.35 })), 0, TILE_THICK + 0.012, 0, Math.PI / 2, 0, 0));

  const tag = makeDdakjiTag(name, palette.main);
  root.add(tag.sprite);

  disposables.push(topTex, topMat, geo, faceGeo, faceMat, tag.tex, tag.spriteMat);
  return { root, pivot, mesh, tag: tag.sprite };
}

/**
 * Builds a traditional South Korean Hanok Executive Conference Room (Bukchon Sarangbang Boardroom):
 * - Warm golden maru pine-plank floor with woven reed mat border & silk bangseok floor cushions
 * - Exposed dark cedar gidung pillars, ceiling rafters, and glowing hanji box pendant lanterns
 * - Wall 1 (Back): Cedar-framed Korean Sprint Boardroom Whiteboard + flanking sumukhwa ink scrolls
 * - Wall 2 (Right): Glowing changhoji rice-paper lattice screens + 4K Seoul HQ boardroom TV
 * - Wall 3 (Left): Wood-latticed hanok windows overlooking Bukchon eaves & Namsan Seoul Tower
 * - Wall 4 (Front): Tall double cedar & hanji lattice sliding conference doors
 */
function buildDdakjiArena(scene, courtRadius, puddles, disposables) {
  scene.background = new THREE.Color('#2a221c');
  scene.fog = new THREE.Fog('#2a221c', 55, 140);

  // Warm ambient hanji lantern + golden late-afternoon window lighting
  scene.add(new THREE.HemisphereLight('#fff4df', '#4a3525', 1.15));
  const key = new THREE.DirectionalLight('#ffecd1', 1.35);
  key.position.set(12, 24, 14);
  scene.add(key);
  const sunsetWin = new THREE.DirectionalLight('#ffc999', 0.72);
  sunsetWin.position.set(-24, 12, 2);
  scene.add(sunsetWin);

  const HALF_W = 28;
  const HALF_D = 26;
  const CEIL_Y = 20;
  const WALL_MID_Y = CEIL_Y / 2;

  // Golden maru hardwood plank floor
  const maruTex = makeMaruFloorTexture();
  const maruMat = new THREE.MeshStandardMaterial({ map: maruTex, roughness: 0.44, metalness: 0.06 });
  disposables.push(maruTex, maruMat);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(HALF_W * 2, HALF_D * 2), maruMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.02;
  scene.add(floor);

  // Traditional woven Korean reed mat (hwamunseok) border framing the ddakji play square
  const cR = courtRadius;
  const matBorder = mat('#c92a2a', { roughness: 0.75 });
  const goldTrim = mat('#d9a441', { emissive: '#d9a441', emissiveIntensity: 0.35, roughness: 0.4 });
  scene.add(at(box(cR * 2 + 0.5, 0.03, 0.34, matBorder), 0, 0.008, -cR));
  scene.add(at(box(cR * 2 + 0.5, 0.03, 0.34, matBorder), 0, 0.008, cR));
  scene.add(at(box(0.34, 0.03, cR * 2 + 0.5, matBorder), -cR, 0.008, 0));
  scene.add(at(box(0.34, 0.03, cR * 2 + 0.5, matBorder), cR, 0.008, 0));
  scene.add(at(torus(cR * 0.36, 0.07, goldTrim), 0, 0.02, 0, Math.PI / 2, 0, 0));

  // Damp tea/courtyard puddles (30s+ modes)
  const puddleMat = mat('#0e7490', { roughness: 0.08, metalness: 0.85, emissive: '#22d3ee', emissiveIntensity: 0.32 });
  for (const p of puddles) {
    scene.add(at(cyl(p.r, p.r * 1.04, 0.03, puddleMat, 24), p.x, 0.015, p.z));
  }

  // Timber ceiling + exposed Korean cedar rafters (seokkarae) + glowing hanji pendant box lanterns
  const ceilMat = mat('#e8dcc6', { roughness: 0.9 });
  const cedarMat = mat('#4e301c', { roughness: 0.65 });
  const darkCedarMat = mat('#362012', { roughness: 0.6 });
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(HALF_W * 2, HALF_D * 2), ceilMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = CEIL_Y;
  scene.add(ceil);
  for (let rx = -22; rx <= 22; rx += 5.5) {
    scene.add(at(box(0.55, 0.65, HALF_D * 2, cedarMat), rx, CEIL_Y - 0.32, 0));
  }
  for (const rz of [-14, 0, 14]) {
    scene.add(at(box(HALF_W * 2, 0.9, 0.85, darkCedarMat), 0, CEIL_Y - 0.65, rz));
  }
  const hanjiLampMat = mat('#fff6dc', { emissive: '#ffcf70', emissiveIntensity: 1.45, roughness: 0.3 });
  for (const lx of [-11, 0, 11]) {
    for (const lz of [-9, 9]) {
      scene.add(at(cyl(0.05, 0.05, 2.2, darkCedarMat, 8), lx, CEIL_Y - 1.5, lz));
      scene.add(at(box(1.75, 1.5, 1.75, hanjiLampMat), lx, CEIL_Y - 3.0, lz));
      scene.add(at(box(1.9, 0.14, 1.9, darkCedarMat), lx, CEIL_Y - 2.24, lz));
      scene.add(at(box(1.9, 0.14, 1.9, darkCedarMat), lx, CEIL_Y - 3.76, lz));
    }
  }

  // Warm hanji plaster walls + cedar timber pillars (gidung) + horizontal lintel beams (inbang)
  const plasterMat = mat('#efe7d6', { roughness: 0.88 });
  // Back wall (z = -HALF_D)
  scene.add(at(plane(HALF_W * 2, CEIL_Y, plasterMat), 0, WALL_MID_Y, -HALF_D));
  // Right wall (x = +HALF_W)
  scene.add(at(plane(HALF_D * 2, CEIL_Y, plasterMat), HALF_W, WALL_MID_Y, 0, 0, -Math.PI / 2, 0));
  // Left wall (x = -HALF_W)
  scene.add(at(plane(HALF_D * 2, CEIL_Y, plasterMat), -HALF_W, WALL_MID_Y, 0, 0, Math.PI / 2, 0));
  // Front wall (z = +HALF_D)
  scene.add(at(plane(HALF_W * 2, CEIL_Y, plasterMat), 0, WALL_MID_Y, HALF_D, 0, Math.PI, 0));

  // Perimeter cedar baseboards, mid-rails, top lintels & vertical gidung pillars
  for (const [bx, bz, w, d] of [
    [0, -HALF_D + 0.16, HALF_W * 2, 0.32],
    [0, HALF_D - 0.16, HALF_W * 2, 0.32],
    [-HALF_W + 0.16, 0, 0.32, HALF_D * 2],
    [HALF_W - 0.16, 0, 0.32, HALF_D * 2],
  ]) {
    scene.add(at(box(w, 0.55, d, darkCedarMat), bx, 0.27, bz));
    scene.add(at(box(w, 0.55, d, darkCedarMat), bx, CEIL_Y - 0.28, bz));
  }
  for (const px of [-HALF_W + 0.35, -14, 14, HALF_W - 0.35]) {
    scene.add(at(box(0.85, CEIL_Y, 0.85, cedarMat), px, WALL_MID_Y, -HALF_D + 0.35));
    scene.add(at(box(0.85, CEIL_Y, 0.85, cedarMat), px, WALL_MID_Y, HALF_D - 0.35));
  }
  for (const pz of [-13, 0, 13]) {
    scene.add(at(box(0.85, CEIL_Y, 0.85, cedarMat), -HALF_W + 0.35, WALL_MID_Y, pz));
    scene.add(at(box(0.85, CEIL_Y, 0.85, cedarMat), HALF_W - 0.35, WALL_MID_Y, pz));
  }

  // ---- WALL 1 (Back Wall): Cedar-Framed Korean Boardroom Whiteboard + Flanking Ink Scrolls ----
  const wbTex = makeHanokBoardTexture();
  wbTex.anisotropy = 4;
  const wbMat = new THREE.MeshStandardMaterial({ map: wbTex, roughness: 0.24 });
  disposables.push(wbTex, wbMat);
  scene.add(at(box(22.6, 11.6, 0.3, darkCedarMat), 0, 8.6, -HALF_D + 0.24));
  scene.add(at(plane(21.8, 10.9, wbMat), 0, 8.6, -HALF_D + 0.42));

  const scrollTex = makeInkScrollTexture();
  const scrollMat = new THREE.MeshStandardMaterial({ map: scrollTex, roughness: 0.65 });
  disposables.push(scrollTex, scrollMat);
  for (const sx of [-19.5, 19.5]) {
    scene.add(at(plane(4.6, 9.6, scrollMat), sx, 8.6, -HALF_D + 0.28));
  }

  // ---- WALL 2 (Right Wall): Changhoji Rice-Paper Lattice Screens + 4K Seoul HQ Boardroom TV ----
  const changTex = makeChanghojiTexture();
  const changMat = new THREE.MeshStandardMaterial({
    map: changTex,
    roughness: 0.55,
    emissive: '#ffdf9e',
    emissiveIntensity: 0.16,
  });
  disposables.push(changTex, changMat);
  for (const cz of [-18.5, 18.5]) {
    scene.add(at(plane(9.5, 13.5, changMat), HALF_W - 0.22, 7.2, cz, 0, -Math.PI / 2, 0));
  }
  const tvTex = makeNeonSignTexture('딱지치기 · SEOUL HQ', 'DDAKJI FLIP-OUT · STANDUP', '#ffd43b');
  const tvMat = new THREE.MeshBasicMaterial({ map: tvTex });
  disposables.push(tvTex, tvMat);
  scene.add(at(box(0.45, 9.4, 18.8, mat('#161a24', { roughness: 0.35, metalness: 0.6 })), HALF_W - 0.18, 8.6, 0));
  scene.add(at(plane(18.0, 8.6, tvMat), HALF_W - 0.44, 8.6, 0, 0, -Math.PI / 2, 0));

  // ---- WALL 3 (Left Wall): Wood-Latticed Hanok Windows Overlooking Bukchon & Namsan Tower ----
  const winTex = makeSeoulWindowTexture();
  const winMat = new THREE.MeshBasicMaterial({ map: winTex });
  disposables.push(winTex, winMat);
  scene.add(at(plane(32, 11.8, winMat), -HALF_W + 0.16, 8.8, 0, 0, Math.PI / 2, 0));
  for (const wz of [-16, -8, 0, 8, 16]) {
    scene.add(at(box(0.32, 12.2, 0.34, darkCedarMat), -HALF_W + 0.24, 8.8, wz));
  }
  scene.add(at(box(0.35, 0.42, 32.6, darkCedarMat), -HALF_W + 0.24, 2.8, 0));
  scene.add(at(box(0.35, 0.42, 32.6, darkCedarMat), -HALF_W + 0.24, 14.8, 0));

  // ---- WALL 4 (Front Wall): Tall Double Cedar & Changhoji Sliding Hanok Doors ----
  const doorW = 11.2;
  const doorH = 14.8;
  scene.add(at(box(doorW + 0.9, doorH + 0.5, 0.38, darkCedarMat), 0, doorH / 2, HALF_D - 0.2));
  scene.add(at(plane(doorW / 2 - 0.15, doorH - 0.4, changMat), -doorW / 4, doorH / 2, HALF_D - 0.42, 0, Math.PI, 0));
  scene.add(at(plane(doorW / 2 - 0.15, doorH - 0.4, changMat), doorW / 4, doorH / 2, HALF_D - 0.42, 0, Math.PI, 0));
  const brassMat = mat('#e6b84c', { roughness: 0.24, metalness: 0.88 });
  for (const side of [-1, 1]) {
    scene.add(at(torus(0.34, 0.06, brassMat), side * 0.72, 6.2, HALF_D - 0.52));
  }

  // ---- Jwasik Seated Conference Perimeter: Plush Embroidered Silk Bangseok Cushions & Soban Tea Trays ----
  const cushionPalette = [
    { main: '#b91c1c', trim: '#f5c26b' },
    { main: '#1e3a8a', trim: '#fcd34d' },
    { main: '#0f766e', trim: '#fde68a' },
    { main: '#b45309', trim: '#fef3c7' },
    { main: '#831843', trim: '#fbcfe8' },
    { main: '#1d4ed8', trim: '#bae6fd' },
  ];
  const goldPipingMat = mat('#e6b84c', { roughness: 0.32, metalness: 0.45 });
  const cushionMats = cushionPalette.map(({ main, trim }) => {
    const tex = canvasTexture(256, 256, (ctx, w, h) => {
      ctx.fillStyle = main;
      ctx.fillRect(0, 0, w, h);
      // Soft pillow puff shading (brighter stuffed crown, darker tucked seams)
      const puff = ctx.createRadialGradient(w / 2, h / 2, 14, w / 2, h / 2, w * 0.68);
      puff.addColorStop(0, 'rgba(255,255,255,0.22)');
      puff.addColorStop(0.55, 'rgba(255,255,255,0.03)');
      puff.addColorStop(1, 'rgba(0,0,0,0.42)');
      ctx.fillStyle = puff;
      ctx.fillRect(0, 0, w, h);
      // Center tuft dimple shadow + radiating fabric folds
      const dimple = ctx.createRadialGradient(w / 2, h / 2, 3, w / 2, h / 2, 30);
      dimple.addColorStop(0, 'rgba(0,0,0,0.55)');
      dimple.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = dimple;
      ctx.beginPath(); ctx.arc(w / 2, h / 2, 30, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 3;
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(w / 2 + Math.cos(a) * 14, h / 2 + Math.sin(a) * 14);
        ctx.lineTo(w / 2 + Math.cos(a) * 58, h / 2 + Math.sin(a) * 58);
        ctx.stroke();
      }
      // Traditional gold-embroidered Korean geometric border + center lotus medallion ring
      ctx.strokeStyle = trim;
      ctx.lineWidth = 6;
      roundRect(ctx, 18, 18, w - 36, h - 36, 22);
      ctx.stroke();
      ctx.lineWidth = 2.5;
      roundRect(ctx, 30, 30, w - 60, h - 60, 14);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(w / 2, h / 2, 42, 0, Math.PI * 2); ctx.stroke();
    });
    const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.62, metalness: 0.08 });
    disposables.push(tex, m);
    return { silkMat: m, rimMat: mat(main, { roughness: 0.68 }) };
  });

  const buildBangseokCushion = (cx, cz, palIdx, yaw) => {
    const g = new THREE.Group();
    g.position.set(cx, 0, cz);
    g.rotation.y = yaw;
    const { silkMat, rimMat } = cushionMats[palIdx % cushionMats.length];
    // Plump rounded square pillow body: puffed ellipsoid crown + soft bolster edges + rounded corners
    const crown = ball(1.38, silkMat, 1.0, 0.34, 1.0);
    crown.position.y = 0.28;
    g.add(crown);
    const pad = at(box(1.92, 0.32, 1.92, silkMat), 0, 0.24, 0);
    g.add(pad);
    // Soft stuffed piping bolsters around all 4 edges so it reads unmistakably as a plush pillow
    for (const s of [-0.96, 0.96]) {
      g.add(at(cyl(0.22, 0.22, 1.92, rimMat, 12), 0, 0.22, s, 0, 0, Math.PI / 2));
      g.add(at(cyl(0.22, 0.22, 1.92, rimMat, 12), s, 0.22, 0, Math.PI / 2, 0, 0));
    }
    // 4 rounded pillow corners + tiny gold silk corner tassels!
    for (const sx of [-0.96, 0.96]) {
      for (const sz of [-0.96, 0.96]) {
        g.add(at(ball(0.23, rimMat, 1.0, 0.95, 1.0), sx, 0.22, sz));
        g.add(at(ball(0.085, goldPipingMat), sx * 1.16, 0.14, sz * 1.16));
      }
    }
    // Recessed silk-covered center tuft button
    g.add(at(cyl(0.14, 0.16, 0.08, goldPipingMat, 14), 0, 0.68, 0));
    return g;
  };

  const cushionDist = Math.max(cR + 2.6, 13.4);
  for (let i = 0; i < 6; i++) {
    const cx = -11 + i * 4.4;
    // Slight natural per-cushion rotation so they look lived-in, not rigid floor tiles
    const jitterA = ((i % 3) - 1) * 0.08;
    const jitterB = (((i + 1) % 3) - 1) * 0.08;
    scene.add(buildBangseokCushion(cx, -cushionDist, i, jitterA));
    scene.add(buildBangseokCushion(cx, cushionDist, i + 3, Math.PI + jitterB));
  }
  // Low lacquered soban conference tea tables with celadon tea cups & laptops in the corners
  const lacquerMat = mat('#2b1510', { roughness: 0.25, metalness: 0.18 });
  const celadonMat = mat('#8fb9a8', { roughness: 0.22, metalness: 0.12 });
  const laptopSilver = mat('#ced4da', { roughness: 0.28, metalness: 0.78 });
  const screenMat = mat('#1e293b', { emissive: '#38bdf8', emissiveIntensity: 0.45 });
  for (const [tx, tz, ry] of [[-cushionDist - 1.5, -cushionDist + 2.2, 0.4], [cushionDist + 1.5, -cushionDist + 2.2, -0.4], [-cushionDist - 1.5, cushionDist - 2.2, 2.6], [cushionDist + 1.5, cushionDist - 2.2, -2.6]]) {
    const soban = new THREE.Group();
    soban.position.set(tx, 0, tz);
    soban.rotation.y = ry;
    soban.add(at(box(3.4, 0.22, 2.2, lacquerMat), 0, 1.35, 0));
    for (const [lx, lz] of [[-1.35, -0.8], [1.35, -0.8], [-1.35, 0.8], [1.35, 0.8]]) {
      soban.add(at(cyl(0.1, 0.08, 1.35, lacquerMat, 8), lx, 0.67, lz));
    }
    // Celadon teacup + saucer
    soban.add(at(cyl(0.22, 0.18, 0.36, celadonMat, 12), 1.05, 1.64, 0.35));
    // Modern laptop on the traditional soban table!
    soban.add(at(box(1.5, 0.06, 1.05, laptopSilver), -0.4, 1.5, 0));
    soban.add(at(box(1.5, 0.96, 0.06, laptopSilver), -0.4, 1.98, -0.52, -0.22, 0, 0));
    soban.add(at(box(1.36, 0.82, 0.03, screenMat), -0.4, 1.98, -0.49, -0.22, 0, 0));
    scene.add(soban);
  }

  // Oversized foil-stamped CHEOL-DDAKJI ("Mandatory Architecture Reorg") boss tile
  const cheolTex = makeCheolTexture();
  const cheolMat = new THREE.MeshStandardMaterial({ map: cheolTex, roughness: 0.24, metalness: 0.55 });
  const cheolGeo = new THREE.BoxGeometry(4.2, 0.42, 4.2);
  const cheolMesh = new THREE.Mesh(cheolGeo, cheolMat);
  cheolMesh.visible = false;
  scene.add(cheolMesh);
  disposables.push(cheolTex, cheolMat, cheolGeo);

  // Shared crimson FLIPPED underside material
  const bottomTex = makeFlippedBottomTexture();
  const bottomMat = new THREE.MeshStandardMaterial({
    map: bottomTex,
    roughness: 0.5,
    emissive: '#e03131',
    emissiveIntensity: 0.35,
  });
  disposables.push(bottomTex, bottomMat);

  return { cheolMesh, bottomMat, courtRadius };
}

// ------------------------------------------------------------------ Lobby 3D Stage

export class DdakjiStage {
  constructor(aspect = 16 / 9, initialNames = [], { duration = DEFAULT_DDAKJI_DURATION } = {}) {
    this.t = 0;
    this.names = [];
    this.models = [];
    this.disposables = [];
    const previewSim = new DdakjiSim({ names: initialNames.length >= 2 ? initialNames : ['Ada', 'Grace'], duration });

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(46, aspect, 0.3, 180);
    this.arena = buildDdakjiArena(this.scene, previewSim.courtRadius, previewSim.puddles, this.disposables);
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

    const palettes = [
      { main: '#e63946', fold: '#ff6b6b', trim: '#ffd166' },
      { main: '#2563eb', fold: '#60a5fa', trim: '#e0f2fe' },
      { main: '#10b981', fold: '#34d399', trim: '#d1fae5' },
      { main: '#f59e0b', fold: '#fbbf24', trim: '#fef3c7' },
      { main: '#8b5cf6', fold: '#a78bfa', trim: '#ede9fe' },
      { main: '#ec4899', fold: '#f472b6', trim: '#fce7f3' },
    ];
    const n = Math.max(1, names.length);
    names.forEach((name, i) => {
      const a = (i / n) * Math.PI * 2;
      const rad = Math.min(this.arena.courtRadius * 0.68, 2.3 + (i % 3) * 1.65);
      const kind = DEVELOPER_KINDS[i % DEVELOPER_KINDS.length];
      const tile = buildDdakjiTile(name, kind, palettes[i % palettes.length], this.arena.bottomMat, this.disposables);
      tile.root.position.set(Math.cos(a) * rad, 0, Math.sin(a) * rad);
      tile.pivot.rotation.y = a * 0.5;
      this.scene.add(tile.root);
      this.models.push({ ...tile, phase: i * 0.7 });
    });
  }

  update(dt, reduced = false) {
    if (!reduced) this.t += dt;
    const t = this.t;
    for (const m of this.models) {
      if (!reduced) {
        m.root.position.y = Math.max(0, Math.sin(t * 2.4 + m.phase)) * 0.22;
        m.pivot.rotation.x = Math.sin(t * 2.8 + m.phase) * 0.14;
      }
    }
    // Eye-level executive hanok boardroom orbit so the whiteboard, ink scrolls & Bukchon window view shine!
    const ang = reduced ? 0.08 : t * 0.18;
    this.camera.position.set(Math.sin(ang) * 18.0, 6.2, Math.cos(ang) * 18.0);
    this.camera.lookAt(0, 3.8, 0);
  }

  dispose() {
    for (const d of this.disposables) d.dispose?.();
  }
}

// ------------------------------------------------------------------ Live Match

export class DdakjiMatch {
  constructor(names, { duration = DEFAULT_DDAKJI_DURATION, rule = DEFAULT_DDAKJI_RULE, rng = Math.random, sfx = null, onEvent = null, onWinner = null } = {}) {
    this.sim = new DdakjiSim({ names, duration, rule, rng });
    this.sfx = sfx;
    this.onEvent = onEvent;
    this.onWinner = onWinner;
    this.accumulator = 0;
    this.victoryTime = 0;
    this.shake = 0;
    this.winnerAnnounced = false;
    this.shockRings = [];
    this.disposables = [];

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.3, 180);
    this.arena = buildDdakjiArena(this.scene, this.sim.courtRadius, this.sim.puddles, this.disposables);
    this.particles = new Particles(this.scene);

    this.tileVisuals = this.sim.tiles.map((tile, i) => {
      const kind = DEVELOPER_KINDS[i % DEVELOPER_KINDS.length];
      const vis = buildDdakjiTile(tile.name, kind, tile.palette, this.arena.bottomMat, this.disposables);
      vis.root.position.set(tile.x, tile.y, tile.z);
      this.scene.add(vis.root);
      return { sim: tile, ...vis };
    });

    this.camPos = new THREE.Vector3(0, 12.2, 16.2);
    this.camLook = new THREE.Vector3(0, 0.8, 0);
    this._axis = new THREE.Vector3();
    this.resize(window.innerWidth / window.innerHeight);
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 1 ? 60 : 46;
    this.camera.updateProjectionMatrix();
  }

  spawnShockRing(x, z, maxRadius, isCheol) {
    const ringMat = new THREE.MeshBasicMaterial({
      color: isCheol ? '#ffd43b' : '#74c0fc',
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
    });
    const ringGeo = new THREE.RingGeometry(0.5, 0.82, 32);
    const mesh = new THREE.Mesh(ringGeo, ringMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.06, z);
    this.scene.add(mesh);
    this.shockRings.push({ mesh, geo: ringGeo, mat: ringMat, age: 0, maxAge: isCheol ? 0.65 : 0.45, maxRadius });
  }

  update(realDt) {
    const lastVolley = this.sim.volleys.at(-1);
    const inFinalSlowMo = lastVolley && this.sim.time > lastVolley.at - 0.1 && this.sim.time < lastVolley.at + 0.85 && !this.sim.done;
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

    // Sync giant CHEOL-DDAKJI
    this.arena.cheolMesh.visible = this.sim.cheol.active;
    if (this.sim.cheol.active) {
      this.arena.cheolMesh.position.set(this.sim.cheol.x, this.sim.cheol.y, this.sim.cheol.z);
    }

    // Sync origami ddakji tiles & exact edge-pivot flip rotation
    for (const tv of this.tileVisuals) {
      const tile = tv.sim;
      const winHop = this.sim.winner === tile ? Math.abs(Math.sin(this.victoryTime * 6.0)) * 0.55 : 0;
      tv.root.position.set(tile.x, tile.y + winHop, tile.z);
      this._axis.set(tile.flipAxisX, 0, tile.flipAxisZ).normalize();
      tv.pivot.quaternion.setFromAxisAngle(this._axis, tile.theta);
      if (tile.theta === 0) {
        tv.pivot.rotation.y = tile.yaw + (this.sim.winner === tile ? this.victoryTime * 1.4 : 0);
      }
      tv.tag.material.opacity = tile.flipped ? 0.5 : 1.0;
    }

    // Animate expanding air-blast shock-rings
    for (let i = this.shockRings.length - 1; i >= 0; i--) {
      const sr = this.shockRings[i];
      sr.age += realDt;
      const p = sr.age / sr.maxAge;
      if (p >= 1) {
        this.scene.remove(sr.mesh);
        sr.geo.dispose();
        sr.mat.dispose();
        this.shockRings.splice(i, 1);
      } else {
        const s = 1 + p * sr.maxRadius;
        sr.mesh.scale.set(s, s, 1);
        sr.mat.opacity = (1 - p) * 0.82;
      }
    }

    this.particles.update(realDt);

    // Dynamic Camera: Courtyard Overview -> Low Pavement Macro Slow-Mo -> 360° Victory Orbit
    if (this.shake > 0) this.shake = Math.max(0, this.shake - realDt * 4.5);
    const kickY = Math.sin(t * 54) * this.shake * 0.6;
    const wantPos = new THREE.Vector3();
    const wantLook = new THREE.Vector3(0, 0.7, 0);

    if (this.sim.winner) {
      // Relaxed 360° hanok conference room orbit framing the unflipped winner & boardroom architecture
      const orbitAng = this.victoryTime * 0.22;
      wantPos.set(Math.sin(orbitAng) * 16.8, 5.8, Math.cos(orbitAng) * 16.8);
      wantLook.set(this.sim.winner.x * 0.45, 3.4, this.sim.winner.z * 0.45);
    } else if (inFinalSlowMo) {
      // Ultra-low pavement-level edge-teeter macro angle!
      wantPos.set(Math.sin(t * 0.4) * 5.2, 2.4, 8.8);
      wantLook.set(0, 0.65, 0);
    } else {
      const zoom = this.sim.activeCount() <= 5 ? 12.2 : 16.2;
      wantPos.set(Math.sin(t * 0.25) * 3.8, zoom * 0.74 + kickY, zoom);
    }

    this.camPos.lerp(wantPos, Math.min(1, realDt * 4.5));
    this.camLook.lerp(wantLook, Math.min(1, realDt * 5.0));
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
  }

  handleEvent(e) {
    if (e.type === 'volley') {
      this.sfx?.play?.('ddakjiSlap');
      const label = e.volley.index === 0 ? 'KKA-RA! — TTAK!' : e.volley.isFinal ? 'FINAL TTAK!' : 'SLAM VOLLEY — TTAK!';
      this.onEvent?.({
        type: 'status',
        text: `🟥 ${label} · FACE-UP: ${e.remaining} / ${this.sim.tiles.length}`,
        tone: e.volley.isFinal ? 'red' : 'yellow',
      });
      this.onEvent?.({ type: 'note', text: `🟥 ${label} Paper tiles slamming the slate!`, important: true });
    } else if (e.type === 'shock') {
      this.spawnShockRing(e.x, e.z, e.radius, e.isCheol);
      this.shake = Math.max(this.shake, e.isCheol ? 1.0 : 0.45);
      if (e.isCheol) this.sfx?.play?.('ddakjiCheol');
    } else if (e.type === 'slam') {
      this.sfx?.play?.('ddakjiSlap');
    } else if (e.type === 'cheol') {
      this.onEvent?.({ type: 'status', text: '🟥 CHEOL-DDAKJI INCOMING — MANDATORY REORG!', tone: 'red' });
      this.onEvent?.({ type: 'note', text: `💥 CHEOL-DDAKJI: “${e.popup}”`, important: true });
    } else if (e.type === 'whiff') {
      this.onEvent?.({ type: 'note', text: `💨 BARAM-PPA-JIM! “${e.popup}”`, important: false });
    } else if (e.type === 'flipped') {
      this.sfx?.play?.('ddakjiFlip');
      this.particles.burst(new THREE.Vector3(e.tile.x, 0.5, e.tile.z), {
        count: 14,
        colors: ['#ff3b5c', '#ffd43b', '#ffffff'],
        speed: 4.5,
        up: 4.5,
        life: 0.55,
        size: 0.16,
        gravity: 13,
      });
      this.onEvent?.({
        type: 'status',
        text: `🟥 FACE-UP: ${e.remaining} / ${this.sim.tiles.length}`,
        tone: e.remaining <= 3 ? 'red' : 'yellow',
      });
      this.onEvent?.({ type: 'note', text: `🔄 ${e.tile.name} FLIPPED: “${e.popup}”`, important: false });
    } else if (e.type === 'winner' && !this.winnerAnnounced) {
      this.winnerAnnounced = true;
      this.sfx?.play?.('ddakjiWin');
      this.sfx?.fanfare?.();
      this.particles.burst(new THREE.Vector3(e.tile.x, 1.0, e.tile.z), {
        count: 72,
        colors: ['#e63946', '#2563eb', '#ffd43b', '#22d3ee', '#ffffff'],
        speed: 7.5,
        up: 9.0,
        life: 1.9,
        size: 0.25,
        gravity: 12,
      });
      this.onWinner?.(e.tile, this.sim);
    }
  }

  dispose() {
    for (const sr of this.shockRings) {
      sr.geo.dispose();
      sr.mat.dispose();
    }
    for (const d of this.disposables) d.dispose?.();
  }
}
