// "Nōkabe Wall Crunch" (Japanese Game-Show "Hole in the Wall"): late-night Tokyo TV soundstage
// with steel lighting trusses, magenta/cyan/amber spotlights, glowing turquoise dunk tank,
// cantilevered neon acrylic dock, twin steel rails, hollow ExtrudeGeometry styrofoam cutout walls
// with glowing LED rims, gleaming silver-spandex bobblehead devs with articulated 4-DOF poses,
// yellow inflatable duck rings for dunked swimmers, foam-pellet & water-splash bursts,
// 0.4x slow-motion final wall climax, and 360-degree victory orbit!

import * as THREE from 'three';
import { mat, box, ball, cyl, cone, torus, plane, at, canvasTexture, FONT_UI, FONT_MONO, roundRect } from './util3d.js';
import { Particles } from './effects.js';
import { DEVELOPER_KINDS } from './deathmatch-sim.js';
import { AUDIENCE_KINDS } from './audience.js';
import {
  NokabeSim,
  POOL_Y,
  WALL_START_Z,
  DOCK_Z,
  DEFAULT_NOKABE_DURATION,
  DEFAULT_NOKABE_RULE,
} from './nokabe-sim.js';

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

/** Classic bright daytime Japanese TV game-show arch sign ("脳壁 · NŌKABE HOLE IN THE WALL"). */
function makeStudioSignTexture() {
  return canvasTexture(1024, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, '#c92a2a');
    g.addColorStop(0.5, '#e03131');
    g.addColorStop(1, '#1971c2');
    ctx.fillStyle = g;
    roundRect(ctx, 8, 8, w - 16, h - 16, 20);
    ctx.fill();
    ctx.strokeStyle = '#ffd43b';
    ctx.lineWidth = 12;
    ctx.stroke();

    // Sunburst TV variety-show accent rays
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      ctx.moveTo(w / 2, h / 2);
      const a1 = (i / 12) * Math.PI * 2;
      const a2 = a1 + 0.16;
      ctx.lineTo(w / 2 + Math.cos(a1) * 600, h / 2 + Math.sin(a1) * 600);
      ctx.lineTo(w / 2 + Math.cos(a2) * 600, h / 2 + Math.sin(a2) * 600);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = `900 72px ${FONT_UI}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('脳壁 · HOLE IN THE WALL!', w / 2, h * 0.42);
    ctx.fillStyle = '#fff3bf';
    ctx.font = `900 32px ${FONT_MONO}`;
    ctx.fillText('OUTDOOR POOLSIDE STAGE · STAY DRY TO LEAD STANDUP!', w / 2, h * 0.78);
  });
}

/** Sunny outdoor daylight sky dome texture with realistic volumetric cumulus clouds & horizon haze. */
function makeDaySkyTexture() {
  return canvasTexture(1024, 512, (ctx, w, h) => {
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#2b7cd3');
    sky.addColorStop(0.42, '#64b0f2');
    sky.addColorStop(0.74, '#bce0fd');
    sky.addColorStop(1, '#e8f4fc');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Warm afternoon sun glow
    const sun = ctx.createRadialGradient(w * 0.25, h * 0.22, 16, w * 0.25, h * 0.22, 220);
    sun.addColorStop(0, 'rgba(255, 252, 232, 0.92)');
    sun.addColorStop(0.35, 'rgba(255, 246, 214, 0.35)');
    sun.addColorStop(1, 'rgba(255, 246, 214, 0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, w, h);

    const drawCloud = (cx, cy, s) => {
      const puffs = [[-60, 10, 44], [-25, -8, 56], [22, -14, 62], [65, 0, 48], [95, 16, 36], [0, 14, 52]];
      for (const [ox, oy, r] of puffs) {
        const px = cx + ox * s;
        const py = cy + (oy + 9) * s;
        const rad = r * s;
        const g = ctx.createRadialGradient(px, py + rad * 0.15, rad * 0.1, px, py, rad);
        g.addColorStop(0, 'rgba(170, 192, 216, 0.48)');
        g.addColorStop(1, 'rgba(170, 192, 216, 0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(px, py, rad, 0, Math.PI * 2); ctx.fill();
      }
      for (const [ox, oy, r] of puffs) {
        const px = cx + ox * s;
        const py = cy + oy * s;
        const rad = r * s;
        const g = ctx.createRadialGradient(px - rad * 0.2, py - rad * 0.25, rad * 0.08, px, py, rad);
        g.addColorStop(0, 'rgba(255, 255, 252, 0.95)');
        g.addColorStop(0.6, 'rgba(246, 250, 255, 0.62)');
        g.addColorStop(1, 'rgba(240, 248, 255, 0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(px, py, rad, 0, Math.PI * 2); ctx.fill();
      }
    };
    drawCloud(180, 170, 1.1);
    drawCloud(490, 130, 0.9);
    drawCloud(790, 165, 1.15);
    drawCloud(360, 240, 0.65);
    drawCloud(920, 235, 0.7);
  });
}

/** Wall header banner texture stamped atop each incoming styrofoam cutout wall. */
function makeWallBannerTexture(label, isFinal) {
  return canvasTexture(512, 96, (ctx, w, h) => {
    ctx.fillStyle = isFinal ? '#c92a2a' : '#1864ab';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#ffd43b';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 36px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, w / 2, h / 2 + 2);
  });
}

/** Textured non-slip rubberized TV game-show dock surface with hazard chevrons & PLAY ZONE markings. */
function makeStageDockTexture() {
  return canvasTexture(1024, 256, (ctx, w, h) => {
    // Charcoal rubberized non-slip stage mat
    ctx.fillStyle = '#2d333b';
    ctx.fillRect(0, 0, w, h);
    // Subtle diamond-tread non-slip grip pattern
    ctx.fillStyle = 'rgba(255, 255, 255, 0.045)';
    for (let y = 26; y < h - 26; y += 16) {
      for (let x = 0; x < w; x += 20) {
        ctx.fillRect(x + ((y / 16) % 2) * 10, y, 8, 3);
      }
    }
    // High-contrast black-and-yellow diagonal hazard chevron strips along front & back drop edges
    const drawHazard = (y0, hh) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, y0, w, hh);
      ctx.clip();
      ctx.fillStyle = '#f59f00';
      ctx.fillRect(0, y0, w, hh);
      ctx.fillStyle = '#1a1e24';
      for (let x = -hh; x < w + hh; x += 36) {
        ctx.beginPath();
        ctx.moveTo(x, y0);
        ctx.lineTo(x + 18, y0);
        ctx.lineTo(x + 18 - hh, y0 + hh);
        ctx.lineTo(x - hh, y0 + hh);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    };
    drawHazard(0, 26);
    drawHazard(h - 26, 26);

    // Subtle white TV-stage standing zone center line & "PLAY ZONE" stencil
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 4;
    ctx.setLineDash([18, 14]);
    ctx.beginPath();
    ctx.moveTo(24, h / 2);
    ctx.lineTo(w - 24, h / 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.font = `900 28px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('STAGE DECK · STAND BEHIND HAZARD LINE', w / 2, h / 2);
  });
}

