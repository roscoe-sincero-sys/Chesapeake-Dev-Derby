// The 3D match itself, run headless (#95–#100): camera framing, smooth limbs, frame-rate independence,
// room between fights and the wider move set. Canvas drawing is a no-op here (see headless.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { loadHdAssets } from './headless.js';
import { WrestleMatch } from '../public/js/wrestle.js';
import { planMatch, WRESTLER_KINDS, PACE } from '../public/js/wrestle-sim.js';
import { lowestBodyPoint, eachVertex } from '../public/js/wrestlers.js';
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
  let lastOverflow = -Infinity;
  run(match, 60, match.plan.duration + 3, (m) => {
    const p = m.camera.position;
    const radius = Math.hypot(p.x, p.z);
    const angle = Math.atan2(p.z, p.x);
    if (m.t > 4.6 && m.t < final.start) {
      assert.ok(Math.abs(radius - 16) < 1e-6, `t=${m.t.toFixed(2)}: orbit radius ${radius}`);
      assert.ok(Math.abs(p.y - 9) < 1e-6, `t=${m.t.toFixed(2)}: height ${p.y}`);
      const speed = Math.atan2(Math.sin(angle - last.angle), Math.cos(angle - last.angle)) * 60;
      assert.ok(Math.abs(speed - 0.12) < 1e-6, `t=${m.t.toFixed(2)}: orbit speed ${speed}`);
      // It only turns towards the action, a bounded amount from the centre of the ring, unless a throw
      // is too close under it to fit in the picture (then it turns further, and eases back after).
      if (m.overflow > 0) lastOverflow = m.t;
      if (m.t - lastOverflow > 2) assert.ok(Math.hypot(m.camLook.x, m.camLook.z) <= 3.2 + 0.05, `t=${m.t.toFixed(2)}: aim strays`);
    }
    // Into the final two and the victory: gradually, never a sudden push in.
    if (last && m.t > 4.6) maxRadiusRate = Math.max(maxRadiusRate, Math.abs(radius - last.radius) * 60);
    last = { radius, angle };
  });
  assert.ok(maxRadiusRate < 2, `camera distance changes by up to ${maxRadiusRate.toFixed(2)} units/s`);
});

/**
 * How big the middle of the ring looks on screen (lens and distance together), tracked over the match:
 * returns the largest change of that scale within any quarter-second, as a fraction (#95: no sudden zoom).
 */
function zoomTracker(hz = 60) {
  const history = [];
  let worst = { change: 0 };
  return {
    frame(m) {
      const p = m.camera.position;
      const scale = 1 / (Math.tan((m.camera.fov * Math.PI) / 360) * Math.hypot(p.x, p.y - MAT_Y, p.z));
      history.push(scale);
      if (history.length > hz / 4 + 1) history.shift();
      if (m.t > 5) {
        for (const earlier of history) {
          const change = Math.abs(Math.log(scale / earlier));
          if (change > worst.change) worst = { change, t: m.t.toFixed(2), fov: m.camera.fov.toFixed(1) };
        }
      }
    },
    get worst() {
      return worst;
    },
  };
}

/**
 * Every frame from the throw until the thrown wrestler has sat up: the top rope they go over, the
 * landing area (with the slide) and the whole of their body must be in the picture. Returns misses.
 */
function framingMisses(match, { until = match.plan.duration, only = () => true, every = 1, onFrame = () => {} } = {}) {
  const v = new THREE.Vector3();
  const box = new THREE.Box3();
  const missed = [];
  let frame = 0;
  let checks = 0;
  run(match, 60, until, (m) => {
    onFrame(m);
    if (++frame % every) return;
    m.camera.updateMatrixWorld();
    for (const b of m.actions) {
      if (b.type !== 'elimination' || m.t < b.throwAt || m.t > b.landAt + 1.5 || !only(b)) continue;
      const f = m.sideFrame(b.side, b.spot);
      const victim = m.wrestlers[b.victim];
      const corners = [];
      for (const along of [b.spot - 0.6, b.spot + 0.6]) {
        const rope = f.at(HALF, along);
        corners.push(['rope', rope.x, MAT_Y + 1.55, rope.z]);
        for (const inward of [HALF + 2.7, HALF + 3.4]) {
          const p = f.at(inward, along);
          corners.push(['landing', p.x, 0, p.z]);
        }
      }
      box.setFromObject(victim.rig.root, true);
      for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) corners.push(['body', x, y, z]);
      for (const [what, x, y, z] of corners) {
        checks++;
        v.set(x, y, z).project(m.camera);
        if (Math.abs(v.x) > 1 || Math.abs(v.y) > 1) missed.push(`${what}@${m.t.toFixed(2)}${b.together ? ' (two at once)' : ''}`);
      }
    }
  });
  assert.ok(checks > 100, 'the framing was actually checked');
  return missed;
}

