// "Deploy Cannon" (3D Human Cannonball Volley): Reverse-Solved Ballistics planner.
// Pure logic (no Three.js, no DOM), so it runs in Node for unit tests and headless fallback.

import { shuffle } from './sim.js';
import { MAX_NAMES } from './data-rules.js';

export const MIN_CANNON_PLAYERS = 2;
export const MAX_CANNON_PLAYERS = MAX_NAMES; // 30

export const CANNON_DURATIONS = [
  { seconds: 120, variant: 'showcase', label: '120s', text: '120s · Artillery Showcase' },
  { seconds: 60, variant: 'showcase', label: '60s', text: '60s · Artillery Showcase' },
  { seconds: 30, variant: 'qualify', label: '30s', text: '30s · Two-Stage Qualification' },
  { seconds: 15, variant: 'volley', label: '15s', text: '15s · Hotfix Volley' },
  { seconds: 10, variant: 'volley', label: '10s', text: '10s · Hotfix Volley' },
];
export const DEFAULT_CANNON_DURATION = 15;

export function normalizeCannonDuration(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_CANNON_DURATION;
  let best = CANNON_DURATIONS[0].seconds;
  let dist = Math.abs(n - best);
  for (const step of CANNON_DURATIONS) {
    const d = Math.abs(n - step.seconds);
    if (d < dist) { best = step.seconds; dist = d; }
  }
  return best;
}

export function cannonVariant(seconds) {
  const s = normalizeCannonDuration(seconds);
  if (s <= 15) return { id: 'volley', label: 'Hotfix Volley', movingBarge: false, twoStage: false, staggered: false };
  if (s <= 30) return { id: 'qualify', label: 'Two-Stage Qualification', movingBarge: true, twoStage: true, staggered: false };
  return { id: 'showcase', label: 'Artillery Showcase', movingBarge: true, twoStage: false, staggered: true };
}

/** Exact 6 flight mishap archetypes & dev-humor popups from docs/deploy_cannon_game_mode_spec.md. */
export const CANNON_ARCHETYPES = {
  pierDud: {
    id: 'pierDud',
    label: 'The Pier Dud',
    popups: ['Failed to renew software license', 'Failed to renew SSL cert'],
  },
  overshoot: {
    id: 'overshoot',
    label: 'The Overshoot',
    popups: ['16 chars is too long for a password', "Added managerial genius' unrequested feature"],
  },
  crosswind: {
    id: 'crosswind',
    label: 'The Crosswind Drift',
    popups: ['Blamed for not being clear', "Failed to read Ekmaatra's mind"],
  },
  seagull: {
    id: 'seagull',
    label: 'The Seagull Interception',
    popups: ['Blocked by own-party API', 'Blocked by common sense'],
  },
  chute: {
    id: 'chute',
    label: 'The Emergency Chute',
    popups: ['Busy completing an already completed data migration', 'Busy scrolling 800 columns'],
  },
  rimBounce: {
    id: 'rimBounce',
    label: 'The Rim-Bounce Heartbreak',
    popups: ['Blocked by BadalBhadak'],
  },
};

export const GRAVITY = 3.6;
export const BARGE_BASE_Z = -48;
export const BARGE_RADIUS = 7.8;
export const SLOW_MO_SCALE = 0.4;

const SHOT_COLORS = [
  '#ff6b6b', '#4dabf7', '#51cf66', '#ffd43b', '#cc5de8', '#ff922b',
  '#20c997', '#f06595', '#748ffc', '#a9e34b', '#3bc9db', '#fcc419',
];

/**
 * Responsive cannon battery layout along the Chesapeake Bay wooden pier:
 * - 2..12 players: single gently curved pier arc (tier 0)
 * - 13..30 players: two staggered stadium tiers (front pier deck + raised back parapet)
 */