/** Realistic painted beaded-styrofoam wall texture with foam block seams & fine grain. */
function makeStyrofoamTexture(baseColor) {
  const tex = canvasTexture(512, 256, (ctx, w, h) => {
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, w, h);
    // Subtle foam-bead stipple texture
    for (let i = 0; i < 3200; i++) {
      const x = (i * 73) % w;
      const y = (i * 137) % h;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.11)' : 'rgba(0,0,0,0.08)';
      ctx.fillRect(x, y, 3, 3);
    }
    // Glued foam panel seam grid lines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.14)';
    ctx.lineWidth = 2;
    for (let x = 64; x < w; x += 64) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 64; y < h; y += 64) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
  });
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(0.18, 0.18);
  return tex;
}

/** Sunlit sparkling resort swimming-pool water caustics texture. */
function makePoolWaterTexture() {
  const tex = canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#15aabf';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(227, 250, 252, 0.42)';
    ctx.lineWidth = 4;
    for (let i = 0; i < 34; i++) {
      const cx = (i * 97) % w;
      const cy = (i * 151) % h;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 40 + (i % 4) * 14, 18 + (i % 3) * 10, i * 0.4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    for (let i = 0; i < 24; i++) {
      ctx.fillRect((i * 73) % w, (i * 119) % h, 18 + (i % 4) * 8, 3);
    }
  });
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 4);
  return tex;
}

/** Upright high-contrast player nameplate sprite. */
function makeNokabeTag(name, color) {
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
  sprite.position.set(0, 2.75, 0);
  return { sprite, tex, spriteMat };
}

/** Builds a gleaming silver-spandex variety-show dev with 4-DOF articulated limbs, helmet & portrait face! */
function buildSilverDev(name, kind, helmetColor, disposables) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const silverMat = mat('#dee2e6', { roughness: 0.22, metalness: 0.85 });
  const stripeMat = mat(helmetColor, { roughness: 0.35, metalness: 0.25 });

  // Articulated legs
  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.18, 0.82, 0);
  leftLegPivot.add(at(cyl(0.11, 0.09, 0.82, silverMat, 10), 0, -0.41, 0));
  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.18, 0.82, 0);
  rightLegPivot.add(at(cyl(0.11, 0.09, 0.82, silverMat, 10), 0, -0.41, 0));
  body.add(leftLegPivot, rightLegPivot);

  // Articulated upper torso (pivots at hips for pretzel leaning!)
  const torsoPivot = new THREE.Group();
  torsoPivot.position.set(0, 0.82, 0);
  torsoPivot.add(at(cyl(0.28, 0.22, 0.84, silverMat, 12), 0, 0.42, 0));
  torsoPivot.add(at(cyl(0.29, 0.27, 0.16, stripeMat, 12), 0, 0.56, 0));

  // Articulated arms (pivot at shoulders for T-Pose, Salutes & Keyholes!)
  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.34, 0.74, 0);
  leftArmPivot.add(at(cyl(0.085, 0.075, 0.72, silverMat, 8), 0, -0.34, 0));
  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.34, 0.74, 0);
  rightArmPivot.add(at(cyl(0.085, 0.075, 0.72, silverMat, 8), 0, -0.34, 0));
  torsoPivot.add(leftArmPivot, rightArmPivot);

  // Color-coded helmet rim + Claw-of-Destiny developer portrait face
  const head = new THREE.Group();
  head.position.set(0, 1.18, 0);
  head.add(at(cyl(0.42, 0.42, 0.16, stripeMat, 24), 0, 0, 0, Math.PI / 2, 0, 0));
  const portraitTex = getDeveloperPortraitTexture(kind.id);
  const faceMat = new THREE.MeshStandardMaterial({ map: portraitTex, roughness: 0.32 });
  const faceGeo = new THREE.CircleGeometry(0.38, 24);
  const front = new THREE.Mesh(faceGeo, faceMat);
  front.position.set(0, 0, 0.085);
  const back = new THREE.Mesh(faceGeo, faceMat);
  back.rotation.y = Math.PI;
  back.position.set(0, 0, -0.085);
  head.add(front, back);
  torsoPivot.add(head);
  body.add(torsoPivot);

  // Inflatable yellow duck swim ring (hidden until dunked in the turquoise pool!)
  const duckRing = at(torus(0.54, 0.18, mat('#ffd43b', { roughness: 0.28 })), 0, 0.85, 0, Math.PI / 2, 0, 0);
  duckRing.visible = false;
  root.add(duckRing);

  const tag = makeNokabeTag(name, helmetColor);
  root.add(tag.sprite);

  disposables.push(faceGeo, faceMat, tag.tex, tag.spriteMat);
  return { root, body, torsoPivot, leftArmPivot, rightArmPivot, leftLegPivot, rightLegPivot, head, duckRing };
}

/**
 * Builds a genuinely hollow ExtrudeGeometry styrofoam cutout wall using THREE.Shape + punched THREE.Path holes!
 */
