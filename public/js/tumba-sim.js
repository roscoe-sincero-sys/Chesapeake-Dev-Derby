// "Tumba Lata" (Slipper-Slinging Server Raid): fairness-first 1/N pre-rolled choreography,
// parabolic tsinelas (flip-flop) ballistics, tin-can (PROD SERVER) knockdown & bounce curve,
// Bantay pacemaker timing, 2-state street scramble (SEEK_SLIPPER -> FLEE_TO_BADLIS), and
// multi-volley duration scaling (10s–120s). Pure logic (no Three.js, no DOM).

import { MAX_NAMES } from './data-rules.js';

export const MIN_TUMBA_PLAYERS = 2;
export const MAX_TUMBA_PLAYERS = MAX_NAMES; // 30

export const TUMBA_DURATIONS = [
  { seconds: 120, variant: 'fiesta', label: '120s', text: '120s · Fiesta Elimination' },
  { seconds: 60, variant: 'fiesta', label: '60s', text: '60s · Fiesta Elimination' },
  { seconds: 30, variant: 'barangay', label: '30s', text: '30s · Classic Barangay Round' },
  { seconds: 15, variant: 'blitz', label: '15s', text: '15s · Street Blitz' },
  { seconds: 10, variant: 'blitz', label: '10s', text: '10s · Street Blitz' },
];
export const DEFAULT_TUMBA_DURATION = 15;

export function normalizeTumbaDuration(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_TUMBA_DURATION;
  let best = TUMBA_DURATIONS[0].seconds;
  let dist = Math.abs(n - best);
  for (const step of TUMBA_DURATIONS) {
    const d = Math.abs(n - step.seconds);
    if (d < dist) { best = step.seconds; dist = d; }
  }
  return best;
}

export function tumbaVariant(seconds) {
  const s = normalizeTumbaDuration(seconds);
  if (s <= 15) return { id: 'blitz', label: 'Street Blitz', volleys: 1 };
  if (s <= 30) return { id: 'barangay', label: 'Classic Barangay Round', volleys: 2 };
  return { id: 'fiesta', label: 'Fiesta Elimination', volleys: 3 };
}

/** Exact dev-humor popups from docs/tumba_lata_game_mode_spec.md. */
export const TUMBA_POPUPS = {
  hit: [
    'SMTP Relay Server is down — SIBAT!',
    'Impas ang user table!',
    "Way-gamit feature paksit'd prod",
  ],
  whiff: [
    'Blocked by bahaw software license',
    'Works on my side of the badlis',
    'Zabardasti feature giguba ang prod',
    'URL edits banned. Fix: add ?ReturnUrl=',
  ],
  scramble: [
    "Grabbed someone else's branch!",
    'Hotfix rolled back the clock too fast!',
    "Failed to read Iklauti-ji's mind",
    'Blocked by audit logs not being available',
  ],
};

// Street coordinate constants
export const BADLIS_Z = 10.0;       // Glowing chalk throw / safe line
export const CAN_HOME_Z = -4.0;     // Center chalk circle where PROD SERVER stands
export const STREET_HALF_W = 8.2;   // Street curb-to-curb half width
export const SLIPPER_GRAVITY = 15.0;

const PLAYER_COLORS = [
  '#ff6b6b', '#4dabf7', '#51cf66', '#ffd43b', '#cc5de8', '#ff922b',
  '#20c997', '#f06595', '#748ffc', '#a9e34b', '#3bc9db', '#fcc419',
];

function pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

/** Solves exact parabolic initial velocity from p0 to pL over flight duration T under SLIPPER_GRAVITY. */
export function solveSlipperVelocity(p0, pL, T) {
  const t = Math.max(0.25, T);
  return {
    vx: (pL.x - p0.x) / t,
    vy: (pL.y - p0.y + 0.5 * SLIPPER_GRAVITY * t * t) / t,
    vz: (pL.z - p0.z) / t,
  };
}

/**
 * Plans a complete, fairness-first Tumba Lata match for 2..30 players.
 * Every player has an exact 1/N chance of being tagged as the new Bantay (standup leader).
 */
