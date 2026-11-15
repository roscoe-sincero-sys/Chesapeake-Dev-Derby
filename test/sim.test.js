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

// ---------------------------------------------------------------- office-politics items (issue #45)

function throwAt(sim, from, target, item) {
  from.item = item;
  from.itemDelay = 0;
  from.s = 100;
  target.s = 110;
  sim.updateItems(from, 0.1, 0.5);
  assert.equal(from.item, null, `${item} was thrown`);
  for (let i = 0; i < 30 && sim.projectiles.length; i++) sim.updateProjectiles(DT);
  return sim.drainEvents();
}

test('You Are Not Being Clear spins the rival ahead out', () => {
  const sim = new RaceSim({ names: names(2), rng: mulberry32(5) });
  const [a, b] = sim.racers;
  const events = throwAt(sim, a, b, 'notClear');
  assert.equal(b.stun.kind, 'spin');
  assert.equal(b.stun.cause, 'notClear');
  assert.equal(b.stun.dur, TUNING.stun.notClear);
  assert.ok(events.some((e) => e.type === 'hit' && e.cause === 'notClear' && e.by === a));
});

test('Eight-Minute Audit locks the rival\'s controls for 8 seconds', () => {
  const sim = new RaceSim({ names: names(2), rng: mulberry32(6) });
  const [a, b] = sim.racers;
  const events = throwAt(sim, a, b, 'audit');
  assert.equal(b.auditT, 8);
  assert.ok(events.some((e) => e.type === 'status' && e.effect === 'audit' && e.by === a));
  // Locked: holds its line even with an obstacle dead ahead, and cannot use its item.
  sim.time = 5;
  b.d = 0;
  b.item = 'coffee';
  b.itemDelay = 0;
  sim.obstacles = [{ id: 7, type: 'mergeConflict', shape: 'rect', s: 125, d: 0, halfLen: 1, sMin: 124, sMax: 126, dMin: -3, dMax: 3, active: true }];
  b.oi = 0;
  b.noticed.set(7, true);
  for (let i = 0; i < 20; i++) sim.updateRacer(b, 0.1);
  assert.equal(b.d, 0, 'did not steer');
  assert.equal(b.item, 'coffee', 'could not use the item');
  // ...until the audit is over.
  for (let i = 0; i < 70; i++) sim.updateRacer(b, 0.1);
  assert.equal(b.auditT, 0);
});

test('Production Roulette reverses the rival\'s steering', () => {
  const sim = new RaceSim({ names: names(2), rng: mulberry32(7) });
  const [a, b] = sim.racers;
  // A merge conflict just ahead, covering the right-hand side of the lane.
  const wall = { id: 7, type: 'mergeConflict', shape: 'rect', s: 125, d: 2, halfLen: 1, sMin: 124, sMax: 126, dMin: -0.5, dMax: 4.5, active: true };
  const steer = () => {
    b.s = 110;
    b.d = 0;
    b.wanderD = 0;
    b.oi = 0;
    sim.obstacles = [wall];
    b.noticed.set(7, true);
    sim.think(b, 11);
    return b.targetD;
  };
  assert.ok(steer() < -2, 'normally steers left, clear of the wall');
  throwAt(sim, a, b, 'roulette');
  assert.equal(b.reverseT, TUNING.rouletteDuration);
  const reversed = steer();
  assert.ok(reversed > 0 && reversed < 4.5, 'reversed: steers right, into the wall');
});

test('Security Theater locks the rival to 12-15 mph', () => {
  const sim = new RaceSim({ names: names(2), rng: mulberry32(8) });
  const [a, b] = sim.racers;
  const events = throwAt(sim, a, b, 'theater');
  const status = events.find((e) => e.type === 'status' && e.effect === 'theater');
  assert.ok(status.mph >= 12 && status.mph <= 15);
  sim.time = 10;
  b.v = 25;
  b.boostT = 3;
  b.boostF = 1.6;
  for (let i = 0; i < 20; i++) sim.updateRacer(b, 0.1);
  const mph = b.v * TUNING.mphPerUnit;
  assert.ok(mph >= 11.9 && mph <= 15.1, `speed ${mph.toFixed(1)} mph`);
  for (let i = 0; i < 60; i++) sim.updateRacer(b, 0.1);
  assert.ok(b.v * TUNING.mphPerUnit > 30, 'back up to speed once it ends');
});

test('a firewall blocks the office-politics items', () => {
  for (const item of ['audit', 'roulette', 'theater', 'notClear']) {
    const sim = new RaceSim({ names: names(2), rng: mulberry32(9) });
    const [a, b] = sim.racers;
    b.shield = 10;
    const events = throwAt(sim, a, b, item);
    assert.ok(events.some((e) => e.type === 'block' && e.by === a), item);
    assert.equal(b.auditT + b.reverseT + b.theaterT, 0, item);
    assert.equal(b.stun, null, item);
  }
});

