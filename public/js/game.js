// Runs the 3D scene: renders the track, steps the race simulation, moves the
// models to match it, drives the camera and reports what happens to the UI.

import * as THREE from 'three';
import { Track } from './track.js';
import { buildScenery } from './scenery.js';
import { RACER_KINDS, buildRacer, LABEL_Y } from './racers.js';
import { buildObstacle, buildCrate, buildProjectile } from './obstacles.js';
import { Particles } from './effects.js';
import { emojiTexture } from './util3d.js';
import { RaceSim, TUNING, shuffle, generateCourse } from './sim.js';
import { WrestleMatch } from './wrestle.js';
import { WrestleStage } from './wrestle-stage.js';
import { DeathmatchMatch, DeathmatchStage } from './deathmatch.js';
import { ClawMatch, ClawStage } from './claw.js';
import { PlinkoMatch, PlinkoStage } from './plinko.js';
import { FreezeMatch, FreezeStage } from './freeze.js';
import { LaunchpadMatch, LaunchpadStage } from './launchpad.js';
import { JengaMatch, JengaStage } from './jenga.js';
import { CannonMatch, CannonStage } from './cannon.js';
import { GolfMatch, GolfStage } from './golf.js';
import { RtoMatch, RtoStage } from './rto.js';
import { TumbaMatch, TumbaStage } from './tumba.js';
import { KarangMatch, KarangStage } from './karang.js';
import { TubigMatch, TubigStage } from './tubig.js';
import { DominoMatch, DominoStage } from './domino.js';
import { PoleMatch, PoleStage } from './pole.js';
import { TawMatch, TawStage } from './taw.js';
import { DdakjiMatch, DdakjiStage } from './ddakji.js';
import { NokabeMatch, NokabeStage } from './nokabe.js';
import { MahjongMatch, MahjongStage } from './mahjong.js';
import { KhokhoMatch, KhokhoStage } from './khokho.js';
import { ChauparMatch, ChauparStage } from './chaupar.js';
import { GlassMatch, GlassStage } from './glass.js';
import { readFlyover, writeFlyover } from './flyover-handoff.js';

