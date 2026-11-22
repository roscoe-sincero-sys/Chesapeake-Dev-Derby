// "Code Freeze" (Red Light, Green Light): dark-mode neon CI/CD sprint runway, swiveling
// RELEASE MANAGER spotlight turret & scanning laser, overhead LED status gantry, Tech Debt Ice
// patches, 14-developer runners with braking sparks, and dynamic Green/Red camera cuts.

import * as THREE from 'three';
import { mat, box, ball, cyl, plane, at, canvasTexture, FONT_UI, FONT_MONO } from './util3d.js';
import { Particles } from './effects.js';
import { DEVELOPER_KINDS } from './deathmatch-sim.js';
import { buildDeveloperModel } from './deathmatch-avatars.js';
import { FreezeSim, buildFreezeCourse, DEFAULT_FREEZE_DURATION } from './freeze-sim.js';

const STEP = 1 / 60;

/** Builds the neon dark-mode CI/CD sprint runway, checkpoints, Tech Debt Ice, and RELEASE MANAGER tower. */
function buildFreezeArena(scene, course, disposables) {
  scene.background = new THREE.Color('#090d18');
  scene.fog = new THREE.Fog('#090d18', 42, 130);

  const hemi = new THREE.HemisphereLight('#9ec5fe', '#141926', 0.9);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight('#fff2dc', 1.3);
  dir.position.set(12, 26, course.length * 0.4);
  scene.add(dir);

  const L = course.length;
  const W = course.halfWidth * 2;

  // Data-center runway deck
  const deckTex = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#151b2b';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#232c45';
    ctx.lineWidth = 3;
    for (let x = 0; x <= w; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y <= h; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  }, { repeat: true });
  deckTex.repeat.set(6, Math.max(8, Math.round(L / 4)));
  disposables.push(deckTex);
  const deckMat = new THREE.MeshStandardMaterial({ map: deckTex, roughness: 0.75, metalness: 0.18 });
  disposables.push(deckMat);
  const deck = new THREE.Mesh(new THREE.PlaneGeometry(W + 2, L + 16), deckMat);
  deck.rotation.x = -Math.PI / 2;
  deck.position.set(0, 0, L / 2 - 2);
  scene.add(deck);

  // Glowing side runway light strips (color switches GREEN / YELLOW / RED!)
  const stripMat = new THREE.MeshStandardMaterial({
    color: '#20c997',
    emissive: '#20c997',
    emissiveIntensity: 1.2,
    roughness: 0.2,
  });
  disposables.push(stripMat);
  scene.add(at(box(0.32, 0.25, L + 10, stripMat), -course.halfWidth - 0.5, 0.14, L / 2));
  scene.add(at(box(0.32, 0.25, L + 10, stripMat), course.halfWidth + 0.5, 0.14, L / 2));

  // Finish tape ("RELEASE / LEAD STANDUP")
  const tapeMat = mat('#f2b817', { emissive: '#f2b817', emissiveIntensity: 0.9 });
  scene.add(at(box(W + 1.2, 0.16, 0.45, tapeMat), 0, 0.08, L));

  // Enterprise checkpoints (Staging, UAT)
  for (const cp of course.checkpoints) {
    const cpTex = canvasTexture(256, 64, (ctx, w, h) => {
      ctx.fillStyle = '#182238';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.strokeRect(4, 4, w - 8, h - 8);
      ctx.fillStyle = '#38bdf8';
      ctx.font = `800 30px ${FONT_MONO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cp.label, w / 2, h / 2 + 1);
    });
    disposables.push(cpTex);
    const cpMat = new THREE.MeshStandardMaterial({ map: cpTex, emissiveMap: cpTex, emissive: '#ffffff', emissiveIntensity: 0.4 });
    disposables.push(cpMat);
    scene.add(at(box(0.35, 6.5, 0.35, mat('#2c3552')), -course.halfWidth - 0.5, 3.25, cp.z));
    scene.add(at(box(0.35, 6.5, 0.35, mat('#2c3552')), course.halfWidth + 0.5, 3.25, cp.z));
    scene.add(at(plane(5.5, 1.35, cpMat), 0, 5.8, cp.z, 0, Math.PI, 0));
  }

  // Slippery Tech Debt Ice patches
  const iceMat = mat('#74c0fc', { emissive: '#339af0', emissiveIntensity: 0.4, roughness: 0.12, metalness: 0.3 });
  for (const ice of course.iceZones) {
    const len = ice.zEnd - ice.zStart;
    scene.add(at(box(W - 0.6, 0.06, len, iceMat), 0, 0.03, (ice.zStart + ice.zEnd) / 2));
  }

  // Towering RELEASE MANAGER monitor-head spotlight turret at the finish line!
  const tower = new THREE.Group();
  tower.position.set(0, 0, L + 4.2);
  tower.add(at(cyl(1.6, 2.2, 5.2, mat('#212636', { metalness: 0.5, roughness: 0.4 })), 0, 2.6, 0));

  const headPivot = new THREE.Group();
  headPivot.position.set(0, 6.6, 0);
  headPivot.add(box(4.2, 2.6, 2.4, mat('#181c28', { metalness: 0.6, roughness: 0.3 })));
  const visorMat = new THREE.MeshStandardMaterial({
    color: '#20c997',
    emissive: '#20c997',
    emissiveIntensity: 1.3,
  });
  disposables.push(visorMat);
  // Front visor faces -Z (toward the runners) when headPivot.rotation.y === 0; faces away at Math.PI!
  headPivot.add(at(box(3.4, 1.1, 0.25, visorMat), 0, 0.1, -1.25));
  headPivot.rotation.y = Math.PI; // starts facing away on GREEN!
  tower.add(headPivot);

  // Overhead RELEASE MANAGER marquee banner
  const rmTex = canvasTexture(512, 96, (ctx, w, h) => {
    ctx.fillStyle = '#141724';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 38px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('RELEASE MANAGER', w / 2, h / 2 + 1);
  });
  disposables.push(rmTex);
  const rmMat = new THREE.MeshStandardMaterial({ map: rmTex, emissiveMap: rmTex, emissive: '#ffffff', emissiveIntensity: 0.5 });
  disposables.push(rmMat);
  tower.add(at(plane(8.5, 1.6, rmMat), 0, 9.2, -0.2, 0, Math.PI, 0));
  scene.add(tower);

  // Sweeping red scanning laser bar across the runway during CODE FREEZE
  const laserMat = mat('#ff2a55', { emissive: '#ff2a55', emissiveIntensity: 2.0 });
  const scanLaser = at(box(W + 1.5, 0.18, 0.18, laserMat), 0, 1.3, L);
  scanLaser.visible = false;
  scene.add(scanLaser);

  // Ambient mood light that shifts emerald -> amber -> crimson
  const moodLight = new THREE.PointLight('#20c997', 22, 60, 1.2);
  moodLight.position.set(0, 10, L * 0.5);
  scene.add(moodLight);

  return { stripMat, visorMat, headPivot, scanLaser, moodLight };
}

// ------------------------------------------------------------------ Lobby 3D Stage

export class FreezeStage {
  constructor(aspect = 16 / 9, initialNames = [], { duration = DEFAULT_FREEZE_DURATION } = {}) {
    this.t = 0;
    this.names = [];
    this.models = [];
    this.disposables = [];

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.3, 220);
    this.course = buildFreezeCourse(duration);
    this.arena = buildFreezeArena(this.scene, this.course, this.disposables);
    this.setLineup(initialNames);
    this.resize(aspect);
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 1 ? 64 : 50;
    this.camera.updateProjectionMatrix();
  }

  setLineup(names = []) {
    if (names.length === this.names.length && names.every((n, i) => n === this.names[i])) return;
    for (const m of this.models) {
      this.scene.remove(m.visual.root);
      m.visual.dispose();
    }
    this.models = [];
    this.names = [...names];

    const cols = Math.min(8, Math.max(1, names.length));
    const span = Math.min(11, cols * 1.45);
    names.forEach((name, i) => {
      const kind = DEVELOPER_KINDS[i % DEVELOPER_KINDS.length];
      const visual = buildDeveloperModel({ name, kind, isNpc: false });
      visual.weaponGroup.visible = false;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = cols === 1 ? 0 : -span / 2 + (col / (cols - 1)) * span;
      const z = -row * 1.6;
      visual.root.position.set(x, 0, z);
      this.scene.add(visual.root);
      this.models.push({ visual, phase: i * 0.9 });
    });
  }

  update(dt, reduced = false) {
    if (!reduced) this.t += dt;
    const t = this.t;
    const isRed = Math.floor(t / 3.5) % 2 === 1;
    const hex = isRed ? '#ff2a55' : '#20c997';
    this.arena.stripMat.color.set(hex);
    this.arena.stripMat.emissive.set(hex);
    this.arena.visorMat.color.set(hex);
    this.arena.visorMat.emissive.set(hex);
    const targetYaw = isRed ? 0 : Math.PI;
    this.arena.headPivot.rotation.y += (targetYaw - this.arena.headPivot.rotation.y) * Math.min(1, dt * 6);

    for (const m of this.models) {
      m.visual.body.position.y = reduced || isRed ? 0 : Math.abs(Math.sin(t * 7 + m.phase)) * 0.1;
    }
    const sway = reduced ? 0 : Math.sin(t * 0.35) * 3.5;
    this.camera.position.set(sway, 6.2, -12.5);
    this.camera.lookAt(0, 2.2, 16);
  }

  dispose() {
    for (const m of this.models) m.visual.dispose();
    for (const d of this.disposables) d.dispose?.();
  }
}

// ------------------------------------------------------------------ Live Match

export class FreezeMatch {
  constructor(names, { duration = DEFAULT_FREEZE_DURATION, rng = Math.random, sfx = null, onEvent = null, onWinner = null } = {}) {
    this.sim = new FreezeSim({ names, duration, rng });
    this.sfx = sfx;
    this.onEvent = onEvent;
    this.onWinner = onWinner;
    this.accumulator = 0;
    this.winnerReported = false;
    this.zapBeams = [];
    this.disposables = [];

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.3, 240);
    this.arena = buildFreezeArena(this.scene, this.sim.course, this.disposables);
    this.particles = new Particles(this.scene);

    this.runnerVisuals = this.sim.runners.map((r) => {
      const visual = buildDeveloperModel({ name: r.name, kind: r.kind, isNpc: false });
      visual.weaponGroup.visible = false;
      visual.root.position.set(r.x, 0, r.z);
      this.scene.add(visual.root);
      return { sim: r, visual };
    });

    this.camPos = new THREE.Vector3(10, 6.5, -8);
    this.camLook = new THREE.Vector3(0, 1.8, 10);
    this.resize(window.innerWidth / window.innerHeight);
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 1 ? 64 : 50;
    this.camera.updateProjectionMatrix();
  }

  fireZapBeam(runner) {
    const start = new THREE.Vector3(0, 6.6, this.sim.course.length + 3.0);
    const end = new THREE.Vector3(runner.x, 1.3, runner.z);
    const dist = Math.max(0.5, start.distanceTo(end));
    const beam = cyl(0.09, 0.09, dist, mat('#ff2a55', { emissive: '#ff2a55', emissiveIntensity: 2.2 }), 6);
    beam.position.copy(start).add(end).multiplyScalar(0.5);
    beam.lookAt(end);
    beam.rotateX(Math.PI / 2);
    this.scene.add(beam);
    this.zapBeams.push({ mesh: beam, life: 0.45 });

    this.particles.burst(end, {
      count: 26,
      colors: ['#ff2a55', '#ffd43b', '#38bdf8', '#ffffff'],
      speed: 6,
      up: 3.5,
      life: 1.0,
      size: 0.26,
      gravity: 5,
    });
  }

  handleEvent(ev) {
    switch (ev.type) {
      case 'light':
        if (ev.light === 'GREEN') this.sfx?.play('freezeTick', 0.1);
        else if (ev.light === 'YELLOW') this.sfx?.play('freezeWarn', 0.1);
        else if (ev.light === 'RED') this.sfx?.play('freezeRed', 0.1);
        this.onEvent?.({
          type: 'status',
          light: ev.light,
          remaining: this.sim.aliveRunners().length,
          total: this.sim.runners.length,
        });
        break;
      case 'fakeout':
        this.sfx?.play('go', 0.1);
        this.onEvent?.({ type: 'note', text: ev.text, important: true });
        break;
      case 'emergency':
        this.sfx?.play('boost', 0.15);
        this.onEvent?.({ type: 'note', text: ev.text, important: true });
        break;
      case 'zap':
        this.sfx?.play('freezeZap', 0.08);
        this.fireZapBeam(ev.runner);
        this.onEvent?.({
          type: 'zap',
          runner: ev.runner,
          excuse: ev.excuse,
          remaining: this.sim.aliveRunners().length,
          total: this.sim.runners.length,
        });
        break;
      case 'win':
        this.sfx?.play('freezeWin', 0.1);
        this.particles.burst(new THREE.Vector3(ev.runner.x, 2.2, ev.runner.z), {
          count: 46,
          colors: ['#20c997', '#f2b817', '#38bdf8', '#ffffff'],
          speed: 7,
          up: 5.5,
          life: 2.5,
          size: 0.3,
          gravity: 5,
        });
        if (!this.winnerReported) {
          this.winnerReported = true;
          this.onWinner?.(ev.runner, ev.reason, this.sim);
        }
        break;
    }
  }

  update(dt) {
    this.accumulator += Math.min(0.08, dt);
    let steps = 0;
    while (this.accumulator >= STEP && steps < 10) {
      this.sim.step(STEP);
      this.accumulator -= STEP;
      steps++;
      for (const ev of this.sim.drainEvents()) this.handleEvent(ev);
    }

    // Snap runway LED strips & RELEASE MANAGER turret to GREEN / YELLOW / RED
    const colorHex = this.sim.light === 'GREEN' ? '#20c997' : this.sim.light === 'YELLOW' ? '#f59f00' : '#ff2a55';
    this.arena.stripMat.color.set(colorHex);
    this.arena.stripMat.emissive.set(colorHex);
    this.arena.visorMat.color.set(colorHex);
    this.arena.visorMat.emissive.set(colorHex);
    this.arena.moodLight.color.set(colorHex);

    const wantYaw = this.sim.light === 'RED' ? 0 : this.sim.light === 'YELLOW' ? Math.PI * 0.55 : Math.PI;
    this.arena.headPivot.rotation.y += (wantYaw - this.arena.headPivot.rotation.y) * Math.min(1, dt * 14);
    this.arena.scanLaser.visible = this.sim.light === 'RED' && !this.sim.done;
    this.arena.scanLaser.position.z = this.sim.redSweepZ;

    // Fade out zap laser beams
    for (let i = this.zapBeams.length - 1; i >= 0; i--) {
      this.zapBeams[i].life -= dt;
      if (this.zapBeams[i].life <= 0) {
        this.scene.remove(this.zapBeams[i].mesh);
        this.zapBeams.splice(i, 1);
      }
    }

    // Animate runners (stride on GREEN, lean back on braking, freeze on RED, hide on ZAPPED)
    const t = this.sim.time;
    for (const { sim: r, visual } of this.runnerVisuals) {
      visual.root.visible = r.state !== 'ZAPPED';
      if (!visual.root.visible) continue;
      visual.root.position.set(r.x, 0, r.z);
      if (r.state === 'SPRINTING') {
        const stride = Math.sin(t * 14 + r.id) * 0.65;
        visual.legL.rotation.x = stride;
        visual.legR.rotation.x = -stride;
        visual.body.rotation.x = 0.14;
      } else if (r.state === 'BRAKING') {
        visual.body.rotation.x = -0.28; // dramatic backward braking lean!
        visual.legL.rotation.x = 0.35;
        visual.legR.rotation.x = -0.15;
      } else {
        visual.body.rotation.x = 0;
        visual.legL.rotation.x = 0.18;
        visual.legR.rotation.x = -0.18;
      }
    }

    this.particles.update(dt);

    // Dynamic camera cuts: 3/4 side tracking on GREEN -> low-angle RELEASE MANAGER view on RED!
    const alive = this.sim.standings().filter((r) => r.state !== 'ZAPPED');
    const lead = alive[0] ?? this.sim.runners[0];
    const wantPos = new THREE.Vector3();
    const wantLook = new THREE.Vector3();
    if (this.sim.done && this.sim.winner) {
      wantPos.set(this.sim.winner.x + 4.5, 3.4, this.sim.winner.z - 5.5);
      wantLook.set(this.sim.winner.x, 1.6, this.sim.winner.z);
    } else if (this.sim.light === 'RED') {
      wantPos.set(3.8, 3.6, this.sim.course.length + 1.2);
      wantLook.set(0, 1.4, Math.max(0, lead.z - 4));
    } else {
      wantPos.set(10.5, 6.2, lead.z - 9.5);
      wantLook.set(0, 1.8, lead.z + 5.5);
    }
    this.camPos.lerp(wantPos, Math.min(1, dt * 4.5));
    this.camLook.lerp(wantLook, Math.min(1, dt * 5.5));
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
  }

  dispose() {
    this.particles.clear();
    for (const { visual } of this.runnerVisuals) visual.dispose();
    for (const d of this.disposables) d.dispose?.();
  }
}
