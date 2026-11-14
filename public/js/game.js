// Runs the 3D scene: renders the track, steps the race simulation, moves the
// models to match it, drives the camera and reports what happens to the UI.

import * as THREE from 'three';
import { Track } from './track.js';
import { buildScenery } from './scenery.js';
import { RACER_KINDS, buildRacer, LABEL_Y } from './racers.js';
import { buildObstacle, buildCrate, buildProjectile } from './obstacles.js';
import { Particles } from './effects.js';
import { emojiTexture } from './util3d.js';
import { RaceSim, TUNING, shuffle, generateCourse } from './sim.js';

const STEP = 1 / 60;
const COUNTDOWN_LEAD_IN = 1.3; // seconds of camera sweep before "3"

export const ITEM_INFO = {
  coffee: { emoji: '☕', label: 'Coffee' },
  breeze: { emoji: '💨', label: 'Bay Breeze' },
  firewall: { emoji: '🛡️', label: 'Firewall' },
  bug: { emoji: '🐛', label: 'Bug' },
  forcePush: { emoji: '💥', label: 'Force Push' },
  renewedCert: { emoji: '🔐', label: 'Renewed Certificate' },
  returnUrl: { emoji: '↩️', label: '?returnUrl=' },
};

const HIT_EMOTE = {
  pit404: '🕳️',
  brokenLink: '🔗',
  mergeConflict: '⚔️',
  redirectLoop: '🔁',
  nullPointer: '❓',
  exception: '💥',
  bug: '🐛',
  forcePush: '💥',
  infiniteScroll: '📜',
  slowLoad: '⏳',
  sslExpired: '🔓',
  urlBarricade: '🚧',
};

const HIT_SOUND = { pit404: 'fall', redirectLoop: 'loop', nullPointer: 'null', exception: 'hit', forcePush: 'explode', sslExpired: 'null', urlBarricade: 'fall' };

const CONFETTI = ['#f2b817', '#c5122f', '#ffffff', '#16130f', '#ff7b00', '#2b78c5'];

const damp = (rate, dt) => 1 - Math.exp(-rate * dt);

