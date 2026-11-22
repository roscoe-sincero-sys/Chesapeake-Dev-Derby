// The game modes the lobby offers. Each mode is one self-describing entry: its name, how many players
// it takes, the options it offers, and how it starts. The lobby works from this list without knowing
// which modes exist. "Just pick someone" is a shared lobby action, not a mode.
//
// Adding a mode: write its game module, add an entry to MODES, add its `winMode` to WIN_MODES
// (data-rules.js), and give it a history label in MODE and a summary count in MODE_COUNT (page-common.js).
// test/modes.test.js checks all three.

import { runHeadless } from './game.js';
import { who, throwText } from './hud.js';
import { prepareWrestlerModels } from './wrestlers.js';
import { planMatch, MIN_WRESTLERS, MAX_WRESTLERS, WRESTLER_KINDS } from './wrestle-sim.js';
import { RACER_KINDS } from './racers.js';
import { RACE_LENGTHS, DEFAULT_SPEED, normalizeSpeed } from './race-lengths.js';
import {
  planDeathmatch,
  MIN_DEATHMATCH_PLAYERS,
  MAX_DEATHMATCH_PLAYERS,
  DEVELOPER_KINDS,
  DM_POWERUPS,
} from './deathmatch-sim.js';
import {
  planClawMatch,
  MIN_CLAW_PLAYERS,
  MAX_CLAW_PLAYERS,
  CLAW_DURATIONS,
  DEFAULT_CLAW_DURATION,
  normalizeClawDuration,
} from './claw-sim.js';
import {
  runPlinkoHeadless,
  MIN_PLINKO_PLAYERS,
  MAX_PLINKO_PLAYERS,
  PLINKO_DURATIONS,
  DEFAULT_PLINKO_DURATION,
  normalizePlinkoDuration,
} from './plinko-sim.js';
import {
  runFreezeHeadless,
  MIN_FREEZE_PLAYERS,
  MAX_FREEZE_PLAYERS,
  FREEZE_DURATIONS,
  DEFAULT_FREEZE_DURATION,
  normalizeFreezeDuration,
} from './freeze-sim.js';
import {
  planLaunchMatch,
  MIN_LAUNCH_PLAYERS,
  MAX_LAUNCH_PLAYERS,
  LAUNCH_DURATIONS,
  DEFAULT_LAUNCH_DURATION,
  normalizeLaunchDuration,
} from './launchpad-sim.js';
import {
  planJengaMatch,
  MIN_JENGA_PLAYERS,
  MAX_JENGA_PLAYERS,
  JENGA_DURATIONS,
  DEFAULT_JENGA_DURATION,
  normalizeJengaDuration,
} from './jenga-sim.js';
import {
  planCannonMatch,
  MIN_CANNON_PLAYERS,
  MAX_CANNON_PLAYERS,
  CANNON_DURATIONS,
  DEFAULT_CANNON_DURATION,
  normalizeCannonDuration,
} from './cannon-sim.js';
import {
  runGolfHeadless,
  MIN_GOLF_PLAYERS,
  MAX_GOLF_PLAYERS,
  GOLF_DURATIONS,
  DEFAULT_GOLF_DURATION,
  normalizeGolfDuration,
} from './golf-sim.js';
import {
  runRtoHeadless,
  MIN_RTO_PLAYERS,
  MAX_RTO_PLAYERS,
  RTO_DURATIONS,
  DEFAULT_RTO_DURATION,
  normalizeRtoDuration,
} from './rto-sim.js';
import {
  planTumbaMatch,
  MIN_TUMBA_PLAYERS,
  MAX_TUMBA_PLAYERS,
  TUMBA_DURATIONS,
  DEFAULT_TUMBA_DURATION,
  normalizeTumbaDuration,
} from './tumba-sim.js';
import {
  planKarangMatch,
  MIN_KARANG_PLAYERS,
  MAX_KARANG_PLAYERS,
  KARANG_DURATIONS,
  DEFAULT_KARANG_DURATION,
  DEFAULT_KARANG_STILTS,
  normalizeKarangDuration,
} from './karang-sim.js';

/**
 * Each mode's `start(ctx, options)` gets `options` (its own option values, checked) and `ctx`, which the
 * lobby builds for each launch:
 *   names            the players, as shown on screen
 *   rng              the random source (repeatable with ?seed=)
 *   game, hud, sfx   the 3D scene (null without WebGL), the on-screen overlay, and the sound effects
 *   phase            the lobby's current phase (read-only): 'loading' | 'race' | 'results' | …
 *   setPhase(phase)  'loading' while assets load (blocks other launches), 'race' once under way,
 *                    'results' once a winner is decided
 *   setProgress(text) a progress message beside Start while the mode loads ('' to clear)
 *   hideLobby(), showQuit(label), hideQuit()
 *   saveWinner(name) records the winner (an on-screen name) under this mode's `winMode`
 *
 * Option types the lobby can show (every option also has an `id` and a `label`):
 *   range      { steps: [{ value, label, text }], default, normalize? }  a stepped slider: `label` under
 *              each step on the scale, `text` read out for the chosen step
 *   segmented  { choices: [{ value, label }], default }                  a pill toggle (radio group)
 *   link       { href }                                                  a secondary link (no value)
 *
 * The lobby shows each mode's How to play from `<template id="guide-‹guide›">` in index.html; the
 * optional `fillGuide(root)` fills in the parts that come from code (character lists).
 */
