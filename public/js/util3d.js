// Small Three.js helpers shared by the track, racers and obstacles.
// Geometries and materials are cached and reused, so building 30 racers stays cheap
// and nothing here needs disposing between races.

import * as THREE from 'three';

const geometries = new Map();
const materials = new Map();

function geometry(key, make) {
  let g = geometries.get(key);
  if (!g) {
    g = make();
    geometries.set(key, g);
  }
  return g;
}

/** Cached MeshStandardMaterial. `opts` are extra material parameters. */
export function mat(color, opts = null) {
  const key = opts ? `${color}|${JSON.stringify(opts)}` : String(color);
  let m = materials.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.05, ...opts });
    materials.set(key, m);
  }
  return m;
}

function mesh(geo, material) {
  const ready = Array.isArray(material) || (material && material.isMaterial);
  const m = new THREE.Mesh(geo, ready ? material : mat(material));
  m.castShadow = true;
  return m;
}

export function box(w, h, d, material) {
  const m = mesh(geometry('box', () => new THREE.BoxGeometry(1, 1, 1)), material);
  m.scale.set(w, h, d);
  return m;
}

export function ball(radius, material, sx = 1, sy = 1, sz = 1) {
  const m = mesh(geometry('ball', () => new THREE.SphereGeometry(1, 20, 14)), material);
  m.scale.set(radius * sx, radius * sy, radius * sz);
  return m;
}

export function cyl(radiusTop, radiusBottom, height, material, segments = 16) {
  const key = `cyl|${radiusTop}|${radiusBottom}|${height}|${segments}`;
  return mesh(geometry(key, () => new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments)), material);
}

export function cone(radius, height, material, segments = 16) {
  return cyl(0, radius, height, material, segments);
}

export function torus(radius, tube, material, arc = Math.PI * 2) {
  const key = `torus|${radius}|${tube}|${arc}`;
  return mesh(geometry(key, () => new THREE.TorusGeometry(radius, tube, 10, 28, arc)), material);
}

/** Rounded bar lying along the X axis. */
export function capsule(radius, length, material) {
  const key = `capsule|${radius}|${length}`;
  const m = mesh(geometry(key, () => new THREE.CapsuleGeometry(radius, length, 4, 12)), material);
  m.rotation.z = Math.PI / 2;
  return m;
}

export function plane(w, h, material) {
  const m = mesh(geometry('plane', () => new THREE.PlaneGeometry(1, 1)), material);
  m.scale.set(w, h, 1);
  m.castShadow = false;
  return m;
}

export function disc(radius, material, segments = 32) {
  const m = mesh(geometry(`disc|${segments}`, () => new THREE.CircleGeometry(1, segments)), material);
  m.scale.set(radius, radius, 1);
  m.castShadow = false;
  return m;
}

/** Positions (and optionally rotates) a mesh, returning it for chaining. */
export function at(obj, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  obj.position.set(x, y, z);
  if (rx || ry || rz) obj.rotation.set(rx, ry, rz);
  return obj;
}

export function group(...children) {
  const g = new THREE.Group();
  for (const c of children) if (c) g.add(c);
  return g;
}

