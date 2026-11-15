# Security Review (Claude): Chesapeake Dev Derby

**Date:** 2026-11-14 · **Reviewer:** Claude Opus 5.5 (Claude Code) · **Commit reviewed:** `fef28cc` (`main`)

## Summary

The app's security model holds up. It is a presenter app that only accepts connections from the computer it runs on. All of the following were tested against a live server and blocked as expected:
- DNS rebinding and spoofed hosts;
- cross-site writes;
- requests that try to read files outside the public folders;
- oversized request bodies;
- script injection (XSS) through racer names.

The only dependency (Three.js 0.170.0) has no known vulnerabilities.

I found **four issues, all low severity**, and none of them lets another website or another computer read or change data:

| # | Finding | Severity | Issue |
| --- | --- | --- | --- |
| 1 | A real team roster and winner list remain in the **public** repository's git history | Low (privacy) | #63 |
| 2 | Names accept invisible, control and right-to-left override characters | Low | #64 |
| 3 | A corrupted `history.json` stops the winner from being saved | Low (availability) | #65 |
| 4 | Hardening: malformed URLs return 500, error responses include absolute file paths, missing `nosniff` and a script CSP, launcher uses `npm install` | Low (hardening) | #66 |

This review complements the Codex review in [`security-review-2026-11-14.md`](security-review-2026-11-14.md), which found no issues. Since that review, `main` has added:
- the full winner history (`GET /api/history`, `data/history.json`);
- the `mode` field on winner saves;
- calendar-label filtering of the team list;
- new pages and scripts (Full History, focus handling);
- new race items and obstacles.

All of these are covered here. The repository is also now **public**, which is what turns finding 1 from a non-issue into a finding.

## Scope and method

**In scope:**
- `server.js`;
- `lib/request-security.js`, `lib/store.js`, `lib/browser-session.js`;
- `start.cmd`;
- all of `public/` (pages and scripts);
- `package.json` and `package-lock.json`;
- `.gitignore`;
- the git history of `data/`.

**Method:**
1. **Code review** of every request handler, every file read and write, and every place the browser puts data on the page. A search for `innerHTML`, `insertAdjacentHTML`, `outerHTML`, `document.write`, `eval`, `new Function`, `postMessage`, storage and navigation found one HTML insertion fed by data: the race event feed in `hud.js`. Every name there passes through `escapeHtml`.
2. **Live checks** against a throwaway server built with `createServer({ dataDir: <temp folder> })`. Raw HTTP requests set exact `Host`, `Origin`, `Sec-Fetch-Site` and `Content-Type` headers. **No real data was read or written**: the user's `data/` folder was never used.
3. **Browser check** in headless Chrome. A race and the Full History page were run with racer names that are HTML and JavaScript payloads.
4. **Dependencies:** `npm audit`, `npm ls --all`, and a lockfile check for integrity hashes and install scripts.
5. **Repository history:** every commit that touched `data/` was characterised by counting entries and email addresses, without printing the contents.

**Not covered:**
- other programs running on the same computer, which can already reach a loopback server (as documented in the README);
- the browser and operating system themselves;
- Three.js's own source code.

## Threat model (short)

- **What's protected:**
  - the team list (`data/names.json`);
  - the last three winners (`data/winners.json`), which decide who sits out;
  - the full history (`data/history.json`);
  - the fairness of the pick.
- **Who could attack:**
  - a website open in another tab of the presenter's browser;
  - a DNS-rebinding page;
  - another web app on `localhost`;
  - someone on the same network;
  - anyone who can read the public GitHub repository.
- **Trusted:** the presenter and their browser. They already choose the team list, attendance, the race length, `?seed=`, and whether to skip the race. Things only the presenter can do are therefore not findings.

## Verified controls (no issue)

