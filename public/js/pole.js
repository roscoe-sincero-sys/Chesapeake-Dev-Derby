// "Greasy Pole Scramble" (Mashramani Slip-and-Slide): twilight Guyanese Mashramani carnival
// square with silhouetted Georgetown palms, emerald-gold-red bunting & float arches, circular
// timber-ringed glossy mud pit, towering wet-grease cedar pole with glowing Management Grease &
// PanganodSilab static rings, fluttering golden LEAD STANDUP summit flag & thermos, Claw-of-
// Destiny bobblehead climbers scrambling 360 degrees around the pole, and helical crane cam!

import * as THREE from 'three';
import { mat, box, ball, cyl, cone, torus, plane, at, canvasTexture, FONT_UI, FONT_MONO, roundRect } from './util3d.js';
import { Particles } from './effects.js';
import { DEVELOPER_KINDS } from './deathmatch-sim.js';
import {
  PoleSim,
  POLE_RADIUS,
  CLIMBER_OFFSET,
  DEFAULT_POLE_DURATION,
  DEFAULT_POLE_RULE,
} from './pole-sim.js';

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

/** Weathered cedar wood texture with glistening vertical wet-grease drips. */
function makeGreasyPoleTexture() {
  const tex = canvasTexture(256, 512, (ctx, w, h) => {
    ctx.fillStyle = '#6b4426';
    ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 6) {
      ctx.fillStyle = x % 12 === 0 ? 'rgba(255,220,175,0.08)' : 'rgba(24,12,4,0.14)';
      ctx.fillRect(x, 0, 3, h);
    }
    // Glistening wet grease streaks dripping down the timber
    for (let i = 0; i < 18; i++) {
      const gx = (i * 19) % w;
      const gy = (i * 53) % h;
      const gl = 80 + (i % 4) * 55;
      const grad = ctx.createLinearGradient(gx, gy, gx, gy + gl);
      grad.addColorStop(0, 'rgba(255, 240, 210, 0.32)');
      grad.addColorStop(1, 'rgba(255, 240, 210, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(gx, gy, 7, gl);
    }
  });
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 5);
  return tex;
}

/** Upright high-contrast climber nameplate sprite. */
function makeClimberTag(name, color) {
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
  sprite.scale.set(2.1, 0.52, 1);
  sprite.position.set(0, 1.55, 0);
  return { sprite, tex, spriteMat };
}

/** Builds a silhouetted Georgetown palm tree for the twilight Mashramani square perimeter. */
function buildPalmTree(x, z, scale = 1) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const trunkMat = mat('#3d2c20', { roughness: 0.9 });
  const frondMat = mat('#1c4d2e', { roughness: 0.85 });
  const h = 11 * scale;
  g.add(at(cyl(0.24 * scale, 0.42 * scale, h, trunkMat, 8), 0, h / 2, 0, 0, 0, 0.08));
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    g.add(at(cone(0.95 * scale, 4.2 * scale, frondMat, 5), Math.cos(a) * 1.6 * scale, h - 0.2, Math.sin(a) * 1.6 * scale, Math.sin(a) * 1.05, 0, -Math.cos(a) * 1.05));
  }
  return g;
}

/** Builds an articulated bobblehead climber (Claw-of-Destiny portrait) clinging to the pole! */
function buildPoleClimber(name, kind, color, disposables) {
  const root = new THREE.Group();
  const shirtMat = mat(kind.shirt ?? color, { roughness: 0.55 });
  const pantsMat = mat('#2b303a', { roughness: 0.85 });

  const leftLeg = at(cyl(0.085, 0.075, 0.55, pantsMat, 8), -0.15, 0.25, 0);
  const rightLeg = at(cyl(0.085, 0.075, 0.55, pantsMat, 8), 0.15, 0.25, 0);
  root.add(leftLeg, rightLeg);
  root.add(at(cyl(0.23, 0.19, 0.66, shirtMat, 12), 0, 0.72, 0));

  const leftArm = at(cyl(0.07, 0.06, 0.54, shirtMat, 8), -0.28, 0.92, -0.15, -0.8, 0, 0.35);
  const rightArm = at(cyl(0.07, 0.06, 0.54, shirtMat, 8), 0.28, 0.92, -0.15, -0.8, 0, -0.35);
  root.add(leftArm, rightArm);

  const head = new THREE.Group();
  head.position.set(0, 1.24, 0.08);
  head.add(at(cyl(0.38, 0.38, 0.13, mat(kind.accent ?? color, { roughness: 0.35 }), 24), 0, 0, 0, Math.PI / 2, 0, 0));
  const portraitTex = getDeveloperPortraitTexture(kind.id);
  const faceMat = new THREE.MeshStandardMaterial({ map: portraitTex, roughness: 0.35 });
  const faceGeo = new THREE.CircleGeometry(0.35, 24);
  const front = new THREE.Mesh(faceGeo, faceMat);
  front.position.set(0, 0, 0.072);
  const back = new THREE.Mesh(faceGeo, faceMat);
  back.rotation.y = Math.PI;
  back.position.set(0, 0, -0.072);
  head.add(front, back);
  root.add(head);

  const tag = makeClimberTag(name, kind.accent ?? color);
  root.add(tag.sprite);
  disposables.push(faceGeo, faceMat, tag.tex, tag.spriteMat);

  return { root, leftLeg, rightLeg, leftArm, rightArm, head };
}

