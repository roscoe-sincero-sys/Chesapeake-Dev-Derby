// Everything around the track: sky, the bay, islands, lighthouses, sailboats,
// channel buoys, clouds and roadside billboards.

import * as THREE from 'three';
import { mat, box, ball, cyl, cone, at, group, canvasTexture, FONT_MONO, FONT_UI, MD, roundRect } from './util3d.js';
import { mulberry32 } from './sim.js';

const HORIZON = '#cfe8f7';

const BILLBOARDS = [
  ['Welcome to', 'MERGE-LAND', '#c5122f'],
  ['EXIT 404', 'Not Found', '#1f6f43'],
  ['It works on', 'my machine™', '#3b3f8f'],
  ['crabs && code', '|| nothing', '#8c390c'],
  ['git commit -m', '"final_FINAL_v2"', '#24292f'],
  ['Have you tried', 'clearing the cache?', '#0b7285'],
  ['The Old Line State', 'localhost:4100', '#16130f'],
  ['z-index:', '999999 !important', '#862e9c'],
  ['Chesapeake Bay', 'now 100% responsive', '#1864ab'],
  ['Ship it', 'on Friday at 5', '#a61e4d'],
];

export function buildScenery(scene, track) {
  const rng = mulberry32(410);
  const rand = (lo, hi) => lo + rng() * (hi - lo);
  const animated = [];
  const root = new THREE.Group();
  scene.add(root);

  // --- sky and fog ---
  scene.background = canvasTexture(16, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#608caf');
    g.addColorStop(0.55, '#b6cfdd');
    g.addColorStop(1, HORIZON);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
  scene.fog = new THREE.Fog(HORIZON, 140, 620);

  // --- lights ---
  scene.add(new THREE.HemisphereLight('#e6f4ff', '#4a7a94', 1.25));
  const sun = new THREE.DirectionalLight('#fff1d6', 2.3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -70;
  sun.shadow.camera.right = 70;
  sun.shadow.camera.top = 70;
  sun.shadow.camera.bottom = -70;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 260;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);

  // --- the bay ---
  const waves = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#376c78';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      const x = rng() * w;
      const y = rng() * h;
      const len = 14 + rng() * 30;
      ctx.strokeStyle = rng() > 0.4 ? 'rgba(219,235,232,0.06)' : 'rgba(12,43,48,0.08)';
      ctx.lineWidth = 1.5 + rng() * 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + len / 2, y - 4, x + len, y);
      ctx.stroke();
    }
  }, { repeat: true });
  waves.repeat.set(220, 220);
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(4000, 4000),
    new THREE.MeshStandardMaterial({ map: waves, bumpMap: waves, bumpScale: 0.08, roughness: 0.48, metalness: 0.08 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0, -track.total / 2);
  water.receiveShadow = true;
  root.add(water);

  /** World-space spot beside the track, on the water, clear of the bridge. */
  const spot = (s, side, distance, clearance = 20) => {
    const p = track.point(s, side * distance);
    return track.isClearOf(p.x, p.z, clearance) ? p.setY(0) : null;
  };

  // --- islands (some with lighthouses) ---
  const occupied = [];
  let lighthouses = 0;
  for (let s = -20; s < track.length + 60; s += 85) {
    const side = rng() < 0.5 ? -1 : 1;
    const p = spot(s + rand(-15, 15), side, rand(42, 80), 34);
    if (!p) continue;
    const radius = rand(7, 11);
    const island = buildIsland(radius, rng);
    occupied.push({ point: p.clone(), radius: radius + 2 });
    island.position.copy(p);
    island.rotation.y = rand(0, 6);
    if (lighthouses < 4 && rng() < 0.6) {
      island.add(at(buildLighthouse(), 0, 1.45, 0));
      lighthouses++;
    }
    root.add(island);
  }

  // --- sailboats ---
  const sailColors = ['#e8e4d9', '#d8dedb', '#e8dfcf', '#e7e9e4', '#d3dce0', '#ece9df'];
  for (let i = 0; i < 16; i++) {
    const p = spot(rand(-30, track.length + 70), rng() < 0.5 ? -1 : 1, rand(26, 120), 22);
    if (!p) continue;
    if (occupied.some((other) => other.point.distanceTo(p) < other.radius + 6)) continue;
    occupied.push({ point: p.clone(), radius: 6 });
    const boat = buildSailboat(sailColors[i % sailColors.length]);
    boat.position.copy(p);
    boat.rotation.y = rand(0, Math.PI * 2);
    const phase = rand(0, 6);
    animated.push((t) => {
      boat.position.y = Math.sin(t * 1.3 + phase) * 0.18;
      boat.rotation.z = Math.sin(t * 0.9 + phase) * 0.06;
    });
    root.add(boat);
  }

  // --- channel buoys along the bridge ---
  for (let s = -30, i = 0; s < track.length + 70; s += 34, i++) {
    const side = i % 2 ? 1 : -1;
    const p = spot(s, side, track.edge + rand(6, 10), 0);
    if (!p) continue;
    const buoy = buildBuoy(side < 0);
    buoy.position.copy(p);
    const phase = rand(0, 6);
    animated.push((t) => {
      buoy.position.y = Math.sin(t * 1.8 + phase) * 0.15;
      buoy.rotation.z = Math.sin(t * 1.2 + phase) * 0.12;
    });
    root.add(buoy);
  }

  // --- clouds ---
  const cloudMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, emissive: '#b8c7d6', emissiveIntensity: 0.12, fog: false });
  for (let i = 0; i < 26; i++) {
    const cloud = new THREE.Group();
    const puffs = 3 + Math.floor(rng() * 4);
    for (let k = 0; k < puffs; k++) {
      const puff = ball(rand(7, 13), cloudMat, 1.5, 0.6, 1);
      puff.castShadow = false;
      puff.position.set(k * 9 - puffs * 4.5, rand(-1.5, 1.5), rand(-4, 4));
      cloud.add(puff);
    }
    cloud.position.set(rand(-380, 380), rand(75, 140), rand(120, -track.total - 250));
    const drift = rand(0.6, 1.6);
    const x0 = cloud.position.x;
    animated.push((t) => {
      cloud.position.x = x0 + ((t * drift) % 60);
    });
    root.add(cloud);
  }

  // --- roadside billboards ---
  BILLBOARDS.forEach(([line1, line2, color], i) => {
    const s = 55 + i * 97;
    if (s > track.length - 30) return;
    const side = i % 2 ? -1 : 1;
    const board = buildBillboard(line1, line2, color);
    track.place(board, s, side * (track.edge + 7.5), 0);
    // Keep the posts vertical even where the track is on a slope.
    const yaw = Math.atan2(-track.frame(s).tan.x, -track.frame(s).tan.z);
    board.rotation.set(0, yaw - side * 0.35, 0);
    const base = board.position.y;
    board.userData.postHeight = base + 2;
    board.children[0].scale.y = base + 2 + 6;
    board.children[0].position.y = (6 - (base + 2)) / 2;
    root.add(board);
  });

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  return {
    sun,
    update(t) {
      if (reducedMotion.matches) t = 0;
      waves.offset.set(t * 0.004, t * 0.007);
      for (const fn of animated) fn(t);
    },
  };
}

