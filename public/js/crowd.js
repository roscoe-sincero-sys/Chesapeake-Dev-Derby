// The crowd around the wrestling ring: low-poly fans with varied builds, poses, hair, scarves and
// hand-lettered signs, who react to the action. All fans share a handful of instanced meshes (one
// draw call per body part), and each fan's parts are re-posed every frame.

import * as THREE from 'three';
import { crowdSigns } from './wrestle-sim.js';

const SKIN = ['#ffdbac', '#f1c27d', '#e0ac69', '#c68642', '#a0522d', '#8d5524', '#5c3a21'];
const SHIRTS = ['#c5122f', '#f2b817', '#1864ab', '#2b8a3e', '#f8f9fa', '#212529', '#e8590c', '#862e9c', '#0b7285', '#868e96', '#d6336c', '#5c940d', '#495057', '#ffd8a8'];
const PANTS = ['#1c2333', '#343a40', '#3b4a6b', '#5c4033', '#2b2f36'];
const HAIR = ['#16110d', '#2d1b10', '#4a2c17', '#7a4a22', '#b08d57', '#d9c39a', '#9e9e9e', '#a1371f'];
const SCARVES = ['#c5122f', '#f2b817', '#16130f', '#ffffff'];
const POSES = ['stand', 'stand', 'crossed', 'seated', 'seated', 'lean', 'clap', 'handsUp'];
const HAIRDOS = ['short', 'short', 'long', 'bun', 'cap', 'turban', 'none'];

const SIGN_CARDS = ['#fffdf4', '#fff3bf', '#ffe3e3', '#d0ebff', '#d3f9d8', '#f3f0ff'];
const SIGN_INK = ['#16130f', '#c92a2a', '#1864ab', '#2b8a3e', '#862e9c'];
const HAND = '"Segoe Print", "Comic Sans MS", "Bradley Hand", "Marker Felt", "Chalkboard SE", cursive';

const rand = (lo, hi) => lo + Math.random() * (hi - lo);
const pickOne = (list) => list[Math.floor(Math.random() * list.length)];
const smooth = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));

/** A rounded limb whose top end sits at the origin, hanging down -Y. */
function limbGeometry(radius, length) {
  const g = new THREE.CapsuleGeometry(radius, length, 3, 8);
  g.translate(0, -length / 2 - radius * 0.5, 0);
  return g;
}

/**
 * Base angles for each pose: per arm [pitch, roll], where pitch swings the arm forward (π is straight
 * up) and roll swings it outwards (negative: across the body); plus torso lean and how seated.
 */
function basePose(fan, t) {
  const s = Math.sin(t * 2 + fan.phase);
  switch (fan.pose) {
    case 'crossed':
      return { lean: 0, seated: 0, l: [1.45, -0.95], r: [1.35, -0.95], bob: 0.01 };
    case 'seated':
      return { lean: 0.05, seated: 1, l: [0.55, 0.15], r: [0.55, 0.15], bob: 0.005 };
    case 'lean':
      return { lean: 0.38, seated: 0, l: [0.95, 0.1], r: [0.95, 0.1], bob: 0.01 };
    case 'clap': {
      const c = Math.abs(Math.sin(t * 7 + fan.phase)) * 0.35;
      return { lean: 0.05, seated: 0, l: [1.25, -0.25 + c], r: [1.25, -0.25 + c], bob: 0.02 };
    }
    case 'handsUp':
      return { lean: -0.05, seated: 0, l: [2.85 + s * 0.1, 0.3], r: [2.85 - s * 0.1, 0.3], bob: 0.06 };
    case 'sign':
      return { lean: 0, seated: 0, l: [2.6, 0.35], r: [2.6, 0.35], bob: 0.03 };
    default:
      return { lean: 0, seated: 0, l: [0.12, 0.12], r: [0.12, 0.12], bob: 0.012 };
  }
}

export class Crowd {
  /**
   * @param {THREE.Scene} scene
   * @param {string[]} names  the wrestlers (for the signs that name one)
   */
  constructor(scene, names) {
    this.group = new THREE.Group();
    scene.add(this.group);
    this.textures = [];
    this.fans = [];
    this.buildStands();
    this.placeFans();
    this.buildMeshes();
    this.buildSigns(names);
    this.update(0, 0);
  }

