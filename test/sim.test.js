import test from 'node:test';
import assert from 'node:assert/strict';
import { RaceSim, generateCourse, rollItem, mulberry32, shuffle, OBSTACLE_TYPES, ITEM_TYPES, TUNING } from '../public/js/sim.js';

const DT = 1 / 30;

function names(n) {
  return Array.from({ length: n }, (_, i) => `Racer ${i + 1}`);
}

function runRace(n, seed, { maxTime = 400 } = {}) {
  const sim = new RaceSim({ names: names(n), rng: mulberry32(seed) });
  const events = [];
  while (!sim.done && sim.time < maxTime) {
    sim.step(DT);
    events.push(...sim.drainEvents());
  }
  return { sim, events };
}

test('course contains every obstacle type and stays on the track', () => {
  for (let seed = 1; seed <= 25; seed++) {
    const { obstacles, crates } = generateCourse(mulberry32(seed));
    const types = new Set(obstacles.map((o) => o.type));
    for (const type of OBSTACLE_TYPES) assert.ok(types.has(type), `seed ${seed} is missing ${type}`);
    for (const o of obstacles) {
      assert.ok(o.sMin > 40, 'no obstacle on the starting grid');
      assert.ok(o.sMax < TUNING.trackLength - 15, 'no obstacle on the finish line');
      assert.ok(o.dMin >= -TUNING.halfWidth - 0.01 && o.dMax <= TUNING.halfWidth + 0.01, `${o.type} is inside the track`);
    }
    assert.ok(crates.length >= 25, 'plenty of item crates');
    for (let i = 1; i < obstacles.length; i++) assert.ok(obstacles[i].sMin >= obstacles[i - 1].sMin, 'sorted by distance');
  }
});

test('every race finishes with exactly one winner and unique places', () => {
  for (const n of [1, 2, 3, 7, 14, 30]) {
    for (let seed = 1; seed <= 6; seed++) {
      const { sim } = runRace(n, seed * 97 + n);
      assert.ok(sim.done, `race with ${n} racers (seed ${seed}) finished`);
      assert.ok(sim.winner, 'has a winner');
      assert.ok(names(n).includes(sim.winner.name), 'winner is one of the entrants');
      assert.equal(sim.winner.place, 1);
      const places = sim.racers.map((r) => r.place).sort((a, b) => a - b);
      assert.deepEqual(places, Array.from({ length: n }, (_, i) => i + 1));
      assert.equal(sim.standings()[0], sim.winner, 'standings lead with the winner');
      assert.ok(sim.winnerTime > 90 && sim.winnerTime < 160, `about two minutes at 1x (${sim.winnerTime.toFixed(1)}s)`);
    }
  }
});

test('the same seed replays the same race; different seeds differ', () => {
  const a = runRace(10, 4242).sim;
  const b = runRace(10, 4242).sim;
  assert.equal(a.winner.name, b.winner.name);
  assert.equal(a.winnerTime, b.winnerTime);
  const winners = new Set();
  for (let seed = 0; seed < 30; seed++) winners.add(runRace(10, seed).sim.winner.name);
  assert.ok(winners.size >= 5, `expected a variety of winners, got ${winners.size}`);
});

test('racers stay inside the track and never go faster than the best boost allows', () => {
  const sim = new RaceSim({ names: names(30), rng: mulberry32(7) });
  const limit = TUNING.halfWidth - 1 + 1e-6;
  while (!sim.done && sim.time < 400) {
    sim.step(DT);
    for (const r of sim.racers) {
      assert.ok(Math.abs(r.d) <= limit || r.stun?.kind === 'loop', `racer left the track: d=${r.d}`);
      assert.ok(r.v <= TUNING.baseSpeed * TUNING.maxSpeedFactor + 1e-9, `racer too fast: ${r.v}`);
      assert.ok(Number.isFinite(r.s) && Number.isFinite(r.d));
    }
  }
  assert.ok(sim.done);
});

test('a typical race lasts about two minutes at 1x speed', () => {
  let total = 0;
  const runs = 10;
  for (let seed = 1; seed <= runs; seed++) total += runRace(12, seed * 101).sim.winnerTime;
  const average = total / runs;
  assert.ok(average > 105 && average < 135, `average winning time ${average.toFixed(1)}s`);
});

test('races are eventful: obstacles hit, items picked up and used', () => {
  const causes = new Set();
  const used = new Set();
  let pickups = 0;
  for (let seed = 1; seed <= 12; seed++) {
    const { events } = runRace(12, seed * 31);
    for (const e of events) {
      if (e.type === 'hit') causes.add(e.cause);
      if (e.type === 'zone') causes.add(e.obstacle.type);
      if (e.type === 'use') used.add(e.item);
      if (e.type === 'pickup') pickups++;
    }
  }
  for (const type of OBSTACLE_TYPES) assert.ok(causes.has(type), `${type} never affected anyone`);
  for (const item of ITEM_TYPES) assert.ok(used.has(item), `${item} was never used`);
  assert.ok(pickups > 100, `expected lots of pickups, got ${pickups}`);
});