export function cannonBattery(count) {
  const spots = [];
  if (count <= 12) {
    const span = Math.min(22, Math.max(4.5, (count - 1) * 2.15));
    for (let i = 0; i < count; i++) {
      const frac = count === 1 ? 0.5 : i / (count - 1);
      const x = (frac - 0.5) * span;
      const curve = Math.cos((frac - 0.5) * Math.PI) * 1.4;
      spots.push({ x, y: 0.9, z: 2.2 - curve, tier: 0 });
    }
    return spots;
  }

  const frontCount = Math.ceil(count / 2);
  const backCount = count - frontCount;
  const frontSpan = Math.min(26, (frontCount - 1) * 1.85);
  const backSpan = Math.min(25, (backCount - 1) * 1.85);
  for (let i = 0; i < frontCount; i++) {
    const frac = frontCount === 1 ? 0.5 : i / (frontCount - 1);
    spots.push({ x: (frac - 0.5) * frontSpan, y: 0.9, z: 1.0, tier: 0 });
  }
  for (let i = 0; i < backCount; i++) {
    const frac = backCount === 1 ? 0.5 : i / (backCount - 1);
    spots.push({ x: (frac - 0.5) * backSpan, y: 2.8, z: 4.2, tier: 1 });
  }
  return spots;
}

/** Position of the floating bullseye barge at time `t` (stationary in 10s-15s, drifting/weaving in 30s-120s). */
export function bargePosAt(plan, t) {
  if (!plan.variant.movingBarge) {
    return { x: 0, y: 0.35 + Math.sin(t * 2.2) * 0.14, z: BARGE_BASE_Z };
  }
  const ampX = plan.variant.id === 'showcase' ? 11.5 : 6.8;
  const speed = plan.variant.id === 'showcase' ? 0.42 : 0.55;
  return {
    x: Math.sin(t * speed) * ampX,
    y: 0.35 + Math.sin(t * 2.4) * 0.18,
    z: BARGE_BASE_Z + Math.cos(t * speed * 0.7) * 3.5,
  };
}

/** Exact reverse-solved ballistic initial velocity vector needed to hit `pT` from `p0` in duration `T`. */
export function solveBallisticVelocity(p0, pT, T, gravity = GRAVITY) {
  const safeT = Math.max(0.2, T);
  return {
    vx: (pT.x - p0.x) / safeT,
    vy: (pT.y - p0.y + 0.5 * gravity * safeT * safeT) / safeT,
    vz: (pT.z - p0.z) / safeT,
  };
}

/**
 * Plans a complete Deploy Cannon match with fairness-first 1/N winner selection,
 * reverse-solved parabolic trajectories, 6 comedic mishap archetypes, and duration scaling.
 */
