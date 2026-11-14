// Race simulation. Pure logic: no Three.js, no DOM, so it runs in Node for tests.
//
// Everything lives in "track space":
//   s = distance along the track (0 = start line, length = finish line)
//   d = sideways offset from the centre line (negative = left, positive = right)
// The renderer maps (s, d) onto the curved 3D track.

export const OBSTACLE_TYPES = [
  'pit404',
  'brokenLink',
  'mergeConflict',
  'infiniteScroll',
  'slowLoad',
  'redirectLoop',
  'nullPointer',
  'exception',
  'sslExpired',
  'urlBarricade',
];

export const ITEM_TYPES = ['coffee', 'breeze', 'firewall', 'bug', 'forcePush', 'renewedCert', 'returnUrl'];

export const TUNING = {
  // About 120 seconds of racing at 1x speed.
  trackLength: 2400,
  halfWidth: 12,
  baseSpeed: 21,
  // Hard cap on speed (as a multiple of baseSpeed), however many boosts stack up.
  maxSpeedFactor: 1.9,
  accel: 20,
  brake: 34,
  lateralSpeed: 7,
  lookAhead: 22,
  thinkInterval: 0.1,
  // Chance that a racer spots an obstacle in time to steer around it.
  dodgeChance: {
    pit404: 0.6,
    brokenLink: 0.5,
    mergeConflict: 0.62,
    infiniteScroll: 0.5,
    slowLoad: 0.5,
    redirectLoop: 0.55,
    nullPointer: 0.35,
    exception: 0.5,
    sslExpired: 0.5,
    urlBarricade: 0.5,
  },
  stun: {
    fall: 1.7, // 404 pit
    spin: 1.1, // broken link
    conflict: 1.4, // merge conflict
    loop: 1.6, // redirect loop
    null: 1.3, // null pointer
    blast: 1.5, // unhandled exception
    cert: 1.6, // SSL expired: stuck on the browser warning page
    errorPit: 2.6, // DO NOT MODIFY URLS: dropped into the error pit
    bug: 1.3,
    forcePush: 1.7,
  },
  // How long a Renewed Certificate stays valid (seconds).
  certDuration: 20,
  slowLoadFactor: 0.45,
  scrollBeltSpeed: 9,
  explosionRadius: 4.5,
  mineRespawn: 6,
  crateRespawn: 2.5,
  projectileSpeed: 55,
  // After the winner crosses the line the rest get this long to finish.
  finishGrace: 25,
};

/** Small seedable PRNG so tests (and ?seed= in the URL) can replay a race. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(list, rng = Math.random) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/**
 * Lays out obstacles and item crates along the track.
 * Every obstacle type is dealt from a shuffled bag, so each one shows up
 * before any repeats.
 */
