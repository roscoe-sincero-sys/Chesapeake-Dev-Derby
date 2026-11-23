// "Mahjong Tile Wash" (Xǐpái Whirlpool Rumble): twilight Chinese tea-house parlor with deep
// emerald-jade baize felt, glossy lacquered mahogany bumper rails & inlaid brass corners,
// swaying crimson silk paper lanterns, 144 swirling ivory-and-jade Mahjong tiles rendered in
// a single InstancedMesh, recessed brass Auto-Shuffle center chute with rotating glowing gears,
// Red Dragon PONG! clamp, 4-tile KONG! sweeper bar, ricocheting ivory dice, bobblehead devs
// with developer portraits, 0.4x slow-motion finale, and 360-degree victory orbit!

import * as THREE from 'three';
import { mat, box, ball, cyl, torus, plane, at, canvasTexture, FONT_UI, FONT_MONO, roundRect } from './util3d.js';
import { Particles } from './effects.js';
import { DEVELOPER_KINDS } from './deathmatch-sim.js';
import {
  MahjongSim,
  TABLE_HALF,
  PIT_RADIUS,
  TILE_COUNT,
  DEFAULT_MAHJONG_DURATION,
  DEFAULT_MAHJONG_RULE,
} from './mahjong-sim.js';

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

/** Deep emerald-jade Mahjong parlor baize felt texture with fine nap & inlaid gold corner lines. */
function makeBaizeFeltTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 30, w / 2, h / 2, w * 0.72);
    g.addColorStop(0, '#0c6b47');
    g.addColorStop(0.7, '#095438');
    g.addColorStop(1, '#063d28');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // Fine woven felt stipple
    for (let i = 0; i < 4000; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.05)';
      ctx.fillRect((i * 73) % w, (i * 137) % h, 2, 2);
    }
    // Inlaid gold outer border & subtle circular wash guide ring
    ctx.strokeStyle = 'rgba(230, 184, 76, 0.38)';
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, w - 40, h - 40);
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w * 0.34, 0, Math.PI * 2);
    ctx.stroke();
  });
}

/** Engraved ivory Mahjong Red Dragon (中) tile face texture. */
function makeMahjongFaceTexture() {
  return canvasTexture(128, 160, (ctx, w, h) => {
    ctx.fillStyle = '#fbf7ec';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#d9cdb4';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = '#c92a2a';
    ctx.font = `900 84px ${FONT_UI}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('中', w / 2, h / 2 + 4);
  });
}

/** Embossed brushed-brass center Auto-Shuffle compass rose plate texture. */
function makeBrassPlateTexture() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.5);
    g.addColorStop(0, '#e6b84c');
    g.addColorStop(0.75, '#b88628');
    g.addColorStop(1, '#7a5414');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#3d2808';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(w / 2, h / 2, 106, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#2b1b04';
    ctx.font = `900 34px ${FONT_UI}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('東', w / 2, 42);
    ctx.fillText('西', w / 2, h - 42);
    ctx.fillText('南', w - 42, h / 2);
    ctx.fillText('北', 42, h / 2);
    ctx.font = `900 28px ${FONT_MONO}`;
    ctx.fillText('洗牌', w / 2, h / 2);
  });
}

/** Crimson-and-gold tea-house parlor Audit Log Rules board (Back Wall, Jenga Connect steps in Mandarin Pinyin!). */
function makeParlorPlaqueTexture() {
  return canvasTexture(1024, 512, (ctx, w, h) => {
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#5c1118');
    bg.addColorStop(1, '#3b0a10');
    ctx.fillStyle = bg;
    roundRect(ctx, 8, 8, w - 16, h - 16, 18);
    ctx.fill();
    ctx.strokeStyle = '#e6b84c';
    ctx.lineWidth = 10;
    ctx.stroke();
    ctx.lineWidth = 3;
    roundRect(ctx, 22, 22, w - 44, h - 44, 10);
    ctx.stroke();

    ctx.fillStyle = '#ffd43b';
    ctx.font = `900 42px ${FONT_UI}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('審計日誌 · AUDIT LOG PARLOR RULES', w / 2, 64);

    // Subtle gold divider rule under title
    ctx.strokeStyle = 'rgba(230, 184, 76, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(54, 96);
    ctx.lineTo(w - 54, 96);
    ctx.stroke();

    const lines = [
      ['1.', 'Gàosu SOC shěnjì rìzhì "hái méi shíxiàn" (zàndìng 2039 nián Q4).'],
      ['2.', 'Bǎ /var/log/mahjong-audit.log yí dào /tmp/.definitely-not-logs'],
      ['3.', 'Shuō userLogin xiān xūyào "800-liè jiù jiàgòu chónggòu".'],
      ['4.', 'Bǎ eventLog.db gǎimíng -> dev_survivor_votes_backup.old'],
      ['5.', 'Guài SOC méi shuō qīngchu, zhídào SOC fàngqì.'],
      ['6.', 'Gēn SOC gòngxiǎng píngmù QIÁN guāndiào Splunk & Kibana!!'],
    ];
    let y = 136;
    ctx.textAlign = 'left';
    for (let i = 0; i < lines.length; i++) {
      ctx.fillStyle = '#ffd43b';
      ctx.font = `900 23px ${FONT_MONO}`;
      ctx.fillText(lines[i][0], 50, y);
      ctx.fillStyle = i === 5 ? '#ffd43b' : '#ffe8cc';
      ctx.font = `700 22px ${FONT_UI}`;
      ctx.fillText(lines[i][1], 92, y);
      y += 47;
    }

    ctx.fillStyle = 'rgba(255, 212, 59, 0.14)';
    roundRect(ctx, 44, h - 84, w - 88, 48, 10);
    ctx.fill();
    ctx.strokeStyle = '#e6b84c';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffd43b';
    ctx.font = `900 21px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText('TÍXǏNG: Shěnjì rìzhì 24/7 yùnxíng zhōng — YÀO ZHUĀNG CHĪJĪNG!', w / 2, h - 60);
  });
}