function buildCutoutWall(wall, dockHalfW, disposables) {
  const g = new THREE.Group();
  const wallW = dockHalfW * 2 + 2.6;
  const wallH = 5.4;

  const shape = new THREE.Shape();
  shape.moveTo(-wallW / 2, 0);
  shape.lineTo(wallW / 2, 0);
  shape.lineTo(wallW / 2, wallH);
  shape.lineTo(-wallW / 2, wallH);
  shape.closePath();

  const rimColor = wall.isFinal ? '#ffd43b' : wall.poseKind === 'pretzel' ? '#ff2a85' : '#22d3ee';
  const rimMat = mat(rimColor, { emissive: rimColor, emissiveIntensity: 1.6 });

  // Punch genuine hollow silhouette holes for every open bay
  for (const bay of wall.bays) {
    const hole = new THREE.Path();
    const cx = bay.x;
    if (wall.poseKind === 'tpose') {
      // Wide T-Pose cutout silhouette
      hole.moveTo(cx - 0.52, 0.08);
      hole.lineTo(cx + 0.52, 0.08);
      hole.lineTo(cx + 0.52, 1.35);
      hole.lineTo(cx + 1.35, 1.35);
      hole.lineTo(cx + 1.35, 1.98);
      hole.lineTo(cx + 0.52, 1.98);
      hole.lineTo(cx + 0.52, 2.55);
      hole.lineTo(cx - 0.52, 2.55);
      hole.lineTo(cx - 0.52, 1.98);
      hole.lineTo(cx - 1.35, 1.98);
      hole.lineTo(cx - 1.35, 1.35);
      hole.lineTo(cx - 0.52, 1.35);
      hole.closePath();
    } else if (wall.poseKind === 'pretzel') {
      // Asymmetric leaning pretzel cutout
      hole.moveTo(cx - 0.85, 0.08);
      hole.lineTo(cx + 0.95, 0.08);
      hole.lineTo(cx + 1.15, 1.55);
      hole.lineTo(cx + 0.45, 2.65);
      hole.lineTo(cx - 0.85, 2.45);
      hole.lineTo(cx - 1.25, 1.2);
      hole.closePath();
    } else if (wall.poseKind === 'salute') {
      // One-arm salute diagonal cutout
      hole.moveTo(cx - 0.72, 0.08);
      hole.lineTo(cx + 0.72, 0.08);
      hole.lineTo(cx + 1.25, 2.65);
      hole.lineTo(cx + 0.25, 2.75);
      hole.lineTo(cx - 0.95, 1.55);
      hole.closePath();
    } else {
      // Tall narrow Keyhole cutout (Final Boss)
      hole.moveTo(cx - 0.52, 0.08);
      hole.lineTo(cx + 0.52, 0.08);
      hole.lineTo(cx + 0.62, 2.85);
      hole.lineTo(cx - 0.62, 2.85);
      hole.closePath();
    }
    shape.holes.push(hole);

    // Glowing LED marker frame tracing the bay archway
    g.add(at(box(0.12, 2.7, 0.72, rimMat), cx - 1.36, 1.4, 0));
    g.add(at(box(0.12, 2.7, 0.72, rimMat), cx + 1.36, 1.4, 0));
    g.add(at(box(2.84, 0.12, 0.72, rimMat), cx, 2.75, 0));
  }

  const extrudeGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.62, bevelEnabled: false });
  extrudeGeo.translate(0, 0, -0.31);
  const tvWallColors = ['#e9ecef', '#ff8787', '#ffd43b', '#74c0fc'];
  const foamColor = wall.isFinal ? '#ffd43b' : tvWallColors[wall.index % tvWallColors.length];
  const foamTex = makeStyrofoamTexture(foamColor);
  const foamMat = new THREE.MeshStandardMaterial({ map: foamTex, roughness: 0.88, metalness: 0.02 });
  const wallMesh = new THREE.Mesh(extrudeGeo, foamMat);
  g.add(wallMesh);
  disposables.push(extrudeGeo, foamTex, foamMat);

  // Brushed-steel rolling rail carriage sleds clamping the styrofoam wall onto the tracks!
  const sledMat = mat('#495057', { roughness: 0.35, metalness: 0.82 });
  const wheelMat = mat('#212529', { roughness: 0.8 });
  for (const sx of [-dockHalfW - 1.1, dockHalfW + 1.1]) {
    g.add(at(box(0.75, 0.55, 1.5, sledMat), sx, 0.25, 0));
    g.add(at(cyl(0.2, 0.2, 0.16, wheelMat, 12), sx, 0.12, -0.48, 0, 0, Math.PI / 2));
    g.add(at(cyl(0.2, 0.2, 0.16, wheelMat, 12), sx, 0.12, 0.48, 0, 0, Math.PI / 2));
  }

  // Optional solid painted fake trap silhouette ("DO NOT TOUCH")
  if (wall.fakeX !== null) {
    const fakeMat = mat('#1e293b', { emissive: '#ff3b5c', emissiveIntensity: 0.45 });
    g.add(at(box(1.5, 2.4, 0.62, fakeMat), wall.fakeX, 1.3, 0));
  }

  // Bold header banner stamped across the top of the styrofoam slab
  const bTex = makeWallBannerTexture(wall.label, wall.isFinal);
  const bMat = new THREE.MeshBasicMaterial({ map: bTex });
  disposables.push(bTex, bMat);
  g.add(at(plane(Math.min(wallW - 1.5, 11.5), 1.45, bMat), 0, wallH - 0.95, 0.3));

  g.position.set(0, 0, wall.z);
  g.visible = false;
  return g;
}

/** Builds a detailed wheeled TV broadcast studio camera pedestal with viewfinder, matte box & tally light. */
function buildTvCameraRig(x, z, rotY) {
  const g = new THREE.Group();
  g.position.set(x, POOL_Y + 1.6, z);
  g.rotation.y = rotY;
  const darkMetal = mat('#1e222a', { roughness: 0.38, metalness: 0.72 });
  const chrome = mat('#dee2e6', { roughness: 0.2, metalness: 0.9 });
  const rubber = mat('#14161a', { roughness: 0.9 });

  // 3-wheel triangular rolling studio dolly base
  g.add(at(cyl(0.28, 0.34, 0.24, darkMetal, 12), 0, 0.22, 0));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = new THREE.Group();
    leg.rotation.y = a;
    leg.add(at(box(0.14, 0.12, 1.05, darkMetal), 0, 0.22, 0.52));
    leg.add(at(cyl(0.14, 0.14, 0.1, rubber, 12), 0, 0.14, 1.0, 0, 0, Math.PI / 2));
    g.add(leg);
  }
  // Pneumatic telescoping column + chrome steering ring
  g.add(at(cyl(0.16, 0.2, 1.6, darkMetal, 12), 0, 1.05, 0));
  g.add(at(cyl(0.11, 0.11, 1.15, chrome, 12), 0, 2.25, 0));
  g.add(at(torus(0.42, 0.035, chrome), 0, 1.85, 0, Math.PI / 2, 0, 0));
  // Fluid pan-tilt head + broadcast camera body + twin rear operator handles
  g.add(at(box(0.42, 0.28, 0.5, darkMetal), 0, 2.86, 0));
  g.add(at(box(0.68, 0.58, 1.38, darkMetal), 0, 3.25, 0.08));
  g.add(at(box(0.54, 0.42, 0.08, mat('#1e3a8a', { emissive: '#38bdf8', emissiveIntensity: 0.65 })), 0, 3.3, -0.64)); // Rear viewfinder monitor
  for (const sx of [-0.42, 0.42]) {
    g.add(at(cyl(0.035, 0.035, 0.95, chrome, 8), sx, 2.95, -0.78, 0.45, 0, 0));
  }
  // Matte-box lens hood + reflective glass lens + red ON-AIR tally light
  g.add(at(box(0.56, 0.46, 0.36, darkMetal), 0, 3.22, 0.94));
  g.add(at(cyl(0.18, 0.18, 0.12, mat('#0c4a6e', { roughness: 0.08, metalness: 0.95 }), 16), 0, 3.22, 1.08, Math.PI / 2, 0, 0));
  g.add(at(box(0.22, 0.14, 0.14, mat('#ff2a2a', { emissive: '#ff2a2a', emissiveIntensity: 1.9 })), 0, 3.62, 0.42));
  return g;
}

