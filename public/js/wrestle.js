// "Let's Rumble" and "HD": the same 3D ring acting out the plan from wrestle-sim.js:
// intro orbit with the bell, everyone in the ring brawling at once (each fight with room of its own),
// ring-outs over the top rope (sometimes two at once), a close call for the final two, and the winner's
// celebration, with the camera circling the ring throughout.

import * as THREE from 'three';
import { mat, box, cyl, plane, at, canvasTexture, drawMarylandFlag, MD, FONT_UI } from './util3d.js';
import { planMatch, pairUp, PACE } from './wrestle-sim.js';
import { buildWrestler, pose, capturePose, lowestBodyPoint, bodyBounds, eachVertex } from './wrestlers.js';
import { mulberry32 } from './sim.js';
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
/** The turn from heading `a` to `b`, the short way round (-PI to PI). */
const turnBy = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const lerpAngle = (a, b, k) => a + turnBy(a, b) * k;

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
// Each character's favourite brawling exchange (#97); they pick it about half the time.
const SIGNATURE = {
  overhead: 'slam', illusion: 'slam', centre: 'slam', // Bhima, Ghatotkacha, Jarasandha
  counter: 'reversal', shapeshift: 'reversal', duck: 'reversal', patient: 'reversal', composed: 'reversal',
  rebound: 'rebound', // Satyaki
  bruiser: 'shove', crowd: 'shove', // Kichaka, Dushasana
  showman: 'strikes', // Duryodhana
};
const CONTACT = new Set(['reversal', 'slam']); // moves where the pair hold on to each other
// The body slam's stages, in seconds from its start: grab, lift, hold, drop, then down on the mat.
const SLAM = { lift: 0.5, hold: 0.95, drop: 1.12, down: 1.35 };
const KNOCKDOWN = { lie: 0.9, up: 1.7 }; // seconds after going down: start getting up, back on their feet
// Satyaki's rope rebound in a ring-out (#106): his running speed, and the time off the ropes.
// Satyaki's rope rebound (#106). He turns to run for the ropes over `start` seconds, then from the run
// out to the charge back over `turn` seconds: starting `early` before he reaches the ropes (side first
// into them), through the bounce and on into the charge; and over the first `tackle` of the throw he
// squares up to the ropes. His facing is set by time, so it never jumps, at any update rate.
const RUN = { speed: 5.2, bounce: 0.3, start: 0.65, early: 0.25, turn: 0.75, tackle: 0.45, victimTurn: 2 * Math.PI, brace: 0.75 };
const ROPE_CONTACT = 0.5; // a wrestler's root this far inside the rope line has their back on the ropes
const ROOM = 4.4; // how far apart fights try to stay (#100)
const BLEND = 0.22; // seconds for one move to ease into the next (#98)
const SHOWMAN_TURN = 2.4; // Duryodhana's turn while playing to the crowd, radians per second (#99)
// What every wrestler in the ring resets to before each update; moves set what they need.
const UPRIGHT = { pitch: 0, roll: 0, ground: false, landed: false, hop: 0, pulse: 1, flicker: false, tagDrop: 0, exact: false, ropeGuard: null, ropeHold: null };
// The middle of a thrown body rises this much above the straight line from grapple to landing (#105).
const FLIGHT = { peak: 3.2, hipToss: 4.2, overhead: 1.3 };
const ROPE_TOP = MAT_Y + 1.55; // height of the top rope (ROPES[2]); its radius is 0.05

// The camera's orbits (#95): the intro settles into the live orbit round the ring, which eases into a
// closer one for the final two and then into the victory shot. `aim` is how far it may turn from the
// centre of the ring towards the action. Portrait screens are narrow, so they watch from further back.
const CAMERA = {
  intro: { radius: 20, height: 16, rate: 0.22 },
  live: { radius: 16, height: 9, rate: 0.12, aim: 3.2 },
  final: { radius: 14, height: 8, aim: 3.2 },
  portrait: {
    live: { radius: 18.5, height: 10, aim: 4.6 },
    final: { radius: 16, height: 8.5, aim: 4.6 },
  },
  victory: { radius: 10, height: 5, aim: 2 },
  toFinal: 3, // seconds to ease into the final-two orbit
  toVictory: 3.2,
  aimRate: 2.5,
};
// Widening the shot to keep a throw in the picture (#95, #96): from `lead` seconds before the throw to
// `hold` after the landing, with `margin` round the region. The whole throw is known as the approach
// starts, so the lens has the approach and grapple (2.8 s) to widen: it eases, and the scale of the picture
// never changes faster than `rate` (log of the lens's half-angle tangent per second; 0.24 is under 7% in a
// quarter-second), widening or narrowing. `pad` is how far a body lying round the landing spot can reach,
// flailing limbs and carried gear included; `body` is the same round the thrown body in the air.
// Past `comfort` degrees of widening the camera also turns towards the throw (as far as it needs to).
const FRAME = { hold: 1.6, pad: 1.6, body: 1.7, margin: 1.16, ease: 4, rate: 0.24, comfort: 12, maxFov: 80, maxPortraitFov: 105 };