  buildStands() {
    // Four stepped tiers around the ring.
    for (let row = 0; row < 4; row++) {
      const r = 13 + row * 1.6;
      const step = new THREE.Mesh(new THREE.RingGeometry(r - 0.8, r + 0.8, 72), new THREE.MeshStandardMaterial({ color: '#262c3d', roughness: 0.9 }));
      step.rotation.x = -Math.PI / 2;
      step.position.y = row * 0.7 + 0.01;
      this.group.add(step);
      if (!row) continue; // the front tier sits on the floor: no riser
      const riser = new THREE.Mesh(new THREE.CylinderGeometry(r - 0.8, r - 0.8, 0.7, 72, 1, true), new THREE.MeshStandardMaterial({ color: '#1b2030', roughness: 0.95, side: THREE.DoubleSide }));
      riser.position.y = row * 0.7 - 0.34;
      this.group.add(riser);
    }
  }

  placeFans() {
    // Uneven spacing: jittered seats and the odd empty one, so the stands don't read as a grid.
    for (let row = 0; row < 4; row++) {
      const r = 13 + row * 1.6;
      const count = Math.round((2 * Math.PI * r) / 1.05);
      for (let i = 0; i < count; i++) {
        if (Math.random() < 0.13) continue;
        const a = ((i + rand(-0.3, 0.3)) / count) * Math.PI * 2 + row * 0.37;
        const radius = r + rand(-0.35, 0.35);
        const x = Math.cos(a) * radius;
        const z = Math.sin(a) * radius;
        this.fans.push({
          x,
          z,
          y: row * 0.7,
          row,
          angle: a,
          // Face the ring (local -Z points to the centre), give or take.
          facing: Math.atan2(x, z) + rand(-0.25, 0.25),
          pose: pickOne(POSES),
          hair: pickOne(HAIRDOS),
          scarf: Math.random() < 0.28,
          size: rand(0.88, 1.12),
          width: rand(0.85, 1.25),
          phase: rand(0, 10),
          skin: pickOne(SKIN),
          shirt: pickOne(SHIRTS),
          pants: pickOne(PANTS),
          hairColor: pickOne(HAIR),
          scarfColor: pickOne(SCARVES),
          react: null,
        });
      }
    }
  }

