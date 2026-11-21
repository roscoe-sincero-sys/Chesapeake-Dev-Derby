# Changelog

All notable changes to Chesapeake Dev Derby are recorded here. The project uses
[semantic versioning](https://semver.org/): **MAJOR**.**MINOR**.**PATCH**. The version lives in
`package.json` and is shown next to the app's name in the lobby. See *Versioning* in the README for how
to release.

## [Unreleased]

Accessibility work for a WAVE AIM score of 10/10 (#129), by Google Gemini 4 Neon in Antigravity.

### Changed
- **Broadcast Studio Desk shell & scroll fix (#133, phase 1):** **Edit team list**, **Winner
  history**, and **Absentee list** now share the lobby's **Top Broadcast Bar** (with version pill,
  segment badge, **← Back to Stage**, and **Mute** button) and use an **Open-Stage Split** on wide
  screens (left scrollable Studio Panel + open live 3D stage on the right). Fixes the broken
  mouse-wheel scrollbar on long history/absentee tables and adds sticky table headers while
  preserving WAVE 10/10 and WCAG 2.2 AA compliance.
- **The top bar no longer has History and Team links.** They went to the same pages as **Full
  history** and **Edit team list** in the Who's here drawer, which stay. **Edit team list**, **Full
  history** and the **Absentee list** likewise lose the **Return to lobby** link at the bottom; **Back
  to lobby** at the top stays.
- Hover tips are gone from the mute button, the version, the Demo label, the drawer's `◂` button and
  **Surprise me**, and from a recent winner in the team list ("won recently — eligible again in…"); the
  same words are shown on screen or read out by screen readers. A name in the team list, Full history
  or the Absentee list shows a hover tip only when it is a shortened email address.

### Fixed
- WAVE alerts: one "Redundant title text" alert per name (61 on a 61-entry history), "Redundant link"
  for the links above, "Skipped heading level" in **How to play**, and "Very small text" on the `LIVE`
  label, the team list's badges and the chyron's tag, now 12 px instead of 11 px.
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