export const MODES = [
  {
    id: 'race',
    winMode: 'race', // what saveWinner() records; must be in WIN_MODES
    icon: '🏁',
    name: 'Derby Race',
    verb: 'race', // "Start race"
    tagline: 'First across the line leads the team meeting.',
    players: { min: 2, max: Infinity },
    options: [
      {
        id: 'speed',
        type: 'range',
        label: 'Race length',
        steps: RACE_LENGTHS.map(({ seconds, speed }) => ({ value: speed, label: `${seconds}s`, text: `About ${seconds} seconds` })),
        default: DEFAULT_SPEED,
        // Older saved speeds and ?speed= values snap to the nearest offered length.
        normalize: normalizeSpeed,
      },
    ],
    guide: 'race',
    fillGuide: (root) => {
      for (const el of root.querySelectorAll('[data-list="racers"]')) el.textContent = RACER_KINDS.map((k) => `${k.emoji} ${k.label}`).join(' · ');
    },
    ready: (n) => `${n} racers on the grid — may the best tab win. Let's go see it in your virtual meeting room.`,
    stagePreview: (stage, { names }) => stage.showRaceGrid(names),
    start: startRace,
  },
  {
    id: 'rumble',
    winMode: 'wrestle',
    icon: '🤼',
    name: 'Let’s Rumble',
    verb: 'rumble',
    tagline: 'Dangal: last warrior standing leads standup.',
    players: { min: MIN_WRESTLERS, max: MAX_WRESTLERS },
    options: [
      {
        id: 'models',
        type: 'segmented',
        label: 'Models',
        default: 'classic',
        choices: [{ value: 'classic', label: 'Classic' }, { value: 'hd', label: 'HD' }],
      },
      { id: 'preview', type: 'link', label: 'Preview wrestlers', href: 'character-prototype.html' },
    ],
    guide: 'rumble',
    fillGuide: (root) => {
      for (const el of root.querySelectorAll('[data-list="wrestlers"]')) el.textContent = WRESTLER_KINDS.map((k) => k.label).join(', ');
    },
    ready: (n) => `${n} wrestlers ready — last one in the ring leads standup.`,
    stagePreview: (stage, { names, options }) => stage.showWrestleRing(names, { modelStyle: options.models }),
    start: startRumble,
  },
  {
    id: 'deathmatch',
    winMode: 'deathmatch',
    icon: '🔫',
    name: 'Standup Deathmatch',
    verb: 'deathmatch',
    tagline: 'QuakeWorld in a Google Meet — most frags at 0:00 leads standup.',
    players: { min: MIN_DEATHMATCH_PLAYERS, max: MAX_DEATHMATCH_PLAYERS },
    options: [],
    guide: 'deathmatch',
    fillGuide: (root) => {
      for (const el of root.querySelectorAll('[data-list="developers"]')) {
        el.textContent = DEVELOPER_KINDS.map((k) => `${k.label} (${k.weapon.short})`).join(' · ');
      }
      for (const el of root.querySelectorAll('[data-list="powerups"]')) {
        el.textContent = DM_POWERUPS.map((p) => `${p.emoji} ${p.name}`).join(' · ');
      }
    },
    ready: (n) => `${n} developers in the Meet call — most frags at 0:00 leads standup.`,
    stagePreview: (stage, { names }) => stage.showDeathmatchArena(names),
    start: startDeathmatch,
  },
  {
    id: 'claw',
    winMode: 'claw',
    icon: '🕹️',
    name: 'Claw of Destiny',
    verb: 'claw',
    tagline: 'Last dev capsule down the chute leads standup.',
    players: { min: MIN_CLAW_PLAYERS, max: MAX_CLAW_PLAYERS },
    options: [
      {
        id: 'duration',
        type: 'range',
        label: 'Round length',
        steps: CLAW_DURATIONS.map(({ seconds, label, text }) => ({ value: seconds, label, text })),
        default: DEFAULT_CLAW_DURATION,
        normalize: normalizeClawDuration,
      },
    ],
    guide: 'claw',
    ready: (n) => `${n} dev capsules in the pit — who drops down the prize chute?`,
    stagePreview: (stage, { names, sittingOut }) => stage.showClawCabinet(names, { sittingOut }),
    start: startClaw,
  },
  {
    id: 'plinko',
    winMode: 'plinko',
    icon: '🎰',
    name: 'Kanban Plinko',
    verb: 'plinko',
    tagline: 'Vertical Kanban pinball — first marble to Prod leads.',
    players: { min: MIN_PLINKO_PLAYERS, max: MAX_PLINKO_PLAYERS },
    options: [
      {
        id: 'duration',
        type: 'range',
        label: 'Sprint length',
        steps: PLINKO_DURATIONS.map(({ seconds, label, text }) => ({ value: seconds, label, text })),
        default: DEFAULT_PLINKO_DURATION,
        normalize: normalizePlinkoDuration,
      },
    ],
    guide: 'plinko',
    ready: (n) => `${n} marbles in The Backlog — first to Deploy to Prod leads standup.`,
    stagePreview: (stage, { names, options }) => stage.showPlinkoBoard(names, { duration: options.duration }),
    start: startPlinko,
  },
  {
    id: 'freeze',
    winMode: 'freeze',
    icon: '🚦',
    name: 'Code Freeze',
    verb: 'freeze',
    tagline: 'Red Light, Green Light — first across or last standing leads.',
    players: { min: MIN_FREEZE_PLAYERS, max: MAX_FREEZE_PLAYERS },
    options: [
      {
        id: 'duration',
        type: 'range',
        label: 'Sprint length',
        steps: FREEZE_DURATIONS.map(({ seconds, label, text }) => ({ value: seconds, label, text })),
        default: DEFAULT_FREEZE_DURATION,
        normalize: normalizeFreezeDuration,
      },
    ],
    guide: 'freeze',
    ready: (n) => `${n} developers on the runway — freeze on red or get zapped.`,
    stagePreview: (stage, { names, options }) => stage.showFreezeRunway(names, { duration: options.duration }),
    start: startFreeze,
  },
  {
    id: 'launchpad',
    winMode: 'launchpad',
    icon: '🚀',
    name: 'Launchpad Roulette',
    verb: 'launch',
    tagline: 'Kerbal-style rocket chaos — sole survivor to orbit leads.',
    players: { min: MIN_LAUNCH_PLAYERS, max: MAX_LAUNCH_PLAYERS },
    options: [
      {
        id: 'duration',
        type: 'range',
        label: 'Flight length',
        steps: LAUNCH_DURATIONS.map(({ seconds, label, text }) => ({ value: seconds, label, text })),
        default: DEFAULT_LAUNCH_DURATION,
        normalize: normalizeLaunchDuration,
      },
    ],
    guide: 'launchpad',
    ready: (n) => `${n} rockets on the Chesapeake pads — who makes it to Prod Orbit?`,
    stagePreview: (stage, { names }) => stage.showLaunchpadComplex(names),
    start: startLaunchpad,
  },
  {
    id: 'jenga',
    winMode: 'jenga',
    icon: '🧱',
    name: 'Jenga Connect',
    verb: 'jenga',
    tagline: 'Pull legacy packages — last dev off PROD DOWN leads.',
    players: { min: MIN_JENGA_PLAYERS, max: MAX_JENGA_PLAYERS },
    options: [
      {
        id: 'duration',
        type: 'range',
        label: 'Collapse timer',
        steps: JENGA_DURATIONS.map(({ seconds, label, text }) => ({ value: seconds, label, text })),
        default: DEFAULT_JENGA_DURATION,
        normalize: normalizeJengaDuration,
      },
    ],
    guide: 'jenga',
    ready: (n) => `${n} developers perched on the monolith — don’t touch the keystone!`,
    stagePreview: (stage, { names }) => stage.showJengaTower(names),
    start: startJenga,
  },
  {
    id: 'cannon',
    winMode: 'cannon',
    icon: '💣',
    name: 'Deploy Cannon',
    verb: 'cannon',
    tagline: 'Human cannonball volley — closest to the PROD bullseye leads.',
    players: { min: MIN_CANNON_PLAYERS, max: MAX_CANNON_PLAYERS },
    options: [
      {
        id: 'duration',
        type: 'range',
        label: 'Salvo length',
        steps: CANNON_DURATIONS.map(({ seconds, label, text }) => ({ value: seconds, label, text })),
        default: DEFAULT_CANNON_DURATION,
        normalize: normalizeCannonDuration,
      },
    ],
    guide: 'cannon',
    ready: (n) => `${n} developers loaded in brass cannons — SHIP IT toward PROD!`,
    stagePreview: (stage, { names }) => stage.showCannonPier(names),
    start: startCannon,
  },
  {
    id: 'golf',
    winMode: 'golf',
    icon: '⛳',
    name: 'Standup Mini-Golf',
    verb: 'golf',
    tagline: 'Simultaneous putt-putt chaos — first ball in PROD leads.',
    players: { min: MIN_GOLF_PLAYERS, max: MAX_GOLF_PLAYERS },
    options: [
      {
        id: 'duration',
        type: 'range',
        label: 'Course length',
        steps: GOLF_DURATIONS.map(({ seconds, label, text }) => ({ value: seconds, label, text })),
        default: DEFAULT_GOLF_DURATION,
        normalize: normalizeGolfDuration,
      },
    ],
    guide: 'golf',
    ready: (n) => `${n} golf balls on the BACKLOG tee — first in the PROD cup leads!`,
    stagePreview: (stage, { names, options }) => stage.showGolfCourse(names, { duration: options.duration }),
    start: startGolf,
  },
  {
    id: 'rto',
    winMode: 'rto',
    icon: '🏢',
    name: 'RTO Mini-Golf',
    verb: 'putt',
    tagline: 'Indoor cubicle putt-putt — first into the coffee mug leads.',
    players: { min: MIN_RTO_PLAYERS, max: MAX_RTO_PLAYERS },
    options: [
      {
        id: 'duration',
        type: 'range',
        label: 'Course length',
        steps: RTO_DURATIONS.map(({ seconds, label, text }) => ({ value: seconds, label, text })),
        default: DEFAULT_RTO_DURATION,
        normalize: normalizeRtoDuration,
      },
    ],
    guide: 'rto',
    ready: (n) => `${n} golf balls on the duct-taped cubicle tee — first in the coffee mug leads!`,
    stagePreview: (stage, { names, options }) => stage.showRtoCourse(names, { duration: options.duration }),
    start: startRto,
  },
  {
    id: 'tumba',
    winMode: 'tumba',
    icon: '🩴',
    name: 'Tumba Lata',
    verb: 'play',
    tagline: 'Slipper-slinging server raid — tagged dev becomes Bantay.',
    players: { min: MIN_TUMBA_PLAYERS, max: MAX_TUMBA_PLAYERS },
    options: [
      {
        id: 'duration',
        type: 'range',
        label: 'Round length',
        steps: TUMBA_DURATIONS.map(({ seconds, label, text }) => ({ value: seconds, label, text })),
        default: DEFAULT_TUMBA_DURATION,
        normalize: normalizeTumbaDuration,
      },
    ],
    guide: 'tumba',
    ready: (n) => `${n} devs lined up at the badlis with neon tsinelas — BATO!`,
    stagePreview: (stage, { names }) => stage.showTumbaStreet(names),
    start: startTumba,
  },
  {
    id: 'karang',
    winMode: 'karang',
    icon: '🎋',
    name: 'Karang Derby',
    verb: 'race',
    tagline: 'Bamboo stilt wobble race — steadiest across the tape leads.',
    players: { min: MIN_KARANG_PLAYERS, max: MAX_KARANG_PLAYERS },
    options: [
      {
        id: 'duration',
        type: 'range',
        label: 'Course length',
        steps: KARANG_DURATIONS.map(({ seconds, label, text }) => ({ value: seconds, label, text })),
        default: DEFAULT_KARANG_DURATION,
        normalize: normalizeKarangDuration,
      },
      {
        id: 'stilts',
        type: 'segmented',
        label: 'Stilts',
        default: DEFAULT_KARANG_STILTS,
        choices: [{ value: 'bamboo', label: 'Bamboo' }, { value: 'bagol', label: 'Bagol 🥥' }],
      },
    ],
    guide: 'karang',
    ready: (n) => `${n} devs hoisted onto bamboo stilts — SAKA NA, DAGAN!`,
    stagePreview: (stage, { names, options }) => stage.showKarangBoulevard(names, { duration: options.duration, stilts: options.stilts }),
    start: startKarang,
  },
];

