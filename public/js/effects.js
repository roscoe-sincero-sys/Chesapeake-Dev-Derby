// Lightweight particle bursts (explosions, sparkles, confetti) drawn with one InstancedMesh.

import * as THREE from 'three';

const CAPACITY = 900;

export class Particles {
  constructor(scene) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    this.mesh = new THREE.InstancedMesh(geometry, material, CAPACITY);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    this.items = [];
    this.free = [];
    this.dummy = new THREE.Object3D();
    this.color = new THREE.Color();
    const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < CAPACITY; i++) {
      this.mesh.setMatrixAt(i, hidden);
      this.mesh.setColorAt(i, this.color);
      this.free.push(i);
    }
    this.hidden = hidden;
    scene.add(this.mesh);
  }

  /**
   * Spawns `count` particles at `origin`.
   * `flat` makes confetti-like flakes; `gravity` pulls them down.
   */
  burst(origin, { count = 20, colors = ['#ffffff'], speed = 8, up = 6, life = 1, size = 0.25, gravity = 18, flat = false, spread = 0.3 } = {}) {
    for (let i = 0; i < count && this.free.length; i++) {
      const index = this.free.pop();
      const angle = Math.random() * Math.PI * 2;
      const v = speed * (0.35 + Math.random() * 0.65);
      this.color.set(colors[Math.floor(Math.random() * colors.length)]);
      this.mesh.setColorAt(index, this.color);
      this.items.push({
        index,
        x: origin.x + (Math.random() - 0.5) * spread,
        y: origin.y + (Math.random() - 0.5) * spread,
        z: origin.z + (Math.random() - 0.5) * spread,
        vx: Math.cos(angle) * v,
        vy: up * (0.4 + Math.random() * 0.8),
        vz: Math.sin(angle) * v,
        age: 0,
        life: life * (0.6 + Math.random() * 0.6),
        size: size * (0.6 + Math.random() * 0.8),
        gravity,
        flat,
        rx: Math.random() * 6,
        ry: Math.random() * 6,
        spin: (Math.random() - 0.5) * 14,
      });
    }
    this.mesh.instanceColor.needsUpdate = true;
  }

  update(dt) {
    if (!this.items.length) return;
    const d = this.dummy;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i];
      p.age += dt;
      if (p.age >= p.life) {
        this.mesh.setMatrixAt(p.index, this.hidden);
        this.free.push(p.index);
        this.items[i] = this.items[this.items.length - 1];
        this.items.pop();
        continue;
      }
      p.vy -= p.gravity * dt;
      if (p.flat) {
        // Confetti flutters: air drag.
        p.vx *= 1 - 1.5 * dt;
        p.vz *= 1 - 1.5 * dt;
        if (p.vy < -3) p.vy = -3;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      const fade = Math.min(1, (p.life - p.age) * 3);
      d.position.set(p.x, p.y, p.z);
      d.rotation.set(p.rx + p.age * p.spin, p.ry + p.age * p.spin * 0.7, 0);
      d.scale.set(p.size * fade, (p.flat ? p.size * 0.12 : p.size) * fade, p.size * (p.flat ? 1.6 : 1) * fade);
      d.updateMatrix();
      this.mesh.setMatrixAt(p.index, d.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  clear() {
    for (const p of this.items) {
      this.mesh.setMatrixAt(p.index, this.hidden);
      this.free.push(p.index);
    }
    this.items.length = 0;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
