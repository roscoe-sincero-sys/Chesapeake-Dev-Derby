// "Chaupar Cowrie-Clash" (Boardroom Edition): twilight Indian corporate conference room with a
// varnished teak table, crimson-and-emerald gold-stitched Chaupar cross cloth, glowing golden
// lotus-star safe chira tiles, central CHARKONI throne, colossal bouncing ivory cowrie shells,
// Polycom spider conference speakerphone, stainless-steel cutting-chai & samosa tray, overhead
// spinning ceiling fan, flickering Q4 STATUS DECK projector screen, rolling metal office wastebasket,
// turned-wood developer pawns with portraits, 0.4x slow-mo Charkoni finale & 360-deg victory orbit!

import * as THREE from 'three';
import { mat, box, ball, cyl, torus, plane, at, canvasTexture, FONT_UI, FONT_MONO, roundRect } from './util3d.js';
import { Particles } from './effects.js';
import { DEVELOPER_KINDS } from './deathmatch-sim.js';
import {
  ChauparSim,
  TILE_SIZE,
  CHARKONI_HALF,
  BIN_POS,
  DEFAULT_CHAUPAR_DURATION,
  DEFAULT_CHAUPAR_RULE,
} from './chaupar-sim.js';

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

/** Rich dark varnished teakwood texture for the boardroom conference table. */
function makeTeakWoodTexture() {
  const tex = canvasTexture(512, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#4a2b18');
    g.addColorStop(0.5, '#5c361e');
    g.addColorStop(1, '#3d2212');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 6) {
      ctx.fillStyle = y % 12 === 0 ? 'rgba(25, 12, 5, 0.16)' : 'rgba(210, 150, 90, 0.05)';
      ctx.fillRect(0, y, w, 3);
    }
  });
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