// Terrain follows irregular rings, with a low sandy shore and a raised grassy core.
function buildIsland(radius, rng) {
  const island = new THREE.Group();
  island.name = 'Coastal island';
  const segments = 40;
  const rings = 7;
  const positions = [], colors = [], indices = [];
  const phase = rng() * Math.PI * 2;
  for (let ring = 0; ring <= rings; ring++) {
    const q = ring / rings;
    for (let i = 0; i <= segments; i++) {
      const a = i / segments * Math.PI * 2;
      const coast = 1 + 0.10 * Math.sin(a * 3 + phase) + 0.06 * Math.cos(a * 5 - phase);
      const r = radius * q * coast;
      const y = -0.16 + 1.75 * Math.pow(Math.max(0, 1 - q * q), 1.7);
      positions.push(Math.cos(a) * r, y, Math.sin(a) * r * 0.85);
      const color = new THREE.Color(q > 0.72 ? '#b9ab88' : '#697951');
      color.multiplyScalar(0.98 + q * (0.04 * Math.sin(a * 3 + q * 7) + 0.04 * Math.cos(a * 5)));
      colors.push(color.r, color.g, color.b);
      if (ring < rings && i < segments) {
        const v = ring * (segments + 1) + i;
        indices.push(v, v + 1, v + segments + 1, v + 1, v + segments + 2, v + segments + 1);
      }
    }
  }
  const terrain = new THREE.BufferGeometry();
  terrain.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  terrain.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  terrain.setIndex(indices);
  terrain.computeVertexNormals();
  const land = new THREE.Mesh(terrain, mat('#ffffff', { vertexColors: true, roughness: 1, metalness: 0 }));
  land.receiveShadow = true;
  island.add(land);
  // Small shoreline stones and salt-marsh grass, kept below the lighthouse base.
  for (let i = 0; i < 12; i++) {
    const a = rng() * Math.PI * 2;
    const r = radius * (0.68 + rng() * 0.11);
    const x = Math.cos(a) * r, z = Math.sin(a) * r * 0.85;
    const stone = ball(0.22 + rng() * 0.28, mat(i % 2 ? '#77796e' : '#919087', { roughness: 1 }), 1.5, 0.65, 1);
    island.add(at(stone, x, 0.15, z));
    for (let k = 0; k < 3; k++) {
      const reed = cone(0.06, 0.6 + rng() * 0.5, mat('#707b45'), 4);
      island.add(at(reed, x + k * 0.14, 0.65, z + 0.35, 0, a, (rng() - 0.5) * 0.25));
    }
  }
  return island;
}

