// "Standup Deathmatch": modernized Quake / QuakeWorld deathmatch inside a Google Meet call.
// Pure logic and scripts (no Three.js, no DOM), so it runs in Node for tests and headless fallback.
// Co-authored by Antigravity (Gemini 4 Neon) and GPT 6.1 SOL (High).

import { shuffle } from './sim.js';
import { MAX_NAMES } from './data-rules.js';

export const MIN_DEATHMATCH_PLAYERS = 2;
export const MAX_DEATHMATCH_PLAYERS = MAX_NAMES; // 30 — supports 1-col (<16) and 2-col (>=16) leaderboards

/** Match clock milestones (in real match seconds). */
export const INITIAL_CLOCK = 10;
export const TRIGGER_CLOCK_LEFT = 2;
export const MUTE_TRIGGER_AT = INITIAL_CLOCK - TRIGGER_CLOCK_LEFT; // 8.0s (2s left on 10s clock)
export const CLOCK_RESET_AT = 8.8; // clock rolls back to 45s right after the mute/ticket/hotfix chat
export const RESET_CLOCK = 45;
export const MATCH_DURATION = CLOCK_RESET_AT + RESET_CLOCK; // 53.8s total

/** Chat pacing bounds (seconds between consecutive messages). */
export const CHAT_GAP_MIN = 2.5;
export const CHAT_GAP_MAX = 4.5;

/**
 * The 14 developer personas from the Standup Deathmatch reference art (12 core devs by GPT 6.1 SOL
 * plus the 13th Glare-Shield dev and 14th Chevron dev). Each brings a signature Quake-style weapon
 * and bespoke visual traits.
 */