test('a firewall blocks exactly one hit', () => {
  const sim = new RaceSim({ names: names(2), rng: mulberry32(1) });
  const r = sim.racers[0];
  r.shield = 10;
  assert.equal(sim.applyHit(r, 'spin', 'brokenLink'), false);
  assert.equal(r.stun, null);
  assert.equal(r.shield, 0);
  assert.equal(sim.applyHit(r, 'spin', 'brokenLink'), true);
  assert.equal(r.stun.kind, 'spin');
  assert.equal(sim.drainEvents().filter((e) => e.type === 'block').length, 1);
});

test('a Renewed Certificate gives immunity to SSL Expired until it runs out', () => {
  const sim = new RaceSim({ names: names(2), rng: mulberry32(3) });
  const [a, b] = sim.racers;
  const gate = (id) => ({ id, type: 'sslExpired' });

  sim.triggerObstacle(a, gate(9001));
  assert.equal(a.stun.kind, 'cert', 'without a certificate the warning page stops you');

  b.item = 'renewedCert';
  b.itemDelay = 0;
  sim.updateItems(b, 0.1, 0);
  assert.equal(b.item, null);
  assert.equal(b.certT, TUNING.certDuration);
  sim.triggerObstacle(b, gate(9002));
  sim.triggerObstacle(b, gate(9003));
  assert.equal(b.stun, null, 'the certificate covers every checkpoint while valid');
  assert.ok(sim.canPass(b, gate(9004)));
  assert.equal(sim.drainEvents().filter((e) => e.type === 'pass' && e.item === 'renewedCert').length, 2);

  // It does nothing for the barricade, and it expires.
  assert.equal(sim.canPass(b, { id: 1, type: 'urlBarricade' }), false);
  b.certT = 0;
  sim.triggerObstacle(b, gate(9005));
  assert.equal(b.stun.kind, 'cert');
});

test('?returnUrl= passes exactly one DO NOT MODIFY URLS barricade', () => {
  const sim = new RaceSim({ names: names(2), rng: mulberry32(4) });
  const [a, b] = sim.racers;
  const barricade = (id) => ({ id, type: 'urlBarricade' });

  sim.triggerObstacle(a, barricade(9001));
  assert.equal(a.stun.kind, 'errorPit');
  assert.ok(a.stun.dur >= 2 && a.stun.dur <= 4, 'the error pit holds you for a few seconds');

  b.item = 'returnUrl';
  b.itemDelay = 0;
  sim.updateItems(b, 0.1, 0);
  assert.equal(b.returnUrl, true);
  assert.equal(sim.canPass(b, { id: 1, type: 'sslExpired' }), false, 'it is no help with SSL Expired');
  sim.triggerObstacle(b, barricade(9002));
  assert.equal(b.stun, null);
  assert.equal(b.returnUrl, false, 'used up by the barricade');
  sim.triggerObstacle(b, barricade(9003));
  assert.equal(b.stun.kind, 'errorPit');
  assert.equal(sim.drainEvents().filter((e) => e.type === 'pass' && e.item === 'returnUrl').length, 1);
});

test('passes are used during real races', () => {
  const passed = new Set();
  for (let seed = 1; seed <= 20; seed++) {
    for (const e of runRace(12, seed * 53).events) if (e.type === 'pass') passed.add(e.item);
  }
  assert.ok(passed.has('renewedCert'), 'a renewed certificate never got anyone through');
  assert.ok(passed.has('returnUrl'), 'a ?returnUrl= never got anyone through');
});

test('item odds favour trailing racers', () => {
  const rng = mulberry32(99);
  const count = (fraction) => {
    const tally = Object.fromEntries(ITEM_TYPES.map((k) => [k, 0]));
    for (let i = 0; i < 4000; i++) tally[rollItem(fraction, rng)]++;
    return tally;
  };
  const leader = count(0);
  const last = count(1);
  assert.equal(leader.bug, 0, 'leader has nobody to throw a bug at');
  assert.equal(leader.forcePush, 0);
  assert.equal(leader.breeze, 0);
  assert.ok(last.forcePush > 0 && last.breeze > last.coffee * 0.5);
});

test('list order gives no advantage (wins are spread across positions)', () => {
  const n = 6;
  const races = 600;
  const wins = new Array(n).fill(0);
  const roster = names(n);
  for (let seed = 0; seed < races; seed++) {
    const sim = new RaceSim({ names: roster, rng: mulberry32(seed * 7919 + 13) });
    while (!sim.done && sim.time < 400) sim.step(DT);
    wins[roster.indexOf(sim.winner.name)]++;
  }
  const expected = races / n;
  // Chi-square with 5 degrees of freedom: 20.5 is the 0.1% critical value.
  const chi2 = wins.reduce((sum, w) => sum + (w - expected) ** 2 / expected, 0);
  assert.ok(chi2 < 20.5, `win distribution looks biased: ${wins.join(', ')} (chi2=${chi2.toFixed(1)})`);
});

test('shuffle keeps every element', () => {
  const input = names(30);
  const out = shuffle(input, mulberry32(5));
  assert.equal(out.length, 30);
  assert.deepEqual([...out].sort(), [...input].sort());
  assert.notDeepEqual(out, input);
});