/** The mode a new tab starts on, and the fallback for an unknown mode. */
export const DEFAULT_MODE = 'race';

/** The mode with this id, or the default mode if there is none. */
export function findMode(id) {
  return MODES.find((mode) => mode.id === id) ?? MODES.find((mode) => mode.id === DEFAULT_MODE);
}

/** True if `n` players is within the mode's player range. */
export function fitsPlayers(mode, n) {
  return n >= mode.players.min && n <= mode.players.max;
}

/** The player range for a mode card: "2+ players" or "2–12 players". */
export function playersText(mode) {
  const { min, max } = mode.players;
  return max === Infinity ? `${min}+ players` : `${min}–${max} players`;
}

/** Why `n` checked players can't play the mode, or '' if they can. */
export function capacityText(mode, n) {
  const { min, max } = mode.players;
  const checked = `${n} ${n === 1 ? 'is' : 'are'} checked`;
  if (n < min) return `${mode.name} needs at least ${min} players. ${checked}.`;
  if (n > max) return `${mode.name} supports ${min}–${max} players. ${checked} — uncheck ${n - max}.`;
  return '';
}

/** The options that hold a value (links don't). */
const valued = (mode) => mode.options.filter((option) => option.type !== 'link');

/** A checked value for one option: the value itself if it's one of those offered, otherwise the default. */
export function optionValue(option, value) {
  if (option.normalize) return option.normalize(value);
  const offered = option.type === 'range' ? option.steps : option.choices ?? [];
  return offered.some((choice) => choice.value === value) ? value : option.default;
}