/** Traditional Chinese red-lacquer lattice window overlooking a lantern-lit evening garden. */
function makeParlorWindowTexture(showMoon = false) {
  return canvasTexture(512, 512, (ctx, w, h) => {
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#1e2c4a');
    sky.addColorStop(0.55, '#3b4d70');
    sky.addColorStop(1, '#1a2433');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    // Subtle twinkling stars
    ctx.fillStyle = 'rgba(255, 250, 230, 0.7)';
    for (let i = 0; i < 18; i++) {
      ctx.beginPath();
      ctx.arc((i * 89 + 43) % (w - 40) + 20, (i * 53 + 29) % 210 + 18, (i % 2) + 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    // Warm golden full moon (only on one window!)
    if (showMoon) {
      ctx.fillStyle = '#fff3bf';
      ctx.beginPath(); ctx.arc(w * 0.72, h * 0.24, 38, 0, Math.PI * 2); ctx.fill();
    }
    for (const [lx, ly] of [[110, 310], [260, 290], [405, 320]]) {
      const g = ctx.createRadialGradient(lx, ly, 4, lx, ly, 48);
      g.addColorStop(0, 'rgba(255, 190, 90, 0.85)');
      g.addColorStop(1, 'rgba(255, 120, 60, 0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(lx, ly, 48, 0, Math.PI * 2); ctx.fill();
    }
    // Traditional Chinese geometric lattice muntins
    ctx.strokeStyle = '#5c1818';
    ctx.lineWidth = 14;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo((i / 4) * w, 0); ctx.lineTo((i / 4) * w, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, (i / 4) * h); ctx.lineTo(w, (i / 4) * h); ctx.stroke();
    }
    ctx.lineWidth = 22;
    ctx.strokeRect(11, 11, w - 22, h - 22);
  });
}

/** Builds a carved rosewood Chinese parlor chair tucked around the automatic Mahjong table. */
function buildParlorChair(x, z, rotY) {
  const g = new THREE.Group();
  g.position.set(x, -5.0, z);
  g.rotation.y = rotY;
  const rosewood = mat('#421a12', { roughness: 0.38, metalness: 0.1 });
  const cushion = mat('#b91c1c', { roughness: 0.7 });
  for (const [lx, lz] of [[-1.0, -0.9], [1.0, -0.9], [-1.0, 0.9], [1.0, 0.9]]) {
    g.add(at(cyl(0.11, 0.09, 2.2, rosewood, 8), lx, 1.1, lz));
  }
  g.add(at(box(2.3, 0.24, 2.1, rosewood), 0, 2.2, 0));
  g.add(at(box(2.05, 0.22, 1.85, cushion), 0, 2.42, 0.04));
  // Tall carved splat backrest with curved top rail
  g.add(at(box(2.2, 2.8, 0.18, rosewood), 0, 3.7, -0.96));
  g.add(at(box(2.5, 0.28, 0.28, rosewood), 0, 5.15, -0.96));
  return g;
}

/** Upright high-contrast player nameplate sprite. */
function makeMahjongTag(name, color) {
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

/** Builds an animated silk-tunic bobblehead dev with developer portrait face! */
function buildParlorDev(name, kind, color, disposables) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const silkMat = mat(color, { roughness: 0.48, metalness: 0.12 });
  const pantsMat = mat('#1f242d', { roughness: 0.85 });
  const leftLeg = at(cyl(0.09, 0.08, 0.6, pantsMat, 8), -0.14, 0.3, 0);
  const rightLeg = at(cyl(0.09, 0.08, 0.6, pantsMat, 8), 0.14, 0.3, 0);
  body.add(leftLeg, rightLeg);
  body.add(at(cyl(0.25, 0.21, 0.74, silkMat, 12), 0, 0.96, 0));
  const leftArm = at(cyl(0.075, 0.065, 0.54, silkMat, 8), -0.33, 1.04, 0);
  const rightArm = at(cyl(0.075, 0.065, 0.54, silkMat, 8), 0.33, 1.04, 0);
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

  const tag = makeMahjongTag(name, color);
  root.add(tag.sprite);
  disposables.push(faceGeo, faceMat, tag.tex, tag.spriteMat);

  return { root, body, leftLeg, rightLeg, leftArm, rightArm, head };
}

/** Builds a full 4-wall warm Chinese Tea-House Mahjong Parlor with emerald baize, brass chute, gears & 144 tiles! */
function buildMahjongArena(scene, disposables) {
  scene.background = new THREE.Color('#2a1c1a');
  scene.fog = new THREE.Fog('#2a1c1a', 60, 150);

  // Warm ambient tea-house lantern glow + overhead parlor chandelier lighting
  scene.add(new THREE.HemisphereLight('#fff0d6', '#3a221c', 1.25));
  const key = new THREE.DirectionalLight('#fff4dc', 1.45);
  key.position.set(12, 26, 16);
  scene.add(key);
  const lanternGlow = new THREE.PointLight('#ff9248', 55, 46, 1.3);
  lanternGlow.position.set(0, 11.5, 0);
  scene.add(lanternGlow);

  const HALF_W = 28;
  const HALF_D = 26;
  const FLOOR_Y = -5.0;
  const CEIL_Y = 21;
  const ROOM_H = CEIL_Y - FLOOR_Y;
  const WALL_MID_Y = (CEIL_Y + FLOOR_Y) / 2;

  // Enclosed 4-wall Chinese Tea-House Parlor (warm cream-gold silk walls + lacquered mahogany wainscoting)
  const wallMat = mat('#e8d9be', { roughness: 0.85 });
  const wainscotMat = mat('#4a1e16', { roughness: 0.5 });
  const trimGold = mat('#d9a441', { roughness: 0.35, metalness: 0.65 });
  // Parquet wood parlor floor & coffered ceiling
  scene.add(at(plane(HALF_W * 2, HALF_D * 2, mat('#3d2419', { roughness: 0.78 })), 0, FLOOR_Y, 0, -Math.PI / 2, 0, 0));
  scene.add(at(plane(HALF_W * 2, HALF_D * 2, mat('#3b1c15', { roughness: 0.75 })), 0, CEIL_Y, 0, Math.PI / 2, 0, 0));

  for (const [wx, wz, ry, len] of [
    [0, -HALF_D, 0, HALF_W * 2],
    [HALF_W, 0, -Math.PI / 2, HALF_D * 2],
    [-HALF_W, 0, Math.PI / 2, HALF_D * 2],
    [0, HALF_D, Math.PI, HALF_W * 2],
  ]) {
    const wg = new THREE.Group();
    wg.position.set(wx, 0, wz);
    wg.rotation.y = ry;
    wg.add(at(plane(len, ROOM_H, wallMat), 0, WALL_MID_Y, 0));
    wg.add(at(box(len, 4.4, 0.24, wainscotMat), 0, FLOOR_Y + 2.2, 0.12));
    wg.add(at(box(len, 0.24, 0.3, trimGold), 0, FLOOR_Y + 4.45, 0.15));
    scene.add(wg);
  }

  // Wall 1 (Back Wall): Giant Crimson-and-Gold Mahjong Parlor Rules Board!
  const plaqueTex = makeParlorPlaqueTexture();
  plaqueTex.anisotropy = 4;
  const plaqueMat = new THREE.MeshStandardMaterial({ map: plaqueTex, roughness: 0.3 });
  disposables.push(plaqueTex, plaqueMat);
  scene.add(at(plane(24.0, 12.0, plaqueMat), 0, 7.6, -HALF_D + 0.35));

  // Wall 2 & Wall 3 (Right & Left Walls): Red-Lacquer Chinese Lattice Windows (only one shows the full moon!)
  const winMoonTex = makeParlorWindowTexture(true);
  const winMoonMat = new THREE.MeshBasicMaterial({ map: winMoonTex });
  const winStarTex = makeParlorWindowTexture(false);
  const winStarMat = new THREE.MeshBasicMaterial({ map: winStarTex });
  disposables.push(winMoonTex, winMoonMat, winStarTex, winStarMat);
  scene.add(at(plane(12.5, 11.5, winMoonMat), -HALF_W + 0.3, 7.6, -10, 0, Math.PI / 2, 0));
  scene.add(at(plane(12.5, 11.5, winStarMat), -HALF_W + 0.3, 7.6, 10, 0, Math.PI / 2, 0));
  scene.add(at(plane(12.5, 11.5, winStarMat), HALF_W - 0.3, 7.6, -10, 0, -Math.PI / 2, 0));
  scene.add(at(plane(12.5, 11.5, winStarMat), HALF_W - 0.3, 7.6, 10, 0, -Math.PI / 2, 0));

  // Wall 4 (Front Wall): Tall Double Rosewood Parlor Doors with Gold Ring Pulls
  scene.add(at(box(10.8, 15.2, 0.38, wainscotMat), 0, FLOOR_Y + 7.6, HALF_D - 0.2));
  for (const sx of [-0.85, 0.85]) {
    scene.add(at(torus(0.36, 0.07, trimGold), sx, FLOOR_Y + 7.2, HALF_D - 0.45));
  }

  // 4 Carved Rosewood Parlor Chairs tucked around the automatic Mahjong table!
  scene.add(buildParlorChair(0, -TABLE_HALF - 3.0, 0));
  scene.add(buildParlorChair(0, TABLE_HALF + 3.0, Math.PI));
  scene.add(buildParlorChair(-TABLE_HALF - 3.0, 0, Math.PI / 2));
  scene.add(buildParlorChair(TABLE_HALF + 3.0, 0, -Math.PI / 2));

  // Automatic Mahjong Table Pedestal Base descending down to the parlor floor
  scene.add(at(box(12.0, 4.8, 12.0, mat('#2b1510', { roughness: 0.45 })), 0, -2.6, 0));

  // Emerald-jade baize felt tabletop built as a square with a circular center cutout for the chute
  const feltTex = makeBaizeFeltTexture();
  const feltMat = new THREE.MeshStandardMaterial({ map: feltTex, roughness: 0.85, metalness: 0.04 });
  disposables.push(feltTex, feltMat);
  const feltShape = new THREE.Shape();
  feltShape.moveTo(-TABLE_HALF, -TABLE_HALF);
  feltShape.lineTo(TABLE_HALF, -TABLE_HALF);
  feltShape.lineTo(TABLE_HALF, TABLE_HALF);
  feltShape.lineTo(-TABLE_HALF, TABLE_HALF);
  feltShape.closePath();
  const pitHole = new THREE.Path();
  pitHole.absarc(0, 0, PIT_RADIUS, 0, Math.PI * 2, true);
  feltShape.holes.push(pitHole);
  const feltGeo = new THREE.ShapeGeometry(feltShape);
  feltGeo.rotateX(-Math.PI / 2);
  const feltMesh = new THREE.Mesh(feltGeo, feltMat);
  scene.add(feltMesh);
  disposables.push(feltGeo);

  // Recessed glowing mechanical gear pit directly underneath the brass center chute!
  const pitWallMat = mat('#1a1d24', { roughness: 0.5, metalness: 0.7 });
  scene.add(at(cyl(PIT_RADIUS + 0.1, PIT_RADIUS + 0.1, 4.5, pitWallMat, 28), 0, -2.3, 0));
  const gearMat = mat('#f59f00', { emissive: '#e8590c', emissiveIntensity: 0.9, roughness: 0.35, metalness: 0.8 });
  const gearGroup = new THREE.Group();
  gearGroup.position.set(0, -1.65, 0);
  gearGroup.add(at(torus(1.45, 0.22, gearMat), 0, 0, 0, Math.PI / 2, 0, 0));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    gearGroup.add(at(box(0.42, 0.25, 0.55, gearMat), Math.cos(a) * 1.72, 0, Math.sin(a) * 1.72, 0, -a, 0));
  }
  scene.add(gearGroup);

  // Brass Auto-Shuffle center hatch lid (lowers down when chuteOpen is true!)
  const brassTex = makeBrassPlateTexture();
  const brassMat = new THREE.MeshStandardMaterial({ map: brassTex, roughness: 0.32, metalness: 0.75, emissive: '#000000', emissiveIntensity: 0 });
  const hatchLid = at(cyl(PIT_RADIUS - 0.04, PIT_RADIUS - 0.04, 0.18, brassMat, 28), 0, -0.06, 0);
  scene.add(hatchLid);
  disposables.push(brassTex, brassMat);
  const pitRimMat = mat('#e6b84c', { roughness: 0.28, metalness: 0.85, emissive: '#e6b84c', emissiveIntensity: 0.2 });
  scene.add(at(torus(PIT_RADIUS + 0.06, 0.12, pitRimMat), 0, 0.04, 0, Math.PI / 2, 0, 0));

  // Glossy lacquered mahogany bumper rails + inlaid brass corner brackets
  const mahogMat = mat('#3d1b12', { roughness: 0.26, metalness: 0.14 });
  const brassTrim = mat('#e6b84c', { roughness: 0.25, metalness: 0.88 });
  const railW = TABLE_HALF * 2 + 2.4;
  scene.add(at(box(railW, 1.3, 1.2, mahogMat), 0, 0.25, -TABLE_HALF - 0.6));
  scene.add(at(box(railW, 1.3, 1.2, mahogMat), 0, 0.25, TABLE_HALF + 0.6));
  scene.add(at(box(1.2, 1.3, railW, mahogMat), -TABLE_HALF - 0.6, 0.25, 0));
  scene.add(at(box(1.2, 1.3, railW, mahogMat), TABLE_HALF + 0.6, 0.25, 0));
  for (const [cx, cz] of [[-TABLE_HALF - 0.6, -TABLE_HALF - 0.6], [TABLE_HALF + 0.6, -TABLE_HALF - 0.6], [-TABLE_HALF - 0.6, TABLE_HALF + 0.6], [TABLE_HALF + 0.6, TABLE_HALF + 0.6]]) {
    scene.add(at(box(1.45, 1.36, 1.45, brassTrim), cx, 0.27, cz));
  }

  // Glowing crimson silk tea-house lanterns suspended from the coffered ceiling!
  const lanternMat = mat('#e03131', { emissive: '#ff4d4f', emissiveIntensity: 1.45, roughness: 0.4 });
  const lanterns = [];
  for (const [lx, lz] of [[-12, -14], [0, -14], [12, -14], [-14, 0], [14, 0], [-12, 14], [12, 14]]) {
    const lg = new THREE.Group();
    lg.position.set(lx, 13.8, lz);
    lg.add(at(cyl(0.05, 0.05, 7.2, brassTrim, 6), 0, 3.6, 0));
    lg.add(at(ball(0.95, lanternMat, 1.0, 1.25, 1.0), 0, 0, 0));
    lg.add(at(cyl(0.46, 0.46, 0.16, brassTrim, 12), 0, 1.15, 0));
    lg.add(at(cyl(0.4, 0.4, 0.16, brassTrim, 12), 0, -1.15, 0));
    lg.add(at(cyl(0.08, 0.16, 1.0, mat('#ffd43b', { emissive: '#ffd43b', emissiveIntensity: 0.6 }), 8), 0, -1.7, 0));
    scene.add(lg);
    lanterns.push(lg);
  }

  // Single-draw-call InstancedMesh for all 144 gleaming ivory-and-jade Mahjong tiles!
  const tileFaceTex = makeMahjongFaceTexture();
  const ivoryMat = new THREE.MeshStandardMaterial({ map: tileFaceTex, roughness: 0.25, metalness: 0.08 });
  const jadeBackMat = mat('#12b886', { roughness: 0.22, metalness: 0.12 });
  const sideIvory = mat('#f8f2e4', { roughness: 0.3 });
  const tileGeo = new THREE.BoxGeometry(0.62, 0.36, 0.82);
  const instancedTiles = new THREE.InstancedMesh(tileGeo, [sideIvory, sideIvory, ivoryMat, jadeBackMat, sideIvory, sideIvory], TILE_COUNT);
  scene.add(instancedTiles);
  disposables.push(tileFaceTex, ivoryMat, tileGeo);

  // Giant Red Dragon PONG! 3-tile clamp & 4-tile KONG! sweeper bar
  const pongGroup = new THREE.Group();
  const redDragonMat = new THREE.MeshStandardMaterial({ map: tileFaceTex, emissive: '#ff4d4f', emissiveIntensity: 0.35, roughness: 0.25 });
  for (let i = -1; i <= 1; i++) {
    pongGroup.add(at(box(1.5, 2.2, 0.95, [sideIvory, sideIvory, sideIvory, sideIvory, redDragonMat, jadeBackMat]), i * 1.65, 1.1, 0));
  }
  pongGroup.visible = false;
  scene.add(pongGroup);
  disposables.push(redDragonMat);

  const kongBar = new THREE.Group();
  const kongGold = mat('#ffd43b', { emissive: '#f59f00', emissiveIntensity: 0.6, roughness: 0.25, metalness: 0.6 });
  for (let i = 0; i < 4; i++) {
    kongBar.add(at(box(1.85, 2.1, 0.85, kongGold), PIT_RADIUS + 1.2 + i * 2.05, 1.05, 0));
  }
  kongBar.visible = false;
  scene.add(kongBar);

  // Two giant bouncing ivory dice
  const diceMeshes = [0, 1].map(() => {
    const dm = at(box(1.15, 1.15, 1.15, mat('#fff9eb', { roughness: 0.2, metalness: 0.1 })), 0, 0.6, 0);
    dm.visible = false;
    scene.add(dm);
    return dm;
  });

  return { instancedTiles, hatchLid, brassMat, gearGroup, pongGroup, kongBar, diceMeshes, lanterns };
}

// ------------------------------------------------------------------ Lobby 3D Stage

export class MahjongStage {
  constructor(aspect = 16 / 9, initialNames = [], { duration = DEFAULT_MAHJONG_DURATION } = {}) {
    this.t = 0;
    this.names = [];
    this.models = [];
    this.disposables = [];
    this.previewSim = new MahjongSim({ names: initialNames.length >= 2 ? initialNames : ['Ada', 'Grace'], duration });

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(46, aspect, 0.3, 180);
    this.arena = buildMahjongArena(this.scene, this.disposables);
    this._dummy = new THREE.Object3D();
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

    const colors = ['#ff4d6d', '#38bdf8', '#ffd43b', '#51cf66', '#cc5de8', '#ff922b'];
    const n = Math.max(1, names.length);
    names.forEach((name, i) => {
      const a = (i / n) * Math.PI * 2;
      const rad = Math.min(TABLE_HALF - 2.4, 4.8 + (i % 3) * 1.65);
      const kind = DEVELOPER_KINDS[i % DEVELOPER_KINDS.length];
      const dev = buildParlorDev(name, kind, colors[i % colors.length], this.disposables);
      dev.root.position.set(Math.cos(a) * rad, 0, Math.sin(a) * rad);
      dev.body.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a));
      this.scene.add(dev.root);
      this.models.push({ ...dev, phase: i * 0.7 });
    });
  }

  update(dt, reduced = false) {
    if (!reduced) this.t += dt;
    const t = this.t;
    // Gently swirl the 144 preview tiles on the emerald baize!
    for (let i = 0; i < TILE_COUNT; i++) {
      const tile = this.previewSim.tiles[i];
      const r = Math.hypot(tile.x, tile.z);
      const a = Math.atan2(tile.z, tile.x) + (reduced ? 0 : t * 0.35 * (5.0 / Math.max(3.2, r)));
      this._dummy.position.set(Math.cos(a) * r, 0.18, Math.sin(a) * r);
      this._dummy.rotation.set(tile.faceUp ? 0 : Math.PI, -a, 0);
      this._dummy.updateMatrix();
      this.arena.instancedTiles.setMatrixAt(i, this._dummy.matrix);
    }
    this.arena.instancedTiles.instanceMatrix.needsUpdate = true;

    for (const m of this.models) {
      if (!reduced) {
        m.head.rotation.z = Math.sin(t * 4.0 + m.phase) * 0.14;
        m.leftArm.rotation.x = Math.sin(t * 3.5 + m.phase) * 0.3;
        m.rightArm.rotation.x = -Math.sin(t * 3.5 + m.phase) * 0.3;
      }
    }
    // Eye-level 360° tea-house parlor orbit (matching Taw Knockout) showcasing the rules board, lattice windows & lanterns!
    const ang = reduced ? 0.08 : t * 0.18;
    this.camera.position.set(Math.sin(ang) * 19.5, 5.8, Math.cos(ang) * 19.5);
    this.camera.lookAt(0, 3.6, 0);
  }

  dispose() {
    for (const d of this.disposables) d.dispose?.();
  }
}