export class Game {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} hooks  callbacks: onCountdown(text), onRaceStart(), onEvent(event), onFrame(sim), onWinner(racer), onDone()
   * @param {import('./audio.js').Sfx} sfx
   */
  constructor(canvas, hooks, sfx) {
    this.hooks = hooks;
    this.sfx = sfx;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.5, 1400);
    this.track = new Track({ length: TUNING.trackLength, halfWidth: TUNING.halfWidth });
    this.scene.add(this.track.build());
    this.scenery = buildScenery(this.scene, this.track);
    this.particles = new Particles(this.scene);
    // The lobby fly-over (also behind the results card after a skipped race) shows a
    // dressed course, with obstacles and item crates, rather than an empty bridge.
    this.showcase = this.buildShowcase();
    this.scene.add(this.showcase.group);

    this.phase = 'lobby';
    this.clock = 0;
    this.timeScale = 1;
    this.sim = null;
    this.raceGroup = null;
    this.visuals = [];
    this.obstacleVisuals = [];
    this.crateVisuals = [];
    this.projectileVisuals = new Map();
    this.disposables = [];

    this.camPos = new THREE.Vector3();
    this.camLook = new THREE.Vector3();
    this.camReady = false;
    this._a = new THREE.Vector3();
    this._b = new THREE.Vector3();
    this.focus = new THREE.Vector3();

    this.resize = this.resize.bind(this);
    this.frame = this.frame.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();
    this.last = performance.now();
    requestAnimationFrame(this.frame);
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Widen the view a little on tall/narrow windows so the pack still fits.
    this.camera.fov = w / h < 1 ? 70 : 55;
    this.camera.updateProjectionMatrix();
  }

  // ------------------------------------------------------------ race set-up

  /**
   * Builds a new race for `names` and starts the countdown.
   * Returns the line-up: [{ id, name, color, kind }].
   */
  /** A sample course layout (obstacles and crates, no racers) for the lobby fly-over. */
  buildShowcase() {
    const course = generateCourse();
    const group = new THREE.Group();
    const items = [];
    for (const o of course.obstacles) {
      const visual = buildObstacle(o, this.track);
      group.add(visual.object);
      items.push({ sim: o, visual });
    }
    for (const c of course.crates) {
      const visual = buildCrate(c, this.track);
      group.add(visual.object);
      items.push({ sim: c, visual });
    }
    return { group, items };
  }

  startRace(names, { rng = Math.random, timeScale = 1 } = {}) {
    this.clearRace();
    this.showcase.group.visible = false;
    this.timeScale = timeScale;
    this.sim = new RaceSim({ names, rng });
    this.raceGroup = new THREE.Group();
    this.scene.add(this.raceGroup);

    // Deal the characters out so every one appears before any repeats.
    let bag = [];
    const hueOffset = rng() * 360;
    const n = this.sim.racers.length;
    this.visuals = this.sim.racers.map((r, i) => {
      if (!bag.length) bag = shuffle(RACER_KINDS.map((_, k) => k), rng);
      const hue = (hueOffset + (i * 360) / n) % 360;
      const color = `#${new THREE.Color().setHSL(hue / 360, 0.85, 0.55).getHexString()}`;
      const visual = buildRacer(bag.pop(), color, r.name);
      this.raceGroup.add(visual.root);
      this.track.place(visual.root, r.s, r.d, 0);
      return visual;
    });

    for (const o of this.sim.obstacles) {
      const visual = buildObstacle(o, this.track);
      this.raceGroup.add(visual.object);
      this.obstacleVisuals.push({ sim: o, visual });
      if (visual.dispose) this.disposables.push(visual);
    }
    for (const c of this.sim.crates) {
      const visual = buildCrate(c, this.track);
      this.raceGroup.add(visual.object);
      this.crateVisuals.push({ sim: c, visual });
    }

    this.phase = 'countdown';
    this.phaseTime = 0;
    this.countShown = null;
    this.accumulator = 0;
    this.slowMo = 0;
    this.winnerAt = 0;
    this.confettiTimer = 0;
    this.doneReported = false;
    this.camReady = false;

    return this.sim.racers.map((r, i) => ({ id: r.id, name: r.name, color: this.visuals[i].color, kind: this.visuals[i].kind }));
  }

  /** Removes the current race and returns to the lobby fly-over. */
  clearRace() {
    if (this.raceGroup) {
      this.scene.remove(this.raceGroup);
      for (const v of this.visuals) v.dispose();
      for (const d of this.disposables) d.dispose();
      for (const sprite of this.projectileVisuals.values()) sprite.material.dispose();
    }
    this.raceGroup = null;
    this.sim = null;
    this.visuals = [];
    this.obstacleVisuals = [];
    this.crateVisuals = [];
    this.projectileVisuals.clear();
    this.disposables = [];
    this.particles.clear();
    this.phase = 'lobby';
    this.camReady = false;
    this.showcase.group.visible = true;
  }

  // ------------------------------------------------------------ main loop

  frame(now) {
    requestAnimationFrame(this.frame);
    const real = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    const dt = real * this.timeScale;
    this.clock += dt;

    if (this.phase === 'lobby') {
      this.updateLobbyCamera(real);
      for (const { sim, visual } of this.showcase.items) visual.update(sim, this.clock);
    } else if (this.phase === 'countdown') {
      this.updateCountdown(real);
    } else {
      this.updateRace(dt, real);
    }

    if (this.sim) this.syncVisuals(dt);
    this.scenery.update(this.clock);
    this.particles.update(dt);

    // Keep the sun (and its shadow box) centred on the action.
    this.scenery.sun.target.position.copy(this.focus);
    this.scenery.sun.position.copy(this.focus).add(this._a.set(45, 80, 35));

    this.renderer.render(this.scene, this.camera);
  }

  updateCountdown(dt) {
    this.phaseTime += dt;
    const t = this.phaseTime - COUNTDOWN_LEAD_IN;
    const count = t < 0 ? null : t < 1 ? '3' : t < 2 ? '2' : t < 3 ? '1' : 'GO';
    if (count !== this.countShown) {
      this.countShown = count;
      if (count) {
        this.hooks.onCountdown?.(count);
        this.sfx.play(count === 'GO' ? 'go' : 'count', 0);
      }
    }

    // Camera sweeps from in front of the grid, round the side, to behind it.
    const total = COUNTDOWN_LEAD_IN + 3;
    const k = Math.min(1, this.phaseTime / total);
    const ease = k * k * (3 - 2 * k);
    const rows = Math.ceil(this.sim.racers.length / 6);
    const centre = -3 - rows * 2.5;
    const radius = 18 + rows * 3.2;
    const angle = Math.PI * ease;
    const pos = this.track.point(centre + Math.cos(angle) * radius, Math.sin(angle) * radius * 0.85, 3.5 + ease * (5 + rows), this._a);
    const look = this.track.point(centre + ease * 12, 0, 1.2, this._b);
    this.setCamera(pos, look, dt, 6, 6);
    this.focus.copy(look);
    this.hooks.onFrame?.(this.sim);

    if (count === 'GO') {
      this.phase = 'racing';
      this.phaseTime = 0;
      this.hooks.onRaceStart?.();
    }
  }

  updateRace(dt, real) {
    const sim = this.sim;
    this.phaseTime += dt;

    // Brief slow motion as the winner crosses the line.
    let scale = 1;
    if (this.slowMo > 0) {
      this.slowMo -= real;
      scale = 0.3;
    }
    this.accumulator += dt * scale;
    // At 20x and the maximum 0.1-second frame, allow all 120 fixed steps.
    let steps = 0;
    while (this.accumulator >= STEP && steps < 121) {
      sim.step(STEP);
      this.accumulator -= STEP;
      steps++;
      for (const event of sim.drainEvents()) this.handleEvent(event);
    }
    if (steps === 121) this.accumulator = 0;

    this.hooks.onFrame?.(sim);

    if (this.phase === 'finished') {
      this.confettiTimer -= dt;
      const sinceWin = sim.time - this.winnerAt;
      if (this.confettiTimer <= 0 && sinceWin < 9) {
        this.confettiTimer = 0.28;
        const w = sim.winner;
        const origin = this.track.point(w.s + (Math.random() - 0.5) * 10, w.d + (Math.random() - 0.5) * 12, 7 + Math.random() * 3, this._a);
        this.particles.burst(origin, { count: 26, colors: CONFETTI, speed: 6, up: 3, life: 3.2, size: 0.34, gravity: 5, flat: true, spread: 3 });
      }
      if (sim.done && !this.doneReported) {
        this.doneReported = true;
        this.hooks.onDone?.(sim);
      }
    }

    this.updateRaceCamera(dt);
  }

  // ------------------------------------------------------------ events

  handleEvent(e) {
    const visual = e.racer ? this.visuals[e.racer.id] : null;
    switch (e.type) {
      case 'pickup':
        this.sfx.play('pickup');
        this.sparkle(e.crate.s, e.crate.d, 1.4, ['#ffe066', '#ffffff', '#c99a5b'], 10);
        break;
      case 'use':
        this.emote(visual, ITEM_INFO[e.item].emoji);
        if (e.item === 'coffee' || e.item === 'breeze') this.sfx.play('boost');
        else if (e.item === 'firewall' || e.item === 'renewedCert' || e.item === 'returnUrl') this.sfx.play('shield');
        else this.sfx.play(e.wasted ? 'boost' : 'throw');
        break;
      case 'hit': {
        this.emote(visual, HIT_EMOTE[e.cause] || '💫');
        this.sfx.play(HIT_SOUND[e.cause] || 'hit');
        if (e.cause === 'forcePush') this.explosion(e.racer.s, e.racer.d);
        else if (e.cause !== 'exception') this.sparkle(e.racer.s, e.racer.d, 1, ['#ffffff', '#ffd43b', visual.color], 12);
        break;
      }
      case 'zone':
        this.emote(visual, HIT_EMOTE[e.obstacle.type]);
        break;
      case 'block':
        this.emote(visual, '🛡️');
        this.sfx.play('block');
        this.sparkle(e.racer.s, e.racer.d, 1.2, ['#66d9e8', '#ffffff'], 18);
        break;
      case 'pass':
        // Drove straight through an obstacle thanks to the matching item.
        this.emote(visual, ITEM_INFO[e.item].emoji);
        this.sfx.play('block');
        this.sparkle(e.racer.s, e.racer.d, 1.2, ['#8ce99a', '#ffffff'], 18);
        break;
      case 'explode':
        this.sfx.play('explode');
        this.explosion(e.s, e.d);
        break;
      case 'lead':
        this.sfx.play('lead', 1);
        break;
      case 'finish':
        if (e.place === 1) {
          this.phase = 'finished';
          this.winnerAt = this.sim.time;
          this.slowMo = 1.4;
          this.sfx.play('win', 0);
          // Winner's name tag always shows on top, even with the pack crowding round.
          visual.label.material.depthTest = false;
          visual.label.renderOrder = 20;
          this.hooks.onWinner?.(e.racer, this.visuals[e.racer.id].kind);
        }
        break;
    }
    this.hooks.onEvent?.(e);
  }

  emote(visual, glyph) {
    if (!visual) return;
    visual.emote.material.map = emojiTexture(glyph);
    visual.emote.visible = true;
    visual.emoteTime = 1.3;
  }

  sparkle(s, d, y, colors, count) {
    this.particles.burst(this.track.point(s, d, y, this._a), { count, colors, speed: 5, up: 5, life: 0.7, size: 0.22 });
  }

  explosion(s, d) {
    const origin = this.track.point(s, d, 1, this._a);
    this.particles.burst(origin, { count: 46, colors: ['#ff6b6b', '#ffa94d', '#ffe066', '#ffffff'], speed: 13, up: 10, life: 1, size: 0.42 });
    this.particles.burst(origin, { count: 14, colors: ['#343a40', '#495057'], speed: 5, up: 7, life: 1.4, size: 0.7, gravity: 4 });
  }

  // ------------------------------------------------------------ visuals

  syncVisuals(dt) {
    const sim = this.sim;
    const t = this.clock;
    const racing = this.phase !== 'countdown';

    for (const r of sim.racers) {
      const v = this.visuals[r.id];
      this.track.place(v.root, r.s, r.d, 0);
      v.tick(t + r.id * 0.37, dt);

      // Lean into sideways movement.
      const lateral = v.prevD === null || dt <= 0 ? 0 : (r.d - v.prevD) / dt;
      v.prevD = r.d;
      const targetYaw = r.stun ? 0 : -Math.atan2(lateral, Math.max(r.v, 8)) * 1.3;
      v.yaw += (targetYaw - v.yaw) * damp(10, dt);

      const body = v.body;
      body.position.set(0, 0, 0);
      body.rotation.set(0, v.yaw, 0);
      body.scale.setScalar(1);
      v.root.visible = true;
      let label = v.labelTexture;

      if (r.stun) {
        const st = r.stun;
        const p = Math.min(1, st.t / st.dur);
        switch (st.kind) {
          case 'errorPit':
          case 'fall':
            if (p < 0.4) {
              const q = p / 0.4;
              body.position.y = -5 * q * q;
              body.scale.setScalar(1 - q * 0.6);
              body.rotation.x = q * 1.2;
            } else if (p < 0.55) {
              body.scale.setScalar(0.001);
            } else {
              // Respawn: drop back in from above, blinking.
              const q = (p - 0.55) / 0.45;
              body.position.y = 7 * (1 - q) * (1 - q);
              v.root.visible = Math.floor(st.t * 14) % 2 === 0 || q > 0.8;
            }
            break;
          case 'spin':
            body.rotation.y = (1 - (1 - p) * (1 - p)) * Math.PI * 4;
            body.position.y = Math.sin(p * Math.PI) * 0.5;
            break;
          case 'cert':
          case 'conflict':
            body.position.x = Math.sin(st.t * 55) * 0.13 * (1 - p);
            body.rotation.x = 0.3 * (1 - p);
            body.position.z = 0.8 * Math.sin(Math.min(1, p * 4) * Math.PI * 0.5) * (1 - p);
            break;
          case 'loop':
            body.rotation.y = -(st.a0 + p * Math.PI * 4) - Math.PI;
            body.rotation.z = 0.35;
            break;
          case 'null':
            v.root.visible = Math.floor(st.t * 16) % 3 !== 0;
            body.scale.set(1, 0.85 + Math.sin(st.t * 30) * 0.08, 1);
            label = v.nullTexture;
            break;
          case 'blast':
            body.position.y = Math.sin(p * Math.PI) * 5;
            body.rotation.x = p * Math.PI * 4;
            body.rotation.z = Math.sin(p * Math.PI) * 0.6;
            break;
        }
      } else if (r.finished) {
        if (r.place === 1) {
          // Victory hops and a slow twirl.
          const since = sim.time - r.finishTime;
          body.position.y = Math.abs(Math.sin(since * 5)) * 1.1;
          body.rotation.y = since * 2.2;
        }
      } else if (racing) {
        // Engine shake and a little bounce.
        body.position.y = Math.abs(Math.sin(t * 13 + r.id)) * 0.05 * Math.min(1, r.v / 10);
        if (r.boostT > 0) {
          body.rotation.x = 0.09;
          body.scale.set(0.95, 0.97, 1.1);
        }
        if (r.zone?.type === 'slowLoad') body.rotation.z = Math.sin(t * 5 + r.id) * 0.06;
      } else {
        // Revving on the grid.
        body.position.y = Math.abs(Math.sin(t * 9 + r.id * 1.3)) * 0.07;
      }

      if (v.label.material.map !== label) v.label.material.map = label;
      // Keep name tags a steady size on screen: shrink them near the camera, grow them far away.
      let tagScale = Math.min(1.7, Math.max(0.4, this.camera.position.distanceTo(v.root.position) / 26));
      if (r.place === 1) tagScale *= 1.5; // the winner gets the biggest name tag
      v.label.scale.set(4.4 * tagScale, 1.1 * tagScale, 1);
      v.label.position.y = LABEL_Y - (1 - Math.min(1, tagScale)) * 1.1 + (r.place === 1 ? 1.2 : 0);

      const spin = r.v * dt * 2.6;
      for (const wheel of v.wheels) wheel.rotation.x -= spin;

      const boosting = r.boostT > 0 && !r.stun;
      v.flame.visible = boosting;
      if (boosting) v.flame.scale.set(1, 1, 0.7 + Math.random() * 0.8);

      v.shield.visible = r.shield > 0;
      if (v.shield.visible) {
        // Flicker when the firewall is about to expire.
        const pulse = 1 + Math.sin(t * 6) * 0.04;
        v.shield.scale.setScalar(1.4 * pulse);
        if (r.shield < 2) v.shield.visible = Math.floor(t * 10) % 2 === 0;
      }

      v.itemIcon.visible = Boolean(r.item) && !r.stun;
      if (r.item) {
        const texture = emojiTexture(ITEM_INFO[r.item].emoji);
        if (v.itemIcon.material.map !== texture) v.itemIcon.material.map = texture;
        v.itemIcon.position.y = LABEL_Y + 1.05 + Math.sin(t * 6 + r.id) * 0.08;
      }

      if (v.emoteTime > 0) {
        v.emoteTime -= dt;
        const q = 1 - v.emoteTime / 1.3;
        v.emote.position.y = LABEL_Y + 1.3 + q * 1.6;
        v.emote.material.opacity = Math.min(1, v.emoteTime * 3);
        const pop = 1.8 * Math.min(1, q * 6);
        v.emote.scale.set(pop, pop, 1);
        if (v.emoteTime <= 0) v.emote.visible = false;
      }
    }

    for (const { sim: o, visual } of this.obstacleVisuals) visual.update(o, t);
    for (const { sim: c, visual } of this.crateVisuals) visual.update(c, t);

    // Thrown items.
    const live = new Set();
    for (const p of sim.projectiles) {
      live.add(p.id);
      let sprite = this.projectileVisuals.get(p.id);
      if (!sprite) {
        sprite = buildProjectile(p.kind);
        this.projectileVisuals.set(p.id, sprite);
        this.raceGroup.add(sprite);
      }
      const height = p.kind === 'bug' ? 1.6 + Math.sin(p.t * 14) * 0.3 : 3 + Math.sin(Math.min(1, p.t / 1.2) * Math.PI) * 2.5;
      this.track.point(p.s, p.d, height, sprite.position);
      if (p.kind === 'forcePush' && Math.random() < 0.6) {
        this.particles.burst(sprite.position, { count: 1, colors: ['#ff6b6b', '#ffe066'], speed: 1, up: 1, life: 0.4, size: 0.25, gravity: 0 });
      }
    }
    for (const [id, sprite] of this.projectileVisuals) {
      if (!live.has(id)) {
        this.raceGroup.remove(sprite);
        sprite.material.dispose();
        this.projectileVisuals.delete(id);
      }
    }
  }

  // ------------------------------------------------------------ cameras

  setCamera(pos, look, dt, posRate = 3, lookRate = 5) {
    if (!this.camReady) {
      this.camPos.copy(pos);
      this.camLook.copy(look);
      this.camReady = true;
    } else {
      this.camPos.lerp(pos, damp(posRate, dt));
      this.camLook.lerp(look, damp(lookRate, dt));
    }
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
  }

  updateLobbyCamera(dt) {
    // Slow fly-over of the course while the lobby is open.
    const s = (this.clock * 9) % (this.track.length - 60);
    const pos = this.track.point(s - 34, Math.sin(this.clock * 0.25) * 12, 24 + Math.sin(this.clock * 0.4) * 4, this._a);
    const look = this.track.point(s + 34, 0, 0, this._b);
    // Snap (rather than glide the whole way back) when the loop restarts.
    if (this.camReady && this.camPos.distanceToSquared(pos) > 100 * 100) this.camReady = false;
    this.setCamera(pos, look, dt, 2, 2);
    this.focus.copy(look);
  }

  updateRaceCamera(dt) {
    const sim = this.sim;
    const order = sim.standings();

    if (this.phase === 'finished') {
      // Swing round to face the winner.
      const w = sim.winner;
      const since = sim.time - this.winnerAt;
      const k = Math.min(1, since / 3);
      const orbit = k * k * (3 - 2 * k);
      const side = w.d > 0 ? -1 : 1;
      // Swing wide round the side (not through the pack), ending in front of the winner.
      // Aiming below the winner keeps them in the upper half, clear of the result card.
      const pos = this.track.point(w.s - 8 + orbit * 23, w.d + side * (13 - orbit * 6), 9 - orbit * 3.5, this._a);
      const look = this.track.point(w.s, w.d, 2.2 - orbit * 2.6, this._b);
      this.setCamera(pos, look, dt, 4, 6);
      this.focus.copy(look);
      return;
    }

    // Follow the leaders: frame the first few racers, pulling back as they spread out.
    const leader = order[0];
    const tail = order[Math.min(order.length - 1, 2)];
    const spread = Math.min(32, leader.s - tail.s);
    let lateral = 0;
    const group = Math.min(order.length, 3);
    for (let i = 0; i < group; i++) lateral += order[i].d;
    lateral /= group;

    const focusS = leader.s - spread * 0.45;
    const back = 13 + spread * 0.5;
    const height = 8.5 + spread * 0.26;
    const pos = this.track.point(focusS - back, lateral * 0.45, height, this._a);
    const look = this.track.point(focusS + 9, lateral * 0.7, 1, this._b);
    this.setCamera(pos, look, dt, 2.6, 4.5);
    this.focus.copy(look);
  }
}

/** Runs a whole race instantly, for browsers where WebGL is unavailable. */
export function runHeadless(names, rng = Math.random) {
  const sim = new RaceSim({ names, rng });
  while (!sim.done && sim.time < 600) sim.step(1 / 30);
  return sim;
}
