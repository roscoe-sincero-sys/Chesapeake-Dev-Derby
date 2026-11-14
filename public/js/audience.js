// The crowd: grandstands of Chesapeake Bay wildlife cheering beside the start and finish lines.
// Spectator models face -Z like the racers; each stand turns them to face the track.

import * as THREE from 'three';
import { mat, box, ball, cyl, cone, torus, at, group, drawnMat, drawMarylandFlag, FONT_MONO, MD } from './util3d.js';
import { eyes } from './racers.js';
import { mulberry32, shuffle } from './sim.js';

// ---------------------------------------------------------------- spectators

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
    c.userData = { upper, side };
    return c;
  };
  const claws = [claw(-1), claw(1)];
  g.add(...claws);
  return {
    object: g,
    tick: (t) => {
      // Claws thrust up into the air, snapping.
      claws.forEach((c, i) => {
        c.userData.upper.rotation.x = 0.1 + Math.max(0, Math.sin(t * 9 + i * Math.PI)) * 0.5;
        c.rotation.set(1.1 + Math.sin(t * 5 + i * Math.PI) * 0.35, -c.userData.side * 0.4, 0);
      });
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
  const skin = spotted('terrapin-skin', '#c3ccd1', '#23262b');
  const g = group(at(ball(0.62, shell, 1.05, 0.62, 1.25), 0, 0.5, 0.05), at(ball(0.6, mat('#d8c98c'), 1, 0.22, 1.2), 0, 0.36, 0.05));
  const head = group(ball(0.21, skin, 1, 0.9, 1.2), at(cyl(0.12, 0.14, 0.4, skin, 10), 0, -0.05, 0.3, Math.PI / 2), eyes(0.07, -0.16, 0.13, 0.06));
  head.position.set(0, 0.7, -0.9);
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
      // Head stretched out, front flippers waving.
      head.position.y = 0.7 + Math.max(0, Math.sin(t * 4)) * 0.18;
      head.rotation.y = Math.sin(t * 2.3) * 0.35;
      legs[0].rotation.z = 0.6 + Math.sin(t * 10) * 0.5;
      legs[1].rotation.z = -0.6 - Math.sin(t * 10 + 1) * 0.5;
    },
  };
}

/** A raptor (osprey or bald eagle): upright body, hooked beak, wings raised and flapping. */
function raptor({ head, back, belly, tail, beak, mask }) {
  const headMat = mat(head);
  const backMat = mat(back, { roughness: 0.6 });
  const bellyMat = mat(belly);
  const yellow = mat('#e8b923');
  const g = group(
    at(ball(0.36, bellyMat, 0.9, 1.15, 0.85), 0, 0.78, -0.03),
    at(ball(0.37, backMat, 0.95, 1.12, 0.8), 0, 0.82, 0.1),
    at(box(0.34, 0.06, 0.5, mat(tail)), 0, 0.42, 0.42, 0.7),
    at(cyl(0.035, 0.035, 0.36, yellow, 6), -0.13, 0.18, 0),
    at(cyl(0.035, 0.035, 0.36, yellow, 6), 0.13, 0.18, 0),
  );
  const face = group(
    ball(0.25, headMat),
    at(cone(0.075, 0.24, mat(beak), 8), 0, -0.04, -0.27, -Math.PI / 2 - 0.55),
    eyes(0.07, -0.19, 0.11, 0.06),
  );
  if (mask) for (const side of [-1, 1]) face.add(at(ball(0.07, mat(mask), 0.6, 0.55, 2.4), side * 0.19, 0.05, 0.02));
  face.position.set(0, 1.32, -0.06);
  g.add(face);
  const wings = [-1, 1].map((side) => {
    const wing = group(at(box(0.08, 0.95, 0.46, backMat), 0, 0.47, 0), at(box(0.085, 0.3, 0.36, bellyMat), 0, 0.2, -0.02));
    wing.position.set(side * 0.33, 1.0, 0.06);
    wing.userData.side = side;
    g.add(wing);
    return wing;
  });
  return {
    object: g,
    tick: (t) => {
      const flap = Math.sin(t * 11) * 0.45;
      for (const wing of wings) wing.rotation.z = -wing.userData.side * (0.75 + flap);
      face.rotation.x = Math.sin(t * 4.5) * 0.15;
    },
  };
}

