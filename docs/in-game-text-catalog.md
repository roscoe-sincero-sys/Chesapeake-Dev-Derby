# Chesapeake Dev Derby — In-Game Text, Pop-ups & Signs Catalog

A master reference of all existing billboards, crowd signs, chat lines, obituaries, elimination pop-ups, and arcade plaques across the codebase (`public/js/` and `docs/`), followed by a curated bank of cross-mode text ideas ready to reuse in any game mode.

---

## Part 1 — Existing Text Across the Codebase

### 1. Derby Race — Roadside Billboards (`public/js/scenery.js`)
- `Welcome to / MERGECONFLICTSTAN`
- `EXIT 404 / Not Found`
- `It works on / my machine™`
- `Ping me before you flush / via webhook`
- `crabs && code / || nothing`
- `LICENSE EXPIRED? / Let's roll back / the server clock.`
- `git commit -m / "final_FINAL_v2"`
- `I'll remake drag and drop. / Now with more drag / and no drop.`
- `Have you tried / clearing the cache?`
- `HOTFIX an imaginary bug. / Blame someone for / NOT BEING CLEAR`
- `The Old Line State / localhost:4100`
- `ALWAYS TEST IN PRODUCTION. / Staging is for the WEAK.`
- `Time travel as a service / We change server clocks / everywhere.`
- `z-index: / 999999 !important`
- `MIGRATION COMPLETE. / Why isn't it done?`
- `2ndStop / now 100% responsive`
- `Security. / 12 min. 15 max characters. / Toughness has its limits.`
- `Ship it / on Friday at 5`

### 2. Derby Race — Obstacle Signs & Item Feed Pop-ups (`public/js/obstacles.js`, `public/js/hud.js`)
- **Track Signs:** `404`, `href="???"`, `<<<<<<< HEAD / speed = fast; / ======= / speed = faster; / >>>>>>> main`, `∞ scroll`, `LOADING… / ▓▓▓▓▓▓▓░ 99%`, `SSL Expired`, `DO NOT MODIFY URLS`, `BULK LOAD IN PROGRESS`, `TRUNCATE TABLE ✂️`
- **Item / Status Quips:**
  - `“You Are Not Being Clear” — “It's your fault.”`
  - `200GB Table — “You're wasting disk space.”`
  - `Eight-Minute Audit — “Access limited pending audit.”`
  - `Production Roulette — “Oops. That was pr0dI.”`
  - `Security Theater — “Vahi says you're going too fast.”`
  - `Renewed Certificate — sailed through SSL Expired`
  - `?returnUrl= — used to pass DO NOT MODIFY URLS`
  - `cannot read properties of null` / `your connection is not private`

### 3. Let’s Rumble — Crowd Signs (`public/js/wrestle-sim.js` & `public/js/sign-variants.js`)
- `{PLAYER} / FAN CLUB`
- `HANUMAN WAS HERE`
- `I blame / {player} / for not being clear.`
- `15 mins lasts / for / three hours`
- `I CAME FOR THE 15-MINUTE MEETING`
- `{player} / clicks dead buttons / as a hobby.`
- `I made a BUG / I gave it to / {player}`
- `I’m just here to say “NO BLOCKERS”`
- `WE HAVE 2 MINUTES LEFT. WHO’S LEADING?`
- `ANYTHING for the PARKING LOT?`
- `LET'S ROLL BACK THE CLOCK!`
- `DRAG & DROP 2.0 / THE ONLY WORKING DROP / IS A BODY SLAM`
- `800-COLUMN TABLE / KEEP SCROLLING →`
- `200 GB. TABLE / HEAVYWEIGHT CHAMP.`
- `WEIGHT CLASS / 12–15 CHARS / ONLY!`
- **Local-only Easter-egg variants (`sign-variants.js`):**
  - `I blame / Megha again for / not being clear.`
  - `Let's Watch Paul / click dead buttons`
  - `Can you hear me? / I can't hear you / Can you hear me?`
  - `I order all wrestlers / must weigh / 12 to 15 chars only!`

### 4. Standup Deathmatch — Chat, Obituaries & Props (`public/js/deathmatch-sim.js`, `deathmatch-avatars.js`, `docs/`)
- **Clock-Rollback Script (at 0:02 → 0:45):**
  - `"Sorry, I was on mute—can you hear me now? Let me start over."`
  - `"Hold on, let me pull up the ticket."`
  - `"No blockers, just a quick question about what you think of me hotfixing the application."`
  - `"Did the Google Meets license expired? Who rolled back the server clock?"`
  - `"Time travel as a service.  We make all 15 minutes meetings last an hour longer."`