/** Builds the twilight Mashramani carnival square, mud pit, greasy cedar pole, hazard bands & summit banner. */
function buildPoleArena(scene, height, bands, disposables) {
  scene.background = new THREE.Color('#0e1326');
  scene.fog = new THREE.Fog('#0e1326', 40, 130);

  scene.add(new THREE.HemisphereLight('#748ffc', '#1b1624', 1.05));
  const key = new THREE.DirectionalLight('#fff2d6', 1.45);
  key.position.set(16, 36, 18);
  scene.add(key);

  // Dark carnival square pavement
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), mat('#181c28', { roughness: 0.92 }));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // Circular timber-ringed glossy Mud Pit around the pole base
  const mudMat = mat('#3b2414', { roughness: 0.1, metalness: 0.22 });
  const timberMat = mat('#6e4b30', { roughness: 0.85 });
  scene.add(at(cyl(5.2, 5.2, 0.18, mudMat, 32), 0, 0.09, 0));
  scene.add(at(torus(5.3, 0.32, timberMat), 0, 0.26, 0, Math.PI / 2, 0, 0));

  // Towering greasy cedar pole with wet specular sheen
  const poleTex = makeGreasyPoleTexture();
  disposables.push(poleTex);
  const poleMat = new THREE.MeshStandardMaterial({ map: poleTex, roughness: 0.18, metalness: 0.18 });
  disposables.push(poleMat);
  scene.add(at(cyl(POLE_RADIUS * 0.92, POLE_RADIUS, height + 1.2, poleMat, 24), 0, (height + 1.2) / 2, 0));

  // Glowing Management Grease (magenta) & PanganodSilab Static (amber) hazard collars
  for (const b of bands) {
    const col = b.kind === 'grease' ? '#e64980' : '#ff922b';
    const bandMat = mat(col, { emissive: col, emissiveIntensity: 1.15, roughness: 0.12, transparent: true, opacity: 0.72 });
    scene.add(at(cyl(POLE_RADIUS + 0.04, POLE_RADIUS + 0.04, b.halfH * 2, bandMat, 24), 0, b.y, 0));
  }

  // Summit golden Mashramani LEAD STANDUP pennant & dangling golden coffee thermos!
  const flagTex = canvasTexture(256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#099268';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f2b817';
    ctx.fillRect(0, 0, w, 18);
    ctx.fillRect(0, h - 18, w, 18);
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 32px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('LEAD', w / 2, 46);
    ctx.fillStyle = '#ffe066';
    ctx.font = `900 28px ${FONT_MONO}`;
    ctx.fillText('STANDUP', w / 2, 86);
  });
  disposables.push(flagTex);
  const flagMat = new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide, emissive: '#099268', emissiveIntensity: 0.35 });
  disposables.push(flagMat);
  const summitGroup = new THREE.Group();
  summitGroup.position.set(0, height + 0.8, 0);
  summitGroup.add(at(cyl(0.06, 0.06, 2.2, mat('#ffd43b', { metalness: 0.8 }), 10), 0, 1.1, 0));
  const pennant = at(plane(2.8, 1.3, flagMat), 1.45, 1.45, 0);
  summitGroup.add(pennant);
  // Dangling golden coffee thermos prize!
  summitGroup.add(at(cyl(0.24, 0.24, 0.72, mat('#f2b817', { roughness: 0.2, metalness: 0.85, emissive: '#e67700', emissiveIntensity: 0.4 }), 14), -1.1, -0.3, 0));
  const summitLight = new THREE.PointLight('#ffd43b', 28, 16, 1.5);
  summitLight.position.set(0, 1.5, 0);
  summitGroup.add(summitLight);
  scene.add(summitGroup);

  // Mashramani carnival perimeter: festival arches, emerald-gold-red bulbs & Georgetown palms
  const mashColors = ['#099268', '#ffd43b', '#e03131'];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const px = Math.cos(a) * 18;
    const pz = Math.sin(a) * 18;
    scene.add(buildPalmTree(px, pz, 0.9 + (i % 3) * 0.22));
    // Glowing carnival festival post + string bulb
    const col = mashColors[i % mashColors.length];
    scene.add(at(cyl(0.14, 0.18, 7.5, mat('#2b303a'), 8), Math.cos(a + 0.26) * 12, 3.75, Math.sin(a + 0.26) * 12));
    scene.add(at(ball(0.4, mat(col, { emissive: col, emissiveIntensity: 1.8 })), Math.cos(a + 0.26) * 12, 7.7, Math.sin(a + 0.26) * 12));
  }

  return { pennant, summitGroup };
}