test('each ring-out stays in the picture through the bounce, and the shot never zooms suddenly', () => {
  // Wide (960 × 600), portrait (0.6) and a narrow phone (368 × 800), with isolated and paired ring-outs.
  for (const [aspect, seed] of [[1.6, 17], [1.6, 8], [0.6, 17], [0.6, 4], [368 / 800, 9]]) {
    const match = new WrestleMatch(names(12), { rng: mulberry32(seed), modelStyle: 'classic' });
    match.resize(aspect);
    const zoom = zoomTracker();
    const missed = framingMisses(match, { until: match.plan.duration + 3, onFrame: (m) => zoom.frame(m) });
    assert.deepEqual(missed, [], `aspect ${aspect.toFixed(2)}, seed ${seed}: out of the picture ${missed.length}× (${missed.slice(0, 4).join(', ')})`);
    // The lens widens for a throw over the approach and eases back after: under 7% in any quarter-second.
    assert.ok(zoom.worst.change < Math.log(1.07), `aspect ${aspect.toFixed(2)}, seed ${seed}: the picture's scale changes ${(100 * (Math.exp(zoom.worst.change) - 1)).toFixed(1)}% in a quarter-second at ${zoom.worst.t} s (lens ${zoom.worst.fov}°)`);
  }
});

test('HD: the final landing stays in the picture under the closer final-two orbit (960 × 600, seed 8)', async () => {
  await loadHdAssets();
  const match = new WrestleMatch(names(12), { rng: mulberry32(8), modelStyle: 'hd' });
  match.resize(960 / 600);
  const zoom = zoomTracker();
  const missed = framingMisses(match, { only: (b) => b.final, every: 2, onFrame: (m) => zoom.frame(m) });
  assert.deepEqual(missed, [], `out of the picture ${missed.length}× (${missed.slice(0, 4).join(', ')})`);
  assert.ok(zoom.worst.change < Math.log(1.07), `the picture's scale changes ${(100 * (Math.exp(zoom.worst.change) - 1)).toFixed(1)}% in a quarter-second at ${zoom.worst.t} s`);
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
  const moves = new Set();
  let bounces = 0;
  let lifted = 0; // highest a slammed defender was shown off the mat
  let slamLandings = 0;
  for (const seed of [17, 9]) {
    const stages = new WeakMap(); // each fight's move stage last update
    const match = new WrestleMatch(names(12), { rng: mulberry32(seed), modelStyle: 'classic' });
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
      for (const w of inRing) {
        const f = w.fight;
        if (!f || w !== f.by) continue;
        const def = m.wrestlers[w.foe];
        const was = stages.get(f);
        stages.set(f, `${f.n}:${f.m.stage}`);
        if (f.move === 'slam' && f.m.stage === 'lift') lifted = Math.max(lifted, def.rig.root.position.y - MAT_Y);
        if (f.move === 'slam' && f.m.stage === 'down' && def.landed && !f.m.checked) {
          f.m.checked = true;
          // Down on the mat after the lift: resting on it, not hovering.
          const low = lowestBodyPoint(def.rig);
          assert.ok(Math.abs(low - MAT_Y) < 0.05, `seed ${seed}: slammed ${def.kind.id} rests at ${low.toFixed(3)}`);
          slamLandings++;
        }
        if (f.move === 'rebound' && f.m.stage === 'bounce' && was === `${f.n}:out`) {
          // The bounce starts with their back on the ropes.
          const inside = HALF - Math.max(Math.abs(w.x), Math.abs(w.z));
          assert.ok(inside < 0.65, `seed ${seed}: ${w.kind.id} bounces ${inside.toFixed(2)} inside the ropes at ${m.t.toFixed(2)}`);
          bounces++;
        }
      }
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
  }
  // The slam's lift shows on screen (the defender is hoisted across the chest, not tipped over on the mat).
  assert.ok(lifted > 0.8, `slammed defenders lifted at most ${lifted.toFixed(2)} off the mat`);
  assert.ok(slamLandings > 0, 'a slam lands');
  assert.ok(bounces > 0, 'someone rebounds off the ropes');
  for (const move of ['lockup', 'strikes', 'shove', 'circle', 'stagger', 'reversal', 'rebound', 'slam']) {
    assert.ok(moves.has(move), `no ${move} in two twelve-wrestler matches (${[...moves].join(', ')})`);
  }
});

