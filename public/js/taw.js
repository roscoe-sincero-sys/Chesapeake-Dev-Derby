// "Schoolyard Taw Knockout" (Ring-Out): twilight Guyanese schoolyard packed-earth ring
// with glowing white-and-cyan shrinking chalk circle, scattered yard pebbles & bottle caps,
// concrete curbing, animated Claw-of-Destiny bobblehead devs ricocheting in elastic collisions,
// rogue mirror-chrome STEELIE BOLER boss marble, crystalline collision sparks,
// slow-motion chalk-rim finale, and 360-degree victory orbit!

import * as THREE from 'three';
import { mat, box, ball, cyl, torus, plane, at, canvasTexture, FONT_UI, FONT_MONO, roundRect } from './util3d.js';
import { Particles } from './effects.js';
import { DEVELOPER_KINDS } from './deathmatch-sim.js';
import {
  TawSim,
  MARBLE_RADIUS,
  STEELIE_RADIUS,
  DEFAULT_TAW_DURATION,
  DEFAULT_TAW_RULE,
} from './taw-sim.js';

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

/** Draws the Wall 1 conference-room whiteboard: a fresh, funny 6-step SOC AUDIT LOG PLAN! */
function makeTawSocWhiteboardTexture() {
  return canvasTexture(1024, 512, (ctx, w, h) => {
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#f8fafc');
    bg.addColorStop(1, '#eef2f6');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Subtle dry-erase ghosting
    ctx.fillStyle = 'rgba(180, 198, 218, 0.14)';
    ctx.fillRect(54, 118, 460, 44);
    ctx.fillRect(500, 286, 380, 40);

    // Header (blue dry-erase marker)
    ctx.fillStyle = '#1864ab';
    ctx.font = `900 34px ${FONT_UI}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('SOC AUDIT LOG PLAN', 36, 48);

    // Red dry-erase underline + cheeky stamp
    ctx.strokeStyle = '#c92a2a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(34, 70);
    ctx.lineTo(440, 70);
    ctx.stroke();

    ctx.save();
    ctx.translate(874, 56);
    ctx.rotate(-0.08);
    ctx.strokeStyle = '#c92a2a';
    ctx.lineWidth = 4;
    roundRect(ctx, -106, -24, 212, 48, 8);
    ctx.stroke();
    ctx.fillStyle = '#c92a2a';
    ctx.font = `900 22px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText('TOP SECRET!', 0, 2);
    ctx.restore();

    // Subtitle
    ctx.fillStyle = '#495057';
    ctx.font = `700 21px ${FONT_UI}`;
    ctx.textAlign = 'left';
    ctx.fillText('6-step playbook for the quarterly SOC walkthrough:', 36, 102);

    // Different set of 6 funny steps
    const items = [
      ['1.', 'Tell SOC logs use "eventual consistency" (ETA: June 2046).'],
      ['2.', 'Pipe userLogin.log straight into /dev/null'],
      ['3.', 'Timestamps -> NTP drift back to 1998 ("Y2K ready!").'],
      ['4.', 'Rename 47GB of eventLog logs -> Q3_voting_Signups_FINAL_v2.xlsx'],
      ['5.', 'Ask SOC to file a ServiceDesk ticket in Legacy Backlog, then close Won\'t Fix.'],
      ['6.', 'MUTE Slack & hide PagerDuty BEFORE screen-sharing with the auditor!!'],	 	  
    ];
    let y = 148;
    for (let i = 0; i < items.length; i++) {
      ctx.fillStyle = i === 5 ? '#c92a2a' : '#1864ab';
      ctx.font = `900 24px ${FONT_MONO}`;
      ctx.fillText(items[i][0], 40, y);
      ctx.fillStyle = i === 5 ? '#a61e4d' : '#212529';
      ctx.font = `700 22px ${FONT_UI}`;
      ctx.fillText(items[i][1], 84, y);
      y += 46;
    }

    // Bottom red warning box
    ctx.fillStyle = '#fff5f5';
    roundRect(ctx, 36, 424, w - 72, 62, 12);
    ctx.fill();
    ctx.strokeStyle = '#e03131';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = '#c92a2a';
    ctx.font = `900 24px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText('REMINDER: Audit logs ARE running 24/7 — ACT SURPRISED!', w / 2, 456);	
  });
}

/** Builds an ergonomic office conference chair tucked around the boardroom table. */
function buildOfficeChair(x, z, rotY) {
  const g = new THREE.Group();
  g.position.set(x, -5.2, z);
  g.rotation.y = rotY;
  const fabric = mat('#2b303a', { roughness: 0.85 });
  const chrome = mat('#adb5bd', { roughness: 0.25, metalness: 0.85 });
  g.add(at(cyl(0.14, 0.14, 2.1, chrome, 8), 0, 1.05, 0));
  g.add(at(cyl(1.05, 1.15, 0.16, chrome, 5), 0, 0.12, 0));
  g.add(at(box(2.1, 0.28, 2.0, fabric), 0, 2.2, 0));
  g.add(at(box(1.95, 2.5, 0.24, fabric), 0, 3.55, -0.92, -0.1, 0, 0));
  g.add(at(box(0.16, 0.72, 1.3, fabric), -1.0, 2.75, -0.15));
  g.add(at(box(0.16, 0.72, 1.3, fabric), 1.0, 2.75, -0.15));
  return g;
}

/** Wall-mounted 4K conference room TV screen texture. */
function makeBoardroomTvTexture() {
  return canvasTexture(1024, 512, (ctx, w, h) => {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, w, 74);
    ctx.fillStyle = '#38bdf8';
    ctx.font = `900 32px ${FONT_MONO}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('● LIVE · BOARDROOM TAW KNOCKOUT', 34, 38);
    ctx.fillStyle = '#51cf66';
    ctx.font = `800 24px ${FONT_MONO}`;
    ctx.textAlign = 'right';
    ctx.fillText('SOC AUDIT: "PENDING"', w - 34, 38);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#f8fafc';
    ctx.font = `800 44px ${FONT_UI}`;
    ctx.fillText('Executive Ring-Out Protocol', 44, 152);
    ctx.fillStyle = '#94a3b8';
    ctx.font = `600 26px ${FONT_UI}`;
    ctx.fillText('• Stay inside the glowing chalk circle on the walnut table', 44, 224);
    ctx.fillText('• Watch out for the rogue chrome STEELIE BOLER', 44, 274);
    ctx.fillText('• Last bobblehead inside the ring leads today\'s standup', 44, 324);

    ctx.fillStyle = '#172554';
    roundRect(ctx, 44, 382, w - 88, 86, 14);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#bae6fd';
    ctx.font = `800 26px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText('CONFERENCE ROOM B · DO NOT ERASE WHITEBOARD!', w / 2, 426);
  });
}

/** Upright high-contrast bobblehead nameplate sprite. */
function makeMarbleTag(name, color, y = 2.45) {
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
  sprite.position.set(0, y, 0);
  return { sprite, tex, spriteMat };
}

/**
 * Builds a Claw-of-Destiny developer bobblehead inside a glossy rolling gachapon marble capsule
 * (matching RTO Mini-Golf): outer `shell` rolls with velocity while inner `bobble` stays upright
 * and wobbles dynamically!
 */
function buildTawBobblehead(name, kind, color, disposables) {
  const root = new THREE.Group();
  const shell = new THREE.Group();
  const accent = kind.accent ?? color;

  // Lower colored capsule hemisphere
  const bottomGeo = new THREE.SphereGeometry(MARBLE_RADIUS, 18, 12, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5);
  const bottomMat = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.32, metalness: 0.16 });
  shell.add(new THREE.Mesh(bottomGeo, bottomMat));

  // Upper crystal-clear glass dome
  const topGeo = new THREE.SphereGeometry(MARBLE_RADIUS, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const topMat = new THREE.MeshStandardMaterial({
    color: '#e8f4ff',
    roughness: 0.1,
    metalness: 0.12,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
  });
  shell.add(new THREE.Mesh(topGeo, topMat));

  // Equatorial white seam ring
  shell.add(at(torus(MARBLE_RADIUS * 1.005, 0.028, mat('#f8f9fa', { roughness: 0.3 })), 0, 0, 0, Math.PI / 2, 0, 0));
  root.add(shell);

  // Upright spring-mounted developer bobblehead portrait (matches RTO Mini-Golf & Claw of Destiny)
  const bobble = new THREE.Group();
  const scale = MARBLE_RADIUS / 0.62;
  bobble.scale.setScalar(scale);
  const neck = at(cyl(0.06, 0.08, 0.22, mat(kind.shirt ?? '#343a40')), 0, -0.24, 0);
  const rim = at(cyl(0.41, 0.41, 0.12, mat(accent, { roughness: 0.35, metalness: 0.2 }), 24), 0, 0.08, 0, Math.PI / 2, 0, 0);
  const portraitTex = getDeveloperPortraitTexture(kind.id);
  const faceMat = new THREE.MeshStandardMaterial({ map: portraitTex, roughness: 0.32, metalness: 0.05 });
  const faceGeo = new THREE.CircleGeometry(0.38, 24);
  const faceFront = new THREE.Mesh(faceGeo, faceMat);
  faceFront.position.set(0, 0.08, 0.066);
  const faceBack = new THREE.Mesh(faceGeo, faceMat);
  faceBack.rotation.y = Math.PI;
  faceBack.position.set(0, 0.08, -0.066);
  bobble.add(neck, rim, faceFront, faceBack);
  root.add(bobble);

  const tag = makeMarbleTag(name, accent, MARBLE_RADIUS + 0.72);
  root.add(tag.sprite);

  disposables.push(bottomGeo, bottomMat, topGeo, topMat, faceGeo, faceMat, tag.tex, tag.spriteMat);
  return { root, shell, bobble };
}

/**
 * Builds the 3D executive conference room (matching Jenga Connect):
 * - Polished walnut boardroom table right at y = 0 with laptops, coffee mugs & speakerphone
 * - Glowing white-and-cyan shrinking chalk ring on the tabletop
 * - Wall 1 (Back Wall): Giant dry-erase Whiteboard with a fresh funny 6-step SOC AUDIT LOG PLAN
 * - Wall 2 (Right Wall): Giant wall-mounted 4K boardroom TV
 * - Wall 3 (Left Wall): Daylight Chesapeake Bay glass windows
 * - Wall 4 (Front Wall): Boardroom double doors
 */
function buildTawArena(scene, baseRadius, disposables) {
  scene.background = new THREE.Color('#cfd8e3');
  scene.fog = new THREE.Fog('#cfd8e3', 65, 160);

  // Bright natural office + recessed ceiling troffer lighting
  scene.add(new THREE.HemisphereLight('#f4f8ff', '#5c4b3c', 1.15));
  const ceilingLight = new THREE.DirectionalLight('#fff8ec', 1.35);
  ceilingLight.position.set(10, 26, 14);
  scene.add(ceilingLight);
  const windowLight = new THREE.DirectionalLight('#d8ecff', 0.65);
  windowLight.position.set(-22, 14, 4);
  scene.add(windowLight);

  const HALF_W = 30;
  const HALF_D = 28;
  const FLOOR_Y = -5.2;
  const CEIL_Y = 22;
  const ROOM_H = CEIL_Y - FLOOR_Y;
  const WALL_MID_Y = (CEIL_Y + FLOOR_Y) / 2;

  // Office carpet floor with geometric tile weave
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

  // Drop ceiling + recessed LED troffer lights
  const ceilMat = mat('#e9edf2', { roughness: 0.9 });
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(HALF_W * 2, HALF_D * 2), ceilMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = CEIL_Y;
  scene.add(ceil);
  const trofferMat = mat('#ffffff', { emissive: '#fff8e8', emissiveIntensity: 1.1 });
  for (const lx of [-13, 0, 13]) {
    for (const lz of [-11, 9]) {
      scene.add(at(box(5.4, 0.14, 2.2, trofferMat), lx, CEIL_Y - 0.08, lz));
    }
  }

  // Modern conference room walls + walnut wainscoting + dark baseboard
  const wallMat = mat('#dde3ec', { roughness: 0.88 });
  const wainscotMat = mat('#5c3d28', { roughness: 0.65 });
  const trimMat = mat('#2c221c', { roughness: 0.6 });
  // Back wall (Wall 1: Whiteboard wall, z = -HALF_D)
  scene.add(at(plane(HALF_W * 2, ROOM_H, wallMat), 0, WALL_MID_Y, -HALF_D));
  scene.add(at(box(HALF_W * 2, 4.2, 0.18, wainscotMat), 0, FLOOR_Y + 2.1, -HALF_D + 0.09));
  scene.add(at(box(HALF_W * 2, 0.25, 0.24, trimMat), 0, FLOOR_Y + 4.25, -HALF_D + 0.12));
  // Right wall (Wall 2: 4K TV wall, x = +HALF_W)
  scene.add(at(plane(HALF_D * 2, ROOM_H, wallMat), HALF_W, WALL_MID_Y, 0, 0, -Math.PI / 2, 0));
  scene.add(at(box(0.18, 4.2, HALF_D * 2, wainscotMat), HALF_W - 0.09, FLOOR_Y + 2.1, 0));
  scene.add(at(box(0.24, 0.25, HALF_D * 2, trimMat), HALF_W - 0.12, FLOOR_Y + 4.25, 0));
  // Left wall (Wall 3: Daylight Chesapeake Bay windows, x = -HALF_W)
  scene.add(at(plane(HALF_D * 2, ROOM_H, wallMat), -HALF_W, WALL_MID_Y, 0, 0, Math.PI / 2, 0));
  scene.add(at(box(0.18, 4.2, HALF_D * 2, wainscotMat), -HALF_W + 0.09, FLOOR_Y + 2.1, 0));
  const skyWinTex = canvasTexture(1024, 512, (ctx, w, h) => {
    // Rich atmospheric sky gradient -> warm horizon haze -> Chesapeake Bay water
    const skyG = ctx.createLinearGradient(0, 0, 0, h * 0.72);
    skyG.addColorStop(0, '#3a84c8');
    skyG.addColorStop(0.45, '#76b5e8');
    skyG.addColorStop(0.85, '#c4e0f5');
    skyG.addColorStop(1, '#e8eef2');
    ctx.fillStyle = skyG;
    ctx.fillRect(0, 0, w, h * 0.72);

    // Subtle sunlit upper-left glow
    const sunG = ctx.createRadialGradient(w * 0.22, h * 0.16, 12, w * 0.22, h * 0.16, 260);
    sunG.addColorStop(0, 'rgba(255, 250, 232, 0.55)');
    sunG.addColorStop(0.5, 'rgba(255, 245, 220, 0.16)');
    sunG.addColorStop(1, 'rgba(255, 245, 220, 0)');
    ctx.fillStyle = sunG;
    ctx.fillRect(0, 0, w, h * 0.72);

    // Wispy high-altitude cirrus streaks
    ctx.save();
    for (let i = 0; i < 6; i++) {
      const cx = (i * 190 + 90) % w;
      const cy = 42 + (i % 3) * 34;
      const wg = ctx.createLinearGradient(cx - 120, cy, cx + 140, cy + 12);
      wg.addColorStop(0, 'rgba(255,255,255,0)');
      wg.addColorStop(0.45, 'rgba(255,255,255,0.22)');
      wg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = wg;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 130, 8 + (i % 3) * 4, -0.06, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Volumetric layered cumulus clouds (soft shaded underbelly + sunlit bright puffs)
    const drawCloud = (cx, cy, scale) => {
      const puffs = [
        [-68, 12, 48], [-32, -8, 62], [18, -16, 68], [66, -2, 54], [98, 16, 40],
        [-94, 22, 34], [4, 14, 58], [-44, 18, 46], [48, 18, 46],
      ];
      // Soft cool-gray cloud base shadow
      for (const [ox, oy, r] of puffs) {
        const px = cx + ox * scale;
        const py = cy + (oy + 10) * scale;
        const rad = r * scale;
        const g = ctx.createRadialGradient(px, py + rad * 0.15, rad * 0.1, px, py, rad);
        g.addColorStop(0, 'rgba(162, 182, 206, 0.52)');
        g.addColorStop(0.65, 'rgba(176, 194, 214, 0.24)');
        g.addColorStop(1, 'rgba(176, 194, 214, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, rad, 0, Math.PI * 2);
        ctx.fill();
      }
      // Sunlit creamy-white billowy tops
      for (const [ox, oy, r] of puffs) {
        const px = cx + ox * scale;
        const py = cy + oy * scale;
        const rad = r * scale;
        const g = ctx.createRadialGradient(px - rad * 0.22, py - rad * 0.28, rad * 0.08, px, py, rad);
        g.addColorStop(0, 'rgba(255, 254, 250, 0.94)');
        g.addColorStop(0.55, 'rgba(244, 249, 255, 0.62)');
        g.addColorStop(1, 'rgba(235, 244, 252, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, rad, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    drawCloud(210, 158, 1.15);
    drawCloud(555, 118, 0.85);
    drawCloud(825, 168, 1.05);
    drawCloud(410, 232, 0.62);
    drawCloud(960, 224, 0.55);

    // Distant hazy Chesapeake treeline silhouette at the horizon
    ctx.fillStyle = '#5c7c89';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.72);
    for (let x = 0; x <= w; x += 24) {
      ctx.lineTo(x, h * 0.72 - 4 - Math.sin(x * 0.03) * 5 - Math.cos(x * 0.08) * 3);
    }
    ctx.lineTo(w, h * 0.72);
    ctx.closePath();
    ctx.fill();

    // Chesapeake Bay water below horizon with subtle sunlit wave glints
    const waterG = ctx.createLinearGradient(0, h * 0.72, 0, h);
    waterG.addColorStop(0, '#4c869e');
    waterG.addColorStop(0.4, '#326a82');
    waterG.addColorStop(1, '#1d4659');
    ctx.fillStyle = waterG;
    ctx.fillRect(0, h * 0.72, w, h * 0.28);
    ctx.fillStyle = 'rgba(255, 252, 235, 0.16)';
    for (let i = 0; i < 42; i++) {
      const rx = (i * 89) % w;
      const ry = h * 0.74 + ((i * 37) % (h * 0.23));
      ctx.fillRect(rx, ry, 24 + (i % 4) * 14, 2);
    }
  });
  disposables.push(skyWinTex);
  const winMat = new THREE.MeshBasicMaterial({ map: skyWinTex });
  disposables.push(winMat);
  scene.add(at(plane(34, 12.5, winMat), -HALF_W + 0.14, 7.6, 0, 0, Math.PI / 2, 0));
  const mullionMat = mat('#3c4452', { roughness: 0.4, metalness: 0.7 });
  for (const wz of [-17, -5.6, 5.6, 17]) {
    scene.add(at(box(0.32, 13.0, 0.35, mullionMat), -HALF_W + 0.2, 7.6, wz));
  }
  scene.add(at(box(0.35, 0.4, 34.6, mullionMat), -HALF_W + 0.2, 1.3, 0));
  scene.add(at(box(0.35, 0.4, 34.6, mullionMat), -HALF_W + 0.2, 13.9, 0));
  // Front wall (Wall 4: Tall architectural boardroom double doors, z = +HALF_D)
  scene.add(at(plane(HALF_W * 2, ROOM_H, wallMat), 0, WALL_MID_Y, HALF_D, 0, Math.PI, 0));
  scene.add(at(box(HALF_W * 2, 4.2, 0.18, wainscotMat), 0, FLOOR_Y + 2.1, HALF_D - 0.09));
  scene.add(at(box(HALF_W * 2, 0.25, 0.24, trimMat), 0, FLOOR_Y + 4.25, HALF_D - 0.12));
  const DOOR_W = 10.6;
  const DOOR_H = 15.6; // ~3x table height (architectural 8-foot executive double doors)
  const doorMidY = FLOOR_Y + DOOR_H / 2;
  const doorZ = HALF_D - 0.18;
  // Outer dark aluminum/walnut door frame
  scene.add(at(box(DOOR_W + 0.9, DOOR_H + 0.55, 0.34, trimMat), 0, doorMidY + 0.15, doorZ + 0.04));
  // Left & right walnut door leaves with center reveal gap
  scene.add(at(box(DOOR_W / 2 - 0.08, DOOR_H, 0.3, wainscotMat), -DOOR_W / 4 - 0.02, doorMidY, doorZ));
  scene.add(at(box(DOOR_W / 2 - 0.08, DOOR_H, 0.3, wainscotMat), DOOR_W / 4 + 0.02, doorMidY, doorZ));
  // Narrow frosted glass vision panels + brushed chrome handles & kickplates
  const doorGlassMat = mat('#cfe0ee', { roughness: 0.2, metalness: 0.1, emissive: '#9ec5e8', emissiveIntensity: 0.18 });
  const doorChromeMat = mat('#ced4da', { roughness: 0.22, metalness: 0.88 });
  for (const side of [-1, 1]) {
    scene.add(at(box(1.15, 8.6, 0.34, doorGlassMat), side * 1.45, doorMidY + 1.5, doorZ));
    scene.add(at(cyl(0.09, 0.09, 2.3, doorChromeMat, 10), side * 0.52, FLOOR_Y + 6.4, doorZ - 0.28));
    scene.add(at(box(DOOR_W / 2 - 0.36, 1.35, 0.33, doorChromeMat), side * (DOOR_W / 4 + 0.02), FLOOR_Y + 0.72, doorZ));
  }

  // ---- WALL 1 (Back Wall): Giant Dry-Erase Whiteboard with funny 6-step SOC AUDIT LOG PLAN ----
  const wbTex = makeTawSocWhiteboardTexture();
  wbTex.anisotropy = 4;
  disposables.push(wbTex);
  const wbMat = new THREE.MeshStandardMaterial({ map: wbTex, roughness: 0.22, metalness: 0.04 });
  disposables.push(wbMat);
  const wbX = 0;
  const wbY = 6.8;
  const wbZ = -HALF_D + 0.22;
  const wbW = 26.0;
  const wbH = 13.0;
  const alumMat = mat('#ced4da', { roughness: 0.3, metalness: 0.8 });
  scene.add(at(box(wbW + 0.7, wbH + 0.7, 0.26, alumMat), wbX, wbY, wbZ - 0.1));
  scene.add(at(plane(wbW, wbH, wbMat), wbX, wbY, wbZ + 0.05));
  scene.add(at(box(wbW + 0.4, 0.24, 0.72, alumMat), wbX, wbY - wbH / 2 - 0.3, wbZ + 0.28));
  scene.add(at(cyl(0.08, 0.08, 1.1, mat('#c92a2a'), 8), wbX - 5.2, wbY - wbH / 2 - 0.1, wbZ + 0.44, 0, 0, Math.PI / 2));
  scene.add(at(cyl(0.08, 0.08, 1.1, mat('#1864ab'), 8), wbX - 3.6, wbY - wbH / 2 - 0.1, wbZ + 0.44, 0, 0, Math.PI / 2));
  scene.add(at(cyl(0.08, 0.08, 1.1, mat('#212529'), 8), wbX - 2.0, wbY - wbH / 2 - 0.1, wbZ + 0.44, 0, 0, Math.PI / 2));
  scene.add(at(box(1.3, 0.32, 0.48, mat('#495057')), wbX + 1.5, wbY - wbH / 2 - 0.02, wbZ + 0.42));

  // ---- WALL 2 (Right Wall): Wall-mounted 4K Conference Room TV ----
  const tvTex = makeBoardroomTvTexture();
  disposables.push(tvTex);
  const tvMat = new THREE.MeshBasicMaterial({ map: tvTex });
  disposables.push(tvMat);
  const tvX = HALF_W - 0.28;
  const tvY = 7.6;
  const tvZ = -1.5;
  const tvW = 22.0;
  const tvH = 11.0;
  scene.add(at(box(0.45, tvH + 0.85, tvW + 0.85, mat('#161a24', { roughness: 0.35, metalness: 0.6 })), tvX + 0.1, tvY, tvZ));
  const tvScreen = new THREE.Mesh(new THREE.PlaneGeometry(tvW, tvH), tvMat);
  tvScreen.position.set(tvX - 0.16, tvY, tvZ);
  tvScreen.rotation.y = -Math.PI / 2;
  scene.add(tvScreen);
  const tvLedMat = mat('#38bdf8', { emissive: '#38bdf8', emissiveIntensity: 1.4 });
  scene.add(at(box(0.22, 0.18, tvW * 0.6, tvLedMat), tvX - 0.16, tvY - tvH / 2 - 0.32, tvZ));

  // ---- Walnut Executive Conference Table (top surface at y = 0!) ----
  const tableTex = canvasTexture(512, 512, (ctx, w, h) => {
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
  });
  disposables.push(tableTex);
  const tableTopMat = new THREE.MeshStandardMaterial({ map: tableTex, roughness: 0.36, metalness: 0.08 });
  disposables.push(tableTopMat);
  const TABLE_W = Math.max(28, baseRadius * 2 + 10);
  const TABLE_D = Math.max(24, baseRadius * 2 + 8);
  scene.add(at(box(TABLE_W, 0.6, TABLE_D, tableTopMat), 0, -0.3, 0));
  scene.add(at(box(TABLE_W + 0.28, 0.22, TABLE_D + 0.28, mat('#2c1d13', { roughness: 0.5 })), 0, -0.52, 0));
  // Twin sturdy conference table pedestal legs down to carpet floor
  const legMat = mat('#252a34', { roughness: 0.45, metalness: 0.65 });
  scene.add(at(box(1.8, 4.7, 8.0, legMat), -TABLE_W * 0.28, -2.9, 0));
  scene.add(at(box(1.8, 4.7, 8.0, legMat), TABLE_W * 0.28, -2.9, 0));
  scene.add(at(box(TABLE_W * 0.58, 0.65, 1.0, legMat), 0, -4.0, 0));

  // Conference props on the outer corners of the walnut table (clear of the chalk ring)
  const laptopSilver = mat('#ced4da', { roughness: 0.28, metalness: 0.78 });
  const screenMat = mat('#1e293b', { emissive: '#38bdf8', emissiveIntensity: 0.45 });
  const cornerX = TABLE_W / 2 - 2.4;
  const cornerZ = TABLE_D / 2 - 2.2;
  for (const [lx, lz, ry] of [[-cornerX, cornerZ, 0.5], [cornerX, -cornerZ, -2.6]]) {
    const lap = new THREE.Group();
    lap.position.set(lx, 0, lz);
    lap.rotation.y = ry;
    lap.add(at(box(2.1, 0.08, 1.45, laptopSilver), 0, 0.04, 0));
    lap.add(at(box(2.1, 1.35, 0.08, laptopSilver), 0, 0.72, -0.72, -0.22, 0, 0));
    lap.add(at(box(1.9, 1.15, 0.04, screenMat), 0, 0.72, -0.68, -0.22, 0, 0));
    scene.add(lap);
  }
  for (const [mx, mz, col] of [[-cornerX + 2.4, cornerZ + 0.3, '#f8f9fa'], [cornerX - 2.2, cornerZ + 0.2, '#f2b817'], [-cornerX + 0.2, -cornerZ - 0.1, '#4dabf7']]) {
    scene.add(at(cyl(0.26, 0.24, 0.56, mat(col, { roughness: 0.3 }), 12), mx, 0.28, mz));
  }
  scene.add(at(cyl(0.85, 0.95, 0.2, mat('#1f242d', { roughness: 0.45, metalness: 0.3 }), 6), cornerX - 0.4, 0.1, cornerZ - 0.6));

  // 8 ergonomic office chairs tucked around the conference table
  for (const cx of [-8.5, -2.8, 2.8, 8.5]) {
    scene.add(buildOfficeChair(cx, -TABLE_D / 2 - 1.4, 0));
    scene.add(buildOfficeChair(cx, TABLE_D / 2 + 1.4, Math.PI));
  }

  // Glowing white-and-cyan chalk ring right on the walnut conference table!
  const chalkMat = mat('#e7f5ff', { emissive: '#3bc9db', emissiveIntensity: 1.55, roughness: 0.3 });
  const chalkRing = at(torus(baseRadius, 0.14, chalkMat), 0, 0.04, 0, Math.PI / 2, 0, 0);
  scene.add(chalkRing);

  // Rogue mirror-chrome STEELIE BOLER boss marble (hidden until pass triggers)
  const steelieGroup = new THREE.Group();
  const chromeMat = mat('#f1f3f5', { roughness: 0.08, metalness: 0.96, emissive: '#adb5bd', emissiveIntensity: 0.18 });
  steelieGroup.add(ball(STEELIE_RADIUS, chromeMat));
  const steelTag = makeMarbleTag('⚙️ STEELIE BOLER', '#ced4da', 1.65);
  steelieGroup.add(steelTag.sprite);
  steelieGroup.visible = false;
  scene.add(steelieGroup);
  disposables.push(steelTag.tex, steelTag.spriteMat);

  return { chalkRing, baseRadius, steelieGroup, tableHalfW: TABLE_W / 2, tableHalfD: TABLE_D / 2, floorY: FLOOR_Y };
}

// ------------------------------------------------------------------ Lobby 3D Stage

export class TawStage {
  constructor(aspect = 16 / 9, initialNames = [], { duration = DEFAULT_TAW_DURATION } = {}) {
    this.t = 0;
    this.names = [];
    this.models = [];
    this.disposables = [];
    const previewSim = new TawSim({ names: initialNames.length >= 2 ? initialNames : ['Ada', 'Grace'], duration });

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(46, aspect, 0.3, 180);
    this.arena = buildTawArena(this.scene, previewSim.baseRadius, this.disposables);
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
      const rad = Math.min(this.arena.baseRadius * 0.65, 2.2 + (i % 3) * 1.45);
      const kind = DEVELOPER_KINDS[i % DEVELOPER_KINDS.length];
      const roller = buildTawBobblehead(name, kind, kind.accent ?? '#4dabf7', this.disposables);
      roller.root.position.set(Math.cos(a) * rad, MARBLE_RADIUS, Math.sin(a) * rad);
      this.scene.add(roller.root);
      this.models.push({ ...roller, phase: i * 0.7 });
    });
  }

  update(dt, reduced = false) {
    if (!reduced) this.t += dt;
    const t = this.t;
    for (const m of this.models) {
      if (!reduced) {
        m.shell.rotation.y = t * 0.9 + m.phase;
        m.bobble.rotation.z = Math.sin(t * 4.2 + m.phase) * 0.16;
        m.bobble.rotation.x = Math.cos(t * 3.1 + m.phase) * 0.1;
      }
    }
    // Slow eye-level executive orbit circling the conference room so the SOC whiteboard is clearly readable
    const ang = reduced ? 0.06 : t * 0.18;
    this.camera.position.set(Math.sin(ang) * 18.5, 5.4, Math.cos(ang) * 18.5);
    this.camera.lookAt(0, 3.6, 0);
  }

  dispose() {
    for (const d of this.disposables) d.dispose?.();
  }
}

// ------------------------------------------------------------------ Live Match

export class TawMatch {
  constructor(names, { duration = DEFAULT_TAW_DURATION, rule = DEFAULT_TAW_RULE, rng = Math.random, sfx = null, onEvent = null, onWinner = null } = {}) {
    this.sim = new TawSim({ names, duration, rule, rng });
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
    this.arena = buildTawArena(this.scene, this.sim.baseRadius, this.disposables);
    this.particles = new Particles(this.scene);

    this.marbleVisuals = this.sim.marbles.map((m, i) => {
      const kind = DEVELOPER_KINDS[i % DEVELOPER_KINDS.length];
      const roller = buildTawBobblehead(m.name, kind, m.color, this.disposables);
      roller.root.position.set(m.x, MARBLE_RADIUS, m.z);
      this.scene.add(roller.root);
      return { sim: m, ...roller, phase: i * 0.9, y: MARBLE_RADIUS, vy: 0 };
    });

    this.camPos = new THREE.Vector3(0, 12.5, 16.5);
    this.camLook = new THREE.Vector3(0, 0.4, 0);
    this.resize(window.innerWidth / window.innerHeight);
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 1 ? 60 : 46;
    this.camera.updateProjectionMatrix();
  }

  update(realDt) {
    const lastVolley = this.sim.volleys.at(-1);
    const inFinalSlowMo = lastVolley && this.sim.time > lastVolley.at - 0.25 && this.sim.time < lastVolley.at + 0.65 && !this.sim.done;
    const dt = inFinalSlowMo ? realDt * 0.42 : realDt;

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

    // Update shrinking glowing chalk ring scale
    const ringScale = this.sim.ringRadius / this.arena.baseRadius;
    this.arena.chalkRing.scale.set(ringScale, ringScale, 1);

    // Sync rogue STEELIE BOLER (hide once it rolls past the walnut table edge)
    const steelOnTable = Math.abs(this.sim.steelie.x) <= this.arena.tableHalfW + STEELIE_RADIUS
      && Math.abs(this.sim.steelie.z) <= this.arena.tableHalfD + STEELIE_RADIUS;
    this.arena.steelieGroup.visible = this.sim.steelie.active && steelOnTable;
    if (this.arena.steelieGroup.visible) {
      this.arena.steelieGroup.position.set(this.sim.steelie.x, STEELIE_RADIUS, this.sim.steelie.z);
    }

    // Sync rolling bobblehead capsules: outer shell pure-rolls, inner bobblehead wobbles,
    // and any capsule rolling past the walnut table edge falls cleanly onto the carpet floor!
    const { tableHalfW, tableHalfD, floorY } = this.arena;
    const floorRestY = floorY + MARBLE_RADIUS;
    const coastDamp = Math.exp(-1.8 * realDt);
    for (const mv of this.marbleVisuals) {
      const m = mv.sim;
      if (this.sim.done) {
        // Keep coasting after match ends so knocked-off capsules never freeze in midair
        m.vx *= coastDamp;
        m.vz *= coastDamp;
        if (Math.hypot(m.vx, m.vz) < 0.08) { m.vx = 0; m.vz = 0; }
        m.x += m.vx * realDt;
        m.z += m.vz * realDt;
      }
      const offTable = Math.abs(m.x) > tableHalfW + MARBLE_RADIUS * 0.25
        || Math.abs(m.z) > tableHalfD + MARBLE_RADIUS * 0.25;
      if (offTable || mv.y < MARBLE_RADIUS - 0.01) {
        mv.vy -= 28 * realDt;
        mv.y += mv.vy * realDt;
        if (mv.y <= floorRestY) {
          mv.y = floorRestY;
          mv.vy = Math.abs(mv.vy) > 1.4 ? -mv.vy * 0.28 : 0;
        }
      } else {
        mv.y = MARBLE_RADIUS;
        mv.vy = 0;
      }
      const speed = Math.hypot(m.vx, m.vz);
      const bounceY = this.sim.winner === m && !offTable ? Math.abs(Math.sin(this.victoryTime * 6.5)) * 0.45 : 0;
      mv.root.position.set(m.x, mv.y + bounceY, m.z);
      mv.shell.rotation.x += (m.vz * realDt) / MARBLE_RADIUS;
      mv.shell.rotation.z -= (m.vx * realDt) / MARBLE_RADIUS;
      const wobble = 0.1 + Math.min(1, speed / 8) * 0.28;
      mv.bobble.rotation.z = Math.sin(t * 11 + mv.phase) * wobble;
      mv.bobble.rotation.x = Math.cos(t * 9 + mv.phase) * wobble * 0.7;
      if (this.sim.winner === m) {
        mv.bobble.rotation.y += realDt * 2.4;
      }
    }

    this.particles.update(realDt);

    // Dynamic Camera: Overhead Arena -> Micro-Shake -> 360-Degree Victory Orbit!
    if (this.shake > 0) this.shake = Math.max(0, this.shake - realDt * 4.0);
    const kickY = Math.sin(t * 50) * this.shake * 0.65;
    const wantPos = new THREE.Vector3();
    const wantLook = new THREE.Vector3(0, 0.55, 0);
    if (this.sim.winner) {
      // Relaxed 360° office orbit at eye level so the SOC whiteboard, TV, and windows are clearly readable
      const orbitAng = this.victoryTime * 0.2;
      wantPos.set(Math.sin(orbitAng) * 17.5, 5.2, Math.cos(orbitAng) * 17.5);
      wantLook.set(this.sim.winner.x * 0.45, 3.4, this.sim.winner.z * 0.45);
    } else {
      const zoom = this.sim.activeCount() <= 5 ? 12.2 : 16.2;
      wantPos.set(Math.sin(t * 0.25) * 3.5, zoom * 0.78 + kickY, zoom);
    }

    this.camPos.lerp(wantPos, Math.min(1, realDt * 4.5));
    this.camLook.lerp(wantLook, Math.min(1, realDt * 5.0));
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
  }

  handleEvent(e) {
    if (e.type === 'volley') {
      this.sfx?.play?.('tawClack');
      const label = e.volley.index === 0 ? 'KNUCKLES DOWN — PITCH!' : e.volley.isFinal ? 'LAST PITCH!' : 'RE-PITCH!';
      this.onEvent?.({ type: 'status', text: `🔮 ${label} · IN RING: ${this.sim.activeCount()} / ${this.sim.marbles.length}`, tone: e.volley.isFinal ? 'red' : 'yellow' });
      this.onEvent?.({ type: 'note', text: `🔮 ${label} Glass-on-glass crossfire!`, important: true });
    } else if (e.type === 'clack') {
      this.sfx?.play?.('tawClack');
      this.particles.burst(new THREE.Vector3(e.x, 0.5, e.z), {
        count: 6,
        colors: ['#ffffff', '#74c0fc', '#ffd43b'],
        speed: 3.5,
        up: 3.5,
        life: 0.4,
        size: 0.14,
        gravity: 12,
      });
    } else if (e.type === 'steelie') {
      this.sfx?.play?.('tawSteelie');
      this.shake = 0.85;
      this.onEvent?.({ type: 'status', text: '⚙️ STEELIE BOLER INBOUND!', tone: 'red' });
      this.onEvent?.({ type: 'note', text: `⚙️ STEELIE BOLER: “${e.popup}”`, important: true });
    } else if (e.type === 'steelieHit') {
      this.sfx?.play?.('tawSteelie');
      this.shake = 0.55;
      this.particles.burst(new THREE.Vector3(e.x, 0.6, e.z), {
        count: 14,
        colors: ['#ffd43b', '#ff922b', '#ffffff'],
        speed: 5.5,
        up: 5.0,
        life: 0.55,
        size: 0.18,
        gravity: 13,
      });
    } else if (e.type === 'eliminated') {
      this.sfx?.play?.('tawOut');
      this.onEvent?.({ type: 'status', text: `🔮 IN RING: ${e.remaining} / ${this.sim.marbles.length}`, tone: 'yellow' });
      this.onEvent?.({ type: 'note', text: `💥 ${e.marble.name} OUT OF THE RING: “${e.popup}”`, important: false });
    } else if (e.type === 'winner' && !this.winnerAnnounced) {
      this.winnerAnnounced = true;
      this.sfx?.play?.('tawWin');
      this.sfx?.fanfare?.();
      this.particles.burst(new THREE.Vector3(e.marble.x, 1.2, e.marble.z), {
        count: 68,
        colors: ['#3bc9db', '#ffd43b', '#ff6b6b', '#51cf66', '#ffffff'],
        speed: 7.5,
        up: 9.0,
        life: 1.9,
        size: 0.26,
        gravity: 12,
      });
      this.onWinner?.(e.marble, this.sim);
    }
  }

  dispose() {
    for (const d of this.disposables) d.dispose?.();
  }
}
