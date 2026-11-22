// "Standup Mini-Golf" (3D Simultaneous Putt-Putt): 2.5D rolling physics, heightmap slope
// acceleration, elastic ball-to-ball & rail collisions, spinning Sprint Review Windmill,
// pulsing BadalJwala Firewall Gate, Procurement Sand Traps, Legacy Code Water Hazards,
// Scope Creep Bumpers, cup lip-out physics, and Friday Afternoon Gimme fallback.
// Pure logic (no Three.js, no DOM), so it runs in Node for unit tests and headless fallback.

import { MAX_NAMES } from './data-rules.js';

export const MIN_GOLF_PLAYERS = 2;
export const MAX_GOLF_PLAYERS = MAX_NAMES; // 30

export const GOLF_DURATIONS = [
  { seconds: 120, variant: 'championship', label: '120s', text: '120s · 3-Hole Championship' },
  { seconds: 60, variant: 'championship', label: '60s', text: '60s · 3-Hole Championship' },
  { seconds: 30, variant: 'par3', label: '30s', text: '30s · Par-3 Floating Course' },
  { seconds: 15, variant: 'par1', label: '15s', text: '15s · Par-1 Hole-in-One Dash' },
  { seconds: 10, variant: 'par1', label: '10s', text: '10s · Par-1 Hole-in-One Dash' },
];
export const DEFAULT_GOLF_DURATION = 15;

export function normalizeGolfDuration(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_GOLF_DURATION;
  let best = GOLF_DURATIONS[0].seconds;
  let dist = Math.abs(n - best);
  for (const step of GOLF_DURATIONS) {
    const d = Math.abs(n - step.seconds);
    if (d < dist) { best = step.seconds; dist = d; }
  }
  return best;
}

export function golfVariant(seconds) {
  const s = normalizeGolfDuration(seconds);
  if (s <= 15) return { id: 'par1', label: 'Par-1 Hole-in-One Dash', length: 38, halfWidth: 6.2, windmills: 1, firewall: false, waterSplit: false, sandTraps: 1 };
  if (s <= 30) return { id: 'par3', label: 'Par-3 Floating Course', length: 54, halfWidth: 6.8, windmills: 1, firewall: true, waterSplit: true, sandTraps: 2 };
  return { id: 'championship', label: '3-Hole Chesapeake Championship', length: 70, halfWidth: 7.2, windmills: 2, firewall: true, waterSplit: true, sandTraps: 3 };
}

/** Exact dev-themed hazard popups from docs/standup_mini_golf_game_mode_spec.md. */
export const GOLF_HAZARD_POPUPS = {
  windmill: ['Blocked by expired software license', 'Blocked by expired SSL Certs'],
  firewall: ['BadalJwala 500 Error', '16-chars is too long'],
  sand: ['Waiting on developer poll results', 'Waiting on approval'],
  water: ['userLogin and eventLog broke audit logs', 'Unrequested feature broke prod'],
  bumper: ["Manager's pet feature", "Failed to read Iklauti-ji's mind"],
  detour: ['Anti-URL-tampering security feature broke links—solved by tampering with the URL (?ReturnUrl=)'],
};

export const BALL_RADIUS = 0.36;
export const CUP_RADIUS = 0.72;
export const CAPTURE_SPEED = 8.2;

const BALL_COLORS = [
  '#ff6b6b', '#4dabf7', '#51cf66', '#ffd43b', '#cc5de8', '#ff922b',
  '#20c997', '#f06595', '#748ffc', '#a9e34b', '#3bc9db', '#fcc419',
];