/** Ornate golden CHARKONI central throne square texture. */
function makeCharkoniTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#3b1019';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#ffd43b';
    ctx.lineWidth = 14;
    ctx.strokeRect(12, 12, w - 24, h - 24);
    ctx.strokeStyle = '#f59f00';
    ctx.lineWidth = 4;
    ctx.strokeRect(32, 32, w - 64, h - 64);

    // Golden diagonal lotus cross
    ctx.strokeStyle = 'rgba(255, 212, 59, 0.55)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(36, 36); ctx.lineTo(w - 36, h - 36);
    ctx.moveTo(w - 36, 36); ctx.lineTo(36, h - 36);
    ctx.stroke();

    // Central golden medallion
    ctx.fillStyle = '#f59f00';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 108, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff3bf';
    ctx.lineWidth = 8;
    ctx.stroke();

    ctx.fillStyle = '#2b0910';
    ctx.font = `900 38px ${FONT_UI}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CHARKONI', w / 2, h / 2 - 14);
    ctx.font = `800 22px ${FONT_MONO}`;
    ctx.fillText('BOARD CHAIR', w / 2, h / 2 + 24);
  });
}

/** Modern Bengaluru tech-office geometric carpet floor texture. */
function makeBengaluruFloorTexture() {
  const tex = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#333b4a';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#3b4456';
    ctx.fillRect(0, 0, w / 2, h / 2);
    ctx.fillRect(w / 2, h / 2, w / 2, h / 2);
    ctx.strokeStyle = 'rgba(20, 24, 34, 0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, w / 2, h / 2);
    ctx.strokeRect(w / 2, h / 2, w / 2, h / 2);
  });
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(14, 14);
  return tex;
}

/** Panoramic Bengaluru Outer Ring Road / Garden City skyline seen through floor-to-ceiling glass. */
function makeBengaluruSkylineTexture() {
  return canvasTexture(1024, 512, (ctx, w, h) => {
    // Late-afternoon Bengaluru golden-hour sky
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.7);
    sky.addColorStop(0, '#2b6cb0');
    sky.addColorStop(0.48, '#63a4db');
    sky.addColorStop(0.82, '#f6cfa0');
    sky.addColorStop(1, '#fde4be');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Warm golden sun haze on the left
    const sunG = ctx.createRadialGradient(w * 0.24, h * 0.42, 10, w * 0.24, h * 0.42, 240);
    sunG.addColorStop(0, 'rgba(255, 248, 220, 0.72)');
    sunG.addColorStop(0.5, 'rgba(255, 224, 170, 0.22)');
    sunG.addColorStop(1, 'rgba(255, 224, 170, 0)');
    ctx.fillStyle = sunG;
    ctx.fillRect(0, 0, w, h * 0.75);

    // Soft sunlit clouds
    const drawCloud = (cx, cy, s) => {
      for (const [ox, oy, r] of [[-46, 8, 34], [-14, -8, 44], [24, -4, 42], [58, 10, 30]]) {
        const g = ctx.createRadialGradient(cx + ox * s, cy + oy * s, 4, cx + ox * s, cy + oy * s, r * s);
        g.addColorStop(0, 'rgba(255, 250, 240, 0.85)');
        g.addColorStop(1, 'rgba(255, 245, 230, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx + ox * s, cy + oy * s, r * s, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    drawCloud(210, 102, 1.1);
    drawCloud(610, 86, 0.9);
    drawCloud(860, 128, 1.0);

    // Distant hazy IT park skyline silhouettes
    ctx.fillStyle = '#5c7894';
    const farTowers = [
      [20, 210, 68], [96, 178, 54], [164, 225, 76], [285, 195, 62],
      [420, 168, 72], [510, 205, 80], [640, 182, 64], [760, 160, 74], [890, 195, 86],
    ];
    for (const [tx, ty, tw] of farTowers) ctx.fillRect(tx, ty, tw, h - ty);

    // Modern Bengaluru glass-facade IT towers (Outer Ring Road / Whitefield)
    const towers = [
      [48, 225, 86, '#294866', '#7dd3fc'],
      [152, 165, 98, '#1e3a5f', '#93c5fd'],
      [268, 245, 78, '#334e68', '#bae6fd'],
      [372, 152, 108, '#1f415e', '#7dd3fc'],
      [502, 198, 92, '#274663', '#fde68a'],
      [612, 138, 114, '#1b3854', '#93c5fd'],
      [744, 210, 88, '#2b4a68', '#7dd3fc'],
      [852, 174, 110, '#1f3d5a', '#fde68a'],
    ];
    for (const [tx, ty, tw, baseCol, winCol] of towers) {
      ctx.fillStyle = baseCol;
      ctx.fillRect(tx, ty, tw, h - ty);
      // Sleek glass curtain-wall horizontal bands
      ctx.fillStyle = winCol;
      ctx.globalAlpha = 0.28;
      for (let wy = ty + 14; wy < h - 90; wy += 16) {
        ctx.fillRect(tx + 8, wy, tw - 16, 6);
      }
      ctx.globalAlpha = 1;
      // Rooftop architectural crown accent
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(tx + 6, ty - 5, tw - 12, 5);
    }

    // Elevated Namma Metro viaduct silhouette across lower midground
    ctx.fillStyle = '#475569';
    ctx.fillRect(0, h * 0.72, w, 14);
    for (let px = 44; px < w; px += 128) {
      ctx.fillRect(px, h * 0.72, 16, h * 0.28);
    }
    // Sleek purple-stripe Namma Metro train gliding across viaduct
    ctx.fillStyle = '#e2e8f0';
    roundRect(ctx, 340, h * 0.688, 210, 18, 6);
    ctx.fill();
    ctx.fillStyle = '#7c3aed';
    ctx.fillRect(344, h * 0.706, 202, 5);

    // Iconic Bengaluru "Garden City" lush layered tree canopy (rain trees, gulmohar, pink tabebuia & palms)
    // 1. Distant hazy green park treeline behind the Namma Metro viaduct
    ctx.fillStyle = '#2d5742';
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 18) {
      const ridge = h * 0.77 + Math.sin(x * 0.025) * 9 + Math.cos(x * 0.07) * 5;
      ctx.lineTo(x, ridge);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    // Helper: painterly multi-clump broadleaf / rain-tree / flowering canopy with sun-lit top-left highlights
    const drawCanopyTree = (cx, cy, rx, ry, kind, seed) => {
      // Dark gnarled trunk & spreading umbrella branches visible beneath the crown
      ctx.strokeStyle = '#2c2018';
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(4, rx * 0.12);
      ctx.beginPath();
      ctx.moveTo(cx, h + 6);
      ctx.quadraticCurveTo(cx + Math.sin(seed) * 4, cy + ry * 0.5, cx, cy + ry * 0.12);
      ctx.stroke();
      ctx.lineWidth = Math.max(2.5, rx * 0.065);
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx, cy + ry * 0.25);
        ctx.quadraticCurveTo(cx + side * rx * 0.3, cy + ry * 0.1, cx + side * rx * 0.56, cy - ry * 0.05);
        ctx.stroke();
      }

      const palettes = {
        raintree: { dark: '#112e1b', mid: '#1f512c', light: '#3b7a42', sun: '#7eb356' },
        neem: { dark: '#133320', mid: '#255c35', light: '#458a4c', sun: '#92bf62' },
        gulmohar: { dark: '#243018', mid: '#c2410c', light: '#ea580c', sun: '#fbbf24' },
        tabebuia: { dark: '#292230', mid: '#be185d', light: '#ec4899', sun: '#fbcfe8' },
      };
      const pal = palettes[kind] || palettes.raintree;

      // Build organic umbrella-shaped foliage clusters (shadow base -> midtone clumps -> sunlit leaf highlights)
      const clumps = [];
      for (let i = 0; i < 16; i++) {
        const t = i / 15;
        const ang = -Math.PI + t * Math.PI + Math.sin(seed * 3.1 + i * 2.1) * 0.18;
        const dist = (0.35 + ((i * 37 + seed * 13) % 10) * 0.065);
        const px = cx + Math.cos(ang) * rx * dist;
        const py = cy + Math.sin(ang) * ry * dist * 0.82 + (i % 3) * 3;
        const r = Math.min(rx, ry) * (0.28 + ((i * 19 + seed) % 7) * 0.045);
        clumps.push({ px, py, r });
      }
      // Deep shaded under-canopy
      for (const { px, py, r } of clumps) {
        const g = ctx.createRadialGradient(px, py + r * 0.25, r * 0.1, px, py + r * 0.15, r * 1.12);
        g.addColorStop(0, pal.dark);
        g.addColorStop(1, 'rgba(12, 30, 18, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py + r * 0.18, r * 1.12, 0, Math.PI * 2);
        ctx.fill();
      }
      // Midtone leafy clumps
      for (const { px, py, r } of clumps) {
        const g = ctx.createRadialGradient(px - r * 0.2, py - r * 0.2, r * 0.08, px, py, r);
        g.addColorStop(0, pal.light);
        g.addColorStop(0.65, pal.mid);
        g.addColorStop(1, 'rgba(20, 50, 28, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }
      // Golden-hour sunlit leaf/blossom stipples on upper-left crown rim
      for (let i = 0; i < 24; i++) {
        const c = clumps[i % clumps.length];
        if (c.py > cy + ry * 0.18) continue;
        const sx = c.px - c.r * 0.28 + Math.sin(seed + i * 4.3) * c.r * 0.45;
        const sy = c.py - c.r * 0.32 + Math.cos(seed + i * 2.9) * c.r * 0.28;
        ctx.fillStyle = pal.sun;
        ctx.globalAlpha = 0.55 + (i % 3) * 0.12;
        ctx.beginPath();
        ctx.arc(sx, sy, 2.2 + (i % 4) * 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    // Helper: graceful silhouetted coconut / royal palm rising above the canopy
    const drawPalm = (px, topY, lean) => {
      ctx.strokeStyle = '#2d231b';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(px, h + 4);
      ctx.quadraticCurveTo(px + lean * 0.4, (h + topY) * 0.5, px + lean, topY);
      ctx.stroke();
      const tx = px + lean;
      for (let f = 0; f < 7; f++) {
        const a = -Math.PI * 0.92 + (f / 6) * Math.PI * 1.1;
        const flen = 28 + (f % 2) * 8;
        const ex = tx + Math.cos(a) * flen;
        const ey = topY + Math.sin(a) * flen * 0.55 + 12;
        ctx.strokeStyle = f % 2 === 0 ? '#1f512c' : '#356e3d';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(tx, topY);
        ctx.quadraticCurveTo(tx + Math.cos(a) * flen * 0.55, topY + Math.sin(a) * flen * 0.45 - 6, ex, ey);
        ctx.stroke();
      }
    };

    // Midground palms peeking above the Garden City canopy
    drawPalm(142, h * 0.74, 12);
    drawPalm(472, h * 0.72, -10);
    drawPalm(828, h * 0.73, 14);

    // Midground avenue rain trees & flowering gulmohar / pink tabebuia
    const midTrees = [
      [40, h * 0.86, 62, 38, 'raintree', 1],
      [155, h * 0.85, 58, 36, 'gulmohar', 2],
      [275, h * 0.86, 68, 40, 'raintree', 3],
      [402, h * 0.84, 56, 36, 'neem', 4],
      [525, h * 0.86, 64, 38, 'tabebuia', 5],
      [655, h * 0.85, 70, 42, 'raintree', 6],
      [782, h * 0.86, 58, 36, 'gulmohar', 7],
      [915, h * 0.85, 66, 40, 'neem', 8],
    ];
    for (const [tx, ty, rx, ry, kind, s] of midTrees) drawCanopyTree(tx, ty, rx, ry, kind, s);

    // Lush foreground dark-green rain-tree crowns framing the bottom edge of the window
    const foreTrees = [
      [95, h * 0.96, 78, 44, 'raintree', 11],
      [245, h * 0.97, 74, 42, 'neem', 12],
      [375, h * 0.96, 76, 44, 'raintree', 13],
      [585, h * 0.97, 82, 46, 'raintree', 14],
      [740, h * 0.96, 72, 42, 'neem', 15],
      [965, h * 0.95, 80, 44, 'raintree', 16],
    ];
    for (const [tx, ty, rx, ry, kind, s] of foreTrees) drawCanopyTree(tx, ty, rx, ry, kind, s);
  });
}

/** Contemporary Indian brass-and-indigo geometric Jali artwork & Bengaluru room plaque (Right Wall). */
function makeBengaluruJaliArtTexture() {
  return canvasTexture(1024, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#1e293b');
    g.addColorStop(1, '#0f172a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Brass border
    ctx.strokeStyle = '#d4a13e';
    ctx.lineWidth = 10;
    ctx.strokeRect(18, 18, w - 36, h - 36);

    // Modern geometric Indian Jali diamond-and-lotus gold lattice
    ctx.strokeStyle = 'rgba(212, 161, 62, 0.36)';
    ctx.lineWidth = 3;
    for (let x = 64; x < w - 40; x += 96) {
      for (let y = 64; y < h - 40; y += 96) {
        ctx.beginPath();
        ctx.moveTo(x, y - 34);
        ctx.lineTo(x + 34, y);
        ctx.lineTo(x, y + 34);
        ctx.lineTo(x - 34, y);
        ctx.closePath();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, 16, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Center dark medallion with Bengaluru campus room title
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    roundRect(ctx, w / 2 - 290, h / 2 - 86, 580, 172, 16);
    ctx.fill();
    ctx.strokeStyle = '#f59f00';
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.fillStyle = '#fde68a';
    ctx.font = `900 40px ${FONT_UI}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CUBBON BOARDROOM', w / 2, h / 2 - 26);
    ctx.fillStyle = '#94a3b8';
    ctx.font = `700 22px ${FONT_MONO}`;
    ctx.fillText('BENGALURU · OUTER RING ROAD · BLR-04', w / 2, h / 2 + 26);
  });
}