export function planTumbaMatch(names, { duration = DEFAULT_TUMBA_DURATION, rng = Math.random } = {}) {
  if (!Array.isArray(names) || names.length < MIN_TUMBA_PLAYERS || names.length > MAX_TUMBA_PLAYERS) {
    throw new Error(`Tumba Lata needs ${MIN_TUMBA_PLAYERS}–${MAX_TUMBA_PLAYERS} players.`);
  }
  const dur = normalizeTumbaDuration(duration);
  const variant = tumbaVariant(dur);
  const n = names.length;

  // Fairness-first 1/N roll for the dev who gets tagged as the new Bantay
  const winnerId = Math.floor(rng() * n);
  const others = Array.from({ length: n }, (_, i) => i).filter((i) => i !== winnerId);
  // Shuffle others to pick 1–2 close-call finalists for nail-biting suspense
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }
  const closeCallIds = new Set(others.slice(0, Math.min(2, others.length)));

  // Line up players behind the glowing chalk badlis
  const spanX = Math.min(STREET_HALF_W * 1.55, Math.max(4.0, (n - 1) * 1.35));
  const players = names.map((name, id) => {
    const row = n > 10 ? Math.floor(id / 10) : 0;
    const inRow = n > 10 ? Math.min(10, n - row * 10) : n;
    const col = n > 10 ? id % 10 : id;
    const homeX = inRow === 1 ? 0 : ((col / (inRow - 1)) - 0.5) * spanX;
    const homeZ = BADLIS_Z + 1.15 + row * 1.45;
    return {
      id,
      name,
      color: PLAYER_COLORS[id % PLAYER_COLORS.length],
      homeX,
      homeZ,
      isWinner: id === winnerId,
      isCloseCall: closeCallIds.has(id),
    };
  });

  // Divide total duration into 1..3 timed volleys
  const volleyCount = variant.volleys;
  const volleyDur = dur / volleyCount;
  const volleys = [];

  for (let v = 0; v < volleyCount; v++) {
    const isFinal = v === volleyCount - 1;
    const startAt = v * volleyDur;
    const endAt = (v + 1) * volleyDur;
    const throwAt = startAt + Math.min(1.8, volleyDur * 0.16);
    const flightTime = Math.min(1.25, Math.max(0.85, volleyDur * 0.1));
    const hitAt = throwAt + flightTime;
    const restoreAt = startAt + volleyDur * (isFinal ? 0.72 : 0.78);
    const tagAt = isFinal ? startAt + volleyDur * 0.92 : null;

    // Pick 1–2 direct-hit throwers for this volley (never exclusively the winner so it feels natural)
    const hitThrower = players[Math.floor(rng() * n)].id;
    const canDist = 9.0 + rng() * 6.5;
    const canAngle = (rng() - 0.5) * 0.65;
    const canLand = {
      x: Math.sin(canAngle) * canDist,
      z: CAN_HOME_Z - Math.cos(canAngle) * canDist,
      dist: canDist,
    };

    // Bantay pacemaker timing: leaves circle at hitAt + 0.18, reaches can halfway, returns at restoreAt
    const bantayGrabAt = hitAt + (restoreAt - hitAt) * 0.52;

    const throws = players.map((p) => {
      const p0 = { x: p.homeX, y: 1.25, z: BADLIS_Z - 0.1 };
      const isDirectHit = p.id === hitThrower;
      let landX;
      let landZ;
      if (isDirectHit) {
        landX = (rng() - 0.5) * 0.4;
        landZ = CAN_HOME_Z + (rng() - 0.5) * 0.35;
      } else if (isFinal && p.isWinner) {
        // Winner's slipper lands slightly deeper so the return sprint is genuinely tight
        landX = (rng() - 0.5) * (STREET_HALF_W * 1.15);
        landZ = CAN_HOME_Z - 4.8 - rng() * 3.8;
      } else if (isFinal && p.isCloseCall) {
        landX = (rng() - 0.5) * (STREET_HALF_W * 1.25);
        landZ = CAN_HOME_Z - 2.4 - rng() * 3.2;
      } else {
        landX = (rng() - 0.5) * (STREET_HALF_W * 1.45);
        landZ = CAN_HOME_Z + 5.5 - rng() * 9.5;
      }
      const pL = { x: landX, y: 0.12, z: landZ };
      const stagger = isDirectHit ? 0 : rng() * 0.18;
      const launchAt = throwAt + stagger;
      const landAt = launchAt + flightTime;
      const v0 = solveSlipperVelocity(p0, pL, flightTime);

      // Scramble timings (SEEK_SLIPPER -> FLEE_TO_BADLIS)
      const scrambleStart = hitAt + 0.25 + rng() * 0.25;
      const wrongSlipperDelay = isFinal && p.isWinner ? 0.55 : (rng() < 0.2 ? 0.35 : 0);
      const distOut = Math.hypot(landX - p.homeX, landZ - p.homeZ);
      const grabAt = Math.min(
        restoreAt - 0.35,
        scrambleStart + Math.max(0.85, (distOut / 11.5)) + wrongSlipperDelay,
      );

      let safeAt;
      if (isFinal && p.isWinner) {
        safeAt = null; // Gets tagged inches shy of the badlis!
      } else if (isFinal && p.isCloseCall) {
        safeAt = restoreAt + (tagAt - restoreAt) * (0.45 + rng() * 0.25);
      } else if (isFinal) {
        safeAt = Math.min(restoreAt + 0.25, grabAt + Math.max(0.85, (restoreAt - grabAt) * (0.65 + rng() * 0.3)));
      } else {
        safeAt = Math.min(endAt - 0.35, restoreAt - 0.1 + rng() * 0.2);
      }

      return {
        playerId: p.id,
        p0,
        pL,
        v0,
        launchAt,
        landAt,
        flightTime,
        isDirectHit,
        wrongSlipperDelay,
        scrambleStart,
        grabAt,
        safeAt,
        spinX: 11 + rng() * 7,
        spinZ: (rng() - 0.5) * 8,
        popup: isDirectHit
          ? pick(TUMBA_POPUPS.hit, rng)
          : (rng() < 0.35 ? pick(TUMBA_POPUPS.whiff, rng) : null),
        scramblePopup: (isFinal && p.isWinner) || wrongSlipperDelay > 0
          ? pick(TUMBA_POPUPS.scramble, rng)
          : null,
      };
    });

    volleys.push({
      index: v,
      isFinal,
      startAt,
      endAt,
      throwAt,
      hitAt,
      bantayGrabAt,
      restoreAt,
      tagAt,
      canLand,
      hitThrower,
      hitPopup: pick(TUMBA_POPUPS.hit, rng),
      throws,
    });
  }

  return {
    duration: dur,
    variant,
    players,
    winnerId,
    winner: players[winnerId],
    volleys,
  };
}