// ---------------------------------------------------------------- #105 over the top rope, not through it

/**
 * Follows every vertex of each thrown wrestler's body (every other one) from the throw to the landing:
 * none may cross the line of the ropes below the top of the top rope, or touch that rope. Returns, per
 * throw, the thrower, victim, smallest clearance and any crossings; and whether each landed at ringside.
 */
function ropeCrossings(match, until, only = () => true) {
  const plane = HALF + 0.1;
  const top = MAT_Y + 1.55 + 0.05; // the top rope's top
  const throws = new Map();
  run(match, 60, until, (m) => {
    for (const b of m.actions) {
      if (b.type !== 'elimination' || m.t < b.throwAt || !only(b)) continue;
      const v = m.wrestlers[b.victim];
      const f = m.sideFrame(b.side, b.spot);
      const r = throws.get(b) ?? { label: `${m.wrestlers[b.thrower].kind.id} throws ${v.kind.id} at ${b.throwAt.toFixed(1)}s`, clearance: Infinity, through: [], prev: null, landed: null };
      throws.set(b, r);
      if (m.t > b.landAt) {
        r.landed ??= v.x * f.nx + v.z * f.nz;
        continue;
      }
      const now = [];
      let i = 0;
      eachVertex(v.rig, 2, true, (p) => {
        const out = p.x * f.nx + p.z * f.nz;
        now.push(out, p.y);
        const before = r.prev && [r.prev[i], r.prev[i + 1]];
        i += 2;
        if (Math.abs(p.x * f.ux + p.z * f.uz) > HALF + 0.15) return; // past the end of the rope
        if (Math.hypot(out - plane, p.y - (top - 0.05)) < 0.05) r.through.push(`touch@${m.t.toFixed(2)}`);
        if (before && before[0] < plane && out >= plane) {
          const y = before[1] + ((plane - before[0]) / (out - before[0])) * (p.y - before[1]);
          r.clearance = Math.min(r.clearance, y - top);
          if (y < top) r.through.push(`cross@${m.t.toFixed(2)}`);
        }
      });
      r.prev = now;
    }
  });
  return [...throws.values()];
}

test('HD: thrown wrestlers clear the top rope from entry to exit, and land at ringside', async () => {
  await loadHdAssets();
  // Seed 17: Satyaki's rope rebound on Hidimbi, then two hip tosses (Karna, Shikhandi).
  const match = new WrestleMatch(names(12), { rng: mulberry32(17), modelStyle: 'hd' });
  const outs = [];
  match.onEvent = (e) => e.type === 'out' && outs.push(e);
  const firstThree = match.plan.beats.filter((b) => b.type === 'elimination').slice(0, 3);
  const results = ropeCrossings(match, firstThree.at(-1).landAt + 0.2, (b) => firstThree.includes(b));
  // An overhead toss (Bhima, Ghatotkacha) and both stature extremes as the one thrown.
  for (const [thrower, victim] of [['bhima', 'ghatotkacha'], ['ghatotkacha', 'abhimanyu'], ['kichaka', 'hidimbi'], ['karna', 'ghatotkacha']]) {
    const d = duel(thrower, victim, 5, 'hd');
    results.push(...ropeCrossings(d, d.plan.duration + 0.2));
  }
  assert.equal(results.length, 7);
  for (const r of results) {
    assert.deepEqual(r.through, [], `${r.label}: through the rope ${r.through.length}x (${r.through.slice(0, 3).join(', ')})`);
    assert.ok(r.clearance > 0.05, `${r.label}: clears the top rope by ${r.clearance.toFixed(3)}`);
    assert.ok(r.landed > HALF + 2, `${r.label}: lands at ringside (${r.landed?.toFixed(2)} from the middle)`);
  }
  assert.equal(outs[0].move, 'rebound', 'seed 17 opens with Satyaki coming off the ropes');
});

