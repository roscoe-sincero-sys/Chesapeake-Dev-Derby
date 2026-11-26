# Changelog

All notable changes to Chesapeake Dev Derby are recorded here. The project uses
[semantic versioning](https://semver.org/): **MAJOR**.**MINOR**.**PATCH**. The version lives in
`package.json` and is shown next to the app's name in the lobby. See *Versioning* in the README for how
to release.

## [1.17.0] - 2026-11-26

Interactive Derby Race **"LICENSE EXPIRED?"** billboard video pop-up Easter egg, GitHub Pages demo `three.core.js` bundling fix, and game modes documentation guide.

### Added
- **Derby Race "LICENSE EXPIRED?" Billboard Easter Egg (PR #157):** Made the roadside `"LICENSE EXPIRED?"` billboard clickable via 3D raycasting (`public/js/scenery.js`, `public/js/game.js`) with pointer hover feedback. Clicking it pauses the Derby and opens a `1024×576` modal pop-up (`#license-dialog`) playing `public/assets/easterEggs/softwareLicenceMeeting.mp4` in a continuous loop until the user clicks the upper-right `✕` button (or presses `Escape`) to return to the Derby.
- **MP4 & HTTP Range Support (`server.js`, `test/server.test.js`):** Added `.mp4` (`video/mp4`) MIME mapping and HTTP `Range` (`206 Partial Content` / `416`) support in `serveFile()` for smooth video playback and looping, plus a headless browser verification test (`test/license-easter-egg-browser.test.js`).

### Fixed
- **GitHub Pages Demo Build (PR #156):** Bundled `three.core.js` alongside `three.module.js` in `scripts/build-demo.mjs` as required by `three@0.187.0`.

### Documentation
- **Game Modes Guide (PR #155):** Moved individual game mode descriptions out of `README.md` into `docs/game-modes.md`.

## [1.16.1] - 2026-11-23

Security hardening patch release resolving 7 security audit findings (`#64`, `#65`, `#66`, `#143`, `#144`, `#145`, `#146`) plus dependency and CI action updates.

### Security
- **Stored XSS fix (`#143`):** Switched `Hud.note()` in `public/js/hud.js` to render plain text via `el.textContent` (`lineText()`) by default, restricting HTML rendering to `Hud.noteHtml()` for pre-escaped Wrestle callers.
- **Unicode & control character sanitization (`#64`):** Normalized roster names to NFC and stripped invisible format/control characters (`\p{Cf}`, `\p{Cc}`, bidi overrides, ZWSP, NUL) in `parseNames()`, `validateRoster()`, and `nameKey()`.
- **Resilient winner saving (`#65`):** Wrote `winners.json` before reading `history.json`, quarantined unreadable `history.json` to `history.json.corrupt-<timestamp>`, and surfaced recovery warnings in the lobby and Full History page.
- **Server, CSP & launcher hardening (`#66`, `#146`):** Returned `400` on malformed URL escapes, removed absolute filesystem paths from client-facing error responses, added `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, and LF-normalized SHA-256 `Content-Security-Policy` headers, capped concurrent `/api/session` SSE streams (`429`), enforced `Sec-Fetch-Site` on read `/api/*` routes, switched browser launch from `exec()` to `execFile()`, switched `start.cmd` to `npm ci --no-audit --no-fund`, and switched default unseeded RNG to `crypto.getRandomValues()`.
- **Client query validation & debug gating (`#144`):** Normalized/clamped all 20 URL duration/speed overrides (`clampSpeedScale`, `queryDurationOverride`) and gated `?test` / `window.derbyTest` behind `!DEMO`.
- **CI/CD supply-chain hardening (`#145`):** Scoped `pages: write` and `id-token: write` to the `deploy` job only, pinned all 5 GitHub Actions in `.github/workflows/pages.yml` to verified 40-char commit SHAs, and added `.github/dependabot.yml`.

### Dependencies
- Updated `three` from `0.170.0` to `0.187.0` (PR #153) and updated pinned GitHub Actions (`actions/checkout`, `actions/setup-node`, `actions/configure-pages`, `actions/upload-pages-artifact`, `actions/deploy-pages`; PRs #148–#152).

## [1.16.0] - 2026-11-23

6 new 3D game modes — **Ddakji Flip-Out**, **Nōkabe Wall Crunch**, **Mahjong Tile Wash**, **Kho-Kho Relay Blitz**, **Chaupar Cowrie-Clash**, and **Glass Bridge Deploy** (23 built-in modes total) — plus a streamlined **Winner History** UI overhaul.

### Added
- **Ddakji Flip-Out (18th game mode):** Traditional South Korean Hanok executive conference room paper-tile slam royale (`2–30` players; `public/js/ddakji-sim.js`, `public/js/ddakji.js`) with developer portrait tiles, embroidered silk *bangseok* floor cushions, **CHEOL-DDAKJI** shockwaves, **Champion** vs. **First Flip** rules, and unit + browser tests (`test/ddakji-sim.test.js`).
- **Nōkabe Wall Crunch (19th game mode):** Daytime outdoor Japanese TV game-show poolside set (`2–30` players; `public/js/nokabe-sim.js`, `public/js/nokabe.js`) with recessed turquoise pool, non-slip hazard-chevron stage dock, beaded-styrofoam pose walls on brushed-steel rail sleds, Red/Blue Team stadium grandstands with cheering wildlife audience, broadcast cameras, **Stay Dry** vs. **First Splash** rules, and unit + browser tests (`test/nokabe-sim.test.js`).
- **Mahjong Tile Wash (20th game mode):** Warm 4-wall Chinese tea-house parlor whirlpool rumble (`2–30` players; `public/js/mahjong-sim.js`, `public/js/mahjong.js`) with 144 swirling tiles, recessed brass Auto-Shuffle Chute with closed-lid collision guard, **`審計日誌 · AUDIT LOG PARLOR RULES`** board, single full-moon lattice window, **Hú!** vs. **Fàngpào** rules, and unit + browser tests (`test/mahjong-sim.test.js`).
- **Kho-Kho Relay Blitz (21st game mode):** Swivel-chair IT boardroom directional tag (`2–30` players; `public/js/khokho-sim.js`, `public/js/khokho.js`) with alternating N–S–N–S swivel chairs, realistic tailored seated executives, West Rolling Projector Cart & East Chai/Samosa Trolley, executive double doors, dual whiteboards (including the **`Paper Trail Project for Cyber Defense Center (CDC)`** board with **`S`** key & Projector-click camera zoom Easter eggs), **Elusive** vs. **First P1** rules, and unit + browser tests (`test/khokho-sim.test.js`).
- **Chaupar Cowrie-Clash (22nd game mode):** Modern Bengaluru tech conference room (`CUBBON BOARDROOM · BLR-04`) cross-board Pachisi (`2–30` players; `public/js/chaupar-sim.js`, `public/js/chaupar.js`) with panoramic Bengaluru skyline & painterly Garden City trees/Namma Metro view, varnished teak table, crimson-and-emerald embroidered *chaupar* cloth, bouncing ivory cowrie shells (*kaudi*), Polycom speakerphone quakes, cutting-chai & samosa tray, **Charkoni** vs. **First Cut** rules, and unit + browser tests (`test/chaupar-sim.test.js`).
- **Glass Bridge Deploy (23rd game mode):** 4-lane dusk commuter suspension bridge (`2–30` players; `public/js/glass-sim.js`, `public/js/glass.js`) with two middle **TESTED vs. UNTESTED PROD** glass-panel lanes flanked by two outer asphalt street lanes with sculpted commuter car accidents, animated wispy radiator smoke plumes, blinking hazard lights, arched-davit streetlights, **`DEPLOY TO CLINIC`** finish arch, standing corporate executive guards, **Survivor** vs. **Canary** rules, and unit + browser tests (`test/glass-sim.test.js`).

### Changed
- **Winner History UX Overhaul (`public/history.html`, `public/js/history.js`, `public/css/style.css`):** Replaced the multi-row 23-mode summary, tall Game Mix card, 5-row pill wrap, and 27-column Standings table with a compact 1-line summary, top-3 Game Mix card, single-row toolbar with an `All modes (count)` dropdown + horizontally scrollable quick-filter rail, and a zero-horizontal-scroll 5-column Standings table.

## [1.14.0] - 2026-11-22

Paged 2-Row Mode Carousel plus 5 new 3D game modes — **Deploy Cannon**, **Standup Mini-Golf**, **RTO Mini-Golf**, **Tumba Lata**, and **Karang Derby** (13 built-in modes total), by Google Gemini 4 Neon in Antigravity.

### Added
- **Paged 2-Row Mode Carousel (`◀ 1 / N ▶`):** added keyboard-friendly Prev/Next paging controls to the
  lobby mode picker (`8` cards per page) with auto-flip to the active mode on load, selection, and
  **Surprise me**, keeping desktop `1366×768` open 3D stage `≥50%` for 9–24+ modes.
- **Deploy Cannon (9th game mode):** a 3D human-cannonball volley (`2–30` players) with reverse-solved
  parabolic ballistics (`public/js/cannon-sim.js`, `public/js/cannon.js`) from gleaming brass circus cannons
  on a Chesapeake Bay pier toward a bobbing concentric bullseye barge (`DEV → QA → STAGING → PROD`),
  surrounded by Chesapeake Bay islands, lighthouse, and volumetric clouds, featuring 6 comedic flight mishaps,
  `0.4×` slow-mo **Barge Cam**, expanding water splash rings, 10s–120s salvo scaling, synthesized Web Audio,
  Winner History integration, and unit + browser tests (`test/cannon-sim.test.js`, `test/lobby-browser.test.js`).
- **Standup Mini-Golf (10th game mode):** 3D simultaneous putt-putt (`2–30` players) on a floating emerald
  Chesapeake Bay resort course (`public/js/golf-sim.js`, `public/js/golf.js`) surrounded by 8 Bay islands,
  a striped lighthouse, volumetric cumulus clouds, and shared Derby sculpted sailboats (`buildSailboat` in
  `public/js/scenery.js`), featuring 2.5D heightmap slope physics, dimpled rolling golf balls, mowed astroturf,
  weathered timber rails, Dutch clapboard **Sprint Review Windmills** with wooden lattice canvas sails,
  steel **BadalJwala Firewall Gates**, raked **Procurement Sand Traps**, **Legacy Code Water Hazards**,
  Lathe-turned chrome **Scope Creep Bumpers**, **Cup Cam**, **Friday Afternoon Gimme** breeze, 10s–120s scaling,
  synthesized Web Audio, and unit + browser tests (`test/golf-sim.test.js`, `test/lobby-browser.test.js`).
- **RTO Mini-Golf (11th game mode):** 3D indoor office cubicle putt-putt (`2–30` players) on a moody
  after-hours IT floor (`public/js/rto-sim.js`, `public/js/rto.js`) featuring **Claw of Destiny** developer
  bobblehead gachapon capsules rolling down duct-taped emerald putting mats over speckled office carpet,
  acoustic drop ceiling with recessed parabolic-louver fluorescent troffers, venetian-blind sunset windows,
  cubicle farms with glowing IDE monitors & sticky notes, propped-open 42U server racks with catenary
  ethernet cables, spinning 5-caster ergonomic desk chairs, wedge 3-ring binder ramps, floor cable protectors,
  **BadalJwala Jammed Copier** gates, spilled iced coffee puddles with painted **Wet Floor** signs,
  `?ReturnUrl=` security detour, retired hardware bumpers (CRT monitors, Dell towers, copy-paper reams),
  and an oversized tipped-over **`WORLD'S OKAYEST DEVELOPER`** ceramic coffee mug (`test/rto-sim.test.js`,
  `test/lobby-browser.test.js`).
- **Tumba Lata (12th game mode):** 3D twilight Filipino fiesta street-game raid (`2–30` players;
  `public/js/tumba-sim.js`, `public/js/tumba.js`) with swaying crisscross *banderitas*, warm streetlamps
  that flash red during **HUNTING MODE**, a neon **`SARI-SARI DEV SHOP`** storefront, glowing cyan chalk
  *badlis* & circle, shiny ribbed **`PROD SERVER`** tin can, caffeinated AI **Bantay**, sculpted contoured
  3D *tsinelas* flip-flops with curved rubber Y-straps, bobblehead street runners, `60 ms` impact hit-stop,
  slow-mo tag cam, 10s–120s volley scaling, synthesized Web Audio, and unit + browser tests
  (`test/tumba-sim.test.js`, `test/lobby-browser.test.js`).
- **Karang Derby (13th game mode):** 3D twilight Cebu-meets-Chesapeake bamboo stilt wobble race (`2–30`
  players; `public/js/karang-sim.js`, `public/js/karang.js`) with a **Bamboo | Bagol 🥥** stilt toggle,
  inverted-pendulum wobble physics, bobblehead stilt-walkers with color-shifting **Balance Meter** halos,
  low-hanging *banderitas*, spilled-coffee slicks, glowing orange **PanganodSilab 500 Crosswind** streaks,
  a realistic full moon with lunar *maria*, craters, Tycho rays, atmospheric halo & twilight starfield,
  `0.45×` slow-motion ribbon-cam finish, synthesized Web Audio, and unit + browser tests
  (`test/karang-sim.test.js`, `test/lobby-browser.test.js`).
- Refreshed `v1.14.0` README screenshots (`docs/lobby-wide.png`, `docs/lobby-phone.png`, `docs/cannon-wide.png`,
  `docs/golf-wide.png`, `docs/rto-wide.png`, `docs/tumba-wide.png`, `docs/karang-wide.png`).

## [1.13.0] - 2026-11-22

Launchpad Roulette (7th game mode) and Jenga Connect (8th game mode), by Google Gemini 4 Neon in Antigravity.

### Added
- **Launchpad Roulette (7th game mode):** a 3D Kerbal-style rocket ignition chaos mode (`2–30` players) on a
  coastal Chesapeake Bay launch complex (`public/js/launchpad-sim.js`, `public/js/launchpad.js`), featuring
  responsive pad formations (arc for `2–10`, multi-row amphitheater for `11–30`), scenic Chesapeake Bay
  islands with a lighthouse and tracking radar dome, volumetric cumulus clouds, detailed aerospace rockets
  with curved ogive fairings and multi-layer exhaust plumes, a `MISSION: STANDUP` LED sign, NASA-style
  `3… 2… 1… DEPLOY!` countdown, 6 comedic failure archetypes with dev-themed popups, dynamic daylight →
  twilight → starry-orbit skybox, orbit flag celebration, synthesized Web Audio, 10s–120s flight scaling
  (*Hotfix Launch*, *Two-Stage Ascent*, *Orbital Gauntlet*), Winner History integration, and unit +
  real-browser tests (`test/launchpad-sim.test.js`, `test/lobby-browser.test.js`).
- **Jenga Connect (8th game mode):** a 3D collapsing-tower survival spectacle (`2–30` players) set atop a
  walnut conference room table (`public/js/jenga-sim.js`, `public/js/jenga.js`) with authentic 3:1 maple/birch
  labeled package blocks (`lamha.js`, `jquery-1.9.min.js`, `node_tables (200 GB)`), glowing crimson keystones
  (`do-not-touch-utils-x`, `load-bearing-hotfix`), Wall 1 dry-erase whiteboard featuring the **Jenga Connect
  SOC Audit Log Plan**, Wall 2 live 4K status display tracking **Build Health**, **Stability**, and **Tower
  Lean**, automated `npm audit fix --force` 3D cursor, grounded hinge-tier wobble transitioning into `0.35×`
  directional slow-motion collapse physics, `LTS-support` survival block, 10s–120s scaling (*Friday Patch*,
  *Major Version Bump* with Fake-Out Taps, *Full Monolith Migration* with Stack-On-Top Rebuilding), synthesized
  Web Audio, Winner History integration, and unit + real-browser tests (`test/jenga-sim.test.js`,
  `test/lobby-browser.test.js`).
- Added an in-game text catalog (`docs/in-game-text-catalog.md`) and mode design specs
  (`docs/launchpad_roulette_game_mode_spec.md`, `docs/dependency_jenga_game_mode_spec.md`), refined desktop
  4×2 mode-card dock proportions to support all 8 built-in modes above 50% open 3D stage at `1366×768`,
  updated Standup Deathmatch chat banter & Code Freeze excuse wording, and refreshed `v1.13.0` README
  screenshots (`docs/lobby-wide.png`, `docs/lobby-phone.png`, `docs/launchpad-wide.png`, `docs/jenga-wide.png`).

## [1.12.0] - 2026-11-21

Kanban Plinko (5th game mode) and Code Freeze (6th game mode), by Google Gemini 4 Neon in Antigravity.

### Added
- **Kanban Plinko (5th game mode):** a 3D vertical pinball / pachinko gauntlet (`2–30` players) with true
  2.5D physics (`public/js/plinko-sim.js`, `public/js/plinko.js`) down a tilted 3D vertical Kanban board
  (**Backlog → In Progress → Code Review & QA → Deploy to Prod**), featuring **Scope Creep Bumpers**,
  **Merge Conflict Spinners**, **Tech Debt Sticky Pads**, pneumatic **"Moved to Next Sprint" Warp Pipes**
  (flashing `"was voted off the team."` on the live ticker), rhythmic **LGTM Flippers**, Smart Lead-Follow
  Camera, Anti-Stuck Micro-Nudge, **Friday 4:55 PM Deploy** Force-Push fallback, synthesized pinball Web
  Audio, and 10s–120s scaling (*Hotfix Drop*, *Standard Sprint*, *Release Train*).
- **Code Freeze (6th game mode):** a 3D Red Light, Green Light survival sprint (`2–30` players) down a
  neon CI/CD runway (`public/js/freeze-sim.js`, `public/js/freeze.js`) featuring a swiveling **RELEASE
  MANAGER** laser turret, 3-state cycle (**GREEN `SPRINT OPEN`** / **YELLOW `PR IN REVIEW`** / **RED `CODE
  FREEZE!`**), braking physics, Yellow fake-outs, **Staging** & **UAT** checkpoints, slippery **Tech Debt
  Ice**, dev-themed elimination popups (including `"Voted off the team"`), dynamic Green/Red camera cuts,
  Emergency Deploy guardrail, and synthesized Web Audio.
- Upgraded the desktop mode-card dock to a compact 2-row horizontal grid supporting all 6 built-in modes
  cleanly above 50% open 3D stage, integrated `plinko` and `freeze` into Winner History (`WIN_MODES`, Hall
  of Fame stats, filters, Standings), added unit & real-browser tests (`test/plinko-sim.test.js`,
  `test/freeze-sim.test.js`, `test/lobby-browser.test.js`), and refreshed `v1.12.0` README screenshots
  (`docs/lobby-wide.png`, `docs/lobby-phone.png`, `docs/plinko-wide.png`, `docs/freeze-wide.png`).

## [1.11.0] - 2026-11-21

The Claw of Destiny: 3D arcade claw machine game mode with choreographed physics and cropped developer
reference-portrait bobbleheads, by Google Gemini 4 Neon in Antigravity.

### Added
- **The Claw of Destiny (4th game mode):** a 3D arcade claw machine (`2–30` players) with choreographed
  physics (`public/js/claw-sim.js`, `public/js/claw.js`), clear gachapon capsules containing 14-developer
  bobbleheads with actual cropped reference portraits (`public/assets/developers/*.png`), an illuminated
  **STANDUP-O-MATIC** / **THE ALGORITHM** cabinet with synced 3D arcade joystick, `INSERT STORY POINTS`
  coin slot, populated **VIP LOUNGE** shelf for cooldown teammates, scanning spotlight, dynamic **Chute
  Cam**, synthesized arcade Web Audio effects, and 10s–120s duration scaling (*Quick Grab*, *Rigged
  Arcade* with `"500 Internal Server Error"`, and *Elimination Pit*).
- Integrated `claw` into Winner History (`WIN_MODES`, Hall of Fame stats, filter chips, Standings), unit
  tests (`test/claw-sim.test.js`), real-browser tests (`test/lobby-browser.test.js`), and refreshed
  `v1.11.0` README screenshots (`docs/lobby-wide.png`, `docs/lobby-phone.png`, `docs/claw-wide.png`).

## [1.10.0] - 2026-11-21

Standup Deathmatch: modernized Quake / QuakeWorld deathmatch inside a Google Meet daily standup,
co-authored by Google Gemini 4 Neon (in Antigravity) and GPT 6.1 SOL (High).

### Added
- **Standup Deathmatch** (co-authored by **Google Gemini 4 Neon** in Antigravity and **GPT 6.1 SOL (High)**):
  a third game mode presenting a modernized Quake / QuakeWorld 3D deathmatch as a shared screen inside a
  Google Meet daily standup (`2–30` players).
  - **14 developers, signature weapons & powerups** (`public/js/deathmatch-sim.js`, `public/js/deathmatch-avatars.js`,
    `public/js/deathmatch.js`): Maya, Walter, Zoe, Finn, Bruno, Aman, Priya, Mei, Alex, Ben, Elliot, Sam,
    Ray (13th), and Chevron (14th), each with reference-matched 3D developer models, bespoke developer-themed
    Quake weapons, and 5 Quake-inspired powerups (**Quad Deploy**, **Cardboard Glare Shield**,
    **On-Mute Invisibility**, **Cappuccino Overclock**, and **Mega-Ticket 200HP**).
  - **Google Meet UI & 4-line Quake console:** top-left 4-line obituary console, full-height inset white
    **In-call messages** sidebar (`2.5s–4.5s` message pacing, blending Derby billboards and Rumble crowd signs,
    with once-per-match scripted lines, repeatable `{target}` chatter, NPC meeting crashers, and post-match
    chat that continues until leaving the call), and bottom Google Meet control bar.
  - **Lobby chat preview:** selecting Standup Deathmatch in the lobby stages the 3D QuakeWorld arena alongside
    the full-height Google Meet chat preview playing `docs/in-call-messages.md` followed by
    `docs/simulated_google_meet_chat.md` (casting 4 random developers from the 14) stamped with real local time.
  - **Signature clock rollback & 0:00 frag leaderboard:** starts at `0:10`, triggers one of three standup
    interruptions at `0:02`, rolls back to `0:45` with the license/time-travel exchange, and displays a
    single-column (`< 16` invitees) or two-column (`>= 16` invitees) frag leaderboard excluding NPCs.
  - Integrated into Winner History (`deathmatch` mode in Hall of Fame stats, filters, and Standings), WCAG AA
    contrast checks, WAVE AIM 10/10 guardrails, and unit + browser tests (`test/deathmatch-sim.test.js`,
    `test/lobby-browser.test.js`), with refreshed `v1.10.0` README screenshots.

## [1.9.0] - 2026-11-21

Broadcast Studio Desk (#133) and WAVE AIM 10/10 accessibility fixes (#129), by Google Gemini 4 Neon in
Antigravity.

### Added
- **Broadcast Studio Desk (#133):** **Edit team list**, **Winner history**, and **Absentee list** now
  share the lobby's **Top Broadcast Bar** (version pill, segment badge, **← Back to Stage**, and
  **Mute** button) and use an **Open-Stage Split** on desktop (`≥ 1000 px`) with the live 3D stage
  visible on the right.
- **Hall of Fame & Broadcast Stats Desk (#133):** **Winner history** adds a 3-card **Broadcast Stat
  Strip** (`public/js/history-stats.js`: All-Time Leader, Longest Drought underdog, and Game Mix
  proportion bar), a **Match log | Standings** toggle for ranked all-time team standings, mode filter
  chips (`All`, `Race`, `Wrestle`, `Skip`), live name search, sticky table headers, and `Sitting out`
  cooldown badges.
- **Roster Studio with live 3D preview (#133):** **Edit team list** adds interactive **Roster chips**
  with one-step Quick Add/Remove alongside the **Bulk text / paste** view, live capacity & mode-fit
  badges (`Derby Race`, `Let's Rumble`), sticky **Save / Discard** footer, and live 3D stage updates as
  teammates are added or removed.
- **Tests:** `test/history-stats.test.js`, `test/wave-alerts.test.js`, and Broadcast Studio browser
  coverage in `test/lobby-browser.test.js`.

### Changed
- **The top bar no longer has History and Team links.** They went to the same pages as **Full
  history** and **Edit team list** in the Who's here drawer, which stay. **Edit team list**, **Full
  history** and the **Absentee list** likewise lose the **Return to lobby** link at the bottom; **← Back
  to Stage** at the top stays.
- Hover tips are gone from the mute button, the version, the Demo label, the drawer's `◂` button and
  **Surprise me**, and from a recent winner in the team list ("won recently — eligible again in…"); the
  same words are shown on screen or read out by screen readers. A name in the team list, Full history
  or the Absentee list shows a hover tip only when it is a shortened email address.
- **README screenshots:** refreshed `docs/lobby-wide.png` and `docs/lobby-phone.png` for **v1.9.0**.

### Fixed
- **History & Absentee list scrolling (#133):** replaced the conflicting `html`/`body` overflow rules
  with a dedicated `.studio-scroll` container and visible scrollbar so mouse-wheel, trackpad, touch,
  and keyboard scrolling work smoothly on long lists.
- **WAVE alerts (#129):** eliminated "Redundant title text" alerts (61 on a 61-entry history),
  "Redundant link" alerts, "Skipped heading level" in **How to play**, and "Very small text" on the
  `LIVE` label, team list badges, and chyron tag (now 12 px).
- README: the lobby screenshots show the current version.

### Added
- **Tests:** `test/wave-alerts.test.js` fails on anything that would bring those alerts back.

## [1.8.0] - 2026-11-20

The lobby rework (#123), built with Google Gemini 4 Neon in Antigravity.

### Changed
- **The lobby is a Live Broadcast Stage:** the selected game now plays live in 3D behind the lobby,
  framed by solid panels, instead of sitting in a centred box over the fly-over.
  - **Derby Race** shows the checked-in teammates idling on the Standup Bay Bridge, then glides the
    camera down the course and back to the grid. **Let’s Rumble** shows them in the spotlit wrestling
    ring, and switching **Classic | HD** swaps their models on stage.
  - Checking or unchecking someone adds or removes them on the stage straight away, in HD too.
  - On wide screens (1000 px and up): a **top bar** (`LIVE`, **History**, **Team**, **Exit**, mute); a
    **Who's here** drawer on the left that scrolls on its own, so 30 names fit without the page
    scrolling, and folds away with `◂` or **H** for a full spectator view; and a **dock** along the
    bottom with the game cards, the selected game's options, and Just pick someone and Start. More than
    half of a 1366 × 768 screen is left for the stage.
  - On phones: a one-row top bar, a window onto the 3D stage above the lobby on taller phones (framed
    on the grid or the ring), and the Just pick and Start row flush with the bottom edge.
  - **How to play** opens in a dialog instead of growing the options, and **Escape** closes it.
  - "2 people marked absent." now appears beside Start, so ticking boxes never shifts the team list.
    **Review team list** also makes the Who's here drawer pulse.
  - Rumble's line in the lobby reads "Dangal: last warrior standing leads standup."
- **Pressing Start** slides the panels out of the way (at once with Reduce motion on) and the camera
  carries on from the lobby's grid or ring into the countdown.
- **Edit team list**, **Full history** and the **Absentee list** show the same 3D stage as the lobby,
  and it carries on from page to page.

### Added
- **A broadcast chyron** over the stage, rotating pre-match notes: who's on the grid or in the ring,
  teammates who have never won or have gone longest without a win, and who's sitting out.
- **🎲 Surprise me**, beside Pick a game: picks a game at random from those that fit the team, and the
  stage switches to it.
- **Sound cues** (only when sound is on): a soft tick when you tick or untick someone, and a chime when
  the game changes.
- **For new games:** a mode in `modes.js` can stage its own lobby preview with an optional
  `stagePreview(stage, { names, options })`; without one, the lobby shows the Standup Bay Bridge
  fly-over. See **Adding a game** in the README.
- **Tests:** `test/chyron.test.js`; the lobby browser tests cover the drawer, the stage's lineup, the
  dialogs and Surprise me; contrast checks cover the new panels.
- README: new laptop and phone screenshots, the new lobby, and Google Gemini 4 Neon in Contributors.

## [1.7.0] - 2026-11-20

### Changed
- **A new lobby (#117):** it asks three things in order, then offers one button: **Who's here** (the team
  list), **Pick a game** (a card per game: 🏁 Derby Race, 2+ players; 🤼 Let’s Rumble, 2–12) and that game's
  options, then **▶ Start race** / **▶ Start rumble**, with **Just pick someone** beside it.
  - Each game's settings belong to it: the race's **Race length** slider, and Rumble's
    **Models: Classic | HD** toggle (replacing the separate HD button) and **Preview wrestlers** link.
    **How to play** in each game's options replaces the one Field guide.
  - Player limits are shown as text, not in tooltips: a card that doesn't fit the headcount says so in red
    ("2–12 players · 14 checked"), and the line beside Start says what to change, with a **Review team
    list** link. Choosing a card never starts a game; Start does. While HD models load, that line says so.
  - On wide screens (1000 px and up) the team list (three columns) and the game sit side by side, so
    everything shows without scrolling on a 1366 × 768 laptop. Below that they stack. On phones the team
    list folds into a **Who's here · 12 playing · 2 absent** row, and Just pick and Start stay at the bottom
    in one row.
  - The last three winners are one **Sitting out** line under the team list, with **Full history** and
    **Reset**. **Edit team list** sits apart from Select all / Clear all, since it leaves the lobby.
  - Keyboard: every game card, and each Classic | HD choice, is its own **Tab** stop, a button that reads
    as pressed when selected; **Space** or **Enter** selects it. **Enter** on Start, on a slider or in empty
    lobby space starts the selected game. Focus starts on Start, and returns there after a game.
  - Wording no longer assumes a race: "12 playing", "Sits out 2 more picks", "sits out the next three
    picks" after any win, "Random pick — no game played", and the header says "Pick who leads the team
    meeting."
- **The lobby remembers your game from one meeting to the next:** the selected game and each game's
  options (race length, Classic or HD) are kept in this browser (`localStorage`), so tomorrow's new tab
  opens on HD Rumble if that's what you played. Attendance is still kept for the tab only, so each meeting
  starts with everyone present. A race length saved by 1.6 carries over. New `?mode=race|rumble` URL
  switch.
- **Game modes in one place:** the race and Rumble are described by a mode registry
  (`public/js/modes.js`): name, player range, options, and how each starts. The lobby is drawn from it, so
  a new game is an entry plus a game module, with no change to the lobby's markup or CSS (see **Adding a
  game** in the README). The server's error for an unknown result type and the Full history summary are
  built from the list of modes.
- The model notes, base character notes and security reviews moved into `docs/`.

### Fixed
- **WAVE "empty button":** the wrestler list's button (shown during a Rumble on small screens) was empty
  in the page until a match filled it. It now reads "🤼 Wrestlers in the ring" until the match gives the
  count.
- Remaining race-only wording: the no-3D notice ("games are decided off-screen"), the team editor
  ("Changes apply to the next pick") and the empty Full history ("after each game or pick").

### Added
- **Tests:** `test/modes.test.js` (every game records a result the server accepts and the history pages
  can label); `test/markup.test.js` (every button on every page has a name); and
  `test/lobby-browser.test.js`, which adds a stand-in third game, and six games with a very long name, and
  checks the lobby takes them with no change to its markup or CSS: keyboard selection, each game's
  options, player limits, Enter and the shared Start, focus, saved settings, the phone's Who's here row,
  and the layout from a laptop down to a 320 px phone. CI's **Browser tests** job runs both browser test
  files, one at a time.
- README: screenshots of the lobby on a laptop and a phone, and **Adding a game**.

## [1.6.2] - 2026-11-19

### Fixed
- **Close calls (#112):** both wrestlers turn smoothly as they approach the ropes and hold their facing
  through the close call.
- **Satyaki's rebound (#113):** his opponent turns at a limited rate as Satyaki runs past, then eases
  into the position for the tackle.

## [1.6.1] - 2026-11-19

### Fixed
- **Standard ring-outs (#109)** now turn both wrestlers smoothly as they approach the ropes and keep
  their facing steady through the grapple and throw.

## [1.6.0] - 2026-11-19

### Fixed
- **Body slams (#104):** the lifted wrestler now lies across the lifter's chest, resting on both hands
  (back on one, legs on the other) through the lift and hold, for every pair of sizes, before being driven
  down flat on the mat from exactly where they were held. Before, they floated beside the raised hands.
  A wrestler ganging up on someone waits while their target is being slammed.
- **Over the top rope, not through it (#105):** thrown bodies turn about their middle and fly an arc that
  peaks early, over the ropes, so trailing legs, capes and braids clear the top rope, with a check on the
  body itself as a last resort. Grappled wrestlers back up against the ropes without going into them.
- **Satyaki's ring-outs (#106):** with room for it, he now runs to the ropes on another side, bounces off
  them and tackles his opponent over the top rope, as the feed says. He turns smoothly into the ropes,
  off them and through the tackle, at any frame rate, and his opponent turns smoothly to face him. When there's no clear run (for example, during two
  ring-outs at once), he uses the standard throw and the feed says he drove them over.
- **Phone layout (#107):** on narrow or short screens the wrestler list folds into a count ("🤼 8 of 12 in
  the ring") that opens the full list; on a phone too narrow for it beside Mute and Quit (320 px), it
  moves below them. A ring-out message keeps clear of the list, the Mute and Quit
  buttons and the landings it announces: it goes beside, above or below them, high on the screen as a
  short, wide banner (two long names aren't broken up down a narrow strip), smaller rather than over a
  landing. Long messages wrap on every screen and always fit on it, and are placed again when the list
  opens or closes, the phone turns, or the camera brings a landing under the message. A new browser test
  (`test/callout-browser.test.js`) checks this in headless Chrome, including in the live HD match, and
  runs in its own **Browser tests** job on GitHub Actions (Node 22 and Chrome), where it must run rather
  than skip. The deploy to GitHub Pages waits for it.

## [1.5.0] - 2026-11-18

### Changed
- **Wrestling camera (#95):** circles the middle of the ring at a steady distance, height and speed for the
  whole match, turning only a bounded amount towards a throw instead of pushing in and pulling back for
  each ring-out. Where a throw would leave the picture (one close under the camera, or on a narrow
  phone), the lens widens gradually over the approach (never changing the picture's scale by more than
  about 6% in a quarter-second, widening or easing back), and the camera turns further only if that isn't
  enough, so the rope, the landing and the whole body stay in view through the bounce. It eases into a slightly closer
  orbit for the final two over three seconds, and from there into the victory shot. Portrait screens
  watch from a little further back, with a view as wide as on a 0.6 screen.
- **Ring-outs (#96):** come at uneven intervals, and while at least four are in the ring two sometimes go
  over the ropes together, over the same side at opposite ends of the rope, landing within a second of
  each other. Their callouts
  combine ("Roscoe and Ada are out!"); each still crosses its own name off the list. The winner is still
  drawn uniformly, and the final two still get their close call and a single last throw. Matches are a
  little shorter on average: a twelve-wrestler match takes about 45 to 75 seconds.
- **More wrestling moves (#97):** a lock-up reversal, a rope rebound into a shoulder tackle, a body slam,
  and reeling back from a forearm shot, each with a wind-up, a reaction and a recovery. Each character
  favours a signature move, so neighbouring fights look different.
- **Room to fight (#100):** fights keep their own part of the mat, away from each other, from throws and
  from the ropes, and a wrestler joining a fight two on one comes in from the side.

### Fixed
- **HD limbs no longer snap between moves (#98):** each new move eases in from the last pose, the hands come
  up to take hold as the pair meet, and the victim tips back over the rope instead of jumping into the throw.
- **Frame-rate independent wrestling (#99):** the approach's strides follow the distance walked, and
  Duryodhana's celebration turns at a steady 2.4 radians per second, at any update rate.
- The match's free movement uses its own seeded stream, so a seeded match (and the performance test's
  seed) replays the same way.
- Wrestlers sitting at ringside are no longer re-posed every update once settled, which pays for the new
  moves and framing on average (twelve HD wrestlers, measured in Node: 4.2 ms per update against 4.4–4.7 ms
  in 1.4.0; the slowest 5% of updates, during throws, take 7.4 ms against 6.5–6.9 ms).

## [1.4.0] - 2026-11-17

### Changed
- **Wrestling looks like a battle royal (#91):** everyone in the ring now fights at the same time instead
  of watching two at a time. Wrestlers pair off for lock-ups, forearm strikes, shoves and circling, then
  break away to find someone new; with an odd number, one joins a fight two on one. The elimination
  order, its fairness and the match length are unchanged.
- **Wrestling camera (#91):** circles the ring for the whole match, like the victory scene, turning to
  watch each ring-out instead of swinging over and holding. In the final two it circles the pair.

### Fixed
- README: a twelve-wrestler match lasts about 73 seconds (it still said 62 seconds for ten).

## [1.3.0] - 2026-11-16

### Changed
- Kept **Preview wrestlers** as a permanent lobby link, aligned with the racers-on-the-grid hint
  below the Rumble/HD buttons. The studio's return link now says **Back to the lobby**.
- Renamed the lobby's wrestling action to **Let’s Rumble** and made it use the original models.
  The adjacent **HD** button uses the detailed models. Both allow two to twelve participants
  and share the same match and history rules. Classic mode does not load the HD model assets.

### Performance
- A full-screen wrestling performance test starts all twelve characters together, with a
  ten-character comparison, live FPS/frame timing, full-ring and full-match measurements,
  and downloadable results. Hidden, resized, paused and incomplete runs cannot pass the check.
- Raised the normal wrestling limit from ten to twelve after repeated full twelve-character
  matches met the 30 FPS / 50 ms p95 target on hardware-accelerated AMD graphics at 1080p.
  The validated limit remains twelve, with one distinct character per participant.

### Added
- Free, skinned Quaternius models for all twelve wrestling characters, with custom weighted
  dhotis, Hidimbi's choli/skirt, sashes, jewelry, crowns, facial hair and carried equipment.
  Distinctive details include Arjuna's bow, Karna's sun armor, Duryodhana's cape, Jarasandha's
  seam and beard, Hidimbi's braid, and Satyaki's peacock feather.
- **Character studio**, linked from the lobby: select any two warriors, orbit/zoom, view seven
  movement poses, compare original models, and preview a match with reversible roles. Preview
  matches do not save winners or use the team roster.
- Lazy local model loading in wrestling mode with an original-model fallback, static-demo addon
  packaging, and tests for skeletal independence, grounding, pose direction and asset provenance.
- **models.md:** instructions for recreating Arjuna from the free base pack, with tool/download
  links, asset preparation commands, the character recipe, costume/prop construction and testing.

## [1.2.0] - 2026-11-15

### Added
- **Absentee list:** each result now records who was marked absent (unticked in the lobby). Recent
  winners sitting out and the winner aren't counted.
  - A new page, linked from the top of **Full history**, lists them newest first: pick number, date,
    time, who was absent, how the pick was made and who was picked.
  - Stored with each result in `data/history.json` (`"absent"`). Older results have no list, and older
    pages that don't send one still save normally. The online demo logs absentees the same way.

### Fixed
- **Background fly-over between pages:** opening **Edit team list** or **Full history** (and going back)
  carries on the fly-over and the moving scenery from where the last page was, instead of restarting
  from the start line. **Skip race** already did, because it stays on the same page.

## [1.1.3] - 2026-11-15

### Fixed
- **WAVE contrast errors on the hover tips:** the **Let's Wrestle Instead** and **Exit** tips were hidden
  only by being fully see-through, which WAVE measures as invisible text (1:1). They are now properly
  hidden until hover or keyboard focus, with the same fade. Screen readers still read them.

## [1.1.2] - 2026-11-15

### Fixed
- **Colour contrast (accessibility):** text in the lobby, team list editor, results card and wrestling
  standings now meets WCAG AA in every contrast checker, not just some.
  - Faint see-through backgrounds (team list cards, last three winners, messages, code samples) are
    now the same colours, but solid. Simple checkers no longer misread them as white.
  - **Start race** and **Save team list** have a solid orange under their gradient.
  - Disabled **Start race** and **Let's Wrestle Instead** are greyed out with readable text instead of
    being faded (the faded wrestle button was 4.0:1).
  - Knocked-out wrestlers in the standings are greyed by colour instead of fading.
- **README:** a new **Accessibility** section: what is built in, the tools used to test it (axe-core,
  Lighthouse, contrast measurements, `test/contrast.test.js`) and how to check it yourself.

## [1.1.1] - 2026-11-15

### Fixed
- **Online demo after an update:** browsers could pair the new page with old cached scripts and styles
  (GitHub Pages lets them keep files for 10 minutes). The Exit button did nothing, its hover tip always
  showed, and the old version number stayed. Every link in the demo now carries a build stamp, so each
  deploy is loaded as a complete new set.

## [1.1.0] - 2026-11-15

### Added
- **Exit button** in the lobby (top right): closes the app. The server stops, the launcher's terminal
  closes, and the page says the Derby is closed. Hovering explains it in plain words; the team list and
  winners stay saved. Only the page itself can do this (`POST /api/exit`, same-origin JSON).
- **Online demo on GitHub Pages:** a public, browser-only copy at
  <https://roscoe-sincero-sys.github.io/Chesapeake-Dev-Derby/>.
  - Starts with characters from *Maharadia Lawana*; edits, winners and history are saved only in the
    visitor's browser.
  - A **Demo** label in the lobby.
  - Published by a GitHub Actions workflow on every push to `main` (tests first), listed under
    **Deployments → github-pages**.
  - `npm run build:demo` builds it locally into `_site/`.

### Changed
- The lobby hint now says "Let's go see it in your virtual meeting room."
- Pages use relative links and a relative Three.js import map, so they also work under a sub-path.
- The team list, winner and history rules moved to `public/js/data-rules.js`, shared by the server and
  the demo. The presenter app behaves as before.

## [1.0.0] - 2026-11-15

The first versioned release: everything up to this point.

### Picking a leader
- **Race:** a 3D kart race over the Chesapeake Bay, one racer per teammate, first across the line leads
  the meeting.
  - Race length slider: about 120, 60, 30, 15 or 10 seconds.
  - Victory playback of the whole course.
- **Skip race, just pick:** an instant random pick.
- **Let's Wrestle Instead:** a Kurukshetra Battle Royal for 2 to 10 wrestlers.
  - 12 Mahabharata characters, each with their own wrestling style.
  - A reacting crowd with hand-lettered signs.
  - Ring-outs over the top rope, and a close call for the final two.
- **Fairness:** every way of picking is fair, and the last three winners sit out.

### Race course
- Web-developer obstacles: 404 pits, broken links, merge conflicts, SSL Expired, DO NOT MODIFY URLS, the
  800-Column Table, and more.
- Items: coffee, firewall, bug, force push, renewed certificate, ?returnUrl=, the office-politics items,
  and the 200GB Table.
- Billboards and wildlife grandstands.

### Team list and history
- Edit the team list in the browser.
  - Sorted alphabetically.
  - Email addresses shortened when unambiguous.
  - Calendar labels (Organizer, Optional, Telework…) ignored when pasting from an invite.
- Attendance and race length kept per browser tab.
- Last three winners, with a reset.
- Full winner history with date, time and how they won (race, wrestle or skip).

### Platform
- Runs locally on the presenter's computer only.
  - Same-origin and JSON checks on every write.
  - Clickjacking protection.
- Keyboard focus starts on a sensible control on each page.
- Licensed under the Apache License 2.0.

[Unreleased]: https://github.com/roscoe-sincero-sys/Chesapeake-Dev-Derby/compare/v1.8.0...HEAD
[1.8.0]: https://github.com/roscoe-sincero-sys/Chesapeake-Dev-Derby/compare/v1.7.0...v1.8.0
[1.7.0]: https://github.com/roscoe-sincero-sys/Chesapeake-Dev-Derby/compare/v1.6.2...v1.7.0
[1.6.2]: https://github.com/roscoe-sincero-sys/Chesapeake-Dev-Derby/compare/v1.6.1...v1.6.2
[1.6.1]: https://github.com/roscoe-sincero-sys/Chesapeake-Dev-Derby/compare/v1.6.0...v1.6.1
[1.6.0]: https://github.com/roscoe-sincero-sys/Chesapeake-Dev-Derby/compare/v1.5.0...v1.6.0
[1.5.0]: https://github.com/roscoe-sincero-sys/Chesapeake-Dev-Derby/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/roscoe-sincero-sys/Chesapeake-Dev-Derby/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/roscoe-sincero-sys/Chesapeake-Dev-Derby/compare/v1.2.0...v1.3.0
[1.0.0]: https://github.com/roscoe-sincero-sys/Chesapeake-Dev-Derby/releases/tag/v1.0.0