| Control | Evidence |
| --- | --- |
| Loopback only | `server.js` refuses `HOST` other than `127.0.0.1`, `localhost` or `::1`. `trustedOrigin()` also requires a loopback socket address and a loopback `Host` header with the exact port. |
| DNS rebinding | `Host: evil.example:<port>` → **421**. `Host: localhost:1` (wrong port) → **421**. Absolute-form target `http://evil.example/api/state` → **421**. |
| Cross-site writes | `POST /api/winners` with `Origin: http://evil.example` → **403**. `DELETE /api/winners` with `Sec-Fetch-Site: cross-site` → **403**. Another local app (`Origin: http://localhost:3000`) → **403**. |
| Form-style writes | `PUT /api/names` with `Content-Type: text/plain` → **415**. HTML forms can't send `application/json`, and the fetch API can't send it cross-site without a preflight, which the server never approves. |
| Reading data cross-origin | No `Access-Control-Allow-Origin` on any response, so other origins can't read `GET /api/state` or `GET /api/history`. |
| Input validation | `mode: "evil"` → **400**. A winner not on the team list → **400**. A 20 KB body → **413** (10,000-byte limit). Team list writes are capped at 30 names of 40 characters each. Calendar labels are filtered before the cap, but the body limit still bounds the request. |
| Static file containment | `/../server.js`, `/%2e%2e/server.js` and `/..%2fserver.js` → **404**. `/..%5c..%5cserver.js` and `/%2e%2e%5cdata%5cnames.json` → **403**. `/data/names.json` and `/.git/config` → **404**. `/index.html%00.png` → **404**. `/vendor/three/%2e%2e%2f%2e%2e%2fpackage.json` returns **Three.js's own** `package.json`: `resolveInside()` clamps `..` at the folder root, so nothing outside `node_modules/three` is served. |
| XSS through names | Racer names such as `<img src=x onerror=…>`, `<svg onload=…>`, `"><b onmouseover=…>` and `x@<script>…</script>.com` were used in a full race and on Full History. They render as text in the lobby, the feed (e.g. `<b>&lt;img src=x onerror=…&gt;</b>`), the results and the history. No payload ran and no dialog appeared. Elsewhere, `textContent` and DOM properties are used. |
| Clickjacking | `Content-Security-Policy: frame-ancestors 'none'` and `X-Frame-Options: DENY` on every response. |
| Launcher | `start.cmd` runs fixed commands. `--open` builds the browser command only from the allow-listed host and a numeric port. The `/api/session` connection that keeps the launcher alive requires a same-origin request (tested in `test/security.test.js`). |
| Write integrity | Data files are written to a `.tmp` file and renamed into place, and writes are queued so two saves can't interleave. |
| Dependencies | `npm audit`: 0 vulnerabilities. One package (`three@0.170.0`), pinned in `package-lock.json` with an integrity hash and no install scripts. |
| Data kept out of git | `.gitignore` excludes `data/names.json`, `data/winners.json` and `data/history.json`. The current team list (which contains work email addresses) is not tracked. |

## Findings

### 1. Real team names remain in the public repository's history (Low, privacy) — #63

**What:** commit `b226e86` ("Update racer roster and recent winner history", 2026-11-13) added a `data/names.json` with 16 names and a `data/winners.json` with 3 names and dates. They are not the sample names from the first commit, and look like real team members' names. No email addresses were found in any committed version. Later commits removed both files from the working tree (`e9ba506`, `99a654b`), and `data/` is now ignored. But the files are still in the history of a **public** repository, so anyone can read them with `git show b226e86:data/names.json` or through GitHub's commit view.

**Impact:** the names of real people, and which of them led recent meetings, are publicly associated with this project. The sensitivity is low (names, no contact details), but the exposure is permanent until the history is rewritten.

**Remediation (owner decision):**
- (a) Accept it: plain names, already removed from the current files.
- (b) Rewrite history to drop `data/` (for example `git filter-repo --path data/ --invert-paths`) and force-push. Forks and existing clones keep the old commits. GitHub can still serve them by commit hash and in old PR views until GitHub Support purges cached views. Rewriting also changes every commit hash after `b226e86`.
- (c) Make the repository private if public access isn't needed.

**Not changed in this review:** rewriting history and changing visibility are irreversible, so they're left to the owner.

### 2. Invisible, control and right-to-left characters are accepted in names (Low) — #64