const osprey = () => raptor({ head: '#f4f1ea', back: '#4a3426', belly: '#f4f1ea', tail: '#5d4433', beak: '#1d1a17', mask: '#2a2019' });
const baldEagle = () => raptor({ head: '#fbfaf6', back: '#3b2a1f', belly: '#4a3527', tail: '#fbfaf6', beak: '#f2b817' });

function greatBlueHeron() {
  const grey = mat('#7d8fa3', { roughness: 0.6 });
  const pale = mat('#d9dee4');
  const legMat = mat('#8c7a55');
  const g = group(
    at(cyl(0.035, 0.035, 0.95, legMat, 6), -0.1, 0.47, 0.02),
    at(cyl(0.035, 0.035, 0.95, legMat, 6), 0.1, 0.47, 0.02),
    at(ball(0.3, grey, 0.95, 0.85, 1.6), 0, 1.12, 0.08, -0.35),
    at(cone(0.2, 0.5, grey, 8), 0, 1.0, 0.6, 1.9),
  );
  // Long neck, bobbing forward and back.
  const neck = group(
    at(cyl(0.07, 0.09, 0.75, pale, 8), 0, 0.35, 0),
    at(ball(0.13, pale, 1, 0.95, 1.25), 0, 0.78, -0.05),
    at(cone(0.04, 0.5, mat('#e8a33c'), 8), 0, 0.78, -0.38, -Math.PI / 2),
    at(box(0.04, 0.04, 0.32, mat('#1d1f24')), 0, 0.88, 0.14, -0.4),
    eyes(0.82, -0.12, 0.08, 0.045),
  );
  neck.position.set(0, 1.25, -0.28);
  g.add(neck);
  return {
    object: g,
    tick: (t) => {
      neck.rotation.x = -0.15 + Math.sin(t * 5) * 0.25;
    },
  };
}

/** Bivalves clap their shells open and shut. */
function bivalve({ key, base, rim, inside, w, l, upright }) {
  const shellMat = drawnMat(key, 128, 128, (ctx, cw, ch) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, cw, ch);
    ctx.strokeStyle = rim;
    ctx.lineWidth = 4;
    if (upright) {
      // Ribbed mussel: fine radiating ribs.
      for (let x = -cw; x < cw * 2; x += 9) {
        ctx.beginPath();
        ctx.moveTo(cw / 2, ch);
        ctx.lineTo(x, 0);
        ctx.stroke();
      }
    } else {
      // Oyster: rough, layered growth rings.
      for (let r = 10; r < cw; r += 12) {
        ctx.beginPath();
        ctx.ellipse(cw / 2, ch * 0.85, r * 1.1, r, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }, { roughness: 0.85 });
  const innerMat = mat(inside, { roughness: 0.3, metalness: 0.1 });
  const lower = group(at(ball(1, shellMat, w, 0.16, l), 0, 0, 0), at(ball(0.92, innerMat, w, 0.08, l), 0, 0.05, 0));
  const lid = group(at(ball(1, shellMat, w, 0.16, l), 0, 0, -l), at(ball(0.92, innerMat, w, 0.06, l), 0, -0.04, -l), eyes(0.2, -l * 1.45, 0.14, 0.08));
  // The hinge is at the back of the shell.
  const hinge = group(lid);
  hinge.position.set(0, 0.06, l);
  lower.add(hinge);
  const g = group(lower);
  if (upright) {
    // Mussels stand on end, hinge down, opening towards the front.
    lower.rotation.x = Math.PI / 2 - 0.25;
    lower.position.set(0, l + 0.1, -0.1);
    g.rotation.y = Math.PI;
    return { object: group(g), tick: (t) => (hinge.rotation.x = 0.12 + Math.max(0, Math.sin(t * 7)) * 0.55) };
  } else {
    lower.position.y = 0.22;
  }
  return {
    object: g,
    tick: (t) => {
      hinge.rotation.x = 0.12 + Math.max(0, Math.sin(t * 7)) * 0.55;
    },
  };
}

const easternOyster = () => bivalve({ key: 'oyster-shell', base: '#9b9583', rim: '#6f6a5c', inside: '#ece7dc', w: 0.52, l: 0.62 });
const ribbedMussel = () => bivalve({ key: 'mussel-shell', base: '#5a5236', rim: '#3a351f', inside: '#c9c1d8', w: 0.28, l: 0.55, upright: true });

/** Speckled skin texture. */
function spotted(key, base, spot) {
  return drawnMat(key, 64, 64, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = spot;
    const rng = mulberry32(key.length * 97);
    for (let i = 0; i < 46; i++) {
      ctx.beginPath();
      ctx.arc(rng() * w, rng() * h, 1 + rng() * 1.8, 0, 7);
      ctx.fill();
    }
  });
}

