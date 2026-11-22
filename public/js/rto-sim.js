// "RTO Mini-Golf" (Indoor Office Cubicle Open): 2.5D rolling physics over duct-taped putting
// mats, 3-ring binder ramps, floor cable protectors, spinning ergonomic desk chairs, BadalJwala
// jammed copier gates, spilled iced coffee puddles, ?ReturnUrl= security detour loops, retired
// hardware bumpers, under-desk cable abysses, tipped-over coffee mug capture/lip-out, and the
// "HVAC Draft / Friday 4:55 PM Gimme" fallback. Pure logic (no Three.js, no DOM).

import { MAX_NAMES } from './data-rules.js';

export const MIN_RTO_PLAYERS = 2;
export const MAX_RTO_PLAYERS = MAX_NAMES; // 30

export const RTO_DURATIONS = [
  { seconds: 120, variant: 'championship', label: '120s', text: '120s · 3-Hole "Instead of Raises" Open' },
  { seconds: 60, variant: 'championship', label: '60s', text: '60s · 3-Hole "Instead of Raises" Open' },
  { seconds: 30, variant: 'mandate', label: '30s', text: '30s · Return-to-Office Mandate Open' },
  { seconds: 15, variant: 'dash', label: '15s', text: '15s · Hallway Hotfix Dash' },
  { seconds: 10, variant: 'dash', label: '10s', text: '10s · Hallway Hotfix Dash' },
];
export const DEFAULT_RTO_DURATION = 15;

export function normalizeRtoDuration(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_RTO_DURATION;
  let best = RTO_DURATIONS[0].seconds;
  let dist = Math.abs(n - best);
  for (const step of RTO_DURATIONS) {
    const d = Math.abs(n - step.seconds);
    if (d < dist) { best = step.seconds; dist = d; }
  }
  return best;
}

export function rtoVariant(seconds) {
  const s = normalizeRtoDuration(seconds);
  if (s <= 15) {
    return {
      id: 'dash',
      label: 'Hallway Hotfix Dash',
      length: 38,
      halfWidth: 6.2,
      chairs: 1,
      copier: false,
      abyss: false,
      coffeePuddles: 1,
      detour: false,
    };
  }
  if (s <= 30) {
    return {
      id: 'mandate',
      label: 'Return-to-Office Mandate Open',
      length: 54,
      halfWidth: 6.8,
      chairs: 1,
      copier: true,
      abyss: true,
      coffeePuddles: 2,
      detour: true,
    };
  }
  return {
    id: 'championship',
    label: '3-Hole "Instead of Raises" Championship',
    length: 70,
    halfWidth: 7.2,
    chairs: 2,
    copier: true,
    abyss: true,
    coffeePuddles: 3,
    detour: true,
  };
}

/** Exact dev-humor hazard popups from docs/RTO_mini_golf_game_mode_spec.md. */
export const RTO_HAZARD_POPUPS = {
  chair: ['Blocked by khallas software license', 'Blocked by baasi SSL Certs'],
  detour: [
    'URL edits banned. Fix: add ?ReturnUrl=',
    'Blocked URL edits; fixed by editing the URL',
    'Security update broke reports — use ?ReturnUrl=',
  ],
  copier: ['BadalJwala 500 Internal Error', 'Scrolling 800 columns now'],
  coffee: ['Waiting on developer poll results', 'Waiting to be blamed for not being clear'],
  hardware: ["Manager's pet feature", 'Unrequested feature broke prod', "Failed to read Iklauti-ji's mind"],
  abyss: ['userLogin and eventLog broke audit logs', 'Rolling back server clock broke login'],
};

export const RTO_BALL_RADIUS = 0.36;
export const RTO_CUP_RADIUS = 0.78;
export const RTO_CAPTURE_SPEED = 8.4;

const BALL_COLORS = [
  '#ff6b6b', '#4dabf7', '#51cf66', '#ffd43b', '#cc5de8', '#ff922b',
  '#20c997', '#f06595', '#748ffc', '#a9e34b', '#3bc9db', '#fcc419',
];