export function generateCourse(rng = Math.random, length = TUNING.trackLength, halfWidth = TUNING.halfWidth) {
  const obstacles = [];
  const crates = [];
  const hw = halfWidth - 1.5;
  const rand = (lo, hi) => lo + rng() * (hi - lo);
  let nextId = 1;

  const circle = (type, s, d, r, extra = {}) => {
    obstacles.push({ id: nextId++, type, shape: 'circle', s, d, r, sMin: s - r, sMax: s + r, dMin: d - r, dMax: d + r, active: true, cooldown: 0, ...extra });
  };
  const rect = (type, shape, s, halfLen, dMin, dMax, extra = {}) => {
    obstacles.push({ id: nextId++, type, shape, s, d: (dMin + dMax) / 2, halfLen, sMin: s - halfLen, sMax: s + halfLen, dMin, dMax, active: true, cooldown: 0, ...extra });
  };
  const lanes = (count) => shuffle([-0.8, -0.4, 0, 0.4, 0.8], rng).slice(0, count).map((f) => f * hw + rand(-1, 1));
  // A band covering `fraction` of the track width, hugging the left, right or centre.
  const band = (fraction) => {
    const width = 2 * halfWidth * fraction;
    const where = Math.floor(rng() * 3);
    if (where === 0) return [-halfWidth, -halfWidth + width];
    if (where === 1) return [halfWidth - width, halfWidth];
    const c = rand(-2, 2);
    return [c - width / 2, c + width / 2];
  };
  const crateRow = (s) => {
    const row = nextId++;
    for (let k = -2; k <= 2; k++) {
      crates.push({ id: nextId++, row, s, d: (k * hw * 0.8) / 2, active: true, respawn: 0 });
    }
  };

  const builders = {
    pit404(s) {
      for (const d of lanes(2 + Math.floor(rng() * 2))) circle('pit404', s + rand(0, 6), d, 2.1);
      return 8;
    },
    brokenLink(s) {
      const bars = 1 + Math.floor(rng() * 2);
      for (let i = 0; i < bars; i++) {
        const width = rand(8, 11);
        const c = rand(-hw + width / 2, hw - width / 2);
        rect('brokenLink', 'rect', s + i * 9, 0.5, c - width / 2, c + width / 2);
      }
      return bars * 9;
    },
    mergeConflict(s) {
      const offset = rand(-2, 2);
      for (const side of [-1, 1]) {
        const c = side * hw * 0.55 + offset;
        rect('mergeConflict', 'rect', s, 0.9, c - 3, c + 3);
      }
      return 4;
    },
    infiniteScroll(s) {
      const [a, b] = band(0.55);
      rect('infiniteScroll', 'zone', s + 13, 13, a, b);
      return 26;
    },
    slowLoad(s) {
      const [a, b] = band(0.5);
      rect('slowLoad', 'zone', s + 10, 10, a, b);
      return 20;
    },
    redirectLoop(s) {
      for (const d of lanes(2)) circle('redirectLoop', s + rand(0, 5), d, 2.4);
      return 8;
    },
    nullPointer(s) {
      const count = 1 + Math.floor(rng() * 2);
      for (let i = 0; i < count; i++) {
        circle('nullPointer', s + i * 8, 0, 1.4, { amp: hw - 1, phase: rand(0, Math.PI * 2), rate: rand(1.1, 1.7) * (rng() < 0.5 ? -1 : 1) });
      }
      return count * 8;
    },
    exception(s) {
      for (const d of lanes(3 + Math.floor(rng() * 2))) circle('exception', s + rand(0, 9), d, 1.2);
      return 10;
    },
    // A certificate checkpoint across half the road.
    sslExpired(s) {
      const [a, b] = band(0.5);
      rect('sslExpired', 'rect', s, 0.8, a, b);
      return 4;
    },
    // A barricade across just over half the road, with an error pit behind it.
    urlBarricade(s) {
      const [a, b] = band(0.55);
      rect('urlBarricade', 'rect', s, 0.8, a, b);
      return 6;
    },
  };

  crateRow(38);
  let s = 70;
  let bag = [];
  let index = 0;
  while (s < length - 60) {
    if (!bag.length) bag = shuffle(OBSTACLE_TYPES, rng);
    s += builders[bag.pop()](s);
    s += rand(24, 34);
    if (index % 2 === 0 && s < length - 45) {
      crateRow(s);
      s += 16;
    }
    index++;
  }

  obstacles.sort((a, b) => a.sMin - b.sMin);
  crates.sort((a, b) => a.s - b.s);
  return { obstacles, crates };
}

/** Picks an item. Trailing racers get the stronger catch-up items. */
export function rollItem(rankFraction, rng = Math.random) {
  const f = rankFraction;
  const weights = {
    coffee: 3,
    firewall: 2 - f,
    bug: f > 0.05 ? 2.5 : 0,
    breeze: 3 * f * f,
    forcePush: f > 0.5 ? 1.4 * f : 0,
    // Passes for specific obstacles: the same odds wherever you are in the field.
    renewedCert: 1.2,
    returnUrl: 1.2,
  };
  let total = 0;
  for (const k of ITEM_TYPES) total += weights[k];
  let roll = rng() * total;
  for (const k of ITEM_TYPES) {
    roll -= weights[k];
    if (roll <= 0) return k;
  }
  return 'coffee';
}