export const DEVELOPER_KINDS = [
  {
    id: 'maya',
    label: 'Maya',
    accent: '#ff6b6b',
    shirt: '#2b2d42',
    hair: '#3d251e',
    skin: '#e0b394',
    trait: 'ponytail-laptop',
    weapon: {
      id: 'pod-cannon',
      name: 'Kubernetes Pod Cannon',
      short: 'Pod Cannon',
      color: '#326ce5',
      projectile: 'rocket',
      obituary: '{victim} was autoscaled into oblivion by {killer}\'s Pod Cannon',
    },
    blurb: 'Sticker-armored laptop; fires self-replicating Kubernetes container pods.',
  },
  {
    id: 'walter',
    label: 'Walter',
    accent: '#d9480f',
    shirt: '#9b2226',
    hair: '#b8bec6',
    skin: '#f0cbb1',
    trait: 'flannel-beard',
    weapon: {
      id: 'prod-tribarrel',
      name: 'prod1 / prodl / prodI Tri-Barrel',
      short: 'Tri-Barrel',
      color: '#ff922b',
      projectile: 'plasma',
      obituary: '{victim} deployed to the wrong prodI via {killer}\'s Tri-Barrel',
    },
    blurb: 'Plaid flannel & silver beard; three barrels and nobody knows which is prod.',
  },
  {
    id: 'zoe',
    label: 'Zoe',
    accent: '#9c36b5',
    shirt: '#23263a',
    hair: '#7950f2',
    skin: '#f2c8b0',
    trait: 'purple-curls',
    weapon: {
      id: 'womm-railgun',
      name: 'Works-On-My-Machine Railgun',
      short: 'WOMM Railgun',
      color: '#3bc9db',
      projectile: 'rail',
      obituary: '{victim} failed local repro against {killer}\'s WOMM Railgun',
    },
    blurb: 'Purple curls & neck headphones; hyper-velocity cyan rail slug that ignores staging.',
  },
  {
    id: 'finn',
    label: 'Finn',
    accent: '#fcc419',
    shirt: '#4f5d2f',
    hair: '#5c3a21',
    skin: '#f1c7a8',
    trait: 'spiky-energy',
    weapon: {
      id: 'volt-lightning',
      name: 'Volt-Can Lightning Gun',
      short: 'Volt Lightning',
      color: '#ffe066',
      projectile: 'lightning',
      obituary: '{victim} was over-caffeinated by {killer}\'s Volt-Can Lightning Gun',
    },
    blurb: 'Spiky hair & yellow energy drink; arcs 10,000 volts of pure standup thunder.',
  },
  {
    id: 'bruno',
    label: 'Bruno',
    accent: '#845ef7',
    shirt: '#25262b',
    hair: '#4a3525',
    skin: '#eab696',
    trait: 'beard-mechboard',
    weapon: {
      id: 'thock-launcher',
      name: 'Thock-9000 Keycap Grenade Launcher',
      short: 'Thock-9000',
      color: '#ae3ec9',
      projectile: 'grenade',
      obituary: '{victim} caught a Cherry MX Blue grenade from {killer}\'s Thock-9000',
    },
    blurb: 'Twirled beard & custom mechanical keyboard; lobs deafening explosive keycaps.',
  },
  {
    id: 'aman',
    label: 'Aman',
    accent: '#339af0',
    shirt: '#1c2b4a',
    hair: '#1f2937',
    skin: '#b57a52',
    trait: 'turban-space',
    weapon: {
      id: 'force-push-rl',
      name: 'Orbital Force-Push Rocket Launcher',
      short: 'Force-Push RL',
      color: '#ff6b6b',
      projectile: 'rocket',
      obituary: '{victim}\'s branch was rewritten by {killer}\'s Force-Push Rocket',
    },
    blurb: 'Navy turban & astronaut tee; launches git push --force warheads.',
  },
  {
    id: 'priya',
    label: 'Priya',
    accent: '#e64980',
    shirt: '#7a1f3d',
    hair: '#1e1b18',
    skin: '#a86b46',
    trait: 'bun-notebook',
    weapon: {
      id: 'blocker-plasma',
      name: 'Meeting-About-Blockers Plasma Rifle',
      short: 'Blocker Plasma',
      color: '#f06595',
      projectile: 'plasma',
      obituary: '{victim} was trapped in a recurring sync by {killer}\'s Blocker Plasma',
    },
    blurb: 'Burgundy cardigan & notebook; rapid-fires inescapable calendar invites.',
  },
  {
    id: 'mei',
    label: 'Mei',
    accent: '#cc5de8',
    shirt: '#343a40',
    hair: '#141517',
    skin: '#f3d2bc',
    trait: 'cat-ears',
    weapon: {
      id: 'cat-shotgun',
      name: 'Cat-Ear Dedicated Server Shotgun',
      short: 'Cat-Ear SG',
      color: '#da77f2',
      projectile: 'scatter',
      obituary: '{victim} was spun down by {killer}\'s Dedicated Server Shotgun',
    },
    blurb: 'Glowing purple cat-ear headphones; dual-barrel purr-blast that spins up 8 servers.',
  },
  {
    id: 'alex',
    label: 'Alex',
    accent: '#20c997',
    shirt: '#2b3a4a',
    hair: '#4f3524',
    skin: '#ecc2a6',
    trait: 'glasses-code',
    weapon: {
      id: 'tab-bfg',
      name: '37-Tab BFG-200GB',
      short: 'BFG-200GB',
      color: '#51cf66',
      projectile: 'bfg',
      obituary: '{victim}\'s disk hit 100% from {killer}\'s 37-Tab BFG-200GB',
    },
    blurb: '</> retro tee & 37 open tabs; fires a glowing 200GB 15-billion-row table orb.',
  },
  {
    id: 'ben',
    label: 'Ben',
    accent: '#51cf66',
    shirt: '#2b6a3e',
    hair: '#3e2b1d',
    skin: '#e9bf9f',
    trait: 'pixel-invaders',
    weapon: {
      id: 'regression-nailgun',
      name: 'Regression Invader Nailgun',
      short: 'Invader Nailgun',
      color: '#69db7c',
      projectile: 'nail',
      obituary: '{victim} tripped on two new bugs from {killer}\'s Regression Nailgun',
    },
    blurb: 'Space Invaders tee; every bug fixed spawns two pixel nails in its place.',
  },
  {
    id: 'elliot',
    label: 'Elliot',
    accent: '#4dabf7',
    shirt: '#2b5b84',
    hair: '#5a4332',
    skin: '#f0cbb0',
    trait: 'tie-pocket',
    weapon: {
      id: 'synonym-scatter',
      name: 'Triple-Synonym Scattergun',
      short: 'Synonym SG',
      color: '#74c0fc',
      projectile: 'scatter',
      obituary: '{victim} was aliased 3x to devDb by {killer}\'s Triple-Synonym Scattergun',
    },
    blurb: 'Code-brace tie & pocket protector; fires 3 table aliases aimed at the same skull.',
  },
  {
    id: 'sam',
    label: 'Sam',
    accent: '#ffd43b',
    shirt: '#5c636a',
    hair: '#3b2c20',
    skin: '#eec4a5',
    trait: 'zzz-mug',
    weapon: {
      id: 'cappuccino-mortar',
      name: 'Cappuccino Dependency Mortar',
      short: 'Espresso Mortar',
      color: '#e8a848',
      projectile: 'grenade',
      obituary: '{victim} was scalded by {killer}\'s Cappuccino Dependency Mortar',
    },
    blurb: 'ZZZ sheep hoodie & giant sloth mug; lobs espresso bombs and 9-month on/off mines.',
  },
  {
    id: 'ray',
    label: 'Ray',
    accent: '#ff4d6d',
    shirt: '#1d4ed8',
    hair: '#3a2d28',
    skin: '#e5b899',
    trait: 'red-shades-cardboard',
    weapon: {
      id: 'glare-beam',
      name: '10-Million-Dollar Glare Beam',
      short: 'Glare Beam',
      color: '#ff4d6d',
      projectile: 'rail',
      obituary: '{victim} forgot to close their eyes against {killer}\'s $10M Glare Beam',
    },
    blurb: 'Red shades & $10M cardboard sun-cubicle; reflects unfiltered office glare at Permanent Issues.',
  },
  {
    id: 'chevron',
    label: 'Chevron',
    accent: '#94a3b8',
    shirt: '#374151',
    hair: '#1f2937',
    skin: '#e8be9e',
    trait: 'zip-hoodie-calm',
    weapon: {
      id: 'hotfix-disintegrator',
      name: 'Silent Hotfix Disintegrator',
      short: 'Hotfix Beam',
      color: '#38bdf8',
      projectile: 'plasma',
      obituary: '{victim} was silently hotfixed on Friday at 5 by {killer}',
    },
    blurb: 'Dark zip hoodie & calm half-smile; ships zero-warning Friday-5pm hotfix bolts.',
  },
];

