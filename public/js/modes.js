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
import {
  planTubigMatch,
  MIN_TUBIG_PLAYERS,
  MAX_TUBIG_PLAYERS,
  TUBIG_DURATIONS,
  DEFAULT_TUBIG_DURATION,
  DEFAULT_TUBIG_RULE,
  normalizeTubigDuration,
} from './tubig-sim.js';
import {
  runDominoHeadless,
  MIN_DOMINO_PLAYERS,
  MAX_DOMINO_PLAYERS,
  DOMINO_DURATIONS,
  DEFAULT_DOMINO_DURATION,
  DEFAULT_DOMINO_RULE,
  normalizeDominoDuration,
} from './domino-sim.js';
import {
  runPoleHeadless,
  MIN_POLE_PLAYERS,
  MAX_POLE_PLAYERS,
  POLE_DURATIONS,
  DEFAULT_POLE_DURATION,
  DEFAULT_POLE_RULE,
  normalizePoleDuration,
} from './pole-sim.js';
import {
  runTawHeadless,
  MIN_TAW_PLAYERS,
  MAX_TAW_PLAYERS,
  TAW_DURATIONS,
  DEFAULT_TAW_DURATION,
  DEFAULT_TAW_RULE,
  normalizeTawDuration,
} from './taw-sim.js';
import {
  runDdakjiHeadless,
  MIN_DDAKJI_PLAYERS,
  MAX_DDAKJI_PLAYERS,
  DDAKJI_DURATIONS,
  DEFAULT_DDAKJI_DURATION,
  DEFAULT_DDAKJI_RULE,
  normalizeDdakjiDuration,
} from './ddakji-sim.js';
import {
  runNokabeHeadless,
  MIN_NOKABE_PLAYERS,
  MAX_NOKABE_PLAYERS,
  NOKABE_DURATIONS,
  DEFAULT_NOKABE_DURATION,
  DEFAULT_NOKABE_RULE,
  normalizeNokabeDuration,
} from './nokabe-sim.js';
import {
  runMahjongHeadless,
  MIN_MAHJONG_PLAYERS,
  MAX_MAHJONG_PLAYERS,
  MAHJONG_DURATIONS,
  DEFAULT_MAHJONG_DURATION,
  DEFAULT_MAHJONG_RULE,
  normalizeMahjongDuration,
} from './mahjong-sim.js';
import {
  runKhokhoHeadless,
  MIN_KHOKHO_PLAYERS,
  MAX_KHOKHO_PLAYERS,
  KHOKHO_DURATIONS,
  DEFAULT_KHOKHO_DURATION,
  DEFAULT_KHOKHO_RULE,
  normalizeKhokhoDuration,
} from './khokho-sim.js';
import {
  runChauparHeadless,
  MIN_CHAUPAR_PLAYERS,
  MAX_CHAUPAR_PLAYERS,
  CHAUPAR_DURATIONS,
  DEFAULT_CHAUPAR_DURATION,
  DEFAULT_CHAUPAR_RULE,
  normalizeChauparDuration,
} from './chaupar-sim.js';
import {
  runGlassHeadless,
  MIN_GLASS_PLAYERS,
  MAX_GLASS_PLAYERS,
  GLASS_DURATIONS,
  DEFAULT_GLASS_DURATION,
  DEFAULT_GLASS_RULE,
  normalizeGlassDuration,
} from './glass-sim.js';

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
  {
    id: 'tubig',
    winMode: 'tubig',
    icon: '💧',
    name: 'Tubig-Tubig',
    verb: 'dash',
    tagline: 'Water-line gauntlet — juke past blockers to STAGING & back.',
    players: { min: MIN_TUBIG_PLAYERS, max: MAX_TUBIG_PLAYERS },
    options: [
      {
        id: 'duration',
        type: 'range',
        label: 'Round length',
        steps: TUBIG_DURATIONS.map(({ seconds, label, text }) => ({ value: seconds, label, text })),
        default: DEFAULT_TUBIG_DURATION,
        normalize: normalizeTubigDuration,
      },
      {
        id: 'rule',
        type: 'segmented',
        label: 'Rules',
        default: DEFAULT_TUBIG_RULE,
        choices: [{ value: 'champion', label: 'Champion' }, { value: 'tag', label: 'Ikaw Na!' }],
      },
    ],
    guide: 'tubig',
    ready: (n) => `${n} runners on LOCALHOST — DEPLOY! PANAGAN!`,
    stagePreview: (stage, { names, options }) => stage.showTubigCourt(names, { duration: options.duration, rule: options.rule }),
    start: startTubig,
  },
  {
    id: 'domino',
    winMode: 'domino',
    icon: '🁣',
    name: 'Domino Slam',
    verb: 'slam',
    tagline: 'Rum-shop tabletop shockwaves — last on the table leads.',
    players: { min: MIN_DOMINO_PLAYERS, max: MAX_DOMINO_PLAYERS },
    options: [
      {
        id: 'duration',
        type: 'range',
        label: 'Hand length',
        steps: DOMINO_DURATIONS.map(({ seconds, label, text }) => ({ value: seconds, label, text })),
        default: DEFAULT_DOMINO_DURATION,
        normalize: normalizeDominoDuration,
      },
      {
        id: 'rule',
        type: 'segmented',
        label: 'Rules',
        default: DEFAULT_DOMINO_RULE,
        choices: [{ value: 'champion', label: 'Champion' }, { value: 'sixlove', label: 'Six-Love' }],
      },
    ],
    guide: 'domino',
    ready: (n) => `${n} devs on the scarred mahogany table — SHUFFLE UP!`,
    stagePreview: (stage, { names }) => stage.showDominoTable(names),
    start: startDomino,
  },
  {
    id: 'pole',
    winMode: 'pole',
    icon: '🌴',
    name: 'Greasy Pole',
    verb: 'climb',
    tagline: 'Mashramani slip-and-slide — first to grab the summit banner leads.',
    players: { min: MIN_POLE_PLAYERS, max: MAX_POLE_PLAYERS },
    options: [
      {
        id: 'duration',
        type: 'range',
        label: 'Climb length',
        steps: POLE_DURATIONS.map(({ seconds, label, text }) => ({ value: seconds, label, text })),
        default: DEFAULT_POLE_DURATION,
        normalize: normalizePoleDuration,
      },
      {
        id: 'rule',
        type: 'segmented',
        label: 'Rules',
        default: DEFAULT_POLE_RULE,
        choices: [{ value: 'summit', label: 'Summit' }, { value: 'muddrop', label: 'Mud-Drop' }],
      },
    ],
    guide: 'pole',
    ready: (n) => `${n} climbers chalking up at the mud pit — MASH UP DE POLE!`,
    stagePreview: (stage, { names, options }) => stage.showGreasyPole(names, { duration: options.duration }),
    start: startPole,
  },
  {
    id: 'taw',
    winMode: 'taw',
    icon: '🔮',
    name: 'Taw Knockout',
    verb: 'pitch',
    tagline: 'Schoolyard ring-out marbles — last marble in the chalk circle leads.',
    players: { min: MIN_TAW_PLAYERS, max: MAX_TAW_PLAYERS },
    options: [
      {
        id: 'duration',
        type: 'range',
        label: 'Match length',
        steps: TAW_DURATIONS.map(({ seconds, label, text }) => ({ value: seconds, label, text })),
        default: DEFAULT_TAW_DURATION,
        normalize: normalizeTawDuration,
      },
      {
        id: 'rule',
        type: 'segmented',
        label: 'Rules',
        default: DEFAULT_TAW_RULE,
        choices: [{ value: 'champion', label: 'Champion' }, { value: 'keepsies', label: 'Keepsies' }],
      },
    ],
    guide: 'taw',
    ready: (n) => `${n} glass marbles clustered in the chalk ring — KNUCKLES DOWN, PITCH!`,
    stagePreview: (stage, { names, options }) => stage.showTawRing(names, { duration: options.duration }),
    start: startTaw,
  },
  {
    id: 'ddakji',
    winMode: 'ddakji',
    icon: '🟥',
    name: 'Ddakji Flip-Out',
    verb: 'slam',
    tagline: 'Paper-tile slam royale — last unflipped tile leads standup.',
    players: { min: MIN_DDAKJI_PLAYERS, max: MAX_DDAKJI_PLAYERS },
    options: [
      {
        id: 'duration',
        type: 'range',
        label: 'Match length',
        steps: DDAKJI_DURATIONS.map(({ seconds, label, text }) => ({ value: seconds, label, text })),
        default: DEFAULT_DDAKJI_DURATION,
        normalize: normalizeDdakjiDuration,
      },
      {
        id: 'rule',
        type: 'segmented',
        label: 'Rules',
        default: DEFAULT_DDAKJI_RULE,
        choices: [{ value: 'champion', label: 'Champion' }, { value: 'recruiter', label: 'Recruiter' }],
      },
    ],
    guide: 'ddakji',
    ready: (n) => `${n} folded origami tiles laid on the Seoul slate — KKA-RA, TTAK!`,
    stagePreview: (stage, { names, options }) => stage.showDdakjiCourt(names, { duration: options.duration }),
    start: startDdakji,
  },
  {
    id: 'nokabe',
    winMode: 'nokabe',
    icon: '📺',
    name: 'Nōkabe Crunch',
    verb: 'pose',
    tagline: 'Hole-in-the-wall contortion — last dry dev on the dock leads.',
    players: { min: MIN_NOKABE_PLAYERS, max: MAX_NOKABE_PLAYERS },
    options: [
      {
        id: 'duration',
        type: 'range',
        label: 'Episode length',
        steps: NOKABE_DURATIONS.map(({ seconds, label, text }) => ({ value: seconds, label, text })),
        default: DEFAULT_NOKABE_DURATION,
        normalize: normalizeNokabeDuration,
      },
      {
        id: 'rule',
        type: 'segmented',
        label: 'Rules',
        default: DEFAULT_NOKABE_RULE,
        choices: [{ value: 'dry', label: 'Dry Champ' }, { value: 'canary', label: 'Canary' }],
      },
    ],
    guide: 'nokabe',
    ready: (n) => `${n} silver-suited devs on the dunk-tank dock — KABE GA KURU YO!`,
    stagePreview: (stage, { names, options }) => stage.showNokabeStudio(names, { duration: options.duration }),
    start: startNokabe,
  },
  {
    id: 'mahjong',
    winMode: 'mahjong',
    icon: '🀄',
    name: 'Mahjong Wash',
    verb: 'wash',
    tagline: 'Xǐpái whirlpool rumble — last standing on the emerald baize leads.',
    players: { min: MIN_MAHJONG_PLAYERS, max: MAX_MAHJONG_PLAYERS },
    options: [
      {
        id: 'duration',
        type: 'range',
        label: 'Wash length',
        steps: MAHJONG_DURATIONS.map(({ seconds, label, text }) => ({ value: seconds, label, text })),
        default: DEFAULT_MAHJONG_DURATION,
        normalize: normalizeMahjongDuration,
      },
      {
        id: 'rule',
        type: 'segmented',
        label: 'Rules',
        default: DEFAULT_MAHJONG_RULE,
        choices: [{ value: 'hu', label: 'Hú!' }, { value: 'fangpao', label: 'Fàngpào' }],
      },
    ],
    guide: 'mahjong',
    ready: (n) => `${n} devs dropped onto the emerald baize with 144 swirling tiles — XǏPÁI!`,
    stagePreview: (stage, { names, options }) => stage.showMahjongTable(names, { duration: options.duration }),
    start: startMahjong,
  },
  {
    id: 'khokho',
    winMode: 'khokho',
    icon: '🪑',
    name: 'Kho-Kho Blitz',
    verb: 'dash',
    tagline: 'Swivel-chair boardroom tag — dodge KHO! chair ambushes to lead.',
    players: { min: MIN_KHOKHO_PLAYERS, max: MAX_KHOKHO_PLAYERS },
    options: [
      {
        id: 'duration',
        type: 'range',
        label: 'Meeting length',
        steps: KHOKHO_DURATIONS.map(({ seconds, label, text }) => ({ value: seconds, label, text })),
        default: DEFAULT_KHOKHO_DURATION,
        normalize: normalizeKhokhoDuration,
      },
      {
        id: 'rule',
        type: 'segmented',
        label: 'Rules',
        default: DEFAULT_KHOKHO_RULE,
        choices: [{ value: 'elusive', label: 'Elusive' }, { value: 'p1', label: 'First P1' }],
      },
    ],
    guide: 'khokho',
    ready: (n) => `${n} runners in the boardroom aisles — KHO! BHAAGO!`,
    stagePreview: (stage, { names, options }) => stage.showKhokhoBoardroom(names, { duration: options.duration }),
    start: startKhokho,
  },
  {
    id: 'chaupar',
    winMode: 'chaupar',
    icon: '🐚',
    name: 'Chaupar Clash',
    verb: 'roll',
    tagline: 'Boardroom Pachisi & cowrie rain — claim the Charkoni throne to lead.',
    players: { min: MIN_CHAUPAR_PLAYERS, max: MAX_CHAUPAR_PLAYERS },
    options: [
      {
        id: 'duration',
        type: 'range',
        label: 'Sync length',
        steps: CHAUPAR_DURATIONS.map(({ seconds, label, text }) => ({ value: seconds, label, text })),
        default: DEFAULT_CHAUPAR_DURATION,
        normalize: normalizeChauparDuration,
      },
      {
        id: 'rule',
        type: 'segmented',
        label: 'Rules',
        default: DEFAULT_CHAUPAR_RULE,
        choices: [{ value: 'throne', label: 'Charkoni' }, { value: 'firstcut', label: 'First Cut' }],
      },
    ],
    guide: 'chaupar',
    ready: (n) => `${n} pawns on the embroidered Chaupar cloth — KAUDI PHEKO!`,
    stagePreview: (stage, { names, options }) => stage.showChauparBoardroom(names, { duration: options.duration }),
    start: startChaupar,
  },
  {
    id: 'glass',
    winMode: 'glass',
    icon: '🌉',
    name: 'Glass Bridge',
    verb: 'leap',
    tagline: 'Tempered vs. untested prod panes — survive the 50/50 crossing to lead.',
    players: { min: MIN_GLASS_PLAYERS, max: MAX_GLASS_PLAYERS },
    options: [
      {
        id: 'duration',
        type: 'range',
        label: 'Bridge length',
        steps: GLASS_DURATIONS.map(({ seconds, label, text }) => ({ value: seconds, label, text })),
        default: DEFAULT_GLASS_DURATION,
        normalize: normalizeGlassDuration,
      },
      {
        id: 'rule',
        type: 'segmented',
        label: 'Rules',
        default: DEFAULT_GLASS_RULE,
        choices: [{ value: 'survivor', label: 'Survivor' }, { value: 'canary', label: 'Canary' }],
      },
    ],
    guide: 'glass',
    ready: (n) => `${n} devs in numbered vests on the staging gantry — CHOOSE YOUR LANE!`,
    stagePreview: (stage, { names, options }) => stage.showGlassBridge(names, { duration: options.duration }),
    start: startGlass,
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
        hud.noteHtml(throwText(e));
      } else if (e.type === 'final') hud.noteHtml(`Final two: ${who(e.pair[0])} vs ${who(e.pair[1])}`, true);
      else if (e.type === 'closeCall') hud.noteHtml(closeCallText(e.wrestler, e.other));
      else if (e.type === 'showman') hud.noteHtml(`${who(e.wrestler)} plays to the crowd 👑`);
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

