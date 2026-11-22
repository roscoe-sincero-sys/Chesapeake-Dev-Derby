// "Kanban Plinko" (3D Vertical Pinball): true 2.5D physics engine and vertical Kanban board layout.
// Pure logic (no Three.js, no DOM), so it runs in Node for unit tests and headless fallback.

import { shuffle } from './sim.js';
import { MAX_NAMES } from './data-rules.js';

export const MIN_PLINKO_PLAYERS = 2;
export const MAX_PLINKO_PLAYERS = MAX_NAMES; // 30

/** Duration choices matching the app's 10s–120s slider scale (longest to shortest). */
export const PLINKO_DURATIONS = [
  { seconds: 120, variant: 'marathon', label: '120s', text: '120s · Release Train' },
  { seconds: 60, variant: 'marathon', label: '60s', text: '60s · Release Train' },
  { seconds: 30, variant: 'standard', label: '30s', text: '30s · Standard Sprint' },
  { seconds: 15, variant: 'hotfix', label: '15s', text: '15s · Hotfix Drop' },
  { seconds: 10, variant: 'hotfix', label: '10s', text: '10s · Hotfix Drop' },
];
export const DEFAULT_PLINKO_DURATION = 30;

export function normalizePlinkoDuration(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_PLINKO_DURATION;
  let best = PLINKO_DURATIONS[0].seconds;
  let dist = Math.abs(n - best);
  for (const step of PLINKO_DURATIONS) {
    const d = Math.abs(n - step.seconds);
    if (d < dist) { best = step.seconds; dist = d; }
  }
  return best;
}

export function plinkoVariant(seconds) {
  const s = normalizePlinkoDuration(seconds);
  if (s <= 15) return 'hotfix';
  if (s <= 30) return 'standard';
  return 'marathon';
}

/** 2D board dimensions (units): x in [-HALF_W, HALF_W], y runs from top (height) down to 0 (Prod). */
export const BOARD_HALF_W = 8.0;
export const MARBLE_R = 0.42;
const PEG_R = 0.22;
const BUMPER_R = 0.72;
const SPINNER_LEN = 1.65;

const PALETTE = [
  '#ff6b6b', '#4dabf7', '#51cf66', '#ffd43b', '#cc5de8', '#ff922b',
  '#20c997', '#f06595', '#748ffc', '#a9e34b', '#3bc9db', '#fcc419',
];