/** A mode's option values, checked: `{ speed: 2 }`. Missing or invalid values get their defaults. */
export function modeOptions(mode, saved) {
  const source = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  return Object.fromEntries(valued(mode).map((option) => [option.id, optionValue(option, source[option.id])]));
}

/** Every mode's option values, checked: `{ race: { speed: 2 }, rumble: { models: 'classic' } }`. */
export function allModeOptions(saved) {
  const source = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  return Object.fromEntries(MODES.map((mode) => [mode.id, modeOptions(mode, source[mode.id])]));
}

// ------------------------------------------------------------------ race

function startRace(ctx, { speed }) {
  ctx.setPhase('race');
  ctx.hideLobby();

  if (!ctx.game) {
    // No WebGL: decide the race instantly and go straight to the result.
    const started = performance.now();
    const sim = runHeadless(ctx.names, ctx.rng);
    const elapsed = (performance.now() - started) / 1000;
    ctx.hud.showWinner(sim.winner.name, null, elapsed, 0, `Race completed off-screen in ${elapsed.toFixed(1)}s.`);
    sim.standings().slice(1, 3).forEach((r, i) => ctx.hud.podium(i + 2, r.name));
    ctx.setPhase('results');
    ctx.saveWinner(sim.winner.name);
    return;
  }

  let startedAt = performance.now();
  const lineup = ctx.game.startRace(ctx.names, {
    rng: ctx.rng,
    timeScale: speed,
    onStart: () => { startedAt = performance.now(); },
    onWinner: (racer, kind) => {
      ctx.setPhase('results');
      ctx.hideQuit();
      const elapsed = (performance.now() - startedAt) / 1000;
      ctx.hud.showWinner(racer.name, kind, elapsed, 2600 / speed);
      // Save immediately, so the result is recorded even if the tab is closed.
      ctx.saveWinner(racer.name);
    },
  });
  ctx.hud.begin(lineup);
  ctx.showQuit('✕ Quit race');
}

// ------------------------------------------------------------------ rumble

/** How the close call ends, by who's on the ropes (or who is pulling them back). */
function closeCallText(w, other) {
  const saved = {
    counter: 'slips free at the ropes!',
    duck: 'ducks out low under the ropes!',
    shapeshift: 'changes form and slips free!',
  }[w.kind.style] ?? (other.kind.style === 'centre' ? `is pulled back to the centre by ${other.kind.label}!` : 'hangs on at the ropes!');
  return `Close call — ${who(w)} ${saved}`;
}

/** Rumble shares one set of rules; the models option only selects the character renderer. */
async function startRumble(ctx, { models }) {
  let modelStyle = models;
  let hdFallback = false;
  if (ctx.game && models === 'hd') {
    ctx.setPhase('loading');
    ctx.setProgress('Preparing HD characters…');
    try {
      await prepareWrestlerModels();
      ctx.setProgress('');
    } catch (error) {
      console.warn('Free character assets unavailable; using the original roster.', error);
      ctx.setProgress('Character models could not load. Using the original wrestlers for this match.');
      modelStyle = 'classic';
      hdFallback = true;
    }
    if (ctx.phase !== 'loading') return;
  }
  ctx.setPhase('race');
  ctx.hideLobby();

  if (!ctx.game) {
    // No WebGL: the same draw, decided instantly.
    const plan = planMatch(ctx.names, ctx.rng);
    const winner = plan.wrestlers[plan.winner];
    ctx.hud.showWinner(winner.name, null, null, 0, `Won the battle royal as ${winner.kind.label} (decided off-screen).`, { kicker: 'Leads today’s standup' });
    ctx.setPhase('results');
    ctx.saveWinner(winner.name);
    return;
  }

  const { game, hud } = ctx;
  const lineup = game.startWrestle(ctx.names, {
    rng: ctx.rng,
    modelStyle,
    onEvent: (e) => {
      if (e.type === 'bell') hud.note('🔔 Ding ding! Last one in the ring leads today’s standup.', true);
      else if (e.type === 'out') {
        hud.wrestleOut(e.victim.id);
        hud.outCallout(e.victim.name);
        hud.note(throwText(e));
      } else if (e.type === 'final') hud.note(`Final two: ${who(e.pair[0])} vs ${who(e.pair[1])}`, true);
      else if (e.type === 'closeCall') hud.note(closeCallText(e.wrestler, e.other));
      else if (e.type === 'showman') hud.note(`${who(e.wrestler)} plays to the crowd 👑`);
    },
    onWinner: (w) => {
      ctx.setPhase('results');
      ctx.hideQuit();
      hud.callout(`${w.name} leads today’s standup!`, 2400);
      hud.showWinner(w.name, null, null, 2600, `Won the battle royal as ${w.kind.label}`, {
        kicker: 'Leads today’s standup',
        // The card says who won as whom: fade the floating name tags so they don't compete with it.
        onShown: () => game.wrestle?.fadeNameTags(),
      });
      ctx.saveWinner(w.name);
    },
  });
  hud.beginWrestle(lineup);
  // Ring-out callouts stay off the landings they announce (#107).
  hud.sceneBlocks = (width, height) => game.wrestle?.landingRects(width, height) ?? [];
  if (hdFallback) hud.note('HD models could not load. This match uses the original models.', true);
  ctx.showQuit('✕ Quit match');
}

