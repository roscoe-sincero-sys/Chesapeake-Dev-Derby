// Everything around the track: sky, the bay, islands, lighthouses, sailboats,
// channel buoys, clouds and roadside billboards.

import * as THREE from 'three';
import { mat, box, ball, cyl, cone, at, group, plane, canvasTexture, FONT_MONO, FONT_UI, MD, roundRect } from './util3d.js';
import { mulberry32 } from './sim.js';

const HORIZON = '#cfe8f7';

const BILLBOARDS = [
  ['Welcome to', 'MERGE-LAND', '#c5122f'],
  ['EXIT 404', 'Not Found', '#1f6f43'],
  ['It works on', 'my machine™', '#3b3f8f'],
  ['crabs && code', '|| nothing', '#e8590c'],
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
    g.addColorStop(0, '#3f97e0');
    g.addColorStop(0.55, '#9fd0f2');
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
    ctx.fillStyle = '#2f86b8';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const len = 14 + Math.random() * 30;
      ctx.strokeStyle = Math.random() > 0.4 ? 'rgba(255,255,255,0.16)' : 'rgba(10,50,90,0.22)';
      ctx.lineWidth = 1.5 + Math.random() * 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + len / 2, y - 4, x + len, y);
      ctx.stroke();
    }
  }, { repeat: true });
  waves.repeat.set(160, 160);
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(4000, 4000),
    new THREE.MeshStandardMaterial({ map: waves, roughness: 0.35, metalness: 0.15 }),
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
  let lighthouses = 0;
  for (let s = -20; s < track.length + 60; s += 85) {
    const side = rng() < 0.5 ? -1 : 1;
    const p = spot(s + rand(-15, 15), side, rand(42, 80), 34);
    if (!p) continue;
    const island = buildIsland(rand(7, 11), rng);
    island.position.copy(p);
    island.rotation.y = rand(0, 6);
    if (lighthouses < 4 && rng() < 0.6) {
      island.add(at(buildLighthouse(), 0, 1.2, 0));
      lighthouses++;
    }
    root.add(island);
  }

  // --- sailboats ---
  const sailColors = ['#ffffff', '#ffe8cc', '#ff922b', '#ffd43b', '#fa5252', '#ffffff'];
  for (let i = 0; i < 16; i++) {
    const p = spot(rand(-30, track.length + 70), rng() < 0.5 ? -1 : 1, rand(26, 120), 22);
    if (!p) continue;
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
  const cloudMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, emissive: '#b8c7d6', emissiveIntensity: 0.55, fog: false });
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

  return {
    sun,
    update(t) {
      waves.offset.set(t * 0.004, t * 0.007);
      for (const fn of animated) fn(t);
    },
  };
}

function buildIsland(radius, rng) {
  const island = new THREE.Group();
  const sand = ball(radius, mat('#e9d8a6', { roughness: 1 }), 1, 0.12, 1);
  sand.castShadow = false;
  sand.receiveShadow = true;
  const grass = ball(radius * 0.8, mat('#5c9e4a', { roughness: 1 }), 1, 0.2, 1);
  grass.castShadow = false;
  grass.receiveShadow = true;
  island.add(sand, at(grass, 0, 0.25, 0));
  // Black-eyed Susans, Maryland's state flower.
  const petal = mat('#f6c21c');
  const eye = mat('#3b2412');
  const stem = mat('#3f7d35');
  for (let i = 0; i < 9; i++) {
    const a = rng() * Math.PI * 2;
    const r = radius * (0.25 + rng() * 0.45);
    const h = 1 + rng() * 0.6;
    const flower = group(
      at(cyl(0.05, 0.05, h, stem, 6), 0, h / 2, 0),
      at(cyl(0.42, 0.42, 0.06, petal, 9), 0, h, 0),
      at(ball(0.16, eye), 0, h + 0.05, 0),
    );
    flower.position.set(Math.cos(a) * r, radius * 0.2 * 0.9, Math.sin(a) * r);
    flower.rotation.set((rng() - 0.5) * 0.4, 0, (rng() - 0.5) * 0.4);
    island.add(flower);
  }
  return island;
}

function buildLighthouse() {
  const white = mat('#f5f5f0');
  const red = mat('#c5122f');
  const g = group(
    at(cyl(2.2, 2.6, 1, mat('#8a8f98')), 0, 0.5, 0),
    at(cyl(1.25, 1.9, 9, white, 20), 0, 5.5, 0),
    at(cyl(1.62, 1.8, 1.5, red, 20), 0, 3.4, 0),
    at(cyl(1.38, 1.53, 1.5, red, 20), 0, 7.2, 0),
    at(cyl(1.7, 1.7, 0.25, mat('#30343c'), 20), 0, 10.1, 0),
    at(cyl(0.9, 0.9, 1.5, mat('#ffe066', { emissive: '#ffd43b', emissiveIntensity: 0.9 }), 12), 0, 11, 0),
    at(cone(1.25, 1.3, red, 12), 0, 12.4, 0),
  );
  g.scale.setScalar(1.3);
  return g;
}

let sailGeometry = null;
function buildSailboat(sailColor) {
  if (!sailGeometry) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(2.6, 0);
    shape.lineTo(0, 5.2);
    shape.closePath();
    sailGeometry = new THREE.ShapeGeometry(shape);
  }
  const hullMat = mat('#f8f9fa');
  const hull = group(
    at(box(1.5, 0.8, 4, hullMat), 0, 0.3, 0),
    at(cone(0.75, 1.4, hullMat, 4), 0, 0.3, -2.7, -Math.PI / 2, 0, Math.PI / 4),
    at(box(1.55, 0.14, 4.05, mat('#1c7ed6')), 0, 0.02, 0),
    at(cyl(0.07, 0.07, 6.4, mat('#868e96'), 6), 0, 3.6, -0.4),
  );
  const sailMat = mat(sailColor, { side: THREE.DoubleSide, roughness: 0.9 });
  const main = new THREE.Mesh(sailGeometry, sailMat);
  main.rotation.y = -Math.PI / 2;
  main.position.set(0, 1, -0.3);
  const jib = new THREE.Mesh(sailGeometry, sailMat);
  jib.rotation.y = Math.PI / 2;
  jib.scale.set(0.6, 0.75, 1);
  jib.position.set(0, 1, -0.55);
  hull.add(main, jib);
  hull.scale.setScalar(1.25);
  return hull;
}

function buildBuoy(red) {
  const color = red ? '#e03131' : '#2f9e44';
  return group(
    at(cyl(0.7, 0.8, 0.5, mat('#343a40'), 12), 0, 0.1, 0),
    at(red ? cone(0.55, 1.7, mat(color), 12) : cyl(0.45, 0.45, 1.5, mat(color), 12), 0, 1.15, 0),
    at(ball(0.14, mat('#fff3bf', { emissive: '#ffe066', emissiveIntensity: 1 })), 0, 2.1, 0),
  );
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
  const face = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.7 });
  const frame = mat('#343a40');
  const post = cyl(0.3, 0.3, 1, mat('#868e96'), 8);
  const board = box(9, 4.5, 0.4, [frame, frame, frame, frame, face, frame]);
  return group(post, at(board, 0, 6, 0));
}