// ------------------------------------------------------------------ Lobby 3D Stage

export class PoleStage {
  constructor(aspect = 16 / 9, initialNames = [], { duration = DEFAULT_POLE_DURATION } = {}) {
    this.t = 0;
    this.names = [];
    this.models = [];
    this.disposables = [];
    const previewSim = new PoleSim({ names: initialNames.length >= 2 ? initialNames : ['Ada', 'Grace'], duration });

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(48, aspect, 0.3, 200);
    this.arena = buildPoleArena(this.scene, previewSim.height, previewSim.bands, this.disposables);
    this.poleHeight = previewSim.height;
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

    const n = Math.max(1, names.length);
    const r = POLE_RADIUS + CLIMBER_OFFSET + 0.55;
    names.forEach((name, i) => {
      const theta = (i / n) * Math.PI * 2;
      const kind = DEVELOPER_KINDS[i % DEVELOPER_KINDS.length];
      const climber = buildPoleClimber(name, kind, kind.accent, this.disposables);
      climber.root.position.set(Math.cos(theta) * r, 0.15, Math.sin(theta) * r);
      climber.root.rotation.y = Math.atan2(-Math.cos(theta), -Math.sin(theta));
      this.scene.add(climber.root);
      this.models.push({ ...climber, phase: i * 0.7 });
    });
  }

  update(dt, reduced = false) {
    if (!reduced) this.t += dt;
    const t = this.t;
    for (const m of this.models) {
      m.root.position.y = reduced ? 0.15 : 0.15 + Math.abs(Math.sin(t * 4.5 + m.phase)) * 0.18;
    }
    this.arena.pennant.rotation.y = Math.sin(t * 5) * 0.22;
    const ang = reduced ? 0.3 : t * 0.25;
    this.camera.position.set(Math.sin(ang) * 14.5, 4.8, Math.cos(ang) * 14.5);
    this.camera.lookAt(0, this.poleHeight * 0.42, 0);
  }

  dispose() {
    for (const d of this.disposables) d.dispose?.();
  }
}

// ------------------------------------------------------------------ Live Match

export class PoleMatch {
  constructor(names, { duration = DEFAULT_POLE_DURATION, rule = DEFAULT_POLE_RULE, rng = Math.random, sfx = null, onEvent = null, onWinner = null } = {}) {
    this.sim = new PoleSim({ names, duration, rule, rng });
    this.sfx = sfx;
    this.onEvent = onEvent;
    this.onWinner = onWinner;
    this.accumulator = 0;
    this.victoryTime = 0;
    this.leaderTimer = 0;
    this.winnerAnnounced = false;
    this.disposables = [];

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.3, 200);
    this.arena = buildPoleArena(this.scene, this.sim.height, this.sim.bands, this.disposables);
    this.particles = new Particles(this.scene);

    this.climbers = this.sim.climbers.map((c, i) => {
      const kind = DEVELOPER_KINDS[i % DEVELOPER_KINDS.length];
      const visual = buildPoleClimber(c.name, kind, c.color, this.disposables);
      this.scene.add(visual.root);
      return { sim: c, ...visual };
    });