- **Match Chat (Scripted Once & Random Repeatable):**
  - `Welcome to MERGECONFLICTSTAN — who pushed to main?!`
  - `ALWAYS TEST IN PRODUCTION. Staging is for the WEAK.`
  - `I'll remake drag and drop. Now with more drag and no drop.`
  - `Security reminder: all frag streaks must be 12 min, 15 max characters.`
  - `z-index: 999999 !important — why is that rocket still on top of my screen?!`
  - `Ping me before you flush via webhook!`
  - `EXIT 404 — just walked straight into the lava pit.`
  - `MIGRATION COMPLETE. Why isn't it done yet?`
  - `2ndStop is now 100% responsive (even under rocket fire).`
  - `Ship it on Friday at 5!`
  - `I made a BUG and gave it to {target}.`
  - `I blame {target} for not being clear.`
  - `{target} clicks dead buttons as a hobby.`
  - `{target}. You're not not being clear!`
  - `{target}, are the word documents readable now?`
  - `Clear your cache or I'll do it for you.`
  - `Anything for the parking lot? We still have 15 minutes... right?`
  - `I came for the 15-minute meeting, why is there a BFG in the hallway?`
  - `800-column table just spawned mid-arena, keep scrolling →`
  - `200 GB table: heavyweight champ.`
  - `Close your eyes, you won't see the glare.` / `10 million, best money can buy.`
  - `15 mins lasts for three hours in this call.`
  - `Always blame someone for NOT BEING CLEAR.`
  - `No blockers!` / `Have you tried clearing the cache?` / `It works on my machine™`
  - `Can everyone see the shared screen?` / `You're still on mute!`
  - `Let's take this fragging offline.` / `Hard refresh fixed my armor.`
  - `Is this standup being recorded?` / `Hello, is my mic working?`
- **Lobby Chat Highlights (`docs/in-call-messages.md` & `docs/simulated_google_meet_chat.md`):**
  - `Who named the databases prod1, prodl, and prodI?`
  - `My blocker is the meeting about blockers.`
  - `This cappuccino is a production dependency.`
  - `Quick update: I have 37 tabs open.` / `One is. The other 36 explain why I haven't.`
  - `Rename them prod-final, prod-final2-ACTUAL, and prod-final-ACTUAL2.`
  - `Please stop suggesting things that will become policy.`
  - `Yesterday: fixed a bug. Today: finding out what depended on it.`
  - `The integration tests have entered the chat. / And immediately failed authentication.`
  - `brb, I'm re-creating the on/off button. Should take me 9 months. / Now with more off and no on.`
  - `Not me. I'm deleting tables.`
  - `Yes. Be agile.` / `Great teamwork everyone.` / `It was a targeted environment optimization.`
  - `I wrote a fix based on pure vibes and a prayer.` / `Deploying now. Updating my resume in another tab.`
- **13th Dev (Ray) Cardboard Cubicle Signs (`deathmatch-avatars.js`):**
  - `10 MILLION, BEST MONEY CAN BUY`
  - `CLOSE YOUR EYES, YOU WON'T SEE THE GLARE`
  - `Permanent Issues: Last 5 Years` (from `docs/Deathmatch-13th.png`)
- **Powerup Banners (`deathmatch-sim.js`):**
  - `QUAD DEPLOY (4x damage)!` / `$10M CARDBOARD GLARE SHIELD!` / `ON-MUTE INVISIBILITY!` / `CAPPUCCINO OVERCLOCK!` / `MEGA-TICKET 200HP!`

### 5. The Claw of Destiny (`public/js/claw-sim.js`, `public/js/claw.js`)
- **Cabinet Plaques:** `STANDUP-O-MATIC`, `THE ALGORITHM`, `THE STANDUP`, `INSERT STORY POINTS`, `VIP LOUNGE`
- **Decoy Slip & Weak-Grip Pop-ups:**
  - *Immediate slip:* `Blocked by Common Sense`, `In another meeting`, `SSL Certs Expired`
  - *Mid-air tumble:* `Was not clear`, `Had URL Modified`
  - *Rim bounce:* `Testing in production`, `Rolling back server clock`, `Busy scrolling 800 columns`
  - *Weak arcade grip:* `500 Internal Server Error`