/** Builds the modular floating mini-golf course geometry and obstacle descriptors. */
export function buildGolfCourse(duration = DEFAULT_GOLF_DURATION) {
  const dur = normalizeGolfDuration(duration);
  const variant = golfVariant(dur);
  const L = variant.length;
  const W = variant.halfWidth;

  const cup = { x: 0, z: -L + 4.5 };

  // Spinning 4-blade Sprint Review Windmills
  const windmills = [{ x: 0, z: -L * 0.32, radius: 2.8, speed: 2.3 }];
  if (variant.windmills >= 2) {
    windmills.push({ x: 0, z: -L * 0.62, radius: 2.9, speed: -2.6 });
  }

  // Intermittent BadalJwala Firewall Gate
  const firewalls = variant.firewall
    ? [{ z: -L * 0.48, period: 3.6, closedFrac: 0.36 }]
    : [];

  // Procurement Sand Traps (heavy rolling drag)
  const sandTraps = [
    { x: -W * 0.52, z: -L * 0.42, rx: 2.1, rz: 3.4 },
  ];
  if (variant.sandTraps >= 2) {
    sandTraps.push({ x: W * 0.52, z: -L * 0.68, rx: 2.2, rz: 3.6 });
  }
  if (variant.sandTraps >= 3) {
    sandTraps.push({ x: -W * 0.45, z: -L * 0.78, rx: 2.0, rz: 3.0 });
  }

  // Legacy Code Water Hazard (side bays along the split shortcut bridge)
  const waterZones = variant.waterSplit
    ? [
        { xMin: -W - 0.5, xMax: -2.0, zMin: -L * 0.62, zMax: -L * 0.52 },
        { xMin: 2.0, xMax: W + 0.5, zMin: -L * 0.62, zMax: -L * 0.52 },
      ]
    : [];

  // Scope Creep Bumpers (high-restitution neon pinball posts)
  const bumpers = [
    { x: -2.6, z: -L * 0.22, r: 0.78 },
    { x: 2.6, z: -L * 0.22, r: 0.78 },
    { x: -2.9, z: -L * 0.74, r: 0.82 },
    { x: 2.9, z: -L * 0.74, r: 0.82 },
  ];
  if (variant.id !== 'par1') {
    bumpers.push({ x: 0, z: -L * 0.82, r: 0.72 });
  }

  // Optional "One Quick Idea" Detour Boost Pad on the right edge
  const detour = { x: W * 0.68, z: -L * 0.34, r: 1.35 };

  // Ramp up to the elevated DEPLOY TO PROD putting green
  const greenRampStartZ = -L * 0.72;
  const greenFlatZ = -L * 0.82;
  const greenHeight = 1.65;

  return {
    duration: dur,
    variant,
    length: L,
    halfWidth: W,
    cup,
    windmills,
    firewalls,
    sandTraps,
    waterZones,
    bumpers,
    detour,
    greenRampStartZ,
    greenFlatZ,
    greenHeight,
  };
}

/** Piecewise analytical course height y = h(x, z) (flat tee -> ramp -> elevated green -> cup depression). */
export function courseHeightAt(course, x, z) {
  let y = 0;
  if (z < course.greenRampStartZ) {
    if (z <= course.greenFlatZ) {
      y = course.greenHeight;
    } else {
      const f = (course.greenRampStartZ - z) / (course.greenRampStartZ - course.greenFlatZ);
      y = course.greenHeight * (f * f * (3 - 2 * f));
    }
  }
  // Gentle funnel dip near the cup rim
  const d = Math.hypot(x - course.cup.x, z - course.cup.z);
  if (d < 2.8) {
    const k = 1 - d / 2.8;
    y -= k * k * 0.22;
  }
  return y;
}

/** Local terrain gradient (dh/dx, dh/dz) for slope acceleration a = -g * grad(h). */
function slopeGradAt(course, x, z) {
  const eps = 0.08;
  return {
    gx: (courseHeightAt(course, x + eps, z) - courseHeightAt(course, x - eps, z)) / (2 * eps),
    gz: (courseHeightAt(course, x, z + eps) - courseHeightAt(course, x, z - eps)) / (2 * eps),
  };
}

/** True when a BadalJwala Firewall Gate is snapped shut at time `t`. */
export function isFirewallClosed(fw, t) {
  const phase = (t % fw.period) / fw.period;
  return phase < fw.closedFrac;
}

/**
 * Real-time 2.5D simultaneous mini-golf simulation for 2..30 players.
 */
export class GolfSim {
  constructor({ names, duration = DEFAULT_GOLF_DURATION, rng = Math.random } = {}) {
    if (!Array.isArray(names) || names.length < MIN_GOLF_PLAYERS || names.length > MAX_GOLF_PLAYERS) {
      throw new Error(`Standup Mini-Golf needs ${MIN_GOLF_PLAYERS}–${MAX_GOLF_PLAYERS} players.`);
    }
    this.rng = rng;
    this.course = buildGolfCourse(duration);
    this.time = 0;
    this.teedOff = false;
    this.teeOffAt = 1.6;
    this.done = false;
    this.winner = null;
    this.gimmeActive = false;
    this.events = [];

    // Line up all active dev balls in a tight grid on the BACKLOG tee pad
    const n = names.length;
    const cols = Math.min(8, Math.max(2, Math.ceil(Math.sqrt(n * 1.6))));
    const spanX = Math.min(this.course.halfWidth * 1.5, (cols - 1) * 1.15);
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
    const pool = GOLF_HAZARD_POPUPS[kind] ?? GOLF_HAZARD_POPUPS.bumper;
    return pool[Math.floor(this.rng() * pool.length)];
  }