    this.camPos = new THREE.Vector3(0, 4.2, 14.5);
    this.camLook = new THREE.Vector3(0, 5.5, 0);
    this.resize(window.innerWidth / window.innerHeight);
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 1 ? 62 : 48;
    this.camera.updateProjectionMatrix();
  }

  update(realDt) {
    const top1 = this.sim.standings()[0];
    const inSummitSlowMo = this.sim.rule === 'summit' && top1 && top1.y > this.sim.height * 0.88 && !this.sim.done;
    const dt = inSummitSlowMo ? realDt * 0.45 : realDt;

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
    const r = POLE_RADIUS + CLIMBER_OFFSET;

    // Sync 360-degree cylindrical pole climbers
    for (const cv of this.climbers) {
      const c = cv.sim;
      const rad = c.state === 'ready' || c.state === 'chalking' ? r + 0.45 : r;
      const cx = Math.cos(c.theta) * rad;
      const cz = Math.sin(c.theta) * rad;
      cv.root.position.set(cx, c.y, cz);
      cv.root.rotation.y = Math.atan2(-Math.cos(c.theta), -Math.sin(c.theta));

      if (c.state === 'climbing') {
        const pump = Math.sin(t * 16 + c.id);
        cv.leftArm.position.y = 0.92 + pump * 0.16;
        cv.rightArm.position.y = 0.92 - pump * 0.16;
        cv.leftLeg.position.y = 0.25 - pump * 0.12;
        cv.rightLeg.position.y = 0.25 + pump * 0.12;
        cv.root.rotation.z = 0;
      } else if (c.state === 'slipping') {
        cv.leftArm.position.y = 1.05;
        cv.rightArm.position.y = 1.05;
        cv.root.rotation.z = Math.sin(t * 22 + c.id) * 0.28;
      } else {
        cv.root.rotation.z = 0;
      }
    }

    this.arena.pennant.rotation.y = Math.sin(t * 5.5) * 0.24;
    this.particles.update(realDt);

    this.leaderTimer += realDt;
    if (this.leaderTimer >= 0.2 && this.sim.started && !this.sim.done) {
      this.leaderTimer = 0;
      const order = this.sim.standings();
      if (order[0]) {
        const s2 = order[1] ? ` • 2nd: ${order[1].name} ${order[1].y.toFixed(1)}m` : '';
        this.onEvent?.({ type: 'status', text: `🌴 1st: ${order[0].name} ${order[0].y.toFixed(1)}m${s2}`, tone: 'green' });
      }
    }

    // Dynamic Helical Crane Camera: Launch Low-Angle -> Ascending Helix -> Summit Finale Orbit
    const wantPos = new THREE.Vector3();
    const wantLook = new THREE.Vector3();
    if (!this.sim.started) {
      wantPos.set(Math.sin(t * 0.6) * 3.0, 3.8, 14.5);
      wantLook.set(0, this.sim.height * 0.45, 0);
    } else if (this.sim.winner) {
      const ang = t * 0.35 + this.victoryTime * 0.6;
      const wy = this.sim.winner.y;
      wantPos.set(Math.sin(ang) * 10.5, wy + 2.5, Math.cos(ang) * 10.5);
      wantLook.set(0, wy + 0.8, 0);
    } else {
      const leadY = top1 ? top1.y : 2;
      const ang = t * 0.36;
      wantPos.set(Math.sin(ang) * 12.8, Math.max(4.5, leadY + 1.8), Math.cos(ang) * 12.8);
      wantLook.set(0, Math.min(this.sim.height, leadY + 0.6), 0);
    }

    this.camPos.lerp(wantPos, Math.min(1, realDt * 4.5));
    this.camLook.lerp(wantLook, Math.min(1, realDt * 5.0));
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
  }

  handleEvent(e) {
    if (e.type === 'start') {
      this.sfx?.play?.('poleHorn');
      this.onEvent?.({ type: 'status', text: '🌴 MASH UP DE POLE! CLIMB FOR STANDUP!', tone: 'green' });
      this.onEvent?.({ type: 'note', text: '📯 Steelpan airhorn blasts — MASH UP DE POLE!', important: true });
    } else if (e.type === 'slip') {
      this.sfx?.play?.('poleSqueak');
      this.onEvent?.({ type: 'note', text: `🫧 ${e.climber.name}: “${e.popup}”`, important: e.kind === 'domino' });
    } else if (e.type === 'splorch') {
      this.sfx?.play?.('poleSplorch');
      const r = POLE_RADIUS + CLIMBER_OFFSET + 0.4;
      this.particles.burst(new THREE.Vector3(Math.cos(e.climber.theta) * r, 0.35, Math.sin(e.climber.theta) * r), {
        count: 18,
        colors: ['#5c3a21', '#8c5a34', '#ffd43b'],
        speed: 4.5,
        up: 5.5,
        life: 0.75,
        size: 0.22,
        gravity: 13,
      });
    } else if (e.type === 'winner' && !this.winnerAnnounced) {
      this.winnerAnnounced = true;
      this.sfx?.play?.('poleWin');
      this.sfx?.fanfare?.();
      this.particles.burst(new THREE.Vector3(0, e.climber.y + 1.2, 0), {
        count: 70,
        colors: ['#099268', '#ffd43b', '#e03131', '#38bdf8', '#ffffff'],
        speed: 7.8,
        up: 9.2,
        life: 1.9,
        size: 0.28,
        gravity: 12,
      });
      this.onWinner?.(e.climber, this.sim);
    }
  }

  dispose() {
    for (const d of this.disposables) d.dispose?.();
  }
}