// ---------------------------------------------------------------- #104 the slam is held, hands on the body

test("HD body slams: the lifter's hands stay on the body through the hold, then a grounded landing", async () => {
  await loadHdAssets();
  // Both base bodies, the tallest and smallest characters, each way round.
  for (const [lifter, lifted] of [['jarasandha', 'bhima'], ['ghatotkacha', 'abhimanyu'], ['abhimanyu', 'ghatotkacha'], ['hidimbi', 'bhima'], ['bhima', 'hidimbi']]) {
    const match = forcedSlam(lifter, lifted, 'hd');
    const [a, b] = match.wrestlers;
    const f = a.fight;
    let held = 0;
    let reach = 0;
    let highest = 0;
    let grounded = null;
    while (a.fight === f && f.t < f.dur) {
      match.update(1 / 60);
      highest = Math.max(highest, b.rig.root.position.y - MAT_Y);
      if (f.m.stage === 'hold') {
        held++;
        for (const hand of match.hands(a)) {
          let near = Infinity;
          eachVertex(b.rig, 2, false, (p) => { near = Math.min(near, p.distanceTo(hand)); });
          reach = Math.max(reach, near);
        }
      }
      if (f.m.stage === 'down' && b.landed && grounded === null) grounded = lowestBodyPoint(b.rig);
    }
    assert.ok(held >= 8, `${lifter} lifts ${lifted}: held for ${held} updates`);
    // From the wrist joint to the nearest point of the body: the hand itself spans about 0.1 of that.
    assert.ok(reach < 0.25, `${lifter} lifts ${lifted}: a wrist is ${reach.toFixed(2)} from the body while holding`);
    assert.ok(highest > 0.8, `${lifter} lifts ${lifted}: lifted ${highest.toFixed(2)} off the mat`);
    assert.ok(Math.abs(grounded - MAT_Y) < 0.05, `${lifter} slams ${lifted}: lands resting on the mat (${grounded?.toFixed(3)})`);
  }
});

/** A two-wrestler match, run until they lock up, then the first starts a body slam on the second. */
function forcedSlam(lifter, lifted, modelStyle, hz = 60) {
  const plan = planMatch(['A', 'B'], mulberry32(3));
  plan.wrestlers[0].kind = kind(lifter);
  plan.wrestlers[1].kind = kind(lifted);
  const match = new WrestleMatch(['A', 'B'], { previewPlan: plan, rng: mulberry32(4), modelStyle });
  const [a, b] = match.wrestlers;
  run(match, hz, 1);
  while (!(a.fight && a.fight === b.fight)) match.update(1 / hz);
  Object.assign(a.fight, { move: 'slam', n: a.fight.n + 1, t: 0, dur: 2.75, by: a, m: {} });
  return match;
}