export function planCannonMatch(names, { duration = DEFAULT_CANNON_DURATION, rng = Math.random } = {}) {
  if (!Array.isArray(names) || names.length < MIN_CANNON_PLAYERS || names.length > MAX_CANNON_PLAYERS) {
    throw new Error(`Deploy Cannon needs ${MIN_CANNON_PLAYERS}–${MAX_CANNON_PLAYERS} players.`);
  }

  const dur = normalizeCannonDuration(duration);
  const variant = cannonVariant(dur);
  const battery = cannonBattery(names.length);

  // Fair 1/N pre-rolled winner
  const winnerIndex = Math.floor(rng() * names.length);

  // Assign flight archetypes to all non-winners:
  // - 20-30% pierDud
  // - Final 1-2 decoys get rimBounce (heartbreak at the barge!)
  // - Remaining decoys get varied overshoot / crosswind / seagull / chute
  const losers = shuffle(
    names.map((_, i) => i).filter((i) => i !== winnerIndex),
    rng,
  );
  const rimCount = Math.min(losers.length, losers.length >= 4 ? 2 : 1);
  const dudCount = Math.max(0, Math.min(losers.length - rimCount, Math.round(losers.length * 0.25)));
  const rimSet = new Set(losers.slice(0, rimCount));
  const dudSet = new Set(losers.slice(rimCount, rimCount + dudCount));
  const midTypes = ['overshoot', 'crosswind', 'seagull', 'chute'];

  const fireStart = Math.min(2.4, dur * 0.17);
  const windKts = 16 + Math.floor(rng() * 18);
  const tempPlan = { variant };

  const shots = names.map((name, id) => {
    const isWinner = id === winnerIndex;
    const pad = battery[id];
    const p0 = { x: pad.x, y: pad.y + 1.35, z: pad.z - 1.55 };

    let archetype = 'bullseye';
    let popup = null;
    if (!isWinner) {
      if (rimSet.has(id)) archetype = 'rimBounce';
      else if (dudSet.has(id)) archetype = 'pierDud';
      else archetype = midTypes[(id + Math.floor(rng() * midTypes.length)) % midTypes.length];
      const pool = CANNON_ARCHETYPES[archetype].popups;
      popup = pool[Math.floor(rng() * pool.length)];
    }

    // Launch & flight timing scaled by duration variant
    let launchAt;
    let flightDur;
    if (variant.staggered) {
      // 60s-120s Artillery Showcase: staggered rapid-fire launches across the match!
      const orderRank = isWinner ? names.length - 1 : rimSet.has(id) ? names.length - 2 : losers.indexOf(id);
      const frac = names.length <= 1 ? 0 : Math.max(0, orderRank) / Math.max(1, names.length - 1);
      const launchWindow = Math.max(6, dur - 8.5);
      launchAt = fireStart + frac * launchWindow;
      flightDur = archetype === 'pierDud' ? 1.8 : 4.2 + (id % 3) * 0.35;
    } else if (variant.twoStage) {
      // 30s Two-Stage Qualification: Salvo 1 (early wave), finalists reload for Salvo 2 (Prod)!
      const isFinalist = isWinner || rimSet.has(id);
      launchAt = isFinalist ? dur * 0.54 + (id % 3) * 0.14 : fireStart + (id % 8) * 0.055;
      flightDur = archetype === 'pierDud' ? 2.1 : isFinalist ? Math.max(4.6, dur * 0.34) : 4.8 + rng() * 1.4;
    } else {
      // 10s-15s Hotfix Volley: one massive 30-60ms staggered rolling-thunder barrage!
      launchAt = fireStart + id * Math.min(0.055, 0.9 / Math.max(1, names.length));
      if (archetype === 'pierDud') flightDur = 1.6 + rng() * 0.45;
      else if (isWinner) flightDur = Math.min(8.2, Math.max(5.2, dur - launchAt - 1.15));
      else if (rimSet.has(id)) flightDur = Math.min(7.6, Math.max(4.7, dur - launchAt - 1.65));
      else flightDur = Math.min(6.4, Math.max(3.2, (dur - launchAt) * (0.56 + rng() * 0.16)));
    }

    const landAt = launchAt + flightDur;
    const bargeAtLand = bargePosAt(tempPlan, landAt);

    // Reverse-solved landing target coordinate + distance to bullseye
    let target;
    let distanceM;
    const side = rng() < 0.5 ? -1 : 1;
    if (isWinner) {
      target = { x: bargeAtLand.x, y: 0.72, z: bargeAtLand.z };
      distanceM = 0.0;
    } else if (archetype === 'pierDud') {
      target = { x: p0.x + (rng() - 0.5) * 2.2, y: 0.0, z: p0.z - 6.5 - rng() * 3.5 };
      distanceM = Number((Math.hypot(target.x - bargeAtLand.x, target.z - bargeAtLand.z)).toFixed(1));
    } else if (archetype === 'rimBounce') {
      const ang = (rng() * 0.9 + 0.25) * Math.PI * side;
      target = {
        x: bargeAtLand.x + Math.cos(ang) * (BARGE_RADIUS * 0.92),
        y: 0.65,
        z: bargeAtLand.z + Math.sin(ang) * (BARGE_RADIUS * 0.92),
      };
      distanceM = Number((BARGE_RADIUS * 0.95 + 1.4 + rng() * 1.8).toFixed(1));
    } else if (archetype === 'overshoot') {
      target = { x: bargeAtLand.x + (rng() - 0.5) * 14, y: 0.0, z: bargeAtLand.z - 22 - rng() * 14 };
      distanceM = Number(Math.hypot(target.x - bargeAtLand.x, target.z - bargeAtLand.z).toFixed(1));
    } else if (archetype === 'crosswind') {
      target = { x: bargeAtLand.x + side * (16 + rng() * 11), y: 0.0, z: bargeAtLand.z + (rng() - 0.5) * 10 };
      distanceM = Number(Math.hypot(target.x - bargeAtLand.x, target.z - bargeAtLand.z).toFixed(1));
    } else if (archetype === 'seagull') {
      target = { x: bargeAtLand.x + side * (12 + rng() * 9), y: 0.0, z: bargeAtLand.z + 10 + rng() * 9 };
      distanceM = Number(Math.hypot(target.x - bargeAtLand.x, target.z - bargeAtLand.z).toFixed(1));
    } else {
      // Emergency Chute gently drifts far off to the side
      target = { x: bargeAtLand.x + side * (18 + rng() * 10), y: 0.0, z: bargeAtLand.z + 8 + rng() * 12 };
      distanceM = Number(Math.hypot(target.x - bargeAtLand.x, target.z - bargeAtLand.z).toFixed(1));
    }

    const v0 = solveBallisticVelocity(p0, target, flightDur, GRAVITY);
    return {
      id,
      name,
      isWinner,
      color: SHOT_COLORS[id % SHOT_COLORS.length],
      pad,
      p0,
      target,
      v0,
      archetype,
      popup,
      launchAt,
      flightDur,
      landAt,
      distanceM,
      bounceDirX: target.x >= bargeAtLand.x ? 1 : -1,
      bounceDirZ: target.z >= bargeAtLand.z ? 1 : -1,
    };
  });

  const winner = shots[winnerIndex];
  const slowMoStart = Math.max(fireStart + 1.5, winner.landAt - 1.9);
  const winnerAt = winner.landAt + 0.65;

  return {
    duration: winnerAt,
    requestedDuration: dur,
    variant,
    windKts,
    fireStart,
    slowMoStart,
    winnerAt,
    shots,
    winner,
    winnerIndex,
  };
}