/** Builds the 2.5D vertical Kanban board geometry for the selected duration variant. */
export function buildPlinkoBoard(duration = DEFAULT_PLINKO_DURATION) {
  const seconds = normalizePlinkoDuration(duration);
  const variant = plinkoVariant(seconds);

  const height = variant === 'hotfix' ? 22 : variant === 'standard' ? 32 : seconds >= 120 ? 44 : 38;
  const hopperY = height - 2.6;
  const zone2Top = hopperY - 1.2;
  const zone3Top = variant === 'hotfix' ? 9.5 : height * 0.46;
  const zone4Top = 7.4;
  const prodSlotHalf = variant === 'hotfix' ? 1.85 : 1.25;
  const gravity = variant === 'hotfix' ? 20.5 : variant === 'standard' ? 16.5 : 14.5;
  const lapsRequired = variant === 'marathon' ? (seconds >= 120 ? 3 : 2) : 1;

  const pegs = [];
  const bumpers = [];
  const spinners = [];
  const stickyPads = [];
  const warpPipes = [];
  const walls = [];

  // Zone 2: Staggered metallic pachinko peg grid
  const pegRowSpacing = 2.05;
  let rowIdx = 0;
  for (let y = zone2Top - 1.6; y > zone3Top + 1.2; y -= pegRowSpacing) {
    const stagger = rowIdx % 2 === 1;
    const cols = stagger ? 7 : 8;
    const span = BOARD_HALF_W * 2 - 2.2;
    for (let c = 0; c < cols; c++) {
      const x = -span / 2 + (c + (stagger ? 0.5 : 0)) * (span / (cols - (stagger ? 0 : 1)));
      if (Math.abs(x) < BOARD_HALF_W - 0.85) {
        pegs.push({ x, y, r: PEG_R });
      }
    }
    rowIdx++;
  }

  // Scope Creep Bumpers (high 1.4x restitution neon pop-bumpers)
  const bumperRows = variant === 'hotfix' ? 1 : variant === 'standard' ? 2 : 3;
  for (let r = 0; r < bumperRows; r++) {
    const by = zone2Top - 3.6 - r * 5.2;
    if (by <= zone3Top + 1.4) break;
    const xs = r % 2 === 0 ? [-3.4, 3.4] : [-4.6, 0, 4.6];
    for (const bx of xs) bumpers.push({ x: bx, y: by, r: BUMPER_R, flash: 0 });
  }
  // Remove any peg overlapping a bumper
  for (let i = pegs.length - 1; i >= 0; i--) {
    if (bumpers.some((b) => Math.hypot(pegs[i].x - b.x, pegs[i].y - b.y) < b.r + pegs[i].r + 0.55)) {
      pegs.splice(i, 1);
    }
  }

  // Zone 3: Code Review & QA bottleneck (walls, Merge Conflict Spinners, Tech Debt Sticky Pads, Warp Pipes)
  if (variant !== 'hotfix') {
    const midY = (zone3Top + zone4Top) * 0.52;
    // Angled bottleneck baffles
    walls.push(
      { x1: -BOARD_HALF_W, y1: zone3Top + 0.5, x2: -4.2, y2: midY + 1.1 },
      { x1: BOARD_HALF_W, y1: zone3Top + 0.5, x2: 4.2, y2: midY + 1.1 },
    );
    // Rotating 4-blade Merge Conflict Spinners
    spinners.push(
      { x: -2.4, y: midY + 0.3, len: SPINNER_LEN, angle: 0.2, speed: 1.9 },
      { x: 2.4, y: midY + 0.3, len: SPINNER_LEN, angle: 1.1, speed: -2.1 },
    );
    if (variant === 'marathon') {
      spinners.push({ x: 0, y: zone3Top - 1.5, len: SPINNER_LEN * 0.9, angle: 0.6, speed: 2.3 });
    }
    // Tech Debt Sticky Pads (amber friction strips)
    stickyPads.push(
      { x: -2.6, y: midY - 2.1, halfW: 1.4, halfH: 0.55 },
      { x: 2.6, y: midY - 2.1, halfW: 1.4, halfH: 0.55 },
    );
    // "Moved to Next Sprint" Warp Pipes on left & right walls of Zone 3
    warpPipes.push(
      { side: -1, x: -BOARD_HALF_W + 0.55, y: midY - 1.0, r: 0.78 },
      { side: 1, x: BOARD_HALF_W - 0.55, y: midY - 1.0, r: 0.78 },
    );
  }

  // Zone 4: Deploy to Prod V-funnel walls + LGTM Flippers
  const funnelTopY = zone4Top;
  const funnelBotY = 1.65;
  walls.push(
    { x1: -BOARD_HALF_W, y1: funnelTopY, x2: -prodSlotHalf - 0.3, y2: funnelBotY, isFunnel: true },
    { x1: BOARD_HALF_W, y1: funnelTopY, x2: prodSlotHalf + 0.3, y2: funnelBotY, isFunnel: true },
  );

  const flippers = [
    { side: -1, x: -prodSlotHalf - 0.3, y: funnelBotY + 0.25, len: 1.7, phase: 0, angle: -0.35 },
    { side: 1, x: prodSlotHalf + 0.3, y: funnelBotY + 0.25, len: 1.7, phase: Math.PI, angle: Math.PI + 0.35 },
  ];

  return {
    seconds,
    variant,
    height,
    halfW: BOARD_HALF_W,
    hopperY,
    zone2Top,
    zone3Top,
    zone4Top,
    prodSlotHalf,
    gravity,
    lapsRequired,
    pegs,
    bumpers,
    spinners,
    stickyPads,
    warpPipes,
    walls,
    flippers,
  };
}