export class RaceSim {
  /**
   * @param {object} options
   * @param {string[]} options.names  racers taking part
   * @param {() => number} [options.rng]  random source (defaults to Math.random)
   */
  constructor({ names, rng = Math.random, length = TUNING.trackLength, halfWidth = TUNING.halfWidth }) {
    if (!Array.isArray(names) || names.length < 1) throw new Error('A race needs at least one name.');
    this.rng = rng;
    this.length = length;
    this.halfWidth = halfWidth;
    this.time = 0;
    this.events = [];
    this.projectiles = [];
    this.finishedCount = 0;
    this.winner = null;
    this.winnerTime = 0;
    this.done = false;
    this.leaderId = -1;
    this.lastLeadEvent = 0;
    this.nextProjectileId = 1;

    const course = generateCourse(rng, length, halfWidth);
    this.obstacles = course.obstacles;
    this.crates = course.crates;

    // Grid slots are dealt at random, so nobody is favoured by list order.
    const order = shuffle(names, rng);
    const columns = Math.min(6, order.length);
    const spacing = 3.7;
    this.racers = order.map((name, i) => {
      const col = i % columns;
      const row = Math.floor(i / columns);
      const inRow = Math.min(columns, order.length - row * columns);
      return {
        id: i,
        name,
        s: -3.5 - row * 5,
        d: (col - (inRow - 1) / 2) * spacing,
        v: 0,
        targetD: 0,
        wanderD: 0,
        wanderT: 0,
        thinkT: rng() * TUNING.thinkInterval,
        launchDelay: rng() * 0.3,
        pace: 0.98 + rng() * 0.04,
        f1: 0.3 + rng() * 0.6,
        p1: rng() * Math.PI * 2,
        f2: 0.9 + rng() * 0.9,
        p2: rng() * Math.PI * 2,
        rank: i,
        stun: null,
        boostT: 0,
        boostF: 1,
        shield: 0,
        certT: 0, // seconds of Renewed Certificate left
        returnUrl: false, // holding a ?returnUrl= pass
        item: null,
        itemDelay: 0,
        itemHeld: 0,
        zone: null,
        noticed: new Map(),
        cleared: new Set(),
        oi: 0,
        finished: false,
        dnf: false,
        place: 0,
        finishTime: 0,
        hits: 0,
      };
    });
    for (const r of this.racers) {
      r.targetD = r.d;
      r.wanderD = r.d;
    }
    this.order = this.racers.slice();
  }

  emit(type, data) {
    this.events.push({ type, time: this.time, ...data });
  }

  /** Returns and clears the events raised since the last call. */
  drainEvents() {
    const out = this.events;
    this.events = [];
    return out;
  }

  /** Racers sorted by current standing (finishers first, then by distance). */
  standings() {
    return this.order;
  }

  step(dt) {
    if (this.done) return;
    this.time += dt;
    this.updateCourse(dt);
    this.updateRanks();
    for (const r of this.racers) this.updateRacer(r, dt);
    this.updateProjectiles(dt);
    this.separate(dt);
    this.checkFinish();
  }

  updateCourse(dt) {
    for (const o of this.obstacles) {
      if (o.type === 'nullPointer') {
        o.d = o.amp * Math.sin(o.phase + this.time * o.rate);
        o.dMin = o.d - o.r;
        o.dMax = o.d + o.r;
      }
      if (!o.active) {
        o.cooldown -= dt;
        if (o.cooldown <= 0) {
          o.active = true;
          this.emit('respawn', { obstacle: o });
        }
      }
    }
    for (const c of this.crates) {
      if (!c.active) {
        c.respawn -= dt;
        if (c.respawn <= 0) c.active = true;
      }
    }
  }

  updateRanks() {
    this.order.sort((a, b) => {
      if (a.finished !== b.finished) return a.finished ? -1 : 1;
      if (a.finished) return a.place - b.place;
      return b.s - a.s;
    });
    for (let i = 0; i < this.order.length; i++) this.order[i].rank = i;
    const leader = this.order[0];
    if (!leader.finished && leader.id !== this.leaderId) {
      if (this.leaderId !== -1 && this.time > 3 && this.time - this.lastLeadEvent > 2) {
        this.emit('lead', { racer: leader });
        this.lastLeadEvent = this.time;
      }
      this.leaderId = leader.id;
    }
  }