/** Draws on an off-screen canvas and wraps it as a texture. */
export function canvasTexture(width, height, draw, { repeat = false } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

const textureCache = new Map();
/** canvasTexture, but built once per `key`. */
export function cachedTexture(key, width, height, draw, options) {
  let t = textureCache.get(key);
  if (!t) {
    t = canvasTexture(width, height, draw, options);
    textureCache.set(key, t);
  }
  return t;
}

/** Cached material showing a canvas drawing (for screens, signs and decals). */
export function drawnMat(key, width, height, draw, opts = {}) {
  const cacheKey = `drawn|${key}`;
  let m = materials.get(cacheKey);
  if (!m) {
    const { repeat, basic, ...rest } = opts;
    const map = cachedTexture(key, width, height, draw, { repeat });
    m = basic
      ? new THREE.MeshBasicMaterial({ map, ...rest })
      : new THREE.MeshStandardMaterial({ map, roughness: 0.7, metalness: 0, ...rest });
    materials.set(cacheKey, m);
  }
  return m;
}

export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export const FONT_UI = '"Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';
export const FONT_MONO = 'Consolas, "Cascadia Code", "SF Mono", Menlo, monospace';
export const FONT_EMOJI = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';

/** Sprite showing a single emoji or short glyph (cached per glyph). */
export function emojiTexture(glyph) {
  return cachedTexture(`emoji|${glyph}`, 128, 128, (ctx) => {
    ctx.font = `92px ${FONT_EMOJI}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(glyph, 64, 70);
  });
}

export function makeSprite(texture, width, height, { depthTest = true } = {}) {
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(width, height, 1);
  return sprite;
}

/** Name tag texture: dark pill, coloured edge, white text sized to fit. */
export function nameTagTexture(text, color = '#ffffff', { mono = false, background = '#101420' } = {}) {
  return canvasTexture(512, 128, (ctx, w, h) => {
    const family = mono ? FONT_MONO : FONT_UI;
    let size = 64;
    ctx.font = `700 ${size}px ${family}`;
    while (ctx.measureText(text).width > w - 110 && size > 26) {
      size -= 2;
      ctx.font = `700 ${size}px ${family}`;
    }
    const textWidth = ctx.measureText(text).width;
    const pillWidth = Math.min(w - 8, textWidth + 96);
    const x = (w - pillWidth) / 2;
    roundRect(ctx, x, 14, pillWidth, h - 28, 50);
    ctx.fillStyle = background;
    ctx.fill();
    ctx.lineWidth = 7;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2 + 3);
  });
}

// Maryland flag colours.
export const MD = { gold: '#f2b817', black: '#16130f', red: '#c5122f', white: '#ffffff' };

/**
 * Draws a Maryland-flag-style quartered banner: black-and-gold Calvert quarters
 * with a counter-changed diagonal, red-and-white Crossland quarters with a
 * counter-changed cross.
 */
export function drawMarylandFlag(ctx, x, y, w, h) {
  const hw = w / 2;
  const hh = h / 2;

  const calvert = (qx, qy) => {
    const stripe = hw / 6;
    const stripes = (flip) => {
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = (i % 2 === 0) !== flip ? MD.gold : MD.black;
        ctx.fillRect(qx + i * stripe - 0.5, qy, stripe + 1, hh);
      }
    };
    ctx.save();
    ctx.beginPath();
    ctx.rect(qx, qy, hw, hh);
    ctx.clip();
    stripes(false);
    const b = hh * 0.3;
    ctx.beginPath();
    ctx.moveTo(qx, qy - b);
    ctx.lineTo(qx + hw, qy + hh - b);
    ctx.lineTo(qx + hw, qy + hh + b);
    ctx.lineTo(qx, qy + b);
    ctx.closePath();
    ctx.clip();
    stripes(true);
    ctx.restore();
  };

  const crossland = (qx, qy) => {
    const quarters = (flip) => {
      const a = flip ? MD.red : MD.white;
      const b = flip ? MD.white : MD.red;
      ctx.fillStyle = a;
      ctx.fillRect(qx, qy, hw / 2 + 0.5, hh / 2 + 0.5);
      ctx.fillRect(qx + hw / 2, qy + hh / 2, hw / 2, hh / 2);
      ctx.fillStyle = b;
      ctx.fillRect(qx + hw / 2, qy, hw / 2, hh / 2 + 0.5);
      ctx.fillRect(qx, qy + hh / 2, hw / 2 + 0.5, hh / 2);
    };
    ctx.save();
    ctx.beginPath();
    ctx.rect(qx, qy, hw, hh);
    ctx.clip();
    quarters(false);
    const cx = qx + hw / 2;
    const cy = qy + hh / 2;
    const arm = Math.min(hw, hh) * 0.11;
    const lx = hw * 0.36;
    const ly = hh * 0.36;
    const bud = arm * 0.95;
    ctx.beginPath();
    ctx.rect(cx - lx, cy - arm, lx * 2, arm * 2);
    ctx.rect(cx - arm, cy - ly, arm * 2, ly * 2);
    for (const [ex, ey, dx, dy] of [
      [cx - lx, cy, -1, 0],
      [cx + lx, cy, 1, 0],
      [cx, cy - ly, 0, -1],
      [cx, cy + ly, 0, 1],
    ]) {
      for (const [ox, oy] of [
        [dx * bud, dy * bud],
        [dy * bud * 1.25, dx * bud * 1.25],
        [-dy * bud * 1.25, -dx * bud * 1.25],
      ]) {
        ctx.moveTo(ex + ox + bud, ey + oy);
        ctx.arc(ex + ox, ey + oy, bud, 0, Math.PI * 2);
      }
    }
    ctx.clip();
    quarters(true);
    ctx.restore();
  };

  calvert(x, y);
  crossland(x + hw, y);
  crossland(x, y + hh);
  calvert(x + hw, y + hh);
}

export function flagMaterial() {
  return drawnMat('md-flag', 384, 256, (ctx, w, h) => drawMarylandFlag(ctx, 0, 0, w, h), { side: THREE.DoubleSide });
}
