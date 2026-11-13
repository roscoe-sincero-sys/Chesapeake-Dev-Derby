// The racers: fourteen characters (web-dev things and Maryland wildlife), each riding a kart.
// Models are built from simple shapes. They face -Z (forward); the chase camera sees +Z.

import * as THREE from 'three';
import { mat, box, ball, cyl, cone, torus, capsule, at, group, drawnMat, roundRect, makeSprite, nameTagTexture, emojiTexture, FONT_MONO, FONT_UI } from './util3d.js';

const DARK = '#232733';

/** Models are built at roughly 1.5 units wide, then scaled up to be easy to see. */
export const RACER_SCALE = 1.45;
/** Height of the name tag above the track. */
export const LABEL_Y = 4.5;

/** A pair of googly eyes looking forward (-Z). */
function eyes(y, z, gap = 0.2, size = 0.11) {
  const white = mat('#ffffff', { roughness: 0.3 });
  const pupil = mat('#111111', { roughness: 0.3 });
  const g = new THREE.Group();
  for (const side of [-1, 1]) {
    g.add(at(ball(size, white), side * gap, y, z));
    g.add(at(ball(size * 0.5, pupil), side * gap, y, z - size * 0.75));
  }
  return g;
}

/** A flat panel with the same drawing on its front and back. */
function panel(w, h, depth, key, draw, edge = DARK, px = 256) {
  const face = drawnMat(key, px, Math.round((px * h) / w), draw);
  const side = mat(edge);
  return box(w, h, depth, [side, side, side, side, face, face]);
}

// ---------------------------------------------------------------- characters

function browserTab() {
  const body = panel(1.5, 1.05, 0.22, 'browser-tab', (ctx, w, h) => {
    ctx.fillStyle = '#d5dae3';
    ctx.fillRect(0, 0, w, h);
    // Tabs.
    roundRect(ctx, 8, 8, 104, 40, 10);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.fillStyle = '#ff922b';
    ctx.beginPath();
    ctx.arc(26, 26, 8, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#868e96';
    ctx.fillRect(42, 22, 44, 8);
    roundRect(ctx, 118, 12, 80, 30, 8);
    ctx.fillStyle = '#bcc3cf';
    ctx.fill();
    ctx.fillStyle = '#495057';
    ctx.font = `700 26px ${FONT_UI}`;
    ctx.fillText('+', 208, 36);
    // Toolbar with address bar.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 44, w, 40);
    roundRect(ctx, 44, 50, w - 56, 28, 14);
    ctx.fillStyle = '#eef1f5';
    ctx.fill();
    ctx.fillStyle = '#495057';
    ctx.font = `600 16px ${FONT_MONO}`;
    ctx.fillText('localhost:4100', 58, 70);
    ctx.fillStyle = '#adb5bd';
    ctx.beginPath();
    ctx.arc(22, 64, 9, 0, 7);
    ctx.fill();
    // Page.
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 84, w, h - 84);
    ctx.fillStyle = '#1c7ed6';
    ctx.fillRect(16, 98, 130, 18);
    ctx.fillStyle = '#ced4da';
    ctx.fillRect(16, 126, 220, 9);
    ctx.fillRect(16, 142, 180, 9);
    roundRect(ctx, 16, 158, 70, 16, 8);
    ctx.fillStyle = '#ff922b';
    ctx.fill();
  });
  const tab = box(0.55, 0.16, 0.22, mat('#ffffff'));
  const g = group(at(body, 0, 0.6, 0), at(tab, -0.42, 1.2, 0), eyes(0.42, -0.14, 0.24, 0.12));
  return { object: g, tick: (t) => (g.rotation.z = Math.sin(t * 3) * 0.04) };
}