// ------------------------------------------------------------------ Live Match

export class MahjongMatch {
  constructor(names, { duration = DEFAULT_MAHJONG_DURATION, rule = DEFAULT_MAHJONG_RULE, rng = Math.random, sfx = null, onEvent = null, onWinner = null } = {}) {
    this.sim = new MahjongSim({ names, duration, rule, rng });
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
    this.arena = buildMahjongArena(this.scene, this.disposables);
    this.particles = new Particles(this.scene);
    this._dummy = new THREE.Object3D();

    this.devVisuals = this.sim.devs.map((d, i) => {
      const kind = DEVELOPER_KINDS[i % DEVELOPER_KINDS.length];
      const vis = buildParlorDev(d.name, kind, d.color, this.disposables);
      vis.root.position.set(d.x, d.y, d.z);
      this.scene.add(vis.root);
      return { sim: d, ...vis, yaw: 0 };
    });

    this.camPos = new THREE.Vector3(0, 14.5, 20.5);
    this.camLook = new THREE.Vector3(0, 0.8, 0);
    this.resize(window.innerWidth / window.innerHeight);
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 1 ? 60 : 46;
    this.camera.updateProjectionMatrix();
  }

  update(realDt) {
    const inFinalSlowMo = this.sim.kong.active && !this.sim.done && this.sim.time > this.sim.kongAt && this.sim.time < this.sim.kongAt + 1.2;
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

    // Sync 144 InstancedMesh swirling Mahjong tiles
    for (let i = 0; i < TILE_COUNT; i++) {
      const tile = this.sim.tiles[i];
      this._dummy.position.set(tile.x, 0.18, tile.z);
      this._dummy.rotation.set(tile.faceUp ? 0 : Math.PI, tile.yaw, 0);
      this._dummy.updateMatrix();
      this.arena.instancedTiles.setMatrixAt(i, this._dummy.matrix);
    }
    this.arena.instancedTiles.instanceMatrix.needsUpdate = true;

    // Sync brass Auto-Shuffle center chute hatch & rotating gears
    const targetLidY = this.sim.chuteOpen ? -2.8 : -0.06;
    this.arena.hatchLid.position.y += (targetLidY - this.arena.hatchLid.position.y) * Math.min(1, realDt * 7.5);
    this.arena.brassMat.emissive.set(this.sim.chuteWarning ? '#ff922b' : this.sim.chuteOpen ? '#e03131' : '#000000');
    this.arena.brassMat.emissiveIntensity = this.sim.chuteWarning ? 0.5 + Math.sin(t * 18) * 0.35 : this.sim.chuteOpen ? 0.4 : 0;
    this.arena.gearGroup.rotation.y += realDt * (this.sim.chuteOpen ? 3.5 : 0.6) * this.sim.windDir;

    // Sync PONG! clamp, KONG! sweeper bar & giant ivory dice
    this.arena.pongGroup.visible = this.sim.pong.active;
    if (this.sim.pong.active) {
      this.arena.pongGroup.position.set(this.sim.pong.x, 0, this.sim.pong.z);
      this.arena.pongGroup.rotation.y = t * 1.2;
    }
    this.arena.kongBar.visible = this.sim.kong.active;
    if (this.sim.kong.active) {
      this.arena.kongBar.rotation.y = this.sim.kong.angle;
    }
    this.sim.dice.forEach((die, i) => {
      const dm = this.arena.diceMeshes[i];
      dm.visible = die.active;
      if (die.active) {
        dm.position.set(die.x, 0.6, die.z);
        dm.rotation.set(die.rx, die.ry, 0);
      }
    });

    // Sway crimson tea-house lanterns gently
    for (let i = 0; i < this.arena.lanterns.length; i++) {
      this.arena.lanterns[i].rotation.z = Math.sin(t * 1.6 + i) * 0.08;
    }

    // Sync animated bobblehead devs weaving through the swirling wash
    for (const dv of this.devVisuals) {
      const d = dv.sim;
      const winHop = this.sim.winner === d && !d.eliminated ? Math.abs(Math.sin(this.victoryTime * 6.0)) * 0.55 : 0;
      dv.root.position.set(d.x, d.y + winHop, d.z);
      dv.root.visible = d.y > -6.5;
      const speed = Math.hypot(d.vx, d.vz);
      if (speed > 0.4) dv.yaw = Math.atan2(d.vx, d.vz);
      if (d.eliminated) {
        dv.body.rotation.y += realDt * 8.0;
        dv.body.rotation.x += realDt * 4.5;
      } else {
        dv.body.rotation.y = dv.yaw;
        dv.body.rotation.x = 0;
        const swing = Math.sin(t * 13 + d.phase) * Math.min(1, speed / 6);
        dv.leftLeg.rotation.x = swing * 0.7;
        dv.rightLeg.rotation.x = -swing * 0.7;
        dv.leftArm.rotation.x = -swing * 0.8;
        dv.rightArm.rotation.x = swing * 0.8;
        dv.head.rotation.z = Math.sin(t * 9 + d.phase) * 0.14;
        if (this.sim.winner === d) {
          dv.leftArm.rotation.z = 2.4;
          dv.rightArm.rotation.z = -2.4;
        }
      }
    }

    this.particles.update(realDt);

    // Dynamic Camera: Overhead 3/4 Parlor -> Chute Slow-Mo Swoop -> 360° Victory Orbit
    if (this.shake > 0) this.shake = Math.max(0, this.shake - realDt * 4.2);
    const kickY = Math.sin(t * 50) * this.shake * 0.6;
    const wantPos = new THREE.Vector3();
    const wantLook = new THREE.Vector3(0, 0.8, 0);

    if (this.sim.winner) {
      // Relaxed 360° eye-level tea-house parlor orbit showcasing the full room & winning dev!
      const orbitAng = this.victoryTime * 0.2;
      wantPos.set(Math.sin(orbitAng) * 18.5, 5.6, Math.cos(orbitAng) * 18.5);
      wantLook.set(this.sim.winner.x * 0.45, 3.4, this.sim.winner.z * 0.45);
    } else if (inFinalSlowMo) {
      wantPos.set(Math.sin(t * 0.5) * 9.5, 6.5, 11.5);
      wantLook.set(0, 0.4, 0);
    } else {
      wantPos.set(Math.sin(t * 0.22) * 4.8, 13.8 + kickY, 19.5);
    }

    this.camPos.lerp(wantPos, Math.min(1, realDt * 4.5));
    this.camLook.lerp(wantLook, Math.min(1, realDt * 5.0));
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
  }

