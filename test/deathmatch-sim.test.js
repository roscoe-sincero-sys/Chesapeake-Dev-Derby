import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from '../public/js/sim.js';
import {
  DEVELOPER_KINDS,
  DM_POWERUPS,
  NPC_PLAYERS,
  LOBBY_CHAT_SCRIPT,
  LOBBY_PROD_SYNC_SCRIPT,
  buildLobbyChatScript,
  MUTE_SCRIPT_CHOICES,
  ROLLBACK_EXCHANGE,
  INITIAL_CLOCK,
  MUTE_TRIGGER_AT,
  CLOCK_RESET_AT,
  RESET_CLOCK,
  MATCH_DURATION,
  CHAT_GAP_MIN,
  CHAT_GAP_MAX,
  clockAt,
  formatMatchClock,
  formatMeetTime,
  planDeathmatch,
} from '../public/js/deathmatch-sim.js';

const TEAM_12 = ['Ada', 'Grace', 'Linus', 'Hedy', 'Barbara', 'Ken', 'Alan', 'Margaret', 'Donald', 'Tim', 'Edsger', 'Frances'];
const TEAM_18 = [...TEAM_12, 'Niklaus', 'Bjarne', 'Guido', 'Yukihiro', 'Brendan', 'Anders'];

test('has exactly 14 distinct developers with unique signature weapons and Quake powerups', () => {
  assert.equal(DEVELOPER_KINDS.length, 14);
  assert.equal(new Set(DEVELOPER_KINDS.map((d) => d.id)).size, 14);
  assert.equal(new Set(DEVELOPER_KINDS.map((d) => d.weapon.id)).size, 14);
  assert.ok(DEVELOPER_KINDS.some((d) => d.id === 'chevron'));
  assert.ok(DEVELOPER_KINDS.some((d) => d.id === 'ray'));
  assert.ok(DM_POWERUPS.length >= 5);
  assert.ok(NPC_PLAYERS.length >= 3);
  assert.ok(LOBBY_CHAT_SCRIPT.length >= 25);
});

test('clock ticks 0:10 -> 0:02, resets to 0:45, and counts down to 0:00', () => {
  assert.equal(formatMatchClock(clockAt(0)), '0:10');
  assert.equal(formatMatchClock(clockAt(MUTE_TRIGGER_AT)), '0:02');
  assert.equal(formatMatchClock(clockAt(CLOCK_RESET_AT)), '0:45');
  assert.equal(formatMatchClock(clockAt(MATCH_DURATION)), '0:00');
  assert.equal(INITIAL_CLOCK, 10);
  assert.equal(RESET_CLOCK, 45);
  assert.match(formatMeetTime(new Date(2026, 10, 21, 14, 5)), /\d{1,2}:05/);
});