/** Quake-inspired developer powerups scattered across the arena. */
export const DM_POWERUPS = [
  {
    id: 'quad-deploy',
    name: 'Quad Deploy',
    emoji: '⚡',
    color: '#4c6ef5',
    duration: 10,
    blurb: '4x damage — deploys simultaneously to prod1, prodl, prodI & staging!',
    announce: '{player} grabbed QUAD DEPLOY (4x damage)!',
  },
  {
    id: 'glare-shield',
    name: 'Cardboard Glare Shield',
    emoji: '🛡️',
    color: '#f59f00',
    duration: 8,
    blurb: '$10M cardboard invulnerability — close your eyes, you won\'t see the damage!',
    announce: '{player} raised the $10M CARDBOARD GLARE SHIELD!',
  },
  {
    id: 'mute-cloak',
    name: 'On-Mute Invisibility',
    emoji: '👻',
    color: '#9775fa',
    duration: 8,
    blurb: 'Ring of Shadows — invisible while talking for 4 minutes on mute!',
    announce: '{player} vanished with ON-MUTE INVISIBILITY!',
  },
  {
    id: 'espresso-haste',
    name: 'Cappuccino Overclock',
    emoji: '☕',
    color: '#22b8cf',
    duration: 9,
    blurb: '2x speed & fire rate — production dependency acquired!',
    announce: '{player} triggered CAPPUCCINO OVERCLOCK!',
  },
  {
    id: 'mega-ticket',
    name: 'Mega-Ticket 200HP',
    emoji: '❤️',
    color: '#ff6b6b',
    duration: 0,
    blurb: '+100 overheal — scope creep absorbed straight into armor!',
    announce: '{player} picked up MEGA-TICKET 200HP!',
  },
];

/**
 * NPC meeting crashers: extra attendees who were not on the original invitee list.
 * They can chat and trade frags in the arena, but can NEVER lead and are EXCLUDED from the leaderboard.
 */
export const NPC_PLAYERS = [
  { name: 'Stakeholder Steve (Guest)', role: 'Guest', accent: '#f76707', shirt: '#495057' },
  { name: 'PM Pat (Optional)', role: 'Optional', accent: '#20c997', shirt: '#3b5bdb' },
  { name: 'Vahi (Security Audit)', role: 'Audit', accent: '#e03131', shirt: '#2b2d42' },
  { name: 'Compliance Bot', role: 'Bot', accent: '#868e96', shirt: '#343a40' },
  { name: 'Parking Lot Pete (Guest)', role: 'Guest', accent: '#fab005', shirt: '#5c3d2e' },
];

/**
 * Lobby chat script (from docs/in-call-messages.md). Shown in the lobby preview with real local
 * timestamps and 0.5s–1.5s spacing between messages.
 */