/** A thin round spar, rail, or cable between two model-space points. */
function spar(a, b, radius, material) {
  const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b);
  const beam = cyl(radius, radius, from.distanceTo(to), material, 6);
  beam.position.copy(from).add(to).multiplyScalar(0.5);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.sub(from).normalize());
  return beam;
}

function buildLighthouse() {
  const masonry = mat('#e3dfd2', { roughness: 0.92, metalness: 0 });
  const brick = mat('#914b3e', { roughness: 0.9, metalness: 0 });
  const iron = mat('#353d3e', { roughness: 0.6, metalness: 0.35 });
  const g = group(at(cyl(2.15, 2.4, 0.6, mat('#85827a')), 0, 0.3, 0));
  g.name = 'Lighthouse';
  // Bands share the same taper so they meet without projecting collars.
  for (let i = 0; i < 6; i++) {
    const bottom = 1.65 - i * 0.12, top = bottom - 0.12;
    g.add(at(cyl(top, bottom, 1.45, i === 1 || i === 4 ? brick : masonry, 32), 0, 0.6 + (i + 0.5) * 1.45, 0));
  }
  g.add(at(box(0.58, 1.25, 0.1, iron), 0, 1.23, 1.6));
  for (const y of [3.2, 6.2, 8.0]) g.add(at(box(0.32, 0.62, 0.10, mat('#30434a')), 0, y, 1.65 - (y - 0.6) * 0.12 / 1.45));
  g.add(at(cyl(1.62, 1.62, 0.22, iron, 32), 0, 9.4, 0));
  // Gallery rail and lantern mullions read as real structural details.
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2, b = (i + 1) / 12 * Math.PI * 2;
    g.add(spar([Math.cos(a) * 1.5, 9.5, Math.sin(a) * 1.5], [Math.cos(a) * 1.5, 10.2, Math.sin(a) * 1.5], 0.035, iron));
    g.add(spar([Math.cos(a) * 1.5, 10.2, Math.sin(a) * 1.5], [Math.cos(b) * 1.5, 10.2, Math.sin(b) * 1.5], 0.035, iron));
  }
  const glass = mat('#809a9d', { transparent: true, opacity: 0.4, roughness: 0.22, metalness: 0.1 });
  g.add(at(cyl(0.9, 0.9, 1.45, glass, 12), 0, 10.25, 0));
  g.add(at(cyl(0.3, 0.3, 0.8, mat('#e4c98b', { emissive: '#a77c35', emissiveIntensity: 0.35 })), 0, 10.25, 0));
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    g.add(at(cyl(0.035, 0.035, 1.5, iron, 6), Math.cos(a) * 0.92, 10.25, Math.sin(a) * 0.92));
  }
  g.add(at(cone(1.22, 0.85, iron, 24), 0, 11.4, 0), at(cyl(0.04, 0.04, 0.5, iron, 6), 0, 12.05, 0));
  return g;
}