### 6. Kanban Plinko (`public/js/plinko-sim.js`, `public/js/plinko.js`)
- **Swimlane Headers:** `1 · THE BACKLOG`, `2 · IN PROGRESS`, `3 · CODE REVIEW & QA`, `4 · DEPLOY TO PROD`, `PROD · LEAD STANDUP`
- **Event & Ticker Pop-ups:**
  - `🚀 Sprint Kickoff! Trapdoor open!`
  - `🏝️ {name} was voted off the team.`
  - `🌀 {name} was Moved to Next Sprint!`
  - `⚡ Friday 4:55 PM Deploy — Force-pushing to Prod!`
  - `🚂 {name} advanced to Stage / Prod (Lap X/Y)!`

### 7. Code Freeze (`public/js/freeze-sim.js`, `public/js/freeze.js`)
- **Status Banners & Checkpoints:** `🟢 SPRINT OPEN`, `🟡 PR IN REVIEW`, `🔴 CODE FREEZE!`, `RELEASE MANAGER`, `STAGING`, `UAT`
- **Elimination Pop-ups:**
  - `Blamed for not being clear!`
  - `Made secret hotfixes!`
  - `Added ?ReturnUrl= to all URLs.`
  - `Created four 800-columns tables.`
  - `Rolled back the server clock!`
  - `Voted off the team!`
- **Cycle Alerts:** `⚡ PR Approved! False alarm — keep sprinting!`, `🚨 Emergency Deploy! Full sprint to finish!`

### 8. Shared Lobby Chyron (`public/js/chyron.js`)
- `ON GRID` · `{N} racers idling on the Standup Bay Bridge.`
- `RING LIVE` · `{N} wrestlers warming up for the battle royal.`
- `UP NEXT` · `{mode} — {N} players ready.`
- `UNDERDOG` · `{name} has yet to lead a meeting — could today be the day?` / `{name} hasn’t led in {N} picks.`
- `COOLDOWN` · `{name} won last — sits out 3 picks.`

---

## Part 2 — Potential New Text Bank (Ready for Pop-ups, Signs & Chat)

Short, punchy lines written to match the Chesapeake Dev Derby universe (usable in billboards, crowd signs, claw excuses, plinko warp pipes, code-freeze zaps, or deathmatch chat).

### Standup & Meeting Humor
- `This could have been a Slack message.`
- `Quick question (45 minutes later…)`
- `Let's circle back in the next sprint.`
- `Putting that in the parking lot forever.`
- `Can you see my screen? No, the OTHER screen.`
- `Sorry, double-booked for a sync about this sync.`
- `No blockers — just a 9-month button rewrite.`
- `Who's sharing? Nobody? Cool, silence it is.`
- `{target} is still talking on mute.`
- `{target} rescheduled standup for 4:59 PM Friday.`

### Production, Databases & Hotfixes
- `Targeted environment optimization (dropped the table).`
- `Fixed on pure vibes and a prayer.`
- `3 synonyms, 1 table, zero regrets.`
- `Deployed to prodI instead of prod1.`
- `Dev is spotless because Dev is empty.`
- `Primary key violation? Just be agile.`
- `Updating my resume in another tab.`
- `45 seconds to P1 — new personal best!`
- `Backed up 1,300 rows into 200 GB.`
- `Who disabled table versioning in Dev?!`

### Git, PRs & CI/CD
- `LGTM (didn't read a single line).`
- `Force-pushed straight over main.`
- `Works on localhost, ship the laptop.`
- `Build failed on whitespace.`
- `Rebased into another dimension.`
- `127 files changed (+1, -1).`
- `Integration tests failed authentication again.`
- `Merged without QA — pray for Prod.`
- `{target} approved their own PR.`
- `{target} committed node_modules.`

### UI, Tables, URLs & Security
- `More drag, zero drop.`
- `Now with more off and no on.`
- `Password must be 12–15 chars and contain 1 roast.`
- `Scrolling column 799 of 800…`
- `Modified a URL — straight to the error pit.`
- `Cleared cache, broke everything else.`
- `37 tabs open, none of them the ticket.`
- `Word doc still unreadable.`
- `Close your eyes, you won't see the bug.`
- `Permanent Issues: Last 5 Years (trending up!).`
