// 3D models for the ten obstacles, the item crates and thrown items.
// Each builder returns { object, update(simObject, time) } and, where it
// created its own geometry, a dispose() to call when the race is cleared.

import * as THREE from 'three';
import { mat, box, ball, cone, torus, disc, plane, at, group, drawnMat, cachedTexture, makeSprite, nameTagTexture, emojiTexture, roundRect, FONT_MONO, FONT_UI } from './util3d.js';

const signTextures = new Map();
/** Floating label that always faces the camera. */
function sign(text, color, width = 3.4) {
  let texture = signTextures.get(text);
  if (!texture) {
    texture = nameTagTexture(text, color, { mono: true });
    signTextures.set(text, texture);
  }
  const sprite = makeSprite(texture, width, width / 4);
  sprite.renderOrder = 4;
  return sprite;
}

const flat = (mesh, y) => at(mesh, 0, y, 0, -Math.PI / 2);

function pit404(o) {
  const hole = drawnMat('pit-hole', 256, 256, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2);
    g.addColorStop(0, '#000000');
    g.addColorStop(0.72, '#0b0b14');
    g.addColorStop(0.9, '#3b1d5e');
    g.addColorStop(1, '#ff6b6b');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2, 0, 7);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.font = `800 60px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('404', w / 2, h / 2);
  }, { basic: true, transparent: true, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  const rim = at(torus(o.r, 0.12, mat('#ff6b6b', { emissive: '#ff6b6b', emissiveIntensity: 0.6 })), 0, 0.08, 0, Math.PI / 2);
  rim.castShadow = false;
  const label = sign('404', '#ff6b6b', 3.8);
  label.position.y = 2.6;
  const object = group(flat(disc(o.r, hole), 0.05), rim, label);
  return {
    object,
    update(_, t) {
      label.position.y = 2.6 + Math.sin(t * 2 + o.id) * 0.2;
    },
  };
}

function brokenLink(o) {
  const width = o.dMax - o.dMin;
  const blue = mat('#3b82f6', { metalness: 0.5, roughness: 0.3 });
  const visited = mat('#9b5de5', { metalness: 0.5, roughness: 0.3 });
  const object = new THREE.Group();
  const count = Math.max(4, Math.round(width / 0.85));
  const middle = Math.floor(count / 2);
  for (let i = 0; i < count; i++) {
    if (i === middle) continue;
    const broken = Math.abs(i - middle) === 1;
    const link = torus(0.4, 0.11, broken ? visited : blue);
    link.scale.x = 1.35;
    const x = -width / 2 + ((i + 0.5) * width) / count;
    at(link, x, 0.5, 0, i % 2 ? Math.PI / 2 : 0.25, 0, 0);
    if (broken) {
      link.rotation.z = (i < middle ? -1 : 1) * 0.7;
      link.position.y = 0.3;
    }
    object.add(link);
  }
  for (const x of [-width / 2, width / 2]) object.add(at(cone(0.3, 0.9, mat('#1e3a8a')), x, 0.45, 0));
  const label = sign('href="???"', '#74a7ff', 5);
  label.position.y = 2.3;
  object.add(label);
  return { object, update() {} };
}

function mergeConflict(o) {
  const width = o.dMax - o.dMin;
  const face = drawnMat('merge-conflict', 512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#1b3a2a';
    ctx.fillRect(0, 0, w, h * 0.42);
    ctx.fillStyle = '#30363d';
    ctx.fillRect(0, h * 0.42, w, h * 0.16);
    ctx.fillStyle = '#16304f';
    ctx.fillRect(0, h * 0.58, w, h * 0.42);
    ctx.font = `800 40px ${FONT_MONO}`;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#56d364';
    ctx.fillText('<<<<<<< HEAD', 16, h * 0.14);
    ctx.fillStyle = '#aff5b4';
    ctx.font = `600 32px ${FONT_MONO}`;
    ctx.fillText('  speed = fast;', 16, h * 0.31);
    ctx.font = `800 40px ${FONT_MONO}`;
    ctx.fillStyle = '#c9d1d9';
    ctx.fillText('=======', 16, h * 0.5);
    ctx.fillStyle = '#a5d6ff';
    ctx.font = `600 32px ${FONT_MONO}`;
    ctx.fillText('  speed = faster;', 16, h * 0.69);
    ctx.font = `800 40px ${FONT_MONO}`;
    ctx.fillStyle = '#58a6ff';
    ctx.fillText('>>>>>>> main', 16, h * 0.87);
  });
  const side = mat('#21262d');
  const wall = box(width, 2.7, 1.5, [side, side, mat('#2ea043'), side, face, face]);
  const object = group(at(wall, 0, 1.35, 0));
  return { object, update() {} };
}

function zoneRibbon(track, o, material) {
  const geometry = track.ribbon(o.sMin, o.sMax, o.dMin, o.dMax, 0.05, { vScale: 8 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  return mesh;
}

function infiniteScroll(o, track) {
  const feed = drawnMat('infinite-feed', 256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#dbe4f0';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 2; i++) {
      const y = i * 128 + 8;
      roundRect(ctx, 10, y, w - 20, 112, 12);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.fillStyle = i ? '#f783ac' : '#74c0fc';
      ctx.beginPath();
      ctx.arc(36, y + 26, 14, 0, 7);
      ctx.fill();
      ctx.fillStyle = '#adb5bd';
      ctx.fillRect(60, y + 14, 110, 9);
      ctx.fillStyle = '#dee2e6';
      ctx.fillRect(60, y + 30, 70, 7);
      ctx.fillStyle = i ? '#ffd8a8' : '#b2f2bb';
      ctx.fillRect(22, y + 50, w - 44, 50);
    }
  }, { repeat: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, roughness: 0.5 });
  const ribbon = zoneRibbon(track, o, feed);
  const object = group(ribbon);
  for (const d of [o.dMin + 1.2, o.dMax - 1.2]) {
    const label = sign('∞ scroll', '#74c0fc', 4.6);
    object.add(track.point(o.sMin + 1, d, 2.4, label.position) && label);
  }
  return {
    object,
    update(_, t) {
      feed.map.offset.y = (t * 1.1) % 1;
    },
    dispose: () => ribbon.geometry.dispose(),
  };
}

function slowLoad(o, track) {
  const goo = drawnMat('slow-load', 256, 256, (ctx, w, h) => {
    ctx.fillStyle = 'rgba(255, 212, 59, 0.82)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(134, 94, 0, 0.5)';
    ctx.lineWidth = 22;
    for (let x = -h; x < w + h; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, h);
      ctx.lineTo(x + h, 0);
      ctx.stroke();
    }
    ctx.fillStyle = '#3d2c00';
    ctx.font = `800 34px ${FONT_UI}`;
    ctx.textAlign = 'center';
    ctx.fillText('LOADING…', w / 2, h / 2 + 12);
  }, { repeat: true, transparent: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const ribbon = zoneRibbon(track, o, goo);
  const spinner = group(torus(1.3, 0.2, mat('#fcc419', { emissive: '#f59f00', emissiveIntensity: 0.7 }), Math.PI * 1.5));
  spinner.children[0].castShadow = false;
  track.place(spinner, o.s, o.d, 4.2);
  const label = sign('▓▓▓▓▓▓▓░ 99%', '#fcc419', 6);
  track.point(o.sMin + 1, o.d, 2.4, label.position);
  const object = group(ribbon, spinner, label);
  return {
    object,
    update(_, t) {
      // A spinner that stutters, like a page that is nearly-but-never loaded.
      spinner.children[0].rotation.z = -Math.floor(t * 5) * 0.6;
    },
    dispose: () => ribbon.geometry.dispose(),
  };
}

function redirectLoop(o) {
  const arrows = drawnMat('redirect-arrows', 256, 256, (ctx, w, h) => {
    ctx.translate(w / 2, h / 2);
    ctx.fillStyle = 'rgba(132, 94, 247, 0.28)';
    ctx.beginPath();
    ctx.arc(0, 0, 124, 0, 7);
    ctx.fill();
    ctx.lineCap = 'round';
    for (let i = 0; i < 2; i++) {
      ctx.rotate(Math.PI);
      ctx.strokeStyle = '#b197fc';
      ctx.lineWidth = 22;
      ctx.beginPath();
      ctx.arc(0, 0, 86, 0.25, Math.PI - 0.45);
      ctx.stroke();
      // Arrow head.
      const a = Math.PI - 0.38;
      ctx.save();
      ctx.translate(Math.cos(a) * 86, Math.sin(a) * 86);
      ctx.rotate(a + Math.PI / 2);
      ctx.fillStyle = '#b197fc';
      ctx.beginPath();
      ctx.moveTo(-34, -4);
      ctx.lineTo(26, 0);
      ctx.lineTo(-34, 4);
      ctx.lineTo(-20, 34);
      ctx.lineTo(34, 0);
      ctx.lineTo(-20, -34);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }, { basic: true, transparent: true, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  const spin = group(flat(disc(o.r, arrows), 0.06));
  const hoop = at(torus(o.r * 0.82, 0.1, mat('#845ef7', { emissive: '#7048e8', emissiveIntensity: 0.8 })), 0, 0.7, 0, Math.PI / 2);
  hoop.castShadow = false;
  const label = sign('301 ↻ 302', '#b197fc', 4.6);
  label.position.y = 2.7;
  const object = group(spin, hoop, label);
  return {
    object,
    update(_, t) {
      spin.rotation.y = -t * 3;
      hoop.position.y = 0.7 + Math.sin(t * 3 + o.id) * 0.25;
    },
  };
}

let cursorGeometry = null;
function nullPointer(o, track) {
  if (!cursorGeometry) {
    // The classic arrow cursor, tip at the origin.
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(0, -1.7);
    shape.lineTo(0.4, -1.32);
    shape.lineTo(0.72, -2.05);
    shape.lineTo(0.99, -1.93);
    shape.lineTo(0.67, -1.2);
    shape.lineTo(1.2, -1.2);
    shape.closePath();
    cursorGeometry = new THREE.ExtrudeGeometry(shape, { depth: 0.22, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2 });
    cursorGeometry.center();
  }
  const white = new THREE.Mesh(cursorGeometry, mat('#ffffff', { roughness: 0.3, emissive: '#ffffff', emissiveIntensity: 0.35 }));
  white.castShadow = true;
  const outline = new THREE.Mesh(cursorGeometry, mat('#111111'));
  outline.scale.set(1.16, 1.12, 0.6);
  outline.position.z = -0.14;
  const tilt = group(white, outline);
  tilt.rotation.z = Math.PI * 0.82; // tip pointing down at the track
  const cursor = group(tilt);
  cursor.scale.setScalar(1.35);
  const label = sign('null', '#ff8787', 3.2);
  label.position.y = 3.6;
  const shadow = flat(disc(1.2, mat('#000000', { transparent: true, opacity: 0.25, depthWrite: false })), 0.04);
  const object = group(cursor, label, shadow);
  return {
    object,
    update(sim, t) {
      track.place(object, sim.s, sim.d, 0);
      cursor.position.y = 1.7 + Math.abs(Math.sin(t * 4 + o.id)) * 0.5;
      cursor.rotation.y = Math.sin(t * 2) * 0.35;
    },
  };
}

function exception(o) {
  const red = mat('#e03131', { emissive: '#c92a2a', emissiveIntensity: 0.9, roughness: 0.4 });
  const spike = mat('#ffd43b', { emissive: '#f59f00', emissiveIntensity: 0.6 });
  const core = group(ball(0.72, red));
  const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1], [0.7, 0.7, 0], [-0.7, 0.7, 0], [0, 0.7, 0.7], [0, 0.7, -0.7]];
  for (const [x, y, z] of dirs) {
    const s = cone(0.2, 0.55, spike, 6);
    s.position.set(x * 0.85, y * 0.85, z * 0.85);
    s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(x, y, z).normalize());
    core.add(s);
  }
  const bang = makeSprite(emojiTexture('⚠️'), 1.3, 1.3);
  bang.position.y = 2.5;
  const object = group(core, bang);
  return {
    object,
    update(sim, t) {
      object.visible = sim.active;
      core.position.y = 1.05 + Math.sin(t * 3 + o.id) * 0.2;
      core.rotation.y = t * 1.5 + o.id;
      core.scale.setScalar(1 + Math.sin(t * 9 + o.id) * 0.07);
    },
  };
}

/** SSL Expired: a browser's "not private" warning page standing across the road. */
function sslExpired(o) {
  const width = o.dMax - o.dMin;
  const face = drawnMat('ssl-expired', 512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#b3261e';
    ctx.fillRect(0, 0, w, h);
    // Address bar with a struck-through https.
    ctx.fillStyle = '#f8d7da';
    roundRect(ctx, 14, 12, w - 28, 44, 22);
    ctx.fill();
    ctx.fillStyle = '#b3261e';
    ctx.font = `800 28px ${FONT_MONO}`;
    ctx.textBaseline = 'middle';
    ctx.fillText('⚠ Not secure   https://', 30, 35);
    ctx.fillRect(238, 34, 130, 4);
    // Warning body.
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 46px ${FONT_UI}`;
    ctx.fillText('SSL EXPIRED', 22, 104);
    ctx.font = `600 27px ${FONT_UI}`;
    ctx.fillText('Your connection is not private', 22, 152);
    ctx.fillStyle = '#ffd8d8';
    ctx.font = `600 22px ${FONT_MONO}`;
    ctx.fillText('NET::ERR_CERT_DATE_INVALID', 22, 192);
    roundRect(ctx, 22, 212, 190, 32, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.fillStyle = '#b3261e';
    ctx.font = `700 20px ${FONT_UI}`;
    ctx.fillText('Back to safety', 40, 229);
  });
  const side = mat('#7a1712');
  const wall = box(width, 3, 0.7, [side, side, side, side, face, face]);
  const label = sign('SSL expired', '#ff8787', 5);
  label.position.y = 4.1;
  const object = group(at(wall, 0, 1.5, 0), label);
  for (const x of [-width / 2, width / 2]) object.add(at(box(0.35, 3.4, 0.9, mat('#3a0d0a')), x, 1.7, 0));
  return {
    object,
    update(_, t) {
      label.position.y = 4.1 + Math.sin(t * 2 + o.id) * 0.15;
    },
  };
}