/** Builds a striped resort poolside umbrella with weighted stone base & two slatted sun loungers. */
function buildPoolUmbrella(x, z, color, disposables) {
  const g = new THREE.Group();
  g.position.set(x, POOL_Y + 1.6, z);
  const woodMat = mat('#7c5230', { roughness: 0.6 });
  const stoneMat = mat('#adb5bd', { roughness: 0.85 });
  const whiteMat = mat('#f8f9fa', { roughness: 0.5 });

  // Weighted octagonal stone umbrella stand + hardwood mast
  g.add(at(cyl(0.52, 0.62, 0.24, stoneMat, 8), 0, 0.12, 0));
  g.add(at(cyl(0.085, 0.095, 4.4, woodMat, 10), 0, 2.2, 0));
  // Striped 8-panel canvas umbrella canopy
  const uTex = canvasTexture(256, 128, (ctx, w, h) => {
    const panels = 8;
    for (let i = 0; i < panels; i++) {
      ctx.fillStyle = i % 2 === 0 ? color : '#ffffff';
      ctx.fillRect((i / panels) * w, 0, w / panels + 1, h);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    ctx.fillRect(0, h - 16, w, 16);
  });
  const uMat = new THREE.MeshStandardMaterial({ map: uTex, roughness: 0.72, side: THREE.DoubleSide });
  disposables.push(uTex, uMat);
  g.add(at(cone(2.65, 0.92, uMat, 8), 0, 4.48, 0));
  g.add(at(ball(0.14, woodMat), 0, 4.98, 0));

  // Two resort sun loungers with cushions tucked beside the umbrella
  const cushMat = mat(color, { roughness: 0.78 });
  for (const lx of [-1.45, 1.45]) {
    const chair = new THREE.Group();
    chair.position.set(lx, 0, 0.4);
    chair.add(at(box(1.1, 0.14, 2.4, whiteMat), 0, 0.48, 0));
    chair.add(at(box(1.0, 0.12, 1.65, cushMat), 0, 0.58, 0.3));
    chair.add(at(box(1.04, 0.92, 0.14, cushMat), 0, 0.9, -0.78, -0.45, 0, 0));
    for (const [px, pz] of [[-0.45, -1.0], [0.45, -1.0], [-0.45, 1.0], [0.45, 1.0]]) {
      chair.add(at(cyl(0.04, 0.04, 0.48, whiteMat, 6), px, 0.24, pz));
    }
    // Rolled white pool towel on headrest
    chair.add(at(cyl(0.12, 0.12, 0.76, whiteMat, 10), 0, 1.24, -0.92, 0, 0, Math.PI / 2));
    g.add(chair);
  }
  return g;
}

/** Builds a curved coastal resort palm tree with segmented trunk & arching green fronds. */
function buildPalmTree(x, z, height = 11.5) {
  const g = new THREE.Group();
  g.position.set(x, POOL_Y + 1.45, z);
  const trunkMat = mat('#7c5a3c', { roughness: 0.88 });
  const frondMat = mat('#2f9e44', { roughness: 0.65 });
  const segs = 7;
  let cx = 0;
  for (let i = 0; i < segs; i++) {
    const segH = height / segs;
    const rad = 0.42 - (i / segs) * 0.18;
    cx += i * 0.08;
    g.add(at(cyl(rad * 0.92, rad, segH + 0.1, trunkMat, 8), cx, (i + 0.5) * segH, 0, 0, 0, -0.05 * i));
  }
  const crownY = height;
  for (let f = 0; f < 7; f++) {
    const a = (f / 7) * Math.PI * 2;
    const frond = new THREE.Group();
    frond.position.set(cx, crownY, 0);
    frond.rotation.y = a;
    frond.add(at(box(0.55, 0.1, 3.2, frondMat), 0, 0.45, 1.45, 0.22, 0, 0));
    frond.add(at(box(0.42, 0.08, 2.4, frondMat), 0, 0.22, 3.65, 0.58, 0, 0));
    g.add(frond);
  }
  return g;
}

/** Builds an authentic open-lattice aluminum TV studio box-truss launch arch with overhead PAR floodlights. */
function buildOpenTrussArch(width, height, z) {
  const g = new THREE.Group();
  g.position.set(0, 0, z);
  const alum = mat('#ced4da', { roughness: 0.28, metalness: 0.85 });
  const darkHousing = mat('#1e222a', { roughness: 0.4, metalness: 0.6 });
  const lampGlow = mat('#fff9db', { emissive: '#ffe066', emissiveIntensity: 1.7 });

  const halfW = width / 2;
  // Twin 4-chord vertical lattice towers
  for (const sx of [-halfW, halfW]) {
    for (const ox of [-0.32, 0.32]) {
      for (const oz of [-0.32, 0.32]) {
        g.add(at(cyl(0.06, 0.06, height, alum, 6), sx + ox, height / 2 - 2.0, oz));
      }
    }
    for (let y = -1.5; y <= height - 2.5; y += 1.8) {
      g.add(at(box(0.7, 0.08, 0.7, alum), sx, y, 0));
      g.add(at(cyl(0.035, 0.035, 1.9, alum, 6), sx, y + 0.9, 0.32, 0, 0, 0.38));
    }
  }
  // Overhead horizontal 4-chord lattice span
  const topY = height - 2.0;
  for (const oy of [-0.32, 0.32]) {
    for (const oz of [-0.32, 0.32]) {
      g.add(at(cyl(0.06, 0.06, width + 0.8, alum, 6), 0, topY + oy, oz, 0, 0, Math.PI / 2));
    }
  }
  for (let x = -halfW + 1.0; x < halfW; x += 2.2) {
    g.add(at(box(0.08, 0.72, 0.72, alum), x, topY, 0));
  }
  // Mounted studio PAR floodlight cans aimed down at the dock
  for (let lx = -halfW + 3.5; lx <= halfW - 3.5; lx += 5.5) {
    g.add(at(cyl(0.28, 0.22, 0.6, darkHousing, 10), lx, topY - 0.65, 0.35, 0.55, 0, 0));
    g.add(at(cyl(0.24, 0.24, 0.06, lampGlow, 10), lx, topY - 0.85, 0.56, 0.55, 0, 0));
  }
  return g;
}

/** Builds a realistic multi-tier stadium poolside grandstand with scaffolding, bucket seats, stairs, rails & awning! */
function buildPoolGrandstand(side, bx, teamColor, teamLabel, disposables, spectators) {
  const stand = new THREE.Group();
  stand.position.set(bx, POOL_Y + 1.5, -4);
  stand.rotation.y = side === -1 ? Math.PI / 2 : -Math.PI / 2;

  const steelMat = mat('#adb5bd', { roughness: 0.32, metalness: 0.82 });
  const deckMat = mat('#dee2e6', { roughness: 0.55, metalness: 0.35 });
  const riserMat = mat('#495057', { roughness: 0.72 });
  const seatMat = mat(teamColor, { roughness: 0.45 });
  const yellowStep = mat('#ffd43b', { roughness: 0.4 });
  const standW = 24;

  // Under-bleacher steel support columns & diagonal X-bracing
  for (const px of [-11.2, -5.6, 0, 5.6, 11.2]) {
    stand.add(at(cyl(0.14, 0.16, 4.2, steelMat, 8), px, 2.1, -3.6));
    stand.add(at(cyl(0.12, 0.14, 2.4, steelMat, 8), px, 1.2, -1.6));
    stand.add(at(box(0.55, 0.22, 0.55, mat('#868e96')), px, 0.11, -3.6));
  }
  // Front TV team banner fascia along the bottom skirt
  const fasciaTex = canvasTexture(512, 96, (ctx, w, h) => {
    ctx.fillStyle = teamColor;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#ffd43b';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 42px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(teamLabel, w / 2, h / 2 + 2);
  });
  const fasciaMat = new THREE.MeshStandardMaterial({ map: fasciaTex, roughness: 0.45 });
  disposables.push(fasciaTex, fasciaMat);
  stand.add(at(plane(standW, 1.35, fasciaMat), 0, 0.82, 1.02));

  // 3 stepped tiers with aluminum tread decks, risers, individual bucket seats & center aisle stairs
  for (let row = 0; row < 3; row++) {
    const ry = 1.15 + row * 1.22;
    const rz = -row * 1.48;
    stand.add(at(box(standW, 0.22, 1.48, deckMat), 0, ry, rz));
    stand.add(at(box(standW, 1.05, 0.14, riserMat), 0, ry - 0.55, rz + 0.72));
    // Center aisle staircase step with yellow safety nosing
    stand.add(at(box(2.1, 0.26, 1.54, mat('#343a40')), 0, ry + 0.02, rz));
    stand.add(at(box(2.1, 0.08, 0.16, yellowStep), 0, ry + 0.14, rz + 0.74));

    // 10 molded individual stadium bucket seats (5 left + 5 right of center aisle)
    const seatXs = [-10.4, -8.3, -6.2, -4.1, -2.0, 2.0, 4.1, 6.2, 8.3, 10.4];
    seatXs.forEach((sx, seatIdx) => {
      // Bucket seat pan + curved backrest
      stand.add(at(box(1.35, 0.14, 0.86, seatMat), sx, ry + 0.24, rz + 0.1));
      stand.add(at(box(1.35, 0.82, 0.14, seatMat), sx, ry + 0.62, rz - 0.36, -0.14, 0, 0));
      // Cheering Chesapeake Dev Derby wildlife fan seated cleanly in the bucket seat!
      const kind = AUDIENCE_KINDS[(seatIdx + row * 3 + (side > 0 ? 5 : 0)) % AUDIENCE_KINDS.length];
      const { object: fan, tick } = kind.build();
      fan.scale.setScalar(0.66 * (kind.scale ?? 1));
      fan.position.set(sx, ry + 0.34, rz + 0.06);
      fan.rotation.y = Math.PI;
      stand.add(fan);
      spectators.push({ obj: fan, tick, baseY: ry + 0.34, phase: (seatIdx + row) * 0.7 + side });
    });
  }

  // Tubular chrome safety guardrails (front, sides & top back rail)
  stand.add(at(cyl(0.055, 0.055, standW, steelMat, 8), 0, 2.35, 0.76, 0, 0, Math.PI / 2));
  for (let gx = -11.8; gx <= 11.8; gx += 4.72) {
    stand.add(at(cyl(0.05, 0.05, 1.2, steelMat, 8), gx, 1.75, 0.76));
  }
  stand.add(at(cyl(0.055, 0.055, standW, steelMat, 8), 0, 5.2, -3.65, 0, 0, Math.PI / 2));

  // Angled striped stadium sun-canopy roof supported by steel stanchions!
  const canopyTex = canvasTexture(512, 128, (ctx, w, h) => {
    const stripes = 12;
    for (let i = 0; i < stripes; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#ffffff' : teamColor;
      ctx.fillRect((i / stripes) * w, 0, w / stripes + 1, h);
    }
  });
  const canopyMat = new THREE.MeshStandardMaterial({ map: canopyTex, roughness: 0.65, side: THREE.DoubleSide });
  disposables.push(canopyTex, canopyMat);
  for (const cx of [-11.4, -3.8, 3.8, 11.4]) {
    stand.add(at(cyl(0.09, 0.1, 4.6, steelMat, 8), cx, 5.8, -3.6));
  }
  stand.add(at(box(standW + 0.8, 0.14, 5.8, canopyMat), 0, 8.2, -1.35, 0.14, 0, 0));
  stand.add(at(box(standW + 0.8, 0.55, 0.12, seatMat), 0, 7.6, 1.52));

  return stand;
}

/** Builds a sunny daytime Outdoor Japanese TV Game-Show Poolside Set! */
function buildNokabeArena(scene, dockHalfW, disposables) {
  scene.background = new THREE.Color('#8ecae6');
  scene.fog = new THREE.Fog('#c8e6fa', 70, 195);

  // Bright natural outdoor daylight + warm sun key + pool bounce light
  scene.add(new THREE.HemisphereLight('#ffffff', '#4dabf7', 1.25));
  const sun = new THREE.DirectionalLight('#fffbe8', 1.75);
  sun.position.set(22, 38, 26);
  scene.add(sun);

  // Sunny sky dome with cumulus clouds
  const skyTex = makeDaySkyTexture();
  const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false });
  const skyGeo = new THREE.SphereGeometry(170, 24, 16);
  scene.add(new THREE.Mesh(skyGeo, skyMat));
  disposables.push(skyTex, skyMat, skyGeo);

  const poolW = dockHalfW * 2 + 18;
  const poolZMin = -15;
  const poolZMax = 31;
  const poolLen = poolZMax - poolZMin;
  const poolCenterZ = (poolZMin + poolZMax) / 2;
  const deckTopY = POOL_Y + 1.6;

  // Surrounding resort green lawn built as 4 aprons OUTSIDE the pool so the water is 100% open & visible!
  const grassMat = mat('#51a351', { roughness: 0.92 });
  const lawnY = deckTopY - 0.08;
  scene.add(at(plane(240, 100, grassMat), 0, lawnY, poolZMax + 55, -Math.PI / 2, 0, 0));
  scene.add(at(plane(240, 100, grassMat), 0, lawnY, poolZMin - 55, -Math.PI / 2, 0, 0));
  scene.add(at(plane(100, poolLen + 20, grassMat), -poolW / 2 - 56, lawnY, poolCenterZ, -Math.PI / 2, 0, 0));
  scene.add(at(plane(100, poolLen + 20, grassMat), poolW / 2 + 56, lawnY, poolCenterZ, -Math.PI / 2, 0, 0));

  // Sparkling sunlit turquoise swimming pool recessed cleanly below the white pool coping deck!
  const poolTex = makePoolWaterTexture();
  const poolMat = new THREE.MeshStandardMaterial({
    map: poolTex,
    roughness: 0.14,
    metalness: 0.16,
    emissive: '#15aabf',
    emissiveIntensity: 0.28,
  });
  disposables.push(poolTex, poolMat);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(poolW, poolLen), poolMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(0, POOL_Y, poolCenterZ);
  scene.add(pool);

  // Crisp white resort concrete coping apron & inner blue ceramic pool basin walls
  const copingMat = mat('#f1f5f9', { roughness: 0.58 });
  const tileBlue = mat('#1c7ed6', { roughness: 0.4 });
  scene.add(at(box(poolW + 14, 1.9, 6.5, copingMat), 0, POOL_Y + 0.65, poolZMax + 3.25));
  scene.add(at(box(6.5, 1.9, poolLen + 14, copingMat), -poolW / 2 - 3.25, POOL_Y + 0.65, poolCenterZ));
  scene.add(at(box(6.5, 1.9, poolLen + 14, copingMat), poolW / 2 + 3.25, POOL_Y + 0.65, poolCenterZ));
  // Blue water-line ceramic pool rim trim right around the recessed water edge
  scene.add(at(box(poolW + 0.4, 0.55, 0.35, tileBlue), 0, POOL_Y + 0.28, poolZMax));
  scene.add(at(box(0.35, 0.55, poolLen, tileBlue), -poolW / 2, POOL_Y + 0.28, poolCenterZ));
  scene.add(at(box(0.35, 0.55, poolLen, tileBlue), poolW / 2, POOL_Y + 0.28, poolCenterZ));

  // Stainless-steel pool entry ladders & floating red-and-white safety buoy rope
  const ladderChrome = mat('#e9ecef', { roughness: 0.18, metalness: 0.92 });
  for (const sx of [-1, 1]) {
    const lx = sx * (poolW / 2 - 0.15);
    scene.add(at(cyl(0.06, 0.06, 3.2, ladderChrome, 8), lx, POOL_Y + 1.4, 12.2));
    scene.add(at(cyl(0.06, 0.06, 3.2, ladderChrome, 8), lx, POOL_Y + 1.4, 13.4));
    for (const ry of [0.3, 0.9, 1.5]) {
      scene.add(at(box(0.14, 0.06, 1.2, ladderChrome), lx - sx * 0.1, POOL_Y + ry, 12.8));
    }
  }
  const buoyCount = 16;
  for (let i = 0; i < buoyCount; i++) {
    const bx = -poolW / 2 + 1.2 + (i / (buoyCount - 1)) * (poolW - 2.4);
    scene.add(at(cyl(0.18, 0.18, 0.42, mat(i % 2 === 0 ? '#ff4d4f' : '#ffffff', { roughness: 0.35 }), 10), bx, POOL_Y + 0.06, 22, 0, 0, Math.PI / 2));
  }

  // Realistic Non-Slip Charcoal TV Game-Show Stage Dock with Hazard Chevrons & Steel Support Pilings!
  const dockW = dockHalfW * 2 + 1.2;
  const stageBlue = mat('#1971c2', { roughness: 0.38 });
  const stageRed = mat('#e03131', { roughness: 0.4 });
  const dockTex = makeStageDockTexture();
  const dockTopMat = new THREE.MeshStandardMaterial({ map: dockTex, roughness: 0.65, metalness: 0.08 });
  const dockSideMat = mat('#343a40', { roughness: 0.45, metalness: 0.55 });
  disposables.push(dockTex, dockTopMat);
  const dockGeo = new THREE.BoxGeometry(dockW, 0.46, 4.6);
  const dockMesh = new THREE.Mesh(dockGeo, [dockSideMat, dockSideMat, dockTopMat, dockSideMat, dockSideMat, dockSideMat]);
  dockMesh.position.set(0, -0.23, DOCK_Z);
  scene.add(dockMesh);
  disposables.push(dockGeo);
  // Brushed steel structural I-beams & pilings descending from the stage deck into the turquoise pool!
  const pilingMat = mat('#495057', { roughness: 0.4, metalness: 0.78 });
  for (const px of [-dockHalfW + 0.8, 0, dockHalfW - 0.8]) {
    scene.add(at(cyl(0.28, 0.32, Math.abs(POOL_Y) + 0.5, pilingMat, 12), px, POOL_Y / 2 - 0.1, DOCK_Z));
  }
  scene.add(at(box(0.35, 0.52, 4.7, stageRed), -dockW / 2 - 0.15, -0.22, DOCK_Z));
  scene.add(at(box(0.35, 0.52, 4.7, stageRed), dockW / 2 + 0.15, -0.22, DOCK_Z));

  // Twin brushed-steel sliding wall rails & white-and-blue striped TV runway deck
  const railMat = mat('#e2e8f0', { roughness: 0.24, metalness: 0.86 });
  for (const rx of [-dockHalfW - 1.1, dockHalfW + 1.1]) {
    scene.add(at(box(0.42, 0.28, 44, railMat), rx, -0.05, -14));
    scene.add(at(box(0.14, 0.1, 44, stageRed), rx, 0.12, -14));
  }
  scene.add(at(box(dockW + 2.6, 0.34, 36, mat('#e9ecef', { roughness: 0.55 })), 0, -0.24, -20));
  scene.add(at(box(0.6, 0.36, 36, stageBlue), -dockHalfW + 0.5, -0.23, -20));
  scene.add(at(box(0.6, 0.36, 36, stageBlue), dockHalfW - 0.5, -0.23, -20));

  // Authentic Open-Lattice Aluminum TV Truss Launch Arches & Sunburst Marquee
  scene.add(buildOpenTrussArch(dockW + 12, 16.5, -34));
  scene.add(buildOpenTrussArch(dockW + 12, 16.5, -18));
  const signTex = makeStudioSignTexture();
  const signMat = new THREE.MeshBasicMaterial({ map: signTex });
  disposables.push(signTex, signMat);
  scene.add(at(plane(24, 5.6, signMat), 0, 10.6, -33.6));

  // Poolside TV broadcast cameras, striped resort umbrellas with sun loungers & coastal palm trees!
  scene.add(buildTvCameraRig(-poolW / 2 - 2.6, 8.0, 1.15));
  scene.add(buildTvCameraRig(poolW / 2 + 2.6, 8.0, -1.15));
  scene.add(buildPoolUmbrella(-poolW / 2 - 3.6, 19.5, '#e03131', disposables));
  scene.add(buildPoolUmbrella(poolW / 2 + 3.6, 19.5, '#1971c2', disposables));
  scene.add(buildPoolUmbrella(-poolW / 2 - 3.6, -23.5, '#f08c00', disposables));
  scene.add(buildPoolUmbrella(poolW / 2 + 3.6, -23.5, '#2f9e44', disposables));
  for (const [px, pz, ph] of [
    [-poolW / 2 - 16, -28, 12.5], [poolW / 2 + 16, -28, 13.0],
    [-poolW / 2 - 17, 14, 11.5], [poolW / 2 + 17, 14, 12.0],
    [-10, -44, 13.5], [10, -44, 12.8],
  ]) {
    scene.add(buildPalmTree(px, pz, ph));
  }

  // Realistic Multi-Tier Stadium Poolside Grandstands (Red Team vs. Blue Team) with cheering wildlife!
  const spectators = [];
  scene.add(buildPoolGrandstand(-1, -(poolW / 2 + 9.2), '#e03131', 'RED TEAM · 脳壁', disposables, spectators));
  scene.add(buildPoolGrandstand(1, poolW / 2 + 9.2, '#1971c2', 'BLUE TEAM · 脳壁', disposables, spectators));

  return { poolMat, dockHalfW, spectators };
}