  /** Fires a crisp putt aimed toward the cup (with slight fair angular & power variance). */
  puttBall(b, isTeeOff = false) {
    const dx = this.course.cup.x - b.x;
    const dz = this.course.cup.z - b.z;
    const dist = Math.max(0.5, Math.hypot(dx, dz));
    const jitter = (this.rng() - 0.5) * (isTeeOff ? 0.24 : 0.2);
    const angle = Math.atan2(dz, dx) + jitter;
    const basePower = isTeeOff
      ? Math.min(27, Math.max(17, dist * 0.52)) * (0.86 + this.rng() * 0.28)
      : Math.min(18, Math.max(6.2, dist * 0.62)) * (0.85 + this.rng() * 0.3);
    b.vx = Math.cos(angle) * basePower;
    b.vz = Math.sin(angle) * basePower;
    b.strokes++;
    b.restTime = 0;
  }

  step(dt) {
    if (this.done) return;
    this.time += dt;
    const c = this.course;

    // Synchronized TEE OFF!
    if (!this.teedOff && this.time >= this.teeOffAt) {
      this.teedOff = true;
      for (const b of this.balls) this.puttBall(b, true);
      this.emit({ type: 'teeOff' });
    }
    if (!this.teedOff) return;

    // Hard-Cap "Friday Afternoon Gimme" breeze as the round nears the selected duration
    const gimmeStart = Math.max(6.0, c.duration * 0.72);
    const gimmeStrength = this.time > gimmeStart
      ? Math.min(26, (this.time - gimmeStart) * 5.2)
      : 0;
    if (gimmeStrength > 0 && !this.gimmeActive) {
      this.gimmeActive = true;
      this.emit({ type: 'note', text: '🌬️ Friday Afternoon Gimme breeze guiding balls toward PROD!', important: true });
    }

    const g = 14.0;
    for (const b of this.balls) {
      if (b.sunk) continue;
      if (b.hazardCooldown > 0) b.hazardCooldown = Math.max(0, b.hazardCooldown - dt);

      // Terrain slope acceleration a = -g * grad(h)
      const grad = slopeGradAt(c, b.x, b.z);
      b.vx += -g * grad.gx * dt;
      b.vz += -g * grad.gz * dt;

      // Friday Afternoon Gimme inward breeze toward the pin
      if (gimmeStrength > 0) {
        const dx = c.cup.x - b.x;
        const dz = c.cup.z - b.z;
        const d = Math.max(0.2, Math.hypot(dx, dz));
        b.vx += (dx / d) * gimmeStrength * dt;
        b.vz += (dz / d) * gimmeStrength * dt;
      }

      // Check Procurement Sand Traps (heavy rolling drag)
      let inSand = false;
      for (const st of c.sandTraps) {
        const nx = (b.x - st.x) / st.rx;
        const nz = (b.z - st.z) / st.rz;
        if (nx * nx + nz * nz <= 1) {
          inSand = true;
          if (b.hazardCooldown <= 0) {
            b.hazardCooldown = 2.6;
            this.emit({ type: 'hazard', kind: 'sand', ball: b, popup: this.pickPopup('sand') });
          }
          break;
        }
      }

      // Surface rolling friction
      const drag = inSand ? 3.8 : 0.78;
      const damp = Math.exp(-drag * dt);
      b.vx *= damp;
      b.vz *= damp;

      // Integrate position
      b.x += b.vx * dt;
      b.z += b.vz * dt;
      b.y = courseHeightAt(c, b.x, b.z);
      if (b.z < b.checkpointZ - 6) b.checkpointZ = b.z + 3;

      // Wooden rail walls (e = 0.75)
      const maxX = c.halfWidth - BALL_RADIUS;
      if (b.x < -maxX) {
        b.x = -maxX;
        b.vx = Math.abs(b.vx) * 0.75;
        this.emit({ type: 'wall', ball: b });
      } else if (b.x > maxX) {
        b.x = maxX;
        b.vx = -Math.abs(b.vx) * 0.75;
        this.emit({ type: 'wall', ball: b });
      }
      if (b.z > -0.6) {
        b.z = -0.6;
        b.vz = -Math.abs(b.vz) * 0.75;
      } else if (b.z < -c.length + 0.8) {
        b.z = -c.length + 0.8;
        b.vz = Math.abs(b.vz) * 0.75;
        this.emit({ type: 'wall', ball: b });
      }

      // Legacy Code Water Hazards (respawn at checkpoint with time penalty)
      for (const wz of c.waterZones) {
        if (b.x >= wz.xMin && b.x <= wz.xMax && b.z >= wz.zMin && b.z <= wz.zMax) {
          this.emit({ type: 'hazard', kind: 'water', ball: b, x: b.x, z: b.z, popup: this.pickPopup('water') });
          b.x = (this.rng() - 0.5) * 2.2;
          b.z = Math.min(-2.5, b.checkpointZ);
          b.vx = 0;
          b.vz = 0;
          b.restTime = 0;
          b.hazardCooldown = 2.4;
          break;
        }
      }

      // Sprint Review Windmill blades (rhythmic center lane block)
      for (const wm of c.windmills) {
        if (Math.abs(b.z - wm.z) < 0.75 && Math.abs(b.x - wm.x) < wm.radius) {
          const bladeOpen = Math.abs(Math.sin(this.time * wm.speed)) > 0.45;
          if (!bladeOpen) {
            b.vz = Math.abs(b.vz) * 0.6 + 3.2;
            b.vx += (b.x >= wm.x ? 1 : -1) * 5.2;
            b.z = wm.z + 0.8;
            if (b.hazardCooldown <= 0) {
              b.hazardCooldown = 2.0;
              this.emit({ type: 'hazard', kind: 'windmill', ball: b, popup: this.pickPopup('windmill') });
            }
          }
        }
      }

      // BadalJwala Firewall Gate (pulsing orange energy barrier)
      for (const fw of c.firewalls) {
        if (isFirewallClosed(fw, this.time) && Math.abs(b.z - fw.z) < 0.7) {
          b.vz = Math.abs(b.vz) * 0.85 + 3.5;
          b.z = fw.z + 0.75;
          if (b.hazardCooldown <= 0) {
            b.hazardCooldown = 2.2;
            this.emit({ type: 'hazard', kind: 'firewall', ball: b, popup: this.pickPopup('firewall') });
          }
        }
      }

      // Scope Creep Bumpers (high-restitution neon posts e = 1.3)
      for (const bmp of c.bumpers) {
        const dx = b.x - bmp.x;
        const dz = b.z - bmp.z;
        const d = Math.hypot(dx, dz);
        const minD = bmp.r + BALL_RADIUS;
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
            this.emit({ type: 'hazard', kind: 'bumper', ball: b, popup: this.pickPopup('bumper') });
          }
        }
      }

