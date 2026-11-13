// The 3D race track: a winding bridge over the bay.
// Converts the simulation's track coordinates (s along, d sideways) into world space.

import * as THREE from 'three';
import { mat, box, cyl, at, plane, canvasTexture, flagMaterial, drawMarylandFlag, MD, FONT_MONO } from './util3d.js';

const UP = new THREE.Vector3(0, 1, 0);

export class Track {
  constructor({ length, halfWidth }) {
    this.length = length;
    this.halfWidth = halfWidth;
    this.pre = 45; // track before the start line (starting grid)
    this.post = 85; // run-off after the finish line
    this.edge = halfWidth + 1.6; // half-width including the kerbs
    this.total = this.pre + length + this.post;

    // Centre line: S-bends with gentle hills, heading towards -Z.
    const points = [];
    for (let z = 70; z >= -this.total - 40; z -= 40) {
      const x = 55 * Math.sin(z / 95) + 25 * Math.sin(z / 43 + 1.3);
      const y = 9 + 3 * Math.sin(z / 70) + 2 * Math.sin(z / 31);
      points.push(new THREE.Vector3(x, y, z));
    }
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
    curve.arcLengthDivisions = 4000;
    const curveLength = curve.getLength();

    // Sample the curve once per unit of distance; frame() interpolates between samples.
    this.samples = Math.ceil(this.total) + 1;
    this.positions = [];
    this.tangents = [];
    this.minX = Infinity;
    this.maxX = -Infinity;
    for (let i = 0; i < this.samples; i++) {
      const u = Math.min(1, i / curveLength);
      const p = curve.getPointAt(u);
      this.positions.push(p);
      this.tangents.push(curve.getTangentAt(u));
      this.minX = Math.min(this.minX, p.x);
      this.maxX = Math.max(this.maxX, p.x);
    }

    this._frame = { pos: new THREE.Vector3(), tan: new THREE.Vector3(), right: new THREE.Vector3(), up: new THREE.Vector3() };
    this._matrix = new THREE.Matrix4();
    this._back = new THREE.Vector3();
  }

  /** Position and orientation of the centre line at distance `s`. */
  frame(s, out = this._frame) {
    const a = Math.min(Math.max(s + this.pre, 0), this.samples - 1.001);
    const i = Math.floor(a);
    const t = a - i;
    out.pos.lerpVectors(this.positions[i], this.positions[i + 1], t);
    out.tan.lerpVectors(this.tangents[i], this.tangents[i + 1], t).normalize();
    out.right.crossVectors(out.tan, UP).normalize();
    out.up.crossVectors(out.right, out.tan);
    return out;
  }

  /** World position of track point (s, d), lifted `y` above the surface. */
  point(s, d = 0, y = 0, target = new THREE.Vector3()) {
    const f = this.frame(s);
    return target.copy(f.pos).addScaledVector(f.right, d).addScaledVector(f.up, y);
  }

  /**
   * Puts an object on the track facing down the course.
   * Object space: +X = right, +Y = up, -Z = forward (so +Z faces the chasing camera).
   */
  place(obj, s, d = 0, y = 0) {
    const f = this.frame(s);
    obj.position.copy(f.pos).addScaledVector(f.right, d).addScaledVector(f.up, y);
    this._matrix.makeBasis(f.right, f.up, this._back.copy(f.tan).negate());
    obj.quaternion.setFromRotationMatrix(this._matrix);
    return obj;
  }

