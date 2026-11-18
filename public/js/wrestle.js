// "Let's Rumble" and "HD": the same 3D ring acting out the plan from wrestle-sim.js:
// intro orbit with the bell, everyone in the ring brawling at once, ring-outs over the top rope,
// a close call for the final two, and the winner's celebration, with the camera circling throughout.

import * as THREE from 'three';
import { mat, box, cyl, plane, at, canvasTexture, drawMarylandFlag, MD, FONT_UI } from './util3d.js';
import { planMatch, pairUp, PACE } from './wrestle-sim.js';
import { buildWrestler, pose, lowestBodyPoint } from './wrestlers.js';
import { Particles } from './effects.js';
import { Crowd } from './crowd.js';

const MAT_Y = 1.3; // height of the ring canvas
const HALF = 6; // ring half-width, to the ropes
const ROPES = [0.55, 1.05, 1.55]; // rope heights above the canvas
const SIDES = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const CONFETTI = [MD.gold, MD.red, '#ffffff', MD.black, '#ff7b00'];

const damp = (rate, dt) => 1 - Math.exp(-rate * dt);
const ease = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
const clamp01 = (k) => Math.max(0, Math.min(1, k));
const headingTo = (fromX, fromZ, toX, toZ) => Math.atan2(-(toX - fromX), -(toZ - fromZ));
const lerpAngle = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;

// A thrown wrestler lands flat on the back (pitch +π/2: face up), then bounces twice.
const ON_BACK = Math.PI / 2;
export const BOUNCES = [
  { end: 0.34, height: 0.45 },
  { end: 0.56, height: 0.13 },
];
/** Height of the bounce `since` seconds after landing: two arcs, each smaller than the last. */
export function bounce(since) {
  let start = 0;
  for (const b of BOUNCES) {
    if (since < b.end) return since < 0 ? 0 : b.height * Math.sin((Math.PI * (since - start)) / (b.end - start));
    start = b.end;
  }
  return 0;
}

// How each roster style shows in the ring.
const QUICK = new Set(['duck', 'rebound']); // Abhimanyu and Satyaki move faster
const LIFTERS = new Set(['overhead', 'illusion']); // Bhima and the towering Ghatotkacha throw overhead
const HIP_TOSS = new Set(['patient', 'composed']); // Karna and Shikhandi turn a charge into a sideways throw
const PUSHERS = new Set(['bruiser', 'crowd']); // Kichaka and Dushasana drive opponents into the ropes
const quick = (w) => (QUICK.has(w.kind.style) ? 1.3 : 1);

export class WrestleMatch {
  /**
   * @param {string[]} names  the wrestlers (2 to 12), as shown on screen
   * @param {object} options  { rng, sfx, modelStyle: 'classic' | 'hd', onEvent(e), onWinner(wrestler) }
   */
  constructor(names, { rng = Math.random, sfx = null, onEvent = () => {}, onWinner = () => {}, previewPlan = null, modelStyle = 'hd' } = {}) {
    if (modelStyle !== 'classic' && modelStyle !== 'hd') throw new Error('Unknown wrestling model style.');
    this.modelStyle = modelStyle;
    this.plan = previewPlan ?? planMatch(names, rng);
    this.sfx = sfx;
    this.onEvent = onEvent;
    this.onWinner = onWinner;
    this.t = 0;
    this.fired = new Set();
    this.tagFade = 1; // name tags fade to 0 once the results card is up
    this.box = new THREE.Box3();
    this.tagsFading = false;
    this.textures = [];

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0b1020');
    this.scene.fog = new THREE.Fog('#0b1020', 30, 70);
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.3, 200);
    this.camPos = new THREE.Vector3(0, 15, 19);
    this.camLook = new THREE.Vector3(0, MAT_Y, 0);
    this.orbit = Math.random() * Math.PI * 2;
    this.particles = new Particles(this.scene);