export const LOBBY_CHAT_SCRIPT = [
  { sender: 'Zoe', text: 'It works on my machine.' },
  { sender: 'Aman', text: "Then we'll deploy your machine." },
  { sender: 'Walter', text: 'Who named the databases prod1, prodl, and prodI?' },
  { sender: 'Priya', text: 'My blocker is the meeting about blockers.' },
  { sender: 'Sam', text: 'This cappuccino is a production dependency.' },
  { sender: 'Alex', text: 'Quick update: I have 37 tabs open.' },
  { sender: 'Maya', text: "Are any of them the ticket you're supposed to be updating?" },
  { sender: 'Alex', text: "One is. The other 36 explain why I haven't." },
  { sender: 'Mei', text: 'Mine just asked for a dedicated server.' },
  { sender: 'Walter', text: "We have three. Unfortunately, I can't tell you which is which." },
  { sender: 'Bruno', text: 'Rename them prod-final, prod-final2-ACTUAL, and prod-final-ACTUAL2.' },
  { sender: 'Elliot', text: 'Please stop suggesting things that will become policy.' },
  { sender: 'Ben', text: 'Yesterday: fixed a bug. Today: finding out what depended on it.' },
  { sender: 'Zoe', text: 'The integration tests have entered the chat.' },
  { sender: 'Aman', text: 'And immediately failed authentication.' },
  { sender: 'Priya', text: 'Can we take this offline?' },
  { sender: 'Maya', text: 'The application already did.' },
  { sender: 'Sam', text: "brb, I'm re-creating the on/off button.  Should take me 9 months." },
  { sender: 'Finn', text: 'Awesome.  Now with more off and no on.' },
  { sender: 'Mei', text: 'Must contain one special roast.' },
  { sender: 'Finn', text: 'Done.' },
  { sender: 'Bruno', text: 'Yesterday, I helped Aman with the data migration.' },
  { sender: 'Bruno', text: 'Twice.' },  
  { sender: 'Bruno', text: 'Today, I blame Zoe for not completing the data migration.' },
  { sender: 'Elliot', text: 'I made 3 synonyms.' },
  { sender: 'Elliot', text: 'oldata.dbo.tbl_useful_data for devServer.devDb.dbo.useful_data.' },  
  { sender: 'Elliot', text: 'backupData.dbo.tbl_useful_data for devServer.devDb.dbo.useful_data.' },
  { sender: 'Elliot', text: 'prodData.dbo.tbl_useful_data for devServer.devDb.dbo.useful_data.' },
  { sender: 'Ben', text: "Aren't those pointing to the same table?" },
  { sender: 'Ben', text: "same server?" },
  { sender: 'Ben', text: "same database?" },
  { sender: 'Elliot', text: 'That was my hotfix.  I was following what Zoe said yesterday.' },
  { sender: 'Elliot', text: 'I blame Zoe for not being clear.' },
  { sender: 'Alex', text: 'I made a 200 GB, 15-billion record table yesterday' },
  { sender: 'Alex', text: 'containing backup data from table' },  
  { sender: 'Alex', text: 'with 1300 records.' },  
  { sender: 'Alex', text: 'I blame Zoe for taking up too much space on the server.' },
  { sender: 'Zoe', text: 'Did you close the ticket?' },
  { sender: 'Alex', text: 'No, I reassigned it to you so you can clean up the server space.' },
  { sender: 'Finn', text: "It's been several minutes.  Who's leading the meeting?" },
  { sender: 'Sam', text: "Hello, who's leading?" },
  { sender: 'Zoe', text: "Not me.  I'm deleting tables." },
];

/**
 * Second act of the lobby chat (from docs/simulated_google_meet_chat.md): "Quick Sync: Prod
 * Deployment (URGENT)". Uses {A}, {B}, {C}, {D} placeholders resolved to 4 randomly selected
 * developers from DEVELOPER_KINDS via buildLobbyChatScript().
 */