function devTools() {
  const body = panel(1.5, 1.05, 0.2, 'devtools', (ctx, w, h) => {
    ctx.fillStyle = '#1f2330';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2d3345';
    ctx.fillRect(0, 0, w, 30);
    ctx.font = `600 15px ${FONT_UI}`;
    ctx.fillStyle = '#8ab4f8';
    ctx.fillText('Elements', 10, 21);
    ctx.fillRect(8, 27, 66, 3);
    ctx.fillStyle = '#9aa3b5';
    ctx.fillText('Console', 88, 21);
    ctx.fillText('Network', 156, 21);
    ctx.font = `600 15px ${FONT_MONO}`;
    const lines = [
      ['#e599f7', '<main', '#ffa94d', ' class', '#69db7c', '="app">'],
      ['#e599f7', '  <nav', '#ffa94d', ' id', '#69db7c', '="top">'],
      ['#e599f7', '  <h1>', '#dee2e6', 'Derby', '#e599f7', '</h1>'],
      ['#e599f7', '</main>', '', '', '', ''],
    ];
    lines.forEach((parts, row) => {
      let x = 10;
      for (let i = 0; i < parts.length; i += 2) {
        ctx.fillStyle = parts[i] || '#fff';
        ctx.fillText(parts[i + 1], x, 54 + row * 21);
        x += ctx.measureText(parts[i + 1]).width;
      }
    });
    ctx.fillStyle = '#4a1f24';
    ctx.fillRect(0, 132, w, 26);
    ctx.fillStyle = '#ff8787';
    ctx.fillText('✖ Uncaught TypeError', 8, 150);
    ctx.fillStyle = '#8ab4f8';
    ctx.fillText('> _', 8, 172);
  });
  const g = group(at(body, 0, 0.6, 0), at(box(1.56, 0.1, 0.5, mat('#3b4257')), 0, 0.05, 0), eyes(0.9, -0.13, 0.22, 0.11));
  g.children[0].rotation.x = 0.12;
  return { object: g, tick: (t) => (g.rotation.y = Math.sin(t * 2.2) * 0.08) };
}

function cssScroll() {
  const paper = panel(1.1, 1.25, 0.05, 'css-scroll', (ctx, w, h) => {
    ctx.fillStyle = '#fdf3d7';
    ctx.fillRect(0, 0, w, h);
    ctx.font = `700 24px ${FONT_MONO}`;
    const rows = [
      ['#c2255c', '.racer {'],
      ['#1971c2', ' speed: fast;'],
      ['#1971c2', ' position:'],
      ['#2b8a3e', '   first'],
      ['#e8590c', '  !important;'],
      ['#1971c2', ' z-index: 1;'],
      ['#c2255c', '}'],
    ];
    rows.forEach(([color, text], i) => {
      ctx.fillStyle = color;
      ctx.fillText(text, 14, 44 + i * 36);
    });
  }, '#e9d8a6');
  const wood = mat('#b08968');
  const gold = mat('#f2b817', { metalness: 0.5, roughness: 0.3 });
  const roll = (y) => {
    const r = group(at(cyl(0.13, 0.13, 1.3, wood), 0, 0, 0, 0, 0, Math.PI / 2));
    for (const x of [-0.72, 0.72]) r.add(at(ball(0.13, gold), x, 0, 0));
    r.position.y = y;
    return r;
  };
  const g = group(at(paper, 0, 0.75, 0), roll(1.42), roll(0.1), eyes(1.12, -0.06, 0.2, 0.1));
  return { object: g, tick: (t) => (g.rotation.x = Math.sin(t * 2.6) * 0.07) };
}

function hamburgerMenu() {
  const plate = box(1.5, 1.4, 0.14, mat('#343a52', { roughness: 0.4 }));
  const bun = mat('#e0a458');
  const patty = mat('#6f4023');
  const seed = mat('#fff3bf');
  const g = group(at(plate, 0, 0.75, 0));
  const bars = [];
  [[1.15, bun], [0.75, patty], [0.35, bun]].forEach(([y, material]) => {
    const bar = at(capsule(0.14, 0.86, material), 0, y, 0);
    bar.scale.z = 2.2;
    bars.push(bar);
    g.add(bar);
  });
  g.add(at(box(1.05, 0.05, 0.5, mat('#69db7c')), 0, 0.93, 0));
  for (let i = 0; i < 7; i++) g.add(at(ball(0.035, seed), -0.36 + i * 0.12, 1.29, (i % 2 ? 0.1 : -0.1)));
  g.add(eyes(0.75, -0.3, 0.2, 0.09));
  return {
    object: g,
    tick: (t) => {
      bars[0].position.y = 1.15 + Math.abs(Math.sin(t * 4)) * 0.07;
      bars[2].position.y = 0.35 - Math.abs(Math.sin(t * 4)) * 0.03;
    },
  };
}