/** Flickering boardroom Q4 STATUS DECK projector screen texture. */
function makeProjectorScreenTexture() {
  return canvasTexture(1024, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0f172a');
    g.addColorStop(1, '#1e293b');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(0, 0, w, 78);
    ctx.fillStyle = '#f8fafc';
    ctx.font = `900 30px ${FONT_UI}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('BLR-04 Q4 DECK · SYNERGY ROADMAP v14_FINAL_REAL.PPTX', 36, 40);

    // Fake corporate KPI boxes
    const cards = [
      ['UPTIME', '99.9%*', '#51cf66'],
      ['OPEN P1s', '47 (+12)', '#ff6b6b'],
      ['CHAI LEVEL', 'CRITICAL', '#ffd43b'],
    ];
    cards.forEach(([label, val, col], i) => {
      const cx = 44 + i * 320;
      ctx.fillStyle = '#0f172a';
      roundRect(ctx, cx, 118, 290, 170, 14);
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = '#94a3b8';
      ctx.font = `700 22px ${FONT_MONO}`;
      ctx.textAlign = 'center';
      ctx.fillText(label, cx + 145, 162);
      ctx.fillStyle = col;
      ctx.font = `900 44px ${FONT_UI}`;
      ctx.fillText(val, cx + 145, 228);
    });

    ctx.fillStyle = '#1e3a8a';
    roundRect(ctx, 44, 336, w - 88, 126, 14);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#e0f2fe';
    ctx.font = `800 28px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText('CHAUPAR COWRIE-CLASH · CLAIM THE CHARKONI TO LEAD STANDUP', w / 2, 384);
    ctx.fillStyle = '#93c5fd';
    ctx.font = `700 22px ${FONT_UI}`;
    ctx.fillText('*Excludes MeghJwala 502 outages & SQL Server group policy pushes', w / 2, 430);
  });
}

/** Upright high-contrast pawn nameplate sprite. */
function makePawnTag(name, color) {
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
  sprite.scale.set(2.0, 0.5, 1);
  sprite.position.set(0, 2.25, 0);
  return { sprite, tex, spriteMat };
}

/** Builds a turned-wood Indian Chaupar pawn with neon base ring, lanyard & developer portrait head! */
function buildChauparPawn(name, kind, color, disposables) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const woodMat = mat(color, { roughness: 0.34, metalness: 0.14 });
  const goldTrim = mat('#ffd43b', { roughness: 0.25, metalness: 0.78 });
  const ringMat = mat(color, { emissive: color, emissiveIntensity: 1.4 });

  // Neon base ring + turned-wood Chaupar pawn pedestal & waist
  body.add(at(torus(0.42, 0.045, ringMat), 0, 0.05, 0, Math.PI / 2, 0, 0));
  body.add(at(cyl(0.32, 0.42, 0.24, woodMat, 16), 0, 0.14, 0));
  body.add(at(cyl(0.18, 0.32, 0.72, woodMat, 16), 0, 0.62, 0));
  body.add(at(torus(0.22, 0.04, goldTrim), 0, 0.98, 0, Math.PI / 2, 0, 0));
  // Tiny office lanyard badge draped on front
  body.add(at(box(0.16, 0.22, 0.04, mat('#f8fafc', { roughness: 0.3 })), 0, 0.65, 0.27));

  // Developer portrait medallion head
  const head = new THREE.Group();
  head.position.set(0, 1.42, 0);
  head.add(at(cyl(0.39, 0.39, 0.14, mat(kind.accent ?? color, { roughness: 0.32 }), 24), 0, 0, 0, Math.PI / 2, 0, 0));
  const portraitTex = getDeveloperPortraitTexture(kind.id);
  const faceMat = new THREE.MeshStandardMaterial({ map: portraitTex, roughness: 0.32 });
  const faceGeo = new THREE.CircleGeometry(0.36, 24);
  const front = new THREE.Mesh(faceGeo, faceMat);
  front.position.set(0, 0, 0.076);
  const back = new THREE.Mesh(faceGeo, faceMat);
  back.rotation.y = Math.PI;
  back.position.set(0, 0, -0.076);
  head.add(front, back);
  body.add(head);

  const tag = makePawnTag(name, color);
  root.add(tag.sprite);
  disposables.push(faceGeo, faceMat, tag.tex, tag.spriteMat);
  return { root, body, head };
}

