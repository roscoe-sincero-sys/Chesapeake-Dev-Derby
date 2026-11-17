# Changelog

All notable changes to Chesapeake Dev Derby are recorded here. The project uses
[semantic versioning](https://semver.org/): **MAJOR**.**MINOR**.**PATCH**. The version lives in
`package.json` and is shown next to the app's name in the lobby. See *Versioning* in the README for how
to release.

## [Unreleased]

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

[Unreleased]: https://github.com/roscoe-sincero-sys/Chesapeake-Dev-Derby/compare/v1.3.0...HEAD
[1.3.0]: https://github.com/roscoe-sincero-sys/Chesapeake-Dev-Derby/compare/v1.2.0...v1.3.0
[1.0.0]: https://github.com/roscoe-sincero-sys/Chesapeake-Dev-Derby/releases/tag/v1.0.0