// ------------------------------------------------------------------ standup deathmatch

function startDeathmatch(ctx) {
  ctx.setPhase('race');
  ctx.hideLobby();

  if (!ctx.game) {
    // No WebGL: run the deathmatch simulation headlessly and announce the top-fragging invitee.
    const plan = planDeathmatch(ctx.names, ctx.rng);
    const winner = plan.leaderboard[0];
    ctx.hud.showWinner(
      winner.name,
      null,
      null,
      0,
      `Topped Standup Deathmatch with ${winner.kills} frags as ${winner.kind.label} (${winner.kind.weapon.short}).`,
      { kicker: 'Leads today’s standup' },
    );
    ctx.setPhase('results');
    ctx.saveWinner(winner.name);
    return;
  }

  const dmParams = new URLSearchParams(location.search);
  const dmSpeed = dmParams.has('dmSpeed') ? Number(dmParams.get('dmSpeed')) || 1 : 1;

  ctx.game.startDeathmatch(ctx.names, {
    rng: ctx.rng,
    timeScale: dmSpeed,
    onQuit: () => ctx.quit?.(),
    onWinner: (leader, plan) => {
      ctx.setPhase('results');
      ctx.hideQuit();
      ctx.hud.showWinner(
        leader.name,
        null,
        null,
        0,
        `Topped Standup Deathmatch with ${leader.kills} frags as ${leader.kind.label} (${leader.kind.weapon.short})`,
        { kicker: 'Leads today’s standup' },
      );
      plan.leaderboard.slice(1, 3).forEach((row, i) => ctx.hud.podium(i + 2, `${row.name} (${row.kills} frags)`));
      ctx.saveWinner(leader.name);
    },
  });
}

// ------------------------------------------------------------------ claw of destiny

function startClaw(ctx, { duration }) {
  ctx.setPhase('race');
  ctx.hideLobby();

  if (!ctx.game) {
    // No WebGL: run the choreographed claw draw headlessly and announce the sole survivor.
    const plan = planClawMatch(ctx.names, { duration, rng: ctx.rng });
    ctx.hud.showWinner(
      plan.winner.name,
      null,
      null,
      0,
      `Dropped down the ${plan.marquee} prize chute as ${plan.winner.kind.label} (decided off-screen).`,
      { kicker: 'Leads today’s standup' },
    );
    ctx.setPhase('results');
    ctx.saveWinner(plan.winner.name);
    return;
  }

  const { game, hud } = ctx;
  const clawParams = new URLSearchParams(location.search);
  const effectiveDuration = clawParams.has('clawDuration') ? Number(clawParams.get('clawDuration')) || duration : duration;

  game.startClaw(ctx.names, {
    duration: effectiveDuration,
    sittingOut: ctx.sittingOut ?? [],
    rng: ctx.rng,
    onEvent: (e) => {
      if (e.type === 'attempt') hud.note(e.text, true);
      else if (e.type === 'excuse') hud.note(`💥 ${e.player.name} slipped out — “${e.excuse}”`);
      else if (e.type === 'drop') hud.callout(`🕹️ ${e.player.name} drops down the chute!`, 2200);
    },
    onWinner: (winner, plan) => {
      ctx.setPhase('results');
      ctx.hideQuit();
      hud.showWinner(
        winner.name,
        null,
        null,
        1200,
        `Dropped down the ${plan.marquee} prize chute (${winner.kind.label})`,
        { kicker: 'Leads today’s standup' },
      );
      ctx.saveWinner(winner.name);
    },
  });
  hud.beginWrestle([]);
  ctx.showQuit('✕ Quit claw');
}

// ------------------------------------------------------------------ kanban plinko

function startPlinko(ctx, { duration }) {
  ctx.setPhase('race');
  ctx.hideLobby();

  if (!ctx.game) {
    const sim = runPlinkoHeadless(ctx.names, { duration, rng: ctx.rng });
    const winner = sim.winner ?? sim.standings()[0];
    ctx.hud.showWinner(
      winner.name,
      null,
      sim.time,
      0,
      `Deployed to Prod in ${sim.time.toFixed(1)}s via Kanban Plinko (decided off-screen).`,
      { kicker: 'Leads today’s standup' },
    );
    ctx.setPhase('results');
    ctx.saveWinner(winner.name);
    return;
  }

  const { game, hud } = ctx;
  const plinkoParams = new URLSearchParams(location.search);
  const effectiveDuration = plinkoParams.has('plinkoDuration') ? Number(plinkoParams.get('plinkoDuration')) || duration : duration;
  hud.beginWrestle([]);
  const ticker = document.getElementById('plinko-ticker');
  if (ticker) {
    ticker.textContent = 'Backlog hopper ready…';
    ticker.hidden = false;
  }

  game.startPlinko(ctx.names, {
    duration: effectiveDuration,
    rng: ctx.rng,
    onEvent: (e) => {
      if (e.type === 'note') hud.note(e.text, Boolean(e.important));
      else if (e.type === 'leader' && ticker) ticker.textContent = e.text;
    },
    onWinner: (winner, sim) => {
      ctx.setPhase('results');
      ctx.hideQuit();
      if (ticker) ticker.hidden = true;
      hud.callout(`🚀 ${winner.name} deployed to Prod!`, 2200);
      hud.showWinner(
        winner.name,
        null,
        sim.time,
        1400,
        `Threaded the LGTM flippers into Prod in ${sim.time.toFixed(1)}s`,
        { kicker: 'Leads today’s standup' },
      );
      sim.standings().slice(1, 3).forEach((m, i) => hud.podium(i + 2, m.name));
      ctx.saveWinner(winner.name);
    },
  });
  ctx.showQuit('✕ Quit plinko');
}

// ------------------------------------------------------------------ code freeze