/** Builds a colossal luminous ivory cowrie shell (kaudi) with a golden mouth-up slit! */
function buildCowrieShell() {
  const g = new THREE.Group();
  const shell = ball(0.34, mat('#fff9eb', { roughness: 0.22, metalness: 0.1 }));
  shell.scale.set(0.85, 0.56, 1.38);
  g.add(shell);
  const slitMat = mat('#ffd43b', { emissive: '#f59f00', emissiveIntensity: 1.6 });
  g.add(at(box(0.08, 0.06, 0.62, slitMat), 0, 0.17, 0));
  return { root: g, slitMat };
}

/** Builds an indoor potted Areca palm planter for the modern Bengaluru boardroom corners. */
function buildIndoorPalm(x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const potMat = mat('#b4654a', { roughness: 0.72 });
  const brassMat = mat('#d4a13e', { roughness: 0.25, metalness: 0.8 });
  const leafMat = mat('#2b6e3f', { roughness: 0.55 });
  const stemMat = mat('#3d5a35', { roughness: 0.7 });
  g.add(at(cyl(0.82, 0.64, 1.55, potMat, 14), 0, 0.78, 0));
  g.add(at(torus(0.83, 0.055, brassMat), 0, 1.52, 0, Math.PI / 2, 0, 0));
  g.add(at(cyl(0.75, 0.75, 0.08, mat('#2c221c'), 14), 0, 1.54, 0));
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const h = 2.6 + (i % 3) * 0.65;
    const frond = new THREE.Group();
    frond.position.set(0, 1.5, 0);
    frond.rotation.set(0.38 + (i % 2) * 0.14, a, 0);
    frond.add(at(cyl(0.035, 0.055, h, stemMat, 6), 0, h / 2, 0));
    frond.add(at(box(0.55, 0.04, h * 0.72, leafMat), 0, h * 0.78, h * 0.22, 0.42, 0, 0));
    g.add(frond);
  }
  return g;
}

/** Builds a sleek modern mesh-and-chrome ergonomic conference chair tucked neatly at the table edge. */
function buildConferenceChair(x, floorY, z, rotY) {
  const g = new THREE.Group();
  g.position.set(x, floorY, z);
  g.rotation.y = rotY;
  const meshMat = mat('#2b3240', { roughness: 0.6 });
  const chrome = mat('#ced4da', { roughness: 0.2, metalness: 0.88 });
  g.add(at(cyl(0.75, 0.82, 0.12, chrome, 5), 0, 0.1, 0));
  g.add(at(cyl(0.09, 0.09, 1.8, chrome, 8), 0, 1.0, 0));
  g.add(at(box(1.55, 0.2, 1.45, meshMat), 0, 1.95, 0));
  g.add(at(box(1.48, 2.25, 0.16, meshMat), 0, 3.12, -0.66, -0.08, 0, 0));
  g.add(at(box(0.14, 0.58, 1.05, meshMat), -0.76, 2.34, -0.05));
  g.add(at(box(0.14, 0.58, 1.05, meshMat), 0.76, 2.34, -0.05));
  return g;
}