**What:** `parseNames()` trims and collapses whitespace, but keeps other characters. A team list save containing `Ada` + zero-width space (U+200B), a right-to-left override (U+202E), and a NUL (U+0000) was accepted and saved exactly like that.

**Impact:**
- **Lookalike duplicates:** `Ada` and `Ada` + zero-width space are two different entries that look identical. Copying attendee lists from calendar invites (#57) can bring invisible characters in by accident. A lookalike entry is not matched by the "last three winners sit out" rule, so the same person could race twice, or race while they should be sitting out.
- **Spoofed display:** a right-to-left override reverses how the rest of the name is drawn in the lobby, the race and the history, so the screen can show a different name from the stored one.
- **Exposure:** only the presenter (or whoever edits `data/names.json`) can enter names, so this is mainly an accident and integrity risk rather than an attack.

**Remediation:**
- normalise names to Unicode NFC;
- remove format and control characters (`\p{Cf}`, `\p{Cc}`, and the bidi controls U+202A–U+202E and U+2066–U+2069) in `parseNames()` and in the winner-name comparison;
- warn when anything was removed;
- add tests.

### 3. A corrupted `history.json` stops the winner from being saved (Low, availability) — #65

**What:** `recordWinner()` reads `history.json` **before** it writes `winners.json`. With an invalid `history.json`, `POST /api/winners` returns **500** ("history.json is not valid JSON…") and **`winners.json` is not written**.

**Impact:** the full history is a record, but `winners.json` decides who sits out. A damaged history file (a hand edit, or a disk problem) silently breaks the three-race rule: every result after that fails to save until someone repairs the file. The lobby does show "Could not save the winner" with Retry, but retrying fails the same way.

**Remediation:**
- save `winners.json` first;
- treat a history failure as a warning rather than a failed save: keep an unreadable file aside (for example `history.json.corrupt-<time>`) and start a new history, or skip appending and report it;
- show the warning on the results card and the Full History page;
- add a test with a corrupt history file.

### 4. Hardening (Low) — #66

Each of these is small; together they are worth one tidy-up:
- **Malformed URLs return 500.** `decodeURIComponent()` throws on input like `/%E0%A4%A` or `/api/%ZZ`, and that becomes a 500 with "URI malformed" logged as a server error. It should be a 400, with no error-level log entry.
- **Absolute paths in error responses.** For example, `GET /api/state` with a missing team list returns `Could not find C:\Users\<user>\…\names.json`. It's only shown to local clients, but it reveals the Windows username and folder layout, and it appears on screen in a presenter app that may be screen-shared. Prefer `data/names.json`.
- **Missing `X-Content-Type-Options: nosniff` and a script CSP.** Responses carry only `frame-ancestors 'none'`. Adding `nosniff`, `Referrer-Policy: no-referrer` and a CSP would contain any future XSS. The CSP would be `default-src 'self'; script-src 'self' 'sha256-…'`, with the hash covering the inline import map, plus `img-src 'self' data:` for the inline icon. One possible exception to check: the clouds and billboards are drawn on a canvas, which this CSP doesn't affect.
- **`start.cmd` uses `npm install`.** On first run, `npm ci --no-audit --no-fund` would install exactly what `package-lock.json` pins, and fail if `package.json` and the lockfile disagree, instead of possibly updating them.

## Notes (no action required)

- **The browser decides the result.** The server checks that the winner is on the team list but doesn't replay the race. `?seed=` replays a race, and "Skip race, just pick" exists. These are presenter powers and are documented. The Codex review reached the same conclusion.
- **Other programs on the same computer** can call the API with a matching `Origin`. The README documents this as out of scope.
- **Content:** the Security Theater item's quote names a person ("Vahi says…") in a public repository. That's a content choice, not a vulnerability; it may be worth confirming the person is happy with it.

## Reproducing the checks

The live checks use only the exported `createServer({ dataDir })` with a temporary folder, plus Node's `http` module, so they can be re-run without touching real data. Most of them are already covered by `test/security.test.js`. Findings 2–4 have no tests yet; each issue lists the test to add.