function startFreeze(ctx, { duration }) {
  ctx.setPhase('race');
  ctx.hideLobby();

  if (!ctx.game) {
    const sim = runFreezeHeadless(ctx.names, { duration, rng: ctx.rng });
    const winner = sim.winner ?? sim.standings()[0];
    ctx.hud.showWinner(
      winner.name,
      null,
      sim.time,
      0,
      sim.winReason === 'survivor'
        ? `Last dev standing in Code Freeze (${sim.time.toFixed(1)}s, off-screen).`
        : `Crossed the Release finish line in ${sim.time.toFixed(1)}s (off-screen).`,
      { kicker: 'Leads today’s standup' },
    );
    ctx.setPhase('results');
    ctx.saveWinner(winner.name);
    return;
  }

  const { game, hud } = ctx;
  const freezeParams = new URLSearchParams(location.search);
  const effectiveDuration = freezeParams.has('freezeDuration') ? Number(freezeParams.get('freezeDuration')) || duration : duration;
  const banner = document.getElementById('freeze-banner');
  const setBanner = (light, rem, total) => {
    if (!banner) return;
    const label = light === 'GREEN' ? '🟢 SPRINT OPEN' : light === 'YELLOW' ? '🟡 PR IN REVIEW' : '🔴 CODE FREEZE!';
    banner.textContent = `${label} · REMAINING: ${rem}/${total}`;
    banner.className = `freeze-banner freeze-${light.toLowerCase()}`;
    banner.hidden = false;
  };
  hud.beginWrestle([]);
  setBanner('GREEN', ctx.names.length, ctx.names.length);

  game.startFreeze(ctx.names, {
    duration: effectiveDuration,
    rng: ctx.rng,
    onEvent: (e) => {
      if (e.type === 'status') setBanner(e.light, e.remaining, e.total);
      else if (e.type === 'note') hud.note(e.text, Boolean(e.important));
      else if (e.type === 'zap') {
        setBanner('RED', e.remaining, e.total);
        hud.note(`⚡ ${e.runner.name} zapped — “${e.excuse}”`, true);
      }
    },
    onWinner: (winner, reason, sim) => {
      ctx.setPhase('results');
      ctx.hideQuit();
      if (banner) banner.hidden = true;
      hud.callout(
        reason === 'survivor' ? `🏆 ${winner.name} is the last dev standing!` : `🏁 ${winner.name} beat the Code Freeze!`,
        2200,
      );
      hud.showWinner(
        winner.name,
        null,
        sim.time,
        1400,
        reason === 'survivor'
          ? `Last developer standing after ${sim.cycle} freeze cycles`
          : `Crossed RELEASE / LEAD STANDUP in ${sim.time.toFixed(1)}s`,
        { kicker: 'Leads today’s standup' },
      );
      ctx.saveWinner(winner.name);
    },
  });
  ctx.showQuit('✕ Quit freeze');
}

// ------------------------------------------------------------------ launchpad roulette

function startLaunchpad(ctx, { duration }) {
  ctx.setPhase('race');
  ctx.hideLobby();

  if (!ctx.game) {
    const plan = planLaunchMatch(ctx.names, { duration, rng: ctx.rng });
    ctx.hud.showWinner(
      plan.winner.name,
      null,
      plan.duration,
      0,
      `DEPLOYED TO PROD — reached orbit in ${plan.duration.toFixed(1)}s (off-screen).`,
      { kicker: 'Leads today’s standup' },
    );
    ctx.setPhase('results');
    ctx.saveWinner(plan.winner.name);
    return;
  }

  const { game, hud } = ctx;
  const launchParams = new URLSearchParams(location.search);
  const effectiveDuration = launchParams.has('launchDuration')
    ? Number(launchParams.get('launchDuration')) || duration
    : duration;

  game.startLaunchpad(ctx.names, {
    duration: effectiveDuration,
    rng: ctx.rng,
    onCountdown: (text) => hud.countdown(text === 'DEPLOY!' ? 'GO' : text),
    onEvent: (e) => {
      if (e.type === 'note') hud.note(e.text, Boolean(e.important));
      else if (e.type === 'fail') hud.note(`💥 ${e.rocket.name}: “${e.popup}”`, true);
    },
    onWinner: (winner, plan) => {
      ctx.setPhase('results');
      ctx.hideQuit();
      hud.callout(`🚀 ${winner.name} DEPLOYED TO PROD — LEADS STANDUP!`, 2400);
      hud.showWinner(
        winner.name,
        null,
        plan.duration,
        1500,
        `DEPLOYED TO PROD — LEADS STANDUP (${Math.round(plan.duration)}s orbit)`,
        { kicker: 'Orbit achieved' },
      );
      ctx.saveWinner(winner.name);
    },
  });
  hud.beginWrestle([]);
  ctx.showQuit('✕ Quit launch');
}

// ------------------------------------------------------------------ dependency jenga

function startJenga(ctx, { duration }) {
  ctx.setPhase('race');
  ctx.hideLobby();

  if (!ctx.game) {
    const plan = planJengaMatch(ctx.names, { duration, rng: ctx.rng });
    ctx.hud.showWinner(
      plan.winner.name,
      null,
      plan.duration,
      0,
      `Survived the Jenga Connect collapse in ${plan.duration.toFixed(1)}s (off-screen).`,
      { kicker: 'Leads today’s standup' },
    );
    ctx.setPhase('results');
    ctx.saveWinner(plan.winner.name);
    return;
  }

  const { game, hud } = ctx;
  const jengaParams = new URLSearchParams(location.search);
  const effectiveDuration = jengaParams.has('jengaDuration')
    ? Number(jengaParams.get('jengaDuration')) || duration
    : duration;
  const banner = document.getElementById('jenga-banner');
  const setBanner = (stability, rem, total) => {
    if (!banner) return;
    const tone = stability > 60 ? 'green' : stability > 30 ? 'yellow' : 'red';
    banner.textContent = `🧱 STABILITY: ${stability}% · SURVIVORS: ${rem}/${total}`;
    banner.className = `freeze-banner freeze-${tone}`;
    banner.hidden = false;
  };
  hud.beginWrestle([]);
  setBanner(100, ctx.names.length, ctx.names.length);

  game.startJenga(ctx.names, {
    duration: effectiveDuration,
    rng: ctx.rng,
    onEvent: (e) => {
      if (e.type === 'status') setBanner(e.stability, e.remaining, e.total);
      else if (e.type === 'note') hud.note(e.text, Boolean(e.important));
      else if (e.type === 'elim') {
        hud.note(`💥 ${e.player.name} fell to PROD DOWN — “${e.excuse}”`, true);
      }
    },
    onWinner: (winner, plan) => {
      ctx.setPhase('results');
      ctx.hideQuit();
      if (banner) banner.hidden = true;
      hud.callout(`🧱 ${winner.name} survived on LTS-support — LEADS STANDUP!`, 2400);
      hud.showWinner(
        winner.name,
        null,
        plan.duration,
        1500,
        `Last dev off PROD DOWN (${plan.variant.label} · ${plan.tiers} tiers)`,
        { kicker: 'Leads today’s standup' },
      );
      ctx.saveWinner(winner.name);
    },
  });
  ctx.showQuit('✕ Quit jenga');
}