test('the leader never gets the office-politics items, and they turn up in real races', () => {
  const rng = mulberry32(12);
  for (let i = 0; i < 2000; i++) assert.ok(!['notClear', 'audit', 'roulette', 'theater'].includes(rollItem(0, rng)));
  const landed = new Set();
  for (let seed = 1; seed <= 12; seed++) {
    for (const e of runRace(12, seed * 31).events) {
      if (e.type === 'status') landed.add(e.effect);
      if (e.type === 'hit' && e.cause === 'notClear') landed.add('notClear');
    }
  }
  for (const item of ['notClear', 'audit', 'roulette', 'theater']) assert.ok(landed.has(item), `${item} never landed`);
});

// ---------------------------------------------------------------- 800-Column Table (issue #53)

test('an 800-Column Table lands behind the dropper, in a close rival\'s lane, and grows to half the track', () => {
  const sim = new RaceSim({ names: names(3), rng: mulberry32(21) });
  const [a, b] = sim.racers;
  a.s = 300; a.d = 0;
  b.s = 285; b.d = -5;
  a.item = 'columnTable';
  a.itemDelay = 0;
  sim.updateItems(a, 0.1, 0);
  assert.equal(a.item, null);
  const drop = sim.drainEvents().find((e) => e.type === 'drop');
  const table = drop.obstacle;
  assert.equal(drop.target, b);
  assert.equal(table.s, 300 - TUNING.tableDropBehind);
  assert.equal(table.d, -5, 'centred on the rival\'s lane');
  assert.ok(table.dMax - table.dMin < 2, 'starts narrow');
  // Kept in sorted order for every racer's obstacle scan.
  for (let i = 1; i < sim.obstacles.length; i++) assert.ok(sim.obstacles[i].sMin >= sim.obstacles[i - 1].sMin);
  for (let i = 0; i < 100; i++) sim.updateCourse(0.05);
  const width = table.dMax - table.dMin;
  assert.ok(Math.abs(width - TUNING.halfWidth) < 1e-9, `fills half the track (width ${width})`);
  assert.ok(table.dMin >= -TUNING.halfWidth && table.dMax <= TUNING.halfWidth, 'stays on the track');
  // Gone for good after its lifetime.
  for (let i = 0; i < 400; i++) sim.updateCourse(0.05);
  assert.equal(table.active, false);
});

test('hitting the table bounces you back and takes your items; the dropper and a firewall are safe', () => {
  const sim = new RaceSim({ names: names(3), rng: mulberry32(22) });
  const [a, b, c] = sim.racers;
  a.s = 300;
  const table = sim.dropTable(a, null);
  sim.drainEvents();

  b.s = table.s;
  b.item = 'coffee';
  b.returnUrl = true;
  sim.triggerObstacle(b, table);
  assert.equal(b.stun.kind, 'bounce');
  assert.equal(b.item, null, 'lost the held item');
  assert.equal(b.returnUrl, false, 'lost the ?returnUrl= pass');
  const hit = sim.drainEvents().find((e) => e.type === 'hit');
  assert.equal(hit.cause, 'columnTable');
  assert.equal(hit.by, a);
  assert.equal(hit.lost, 'coffee');
  const before = b.s;
  for (let i = 0; i < 20; i++) sim.updateStun(b, DT, 0);
  assert.ok(b.s < before - 1, 'knocked backwards');

  sim.triggerObstacle(a, table);
  assert.equal(a.stun, null, 'the dropper knows where they left it');

  c.shield = 10;
  c.item = 'bug';
  sim.triggerObstacle(c, table);
  assert.equal(c.stun, null);
  assert.equal(c.item, 'bug', 'blocked by the firewall, item kept');
});

test('800-Column Tables are dropped in real races, at most four at a time', () => {
  let dropped = 0;
  let bounced = 0;
  for (let seed = 1; seed <= 10; seed++) {
    const sim = new RaceSim({ names: names(12), rng: mulberry32(seed * 41) });
    while (!sim.done && sim.time < 400) {
      sim.step(DT);
      for (const e of sim.drainEvents()) {
        if (e.type === 'drop') dropped++;
        if (e.type === 'hit' && e.cause === 'columnTable') bounced++;
      }
      assert.ok(sim.obstacles.filter((o) => o.type === 'columnTable' && o.active).length <= TUNING.maxTables);
    }
  }
  assert.ok(dropped > 0, 'nobody dropped a table');
  assert.ok(bounced > 0, 'nobody hit a table');
});
