// Live 3D wrestling ring stage for the lobby (#123 phase 2).
// Reuses the arena look, crowd, and wrestler rigs from wrestle.js / wrestlers.js without running a match.
// Supports live roster updates (pop-in hops) and live Classic <-> HD model swapping.

import * as THREE from 'three';
import { mat, box, cyl, plane, at, canvasTexture, drawMarylandFlag, MD, FONT_UI } from './util3d.js';
import { WRESTLER_KINDS } from './wrestle-sim.js';
import { buildWrestler, pose, prepareWrestlerModels } from './wrestlers.js';
import { Crowd } from './crowd.js';

const MAT_Y = 1.3;
const HALF = 6;
const ROPES = [0.55, 1.05, 1.55];
const SIDES = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** Stable hash so a teammate keeps the same character and colour as others check in or out. */
function hashName(name) {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export class WrestleStage {
  constructor(aspect = 16 / 9, initialNames = [], { orbit = 0.55, t = 0 } = {}) {
    this.t = Number.isFinite(t) && t >= 0 ? t : 0;
    this.orbit = Number.isFinite(orbit) ? orbit : 0.55;
    this.loadGen = 0;
    this.hdReady = false;
    this.modelStyle = 'classic';
    this.requestedStyle = 'classic';
    this.names = [];
    this.wrestlers = [];
    this.textures = [];
    this.ownedMaterials = [];

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0b1020');
    this.scene.fog = new THREE.Fog('#0b1020', 30, 70);
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.3, 200);
    this.crowd = null;

    this.buildArena(initialNames);
    this.resize(aspect);
  }

  texture(w, h, draw) {
    const t = canvasTexture(w, h, draw);
    this.textures.push(t);
    return t;
  }

  buildArena(initialNames = []) {
    const scene = this.scene;
    scene.add(new THREE.HemisphereLight('#c8d6ff', '#20140c', 0.95));
    const key = new THREE.DirectionalLight('#fff2dc', 1.6);
    key.position.set(8, 22, 10);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 5, far: 60 });
    key.shadow.bias = -0.0005;
    scene.add(key);

    for (const [x, z, c] of [[-12, -12, '#ff922b'], [12, 12, '#4dabf7'], [12, -12, '#ffd43b'], [-12, 12, '#f06595']]) {
      const spot = new THREE.SpotLight(c, 60, 45, 0.45, 0.6, 1.4);
      spot.position.set(x, 16, z);
      spot.target.position.set(0, MAT_Y, 0);
      scene.add(spot, spot.target);
    }

    const floor = plane(120, 120, mat('#1a1f2e', { roughness: 0.95 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

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
      ctx.font = `900 60px ${FONT_UI}`;
      ctx.fillText('KURUKSHETRA BATTLE ROYAL', w / 2, h / 2 + 3);
    });
    const topMat = new THREE.MeshStandardMaterial({ map: canvasTop, roughness: 0.9 });
    const apronMat = new THREE.MeshStandardMaterial({ map: apron, roughness: 0.8 });
    this.ownedMaterials.push(topMat, apronMat);
    const ring = box(2 * HALF + 1, MAT_Y, 2 * HALF + 1, [apronMat, apronMat, topMat, apronMat, apronMat, apronMat]);
    ring.position.y = MAT_Y / 2;
    ring.receiveShadow = true;
    scene.add(ring);

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
    this.crowd = new Crowd(scene, initialNames.length ? initialNames : ['Derby']);
  }

  /**
   * Updates the wrestlers standing in the ring. Reuses existing rigs when only the roster changes
   * (so toggling teammates in HD only builds or disposes the changed wrestler instead of cloning
   * every skinned model). When switching to HD for the first time, loads models in the background
   * and swaps them in live once ready.
   */
  setLineup(names, { modelStyle = 'classic' } = {}) {
    const nextStyle = modelStyle === 'hd' ? 'hd' : 'classic';
    const sameNames = names.length === this.names.length && names.every((n, i) => n === this.names[i]);
    if (sameNames && nextStyle === this.requestedStyle) return;

    this.names = [...names];
    this.requestedStyle = nextStyle;
    const gen = ++this.loadGen;

    if (nextStyle === 'hd') {
      if (this.hdReady) {
        this.syncWrestlers(true);
        return;
      }
      // First time HD is requested: show Classic immediately while GLB models load, then swap once.
      this.syncWrestlers(false);
      prepareWrestlerModels()
        .then(() => {
          this.hdReady = true;
          if (this.loadGen !== gen || this.disposed) return;
          this.syncWrestlers(true);
        })
        .catch(() => {
          /* Keep Classic on stage if HD assets are unavailable. */
        });
    } else {
      this.syncWrestlers(false);
    }
  }

  /**
   * Incrementally reconciles `this.wrestlers` against `this.names` and `useHd`.
   * Existing rigs are kept in place when `modelStyle` hasn't changed; only added/removed teammates
   * are created or disposed.
   */
  syncWrestlers(useHd) {
    const nextStyle = useHd ? 'hd' : 'classic';
    const styleChanged = nextStyle !== this.modelStyle;
    const hadAny = this.wrestlers.length > 0;
    const existing = new Map();

    if (styleChanged) {
      this.clearWrestlers();
    } else {
      const keep = new Set(this.names);
      for (const w of this.wrestlers) {
        if (keep.has(w.name) && !existing.has(w.name)) {
          existing.set(w.name, w);
        } else {
          this.scene.remove(w.rig.root, w.rig.tags);
          w.rig.dispose();
        }
      }
      this.wrestlers = [];
    }

    this.modelStyle = nextStyle;
    const n = this.names.length;
    if (!n) return;

    // Preserve character kinds already on stage so existing teammates never change identity.
    const used = new Set();
    for (const w of existing.values()) used.add(w.kindIdx);

    this.wrestlers = this.names.map((name, i) => {
      let entry = existing.get(name);
      if (!entry) {
        const h = hashName(name);
        let kindIdx = h % WRESTLER_KINDS.length;
        if (used.size < WRESTLER_KINDS.length) {
          while (used.has(kindIdx)) kindIdx = (kindIdx + 1) % WRESTLER_KINDS.length;
          used.add(kindIdx);
        }
        const kind = WRESTLER_KINDS[kindIdx];
        const color = `#${new THREE.Color().setHSL(((h % 360) / 360), 0.78, 0.56).getHexString()}`;
        const rig = buildWrestler(kind, color, name, { original: !useHd });
        rig.root.rotation.order = 'YXZ';
        this.scene.add(rig.root, rig.tags);
        entry = {
          name,
          kindIdx,
          rig,
          x: 0,
          z: 0,
          heading: 0,
          phase: (h % 628) / 100,
          pop: hadAny && !styleChanged ? 1 : 0,
        };
      }
      const outer = n <= 12 ? n : Math.ceil(n * 0.65);
      const inOuter = i < outer;
      const ringCount = inOuter ? outer : n - outer;
      const ringIdx = inOuter ? i : i - outer;
      const radius = n === 1 ? 0 : inOuter ? Math.min(4.2, 2.2 + ringCount * 0.22) : Math.min(2.1, 1.1 + ringCount * 0.14);
      const angle = (ringIdx / Math.max(1, ringCount)) * Math.PI * 2 + (inOuter ? 0 : Math.PI / Math.max(1, ringCount));
      entry.x = Math.cos(angle) * radius;
      entry.z = Math.sin(angle) * radius;
      entry.heading = Math.atan2(entry.x, entry.z);
      entry.rig.root.position.set(entry.x, MAT_Y, entry.z);
      entry.rig.root.rotation.y = entry.heading;
      entry.rig.tags.position.set(entry.x, MAT_Y, entry.z);
      return entry;
    });
  }

  clearWrestlers() {
    for (const w of this.wrestlers) {
      this.scene.remove(w.rig.root, w.rig.tags);
      w.rig.dispose();
    }
    this.wrestlers = [];
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 1 ? 66 : 48;
    this.camera.updateProjectionMatrix();
  }

  update(dt, reducedMotion = false) {
    if (!reducedMotion) {
      this.t += dt;
      this.orbit += dt * 0.14;
    }
    const radius = this.camera.aspect < 1 ? 18 : 15.5;
    const height = this.camera.aspect < 1 ? 9.5 : 7.8;
    this.camera.position.set(Math.sin(this.orbit) * radius, height, Math.cos(this.orbit) * radius);
    this.camera.lookAt(0, MAT_Y + 0.6, 0);

    for (const w of this.wrestlers) {
      if (w.pop > 0) w.pop = Math.max(0, w.pop - dt * 3.5);
      const hop = reducedMotion ? 0 : Math.sin(w.pop * Math.PI) * 0.9;
      const sway = reducedMotion ? 0 : Math.sin(this.t * 2.2 + w.phase);
      const flex = reducedMotion ? 0.3 : 0.25 + Math.max(0, Math.sin(this.t * 1.4 + w.phase * 1.7)) * 0.55;
      pose(w.rig, {
        guard: 0.4 + flex * 0.25,
        armsUp: flex * 0.35,
        wide: 0.08,
        lean: sway * 0.04,
        twist: sway * 0.12,
      });
      w.rig.root.position.set(w.x, MAT_Y + hop, w.z);
      w.rig.root.rotation.y = w.heading + sway * 0.14;
      w.rig.tags.position.set(w.x, MAT_Y + hop, w.z);
    }
    if (!reducedMotion) this.crowd?.update(dt, 0.25);
  }

  dispose() {
    this.disposed = true;
    this.loadGen++;
    this.clearWrestlers();
    this.crowd?.dispose();
    for (const m of this.ownedMaterials) m.dispose();
    for (const t of this.textures) t.dispose();
  }
}
