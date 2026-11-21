// "Standup Deathmatch": modernized Quake / QuakeWorld 3D arena, 14 developer avatars,
// Google Meet shared-screen overlay, 4-line Quake obituary console, live In-call messages chat,
// and 0:00 frag leaderboard (1-column < 16 players, 2-column >= 16 players, invitees only).
// Co-authored by Antigravity (Gemini 4 Neon) and GPT 6.1 SOL (High).

import * as THREE from 'three';
import { mat, box, ball, cyl, cone, torus, plane, at, canvasTexture, FONT_UI, FONT_MONO } from './util3d.js';
import { Particles } from './effects.js';
import { buildDeveloperModel } from './deathmatch-avatars.js';
import {
  DEVELOPER_KINDS,
  DM_POWERUPS,
  buildLobbyChatScript,
  MATCH_CHAT_RANDOM,
  CHAT_GAP_MIN,
  CHAT_GAP_MAX,
  planDeathmatch,
  clockAt,
  formatMatchClock,
  formatMeetTime,
} from './deathmatch-sim.js';

const ARENA_HALF = 17;
const UPPER_Y = 3.8;
const PILLAR_SPOTS = [
  [-8.5, -8.5],
  [8.5, -8.5],
  [-8.5, 8.5],
  [8.5, 8.5],
];
const JUMPPAD_SPOTS = [
  [-12.5, 0],
  [12.5, 0],
  [0, -12.5],
  [0, 12.5],
];
const SPAWN_RING = [
  [-13, -13, 0], [13, -13, 0], [-13, 13, 0], [13, 13, 0],
  [-6, -13, 0], [6, -13, 0], [-6, 13, 0], [6, 13, 0],
  [-14, -6, UPPER_Y], [14, -6, UPPER_Y], [-14, 6, UPPER_Y], [14, 6, UPPER_Y],
];