test('planDeathmatch spawns random Player 1, plays exact mute -> rollback -> time-travel script, and paces chat 0.5s-1.5s', () => {
  const plan = planDeathmatch(TEAM_12, mulberry32(1337));
  assert.ok(plan.player1Id >= 0 && plan.player1Id < TEAM_12.length);
  assert.equal(plan.events[0].type, 'spawn');
  assert.equal(plan.events[0].playerId, plan.player1Id);

  const muteEv = plan.events.find((e) => e.milestone === 'mute-trigger');
  assert.ok(muteEv, 'has mute-trigger chat at 2s left');
  assert.equal(muteEv.t, MUTE_TRIGGER_AT);
  assert.ok(MUTE_SCRIPT_CHOICES.includes(muteEv.text), `unexpected mute line: ${muteEv.text}`);

  const resetEv = plan.events.find((e) => e.type === 'clockReset');
  assert.ok(resetEv, 'has clockReset event');
  assert.equal(resetEv.t, CLOCK_RESET_AT);
  assert.equal(resetEv.newClock, 45);

  const rbQ = plan.events.find((e) => e.milestone === 'clock-rollback-q');
  const rbA = plan.events.find((e) => e.milestone === 'clock-rollback-a');
  assert.ok(rbQ && rbA, 'has rollback Q&A exchange');
  assert.equal(rbQ.text, ROLLBACK_EXCHANGE[0]);
  assert.equal(rbA.text, ROLLBACK_EXCHANGE[1]);
  assert.ok(rbQ.t > resetEv.t, 'rollback Q follows clock reset');
  assert.ok(rbA.t > rbQ.t, 'rollback A follows rollback Q');
  assert.notEqual(rbQ.senderId, rbA.senderId, 'two different players speak the rollback exchange');

  // Every consecutive chat message is spaced 2.5s to 4.5s apart
  const chats = plan.events.filter((e) => e.type === 'chat');
  assert.ok(chats.length >= 12);
  for (let i = 1; i < chats.length; i++) {
    const gap = chats[i].t - chats[i - 1].t;
    assert.ok(gap >= CHAT_GAP_MIN - 0.01 && gap <= CHAT_GAP_MAX + 0.01, `chat gap ${i}: ${gap.toFixed(3)}s out of [${CHAT_GAP_MIN}, ${CHAT_GAP_MAX}]`);
  }

  // Scripted-once lines never repeat in a single match, and no raw {target} placeholders leak
  const scriptedTexts = chats.filter((c) => c.scripted && !c.milestone).map((c) => c.text);
  assert.equal(new Set(scriptedTexts).size, scriptedTexts.length, 'one-time scripted lines appear at most once');
  for (const c of chats) assert.ok(!c.text.includes('{target}'), `unreplaced {target} in "${c.text}"`);
});

test('leaderboard excludes NPCs, crowns strictly #1 invitee, and uses 1-col (<16) vs 2-col (>=16)', () => {
  const small = planDeathmatch(TEAM_12, mulberry32(42));
  assert.equal(small.layoutColumns, 1);
  assert.equal(small.leaderboard.length, TEAM_12.length);
  const npcNames = new Set(small.npcs.map((n) => n.name));
  for (const row of small.leaderboard) {
    assert.ok(!npcNames.has(row.name), `NPC ${row.name} must not appear on leaderboard`);
  }
  assert.equal(small.leaderboard[0].id, small.winnerId);
  assert.ok(small.leaderboard[0].kills > small.leaderboard[1].kills, 'winner has strictly most kills');

  const large = planDeathmatch(TEAM_18, mulberry32(99));
  assert.equal(large.layoutColumns, 2);
  assert.equal(large.leaderboard.length, TEAM_18.length);
  assert.equal(large.leaderboard[0].id, large.winnerId);
});

test('planDeathmatch rejects invalid player counts', () => {
  assert.throws(() => planDeathmatch(['Solo']));
  assert.throws(() => planDeathmatch(Array.from({ length: 31 }, (_, i) => `Dev ${i}`)));
});

test('buildLobbyChatScript appends Prod Deployment sync with 4 distinct random developers from DEVELOPER_KINDS', () => {
  const script = buildLobbyChatScript(mulberry32(2026));
  assert.equal(script.length, LOBBY_CHAT_SCRIPT.length + LOBBY_PROD_SYNC_SCRIPT.length);
  const devNames = new Set(DEVELOPER_KINDS.map((d) => d.label));
  const act2 = script.slice(LOBBY_CHAT_SCRIPT.length);
  const cast = new Set(act2.map((m) => m.sender));
  assert.equal(cast.size, 4, 'exactly 4 distinct developers cast as Players A-D');
  for (const name of cast) assert.ok(devNames.has(name), `${name} is one of the 14 developers`);
  for (const m of act2) {
    assert.doesNotMatch(m.sender, /\{[ABCD]\}|Player [ABCD]/);
    assert.doesNotMatch(m.text, /\{[ABCD]\}|Player [ABCD]/);
  }
});