test('body slams drop from where the hold was shown: no jump from the hands into the drop', async () => {
  await loadHdAssets();
  const worst = [];
  // The forced slams, both styles and update rates, then every slam in the seed-17 match.
  const check = (match, label, hz, until) => {
    const last = new Map();
    let jump = 0;
    let handoffs = 0;
    run(match, hz, until, (m) => {
      for (const b of m.wrestlers) {
        const f = b.fight;
        if (f?.move !== 'slam' || f.by === b) {
          last.delete(b);
          continue;
        }
        const p = b.rig.root.position.clone();
        const before = last.get(b);
        if (before?.stage === 'hold' && f.m.stage === 'slam') {
          handoffs++;
          // Falling from rest: the first update of the drop lowers it a centimetre or so, not a body's depth.
          jump = Math.max(jump, Math.abs(p.y - before.p.y) - 0.02 * (60 / hz) ** 2);
        }
        last.set(b, { p, stage: f.m.stage });
      }
    });
    worst.push(`${label} @${hz}: ${handoffs} handoffs, worst ${jump.toFixed(3)}`);
    assert.ok(handoffs >= 1, `${label} @${hz}: a slam reached the drop`);
    assert.ok(jump <= 0, `${label} @${hz}: the slammed body drops ${jump.toFixed(3)} more than falling from rest at the handoff`);
  };
  for (const modelStyle of ['hd', 'classic']) {
    for (const hz of [30, 60]) {
      check(forcedSlam('jarasandha', 'bhima', modelStyle, hz), `${modelStyle} jarasandha slams bhima`, hz, 5);
      check(new WrestleMatch(names(12), { rng: mulberry32(17), modelStyle }), `${modelStyle} seed 17`, hz, 20);
    }
  }
});

// ---------------------------------------------------------------- #106 Satyaki's rope rebound

test("Satyaki's facing turns smoothly from the run out, off the ropes, through the tackle, at 30 and 60 updates/s", async () => {
  await loadHdAssets();
  for (const modelStyle of ['hd', 'classic']) {
    for (const hz of [30, 60]) {
      const match = new WrestleMatch(names(12), { rng: mulberry32(17), modelStyle });
      const outs = [];
      match.onEvent = (e) => e.type === 'out' && outs.push(e);
      const b = match.plan.beats.find((x) => x.type === 'elimination');
      const h = match.wrestlers[b.thrower];
      assert.equal(h.kind.style, 'rebound', 'seed 17 opens with a Satyaki ring-out');
      let prev = null;
      let worst = { turn: 0 };
      let nearest = Infinity;
      run(match, hz, b.landAt + 0.5, (m) => {
        if (m.t < b.start) return;
        if (prev !== null && m.t < b.throwAt + PACE.throw) {
          const turn = Math.abs(Math.atan2(Math.sin(h.heading - prev), Math.cos(h.heading - prev))) * (180 / Math.PI);
          if (turn > worst.turn) worst = { turn, at: (m.t - b.start).toFixed(2) };
        }
        if (m.t < b.throwAt) nearest = Math.min(nearest, HALF - Math.max(Math.abs(h.x), Math.abs(h.z)));
        prev = h.heading;
      });
      assert.equal(outs[0]?.move, 'rebound', `${modelStyle} @${hz}: the rope rebound plays`);
      assert.ok(nearest < 0.6, `${modelStyle} @${hz}: he reaches the ropes (${nearest.toFixed(2)} inside)`);
      // At most 400 degrees a second: a quick turn, never a snap from one update to the next.
      assert.ok(worst.turn <= 400 / hz, `${modelStyle} @${hz}: turns ${worst.turn.toFixed(1)} degrees in one update, ${worst.at}s in`);
    }
  }
});