  updateRacer(r, dt) {
    const T = TUNING;
    const hw = this.halfWidth - 1;

    if (r.finished) {
      // Coast to a stop in the run-off area. The winner rolls furthest, so the
      // rest of the field pulls up behind them rather than in front.
      r.v = Math.max(0, r.v - (r.place === 1 ? 7 : 12) * dt);
      if (r.s > this.length + 55) r.v = 0;
      r.s += r.v * dt;
      return;
    }

    if (r.shield > 0) r.shield = Math.max(0, r.shield - dt);
    if (r.boostT > 0) r.boostT = Math.max(0, r.boostT - dt);
    if (r.certT > 0) r.certT = Math.max(0, r.certT - dt);

    // Skip obstacles that are well behind us.
    while (r.oi < this.obstacles.length && this.obstacles[r.oi].sMax < r.s - 12) r.oi++;

    let zoneFactor = 1;
    let belt = 0;
    let zone = null;

    for (let i = r.oi; i < this.obstacles.length; i++) {
      const o = this.obstacles[i];
      if (o.sMin > r.s + T.lookAhead) break;

      if (!r.noticed.has(o.id)) r.noticed.set(o.id, this.rng() < T.dodgeChance[o.type]);

      if (o.shape === 'zone') {
        if (r.s > o.sMin && r.s < o.sMax && r.d > o.dMin && r.d < o.dMax) {
          zone = o;
          if (o.type === 'slowLoad') zoneFactor = T.slowLoadFactor;
          else belt = T.scrollBeltSpeed;
        }
        continue;
      }

      if (!o.active || r.cleared.has(o.id)) continue;
      let touching;
      if (o.shape === 'circle') {
        const ds = r.s - o.s;
        const dd = r.d - o.d;
        const reach = o.r + 0.9;
        touching = ds * ds + dd * dd < reach * reach;
      } else {
        touching = Math.abs(r.s - o.s) < o.halfLen + 1.1 && r.d > o.dMin - 0.9 && r.d < o.dMax + 0.9;
      }
      if (touching) {
        r.cleared.add(o.id);
        this.triggerObstacle(r, o);
      }
    }

    if (zone !== r.zone) {
      if (zone && !r.cleared.has(zone.id)) {
        r.cleared.add(zone.id);
        this.emit('zone', { racer: r, obstacle: zone });
      }
      r.zone = zone;
    }

    if (r.stun) {
      this.updateStun(r, dt, belt);
      return;
    }

    // --- steering ---
    r.wanderT -= dt;
    if (r.wanderT <= 0) {
      r.wanderT = 2.5 + this.rng() * 3.5;
      r.wanderD = clamp(r.d + (this.rng() - 0.5) * 12, -hw, hw);
    }
    r.thinkT -= dt;
    if (r.thinkT <= 0) {
      r.thinkT = T.thinkInterval;
      this.think(r, hw);
    }
    const lateral = T.lateralSpeed * Math.min(1, 0.2 + r.v / 12) * dt;
    r.d = clamp(r.d + clamp(r.targetD - r.d, -lateral, lateral), -hw, hw);

    // --- speed ---
    const n = this.racers.length;
    const rankFraction = n > 1 ? r.rank / (n - 1) : 0;
    let target = 0;
    if (this.time >= r.launchDelay) {
      const mood = 1 + 0.05 * Math.sin(this.time * r.f1 + r.p1) + 0.03 * Math.sin(this.time * r.f2 + r.p2);
      // Catch-up: the further behind the leader, the bigger the tailwind (keeps the pack together).
      const gap = this.order[0].finished ? 0 : this.order[0].s - r.s;
      let rubberBand = 1 + clamp(gap / 200, 0, 0.35);
      // ...and a runaway leader eases off a little.
      if (r.rank === 0 && n > 1) rubberBand = 1 - clamp((r.s - this.order[1].s) / 250, 0, 0.1);
      target = T.baseSpeed * r.pace * mood * rubberBand * zoneFactor;
      if (r.boostT > 0) target *= r.boostF;
      target = Math.min(target, T.baseSpeed * T.maxSpeedFactor);
    }
    if (r.v < target) r.v = Math.min(target, r.v + T.accel * (r.boostT > 0 ? 2 : 1) * dt);
    else r.v = Math.max(target, r.v - T.brake * dt);
    r.s += (r.v - belt) * dt;

    // --- items ---
    this.updateItems(r, dt, rankFraction);
  }

  think(r, hw) {
    const T = TUNING;
    let best = r.d;
    let bestScore = Infinity;
    const wantsCrate = !r.item;
    for (let k = 0; k <= 12; k++) {
      const c = -hw + (2 * hw * k) / 12;
      let score = Math.abs(c - r.d) + Math.abs(c - r.wanderD) * 0.25;
      for (let i = r.oi; i < this.obstacles.length; i++) {
        const o = this.obstacles[i];
        if (o.sMin > r.s + T.lookAhead) break;
        if (o.sMax < r.s - 1 || !o.active || !r.noticed.get(o.id)) continue;
        if (o.shape !== 'zone' && r.cleared.has(o.id)) continue;
        if (this.canPass(r, o)) continue; // no need to steer round something we can drive through
        if (c > o.dMin - 1.8 && c < o.dMax + 1.8) score += o.shape === 'zone' ? 40 : 100;
      }
      if (wantsCrate) {
        for (const crate of this.crates) {
          if (crate.s < r.s) continue;
          if (crate.s > r.s + T.lookAhead) break;
          if (crate.active && Math.abs(crate.d - c) < 1.3) {
            score -= 5;
            break;
          }
        }
      }
      if (score < bestScore) {
        bestScore = score;
        best = c;
      }
    }
    r.targetD = best;
  }