      // "One Quick Idea" Detour Boost Pad
      if (Math.hypot(b.x - c.detour.x, b.z - c.detour.z) < c.detour.r && b.hazardCooldown <= 0) {
        b.hazardCooldown = 3.0;
        b.vx = -4.5;
        b.vz = -16.5;
        this.emit({ type: 'hazard', kind: 'detour', ball: b, popup: this.pickPopup('detour') });
      }

      // Distance to pin & Cup Capture / Lip-Out physics
      b.distToPin = Math.hypot(b.x - c.cup.x, b.z - c.cup.z);
      const speed = Math.hypot(b.vx, b.vz);
      const effectiveCapture = gimmeStrength > 0 ? CAPTURE_SPEED * 2.4 : CAPTURE_SPEED;
      if (b.distToPin < CUP_RADIUS) {
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
          // Dramatic lip-out deflection around the rim!
          const ang = Math.atan2(b.z - c.cup.z, b.x - c.cup.x) + 0.8;
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

    // Elastic ball-to-ball collisions (e = 0.85)
    const minBallD = BALL_RADIUS * 2;
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

/** Runs a full Standup Mini-Golf match headlessly (for unit tests & no-WebGL fallback). */
export function runGolfHeadless(names, { duration = DEFAULT_GOLF_DURATION, rng = Math.random } = {}) {
  const sim = new GolfSim({ names, duration, rng });
  const maxTime = Math.max(30, normalizeGolfDuration(duration) + 25);
  while (!sim.done && sim.time < maxTime) sim.step(1 / 60);
  return sim;
}