/** Clamps an optional URL speed multiplier to a safe finite range (#144). */
export function clampSpeedScale(raw, fallback = 1) {
  if (raw === null || raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.max(0.5, Math.min(8, n));
}

/** Validates and normalises an optional URL duration override (#144). */
export function queryDurationOverride(paramName, fallback, normalize, search = typeof location !== 'undefined' ? location.search : '') {
  const params = new URLSearchParams(search);
  if (!params.has(paramName)) return fallback;
  const n = Number(params.get(paramName));
  if (!Number.isFinite(n) || n <= 0) return fallback;
  const clamped = Math.max(10, Math.min(120, n));
  return typeof normalize === 'function' ? normalize(clamped) : clamped;
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

  const dmSpeed = clampSpeedScale(new URLSearchParams(location.search).get('dmSpeed'), 1);

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
  const effectiveDuration = queryDurationOverride('clawDuration', duration, normalizeClawDuration);

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
  const effectiveDuration = queryDurationOverride('plinkoDuration', duration, normalizePlinkoDuration);
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
  const effectiveDuration = queryDurationOverride('freezeDuration', duration, normalizeFreezeDuration);
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
  const effectiveDuration = queryDurationOverride('launchDuration', duration, normalizeLaunchDuration);

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
  const effectiveDuration = queryDurationOverride('jengaDuration', duration, normalizeJengaDuration);
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
  const effectiveDuration = queryDurationOverride('cannonDuration', duration, normalizeCannonDuration);
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
  const effectiveDuration = queryDurationOverride('golfDuration', duration, normalizeGolfDuration);
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
  const effectiveDuration = queryDurationOverride('rtoDuration', duration, normalizeRtoDuration);
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
  const effectiveDuration = queryDurationOverride('tumbaDuration', duration, normalizeTumbaDuration);
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
  const effectiveDuration = queryDurationOverride('karangDuration', duration, normalizeKarangDuration);
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

// ------------------------------------------------------------------ tubig-tubig gauntlet

function startTubig(ctx, { duration, rule }) {
  ctx.setPhase('race');
  ctx.hideLobby();

  if (!ctx.game) {
    const plan = planTubigMatch(ctx.names, { duration, rule, rng: ctx.rng });
    ctx.hud.showWinner(
      plan.winner.name,
      null,
      plan.duration,
      0,
      plan.rule === 'tag'
        ? `IKAW NA! First dev splashed becomes the new Patotot (${plan.variant.label}, off-screen).`
        : `CLEARED ALL GATES — survived LOCALHOST ↔ STAGING (${plan.variant.label}, off-screen).`,
      { kicker: 'Leads today’s standup' },
    );
    ctx.setPhase('results');
    ctx.saveWinner(plan.winner.name);
    return;
  }

  const { game, hud } = ctx;
  const effectiveDuration = queryDurationOverride('tubigDuration', duration, normalizeTubigDuration);
  const banner = document.getElementById('tubig-banner');
  const setBanner = (text, tone = 'green') => {
    if (!banner) return;
    banner.textContent = text;
    banner.className = `freeze-banner freeze-${tone}`;
    banner.hidden = false;
  };

  hud.beginWrestle([]);
  setBanner('💧 POURING WATER LINES — NONE SHALL MERGE!', 'yellow');

  game.startTubig(ctx.names, {
    duration: effectiveDuration,
    rule,
    rng: ctx.rng,
    onEvent: (e) => {
      if (e.type === 'status') setBanner(e.text, e.tone ?? 'green');
      else if (e.type === 'note') hud.note(e.text, Boolean(e.important));
    },
    onWinner: (winner, plan) => {
      ctx.setPhase('results');
      ctx.hideQuit();
      if (banner) banner.hidden = true;
      hud.callout(
        plan.rule === 'tag'
          ? `💦 IKAW NA! ${winner.name} IS THE NEW PATOTOT!`
          : `💧 ${winner.name} CLEARED ALL GATES — LEADS STANDUP!`,
        2400,
      );
      hud.showWinner(
        winner.name,
        null,
        plan.duration,
        1500,
        plan.rule === 'tag'
          ? `IKAW NA! First dev splashed becomes the new Patotot (${plan.variant.label})`
          : `CLEARED ALL GATES — round-trip survivor (${plan.variant.label})`,
        { kicker: plan.rule === 'tag' ? 'New Patotot' : 'Tubig-Tubig Champion' },
      );
      ctx.saveWinner(winner.name);
    },
  });
  ctx.showQuit('✕ Quit Tubig-Tubig');
}

// ------------------------------------------------------------------ rum-shop domino slam

function startDomino(ctx, { duration, rule }) {
  ctx.setPhase('race');
  ctx.hideLobby();

  if (!ctx.game) {
    const sim = runDominoHeadless(ctx.names, { duration, rule, rng: ctx.rng });
    const winner = sim.winner ?? sim.players[0];
    ctx.hud.showWinner(
      winner.name,
      null,
      sim.time,
      0,
      sim.rule === 'sixlove'
        ? `SIX-LOVE (6-0)! First dev blasted off the rum-shop table (${sim.variant.label}, off-screen).`
        : `LAST ON THE TABLE — survived the domino slams (${sim.variant.label}, off-screen).`,
      { kicker: 'Leads today’s standup' },
    );
    ctx.setPhase('results');
    ctx.saveWinner(winner.name);
    return;
  }

  const { game, hud } = ctx;
  const effectiveDuration = queryDurationOverride('dominoDuration', duration, normalizeDominoDuration);
  const banner = document.getElementById('domino-banner');
  const setBanner = (text, tone = 'yellow') => {
    if (!banner) return;
    banner.textContent = text;
    banner.className = `freeze-banner freeze-${tone}`;
    banner.hidden = false;
  };

  hud.beginWrestle([]);
  setBanner(`🁣 WASH DE BONES! ON TABLE: ${ctx.names.length} / ${ctx.names.length}`, 'yellow');

  game.startDomino(ctx.names, {
    duration: effectiveDuration,
    rule,
    rng: ctx.rng,
    onEvent: (e) => {
      if (e.type === 'status') setBanner(e.text, e.tone ?? 'yellow');
      else if (e.type === 'note') hud.note(e.text, Boolean(e.important));
    },
    onWinner: (winner, sim) => {
      ctx.setPhase('results');
      ctx.hideQuit();
      if (banner) banner.hidden = true;
      hud.callout(
        sim.rule === 'sixlove'
          ? `🁣 SIX-LOVE (6-0)! ${winner.name} LEADS STANDUP!`
          : `🁣 ${winner.name} LAST ON THE TABLE — LEADS STANDUP!`,
        2400,
      );
      hud.showWinner(
        winner.name,
        null,
        sim.time,
        1500,
        sim.rule === 'sixlove'
          ? `SIX-LOVE (6-0)! First dev blasted off the rum-shop table (${sim.variant.label})`
          : `LAST ON THE TABLE — survived the domino shockwaves (${sim.variant.label})`,
        { kicker: sim.rule === 'sixlove' ? 'SIX-LOVE (6-0)' : 'Rum-Shop Champion' },
      );
      ctx.saveWinner(winner.name);
    },
  });
  ctx.showQuit('✕ Quit Domino Slam');
}

// ------------------------------------------------------------------ greasy pole scramble

function startPole(ctx, { duration, rule }) {
  ctx.setPhase('race');
  ctx.hideLobby();

  if (!ctx.game) {
    const sim = runPoleHeadless(ctx.names, { duration, rule, rng: ctx.rng });
    const winner = sim.winner ?? sim.standings()[0];
    ctx.hud.showWinner(
      winner.name,
      null,
      sim.time,
      0,
      sim.rule === 'muddrop'
        ? `FIRST IN DE MUD — face-planted into the mud pit (${sim.variant.label}, off-screen).`
        : `SUMMIT CHAMPION — grabbed the Mashramani banner (${sim.variant.label}, off-screen).`,
      { kicker: 'Leads today’s standup' },
    );
    ctx.setPhase('results');
    ctx.saveWinner(winner.name);
    return;
  }

  const { game, hud } = ctx;
  const effectiveDuration = queryDurationOverride('poleDuration', duration, normalizePoleDuration);
  const banner = document.getElementById('pole-banner');
  const setBanner = (text, tone = 'green') => {
    if (!banner) return;
    banner.textContent = text;
    banner.className = `freeze-banner freeze-${tone}`;
    banner.hidden = false;
  };

  hud.beginWrestle([]);
  setBanner('🌴 CHALKING UP AT THE MUD PIT — GET READY!', 'yellow');

  game.startPole(ctx.names, {
    duration: effectiveDuration,
    rule,
    rng: ctx.rng,
    onEvent: (e) => {
      if (e.type === 'status') setBanner(e.text, e.tone ?? 'green');
      else if (e.type === 'note') hud.note(e.text, Boolean(e.important));
    },
    onWinner: (winner, sim) => {
      ctx.setPhase('results');
      ctx.hideQuit();
      if (banner) banner.hidden = true;
      hud.callout(
        sim.rule === 'muddrop'
          ? `🫧 FIRST IN DE MUD! ${winner.name} LEADS STANDUP!`
          : `🌴 ${winner.name} GRABBED THE SUMMIT BANNER — LEADS STANDUP!`,
        2400,
      );
      hud.showWinner(
        winner.name,
        null,
        sim.time,
        1500,
        sim.rule === 'muddrop'
          ? `FIRST IN DE MUD — splashed straight into the pit (${sim.variant.label})`
          : `SUMMIT CHAMPION — yanked down the Mashramani banner (${sim.variant.label})`,
        { kicker: sim.rule === 'muddrop' ? 'First in de Mud' : 'King of the Pole' },
      );
      ctx.saveWinner(winner.name);
    },
  });
  ctx.showQuit('✕ Quit Greasy Pole');
}

// ------------------------------------------------------------------ schoolyard taw knockout

function startTaw(ctx, { duration, rule }) {
  ctx.setPhase('race');
  ctx.hideLobby();

  if (!ctx.game) {
    const sim = runTawHeadless(ctx.names, { duration, rule, rng: ctx.rng });
    const winner = sim.winner ?? sim.standings()[0];
    ctx.hud.showWinner(
      winner.name,
      null,
      sim.time,
      0,
      sim.rule === 'keepsies'
        ? `KEEPSIES — first marble knocked out of the chalk ring (${sim.variant.label}, off-screen).`
        : `LAST MARBLE STANDING — owned the schoolyard ring (${sim.variant.label}, off-screen).`,
      { kicker: 'Leads today’s standup' },
    );
    ctx.setPhase('results');
    ctx.saveWinner(winner.name);
    return;
  }

  const { game, hud } = ctx;
  const effectiveDuration = queryDurationOverride('tawDuration', duration, normalizeTawDuration);
  const banner = document.getElementById('taw-banner');
  const setBanner = (text, tone = 'yellow') => {
    if (!banner) return;
    banner.textContent = text;
    banner.className = `freeze-banner freeze-${tone}`;
    banner.hidden = false;
  };

  hud.beginWrestle([]);
  setBanner(`🔮 KNUCKLES DOWN — ${ctx.names.length} MARBLES IN THE CHALK RING!`, 'yellow');

  game.startTaw(ctx.names, {
    duration: effectiveDuration,
    rule,
    rng: ctx.rng,
    onEvent: (e) => {
      if (e.type === 'status') setBanner(e.text, e.tone ?? 'yellow');
      else if (e.type === 'note') hud.note(e.text, Boolean(e.important));
    },
    onWinner: (winner, sim) => {
      ctx.setPhase('results');
      ctx.hideQuit();
      if (banner) banner.hidden = true;
      hud.callout(
        sim.rule === 'keepsies'
          ? `🔮 KEEPSIES! ${winner.name} FIRST OUT — LEADS STANDUP!`
          : `🔮 ${winner.name} LAST MARBLE IN THE RING — LEADS STANDUP!`,
        2400,
      );
      hud.showWinner(
        winner.name,
        null,
        sim.time,
        1500,
        sim.rule === 'keepsies'
          ? `KEEPSIES — first marble knocked past the chalk line (${sim.variant.label})`
          : `LAST MARBLE STANDING — ruled the schoolyard ring (${sim.variant.label})`,
        { kicker: sim.rule === 'keepsies' ? 'Keepsies' : 'King of the Ring' },
      );
      ctx.saveWinner(winner.name);
    },
  });
  ctx.showQuit('✕ Quit Taw Knockout');
}

// ------------------------------------------------------------------ ddakji flip-out

function startDdakji(ctx, { duration, rule }) {
  ctx.setPhase('race');
  ctx.hideLobby();

  if (!ctx.game) {
    const sim = runDdakjiHeadless(ctx.names, { duration, rule, rng: ctx.rng });
    const winner = sim.winner ?? sim.standings()[0];
    ctx.hud.showWinner(
      winner.name,
      null,
      sim.time,
      0,
      sim.rule === 'recruiter'
        ? `RECRUITER SLAP — first tile flipped upside-down (${sim.variant.label}, off-screen).`
        : `UNFLIPPED CHAMPION — last origami tile face-up (${sim.variant.label}, off-screen).`,
      { kicker: 'Leads today’s standup' },
    );
    ctx.setPhase('results');
    ctx.saveWinner(winner.name);
    return;
  }

  const { game, hud } = ctx;
  const effectiveDuration = queryDurationOverride('ddakjiDuration', duration, normalizeDdakjiDuration);
  const banner = document.getElementById('ddakji-banner');
  const setBanner = (text, tone = 'yellow') => {
    if (!banner) return;
    banner.textContent = text;
    banner.className = `freeze-banner freeze-${tone}`;
    banner.hidden = false;
  };

  hud.beginWrestle([]);
  setBanner(`🟥 KKA-RA! — ${ctx.names.length} ORIGAMI TILES ON THE SLATE`, 'yellow');

  game.startDdakji(ctx.names, {
    duration: effectiveDuration,
    rule,
    rng: ctx.rng,
    onEvent: (e) => {
      if (e.type === 'status') setBanner(e.text, e.tone ?? 'yellow');
      else if (e.type === 'note') hud.note(e.text, Boolean(e.important));
    },
    onWinner: (winner, sim) => {
      ctx.setPhase('results');
      ctx.hideQuit();
      if (banner) banner.hidden = true;
      hud.callout(
        sim.rule === 'recruiter'
          ? `🟥 RECRUITER SLAP! ${winner.name} FIRST FLIPPED — LEADS STANDUP!`
          : `🟥 ${winner.name} UNFLIPPED CHAMPION — LEADS STANDUP!`,
        2400,
      );
      hud.showWinner(
        winner.name,
        null,
        sim.time,
        1500,
        sim.rule === 'recruiter'
          ? `RECRUITER SLAP — first tile flipped upside-down (${sim.variant.label})`
          : `UNFLIPPED CHAMPION — last tile standing face-up (${sim.variant.label})`,
        { kicker: sim.rule === 'recruiter' ? 'You’re Up — Lead Standup!' : 'Unflipped Champion' },
      );
      ctx.saveWinner(winner.name);
    },
  });
  ctx.showQuit('✕ Quit Ddakji');
}

// ------------------------------------------------------------------ nokabe wall crunch

function startNokabe(ctx, { duration, rule }) {
  ctx.setPhase('race');
  ctx.hideLobby();

  if (!ctx.game) {
    const sim = runNokabeHeadless(ctx.names, { duration, rule, rng: ctx.rng });
    const winner = sim.winner ?? sim.standings()[0];
    ctx.hud.showWinner(
      winner.name,
      null,
      sim.time,
      0,
      sim.rule === 'canary'
        ? `FIRST IN THE TANK — first dev splashed into the dunk tank (${sim.variant.label}, off-screen).`
        : `PASSED COMPLIANCE — last dry dev on the dock (${sim.variant.label}, off-screen).`,
      { kicker: 'Leads today’s standup' },
    );
    ctx.setPhase('results');
    ctx.saveWinner(winner.name);
    return;
  }

  const { game, hud } = ctx;
  const effectiveDuration = queryDurationOverride('nokabeDuration', duration, normalizeNokabeDuration);
  const banner = document.getElementById('nokabe-banner');
  const setBanner = (text, tone = 'yellow') => {
    if (!banner) return;
    banner.textContent = text;
    banner.className = `freeze-banner freeze-${tone}`;
    banner.hidden = false;
  };

  hud.beginWrestle([]);
  setBanner(`📺 JUNBI OK! — ${ctx.names.length} DEVS ON THE DUNK-TANK DOCK`, 'yellow');

  game.startNokabe(ctx.names, {
    duration: effectiveDuration,
    rule,
    rng: ctx.rng,
    onEvent: (e) => {
      if (e.type === 'status') setBanner(e.text, e.tone ?? 'yellow');
      else if (e.type === 'note') hud.note(e.text, Boolean(e.important));
    },
    onWinner: (winner, sim) => {
      ctx.setPhase('results');
      ctx.hideQuit();
      if (banner) banner.hidden = true;
      hud.callout(
        sim.rule === 'canary'
          ? `💦 FIRST IN THE TANK! ${winner.name} LEADS STANDUP!`
          : `📺 ${winner.name} PASSED COMPLIANCE — LEADS STANDUP!`,
        2400,
      );
      hud.showWinner(
        winner.name,
        null,
        sim.time,
        1500,
        sim.rule === 'canary'
          ? `FIRST IN THE TANK — belly-flopped straight into the dunk tank (${sim.variant.label})`
          : `PASSED COMPLIANCE — stayed dry through every styrofoam wall (${sim.variant.label})`,
        { kicker: sim.rule === 'canary' ? 'Dunk-Tank Canary' : 'Dry Champion' },
      );
      ctx.saveWinner(winner.name);
    },
  });
  ctx.showQuit('✕ Quit Nōkabe');
}

// ------------------------------------------------------------------ mahjong tile wash

function startMahjong(ctx, { duration, rule }) {
  ctx.setPhase('race');
  ctx.hideLobby();

  if (!ctx.game) {
    const sim = runMahjongHeadless(ctx.names, { duration, rule, rng: ctx.rng });
    const winner = sim.winner ?? sim.standings()[0];
    ctx.hud.showWinner(
      winner.name,
      null,
      sim.time,
      0,
      sim.rule === 'fangpao'
        ? `DEALT INTO THE WINNING HAND — first dev swallowed by the chute (${sim.variant.label}, off-screen).`
        : `ZÌMŌ (SELF-DRAWN WIN) — last dev standing on the emerald baize (${sim.variant.label}, off-screen).`,
      { kicker: 'Leads today’s standup' },
    );
    ctx.setPhase('results');
    ctx.saveWinner(winner.name);
    return;
  }

  const { game, hud } = ctx;
  const effectiveDuration = queryDurationOverride('mahjongDuration', duration, normalizeMahjongDuration);
  const banner = document.getElementById('mahjong-banner');
  const setBanner = (text, tone = 'yellow') => {
    if (!banner) return;
    banner.textContent = text;
    banner.className = `freeze-banner freeze-${tone}`;
    banner.hidden = false;
  };

  hud.beginWrestle([]);
  setBanner(`🀄 XǏPÁI! — ${ctx.names.length} DEVS ON THE BAIZE · WIND: EAST`, 'yellow');

  game.startMahjong(ctx.names, {
    duration: effectiveDuration,
    rule,
    rng: ctx.rng,
    onEvent: (e) => {
      if (e.type === 'status') setBanner(e.text, e.tone ?? 'yellow');
      else if (e.type === 'note') hud.note(e.text, Boolean(e.important));
    },
    onWinner: (winner, sim) => {
      ctx.setPhase('results');
      ctx.hideQuit();
      if (banner) banner.hidden = true;
      hud.callout(
        sim.rule === 'fangpao'
          ? `🀄 FÀNGPÀO! ${winner.name} DEALT INTO THE WINNING HAND — LEADS STANDUP!`
          : `🀄 HÚ! ${winner.name} ZÌMŌ (SELF-DRAWN WIN) — LEADS STANDUP!`,
        2400,
      );
      hud.showWinner(
        winner.name,
        null,
        sim.time,
        1500,
        sim.rule === 'fangpao'
          ? `DEALT INTO THE WINNING HAND — first dev into the brass chute (${sim.variant.label})`
          : `ZÌMŌ (SELF-DRAWN WIN) — last dev standing on the emerald baize (${sim.variant.label})`,
        { kicker: sim.rule === 'fangpao' ? 'Fàngpào — First Discard' : 'Hú! Parlor Champion' },
      );
      ctx.saveWinner(winner.name);
    },
  });
  ctx.showQuit('✕ Quit Mahjong');
}

// ------------------------------------------------------------------ kho-kho relay blitz

function startKhokho(ctx, { duration, rule }) {
  ctx.setPhase('race');
  ctx.hideLobby();

  if (!ctx.game) {
    const sim = runKhokhoHeadless(ctx.names, { duration, rule, rng: ctx.rng });
    const winner = sim.winner ?? sim.standings()[0];
    ctx.hud.showWinner(
      winner.name,
      null,
      sim.time,
      0,
      sim.rule === 'p1'
        ? `ON-CALL OWNER — first runner ambushed by a swivel chair (${sim.variant.label}, off-screen).`
        : `DODGED THE ESCALATION — outlasted every KHO! chair ambush (${sim.variant.label}, off-screen).`,
      { kicker: 'Leads today’s standup' },
    );
    ctx.setPhase('results');
    ctx.saveWinner(winner.name);
    return;
  }

  const { game, hud } = ctx;
  const effectiveDuration = queryDurationOverride('khokhoDuration', duration, normalizeKhokhoDuration);
  const banner = document.getElementById('khokho-banner');
  const setBanner = (text, tone = 'yellow') => {
    if (!banner) return;
    banner.textContent = text;
    banner.className = `freeze-banner freeze-${tone}`;
    banner.hidden = false;
  };

  hud.beginWrestle([]);
  setBanner(`🪑 MEETING STARTING — ${ctx.names.length} RUNNERS IN THE BOARDROOM!`, 'yellow');

  game.startKhokho(ctx.names, {
    duration: effectiveDuration,
    rule,
    rng: ctx.rng,
    onEvent: (e) => {
      if (e.type === 'status') setBanner(e.text, e.tone ?? 'yellow');
      else if (e.type === 'note') hud.note(e.text, Boolean(e.important));
    },
    onWinner: (winner, sim) => {
      ctx.setPhase('results');
      ctx.hideQuit();
      if (banner) banner.hidden = true;
      hud.callout(
        sim.rule === 'p1'
          ? `🚨 ON-CALL OWNER! ${winner.name} FIRST TAGGED — LEADS STANDUP!`
          : `🪑 ${winner.name} DODGED THE ESCALATION — LEADS STANDUP!`,
        2400,
      );
      hud.showWinner(
        winner.name,
        null,
        sim.time,
        1500,
        sim.rule === 'p1'
          ? `ON-CALL OWNER — ambushed by the P1 swivel-chair relay (${sim.variant.label})`
          : `DODGED THE ESCALATION — outlasted ${sim.khoChain}x KHO! chains (${sim.variant.label})`,
        { kicker: sim.rule === 'p1' ? 'Assigned P1!' : 'Elusive Champion' },
      );
      ctx.saveWinner(winner.name);
    },
  });
  ctx.showQuit('✕ Quit Kho-Kho');
}

// ------------------------------------------------------------------ chaupar cowrie-clash

function startChaupar(ctx, { duration, rule }) {
  ctx.setPhase('race');
  ctx.hideLobby();

  if (!ctx.game) {
    const sim = runChauparHeadless(ctx.names, { duration, rule, rng: ctx.rng });
    const winner = sim.winner ?? sim.standings()[0];
    ctx.hud.showWinner(
      winner.name,
      null,
      sim.time,
      0,
      sim.rule === 'firstcut'
        ? `CUT TO SPRINT 0 — first pawn flicked into the office wastebasket (${sim.variant.label}, off-screen).`
        : `CHARKONI CLAIMED — stormed the central boardroom throne (${sim.variant.label}, off-screen).`,
      { kicker: 'Leads today’s standup' },
    );
    ctx.setPhase('results');
    ctx.saveWinner(winner.name);
    return;
  }

  const { game, hud } = ctx;
  const effectiveDuration = queryDurationOverride('chauparDuration', duration, normalizeChauparDuration);
  const banner = document.getElementById('chaupar-banner');
  const setBanner = (text, tone = 'yellow') => {
    if (!banner) return;
    banner.textContent = text;
    banner.className = `freeze-banner freeze-${tone}`;
    banner.hidden = false;
  };

  hud.beginWrestle([]);
  setBanner(`🐚 CHALO! ${ctx.names.length} PAWNS ON THE CHAUPAR CLOTH!`, 'yellow');

  game.startChaupar(ctx.names, {
    duration: effectiveDuration,
    rule,
    rng: ctx.rng,
    onEvent: (e) => {
      if (e.type === 'status') setBanner(e.text, e.tone ?? 'yellow');
      else if (e.type === 'note') hud.note(e.text, Boolean(e.important));
    },
    onWinner: (winner, sim) => {
      ctx.setPhase('results');
      ctx.hideQuit();
      if (banner) banner.hidden = true;
      hud.callout(
        sim.rule === 'firstcut'
          ? `🗑️ KAAT DIYA! ${winner.name} CUT TO SPRINT 0 — LEADS STANDUP!`
          : `🐚 CHARKONI CLAIMED! ${winner.name} LEADS STANDUP!`,
        2400,
      );
      hud.showWinner(
        winner.name,
        null,
        sim.time,
        1500,
        sim.rule === 'firstcut'
          ? `CUT TO SPRINT 0 — first pawn flicked off the teak table (${sim.variant.label})`
          : `CHARKONI CLAIMED — last roll ${sim.lastRollLabel} (${sim.variant.label})`,
        { kicker: sim.rule === 'firstcut' ? 'Cut to Sprint 0!' : 'Chair of the Board' },
      );
      ctx.saveWinner(winner.name);
    },
  });
  ctx.showQuit('✕ Quit Chaupar');
}

// ------------------------------------------------------------------ glass bridge deploy

function startGlass(ctx, { duration, rule }) {
  ctx.setPhase('race');
  ctx.hideLobby();

  if (!ctx.game) {
    const sim = runGlassHeadless(ctx.names, { duration, rule, rng: ctx.rng });
    const winner = sim.winner ?? sim.standings()[0];
    ctx.hud.showWinner(
      winner.name,
      null,
      sim.time,
      0,
      sim.rule === 'canary'
        ? `CANARY FAILED — first dev to shatter an untested prod pane (${sim.variant.label}, off-screen).`
        : `SURVIVED PROD CUTOVER — crossed all ${sim.pairCount} glass pairs (${sim.variant.label}, off-screen).`,
      { kicker: 'Leads today’s standup' },
    );
    ctx.setPhase('results');
    ctx.saveWinner(winner.name);
    return;
  }

  const { game, hud } = ctx;
  const effectiveDuration = queryDurationOverride('glassDuration', duration, normalizeGlassDuration);
  const banner = document.getElementById('glass-banner');
  const setBanner = (text, tone = 'yellow') => {
    if (!banner) return;
    banner.textContent = text;
    banner.className = `freeze-banner freeze-${tone}`;
    banner.hidden = false;
  };

  hud.beginWrestle([]);
  setBanner(`🌉 CHOOSE YOUR LANE! ${ctx.names.length} DEVS ON THE GLASS BRIDGE!`, 'yellow');

  game.startGlass(ctx.names, {
    duration: effectiveDuration,
    rule,
    rng: ctx.rng,
    onEvent: (e) => {
      if (e.type === 'status') setBanner(e.text, e.tone ?? 'yellow');
      else if (e.type === 'note') hud.note(e.text, Boolean(e.important));
    },
    onWinner: (winner, sim) => {
      ctx.setPhase('results');
      ctx.hideQuit();
      if (banner) banner.hidden = true;
      hud.callout(
        sim.rule === 'canary'
          ? `💥 CANARY FAILED! #${winner.vest} ${winner.name} LEADS STANDUP!`
          : `🌉 SURVIVED PROD CUTOVER! #${winner.vest} ${winner.name} LEADS STANDUP!`,
        2400,
      );
      hud.showWinner(
        winner.name,
        null,
        sim.time,
        1500,
        sim.rule === 'canary'
          ? `CANARY FAILED — first dev to drop through an untested pane (${sim.variant.label})`
          : `SURVIVED PROD CUTOVER — crossed all ${sim.pairCount} glass pairs (${sim.variant.label})`,
        { kicker: sim.rule === 'canary' ? 'Canary Failed!' : 'Deployed to Prod' },
      );
      ctx.saveWinner(winner.name);
    },
  });
  ctx.showQuit('✕ Quit Bridge');
}