/** Two arms that wave above the head, out of phase. */
function wavingArms(material, y, x, length, radius = 0.08) {
  return [-1, 1].map((side) => {
    const arm = group(at(cyl(radius, radius, length, material, 8), 0, length / 2, 0), at(ball(radius * 1.4, material), 0, length, 0));
    arm.position.set(side * x, y, -0.05);
    arm.userData.side = side;
    return arm;
  });
}

function waveArms(arms, t, speed = 9) {
  for (const arm of arms) {
    const s = arm.userData.side;
    arm.rotation.z = -s * (0.45 + Math.sin(t * speed + (s > 0 ? 0 : Math.PI)) * 0.35);
  }
}

function americanBeaver() {
  const fur = mat('#6b4423', { roughness: 0.8 });
  const light = mat('#8a6040', { roughness: 0.8 });
  const tailMat = drawnMat('beaver-tail', 64, 128, (ctx, w, h) => {
    ctx.fillStyle = '#2f241c';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#4a3a2e';
    ctx.lineWidth = 2;
    for (let i = -h; i < h * 2; i += 10) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(w, i + w);
      ctx.moveTo(w, i);
      ctx.lineTo(0, i + w);
      ctx.stroke();
    }
  });
  const head = group(
    ball(0.3, fur, 1, 0.92, 1),
    at(ball(0.14, light, 1.3, 0.9, 1), 0, -0.08, -0.24),
    at(ball(0.06, mat('#1b1512')), 0, -0.02, -0.36),
    at(box(0.12, 0.12, 0.03, mat('#e67700')), 0, -0.2, -0.32),
    at(ball(0.08, fur), -0.2, 0.22, 0.02),
    at(ball(0.08, fur), 0.2, 0.22, 0.02),
    eyes(0.08, -0.25, 0.13, 0.065),
  );
  head.position.set(0, 1.18, -0.06);
  const tail = at(ball(1, tailMat, 0.26, 0.05, 0.42), 0, 0.12, 0.55);
  const arms = wavingArms(fur, 0.92, 0.36, 0.42, 0.07);
  const g = group(at(ball(0.48, fur, 1, 1.1, 0.9), 0, 0.55, 0.05), at(ball(0.36, light, 1, 1.1, 0.6), 0, 0.55, -0.16), head, tail, ...arms);
  return {
    object: g,
    tick: (t) => {
      waveArms(arms, t, 8);
      tail.rotation.x = Math.max(0, Math.sin(t * 6)) * 0.6;
    },
  };
}

function riverOtter() {
  const fur = mat('#5c4033', { roughness: 0.7 });
  const cream = mat('#c9ad8a', { roughness: 0.7 });
  const head = group(
    ball(0.24, fur, 1.05, 0.92, 1),
    at(ball(0.13, cream, 1.4, 0.85, 1), 0, -0.07, -0.18),
    at(ball(0.045, mat('#1b1512')), 0, -0.02, -0.3),
    at(ball(0.06, fur), -0.18, 0.15, 0.04),
    at(ball(0.06, fur), 0.18, 0.15, 0.04),
    eyes(0.06, -0.19, 0.11, 0.06),
  );
  const whisker = mat('#efe7da');
  for (const side of [-1, 1]) head.add(at(box(0.22, 0.012, 0.012, whisker), side * 0.16, -0.08, -0.26, 0, side * 0.3, side * 0.15));
  head.position.set(0, 1.5, -0.04);
  const arms = wavingArms(fur, 1.15, 0.24, 0.45, 0.06);
  const g = group(
    at(ball(0.32, fur, 1, 2.2, 0.9), 0, 0.72, 0.04),
    at(ball(0.24, cream, 1, 2, 0.6), 0, 0.82, -0.1),
    at(cone(0.12, 0.8, fur, 8), 0, 0.15, 0.45, Math.PI / 2 + 0.3),
    head,
    ...arms,
  );
  return {
    object: g,
    tick: (t) => {
      waveArms(arms, t, 10);
      head.rotation.z = Math.sin(t * 3) * 0.15;
    },
  };
}