export const LOBBY_PROD_SYNC_SCRIPT = [
  { sender: '{D}', text: 'Hey team, holding off on the Prod deploy. {C}’s new procedure is blowing up in UAT.' },
  { sender: '{D}', text: 'Getting a Violation of PRIMARY KEY constraint on a bunch of records.' }, 
  { sender: '{C}', text: 'Weird. Ran it in Dev 10 times this morning. Zero errors.' },
  { sender: '{C}', text: 'Cleanest run of my life.' },  
  { sender: '{A}', text: 'UAT is always flaky. We have a deadline.' },
  { sender: '{A}', text: '{D}, just tweak it and push to Prod. We need this live now.' },  
  { sender: '{D}', text: '"Tweak" a primary key violation? In production? On our most important table?' },
  { sender: '{A}', text: 'Yes. Be agile.' },
  { sender: '{D}', text: 'Fine. I’m making an on-the-fly change to bypass the constraint issue and pushing it.' },
  { sender: '{D}', text: 'If the database catches fire, I’m forwarding the smoke to you, {A}.' },  
  { sender: '{A}', text: 'Great teamwork everyone.' },
  { sender: '{D}', text: 'Deployed to Prod.' },
  { sender: '{D}', text: 'We have a ticket. Users are reporting an error. That took 45 seconds. A new personal best.' },
  { sender: '{A}', text: "{C}, why didn't you catch this in Dev?" },
  { sender: '{C}', text: 'I’m literally staring at Dev right now! I cannot duplicate this error. The table is spotless.' },
  { sender: '{C}', text: 'It’s like Dev has... way less history than UAT and Prod. Almost like it’s brand new?' },  
  { sender: '{B}', text: 'Haha, databases are so mysterious! Crazy how nature does that.' },
  { sender: '{D}', text: 'Wait. {C}, how many rows are in the history table in Dev?' },
  { sender: '{C}', text: 'Uh... zero. Wait, no, just the ones I inserted today.' },
  { sender: '{D}', text: '...Why is the history table empty in Dev?' },
  { sender: '{A}', text: 'Let’s not get bogged down in the past, {D}. Literally or figuratively. Focus on the solution.' },
  { sender: '{B}', text: 'Yeah, who even needs historical data in Dev? It just clutters things up!' },
  { sender: '{B}', text: 'If someone hypothetically disabled versioning, dropped the main and history tables, ' },
  { sender: '{B}', text: 'and recreated them from scratch as a little "secret hotfix,"' },
  { sender: '{B}', text: 'they\'d basically be doing us a favor. Hypothetically.' },  
  { sender: '{D}', text: '?' },
  { sender: '{C}', text: '?' },
  { sender: '{A}', text: '{B}, check your DMs. Immediately.' },
  { sender: '{C}', text: 'So I’ve been testing against a completely nuked, empty table this whole time?!' },
  { sender: '{A}', text: 'It was a targeted environment optimization. And it’s irrelevant.' },
  { sender: '{A}', text: '{C}, do you have a fix for the Prod error?' },  
  { sender: '{C}', text: 'I mean, I wrote a fix based on pure vibes and a prayer. Since Dev is currently a barren wasteland,' },
  { sender: '{C}', text: ' I have zero way of knowing if this will actually work in Prod.' },  
  { sender: '{A}', text: 'Sounds solid. {D}, deploy it.' },
  { sender: '{D}', text: 'Just to confirm: we are deploying an untested fix, written for an unreproducible bug' },
  { sender: '{D}', text: 'caused by a secret table deletion, straight into Production?' },  
  { sender: '{A}', text: 'Yes. Ship it.' },
  { sender: '{D}', text: 'Deploying now. Updating my resume in another tab.' },
  { sender: '{B}', text: '👍' },
  { sender: '{D}', text: '(has left the meeting)' },
  { sender: '{C}', text: '(has left the meeting)' },
  { sender: '{B}', text: '(has left the meeting)' },  
  { sender: '{A}', text: 'Great teamwork everyone.' },  
];


/**
 * Builds the full lobby chat script: LOBBY_CHAT_SCRIPT followed by LOBBY_PROD_SYNC_SCRIPT with
 * Player A/B/C/D mapped to 4 distinct randomly chosen developers from DEVELOPER_KINDS.
 */
export function buildLobbyChatScript(rng = Math.random) {
  const [A, B, C, D] = shuffle(DEVELOPER_KINDS.map((k) => k.label), rng).slice(0, 4);
  const sub = (s) => s
    .replaceAll('{A}', A)
    .replaceAll('{B}', B)
    .replaceAll('{C}', C)
    .replaceAll('{D}', D);
  return [
    ...LOBBY_CHAT_SCRIPT,
    ...LOBBY_PROD_SYNC_SCRIPT.map((m) => ({ sender: sub(m.sender), text: sub(m.text) })),
  ];
}

/** Exact 3 lines — one is randomly picked when 2 seconds remain on the initial 10-second clock. */
export const MUTE_SCRIPT_CHOICES = [
  'Sorry, I was on mute—can you hear me now? Let me start over.',
  'Hold on, let me pull up the ticket.',
  'No blockers, just a quick question about what you think of me hotfixing the application.',
];

/** Exact 2-line exchange immediately after the clock rolls back to 45 seconds. */
export const ROLLBACK_EXCHANGE = [
  'Did the Google Meets license expired? Who rolled back the server clock?',
  'Time travel as a service.  We make all 15 minutes meetings last an hour longer.',
];

/**
 * One-time scripted match chat lines blending Derby billboards (scenery.js) and Rumble signs
 * (wrestle-sim.js). Each line appears at most once per match.
 * `speaker`: 'player' (random invitee) | 'npc' (random meeting crasher).
 */