  handleEvent(e) {
    if (e.type === 'wind') {
      this.sfx?.play?.('mahjongGong');
      this.shake = 0.65;
      this.onEvent?.({
        type: 'status',
        text: `🀄 ${e.wind} WIND REVERSAL! · ON TABLE: ${e.remaining} / ${this.sim.devs.length}`,
        tone: 'yellow',
      });
      this.onEvent?.({ type: 'note', text: `🌪️ ${e.wind} WIND REVERSAL! “${e.popup}”`, important: true });
    } else if (e.type === 'chuteWarn') {
      this.sfx?.play?.('mahjongChute');
      this.onEvent?.({ type: 'note', text: '⚙️ Brass Auto-Shuffle Chute unlocking…', important: true });
    } else if (e.type === 'chuteOpen') {
      this.sfx?.play?.('mahjongChute');
      this.onEvent?.({
        type: 'status',
        text: `🀄 AUTO-SHUFFLE ACTIVE! · ON TABLE: ${e.remaining} / ${this.sim.devs.length}`,
        tone: 'red',
      });
    } else if (e.type === 'pong') {
      this.sfx?.play?.('mahjongGong');
      this.shake = 0.75;
      this.onEvent?.({ type: 'note', text: `🀄 PONG! Red Dragon clamp — “${e.popup}”`, important: true });
    } else if (e.type === 'kong') {
      this.sfx?.play?.('mahjongGong');
      this.shake = 0.9;
      this.onEvent?.({
        type: 'status',
        text: `🀄 KONG! 4-TILE SWEEPER · ON TABLE: ${e.remaining} / ${this.sim.devs.length}`,
        tone: 'red',
      });
      this.onEvent?.({ type: 'note', text: `🀄 KONG! Sweeper wall — “${e.popup}”`, important: true });
    } else if (e.type === 'dice') {
      this.sfx?.play?.('mahjongClatter');
      this.onEvent?.({ type: 'note', text: `🎲 GIANT IVORY DICE: “${e.popup}”`, important: true });
    } else if (e.type === 'eliminated') {
      this.sfx?.play?.('mahjongClatter');
      this.particles.burst(new THREE.Vector3(0, 0.4, 0), {
        count: 14,
        colors: ['#ffd43b', '#12b886', '#fff9eb'],
        speed: 4.5,
        up: 5.0,
        life: 0.65,
        size: 0.16,
        gravity: 12,
      });
      this.onEvent?.({
        type: 'status',
        text: `🀄 ON TABLE: ${e.remaining} / ${this.sim.devs.length} · WIND: ${this.sim.windName()}`,
        tone: e.remaining <= 3 ? 'red' : 'yellow',
      });
      this.onEvent?.({ type: 'note', text: `⚙️ ${e.dev.name} SHUFFLED INTO BACKLOG: “${e.popup}”`, important: false });
    } else if (e.type === 'winner' && !this.winnerAnnounced) {
      this.winnerAnnounced = true;
      this.sfx?.play?.('mahjongWin');
      this.sfx?.fanfare?.();
      this.particles.burst(new THREE.Vector3(e.dev.x, 1.5, e.dev.z), {
        count: 72,
        colors: ['#ffd43b', '#ff4d6d', '#12b886', '#fff9eb', '#ffffff'],
        speed: 7.5,
        up: 9.0,
        life: 1.9,
        size: 0.25,
        gravity: 12,
      });
      this.onWinner?.(e.dev, this.sim);
    }
  }

  dispose() {
    for (const d of this.disposables) d.dispose?.();
  }
}