function responsiveLayout() {
  const screen = (ctx, w, h) => {
    ctx.fillStyle = '#f1f3f5';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#4263eb';
    ctx.fillRect(0, 0, w, h * 0.16);
    ctx.fillStyle = '#ffa94d';
    ctx.fillRect(w * 0.06, h * 0.24, w * 0.88, h * 0.26);
    ctx.fillStyle = '#74c0fc';
    for (let i = 0; i < 3; i++) ctx.fillRect(w * (0.06 + i * 0.31), h * 0.58, w * 0.26, h * 0.32);
  };
  const device = (w, h, key) => panel(w, h, 0.07, `resp-${key}`, screen, '#212529', 128);
  const monitor = group(at(device(0.95, 0.62, 'desktop'), 0, 0.78, 0), at(cyl(0.05, 0.05, 0.4, mat('#868e96'), 8), 0, 0.3, 0), at(box(0.45, 0.06, 0.3, mat('#868e96')), 0, 0.1, 0));
  monitor.position.x = -0.3;
  const tablet = at(device(0.4, 0.56, 'tablet'), 0.42, 0.4, -0.12, -0.15);
  const phone = at(device(0.22, 0.42, 'phone'), 0.68, 0.3, -0.26, -0.15);
  const g = group(monitor, tablet, phone, eyes(0.82, -0.08, 0.16, 0.09));
  g.children[3].position.x = -0.3;
  return { object: g, tick: (t) => g.scale.set(1 + Math.sin(t * 3) * 0.08, 1 - Math.sin(t * 3) * 0.04, 1) };
}

function hostingServer() {
  const g = group(at(box(0.95, 1.45, 0.95, mat('#2f3542', { roughness: 0.4, metalness: 0.3 })), 0, 0.78, 0));
  const bay = mat('#4a5266', { metalness: 0.3 });
  const on = [mat('#40c057', { emissive: '#40c057', emissiveIntensity: 1.6 }), mat('#fcc419', { emissive: '#fcc419', emissiveIntensity: 1.6 })];
  const off = mat('#1b2a1f');
  const leds = [];
  for (let row = 0; row < 4; row++) {
    const y = 0.28 + row * 0.32;
    for (const z of [-0.48, 0.48]) {
      g.add(at(box(0.8, 0.22, 0.03, bay), 0, y, z));
      for (let k = 0; k < 2; k++) {
        const led = at(ball(0.04, on[k]), 0.28 - k * 0.12, y, z + Math.sign(z) * 0.02);
        led.castShadow = false;
        leds.push({ led, k, phase: Math.random() * 10, rate: 3 + Math.random() * 7 });
        g.add(led);
      }
      g.add(at(box(0.3, 0.03, 0.035, mat('#20242e')), -0.18, y, z));
    }
  }
  g.add(eyes(1.3, -0.5, 0.2, 0.1));
  return {
    object: g,
    tick: (t) => {
      for (const l of leds) l.led.material = Math.sin(t * l.rate + l.phase) > -0.2 ? on[l.k] : off;
    },
  };
}