export class WrestleMatch {
  /**
   * @param {string[]} names  the wrestlers (2 to 12), as shown on screen
   * @param {object} options  { rng, sfx, modelStyle: 'classic' | 'hd', onEvent(e), onWinner(wrestler) }
   */
  constructor(names, { rng = Math.random, sfx = null, onEvent = () => {}, onWinner = () => {}, previewPlan = null, modelStyle = 'hd' } = {}) {
    if (modelStyle !== 'classic' && modelStyle !== 'hd') throw new Error('Unknown wrestling model style.');
    this.modelStyle = modelStyle;
    this.plan = previewPlan ?? planMatch(names, rng);
    // Free movement (who throws a forearm when, where someone circles to) has its own stream: seeded
    // after the plan when the match is, so a seeded match replays the same way at a given update rate.
    this.random = rng === Math.random ? Math.random : mulberry32(Math.floor(rng() * 2 ** 32));
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
    this.orbit = this.random() * Math.PI * 2;
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
        walk: this.random() * 6,
        out: false,
        foe: null, // who they're fighting (wrestle-sim.js pairUp)
        fight: null, // the move the two of them are in, shared by both
        last: null, // who they last broke away from
        swing: 0,
        rebound: 0,
        phase: this.random() * 6,
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
    this.aspect = aspect;
    this.camera.aspect = aspect;
    // Portrait: as wide a view across as a 0.6 screen with a 68° lens gives, however narrow the screen,
    // so both ropes and the floor beyond them stay in the picture (#95).
    const across = Math.tan((34 * Math.PI) / 180) * Math.min(aspect, 0.6);
    this.baseFov = aspect < 1 ? Math.min(84, (2 * Math.atan(across / aspect) * 180) / Math.PI) : 50;
    this.fitFov = undefined; // fitShot works out the widening afresh for the new shape
    this.camera.fov = this.baseFov;
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
    this.dt = dt;
    if (this.tagsFading) this.tagFade = Math.max(0, this.tagFade - dt / 0.5);
    const t = this.t;
    if (t > 0.5 && !this.fired.has('bell')) {
      this.sfx?.play('bell', 0);
      this.emit('bell', { type: 'bell', lineup: this.lineup });
    }

    const beats = this.plan.beats;
    const finalBeat = beats.find((b) => b.type === 'final');
    const victory = beats[beats.length - 1];
    this.finalTwo = t >= finalBeat.start;
    // The scripted moments going on now: ring-outs (sometimes two at once, #96) and the close call.
    this.actions = beats.filter((b) => (b.type === 'elimination' || b.type === 'closeCall') && t >= b.start && t < b.end);
    // Everyone still in the ring starts the update upright; the moves below tip, lift or pulse them.
    for (const w of this.wrestlers) if (!w.out) Object.assign(w, UPRIGHT);
    const active = new Set();
    for (const b of this.actions) {
      if (b.type === 'elimination') this.playElimination(b, t, active, dt);
      else this.playCloseCall(b, t, active);
    }
    if (this.finalTwo) this.emit('final', { type: 'final', pair: finalBeat.pair.map((id) => this.wrestlers[id]) });
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
      if (!o) this.circle(w, dt);
      else if (o.foe !== w.id) this.gangUp(w, o, dt);
      else if (w.id < o.id) this.brawl(w, o, dt);
    }
    this.spaceFights(free, dt);
    this.separate();
    for (const w of this.wrestlers) this.place(w, dt);
    // Body slams: rest the lifted wrestler on the lifter's hands, now both are posed and placed.
    for (const w of free) {
      const f = w.fight;
      if (f?.move === 'slam' && f.by === w && w.foe !== null) this.gripSlam(w, this.wrestlers[w.foe], f.m);
    }
    this.crowd.update(t);
    this.updateCamera(dt);
    this.particles.update(dt);
  }

  /**
   * Poses a wrestler for the move called `key`. When the key changes, the new pose eases in from the
   * one they were in over `blend` seconds, so limbs never snap between moves (#98).
   */
  act(w, key, p, blend = BLEND) {
    if (w.moveKey !== key) {
      w.blendFrom = w.moveKey !== undefined && blend > 0 ? { from: capturePose(w.rig), at: this.t, dur: blend } : null;
      w.moveKey = key;
    }
    const b = w.blendFrom;
    const k = b ? (this.t - b.at) / b.dur : 1;
    if (k >= 1) w.blendFrom = null;
    pose(w.rig, p, k < 1 ? { from: b.from, k: ease(k) } : null);
  }

  // ------------------------------------------------------------ free movement

  inRing() {
    return this.wrestlers.filter((w) => !w.out);
  }

  /**
   * Where the ring-outs a callout announces are on screen (#107): the body of everyone going over the
   * ropes now (or about to) or landed in the last few seconds, as rectangles in CSS pixels of a
   * `width` x `height` view, each with the wrestler's `id`. The HUD keeps the callout off them, so the
   * landing stays in view.
   */
  landingRects(width, height) {
    const box = new THREE.Box3();
    const corner = new THREE.Vector3();
    const rects = [];
    for (const w of this.wrestlers) {
      const going = this.actions.some((b) => b.type === 'elimination' && b.victim === w.id && this.t >= b.throwAt - 0.3);
      if (!going && !(w.out && this.t - (w.outTime ?? -Infinity) < 4)) continue;
      bodyBounds(w.rig, box, 8);
      if (box.isEmpty()) continue;
      const r = { id: w.id, left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
      for (let i = 0; i < 8; i++) {
        corner.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(this.camera);
        const x = ((corner.x + 1) / 2) * width;
        const y = ((1 - corner.y) / 2) * height;
        r.left = Math.min(r.left, x);
        r.right = Math.max(r.right, x);
        r.top = Math.min(r.top, y);
        r.bottom = Math.max(r.bottom, y);
      }
      if (r.right > 0 && r.left < width && r.bottom > 0 && r.top < height) rects.push(r);
    }
    return rects;
  }

  /** Nobody free to fight (everyone else is in a throw): circle, and now and then run the ropes. */
  circle(w, dt) {
    const slow = (this.finalTwo ? 0.65 : 1) * quick(w);
    const ropeChance = w.kind.style === 'rebound' ? 0.45 : 0.22; // Satyaki lives on the ropes
    w.timer -= dt;
    const dx = (w.target?.x ?? w.x) - w.x;
    const dz = (w.target?.z ?? w.z) - w.z;
    const dist = Math.hypot(dx, dz);
    if (!w.target || dist < 0.25 || w.timer <= 0) {
      if (w.target?.rope) {
        // Bounce off the ropes and run back across the ring.
        w.rebound = 0.3;
        w.target = this.pickSpot(2.5);
        w.speed = 4.2 * slow;
      } else if (this.random() < ropeChance) {
        const [nx, nz] = SIDES[Math.floor(this.random() * 4)];
        const along = -3.5 + this.random() * 7;
        w.target = { x: nx * (HALF - 0.7) + (nz ? along : 0), z: nz * (HALF - 0.7) + (nx ? along : 0), rope: true };
        if (this.nearAction(w.target)) w.target = this.pickSpot();
        w.speed = 3.6 * slow;
      } else {
        w.target = this.pickSpot();
        w.speed = 1.5 * slow;
      }
      w.timer = 1.5 + this.random() * 2;
    }
    const step = dist < 0.001 ? 0 : Math.min(dist, w.speed * dt);
    if (step) {
      w.x += (dx / dist) * step;
      w.z += (dz / dist) * step;
    }
    w.y = MAT_Y;
    w.walk += step * 3.2;
    // Face the action when moving slowly, the way you're running when fast.
    const near = this.nearest(w);
    const face = (w.speed > 2.5 && step) || !near ? Math.atan2(-dx, -dz) : headingTo(w.x, w.z, near.x, near.z);
    w.heading = lerpAngle(w.heading, face, damp(6, dt));
    w.rebound = Math.max(0, w.rebound - dt);
    // Breaking into a run (or slowing down) changes the gait over a few tenths of a second, not at once.
    const ease8 = damp(8, dt);
    w.gaitStride = (w.gaitStride ?? 0.3) + (Math.min(0.7, w.speed * 0.2) - (w.gaitStride ?? 0.3)) * ease8;
    w.gaitGuard = (w.gaitGuard ?? 0.8) + ((w.speed > 2.5 ? 0.2 : 0.8) - (w.gaitGuard ?? 0.8)) * ease8;
    // Off the ropes: a quick lean back as they bounce.
    const recoil = Math.sin((w.rebound / 0.3) * Math.PI);
    this.act(w, 'circle', { walk: w.walk, stride: w.gaitStride, guard: w.gaitGuard, crouch: 0.25, lean: 0.1 - 0.6 * recoil });
  }

  /**
   * Two wrestlers fighting each other, called once per pair for both of them. Besides closing in,
   * lock-ups, forearm strikes, shoves and circling, there are longer exchanges with a wind-up, a
   * reaction and a recovery (#97): a lock-up reversal, a rope rebound into a shoulder tackle, a body
   * slam, and reeling back from a strike. Each character leans towards a signature move.
   */
  brawl(a, b, dt) {
    let f = a.fight;
    if (!f || f !== b.fight) {
      f = { move: 'close', n: 0, t: 0, dur: 4, age: 0, life: 5 + this.random() * 5, by: a, m: {} };
      a.fight = b.fight = f;
    }
    f.t += dt;
    f.age += dt;
    const pace = this.finalTwo ? 0.8 : 1;
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
    // Each stage of a move is its own key, so even a sudden change of stage eases in.
    const act = (w, p, blend) => this.act(w, `${f.n}:${f.move}:${f.m.stage ?? ''}:${w === att ? 'att' : 'def'}`, p, blend);
    const face = new Map(); // headings other than squaring up to each other
    const m = f.m; // this move's own state
    const k = clamp01(f.t / f.dur);
    // On the mat unless the move says otherwise (a slam lifts the defender off it).
    a.y = b.y = MAT_Y;
    if (f.move === 'close') {
      // Size each other up and close in.
      if (d > 1.15) {
        step(a, ux, uz, 1.8 * quick(a));
        step(b, -ux, -uz, 1.8 * quick(b));
      } else f.t = f.dur;
      for (const w of [a, b]) act(w, { walk: w.walk, stride: 0.4, guard: 0.8, crouch: 0.25 });
    } else if (f.move === 'lockup') {
      // Collar-and-elbow tie-up, the pair swaying back and forth as each tries to drive the other.
      const sway = Math.cos(f.t * 3.2) * 0.7;
      step(a, ux, uz, sway + (d > 1.1 ? 0.6 : 0));
      step(b, ux, uz, sway - (d > 1.1 ? 0.6 : 0));
      for (const w of [a, b]) {
        w.pulse = w.kind.style === 'shapeshift' ? 1 + 0.08 * Math.sin(f.t * 24) : 1; // Hidimbi changes form
        act(w, { armsForward: 1, crouch: 0.35, lean: 0.3, walk: w.walk, stride: 0.12 });
      }
    } else if (f.move === 'strikes') {
      // Forearm shots, left and right; the defender rocks back with each one.
      const p = (f.t * 2.4) % 1;
      const side = Math.floor(f.t * 2.4) % 2 ? 1 : -1;
      const blow = p < 0.35 ? Math.sin((p / 0.35) * Math.PI) : 0;
      const recoil = p > 0.2 && p < 0.65 ? Math.sin(((p - 0.2) / 0.45) * Math.PI) : 0;
      step(def, ax, az, recoil * 1.4);
      step(att, ax, az, 0.5);
      act(att, { armsForward: 0.3 + blow, twist: side * 0.6 * blow, lean: 0.2 + 0.25 * blow, crouch: 0.25, guard: 0.5 * (1 - blow) });
      act(def, { guard: 0.9, lean: -0.4 * recoil, crouch: 0.2, look: -0.25 * recoil, tilt: side * 0.2 * recoil });
    } else if (f.move === 'stagger') {
      // The last shot landed: the defender reels back a few steps, shakes it off and covers up.
      const s = Math.sin(k * Math.PI);
      m.side ??= this.random() < 0.5 ? -1 : 1;
      step(def, ax, az, 1.7 * (1 - k));
      step(att, ax, az, 0.7 * (1 - k));
      act(def, { guard: 0.3 + 0.6 * k, lean: -0.4 * s, look: -0.45 * s, tilt: m.side * 0.3 * s, twist: m.side * 0.25 * s, crouch: 0.15 + 0.15 * k, walk: def.walk, stride: 0.35 });
      act(att, { guard: 0.7, crouch: 0.25, lean: 0.15, spread: 0.25 * s, walk: att.walk, stride: 0.25 });
    } else if (f.move === 'shove') {
      // Driving the defender back across the ring, maybe into the ropes.
      const drive = Math.sin(k * Math.PI) * 2.6 * (PUSHERS.has(att.kind.style) ? 1.25 : 1);
      step(att, ax, az, drive + (d > 1.15 ? 1.5 : 0));
      step(def, ax, az, drive);
      act(att, { armsForward: 1.2, lean: 0.45, crouch: 0.3, walk: att.walk, stride: 0.45 });
      act(def, { armsForward: 0.6, lean: -0.3, crouch: 0.2, walk: def.walk, stride: 0.4 });
    } else if (f.move === 'reversal') {
      this.reversal(f, att, def, k, act, face);
    } else if (f.move === 'rebound') {
      this.ropeRebound(f, att, def, dt, act, face);
    } else if (f.move === 'slam') {
      this.bodySlam(f, att, def, ax, az, k, act, face);
    } else {
      // Break, and circle each other looking for an opening.
      step(a, -uz, ux, 1.3);
      step(b, uz, -ux, 1.3);
      if (d < 1.6) {
        step(a, -ux, -uz, 1.2);
        step(b, ux, uz, 1.2);
      }
      for (const w of [a, b]) act(w, { walk: w.walk, stride: 0.35, guard: 0.8, crouch: 0.3 });
    }
    a.heading = lerpAngle(a.heading, face.get(a) ?? headingTo(a.x, a.z, b.x, b.z), damp(10, dt));
    b.heading = lerpAngle(b.heading, face.get(b) ?? headingTo(b.x, b.z, a.x, a.z), damp(10, dt));
    if (f.t < f.dur) return;
    if (f.age > f.life && f.move !== 'close') {
      // Break apart and go find someone else.
      a.last = b.id;
      b.last = a.id;
      a.foe = b.foe = a.fight = b.fight = null;
    } else this.nextMove(f, a, b, d);
  }

  /**
   * Lock-up reversal: the attacker (Arjuna, Hidimbi, Abhimanyu, Karna and Shikhandi favour it) ducks
   * under the tie-up, comes round behind and shoves the other one away, who stumbles, then turns to
   * face them again.
   */
  reversal(f, att, def, k, act, face) {
    const m = f.m;
    if (!m.pivot) {
      m.pivot = { x: def.x, z: def.z, angle: Math.atan2(att.z - def.z, att.x - def.x), heading: def.heading };
      m.dir = this.random() < 0.5 ? -1 : 1;
    }
    const swing = ease((k - 0.22) / 0.33);
    const shove = clamp01((k - 0.55) / 0.2);
    const turn = ease((k - 0.75) / 0.25);
    if (k < 0.55) {
      // Round the back of them, keeping hold.
      const angle = m.pivot.angle + m.dir * Math.PI * swing;
      const r = 1.05 - 0.2 * Math.sin(swing * Math.PI);
      const x = def.x + Math.cos(angle) * r;
      const z = def.z + Math.sin(angle) * r;
      att.walk += Math.hypot(x - att.x, z - att.z) * 3.2;
      att.x = x;
      att.z = z;
    }
    const dx = def.x - att.x;
    const dz = def.z - att.z;
    const d = Math.hypot(dx, dz) || 0.001;
    const push = Math.sin(shove * Math.PI) * 3 * this.dt;
    if (shove > 0 && shove < 1) {
      def.x += (dx / d) * push;
      def.z += (dz / d) * push;
      att.x += (dx / d) * push * 0.5;
      att.z += (dz / d) * push * 0.5;
      def.walk += push * 3.2;
    }
    // The one reversed faces where they were facing until they turn round to find the attacker.
    face.set(def, lerpAngle(m.pivot.heading, headingTo(def.x, def.z, att.x, att.z), turn));
    m.stage = k < 0.22 ? 'tie' : k < 0.55 ? 'swing' : k < 0.75 ? 'shove' : 'turn';
    att.pulse = att.kind.style === 'shapeshift' && k > 0.2 && k < 0.55 ? 1 + 0.1 * Math.sin(f.t * 24) : 1;
    if (k < 0.22) {
      act(att, { armsForward: 1, crouch: 0.35, lean: 0.3 });
      act(def, { armsForward: 1, crouch: 0.35, lean: 0.3 });
    } else if (k < 0.55) {
      act(att, { armsForward: 0.6, crouch: 0.75, lean: 0.55, twist: -m.dir * 0.5, walk: att.walk, stride: 0.3 });
      act(def, { armsForward: 0.7, crouch: 0.25, lean: 0.05, twist: m.dir * 0.45, look: -0.15 });
    } else if (k < 0.75) {
      act(att, { armsForward: 1.25, lean: 0.45, crouch: 0.3 }, 0.12);
      act(def, { flail: 0.4, lean: 0.5, crouch: 0.15, walk: def.walk, stride: 0.55, armsForward: 0.4 }, 0.12);
    } else {
      act(att, { guard: 0.8, crouch: 0.25, lean: 0.1 });
      act(def, { guard: 0.8, crouch: 0.3, walk: def.walk, stride: 0.3 });
    }
  }

  /**
   * Rope rebound (Satyaki's signature): the attacker runs back to the ropes, bounces off them and comes
   * back with a shoulder tackle that knocks the other one down; they get up again.
   */
  ropeRebound(f, att, def, dt, act, face) {
    const m = f.m;
    if (!m.stage) {
      m.stage = 'out';
      m.st = 0;
      m.rope = this.ropePoint(att, def);
    }
    m.st += dt;
    const speed = 5 * quick(att) * (this.finalTwo ? 0.8 : 1);
    const toward = (x, z, s) => {
      const dx = x - att.x;
      const dz = z - att.z;
      const d = Math.hypot(dx, dz);
      const step = Math.min(d, s * dt);
      if (d > 0.001) {
        att.x += (dx / d) * step;
        att.z += (dz / d) * step;
      }
      att.walk += step * 2.2;
      return d - step;
    };
    if (m.stage !== 'down') act(def, { guard: 0.9, crouch: 0.3, lean: -0.1 });
    if (m.stage === 'out') {
      // Back to the ropes, running.
      face.set(att, headingTo(att.x, att.z, m.rope.x, m.rope.z));
      act(att, { walk: att.walk, stride: 0.7, guard: 0.2, crouch: 0.2, lean: 0.2 });
      if (toward(m.rope.x, m.rope.z, speed * Math.min(1, 0.4 + m.st * 1.5)) < 0.05) {
        m.stage = 'bounce';
        m.st = 0;
      }
    } else if (m.stage === 'bounce') {
      // Off the ropes: leaning back into them, then springing off.
      const s = Math.sin(clamp01(m.st / 0.3) * Math.PI);
      face.set(att, headingTo(att.x, att.z, def.x, def.z));
      act(att, { lean: -0.5 * s, spread: 0.5 * s, crouch: 0.25 }, 0.1);
      if (m.st > 0.3) {
        m.stage = 'back';
        m.st = 0;
      }
    } else if (m.stage === 'back') {
      act(att, { walk: att.walk, stride: 0.7, crouch: 0.3, lean: 0.35, armsForward: 0.5, spread: 0.3 });
      if (toward(def.x, def.z, speed) < 0.85 || m.st > 2.5) {
        m.stage = 'down';
        m.st = 0;
        m.from = { x: def.x - att.x, z: def.z - att.z };
        this.sfx?.play('hit');
      }
    } else {
      this.knockedDown(def, m.st, m.from, dt);
      // Duryodhana raises his arms to the crowd over the one he knocked down.
      act(att, { guard: 0.6, crouch: 0.2, armsUp: att.kind.style === 'showman' ? 0.8 * Math.sin(clamp01(m.st / 1.4) * Math.PI) : 0, spread: 0.3 });
      if (m.st > KNOCKDOWN.up) f.t = f.dur;
    }
  }

  /**
   * Body slam (the lifters' signature): grab low, hoist them up to lie across the chest, hold, then drive
   * them down flat on the mat and recover. While they're up, `gripSlam()` (after posing) rests them on
   * the lifter's hands: upper back on one, thigh on the other (#104).
   */
  bodySlam(f, att, def, ax, az, k, act, face) {
    const m = f.m;
    const s = k * f.dur;
    m.from ??= { x: ax, z: az };
    m.dir ??= this.random() < 0.5 ? -1 : 1; // which hand takes the upper back
    const ahead = (r) => ({ x: att.x + m.from.x * r, z: att.z + m.from.z * r });
    m.stage = s < SLAM.lift ? 'grab' : s < SLAM.hold ? 'lift' : s < SLAM.drop ? 'hold' : s < SLAM.down ? 'slam' : 'down';
    // Lying across the lifter's chest: head towards one hand, legs towards the other (along the hands
    // as gripSlam last measured them, once it has).
    const across = m.across ?? att.heading + m.dir * (Math.PI / 2);
    // The lifter holds still, square to where they took hold, from the lift to the slam.
    if (m.stage !== 'grab' && m.stage !== 'down') face.set(att, (m.stance ??= att.heading));
    if (m.stage === 'grab') {
      // Get hold round the waist, low.
      const p = ahead(1.0 - 0.25 * ease(s / SLAM.lift));
      def.x += (p.x - def.x) * damp(10, this.dt);
      def.z += (p.z - def.z) * damp(10, this.dt);
      act(att, { armsForward: 1, crouch: 0.5, lean: 0.4 });
      act(def, { armsForward: 0.8, crouch: 0.3, lean: 0.2 });
    } else if (m.stage === 'lift' || m.stage === 'hold') {
      // Up and turned across the chest; gripSlam() puts them on the hands.
      const up = ease((s - SLAM.lift) / (SLAM.hold - SLAM.lift));
      def.pitch = ON_BACK * up;
      face.set(def, lerpAngle(headingTo(def.x, def.z, att.x, att.z), across, up));
      def.ground = true; // never through the mat
      def.tagDrop = -1.4 * up;
      def.y = MAT_Y;
      m.grip = up;
      act(att, { armsForward: 1 - 0.45 * up, armsUp: 0.6 * up, spread: 0.12 * up, crouch: 0.5 - 0.35 * up, lean: 0.4 * (1 - up) }, 0.12);
      act(def, { flail: 0.3, spread: 0.35, look: 0.2, walk: f.t * 6 }, 0.18);
    } else if (m.stage === 'slam') {
      // Driven down, still across, flat onto the mat in front of the lifter.
      const q = (s - SLAM.drop) / (SLAM.down - SLAM.drop);
      // From exactly where the body was last shown on the hands (the root as drawn, after place() kept
      // it off the mat), so the drop starts in the hands, not below them.
      const held = m.held ?? { x: def.x, y: MAT_Y, z: def.z, tag: MAT_Y - 1.4 };
      const land = ahead(0.95);
      const off = m.offset ?? { x: 0, z: 0 }; // from the body's middle to its root (feet), from the hold
      def.x = held.x + (land.x + off.x - held.x) * q;
      def.z = held.z + (land.z + off.z - held.z) * q;
      def.y = held.y + (MAT_Y - held.y) * q * q; // falling, faster as it goes
      def.pitch = ON_BACK;
      def.ground = true;
      def.tagDrop = (held.tag - held.y) + (-1.4 - (held.tag - held.y)) * q;
      face.set(def, across);
      m.grip = 0;
      act(att, { armsForward: 1.2, crouch: 0.55, lean: 0.55 }, 0.1);
      act(def, { flail: 0.3, spread: 0.45, look: 0.2, walk: f.t * 6 }, 0.18);
    } else {
      if (!m.landed) {
        m.landed = true;
        this.sfx?.play('hit', 0);
        this.particles.burst(new THREE.Vector3(def.x, MAT_Y + 0.15, def.z), { count: 8, colors: ['#c9c1ad', '#adb5bd'], speed: 2, up: 1, life: 0.45, size: 0.09, gravity: 6 });
      }
      face.set(def, def.heading); // they stay lying where they landed
      this.knockedDown(def, s - SLAM.down + 0.3, null, this.dt);
      act(att, { guard: 0.7, crouch: 0.3, lean: 0.15, look: 0.2 });
      if (s - SLAM.down + 0.3 >= KNOCKDOWN.up) f.t = f.dur;
    }
  }

  /**
   * Rests a lifted body on the lifter's hands (#104): its upper back on one hand, its thigh on the
   * other, with the body's underside on the hands. Runs after everyone is posed and placed, so it uses
   * the hands as they actually are for this pair's sizes, easing in as the lift starts.
   */
  gripSlam(att, def, m) {
    if (!(m.grip > 0)) return;
    const hands = this.hands(att);
    const body = this.gripPoints(def, hands[0].distanceTo(hands[1]));
    // Which way the hands run: the body lies along that line, head towards the hand on the m.dir side.
    const [head, feet] = m.dir > 0 ? hands : [hands[1], hands[0]];
    const along = headingTo(feet.x, feet.z, head.x, head.z) + Math.PI; // a back-down body's head points opposite its heading
    m.across = m.across === undefined ? along : lerpAngle(m.across, along, 0.5);
    const mid = (a, b) => a.clone().add(b).multiplyScalar(0.5);
    const lift = mid(hands[0], hands[1]);
    lift.y += 0.13 * def.rig.height / 1.8; // the back's thickness: the hands are under it
    const delta = lift.sub(mid(body.chest, body.thigh)).multiplyScalar(ease(m.grip * 3)); // eases in
    const r = def.rig;
    r.root.position.add(delta);
    r.tags.position.add(delta);
    def.x = r.root.position.x;
    def.z = r.root.position.z;
    // Where it's drawn: the drop starts from here (#104).
    m.held = { x: def.x, y: r.root.position.y, z: def.z, tag: r.tags.position.y };
    m.offset = { x: def.x - (body.chest.x + body.thigh.x) / 2 - delta.x, z: def.z - (body.chest.z + body.thigh.z) / 2 - delta.z };
  }

  /** Where a wrestler's hands are, in world space. */
  hands(w) {
    const r = w.rig;
    r.root.updateMatrixWorld(true);
    const parts = r.skinnedRig ? [r.bones.hand_l, r.bones.hand_r] : r.arms.map((a) => a.hand);
    return parts.map((o) => o.getWorldPosition(new THREE.Vector3()));
  }

  /**
   * Where a slam takes hold of the body, in world space: two points along it, `gap` apart (the
   * lifter's hands), either side of its balance point just above the hips: one under the back, one
   * under the legs.
   */
  gripPoints(w, gap) {
    const r = w.rig;
    r.root.updateMatrixWorld(true);
    const at = (o) => o.getWorldPosition(new THREE.Vector3());
    const [hips, head] = r.skinnedRig ? [at(r.bones.pelvis), at(r.bones.Head)] : [at(r.hips), at(r.head)];
    const axis = head.clone().sub(hips).normalize();
    const balance = hips.clone().addScaledVector(axis, 0.07 * r.height);
    return { chest: balance.clone().addScaledVector(axis, gap / 2), thigh: balance.clone().addScaledVector(axis, -gap / 2) };
  }

  /** Flat on the back for a moment after a tackle or a slam, then back up to a crouch. */
  knockedDown(w, since, from, dt) {
    if (from) {
      // The tackle carries them back a little as they go down.
      const d = Math.hypot(from.x, from.z) || 1;
      const slide = 1.6 * Math.exp(-since * 4) * dt;
      w.x += (from.x / d) * slide;
      w.z += (from.z / d) * slide;
    }
    const fall = ease(since / 0.3);
    const rise = ease((since - KNOCKDOWN.lie) / (KNOCKDOWN.up - KNOCKDOWN.lie));
    w.y = MAT_Y;
    w.pitch = ON_BACK * fall * (1 - rise);
    w.ground = true;
    w.landed = since > 0.3; // resting on the mat: settle onto it
    w.tagDrop = -1.4 * fall * (1 - rise);
    this.act(w, `${w.fight?.n}:down`, { sit: Math.sin(rise * Math.PI) * 0.9, spread: 0.45 * (1 - rise), look: 0.3, crouch: 0.3 * rise, guard: 0.8 * rise, flail: since < 0.3 ? 0.4 : 0, walk: since * 8 }, 0.15);
  }

  /**
   * Where the attacker runs to the ropes for a rebound: straight back, away from the other one, to
   * where their back meets the rope line (`reach` is how far that is).
   */
  ropePoint(att, def) {
    const dx = att.x - def.x;
    const dz = att.z - def.z;
    const d = Math.hypot(dx, dz) || 0.001;
    const ux = dx / d;
    const uz = dz / d;
    const lim = HALF - ROPE_CONTACT;
    let reach = Infinity;
    if (Math.abs(ux) > 0.01) reach = Math.min(reach, ((ux > 0 ? lim : -lim) - att.x) / ux);
    if (Math.abs(uz) > 0.01) reach = Math.min(reach, ((uz > 0 ? lim : -lim) - att.z) / uz);
    return { x: att.x + ux * reach, z: att.z + uz * reach, reach };
  }

  /** The next exchange in a fight, and who leads it. Each character leans towards their signature. */
  nextMove(f, a, b, d) {
    const prev = f.move;
    const prevBy = f.by;
    f.t = 0;
    f.n++;
    f.m = {};
    f.by = this.random() < 0.5 ? a : b;
    if (d > 1.4) {
      f.move = 'close';
      f.dur = 4; // ends as soon as they meet
      return;
    }
    const r = this.random();
    if (prev === 'strikes' && r < 0.4) {
      // The last forearm landed: the one on the receiving end reels back.
      f.by = prevBy;
      f.move = 'stagger';
    } else if (r < 0.45) {
      f.move = SIGNATURE[f.by.kind.style] ?? 'strikes';
    } else {
      const g = this.random();
      f.move = g < 0.2 ? 'lockup' : g < 0.38 ? 'strikes' : g < 0.52 ? 'shove' : g < 0.66 ? 'circle' : g < 0.78 ? 'reversal' : g < 0.89 ? 'slam' : 'rebound';
    }
    if (f.move === 'rebound') {
      // A rope rebound needs a run-up, and no throw going on where they'd run.
      const att = f.by;
      const rope = this.ropePoint(att, att === a ? b : a);
      if (rope.reach < 1.2 || rope.reach > 4.5 || this.nearAction(rope)) f.move = 'strikes';
    }
    f.dur = { lockup: 1.2 + this.random() * 0.8, strikes: 1.25, stagger: 0.8, shove: 1, circle: 0.8 + this.random() * 0.6, reversal: 2.3, rebound: 6, slam: SLAM.down - 0.3 + KNOCKDOWN.up }[f.move];
  }

  /**
   * Two on one: the odd wrestler out joins the nearest fight from the side (so the three don't pile
   * up in a line) and lays in forearm shots.
   */
  gangUp(w, o, dt) {
    const p = o.foe === null ? null : this.wrestlers[o.foe];
    let tx = o.x;
    let tz = o.z;
    let reach = 1.25;
    // Someone in the middle of being slammed, reversed or knocked down: wait at a distance for them.
    const f = o.fight;
    const tied = f && f === p?.fight && (CONTACT.has(f.move) || (f.move === 'rebound' && f.m.stage === 'down'));
    if (tied) {
      const cx = (o.x + p.x) / 2;
      const cz = (o.z + p.z) / 2;
      const away = Math.hypot(w.x - cx, w.z - cz) || 0.001;
      tx = cx + ((w.x - cx) / away) * 2.4;
      tz = cz + ((w.z - cz) / away) * 2.4;
      reach = 0.2;
    } else if (p && !p.out) {
      // A flank: beside the one they're attacking, off the line between the two already fighting.
      const fx = p.x - o.x;
      const fz = p.z - o.z;
      const fd = Math.hypot(fx, fz) || 0.001;
      const side = (w.x - o.x) * -fz + (w.z - o.z) * fx >= 0 ? 1 : -1;
      tx = o.x + (-fz / fd) * side * 1.15 - (fx / fd) * 0.25;
      tz = o.z + (fx / fd) * side * 1.15 - (fz / fd) * 0.25;
      reach = 0.2;
    }
    const dx = tx - w.x;
    const dz = tz - w.z;
    const d = Math.hypot(dx, dz) || 0.001;
    w.y = MAT_Y;
    w.heading = lerpAngle(w.heading, headingTo(w.x, w.z, o.x, o.z), damp(10, dt));
    if (d > reach + 0.15) {
      const s = Math.min(d - reach, 2 * quick(w) * dt * (this.finalTwo ? 0.8 : 1));
      w.x += (dx / d) * s;
      w.z += (dz / d) * s;
      w.walk += s * 3.2;
      w.swing = 0;
      this.act(w, 'gang:close', { walk: w.walk, stride: 0.4, guard: 0.8, crouch: 0.25 });
      return;
    }
    if (tied) {
      w.swing = 0;
      this.act(w, 'gang:wait', { guard: 0.8, crouch: 0.3, walk: w.walk, stride: 0.1 });
      return;
    }
    w.swing += dt;
    const ph = (w.swing * 2) % 1;
    const side = Math.floor(w.swing * 2) % 2 ? 1 : -1;
    const blow = ph < 0.35 ? Math.sin((ph / 0.35) * Math.PI) : 0;
    this.act(w, 'gang:hit', { armsForward: 0.3 + blow, twist: side * 0.6 * blow, lean: 0.2 + 0.25 * blow, crouch: 0.25, guard: 0.5 * (1 - blow) });
  }

  /**
   * Room for every fight (#100): each pair (with anyone ganging up on them) keeps its own part of the
   * mat, drifting away from neighbouring fights, from any throw or close call, and off the ropes.
   * Both of a pair move together, so they stay in reach of each other.
   */
  spaceFights(free, dt) {
    const groups = new Map();
    for (const w of free) {
      const o = w.foe === null ? null : this.wrestlers[w.foe];
      if (o && o.foe === w.id && w.id < o.id) {
        const g = { members: [w, o], x: (w.x + o.x) / 2, z: (w.z + o.z) / 2, px: 0, pz: 0 };
        groups.set(w.id, g).set(o.id, g);
      }
    }
    for (const w of free) {
      const o = w.foe === null ? null : this.wrestlers[w.foe];
      if (o && o.foe !== w.id) groups.get(o.id)?.members.push(w);
    }
    const list = [...new Set(groups.values())];
    const away = (g, x, z, room, strength) => {
      const dx = g.x - x;
      const dz = g.z - z;
      const d = Math.hypot(dx, dz);
      if (d >= room) return;
      const k = ((room - d) / room) * strength;
      if (d < 0.01) {
        g.px += k;
        return;
      }
      g.px += (dx / d) * k;
      g.pz += (dz / d) * k;
    };
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        away(list[i], list[j].x, list[j].z, ROOM, 1);
        away(list[j], list[i].x, list[i].z, ROOM, 1);
      }
    }
    for (const g of list) {
      for (const c of this.actionCentres()) away(g, c.x, c.z, 4, 1.6);
      // Off the ropes: they are for throws (and Satyaki's rebounds).
      const lim = HALF - 1.7;
      if (Math.abs(g.x) > lim) g.px -= Math.sign(g.x) * (Math.abs(g.x) - lim) * 0.8;
      if (Math.abs(g.z) > lim) g.pz -= Math.sign(g.z) * (Math.abs(g.z) - lim) * 0.8;
      const k = Math.min(1, Math.hypot(g.px, g.pz));
      const n = Math.hypot(g.px, g.pz) || 1;
      const s = 2 * k * dt;
      for (const w of g.members) {
        w.x += (g.px / n) * s;
        w.z += (g.pz / n) * s;
      }
    }
  }

  pickSpot(radius = 4.6) {
    for (let i = 0; i < 8; i++) {
      const a = this.random() * Math.PI * 2;
      const r = Math.sqrt(this.random()) * radius;
      const p = { x: Math.cos(a) * r, z: Math.sin(a) * r };
      if (!this.nearAction(p)) return p;
    }
    return { x: 0, z: 0 };
  }

  /**
   * Where in the ring throws or a close call are happening right now (there can be two at once), and
   * where Satyaki is running for a rope rebound, so free fights keep out of the way.
   */
  actionCentres() {
    return (this.actions ?? []).flatMap((b) => {
      const centre = this.sideFrame(b.side, b.spot).at(HALF - 1.5);
      const runner = b.type === 'elimination' && this.t < b.throwAt && this.runs?.get(`${b.start}:${b.victim}`) ? this.wrestlers[b.thrower] : null;
      return runner ? [centre, { x: runner.x, z: runner.z }] : [centre];
    });
  }

  /** Keep free wrestlers out of the way of a throw or close call. */
  nearAction(p) {
    return this.actionCentres().some((c) => Math.hypot(p.x - c.x, p.z - c.z) < 3.2);
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
        // Fighting: up close; holding on (a reversal, a slam) closer still.
        const together = a.fight && a.fight === b.fight;
        const min = together && CONTACT.has(a.fight.move) ? 0.45 : a.foe === b.id || b.foe === a.id ? 1.05 : 1.45;
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

  place(w, dt = 0) {
    const r = w.rig;
    // Tipping over and getting up are smoothed, so a move that ends early never snaps the body upright.
    // (A throw is shown exactly as flown.)
    const follow = w.exact ? 1 : damp(16, dt);
    w.shownPitch = w.shownPitch === undefined ? w.pitch ?? 0 : lerpAngle(w.shownPitch, w.pitch ?? 0, follow);
    w.shownRoll = w.shownRoll === undefined ? w.roll ?? 0 : lerpAngle(w.shownRoll, w.roll ?? 0, follow);
    r.root.position.set(w.x, w.y, w.z);
    r.root.rotation.y = w.heading;
    r.root.rotation.x = w.shownPitch;
    r.root.rotation.z = w.shownRoll;
    r.root.scale.setScalar(w.baseScale * (w.pulse ?? 1));
    r.root.visible = !w.flicker;
    // Thrown wrestlers (and those sitting at ringside) rest on the floor: measure the body's actual
    // lowest point and lift it there. Sitting is measured once; it doesn't change.
    // Still tipped over (getting up after being pulled out of a knockdown into a throw): keep the body
    // above the mat until upright.
    if (w.ground || (!w.out && Math.abs(w.shownPitch) > 0.05)) {
      r.root.position.y += this.groundLift(w) + (w.hop ?? 0);
    } else if (w.out) {
      w.outLift ??= this.groundLift(w);
      r.root.position.y += w.outLift;
    }
    // Backed up against the ropes in a grapple: keep every part of the body this side of the top rope
    // (the throw then starts from there).
    if (w.ropeHold) {
      w.ropeBack = Math.max(w.ropeBack ?? 0, this.ropeOvershoot(w));
      r.root.position.x -= w.ropeHold.nx * w.ropeBack;
      r.root.position.z -= w.ropeHold.nz * w.ropeBack;
    }
    // Going over the top rope: lift the body if any part of it would pass through the rope (#105).
    w.ropeLift = w.ropeGuard ? Math.max(this.ropeLift(w), (w.ropeLift ?? 0) - 2 * dt) : 0;
    r.root.position.y += w.ropeLift;
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

  /** How far any part of the body, below the top rope's top, reaches past the inside of the rope. */
  ropeOvershoot(w) {
    const f = w.ropeHold;
    const inside = HALF + 0.1 - 0.07;
    let over = 0;
    eachVertex(w.rig, 4, true, (p) => {
      if (p.y > ROPE_TOP + 0.06 || Math.abs(p.x * f.ux + p.z * f.uz) > HALF + 0.15) return;
      over = Math.max(over, p.x * f.nx + p.z * f.nz - inside);
    });
    return over;
  }

  /**
   * How far a thrown body must rise so that no part of it near the top rope (from just inside it to its
   * far side, along its length) is below the rope's top, with a little room. Usually nothing: the
   * flight is shaped to clear it; this catches the tallest bodies and the widest flails.
   */
  ropeLift(w) {
    const f = w.ropeGuard;
    const rope = HALF + 0.1;
    let need = 0;
    eachVertex(w.rig, 4, true, (p) => {
      const out = p.x * f.nx + p.z * f.nz;
      if (out < rope - 0.08 || out > rope + 0.08) return;
      if (Math.abs(p.x * f.ux + p.z * f.uz) > HALF + 0.15) return;
      need = Math.max(need, ROPE_TOP + 0.09 - p.y);
    });
    return need;
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
    // Knockdowns in the ring (often several at once) check a sample of the detailed body; throws exactly.
    const gap = floor - lowestBodyPoint(r, r.skinnedRig && !w.out && w.mode === 'roam' ? 3 : 1);
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

  playElimination(b, t, active, dt) {
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
    // The grapple is square to the ropes. The victim faces in and goes over backwards.
    const inwardHeading = headingTo(f.nx, f.nz, 0, 0);
    const outwardHeading = headingTo(0, 0, f.nx, f.nz);
    // Satyaki: a run to the ropes, a bounce off them and a running tackle, when there's room (#106).
    const run = this.reboundRun(b, h, f, push);
    const move = run ? 'rebound' : overhead ? 'overhead' : hipToss ? 'hipToss' : 'shove';
    const tipBack = overhead || run ? 0 : 0.3; // a grappled victim leans back over the rope as the throw starts
    // Hidimbi changes form mid-grapple: her outline pulses while she's locked up.
    const shapeshift = (w) => (w.kind.style === 'shapeshift' ? 1 + 0.1 * Math.sin(t * 24) : 1);

    if (run && t < b.throwAt) {
      this.runUp(b, t, v, h, f, run, inwardHeading);
    } else if (t < b.grappleAt) {
      // Meet at the ropes. Strides are paced by distance covered (#99), shorten as they arrive, and
      // the hands come up to take hold just as they meet (#98).
      const raw = (t - b.start) / PACE.approach;
      const k = ease(raw);
      const reach = ease((raw - 0.6) / 0.4);
      // Blend to the fixed grapple headings. A moving target can cross the 180° seam as the
      // wrestlers approach, abruptly reversing a shortest-angle blend (#109).
      for (const [w, to, facing] of [[v, pv, inwardHeading], [h, ph, outwardHeading]]) {
        const from = this.anchor(b, w);
        const x = from.x + (to.x - from.x) * k;
        const z = from.z + (to.z - from.z) * k;
        w.walk += Math.hypot(x - w.x, z - w.z) * 3.2;
        w.x = x;
        w.z = z;
        w.y = MAT_Y;
        w.heading = lerpAngle(from.heading, facing, k);
      }
      const stride = 0.4 * (1 - reach);
      this.act(v, 'approach', { walk: v.walk, stride, guard: 0.8 * (1 - reach), armsForward: reach, crouch: 0.25 + 0.05 * reach, lean: 0.15 * reach });
      this.act(h, 'approach', { walk: h.walk, stride, guard: 0.8 * (1 - reach), armsForward: reach, crouch: 0.25 + 0.1 * reach, lean: 0.3 * reach });
    } else if (t < b.throwAt) {
      // Grapple, edging the victim back to the ropes; it settles before the throw.
      const k = (t - b.grappleAt) / PACE.grapple;
      const settle = ease((k - 0.75) / 0.25);
      const shake = Math.sin(t * 22) * 0.04 * (1 - settle);
      v.x = pv.x + f.nx * push * k + shake;
      v.z = pv.z + f.nz * push * k;
      v.y = h.y = MAT_Y;
      v.pulse = shapeshift(v);
      h.pulse = shapeshift(h);
      // Ghatotkacha's illusion: he flickers like a mirage just before the throw.
      h.flicker = h.kind.style === 'illusion' && t > b.throwAt - 0.45 && Math.floor(t * 18) % 2 === 0;
      h.x = ph.x + f.nx * 0.35 * k;
      h.z = ph.z + f.nz * 0.35 * k;
      v.heading = inwardHeading;
      h.heading = outwardHeading;
      v.pitch = tipBack * settle;
      v.exact = true;
      v.ropeHold = f; // backed up against the ropes, but not into them
      if (k < 0.05) v.ropeBack = 0;
      this.act(v, 'grapple', { armsForward: 1, crouch: 0.3, lean: 0.15 - k * 0.3 });
      // Lifters sink their weight to load the lift; everyone else drives in.
      this.act(h, 'grapple', { armsForward: 1, crouch: 0.35 + (overhead ? 0.15 * settle : 0), lean: 0.3 });
      this.emit(`grapple:${b.start}`, { type: 'grapple', victim: v, thrower: h });
    } else if (t < b.landAt) {
      // The throw: over the top rope and down to the floor.
      const k = (t - b.throwAt) / PACE.throw;
      this.emit(`throw:${b.start}`, { type: 'throw', victim: v, thrower: h, move });
      if (this.fired.has(`throw:${b.start}`) && !this.fired.has(`throwSound:${b.start}`)) {
        this.fired.add(`throwSound:${b.start}`);
        this.sfx?.play('throw');
      }
      const start = { x: pv.x + f.nx * push, z: pv.z + f.nz * push };
      let x;
      let z;
      let y;
      let flip;
      h.y = MAT_Y;
      if (!run) h.heading = outwardHeading;
      if (overhead && k < 0.35) {
        // Bhima's two-handed overhead toss: up first, the hands going from the grip to overhead...
        const q = ease(k / 0.35);
        const back = (v.ropeBack ?? 0) + 0.6 * q;
        x = start.x - f.nx * back;
        z = start.z - f.nz * back;
        y = MAT_Y + 1.9 * q;
        flip = 0.4 * q; // leaning back, held overhead
        this.act(h, 'throw', { armsForward: 1 - q, armsUp: q, crouch: 0.5 - 0.3 * q, lean: 0.3 * (1 - q) });
      } else {
        // ...then out over the ropes (everyone else shoves straight through).
        const q = overhead ? (k - 0.35) / 0.65 : k;
        // From where the grapple left them (held just off the ropes, see place()).
        const back = (v.ropeBack ?? 0) + (overhead ? 0.6 : 0);
        const from = { x: start.x - f.nx * back, z: start.z - f.nz * back, y: overhead ? MAT_Y + 1.9 : MAT_Y };
        // Over backwards: from leaning back to flat on the back as they reach the floor.
        const from0 = overhead ? 0.4 : tipBack;
        flip = from0 + (ON_BACK - from0) * ease(q);
        // Karna and Shikhandi send them through one full cartwheel, still landing on the back.
        v.roll = hipToss ? ease(q) * Math.PI * 2 : 0;
        // The body turns about its middle, not its feet, and that middle flies an arc that peaks early,
        // over the ropes, so the trailing legs clear the top rope (#105). It starts and ends exactly
        // where the grapple left them and where the landing picks them up.
        const middle = (pitch, roll, root) => new THREE.Vector3(0, v.rig.height * 0.45, 0)
          .applyEuler(new THREE.Euler(pitch, inwardHeading, roll, 'YXZ')).add(root);
        const c0 = middle(from0, 0, new THREE.Vector3(from.x, from.y, from.z));
        const c1 = middle(ON_BACK, 0, new THREE.Vector3(landing.x, 0.25, landing.z));
        const centre = c0.clone().lerp(c1, q);
        centre.y += (overhead ? FLIGHT.overhead : hipToss ? FLIGHT.hipToss : FLIGHT.peak) * (256 / 27) * q * (1 - q) ** 3; // highest a quarter of the way
        const root = centre.sub(middle(flip, v.roll, new THREE.Vector3()));
        x = root.x;
        z = root.z;
        y = root.y;
        if (run) {
          // The tackle carries Satyaki on a step or two towards the ropes as they go over.
          const go = ease(Math.min(1, q * 2.5));
          h.x = run.contact.x + f.nx * 0.55 * go;
          h.z = run.contact.z + f.nz * 0.55 * go;
          // He keeps the line of his charge through the contact, squaring to the ropes as he follows through.
          h.heading = lerpAngle(run.charge, outwardHeading, ease(q / RUN.tackle));
          this.act(h, 'run:tackle', { lean: 0.65 - 0.45 * q, armsForward: 0.7, crouch: 0.35 - 0.15 * q, spread: 0.2 }, 0.1);
        } else this.act(h, overhead ? 'throw' : 'throw:release', overhead
          ? { armsUp: 1 - q * 0.4, spread: q * 0.3, crouch: 0.2 * (1 - q) }
          : hipToss ? { armsForward: 1, twist: 0.8 * q, crouch: 0.35 - 0.05 * q, lean: 0.3 * (1 - q) }
            : { armsForward: 1 + 0.2 * Math.min(1, q * 4), lean: 0.3 + 0.15 * Math.min(1, q * 4) - 0.45 * q, crouch: 0.35 * (1 - q) });
      }
      v.x = x;
      v.z = z;
      v.y = y;
      v.pitch = flip;
      v.exact = true; // shown exactly as flown: the body turns about its middle
      v.ropeGuard = f; // and nothing goes through the top rope
      v.heading = inwardHeading;
      v.tagDrop = -1.4;
      v.ground = true; // never let any part of the body pass through the ring or the floor
      v.landed = false;
      v.hop = 0;
      // The hands let go of the grip as they go over, then flail.
      this.act(v, 'thrown', { flail: 1, spread: 0.6, walk: t * 8 }, 0.2);
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
        v.outTime = t; // the HUD keeps ring-out callouts off them for a few seconds
      }
      this.emit(`out:${b.start}`, { type: 'out', victim: v, thrower: h, remaining: this.inRing().length, final: b.final, move });
      const since = t - b.landAt;
      v.roll = 0;
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
      v.exact = true;
      v.ropeGuard = null; // well clear of the ropes now
      v.landed = true; // resting on the floor: settle onto it, never hover
      // Square to the ropes as they land, turning to face the ring centre as they sit up.
      v.heading = lerpAngle(inwardHeading, headingTo(v.x, v.z, 0, 0), sitUp);
      // Flat on the back (the bounce rocks them a little), then sitting up facing the ring.
      v.pitch = (ON_BACK - hop * 0.5) * (1 - sitUp);
      v.tagDrop = -1.4 * (1 - sitUp) - 0.9 * sitUp;
      this.act(v, 'landed', { sit: sitUp, spread: 0.4 * (1 - sitUp) + hop * 0.8, flail: hop > 0.05 ? 0.3 : 0, walk: t * 6, look: 0.3 }, 0.15);
      // The thrower: Duryodhana plays to the crowd (turning at a steady rate, #99); everyone else squares up again.
      h.y = MAT_Y;
      if (h.kind.style === 'showman') {
        h.heading += SHOWMAN_TURN * dt;
        this.act(h, 'showman', { armsUp: 1, spread: 0.5, walk: t * 6, stride: 0.1 });
        if (!this.fired.has(`showman:${b.start}`)) this.crowd.showman(t);
        this.emit(`showman:${b.start}`, { type: 'showman', wrestler: h });
      } else {
        h.heading = lerpAngle(h.heading, headingTo(h.x, h.z, landing.x, landing.z), damp(6, dt));
        this.act(h, 'squareUp', { guard: 0.8, crouch: 0.2, look: -0.2 });
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

  /**
   * Satyaki's rope rebound for a ring-out (#106): a rope on another side of the ring he can run to,
   * bounce off and charge back from, straight out through the victim, arriving as the throw starts,
   * and clear of any other throw going on. Decided once, as the exchange starts; null when there's
   * no such run (then he uses the standard throw, and the feed says what he did).
   */
  reboundRun(b, h, f, push) {
    const key = `${b.start}:${b.victim}`;
    this.runs ??= new Map();
    if (this.runs.has(key)) return this.runs.get(key);
    let best = null;
    if (h.kind.style === 'rebound') {
      const from = this.anchor(b, h);
      const contact = f.at(HALF - 0.95 + push - 0.85); // where the tackle meets the victim, backed onto the ropes
      const time = PACE.approach + PACE.grapple - RUN.bounce;
      for (let side = 0; side < 4; side++) {
        if (side === b.side) continue;
        const g = this.sideFrame(side, 0);
        for (let along = -4.5; along <= 4.5; along += 0.5) {
          const rope = g.at(HALF - ROPE_CONTACT, along);
          const dx = contact.x - rope.x;
          const dz = contact.z - rope.z;
          const charge = Math.hypot(dx, dz);
          if (charge < 3.5 || charge > 8 || (dx * f.nx + dz * f.nz) / charge < 0.6) continue; // a run-up, outwards
          const t1 = Math.hypot(rope.x - from.x, rope.z - from.z) / RUN.speed;
          const speed = charge / (time - t1);
          if (time - t1 <= 0 || speed < 4 || speed > 7.5) continue;
          if (this.crossesAction(from, rope, b) || this.crossesAction(rope, contact, b)) continue;
          const score = Math.abs(speed - RUN.speed);
          if (!best || score < best.score) best = { rope, contact, t1, score, charge: headingTo(rope.x, rope.z, contact.x, contact.z) };
        }
      }
    }
    this.runs.set(key, best);
    return best;
  }

  /** Whether a straight run from `a` to `c` passes near a throw or close call other than `self`. */
  crossesAction(a, c, self) {
    const others = this.plan.beats.filter((o) => o !== self && (o.type === 'elimination' || o.type === 'closeCall')
      && o.start < self.throwAt && o.end > self.start);
    for (const o of others) {
      const centre = this.sideFrame(o.side, o.spot).at(HALF - 1.5);
      for (let k = 0; k <= 1; k += 0.1) {
        if (Math.hypot(a.x + (c.x - a.x) * k - centre.x, a.z + (c.z - a.z) * k - centre.z) < 2.6) return true;
      }
    }
    return false;
  }

  /** The rope rebound up to the tackle: the victim backs onto the ropes, Satyaki runs, bounces, charges. */
  runUp(b, t, v, h, f, run, inwardHeading) {
    const since = t - b.start;
    const step = (w, x, z) => {
      w.walk += Math.hypot(x - w.x, z - w.z) * 3.2;
      w.x = x;
      w.z = z;
      w.y = MAT_Y;
    };
    // The victim: backed onto the ropes, dazed, turning to face the ring as Satyaki comes back.
    const av = this.anchor(b, v);
    const at = { x: run.contact.x + f.nx * 0.85, z: run.contact.z + f.nz * 0.85 };
    const k = ease(since / PACE.approach);
    step(v, av.x + (at.x - av.x) * k, av.z + (at.z - av.z) * k);
    v.ropeBack = 0;
    const braceAt = b.throwAt - RUN.brace;
    const brace = ease((t - braceAt) / RUN.brace);
    if (t >= braceAt) {
      // Finish square to the ropes before flight, starting from the last heading actually shown.
      run.braceFrom ??= v.heading;
      v.heading = lerpAngle(run.braceFrom, inwardHeading, brace);
    } else {
      // Follow the bearing continuously and limit the displayed turn when Satyaki runs close by (#113).
      const toward = headingTo(v.x, v.z, h.x, h.z);
      const previous = run.toward ?? av.heading;
      run.toward = previous + turnBy(previous, toward);
      const facing = av.heading + (run.toward - av.heading) * k;
      const maxTurn = RUN.victimTurn * this.dt;
      v.heading += THREE.MathUtils.clamp(facing - v.heading, -maxTurn, maxTurn);
    }
    if (since < PACE.approach) this.act(v, 'run:back', { walk: v.walk, stride: 0.35 * (1 - k), guard: 0.6, crouch: 0.2, lean: -0.15 });
    else this.act(v, 'run:dazed', { guard: 0.4 + 0.5 * brace, crouch: 0.2 + 0.1 * brace, look: -0.3 * (1 - brace), tilt: 0.15 * Math.sin(t * 3) * (1 - brace), lean: -0.1 });
    // Satyaki: out to the ropes, off them, and back at full speed. His facing is set by time alone:
    // towards the ropes he runs to, then round to the charge as he reaches them. Each leg is a fixed
    // turn between fixed headings, so overlapping legs never change his direction of turn.
    const ah = this.anchor(b, h);
    const outH = headingTo(ah.x, ah.z, run.rope.x, run.rope.z);
    const turn = ease((since - run.t1 + RUN.early) / RUN.turn);
    h.heading = ah.heading + turnBy(ah.heading, outH) * ease(since / RUN.start) + turnBy(outH, run.charge) * turn;
    if (since < run.t1) {
      const q = (since / run.t1) ** 1.5; // building speed into the ropes
      step(h, ah.x + (run.rope.x - ah.x) * q, ah.z + (run.rope.z - ah.z) * q);
      this.act(h, 'run:out', { walk: h.walk, stride: 0.7, guard: 0.2, crouch: 0.2, lean: 0.25 });
    } else if (since < run.t1 + RUN.bounce) {
      const s = Math.sin(((since - run.t1) / RUN.bounce) * Math.PI);
      step(h, run.rope.x, run.rope.z);
      this.act(h, 'run:bounce', { lean: -0.55 * s, spread: 0.5 * s, crouch: 0.25 }, 0.1);
      if (!this.fired.has(`bounce-rope:${b.start}`)) {
        this.fired.add(`bounce-rope:${b.start}`);
        this.sfx?.play('hit');
      }
    } else {
      const q = (since - run.t1 - RUN.bounce) / (b.throwAt - b.start - run.t1 - RUN.bounce);
      step(h, run.rope.x + (run.contact.x - run.rope.x) * q, run.rope.z + (run.contact.z - run.rope.z) * q);
      const dip = ease((q - 0.7) / 0.3); // shoulder down for the tackle
      this.act(h, 'run:charge', { walk: h.walk, stride: 0.7 * (1 - 0.5 * dip), guard: 0.2 * (1 - dip), crouch: 0.25 + 0.15 * dip, lean: 0.3 + 0.35 * dip, armsForward: 0.5 * dip });
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
    const approachTime = 0.9;
    const approach = ease(since / approachTime);
    const aw = this.anchor(b, w);
    const ao = this.anchor(b, o);
    // Face each other along the rope normal by the end of the approach and hold that facing (#112).
    w.heading = lerpAngle(aw.heading, headingTo(pw.x, pw.z, po.x, po.z), approach);
    o.heading = lerpAngle(ao.heading, headingTo(po.x, po.z, pw.x, pw.z), approach);
    w.y = o.y = MAT_Y;
    if (since < approachTime) {
      w.x = aw.x + (pw.x - aw.x) * approach;
      w.z = aw.z + (pw.z - aw.z) * approach;
      o.x = ao.x + (po.x - ao.x) * approach;
      o.z = ao.z + (po.z - ao.z) * approach;
      this.act(w, 'cc:back', { walk: t * 7, stride: 0.35 * (1 - ease((since - 0.6) / 0.3)), guard: 0.6, lean: -0.2 });
      this.act(o, 'cc:drive', { armsForward: 1, walk: t * 7, stride: 0.35 * (1 - ease((since - 0.6) / 0.3)), lean: 0.35 });
    } else if (since < 1.9) {
      // Teetering over the top rope.
      const k = (since - approachTime) / (1.9 - approachTime);
      if (!this.fired.has(`close:${b.start}`)) this.crowd.closeCall(pw.x, pw.z, t);
      this.emit(`close:${b.start}`, { type: 'closeCall', wrestler: w, other: o });
      w.x = pw.x;
      w.z = pw.z;
      w.pulse = w.kind.style === 'shapeshift' ? 1 + 0.1 * Math.sin(t * 24) : 1;
      this.act(w, 'cc:teeter', { lean: -0.95 * Math.sin(Math.min(1, k * 1.4) * Math.PI * 0.5), flail: 1, walk: t * 9, crouch: 0.15 });
      this.act(o, 'cc:drive', { armsForward: 1.1, lean: 0.4 });
    } else {
      // Back from the brink: both return towards the centre (Abhimanyu ducks out low and sideways).
      const k = ease((since - 1.9) / (PACE.closeCall - 1.9));
      const duck = w.kind.style === 'duck';
      w.x = pw.x - f.nx * 2.2 * k + (duck ? f.ux * 1.6 * k : 0);
      w.z = pw.z - f.nz * 2.2 * k + (duck ? f.uz * 1.6 * k : 0);
      o.x = po.x - f.nx * 1.6 * k;
      o.z = po.z - f.nz * 1.6 * k;
      this.act(w, 'cc:recover', { guard: 0.8, crouch: duck ? 0.35 * (1 - k) + 0.25 : 0.25, walk: t * 6, stride: 0.3, lean: duck ? 0.4 * (1 - k) : -0.3 * (1 - k) }, 0.3);
      this.act(o, 'cc:recover', { guard: 0.8, crouch: 0.25, walk: t * 6, stride: 0.3 }, 0.3);
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
    this.act(w, 'victory', { armsUp: k, spread: 0.35, walk: since * 5, stride: 0.15 * (1 - k) }, 0.3);
    this.confetti = (this.confetti ?? 0) - dt;
    if (this.confetti <= 0 && since < 8) {
      this.confetti = 0.25;
      this.particles.burst(new THREE.Vector3((this.random() - 0.5) * 8, 9 + this.random() * 2, (this.random() - 0.5) * 8), { count: 22, colors: CONFETTI, speed: 5, up: 2, life: 3.2, size: 0.16, gravity: 5, flat: true, spread: 3 });
    }
  }

  playOut(w, dt) {
    // Eliminated wrestlers stay sitting at ringside, watching.
    w.y = 0;
    w.pitch = 0;
    w.tagDrop = -0.9;
    w.heading = lerpAngle(w.heading, headingTo(w.x, w.z, 0, 0), damp(2, dt));
    // Once settled the pose never changes (only the heading does), so it isn't rebuilt every update.
    if (w.moveKey !== 'out' || w.blendFrom) this.act(w, 'out', { sit: 1, look: 0.3, armsForward: 0.3 }, 0.5);
  }

  // ------------------------------------------------------------ camera

  /**
   * The camera circles the ring's centre for the whole match (#95), at a steady speed, distance and
   * height, like the victory orbit. It only turns, a bounded amount, towards the action (one throw,
   * or two at once, or the close call) and never pushes in for a ring-out. For the final two it eases,
   * over a few seconds, into a closer orbit, and from there into the victory shot.
   */
  updateCamera(dt) {
    const t = this.t;
    const beats = this.plan.beats;
    const finalBeat = beats.find((b) => b.type === 'final');
    const victory = beats[beats.length - 1];
    const lerp = (a, b, k) => a + (b - a) * k;
    const { live, final } = this.aspect < 1 ? CAMERA.portrait : CAMERA;
    const intro = ease(t / PACE.intro);
    const tight = ease((t - finalBeat.start) / CAMERA.toFinal);
    const win = ease((t - victory.start) / CAMERA.toVictory);
    const shot = (key) => lerp(lerp(lerp(CAMERA.intro[key] ?? live[key], live[key], intro), final[key], tight), CAMERA.victory[key], win);
    const radius = shot('radius');
    const height = shot('height');
    // Where to aim: the action, weighted as it builds and fades, pulled back to at most `aim` from
    // the centre of the ring so the rest of the ring stays in the picture.
    let fx = 0;
    let fz = 0;
    let weight = 0;
    let low = 0;
    const toward = (x, z, k) => {
      fx += x * k;
      fz += z * k;
      weight += k;
    };
    for (const b of this.actions ?? []) {
      const f = this.sideFrame(b.side, b.spot);
      if (b.type === 'elimination') {
        const k = ease((t - b.start) / (PACE.approach * 0.8)) * (1 - ease((t - (b.end - PACE.reset - 0.3)) / 0.7));
        const c = f.at(HALF + 0.8); // between the rope and the landing
        toward(c.x, c.z, k);
        low = Math.max(low, k * ease((t - b.grappleAt) / PACE.grapple));
      } else {
        const c = f.at(HALF - 0.8);
        toward(c.x, c.z, ease((t - b.start) / 0.8) * (1 - ease((t - (b.end - 0.5)) / 0.5)));
      }
    }
    if (tight > 0 && t < victory.start) {
      const pair = this.inRing();
      if (pair.length) toward(pair.reduce((s, w) => s + w.x, 0) / pair.length, pair.reduce((s, w) => s + w.z, 0) / pair.length, tight * 0.6);
    }
    if (win > 0) {
      const w = this.wrestlers[victory.winner];
      fx *= 1 - win;
      fz *= 1 - win;
      weight *= 1 - win;
      toward(w.x, w.z, win);
    }
    const look = new THREE.Vector3(0, lerp(lerp(MAT_Y + 0.8, 0.9, low), MAT_Y + 1.5, win), 0);
    if (weight > 0) {
      const strength = Math.min(1, weight);
      look.x = (fx / weight) * strength;
      look.z = (fz / weight) * strength;
      const aim = shot('aim');
      const off = Math.hypot(look.x, look.z);
      if (off > aim) {
        look.x *= aim / off;
        look.z *= aim / off;
      }
    }
    this.orbit += lerp(CAMERA.intro.rate, CAMERA.live.rate, intro) * dt;
    this.camPos.set(Math.cos(this.orbit) * radius, height, Math.sin(this.orbit) * radius);
    if (!this.camReady) {
      this.camLook.copy(look);
      this.camReady = true;
    }
    // A throw too close under the camera to fit in the picture: look more towards it (see fitShot).
    if (this.roi && this.overflow > 0) look.lerp(this.roi, Math.min(0.85, this.overflow * 2));
    this.camLook.lerp(look, damp(CAMERA.aimRate, dt));
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
    this.fitShot(dt);
  }

  /**
   * Widens the shot (the camera itself keeps to its orbit) when a throw would go out of the picture:
   * the top rope, the landing area with the bounce and slide, and the thrown wrestler's whole body,
   * with a margin, from the start of the approach until they have sat up; likewise the close call. The
   * throw's whole path is known as the approach starts, so the lens widens gradually ahead of it, and
   * eases back as gradually afterwards: no sudden zoom either way (#95).
   */
  fitShot(dt) {
    const base = this.baseFov ?? 50;
    const cam = this.camera;
    const forward = this.camLook.clone().sub(cam.position).normalize();
    const right = new THREE.Vector3().crossVectors(forward, cam.up).normalize();
    const up = new THREE.Vector3().crossVectors(right, forward);
    const aspect = cam.aspect || 1;
    const d = new THREE.Vector3();
    let need = 0; // tan of the half vertical angle the shot needs
    const roi = new THREE.Vector3();
    let count = 0;
    const include = (x, y, z) => {
      roi.x += x;
      roi.y += y;
      roi.z += z;
      count++;
      d.set(x, y, z).sub(cam.position);
      const depth = d.dot(forward);
      if (depth < 0.5) {
        need = Infinity;
        return;
      }
      need = Math.max(need, Math.abs(d.dot(up)) / depth, Math.abs(d.dot(right)) / depth / aspect);
    };
    const region = (f, inward, along, low, high) => {
      for (const i of inward) for (const a of along) for (const y of [low, high]) {
        const p = f.at(i, a);
        include(p.x, y, p.z);
      }
    };
    const t = this.t;
    for (const b of this.actions ?? []) {
      const f = this.sideFrame(b.side, b.spot);
      if (b.type === 'elimination') {
        if (t > b.landAt + FRAME.hold) continue;
        region(f, [HALF], [b.spot - 0.8, b.spot + 0.8], MAT_Y, MAT_Y + ROPES[2]); // the ropes they go over
        region(f, [HALF + 2.7 - FRAME.pad, HALF + 3.4 + FRAME.pad], [b.spot - FRAME.pad, b.spot + FRAME.pad], 0, 1.2); // landing, bounce and slide
        // The flight over the ropes, as playElimination flies it, with room for the tumbling body.
        const overhead = LIFTERS.has(this.wrestlers[b.thrower].kind.style);
        for (const q of [0, 0.25, 0.5, 0.75, 1]) {
          const y = overhead ? MAT_Y + 1.9 + (0.25 - MAT_Y - 1.9) * q + 6.4 * q * (1 - q) : MAT_Y + (0.25 - MAT_Y) * q + 11.6 * q * (1 - q);
          const inward = HALF - (overhead ? 1.1 : 0.5) + (overhead ? 3.8 : 3.2) * q;
          region(f, [inward - FRAME.body, inward + FRAME.body], [b.spot - FRAME.body, b.spot + FRAME.body], Math.max(0, y - 1), y + FRAME.body + 0.1);
        }
        if (t >= b.throwAt) this.bodyRegion(this.wrestlers[b.victim], include);
      } else {
        region(f, [HALF - 1.9, HALF + 0.4], [b.spot - 0.9, b.spot + 0.9], MAT_Y, MAT_Y + 2.6);
      }
    }
    const fit = Number.isFinite(need) ? (2 * Math.atan(need * FRAME.margin) * 180) / Math.PI : FRAME.maxFov;
    const limit = this.aspect < 1 ? FRAME.maxPortraitFov : FRAME.maxFov;
    const target = Math.min(limit, Math.max(base, fit));
    // How far past a comfortable widening the throw needs: the camera then also turns towards it.
    this.overflow = Math.max(0, Math.min(1, (fit - base - FRAME.comfort) / (limit - base - FRAME.comfort)));
    this.roi = count ? roi.divideScalar(count) : null;
    if (this.fitFov === undefined) this.fitFov = target;
    else {
      // Ease the lens in log-scale (how big things look), never faster than FRAME.rate, counting any
      // change in the camera's distance (easing into the final-two and victory orbits) towards the limit.
      const scale = (fov) => Math.log(Math.tan((fov * Math.PI) / 360));
      const now = scale(this.fitFov);
      const moved = this.lastDist === undefined ? 0 : this.ringDistance() - this.lastDist;
      const step = Math.max(-FRAME.rate * dt - moved, Math.min(FRAME.rate * dt - moved, (scale(target) - now) * damp(FRAME.ease, dt)));
      this.fitFov = (Math.atan(Math.exp(now + step)) * 360) / Math.PI;
    }
    this.lastDist = this.ringDistance();
    if (Math.abs(cam.fov - this.fitFov) > 1e-3) {
      cam.fov = this.fitFov;
      cam.updateProjectionMatrix();
    }
  }

  /** Log of the camera's distance from the middle of the ring: it changes only as the orbit eases in. */
  ringDistance() {
    const p = this.camera.position;
    return Math.log(Math.hypot(p.x, p.y - MAT_Y, p.z));
  }

  /** The space a wrestler's body takes up, from the posed body itself (limbs and gear included). */
  bodyRegion(w, include) {
    const box = bodyBounds(w.rig, (this.bodyBox ??= new THREE.Box3())).expandByScalar(0.06);
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) include(x, y, z);
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