/** Builds the modular indoor office cubicle mini-golf course and workplace obstacle descriptors. */
export function buildRtoCourse(duration = DEFAULT_RTO_DURATION) {
  const dur = normalizeRtoDuration(duration);
  const variant = rtoVariant(dur);
  const L = variant.length;
  const W = variant.halfWidth;

  const cup = { x: 0, z: -L + 4.4 };

  // Spinning 5-caster ergonomic desk chairs blocking the corridor choke point
  const chairs = [{ x: 0, z: -L * 0.33, radius: 2.35, speed: 1.9 }];
  if (variant.chairs >= 2) {
    chairs.push({ x: 0.4, z: -L * 0.64, radius: 2.45, speed: -2.2 });
  }

  // BadalJwala Jammed Copier Gate (pulsing orange paper-tray barrier)
  const copiers = variant.copier
    ? [{ z: -L * 0.49, period: 3.5, closedFrac: 0.36 }]
    : [];

  // Spilled Iced Coffee Puddles (heavy sticky rolling drag + wet floor cones)
  const coffeePuddles = [
    { x: -W * 0.48, z: -L * 0.42, rx: 2.1, rz: 3.1 },
  ];
  if (variant.coffeePuddles >= 2) {
    coffeePuddles.push({ x: W * 0.48, z: -L * 0.67, rx: 2.1, rz: 3.3 });
  }
  if (variant.coffeePuddles >= 3) {
    coffeePuddles.push({ x: -W * 0.44, z: -L * 0.79, rx: 1.9, rz: 2.8 });
  }

  // Under-Desk Cable Abyss (out-of-bounds gaps along the taped mat edge)
  const abyssZones = variant.abyss
    ? [
        { xMin: -W - 0.4, xMax: -2.3, zMin: -L * 0.61, zMax: -L * 0.52 },
        { xMin: 2.3, xMax: W + 0.4, zMin: -L * 0.61, zMax: -L * 0.52 },
      ]
    : [];

  // Retired Hardware Bumpers (stacked CRT monitors, Dell towers, printer paper reams; e = 1.3)
  const hardwareBumpers = [
    { x: -2.7, z: -L * 0.21, r: 0.82, kind: 'crt' },
    { x: 2.7, z: -L * 0.21, r: 0.82, kind: 'dell' },
    { x: -2.8, z: -L * 0.74, r: 0.84, kind: 'paper' },
    { x: 2.8, z: -L * 0.74, r: 0.84, kind: 'crt' },
  ];
  if (variant.id !== 'dash') {
    hardwareBumpers.push({ x: 0, z: -L * 0.81, r: 0.76, kind: 'dell' });
  }

  // "One Quick Idea" ?ReturnUrl= Security Detour Loop on the right lane
  const detour = variant.detour
    ? { x: W * 0.58, z: -L * 0.36, r: 1.45 }
    : { x: W * 0.64, z: -L * 0.38, r: 1.25 };

  // Yellow floor cable-protector speed bumps
  const cableBumps = [
    { z: -L * 0.16, width: 1.0, height: 0.22 },
  ];
  if (variant.id !== 'dash') {
    cableBumps.push({ z: -L * 0.46, width: 1.0, height: 0.22 });
  }

  // 3-ring binder ramp leading up to the Executive Green (DEPLOY TO PROD)
  const greenRampStartZ = -L * 0.73;
  const greenFlatZ = -L * 0.83;
  const greenHeight = 1.35;

  return {
    duration: dur,
    variant,
    length: L,
    halfWidth: W,
    cup,
    chairs,
    copiers,
    coffeePuddles,
    abyssZones,
    hardwareBumpers,
    detour,
    cableBumps,
    greenRampStartZ,
    greenFlatZ,
    greenHeight,
  };
}

/** Piecewise analytical office course height y = h(x, z): flat felt -> cable bumps -> binder ramp -> mug funnel. */
export function rtoHeightAt(course, x, z) {
  let y = 0;
  // Floor cable protector speed bumps
  for (const cb of course.cableBumps) {
    const dz = Math.abs(z - cb.z);
    if (dz < cb.width) {
      const k = Math.cos((dz / cb.width) * (Math.PI / 2));
      y += cb.height * k * k;
    }
  }
  // 3-ring binder ramp up to the Executive Green
  if (z < course.greenRampStartZ) {
    if (z <= course.greenFlatZ) {
      y += course.greenHeight;
    } else {
      const f = (course.greenRampStartZ - z) / (course.greenRampStartZ - course.greenFlatZ);
      y += course.greenHeight * (f * f * (3 - 2 * f));
    }
  }
  // Gentle funnel dip into the tipped-over coffee mug
  const d = Math.hypot(x - course.cup.x, z - course.cup.z);
  if (d < 2.9) {
    const k = 1 - d / 2.9;
    y -= k * k * 0.22;
  }
  return y;
}

function slopeGradAt(course, x, z) {
  const eps = 0.08;
  return {
    gx: (rtoHeightAt(course, x + eps, z) - rtoHeightAt(course, x - eps, z)) / (2 * eps),
    gz: (rtoHeightAt(course, x, z + eps) - rtoHeightAt(course, x, z - eps)) / (2 * eps),
  };
}