function domainName() {
  const globe = group(ball(0.6, mat('#2f7de1', { roughness: 0.4 })));
  const line = mat('#d0ebff');
  globe.add(at(torus(0.61, 0.018, line), 0, 0, 0, Math.PI / 2));
  globe.add(at(torus(0.53, 0.018, line), 0, 0.3, 0, Math.PI / 2));
  globe.add(at(torus(0.53, 0.018, line), 0, -0.3, 0, Math.PI / 2));
  globe.add(torus(0.61, 0.018, line));
  globe.add(at(torus(0.61, 0.018, line), 0, 0, 0, 0, Math.PI / 2));
  globe.position.y = 0.95;
  const sign = panel(1.55, 0.36, 0.12, 'domain-sign', (ctx, w, h) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2b8a3e';
    ctx.font = `700 ${h * 0.5}px ${FONT_UI}`;
    ctx.textBaseline = 'middle';
    ctx.fillText('🔒', 6, h / 2 + 2);
    ctx.fillStyle = '#212529';
    ctx.font = `700 ${h * 0.56}px ${FONT_MONO}`;
    ctx.fillText('www.crab.dev', 48, h / 2 + 3);
  }, '#adb5bd');
  const g = group(globe, at(sign, 0, 0.22, 0), eyes(1.0, -0.56, 0.2, 0.11));
  return { object: g, tick: (t, dt) => (globe.rotation.y += dt * 1.5) };
}

function loadingSpinner() {
  const ring = new THREE.Group();
  const from = new THREE.Color('#e9ecef');
  const to = new THREE.Color('#1c7ed6');
  const count = 10;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const color = `#${from.clone().lerp(to, i / (count - 1)).getHexString()}`;
    ring.add(at(ball(0.09 + 0.07 * (i / count), mat(color, { roughness: 0.3 })), Math.cos(a) * 0.6, Math.sin(a) * 0.6, 0));
  }
  ring.position.y = 0.9;
  const hub = at(ball(0.26, mat('#f8f9fa')), 0, 0.9, 0);
  const g = group(ring, hub, eyes(0.93, -0.22, 0.1, 0.075), at(cyl(0.05, 0.05, 0.3, mat('#adb5bd'), 8), 0, 0.12, 0));
  return { object: g, tick: (t) => (ring.rotation.z = -Math.floor(t * 12) * ((Math.PI * 2) / count)) };
}

function flexboxBox() {
  const frame = mat('#7048e8', { roughness: 0.4 });
  const g = group(
    at(box(1.56, 0.08, 0.34, frame), 0, 1.22, 0),
    at(box(1.56, 0.08, 0.34, frame), 0, 0.12, 0),
    at(box(0.08, 1.1, 0.34, frame), -0.74, 0.67, 0),
    at(box(0.08, 1.1, 0.34, frame), 0.74, 0.67, 0),
  );
  const colors = ['#f06595', '#20c997', '#fcc419'];
  const heights = [0.7, 0.5, 0.85];
  const items = colors.map((c, i) => {
    const item = box(0.3, heights[i], 0.26, mat(c, { roughness: 0.4 }));
    g.add(item);
    return item;
  });
  g.add(eyes(0.95, -0.2, 0.12, 0.08));
  // Cycles through justify-content: flex-start, center, space-between, flex-end.
  const layouts = [
    [-0.5, -0.17, 0.16],
    [-0.33, 0, 0.33],
    [-0.5, 0, 0.5],
    [-0.16, 0.17, 0.5],
  ];
  return {
    object: g,
    tick: (t) => {
      const phase = (t * 0.7) % layouts.length;
      const a = layouts[Math.floor(phase)];
      const b = layouts[(Math.floor(phase) + 1) % layouts.length];
      const k = Math.min(1, (phase % 1) * 2.5);
      const ease = k * k * (3 - 2 * k);
      items.forEach((item, i) => item.position.set(a[i] + (b[i] - a[i]) * ease, 0.16 + heights[i] / 2, 0));
    },
  };
}

function cookieBanner() {
  const cookie = group(at(cyl(0.62, 0.62, 0.18, mat('#cf9548'), 24), 0, 0, 0, Math.PI / 2));
  const chip = mat('#4a2c17');
  const spots = [[0.2, 0.25], [-0.3, 0.1], [0.05, -0.3], [-0.15, 0.38], [0.36, -0.12], [-0.38, -0.25], [0.02, 0.02]];
  for (const [x, y] of spots) {
    for (const z of [-0.09, 0.09]) cookie.add(at(ball(0.075, chip), x, y, z));
  }
  cookie.position.y = 1.05;
  const banner = panel(1.56, 0.44, 0.14, 'cookie-banner', (ctx, w, h) => {
    ctx.fillStyle = '#212529';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f8f9fa';
    ctx.font = `600 ${h * 0.3}px ${FONT_UI}`;
    ctx.textBaseline = 'middle';
    ctx.fillText('We use cookies', 10, h * 0.5);
    roundRect(ctx, w * 0.64, h * 0.2, w * 0.32, h * 0.6, 8);
    ctx.fillStyle = '#37b24d';
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `700 ${h * 0.3}px ${FONT_UI}`;
    ctx.textAlign = 'center';
    ctx.fillText('Accept', w * 0.8, h * 0.5);
  });
  const g = group(cookie, at(banner, 0, 0.24, 0), eyes(1.12, -0.12, 0.2, 0.1));
  return { object: g, tick: (t) => (cookie.rotation.z = Math.sin(t * 2.5) * 0.25) };
}