/** Human-readable swimlane label for a marble's current Y coordinate. */
export function zoneNameForY(y, board) {
  if (y >= board.hopperY - 0.5) return 'In Backlog';
  if (y >= board.zone3Top) return 'In Progress';
  if (y >= board.zone4Top) return 'In QA';
  return 'Deploying!';
}

/**
 * Deterministic 2.5D vertical pinball simulation for Kanban Plinko.
 * Steps at fixed dt (1/60s), emits events for audio/HUD, and guarantees a timely finish via
 * Anti-Stuck Micro-Nudge and the Hard-Cap "Friday 4:55 PM Deploy" Force-Push fallback.
 */
export class PlinkoSim {
  constructor({ names, duration = DEFAULT_PLINKO_DURATION, rng = Math.random }) {
    if (!Array.isArray(names) || names.length < MIN_PLINKO_PLAYERS || names.length > MAX_PLINKO_PLAYERS) {
      throw new Error(`Kanban Plinko needs ${MIN_PLINKO_PLAYERS} to ${MAX_PLINKO_PLAYERS} players.`);
    }
    this.rng = rng;
    this.board = buildPlinkoBoard(duration);
    this.time = 0;
    this.gateOpen = false;
    this.forcePush = false;
    this.done = false;
    this.winner = null;
    this.events = [];

    const order = shuffle(names.map((_, i) => i), rng);
    this.marbles = names.map((name, id) => {
      const slot = order[id];
      const cols = Math.min(8, names.length);
      const col = slot % cols;
      const row = Math.floor(slot / cols);
      const spread = Math.min(BOARD_HALF_W - 1.2, cols * 0.72);
      const x = cols === 1 ? 0 : -spread + (col / (cols - 1)) * spread * 2 + (rng() - 0.5) * 0.25;
      const y = this.board.hopperY + 0.55 + row * 0.95;
      return {
        id,
        name,
        color: PALETTE[id % PALETTE.length],
        x,
        y,
        vx: (rng() - 0.5) * 1.4,
        vy: 0,
        lap: 1,
        stuckT: 0,
        warpCooldown: 0,
        warping: null, // { side, t, duration }
        finished: false,
      };
    });
  }

  drainEvents() {
    const out = this.events;
    this.events = [];
    return out;
  }

  /** Returns active marbles sorted by progress (highest lap, lowest y = closest to Prod). */
  standings() {
    return [...this.marbles].sort((a, b) => {
      if (a.finished !== b.finished) return a.finished ? -1 : 1;
      if (b.lap !== a.lap) return b.lap - a.lap;
      return a.y - b.y;
    });
  }

