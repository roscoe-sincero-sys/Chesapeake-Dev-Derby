// The 3D match itself, run headless (#95–#100): camera framing, smooth limbs, frame-rate independence,
// room between fights and the wider move set. Canvas drawing is a no-op here (see headless.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { loadHdAssets } from './headless.js';
import { WrestleMatch } from '../public/js/wrestle.js';
import { planMatch, WRESTLER_KINDS } from '../public/js/wrestle-sim.js';
import { lowestBodyPoint } from '../public/js/wrestlers.js';
import { mulberry32 } from '../public/js/sim.js';

const names = (n) => Array.from({ length: n }, (_, i) => `Wrestler ${i + 1}`);
const kind = (id) => WRESTLER_KINDS.find((k) => k.id === id);
const MAT_Y = 1.3;
const HALF = 6;

/** Steps `match` at `hz` until `until` seconds, calling `frame()` after each update. */
function run(match, hz, until, frame = () => {}) {
  while (match.t < until - 1e-9) {
    match.update(1 / hz);
    frame(match);
  }
}

/** A two-wrestler match where `thrower` wins (and throws `victim` out at the end). */
function duel(thrower, victim, seed, modelStyle = 'classic') {
  const plan = planMatch(['A', 'B'], mulberry32(seed));
  for (const w of plan.wrestlers) w.kind = kind(w.id === plan.winner ? thrower : victim);
  return new WrestleMatch(['A', 'B'], { previewPlan: plan, rng: mulberry32(seed + 1), modelStyle });
}

// ---------------------------------------------------------------- #95 camera

test('the live camera circles the ring centre at a steady distance, height and speed', () => {
  const match = new WrestleMatch(names(12), { rng: mulberry32(17), modelStyle: 'classic' });
  match.resize(1.6);
  const final = match.plan.beats.find((b) => b.type === 'final');
  let last = null;
  let maxRadiusRate = 0;
  run(match, 60, match.plan.duration + 3, (m) => {
    const p = m.camera.position;
    const radius = Math.hypot(p.x, p.z);
    const angle = Math.atan2(p.z, p.x);
    if (m.t > 4.6 && m.t < final.start) {
      assert.ok(Math.abs(radius - 16) < 1e-6, `t=${m.t.toFixed(2)}: orbit radius ${radius}`);
      assert.ok(Math.abs(p.y - 9) < 1e-6, `t=${m.t.toFixed(2)}: height ${p.y}`);
      const speed = Math.atan2(Math.sin(angle - last.angle), Math.cos(angle - last.angle)) * 60;
      assert.ok(Math.abs(speed - 0.12) < 1e-6, `t=${m.t.toFixed(2)}: orbit speed ${speed}`);
      // It only turns towards the action, a bounded amount from the centre of the ring.
      assert.ok(Math.hypot(m.camLook.x, m.camLook.z) <= 3.2 + 1e-6, `t=${m.t.toFixed(2)}: aim strays`);
    }
    // Into the final two and the victory: gradually, never a sudden push in.
    if (last && m.t > 4.6) maxRadiusRate = Math.max(maxRadiusRate, Math.abs(radius - last.radius) * 60);
    last = { radius, angle };
  });
  assert.ok(maxRadiusRate < 2, `camera distance changes by up to ${maxRadiusRate.toFixed(2)} units/s`);
});

test('each ring-out stays in the picture: the rope, the landing and the thrown wrestler, wide and portrait', () => {
  const v = new THREE.Vector3();
  for (const aspect of [1.6, 0.6]) {
    for (const seed of [17, 5]) {
      const match = new WrestleMatch(names(12), { rng: mulberry32(seed), modelStyle: 'classic' });
      match.resize(aspect);
      let frames = 0;
      const missed = [];
      run(match, 60, match.plan.duration, (m) => {
        m.camera.updateMatrixWorld();
        for (const b of m.actions) {
          if (b.type !== 'elimination' || m.t < b.throwAt || m.t > b.landAt + 1) continue;
          const f = m.sideFrame(b.side, b.spot);
          const victim = m.wrestlers[b.victim];
          const rope = f.at(HALF);
          const landing = f.at(HALF + 2.7);
          for (const [what, x, y, z] of [['rope', rope.x, MAT_Y + 1.55, rope.z], ['landing', landing.x, 0, landing.z], ['victim', victim.x, Math.max(0.3, victim.y), victim.z]]) {
            frames++;
            v.set(x, y, z).project(m.camera);
            if (Math.abs(v.x) > 1 || Math.abs(v.y) > 1) missed.push(`${what}@${m.t.toFixed(2)}${b.together ? ' (two at once)' : ''}`);
          }
        }
      });
      assert.ok(frames > 1000);
      assert.deepEqual(missed, [], `aspect ${aspect}, seed ${seed}: out of the picture ${missed.length}× (${missed.slice(0, 4).join(', ')})`);
    }
  }
});