function stickyNavbar() {
  const bar = panel(1.6, 0.36, 0.3, 'navbar', (ctx, w, h) => {
    ctx.fillStyle = '#1c7ed6';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(h / 2, h / 2, h * 0.26, 0, 7);
    ctx.fill();
    ctx.font = `700 ${h * 0.4}px ${FONT_UI}`;
    ctx.textBaseline = 'middle';
    ['Home', 'Docs', 'Blog'].forEach((label, i) => ctx.fillText(label, h + 8 + i * (w * 0.25), h / 2 + 1));
  }, '#1864ab');
  const honey = mat('#f59f00', { roughness: 0.15, transparent: true, opacity: 0.9 });
  const g = group(at(bar, 0, 1.25, 0));
  const drips = [];
  [-0.68, -0.4, -0.1, 0.22, 0.5, 0.7].forEach((x, i) => {
    const length = i === 0 || i === 5 ? 1.02 : 0.25 + (i % 3) * 0.14;
    const drip = group(at(cyl(0.06, 0.045, 1, honey, 8), 0, -0.5, 0), at(ball(0.085, honey), 0, -1, 0));
    drip.position.set(x, 1.1, i % 2 ? 0.05 : -0.05);
    drip.scale.y = length;
    drip.children[1].scale.y = 0.085 / length;
    drips.push({ drip, length, anchor: i === 0 || i === 5, phase: i * 1.7 });
    g.add(drip);
  });
  g.add(at(box(1.5, 0.06, 0.3, honey), 0, 1.06, 0));
  g.add(eyes(1.27, -0.19, 0.2, 0.09));
  return {
    object: g,
    tick: (t) => {
      for (const d of drips) {
        if (d.anchor) continue;
        const len = d.length * (1 + 0.45 * Math.sin(t * 2 + d.phase));
        d.drip.scale.y = len;
        d.drip.children[1].scale.y = 0.085 / len;
      }
    },
  };
}

function baltimoreOriole() {
  const orange = mat('#ff7b00', { roughness: 0.5 });
  const black = mat('#15151a', { roughness: 0.5 });
  const white = mat('#f8f9fa');
  const body = at(ball(0.42, orange, 0.9, 0.95, 1.3), 0, 0.62, 0.05, -0.25);
  const head = group(ball(0.29, black), at(cone(0.075, 0.34, mat('#9aa5b1'), 10), 0, -0.02, -0.4, -Math.PI / 2), eyes(0.06, -0.2, 0.16, 0.07));
  head.position.set(0, 1.08, -0.42);
  const wing = (side) => {
    const w = group(at(box(0.08, 0.42, 0.8, black), 0, -0.2, 0.1), at(box(0.09, 0.08, 0.5, white), 0, -0.22, 0.12), at(box(0.09, 0.16, 0.22, orange), 0, -0.05, -0.22));
    w.position.set(side * 0.4, 0.86, 0);
    return w;
  };
  const left = wing(-1);
  const right = wing(1);
  const tail = at(box(0.34, 0.06, 0.6, black), 0, 0.5, 0.72, 0.35);
  const tailTip = at(box(0.12, 0.065, 0.3, orange), 0.14, 0.45, 0.88, 0.35);
  const tailTip2 = at(box(0.12, 0.065, 0.3, orange), -0.14, 0.45, 0.88, 0.35);
  const leg = mat('#5c6b7a');
  const g = group(body, head, left, right, tail, tailTip, tailTip2, at(cyl(0.03, 0.03, 0.3, leg, 6), -0.14, 0.13, 0), at(cyl(0.03, 0.03, 0.3, leg, 6), 0.14, 0.13, 0));
  return {
    object: g,
    tick: (t) => {
      const flap = Math.sin(t * 16) * 0.75;
      left.rotation.z = -0.55 - flap;
      right.rotation.z = 0.55 + flap;
      head.rotation.x = Math.sin(t * 5) * 0.12;
    },
  };
}

