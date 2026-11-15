# Changelog

All notable changes to Chesapeake Dev Derby are recorded here. The project uses
[semantic versioning](https://semver.org/): **MAJOR**.**MINOR**.**PATCH**. The version lives in
`package.json` and is shown next to the app's name in the lobby. See *Versioning* in the README for how
to release.

## [Unreleased]

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