/** Builds the modern Bengaluru Indian tech conference room, varnished teak table, embroidered Chaupar cloth & props! */
function buildChauparArena(scene, armTiles, disposables) {
  scene.background = new THREE.Color('#273345');
  scene.fog = new THREE.Fog('#273345', 75, 185);

  // Warm daylight-balanced Bengaluru golden-hour + contemporary LED lighting
  scene.add(new THREE.HemisphereLight('#fff6e5', '#3b4252', 1.35));
  const sunKey = new THREE.DirectionalLight('#ffefd5', 1.55);
  sunKey.position.set(-22, 18, 12); // Golden Bengaluru afternoon sunlight streaming from skyline window wall
  scene.add(sunKey);
  const warmOverhead = new THREE.PointLight('#fff0d4', 44, 54, 1.35);
  warmOverhead.position.set(0, 14, 0);
  scene.add(warmOverhead);

  const TABLE_W = 24.5;
  const TABLE_D = 24.5;
  const FLOOR_Y = -4.2;
  const CEIL_Y = 18.2;
  const HALF_W = 28;
  const HALF_D = 22;
  const WALL_H = CEIL_Y - FLOOR_Y;
  const WALL_MID_Y = (CEIL_Y + FLOOR_Y) / 2;

  // Varnished Teakwood Conference Table (surface at y = 0)
  const teakTex = makeTeakWoodTexture();
  const teakMat = new THREE.MeshStandardMaterial({ map: teakTex, roughness: 0.34, metalness: 0.12 });
  disposables.push(teakTex, teakMat);
  scene.add(at(box(TABLE_W, 0.72, TABLE_D, teakMat), 0, -0.36, 0));
  // Dark mahogany bevel rim & sleek brushed-steel/teak conference table pedestals
  const rimMat = mat('#2a160c', { roughness: 0.45 });
  const mullionMat = mat('#1f242d', { roughness: 0.35, metalness: 0.75 });
  const brassMat = mat('#d4a13e', { roughness: 0.28, metalness: 0.78 });
  const slatWoodMat = mat('#7c4d2b', { roughness: 0.52 });
  const wallStoneMat = mat('#e5dfd5', { roughness: 0.86 });

  scene.add(at(box(TABLE_W + 0.5, 0.8, 0.45, rimMat), 0, -0.38, TABLE_D / 2 + 0.12));
  scene.add(at(box(TABLE_W + 0.5, 0.8, 0.45, rimMat), 0, -0.38, -TABLE_D / 2 - 0.12));
  scene.add(at(box(0.45, 0.8, TABLE_D + 0.5, rimMat), TABLE_W / 2 + 0.12, -0.38, 0));
  scene.add(at(box(0.45, 0.8, TABLE_D + 0.5, rimMat), -TABLE_W / 2 - 0.12, -0.38, 0));
  for (const [lx, lz] of [[-7.5, -7.5], [7.5, -7.5], [-7.5, 7.5], [7.5, 7.5]]) {
    scene.add(at(box(1.1, Math.abs(FLOOR_Y) - 0.5, 1.1, rimMat), lx, FLOOR_Y / 2 - 0.2, lz));
  }

  // Modern ergonomic conference chairs neatly tucked around the teak table perimeter
  for (const cx of [-6.5, 0, 6.5]) {
    scene.add(buildConferenceChair(cx, FLOOR_Y, -TABLE_D / 2 - 1.35, 0));
    scene.add(buildConferenceChair(cx, FLOOR_Y, TABLE_D / 2 + 1.35, Math.PI));
  }
  for (const cz of [-5.5, 5.5]) {
    scene.add(buildConferenceChair(-TABLE_W / 2 - 1.35, FLOOR_Y, cz, Math.PI / 2));
    scene.add(buildConferenceChair(TABLE_W / 2 + 1.35, FLOOR_Y, cz, -Math.PI / 2));
  }

  // Modern Bengaluru Tech-Office Geometric Carpet Floor + Baseboards
  const floorTex = makeBengaluruFloorTexture();
  const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.9 });
  disposables.push(floorTex, floorMat);
  scene.add(at(plane(HALF_W * 2 + 4, HALF_D * 2 + 4, floorMat), 0, FLOOR_Y, 0, -Math.PI / 2, 0, 0));

  // ---- WALL 1 (Back Wall, z = -HALF_D): Teak Acoustic Slat Wall + Ultra-Thin 4K Display ----
  scene.add(at(plane(HALF_W * 2, WALL_H, wallStoneMat), 0, WALL_MID_Y, -HALF_D));
  scene.add(at(box(HALF_W * 2, 0.5, 0.25, mullionMat), 0, FLOOR_Y + 0.25, -HALF_D + 0.12));
  // Vertical teakwood acoustic slats flanking the 4K conference screen
  for (const sx of [-24.5, -22.8, -21.1, -19.4, -17.7, -16.0, -14.3, 14.3, 16.0, 17.7, 19.4, 21.1, 22.8, 24.5]) {
    scene.add(at(box(0.55, WALL_H - 1.2, 0.32, slatWoodMat), sx, WALL_MID_Y, -HALF_D + 0.18));
  }
  const projTex = makeProjectorScreenTexture();
  projTex.anisotropy = 4;
  const projMat = new THREE.MeshBasicMaterial({ map: projTex });
  disposables.push(projTex, projMat);
  scene.add(at(box(24.6, 12.6, 0.32, mullionMat), 0, 8.8, -HALF_D + 0.22));
  scene.add(at(plane(23.8, 11.8, projMat), 0, 8.8, -HALF_D + 0.42));
  // Sleek brass soundbar below 4K screen
  scene.add(at(box(12.0, 0.48, 0.45, mullionMat), 0, 1.9, -HALF_D + 0.36));

  // ---- WALL 2 (Left Wall, x = -HALF_W): Floor-to-Ceiling Panoramic Bengaluru Skyline Curtain Wall ----
  scene.add(at(plane(HALF_D * 2, WALL_H, wallStoneMat), -HALF_W, WALL_MID_Y, 0, 0, Math.PI / 2, 0));
  const skyTex = makeBengaluruSkylineTexture();
  skyTex.anisotropy = 4;
  const skyMat = new THREE.MeshBasicMaterial({ map: skyTex });
  disposables.push(skyTex, skyMat);
  scene.add(at(plane(40.0, 18.6, skyMat), -HALF_W + 0.14, WALL_MID_Y + 0.4, 0, 0, Math.PI / 2, 0));
  // Matte-black architectural curtain-wall mullions
  for (const wz of [-20, -10, 0, 10, 20]) {
    scene.add(at(box(0.38, 19.2, 0.34, mullionMat), -HALF_W + 0.22, WALL_MID_Y + 0.4, wz));
  }
  for (const wy of [FLOOR_Y + 2.2, 4.5, CEIL_Y - 1.4]) {
    scene.add(at(box(0.38, 0.34, 40.4, mullionMat), -HALF_W + 0.22, wy, 0));
  }

  // ---- WALL 3 (Right Wall, x = +HALF_W): Contemporary Bengaluru Jali Feature Art + Teak Slats ----
  scene.add(at(plane(HALF_D * 2, WALL_H, wallStoneMat), HALF_W, WALL_MID_Y, 0, 0, -Math.PI / 2, 0));
  scene.add(at(box(0.25, 0.5, HALF_D * 2, mullionMat), HALF_W - 0.12, FLOOR_Y + 0.25, 0));
  for (const sz of [-19.5, -17.8, -16.1, -14.4, -12.7, 12.7, 14.4, 16.1, 17.8, 19.5]) {
    scene.add(at(box(0.32, WALL_H - 1.2, 0.55, slatWoodMat), HALF_W - 0.18, WALL_MID_Y, sz));
  }
  const jaliTex = makeBengaluruJaliArtTexture();
  jaliTex.anisotropy = 4;
  const jaliMat = new THREE.MeshStandardMaterial({ map: jaliTex, roughness: 0.35, metalness: 0.25 });
  disposables.push(jaliTex, jaliMat);
  scene.add(at(box(0.32, 11.4, 22.4, brassMat), HALF_W - 0.2, 8.2, 0));
  scene.add(at(plane(21.6, 10.6, jaliMat), HALF_W - 0.38, 8.2, 0, 0, -Math.PI / 2, 0));

  // ---- WALL 4 (Front Wall, z = +HALF_D): Frameless Glass Corridor Partition + Room-Booking Tablet ----
  const glassMat = mat('#b8d4e8', { roughness: 0.12, metalness: 0.15, transparent: true, opacity: 0.24 });
  const frostMat = mat('#e2e8f0', { roughness: 0.35, transparent: true, opacity: 0.42 });
  scene.add(at(plane(HALF_W * 2, WALL_H, glassMat), 0, WALL_MID_Y, HALF_D, 0, Math.PI, 0));
  // Horizontal frosted privacy stripe across glass partition (classic Bengaluru glass conference room!)
  scene.add(at(plane(HALF_W * 2, 3.4, frostMat), 0, 3.6, HALF_D - 0.06, 0, Math.PI, 0));
  for (const gx of [-22, -11, -4.4, 4.4, 11, 22]) {
    scene.add(at(box(0.32, WALL_H, 0.34, mullionMat), gx, WALL_MID_Y, HALF_D - 0.1));
  }
  // Brushed-steel double-door pull handles on center glass doors
  const steelMat = mat('#dee2e6', { roughness: 0.22, metalness: 0.88 });
  for (const side of [-1, 1]) {
    scene.add(at(cyl(0.08, 0.08, 2.6, steelMat, 10), side * 0.55, 2.2, HALF_D - 0.32));
  }
  // Glowing green digital room-booking tablet ("BLR-04 IN MEETING") mounted on the door mullion
  scene.add(at(box(1.15, 0.82, 0.16, mullionMat), 5.3, 3.2, HALF_D - 0.24));
  scene.add(at(box(0.96, 0.64, 0.06, mat('#22c55e', { emissive: '#16a34a', emissiveIntensity: 1.5 })), 5.3, 3.2, HALF_D - 0.33));

  // Lush Indoor Potted Areca Palms in the Bengaluru Boardroom Corners
  scene.add(buildIndoorPalm(-23.5, FLOOR_Y, -17.8));
  scene.add(buildIndoorPalm(23.5, FLOOR_Y, -17.8));
  scene.add(buildIndoorPalm(23.5, FLOOR_Y, 17.5));

  // Architectural Ceiling with Timber Acoustic Baffles & Glowing Linear LED Bars
  scene.add(at(plane(HALF_W * 2, HALF_D * 2, mat('#2b313d', { roughness: 0.85 })), 0, CEIL_Y, 0, Math.PI / 2, 0, 0));
  const ledBarMat = mat('#fff8e6', { emissive: '#ffe8b6', emissiveIntensity: 1.8 });
  for (const lz of [-10.5, 10.5]) {
    scene.add(at(box(28, 0.24, 0.55, ledBarMat), 0, CEIL_Y - 0.2, lz));
  }
  for (const bx of [-16, -8, 8, 16]) {
    scene.add(at(box(0.45, 0.75, HALF_D * 1.85, slatWoodMat), bx, CEIL_Y - 0.4, 0));
  }

  // Embroidered Crimson-and-Emerald Chaupar Cross Cloth!
  const charkoniTex = makeCharkoniTexture();
  const charkoniMat = new THREE.MeshStandardMaterial({ map: charkoniTex, roughness: 0.45 });
  disposables.push(charkoniTex, charkoniMat);
  scene.add(at(plane(CHARKONI_HALF * 2, CHARKONI_HALF * 2, charkoniMat), 0, 0.04, 0, -Math.PI / 2, 0, 0));

  const goldBorderMat = mat('#f59f00', { roughness: 0.32, metalness: 0.72 });
  const chiraMats = [];
  const armColors = ['#9b1c31', '#14532d', '#9b1c31', '#14532d'];
  const armLen = armTiles * TILE_SIZE;
  const armW = TILE_SIZE * 3;
  for (let arm = 0; arm < 4; arm++) {
    const armGroup = new THREE.Group();
    armGroup.rotation.y = arm * (Math.PI / 2);
    const clothMat = mat(armColors[arm], { roughness: 0.72 });
    const midZ = CHARKONI_HALF + armLen / 2;
    // Gold embroidery border backing + velvet arm cloth
    armGroup.add(at(box(armW + 0.24, 0.03, armLen + 0.24, goldBorderMat), 0, 0.015, midZ));
    armGroup.add(at(box(armW, 0.04, armLen, clothMat), 0, 0.024, midZ));
    // Glowing gold grid stitch lines
    for (let r = 0; r <= armTiles; r++) {
      armGroup.add(at(box(armW, 0.015, 0.04, goldBorderMat), 0, 0.048, CHARKONI_HALF + r * TILE_SIZE));
    }
    for (const gx of [-TILE_SIZE * 0.5, TILE_SIZE * 0.5]) {
      armGroup.add(at(box(0.04, 0.015, armLen, goldBorderMat), gx, 0.048, midZ));
    }
    // Starred safe "chira" tile (glows gold normally, turns crimson on SHAKUNI LOADED ROLL!)
    const chiraMat = new THREE.MeshStandardMaterial({
      color: '#ffd43b',
      emissive: '#f59f00',
      emissiveIntensity: 0.55,
      roughness: 0.3,
    });
    disposables.push(chiraMat);
    chiraMats.push(chiraMat);
    armGroup.add(at(box(TILE_SIZE * 0.72, 0.025, TILE_SIZE * 0.72, chiraMat), TILE_SIZE, 0.052, CHARKONI_HALF + (Math.min(3, armTiles - 1) + 0.5) * TILE_SIZE, 0, Math.PI / 4, 0));
    scene.add(armGroup);
  }

  // Boardroom Prop 1: Polycom Spider Conference Speakerphone (NW teak corner) + sonic pulse ring
  const phone = new THREE.Group();
  phone.position.set(-8.6, 0, -8.4);
  const phoneMat = mat('#334155', { roughness: 0.45, metalness: 0.35 });
  phone.add(at(cyl(0.65, 0.95, 0.35, phoneMat, 6), 0, 0.18, 0));
  for (let k = 0; k < 3; k++) {
    const a = (k * Math.PI * 2) / 3;
    phone.add(at(box(0.45, 0.24, 1.5, phoneMat), Math.sin(a) * 0.95, 0.12, Math.cos(a) * 0.95, 0, a, 0));
  }
  const phoneLedMat = new THREE.MeshStandardMaterial({ color: '#51cf66', emissive: '#51cf66', emissiveIntensity: 1.8 });
  disposables.push(phoneLedMat);
  phone.add(at(ball(0.14, phoneLedMat), 0, 0.38, 0));
  const sonicRing = at(torus(1.4, 0.09, mat('#38bdf8', { emissive: '#38bdf8', emissiveIntensity: 2.0 })), 0, 0.25, 0, Math.PI / 2, 0, 0);
  sonicRing.visible = false;
  phone.add(sonicRing);
  scene.add(phone);

  // Boardroom Prop 2: Stainless-Steel Cutting Chai & Samosa Tray (NE teak corner)
  const tray = new THREE.Group();
  tray.position.set(8.6, 0, -8.2);
  tray.add(at(cyl(1.65, 1.55, 0.1, steelMat, 20), 0, 0.05, 0));
  const chaiGlassMat = mat('#ffd8a8', { emissive: '#f59f00', emissiveIntensity: 0.35, roughness: 0.15 });
  for (const [cx, cz] of [[-0.55, -0.45], [0.55, -0.45], [-0.55, 0.45]]) {
    tray.add(at(cyl(0.2, 0.15, 0.56, chaiGlassMat, 12), cx, 0.36, cz));
  }
  // Golden triangular samosas on napkin
  tray.add(at(box(0.9, 0.04, 0.9, mat('#f8fafc')), 0.5, 0.12, 0.45));
  tray.add(at(cyl(0.05, 0.34, 0.32, mat('#d97706', { roughness: 0.6 }), 3), 0.5, 0.28, 0.45));
  scene.add(tray);

  // Boardroom Prop 3: Sticky notes & brass paperweight (SW corner)
  const stickyMat = mat('#ffe066', { roughness: 0.7 });
  scene.add(at(box(1.1, 0.08, 1.1, stickyMat), -8.8, 0.04, 8.2, 0, 0.22, 0));
  scene.add(at(box(1.1, 0.08, 1.1, mat('#ff8787')), -7.5, 0.04, 9.1, 0, -0.35, 0));
  scene.add(at(cyl(0.42, 0.48, 0.38, goldBorderMat, 16), -9.6, 0.19, 6.8));

  // Boardroom Prop 4: Rolling Metal Office Wastebasket beside SE table edge (where cut pawns land!)
  const binGroup = new THREE.Group();
  binGroup.position.set(BIN_POS.x, FLOOR_Y, BIN_POS.z);
  const binMat = mat('#495057', { roughness: 0.4, metalness: 0.78 });
  binGroup.add(at(cyl(1.85, 1.45, 3.2, binMat, 16), 0, 1.6, 0));
  binGroup.add(at(torus(1.85, 0.08, mat('#ff6b6b', { emissive: '#e03131', emissiveIntensity: 1.4 })), 0, 3.2, 0, Math.PI / 2, 0, 0));
  scene.add(binGroup);

  // Overhead Spinning Ceiling Fan
  const fan = new THREE.Group();
  fan.position.set(0, 16.5, 0);
  fan.add(at(cyl(0.18, 0.18, 2.2, steelMat, 10), 0, 1.1, 0));
  fan.add(at(cyl(0.75, 0.75, 0.42, mat('#3b2314'), 16), 0, 0, 0));
  for (let b = 0; b < 4; b++) {
    const a = (b * Math.PI) / 2;
    fan.add(at(box(0.85, 0.08, 4.6, mat('#5c361e')), Math.sin(a) * 2.6, 0, Math.cos(a) * 2.6, 0, a, 0));
  }
  scene.add(fan);

  return { chiraMats, phone, phoneLedMat, sonicRing, fan };
}