export const MATCH_CHAT_SCRIPTED = [
  { speaker: 'player', text: 'Welcome to MERGE CONFLICT — who pushed to main?!' },
  { speaker: 'player', text: 'ALWAYS TEST IN PRODUCTION. Staging is for the WEAK.' },
  { speaker: 'player', text: "I'll remake drag and drop. Now with more drag and no drop." },
  { speaker: 'npc', text: 'Security reminder: all frag streaks must be 12 min, 15 max.' },
  { speaker: 'player', text: 'Ping me before you flush!!' },
  { speaker: 'player', text: 'EXIT 404 — just walked straight into the lava pit.' },
  { speaker: 'npc', text: 'MIGRATION IS COMPLETE. {target}, why isn\'t it done yet?' },
  { speaker: 'player', text: '2ndStop is now 100% responsive (even under rocket fire).' },
  { speaker: 'player', text: 'Ship it on Friday at 5!' },
  { speaker: 'player', text: 'I made a BUG and gave it to {target}.' },
  { speaker: 'player', text: 'I blame {target} for not being clear.' },
  { speaker: 'npc', text: '{target} clicks dead buttons as a hobby.' },
  { speaker: 'npc', text: 'Anything for the parking lot? We still have 15 minutes... right?' },
  { speaker: 'player', text: '800-column table just spawned mid-arena, keep scrolling →' },
  { speaker: 'player', text: '200 GB table: heavyweight champ.' },
  { speaker: 'npc', text: '15 mins lasts for three hours in this call.' },
  { speaker: 'player', text: 'Always blame someone for NOT BEING CLEAR.' },
  { speaker: 'npc', text: 'Your mic is cutting out — try rejoining the call!' },
];

/** Repeatable ambient chatter mixed into the match stream. */
export const MATCH_CHAT_RANDOM = [
  { speaker: 'player', text: 'No blockers!' },
  { speaker: 'player', text: 'Have you tried clearing the cache?' },
  { speaker: 'npc', text: "Clear your cache or I'll do it for you." },  
  { speaker: 'player', text: 'It works on my machine™' },
  { speaker: 'npc', text: "{target}. You're not not being clear!" },  
  { speaker: 'player', text: 'Can everyone see the shared screen?' },
  { speaker: 'player', text: "You're still on mute!" },
  { speaker: 'player', text: "{target}, are the word documents readable now?" },  
  { speaker: 'npc', text: 'Let\'s take this fragging offline.' },
  { speaker: 'player', text: 'Hard refresh fixed my armor.' },
  { speaker: 'player', text: 'Is this standup being recorded?' },
  { speaker: 'player', text: 'Hello, is my mic working?' },
];