function blueCrab() {
  const shell = mat('#4f7f96', { roughness: 0.5 });
  const blue = mat('#2b78c5', { roughness: 0.45 });
  const red = mat('#e8452c', { roughness: 0.45 });
  const belly = mat('#f1ede0');
  const g = group(at(ball(0.62, shell, 1.3, 0.36, 0.82), 0, 0.5, 0), at(ball(0.56, belly, 1.25, 0.2, 0.78), 0, 0.38, 0));
  for (const side of [-1, 1]) {
    // Pointed sides of the shell.
    g.add(at(cone(0.16, 0.5, shell, 8), side * 0.93, 0.5, 0, 0, 0, -side * Math.PI / 2));
    // Walking legs and the paddle-shaped swimming leg at the back.
    for (let i = 0; i < 3; i++) {
      g.add(at(box(0.55, 0.06, 0.07, blue), side * 0.9, 0.3, -0.05 + i * 0.2, 0, 0, side * -0.7));
    }
    g.add(at(ball(0.16, blue, 1.5, 0.3, 0.9), side * 0.75, 0.36, 0.55, 0, side * 0.6, 0));
    // Eye stalks.
    g.add(at(cyl(0.03, 0.03, 0.26, shell, 6), side * 0.2, 0.72, -0.42));
    g.add(at(ball(0.07, mat('#111')), side * 0.2, 0.88, -0.43));
  }
  const claw = (side) => {
    const arm = at(box(0.14, 0.14, 0.55, blue), 0, 0, -0.25);
    const palm = at(ball(0.2, blue, 0.9, 0.9, 1.4), 0, 0.02, -0.62);
    const upper = at(box(0.1, 0.07, 0.42, red), 0, 0.1, -0.98, 0.25);
    const lower = at(box(0.1, 0.07, 0.42, red), 0, -0.06, -0.98, -0.2);
    const c = group(arm, palm, upper, lower);
    c.position.set(side * 0.62, 0.55, -0.3);
    c.rotation.set(0.5, -side * 0.5, 0);
    c.userData = { upper, lower, side };
    return c;
  };
  const claws = [claw(-1), claw(1)];
  g.add(...claws);
  return {
    object: g,
    tick: (t) => {
      claws.forEach((c, i) => {
        const snap = Math.max(0, Math.sin(t * 6 + i * Math.PI));
        c.userData.upper.rotation.x = 0.1 + snap * 0.5;
        c.rotation.x = 0.45 + Math.sin(t * 3 + i * 2) * 0.2;
      });
      g.rotation.z = Math.sin(t * 9) * 0.05;
    },
  };
}