test('Satyaki comes off the ropes for a ring-out when there is room, and the feed says what he did', async () => {
  const { throwText } = await import('../public/js/hud.js');
  let rebounds = 0;
  let standard = 0;
  let pairedRebound = 0;
  let pairedStandard = 0;
  for (const seed of [17, 1, 2, 6]) {
    const match = new WrestleMatch(names(12), { rng: mulberry32(seed), modelStyle: 'classic' });
    const outs = [];
    match.onEvent = (e) => e.type === 'out' && outs.push(e);
    const nearest = new Map(); // Satyaki's closest approach to a rope before each of his throws
    run(match, 60, match.plan.duration + 0.1, (m) => {
      for (const b of m.actions) {
        const h = m.wrestlers[b.thrower];
        if (b.type !== 'elimination' || h.kind.style !== 'rebound' || m.t >= b.throwAt || m.t < b.start + 0.05) continue;
        nearest.set(b, Math.min(nearest.get(b) ?? Infinity, HALF - Math.max(Math.abs(h.x), Math.abs(h.z))));
      }
    });
    assert.deepEqual(outs.map((e) => e.victim.id), match.plan.order.slice(0, -1), `seed ${seed}: the elimination order plays out`);
    for (const [b, inside] of nearest) {
      const e = outs.find((o) => o.victim.id === b.victim);
      const text = throwText(e);
      if (e.move === 'rebound') {
        assert.ok(inside < 0.6, `seed ${seed}: Satyaki reaches the ropes before the tackle (${inside.toFixed(2)} inside)`);
        assert.match(text, /came off the ropes/);
        rebounds++;
        if (b.together) pairedRebound++;
      } else {
        assert.doesNotMatch(text, /off the ropes/, `seed ${seed}: no rope rebound shown, none in the feed`);
        standard++;
        if (b.together) pairedStandard++;
      }
    }
  }
  assert.ok(rebounds >= 2 && standard >= 1, `rebounds ${rebounds}, standard throws ${standard}`);
  assert.ok(pairedRebound >= 1 && pairedStandard >= 1, `paired: ${pairedRebound} rebounds, ${pairedStandard} without room`);
});

// ---------------------------------------------------------------- #107 callouts clear of the roster