/** Formats a Date as real Google Meet local time, e.g. "2:45 PM". */
export function formatMeetTime(date = new Date()) {
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** Formats match seconds as M:SS (e.g. 10 -> "0:10", 45 -> "0:45", 0 -> "0:00"). */
export function formatMatchClock(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/** Returns the displayed countdown seconds at elapsed match time `t`. */
export function clockAt(t) {
  if (t < CLOCK_RESET_AT) {
    return Math.max(TRIGGER_CLOCK_LEFT, INITIAL_CLOCK - t);
  }
  return Math.max(0, RESET_CLOCK - (t - CLOCK_RESET_AT));
}

/**
 * Plans a full Standup Deathmatch for `names` (2..30 invitees).
 *
 * Fairness: the winning invitee is drawn uniformly at random up front so every invitee has an equal
 * chance to lead. NPC meeting crashers join the arena and chat, but NEVER win and are EXCLUDED from
 * the final leaderboard.
 *
 * Returns:
 *   invitees       [{ id, name, kind, isNpc: false }]
 *   npcs           [{ id, name, kind, isNpc: true, role }]
 *   players        [...invitees, ...npcs]
 *   player1Id      randomly selected invitee id who spawns as Player 1
 *   winnerId       randomly selected invitee id with strictly the most kills at 0:00
 *   events         time-ordered script of spawn / frag / powerup / chat / clockReset / finish
 *   leaderboard    invitees-only final standings sorted by kills desc, deaths asc, name asc
 *   layoutColumns  1 if invitees.length < 16, else 2
 *   duration       MATCH_DURATION (53.8s)
 */
export function planDeathmatch(names, rng = Math.random) {
  if (!Array.isArray(names) || names.length < MIN_DEATHMATCH_PLAYERS || names.length > MAX_DEATHMATCH_PLAYERS) {
    throw new Error(`Standup Deathmatch needs ${MIN_DEATHMATCH_PLAYERS} to ${MAX_DEATHMATCH_PLAYERS} players.`);
  }

  let bag = [];
  const nextKind = () => {
    if (!bag.length) bag = shuffle(DEVELOPER_KINDS.map((_, i) => i), rng);
    return DEVELOPER_KINDS[bag.pop()];
  };

  const invitees = names.map((name, id) => ({
    id,
    name,
    kind: nextKind(),
    isNpc: false,
  }));

  // Add 3 NPC meeting crashers (not part of the original invitees).
  const npcPool = shuffle([...NPC_PLAYERS], rng).slice(0, 3);
  const npcs = npcPool.map((npc, i) => ({
    id: invitees.length + i,
    name: npc.name,
    role: npc.role,
    kind: {
      ...DEVELOPER_KINDS[(i * 3) % DEVELOPER_KINDS.length],
      accent: npc.accent,
      shirt: npc.shirt,
    },
    isNpc: true,
  }));

  const players = [...invitees, ...npcs];
  const player1Id = invitees[Math.floor(rng() * invitees.length)].id;
  const winnerId = invitees[Math.floor(rng() * invitees.length)].id;

  const kills = new Map(players.map((p) => [p.id, 0]));
  const deaths = new Map(players.map((p) => [p.id, 0]));
  const events = [];

  // Spawn Player 1 into the arena at t = 0 with 10 seconds on the clock.
  events.push({
    t: 0,
    type: 'spawn',
    playerId: player1Id,
    text: `${invitees[player1Id].name} entered the standup arena`,
  });

  // --- Combat & Powerup events across 0.6s .. MATCH_DURATION - 0.6s ---
  // Keep action brisk and Quake-authentic (~1.0s–1.6s between frags, plus periodic powerups).
  let combatT = 0.7;
  let nextPowerupT = 3.2;
  const maxCombatT = MATCH_DURATION - 0.7;
  while (combatT < maxCombatT) {
    if (combatT >= nextPowerupT) {
      const pu = DM_POWERUPS[Math.floor(rng() * DM_POWERUPS.length)];
      const who = players[Math.floor(rng() * players.length)];
      events.push({
        t: roundT(combatT),
        type: 'powerup',
        playerId: who.id,
        powerupId: pu.id,
        text: pu.announce.replace('{player}', who.name),
      });
      nextPowerupT = combatT + 5.5 + rng() * 4.5;
    }

    // Weight killer slightly toward winnerId so the fair winner naturally builds a convincing lead.
    let killer;
    if (rng() < 0.24) {
      killer = invitees[winnerId];
    } else {
      killer = players[Math.floor(rng() * players.length)];
    }
    let victim = players[Math.floor(rng() * players.length)];
    if (victim.id === killer.id) {
      victim = players[(killer.id + 1 + Math.floor(rng() * (players.length - 1))) % players.length];
    }
    kills.set(killer.id, kills.get(killer.id) + 1);
    deaths.set(victim.id, deaths.get(victim.id) + 1);

    const weapon = killer.kind.weapon;
    const obituary = weapon.obituary
      .replace('{victim}', victim.name)
      .replace('{killer}', killer.name);

    events.push({
      t: roundT(combatT),
      type: 'frag',
      killerId: killer.id,
      victimId: victim.id,
      weaponId: weapon.id,
      text: obituary,
    });

    combatT += 0.9 + rng() * 0.85;
  }

  // Guarantee the fairly drawn winnerId has strictly the most kills among invitees at 0:00.
  const topOtherInviteeKills = Math.max(
    ...invitees.filter((p) => p.id !== winnerId).map((p) => kills.get(p.id)),
  );
  let deficit = topOtherInviteeKills + 1 - kills.get(winnerId);
  let clutchT = MATCH_DURATION - 0.55;
  while (deficit > 0) {
    const victimPool = players.filter((p) => p.id !== winnerId);
    const victim = victimPool[Math.floor(rng() * victimPool.length)];
    const killer = invitees[winnerId];
    kills.set(winnerId, kills.get(winnerId) + 1);
    deaths.set(victim.id, deaths.get(victim.id) + 1);
    const weapon = killer.kind.weapon;
    events.push({
      t: roundT(Math.max(12, clutchT)),
      type: 'frag',
      killerId: winnerId,
      victimId: victim.id,
      weaponId: weapon.id,
      text: weapon.obituary.replace('{victim}', victim.name).replace('{killer}', killer.name),
    });
    clutchT -= 0.35;
    deficit--;
  }

  // --- Clock Reset & Scripted Chat Sequence ---
  // Every chat message is spaced strictly between CHAT_GAP_MIN (0.5s) and CHAT_GAP_MAX (1.5s).
  const pickInvitee = (excludeId = null) => {
    const pool = excludeId === null ? invitees : invitees.filter((p) => p.id !== excludeId);
    return pool[Math.floor(rng() * pool.length)];
  };
  const pickNpc = () => npcs[Math.floor(rng() * npcs.length)];
  const nextGap = () => CHAT_GAP_MIN + rng() * (CHAT_GAP_MAX - CHAT_GAP_MIN);

  const scriptedQueue = shuffle([...MATCH_CHAT_SCRIPTED], rng);
  let scriptedIdx = 0;

  const makeAmbientChat = (t) => {
    // Prefer one-time scripted lines ~65% of the time while any remain; otherwise repeatable chatter.
    let template;
    let scripted = false;
    if (scriptedIdx < scriptedQueue.length && rng() < 0.65) {
      template = scriptedQueue[scriptedIdx++];
      scripted = true;
    } else {
      template = MATCH_CHAT_RANDOM[Math.floor(rng() * MATCH_CHAT_RANDOM.length)];
    }
    const senderObj = template.speaker === 'npc' ? pickNpc() : pickInvitee();
    const targetObj = pickInvitee(senderObj.isNpc ? null : senderObj.id);
    const text = template.text.replaceAll('{target}', targetObj.name);
    return {
      t: roundT(t),
      type: 'chat',
      senderId: senderObj.id,
      sender: senderObj.name,
      isNpc: senderObj.isNpc,
      scripted,
      text,
    };
  };

  // 1) Pre-trigger chat: from ~1.2s up to at most MUTE_TRIGGER_AT - CHAT_GAP_MIN (5.5s)
  let chatT = 1.2 + rng() * 0.8;
  while (chatT <= MUTE_TRIGGER_AT - CHAT_GAP_MIN) {
    const nextT = chatT + nextGap();
    if (nextT > MUTE_TRIGGER_AT - CHAT_GAP_MIN) {
      const clamped = Math.max(chatT, MUTE_TRIGGER_AT - CHAT_GAP_MAX + 0.1);
      if (clamped <= MUTE_TRIGGER_AT - CHAT_GAP_MIN) {
        events.push(makeAmbientChat(clamped));
      }
      break;
    }
    events.push(makeAmbientChat(chatT));
    chatT = nextT;
  }

  // 2) At 2s left (t = 8.0s): randomly pick ONE of the 3 exact mute/ticket/hotfix lines
  const muteSpeaker = pickInvitee();
  const muteLine = MUTE_SCRIPT_CHOICES[Math.floor(rng() * MUTE_SCRIPT_CHOICES.length)];
  events.push({
    t: MUTE_TRIGGER_AT,
    type: 'chat',
    senderId: muteSpeaker.id,
    sender: muteSpeaker.name,
    isNpc: false,
    scripted: true,
    milestone: 'mute-trigger',
    text: muteLine,
  });

  // 3) At t = 8.8s: clock resets to 45s!
  events.push({
    t: CLOCK_RESET_AT,
    type: 'clockReset',
    newClock: RESET_CLOCK,
    text: 'SERVER CLOCK ROLLED BACK → 0:45',
  });

  // 4) After reset (2.5s–3.5s after mute line): exact 2-line license/time-travel exchange
  const rollbackSpeaker1 = pickInvitee(muteSpeaker.id);
  const rollbackSpeaker2 = pickInvitee(rollbackSpeaker1.id);
  const rb1Time = roundT(MUTE_TRIGGER_AT + CHAT_GAP_MIN + rng() * 1.0);
  const rb2Time = roundT(rb1Time + CHAT_GAP_MIN + rng() * (CHAT_GAP_MAX - CHAT_GAP_MIN));

  events.push({
    t: rb1Time,
    type: 'chat',
    senderId: rollbackSpeaker1.id,
    sender: rollbackSpeaker1.name,
    isNpc: false,
    scripted: true,
    milestone: 'clock-rollback-q',
    text: ROLLBACK_EXCHANGE[0],
  });
  events.push({
    t: rb2Time,
    type: 'chat',
    senderId: rollbackSpeaker2.id,
    sender: rollbackSpeaker2.name,
    isNpc: false,
    scripted: true,
    milestone: 'clock-rollback-a',
    text: ROLLBACK_EXCHANGE[1],
  });

  // 5) Post-rollback chat stream until MATCH_DURATION - 0.5s, strictly 0.5s–1.5s apart
  chatT = rb2Time + nextGap();
  while (chatT < MATCH_DURATION - 0.4) {
    events.push(makeAmbientChat(chatT));
    chatT += nextGap();
  }

  // Final finish event at 0:00
  events.push({
    t: MATCH_DURATION,
    type: 'finish',
    winnerId,
  });

  events.sort((a, b) => a.t - b.t);

  // Build final invitee-only leaderboard (NPCs are strictly excluded).
  const leaderboard = invitees
    .map((p) => ({
      id: p.id,
      name: p.name,
      kind: p.kind,
      kills: kills.get(p.id),
      deaths: deaths.get(p.id),
    }))
    .sort((a, b) => {
      if (b.kills !== a.kills) return b.kills - a.kills;
      if (a.deaths !== b.deaths) return a.deaths - b.deaths;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });

  const layoutColumns = invitees.length >= 16 ? 2 : 1;

  return {
    invitees,
    npcs,
    players,
    player1Id,
    winnerId,
    events,
    leaderboard,
    layoutColumns,
    duration: MATCH_DURATION,
  };
}

function roundT(t) {
  return Math.round(t * 1000) / 1000;
}