function diamondbackTerrapin() {
  const shell = drawnMat('terrapin-shell', 256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#6b6a4f';
    ctx.fillRect(0, 0, w, h);
    // Concentric diamond rings on each scute — the "diamondback".
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 8; col++) {
        const cx = col * 32 + (row % 2 ? 16 : 0) + 16;
        const cy = row * 40 + 22;
        for (let ring = 3; ring >= 1; ring--) {
          ctx.strokeStyle = ring % 2 ? '#d9cf9a' : '#3d3c2c';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(cx, cy - ring * 6);
          ctx.lineTo(cx + ring * 5, cy);
          ctx.lineTo(cx, cy + ring * 6);
          ctx.lineTo(cx - ring * 5, cy);
          ctx.closePath();
          ctx.stroke();
        }
      }
    }
  });
  const skin = drawnMat('terrapin-skin', 64, 64, (ctx, w, h) => {
    ctx.fillStyle = '#c3ccd1';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#23262b';
    for (let i = 0; i < 46; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * w, Math.random() * h, 1 + Math.random() * 1.8, 0, 7);
      ctx.fill();
    }
  });
  const g = group(at(ball(0.62, shell, 1.05, 0.62, 1.25), 0, 0.5, 0.05), at(ball(0.6, mat('#d8c98c'), 1, 0.22, 1.2), 0, 0.36, 0.05));
  const head = group(ball(0.21, skin, 1, 0.9, 1.2), at(cyl(0.12, 0.14, 0.4, skin, 10), 0, -0.05, 0.3, Math.PI / 2), eyes(0.07, -0.16, 0.13, 0.06));
  head.position.set(0, 0.6, -0.92);
  g.add(head);
  const legs = [];
  for (const [x, z] of [[-0.62, -0.5], [0.62, -0.5], [-0.62, 0.6], [0.62, 0.6]]) {
    const leg = at(ball(0.2, skin, 1.5, 0.35, 0.9), x, 0.3, z);
    legs.push(leg);
    g.add(leg);
  }
  g.add(at(cone(0.08, 0.4, skin, 8), 0, 0.36, 0.95, Math.PI / 2));
  return {
    object: g,
    tick: (t) => {
      head.position.z = -0.86 - Math.max(0, Math.sin(t * 2.2)) * 0.16;
      head.rotation.y = Math.sin(t * 1.7) * 0.3;
      legs.forEach((leg, i) => (leg.rotation.y = Math.sin(t * 8 + (i % 2 ? 0 : Math.PI)) * 0.5));
    },
  };
}

export const RACER_KINDS = [
  { id: 'browserTab', label: 'Browser tab', emoji: '🗂️', build: browserTab },
  { id: 'devTools', label: 'Dev tools panel', emoji: '🛠️', build: devTools },
  { id: 'cssScroll', label: 'CSS stylesheet scroll', emoji: '📜', build: cssScroll },
  { id: 'hamburgerMenu', label: 'Hamburger menu', emoji: '🍔', build: hamburgerMenu },
  { id: 'responsiveLayout', label: 'Responsive layout', emoji: '📱', build: responsiveLayout },
  { id: 'hostingServer', label: 'Hosting server', emoji: '🖥️', build: hostingServer },
  { id: 'domainName', label: 'Domain name', emoji: '🌐', build: domainName },
  { id: 'loadingSpinner', label: 'Loading spinner', emoji: '⏳', build: loadingSpinner },
  { id: 'flexboxBox', label: 'Flexbox box', emoji: '📦', build: flexboxBox },
  { id: 'cookieBanner', label: 'Cookie banner', emoji: '🍪', build: cookieBanner },
  { id: 'stickyNavbar', label: 'Sticky navbar', emoji: '🍯', build: stickyNavbar },
  { id: 'baltimoreOriole', label: 'Baltimore oriole', emoji: '🐦', build: baltimoreOriole },
  { id: 'blueCrab', label: 'Blue crab', emoji: '🦀', build: blueCrab },
  { id: 'diamondbackTerrapin', label: 'Diamondback terrapin', emoji: '🐢', build: diamondbackTerrapin },
];

// ---------------------------------------------------------------- kart + racer