  buildMeshes() {
    const n = this.fans.length;
    const plain = (opts = {}) => new THREE.MeshStandardMaterial({ roughness: 0.85, ...opts });
    const make = (geometry, count) => {
      const mesh = new THREE.InstancedMesh(geometry, plain(), count);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      this.group.add(mesh);
      return mesh;
    };
    this.legs = make(limbGeometry(0.085, 0.3), n * 4);
    this.torso = make(new THREE.CapsuleGeometry(0.22, 0.34, 4, 10), n);
    this.head = make(new THREE.SphereGeometry(0.15, 12, 10), n);
    this.arms = make(limbGeometry(0.065, 0.42), n * 2);
    this.hands = make(new THREE.SphereGeometry(0.06, 8, 6), n * 2);
    this.eyes = make(new THREE.SphereGeometry(0.022, 6, 4), n * 2);
    this.hairMeshes = {
      short: make(new THREE.SphereGeometry(0.158, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), n),
      long: make(new THREE.SphereGeometry(0.16, 12, 10), n),
      bun: make(new THREE.SphereGeometry(0.075, 8, 6), n),
      cap: make(new THREE.CylinderGeometry(0.16, 0.16, 0.09, 12), n),
      turban: make(new THREE.TorusGeometry(0.13, 0.065, 8, 14), n),
    };
    this.brims = make(new THREE.BoxGeometry(0.22, 0.02, 0.16), n);
    this.scarves = make(new THREE.TorusGeometry(0.12, 0.05, 6, 12), n);

    const c = new THREE.Color();
    const hairCount = { short: 0, long: 0, bun: 0, cap: 0, turban: 0 };
    let scarfCount = 0;
    let brimCount = 0;
    this.fans.forEach((f, i) => {
      for (let k = 0; k < 4; k++) this.legs.setColorAt(i * 4 + k, c.set(f.pants));
      this.torso.setColorAt(i, c.set(f.shirt));
      this.head.setColorAt(i, c.set(f.skin));
      for (let k = 0; k < 2; k++) this.eyes.setColorAt(i * 2 + k, c.set('#141010'));
      for (let k = 0; k < 2; k++) {
        this.arms.setColorAt(i * 2 + k, c.set(f.pose === 'crossed' || Math.random() < 0.5 ? f.shirt : f.skin));
        this.hands.setColorAt(i * 2 + k, c.set(f.skin));
      }
      if (f.hair !== 'none') {
        f.hairIndex = hairCount[f.hair]++;
        const colour = f.hair === 'cap' ? pickOne(SHIRTS) : f.hair === 'turban' ? pickOne(['#e8590c', '#f8f9fa', '#1864ab', '#c5122f', '#f2b817']) : f.hairColor;
        this.hairMeshes[f.hair].setColorAt(f.hairIndex, c.set(colour));
        if (f.hair === 'cap') {
          f.brimIndex = brimCount++;
          this.brims.setColorAt(f.brimIndex, c.set(colour));
        }
      }
      if (f.scarf) {
        f.scarfIndex = scarfCount++;
        this.scarves.setColorAt(f.scarfIndex, c.set(f.scarfColor));
      }
    });
    for (const [key, mesh] of Object.entries(this.hairMeshes)) mesh.count = hairCount[key];
    this.brims.count = brimCount;
    this.scarves.count = scarfCount;
    for (const mesh of [this.legs, this.torso, this.head, this.eyes, this.arms, this.hands, this.brims, this.scarves, ...Object.values(this.hairMeshes)]) {
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }

  buildSigns(names) {
    this.signs = [];
    const cards = crowdSigns(names);
    // Spread the signs around the stands, held up by fans in the front three rows.
    const holders = this.fans.filter((f) => f.row < 3 && f.pose !== 'seated');
    cards.forEach((lines, i) => {
      const target = (i / cards.length) * Math.PI * 2 + rand(-0.15, 0.15);
      let best = null;
      let bestD = Infinity;
      for (const f of holders) {
        if (f.sign) continue;
        const d = Math.abs(Math.atan2(Math.sin(f.angle - target), Math.cos(f.angle - target))) + f.row * 0.03;
        if (d < bestD) {
          bestD = d;
          best = f;
        }
      }
      if (!best) return;
      best.pose = 'sign';
      const { texture, aspect } = this.signTexture(lines);
      const h = 0.95;
      const card = new THREE.Mesh(new THREE.PlaneGeometry(h * aspect, h), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9, side: THREE.DoubleSide }));
      card.rotation.order = 'YXZ';
      this.group.add(card);
      best.sign = { mesh: card, tilt: rand(-0.12, 0.12) };
      this.signs.push(card);
    });
  }

  /** Draws a hand-lettered sign: marker on cardboard, words wrapped, each line slightly askew. */
  signTexture(lines) {
    const words = [];
    for (const line of lines) {
      // Keep the lines as written; only wrap the really long ones (over 22 characters) at a space.
      let current = '';
      for (const word of line.split(' ')) {
        if (current && (current + ' ' + word).length > 22) {
          words.push(current);
          current = word;
        } else current = current ? `${current} ${word}` : word;
      }
      if (current) words.push(current);
    }
    const W = 512;
    const lineH = 78;
    const H = Math.max(200, words.length * lineH + 60);
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = pickOne(SIGN_CARDS);
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(120, 90, 40, 0.35)';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, W - 16, H - 16);
    const ink = pickOne(SIGN_INK);
    const accent = pickOne(SIGN_INK.filter((c) => c !== ink));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    words.forEach((text, i) => {
      let size = 64;
      ctx.font = `700 ${size}px ${HAND}`;
      while (ctx.measureText(text).width > W - 50 && size > 26) {
        size -= 2;
        ctx.font = `700 ${size}px ${HAND}`;
      }
      ctx.save();
      ctx.translate(W / 2 + rand(-6, 6), 30 + lineH * (i + 0.5) + (H - 60 - words.length * lineH) / 2);
      ctx.rotate(rand(-0.04, 0.04));
      ctx.fillStyle = i % 3 === 1 ? accent : ink;
      ctx.fillText(text, 0, 0);
      ctx.restore();
    });
    // A marker underline under the last line.
    ctx.strokeStyle = accent;
    ctx.lineWidth = 5;
    ctx.beginPath();
    const y = H - 28;
    ctx.moveTo(70, y);
    for (let x = 70; x <= W - 70; x += 20) ctx.lineTo(x, y + Math.sin(x / 15) * 3);
    ctx.stroke();
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    this.textures.push(texture);
    return { texture, aspect: W / H };
  }

  // ------------------------------------------------------------ reactions

  /** Someone went over the ropes at (x, z): the nearest section leans back with hands up, rippling out. */
  ringOut(x, z, t) {
    for (const f of this.fans) {
      const d = Math.hypot(f.x - x, f.z - z);
      if (d < 9) this.start(f, { kind: 'shock', at: t + d * 0.05 + rand(0, 0.15), dur: 1.8 + rand(0, 0.6) });
    }
  }

  /** A close call at the ropes: the nearby section leans forward. */
  closeCall(x, z, t) {
    for (const f of this.fans) {
      const d = Math.hypot(f.x - x, f.z - z);
      if (d < 8) this.start(f, { kind: 'gasp', at: t + rand(0, 0.25), dur: 1.4 });
    }
  }

  /** Duryodhana plays to the crowd: a few fans stand and cheer a beat later. */
  showman(t) {
    const fans = this.fans.filter((f) => !f.sign);
    for (let i = 0; i < 14; i++) this.start(pickOne(fans), { kind: 'cheer', at: t + rand(0.35, 0.9), dur: 2.2 + rand(0, 0.8) });
  }

  /** The winner: everyone up and cheering. */
  victory(t) {
    for (const f of this.fans) this.start(f, { kind: 'cheer', at: t + rand(0, 0.7), dur: 999 });
  }

  start(f, react) {
    if (f.react && f.react.dur === 999) return; // already celebrating the win
    f.react = react;
  }

  // ------------------------------------------------------------ animation

  update(t) {
    const m = new THREE.Matrix4();
    const base = new THREE.Matrix4();
    const body = new THREE.Matrix4();
    const tmp = new THREE.Matrix4();
    const rot = new THREE.Matrix4();
    const scale = new THREE.Matrix4();
    const set = (mesh, index, matrix) => mesh.setMatrixAt(index, matrix);

    this.fans.forEach((f, i) => {
      const p = basePose(f, t);
      let { lean, seated } = p;
      let l = p.l;
      let r = p.r;
      let bob = Math.abs(Math.sin(t * 3 + f.phase)) * p.bob;
      // Blend in a reaction.
      if (f.react && t >= f.react.at) {
        const since = t - f.react.at;
        const w = smooth(since / 0.25) * (f.react.dur === 999 ? 1 : 1 - smooth((since - f.react.dur + 0.4) / 0.4));
        if (since > f.react.dur) f.react = null;
        else if (w > 0) {
          const kind = f.react.kind;
          const up = [2.95 + Math.sin(t * 9 + f.phase) * 0.15, 0.35];
          const upR = [2.95 - Math.sin(t * 9 + f.phase) * 0.15, 0.35];
          const target = kind === 'gasp'
            ? { lean: 0.45, seated: seated * 0.5, l: [2.3, 0.5], r: [2.3, 0.5] } // hands to heads
            : kind === 'shock'
              ? { lean: -0.32, seated: 0, l: up, r: upR }
              : { lean: -0.08, seated: 0, l: up, r: upR }; // cheer: stand up, hands in the air
          if (f.sign) {
            target.l = l;
            target.r = r;
          }
          lean += (target.lean - lean) * w;
          seated += (target.seated - seated) * w;
          l = [l[0] + (target.l[0] - l[0]) * w, l[1] + (target.l[1] - l[1]) * w];
          r = [r[0] + (target.r[0] - r[0]) * w, r[1] + (target.r[1] - r[1]) * w];
          if (kind !== 'gasp') bob += Math.abs(Math.sin(t * 8 + f.phase)) * 0.12 * w;
        }
      }

      // Feet on their tier, facing the ring.
      base.makeRotationY(f.facing).setPosition(f.x, f.y + bob, f.z);
      scale.makeScale(f.size, f.size, f.size);
      base.multiply(scale);

      // Legs: standing straight, or (seated) thighs forward and shins down.
      const hipY = 0.78 - 0.36 * seated;
      for (let k = 0; k < 2; k++) {
        const side = k ? 1 : -1;
        tmp.makeTranslation(side * 0.11, hipY, 0);
        rot.makeRotationX(seated * 1.5);
        const thigh = base.clone().multiply(tmp).multiply(rot);
        set(this.legs, i * 4 + k * 2, thigh);
        tmp.makeTranslation(0, -0.42, 0);
        rot.makeRotationX(-seated * 1.5);
        set(this.legs, i * 4 + k * 2 + 1, thigh.clone().multiply(tmp).multiply(rot));
      }

      // Torso pivots at the hips (lean forward > 0, back < 0).
      tmp.makeTranslation(0, hipY, 0);
      rot.makeRotationX(-lean);
      body.copy(base).multiply(tmp).multiply(rot);
      m.copy(body).multiply(tmp.makeTranslation(0, 0.36, 0)).multiply(scale.makeScale(f.width, 1, f.width * 0.85));
      set(this.torso, i, m);
      const headM = body.clone().multiply(tmp.makeTranslation(0, 0.85, 0));
      set(this.head, i, headM);
      // Eyes on the ring side of the face, so you can see which way everyone is looking.
      for (let k = 0; k < 2; k++) set(this.eyes, i * 2 + k, headM.clone().multiply(tmp.makeTranslation((k ? 1 : -1) * 0.052, 0.025, -0.135)));

      // Arms from the shoulders: pitch forward/up, roll outwards.
      [l, r].forEach(([pitch, roll], k) => {
        const side = k ? 1 : -1;
        const arm = body.clone()
          .multiply(tmp.makeTranslation(side * 0.27 * f.width, 0.6, 0))
          .multiply(rot.makeRotationZ(side * roll))
          .multiply(new THREE.Matrix4().makeRotationX(pitch));
        set(this.arms, i * 2 + k, arm);
        set(this.hands, i * 2 + k, arm.clone().multiply(tmp.makeTranslation(0, -0.55, 0)));
      });

      // Hair, hat or turban, and a scarf.
      if (f.hair !== 'none') {
        const hairM = headM.clone();
        if (f.hair === 'short') hairM.multiply(tmp.makeTranslation(0, 0.015, 0.01));
        if (f.hair === 'long') hairM.multiply(tmp.makeTranslation(0, -0.07, 0.06)).multiply(scale.makeScale(1.05, 1.5, 0.75));
        if (f.hair === 'bun') hairM.multiply(tmp.makeTranslation(0, 0.1, 0.13));
        if (f.hair === 'cap') hairM.multiply(tmp.makeTranslation(0, 0.1, 0));
        if (f.hair === 'turban') hairM.multiply(tmp.makeTranslation(0, 0.1, 0)).multiply(rot.makeRotationX(Math.PI / 2)).multiply(scale.makeScale(1, 1, 1.2));
        set(this.hairMeshes[f.hair], f.hairIndex, hairM);
        if (f.hair === 'cap') set(this.brims, f.brimIndex, headM.clone().multiply(tmp.makeTranslation(0, 0.06, -0.16)));
      }
      if (f.scarf) set(this.scarves, f.scarfIndex, body.clone().multiply(tmp.makeTranslation(0, 0.68, 0)).multiply(rot.makeRotationX(Math.PI / 2)));

      // A sign held up overhead, facing the ring, swaying a little.
      if (f.sign) {
        const card = f.sign.mesh;
        const pos = new THREE.Vector3(0, 1.75, -0.25).applyMatrix4(body);
        card.position.copy(pos);
        card.rotation.set(-0.12, f.facing + Math.PI, f.sign.tilt + Math.sin(t * 2.2 + f.phase) * 0.05);
      }
    });

    for (const mesh of [this.legs, this.torso, this.head, this.eyes, this.arms, this.hands, this.brims, this.scarves, ...Object.values(this.hairMeshes)]) {
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  dispose() {
    this.group.removeFromParent();
    for (const t of this.textures) t.dispose();
    this.group.traverse((o) => {
      if (o.isInstancedMesh) o.dispose(); // instance buffers
      o.geometry?.dispose();
      if (o.material) [].concat(o.material).forEach((mat) => mat.dispose());
    });
  }
}