/** Samples a slipper's 3D position and state at match time `t` within `volley`. */
export function sampleSlipperState(th, volley, playerState, t) {
  if (t < th.launchAt) {
    return { x: th.p0.x, y: th.p0.y, z: th.p0.z, phase: 'held', spin: 0 };
  }
  if (t < th.landAt) {
    const dt = t - th.launchAt;
    const x = th.p0.x + th.v0.vx * dt;
    const y = Math.max(0.12, th.p0.y + th.v0.vy * dt - 0.5 * SLIPPER_GRAVITY * dt * dt);
    const z = th.p0.z + th.v0.vz * dt;
    return { x, y, z, phase: 'flight', spin: dt };
  }
  if (t < th.grabAt) {
    // 1 damped micro-skip right after landing
    const sinceLand = t - th.landAt;
    const skipY = sinceLand < 0.28 ? Math.sin((sinceLand / 0.28) * Math.PI) * 0.45 : 0;
    return { x: th.pL.x, y: 0.12 + skipY, z: th.pL.z, phase: 'ground', spin: th.flightTime };
  }
  // Picked up and carried back in the dev's hand
  return { x: playerState.x + 0.32, y: 1.05, z: playerState.z - 0.25, phase: 'carried', spin: 0 };
}

/** Samples the PROD SERVER tin can's 3D position & tumble state at time `t`. */
export function sampleCanState(volley, bantayPos, t) {
  if (t < volley.hitAt) {
    return { x: 0, y: 0.55, z: CAN_HOME_Z, knocked: false, restored: false, tumble: 0 };
  }
  const flyDur = 0.85;
  if (t < volley.hitAt + flyDur) {
    const u = (t - volley.hitAt) / flyDur;
    // Damped multi-bounce arc down the asphalt
    const bounce = Math.abs(Math.sin(u * Math.PI * 2.5)) * (1 - u) * 3.2;
    return {
      x: volley.canLand.x * u,
      y: 0.35 + bounce,
      z: CAN_HOME_Z + (volley.canLand.z - CAN_HOME_Z) * u,
      knocked: true,
      restored: false,
      tumble: u * 14,
    };
  }
  if (t < volley.bantayGrabAt) {
    return {
      x: volley.canLand.x,
      y: 0.32,
      z: volley.canLand.z,
      knocked: true,
      restored: false,
      tumble: 14,
    };
  }
  if (t < volley.restoreAt) {
    // Carried back in the Bantay's hand
    return {
      x: bantayPos.x - 0.35,
      y: 1.15,
      z: bantayPos.z + 0.3,
      knocked: true,
      restored: false,
      tumble: 0,
    };
  }
  // Slammed upright back inside the glowing chalk circle!
  return { x: 0, y: 0.55, z: CAN_HOME_Z, knocked: false, restored: true, tumble: 0 };
}