// ------------------------------------------------------------------ deploy cannon

function startCannon(ctx, { duration }) {
  ctx.setPhase('race');
  ctx.hideLobby();

  if (!ctx.game) {
    const plan = planCannonMatch(ctx.names, { duration, rng: ctx.rng });
    ctx.hud.showWinner(
      plan.winner.name,
      null,
      plan.duration,
      0,
      `SHIPPED TO PROD — dead-center bullseye in ${plan.duration.toFixed(1)}s (off-screen).`,
      { kicker: 'Leads today’s standup' },
    );
    ctx.setPhase('results');
    ctx.saveWinner(plan.winner.name);
    return;
  }

  const { game, hud } = ctx;
  const cannonParams = new URLSearchParams(location.search);
  const effectiveDuration = cannonParams.has('cannonDuration')
    ? Number(cannonParams.get('cannonDuration')) || duration
    : duration;
  const banner = document.getElementById('cannon-banner');
  const setBanner = (text, tone = 'yellow') => {
    if (!banner) return;
    banner.textContent = text;
    banner.className = `freeze-banner freeze-${tone}`;
    banner.hidden = false;
  };

  hud.beginWrestle([]);
  setBanner('💣 LOADING BRASS BATTERY…', 'yellow');

  game.startCannon(ctx.names, {
    duration: effectiveDuration,
    rng: ctx.rng,
    onEvent: (e) => {
      if (e.type === 'status') setBanner(e.text, e.tone ?? 'yellow');
      else if (e.type === 'note') hud.note(e.text, Boolean(e.important));
      else if (e.type === 'miss') hud.note(`💦 ${e.shot.name}: “${e.popup}”`, true);
    },
    onWinner: (winner, plan) => {
      ctx.setPhase('results');
      ctx.hideQuit();
      if (banner) banner.hidden = true;
      hud.callout(`🎯 ${winner.name} SHIPPED TO PROD — LEADS STANDUP!`, 2400);
      hud.showWinner(
        winner.name,
        null,
        plan.duration,
        1500,
        `SHIPPED TO PROD — dead-center bullseye (${plan.variant.label})`,
        { kicker: 'Bullseye achieved' },
      );
      ctx.saveWinner(winner.name);
    },
  });
  ctx.showQuit('✕ Quit cannon');
}

// ------------------------------------------------------------------ standup mini-golf

function startGolf(ctx, { duration }) {
  ctx.setPhase('race');
  ctx.hideLobby();

  if (!ctx.game) {
    const sim = runGolfHeadless(ctx.names, { duration, rng: ctx.rng });
    const winner = sim.winner ?? sim.standings()[0];
    ctx.hud.showWinner(
      winner.name,
      null,
      sim.time,
      0,
      `Sunk in the PROD cup in ${sim.time.toFixed(1)}s (${winner.strokes} strokes, off-screen).`,
      { kicker: 'Leads today’s standup' },
    );
    ctx.setPhase('results');
    ctx.saveWinner(winner.name);
    return;
  }

  const { game, hud } = ctx;
  const golfParams = new URLSearchParams(location.search);
  const effectiveDuration = golfParams.has('golfDuration')
    ? Number(golfParams.get('golfDuration')) || duration
    : duration;
  const banner = document.getElementById('golf-banner');
  const setBanner = (text) => {
    if (!banner) return;
    banner.textContent = text;
    banner.hidden = false;
  };

  hud.beginWrestle([]);
  setBanner('⛳ BACKLOG TEE READY — AIMING PUTTERS…');

  game.startGolf(ctx.names, {
    duration: effectiveDuration,
    rng: ctx.rng,
    onEvent: (e) => {
      if (e.type === 'leader') setBanner(e.text);
      else if (e.type === 'note') hud.note(e.text, Boolean(e.important));
      else if (e.type === 'hazard') hud.note(`⛳ ${e.ball.name}: “${e.popup}”`, true);
    },
    onWinner: (winner, sim) => {
      ctx.setPhase('results');
      ctx.hideQuit();
      if (banner) banner.hidden = true;
      hud.callout(`⛳ ${winner.name} sunk it in PROD — LEADS STANDUP!`, 2400);
      hud.showWinner(
        winner.name,
        null,
        sim.time,
        1500,
        `Sunk in the PROD cup in ${sim.time.toFixed(1)}s (${winner.strokes} stroke${winner.strokes === 1 ? '' : 's'})`,
        { kicker: 'Hole-in-PROD' },
      );
      sim.standings().slice(1, 3).forEach((b, i) => hud.podium(i + 2, b.name));
      ctx.saveWinner(winner.name);
    },
  });
  ctx.showQuit('✕ Quit golf');
}

// ------------------------------------------------------------------ rto mini-golf