function buildKart(color) {
  const paint = mat(color, { roughness: 0.35, metalness: 0.15 });
  const dark = mat(DARK, { roughness: 0.6 });
  const tyre = mat('#17181c', { roughness: 0.9 });
  const hub = mat('#f2b817', { metalness: 0.4, roughness: 0.4 });
  const g = group(
    at(box(1.45, 0.3, 2.3, paint), 0, 0.45, 0),
    at(box(1.05, 0.24, 0.5, paint), 0, 0.42, -1.3),
    at(box(1.75, 0.13, 0.18, dark), 0, 0.36, -1.6),
    at(box(1.25, 0.1, 1.5, dark), 0, 0.62, 0.05),
    at(box(1.7, 0.07, 0.36, paint), 0, 1.0, 1.15),
    at(box(0.07, 0.4, 0.12, dark), -0.6, 0.8, 1.15),
    at(box(0.07, 0.4, 0.12, dark), 0.6, 0.8, 1.15),
    at(cyl(0.1, 0.13, 0.3, dark, 10), -0.35, 0.45, 1.25, Math.PI / 2),
    at(cyl(0.1, 0.13, 0.3, dark, 10), 0.35, 0.45, 1.25, Math.PI / 2),
  );
  const wheels = [];
  for (const [x, z] of [[-0.86, -0.85], [0.86, -0.85], [-0.86, 0.85], [0.86, 0.85]]) {
    const wheel = group(at(cyl(0.36, 0.36, 0.3, tyre, 14), 0, 0, 0, 0, 0, Math.PI / 2), at(cyl(0.16, 0.16, 0.32, hub, 6), 0, 0, 0, 0, 0, Math.PI / 2));
    wheel.position.set(x, 0.36, z);
    wheels.push(wheel);
    g.add(wheel);
  }
  // Boost flame out of the back.
  const flame = group(
    at(cone(0.28, 1.5, mat('#ff922b', { emissive: '#ff6b00', emissiveIntensity: 2, transparent: true, opacity: 0.9 }), 10), 0, 0, 0.75, Math.PI / 2),
    at(cone(0.15, 1.0, mat('#fff3bf', { emissive: '#ffe066', emissiveIntensity: 2.5 }), 10), 0, 0, 0.5, Math.PI / 2),
  );
  flame.traverse((o) => (o.castShadow = false));
  flame.position.set(0, 0.45, 1.3);
  flame.visible = false;
  g.add(flame);
  return { kart: g, wheels, flame };
}

const nullTexture = () => nameTagTexture('null', '#ff6b6b', { mono: true, background: 'rgba(60, 10, 14, 0.9)' });
let sharedNullTexture = null;

/**
 * Builds one racer: kart + character + name tag + status props.
 * Returns the pieces the game animates each frame.
 */
export function buildRacer(kindIndex, color, name) {
  const kind = RACER_KINDS[kindIndex % RACER_KINDS.length];
  const { kart, wheels, flame } = buildKart(color);
  const character = kind.build();
  character.object.scale.setScalar(1.2);
  character.object.position.y = 0.67;
  character.object.position.z = 0.1;

  // `body` takes the hops, spins and tumbles; `root` just sits on the track.
  const body = group(kart, character.object);
  const scaler = group(body);
  scaler.scale.setScalar(RACER_SCALE);
  const root = group(scaler);

  const shield = ball(1.4, mat('#66d9e8', { transparent: true, opacity: 0.28, roughness: 0.1, depthWrite: false, emissive: '#22b8cf', emissiveIntensity: 0.5 }));
  shield.castShadow = false;
  shield.position.y = 1.1;
  shield.visible = false;
  scaler.add(shield);

  const labelTexture = nameTagTexture(name, color);
  const label = makeSprite(labelTexture, 4.4, 1.1);
  label.position.y = LABEL_Y;
  label.renderOrder = 5;
  root.add(label);

  const emote = makeSprite(emojiTexture('☕'), 1.5, 1.5, { depthTest: false });
  emote.position.y = LABEL_Y + 1.3;
  emote.visible = false;
  emote.renderOrder = 6;
  root.add(emote);

  const itemIcon = makeSprite(emojiTexture('☕'), 0.95, 0.95);
  itemIcon.position.set(0, LABEL_Y + 1.05, 0);
  itemIcon.visible = false;
  itemIcon.renderOrder = 6;
  root.add(itemIcon);

  if (!sharedNullTexture) sharedNullTexture = nullTexture();

  return {
    kind,
    color,
    root,
    body,
    wheels,
    flame,
    shield,
    label,
    labelTexture,
    nullTexture: sharedNullTexture,
    emote,
    emoteTime: 0,
    itemIcon,
    tick: character.tick,
    yaw: 0,
    prevD: null,
    dispose() {
      labelTexture.dispose();
      label.material.dispose();
      emote.material.dispose();
      itemIcon.material.dispose();
    },
  };
}