  step(dt) {
    if (this.done) return;
    this.time += dt;
    const b = this.board;

    // Open the Sprint Kickoff trapdoor after a 0.9s hopper rattle
    if (!this.gateOpen && this.time >= 0.9) {
      this.gateOpen = true;
      this.events.push({ type: 'kickoff', text: '🚀 Sprint Kickoff! Trapdoor open!' });
    }

    // Hard-Cap "Force Push" Fallback ("Friday 4:55 PM Deploy") at 78% of target duration
    if (!this.forcePush && this.time >= b.seconds * 0.78) {
      this.forcePush = true;
      b.prodSlotHalf = Math.max(b.prodSlotHalf, 2.35);
      // Widen the bottom funnel gap
      for (const w of b.walls) {
        if (w.isFunnel) w.x2 = Math.sign(w.x2) * (b.prodSlotHalf + 0.25);
      }
      this.events.push({ type: 'forcePush', text: '⚡ Friday 4:55 PM Deploy — Force-pushing to Prod!' });
    }

    // Update spinners & rhythmic LGTM flippers
    for (const sp of b.spinners) sp.angle += sp.speed * dt;
    for (const bp of b.bumpers) if (bp.flash > 0) bp.flash = Math.max(0, bp.flash - dt * 4);
    for (const fl of b.flippers) {
      const wave = this.forcePush ? 0 : Math.max(0, Math.sin(this.time * 4.2 + fl.phase));
      const swing = wave > 0.72 ? (wave - 0.72) / 0.28 : 0;
      fl.active = swing > 0.2;
      fl.angle = fl.side < 0 ? -0.35 + swing * 0.95 : Math.PI + 0.35 - swing * 0.95;
    }

    const grav = this.forcePush ? b.gravity * 1.45 : b.gravity;

    for (const m of this.marbles) {
      if (m.finished) continue;
      if (m.warpCooldown > 0) m.warpCooldown = Math.max(0, m.warpCooldown - dt);

      // Pneumatic Warp Pipe tube animation back up to The Backlog
      if (m.warping) {
        m.warping.t += dt;
        const q = Math.min(1, m.warping.t / m.warping.duration);
        m.x = m.warping.side * (BOARD_HALF_W + 0.65);
        m.y = m.warping.startY + (b.hopperY + 0.8 - m.warping.startY) * q;
        if (q >= 1) {
          m.x = m.warping.side * (BOARD_HALF_W - 1.6);
          m.y = b.hopperY + 0.5;
          m.vx = -m.warping.side * (2.5 + this.rng() * 2);
          m.vy = -1.0;
          m.warping = null;
          m.warpCooldown = 2.0;
        }
        continue;
      }

      // Gravity + subtle hopper vibration before kickoff
      m.vy -= grav * dt;
      if (!this.gateOpen) {
        m.vx += (this.rng() - 0.5) * 10 * dt;
      }

      // Tech Debt Sticky Pads dampen velocity
      for (const pad of b.stickyPads) {
        if (Math.abs(m.x - pad.x) < pad.halfW && Math.abs(m.y - pad.y) < pad.halfH) {
          const damp = Math.exp(-3.6 * dt);
          m.vx *= damp;
          m.vy *= damp;
        }
      }

      m.x += m.vx * dt;
      m.y += m.vy * dt;

      // Hopper trapdoor floor before Sprint Kickoff
      if (!this.gateOpen && m.y < b.hopperY + MARBLE_R) {
        m.y = b.hopperY + MARBLE_R;
        m.vy = Math.abs(m.vy) * 0.5 + 0.4;
      }

      // Side walls
      if (m.x < -BOARD_HALF_W + MARBLE_R) { m.x = -BOARD_HALF_W + MARBLE_R; m.vx = Math.abs(m.vx) * 0.72; }
      if (m.x > BOARD_HALF_W - MARBLE_R) { m.x = BOARD_HALF_W - MARBLE_R; m.vx = -Math.abs(m.vx) * 0.72; }
      if (m.y > b.height - MARBLE_R) { m.y = b.height - MARBLE_R; m.vy = -Math.abs(m.vy) * 0.5; }

      // Peg collisions
      for (const p of b.pegs) {
        const dx = m.x - p.x;
        const dy = m.y - p.y;
        const minD = MARBLE_R + p.r;
        const d2 = dx * dx + dy * dy;
        if (d2 > 0.00001 && d2 < minD * minD) {
          const d = Math.sqrt(d2);
          const nx = dx / d;
          const ny = dy / d;
          m.x = p.x + nx * minD;
          m.y = p.y + ny * minD;
          const vn = m.vx * nx + m.vy * ny;
          if (vn < 0) {
            m.vx -= 1.65 * vn * nx + (this.rng() - 0.5) * 0.4;
            m.vy -= 1.65 * vn * ny;
            const depth = Math.max(0, Math.min(1, 1 - m.y / b.height));
            this.events.push({ type: 'peg', depth });
          }
        }
      }

      // Scope Creep Bumpers (1.4x high-energy bounce!)
      for (const bp of b.bumpers) {
        const dx = m.x - bp.x;
        const dy = m.y - bp.y;
        const minD = MARBLE_R + bp.r;
        const d2 = dx * dx + dy * dy;
        if (d2 > 0.00001 && d2 < minD * minD) {
          const d = Math.sqrt(d2);
          const nx = dx / d;
          const ny = dy / d;
          m.x = bp.x + nx * minD;
          m.y = bp.y + ny * minD;
          const speed = Math.max(6.5, Math.hypot(m.vx, m.vy) * 1.4);
          m.vx = nx * speed;
          m.vy = ny * speed;
          bp.flash = 1;
          this.events.push({ type: 'bumper', x: bp.x, y: bp.y });
        }
      }

      // Merge Conflict Spinners (4-blade rotating turnstiles)
      for (const sp of b.spinners) {
        for (let blade = 0; blade < 2; blade++) {
          const a = sp.angle + (blade * Math.PI) / 2;
          const cx = Math.cos(a) * sp.len;
          const cy = Math.sin(a) * sp.len;
          if (collideSegment(m, sp.x - cx, sp.y - cy, sp.x + cx, sp.y + cy, 0.14, 0.72)) {
            m.vx += -Math.sin(a) * sp.speed * 0.9;
            m.vy += Math.cos(a) * sp.speed * 0.5;
          }
        }
      }

      // Baffle & V-funnel walls
      for (const w of b.walls) {
        collideSegment(m, w.x1, w.y1, w.x2, w.y2, 0.14, 0.55);
      }

      // LGTM Flippers
      for (const fl of b.flippers) {
        const x2 = fl.x + Math.cos(fl.angle) * fl.len;
        const y2 = fl.y + Math.sin(fl.angle) * fl.len;
        if (collideSegment(m, fl.x, fl.y, x2, y2, 0.18, fl.active ? 1.25 : 0.6)) {
          if (fl.active) {
            m.vy = Math.max(m.vy, 7.5 + this.rng() * 2.5);
            m.vx += -fl.side * 2.2;
            this.events.push({ type: 'flip', marble: m });
          }
        }
      }

      // "Moved to Next Sprint" Warp Pipes (disabled during Force Push!)
      if (!this.forcePush && m.warpCooldown <= 0) {
        for (const wp of b.warpPipes) {
          if (Math.hypot(m.x - wp.x, m.y - wp.y) < wp.r + MARBLE_R * 0.6) {
            m.warping = { side: wp.side, startY: m.y, t: 0, duration: 1.05 };
            const text = this.rng() < 0.5
              ? `🏝️ ${m.name} was voted off the team.`
              : `🌀 ${m.name} was Moved to Next Sprint!`;
            this.events.push({ type: 'warp', marble: m, text });
            break;
          }
        }
      }

      // Anti-Stuck Micro-Nudge (if speed < 0.65 for 0.6s after kickoff)
      if (this.gateOpen && !m.warping) {
        if (Math.hypot(m.vx, m.vy) < 0.65) {
          m.stuckT += dt;
          if (m.stuckT >= 0.6) {
            m.stuckT = 0;
            m.vx += (this.rng() < 0.5 ? -1 : 1) * (2.6 + this.rng() * 1.4);
            m.vy -= 1.2;
            this.events.push({ type: 'unblock', marble: m });
          }
        } else {
          m.stuckT = 0;
        }
      }

      // Clamp max velocity for clean simulation
      const spd = Math.hypot(m.vx, m.vy);
      if (spd > 24) {
        m.vx = (m.vx / spd) * 24;
        m.vy = (m.vy / spd) * 24;
      }

      // Finish check: dropped through the glowing PROD / LEAD STANDUP slot!
      if (m.y < 0.3) {
        if (Math.abs(m.x) <= b.prodSlotHalf + 0.55) {
          if (m.lap < b.lapsRequired) {
            // Multi-Sprint Marathon: advance to next Release Train lap (Dev -> Stage -> Prod)!
            m.lap++;
            const stageName = m.lap === b.lapsRequired ? 'Prod' : 'Stage';
            m.y = b.hopperY + 0.4;
            m.x = (this.rng() - 0.5) * 4;
            m.vx = (this.rng() - 0.5) * 3;
            m.vy = -1.5;
            this.events.push({ type: 'lap', marble: m, text: `🚂 ${m.name} advanced to ${stageName} (Lap ${m.lap}/${b.lapsRequired})!` });
          } else {
            m.finished = true;
            this.winner = m;
            this.done = true;
            this.events.push({ type: 'win', marble: m });
            return;
          }
        } else {
          // Bounced on bottom rim outside the slot -> kick back toward center
          m.y = 0.35;
          m.vy = Math.abs(m.vy) * 0.55 + 1.5;
          m.vx += -Math.sign(m.x) * 2.5;
        }
      }
    }

    // Marble-vs-marble elastic collisions
    const minDist = MARBLE_R * 2;
    for (let i = 0; i < this.marbles.length; i++) {
      const a = this.marbles[i];
      if (a.warping || a.finished) continue;
      for (let j = i + 1; j < this.marbles.length; j++) {
        const c = this.marbles[j];
        if (c.warping || c.finished) continue;
        const dx = c.x - a.x;
        const dy = c.y - a.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > 0.00001 && d2 < minDist * minDist) {
          const d = Math.sqrt(d2);
          const nx = dx / d;
          const ny = dy / d;
          const overlap = (minDist - d) * 0.5;
          a.x -= nx * overlap; a.y -= ny * overlap;
          c.x += nx * overlap; c.y += ny * overlap;
          const rvx = c.vx - a.vx;
          const rvy = c.vy - a.vy;
          const vn = rvx * nx + rvy * ny;
          if (vn < 0) {
            const imp = -0.82 * vn;
            a.vx -= imp * nx; a.vy -= imp * ny;
            c.vx += imp * nx; c.vy += imp * ny;
          }
        }
      }
    }
  }
}