// ---------------------------------------------------------------- #98 smooth limbs (HD)

const BONES = ['upperarm_l', 'upperarm_r', 'lowerarm_l', 'lowerarm_r', 'thigh_l', 'thigh_r', 'calf_l', 'calf_r', 'spine_01', 'Head'];

test('HD grapples, throws, the close call and recoveries never snap a limb, and stay on the floor', async () => {
  await loadHdAssets();
  // Both base bodies and the height extremes, with an overhead toss, a hip toss and a shove.
  for (const [thrower, victim] of [['bhima', 'hidimbi'], ['karna', 'ghatotkacha'], ['kichaka', 'abhimanyu'], ['ghatotkacha', 'arjuna']]) {
    const match = duel(thrower, victim, 7, 'hd');
    const last = new Map();
    let worst = { deg: 0 };
    let frame = 0;
    let cleared = null;
    const out = match.plan.beats.find((b) => b.type === 'elimination');
    run(match, 60, match.plan.duration + 1.5, (m) => {
      frame++;
      for (const w of m.wrestlers) {
        for (const bone of BONES) {
          const q = w.rig.bones[bone].quaternion;
          const prev = last.get(`${w.id}${bone}`);
          if (prev) {
            const deg = (prev.angleTo(q) * 180) / Math.PI;
            if (deg > worst.deg) worst = { deg, t: m.t.toFixed(2), who: w.kind.id, bone, key: w.moveKey };
          }
          last.set(`${w.id}${bone}`, q.clone());
        }
        if (frame % 4 === 0 && w.ground) {
          const r = w.rig.root.position;
          const floor = Math.abs(r.x) < HALF + 0.5 && Math.abs(r.z) < HALF + 0.5 ? MAT_Y : 0;
          const low = lowestBodyPoint(w.rig);
          assert.ok(low >= floor - 0.01, `${w.kind.id} through the floor at ${m.t.toFixed(2)}: ${low.toFixed(3)}`);
        }
      }
      // The victim clears the top rope: their body is above it as it crosses the rope line.
      const v = m.wrestlers[out.victim];
      const f = m.sideFrame(out.side, out.spot);
      const across = v.x * f.nx + v.z * f.nz;
      if (cleared === null && m.t > out.throwAt && across > HALF + 0.1) cleared = lowestBodyPoint(v.rig);
    });
    // Forearm strikes are the fastest intended motion, at about 19° per update at 60 updates/s.
    assert.ok(worst.deg < 25, `${thrower} throws ${victim}: ${worst.deg.toFixed(1)}° in one update (${JSON.stringify(worst)})`);
    assert.ok(cleared > MAT_Y + 1.55 - 0.3, `${victim} clears the top rope (lowest point ${cleared?.toFixed(2)})`);
  }
});

// ---------------------------------------------------------------- #99 frame-rate independence

test('the approach strides and Duryodhana playing to the crowd keep the same pace at 30, 60 and 120 updates/s', () => {
  const results = [30, 60, 120].map((hz) => {
    const match = duel('duryodhana', 'arjuna', 3);
    const out = match.plan.beats.find((b) => b.type === 'elimination');
    const thrower = match.wrestlers[out.thrower];
    let walk0 = null;
    let walk1 = null;
    let heading0 = null;
    let heading1 = null;
    let unwrapped = 0;
    let prev = null;
    run(match, hz, out.landAt + 1.5, (m) => {
      if (walk0 === null && m.t >= out.start) walk0 = thrower.walk;
      if (walk1 === null && m.t >= out.grappleAt - 0.01) walk1 = thrower.walk;
      if (m.t >= out.landAt + 0.25) {
        if (prev !== null) unwrapped += Math.atan2(Math.sin(thrower.heading - prev), Math.cos(thrower.heading - prev));
        if (heading0 === null) heading0 = m.t;
        prev = thrower.heading;
        heading1 = m.t;
      }
    });
    return { hz, stride: walk1 - walk0, turnRate: unwrapped / (heading1 - heading0) };
  });
  const [slow, ref, fast] = results;
  for (const r of [slow, fast]) {
    assert.ok(Math.abs(r.stride - ref.stride) / ref.stride < 0.05, `stride phase at ${r.hz}/s: ${r.stride.toFixed(2)} vs ${ref.stride.toFixed(2)} at 60/s`);
    assert.ok(Math.abs(r.turnRate - ref.turnRate) < 0.05, `turn at ${r.hz}/s: ${r.turnRate.toFixed(2)} vs ${ref.turnRate.toFixed(2)} rad/s`);
  }
  assert.ok(Math.abs(ref.turnRate - 2.4) < 0.05, `Duryodhana turns at ${ref.turnRate.toFixed(2)} rad/s`);
});