// ------------------------------------------------------------------ Lobby 3D Stage

export class NokabeStage {
  constructor(aspect = 16 / 9, initialNames = [], { duration = DEFAULT_NOKABE_DURATION } = {}) {
    this.t = 0;
    this.names = [];
    this.models = [];
    this.disposables = [];
    const previewSim = new NokabeSim({ names: initialNames.length >= 2 ? initialNames : ['Ada', 'Grace'], duration });

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(46, aspect, 0.3, 180);
    this.arena = buildNokabeArena(this.scene, previewSim.dockHalfW, this.disposables);

    // Show a sample hollow T-Pose styrofoam wall poised down the steel rails!
    this.sampleWall = buildCutoutWall(previewSim.walls[0], previewSim.dockHalfW, this.disposables);
    this.sampleWall.position.z = -15;
    this.sampleWall.visible = true;
    this.scene.add(this.sampleWall);

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

    const colors = ['#ff4d6d', '#38bdf8', '#4ade80', '#facc15', '#c084fc', '#fb923c'];
    const n = Math.max(1, names.length);
    names.forEach((name, i) => {
      const x = n === 1 ? 0 : -this.arena.dockHalfW * 0.78 + (i / (n - 1)) * (this.arena.dockHalfW * 1.56);
      const kind = DEVELOPER_KINDS[i % DEVELOPER_KINDS.length];
      const dev = buildSilverDev(name, kind, colors[i % colors.length], this.disposables);
      dev.root.position.set(x, 0, DOCK_Z);
      this.scene.add(dev.root);
      this.models.push({ ...dev, phase: i * 0.8 });
    });
  }