let hullGeometry;
function buildSailboat(sailColor) {
  if (!hullGeometry) {
    // Waterline and gunwale rings: pointed bow, broad shoulders, narrow transom.
    const outline = [[0, -3.4], [0.58, -2.6], [0.9, -0.8], [0.8, 1.8], [0.55, 2.6], [-0.55, 2.6], [-0.8, 1.8], [-0.9, -0.8], [-0.58, -2.6]];
    const vertices = [], faces = [];
    for (const [height, scale] of [[-0.25, 0.55], [0.5, 1]]) for (const [x, z] of outline) vertices.push(x * scale, height, z);
    const n = outline.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      faces.push(i, j, n + i, j, n + j, n + i);
    }
    // Deck triangulates the convex sheer line.
    for (let i = 1; i < n - 1; i++) faces.push(n, n + i, n + i + 1);
    hullGeometry = new THREE.BufferGeometry();
    hullGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    for (let i = 0; i < faces.length; i += 3) [faces[i + 1], faces[i + 2]] = [faces[i + 2], faces[i + 1]];
    hullGeometry.setIndex(faces);
    hullGeometry.computeVertexNormals();
  }
  const metal = mat('#8e9695', { metalness: 0.5, roughness: 0.4 });
  const rigging = mat('#4d5757');
  const hull = new THREE.Group();
  hull.name = 'Sailboat';
  hull.add(new THREE.Mesh(hullGeometry, mat('#d9ded9', { roughness: 0.55, side: THREE.DoubleSide })));
  hull.add(at(box(0.9, 0.4, 1.65, mat('#eee9dc')), 0, 0.69, -0.2));
  hull.add(at(box(0.92, 0.16, 0.95, mat('#31474e')), 0, 0.75, 0.05));
  hull.add(at(box(0.75, 0.08, 0.9, mat('#695846')), 0, 0.54, 1.5));
  hull.add(spar([0, 0.5, -0.65], [0, 7.5, -0.65], 0.055, metal));
  hull.add(spar([0, 1.4, -0.65], [0.18, 1.4, 2.1], 0.04, metal));
  for (const point of [[0, 0.55, -3.1], [-0.8, 0.55, 0], [0.8, 0.55, 0], [0, 0.55, 2.5]]) hull.add(spar([0, 7.3, -0.65], point, 0.014, rigging));
  const sail = (head, tack, clew) => {
    const vertices = [], indices = [], steps = 12;
    for (let row = 0; row <= steps; row++) {
      for (let col = 0; col <= row; col++) {
        const u = row / steps, v = col / steps;
        const p = new THREE.Vector3(...head).multiplyScalar(1 - u)
          .addScaledVector(new THREE.Vector3(...tack), u - v)
          .addScaledVector(new THREE.Vector3(...clew), v);
        p.x += 0.32 * Math.sin(Math.PI * u) * Math.sin(Math.PI * (row ? col / row : 0));
        vertices.push(p.x, p.y, p.z);
        if (row < steps) {
          const a = row * (row + 1) / 2 + col, b = (row + 1) * (row + 2) / 2 + col;
          indices.push(a, b, b + 1);
          if (col < row) indices.push(a, b + 1, a + 1);
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return new THREE.Mesh(geometry, mat(sailColor, { side: THREE.DoubleSide, roughness: 0.95, metalness: 0 }));
  };
  hull.add(sail([0, 7.15, -0.65], [0, 1.5, -0.65], [0.18, 1.5, 2.05]));
  hull.add(sail([0, 6.5, -0.7], [0, 0.65, -3.0], [-0.15, 1.3, -0.85]));
  hull.scale.setScalar(1.25);
  return hull;
}

function buildBuoy(red) {
  const paint = mat(red ? '#9f3d32' : '#326148', { roughness: 0.72 });
  const iron = mat('#424c4b', { metalness: 0.25 });
  const buoy = group(
    at(cyl(0.62, 0.7, 0.35, iron, 16), 0, 0.05, 0),
    at(red ? cone(0.52, 1.55, paint, 16) : cyl(0.48, 0.48, 1.35, paint, 16), 0, 0.9, 0),
    at(cyl(0.14, 0.17, 0.25, iron, 8), 0, 1.8, 0),
    at(ball(0.10, mat('#e6d8ad')), 0, 2.0, 0),
  );
  buoy.name = red ? 'Red nun buoy' : 'Green can buoy';
  return buoy;
}

function buildBillboard(line1, line2, color) {
  const texture = canvasTexture(512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, w, h);
    roundRect(ctx, 10, 10, w - 20, h - 20, 18);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.fillStyle = MD.gold;
    ctx.fillRect(10, h - 44, w - 20, 10);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const fit = (text, y, size, family, weight) => {
      let px = size;
      ctx.font = `${weight} ${px}px ${family}`;
      while (ctx.measureText(text).width > w - 60 && px > 18) {
        px -= 2;
        ctx.font = `${weight} ${px}px ${family}`;
      }
      ctx.fillText(text, w / 2, y);
    };
    fit(line1, 78, 44, FONT_UI, 600);
    fit(line2, 150, 62, FONT_MONO, 800);
  });
  const face = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, fog: false });
  const frame = mat('#343a40');
  const post = cyl(0.3, 0.3, 1, mat('#868e96'), 8);
  const board = box(9, 4.5, 0.4, [frame, frame, frame, frame, face, frame]);
  return group(post, at(board, 0, 6, 0));
}