/**
 * Samples a cannonball dev's exact 3D position, visibility, and comedic state at time `t`.
 */
export function sampleShotState(shot, t, plan) {
  if (t < shot.launchAt) {
    return {
      x: shot.p0.x,
      y: shot.p0.y,
      z: shot.p0.z,
      inCannon: true,
      airborne: false,
      landed: false,
      splashed: false,
      chuteOpen: false,
      seagullHit: false,
      spin: 0,
    };
  }

  const dt = t - shot.launchAt;
  const T = shot.flightDur;

  if (dt <= T) {
    const frac = dt / T;
    // Standard exact reverse-solved parabola: p(t) = p0 + v0*t + 0.5*g*t^2
    let x = shot.p0.x + shot.v0.vx * dt;
    let y = shot.p0.y + shot.v0.vy * dt - 0.5 * GRAVITY * dt * dt;
    let z = shot.p0.z + shot.v0.vz * dt;

    // Optional comedic mid-air perturbations d(t) that vanish at endpoints so landing stays exact!
    const bell = Math.sin(frac * Math.PI);
    if (shot.archetype === 'crosswind') {
      x += Math.sin(frac * Math.PI * 1.5) * 3.2 * bell;
    } else if (shot.archetype === 'seagull' && frac > 0.5) {
      const k = (frac - 0.5) * 2;
      y += Math.sin(k * Math.PI) * 2.4;
    } else if (shot.archetype === 'chute' && frac > 0.42) {
      y += Math.sin(((frac - 0.42) / 0.58) * Math.PI) * 4.2;
    }

    return {
      x,
      y: Math.max(0.1, y),
      z,
      inCannon: false,
      airborne: true,
      landed: false,
      splashed: false,
      chuteOpen: shot.archetype === 'chute' && frac > 0.42,
      seagullHit: shot.archetype === 'seagull' && frac >= 0.48 && frac <= 0.62,
      spin: dt * (shot.archetype === 'seagull' ? 9.5 : 3.2),
    };
  }

  // Post-landing state
  const post = dt - T;
  if (shot.isWinner) {
    const b = bargePosAt(plan, t);
    return {
      x: b.x,
      y: b.y + 0.4 + Math.abs(Math.sin(post * 6)) * 0.45,
      z: b.z,
      inCannon: false,
      airborne: false,
      landed: true,
      splashed: false,
      chuteOpen: false,
      seagullHit: false,
      spin: 0,
    };
  }

  if (shot.archetype === 'rimBounce' && post < 0.75) {
    // Dramatic rim-bounce off the barge edge into the Chesapeake Bay!
    const f = post / 0.75;
    return {
      x: shot.target.x + shot.bounceDirX * f * 4.8,
      y: Math.max(0, shot.target.y + Math.sin(f * Math.PI) * 2.6 - f * 0.9),
      z: shot.target.z + shot.bounceDirZ * f * 4.8,
      inCannon: false,
      airborne: true,
      landed: false,
      splashed: false,
      chuteOpen: false,
      seagullHit: false,
      spin: post * 12,
    };
  }

  return {
    x: shot.target.x + (shot.archetype === 'rimBounce' ? shot.bounceDirX * 4.8 : 0),
    y: -0.35,
    z: shot.target.z + (shot.archetype === 'rimBounce' ? shot.bounceDirZ * 4.8 : 0),
    inCannon: false,
    airborne: false,
    landed: true,
    splashed: true,
    chuteOpen: false,
    seagullHit: false,
    spin: 0,
  };
}