  /** Flat strip of track surface between two distances and two sideways offsets. */
  ribbon(s0, s1, d0, d1, y = 0, { segment = 1, vScale = 1 } = {}) {
    const n = Math.max(1, Math.ceil((s1 - s0) / segment));
    const positions = new Float32Array((n + 1) * 6);
    const uvs = new Float32Array((n + 1) * 4);
    const indices = [];
    const p = new THREE.Vector3();
    for (let i = 0; i <= n; i++) {
      const s = s0 + ((s1 - s0) * i) / n;
      this.point(s, d0, y, p).toArray(positions, i * 6);
      this.point(s, d1, y, p).toArray(positions, i * 6 + 3);
      const v = (s - s0) / vScale;
      uvs.set([0, v, 1, v], i * 4);
      if (i < n) {
        const a = i * 2;
        indices.push(a, a + 1, a + 3, a, a + 3, a + 2);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  /** Vertical strip along the side of the track (the edge of the bridge deck). */
  wall(s0, s1, d, y0, y1) {
    const n = Math.ceil(s1 - s0);
    const positions = new Float32Array((n + 1) * 6);
    const indices = [];
    const p = new THREE.Vector3();
    for (let i = 0; i <= n; i++) {
      const s = s0 + ((s1 - s0) * i) / n;
      this.point(s, d, y0, p).toArray(positions, i * 6);
      this.point(s, d, y1, p).toArray(positions, i * 6 + 3);
      if (i < n) {
        const a = i * 2;
        indices.push(a, a + 1, a + 3, a, a + 3, a + 2);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  /** True if world point (x, z) is at least `clearance` away from the track. */
  isClearOf(x, z, clearance) {
    const c2 = clearance * clearance;
    for (let i = 0; i < this.samples; i += 6) {
      const p = this.positions[i];
      const dx = p.x - x;
      const dz = p.z - z;
      if (dx * dx + dz * dz < c2) return false;
    }
    return true;
  }

  /** Builds the road, kerbs, bridge supports, start/finish lines and arches. */
  build() {
    const root = new THREE.Group();
    const s0 = -this.pre;
    const s1 = this.length + this.post;

    // Road surface (kerbs are painted into the texture).
    const roadTexture = canvasTexture(1024, 512, (ctx, w, h) => this.paintRoad(ctx, w, h), { repeat: true });
    roadTexture.anisotropy = 8;
    const road = new THREE.Mesh(
      this.ribbon(s0, s1, -this.edge, this.edge, 0, { vScale: 16 }),
      new THREE.MeshStandardMaterial({ map: roadTexture, roughness: 0.85, metalness: 0 }),
    );
    road.receiveShadow = true;
    root.add(road);

    // Deck edges.
    const sideMat = new THREE.MeshStandardMaterial({ color: '#39405a', roughness: 0.8, side: THREE.DoubleSide });
    for (const side of [-1, 1]) {
      root.add(new THREE.Mesh(this.wall(s0, s1, side * this.edge, -1.1, 0), sideMat));
    }
    const under = new THREE.Mesh(this.ribbon(s0, s1, -this.edge, this.edge, -1.1), sideMat);
    root.add(under);
    for (const s of [s0, s1]) {
      const cap = box(this.edge * 2, 1.1, 0.2, sideMat);
      cap.castShadow = false;
      root.add(this.place(cap, s, 0, -0.55));
    }

    // Bridge piers down into the water.
    const pierMat = mat('#c9cfd8', { roughness: 0.9 });
    const pierGeo = new THREE.CylinderGeometry(0.9, 1.1, 1, 12);
    for (let s = s0 + 12; s < s1; s += 55) {
      const beam = box(this.edge * 2 - 4, 0.9, 2, pierMat);
      beam.castShadow = false;
      root.add(this.place(beam, s, 0, -1.5));
      for (const side of [-1, 1]) {
        const top = this.point(s, side * 7.5, -1.5);
        const pier = new THREE.Mesh(pierGeo, pierMat);
        pier.scale.y = top.y + 3;
        pier.position.set(top.x, (top.y - 3) / 2, top.z);
        root.add(pier);
      }
    }

    // Start and finish lines.
    const checker = canvasTexture(64, 64, (ctx) => {
      ctx.fillStyle = '#f8f8f8';
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = '#15171c';
      ctx.fillRect(0, 0, 32, 32);
      ctx.fillRect(32, 32, 32, 32);
    }, { repeat: true });
    checker.repeat.set(this.halfWidth, 1);
    const lineMat = new THREE.MeshStandardMaterial({ map: checker, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    for (const [s, len] of [[0, 1], [this.length, 2]]) {
      const line = new THREE.Mesh(this.ribbon(s - len, s + len, -this.halfWidth, this.halfWidth, 0.03, { vScale: 2 }), lineMat);
      line.receiveShadow = true;
      root.add(line);
    }

    root.add(this.place(this.arch('<race>', '#1f9d55'), 0));
    root.add(this.place(this.arch('</race>', '#e8590c'), this.length));
    return root;
  }

  paintRoad(ctx, w, h) {
    const kerb = (1.6 / (this.edge * 2)) * w;
    ctx.fillStyle = '#2b3142';
    ctx.fillRect(0, 0, w, h);
    // Asphalt speckle.
    for (let i = 0; i < 2600; i++) {
      const shade = Math.random();
      ctx.fillStyle = shade > 0.5 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.10)';
      ctx.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 3, 2 + Math.random() * 3);
    }
    // Faint code "tyre marks".
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.font = `700 54px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText('</>', w * 0.27, h * 0.32);
    ctx.fillText('{ }', w * 0.73, h * 0.82);
    // Lane guides and centre dashes.
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    for (const f of [1 / 3, 2 / 3]) ctx.fillRect(kerb + (w - 2 * kerb) * f - 2, 0, 4, h);
    ctx.fillStyle = MD.gold;
    ctx.fillRect(w / 2 - 5, 0, 10, h * 0.28);
    ctx.fillRect(w / 2 - 5, h * 0.5, 10, h * 0.28);
    // Kerbs in Maryland colours: red/white on the left, black/gold on the right.
    const blocks = 4;
    for (let i = 0; i < blocks; i++) {
      const y = (i * h) / blocks;
      ctx.fillStyle = i % 2 ? MD.white : MD.red;
      ctx.fillRect(0, y, kerb, h / blocks);
      ctx.fillStyle = i % 2 ? MD.gold : MD.black;
      ctx.fillRect(w - kerb, y, kerb, h / blocks);
    }
    ctx.fillStyle = '#f1f3f7';
    ctx.fillRect(kerb, 0, 5, h);
    ctx.fillRect(w - kerb - 5, 0, 5, h);
  }

  /** Gantry over the track with an HTML-tag banner and Maryland flags. */
  arch(label, color) {
    const g = new THREE.Group();
    const half = this.edge + 1.4;
    const postMat = mat('#eef1f6', { roughness: 0.5 });
    const banner = canvasTexture(1024, 160, (ctx, w, h) => {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, w, h);
      // Chequered trim.
      for (let x = 0; x < w; x += 16) {
        ctx.fillStyle = (x / 16) % 2 ? '#111' : '#fff';
        ctx.fillRect(x, 0, 16, 12);
        ctx.fillRect(x + 16, h - 12, 16, 12);
        ctx.fillStyle = (x / 16) % 2 ? '#fff' : '#111';
        ctx.fillRect(x, h - 12, 16, 12);
      }
      drawMarylandFlag(ctx, 40, 32, 150, 96);
      drawMarylandFlag(ctx, w - 190, 32, 150, 96);
      ctx.fillStyle = '#fff';
      ctx.font = `800 96px ${FONT_MONO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 8;
      ctx.fillText(label, w / 2, h / 2 + 6);
    });
    const face = new THREE.MeshStandardMaterial({ map: banner, roughness: 0.6 });
    const side = mat('#252a38');
    const beam = box(half * 2 + 1.2, 3, 0.8, [side, side, side, side, face, face]);
    g.add(at(beam, 0, 10.5, 0));
    for (const x of [-half, half]) {
      g.add(at(cyl(0.45, 0.6, 12, postMat), x, 6, 0));
      g.add(at(cyl(0.07, 0.07, 3.6, postMat, 8), x, 13.8, 0));
      const flag = plane(3, 2, flagMaterial());
      flag.userData.flag = true;
      g.add(at(flag, x + 1.55, 14.5, 0));
    }
    return g;
  }
}
