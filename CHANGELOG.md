# Changelog

All notable changes to Chesapeake Dev Derby are recorded here. The project uses
[semantic versioning](https://semver.org/): **MAJOR**.**MINOR**.**PATCH**. The version lives in
`package.json` and is shown next to the app's name in the lobby. See *Versioning* in the README for how
to release.

## [Unreleased]

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

[Unreleased]: https://github.com/roscoe-sincero-sys/Chesapeake-Dev-Derby/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/roscoe-sincero-sys/Chesapeake-Dev-Derby/releases/tag/v1.0.0