// ------------------------------------------------------------------ Lobby 3D Stage

export class ChauparStage {
  constructor(aspect = 16 / 9, initialNames = [], { duration = DEFAULT_CHAUPAR_DURATION } = {}) {
    this.t = 0;
    this.names = [];
    this.models = [];
    this.disposables = [];
    const previewSim = new ChauparSim({ names: initialNames.length >= 2 ? initialNames : ['Ada', 'Grace'], duration });

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(46, aspect, 0.3, 180);
    this.arena = buildChauparArena(this.scene, previewSim.armTiles, this.disposables);
    this.armTiles = previewSim.armTiles;

    // Decorative preview cowrie shells resting on the teak rim
    this.cowries = previewSim.cowries.map((c) => {
      const vis = buildCowrieShell();
      vis.root.position.set(c.baseX, 0.18, c.baseZ);
      vis.root.rotation.y = c.rotY;
      this.scene.add(vis.root);
      return vis;
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
    const preview = names.length >= 2
      ? new ChauparSim({ names, duration: DEFAULT_CHAUPAR_DURATION })
      : null;

    names.forEach((name, i) => {
      const kind = DEVELOPER_KINDS[i % DEVELOPER_KINDS.length];
      const pawn = buildChauparPawn(name, kind, colors[i % colors.length], this.disposables);
      const p = preview?.pawns[i];
      pawn.root.position.set(p ? p.x : 0, 0, p ? p.z : 3.2);
      this.scene.add(pawn.root);
      this.models.push({ ...pawn, phase: i * 0.7 });
    });
  }

  update(dt, reduced = false) {
    if (!reduced) {
      this.t += dt;
      this.arena.fan.rotation.y += dt * 1.8;
    }
    const t = this.t;
    for (const m of this.models) {
      if (!reduced) {
        m.root.position.y = Math.max(0, Math.sin(t * 3.5 + m.phase)) * 0.22;
        m.head.rotation.z = Math.sin(t * 4.0 + m.phase) * 0.12;
      }
    }
    const ang = reduced ? 0.45 : t * 0.16;
    this.camera.position.set(Math.sin(ang) * 20.5, 11.2, Math.cos(ang) * 19.5);
    this.camera.lookAt(0, 1.4, 0);
  }

  dispose() {
    for (const d of this.disposables) d.dispose?.();
  }
}

// ------------------------------------------------------------------ Live Match

export class ChauparMatch {
  constructor(names, { duration = DEFAULT_CHAUPAR_DURATION, rule = DEFAULT_CHAUPAR_RULE, rng = Math.random, sfx = null, onEvent = null, onWinner = null } = {}) {
    this.sim = new ChauparSim({ names, duration, rule, rng });
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
    this.arena = buildChauparArena(this.scene, this.sim.armTiles, this.disposables);
    this.particles = new Particles(this.scene);

    this.cowrieVisuals = this.sim.cowries.map((c) => {
      const vis = buildCowrieShell();
      vis.root.position.set(c.x, c.y, c.z);
      this.scene.add(vis.root);
      return { sim: c, ...vis };
    });

    this.pawnVisuals = this.sim.pawns.map((p, i) => {
      const kind = DEVELOPER_KINDS[i % DEVELOPER_KINDS.length];
      const vis = buildChauparPawn(p.name, kind, p.color, this.disposables);
      vis.root.position.set(p.x, p.y, p.z);
      this.scene.add(vis.root);
      return { sim: p, ...vis };
    });

    this.camPos = new THREE.Vector3(0, 16.5, 18.5);
    this.camLook = new THREE.Vector3(0, 0.6, 0);
    this.resize(window.innerWidth / window.innerHeight);
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 1 ? 60 : 46;
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
    this.arena.fan.rotation.y += realDt * 2.2;

    // SHAKUNI crimson trapdoor glow on safe chira tiles
    const shakuniActive = this.sim.shakuniT > 0;
    for (const m of this.arena.chiraMats) {
      m.color.set(shakuniActive ? '#ff6b6b' : '#ffd43b');
      m.emissive.set(shakuniActive ? '#e03131' : '#f59f00');
      m.emissiveIntensity = shakuniActive ? 1.8 + Math.sin(t * 20) * 0.5 : 0.55;
    }

    // Speakerphone "AM I AUDIBLE?!" pulse ring & red mute LED flash
    if (this.sim.speakerPulseT > 0) {
      this.arena.sonicRing.visible = true;
      const p = 1 - (this.sim.speakerPulseT / 2.2);
      const s = 1 + (p * 4) % 4;
      this.arena.sonicRing.scale.set(s, s, 1);
      this.arena.phoneLedMat.color.set('#ff6b6b');
      this.arena.phoneLedMat.emissive.set('#e03131');
    } else {
      this.arena.sonicRing.visible = false;
      this.arena.phoneLedMat.color.set('#51cf66');
      this.arena.phoneLedMat.emissive.set('#51cf66');
    }

    // Sync bouncing giant cowrie shells
    for (const cv of this.cowrieVisuals) {
      const c = cv.sim;
      cv.root.position.set(c.x, c.y, c.z);
      cv.root.rotation.y = c.rotY;
      cv.root.rotation.x = c.mouthUp ? 0 : Math.PI;
    }

    // Sync turned-wood developer pawns
    for (const pv of this.pawnVisuals) {
      const p = pv.sim;
      const winHop = this.sim.winner === p && !p.cut ? Math.abs(Math.sin(this.victoryTime * 6.5)) * 0.7 : 0;
      pv.root.position.set(p.x, p.y + winHop, p.z);
      if (p.cut && p.flickT < 1) {
        pv.body.rotation.x += realDt * 9;
        pv.body.rotation.z += realDt * 7;
      } else if (!p.cut) {
        pv.body.rotation.x = p.hopT < 1 ? Math.sin(p.hopT * Math.PI) * 0.28 : 0;
        pv.body.rotation.z = 0;
        pv.head.rotation.z = Math.sin(t * 8 + p.phase) * 0.14;
      }
    }

    this.particles.update(realDt);

    // Dynamic Camera: Isometric Boardroom -> Low Charkoni Slow-Mo -> 360° Victory Orbit
    if (this.shake > 0) this.shake = Math.max(0, this.shake - realDt * 4.5);
    const kickY = Math.sin(t * 50) * this.shake * 0.55;
    const wantPos = new THREE.Vector3();
    const wantLook = new THREE.Vector3(0, 0.8, 0);

    if (this.sim.winner) {
      const orbitAng = this.victoryTime * 0.24;
      wantPos.set(Math.sin(orbitAng) * 16.5, 7.2, Math.cos(orbitAng) * 15.5);
      wantLook.set(this.sim.winner.x * 0.35, 2.2, this.sim.winner.z * 0.35);
    } else if (inFinalSlowMo) {
      wantPos.set(6.8, 3.6, 8.2);
      wantLook.set(0, 1.0, 0);
    } else {
      wantPos.set(Math.sin(t * 0.12) * 3.5, 16.2 + kickY, 17.8);
    }

    this.camPos.lerp(wantPos, Math.min(1, realDt * 4.5));
    this.camLook.lerp(wantLook, Math.min(1, realDt * 5.0));
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
  }

  handleEvent(e) {
    if (e.type === 'cowrie') {
      this.sfx?.play?.('chauparCowrie');
      this.shake = 0.45;
      this.onEvent?.({
        type: 'status',
        text: `🐚 IN PLAY: ${e.remaining} / ${this.sim.pawns.length} · LAST ROLL: ${e.label}`,
        tone: e.roll === 25 ? 'yellow' : 'default',
      });
    } else if (e.type === 'shakuni') {
      this.sfx?.play?.('chauparBeep');
      this.shake = 0.7;
      this.onEvent?.({ type: 'status', text: '🎲 SHAKUNI LOADED ROLL! SAFE SQUARES BETRAYED!', tone: 'red' });
      this.onEvent?.({ type: 'note', text: `🎲 SHAKUNI: “${e.popup}”`, important: true });
    } else if (e.type === 'speaker') {
      this.sfx?.play?.('chauparBeep');
      this.shake = 0.8;
      this.onEvent?.({ type: 'status', text: '📞 "HELLO? AM I AUDIBLE?!" SPEAKERPHONE QUAKE!', tone: 'yellow' });
      this.onEvent?.({ type: 'note', text: `📞 SPEAKERPHONE: “${e.popup}”`, important: true });
    } else if (e.type === 'pachees') {
      this.sfx?.play?.('chauparCowrie');
      this.shake = 0.85;
      this.onEvent?.({ type: 'status', text: '🔥 PACHEES! (25) CHARKONI PHOTO FINISH!', tone: 'yellow' });
    } else if (e.type === 'cut') {
      this.sfx?.play?.('chauparCut');
      this.shake = 0.6;
      this.particles.burst(new THREE.Vector3(e.pawn.flickStartX, 1.0, e.pawn.flickStartZ), {
        count: 14,
        colors: ['#ffd43b', '#ff6b6b', '#ffffff'],
        speed: 5.2,
        up: 4.5,
        life: 0.6,
        size: 0.16,
        gravity: 12,
      });
      this.onEvent?.({
        type: 'status',
        text: `🐚 KAAT DIYA! IN PLAY: ${e.remaining} / ${this.sim.pawns.length}`,
        tone: e.remaining <= 3 ? 'red' : 'yellow',
      });
      this.onEvent?.({ type: 'note', text: `🗑️ ${e.pawn.name} CUT: “${e.popup}”`, important: false });
    } else if (e.type === 'winner' && !this.winnerAnnounced) {
      this.winnerAnnounced = true;
      this.sfx?.play?.('chauparWin');
      this.sfx?.fanfare?.();
      this.particles.burst(new THREE.Vector3(0, 2.2, 0), {
        count: 72,
        colors: ['#ffd43b', '#ff922b', '#ff6b6b', '#51cf66', '#ffffff'],
        speed: 7.5,
        up: 9.2,
        life: 1.9,
        size: 0.25,
        gravity: 12,
      });
      this.onWinner?.(e.pawn, this.sim);
    }
  }

  dispose() {
    for (const d of this.disposables) d.dispose?.();
  }
}