function startRto(ctx, { duration }) {
  ctx.setPhase('race');
  ctx.hideLobby();

  if (!ctx.game) {
    const sim = runRtoHeadless(ctx.names, { duration, rng: ctx.rng });
    const winner = sim.winner ?? sim.standings()[0];
    ctx.hud.showWinner(
      winner.name,
      null,
      sim.time,
      0,
      `Clinked into the coffee mug in ${sim.time.toFixed(1)}s (${winner.strokes} strokes, off-screen).`,
      { kicker: 'Leads today’s standup' },
    );
    ctx.setPhase('results');
    ctx.saveWinner(winner.name);
    return;
  }

  const { game, hud } = ctx;
  const rtoParams = new URLSearchParams(location.search);
  const effectiveDuration = rtoParams.has('rtoDuration')
    ? Number(rtoParams.get('rtoDuration')) || duration
    : duration;
  const banner = document.getElementById('rto-banner');
  const setBanner = (text) => {
    if (!banner) return;
    banner.textContent = text;
    banner.hidden = false;
  };

  hud.beginWrestle([]);
  setBanner('🏢 CUBICLE TEE READY — AIMING PUTTERS…');

  game.startRto(ctx.names, {
    duration: effectiveDuration,
    rng: ctx.rng,
    onEvent: (e) => {
      if (e.type === 'leader') setBanner(e.text);
      else if (e.type === 'note') hud.note(e.text, Boolean(e.important));
      else if (e.type === 'hazard') hud.note(`🏢 ${e.ball.name}: “${e.popup}”`, true);
    },
    onWinner: (winner, sim) => {
      ctx.setPhase('results');
      ctx.hideQuit();
      if (banner) banner.hidden = true;
      hud.callout(`🏢 ${winner.name} clinked into the coffee mug — LEADS STANDUP!`, 2400);
      hud.showWinner(
        winner.name,
        null,
        sim.time,
        1500,
        `Clinked into World’s Okayest Developer mug in ${sim.time.toFixed(1)}s (${winner.strokes} stroke${winner.strokes === 1 ? '' : 's'})`,
        { kicker: 'RTO Mandate Champion' },
      );
      sim.standings().slice(1, 3).forEach((b, i) => hud.podium(i + 2, b.name));
      ctx.saveWinner(winner.name);
    },
  });
  ctx.showQuit('✕ Quit RTO golf');
}

// ------------------------------------------------------------------ tumba lata

function startTumba(ctx, { duration }) {
  ctx.setPhase('race');
  ctx.hideLobby();

  if (!ctx.game) {
    const plan = planTumbaMatch(ctx.names, { duration, rng: ctx.rng });
    ctx.hud.showWinner(
      plan.winner.name,
      null,
      plan.duration,
      0,
      `TAG! You’re the new Bantay — leads standup (${plan.variant.label}, off-screen).`,
      { kicker: 'New Bantay' },
    );
    ctx.setPhase('results');
    ctx.saveWinner(plan.winner.name);
    return;
  }

  const { game, hud } = ctx;
  const tumbaParams = new URLSearchParams(location.search);
  const effectiveDuration = tumbaParams.has('tumbaDuration')
    ? Number(tumbaParams.get('tumbaDuration')) || duration
    : duration;
  const banner = document.getElementById('tumba-banner');
  const setBanner = (text, tone = 'yellow') => {
    if (!banner) return;
    banner.textContent = text;
    banner.className = `freeze-banner freeze-${tone}`;
    banner.hidden = false;
  };

  hud.beginWrestle([]);
  setBanner('🩴 LINE UP AT THE BADLIS — GET READY TO BATO!', 'yellow');

  game.startTumba(ctx.names, {
    duration: effectiveDuration,
    rng: ctx.rng,
    onEvent: (e) => {
      if (e.type === 'status') setBanner(e.text, e.tone ?? 'yellow');
      else if (e.type === 'note') hud.note(e.text, Boolean(e.important));
    },
    onWinner: (winner, plan) => {
      ctx.setPhase('results');
      ctx.hideQuit();
      if (banner) banner.hidden = true;
      hud.callout(`🩴 TAG! ${winner.name} IS THE NEW BANTAY — LEAD STANDUP!`, 2400);
      hud.showWinner(
        winner.name,
        null,
        plan.duration,
        1500,
        `TAG! Tagged inches shy of the badlis (${plan.variant.label})`,
        { kicker: 'New Bantay — Leads Standup' },
      );
      ctx.saveWinner(winner.name);
    },
  });
  ctx.showQuit('✕ Quit Tumba Lata');
}

// ------------------------------------------------------------------ karang derby

function startKarang(ctx, { duration, stilts }) {
  ctx.setPhase('race');
  ctx.hideLobby();

  if (!ctx.game) {
    const plan = planKarangMatch(ctx.names, { duration, stilts, rng: ctx.rng });
    ctx.hud.showWinner(
      plan.winner.name,
      null,
      plan.duration,
      0,
      `STILL STANDING — crossed the Karang finish tape (${plan.variant.label}, off-screen).`,
      { kicker: 'Leads today’s standup' },
    );
    ctx.setPhase('results');
    ctx.saveWinner(plan.winner.name);
    return;
  }

  const { game, hud } = ctx;
  const karangParams = new URLSearchParams(location.search);
  const effectiveDuration = karangParams.has('karangDuration')
    ? Number(karangParams.get('karangDuration')) || duration
    : duration;
  const banner = document.getElementById('karang-banner');
  const setBanner = (text, tone = 'green') => {
    if (!banner) return;
    banner.textContent = text;
    banner.className = `freeze-banner freeze-${tone}`;
    banner.hidden = false;
  };

  hud.beginWrestle([]);
  setBanner('🎋 SAKA NA! MOUNTING BAMBOO STILTS…', 'yellow');

  game.startKarang(ctx.names, {
    duration: effectiveDuration,
    stilts,
    rng: ctx.rng,
    onEvent: (e) => {
      if (e.type === 'status') setBanner(e.text, e.tone ?? 'green');
      else if (e.type === 'note') hud.note(e.text, Boolean(e.important));
    },
    onWinner: (winner, plan) => {
      ctx.setPhase('results');
      ctx.hideQuit();
      if (banner) banner.hidden = true;
      hud.callout(`🎋 ${winner.name} STILL STANDING — LEADS STANDUP!`, 2400);
      hud.showWinner(
        winner.name,
        null,
        plan.duration,
        1500,
        `STILL STANDING — snapped the Karang ribbon on ${plan.stilts === 'bagol' ? 'Bagol coconut stilts' : 'bamboo stilts'} (${plan.variant.label})`,
        { kicker: 'Karang Derby Champion' },
      );
      ctx.saveWinner(winner.name);
    },
  });
  ctx.showQuit('✕ Quit Karang');
}