/** Samples a player's 2D street position & animation state at time `t`. */
export function samplePlayerState(p, th, volley, t) {
  if (t < th.scrambleStart) {
    return { x: p.homeX, z: p.homeZ, state: 'ready', runPhase: 0, safe: true };
  }
  if (t < th.grabAt) {
    // SEEK_SLIPPER
    const u = Math.min(1, (t - th.scrambleStart) / Math.max(0.2, th.grabAt - th.scrambleStart));
    const ease = u * u * (3 - 2 * u);
    const sway = th.wrongSlipperDelay > 0 ? Math.sin(u * Math.PI * 2) * 1.1 : 0;
    return {
      x: p.homeX + (th.pL.x - p.homeX) * ease + sway,
      z: p.homeZ + (th.pL.z - p.homeZ) * ease,
      state: 'seek',
      runPhase: t * 14 + p.id,
      safe: false,
    };
  }
  // FLEE_TO_BADLIS
  if (th.safeAt !== null) {
    if (t >= th.safeAt) {
      return { x: p.homeX, z: p.homeZ, state: 'safe', runPhase: 0, safe: true };
    }
    const u = (t - th.grabAt) / Math.max(0.2, th.safeAt - th.grabAt);
    return {
      x: th.pL.x + (p.homeX - th.pL.x) * u,
      z: th.pL.z + (p.homeZ - th.pL.z) * u,
      state: 'flee',
      runPhase: t * 16 + p.id,
      safe: false,
    };
  }
  // Pre-rolled tagged target: sprints desperately toward BADLIS_Z but slips inches shy at tagAt!
  const tagAt = volley.tagAt ?? volley.endAt;
  const u = Math.min(1, (t - th.grabAt) / Math.max(0.2, tagAt - th.grabAt));
  const stopZ = BADLIS_Z - 1.15;
  return {
    x: th.pL.x + (p.homeX * 0.45 - th.pL.x) * u,
    z: th.pL.z + (stopZ - th.pL.z) * u,
    state: t >= tagAt ? 'tagged' : 'flee',
    runPhase: t >= tagAt ? 0 : t * 17 + p.id,
    safe: false,
  };
}

/** Samples the AI Bantay's street position & hunting state at time `t`. */
export function sampleBantayState(volley, targetPlayerPos, t) {
  if (t < volley.hitAt + 0.18) {
    // Nervous pacing around the PROD SERVER tin can
    const pace = Math.sin(t * 2.4) * 1.4;
    return { x: pace, z: CAN_HOME_Z - 1.4, hunting: false, runPhase: t * 6 };
  }
  if (t < volley.bantayGrabAt) {
    const u = (t - (volley.hitAt + 0.18)) / Math.max(0.2, volley.bantayGrabAt - (volley.hitAt + 0.18));
    return {
      x: volley.canLand.x * u,
      z: CAN_HOME_Z - 1.4 + (volley.canLand.z - (CAN_HOME_Z - 1.4)) * u,
      hunting: false,
      runPhase: t * 16,
    };
  }
  if (t < volley.restoreAt) {
    const u = (t - volley.bantayGrabAt) / Math.max(0.2, volley.restoreAt - volley.bantayGrabAt);
    return {
      x: volley.canLand.x * (1 - u),
      z: volley.canLand.z + (CAN_HOME_Z - volley.canLand.z) * u,
      hunting: false,
      runPhase: t * 17,
    };
  }
  // PROD RESTORED — HUNTING MODE! Lunge toward the final straggler!
  const huntEnd = volley.tagAt ?? volley.endAt;
  const u = Math.min(1, (t - volley.restoreAt) / Math.max(0.2, huntEnd - volley.restoreAt));
  const ease = 1 - Math.pow(1 - u, 1.4);
  return {
    x: targetPlayerPos.x * ease,
    z: CAN_HOME_Z + (targetPlayerPos.z - 0.65 - CAN_HOME_Z) * ease,
    hunting: true,
    runPhase: u >= 1 ? 0 : t * 20,
  };
}