function northernWatersnake() {
  const banded = drawnMat('watersnake', 128, 32, (ctx, w, h) => {
    ctx.fillStyle = '#8a7356';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#3e2f22';
    for (let x = 0; x < w; x += 16) ctx.fillRect(x, 0, 8, h);
  }, { roughness: 0.5 });
  banded.map.wrapS = THREE.RepeatWrapping;
  const g = group(
    at(torus(0.36, 0.13, banded), 0, 0.13, 0, Math.PI / 2),
    at(torus(0.28, 0.12, banded), 0, 0.36, 0, Math.PI / 2),
  );
  // Raised neck and head, swaying to the beat.
  const head = group(
    at(ball(0.15, banded, 1, 0.75, 1.5), 0, 0, -0.08),
    at(box(0.015, 0.015, 0.18, mat('#d6336c')), 0, -0.05, -0.33),
    eyes(0.06, -0.18, 0.08, 0.05),
  );
  head.position.set(0, 0.78, -0.02);
  const neck = group(at(cyl(0.11, 0.13, 0.62, banded, 10), 0, 0.31, 0), head);
  neck.position.set(0, 0.42, 0.06);
  g.add(neck);
  return {
    object: g,
    tick: (t) => {
      neck.rotation.z = Math.sin(t * 4) * 0.35;
      neck.rotation.x = Math.sin(t * 8) * 0.12;
      head.rotation.z = -neck.rotation.z * 0.8;
    },
  };
}

/** Everyone in the stands. */
export const AUDIENCE_KINDS = [
  { id: 'blueCrab', label: 'Blue crab', build: blueCrab, scale: 1 },
  { id: 'osprey', label: 'Osprey', build: osprey, scale: 1.15 },
  { id: 'baldEagle', label: 'Bald eagle', build: baldEagle, scale: 1.3 },
  { id: 'greatBlueHeron', label: 'Great blue heron', build: greatBlueHeron, scale: 1.15 },
  { id: 'easternOyster', label: 'Eastern oyster', build: easternOyster, scale: 1.15 },
  { id: 'ribbedMussel', label: 'Ribbed mussel', build: ribbedMussel, scale: 1.25 },
  { id: 'diamondbackTerrapin', label: 'Diamondback terrapin', build: diamondbackTerrapin, scale: 0.95 },
  { id: 'americanBeaver', label: 'American beaver', build: americanBeaver, scale: 1.15 },
  { id: 'riverOtter', label: 'North American river otter', build: riverOtter, scale: 1.1 },
  { id: 'northernWatersnake', label: 'Northern watersnake', build: northernWatersnake, scale: 1.2 },
];

// ---------------------------------------------------------------- grandstands

const TIERS = 3;
const TIER_DEPTH = 2.6; // across the stand
const TIER_RISE = 1.1;
const GAP = 1.4; // walkway between the bridge deck edge and the first tier
const SLICE = 2.7; // one seat per tier per slice, along the track
const SLICES = 10;
const BASE = -1.2; // underside of the stand, relative to the deck
const BACK = GAP + TIERS * TIER_DEPTH;

/** Rows of a stand: where it sits along the track and which side. */
export function grandstandLayout(track) {
  const span = SLICES * SLICE;
  const starts = [-span - 3, track.length + 3];
  const stands = [];
  for (const s0 of starts) for (const side of [-1, 1]) stands.push({ s0, s1: s0 + span, side });
  return stands;
}

