// "Kanban Plinko" (3D Vertical Pinball): tilted 3D vertical Kanban cabinet, 4 swimlane tiers,
// metallic peg field, Scope Creep neon pop-bumpers, Merge Conflict 4-blade spinners, Tech Debt
// sticky pads, pneumatic "Moved to Next Sprint" warp pipes, LGTM flippers, glowing marbles with
// trails + billboarded nameplates, and Smart Lead-Follow Camera.

import * as THREE from 'three';
import { mat, box, ball, cyl, torus, plane, at, canvasTexture, FONT_UI, FONT_MONO, roundRect } from './util3d.js';
import { Particles } from './effects.js';
import {
  PlinkoSim,
  buildPlinkoBoard,
  zoneNameForY,
  BOARD_HALF_W,
  MARBLE_R,
  DEFAULT_PLINKO_DURATION,
} from './plinko-sim.js';

const BOARD_TILT = -0.22; // gentle arcade back-tilt (~12.5 deg) so the vertical board feels tactile
const STEP = 1 / 60;

/** Crisp upright billboarded nameplate slightly above each glowing marble. */
function makeMarbleTag(name, color) {
  const tex = canvasTexture(256, 56, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#121622';
    roundRect(ctx, 8, 8, w - 16, h - 16, 10);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#f8f9fa';
    ctx.font = `700 22px ${FONT_UI}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = name.length > 14 ? `${name.slice(0, 13)}…` : name;
    ctx.fillText(label, w / 2, h / 2 + 1);
  });
  const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(2.0, 0.46, 1);
  sprite.position.set(0, 0.78, 0.35);
  return { sprite, tex, spriteMat };
}

/** Builds a vertical Kanban board painted with the 4 swimlane tiers & all 5 obstacle prefabs. */
function buildPlinkoCabinet(scene, board, disposables) {
  scene.background = new THREE.Color('#0c1120');
  scene.fog = new THREE.Fog('#0c1120', 36, 95);

  scene.add(new THREE.HemisphereLight('#c4dcff', '#1e162e', 0.95));
  const key = new THREE.DirectionalLight('#fff4e0', 1.45);
  key.position.set(8, board.height * 0.7 + 12, 22);
  scene.add(key);

  const root = new THREE.Group();
  root.rotation.x = BOARD_TILT;
  scene.add(root);

  // Backboard painted with the 4 vertical Kanban swimlane tiers
  const backTex = canvasTexture(512, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#151b2b';
    ctx.fillRect(0, 0, w, h);

    const toPx = (y) => h * (1 - y / board.height);
    const lanes = [
      { y0: board.height, y1: board.hopperY - 0.8, bg: '#1e2640', label: '1 · THE BACKLOG', accent: '#748ffc' },
      { y0: board.hopperY - 0.8, y1: board.zone3Top, bg: '#161e33', label: '2 · IN PROGRESS', accent: '#38bdf8' },
      { y0: board.zone3Top, y1: board.zone4Top, bg: '#1c1830', label: '3 · CODE REVIEW & QA', accent: '#f06595' },
      { y0: board.zone4Top, y1: 0, bg: '#132422', label: '4 · DEPLOY TO PROD', accent: '#51cf66' },
    ];
    for (const lane of lanes) {
      const top = toPx(lane.y0);
      const bot = toPx(lane.y1);
      ctx.fillStyle = lane.bg;
      ctx.fillRect(0, top, w, bot - top);
      ctx.fillStyle = lane.accent;
      ctx.fillRect(0, top, w, 4);
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.font = `800 28px ${FONT_MONO}`;
      ctx.textAlign = 'center';
      ctx.fillText(lane.label, w / 2, top + 36);
    }

    // Glowing PROD / LEAD STANDUP banner at bottom center
    ctx.fillStyle = '#143326';
    ctx.fillRect(w * 0.25, h - 54, w * 0.5, 44);
    ctx.strokeStyle = '#51cf66';
    ctx.lineWidth = 4;
    ctx.strokeRect(w * 0.25, h - 54, w * 0.5, 44);
    ctx.fillStyle = '#8ce99a';
    ctx.font = `800 20px ${FONT_MONO}`;
    ctx.fillText('PROD · LEAD STANDUP', w / 2, h - 25);
  });
  disposables.push(backTex);
  const backMat = new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.72, metalness: 0.1 });
  disposables.push(backMat);
  root.add(at(plane(BOARD_HALF_W * 2, board.height, backMat), 0, board.height / 2, -0.35));

  // Outer cabinet frame rails + clear glass side bezels
  const frameMat = mat('#273047', { roughness: 0.45, metalness: 0.45 });
  const neonTrim = mat('#38bdf8', { emissive: '#38bdf8', emissiveIntensity: 0.75 });
  root.add(at(box(0.55, board.height + 1.0, 1.3, frameMat), -BOARD_HALF_W - 0.28, board.height / 2, 0.15));
  root.add(at(box(0.55, board.height + 1.0, 1.3, frameMat), BOARD_HALF_W + 0.28, board.height / 2, 0.15));
  root.add(at(box(BOARD_HALF_W * 2 + 1.1, 0.65, 1.3, frameMat), 0, board.height + 0.3, 0.15));
  root.add(at(box(0.12, board.height + 0.6, 0.12, neonTrim), -BOARD_HALF_W - 0.45, board.height / 2, 0.78));
  root.add(at(box(0.12, board.height + 0.6, 0.12, neonTrim), BOARD_HALF_W + 0.45, board.height / 2, 0.78));

  // Sprint Kickoff trapdoor bar (slides open at kickoff)
  const trapdoor = at(
    box(BOARD_HALF_W * 2 - 0.2, 0.22, 0.75, mat('#f2b817', { emissive: '#f2b817', emissiveIntensity: 0.45 })),
    0, board.hopperY, 0,
  );
  root.add(trapdoor);

  // Metallic pachinko pegs
  const pegMat = mat('#ced4da', { metalness: 0.8, roughness: 0.22 });
  for (const p of board.pegs) {
    root.add(at(cyl(p.r, p.r, 0.7, pegMat, 12), p.x, p.y, 0, Math.PI / 2, 0, 0));
  }

  // Scope Creep Bumpers (round neon pop-bumpers that flash on hit)
  const bumperMeshes = board.bumpers.map((bp) => {
    const bm = new THREE.MeshStandardMaterial({
      color: '#f06595',
      emissive: '#f06595',
      emissiveIntensity: 0.55,
      roughness: 0.25,
    });
    disposables.push(bm);
    const mesh = at(cyl(bp.r, bp.r * 1.06, 0.75, bm, 20), bp.x, bp.y, 0.05, Math.PI / 2, 0, 0);
    root.add(mesh);
    root.add(at(torus(bp.r * 0.72, 0.06, mat('#ffe066', { emissive: '#ffe066', emissiveIntensity: 0.8 })), bp.x, bp.y, 0.44));
    return { sim: bp, mesh, mat: bm };
  });

  // Merge Conflict Spinners (rotating 4-blade turnstiles)
  const spinnerMeshes = board.spinners.map((sp) => {
    const g = new THREE.Group();
    g.position.set(sp.x, sp.y, 0.05);
    const bladeMat = mat('#ff922b', { emissive: '#ff922b', emissiveIntensity: 0.45, roughness: 0.35 });
    g.add(box(sp.len * 2, 0.22, 0.65, bladeMat));
    g.add(box(0.22, sp.len * 2, 0.65, bladeMat));
    g.add(at(cyl(0.26, 0.26, 0.8, mat('#f8f9fa', { metalness: 0.7 })), 0, 0, 0, Math.PI / 2, 0, 0));
    root.add(g);
    return { sim: sp, group: g };
  });

  // Tech Debt Sticky Pads (amber friction strips)
  const stickyMat = mat('#f59f00', { emissive: '#d9480f', emissiveIntensity: 0.35, roughness: 0.9 });
  for (const pad of board.stickyPads) {
    root.add(at(box(pad.halfW * 2, pad.halfH * 2, 0.14, stickyMat), pad.x, pad.y, -0.22));
  }

  // "Moved to Next Sprint" Warp Pipes + clear pneumatic side return tubes
  const tubeMat = new THREE.MeshStandardMaterial({
    color: '#99e9f2',
    transparent: true,
    opacity: 0.28,
    roughness: 0.15,
    depthWrite: false,
  });
  disposables.push(tubeMat);
  const pipeMat = mat('#845ef7', { emissive: '#845ef7', emissiveIntensity: 0.7 });
  for (const wp of board.warpPipes) {
    root.add(at(torus(wp.r * 0.82, 0.12, pipeMat), wp.x, wp.y, 0.2));
    const tubeLen = board.hopperY + 0.8 - wp.y;
    root.add(at(cyl(0.45, 0.45, tubeLen, tubeMat, 14), wp.side * (BOARD_HALF_W + 0.65), wp.y + tubeLen / 2, 0.1));
  }

  // Baffle & V-funnel walls
  const wallMat = mat('#4dabf7', { emissive: '#1c7ed6', emissiveIntensity: 0.35, roughness: 0.35 });
  const wallMeshes = board.walls.map((w) => {
    const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
    const angle = Math.atan2(w.y2 - w.y1, w.x2 - w.x1);
    const mesh = at(box(len, 0.26, 0.7, wallMat), (w.x1 + w.x2) / 2, (w.y1 + w.y2) / 2, 0, 0, 0, angle);
    root.add(mesh);
    return { sim: w, mesh };
  });

  // LGTM Flippers at the bottom
  const flipperMat = mat('#51cf66', { emissive: '#2f9e44', emissiveIntensity: 0.6, roughness: 0.3 });
  const flipperMeshes = board.flippers.map((fl) => {
    const pivot = new THREE.Group();
    pivot.position.set(fl.x, fl.y, 0.05);
    pivot.add(at(box(fl.len, 0.3, 0.7, flipperMat), fl.len / 2, 0, 0));
    pivot.add(at(cyl(0.22, 0.22, 0.8, mat('#f8f9fa')), 0, 0, 0, Math.PI / 2, 0, 0));
    root.add(pivot);
    return { sim: fl, pivot };
  });

  // Glowing PROD / LEAD STANDUP finish sensor slot
  const prodGlow = new THREE.PointLight('#51cf66', 18, 12, 1.5);
  prodGlow.position.set(0, 0.8, 1.5);
  root.add(prodGlow);

  return { root, trapdoor, bumperMeshes, spinnerMeshes, wallMeshes, flipperMeshes, prodGlow };
}

// ------------------------------------------------------------------ Lobby 3D Stage (Backlog Hopper)

export class PlinkoStage {
  constructor(aspect = 16 / 9, initialNames = [], { duration = DEFAULT_PLINKO_DURATION } = {}) {
    this.t = 0;
    this.duration = duration;
    this.names = [];
    this.marbles = [];
    this.disposables = [];

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(48, aspect, 0.3, 180);
    this.board = buildPlinkoBoard(duration);
    this.cabinet = buildPlinkoCabinet(this.scene, this.board, this.disposables);
    this.setLineup(initialNames, { duration });
    this.resize(aspect);
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 1 ? 62 : 48;
    this.camera.updateProjectionMatrix();
  }

  setLineup(names = [], { duration = this.duration } = {}) {
    if (duration !== this.duration) {
      this.duration = duration;
      this.scene.remove(this.cabinet.root);
      this.board = buildPlinkoBoard(duration);
      this.cabinet = buildPlinkoCabinet(this.scene, this.board, this.disposables);
      this.marbles = [];
      this.names = [];
    }
    if (names.length === this.names.length && names.every((n, i) => n === this.names[i])) return;
    for (const m of this.marbles) this.cabinet.root.remove(m.group);
    this.marbles = [];
    this.names = [...names];

    const colors = ['#ff6b6b', '#4dabf7', '#51cf66', '#ffd43b', '#cc5de8', '#ff922b', '#20c997', '#f06595'];
    names.forEach((name, i) => {
      const color = colors[i % colors.length];
      const g = new THREE.Group();
      g.add(ball(MARBLE_R, mat(color, { emissive: color, emissiveIntensity: 0.35, roughness: 0.2, metalness: 0.2 })));
      const tag = makeMarbleTag(name, color);
      g.add(tag.sprite);
      this.disposables.push(tag.tex, tag.spriteMat);
      const cols = Math.min(8, Math.max(1, names.length));
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = cols === 1 ? 0 : -5.5 + (col / (cols - 1)) * 11;
      const y = this.board.hopperY + 0.65 + row * 0.9;
      g.position.set(x, y, 0);
      this.cabinet.root.add(g);
      this.marbles.push({ group: g, baseX: x, baseY: y, phase: i * 1.13 });
    });
  }

  update(dt, reduced = false) {
    if (!reduced) this.t += dt;
    const t = this.t;
    for (const sp of this.cabinet.spinnerMeshes) {
      sp.group.rotation.z = t * sp.sim.speed;
    }
    for (const m of this.marbles) {
      const bounce = reduced ? 0 : Math.abs(Math.sin(t * 5.2 + m.phase)) * 0.25;
      const sway = reduced ? 0 : Math.sin(t * 3.1 + m.phase) * 0.14;
      m.group.position.set(m.baseX + sway, m.baseY + bounce, 0);
    }
    const camY = this.board.height * 0.62;
    const swayX = reduced ? 0 : Math.sin(t * 0.35) * 2.2;
    this.camera.position.set(swayX, camY + 3.5, 25);
    this.camera.lookAt(0, camY - 1.5, 0);
  }

  dispose() {
    for (const d of this.disposables) d.dispose?.();
  }
}

// ------------------------------------------------------------------ Live Match (True 2.5D Physics)

export class PlinkoMatch {
  constructor(names, { duration = DEFAULT_PLINKO_DURATION, rng = Math.random, sfx = null, onEvent = null, onWinner = null } = {}) {
    this.sim = new PlinkoSim({ names, duration, rng });
    this.sfx = sfx;
    this.onEvent = onEvent;
    this.onWinner = onWinner;
    this.accumulator = 0;
    this.winnerReported = false;
    this.lastLeaderText = '';
    this.tickerHoldT = 0;
    this.disposables = [];

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.3, 180);
    this.cabinet = buildPlinkoCabinet(this.scene, this.sim.board, this.disposables);
    this.particles = new Particles(this.scene);

    // Build glowing marble meshes + faint motion trail dots + upright nameplates
    this.marbleVisuals = this.sim.marbles.map((m) => {
      const g = new THREE.Group();
      const sphere = ball(MARBLE_R, mat(m.color, { emissive: m.color, emissiveIntensity: 0.45, roughness: 0.18, metalness: 0.25 }));
      g.add(sphere);
      const tag = makeMarbleTag(m.name, m.color);
      g.add(tag.sprite);
      this.disposables.push(tag.tex, tag.spriteMat);
      g.position.set(m.x, m.y, 0);
      this.cabinet.root.add(g);

      // Faint 3-dot motion trail
      const trailMat = new THREE.MeshBasicMaterial({ color: m.color, transparent: true, opacity: 0.32 });
      this.disposables.push(trailMat);
      const trail = Array.from({ length: 3 }, (_, ti) => {
        const dot = ball(MARBLE_R * (0.65 - ti * 0.16), trailMat);
        dot.position.set(m.x, m.y, -0.05);
        this.cabinet.root.add(dot);
        return dot;
      });
      return { sim: m, group: g, trail, history: [] };
    });

    this.camPos = new THREE.Vector3(0, this.sim.board.hopperY + 2, 22);
    this.camLook = new THREE.Vector3(0, this.sim.board.hopperY - 2, 0);
    this.resize(window.innerWidth / window.innerHeight);
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 1 ? 62 : 48;
    this.camera.updateProjectionMatrix();
  }

  handleEvent(ev) {
    switch (ev.type) {
      case 'kickoff':
        this.sfx?.play('go', 0.1);
        this.onEvent?.({ type: 'note', text: ev.text, important: true });
        break;
      case 'peg':
        this.sfx?.play('plinkoPeg', 0.045, ev.depth);
        break;
      case 'bumper':
        this.sfx?.play('plinkoBumper', 0.07);
        break;
      case 'flip':
        this.sfx?.play('plinkoFlip', 0.08);
        break;
      case 'warp':
        this.sfx?.play('plinkoWarp', 0.12);
        this.tickerHoldT = 2.4;
        this.lastLeaderText = '';
        this.onEvent?.({ type: 'leader', text: `🏝️ ${ev.marble.name} was voted off the team.` });
        this.onEvent?.({ type: 'note', text: ev.text });
        break;
      case 'lap':
        this.sfx?.play('lead', 0.12);
        this.onEvent?.({ type: 'note', text: ev.text, important: true });
        break;
      case 'forcePush':
        this.sfx?.play('boost', 0.15);
        this.onEvent?.({ type: 'note', text: ev.text, important: true });
        break;
      case 'win': {
        this.sfx?.play('plinkoWin', 0.1);
        const worldPos = new THREE.Vector3(ev.marble.x, 1.0, 0.5).applyEuler(this.cabinet.root.rotation);
        this.particles.burst(worldPos, {
          count: 48,
          colors: ['#51cf66', '#f2b817', '#38bdf8', '#f06595', '#ffffff'],
          speed: 7,
          up: 6,
          life: 2.6,
          size: 0.32,
          gravity: 6,
        });
        if (!this.winnerReported) {
          this.winnerReported = true;
          this.onWinner?.(ev.marble, this.sim);
        }
        break;
      }
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

    // Animate Sprint Kickoff trapdoor sliding away
    if (this.sim.gateOpen) {
      this.cabinet.trapdoor.position.z = Math.max(-0.9, this.cabinet.trapdoor.position.z - dt * 4);
      this.cabinet.trapdoor.visible = this.cabinet.trapdoor.position.z > -0.85;
    }

    // Sync bumpers, spinners, flippers & widened funnel walls
    for (const bp of this.cabinet.bumperMeshes) {
      bp.mat.emissiveIntensity = 0.55 + bp.sim.flash * 1.4;
      const s = 1 + bp.sim.flash * 0.18;
      bp.mesh.scale.set(s, 1, s);
    }
    for (const sp of this.cabinet.spinnerMeshes) sp.group.rotation.z = sp.sim.angle;
    for (const fl of this.cabinet.flipperMeshes) fl.pivot.rotation.z = fl.sim.angle;
    for (const wm of this.cabinet.wallMeshes) {
      if (wm.sim.isFunnel && this.sim.forcePush) {
        const w = wm.sim;
        wm.mesh.position.set((w.x1 + w.x2) / 2, (w.y1 + w.y2) / 2, 0);
        wm.mesh.rotation.z = Math.atan2(w.y2 - w.y1, w.x2 - w.x1);
      }
    }

    // Sync glowing marbles & trails
    for (const mv of this.marbleVisuals) {
      mv.group.position.set(mv.sim.x, mv.sim.y, 0);
      mv.group.visible = !mv.sim.finished;
      mv.history.unshift({ x: mv.sim.x, y: mv.sim.y });
      if (mv.history.length > 9) mv.history.pop();
      mv.trail.forEach((dot, ti) => {
        const pt = mv.history[Math.min(mv.history.length - 1, (ti + 1) * 2)] ?? mv.sim;
        dot.position.set(pt.x, pt.y, -0.06);
        dot.visible = !mv.sim.finished;
      });
    }

    this.particles.update(dt);

    // Live Leader Ticker update (e.g., "1st: Ada · In QA"), paused briefly for warp-pipe callouts
    if (this.tickerHoldT > 0) this.tickerHoldT = Math.max(0, this.tickerHoldT - dt);
    const order = this.sim.standings();
    const lead = order[0];
    if (lead && !this.sim.done && this.tickerHoldT <= 0) {
      const lapSuffix = this.sim.board.lapsRequired > 1 ? ` · Lap ${lead.lap}/${this.sim.board.lapsRequired}` : '';
      const ticker = `1st: ${lead.name} · ${zoneNameForY(lead.y, this.sim.board)}${lapSuffix}`;
      if (ticker !== this.lastLeaderText) {
        this.lastLeaderText = ticker;
        this.onEvent?.({ type: 'leader', text: ticker });
      }
    }

    // Smart Lead-Follow Camera: Backlog -> Top-3 Y tracking -> Lock onto Zone 4 for photo finish!
    const top3 = order.slice(0, Math.min(3, order.length));
    const avgY = top3.reduce((s, m) => s + m.y, 0) / top3.length;
    const minY = top3[0]?.y ?? this.sim.board.hopperY;
    const spreadY = (top3[top3.length - 1]?.y ?? avgY) - minY;
    const inZone4 = minY <= this.sim.board.zone4Top + 0.8 && lead.lap === this.sim.board.lapsRequired;

    let targetY = inZone4 ? 4.2 : Math.max(4.5, Math.min(this.sim.board.hopperY - 1.5, avgY));
    const targetZ = inZone4 ? 17.5 : 21.5 + Math.min(6, spreadY * 0.45);
    const wantPos = new THREE.Vector3(0, targetY + 2.8, targetZ);
    const wantLook = new THREE.Vector3(0, targetY - 1.0, 0);
    this.camPos.lerp(wantPos, Math.min(1, dt * 4.5));
    this.camLook.lerp(wantLook, Math.min(1, dt * 5.0));
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
  }

  dispose() {
    this.particles.clear();
    for (const d of this.disposables) d.dispose?.();
  }
}