/** DO NOT MODIFY URLS: a striped road barricade with an error pit waiting just behind it. */
function urlBarricade(o) {
  const width = o.dMax - o.dMin;
  const stripes = drawnMat('barricade-stripes', 512, 64, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f76707';
    for (let x = -h; x < w + h; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, h);
      ctx.lineTo(x + 32, h);
      ctx.lineTo(x + 32 + h, 0);
      ctx.lineTo(x + h, 0);
      ctx.closePath();
      ctx.fill();
    }
  });
  const notice = drawnMat('barricade-notice', 512, 160, (ctx, w, h) => {
    ctx.fillStyle = '#fff3bf';
    ctx.fillRect(0, 0, w, h);
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#212529';
    ctx.strokeRect(6, 6, w - 12, h - 12);
    ctx.fillStyle = '#c92a2a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 50px ${FONT_UI}`;
    ctx.fillText('DO NOT MODIFY URLS', w / 2, 62);
    ctx.fillStyle = '#212529';
    ctx.font = `600 24px ${FONT_UI}`;
    ctx.fillText('— by order of Management —', w / 2, 118);
  });
  const dark = mat('#343a40');
  const plank = (y) => at(box(width, 0.55, 0.22, [dark, dark, dark, dark, stripes, stripes]), 0, y, 0);
  const object = group(plank(0.75), plank(1.6));
  for (const x of [-width / 2 + 0.4, 0, width / 2 - 0.4]) {
    object.add(at(box(0.25, 2.1, 0.25, dark), x, 1.05, 0));
    object.add(at(box(0.25, 0.2, 1.6, dark), x, 0.1, 0));
  }
  for (const x of [-width / 2 + 0.4, width / 2 - 0.4]) {
    const lamp = at(ball(0.22, mat('#ffa94d', { emissive: '#ff922b', emissiveIntensity: 1.6 })), x, 2.3, 0);
    lamp.castShadow = false;
    object.add(lamp);
  }
  const board = box(Math.min(width - 1, 7), 2.2, 0.2, [dark, dark, dark, dark, notice, notice]);
  object.add(at(board, 0, 3.2, 0));

  // The error pit the route now drops you into, just past the barricade (forward is -Z).
  const hole = drawnMat('error-pit', 256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = 'rgba(255, 107, 107, 0.55)';
    ctx.font = `800 40px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ERROR', w / 2, h / 2 + 2);
  }, { basic: true, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  const pit = plane(width, 3.2, hole);
  object.add(at(pit, 0, 0.05, -2.3, -Math.PI / 2));
  return { object, update() {} };
}

const BUILDERS = { pit404, brokenLink, mergeConflict, infiniteScroll, slowLoad, redirectLoop, nullPointer, exception, sslExpired, urlBarricade };

/** Builds the model for a simulation obstacle and places it on the track. */
export function buildObstacle(o, track) {
  const visual = BUILDERS[o.type](o, track);
  // Zones build their geometry directly in world space; everything else is placed.
  if (o.shape !== 'zone') track.place(visual.object, o.s, o.d, 0);
  return visual;
}

/** Item crate: a cardboard package that spins until someone grabs it. */
export function buildCrate(crate, track) {
  const side = drawnMat('crate', 128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#c99a5b';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#a67c3d';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, w - 6, h - 6);
    ctx.fillStyle = '#f4e3bf';
    ctx.fillRect(w / 2 - 12, 0, 24, h);
    ctx.fillStyle = '#5c3d11';
    ctx.font = `800 44px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('{?}', w / 2, h / 2 + 2);
  }, { emissive: '#5c3d11', emissiveIntensity: 0.25 });
  const cube = box(1.25, 1.25, 1.25, side);
  const object = group(cube);
  track.place(object, crate.s, crate.d, 1.35);
  const phase = crate.id * 0.7;
  return {
    object,
    update(sim, t) {
      object.visible = sim.active;
      cube.rotation.set(0.5, t * 1.8 + phase, 0.3);
      cube.position.y = Math.sin(t * 2.5 + phase) * 0.18;
    },
  };
}

/** A thrown item in flight (a bug, or a force-push). */
export function buildProjectile(kind) {
  if (kind === 'bug') return makeSprite(emojiTexture('🐛'), 1.9, 1.9);
  const texture = cachedTexture('force-push', 256, 96, (ctx, w, h) => {
    roundRect(ctx, 4, 8, w - 8, h - 16, 30);
    ctx.fillStyle = '#c92a2a';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#ffe066';
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = `800 40px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('push -f', w / 2, h / 2 + 2);
  });
  return makeSprite(texture, 3.4, 1.28);
}
