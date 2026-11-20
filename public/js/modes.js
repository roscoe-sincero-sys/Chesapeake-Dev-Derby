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
    start: startRace,
  },
  {
    id: 'rumble',
    winMode: 'wrestle',
    icon: '🤼',
    name: 'Let’s Rumble',
    verb: 'rumble',
    tagline: 'Battle royal: last one in the ring leads standup.',
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
    start: startRumble,
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