  /** True if the racer holds the item that lets them straight through this obstacle. */
  canPass(r, o) {
    return (o.type === 'sslExpired' && r.certT > 0) || (o.type === 'urlBarricade' && r.returnUrl);
  }

  triggerObstacle(r, o) {
    switch (o.type) {
      case 'pit404':
        this.applyHit(r, 'fall', 'pit404');
        break;
      case 'brokenLink':
        this.applyHit(r, 'spin', 'brokenLink');
        break;
      case 'mergeConflict':
        this.applyHit(r, 'conflict', 'mergeConflict');
        break;
      case 'redirectLoop':
        this.applyHit(r, 'loop', 'redirectLoop', { center: o });
        break;
      case 'nullPointer':
        this.applyHit(r, 'null', 'nullPointer');
        break;
      case 'exception':
        this.explode(o);
        break;
      case 'sslExpired':
        // A renewed certificate stays valid for every checkpoint until it runs out.
        if (r.certT > 0) this.emit('pass', { racer: r, obstacle: o, item: 'renewedCert' });
        else this.applyHit(r, 'cert', 'sslExpired');
        break;
      case 'urlBarricade':
        // A ?returnUrl= is used up by the barricade it gets you through.
        if (r.returnUrl) {
          r.returnUrl = false;
          this.emit('pass', { racer: r, obstacle: o, item: 'returnUrl' });
        } else {
          this.applyHit(r, 'errorPit', 'urlBarricade');
        }
        break;
    }
  }

  explode(mine) {
    mine.active = false;
    mine.cooldown = TUNING.mineRespawn;
    this.emit('explode', { s: mine.s, d: mine.d, obstacle: mine });
    const radius = TUNING.explosionRadius;
    for (const r of this.racers) {
      if (r.finished) continue;
      const ds = r.s - mine.s;
      const dd = r.d - mine.d;
      if (ds * ds + dd * dd < radius * radius) {
        r.cleared.add(mine.id);
        this.applyHit(r, 'blast', 'exception');
      }
    }
  }

  /**
   * Stuns a racer. Returns true if the hit landed, false if it was blocked
   * by a firewall or the racer was already out of action.
   */
  applyHit(r, kind, cause, { center = null, by = null, duration = null } = {}) {
    if (r.finished || r.stun) return false;
    if (r.shield > 0) {
      r.shield = 0;
      this.emit('block', { racer: r, cause, by });
      return false;
    }
    r.stun = {
      kind,
      cause,
      t: 0,
      dur: duration ?? TUNING.stun[kind],
      cs: center ? center.s : 0,
      cd: center ? center.d : 0,
      a0: center ? Math.atan2(r.d - center.d, r.s - center.s) : 0,
      r0: center ? Math.hypot(r.d - center.d, r.s - center.s) : 0,
      v0: r.v,
    };
    r.boostT = 0;
    r.hits++;
    this.emit('hit', { racer: r, kind, cause, by });
    return true;
  }

  updateStun(r, dt, belt) {
    const st = r.stun;
    st.t += dt;
    const p = Math.min(1, st.t / st.dur);
    if (st.kind === 'loop') {
      // Two full laps around the redirect, ending where we came in.
      const angle = st.a0 + p * Math.PI * 4;
      const radius = st.r0 + (1.5 - st.r0) * Math.min(1, p * 3);
      r.s = st.cs + Math.cos(angle) * radius;
      r.d = st.cd + Math.sin(angle) * radius;
      r.v = 0;
    } else if (st.kind === 'spin') {
      // Skid forward while spinning out.
      r.v = Math.max(st.v0 * 0.25, r.v - TUNING.brake * dt);
      r.s += (r.v - belt) * dt;
    } else {
      r.v = 0;
      r.s -= belt * dt;
    }
    if (st.t >= st.dur) r.stun = null;
  }