/** Circle-vs-segment collision helper. Returns true if a collision occurred. */
function collideSegment(m, x1, y1, x2, y2, thickness, restitution) {
  const sx = x2 - x1;
  const sy = y2 - y1;
  const len2 = sx * sx + sy * sy || 1;
  const t = Math.max(0, Math.min(1, ((m.x - x1) * sx + (m.y - y1) * sy) / len2));
  const cx = x1 + sx * t;
  const cy = y1 + sy * t;
  const dx = m.x - cx;
  const dy = m.y - cy;
  const minD = MARBLE_R + thickness;
  const d2 = dx * dx + dy * dy;
  if (d2 > 0.00001 && d2 < minD * minD) {
    const d = Math.sqrt(d2);
    const nx = dx / d;
    const ny = dy / d;
    m.x = cx + nx * minD;
    m.y = cy + ny * minD;
    const vn = m.vx * nx + m.vy * ny;
    if (vn < 0) {
      m.vx -= (1 + restitution) * vn * nx;
      m.vy -= (1 + restitution) * vn * ny;
    }
    return true;
  }
  return false;
}

/** Runs a full Kanban Plinko match headlessly (for no-WebGL fallback & unit tests). */
export function runPlinkoHeadless(names, { duration = DEFAULT_PLINKO_DURATION, rng = Math.random } = {}) {
  const sim = new PlinkoSim({ names, duration, rng });
  const maxSteps = Math.ceil((sim.board.seconds + 45) * 60);
  for (let i = 0; i < maxSteps && !sim.done; i++) sim.step(1 / 60);
  return sim;
}