  update(dt, reduced = false) {
    if (!reduced) this.t += dt;
    const t = this.t;
    for (const m of this.models) {
      if (!reduced) {
        m.leftArmPivot.rotation.z = 1.2 + Math.sin(t * 3.0 + m.phase) * 0.35;
        m.rightArmPivot.rotation.z = -1.2 - Math.sin(t * 3.0 + m.phase) * 0.35;
        m.torsoPivot.rotation.z = Math.sin(t * 2.1 + m.phase) * 0.12;
      }
    }
    if (!reduced) {
      for (const s of this.arena.spectators) {
        s.obj.position.y = s.baseY + Math.max(0, Math.sin(t * 4.2 + s.phase)) * 0.22;
        s.tick?.(t + s.phase);
      }
    }
    const ang = reduced ? 0.38 : Math.sin(t * 0.25) * 0.55;
    this.camera.position.set(Math.sin(ang) * 19.5, 8.2, Math.cos(ang) * 19.5);
    this.camera.lookAt(0, 2.2, -5.0);
  }

  dispose() {
    for (const d of this.disposables) d.dispose?.();
  }
}

// ------------------------------------------------------------------ Live Match

export class NokabeMatch {
  constructor(names, { duration = DEFAULT_NOKABE_DURATION, rule = DEFAULT_NOKABE_RULE, rng = Math.random, sfx = null, onEvent = null, onWinner = null } = {}) {
    this.sim = new NokabeSim({ names, duration, rule, rng });
    this.sfx = sfx;
    this.onEvent = onEvent;
    this.onWinner = onWinner;
    this.accumulator = 0;
    this.victoryTime = 0;
    this.shake = 0;
    this.winnerAnnounced = false;
    this.splashRings = [];
    this.disposables = [];

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.3, 180);
    this.arena = buildNokabeArena(this.scene, this.sim.dockHalfW, this.disposables);
    this.particles = new Particles(this.scene);