/** True when the BadalJwala Jammed Copier Gate is slammed shut at time `t`. */
export function isCopierJammed(copier, t) {
  const phase = (t % copier.period) / copier.period;
  return phase < copier.closedFrac;
}

/**
 * Real-time 2.5D simultaneous RTO Mini-Golf simulation for 2..30 players.
 */
export class RtoSim {
  constructor({ names, duration = DEFAULT_RTO_DURATION, rng = Math.random } = {}) {
    if (!Array.isArray(names) || names.length < MIN_RTO_PLAYERS || names.length > MAX_RTO_PLAYERS) {
      throw new Error(`RTO Mini-Golf needs ${MIN_RTO_PLAYERS}–${MAX_RTO_PLAYERS} players.`);
    }
    this.rng = rng;
    this.course = buildRtoCourse(duration);
    this.time = 0;
    this.teedOff = false;
    this.teeOffAt = 1.6;
    this.done = false;
    this.winner = null;
    this.gimmeActive = false;
    this.events = [];

    const n = names.length;
    const cols = Math.min(8, Math.max(2, Math.ceil(Math.sqrt(n * 1.6))));
    const spanX = Math.min(this.course.halfWidth * 1.48, (cols - 1) * 1.15);
    this.balls = names.map((name, id) => {
      const col = id % cols;
      const row = Math.floor(id / cols);
      const inRow = Math.min(cols, n - row * cols);
      const x = inRow === 1 ? 0 : ((col / (inRow - 1)) - 0.5) * (spanX * ((inRow - 1) / Math.max(1, cols - 1)));
      const z = -2.2 - row * 1.05;
      return {
        id,
        name,
        color: BALL_COLORS[id % BALL_COLORS.length],
        x,
        y: 0,
        z,
        vx: 0,
        vz: 0,
        strokes: 0,
        restTime: 0,
        checkpointZ: z,
        hazardCooldown: 0,
        sunk: false,
        sunkAt: null,
        distToPin: Math.hypot(x - this.course.cup.x, z - this.course.cup.z),
      };
    });
  }

  emit(event) {
    this.events.push(event);
  }

  drainEvents() {
    const out = this.events;
    this.events = [];
    return out;
  }

  pickPopup(kind) {
    const pool = RTO_HAZARD_POPUPS[kind] ?? RTO_HAZARD_POPUPS.hardware;
    return pool[Math.floor(this.rng() * pool.length)];
  }

  puttBall(b, isTeeOff = false) {
    const dx = this.course.cup.x - b.x;
    const dz = this.course.cup.z - b.z;
    const dist = Math.max(0.5, Math.hypot(dx, dz));
    const jitter = (this.rng() - 0.5) * (isTeeOff ? 0.24 : 0.2);
    const angle = Math.atan2(dz, dx) + jitter;
    const basePower = isTeeOff
      ? Math.min(26.5, Math.max(17, dist * 0.52)) * (0.86 + this.rng() * 0.28)
      : Math.min(18, Math.max(6.4, dist * 0.62)) * (0.85 + this.rng() * 0.3);
    b.vx = Math.cos(angle) * basePower;
    b.vz = Math.sin(angle) * basePower;
    b.strokes++;
    b.restTime = 0;
  }