// ---------------------------------------------------------------- #100 room for every fight, #97 moves

test('fights spread out round the ring, partners stay in reach, and the brawls use the whole move set', () => {
  for (const seed of [17, 9]) {
    const match = new WrestleMatch(names(12), { rng: mulberry32(seed), modelStyle: 'classic' });
    const moves = new Set();
    let samples = 0;
    let crowded = 0;
    let reach = 0;
    let pairs = 0;
    let flanks = 0;
    let flankFrames = 0;
    let frame = 0;
    run(match, 60, match.plan.duration, (m) => {
      frame++;
      const inRing = m.wrestlers.filter((w) => !w.out);
      for (const w of inRing) if (w.fight) moves.add(w.fight.move);
      const fights = [];
      for (const w of inRing) {
        const o = w.foe === null ? null : m.wrestlers[w.foe];
        if (w.mode !== 'roam' || !o) continue;
        if (o.foe === w.id && w.id < o.id) {
          fights.push({ x: (w.x + o.x) / 2, z: (w.z + o.z) / 2 });
          if (o.fight?.move !== 'rebound' && o.fight?.move !== 'close') {
            reach += Math.hypot(w.x - o.x, w.z - o.z);
            pairs++;
          }
        } else if (o.foe !== w.id && o.foe !== null) {
          // Two on one, from the side: never stacked on the one they're helping.
          const p = m.wrestlers[o.foe];
          flankFrames++;
          if (Math.hypot(w.x - p.x, w.z - p.z) > 1.2) flanks++;
        }
      }
      // No two wrestlers who aren't holding each other ever overlap.
      for (let i = 0; i < inRing.length; i++) {
        for (let j = i + 1; j < inRing.length; j++) {
          const [a, b] = [inRing[i], inRing[j]];
          if (a.mode === 'roam' && b.mode === 'roam' && !(a.fight && a.fight === b.fight)) {
            assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > 0.9, `seed ${seed}: ${a.kind.id} and ${b.kind.id} overlap at ${m.t.toFixed(2)}`);
          }
        }
      }
      if (fights.length >= 3) {
        for (const f of fights) {
          samples++;
          if (fights.some((g) => g !== f && Math.hypot(g.x - f.x, g.z - f.z) < 2.5)) crowded++;
        }
      }
      if (frame % 6 === 0) {
        for (const w of inRing) {
          if (Math.abs(w.x) < HALF && Math.abs(w.z) < HALF) {
            const low = lowestBodyPoint(w.rig);
            assert.ok(low >= MAT_Y - 0.03, `seed ${seed}: ${w.kind.id} through the mat at ${m.t.toFixed(2)} (${w.moveKey})`);
          }
        }
      }
    });
    assert.ok(crowded / samples < 0.15, `seed ${seed}: ${((100 * crowded) / samples).toFixed(0)}% of fights within 2.5 of another`);
    assert.ok(reach / pairs < 1.5, `seed ${seed}: partners ${(reach / pairs).toFixed(2)} apart on average`);
    if (flankFrames) assert.ok(flanks / flankFrames > 0.9, `seed ${seed}: two on one from the side ${flanks}/${flankFrames}`);
    for (const move of ['lockup', 'strikes', 'shove', 'circle', 'stagger', 'reversal', 'rebound', 'slam']) {
      assert.ok(moves.has(move), `seed ${seed}: no ${move} in a twelve-wrestler match (${[...moves].join(', ')})`);
    }
  }
});