    this.wallMeshes = this.sim.walls.map((w) => {
      const m = buildCutoutWall(w, this.sim.dockHalfW, this.disposables);
      this.scene.add(m);
      return { sim: w, mesh: m };
    });

    this.devVisuals = this.sim.devs.map((d, i) => {
      const kind = DEVELOPER_KINDS[i % DEVELOPER_KINDS.length];
      const vis = buildSilverDev(d.name, kind, d.color, this.disposables);
      vis.root.position.set(d.x, d.y, d.z);
      this.scene.add(vis.root);
      return { sim: d, ...vis };
    });

    this.camPos = new THREE.Vector3(10, 8.4, 16.5);
    this.camLook = new THREE.Vector3(0, 2.0, -4.0);
    this.resize(window.innerWidth / window.innerHeight);
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 1 ? 60 : 46;
    this.camera.updateProjectionMatrix();
  }

  spawnSplashRing(x, z) {
    const rMat = new THREE.MeshBasicMaterial({ color: '#a5f3fc', transparent: true, opacity: 0.9, side: THREE.DoubleSide });
    const rGeo = new THREE.RingGeometry(0.4, 0.72, 28);
    const mesh = new THREE.Mesh(rGeo, rMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, POOL_Y + 0.08, z);
    this.scene.add(mesh);
    this.splashRings.push({ mesh, geo: rGeo, mat: rMat, age: 0, maxAge: 0.75 });
  }

  update(realDt) {
    const lastWall = this.sim.walls.at(-1);
    const inFinalSlowMo = lastWall && lastWall.active && !lastWall.passed && lastWall.z > -8.0 && !this.sim.done;
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

    // Sync sliding hollow cutout walls
    for (const wm of this.wallMeshes) {
      wm.mesh.visible = wm.sim.active;
      if (wm.sim.active) {
        wm.mesh.position.z = wm.sim.z;
        wm.mesh.position.x = wm.sim.shifted ? wm.sim.goalpostShift : 0;
      }
    }

    // Sync silver-spandex devs, 4-DOF poses, tumbling flights & duck-ring pool bobbing!
    for (const dv of this.devVisuals) {
      const d = dv.sim;
      const winHop = this.sim.winner === d && d.state === 'dock' ? Math.abs(Math.sin(this.victoryTime * 6.5)) * 0.6 : 0;
      dv.root.position.set(d.x, d.y + winHop, d.z);
      dv.duckRing.visible = d.state === 'swimming';

      if (d.state === 'flying') {
        dv.body.rotation.x -= realDt * 6.8;
        dv.body.rotation.z += realDt * 3.5;
      } else if (d.state === 'swimming') {
        dv.body.rotation.x = 0;
        dv.body.rotation.z = Math.sin(t * 3 + d.bobPhase) * 0.14;
        dv.leftArmPivot.rotation.z = 2.2 + Math.sin(t * 5 + d.bobPhase) * 0.35;
        dv.rightArmPivot.rotation.z = -2.2 - Math.sin(t * 5 + d.bobPhase) * 0.35;
      } else {
        dv.body.rotation.x = 0;
        const wob = d.wobbleT > 0 ? Math.sin(t * 28) * 0.35 * d.wobbleT : 0;
        dv.body.rotation.z = wob;
        dv.torsoPivot.rotation.z = d.pose.torso;
        dv.leftArmPivot.rotation.z = this.sim.winner === d ? 2.5 : d.pose.leftArm;
        dv.rightArmPivot.rotation.z = this.sim.winner === d ? -2.5 : d.pose.rightArm;
        dv.leftLegPivot.rotation.z = -d.pose.legs;
        dv.rightLegPivot.rotation.z = d.pose.legs;
      }
    }

    // Animate water splash rings
    for (let i = this.splashRings.length - 1; i >= 0; i--) {
      const sr = this.splashRings[i];
      sr.age += realDt;
      const p = sr.age / sr.maxAge;
      if (p >= 1) {
        this.scene.remove(sr.mesh);
        sr.geo.dispose();
        sr.mat.dispose();
        this.splashRings.splice(i, 1);
      } else {
        const s = 1 + p * 4.5;
        sr.mesh.scale.set(s, s, 1);
        sr.mat.opacity = (1 - p) * 0.85;
      }
    }

    // Cheering poolside bleachers bounce faster when someone gets splashed or wins!
    const cheerAmp = this.sim.done ? 0.42 : 0.24;
    for (const s of this.arena.spectators) {
      s.obj.position.y = s.baseY + Math.max(0, Math.sin(t * 6.0 + s.phase)) * cheerAmp;
      s.tick?.(t + s.phase);
    }

    this.particles.update(realDt);

    // Dynamic Camera: 3/4 Diagonal Studio -> Rail-Side Macro Slow-Mo -> 360° Victory Orbit
    if (this.shake > 0) this.shake = Math.max(0, this.shake - realDt * 4.0);
    const kickY = Math.sin(t * 48) * this.shake * 0.55;
    const wantPos = new THREE.Vector3();
    const wantLook = new THREE.Vector3(0, 1.8, -3.5);

    if (this.sim.winner) {
      const orbitAng = this.victoryTime * 0.42;
      wantPos.set(this.sim.winner.x + Math.sin(orbitAng) * 11.2, 5.2, this.sim.winner.z + Math.cos(orbitAng) * 11.2);
      wantLook.set(this.sim.winner.x, 1.4, this.sim.winner.z);
    } else if (inFinalSlowMo) {
      wantPos.set(this.sim.dockHalfW + 5.5, 3.6, 5.5);
      wantLook.set(0, 1.8, -1.0);
    } else {
      const side = Math.sin(t * 0.25) * 4.5 + 7.5;
      wantPos.set(side, 7.8 + kickY, 15.8);
    }

    this.camPos.lerp(wantPos, Math.min(1, realDt * 4.5));
    this.camLook.lerp(wantLook, Math.min(1, realDt * 5.0));
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
  }

  handleEvent(e) {
    if (e.type === 'wallStart') {
      this.sfx?.play?.('nokabeKlaxon');
      const label = e.wall.isFinal ? 'FINAL BOSS WALL!' : `WALL ${e.wall.index + 1}: ${e.wall.label}`;
      this.onEvent?.({
        type: 'status',
        text: `📺 KABE GA KURU YO! ${label} · DRY: ${e.remaining} / ${this.sim.devs.length}`,
        tone: e.wall.isFinal ? 'red' : 'yellow',
      });
      this.onEvent?.({ type: 'note', text: `🚨 KABE GA KURU YO! ${label} incoming!`, important: true });
    } else if (e.type === 'goalpost') {
      this.onEvent?.({ type: 'note', text: '⚡ MID-SPRINT SCOPE PIVOT — cutout shifted sideways!', important: true });
    } else if (e.type === 'graze') {
      this.sfx?.play?.('nokabeBonk');
      this.particles.burst(new THREE.Vector3(e.dev.x, 1.5, e.dev.z), {
        count: 14,
        colors: ['#ffffff', '#f1f5f9', '#e2e8f0'],
        speed: 4.5,
        up: 4.0,
        life: 0.65,
        size: 0.16,
        gravity: 11,
      });
      this.onEvent?.({ type: 'note', text: `✨ KIRI-KIRI CLEAR! ${e.dev.name}: “${e.popup}”`, important: false });
    } else if (e.type === 'crunch') {
      this.sfx?.play?.('nokabeBonk');
      this.shake = Math.max(this.shake, 0.7);
      this.particles.burst(new THREE.Vector3(e.dev.x, 1.4, e.dev.z), {
        count: 18,
        colors: ['#ffffff', '#e2e8f0', '#ff2a85'],
        speed: 5.5,
        up: 4.5,
        life: 0.7,
        size: 0.18,
        gravity: 12,
      });
      this.onEvent?.({
        type: 'status',
        text: `📺 DRY SURVIVORS: ${e.remaining} / ${this.sim.devs.length}`,
        tone: e.remaining <= 3 ? 'red' : 'yellow',
      });
      this.onEvent?.({ type: 'note', text: `💥 ${e.dev.name} WALL-CRUNCHED: “${e.popup}”`, important: false });
    } else if (e.type === 'splash') {
      this.sfx?.play?.('nokabeSplash');
      this.spawnSplashRing(e.x, e.z);
      this.particles.burst(new THREE.Vector3(e.x, POOL_Y + 0.3, e.z), {
        count: 20,
        colors: ['#a5f3fc', '#22d3ee', '#ffffff'],
        speed: 5.2,
        up: 7.2,
        life: 0.8,
        size: 0.18,
        gravity: 14,
      });
    } else if (e.type === 'wallClear' && e.waveDunks === 0) {
      this.sfx?.play?.('nokabePinPon');
    } else if (e.type === 'winner' && !this.winnerAnnounced) {
      this.winnerAnnounced = true;
      this.sfx?.play?.('nokabeWin');
      this.sfx?.fanfare?.();
      this.particles.burst(new THREE.Vector3(e.dev.x, 1.8, e.dev.z), {
        count: 72,
        colors: ['#ffd43b', '#ff2a85', '#22d3ee', '#4ade80', '#ffffff'],
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
    for (const sr of this.splashRings) {
      sr.geo.dispose();
      sr.mat.dispose();
    }
    for (const d of this.disposables) d.dispose?.();
  }
}