  step(dt) {
    if (this.done) return;
    this.time += dt;
    const c = this.course;

    if (!this.teedOff && this.time >= this.teeOffAt) {
      this.teedOff = true;
      for (const b of this.balls) this.puttBall(b, true);
      this.emit({ type: 'teeOff' });
    }
    if (!this.teedOff) return;

    // Hard-Cap "HVAC Draft / Friday 4:55 PM Gimme" breeze
    const gimmeStart = Math.max(6.0, c.duration * 0.72);
    const gimmeStrength = this.time > gimmeStart
      ? Math.min(26, (this.time - gimmeStart) * 5.2)
      : 0;
    if (gimmeStrength > 0 && !this.gimmeActive) {
      this.gimmeActive = true;
      this.emit({
        type: 'note',
        text: '🌬️ HVAC Draft / Friday 4:55 PM Gimme guiding balls toward the mug!',
        important: true,
      });
    }

    const g = 14.0;
    for (const b of this.balls) {
      if (b.sunk) continue;
      if (b.hazardCooldown > 0) b.hazardCooldown = Math.max(0, b.hazardCooldown - dt);

      const grad = slopeGradAt(c, b.x, b.z);
      b.vx += -g * grad.gx * dt;
      b.vz += -g * grad.gz * dt;

      if (gimmeStrength > 0) {
        const dx = c.cup.x - b.x;
        const dz = c.cup.z - b.z;
        const d = Math.max(0.2, Math.hypot(dx, dz));
        b.vx += (dx / d) * gimmeStrength * dt;
        b.vz += (dz / d) * gimmeStrength * dt;
      }

      // Spilled Iced Coffee Puddles (heavy sticky drag)
      let inCoffee = false;
      for (const cp of c.coffeePuddles) {
        const nx = (b.x - cp.x) / cp.rx;
        const nz = (b.z - cp.z) / cp.rz;
        if (nx * nx + nz * nz <= 1) {
          inCoffee = true;
          if (b.hazardCooldown <= 0) {
            b.hazardCooldown = 2.6;
            this.emit({ type: 'hazard', kind: 'coffee', ball: b, popup: this.pickPopup('coffee') });
          }
          break;
        }
      }

      const drag = inCoffee ? 3.9 : 0.78;
      const damp = Math.exp(-drag * dt);
      b.vx *= damp;
      b.vz *= damp;

      b.x += b.vx * dt;
      b.z += b.vz * dt;
      b.y = rtoHeightAt(c, b.x, b.z);
      if (b.z < b.checkpointZ - 6) b.checkpointZ = b.z + 3;

      // Cushioned fabric cubicle walls (e = 0.55 per spec)
      const maxX = c.halfWidth - RTO_BALL_RADIUS;
      if (b.x < -maxX) {
        b.x = -maxX;
        b.vx = Math.abs(b.vx) * 0.55;
        this.emit({ type: 'wall', ball: b });
      } else if (b.x > maxX) {
        b.x = maxX;
        b.vx = -Math.abs(b.vx) * 0.55;
        this.emit({ type: 'wall', ball: b });
      }
      if (b.z > -0.6) {
        b.z = -0.6;
        b.vz = -Math.abs(b.vz) * 0.55;
      } else if (b.z < -c.length + 0.8) {
        b.z = -c.length + 0.8;
        b.vz = Math.abs(b.vz) * 0.55;
        this.emit({ type: 'wall', ball: b });
      }

      // Under-Desk Cable Abyss (respawn at checkpoint)
      for (const az of c.abyssZones) {
        if (b.x >= az.xMin && b.x <= az.xMax && b.z >= az.zMin && b.z <= az.zMax) {
          this.emit({ type: 'hazard', kind: 'abyss', ball: b, x: b.x, z: b.z, popup: this.pickPopup('abyss') });
          b.x = (this.rng() - 0.5) * 2.0;
          b.z = Math.min(-2.5, b.checkpointZ);
          b.vx = 0;
          b.vz = 0;
          b.restTime = 0;
          b.hazardCooldown = 2.4;
          break;
        }
      }

      // Spinning Ergonomic Desk Chair (5-caster aisle blocker)
      for (const ch of c.chairs) {
        const dx = b.x - ch.x;
        const dz = b.z - ch.z;
        const d = Math.hypot(dx, dz);
        if (d < ch.radius) {
          // 5 rotating caster legs sweep around; timing the gap lets the ball zip underneath
          const ang = Math.atan2(dz, dx) - this.time * ch.speed;
          const casterHit = Math.abs(Math.sin(ang * 2.5)) < 0.42 || d < 0.75;
          if (casterHit) {
            const nx = d > 0.01 ? dx / d : 1;
            const nz = d > 0.01 ? dz / d : 1;
            b.x = ch.x + nx * (ch.radius + 0.15);
            b.z = ch.z + nz * (ch.radius + 0.15);
            b.vx = nx * 5.8 + (this.rng() - 0.5) * 2.0;
            b.vz = Math.abs(b.vz) * 0.55 + 2.8;
            if (b.hazardCooldown <= 0) {
              b.hazardCooldown = 2.0;
              this.emit({ type: 'hazard', kind: 'chair', ball: b, popup: this.pickPopup('chair') });
            }
          }
        }
      }

      // BadalJwala Jammed Copier Gate (pulsing orange paper-tray barrier)
      for (const cp of c.copiers) {
        if (isCopierJammed(cp, this.time) && Math.abs(b.z - cp.z) < 0.75) {
          b.vz = Math.abs(b.vz) * 0.8 + 3.4;
          b.z = cp.z + 0.8;
          if (b.hazardCooldown <= 0) {
            b.hazardCooldown = 2.2;
            this.emit({ type: 'hazard', kind: 'copier', ball: b, popup: this.pickPopup('copier') });
          }
        }
      }

      // Retired Hardware Bumpers (CRT monitors, Dell towers, printer paper reams; e = 1.3)
      for (const bmp of c.hardwareBumpers) {
        const dx = b.x - bmp.x;
        const dz = b.z - bmp.z;
        const d = Math.hypot(dx, dz);
        const minD = bmp.r + RTO_BALL_RADIUS;
        if (d < minD && d > 0.001) {
          const nx = dx / d;
          const nz = dz / d;
          b.x = bmp.x + nx * minD;
          b.z = bmp.z + nz * minD;
          const vn = b.vx * nx + b.vz * nz;
          if (vn < 0) {
            b.vx -= (1 + 1.3) * vn * nx;
            b.vz -= (1 + 1.3) * vn * nz;
          }
          if (b.hazardCooldown <= 0) {
            b.hazardCooldown = 2.2;
            this.emit({ type: 'hazard', kind: 'hardware', ball: b, popup: this.pickPopup('hardware') });
          }
        }
      }

      // ?ReturnUrl= Security Detour Loop (forces a pointless U-turn spit-out back onto fairway)
      if (Math.hypot(b.x - c.detour.x, b.z - c.detour.z) < c.detour.r && b.hazardCooldown <= 0) {
        b.hazardCooldown = 3.0;
        b.vx = -6.2;
        b.vz = -11.5;
        this.emit({ type: 'hazard', kind: 'detour', ball: b, popup: this.pickPopup('detour') });
      }

      // Distance to mug & Mug Capture / Lip-Out physics
      b.distToPin = Math.hypot(b.x - c.cup.x, b.z - c.cup.z);
      const speed = Math.hypot(b.vx, b.vz);
      const effectiveCapture = gimmeStrength > 0 ? RTO_CAPTURE_SPEED * 2.4 : RTO_CAPTURE_SPEED;
      if (b.distToPin < RTO_CUP_RADIUS) {
        if (speed < effectiveCapture) {
          b.sunk = true;
          b.sunkAt = this.time;
          b.x = c.cup.x;
          b.z = c.cup.z;
          b.vx = 0;
          b.vz = 0;
          b.distToPin = 0;
          if (!this.winner) {
            this.winner = b;
            this.done = true;
            this.emit({ type: 'cup', ball: b });
            return;
          }
        } else {
          const ang = Math.atan2(b.z - c.cup.z, b.x - c.cup.x) + 0.85;
          b.vx = Math.cos(ang) * speed * 0.55;
          b.vz = Math.sin(ang) * speed * 0.55;
          this.emit({ type: 'lipout', ball: b });
        }
      }

      // Auto-Putt Loop when a ball comes to rest
      if (speed < 1.1) {
        b.restTime += dt;
        if (b.restTime >= 0.45) {
          this.puttBall(b, false);
          this.emit({ type: 'putt', ball: b });
        }
      } else {
        b.restTime = 0;
      }
    }

    // Elastic ball-to-ball caroms (e = 0.85)
    const minBallD = RTO_BALL_RADIUS * 2;
    for (let i = 0; i < this.balls.length; i++) {
      const a = this.balls[i];
      if (a.sunk) continue;
      for (let j = i + 1; j < this.balls.length; j++) {
        const b = this.balls[j];
        if (b.sunk) continue;
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const d = Math.hypot(dx, dz);
        if (d < minBallD && d > 0.0001) {
          const nx = dx / d;
          const nz = dz / d;
          const overlap = (minBallD - d) * 0.5;
          a.x -= nx * overlap;
          a.z -= nz * overlap;
          b.x += nx * overlap;
          b.z += nz * overlap;
          const rvx = b.vx - a.vx;
          const rvz = b.vz - a.vz;
          const vn = rvx * nx + rvz * nz;
          if (vn < 0) {
            const imp = -(1 + 0.85) * vn * 0.5;
            a.vx -= imp * nx;
            a.vz -= imp * nz;
            b.vx += imp * nx;
            b.vz += imp * nz;
          }
        }
      }
    }
  }

  standings() {
    return [...this.balls].sort((a, b) => a.distToPin - b.distToPin);
  }
}

/** Runs a full RTO Mini-Golf match headlessly (for unit tests & no-WebGL fallback). */
export function runRtoHeadless(names, { duration = DEFAULT_RTO_DURATION, rng = Math.random } = {}) {
  const sim = new RtoSim({ names, duration, rng });
  const maxTime = Math.max(30, normalizeRtoDuration(duration) + 25);
  while (!sim.done && sim.time < maxTime) sim.step(1 / 60);
  return sim;
}