  updateItems(r, dt, rankFraction) {
    if (!r.item) {
      for (const crate of this.crates) {
        if (crate.s < r.s - 2) continue;
        if (crate.s > r.s + 2) break;
        if (crate.active && Math.abs(crate.d - r.d) < 1.9) {
          crate.active = false;
          crate.respawn = TUNING.crateRespawn;
          r.item = rollItem(rankFraction, this.rng);
          r.itemDelay = 0.6 + this.rng() * 1.4;
          r.itemHeld = 0;
          this.emit('pickup', { racer: r, item: r.item, crate });
          break;
        }
      }
      return;
    }

    r.itemDelay -= dt;
    if (r.itemDelay > 0) return;
    r.itemHeld += dt;

    const item = r.item;
    const boost = (factor, time) => {
      r.boostF = factor;
      r.boostT = time;
    };
    const use = (extra = {}) => {
      r.item = null;
      this.emit('use', { racer: r, item, ...extra });
    };

    if (item === 'coffee') {
      boost(1.35, 2.2);
      use();
    } else if (item === 'breeze') {
      boost(1.6, 3);
      use();
    } else if (item === 'firewall') {
      r.shield = 10;
      use();
    } else if (item === 'renewedCert') {
      r.certT = TUNING.certDuration;
      use();
    } else if (item === 'returnUrl') {
      r.returnUrl = true;
      use();
    } else {
      // Thrown items need someone to throw them at.
      let target = null;
      if (item === 'bug') {
        for (const other of this.racers) {
          if (other === r || other.finished || other.s <= r.s) continue;
          if (!target || other.s < target.s) target = other;
        }
        if (target && target.s - r.s > 45) target = null;
      } else {
        const leader = this.order.find((o) => !o.finished);
        if (leader && leader !== r) target = leader;
      }
      if (target) {
        this.projectiles.push({ id: this.nextProjectileId++, kind: item, from: r, target, s: r.s, d: r.d, t: 0 });
        use({ target });
      } else if (r.itemHeld > 3 || r.rank === 0) {
        // Nobody ahead: recycle it into a small boost instead.
        boost(1.25, 1.5);
        use({ wasted: true });
      }
    }
  }

  updateProjectiles(dt) {
    const speed = TUNING.projectileSpeed;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.t += dt;
      const target = p.target;
      if (target.finished || p.t > 8) {
        this.projectiles.splice(i, 1);
        this.emit('fizzle', { projectile: p });
        continue;
      }
      const ds = target.s - p.s;
      const dd = target.d - p.d;
      const dist = Math.hypot(ds, dd);
      const move = speed * dt;
      if (dist <= move + 1) {
        this.projectiles.splice(i, 1);
        this.emit('impact', { projectile: p, s: target.s, d: target.d });
        const kind = p.kind === 'bug' ? 'spin' : 'blast';
        this.applyHit(target, kind, p.kind, { by: p.from, duration: TUNING.stun[p.kind] });
      } else {
        p.s += (ds / dist) * move;
        p.d += (dd / dist) * move;
      }
    }
  }

  /** Nudges overlapping racers apart sideways so they do not drive through each other. */
  separate(dt) {
    const hw = this.halfWidth - 1;
    const racers = this.racers;
    const push = Math.min(1, dt * 6);
    for (let i = 0; i < racers.length; i++) {
      const a = racers[i];
      if (a.stun) continue;
      for (let j = i + 1; j < racers.length; j++) {
        const b = racers[j];
        if (b.stun) continue;
        if (Math.abs(a.s - b.s) > 3.6) continue;
        const dd = a.d - b.d;
        const gap = Math.abs(dd);
        if (gap > 2.6) continue;
        const dir = dd === 0 ? (a.id < b.id ? -1 : 1) : Math.sign(dd);
        const shift = (2.6 - gap) * 0.5 * push * dir;
        a.d = clamp(a.d + shift, -hw, hw);
        b.d = clamp(b.d - shift, -hw, hw);
      }
    }
  }

  checkFinish() {
    for (const r of this.racers) {
      if (!r.finished && r.s >= this.length) {
        r.finished = true;
        r.place = ++this.finishedCount;
        r.finishTime = this.time;
        r.stun = null;
        r.boostT = 0;
        r.shield = 0;
        r.certT = 0;
        r.returnUrl = false;
        r.item = null;
        if (r.place === 1) {
          this.winner = r;
          this.winnerTime = this.time;
        }
        this.emit('finish', { racer: r, place: r.place });
      }
    }
    if (this.finishedCount === this.racers.length) {
      this.done = true;
    } else if (this.winner && this.time - this.winnerTime > TUNING.finishGrace) {
      // Stragglers are placed in their current running order.
      for (const r of this.order) {
        if (!r.finished) {
          r.finished = true;
          r.dnf = true;
          r.place = ++this.finishedCount;
          r.finishTime = this.time;
          r.stun = null;
        }
      }
      this.done = true;
    }
    if (this.done) this.updateRanks();
  }
}