    this.buildArena();
    this.wrestlers = this.plan.wrestlers.map((w, i) => {
      const hue = (i * 360) / this.plan.wrestlers.length;
      const color = `#${new THREE.Color().setHSL(hue / 360, 0.75, 0.55).getHexString()}`;
      const rig = buildWrestler(w.kind, color, w.name, { original: modelStyle === 'classic' });
      const angle = (i / this.plan.wrestlers.length) * Math.PI * 2;
      const state = {
        ...w,
        rig,
        color,
        x: Math.cos(angle) * 3.4,
        z: Math.sin(angle) * 3.4,
        y: MAT_Y,
        heading: 0,
        mode: 'roam',
        target: null,
        timer: 0,
        speed: 1.6,
        walk: Math.random() * 6,
        out: false,
        foe: null, // who they're fighting (wrestle-sim.js pairUp)
        fight: null, // the move the two of them are in, shared by both
        last: null, // who they last broke away from
        swing: 0,
        rebound: 0,
        phase: Math.random() * 6,
      };
      state.heading = headingTo(state.x, state.z, 0, 0);
      rig.root.rotation.order = 'YXZ';
      state.baseScale = rig.root.scale.x;
      this.scene.add(rig.root, rig.tags);
      return state;
    });
    this.lineup = this.wrestlers.map((w) => ({ id: w.id, name: w.name, kind: w.kind, color: w.color }));
  }

  // ------------------------------------------------------------ arena

  buildArena() {
    const scene = this.scene;
    scene.add(new THREE.HemisphereLight('#c8d6ff', '#20140c', 0.9));
    const key = new THREE.DirectionalLight('#fff2dc', 1.6);
    key.position.set(8, 22, 10);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 5, far: 60 });
    key.shadow.bias = -0.0005;
    scene.add(key);
    for (const [x, z, c] of [[-12, -12, '#ff922b'], [12, 12, '#4dabf7'], [12, -12, '#ffd43b'], [-12, 12, '#f06595']]) {
      const spot = new THREE.SpotLight(c, 60, 45, 0.45, 0.6, 1.4);
      spot.position.set(x, 16, z);
      spot.target.position.set(0, MAT_Y, 0);
      scene.add(spot, spot.target);
    }

    // Arena floor.
    const floor = plane(120, 120, mat('#1a1f2e', { roughness: 0.95 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // The ring: canvas on top, apron with the derby's name around the sides.
    const canvasTop = this.texture(512, 512, (ctx, w, h) => {
      ctx.fillStyle = '#e9e4d8';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#c9c1ad';
      ctx.lineWidth = 6;
      ctx.strokeRect(10, 10, w - 20, h - 20);
      ctx.save();
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 120, 0, Math.PI * 2);
      ctx.clip();
      drawMarylandFlag(ctx, w / 2 - 180, h / 2 - 120, 360, 240);
      ctx.restore();
      ctx.lineWidth = 10;
      ctx.strokeStyle = MD.black;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 120, 0, Math.PI * 2);
      ctx.stroke();
    });
    const apron = this.texture(1024, 128, (ctx, w, h) => {
      ctx.fillStyle = MD.black;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = MD.gold;
      ctx.fillRect(0, 0, w, 10);
      ctx.fillRect(0, h - 10, w, 10);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const title = 'KURUKSHETRA BATTLE ROYAL';
      let px = 64;
      ctx.font = `900 ${px}px ${FONT_UI}`;
      while (ctx.measureText(title).width > w - 80 && px > 30) {
        px -= 2;
        ctx.font = `900 ${px}px ${FONT_UI}`;
      }
      ctx.fillText(title, w / 2, h / 2 + 3);
    });
    const topMat = new THREE.MeshStandardMaterial({ map: canvasTop, roughness: 0.9 });
    const apronMat = new THREE.MeshStandardMaterial({ map: apron, roughness: 0.8 });
    // Owned by this match (unlike the shared util3d shapes and colours), so freed in dispose().
    this.ownedMaterials = [topMat, apronMat];
    const ring = box(2 * HALF + 1, MAT_Y, 2 * HALF + 1, [apronMat, apronMat, topMat, apronMat, apronMat, apronMat]);
    ring.position.y = MAT_Y / 2;
    ring.receiveShadow = true;
    scene.add(ring);

    // Corner posts, turnbuckle pads and three ropes a side.
    const post = mat('#adb5bd', { metalness: 0.6, roughness: 0.35 });
    const pad = mat(MD.red);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        scene.add(at(cyl(0.16, 0.16, MAT_Y + 1.95, post, 10), sx * (HALF + 0.15), (MAT_Y + 1.95) / 2, sz * (HALF + 0.15)));
        for (const y of ROPES) scene.add(at(box(0.36, 0.3, 0.36, pad), sx * (HALF + 0.05), MAT_Y + y, sz * (HALF + 0.05)));
      }
    }
    const ropeMats = [mat(MD.red), mat('#f8f9fa'), mat(MD.gold)];
    for (const [nx, nz] of SIDES) {
      ROPES.forEach((y, i) => {
        const rope = cyl(0.05, 0.05, 2 * HALF + 0.3, ropeMats[i], 8);
        rope.rotation.set(nx ? Math.PI / 2 : 0, 0, nz ? Math.PI / 2 : 0);
        rope.position.set(nx * (HALF + 0.1), MAT_Y + y, nz * (HALF + 0.1));
        scene.add(rope);
      });
    }

    // The crowd: varied fans, hand-lettered signs, reacting to the action (crowd.js).
    this.crowd = new Crowd(scene, this.plan.wrestlers.map((w) => w.name));
  }

  texture(w, h, draw) {
    const t = canvasTexture(w, h, draw);
    this.textures.push(t);
    return t;
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 1 ? 68 : 50;
    this.camera.updateProjectionMatrix();
  }

  // ------------------------------------------------------------ main loop

  /** Fades out every floating name tag over about half a second (when the results card appears). */
  fadeNameTags() {
    this.tagsFading = true;
  }

  emit(key, event) {
    if (this.fired.has(key)) return;
    this.fired.add(key);
    this.onEvent(event);
  }

  update(dt) {
    this.t += dt;
    if (this.tagsFading) this.tagFade = Math.max(0, this.tagFade - dt / 0.5);
    const t = this.t;
    if (t > 0.5 && !this.fired.has('bell')) {
      this.sfx?.play('bell', 0);
      this.emit('bell', { type: 'bell', lineup: this.lineup });
    }

    const beat = this.plan.beats.find((b) => t >= b.start && t < b.end) ?? this.plan.beats[this.plan.beats.length - 1];
    const active = new Set();
    for (const b of this.plan.beats) {
      if (b.type === 'elimination' && t >= b.start && t < b.end) this.playElimination(b, t, active);
      if (b.type === 'closeCall' && t >= b.start && t < b.end) this.playCloseCall(b, t, active);
      if (b.type === 'final' && t >= b.start) this.emit(`final`, { type: 'final', pair: b.pair.map((id) => this.wrestlers[id]) });
    }
    const victory = this.plan.beats[this.plan.beats.length - 1];
    if (t >= victory.start) this.playVictory(victory, t, active, dt);

    for (const w of this.wrestlers) if (w.out && !active.has(w.id)) this.playOut(w, dt);
    // A battle royal: everyone in the ring who isn't in a throw or the close call is fighting someone.
    const free = this.wrestlers.filter((w) => !w.out && !active.has(w.id));
    const foes = pairUp(free);
    for (const w of free) {
      w.mode = 'roam';
      w.foe = foes.get(w.id) ?? null;
      if (w.fight && w.fight !== this.wrestlers[w.foe]?.fight) w.fight = null;
    }
    for (const w of free) {
      const o = w.foe === null ? null : this.wrestlers[w.foe];
      if (!o) this.circle(w, dt, beat);
      else if (o.foe !== w.id) this.gangUp(w, o, dt, beat);
      else if (w.id < o.id) this.brawl(w, o, dt, beat);
    }
    this.separate();
    for (const w of this.wrestlers) this.place(w);
    this.crowd.update(t);
    this.updateCamera(dt, beat);
    this.particles.update(dt);
  }

  // ------------------------------------------------------------ free movement

  inRing() {
    return this.wrestlers.filter((w) => !w.out);
  }

  /** Nobody free to fight (everyone else is in a throw): circle, and now and then run the ropes. */
  circle(w, dt, beat) {
    const slow = (beat.type === 'final' || beat.type === 'closeCall' ? 0.65 : 1) * quick(w);
    const ropeChance = w.kind.style === 'rebound' ? 0.45 : 0.22; // Satyaki lives on the ropes
    w.timer -= dt;
    const dx = (w.target?.x ?? w.x) - w.x;
    const dz = (w.target?.z ?? w.z) - w.z;
    const dist = Math.hypot(dx, dz);
    if (!w.target || dist < 0.25 || w.timer <= 0) {
      if (w.target?.rope) {
        // Bounce off the ropes and run back across the ring.
        w.rebound = 0.3;
        w.target = this.pickSpot(beat, 2.5);
        w.speed = 4.2 * slow;
      } else if (Math.random() < ropeChance) {
        const [nx, nz] = SIDES[Math.floor(Math.random() * 4)];
        const along = -3.5 + Math.random() * 7;
        w.target = { x: nx * (HALF - 0.7) + (nz ? along : 0), z: nz * (HALF - 0.7) + (nx ? along : 0), rope: true };
        if (this.nearAction(w.target, beat)) w.target = this.pickSpot(beat);
        w.speed = 3.6 * slow;
      } else {
        w.target = this.pickSpot(beat);
        w.speed = 1.5 * slow;
      }
      w.timer = 1.5 + Math.random() * 2;
      return;
    }
    const step = Math.min(dist, w.speed * dt);
    w.x += (dx / dist) * step;
    w.z += (dz / dist) * step;
    w.y = MAT_Y;
    w.walk += step * 3.2;
    // Face the action when moving slowly, the way you're running when fast.
    const near = this.nearest(w);
    const face = w.speed > 2.5 || !near ? Math.atan2(-dx, -dz) : headingTo(w.x, w.z, near.x, near.z);
    w.heading = lerpAngle(w.heading, face, damp(6, dt));
    w.rebound = Math.max(0, w.rebound - dt);
    pose(w.rig, { walk: w.walk, stride: Math.min(0.7, w.speed * 0.2), guard: w.speed > 2.5 ? 0.2 : 0.8, crouch: 0.25, lean: w.rebound ? -0.5 : 0.1 });
  }

  /**
   * Two wrestlers fighting each other: closing in, lock-ups, forearm strikes, shoves across the ring and
   * circling, until they break apart and find someone new. Called once per pair, for both of them.
   */
  brawl(a, b, dt, beat) {
    let f = a.fight;
    if (!f || f !== b.fight) {
      f = { move: 'close', t: 0, dur: 4, age: 0, life: 5 + Math.random() * 5, by: a };
      a.fight = b.fight = f;
    }
    f.t += dt;
    f.age += dt;
    const pace = beat.type === 'final' ? 0.8 : 1;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const d = Math.hypot(dx, dz) || 0.001;
    const ux = dx / d;
    const uz = dz / d;
    const att = f.by;
    const def = att === a ? b : a;
    const ax = att === a ? ux : -ux; // from the attacker towards the defender
    const az = att === a ? uz : -uz;
    const step = (w, mx, mz, speed) => {
      const s = speed * dt * pace;
      w.x += mx * s;
      w.z += mz * s;
      w.walk += Math.abs(s) * 3.2;
    };
    const k = clamp01(f.t / f.dur);
    if (f.move === 'close') {
      // Size each other up and close in.
      if (d > 1.15) {
        step(a, ux, uz, 1.8 * quick(a));
        step(b, -ux, -uz, 1.8 * quick(b));
      } else f.t = f.dur;
      for (const w of [a, b]) pose(w.rig, { walk: w.walk, stride: 0.4, guard: 0.8, crouch: 0.25 });
    } else if (f.move === 'lockup') {
      // Collar-and-elbow tie-up, the pair swaying back and forth as each tries to drive the other.
      const sway = Math.cos(f.t * 3.2) * 0.7;
      step(a, ux, uz, sway + (d > 1.1 ? 0.6 : 0));
      step(b, ux, uz, sway - (d > 1.1 ? 0.6 : 0));
      for (const w of [a, b]) {
        w.pulse = w.kind.style === 'shapeshift' ? 1 + 0.08 * Math.sin(f.t * 24) : 1; // Hidimbi changes form
        pose(w.rig, { armsForward: 1, crouch: 0.35, lean: 0.3, walk: w.walk, stride: 0.12 });
      }
    } else if (f.move === 'strikes') {
      // Forearm shots, left and right; the defender rocks back with each one.
      const p = (f.t * 2.4) % 1;
      const side = Math.floor(f.t * 2.4) % 2 ? 1 : -1;
      const blow = p < 0.35 ? Math.sin((p / 0.35) * Math.PI) : 0;
      const recoil = p > 0.2 && p < 0.65 ? Math.sin(((p - 0.2) / 0.45) * Math.PI) : 0;
      step(def, ax, az, recoil * 1.4);
      step(att, ax, az, 0.5);
      pose(att.rig, { armsForward: 0.3 + blow, twist: side * 0.6 * blow, lean: 0.2 + 0.25 * blow, crouch: 0.25, guard: 0.5 * (1 - blow) });
      pose(def.rig, { guard: 0.9, lean: -0.4 * recoil, crouch: 0.2, look: -0.25 * recoil, tilt: side * 0.2 * recoil });
    } else if (f.move === 'shove') {
      // Driving the defender back across the ring, maybe into the ropes.
      const drive = Math.sin(k * Math.PI) * 2.6 * (PUSHERS.has(att.kind.style) ? 1.25 : 1);
      step(att, ax, az, drive + (d > 1.15 ? 1.5 : 0));
      step(def, ax, az, drive);
      pose(att.rig, { armsForward: 1.2, lean: 0.45, crouch: 0.3, walk: att.walk, stride: 0.45 });
      pose(def.rig, { armsForward: 0.6, lean: -0.3, crouch: 0.2, walk: def.walk, stride: 0.4 });
    } else {
      // Break, and circle each other looking for an opening.
      step(a, -uz, ux, 1.3);
      step(b, uz, -ux, 1.3);
      if (d < 1.6) {
        step(a, -ux, -uz, 1.2);
        step(b, ux, uz, 1.2);
      }
      for (const w of [a, b]) pose(w.rig, { walk: w.walk, stride: 0.35, guard: 0.8, crouch: 0.3 });
    }
    // Keep clear of a throw or close call going on elsewhere in the ring.
    const c = this.actionCentre(beat);
    if (c) {
      const mx = (a.x + b.x) / 2 - c.x;
      const mz = (a.z + b.z) / 2 - c.z;
      const m = Math.hypot(mx, mz) || 0.001;
      if (m < 3.6) for (const w of [a, b]) step(w, mx / m, mz / m, 2);
    }
    a.y = b.y = MAT_Y;
    a.heading = lerpAngle(a.heading, headingTo(a.x, a.z, b.x, b.z), damp(10, dt));
    b.heading = lerpAngle(b.heading, headingTo(b.x, b.z, a.x, a.z), damp(10, dt));
    if (f.t < f.dur) return;
    a.pulse = b.pulse = 1;
    if (f.age > f.life && f.move !== 'close') {
      // Break apart and go find someone else.
      a.last = b.id;
      b.last = a.id;
      a.foe = b.foe = a.fight = b.fight = null;
    } else this.nextMove(f, a, b, d);
  }

  /** The next exchange in a fight, and who leads it. Pushers (Kichaka, Dushasana) like to shove. */
  nextMove(f, a, b, d) {
    f.t = 0;
    f.by = Math.random() < 0.5 ? a : b;
    if (d > 1.4) {
      f.move = 'close';
      f.dur = 4; // ends as soon as they meet
      return;
    }
    const r = Math.random();
    if (PUSHERS.has(f.by.kind.style) && r < 0.4) f.move = 'shove';
    else f.move = r < 0.3 ? 'lockup' : r < 0.6 ? 'strikes' : r < 0.8 ? 'shove' : 'circle';
    f.dur = { lockup: 1.2 + Math.random() * 0.8, strikes: 1.25, shove: 1, circle: 0.8 + Math.random() * 0.6 }[f.move];
  }

  /** Two on one: the odd wrestler out joins the nearest fight and lays in forearm shots. */
  gangUp(w, o, dt, beat) {
    const dx = o.x - w.x;
    const dz = o.z - w.z;
    const d = Math.hypot(dx, dz) || 0.001;
    w.y = MAT_Y;
    w.heading = lerpAngle(w.heading, headingTo(w.x, w.z, o.x, o.z), damp(10, dt));
    if (d > 1.35) {
      const s = Math.min(d - 1.3, 2 * quick(w) * dt * (beat.type === 'final' ? 0.8 : 1));
      w.x += (dx / d) * s;
      w.z += (dz / d) * s;
      w.walk += s * 3.2;
      w.swing = 0;
      pose(w.rig, { walk: w.walk, stride: 0.4, guard: 0.8, crouch: 0.25 });
      return;
    }
    w.swing += dt;
    const p = (w.swing * 2) % 1;
    const side = Math.floor(w.swing * 2) % 2 ? 1 : -1;
    const blow = p < 0.35 ? Math.sin((p / 0.35) * Math.PI) : 0;
    pose(w.rig, { armsForward: 0.3 + blow, twist: side * 0.6 * blow, lean: 0.2 + 0.25 * blow, crouch: 0.25, guard: 0.5 * (1 - blow) });
  }

  pickSpot(beat, radius = 4.6) {
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * radius;
      const p = { x: Math.cos(a) * r, z: Math.sin(a) * r };
      if (!this.nearAction(p, beat)) return p;
    }
    return { x: 0, z: 0 };
  }

  /** Where in the ring a throw or close call is happening, if one is. */
  actionCentre(beat) {
    if (beat.type !== 'elimination' && beat.type !== 'closeCall') return null;
    const [nx, nz] = SIDES[beat.side];
    return { x: nx * (HALF - 1.5) + (nz ? beat.spot : 0), z: nz * (HALF - 1.5) + (nx ? beat.spot : 0) };
  }

  /** Keep free wrestlers out of the way of a throw or close call. */
  nearAction(p, beat) {
    const c = this.actionCentre(beat);
    return c !== null && Math.hypot(p.x - c.x, p.z - c.z) < 3.2;
  }

  nearest(w) {
    let best = null;
    let bestD = Infinity;
    for (const o of this.wrestlers) {
      if (o === w || o.out) continue;
      const d = Math.hypot(o.x - w.x, o.z - w.z);
      if (d < bestD) {
        bestD = d;
        best = o;
      }
    }
    return best;
  }

  separate() {
    const list = this.inRing();
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (a.mode !== 'roam' || b.mode !== 'roam') continue;
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const d = Math.hypot(dx, dz) || 0.001;
        const min = a.foe === b.id || b.foe === a.id ? 1.05 : 1.45; // fighting: up close
        if (d < min) {
          const push = (min - d) / 2;
          a.x -= (dx / d) * push;
          a.z -= (dz / d) * push;
          b.x += (dx / d) * push;
          b.z += (dz / d) * push;
        }
      }
    }
    for (const w of list) {
      if (w.mode !== 'roam') continue; // scripted moves (throws, the close call) go to the ropes and beyond
      w.x = Math.max(-HALF + 0.5, Math.min(HALF - 0.5, w.x));
      w.z = Math.max(-HALF + 0.5, Math.min(HALF - 0.5, w.z));
    }
  }

  place(w) {
    const r = w.rig;
    r.root.position.set(w.x, w.y, w.z);
    r.root.rotation.y = w.heading;
    r.root.rotation.x = w.pitch ?? 0;
    r.root.rotation.z = w.roll ?? 0;
    r.root.scale.setScalar(w.baseScale * (w.pulse ?? 1));
    r.root.visible = !w.flicker;
    // Thrown wrestlers (and those sitting at ringside) rest on the floor: measure the body's actual
    // lowest point and lift it there. Sitting is measured once; it doesn't change.
    if (w.ground) {
      r.root.position.y += this.groundLift(w) + (w.hop ?? 0);
    } else if (w.out) {
      w.outLift ??= this.groundLift(w);
      r.root.position.y += w.outLift;
    }
    r.tags.position.set(w.x, Math.max(w.y, w.out ? 0 : MAT_Y) + (w.tagDrop ?? 0), w.z);
    // Keep name tags a steady size on screen: smaller when the camera moves in close.
    const s = Math.max(0.32, Math.min(1, this.camera.position.distanceTo(r.root.position) / 15));
    r.tag.scale.set(3.2 * s, 0.8 * s, 1);
    r.asTag.scale.set(2.0 * s, 0.5 * s, 1);
    r.asTag.position.y = r.height + 0.42 + (1 - s) * 0.3;
    r.tag.position.y = r.height + 0.42 + 0.53 * s + (1 - s) * 0.3 + 0.1;
    const fade = (w.out ? 0.55 : 1) * this.tagFade;
    if (r.tag.material.opacity !== fade) r.tag.material.opacity = r.asTag.material.opacity = fade;
    r.tags.visible = fade > 0;
  }

  /**
   * How far to move a wrestler so the lowest point of the body rests exactly on the ring or the floor:
   * up out of it, or down onto it (so they never hover). Gear on the back doesn't count, so nobody is
   * propped up on their mace or bow.
   */
  groundLift(w) {
    const r = w.rig;
    const overRing = Math.abs(r.root.position.x) < HALF + 0.5 && Math.abs(r.root.position.z) < HALF + 0.5;
    const floor = overRing ? MAT_Y : 0;
    const gap = floor - lowestBodyPoint(r);
    // In the air (thrown, before landing) only ever lift; once landed, settle onto the floor.
    return w.landed ? gap : Math.max(0, gap);
  }

  // ------------------------------------------------------------ scripted moments

  sideFrame(side, spot) {
    const [nx, nz] = SIDES[side];
    const ux = -nz;
    const uz = nx;
    const at2 = (inward, along = spot) => ({ x: nx * inward + ux * along, z: nz * inward + uz * along });
    return { nx, nz, ux, uz, at: at2 };
  }

  /** Start-of-beat positions, so the approach glides from wherever they were. */
  anchor(b, w) {
    const key = `${b.start}:${w.id}`;
    this.anchors ??= new Map();
    if (!this.anchors.has(key)) this.anchors.set(key, { x: w.x, z: w.z, heading: w.heading });
    return this.anchors.get(key);
  }

  playElimination(b, t, active) {
    const v = this.wrestlers[b.victim];
    const h = this.wrestlers[b.thrower];
    active.add(v.id);
    active.add(h.id);
    v.foe = h.foe = v.fight = h.fight = null;
    v.mode = h.mode = 'script';
    const f = this.sideFrame(b.side, b.spot);
    const pv = f.at(HALF - 0.95);
    const ph = f.at(HALF - 2.05);
    const landing = f.at(HALF + 2.7);
    const overhead = LIFTERS.has(h.kind.style);
    const hipToss = HIP_TOSS.has(h.kind.style);
    const push = PUSHERS.has(h.kind.style) ? 0.45 : 0.25;
    // Hidimbi changes form mid-grapple: her outline pulses while she's locked up.
    const shapeshift = (w) => (w.kind.style === 'shapeshift' ? 1 + 0.1 * Math.sin(t * 24) : 1);
    v.pulse = h.pulse = 1;
    h.flicker = false;

    if (t < b.grappleAt) {
      // Meet at the ropes.
      const k = ease((t - b.start) / PACE.approach);
      const av = this.anchor(b, v);
      const ah = this.anchor(b, h);
      v.x = av.x + (pv.x - av.x) * k;
      v.z = av.z + (pv.z - av.z) * k;
      h.x = ah.x + (ph.x - ah.x) * k;
      h.z = ah.z + (ph.z - ah.z) * k;
      v.y = h.y = MAT_Y;
      v.heading = lerpAngle(av.heading, headingTo(v.x, v.z, h.x, h.z), k);
      h.heading = lerpAngle(ah.heading, headingTo(h.x, h.z, v.x, v.z), k);
      v.walk += 0.08;
      h.walk += 0.08;
      pose(v.rig, { walk: v.walk, stride: 0.4, guard: 0.8, crouch: 0.25 });
      pose(h.rig, { walk: h.walk, stride: 0.4, guard: 0.8, crouch: 0.25 });
    } else if (t < b.throwAt) {
      // Grapple, edging the victim back to the ropes.
      const k = (t - b.grappleAt) / PACE.grapple;
      const shake = Math.sin(t * 22) * 0.04;
      v.x = pv.x + f.nx * push * k + shake;
      v.z = pv.z + f.nz * push * k;
      v.pulse = shapeshift(v);
      h.pulse = shapeshift(h);
      // Ghatotkacha's illusion: he flickers like a mirage just before the throw.
      h.flicker = h.kind.style === 'illusion' && t > b.throwAt - 0.45 && Math.floor(t * 18) % 2 === 0;
      h.x = ph.x + f.nx * 0.35 * k;
      h.z = ph.z + f.nz * 0.35 * k;
      v.heading = headingTo(v.x, v.z, h.x, h.z);
      h.heading = headingTo(h.x, h.z, v.x, v.z);
      pose(v.rig, { armsForward: 1, crouch: 0.3, lean: 0.15 - k * 0.3 });
      pose(h.rig, { armsForward: 1, crouch: 0.35, lean: 0.3 });
      this.emit(`grapple:${b.start}`, { type: 'grapple', victim: v, thrower: h });
    } else if (t < b.landAt) {
      // The throw: over the top rope and down to the floor.
      const k = (t - b.throwAt) / PACE.throw;
      this.emit(`throw:${b.start}`, { type: 'throw', victim: v, thrower: h });
      if (this.fired.has(`throw:${b.start}`) && !this.fired.has(`throwSound:${b.start}`)) {
        this.fired.add(`throwSound:${b.start}`);
        this.sfx?.play('throw');
      }
      const start = { x: pv.x + f.nx * push, z: pv.z + f.nz * push };
      let x;
      let z;
      let y;
      let flip;
      if (overhead && k < 0.35) {
        // Bhima's two-handed overhead toss: up first...
        const q = ease(k / 0.35);
        x = start.x - f.nx * 0.6 * q;
        z = start.z - f.nz * 0.6 * q;
        y = MAT_Y + 1.9 * q;
        flip = 0.4 * q; // leaning back, held overhead
        pose(h.rig, { armsUp: q, crouch: 0.2 * (1 - q) });
      } else {
        // ...then out over the ropes (everyone else shoves straight through).
        const q = overhead ? (k - 0.35) / 0.65 : k;
        const from = overhead ? { x: start.x - f.nx * 0.6, z: start.z - f.nz * 0.6, y: MAT_Y + 1.9 } : { ...start, y: MAT_Y };
        x = from.x + (landing.x - from.x) * q;
        z = from.z + (landing.z - from.z) * q;
        y = from.y + (0.25 - from.y) * q + (overhead ? 1.6 : 2.9) * 4 * q * (1 - q);
        // Over backwards: from leaning back to flat on the back as they reach the floor.
        const from0 = overhead ? 0.4 : 0.3;
        flip = from0 + (ON_BACK - from0) * ease(q);
        // Karna and Shikhandi send them through one full cartwheel, still landing on the back.
        v.roll = hipToss ? ease(q) * Math.PI * 2 : 0;
        pose(h.rig, overhead ? { armsUp: 1 - q * 0.4, spread: q * 0.3 } : hipToss ? { armsForward: 1, twist: 0.8 * q, crouch: 0.3 } : { armsForward: 1.2, lean: 0.45 * (1 - q) });
      }
      v.x = x;
      v.z = z;
      v.y = y;
      v.pitch = flip;
      v.heading = headingTo(v.x, v.z, 0, 0); // facing the ring: their back goes over the ropes first
      v.tagDrop = -1.4;
      v.ground = true; // never let any part of the body pass through the ring or the floor
      v.landed = false;
      v.hop = 0;
      pose(v.rig, { flail: 1, spread: 0.6, walk: t * 8 });
    } else {
      // Landed outside: flat on the back, then sitting up, while the camera holds.
      if (!this.fired.has(`out:${b.start}`)) {
        this.sfx?.play('fall');
        this.sfx?.play('hit', 0);
        this.particles.burst(new THREE.Vector3(landing.x, 0.3, landing.z), { count: 16, colors: ['#adb5bd', '#6c757d'], speed: 3, up: 1.5, life: 0.7, size: 0.13, gravity: 6 });
        v.out = true;
        v.outAt = landing;
        this.crowd.ringOut(landing.x, landing.z, t);
        v.outSince = 0;
      }
      this.emit(`out:${b.start}`, { type: 'out', victim: v, thrower: h, remaining: this.inRing().length, final: b.final });
      const since = t - b.landAt;
      v.roll = 0;
      v.pulse = h.pulse = 1;
      h.flicker = false;
      // The impact carries them a little further out as they bounce.
      const slide = 0.7 * (1 - Math.exp(-since * 5));
      v.x = landing.x + f.nx * slide;
      v.z = landing.z + f.nz * slide;
      // Two bounces off the floor, each smaller than the last, then still.
      const hop = bounce(since);
      if (since >= BOUNCES[0].end && !this.fired.has(`bounce:${b.start}`)) {
        this.fired.add(`bounce:${b.start}`);
        this.sfx?.play('hit', 0);
        this.particles.burst(new THREE.Vector3(v.x, 0.2, v.z), { count: 8, colors: ['#adb5bd', '#6c757d'], speed: 2, up: 1, life: 0.5, size: 0.1, gravity: 6 });
      }
      const sitUp = ease((since - 0.95) / 0.6);
      // Rest on the floor (place() lifts the body onto it), then bounce up from there.
      v.y = 0;
      v.hop = hop;
      v.ground = true;
      v.landed = true; // resting on the floor: settle onto it, never hover
      v.heading = headingTo(v.x, v.z, 0, 0);
      // Flat on the back (the bounce rocks them a little), then sitting up facing the ring.
      v.pitch = (ON_BACK - hop * 0.5) * (1 - sitUp);
      v.tagDrop = -1.4 * (1 - sitUp) - 0.9 * sitUp;
      pose(v.rig, { sit: sitUp, spread: 0.4 * (1 - sitUp) + hop * 0.8, flail: hop > 0.05 ? 0.3 : 0, walk: t * 6, look: 0.3 });
      // The thrower: Duryodhana plays to the crowd; everyone else squares up again.
      h.y = MAT_Y;
      if (h.kind.style === 'showman') {
        h.heading += 0.04;
        pose(h.rig, { armsUp: 1, spread: 0.5, walk: t * 6, stride: 0.1 });
        if (!this.fired.has(`showman:${b.start}`)) this.crowd.showman(t);
        this.emit(`showman:${b.start}`, { type: 'showman', wrestler: h });
      } else {
        h.heading = lerpAngle(h.heading, headingTo(h.x, h.z, landing.x, landing.z), 0.1);
        pose(h.rig, { guard: 0.8, crouch: 0.2, look: -0.2 });
      }
      if (t > b.end - 0.05) {
        h.mode = 'roam';
        h.target = null;
        v.pitch = 0;
        v.ground = false;
        v.hop = 0;
      }
    }
  }

  playCloseCall(b, t, active) {
    const w = this.wrestlers[b.wrestler];
    const o = this.wrestlers[b.other];
    active.add(w.id);
    active.add(o.id);
    w.foe = o.foe = w.fight = o.fight = null;
    w.mode = o.mode = 'script';
    const f = this.sideFrame(b.side, b.spot);
    const pw = f.at(HALF - 0.55);
    const po = f.at(HALF - 1.85);
    const since = t - b.start;
    w.y = o.y = MAT_Y;
    if (since < 0.9) {
      const k = ease(since / 0.9);
      const aw = this.anchor(b, w);
      const ao = this.anchor(b, o);
      w.x = aw.x + (pw.x - aw.x) * k;
      w.z = aw.z + (pw.z - aw.z) * k;
      o.x = ao.x + (po.x - ao.x) * k;
      o.z = ao.z + (po.z - ao.z) * k;
      w.heading = headingTo(w.x, w.z, o.x, o.z);
      o.heading = headingTo(o.x, o.z, w.x, w.z);
      pose(w.rig, { walk: t * 7, stride: 0.35, guard: 0.6, lean: -0.2 });
      pose(o.rig, { armsForward: 1, walk: t * 7, stride: 0.35, lean: 0.35 });
    } else if (since < 1.9) {
      // Teetering over the top rope.
      const k = (since - 0.9) / 1.0;
      if (!this.fired.has(`close:${b.start}`)) this.crowd.closeCall(pw.x, pw.z, t);
      this.emit(`close:${b.start}`, { type: 'closeCall', wrestler: w, other: o });
      w.x = pw.x;
      w.z = pw.z;
      w.heading = headingTo(w.x, w.z, o.x, o.z);
      o.heading = headingTo(o.x, o.z, w.x, w.z);
      w.pulse = w.kind.style === 'shapeshift' ? 1 + 0.1 * Math.sin(t * 24) : 1;
      pose(w.rig, { lean: -0.95 * Math.sin(Math.min(1, k * 1.4) * Math.PI * 0.5), flail: 1, walk: t * 9, crouch: 0.15 });
      pose(o.rig, { armsForward: 1.1, lean: 0.4 });
    } else {
      // Back from the brink: both return towards the centre (Abhimanyu ducks out low and sideways).
      const k = ease((since - 1.9) / (PACE.closeCall - 1.9));
      w.pulse = 1;
      const duck = w.kind.style === 'duck';
      w.x = pw.x - f.nx * 2.2 * k + (duck ? f.ux * 1.6 * k : 0);
      w.z = pw.z - f.nz * 2.2 * k + (duck ? f.uz * 1.6 * k : 0);
      o.x = po.x - f.nx * 1.6 * k;
      o.z = po.z - f.nz * 1.6 * k;
      pose(w.rig, { guard: 0.8, crouch: duck ? 0.35 * (1 - k) + 0.25 : 0.25, walk: t * 6, stride: 0.3, lean: duck ? 0.4 * (1 - k) : -0.3 * (1 - k) });
      pose(o.rig, { guard: 0.8, crouch: 0.25, walk: t * 6, stride: 0.3 });
      if (t > b.end - 0.05) {
        w.mode = o.mode = 'roam';
        w.target = o.target = null;
      }
    }
  }

  playVictory(b, t, active, dt) {
    const w = this.wrestlers[b.winner];
    active.add(w.id);
    w.mode = 'script';
    w.foe = w.fight = null;
    if (!this.fired.has('victory')) {
      this.sfx?.play('win', 0);
      this.crowd.victory(t);
      this.onWinner(w);
    }
    this.emit('victory', { type: 'victory', winner: w });
    const since = t - b.start;
    const k = ease(since / 1.2);
    const a = this.anchor(b, w);
    w.x = a.x * (1 - k);
    w.z = a.z * (1 - k);
    w.y = MAT_Y + Math.abs(Math.sin(since * 5)) * 0.35 * k;
    // Turn to the camera (and the meeting) while celebrating.
    w.heading = lerpAngle(w.heading, headingTo(w.x, w.z, this.camPos.x, this.camPos.z) + Math.sin(since * 2) * 0.25, damp(4, dt));
    pose(w.rig, { armsUp: k, spread: 0.35, walk: since * 5, stride: 0.15 * (1 - k) });
    this.confetti = (this.confetti ?? 0) - dt;
    if (this.confetti <= 0 && since < 8) {
      this.confetti = 0.25;
      this.particles.burst(new THREE.Vector3((Math.random() - 0.5) * 8, 9 + Math.random() * 2, (Math.random() - 0.5) * 8), { count: 22, colors: CONFETTI, speed: 5, up: 2, life: 3.2, size: 0.16, gravity: 5, flat: true, spread: 3 });
    }
  }

  playOut(w, dt) {
    // Eliminated wrestlers stay sitting at ringside, watching.
    w.y = 0;
    w.pitch = 0;
    w.tagDrop = -0.9;
    w.heading = lerpAngle(w.heading, headingTo(w.x, w.z, 0, 0), damp(2, dt));
    pose(w.rig, { sit: 1, look: 0.3, armsForward: 0.3 });
  }

  // ------------------------------------------------------------ camera

  updateCamera(dt, beat) {
    const t = this.t;
    const b = beat;
    // The camera circles the ring the whole match, the way it circles the winner at the end (#91).
    let rate = 0.12;
    let radius = 16;
    let height = 9;
    const look = new THREE.Vector3(0, MAT_Y + 0.8, 0);
    if (b.type === 'intro') {
      // A high, angled view of the ring that settles as the bell rings.
      const k = ease(t / PACE.intro);
      rate = 0.22;
      radius = 20 - 4 * k;
      height = 16 - 7 * k;
    } else if (b.type === 'final' || b.type === 'closeCall' || (b.type === 'elimination' && b.final)) {
      // Final two: circle the pair, the way the camera circles the winner.
      const pair = this.inRing();
      rate = 0.1;
      radius = 11;
      height = 6.5;
      if (pair.length) look.set(pair.reduce((s, w) => s + w.x, 0) / pair.length, MAT_Y + 1, pair.reduce((s, w) => s + w.z, 0) / pair.length);
    } else if (b.type === 'victory') {
      const w = this.wrestlers[b.winner];
      rate = 0.12;
      radius = 10;
      height = 5;
      look.set(w.x, MAT_Y + 1.5, w.z);
    }
    // Ring-outs and the close call: keep circling, but turn to watch that side of the ring and the
    // landing, and drift a little towards it so the throw stays in view from anywhere on the circle.
    if (b.type === 'elimination' || b.type === 'closeCall') {
      const f = this.sideFrame(b.side, b.spot);
      const c = f.at(b.type === 'elimination' ? HALF + 0.8 : HALF - 0.8);
      const weight = b.type === 'elimination'
        ? ease((t - b.start) / (PACE.approach * 0.8)) * (1 - ease((t - (b.end - PACE.reset - 0.3)) / 0.7))
        : ease((t - b.start) / 0.8) * (1 - ease((t - (b.end - 0.5)) / 0.5));
      look.lerp(new THREE.Vector3(c.x, 1.6, c.z), 0.8 * weight);
      radius -= 3 * weight;
    }
    this.orbit += rate * dt;
    const close = b.type === 'victory' || b.type === 'final' || b.type === 'closeCall' || (b.type === 'elimination' && b.final);
    const centre = close ? look : look.clone().multiplyScalar(0.35); // the whole ring: stay round its middle
    const targetPos = new THREE.Vector3(centre.x + Math.cos(this.orbit) * radius, height, centre.z + Math.sin(this.orbit) * radius);
    const targetLook = look;
    if (!this.camReady) {
      this.camPos.copy(targetPos);
      this.camLook.copy(targetLook);
      this.camReady = true;
    }
    this.camPos.lerp(targetPos, damp(3, dt));
    this.camLook.lerp(targetLook, damp(4, dt));
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
  }

  /**
   * Frees everything this match created on the GPU: the lights (and the key light's shadow map), the
   * ring's own materials and textures, each wrestler's own materials and shapes, the crowd and the
   * particles. Shapes and colours shared through util3d.js stay cached for the race and lobby.
   */
  dispose() {
    this.scene.traverse((o) => {
      if (o.isLight) o.dispose();
    });
    for (const w of this.wrestlers) w.rig.dispose();
    for (const t of this.textures) t.dispose();
    for (const m of this.ownedMaterials) m.dispose();
    this.crowd.dispose();
    this.particles.dispose();
    this.scene.clear();
  }
}