function backPanel(index) {
  const words = ['GO!', '</>', 'VROOM', '{ }', 'FASTER', '200 OK'];
  if (index % 2 === 0) {
    return drawnMat('stand-flag', 256, 128, (ctx, w, h) => drawMarylandFlag(ctx, 0, 0, w, h));
  }
  const word = words[Math.floor(index / 2) % words.length];
  return drawnMat(`stand-word-${word}`, 256, 128, (ctx, w, h) => {
    ctx.fillStyle = MD.black;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = MD.gold;
    ctx.font = `800 ${word.length > 4 ? 52 : 70}px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(word, w / 2, h / 2 + 4);
  });
}

/**
 * Builds the four grandstands (both sides of the start and of the finish) full of cheering wildlife.
 * Returns the scene group, an update(t) for the cheering, and footprints other scenery should avoid.
 */
export function buildAudience(track) {
  const rng = mulberry32(1838);
  const root = new THREE.Group();
  const fans = [];
  const footprints = [];
  const concrete = mat('#c9ced6', { roughness: 0.85 });
  const steel = mat('#6c7480', { roughness: 0.5, metalness: 0.3 });
  const seats = [mat(MD.red), mat(MD.gold), mat('#f8f9fa')];
  let bag = [];

  for (const stand of grandstandLayout(track)) {
    for (let i = 0; i < SLICES; i++) {
      const s = stand.s0 + (i + 0.5) * SLICE;
      const f = track.frame(s);
      const yaw = Math.atan2(-f.tan.x, -f.tan.z) + (stand.side < 0 ? Math.PI : 0);
      const slice = new THREE.Group();
      track.point(s, stand.side * track.edge, 0, slice.position);
      slice.rotation.y = yaw;
      const deckY = slice.position.y;
      const len = SLICE + 0.7; // overlap neighbouring slices so bends show no gaps

      // Local space: +X away from the track, Y up from deck level.
      slice.add(at(box(GAP, 0.3, len, concrete), GAP / 2, -0.15, 0));
      for (let tier = 0; tier < TIERS; tier++) {
        const top = 0.2 + tier * TIER_RISE;
        const x0 = GAP + tier * TIER_DEPTH;
        slice.add(at(box(TIER_DEPTH, top - BASE, len, concrete), x0 + TIER_DEPTH / 2, (top + BASE) / 2, 0));
        slice.add(at(box(TIER_DEPTH * 0.32, 0.32, SLICE - 0.2, seats[(tier + i) % seats.length]), x0 + TIER_DEPTH * 0.78, top + 0.16, 0));

        if (!bag.length) bag = shuffle(AUDIENCE_KINDS.map((_, k) => k), rng);
        const kind = AUDIENCE_KINDS[bag.pop()];
        const fan = kind.build();
        fan.object.traverse((o) => (o.castShadow = false));
        const holder = group(fan.object);
        holder.scale.setScalar(kind.scale * 1.15);
        holder.position.set(x0 + TIER_DEPTH * 0.42, top, (rng() - 0.5) * 0.5);
        // Face the track (-X), turned a little towards the line.
        holder.rotation.y = Math.PI / 2 + (rng() - 0.5) * 0.6;
        slice.add(holder);
        fans.push({ holder, top, tick: fan.tick, phase: rng() * 10, rate: 7 + rng() * 4, hop: 0.12 + rng() * 0.2 });
      }

      // Back wall with alternating flag and cheer panels facing the track.
      const topBack = 0.2 + (TIERS - 1) * TIER_RISE;
      const panel = backPanel(i + (stand.side > 0 ? 0 : 1));
      slice.add(at(box(0.25, topBack + 2.6 - BASE, len, concrete), BACK + 0.12, (topBack + 2.6 + BASE) / 2, 0));
      slice.add(at(box(0.06, 1.3, SLICE - 0.3, [concrete, panel, concrete, concrete, concrete, concrete]), BACK - 0.04, topBack + 1.75, 0));
      // Front rail.
      slice.add(at(box(0.08, 0.08, len, steel), 0.08, 0.95, 0));
      slice.add(at(box(0.08, 0.95, 0.08, steel), 0.08, 0.47, 0));
      // Piers down to the water.
      for (const x of [GAP + TIER_DEPTH * 0.5, BACK - 0.4]) {
        const height = deckY + BASE;
        if (height > 0.2) slice.add(at(cyl(0.35, 0.45, height, concrete, 10), x, BASE - height / 2, 0));
      }
      root.add(slice);
    }
    // Rough footprint for sailboats and buoys to keep clear of.
    for (const s of [stand.s0 + 6, (stand.s0 + stand.s1) / 2, stand.s1 - 6]) {
      footprints.push({ point: track.point(s, stand.side * (track.edge + BACK / 2)).setY(0), radius: 12 });
    }
  }

  return {
    object: root,
    footprints,
    /** True if distance `s` along the track is beside a grandstand. */
    near(s) {
      return grandstandLayout(track).some((st) => s > st.s0 - 4 && s < st.s1 + 4);
    },
    update(t) {
      for (const fan of fans) {
        const k = t * fan.rate + fan.phase;
        fan.holder.position.y = fan.top + Math.abs(Math.sin(k * 0.5)) * fan.hop;
        fan.tick(t + fan.phase);
      }
    },
  };
}