/** Stable hash so a teammate keeps the same developer persona in the lobby preview. */
function hashName(name) {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Builds the modernized QuakeWorld gothic-industrial arena (DM4/DM6 homage). */
function buildQuakeArena(scene, disposables) {
  scene.background = new THREE.Color('#0c0e14');
  scene.fog = new THREE.Fog('#0c0e14', 28, 72);

  scene.add(new THREE.HemisphereLight('#8ea8d8', '#331c10', 0.85));
  const key = new THREE.DirectionalLight('#ffddb8', 1.5);
  key.position.set(14, 28, 12);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 4, far: 70 });
  key.shadow.bias = -0.0005;
  scene.add(key);

  // Stone-and-iron tiled Quake floor texture
  const floorTex = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#252830';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#14171d';
    ctx.lineWidth = 4;
    for (let x = 0; x <= w; x += 64) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y <= h; y += 64) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    ctx.fillStyle = '#2f343f';
    for (let x = 8; x < w; x += 64) {
      for (let y = 8; y < h; y += 64) ctx.fillRect(x, y, 48, 48);
    }
  }, { repeat: true });
  floorTex.repeat.set(10, 10);
  disposables.push(floorTex);

  const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.85, metalness: 0.15 });
  disposables.push(floorMat);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ARENA_HALF * 2, ARENA_HALF * 2), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Central sunken glowing lava / 404 pit with grated bridge
  const lavaMat = mat('#ff5400', { emissive: '#ff4500', emissiveIntensity: 1.1, roughness: 0.4 });
  scene.add(at(box(7.2, 0.12, 7.2, lavaMat), 0, 0.04, 0));
  const rimMat = mat('#3c352f', { roughness: 0.9 });
  scene.add(at(box(7.8, 0.28, 0.5, rimMat), 0, 0.14, 3.7));
  scene.add(at(box(7.8, 0.28, 0.5, rimMat), 0, 0.14, -3.7));
  scene.add(at(box(0.5, 0.28, 7.8, rimMat), 3.7, 0.14, 0));
  scene.add(at(box(0.5, 0.28, 7.8, rimMat), -3.7, 0.14, 0));
  // Crosswalk grates over the lava pit
  const grateMat = mat('#4b5260', { metalness: 0.7, roughness: 0.4 });
  scene.add(at(box(8.2, 0.18, 1.5, grateMat), 0, 0.22, 0));
  scene.add(at(box(1.5, 0.18, 8.2, grateMat), 0, 0.22, 0));
  const lavaLight = new THREE.PointLight('#ff6a00', 24, 18, 1.5);
  lavaLight.position.set(0, 1.6, 0);
  scene.add(lavaLight);

  // Perimeter Quake fortress walls
  const wallMat = mat('#2a2623', { roughness: 0.92, metalness: 0.08 });
  const trimMat = mat('#5c4a38', { roughness: 0.75, metalness: 0.25 });
  const wallH = 9;
  for (const [x, z, w, d] of [
    [0, -ARENA_HALF, ARENA_HALF * 2, 1.2],
    [0, ARENA_HALF, ARENA_HALF * 2, 1.2],
    [-ARENA_HALF, 0, 1.2, ARENA_HALF * 2],
    [ARENA_HALF, 0, 1.2, ARENA_HALF * 2],
  ]) {
    scene.add(at(box(w, wallH, d, wallMat), x, wallH / 2, z));
    scene.add(at(box(w, 0.5, d + 0.3, trimMat), x, wallH, z));
  }

  // Elevated Quake catwalks along West & East walls
  const catMat = mat('#363b45', { roughness: 0.7, metalness: 0.35 });
  scene.add(at(box(4.2, 0.4, 24, catMat), -ARENA_HALF + 2.6, UPPER_Y, 0));
  scene.add(at(box(4.2, 0.4, 24, catMat), ARENA_HALF - 2.6, UPPER_Y, 0));
  // Ramps up to catwalks
  scene.add(at(box(4.0, 0.35, 8.5, catMat), -ARENA_HALF + 2.6, UPPER_Y / 2, -13.2, -0.44, 0, 0));
  scene.add(at(box(4.0, 0.35, 8.5, catMat), ARENA_HALF - 2.6, UPPER_Y / 2, 13.2, 0.44, 0, 0));

  // 4 gothic pillars with flickering Quake torches
  const torches = [];
  for (const [px, pz] of PILLAR_SPOTS) {
    scene.add(at(box(2.0, 8.5, 2.0, wallMat), px, 4.25, pz));
    scene.add(at(box(2.3, 0.5, 2.3, trimMat), px, 8.5, pz));
    const flame = at(cone(0.32, 0.85, mat('#ff922b', { emissive: '#ff6b00', emissiveIntensity: 1.5 }), 6), px, 5.1, pz + (pz > 0 ? -1.15 : 1.15));
    scene.add(flame);
    const pt = new THREE.PointLight('#ff8822', 16, 16, 1.6);
    pt.position.set(px, 5.4, pz + (pz > 0 ? -1.4 : 1.4));
    scene.add(pt);
    torches.push({ flame, light: pt, phase: px * 0.7 + pz * 0.5 });
  }

  // Glowing Quake jump pads
  const jumpPads = [];
  for (const [jx, jz] of JUMPPAD_SPOTS) {
    scene.add(at(cyl(1.35, 1.55, 0.22, mat('#2c303a', { metalness: 0.6 })), jx, 0.11, jz));
    const ring = at(
      torus(1.0, 0.12, mat('#38bdf8', { emissive: '#38bdf8', emissiveIntensity: 1.3 })),
      jx, 0.26, jz, Math.PI / 2, 0, 0,
    );
    scene.add(ring);
    jumpPads.push(ring);
  }

  // Floating spinning powerup pickups
  const pickups = [];
  const pickupSpots = [[0, 1.35, 0], [-14.2, UPPER_Y + 1.2, 0], [14.2, UPPER_Y + 1.2, 0], [0, 1.2, -9.5], [0, 1.2, 9.5]];
  DM_POWERUPS.forEach((pu, i) => {
    const [x, y, z] = pickupSpots[i % pickupSpots.length];
    const orb = at(
      box(0.65, 0.65, 0.65, mat(pu.color, { emissive: pu.color, emissiveIntensity: 0.9, roughness: 0.25 })),
      x, y, z, 0.4, 0.4, 0,
    );
    scene.add(orb);
    pickups.push({ mesh: orb, baseY: y, phase: i * 1.3 });
  });

  // Wall banners ("STANDUP DEATHMATCH" / "DAILY STANDUP 15 MIN")
  const bannerTex = canvasTexture(512, 128, (ctx, w, h) => {
    ctx.fillStyle = '#1c1816';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#c9933b';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, w - 12, h - 12);
    ctx.fillStyle = '#f2b817';
    ctx.font = `800 36px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('STANDUP DEATHMATCH', w / 2, h / 2 - 14);
    ctx.fillStyle = '#adb5bd';
    ctx.font = `600 20px ${FONT_UI}`;
    ctx.fillText('QUAKEWORLD • DAILY STANDUP (15 MIN)', w / 2, h / 2 + 24);
  });
  disposables.push(bannerTex);
  const bannerMat = new THREE.MeshStandardMaterial({ map: bannerTex, roughness: 0.7 });
  disposables.push(bannerMat);
  scene.add(at(plane(11, 2.75, bannerMat), 0, 6.2, -ARENA_HALF + 0.7));
  scene.add(at(plane(11, 2.75, bannerMat), 0, 6.2, ARENA_HALF - 0.7, 0, Math.PI, 0));

  return { torches, jumpPads, pickups, lavaLight };
}

// ------------------------------------------------------------------ Lobby 3D Stage Preview

export class DeathmatchStage {
  constructor(aspect = 16 / 9, initialNames = []) {
    this.t = 0;
    this.orbit = 0.6;
    this.names = [];
    this.models = [];
    this.disposables = [];

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, aspect, 0.3, 180);
    this.arena = buildQuakeArena(this.scene, this.disposables);
    this.setLineup(initialNames);
    this.resize(aspect);
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 1 ? 66 : 54;
    this.camera.updateProjectionMatrix();
  }

  setLineup(names = []) {
    if (names.length === this.names.length && names.every((n, i) => n === this.names[i])) return;
    for (const m of this.models) {
      this.scene.remove(m.visual.root);
      m.visual.dispose();
    }
    this.models = [];
    this.names = [...names];

    const used = new Set();
    names.forEach((name, i) => {
      const h = hashName(name);
      let kindIdx = h % DEVELOPER_KINDS.length;
      if (used.size < DEVELOPER_KINDS.length) {
        while (used.has(kindIdx)) kindIdx = (kindIdx + 1) % DEVELOPER_KINDS.length;
        used.add(kindIdx);
      }
      const visual = buildDeveloperModel({ name, kind: DEVELOPER_KINDS[kindIdx], isNpc: false });
      const angle = (i / Math.max(1, names.length)) * Math.PI * 2;
      const radius = 7.5 + (i % 3) * 2.2;
      visual.root.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      visual.root.rotation.y = angle + Math.PI;
      this.scene.add(visual.root);
      this.models.push({ visual, angle, radius, phase: (h % 628) / 100 });
    });
  }

  update(dt, reduced = false) {
    if (!reduced) {
      this.t += dt;
      this.orbit += dt * 0.18;
    }
    const t = this.t;
    for (const torch of this.arena.torches) {
      torch.flame.scale.y = reduced ? 1 : 0.85 + Math.sin(t * 14 + torch.phase) * 0.2;
      torch.light.intensity = reduced ? 16 : 14 + Math.sin(t * 11 + torch.phase) * 3;
    }
    for (const pu of this.arena.pickups) {
      pu.mesh.rotation.y = t * 1.8 + pu.phase;
      pu.mesh.position.y = pu.baseY + (reduced ? 0 : Math.sin(t * 2.6 + pu.phase) * 0.22);
    }
    for (const m of this.models) {
      const a = m.angle + (reduced ? 0 : Math.sin(t * 0.55 + m.phase) * 0.15);
      m.visual.root.position.x = Math.cos(a) * m.radius;
      m.visual.root.position.z = Math.sin(a) * m.radius;
      m.visual.body.position.y = reduced ? 0 : Math.abs(Math.sin(t * 5 + m.phase)) * 0.08;
      m.visual.root.lookAt(0, 0, 0);
    }
    const r = 17.5;
    this.camera.position.set(Math.cos(this.orbit) * r, 9.2, Math.sin(this.orbit) * r);
    this.camera.lookAt(0, 1.8, 0);
  }

  dispose() {
    for (const m of this.models) m.visual.dispose();
    for (const d of this.disposables) d.dispose();
  }
}

// ------------------------------------------------------------------ Lobby Chat Preview (docs/in-call-messages.md)

export class LobbyMeetChat {
  constructor(rootEl, listEl, timeEl) {
    this.root = rootEl;
    this.list = listEl;
    this.timeEl = timeEl;
    this.timer = null;
    this.clockTimer = null;
    this.script = [];
    this.idx = 0;
    this.active = false;
  }

  start() {
    if (this.active) return;
    this.active = true;
    this.root.hidden = false;
    this.list.replaceChildren();
    this.script = buildLobbyChatScript();
    this.idx = 0;
    const updateClock = () => {
      if (this.timeEl) this.timeEl.textContent = formatMeetTime(new Date());
    };
    updateClock();
    this.clockTimer = setInterval(updateClock, 15000);

    // Seed the first line immediately so the panel looks alive right away
    this.appendNext();
    this.scheduleNext();
  }

  scheduleNext() {
    if (!this.active) return;
    const delayMs = (CHAT_GAP_MIN + Math.random() * (CHAT_GAP_MAX - CHAT_GAP_MIN)) * 1000;
    this.timer = setTimeout(() => {
      if (!this.active) return;
      this.appendNext();
      this.scheduleNext();
    }, delayMs);
  }

  appendNext() {
    if (this.idx >= this.script.length) {
      // Loop gracefully with 4 freshly rolled developers for the Prod Deployment sync
      this.script = buildLobbyChatScript();
      this.idx = 0;
      this.list.replaceChildren();
    }
    const msg = this.script[this.idx++];
    appendChatRow(this.list, msg.sender, msg.text, false);
  }

  stop() {
    this.active = false;
    clearTimeout(this.timer);
    clearInterval(this.clockTimer);
    this.timer = null;
    this.clockTimer = null;
    this.root.hidden = true;
  }
}

function appendChatRow(listEl, sender, text, isNpc = false) {
  const item = document.createElement('li');
  item.className = isNpc ? 'dm-msg dm-msg-npc' : 'dm-msg';
  const head = document.createElement('div');
  head.className = 'dm-msg-head';
  const who = document.createElement('span');
  who.className = 'dm-msg-sender';
  who.textContent = sender;
  const time = document.createElement('span');
  time.className = 'dm-msg-time';
  time.textContent = formatMeetTime(new Date());
  head.append(who, time);
  const body = document.createElement('p');
  body.className = 'dm-msg-text';
  body.textContent = text;
  item.append(head, body);
  listEl.append(item);
  // Keep DOM lean
  while (listEl.children.length > 60) listEl.firstChild.remove();
  listEl.scrollTop = listEl.scrollHeight;
}

// ------------------------------------------------------------------ Live Match (3D Quake + Google Meet Overlay)

export class DeathmatchMatch {
  constructor(names, { rng = Math.random, sfx = null, onWinner = null, onQuit = null, timeScale = 1 } = {}) {
    this.plan = planDeathmatch(names, rng);
    this.rng = rng;
    this.sfx = sfx;
    this.onWinner = onWinner;
    this.onQuit = onQuit;
    this.timeScale = Math.max(0.5, Number(timeScale) || 1);

    this.t = 0;
    this.nextEventIdx = 0;
    this.finished = false;
    this.winnerReported = false;
    this.finishTimer = null;
    this.postChatTimer = null;
    this.clockTimer = null;
    this.clockRolledBack = false;
    this.obituaries = [];
    this.liveKills = new Map(this.plan.players.map((p) => [p.id, 0]));
    this.liveDeaths = new Map(this.plan.players.map((p) => [p.id, 0]));
    this.projectiles = [];
    this.disposables = [];

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.25, 180);
    this.arena = buildQuakeArena(this.scene, this.disposables);
    this.particles = new Particles(this.scene);

    // Spawn all players (invitees + NPCs) in the Quake arena
    this.actors = this.plan.players.map((p, i) => {
      const visual = buildDeveloperModel(p);
      const spot = SPAWN_RING[i % SPAWN_RING.length];
      visual.root.position.set(spot[0], spot[2], spot[1]);
      this.scene.add(visual.root);
      return {
        player: p,
        visual,
        x: spot[0],
        y: spot[2],
        z: spot[1],
        vx: 0,
        vz: 0,
        vy: 0,
        angle: rng() * Math.PI * 2,
        turnAt: rng() * 1.5,
        auraT: 0,
        respawnT: 0,
      };
    });

    this.spectateId = this.plan.player1Id;
    this.mountMeetOverlay();
    this.resize(window.innerWidth, window.innerHeight);
  }

  mountMeetOverlay() {
    this.overlay = document.getElementById('dm-meet');
    this.consoleEl = document.getElementById('dm-console');
    this.clockEl = document.getElementById('dm-clock');
    this.chatListEl = document.getElementById('dm-chat-list');
    this.hudPlayerEl = document.getElementById('dm-hud-player');
    this.hudWeaponEl = document.getElementById('dm-hud-weapon');
    this.hudFragsEl = document.getElementById('dm-hud-frags');
    this.hudPowerupEl = document.getElementById('dm-hud-powerup');
    this.meetTimeEl = document.getElementById('dm-meet-time');
    this.meetCountEl = document.getElementById('dm-meet-count');
    this.boardEl = document.getElementById('dm-leaderboard');
    this.boardGridEl = document.getElementById('dm-leaderboard-grid');
    this.boardContinueBtn = document.getElementById('dm-continue');
    this.leaveBtn = document.getElementById('dm-leave-call');

    this.consoleEl.replaceChildren();
    this.chatListEl.replaceChildren();
    this.boardEl.hidden = true;
    this.clockEl.classList.remove('rolled-back');
    this.clockEl.textContent = formatMatchClock(clockAt(0));
    this.meetCountEl.textContent = String(this.plan.players.length);

    const updateRealClock = () => {
      this.meetTimeEl.textContent = formatMeetTime(new Date());
    };
    updateRealClock();
    this.clockTimer = setInterval(updateRealClock, 15000);

    this._onLeave = () => this.onQuit?.();
    this._onContinue = () => this.finishToWinnerCard();
    this.leaveBtn.addEventListener('click', this._onLeave);
    this.boardContinueBtn.addEventListener('click', this._onContinue);

    this.syncHudBar();
    this.overlay.hidden = false;
  }

  resize(width, height) {
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    this.camera.aspect = w / h;
    // Offset the 3D view center into the shared-screen area (left of chat sidebar, above bottom Meet bar)
    const chatW = w >= 860 ? 340 : 0;
    const barH = 68;
    const offsetX = chatW / 2;
    const offsetY = barH / 2;
    this.camera.setViewOffset(w, h, offsetX, offsetY, w, h);
    this.camera.updateProjectionMatrix();
  }

  pushObituary(line, highlight = false) {
    this.obituaries.push({ line, highlight });
    if (this.obituaries.length > 4) this.obituaries.shift();
    this.consoleEl.replaceChildren();
    for (const entry of this.obituaries) {
      const p = document.createElement('p');
      p.className = entry.highlight ? 'dm-con-line dm-con-highlight' : 'dm-con-line';
      p.textContent = entry.line;
      this.consoleEl.append(p);
    }
  }

  syncHudBar() {
    const actor = this.actors[this.spectateId] ?? this.actors[0];
    const p = actor.player;
    this.hudPlayerEl.textContent = `${p.name} (${p.kind.label})`;
    this.hudWeaponEl.textContent = p.kind.weapon.name;
    this.hudFragsEl.textContent = `${this.liveKills.get(p.id) ?? 0} FRAGS`;
    this.hudPowerupEl.textContent = actor.auraT > 0 ? '⚡ POWERUP ACTIVE' : 'HP 100 · ARMOR 75';
  }

  fireProjectile(killerActor, victimActor) {
    const w = killerActor.player.kind.weapon;
    const start = new THREE.Vector3(killerActor.x, killerActor.y + 1.15, killerActor.z);
    const end = new THREE.Vector3(victimActor.x, victimActor.y + 1.15, victimActor.z);
    if (w.projectile === 'rail' || w.projectile === 'lightning') {
      // Instant glowing beam
      const dist = Math.max(0.5, start.distanceTo(end));
      const beam = cyl(0.06, 0.06, dist, mat(w.color, { emissive: w.color, emissiveIntensity: 1.8 }), 6);
      beam.position.copy(start).add(end).multiplyScalar(0.5);
      beam.lookAt(end);
      beam.rotateX(Math.PI / 2);
      this.scene.add(beam);
      this.projectiles.push({ mesh: beam, life: 0.35, maxLife: 0.35, isBeam: true });
    } else {
      // Travelling orb/rocket
      const orb = ball(w.projectile === 'bfg' ? 0.38 : 0.18, mat(w.color, { emissive: w.color, emissiveIntensity: 1.6 }));
      orb.position.copy(start);
      this.scene.add(orb);
      this.projectiles.push({ mesh: orb, start, end, life: 0.32, maxLife: 0.32, isBeam: false });
    }
    this.particles.burst(end, {
      count: 16,
      colors: [w.color, '#ff922b', '#ffffff', '#ff4d6d'],
      speed: 5.5,
      up: 2.5,
      life: 0.75,
      size: 0.22,
      gravity: 6,
    });
  }

  handleEvent(ev) {
    switch (ev.type) {
      case 'spawn':
        this.pushObituary(`> ${ev.text}`, true);
        this.sfx?.play('go', 0.1);
        break;
      case 'powerup': {
        this.pushObituary(`★ ${ev.text}`, true);
        const actor = this.actors[ev.playerId];
        if (actor) {
          actor.auraT = 8;
          actor.visual.aura.visible = true;
        }
        this.sfx?.play('pickup', 0.1);
        break;
      }
      case 'frag': {
        this.liveKills.set(ev.killerId, (this.liveKills.get(ev.killerId) ?? 0) + 1);
        this.liveDeaths.set(ev.victimId, (this.liveDeaths.get(ev.victimId) ?? 0) + 1);
        this.pushObituary(ev.text, ev.killerId === this.spectateId);
        const killer = this.actors[ev.killerId];
        const victim = this.actors[ev.victimId];
        if (killer && victim) {
          this.fireProjectile(killer, victim);
          victim.respawnT = 0.5;
          const spot = SPAWN_RING[Math.floor(this.rng() * SPAWN_RING.length)];
          victim.x = spot[0];
          victim.z = spot[1];
          victim.y = spot[2];
        }
        this.sfx?.play('frag', 0.12);
        this.syncHudBar();
        break;
      }
      case 'chat':
        appendChatRow(this.chatListEl, ev.sender, ev.text, ev.isNpc);
        this.sfx?.play('chat', 0.15);
        break;
      case 'clockReset':
        this.clockRolledBack = true;
        this.clockEl.classList.add('rolled-back');
        this.pushObituary(`⚠ ${ev.text}`, true);
        this.sfx?.play('rollback', 0.1);
        break;
      case 'finish':
        this.finished = true;
        this.clockEl.textContent = '0:00';
        this.showFragLeaderboard();
        break;
    }
  }

  showFragLeaderboard() {
    const { leaderboard, layoutColumns } = this.plan;
    this.boardGridEl.className = layoutColumns === 2 ? 'dm-lb-grid dm-lb-two-col' : 'dm-lb-grid dm-lb-one-col';
    this.boardGridEl.replaceChildren();

    leaderboard.forEach((row, idx) => {
      const card = document.createElement('div');
      card.className = idx === 0 ? 'dm-lb-row dm-lb-winner' : 'dm-lb-row';

      const rank = document.createElement('span');
      rank.className = 'dm-lb-rank';
      rank.textContent = idx === 0 ? '👑 #1' : `#${idx + 1}`;

      const info = document.createElement('div');
      info.className = 'dm-lb-who';
      const name = document.createElement('span');
      name.className = 'dm-lb-name';
      name.textContent = row.name;
      const meta = document.createElement('span');
      meta.className = 'dm-lb-meta';
      meta.textContent = `${row.kind.label} · ${row.kind.weapon.short}`;
      info.append(name, meta);

      const score = document.createElement('span');
      score.className = 'dm-lb-frags';
      score.textContent = `${row.kills} frags`;

      card.append(rank, info, score);
      this.boardGridEl.append(card);
    });

    this.boardEl.hidden = false;
    this.sfx?.play('win', 0.1);
    this.startPostMatchChat();
    this.finishTimer = setTimeout(() => this.finishToWinnerCard(), 4500);
  }

  /** Keeps In-call messages flowing after 0:00 until the user leaves the call or returns to the lobby. */
  startPostMatchChat() {
    const leader = this.plan.leaderboard[0];
    const postLines = [
      { speaker: 'player', text: `GG ${leader.name}! You're leading today's standup.` },
      { speaker: 'npc', text: 'Great match everyone — anything for the parking lot?' },
      { speaker: 'player', text: `Alright ${leader.name}, your turn to share the board.` },
      { speaker: 'player', text: 'Did anyone actually mention their blockers yet?' },
      { speaker: 'npc', text: 'See you all tomorrow for another 15-minute one-hour standup!' },
      ...MATCH_CHAT_RANDOM,
    ];
    let idx = 0;
    const schedule = () => {
      const delayMs = (CHAT_GAP_MIN + this.rng() * (CHAT_GAP_MAX - CHAT_GAP_MIN)) * 1000;
      this.postChatTimer = setTimeout(() => {
        const entry = postLines[idx < 5 ? idx++ : 5 + Math.floor(this.rng() * MATCH_CHAT_RANDOM.length)];
        const pool = entry.speaker === 'npc' ? this.plan.npcs : this.plan.invitees;
        const who = pool[Math.floor(this.rng() * pool.length)];
        const targets = who.isNpc ? this.plan.invitees : this.plan.invitees.filter((p) => p.id !== who.id);
        const target = (targets.length ? targets : this.plan.invitees)[Math.floor(this.rng() * (targets.length || this.plan.invitees.length))];
        const text = entry.text.replaceAll('{target}', target.name);
        appendChatRow(this.chatListEl, who.name, text, who.isNpc);
        this.sfx?.play('chat', 0.15);
        schedule();
      }, delayMs);
    };
    schedule();
  }

  finishToWinnerCard() {
    if (this.winnerReported) return;
    this.winnerReported = true;
    clearTimeout(this.finishTimer);
    const leader = this.plan.leaderboard[0];
    this.onWinner?.(leader, this.plan);
  }

  update(realDt) {
    const dt = realDt * this.timeScale;
    if (!this.finished) {
      this.t += dt;
      while (this.nextEventIdx < this.plan.events.length && this.plan.events[this.nextEventIdx].t <= this.t) {
        this.handleEvent(this.plan.events[this.nextEventIdx++]);
      }
      if (!this.finished) {
        this.clockEl.textContent = formatMatchClock(clockAt(this.t));
      }
    }

    // Animate torches, pickups, projectiles & developer bots
    const t = this.t;
    for (const torch of this.arena.torches) {
      torch.flame.scale.y = 0.85 + Math.sin(t * 15 + torch.phase) * 0.22;
      torch.light.intensity = 14 + Math.sin(t * 12 + torch.phase) * 3.5;
    }
    for (const pu of this.arena.pickups) {
      pu.mesh.rotation.y = t * 2.2 + pu.phase;
      pu.mesh.position.y = pu.baseY + Math.sin(t * 3 + pu.phase) * 0.22;
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.life -= realDt;
      if (pr.life <= 0) {
        this.scene.remove(pr.mesh);
        this.projectiles.splice(i, 1);
      } else if (!pr.isBeam) {
        const q = 1 - pr.life / pr.maxLife;
        pr.mesh.position.lerpVectors(pr.start, pr.end, q);
      }
    }

    // Move bots around the Quake arena (strafe, jump pad launches, leg stride)
    for (const a of this.actors) {
      if (a.auraT > 0) {
        a.auraT = Math.max(0, a.auraT - realDt);
        a.visual.aura.visible = a.auraT > 0;
        a.visual.aura.rotation.z = t * 4;
      }
      a.turnAt -= realDt;
      if (a.turnAt <= 0) {
        a.angle += (this.rng() - 0.5) * 1.9;
        a.turnAt = 0.8 + this.rng() * 1.4;
      }
      const speed = a.auraT > 0 ? 7.2 : 5.2;
      a.x += Math.cos(a.angle) * speed * realDt;
      a.z += Math.sin(a.angle) * speed * realDt;

      // Keep inside arena walls and out of central lava pit
      const lim = ARENA_HALF - 2.2;
      if (a.x < -lim || a.x > lim) { a.x = Math.max(-lim, Math.min(lim, a.x)); a.angle = Math.PI - a.angle; }
      if (a.z < -lim || a.z > lim) { a.z = Math.max(-lim, Math.min(lim, a.z)); a.angle = -a.angle; }
      if (Math.abs(a.x) < 3.6 && Math.abs(a.z) < 3.6 && Math.abs(a.x) > 0.8 && Math.abs(a.z) > 0.8) {
        a.angle += Math.PI * 0.75;
      }

      // Jump pad boost!
      for (const [jx, jz] of JUMPPAD_SPOTS) {
        if (Math.hypot(a.x - jx, a.z - jz) < 1.3 && a.y < 0.2 && a.vy <= 0) {
          a.vy = 9.5;
        }
      }
      if (a.y > 0 || a.vy > 0) {
        a.y += a.vy * realDt;
        a.vy -= 22 * realDt;
        if (a.y < 0) { a.y = 0; a.vy = 0; }
      }

      a.visual.root.position.set(a.x, a.y, a.z);
      a.visual.root.rotation.y = Math.atan2(Math.cos(a.angle), Math.sin(a.angle));
      const stride = Math.sin(t * 10 + a.player.id) * 0.45;
      a.visual.legL.rotation.x = stride;
      a.visual.legR.rotation.x = -stride;
    }

    this.particles.update(realDt);

    // Dynamic over-the-shoulder Quake action cam following Player 1
    const focus = this.actors[this.spectateId] ?? this.actors[0];
    const camAngle = t * 0.35;
    const targetX = focus.x - Math.cos(focus.angle) * 5.2 + Math.cos(camAngle) * 2.4;
    const targetZ = focus.z - Math.sin(focus.angle) * 5.2 + Math.sin(camAngle) * 2.4;
    const clampedX = Math.max(-ARENA_HALF + 2, Math.min(ARENA_HALF - 2, targetX));
    const clampedZ = Math.max(-ARENA_HALF + 2, Math.min(ARENA_HALF - 2, targetZ));
    this.camera.position.lerp(new THREE.Vector3(clampedX, focus.y + 4.4, clampedZ), Math.min(1, realDt * 4));
    this.camera.lookAt(focus.x + Math.cos(focus.angle) * 4, focus.y + 1.5, focus.z + Math.sin(focus.angle) * 4);
  }

  dispose() {
    clearTimeout(this.finishTimer);
    clearTimeout(this.postChatTimer);
    clearInterval(this.clockTimer);
    this.leaveBtn?.removeEventListener('click', this._onLeave);
    this.boardContinueBtn?.removeEventListener('click', this._onContinue);
    if (this.overlay) this.overlay.hidden = true;
    for (const a of this.actors) a.visual.dispose();
    for (const d of this.disposables) d.dispose();
    this.particles.clear();
  }
}