test('ring-out callouts stay on screen, beside or below the roster rather than covering it', async () => {
  const { calloutPlacement } = await import('../public/js/hud.js');
  const rect = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height });
  // A callout of `chars` characters at `font` px: wrapped to the width it's given, padded, scaled.
  const text = (chars, font) => (maxWidth, scale) => {
    const f = font * scale;
    const line = chars * 0.55 * f;
    const lines = Math.ceil(line / (maxWidth - 48));
    return { width: Math.min(maxWidth, line + 48), height: lines * f * 1.2 + 24 };
  };
  const inside = (p, size, view) => p.y >= 0 && p.y + size.height <= view.height
    && p.x - size.width / 2 >= 0 && p.x + size.width / 2 <= view.width;
  const apart = (p, size, r) => p.x + size.width / 2 <= r.left || p.x - size.width / 2 >= r.right
    || p.y + size.height <= r.top || p.y >= r.bottom;

  // 390 x 844 phone: the folded roster count at the top left, Mute and Quit at the top right; a short
  // callout at 20% sits clear of them.
  const phone = { width: 390, height: 844 };
  const chip = rect(12, 12, 170, 30);
  const tools = (view) => [rect(view.width - 150, 12, 44, 36), rect(view.width - 98, 12, 86, 36)];
  assert.equal(calloutPlacement([chip, ...tools(phone)], rect(16, 120, 358, 120), phone, text(20, 31)), null);
  // Two 34-character names (82 characters) up against the controls: a wide banner below them all, not
  // the names broken up down the narrow strip beside the count.
  const pair = text(82, 31);
  const folded = calloutPlacement([chip, ...tools(phone)], rect(16, 30, 358, 240), phone, pair);
  const foldedSize = pair(folded.maxWidth, folded.scale);
  assert.ok(folded.maxWidth > 350 && folded.y >= 48 + 10 && inside(folded, foldedSize, phone), JSON.stringify(folded));
  // Over the opened roster, it goes below it.
  const open = rect(12, 52, 300, 360);
  const below = calloutPlacement([open, ...tools(phone)], rect(16, 120, 358, 120), phone, text(20, 31));
  assert.ok(below.y >= open.bottom && inside(below, text(20, 31)(below.maxWidth, below.scale), phone), JSON.stringify(below));
  // A short landscape screen (844 x 390), roster open: the message wraps in the room beside the roster,
  // below the toolbar, all of it on screen, at full size.
  const land = { width: 844, height: 390 };
  const openLand = rect(12, 52, 320, 240);
  const landPair = text(82, 35);
  const blocks = [openLand, ...tools(land)];
  const p = calloutPlacement(blocks, rect(16, 40, 812, 160), land, landPair);
  const size = landPair(p.maxWidth, p.scale);
  assert.ok(inside(p, size, land) && blocks.every((b) => apart(p, size, b)) && p.scale === 1, JSON.stringify({ p, size }));
  // Placed in portrait, then turned: placed again from the new screen, never left below it.
  const turned = calloutPlacement(blocks, rect(16, 422, 812, 160), land, landPair);
  assert.ok(inside(turned, landPair(turned.maxWidth, turned.scale), land), JSON.stringify(turned));
  // Off the bottom of the screen with no roster or toolbar showing (results open): brought back on.
  const back = calloutPlacement([], rect(16, 300, 812, 160), land, landPair);
  assert.ok(inside(back, landPair(back.maxWidth, back.scale), land), JSON.stringify(back));
  // Too big for any room at full size: made smaller until it fits.
  const tiny = { width: 320, height: 240 };
  const small = calloutPlacement([chip], rect(10, 20, 300, 400), tiny, text(82, 40));
  assert.ok(small.scale < 1 && inside(small, text(82, 40)(small.maxWidth, small.scale), tiny), JSON.stringify(small));
  // Wide screen with the full roster: a paired callout fits clear of it and of the toolbar.
  const roster = rect(14, 14, 320, 360);
  const desk = { width: 1280, height: 800 };
  const deskBlocks = [roster, ...tools(desk)];
  const clear = calloutPlacement(deskBlocks, rect(290, 120, 700, 80), desk, text(40, 64));
  assert.ok(deskBlocks.every((b) => apart(clear, text(40, 64)(clear.maxWidth, 1), b)) && clear.scale === 1, JSON.stringify(clear));
  // The two landings it announces, mid-screen to the right of the roster (seed 17's first pair at
  // 1280 x 800): a compact banner high up beside the roster, clear of both bodies, rather than a
  // full-size one across them.
  const landings = [rect(780, 300, 150, 100), rect(890, 360, 210, 130)];
  const deskPair = text(82, 64);
  const high = calloutPlacement(deskBlocks, rect(16, 60, 1248, 220), desk, deskPair, { scene: landings });
  const highSize = deskPair(high.maxWidth, high.scale);
  assert.ok([...deskBlocks, ...landings].every((b) => apart(high, highSize, b)), `clear of the landings: ${JSON.stringify({ high, highSize })}`);
  assert.ok(high.y + highSize.height <= 300 && high.scale >= 0.6, `high up, still large: ${JSON.stringify({ high, highSize })}`);
  // With nowhere clear of them at a readable size, the controls still come first.
  const everywhere = [rect(0, 0, 1280, 800)];
  const forced = calloutPlacement(deskBlocks, rect(16, 60, 1248, 220), desk, deskPair, { scene: everywhere });
  assert.ok(deskBlocks.every((b) => apart(forced, deskPair(forced.maxWidth, forced.scale), b)), JSON.stringify(forced));
});

test('landingRects: where the bodies going over the ropes and just landed are on screen', () => {
  const match = new WrestleMatch(names(12), { rng: mulberry32(17), modelStyle: 'classic' });
  match.resize(1280 / 800);
  const b = match.plan.beats.find((x) => x.type === 'elimination');
  run(match, 60, b.throwAt - 1);
  assert.deepEqual(match.landingRects(1280, 800), [], 'nobody before the throw');
  let seen = 0;
  run(match, 60, b.landAt + 2, (m) => {
    const r = m.landingRects(1280, 800).find((x) => x.id === b.victim);
    if (m.t < b.throwAt) return;
    assert.ok(r, `t=${m.t.toFixed(2)}: the one going over`);
    assert.ok(r.right > r.left + 10 && r.bottom > r.top + 10, `t=${m.t.toFixed(2)}: a body-sized box ${JSON.stringify(r)}`);
    seen++;
  });
  assert.ok(seen > 60, `followed for ${seen} updates`);
  run(match, 60, match.wrestlers[b.victim].outTime + 4.1);
  assert.ok(!match.landingRects(1280, 800).some((x) => x.id === b.victim), 'and not for long after landing');
});