/** This tab's sessionStorage, or null where the browser blocks it. */
function sessionStorageOrNull() {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

const STEP = 1 / 60;
const COUNTDOWN_LEAD_IN = 1.3; // seconds of camera sweep before "3"

export const ITEM_INFO = {
  coffee: { emoji: '☕', label: 'Coffee' },
  breeze: { emoji: '💨', label: 'Bay Breeze' },
  firewall: { emoji: '🛡️', label: 'Firewall' },
  bug: { emoji: '🐛', label: 'Bug' },
  forcePush: { emoji: '💥', label: 'Force Push' },
  renewedCert: { emoji: '🔐', label: 'Renewed Certificate' },
  returnUrl: { emoji: '↩️', label: '?returnUrl=' },
  notClear: { emoji: '🌫️', label: 'You Are Not Being Clear' },
  audit: { emoji: '📋', label: 'Eight-Minute Audit' },
  roulette: { emoji: '🎰', label: 'Production Roulette' },
  theater: { emoji: '🎭', label: 'Security Theater' },
  bigTable: { emoji: '📊', label: '200GB Table' },
};

const HIT_EMOTE = {
  pit404: '🕳️',
  brokenLink: '🔗',
  mergeConflict: '⚔️',
  redirectLoop: '🔁',
  nullPointer: '❓',
  exception: '💥',
  bug: '🐛',
  forcePush: '💥',
  infiniteScroll: '📜',
  slowLoad: '⏳',
  sslExpired: '🔓',
  urlBarricade: '🚧',
  columnTable: '📊',
  notClear: '🌫️',
  bigTable: '📊',
};

/** Icon over a racer while a lasting effect is on them. */
export function statusIcon(r) {
  if (r.auditT > 0) return ITEM_INFO.audit.emoji;
  if (r.reverseT > 0) return ITEM_INFO.roulette.emoji;
  if (r.theaterT > 0) return ITEM_INFO.theater.emoji;
  return null;
}

const HIT_SOUND = { bigTable: 'explode', pit404: 'fall', redirectLoop: 'loop', nullPointer: 'null', exception: 'hit', forcePush: 'explode', sslExpired: 'null', urlBarricade: 'fall' };

const CONFETTI = ['#f2b817', '#c5122f', '#ffffff', '#16130f', '#ff7b00', '#2b78c5'];

const damp = (rate, dt) => 1 - Math.exp(-rate * dt);

/** Real seconds after the last racer crosses the line before the camera starts the course playback. */
export const PLAYBACK_DELAY = 2;
/** Fly-over speed along the course (track units per real second), whatever the race speed was. */
const FLYOVER_SPEED = 9;

export class Game {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} hooks  callbacks: onCountdown(text), onEvent(event), onFrame(sim)
   * @param {import('./audio.js').Sfx} sfx
   */
  constructor(canvas, hooks, sfx) {
    this.hooks = hooks;
    this.sfx = sfx;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.5, 1400);
    this.track = new Track({ length: TUNING.trackLength, halfWidth: TUNING.halfWidth });
    this.scene.add(this.track.build());
    this.scenery = buildScenery(this.scene, this.track);
    this.particles = new Particles(this.scene);
    // The lobby fly-over (also behind the results card after a skipped race) shows a
    // dressed course, with obstacles and item crates, rather than an empty bridge.
    this.showcase = this.buildShowcase();
    this.scene.add(this.showcase.group);

    this.phase = 'lobby';
    this.paused = false;
    this.clock = 0;
    this.timeScale = 1;
    this.flyT = 0; // real seconds into the current fly-over
    this.sim = null;
    this.raceGroup = null;
    this.visuals = [];
    this.obstacleVisuals = [];
    this.crateVisuals = [];
    this.projectileVisuals = new Map();
    this.disposables = [];
    // Live 3D lobby stage (#123 phase 2): 'flyover' | 'race-grid' | 'wrestle-ring'.
    this.stageMode = 'flyover';
    this.stageGroup = null;
    this.stageRacers = [];
    this.stageNames = [];
    this.stageTime = 0;
    this.savedStageTime = null;
    this.savedWrestleOrbit = null;
    this.savedWrestleT = null;
    this.wrestleStage = null;
    this.deathmatchStage = null;
    this.deathmatch = null;
    this.clawStage = null;
    this.claw = null;
    this.plinkoStage = null;
    this.plinko = null;
    this.freezeStage = null;
    this.freeze = null;
    this.launchpadStage = null;
    this.launchpad = null;
    this.jengaStage = null;
    this.jenga = null;
    this.cannonStage = null;
    this.cannon = null;
    this.golfStage = null;
    this.golf = null;
    this.rtoStage = null;
    this.rto = null;
    this.tumbaStage = null;
    this.tumba = null;
    this.karangStage = null;
    this.karang = null;
    this.tubigStage = null;
    this.tubig = null;
    this.dominoStage = null;
    this.domino = null;
    this.poleStage = null;
    this.pole = null;
    this.tawStage = null;
    this.taw = null;
    this.ddakjiStage = null;
    this.ddakji = null;
    this.nokabeStage = null;
    this.nokabe = null;
    this.mahjongStage = null;
    this.mahjong = null;
    this.khokhoStage = null;
    this.khokho = null;
    this.chauparStage = null;
    this.chaupar = null;
    this.glassStage = null;
    this.glass = null;
    // Carry on the 3D stage where the previous page left it (lobby ↔ Edit team list ↔ Full history),
    // instead of starting again from the beginning on each page.
    this.resumeFlyover();
    window.addEventListener('pagehide', () => {
      if (this.phase === 'lobby' && !this.wrestle) {
        writeFlyover(sessionStorageOrNull(), {
          flyT: this.flyT,
          clock: this.clock,
          stageTime: this.stageMode === 'race-grid' ? this.stageTime : undefined,
          wrestleOrbit: this.wrestleStage?.orbit,
          wrestleT: this.wrestleStage?.t,
        });
      }
    });
    window.addEventListener('pageshow', (event) => {
      // Back/forward cache: this page was frozen while another page moved the 3D stage on.
      if (event.persisted && this.phase === 'lobby') this.resumeFlyover();
    });
    this.reducedMotion = typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : { matches: false };

    this.camPos = new THREE.Vector3();
    this.camLook = new THREE.Vector3();
    this.camReady = false;
    this._a = new THREE.Vector3();
    this._b = new THREE.Vector3();
    this.focus = new THREE.Vector3();
    this.raycaster = new THREE.Raycaster();
    this._pointer = new THREE.Vector2();
    this._licenseDownHit = false;

    canvas.addEventListener('pointermove', (e) => {
      canvas.style.cursor = this.hitLicenseBillboard(e.clientX, e.clientY) ? 'pointer' : '';
    });
    canvas.addEventListener('pointerdown', (e) => {
      if (e.button === 0) this._licenseDownHit = this.hitLicenseBillboard(e.clientX, e.clientY);
    });
    canvas.addEventListener('click', (e) => {
      const hit = this._licenseDownHit || this.hitLicenseBillboard(e.clientX, e.clientY);
      this._licenseDownHit = false;
      if (hit) {
        canvas.style.cursor = '';
        this.hooks.onLicenseSignClick?.();
      }
    });

    this.resize = this.resize.bind(this);
    this.frame = this.frame.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();
    this.last = performance.now();
    requestAnimationFrame(this.frame);
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Widen the view a little on tall/narrow windows so the pack still fits.
    this.camera.fov = w / h < 1 ? 70 : 55;
    this.camera.updateProjectionMatrix();
    this.wrestle?.resize(w / h);
    this.wrestleStage?.resize(w / h);
    this.deathmatch?.resize(w, h);
    this.deathmatchStage?.resize(w / h);
    this.claw?.resize(w / h);
    this.clawStage?.resize(w / h);
    this.plinko?.resize(w / h);
    this.plinkoStage?.resize(w / h);
    this.freeze?.resize(w / h);
    this.freezeStage?.resize(w / h);
    this.launchpad?.resize(w / h);
    this.launchpadStage?.resize(w / h);
    this.jenga?.resize(w / h);
    this.jengaStage?.resize(w / h);
    this.cannon?.resize(w / h);
    this.cannonStage?.resize(w / h);
    this.golf?.resize(w / h);
    this.golfStage?.resize(w / h);
    this.rto?.resize(w / h);
    this.rtoStage?.resize(w / h);
    this.tumba?.resize(w / h);
    this.tumbaStage?.resize(w / h);
    this.karang?.resize(w / h);
    this.karangStage?.resize(w / h);
    this.tubig?.resize(w / h);
    this.tubigStage?.resize(w / h);
    this.domino?.resize(w / h);
    this.dominoStage?.resize(w / h);
    this.pole?.resize(w / h);
    this.poleStage?.resize(w / h);
    this.taw?.resize(w / h);
    this.tawStage?.resize(w / h);
    this.ddakji?.resize(w / h);
    this.ddakjiStage?.resize(w / h);
    this.nokabe?.resize(w / h);
    this.nokabeStage?.resize(w / h);
    this.mahjong?.resize(w / h);
    this.mahjongStage?.resize(w / h);
    this.khokho?.resize(w / h);
    this.khokhoStage?.resize(w / h);
    this.chaupar?.resize(w / h);
    this.chauparStage?.resize(w / h);
    this.glass?.resize(w / h);
    this.glassStage?.resize(w / h);
  }

  // ------------------------------------------------------------ live 3D lobby stage (#123)

  /** Removes any mode-specific lobby stage preview and returns to the Chesapeake Bay fly-over. */
  clearStage() {
    if (this.wrestleStage) {
      this.wrestleStage.dispose();
      this.wrestleStage = null;
    }
    if (this.deathmatchStage) {
      this.deathmatchStage.dispose();
      this.deathmatchStage = null;
    }
    if (this.clawStage) {
      this.clawStage.dispose();
      this.clawStage = null;
    }
    if (this.plinkoStage) {
      this.plinkoStage.dispose();
      this.plinkoStage = null;
    }
    if (this.freezeStage) {
      this.freezeStage.dispose();
      this.freezeStage = null;
    }
    if (this.launchpadStage) {
      this.launchpadStage.dispose();
      this.launchpadStage = null;
    }
    if (this.jengaStage) {
      this.jengaStage.dispose();
      this.jengaStage = null;
    }
    if (this.cannonStage) {
      this.cannonStage.dispose();
      this.cannonStage = null;
    }
    if (this.golfStage) {
      this.golfStage.dispose();
      this.golfStage = null;
    }
    if (this.rtoStage) {
      this.rtoStage.dispose();
      this.rtoStage = null;
    }
    if (this.tumbaStage) {
      this.tumbaStage.dispose();
      this.tumbaStage = null;
    }
    if (this.karangStage) {
      this.karangStage.dispose();
      this.karangStage = null;
    }
    if (this.tubigStage) {
      this.tubigStage.dispose();
      this.tubigStage = null;
    }
    if (this.dominoStage) {
      this.dominoStage.dispose();
      this.dominoStage = null;
    }
    if (this.poleStage) {
      this.poleStage.dispose();
      this.poleStage = null;
    }
    if (this.tawStage) {
      this.tawStage.dispose();
      this.tawStage = null;
    }
    if (this.ddakjiStage) {
      this.ddakjiStage.dispose();
      this.ddakjiStage = null;
    }
    if (this.nokabeStage) {
      this.nokabeStage.dispose();
      this.nokabeStage = null;
    }
    if (this.mahjongStage) {
      this.mahjongStage.dispose();
      this.mahjongStage = null;
    }
    if (this.khokhoStage) {
      this.khokhoStage.dispose();
      this.khokhoStage = null;
    }
    if (this.chauparStage) {
      this.chauparStage.dispose();
      this.chauparStage = null;
    }
    if (this.glassStage) {
      this.glassStage.dispose();
      this.glassStage = null;
    }
    if (this.stageGroup) {
      this.scene.remove(this.stageGroup);
      for (const r of this.stageRacers) r.visual.dispose();
    }
    this.stageGroup = null;
    this.stageRacers = [];
    this.stageNames = [];
    this.stageMode = 'flyover';
  }

  /** Shows the classic Chesapeake Bay Bridge fly-over (default for modes without a custom stage). */
  showFlyover() {
    if (this.stageMode === 'flyover') return;
    this.clearStage();
    this.showcase.group.visible = true;
    this.camReady = false;
  }

  /** Stages the checked-in teammates idling on the Bay Bridge starting grid. */
  showRaceGrid(names) {
    if (this.wrestleStage) {
      this.wrestleStage.dispose();
      this.wrestleStage = null;
    }
    if (this.deathmatchStage) {
      this.deathmatchStage.dispose();
      this.deathmatchStage = null;
    }
    if (this.clawStage) {
      this.clawStage.dispose();
      this.clawStage = null;
    }
    if (this.plinkoStage) {
      this.plinkoStage.dispose();
      this.plinkoStage = null;
    }
    if (this.freezeStage) {
      this.freezeStage.dispose();
      this.freezeStage = null;
    }
    if (this.launchpadStage) {
      this.launchpadStage.dispose();
      this.launchpadStage = null;
    }
    if (this.jengaStage) {
      this.jengaStage.dispose();
      this.jengaStage = null;
    }
    if (this.cannonStage) {
      this.cannonStage.dispose();
      this.cannonStage = null;
    }
    if (this.golfStage) {
      this.golfStage.dispose();
      this.golfStage = null;
    }
    if (this.rtoStage) {
      this.rtoStage.dispose();
      this.rtoStage = null;
    }
    if (this.tumbaStage) {
      this.tumbaStage.dispose();
      this.tumbaStage = null;
    }
    if (this.karangStage) {
      this.karangStage.dispose();
      this.karangStage = null;
    }
    if (this.tubigStage) {
      this.tubigStage.dispose();
      this.tubigStage = null;
    }
    if (this.dominoStage) {
      this.dominoStage.dispose();
      this.dominoStage = null;
    }
    if (this.poleStage) {
      this.poleStage.dispose();
      this.poleStage = null;
    }
    if (this.tawStage) {
      this.tawStage.dispose();
      this.tawStage = null;
    }
    if (this.ddakjiStage) {
      this.ddakjiStage.dispose();
      this.ddakjiStage = null;
    }
    if (this.nokabeStage) {
      this.nokabeStage.dispose();
      this.nokabeStage = null;
    }
    if (this.mahjongStage) {
      this.mahjongStage.dispose();
      this.mahjongStage = null;
    }
    if (this.khokhoStage) {
      this.khokhoStage.dispose();
      this.khokhoStage = null;
    }
    if (this.chauparStage) {
      this.chauparStage.dispose();
      this.chauparStage = null;
    }
    if (this.glassStage) {
      this.glassStage.dispose();
      this.glassStage = null;
    }
    const prevNames = new Set(this.stageNames);
    const sameMode = this.stageMode === 'race-grid';
    if (sameMode && names.length === this.stageNames.length && names.every((n, i) => n === this.stageNames[i])) return;

    if (this.stageGroup) {
      this.scene.remove(this.stageGroup);
      for (const r of this.stageRacers) r.visual.dispose();
    }
    this.stageMode = 'race-grid';
    this.stageNames = [...names];
    this.showcase.group.visible = true;
    this.stageGroup = new THREE.Group();
    this.scene.add(this.stageGroup);

    const n = names.length;
    const cols = n <= 4 ? Math.max(1, n) : n <= 12 ? 4 : 5;
    const width = TUNING.halfWidth * 1.45;
    const used = new Set();
    this.stageRacers = names.map((name, i) => {
      let h = 2166136261;
      for (let c = 0; c < name.length; c++) h = Math.imul(h ^ name.charCodeAt(c), 16777619);
      h >>>= 0;
      let kindIdx = h % RACER_KINDS.length;
      if (used.size < RACER_KINDS.length) {
        while (used.has(kindIdx)) kindIdx = (kindIdx + 1) % RACER_KINDS.length;
        used.add(kindIdx);
      }
      const color = `#${new THREE.Color().setHSL(((h % 360) / 360), 0.85, 0.55).getHexString()}`;
      const visual = buildRacer(kindIdx, color, name);
      const row = Math.floor(i / cols);
      const col = i % cols;
      const inRow = Math.min(cols, n - row * cols);
      const d = inRow === 1 ? 0 : ((col / (inRow - 1)) - 0.5) * width;
      const s = 6 - row * 3.4 - (col % 2) * 0.7;
      this.track.place(visual.root, s, d, 0);
      this.stageGroup.add(visual.root);
      return {
        visual,
        s,
        d,
        phase: (h % 628) / 100,
        pop: sameMode && !prevNames.has(name) ? 1 : 0,
      };
    });
    if (!sameMode) {
      this.stageTime = this.savedStageTime ?? 0;
      this.savedStageTime = null;
      this.camReady = false;
    }
  }

  /** Stages the checked-in teammates warming up in the spotlighted Mahabharata wrestling ring. */
  showWrestleRing(names, { modelStyle = 'classic' } = {}) {
    if (this.deathmatchStage) {
      this.deathmatchStage.dispose();
      this.deathmatchStage = null;
    }
    if (this.clawStage) {
      this.clawStage.dispose();
      this.clawStage = null;
    }
    if (this.plinkoStage) {
      this.plinkoStage.dispose();
      this.plinkoStage = null;
    }
    if (this.freezeStage) {
      this.freezeStage.dispose();
      this.freezeStage = null;
    }
    if (this.launchpadStage) {
      this.launchpadStage.dispose();
      this.launchpadStage = null;
    }
    if (this.jengaStage) {
      this.jengaStage.dispose();
      this.jengaStage = null;
    }
    if (this.cannonStage) {
      this.cannonStage.dispose();
      this.cannonStage = null;
    }
    if (this.golfStage) {
      this.golfStage.dispose();
      this.golfStage = null;
    }
    if (this.rtoStage) {
      this.rtoStage.dispose();
      this.rtoStage = null;
    }
    if (this.tumbaStage) {
      this.tumbaStage.dispose();
      this.tumbaStage = null;
    }
    if (this.karangStage) {
      this.karangStage.dispose();
      this.karangStage = null;
    }
    if (this.tubigStage) {
      this.tubigStage.dispose();
      this.tubigStage = null;
    }
    if (this.dominoStage) {
      this.dominoStage.dispose();
      this.dominoStage = null;
    }
    if (this.poleStage) {
      this.poleStage.dispose();
      this.poleStage = null;
    }
    if (this.stageGroup) {
      this.scene.remove(this.stageGroup);
      for (const r of this.stageRacers) r.visual.dispose();
      this.stageGroup = null;
      this.stageRacers = [];
      this.stageNames = [];
    }
    this.stageMode = 'wrestle-ring';
    if (!this.wrestleStage) {
      this.wrestleStage = new WrestleStage(window.innerWidth / window.innerHeight, names, {
        orbit: this.savedWrestleOrbit ?? 0.55,
        t: this.savedWrestleT ?? 0,
      });
      this.savedWrestleOrbit = null;
      this.savedWrestleT = null;
    }
    this.wrestleStage.setLineup(names, { modelStyle });
  }

  /** Stages the checked-in teammates inside the modernized QuakeWorld Standup Deathmatch arena. */
  showDeathmatchArena(names) {
    if (this.wrestleStage) { this.wrestleStage.dispose(); this.wrestleStage = null; }
    if (this.clawStage) { this.clawStage.dispose(); this.clawStage = null; }
    if (this.plinkoStage) { this.plinkoStage.dispose(); this.plinkoStage = null; }
    if (this.freezeStage) { this.freezeStage.dispose(); this.freezeStage = null; }
    if (this.launchpadStage) { this.launchpadStage.dispose(); this.launchpadStage = null; }
    if (this.jengaStage) { this.jengaStage.dispose(); this.jengaStage = null; }
    if (this.cannonStage) { this.cannonStage.dispose(); this.cannonStage = null; }
    if (this.golfStage) { this.golfStage.dispose(); this.golfStage = null; }
    if (this.rtoStage) { this.rtoStage.dispose(); this.rtoStage = null; }
    if (this.tumbaStage) { this.tumbaStage.dispose(); this.tumbaStage = null; }
    if (this.karangStage) { this.karangStage.dispose(); this.karangStage = null; }
    if (this.tubigStage) { this.tubigStage.dispose(); this.tubigStage = null; }
    if (this.dominoStage) { this.dominoStage.dispose(); this.dominoStage = null; }
    if (this.poleStage) { this.poleStage.dispose(); this.poleStage = null; }
    if (this.stageGroup) {
      this.scene.remove(this.stageGroup);
      for (const r of this.stageRacers) r.visual.dispose();
      this.stageGroup = null;
      this.stageRacers = [];
      this.stageNames = [];
    }
    this.stageMode = 'deathmatch-arena';
    if (!this.deathmatchStage) {
      this.deathmatchStage = new DeathmatchStage(window.innerWidth / window.innerHeight, names);
    }
    this.deathmatchStage.setLineup(names);
  }

  /** Stages the checked-in teammates as settling gachapon capsules in the 3D Claw of Destiny cabinet. */
  showClawCabinet(names, { sittingOut = [] } = {}) {
    if (this.wrestleStage) { this.wrestleStage.dispose(); this.wrestleStage = null; }
    if (this.deathmatchStage) { this.deathmatchStage.dispose(); this.deathmatchStage = null; }
    if (this.plinkoStage) { this.plinkoStage.dispose(); this.plinkoStage = null; }
    if (this.freezeStage) { this.freezeStage.dispose(); this.freezeStage = null; }
    if (this.launchpadStage) { this.launchpadStage.dispose(); this.launchpadStage = null; }
    if (this.jengaStage) { this.jengaStage.dispose(); this.jengaStage = null; }
    if (this.cannonStage) { this.cannonStage.dispose(); this.cannonStage = null; }
    if (this.golfStage) { this.golfStage.dispose(); this.golfStage = null; }
    if (this.rtoStage) { this.rtoStage.dispose(); this.rtoStage = null; }
    if (this.tumbaStage) { this.tumbaStage.dispose(); this.tumbaStage = null; }
    if (this.karangStage) { this.karangStage.dispose(); this.karangStage = null; }
    if (this.tubigStage) { this.tubigStage.dispose(); this.tubigStage = null; }
    if (this.dominoStage) { this.dominoStage.dispose(); this.dominoStage = null; }
    if (this.poleStage) { this.poleStage.dispose(); this.poleStage = null; }
    if (this.stageGroup) {
      this.scene.remove(this.stageGroup);
      for (const r of this.stageRacers) r.visual.dispose();
      this.stageGroup = null;
      this.stageRacers = [];
      this.stageNames = [];
    }
    this.stageMode = 'claw-cabinet';
    if (!this.clawStage) {
      this.clawStage = new ClawStage(window.innerWidth / window.innerHeight, names, sittingOut);
    }
    this.clawStage.setLineup(names, sittingOut);
  }

  /** Stages the checked-in teammates bouncing in The Backlog hopper on the tilted 3D Kanban Plinko board. */
  showPlinkoBoard(names, { duration = 30 } = {}) {
    if (this.wrestleStage) { this.wrestleStage.dispose(); this.wrestleStage = null; }
    if (this.deathmatchStage) { this.deathmatchStage.dispose(); this.deathmatchStage = null; }
    if (this.clawStage) { this.clawStage.dispose(); this.clawStage = null; }
    if (this.freezeStage) { this.freezeStage.dispose(); this.freezeStage = null; }
    if (this.launchpadStage) { this.launchpadStage.dispose(); this.launchpadStage = null; }
    if (this.jengaStage) { this.jengaStage.dispose(); this.jengaStage = null; }
    if (this.cannonStage) { this.cannonStage.dispose(); this.cannonStage = null; }
    if (this.golfStage) { this.golfStage.dispose(); this.golfStage = null; }
    if (this.rtoStage) { this.rtoStage.dispose(); this.rtoStage = null; }
    if (this.tumbaStage) { this.tumbaStage.dispose(); this.tumbaStage = null; }
    if (this.karangStage) { this.karangStage.dispose(); this.karangStage = null; }
    if (this.tubigStage) { this.tubigStage.dispose(); this.tubigStage = null; }
    if (this.dominoStage) { this.dominoStage.dispose(); this.dominoStage = null; }
    if (this.poleStage) { this.poleStage.dispose(); this.poleStage = null; }
    if (this.stageGroup) {
      this.scene.remove(this.stageGroup);
      for (const r of this.stageRacers) r.visual.dispose();
      this.stageGroup = null;
      this.stageRacers = [];
      this.stageNames = [];
    }
    this.stageMode = 'plinko-board';
    if (!this.plinkoStage) {
      this.plinkoStage = new PlinkoStage(window.innerWidth / window.innerHeight, names, { duration });
    }
    this.plinkoStage.setLineup(names, { duration });
  }

  /** Stages the checked-in teammates on the neon Code Freeze CI/CD runway. */
  showFreezeRunway(names, { duration = 30 } = {}) {
    if (this.wrestleStage) { this.wrestleStage.dispose(); this.wrestleStage = null; }
    if (this.deathmatchStage) { this.deathmatchStage.dispose(); this.deathmatchStage = null; }
    if (this.clawStage) { this.clawStage.dispose(); this.clawStage = null; }
    if (this.plinkoStage) { this.plinkoStage.dispose(); this.plinkoStage = null; }
    if (this.launchpadStage) { this.launchpadStage.dispose(); this.launchpadStage = null; }
    if (this.jengaStage) { this.jengaStage.dispose(); this.jengaStage = null; }
    if (this.cannonStage) { this.cannonStage.dispose(); this.cannonStage = null; }
    if (this.golfStage) { this.golfStage.dispose(); this.golfStage = null; }
    if (this.rtoStage) { this.rtoStage.dispose(); this.rtoStage = null; }
    if (this.tumbaStage) { this.tumbaStage.dispose(); this.tumbaStage = null; }
    if (this.karangStage) { this.karangStage.dispose(); this.karangStage = null; }
    if (this.tubigStage) { this.tubigStage.dispose(); this.tubigStage = null; }
    if (this.dominoStage) { this.dominoStage.dispose(); this.dominoStage = null; }
    if (this.poleStage) { this.poleStage.dispose(); this.poleStage = null; }
    if (this.stageGroup) {
      this.scene.remove(this.stageGroup);
      for (const r of this.stageRacers) r.visual.dispose();
      this.stageGroup = null;
      this.stageRacers = [];
      this.stageNames = [];
    }
    this.stageMode = 'freeze-runway';
    if (!this.freezeStage) {
      this.freezeStage = new FreezeStage(window.innerWidth / window.innerHeight, names, { duration });
    }
    this.freezeStage.setLineup(names);
  }

  /** Stages the checked-in teammates on the Chesapeake Bay Launchpad Roulette pads. */
  showLaunchpadComplex(names) {
    if (this.wrestleStage) {
      this.wrestleStage.dispose();
      this.wrestleStage = null;
    }
    if (this.deathmatchStage) {
      this.deathmatchStage.dispose();
      this.deathmatchStage = null;
    }
    if (this.clawStage) {
      this.clawStage.dispose();
      this.clawStage = null;
    }
    if (this.plinkoStage) {
      this.plinkoStage.dispose();
      this.plinkoStage = null;
    }
    if (this.freezeStage) {
      this.freezeStage.dispose();
      this.freezeStage = null;
    }
    if (this.jengaStage) {
      this.jengaStage.dispose();
      this.jengaStage = null;
    }
    if (this.cannonStage) {
      this.cannonStage.dispose();
      this.cannonStage = null;
    }
    if (this.golfStage) {
      this.golfStage.dispose();
      this.golfStage = null;
    }
    if (this.rtoStage) {
      this.rtoStage.dispose();
      this.rtoStage = null;
    }
    if (this.tumbaStage) {
      this.tumbaStage.dispose();
      this.tumbaStage = null;
    }
    if (this.karangStage) {
      this.karangStage.dispose();
      this.karangStage = null;
    }
    if (this.tubigStage) {
      this.tubigStage.dispose();
      this.tubigStage = null;
    }
    if (this.dominoStage) {
      this.dominoStage.dispose();
      this.dominoStage = null;
    }
    if (this.poleStage) {
      this.poleStage.dispose();
      this.poleStage = null;
    }
    if (this.stageGroup) {
      this.scene.remove(this.stageGroup);
      for (const r of this.stageRacers) r.visual.dispose();
      this.stageGroup = null;
      this.stageRacers = [];
      this.stageNames = [];
    }
    this.stageMode = 'launchpad-complex';
    if (!this.launchpadStage) {
      this.launchpadStage = new LaunchpadStage(window.innerWidth / window.innerHeight, names);
    }
    this.launchpadStage.setLineup(names);
  }

  /** Stages the checked-in teammates perched atop the 3D Dependency Jenga monolith. */
  showJengaTower(names) {
    if (this.wrestleStage) { this.wrestleStage.dispose(); this.wrestleStage = null; }
    if (this.deathmatchStage) { this.deathmatchStage.dispose(); this.deathmatchStage = null; }
    if (this.clawStage) { this.clawStage.dispose(); this.clawStage = null; }
    if (this.plinkoStage) { this.plinkoStage.dispose(); this.plinkoStage = null; }
    if (this.freezeStage) { this.freezeStage.dispose(); this.freezeStage = null; }
    if (this.launchpadStage) { this.launchpadStage.dispose(); this.launchpadStage = null; }
    if (this.cannonStage) { this.cannonStage.dispose(); this.cannonStage = null; }
    if (this.golfStage) { this.golfStage.dispose(); this.golfStage = null; }
    if (this.rtoStage) { this.rtoStage.dispose(); this.rtoStage = null; }
    if (this.tumbaStage) { this.tumbaStage.dispose(); this.tumbaStage = null; }
    if (this.karangStage) { this.karangStage.dispose(); this.karangStage = null; }
    if (this.tubigStage) { this.tubigStage.dispose(); this.tubigStage = null; }
    if (this.dominoStage) { this.dominoStage.dispose(); this.dominoStage = null; }
    if (this.poleStage) { this.poleStage.dispose(); this.poleStage = null; }
    if (this.stageGroup) {
      this.scene.remove(this.stageGroup);
      for (const r of this.stageRacers) r.visual.dispose();
      this.stageGroup = null;
      this.stageRacers = [];
      this.stageNames = [];
    }
    this.stageMode = 'jenga-tower';
    if (!this.jengaStage) {
      this.jengaStage = new JengaStage(window.innerWidth / window.innerHeight, names);
    }
    this.jengaStage.setLineup(names);
  }

  /** Stages the checked-in teammates loaded into brass cannons on the Chesapeake Bay pier. */
  showCannonPier(names) {
    if (this.wrestleStage) { this.wrestleStage.dispose(); this.wrestleStage = null; }
    if (this.deathmatchStage) { this.deathmatchStage.dispose(); this.deathmatchStage = null; }
    if (this.clawStage) { this.clawStage.dispose(); this.clawStage = null; }
    if (this.plinkoStage) { this.plinkoStage.dispose(); this.plinkoStage = null; }
    if (this.freezeStage) { this.freezeStage.dispose(); this.freezeStage = null; }
    if (this.launchpadStage) { this.launchpadStage.dispose(); this.launchpadStage = null; }
    if (this.jengaStage) { this.jengaStage.dispose(); this.jengaStage = null; }
    if (this.golfStage) { this.golfStage.dispose(); this.golfStage = null; }
    if (this.rtoStage) { this.rtoStage.dispose(); this.rtoStage = null; }
    if (this.tumbaStage) { this.tumbaStage.dispose(); this.tumbaStage = null; }
    if (this.karangStage) { this.karangStage.dispose(); this.karangStage = null; }
    if (this.tubigStage) { this.tubigStage.dispose(); this.tubigStage = null; }
    if (this.dominoStage) { this.dominoStage.dispose(); this.dominoStage = null; }
    if (this.poleStage) { this.poleStage.dispose(); this.poleStage = null; }
    if (this.stageGroup) {
      this.scene.remove(this.stageGroup);
      for (const r of this.stageRacers) r.visual.dispose();
      this.stageGroup = null;
      this.stageRacers = [];
      this.stageNames = [];
    }
    this.stageMode = 'cannon-pier';
    if (!this.cannonStage) {
      this.cannonStage = new CannonStage(window.innerWidth / window.innerHeight, names);
    }
    this.cannonStage.setLineup(names);
  }

  /** Stages the checked-in teammates as golf balls on the floating Chesapeake Bay putt-putt tee. */
  showGolfCourse(names, { duration = 15 } = {}) {
    if (this.wrestleStage) { this.wrestleStage.dispose(); this.wrestleStage = null; }
    if (this.deathmatchStage) { this.deathmatchStage.dispose(); this.deathmatchStage = null; }
    if (this.clawStage) { this.clawStage.dispose(); this.clawStage = null; }
    if (this.plinkoStage) { this.plinkoStage.dispose(); this.plinkoStage = null; }
    if (this.freezeStage) { this.freezeStage.dispose(); this.freezeStage = null; }
    if (this.launchpadStage) { this.launchpadStage.dispose(); this.launchpadStage = null; }
    if (this.jengaStage) { this.jengaStage.dispose(); this.jengaStage = null; }
    if (this.cannonStage) { this.cannonStage.dispose(); this.cannonStage = null; }
    if (this.rtoStage) { this.rtoStage.dispose(); this.rtoStage = null; }
    if (this.tumbaStage) { this.tumbaStage.dispose(); this.tumbaStage = null; }
    if (this.karangStage) { this.karangStage.dispose(); this.karangStage = null; }
    if (this.tubigStage) { this.tubigStage.dispose(); this.tubigStage = null; }
    if (this.dominoStage) { this.dominoStage.dispose(); this.dominoStage = null; }
    if (this.poleStage) { this.poleStage.dispose(); this.poleStage = null; }
    if (this.stageGroup) {
      this.scene.remove(this.stageGroup);
      for (const r of this.stageRacers) r.visual.dispose();
      this.stageGroup = null;
      this.stageRacers = [];
      this.stageNames = [];
    }
    this.stageMode = 'golf-course';
    if (!this.golfStage) {
      this.golfStage = new GolfStage(window.innerWidth / window.innerHeight, names, { duration });
    }
    this.golfStage.setLineup(names);
  }

  /** Stages the checked-in teammates as golf balls on the indoor office cubicle putt-putt tee. */
  showRtoCourse(names, { duration = 15 } = {}) {
    if (this.wrestleStage) { this.wrestleStage.dispose(); this.wrestleStage = null; }
    if (this.deathmatchStage) { this.deathmatchStage.dispose(); this.deathmatchStage = null; }
    if (this.clawStage) { this.clawStage.dispose(); this.clawStage = null; }
    if (this.plinkoStage) { this.plinkoStage.dispose(); this.plinkoStage = null; }
    if (this.freezeStage) { this.freezeStage.dispose(); this.freezeStage = null; }
    if (this.launchpadStage) { this.launchpadStage.dispose(); this.launchpadStage = null; }
    if (this.jengaStage) { this.jengaStage.dispose(); this.jengaStage = null; }
    if (this.cannonStage) { this.cannonStage.dispose(); this.cannonStage = null; }
    if (this.golfStage) { this.golfStage.dispose(); this.golfStage = null; }
    if (this.stageGroup) {
      this.scene.remove(this.stageGroup);
      for (const r of this.stageRacers) r.visual.dispose();
      this.stageGroup = null;
      this.stageRacers = [];
      this.stageNames = [];
    }
    this.stageMode = 'rto-course';
    if (!this.rtoStage) {
      this.rtoStage = new RtoStage(window.innerWidth / window.innerHeight, names, { duration });
    }
    this.rtoStage.setLineup(names);
  }

  /** Stages the checked-in teammates behind the glowing chalk badlis on the twilight fiesta street. */
  showTumbaStreet(names) {
    if (this.wrestleStage) { this.wrestleStage.dispose(); this.wrestleStage = null; }
    if (this.deathmatchStage) { this.deathmatchStage.dispose(); this.deathmatchStage = null; }
    if (this.clawStage) { this.clawStage.dispose(); this.clawStage = null; }
    if (this.plinkoStage) { this.plinkoStage.dispose(); this.plinkoStage = null; }
    if (this.freezeStage) { this.freezeStage.dispose(); this.freezeStage = null; }
    if (this.launchpadStage) { this.launchpadStage.dispose(); this.launchpadStage = null; }
    if (this.jengaStage) { this.jengaStage.dispose(); this.jengaStage = null; }
    if (this.cannonStage) { this.cannonStage.dispose(); this.cannonStage = null; }
    if (this.golfStage) { this.golfStage.dispose(); this.golfStage = null; }
    if (this.rtoStage) { this.rtoStage.dispose(); this.rtoStage = null; }
    if (this.stageGroup) {
      this.scene.remove(this.stageGroup);
      for (const r of this.stageRacers) r.visual.dispose();
      this.stageGroup = null;
      this.stageRacers = [];
      this.stageNames = [];
    }
    this.stageMode = 'tumba-street';
    if (!this.tumbaStage) {
      this.tumbaStage = new TumbaStage(window.innerWidth / window.innerHeight, names);
    }
    this.tumbaStage.setLineup(names);
  }

  /** Stages the checked-in teammates hoisted onto bamboo/bagol stilts on the twilight fiesta boulevard. */
  showKarangBoulevard(names, { duration = 15, stilts = 'bamboo' } = {}) {
    if (this.wrestleStage) { this.wrestleStage.dispose(); this.wrestleStage = null; }
    if (this.deathmatchStage) { this.deathmatchStage.dispose(); this.deathmatchStage = null; }
    if (this.clawStage) { this.clawStage.dispose(); this.clawStage = null; }
    if (this.plinkoStage) { this.plinkoStage.dispose(); this.plinkoStage = null; }
    if (this.freezeStage) { this.freezeStage.dispose(); this.freezeStage = null; }
    if (this.launchpadStage) { this.launchpadStage.dispose(); this.launchpadStage = null; }
    if (this.jengaStage) { this.jengaStage.dispose(); this.jengaStage = null; }
    if (this.cannonStage) { this.cannonStage.dispose(); this.cannonStage = null; }
    if (this.golfStage) { this.golfStage.dispose(); this.golfStage = null; }
    if (this.rtoStage) { this.rtoStage.dispose(); this.rtoStage = null; }
    if (this.tumbaStage) { this.tumbaStage.dispose(); this.tumbaStage = null; }
    if (this.stageGroup) {
      this.scene.remove(this.stageGroup);
      for (const r of this.stageRacers) r.visual.dispose();
      this.stageGroup = null;
      this.stageRacers = [];
      this.stageNames = [];
    }
    this.stageMode = 'karang-boulevard';
    if (!this.karangStage) {
      this.karangStage = new KarangStage(window.innerWidth / window.innerHeight, names, { duration, stilts });
    }
    this.karangStage.setLineup(names, { stilts });
  }

  /** Stages the checked-in teammates on the glowing twilight Tubig-Tubig water court. */
  showTubigCourt(names, { duration = 15, rule = 'champion' } = {}) {
    if (this.wrestleStage) { this.wrestleStage.dispose(); this.wrestleStage = null; }
    if (this.deathmatchStage) { this.deathmatchStage.dispose(); this.deathmatchStage = null; }
    if (this.clawStage) { this.clawStage.dispose(); this.clawStage = null; }
    if (this.plinkoStage) { this.plinkoStage.dispose(); this.plinkoStage = null; }
    if (this.freezeStage) { this.freezeStage.dispose(); this.freezeStage = null; }
    if (this.launchpadStage) { this.launchpadStage.dispose(); this.launchpadStage = null; }
    if (this.jengaStage) { this.jengaStage.dispose(); this.jengaStage = null; }
    if (this.cannonStage) { this.cannonStage.dispose(); this.cannonStage = null; }
    if (this.golfStage) { this.golfStage.dispose(); this.golfStage = null; }
    if (this.rtoStage) { this.rtoStage.dispose(); this.rtoStage = null; }
    if (this.tumbaStage) { this.tumbaStage.dispose(); this.tumbaStage = null; }
    if (this.karangStage) { this.karangStage.dispose(); this.karangStage = null; }
    if (this.stageGroup) {
      this.scene.remove(this.stageGroup);
      for (const r of this.stageRacers) r.visual.dispose();
      this.stageGroup = null;
      this.stageRacers = [];
      this.stageNames = [];
    }
    this.stageMode = 'tubig-court';
    if (!this.tubigStage) {
      this.tubigStage = new TubigStage(window.innerWidth / window.innerHeight, names, { duration, rule });
    }
    this.tubigStage.setLineup(names);
  }

  /** Stages the checked-in teammates on the scarred mahogany Rum-Shop Domino tabletop. */
  showDominoTable(names) {
    if (this.wrestleStage) { this.wrestleStage.dispose(); this.wrestleStage = null; }
    if (this.deathmatchStage) { this.deathmatchStage.dispose(); this.deathmatchStage = null; }
    if (this.clawStage) { this.clawStage.dispose(); this.clawStage = null; }
    if (this.plinkoStage) { this.plinkoStage.dispose(); this.plinkoStage = null; }
    if (this.freezeStage) { this.freezeStage.dispose(); this.freezeStage = null; }
    if (this.launchpadStage) { this.launchpadStage.dispose(); this.launchpadStage = null; }
    if (this.jengaStage) { this.jengaStage.dispose(); this.jengaStage = null; }
    if (this.cannonStage) { this.cannonStage.dispose(); this.cannonStage = null; }
    if (this.golfStage) { this.golfStage.dispose(); this.golfStage = null; }
    if (this.rtoStage) { this.rtoStage.dispose(); this.rtoStage = null; }
    if (this.tumbaStage) { this.tumbaStage.dispose(); this.tumbaStage = null; }
    if (this.karangStage) { this.karangStage.dispose(); this.karangStage = null; }
    if (this.tubigStage) { this.tubigStage.dispose(); this.tubigStage = null; }
    if (this.stageGroup) {
      this.scene.remove(this.stageGroup);
      for (const r of this.stageRacers) r.visual.dispose();
      this.stageGroup = null;
      this.stageRacers = [];
      this.stageNames = [];
    }
    this.stageMode = 'domino-table';
    if (!this.dominoStage) {
      this.dominoStage = new DominoStage(window.innerWidth / window.innerHeight, names);
    }
    this.dominoStage.setLineup(names);
  }

  /** Stages the checked-in teammates around the Mashramani greasy pole mud pit. */
  showGreasyPole(names, { duration = 15 } = {}) {
    if (this.wrestleStage) { this.wrestleStage.dispose(); this.wrestleStage = null; }
    if (this.deathmatchStage) { this.deathmatchStage.dispose(); this.deathmatchStage = null; }
    if (this.clawStage) { this.clawStage.dispose(); this.clawStage = null; }
    if (this.plinkoStage) { this.plinkoStage.dispose(); this.plinkoStage = null; }
    if (this.freezeStage) { this.freezeStage.dispose(); this.freezeStage = null; }
    if (this.launchpadStage) { this.launchpadStage.dispose(); this.launchpadStage = null; }
    if (this.jengaStage) { this.jengaStage.dispose(); this.jengaStage = null; }
    if (this.cannonStage) { this.cannonStage.dispose(); this.cannonStage = null; }
    if (this.golfStage) { this.golfStage.dispose(); this.golfStage = null; }
    if (this.rtoStage) { this.rtoStage.dispose(); this.rtoStage = null; }
    if (this.tumbaStage) { this.tumbaStage.dispose(); this.tumbaStage = null; }
    if (this.karangStage) { this.karangStage.dispose(); this.karangStage = null; }
    if (this.tubigStage) { this.tubigStage.dispose(); this.tubigStage = null; }
    if (this.dominoStage) { this.dominoStage.dispose(); this.dominoStage = null; }
    if (this.stageGroup) {
      this.scene.remove(this.stageGroup);
      for (const r of this.stageRacers) r.visual.dispose();
      this.stageGroup = null;
      this.stageRacers = [];
      this.stageNames = [];
    }
    this.stageMode = 'greasy-pole';
    if (!this.poleStage) {
      this.poleStage = new PoleStage(window.innerWidth / window.innerHeight, names, { duration });
    }
    this.poleStage.setLineup(names);
  }

  /** Stages the checked-in teammates as glass marbles inside the schoolyard chalk ring. */
  showTawRing(names, { duration = 15 } = {}) {
    if (this.wrestleStage) { this.wrestleStage.dispose(); this.wrestleStage = null; }
    if (this.deathmatchStage) { this.deathmatchStage.dispose(); this.deathmatchStage = null; }
    if (this.clawStage) { this.clawStage.dispose(); this.clawStage = null; }
    if (this.plinkoStage) { this.plinkoStage.dispose(); this.plinkoStage = null; }
    if (this.freezeStage) { this.freezeStage.dispose(); this.freezeStage = null; }
    if (this.launchpadStage) { this.launchpadStage.dispose(); this.launchpadStage = null; }
    if (this.jengaStage) { this.jengaStage.dispose(); this.jengaStage = null; }
    if (this.cannonStage) { this.cannonStage.dispose(); this.cannonStage = null; }
    if (this.golfStage) { this.golfStage.dispose(); this.golfStage = null; }
    if (this.rtoStage) { this.rtoStage.dispose(); this.rtoStage = null; }
    if (this.tumbaStage) { this.tumbaStage.dispose(); this.tumbaStage = null; }
    if (this.karangStage) { this.karangStage.dispose(); this.karangStage = null; }
    if (this.tubigStage) { this.tubigStage.dispose(); this.tubigStage = null; }
    if (this.dominoStage) { this.dominoStage.dispose(); this.dominoStage = null; }
    if (this.poleStage) { this.poleStage.dispose(); this.poleStage = null; }
    if (this.stageGroup) {
      this.scene.remove(this.stageGroup);
      for (const r of this.stageRacers) r.visual.dispose();
      this.stageGroup = null;
      this.stageRacers = [];
      this.stageNames = [];
    }
    this.stageMode = 'taw-ring';
    if (!this.tawStage) {
      this.tawStage = new TawStage(window.innerWidth / window.innerHeight, names, { duration });
    }
    this.tawStage.setLineup(names);
  }

  /** Stages the checked-in teammates as folded origami ddakji tiles in the twilight Seoul courtyard. */
  showDdakjiCourt(names, { duration = 15 } = {}) {
    if (this.wrestleStage) { this.wrestleStage.dispose(); this.wrestleStage = null; }
    if (this.deathmatchStage) { this.deathmatchStage.dispose(); this.deathmatchStage = null; }
    if (this.clawStage) { this.clawStage.dispose(); this.clawStage = null; }
    if (this.plinkoStage) { this.plinkoStage.dispose(); this.plinkoStage = null; }
    if (this.freezeStage) { this.freezeStage.dispose(); this.freezeStage = null; }
    if (this.launchpadStage) { this.launchpadStage.dispose(); this.launchpadStage = null; }
    if (this.jengaStage) { this.jengaStage.dispose(); this.jengaStage = null; }
    if (this.cannonStage) { this.cannonStage.dispose(); this.cannonStage = null; }
    if (this.golfStage) { this.golfStage.dispose(); this.golfStage = null; }
    if (this.rtoStage) { this.rtoStage.dispose(); this.rtoStage = null; }
    if (this.tumbaStage) { this.tumbaStage.dispose(); this.tumbaStage = null; }
    if (this.karangStage) { this.karangStage.dispose(); this.karangStage = null; }
    if (this.tubigStage) { this.tubigStage.dispose(); this.tubigStage = null; }
    if (this.dominoStage) { this.dominoStage.dispose(); this.dominoStage = null; }
    if (this.poleStage) { this.poleStage.dispose(); this.poleStage = null; }
    if (this.tawStage) { this.tawStage.dispose(); this.tawStage = null; }
    if (this.stageGroup) {
      this.scene.remove(this.stageGroup);
      for (const r of this.stageRacers) r.visual.dispose();
      this.stageGroup = null;
      this.stageRacers = [];
      this.stageNames = [];
    }
    this.stageMode = 'ddakji-court';
    if (!this.ddakjiStage) {
      this.ddakjiStage = new DdakjiStage(window.innerWidth / window.innerHeight, names, { duration });
    }
    this.ddakjiStage.setLineup(names);
  }

  /** Stages the checked-in teammates in silver jumpsuits on the Nōkabe dunk-tank dock. */
  showNokabeStudio(names, { duration = 15 } = {}) {
    if (this.wrestleStage) { this.wrestleStage.dispose(); this.wrestleStage = null; }
    if (this.deathmatchStage) { this.deathmatchStage.dispose(); this.deathmatchStage = null; }
    if (this.clawStage) { this.clawStage.dispose(); this.clawStage = null; }
    if (this.plinkoStage) { this.plinkoStage.dispose(); this.plinkoStage = null; }
    if (this.freezeStage) { this.freezeStage.dispose(); this.freezeStage = null; }
    if (this.launchpadStage) { this.launchpadStage.dispose(); this.launchpadStage = null; }
    if (this.jengaStage) { this.jengaStage.dispose(); this.jengaStage = null; }
    if (this.cannonStage) { this.cannonStage.dispose(); this.cannonStage = null; }
    if (this.golfStage) { this.golfStage.dispose(); this.golfStage = null; }
    if (this.rtoStage) { this.rtoStage.dispose(); this.rtoStage = null; }
    if (this.tumbaStage) { this.tumbaStage.dispose(); this.tumbaStage = null; }
    if (this.karangStage) { this.karangStage.dispose(); this.karangStage = null; }
    if (this.tubigStage) { this.tubigStage.dispose(); this.tubigStage = null; }
    if (this.dominoStage) { this.dominoStage.dispose(); this.dominoStage = null; }
    if (this.poleStage) { this.poleStage.dispose(); this.poleStage = null; }
    if (this.tawStage) { this.tawStage.dispose(); this.tawStage = null; }
    if (this.ddakjiStage) { this.ddakjiStage.dispose(); this.ddakjiStage = null; }
    if (this.stageGroup) {
      this.scene.remove(this.stageGroup);
      for (const r of this.stageRacers) r.visual.dispose();
      this.stageGroup = null;
      this.stageRacers = [];
      this.stageNames = [];
    }
    this.stageMode = 'nokabe-studio';
    if (!this.nokabeStage) {
      this.nokabeStage = new NokabeStage(window.innerWidth / window.innerHeight, names, { duration });
    }
    this.nokabeStage.setLineup(names);
  }

  /** Stages the checked-in teammates on the emerald baize Mahjong parlor table. */
  showMahjongTable(names, { duration = 15 } = {}) {
    if (this.wrestleStage) { this.wrestleStage.dispose(); this.wrestleStage = null; }
    if (this.deathmatchStage) { this.deathmatchStage.dispose(); this.deathmatchStage = null; }
    if (this.clawStage) { this.clawStage.dispose(); this.clawStage = null; }
    if (this.plinkoStage) { this.plinkoStage.dispose(); this.plinkoStage = null; }
    if (this.freezeStage) { this.freezeStage.dispose(); this.freezeStage = null; }
    if (this.launchpadStage) { this.launchpadStage.dispose(); this.launchpadStage = null; }
    if (this.jengaStage) { this.jengaStage.dispose(); this.jengaStage = null; }
    if (this.cannonStage) { this.cannonStage.dispose(); this.cannonStage = null; }
    if (this.golfStage) { this.golfStage.dispose(); this.golfStage = null; }
    if (this.rtoStage) { this.rtoStage.dispose(); this.rtoStage = null; }
    if (this.tumbaStage) { this.tumbaStage.dispose(); this.tumbaStage = null; }
    if (this.karangStage) { this.karangStage.dispose(); this.karangStage = null; }
    if (this.tubigStage) { this.tubigStage.dispose(); this.tubigStage = null; }
    if (this.dominoStage) { this.dominoStage.dispose(); this.dominoStage = null; }
    if (this.poleStage) { this.poleStage.dispose(); this.poleStage = null; }
    if (this.tawStage) { this.tawStage.dispose(); this.tawStage = null; }
    if (this.ddakjiStage) { this.ddakjiStage.dispose(); this.ddakjiStage = null; }
    if (this.nokabeStage) { this.nokabeStage.dispose(); this.nokabeStage = null; }
    if (this.stageGroup) {
      this.scene.remove(this.stageGroup);
      for (const r of this.stageRacers) r.visual.dispose();
      this.stageGroup = null;
      this.stageRacers = [];
      this.stageNames = [];
    }
    this.stageMode = 'mahjong-table';
    if (!this.mahjongStage) {
      this.mahjongStage = new MahjongStage(window.innerWidth / window.innerHeight, names, { duration });
    }
    this.mahjongStage.setLineup(names);
  }

  /** Stages the checked-in teammates in the Kho-Kho Swivel-Chair Boardroom aisles. */
  showKhokhoBoardroom(names, { duration = 15 } = {}) {
    if (this.wrestleStage) { this.wrestleStage.dispose(); this.wrestleStage = null; }
    if (this.deathmatchStage) { this.deathmatchStage.dispose(); this.deathmatchStage = null; }
    if (this.clawStage) { this.clawStage.dispose(); this.clawStage = null; }
    if (this.plinkoStage) { this.plinkoStage.dispose(); this.plinkoStage = null; }
    if (this.freezeStage) { this.freezeStage.dispose(); this.freezeStage = null; }
    if (this.launchpadStage) { this.launchpadStage.dispose(); this.launchpadStage = null; }
    if (this.jengaStage) { this.jengaStage.dispose(); this.jengaStage = null; }
    if (this.cannonStage) { this.cannonStage.dispose(); this.cannonStage = null; }
    if (this.golfStage) { this.golfStage.dispose(); this.golfStage = null; }
    if (this.rtoStage) { this.rtoStage.dispose(); this.rtoStage = null; }
    if (this.tumbaStage) { this.tumbaStage.dispose(); this.tumbaStage = null; }
    if (this.karangStage) { this.karangStage.dispose(); this.karangStage = null; }
    if (this.tubigStage) { this.tubigStage.dispose(); this.tubigStage = null; }
    if (this.dominoStage) { this.dominoStage.dispose(); this.dominoStage = null; }
    if (this.poleStage) { this.poleStage.dispose(); this.poleStage = null; }
    if (this.tawStage) { this.tawStage.dispose(); this.tawStage = null; }
    if (this.ddakjiStage) { this.ddakjiStage.dispose(); this.ddakjiStage = null; }
    if (this.nokabeStage) { this.nokabeStage.dispose(); this.nokabeStage = null; }
    if (this.mahjongStage) { this.mahjongStage.dispose(); this.mahjongStage = null; }
    if (this.stageGroup) {
      this.scene.remove(this.stageGroup);
      for (const r of this.stageRacers) r.visual.dispose();
      this.stageGroup = null;
      this.stageRacers = [];
      this.stageNames = [];
    }
    this.stageMode = 'khokho-boardroom';
    if (!this.khokhoStage) {
      this.khokhoStage = new KhokhoStage(window.innerWidth / window.innerHeight, names, { duration });
    }
    this.khokhoStage.setLineup(names);
  }

  /** Stages the checked-in teammates on the embroidered Chaupar Cowrie-Clash boardroom table. */
  showChauparBoardroom(names, { duration = 15 } = {}) {
    if (this.wrestleStage) { this.wrestleStage.dispose(); this.wrestleStage = null; }
    if (this.deathmatchStage) { this.deathmatchStage.dispose(); this.deathmatchStage = null; }
    if (this.clawStage) { this.clawStage.dispose(); this.clawStage = null; }
    if (this.plinkoStage) { this.plinkoStage.dispose(); this.plinkoStage = null; }
    if (this.freezeStage) { this.freezeStage.dispose(); this.freezeStage = null; }
    if (this.launchpadStage) { this.launchpadStage.dispose(); this.launchpadStage = null; }
    if (this.jengaStage) { this.jengaStage.dispose(); this.jengaStage = null; }
    if (this.cannonStage) { this.cannonStage.dispose(); this.cannonStage = null; }
    if (this.golfStage) { this.golfStage.dispose(); this.golfStage = null; }
    if (this.rtoStage) { this.rtoStage.dispose(); this.rtoStage = null; }
    if (this.tumbaStage) { this.tumbaStage.dispose(); this.tumbaStage = null; }
    if (this.karangStage) { this.karangStage.dispose(); this.karangStage = null; }
    if (this.tubigStage) { this.tubigStage.dispose(); this.tubigStage = null; }
    if (this.dominoStage) { this.dominoStage.dispose(); this.dominoStage = null; }
    if (this.poleStage) { this.poleStage.dispose(); this.poleStage = null; }
    if (this.tawStage) { this.tawStage.dispose(); this.tawStage = null; }
    if (this.ddakjiStage) { this.ddakjiStage.dispose(); this.ddakjiStage = null; }
    if (this.nokabeStage) { this.nokabeStage.dispose(); this.nokabeStage = null; }
    if (this.mahjongStage) { this.mahjongStage.dispose(); this.mahjongStage = null; }
    if (this.khokhoStage) { this.khokhoStage.dispose(); this.khokhoStage = null; }
    if (this.stageGroup) {
      this.scene.remove(this.stageGroup);
      for (const r of this.stageRacers) r.visual.dispose();
      this.stageGroup = null;
      this.stageRacers = [];
      this.stageNames = [];
    }
    this.stageMode = 'chaupar-boardroom';
    if (!this.chauparStage) {
      this.chauparStage = new ChauparStage(window.innerWidth / window.innerHeight, names, { duration });
    }
    this.chauparStage.setLineup(names);
  }

  /** Stages the checked-in teammates on the Glass Bridge Deploy staging gantry. */
  showGlassBridge(names, { duration = 15 } = {}) {
    if (this.wrestleStage) { this.wrestleStage.dispose(); this.wrestleStage = null; }
    if (this.deathmatchStage) { this.deathmatchStage.dispose(); this.deathmatchStage = null; }
    if (this.clawStage) { this.clawStage.dispose(); this.clawStage = null; }
    if (this.plinkoStage) { this.plinkoStage.dispose(); this.plinkoStage = null; }
    if (this.freezeStage) { this.freezeStage.dispose(); this.freezeStage = null; }
    if (this.launchpadStage) { this.launchpadStage.dispose(); this.launchpadStage = null; }
    if (this.jengaStage) { this.jengaStage.dispose(); this.jengaStage = null; }
    if (this.cannonStage) { this.cannonStage.dispose(); this.cannonStage = null; }
    if (this.golfStage) { this.golfStage.dispose(); this.golfStage = null; }
    if (this.rtoStage) { this.rtoStage.dispose(); this.rtoStage = null; }
    if (this.tumbaStage) { this.tumbaStage.dispose(); this.tumbaStage = null; }
    if (this.karangStage) { this.karangStage.dispose(); this.karangStage = null; }
    if (this.tubigStage) { this.tubigStage.dispose(); this.tubigStage = null; }
    if (this.dominoStage) { this.dominoStage.dispose(); this.dominoStage = null; }
    if (this.poleStage) { this.poleStage.dispose(); this.poleStage = null; }
    if (this.tawStage) { this.tawStage.dispose(); this.tawStage = null; }
    if (this.ddakjiStage) { this.ddakjiStage.dispose(); this.ddakjiStage = null; }
    if (this.nokabeStage) { this.nokabeStage.dispose(); this.nokabeStage = null; }
    if (this.mahjongStage) { this.mahjongStage.dispose(); this.mahjongStage = null; }
    if (this.khokhoStage) { this.khokhoStage.dispose(); this.khokhoStage = null; }
    if (this.chauparStage) { this.chauparStage.dispose(); this.chauparStage = null; }
    if (this.stageGroup) {
      this.scene.remove(this.stageGroup);
      for (const r of this.stageRacers) r.visual.dispose();
      this.stageGroup = null;
      this.stageRacers = [];
      this.stageNames = [];
    }
    this.stageMode = 'glass-bridge';
    if (!this.glassStage) {
      this.glassStage = new GlassStage(window.innerWidth / window.innerHeight, names, { duration });
    }
    this.glassStage.setLineup(names);
  }

  /** Current live lobby stage summary (used by browser tests under ?test). */
  stageState() {
    if (this.stageMode === 'wrestle-ring' && this.wrestleStage) {
      return {
        mode: 'wrestle-ring',
        count: this.wrestleStage.wrestlers.length,
        modelStyle: this.wrestleStage.modelStyle,
        requestedStyle: this.wrestleStage.requestedStyle,
      };
    }
    if (this.stageMode === 'deathmatch-arena' && this.deathmatchStage) {
      return {
        mode: 'deathmatch-arena',
        count: this.deathmatchStage.models.length,
      };
    }
    if (this.stageMode === 'claw-cabinet' && this.clawStage) {
      return {
        mode: 'claw-cabinet',
        count: this.clawStage.bodies.length,
      };
    }
    if (this.stageMode === 'plinko-board' && this.plinkoStage) {
      return {
        mode: 'plinko-board',
        count: this.plinkoStage.marbles.length,
      };
    }
    if (this.stageMode === 'freeze-runway' && this.freezeStage) {
      return {
        mode: 'freeze-runway',
        count: this.freezeStage.models.length,
      };
    }
    if (this.stageMode === 'launchpad-complex' && this.launchpadStage) {
      return {
        mode: 'launchpad-complex',
        count: this.launchpadStage.models.length,
      };
    }
    if (this.stageMode === 'jenga-tower' && this.jengaStage) {
      return {
        mode: 'jenga-tower',
        count: this.jengaStage.models.length,
      };
    }
    if (this.stageMode === 'cannon-pier' && this.cannonStage) {
      return {
        mode: 'cannon-pier',
        count: this.cannonStage.models.length,
      };
    }
    if (this.stageMode === 'golf-course' && this.golfStage) {
      return {
        mode: 'golf-course',
        count: this.golfStage.models.length,
      };
    }
    if (this.stageMode === 'rto-course' && this.rtoStage) {
      return {
        mode: 'rto-course',
        count: this.rtoStage.models.length,
      };
    }
    if (this.stageMode === 'tumba-street' && this.tumbaStage) {
      return {
        mode: 'tumba-street',
        count: this.tumbaStage.models.length,
      };
    }
    if (this.stageMode === 'karang-boulevard' && this.karangStage) {
      return {
        mode: 'karang-boulevard',
        count: this.karangStage.models.length,
      };
    }
    if (this.stageMode === 'tubig-court' && this.tubigStage) {
      return {
        mode: 'tubig-court',
        count: this.tubigStage.models.length,
      };
    }
    if (this.stageMode === 'domino-table' && this.dominoStage) {
      return {
        mode: 'domino-table',
        count: this.dominoStage.models.length,
      };
    }
    if (this.stageMode === 'greasy-pole' && this.poleStage) {
      return {
        mode: 'greasy-pole',
        count: this.poleStage.models.length,
      };
    }
    if (this.stageMode === 'taw-ring' && this.tawStage) {
      return {
        mode: 'taw-ring',
        count: this.tawStage.models.length,
      };
    }
    if (this.stageMode === 'ddakji-court' && this.ddakjiStage) {
      return {
        mode: 'ddakji-court',
        count: this.ddakjiStage.models.length,
      };
    }
    if (this.stageMode === 'nokabe-studio' && this.nokabeStage) {
      return {
        mode: 'nokabe-studio',
        count: this.nokabeStage.models.length,
      };
    }
    if (this.stageMode === 'mahjong-table' && this.mahjongStage) {
      return {
        mode: 'mahjong-table',
        count: this.mahjongStage.models.length,
      };
    }
    if (this.stageMode === 'khokho-boardroom' && this.khokhoStage) {
      return {
        mode: 'khokho-boardroom',
        count: this.khokhoStage.models.length,
      };
    }
    if (this.stageMode === 'chaupar-boardroom' && this.chauparStage) {
      return {
        mode: 'chaupar-boardroom',
        count: this.chauparStage.models.length,
      };
    }
    if (this.stageMode === 'glass-bridge' && this.glassStage) {
      return {
        mode: 'glass-bridge',
        count: this.glassStage.models.length,
      };
    }
    if (this.stageMode === 'race-grid') {
      return { mode: 'race-grid', count: this.stageRacers.length };
    }
    return { mode: 'flyover', count: 0 };
  }

  /** Starts Glass Bridge Deploy over the high-altitude data-center chasm. */
  startGlass(names, options = {}) {
    this.clearStage();
    this.clearRace();
    this.showcase.group.visible = false;
    this.glass = new GlassMatch(names, { ...options, sfx: this.sfx });
    this.glass.resize(window.innerWidth / window.innerHeight);
    this.phase = 'glass';
    return this.glass.sim;
  }

  /** Starts Chaupar Cowrie-Clash on the embroidered boardroom teak table. */
  startChaupar(names, options = {}) {
    this.clearStage();
    this.clearRace();
    this.showcase.group.visible = false;
    this.chaupar = new ChauparMatch(names, { ...options, sfx: this.sfx });
    this.chaupar.resize(window.innerWidth / window.innerHeight);
    this.phase = 'chaupar';
    return this.chaupar.sim;
  }

  /** Starts Kho-Kho Relay Blitz in the swivel-chair executive boardroom. */
  startKhokho(names, options = {}) {
    this.clearStage();
    this.clearRace();
    this.showcase.group.visible = false;
    this.khokho = new KhokhoMatch(names, { ...options, sfx: this.sfx });
    this.khokho.resize(window.innerWidth / window.innerHeight);
    this.phase = 'khokho';
    return this.khokho.sim;
  }

  /** Starts Mahjong Tile Wash on the automatic tea-house parlor table. */
  startMahjong(names, options = {}) {
    this.clearStage();
    this.clearRace();
    this.showcase.group.visible = false;
    this.mahjong = new MahjongMatch(names, { ...options, sfx: this.sfx });
    this.mahjong.resize(window.innerWidth / window.innerHeight);
    this.phase = 'mahjong';
    return this.mahjong.sim;
  }

  /** Starts Nōkabe Wall Crunch on the Tokyo TV dunk-tank soundstage. */
  startNokabe(names, options = {}) {
    this.clearStage();
    this.clearRace();
    this.showcase.group.visible = false;
    this.nokabe = new NokabeMatch(names, { ...options, sfx: this.sfx });
    this.nokabe.resize(window.innerWidth / window.innerHeight);
    this.phase = 'nokabe';
    return this.nokabe.sim;
  }

  /** Starts Ddakji Flip-Out in the twilight Seoul courtyard. */
  startDdakji(names, options = {}) {
    this.clearStage();
    this.clearRace();
    this.showcase.group.visible = false;
    this.ddakji = new DdakjiMatch(names, { ...options, sfx: this.sfx });
    this.ddakji.resize(window.innerWidth / window.innerHeight);
    this.phase = 'ddakji';
    return this.ddakji.sim;
  }

  /** Starts Schoolyard Taw Knockout inside the shrinking chalk ring. */
  startTaw(names, options = {}) {
    this.clearStage();
    this.clearRace();
    this.showcase.group.visible = false;
    this.taw = new TawMatch(names, { ...options, sfx: this.sfx });
    this.taw.resize(window.innerWidth / window.innerHeight);
    this.phase = 'taw';
    return this.taw.sim;
  }

  /** Starts Greasy Pole Scramble in the twilight Mashramani carnival square. */
  startPole(names, options = {}) {
    this.clearStage();
    this.clearRace();
    this.showcase.group.visible = false;
    this.pole = new PoleMatch(names, { ...options, sfx: this.sfx });
    this.pole.resize(window.innerWidth / window.innerHeight);
    this.phase = 'pole';
    return this.pole.sim;
  }

  /** Starts Rum-Shop Domino Slam on the scarred mahogany tabletop. */
  startDomino(names, options = {}) {
    this.clearStage();
    this.clearRace();
    this.showcase.group.visible = false;
    this.domino = new DominoMatch(names, { ...options, sfx: this.sfx });
    this.domino.resize(window.innerWidth / window.innerHeight);
    this.phase = 'domino';
    return this.domino.sim;
  }

  /** Starts Tubig-Tubig Gauntlet on the twilight water-grid street court. */
  startTubig(names, options = {}) {
    this.clearStage();
    this.clearRace();
    this.showcase.group.visible = false;
    this.tubig = new TubigMatch(names, { ...options, sfx: this.sfx });
    this.tubig.resize(window.innerWidth / window.innerHeight);
    this.phase = 'tubig';
    return this.tubig.plan;
  }

  /** Starts Karang Derby on the twilight Cebu-meets-Chesapeake fiesta boulevard. */
  startKarang(names, options = {}) {
    this.clearStage();
    this.clearRace();
    this.showcase.group.visible = false;
    this.karang = new KarangMatch(names, { ...options, sfx: this.sfx });
    this.karang.resize(window.innerWidth / window.innerHeight);
    this.phase = 'karang';
    return this.karang.plan;
  }

  /** Starts Tumba Lata on the twilight fiesta street. */
  startTumba(names, options = {}) {
    this.clearStage();
    this.clearRace();
    this.showcase.group.visible = false;
    this.tumba = new TumbaMatch(names, { ...options, sfx: this.sfx });
    this.tumba.resize(window.innerWidth / window.innerHeight);
    this.phase = 'tumba';
    return this.tumba.plan;
  }

  /** Starts RTO Mini-Golf on the indoor office cubicle putt-putt floor. */
  startRto(names, options = {}) {
    this.clearStage();
    this.clearRace();
    this.showcase.group.visible = false;
    this.rto = new RtoMatch(names, { ...options, sfx: this.sfx });
    this.rto.resize(window.innerWidth / window.innerHeight);
    this.phase = 'rto';
    return this.rto.sim;
  }

  /** Starts Standup Mini-Golf on the floating Chesapeake Bay putt-putt course. */
  startGolf(names, options = {}) {
    this.clearStage();
    this.clearRace();
    this.showcase.group.visible = false;
    this.golf = new GolfMatch(names, { ...options, sfx: this.sfx });
    this.golf.resize(window.innerWidth / window.innerHeight);
    this.phase = 'golf';
    return this.golf.sim;
  }

  /** Starts Deploy Cannon human cannonball volley over the Chesapeake Bay. */
  startCannon(names, options = {}) {
    this.clearStage();
    this.clearRace();
    this.showcase.group.visible = false;
    this.cannon = new CannonMatch(names, { ...options, sfx: this.sfx });
    this.cannon.resize(window.innerWidth / window.innerHeight);
    this.phase = 'cannon';
    return this.cannon.plan;
  }

  /** Starts Dependency Jenga above the glowing PROD DOWN pit. */
  startJenga(names, options = {}) {
    this.clearStage();
    this.clearRace();
    this.showcase.group.visible = false;
    this.jenga = new JengaMatch(names, { ...options, sfx: this.sfx });
    this.jenga.resize(window.innerWidth / window.innerHeight);
    this.phase = 'jenga';
    return this.jenga.plan;
  }

  /** Starts Launchpad Roulette on the coastal Chesapeake Bay launch complex. */
  startLaunchpad(names, options = {}) {
    this.clearStage();
    this.clearRace();
    this.showcase.group.visible = false;
    this.launchpad = new LaunchpadMatch(names, { ...options, sfx: this.sfx });
    this.launchpad.resize(window.innerWidth / window.innerHeight);
    this.phase = 'launchpad';
    return this.launchpad.plan;
  }

  /** Starts Code Freeze on its own neon CI/CD runway. */
  startFreeze(names, options = {}) {
    this.clearStage();
    this.clearRace();
    this.showcase.group.visible = false;
    this.freeze = new FreezeMatch(names, { ...options, sfx: this.sfx });
    this.freeze.resize(window.innerWidth / window.innerHeight);
    this.phase = 'freeze';
    return this.freeze.sim;
  }

  /** Starts Kanban Plinko in its own 3D vertical pinball cabinet. */
  startPlinko(names, options = {}) {
    this.clearStage();
    this.clearRace();
    this.showcase.group.visible = false;
    this.plinko = new PlinkoMatch(names, { ...options, sfx: this.sfx });
    this.plinko.resize(window.innerWidth / window.innerHeight);
    this.phase = 'plinko';
    return this.plinko.sim;
  }

  /** Starts The Claw of Destiny in its own 3D arcade cabinet. */
  startClaw(names, options = {}) {
    this.clearStage();
    this.clearRace();
    this.showcase.group.visible = false;
    this.claw = new ClawMatch(names, { ...options, sfx: this.sfx });
    this.claw.resize(window.innerWidth / window.innerHeight);
    this.phase = 'claw';
    return this.claw.plan;
  }

  /** Starts Standup Deathmatch in its own QuakeWorld arena + Google Meet overlay. */
  startDeathmatch(names, options = {}) {
    this.clearStage();
    this.clearRace();
    this.showcase.group.visible = false;
    this.deathmatch = new DeathmatchMatch(names, { ...options, sfx: this.sfx });
    this.deathmatch.resize(window.innerWidth, window.innerHeight);
    this.phase = 'deathmatch';
    return this.deathmatch.plan;
  }

  /**
   * Starts Rumble in its own arena. `options`: { rng, modelStyle, onEvent, onWinner }.
   * Returns the line-up: [{ id, name, kind, color }].
   */
  startWrestle(names, options = {}) {
    const initialOrbit = this.wrestleStage?.orbit;
    this.clearStage();
    this.clearRace();
    this.showcase.group.visible = false;
    this.wrestle = new WrestleMatch(names, { ...options, initialOrbit, sfx: this.sfx });
    this.wrestle.resize(window.innerWidth / window.innerHeight);
    this.phase = 'wrestle';
    return this.wrestle.lineup;
  }

  // ------------------------------------------------------------ race set-up

  /** A sample course layout (obstacles and crates, no racers) for the lobby fly-over. */
  buildShowcase() {
    const course = generateCourse();
    const group = new THREE.Group();
    const items = [];
    for (const o of course.obstacles) {
      const visual = buildObstacle(o, this.track);
      group.add(visual.object);
      items.push({ sim: o, visual });
    }
    for (const c of course.crates) {
      const visual = buildCrate(c, this.track);
      group.add(visual.object);
      items.push({ sim: c, visual });
    }
    return { group, items };
  }

  /**
   * Builds a new race for `names` and starts the countdown. `options`: { rng, timeScale, onStart, onWinner }:
   * onStart() fires at GO, onWinner(racer, kind) when the first racer crosses the line.
   * Returns the line-up: [{ id, name, color, kind }].
   */
  startRace(names, { rng = Math.random, timeScale = 1, onStart, onWinner } = {}) {
    // Carry the camera smoothly from the lobby's live starting-grid angle into the countdown (#123 phase 3).
    const handoff = this.camReady && this.stageMode === 'race-grid';
    const prevPos = handoff ? this.camPos.clone() : null;
    const prevLook = handoff ? this.camLook.clone() : null;
    this.clearStage();
    this.clearRace();
    this.raceHooks = { onStart, onWinner };
    this.showcase.group.visible = false;
    this.timeScale = timeScale;
    this.sim = new RaceSim({ names, rng });
    this.raceGroup = new THREE.Group();
    this.scene.add(this.raceGroup);

    // Deal the characters out so every one appears before any repeats.
    let bag = [];
    const hueOffset = rng() * 360;
    const n = this.sim.racers.length;
    this.visuals = this.sim.racers.map((r, i) => {
      if (!bag.length) bag = shuffle(RACER_KINDS.map((_, k) => k), rng);
      const hue = (hueOffset + (i * 360) / n) % 360;
      const color = `#${new THREE.Color().setHSL(hue / 360, 0.85, 0.55).getHexString()}`;
      const visual = buildRacer(bag.pop(), color, r.name);
      this.raceGroup.add(visual.root);
      this.track.place(visual.root, r.s, r.d, 0);
      return visual;
    });

    for (const o of this.sim.obstacles) {
      const visual = buildObstacle(o, this.track);
      this.raceGroup.add(visual.object);
      this.obstacleVisuals.push({ sim: o, visual });
      if (visual.dispose) this.disposables.push(visual);
    }
    for (const c of this.sim.crates) {
      const visual = buildCrate(c, this.track);
      this.raceGroup.add(visual.object);
      this.crateVisuals.push({ sim: c, visual });
    }

    this.phase = 'countdown';
    this.phaseTime = 0;
    this.countShown = null;
    this.accumulator = 0;
    this.slowMo = 0;
    this.winnerAt = 0;
    this.confettiTimer = 0;
    this.doneReported = false;
    if (handoff) {
      this.camPos.copy(prevPos);
      this.camLook.copy(prevLook);
      this.camReady = true;
    } else {
      this.camReady = false;
    }

    return this.sim.racers.map((r, i) => ({ id: r.id, name: r.name, color: this.visuals[i].color, kind: this.visuals[i].kind }));
  }

  /** Removes the current race and returns to the lobby fly-over. */
  clearRace() {
    if (this.wrestle) {
      this.wrestle.dispose();
      this.wrestle = null;
    }
    if (this.deathmatch) {
      this.deathmatch.dispose();
      this.deathmatch = null;
    }
    if (this.claw) {
      this.claw.dispose();
      this.claw = null;
    }
    if (this.plinko) {
      this.plinko.dispose();
      this.plinko = null;
    }
    if (this.freeze) {
      this.freeze.dispose();
      this.freeze = null;
    }
    if (this.launchpad) {
      this.launchpad.dispose();
      this.launchpad = null;
    }
    if (this.jenga) {
      this.jenga.dispose();
      this.jenga = null;
    }
    if (this.cannon) {
      this.cannon.dispose();
      this.cannon = null;
    }
    if (this.golf) {
      this.golf.dispose();
      this.golf = null;
    }
    if (this.rto) {
      this.rto.dispose();
      this.rto = null;
    }
    if (this.tumba) {
      this.tumba.dispose();
      this.tumba = null;
    }
    if (this.karang) {
      this.karang.dispose();
      this.karang = null;
    }
    if (this.tubig) {
      this.tubig.dispose();
      this.tubig = null;
    }
    if (this.domino) {
      this.domino.dispose();
      this.domino = null;
    }
    if (this.pole) {
      this.pole.dispose();
      this.pole = null;
    }
    if (this.taw) {
      this.taw.dispose();
      this.taw = null;
    }
    if (this.ddakji) {
      this.ddakji.dispose();
      this.ddakji = null;
    }
    if (this.nokabe) {
      this.nokabe.dispose();
      this.nokabe = null;
    }
    if (this.mahjong) {
      this.mahjong.dispose();
      this.mahjong = null;
    }
    if (this.khokho) {
      this.khokho.dispose();
      this.khokho = null;
    }
    if (this.chaupar) {
      this.chaupar.dispose();
      this.chaupar = null;
    }
    if (this.glass) {
      this.glass.dispose();
      this.glass = null;
    }
    if (this.raceGroup) {
      this.scene.remove(this.raceGroup);
      for (const v of this.visuals) v.dispose();
      for (const d of this.disposables) d.dispose();
      for (const sprite of this.projectileVisuals.values()) sprite.material.dispose();
    }
    this.raceGroup = null;
    this.sim = null;
    this.visuals = [];
    this.obstacleVisuals = [];
    this.crateVisuals = [];
    this.projectileVisuals.clear();
    this.disposables = [];
    this.particles.clear();
    this.phase = 'lobby';
    this.camReady = false;
    this.showcase.group.visible = true;
    // Back to normal speed: the lobby fly-over and scenery shouldn't run at the last race's speed.
    this.timeScale = 1;
  }

  // ------------------------------------------------------------ main loop

  /** Picks up the lobby 3D stage (and the scenery's clock) from the last page, if there was one. */
  resumeFlyover() {
    const saved = readFlyover(sessionStorageOrNull());
    if (!saved) return;
    this.flyT = saved.flyT;
    this.clock = saved.clock;
    if (Number.isFinite(saved.stageTime)) {
      this.savedStageTime = saved.stageTime;
      if (this.stageMode === 'race-grid') this.stageTime = saved.stageTime;
    }
    if (Number.isFinite(saved.wrestleOrbit)) {
      this.savedWrestleOrbit = saved.wrestleOrbit;
      if (this.wrestleStage) this.wrestleStage.orbit = saved.wrestleOrbit;
    }
    if (Number.isFinite(saved.wrestleT)) {
      this.savedWrestleT = saved.wrestleT;
      if (this.wrestleStage) this.wrestleStage.t = saved.wrestleT;
    }
    this.camReady = false; // place the camera there at once, rather than gliding from the start line
  }

  /** Stops drawing for good (after Exit). */
  isDerbySceneActive() {
    if (
      this.wrestle || this.deathmatch || this.claw || this.plinko || this.freeze ||
      this.launchpad || this.jenga || this.cannon || this.golf || this.rto ||
      this.tumba || this.karang || this.tubig || this.domino || this.pole ||
      this.taw || this.ddakji || this.nokabe || this.mahjong || this.khokho ||
      this.chaupar || this.glass
    ) {
      return false;
    }
    if (this.phase === 'lobby') {
      return this.stageMode === 'flyover' || this.stageMode === 'race-grid';
    }
    return true;
  }

  hitLicenseBillboard(clientX, clientY) {
    const board = this.scenery?.licenseBillboard;
    if (this.paused || !board || !this.isDerbySceneActive()) return false;
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    this._pointer.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this._pointer, this.camera);
    return this.raycaster.intersectObject(board, false).length > 0;
  }

  setPaused(paused) {
    this.paused = Boolean(paused);
    if (!this.paused) this.last = performance.now();
  }

  stop() {
    this.stopped = true;
  }

  frame(now) {
    if (this.stopped) return;
    requestAnimationFrame(this.frame);
    if (this.paused) {
      this.last = now;
      return;
    }
    const real = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    const dt = real * this.timeScale;
    this.clock += dt;

    if (this.wrestle) {
      // The wrestling match has its own scene and pacing (always real time).
      this.wrestle.update(real);
      this.renderer.render(this.wrestle.scene, this.wrestle.camera);
      return;
    }

    if (this.deathmatch) {
      this.deathmatch.update(real);
      this.renderer.render(this.deathmatch.scene, this.deathmatch.camera);
      return;
    }

    if (this.claw) {
      this.claw.update(real);
      this.renderer.render(this.claw.scene, this.claw.camera);
      return;
    }

    if (this.plinko) {
      this.plinko.update(real);
      this.renderer.render(this.plinko.scene, this.plinko.camera);
      return;
    }

    if (this.freeze) {
      this.freeze.update(real);
      this.renderer.render(this.freeze.scene, this.freeze.camera);
      return;
    }

    if (this.launchpad) {
      this.launchpad.update(real);
      this.renderer.render(this.launchpad.scene, this.launchpad.camera);
      return;
    }

    if (this.jenga) {
      this.jenga.update(real);
      this.renderer.render(this.jenga.scene, this.jenga.camera);
      return;
    }

    if (this.cannon) {
      this.cannon.update(real);
      this.renderer.render(this.cannon.scene, this.cannon.camera);
      return;
    }

    if (this.golf) {
      this.golf.update(real);
      this.renderer.render(this.golf.scene, this.golf.camera);
      return;
    }
    if (this.rto) {
      this.rto.update(real);
      this.renderer.render(this.rto.scene, this.rto.camera);
      return;
    }
    if (this.tumba) {
      this.tumba.update(real);
      this.renderer.render(this.tumba.scene, this.tumba.camera);
      return;
    }
    if (this.karang) {
      this.karang.update(real);
      this.renderer.render(this.karang.scene, this.karang.camera);
      return;
    }
    if (this.tubig) {
      this.tubig.update(real);
      this.renderer.render(this.tubig.scene, this.tubig.camera);
      return;
    }
    if (this.domino) {
      this.domino.update(real);
      this.renderer.render(this.domino.scene, this.domino.camera);
      return;
    }
    if (this.pole) {
      this.pole.update(real);
      this.renderer.render(this.pole.scene, this.pole.camera);
      return;
    }
    if (this.taw) {
      this.taw.update(real);
      this.renderer.render(this.taw.scene, this.taw.camera);
      return;
    }
    if (this.ddakji) {
      this.ddakji.update(real);
      this.renderer.render(this.ddakji.scene, this.ddakji.camera);
      return;
    }
    if (this.nokabe) {
      this.nokabe.update(real);
      this.renderer.render(this.nokabe.scene, this.nokabe.camera);
      return;
    }
    if (this.mahjong) {
      this.mahjong.update(real);
      this.renderer.render(this.mahjong.scene, this.mahjong.camera);
      return;
    }
    if (this.khokho) {
      this.khokho.update(real);
      this.renderer.render(this.khokho.scene, this.khokho.camera);
      return;
    }
    if (this.chaupar) {
      this.chaupar.update(real);
      this.renderer.render(this.chaupar.scene, this.chaupar.camera);
      return;
    }
    if (this.glass) {
      this.glass.update(real);
      this.renderer.render(this.glass.scene, this.glass.camera);
      return;
    }

    if (this.phase === 'lobby') {
      const reduced = Boolean(this.reducedMotion?.matches);
      if (this.stageMode === 'wrestle-ring' && this.wrestleStage) {
        this.wrestleStage.update(real, reduced);
        this.renderer.render(this.wrestleStage.scene, this.wrestleStage.camera);
        return;
      }
      if (this.stageMode === 'deathmatch-arena' && this.deathmatchStage) {
        this.deathmatchStage.update(real, reduced);
        this.renderer.render(this.deathmatchStage.scene, this.deathmatchStage.camera);
        return;
      }
      if (this.stageMode === 'claw-cabinet' && this.clawStage) {
        this.clawStage.update(real, reduced);
        this.renderer.render(this.clawStage.scene, this.clawStage.camera);
        return;
      }
      if (this.stageMode === 'plinko-board' && this.plinkoStage) {
        this.plinkoStage.update(real, reduced);
        this.renderer.render(this.plinkoStage.scene, this.plinkoStage.camera);
        return;
      }
      if (this.stageMode === 'freeze-runway' && this.freezeStage) {
        this.freezeStage.update(real, reduced);
        this.renderer.render(this.freezeStage.scene, this.freezeStage.camera);
        return;
      }
      if (this.stageMode === 'launchpad-complex' && this.launchpadStage) {
        this.launchpadStage.update(real, reduced);
        this.renderer.render(this.launchpadStage.scene, this.launchpadStage.camera);
        return;
      }
      if (this.stageMode === 'jenga-tower' && this.jengaStage) {
        this.jengaStage.update(real, reduced);
        this.renderer.render(this.jengaStage.scene, this.jengaStage.camera);
        return;
      }
      if (this.stageMode === 'cannon-pier' && this.cannonStage) {
        this.cannonStage.update(real, reduced);
        this.renderer.render(this.cannonStage.scene, this.cannonStage.camera);
        return;
      }
      if (this.stageMode === 'golf-course' && this.golfStage) {
        this.golfStage.update(real, reduced);
        this.renderer.render(this.golfStage.scene, this.golfStage.camera);
        return;
      }
      if (this.stageMode === 'rto-course' && this.rtoStage) {
        this.rtoStage.update(real, reduced);
        this.renderer.render(this.rtoStage.scene, this.rtoStage.camera);
        return;
      }
      if (this.stageMode === 'tumba-street' && this.tumbaStage) {
        this.tumbaStage.update(real, reduced);
        this.renderer.render(this.tumbaStage.scene, this.tumbaStage.camera);
        return;
      }
      if (this.stageMode === 'karang-boulevard' && this.karangStage) {
        this.karangStage.update(real, reduced);
        this.renderer.render(this.karangStage.scene, this.karangStage.camera);
        return;
      }
      if (this.stageMode === 'tubig-court' && this.tubigStage) {
        this.tubigStage.update(real, reduced);
        this.renderer.render(this.tubigStage.scene, this.tubigStage.camera);
        return;
      }
      if (this.stageMode === 'domino-table' && this.dominoStage) {
        this.dominoStage.update(real, reduced);
        this.renderer.render(this.dominoStage.scene, this.dominoStage.camera);
        return;
      }
      if (this.stageMode === 'greasy-pole' && this.poleStage) {
        this.poleStage.update(real, reduced);
        this.renderer.render(this.poleStage.scene, this.poleStage.camera);
        return;
      }
      if (this.stageMode === 'taw-ring' && this.tawStage) {
        this.tawStage.update(real, reduced);
        this.renderer.render(this.tawStage.scene, this.tawStage.camera);
        return;
      }
      if (this.stageMode === 'ddakji-court' && this.ddakjiStage) {
        this.ddakjiStage.update(real, reduced);
        this.renderer.render(this.ddakjiStage.scene, this.ddakjiStage.camera);
        return;
      }
      if (this.stageMode === 'nokabe-studio' && this.nokabeStage) {
        this.nokabeStage.update(real, reduced);
        this.renderer.render(this.nokabeStage.scene, this.nokabeStage.camera);
        return;
      }
      if (this.stageMode === 'mahjong-table' && this.mahjongStage) {
        this.mahjongStage.update(real, reduced);
        this.renderer.render(this.mahjongStage.scene, this.mahjongStage.camera);
        return;
      }
      if (this.stageMode === 'khokho-boardroom' && this.khokhoStage) {
        this.khokhoStage.update(real, reduced);
        this.renderer.render(this.khokhoStage.scene, this.khokhoStage.camera);
        return;
      }
      if (this.stageMode === 'chaupar-boardroom' && this.chauparStage) {
        this.chauparStage.update(real, reduced);
        this.renderer.render(this.chauparStage.scene, this.chauparStage.camera);
        return;
      }
      if (this.stageMode === 'glass-bridge' && this.glassStage) {
        this.glassStage.update(real, reduced);
        this.renderer.render(this.glassStage.scene, this.glassStage.camera);
        return;
      }
      if (!reduced) this.flyT += real;
      if (this.stageMode === 'race-grid') {
        this.updateRaceGridCamera(real, reduced);
        this.updateStageRacers(real, reduced);
      } else {
        this.updateLobbyCamera(real);
      }
      for (const { sim, visual } of this.showcase.items) visual.update(sim, this.clock);
    } else if (this.phase === 'countdown') {
      this.updateCountdown(real);
    } else {
      this.updateRace(dt, real);
    }

    if (this.sim) this.syncVisuals(dt);
    this.scenery.update(this.clock);
    this.particles.update(dt);

    // Keep the sun (and its shadow box) centred on the action.
    this.scenery.sun.target.position.copy(this.focus);
    this.scenery.sun.position.copy(this.focus).add(this._a.set(45, 80, 35));

    this.renderer.render(this.scene, this.camera);
  }

  updateCountdown(dt) {
    this.phaseTime += dt;
    const t = this.phaseTime - COUNTDOWN_LEAD_IN;
    const count = t < 0 ? null : t < 1 ? '3' : t < 2 ? '2' : t < 3 ? '1' : 'GO';
    if (count !== this.countShown) {
      this.countShown = count;
      if (count) {
        this.hooks.onCountdown?.(count);
        this.sfx.play(count === 'GO' ? 'go' : 'count', 0);
      }
    }

    // Camera sweeps from in front of the grid, round the side, to behind it.
    const total = COUNTDOWN_LEAD_IN + 3;
    const k = Math.min(1, this.phaseTime / total);
    const ease = k * k * (3 - 2 * k);
    const rows = Math.ceil(this.sim.racers.length / 6);
    const centre = -3 - rows * 2.5;
    const radius = 18 + rows * 3.2;
    const angle = Math.PI * ease;
    const pos = this.track.point(centre + Math.cos(angle) * radius, Math.sin(angle) * radius * 0.85, 3.5 + ease * (5 + rows), this._a);
    const look = this.track.point(centre + ease * 12, 0, 1.2, this._b);
    this.setCamera(pos, look, dt, 6, 6);
    this.focus.copy(look);
    this.hooks.onFrame?.(this.sim);

    if (count === 'GO') {
      this.phase = 'racing';
      this.phaseTime = 0;
      this.raceHooks?.onStart?.();
    }
  }

  updateRace(dt, real) {
    const sim = this.sim;
    this.phaseTime += dt;

    // Brief slow motion as the winner crosses the line.
    let scale = 1;
    if (this.slowMo > 0) {
      this.slowMo -= real;
      scale = 0.3;
    }
    this.accumulator += dt * scale;
    // At 20x and the maximum 0.1-second frame, allow all 120 fixed steps.
    let steps = 0;
    while (this.accumulator >= STEP && steps < 121) {
      sim.step(STEP);
      this.accumulator -= STEP;
      steps++;
      for (const event of sim.drainEvents()) this.handleEvent(event);
    }
    if (steps === 121) this.accumulator = 0;

    this.hooks.onFrame?.(sim);

    // The playback clock only starts once the whole field is home (sim.done: the last racer has
    // crossed the line, or the stragglers' grace period after the win has run out).
    if (this.phase === 'finished' && sim.done) this.sinceDoneReal += real;
    if (this.phase === 'finished' && this.sinceDoneReal >= PLAYBACK_DELAY) {
      // Victory playback: fly the whole course at normal speed (the race's speed no longer applies),
      // starting from the start line, like the lobby fly-over.
      this.phase = 'playback';
      this.timeScale = 1;
      this.flyT = 0;
      this.camReady = false;
    }

    if (this.phase === 'finished' || this.phase === 'playback') {
      if (sim.done && !this.doneReported) {
        this.doneReported = true;
        this.hooks.onDone?.(sim);
      }
    }
    if (this.phase === 'playback') {
      this.flyT += real;
      this.updateLobbyCamera(real);
      return;
    }

    if (this.phase === 'finished') {
      this.confettiTimer -= dt;
      const sinceWin = sim.time - this.winnerAt;
      if (this.confettiTimer <= 0 && sinceWin < 9) {
        this.confettiTimer = 0.28;
        const w = sim.winner;
        const origin = this.track.point(w.s + (Math.random() - 0.5) * 10, w.d + (Math.random() - 0.5) * 12, 7 + Math.random() * 3, this._a);
        this.particles.burst(origin, { count: 26, colors: CONFETTI, speed: 6, up: 3, life: 3.2, size: 0.34, gravity: 5, flat: true, spread: 3 });
      }
    }

    this.updateRaceCamera(dt);
  }

  // ------------------------------------------------------------ events

  handleEvent(e) {
    const visual = e.racer ? this.visuals[e.racer.id] : null;
    switch (e.type) {
      case 'pickup':
        this.sfx.play('pickup');
        this.sparkle(e.crate.s, e.crate.d, 1.4, ['#ffe066', '#ffffff', '#c99a5b'], 10);
        break;
      case 'use':
        this.emote(visual, ITEM_INFO[e.item].emoji);
        if (e.item === 'coffee' || e.item === 'breeze') this.sfx.play('boost');
        else if (e.item === 'firewall' || e.item === 'renewedCert' || e.item === 'returnUrl') this.sfx.play('shield');
        else this.sfx.play(e.wasted ? 'boost' : 'throw');
        break;
      case 'hit': {
        this.emote(visual, HIT_EMOTE[e.cause] || '💫');
        this.sfx.play(HIT_SOUND[e.cause] || 'hit');
        if (e.cause === 'forcePush') this.explosion(e.racer.s, e.racer.d);
        else if (e.cause !== 'exception') this.sparkle(e.racer.s, e.racer.d, 1, ['#ffffff', '#ffd43b', visual.color], 12);
        break;
      }
      case 'zone':
        this.emote(visual, HIT_EMOTE[e.obstacle.type]);
        break;
      case 'block':
        this.emote(visual, '🛡️');
        this.sfx.play('block');
        this.sparkle(e.racer.s, e.racer.d, 1.2, ['#66d9e8', '#ffffff'], 18);
        break;
      case 'bulkLoad':
        // BULK LOAD IN PROGRESS: the table starts to expand.
        this.sfx.play('null');
        this.sparkle(e.obstacle.s, e.obstacle.d, 1.5, ['#2f9e44', '#ffffff', '#ffd43b'], 14);
        break;
      case 'truncate':
        this.sfx.play('shield');
        this.sparkle(e.obstacle.s, e.obstacle.d, 1, ['#2f9e44', '#ffffff', '#ced4da'], 26);
        break;
      case 'status':
        // Office politics landed: audit, roulette or theater.
        this.emote(visual, ITEM_INFO[e.effect].emoji);
        this.sfx.play('null');
        this.sparkle(e.racer.s, e.racer.d, 1.2, ['#e599f7', '#ffffff', '#ffd43b'], 16);
        break;
      case 'pass':
        // Drove straight through an obstacle thanks to the matching item.
        this.emote(visual, ITEM_INFO[e.item].emoji);
        this.sfx.play('block');
        this.sparkle(e.racer.s, e.racer.d, 1.2, ['#8ce99a', '#ffffff'], 18);
        break;
      case 'explode':
        this.sfx.play('explode');
        this.explosion(e.s, e.d);
        break;
      case 'lead':
        this.sfx.play('lead', 1);
        break;
      case 'finish':
        if (e.place === 1) {
          this.phase = 'finished';
          this.winnerAt = this.sim.time;
          this.sinceDoneReal = 0;
          this.slowMo = 1.4;
          this.sfx.play('win', 0);
          // Winner's name tag always shows on top, even with the pack crowding round.
          visual.label.material.depthTest = false;
          visual.label.renderOrder = 20;
          this.raceHooks?.onWinner?.(e.racer, this.visuals[e.racer.id].kind);
        }
        break;
    }
    this.hooks.onEvent?.(e);
  }

  emote(visual, glyph) {
    if (!visual) return;
    visual.emote.material.map = emojiTexture(glyph);
    visual.emote.visible = true;
    visual.emoteTime = 1.3;
  }

  sparkle(s, d, y, colors, count) {
    this.particles.burst(this.track.point(s, d, y, this._a), { count, colors, speed: 5, up: 5, life: 0.7, size: 0.22 });
  }

  explosion(s, d) {
    const origin = this.track.point(s, d, 1, this._a);
    this.particles.burst(origin, { count: 46, colors: ['#ff6b6b', '#ffa94d', '#ffe066', '#ffffff'], speed: 13, up: 10, life: 1, size: 0.42 });
    this.particles.burst(origin, { count: 14, colors: ['#343a40', '#495057'], speed: 5, up: 7, life: 1.4, size: 0.7, gravity: 4 });
  }

  // ------------------------------------------------------------ visuals

  syncVisuals(dt) {
    const sim = this.sim;
    const t = this.clock;
    const racing = this.phase !== 'countdown';

    for (const r of sim.racers) {
      const v = this.visuals[r.id];
      this.track.place(v.root, r.s, r.d, 0);
      v.tick(t + r.id * 0.37, dt);

      // Lean into sideways movement.
      const lateral = v.prevD === null || dt <= 0 ? 0 : (r.d - v.prevD) / dt;
      v.prevD = r.d;
      const targetYaw = r.stun ? 0 : -Math.atan2(lateral, Math.max(r.v, 8)) * 1.3;
      v.yaw += (targetYaw - v.yaw) * damp(10, dt);

      const body = v.body;
      body.position.set(0, 0, 0);
      body.rotation.set(0, v.yaw, 0);
      body.scale.setScalar(1);
      v.root.visible = true;
      let label = v.labelTexture;

      if (r.stun) {
        const st = r.stun;
        const p = Math.min(1, st.t / st.dur);
        switch (st.kind) {
          case 'errorPit':
          case 'fall':
            if (p < 0.4) {
              const q = p / 0.4;
              body.position.y = -5 * q * q;
              body.scale.setScalar(1 - q * 0.6);
              body.rotation.x = q * 1.2;
            } else if (p < 0.55) {
              body.scale.setScalar(0.001);
            } else {
              // Respawn: drop back in from above, blinking.
              const q = (p - 0.55) / 0.45;
              body.position.y = 7 * (1 - q) * (1 - q);
              v.root.visible = Math.floor(st.t * 14) % 2 === 0 || q > 0.8;
            }
            break;
          case 'flatten': {
            // Squashed flat by a 200GB Table, then pops back into shape at the end.
            const squash = p < 0.8 ? 0.22 : 0.22 + 0.78 * ((p - 0.8) / 0.2);
            body.scale.set(1 + (1 - squash) * 0.45, squash, 1 + (1 - squash) * 0.45);
            break;
          }
          case 'bounce':
            // Rebound off the table: a hop backwards, nose up.
            body.position.y = Math.sin(Math.min(1, p / 0.45) * Math.PI) * 1.2;
            body.rotation.x = -0.45 * Math.max(0, 1 - p / 0.45);
            break;
          case 'spin':
            body.rotation.y = (1 - (1 - p) * (1 - p)) * Math.PI * 4;
            body.position.y = Math.sin(p * Math.PI) * 0.5;
            break;
          case 'cert':
          case 'conflict':
            body.position.x = Math.sin(st.t * 55) * 0.13 * (1 - p);
            body.rotation.x = 0.3 * (1 - p);
            body.position.z = 0.8 * Math.sin(Math.min(1, p * 4) * Math.PI * 0.5) * (1 - p);
            break;
          case 'loop':
            body.rotation.y = -(st.a0 + p * Math.PI * 4) - Math.PI;
            body.rotation.z = 0.35;
            break;
          case 'null':
            v.root.visible = Math.floor(st.t * 16) % 3 !== 0;
            body.scale.set(1, 0.85 + Math.sin(st.t * 30) * 0.08, 1);
            label = v.nullTexture;
            break;
          case 'blast':
            body.position.y = Math.sin(p * Math.PI) * 5;
            body.rotation.x = p * Math.PI * 4;
            body.rotation.z = Math.sin(p * Math.PI) * 0.6;
            break;
        }
      } else if (r.finished) {
        if (r.place === 1) {
          // Victory hops and a slow twirl.
          const since = sim.time - r.finishTime;
          body.position.y = Math.abs(Math.sin(since * 5)) * 1.1;
          body.rotation.y = since * 2.2;
        }
      } else if (racing) {
        // Engine shake and a little bounce.
        body.position.y = Math.abs(Math.sin(t * 13 + r.id)) * 0.05 * Math.min(1, r.v / 10);
        if (r.boostT > 0) {
          body.rotation.x = 0.09;
          body.scale.set(0.95, 0.97, 1.1);
        }
        if (r.zone?.type === 'slowLoad' || r.theaterT > 0) body.rotation.z = Math.sin(t * 5 + r.id) * 0.06;
        // Steering reversed: the kart fishtails; controls locked: it stays rigidly straight.
        if (r.reverseT > 0) body.rotation.y = v.yaw + Math.sin(t * 9 + r.id) * 0.35;
        if (r.auditT > 0) body.rotation.y = 0;
      } else {
        // Revving on the grid.
        body.position.y = Math.abs(Math.sin(t * 9 + r.id * 1.3)) * 0.07;
      }

      if (v.label.material.map !== label) v.label.material.map = label;
      // Keep name tags a steady size on screen: shrink them near the camera, grow them far away.
      let tagScale = Math.min(1.7, Math.max(0.4, this.camera.position.distanceTo(v.root.position) / 26));
      if (r.place === 1) tagScale *= 1.5; // the winner gets the biggest name tag
      v.label.scale.set(4.4 * tagScale, 1.1 * tagScale, 1);
      v.label.position.y = LABEL_Y - (1 - Math.min(1, tagScale)) * 1.1 + (r.place === 1 ? 1.2 : 0);

      const spin = r.v * dt * 2.6;
      for (const wheel of v.wheels) wheel.rotation.x -= spin;

      const boosting = r.boostT > 0 && !r.stun;
      v.flame.visible = boosting;
      if (boosting) v.flame.scale.set(1, 1, 0.7 + Math.random() * 0.8);

      v.shield.visible = r.shield > 0;
      if (v.shield.visible) {
        // Flicker when the firewall is about to expire.
        const pulse = 1 + Math.sin(t * 6) * 0.04;
        v.shield.scale.setScalar(1.4 * pulse);
        if (r.shield < 2) v.shield.visible = Math.floor(t * 10) % 2 === 0;
      }

      // Held item, or failing that the effect someone has landed on this racer.
      const icon = r.item ? ITEM_INFO[r.item].emoji : statusIcon(r);
      v.itemIcon.visible = Boolean(icon) && !r.stun && !r.finished;
      if (icon) {
        const texture = emojiTexture(icon);
        if (v.itemIcon.material.map !== texture) v.itemIcon.material.map = texture;
        v.itemIcon.position.y = LABEL_Y + 1.05 + Math.sin(t * 6 + r.id) * 0.08;
      }

      if (v.emoteTime > 0) {
        v.emoteTime -= dt;
        const q = 1 - v.emoteTime / 1.3;
        v.emote.position.y = LABEL_Y + 1.3 + q * 1.6;
        v.emote.material.opacity = Math.min(1, v.emoteTime * 3);
        const pop = 1.8 * Math.min(1, q * 6);
        v.emote.scale.set(pop, pop, 1);
        if (v.emoteTime <= 0) v.emote.visible = false;
      }
    }

    for (const { sim: o, visual } of this.obstacleVisuals) visual.update(o, t);
    for (const { sim: c, visual } of this.crateVisuals) visual.update(c, t);

    // Thrown items.
    const live = new Set();
    for (const p of sim.projectiles) {
      live.add(p.id);
      let sprite = this.projectileVisuals.get(p.id);
      if (!sprite) {
        sprite = buildProjectile(p.kind);
        this.projectileVisuals.set(p.id, sprite);
        this.raceGroup.add(sprite);
      }
      // Heavy things (force push, a 200GB Table) are lobbed in an arc; light ones skim along.
      const lobbed = p.kind === 'forcePush' || p.kind === 'bigTable';
      const height = !lobbed ? 1.6 + Math.sin(p.t * 14) * 0.3 : 3 + Math.sin(Math.min(1, p.t / 1.2) * Math.PI) * 2.5;
      this.track.point(p.s, p.d, height, sprite.position);
      if (p.kind === 'forcePush' && Math.random() < 0.6) {
        this.particles.burst(sprite.position, { count: 1, colors: ['#ff6b6b', '#ffe066'], speed: 1, up: 1, life: 0.4, size: 0.25, gravity: 0 });
      }
    }
    for (const [id, sprite] of this.projectileVisuals) {
      if (!live.has(id)) {
        this.raceGroup.remove(sprite);
        sprite.material.dispose();
        this.projectileVisuals.delete(id);
      }
    }
  }

  // ------------------------------------------------------------ cameras

  setCamera(pos, look, dt, posRate = 3, lookRate = 5) {
    if (!this.camReady) {
      this.camPos.copy(pos);
      this.camLook.copy(look);
      this.camReady = true;
    } else {
      this.camPos.lerp(pos, damp(posRate, dt));
      this.camLook.lerp(look, damp(lookRate, dt));
    }
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
  }

  updateStageRacers(dt, reduced) {
    const t = this.clock;
    for (const r of this.stageRacers) {
      if (r.pop > 0) r.pop = Math.max(0, r.pop - dt * 3.5);
      const hop = reduced ? 0 : Math.sin(r.pop * Math.PI) * 1.1;
      const rev = reduced ? 0 : Math.abs(Math.sin(t * 8.5 + r.phase)) * 0.06;
      r.visual.body.position.y = rev + hop;
      const dist = this.camera.position.distanceTo(r.visual.root.position);
      const tagScale = Math.min(1.4, Math.max(0.55, dist / 26));
      r.visual.label.scale.set(4.4 * tagScale, 1.1 * tagScale, 1);
      r.visual.label.position.y = LABEL_Y - (1 - Math.min(1, tagScale)) * 1.0 + hop;
    }
  }

  updateRaceGridCamera(dt, reduced) {
    if (!reduced) this.stageTime += dt;
    const holdSeconds = 3.5;
    const rows = Math.max(1, Math.ceil(this.stageRacers.length / 4));
    const back = 14 + Math.min(10, rows * 2.4);
    const gridHeight = 7.8 + Math.min(3, rows * 0.6);

    if (reduced || this.stageTime < holdSeconds) {
      const portrait = this.camera.aspect < 1;
      const sway = reduced ? 0 : Math.sin(this.stageTime * 0.6) * 2.2;
      const pos = this.track.point(6 - back, -1.6 + sway, gridHeight + (portrait ? 2.5 : 0), this._a);
      // On portrait phones, aim lower so the starting grid and <race> banner sit in the top 3D window.
      const look = this.track.point(18, -1.2, portrait ? -7.5 : 1.6, this._b);
      this.setCamera(pos, look, dt, 2.5, 3);
      this.focus.copy(look);
      return;
    }

    // After holding on the starting grid, glide along the race track to the finish, then restart at the grid.
    const fly = this.stageTime - holdSeconds;
    const s = 6 - back + fly * FLYOVER_SPEED * 1.4;
    if (s >= this.track.length - 60) {
      this.stageTime = 0;
      this.camReady = false;
      return;
    }
    const pos = this.track.point(s, Math.sin(fly * 0.35) * 6, 12 + Math.min(10, fly * 1.5), this._a);
    const look = this.track.point(s + 38, 0, 1.2, this._b);
    this.setCamera(pos, look, dt, 2.2, 2.5);
    this.focus.copy(look);
  }

  updateLobbyCamera(dt) {
    // Slow fly-over of the course (the lobby, and the victory playback), always at normal speed.
    const t = this.flyT;
    const s = (t * FLYOVER_SPEED) % (this.track.length - 60);
    const pos = this.track.point(s - 34, Math.sin(t * 0.25) * 12, 24 + Math.sin(t * 0.4) * 4, this._a);
    const look = this.track.point(s + 34, 0, 0, this._b);
    // Snap (rather than glide the whole way back) when the loop restarts.
    if (this.camReady && this.camPos.distanceToSquared(pos) > 100 * 100) this.camReady = false;
    this.setCamera(pos, look, dt, 2, 2);
    this.focus.copy(look);
  }

  updateRaceCamera(dt) {
    const sim = this.sim;
    const order = sim.standings();

    if (this.phase === 'finished') {
      // Swing round to face the winner.
      const w = sim.winner;
      const since = sim.time - this.winnerAt;
      const k = Math.min(1, since / 3);
      const orbit = k * k * (3 - 2 * k);
      const side = w.d > 0 ? -1 : 1;
      // Swing wide round the side (not through the pack), ending in front of the winner.
      // Aiming below the winner keeps them in the upper half, clear of the result card.
      const pos = this.track.point(w.s - 8 + orbit * 23, w.d + side * (13 - orbit * 6), 9 - orbit * 3.5, this._a);
      const look = this.track.point(w.s, w.d, 2.2 - orbit * 2.6, this._b);
      this.setCamera(pos, look, dt, 4, 6);
      this.focus.copy(look);
      return;
    }

    // Follow the leaders: frame the first few racers, pulling back as they spread out.
    const leader = order[0];
    const tail = order[Math.min(order.length - 1, 2)];
    const spread = Math.min(32, leader.s - tail.s);
    let lateral = 0;
    const group = Math.min(order.length, 3);
    for (let i = 0; i < group; i++) lateral += order[i].d;
    lateral /= group;

    const focusS = leader.s - spread * 0.45;
    const back = 13 + spread * 0.5;
    const height = 8.5 + spread * 0.26;
    const pos = this.track.point(focusS - back, lateral * 0.45, height, this._a);
    const look = this.track.point(focusS + 9, lateral * 0.7, 1, this._b);
    this.setCamera(pos, look, dt, 2.6, 4.5);
    this.focus.copy(look);
  }
}

/** Runs a whole race instantly, for browsers where WebGL is unavailable. */
export function runHeadless(names, rng = Math.random) {
  const sim = new RaceSim({ names, rng });
  while (!sim.done && sim.time < 600) sim.step(1 / 30);
  return sim;
}
