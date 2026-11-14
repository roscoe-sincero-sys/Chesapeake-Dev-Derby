# Security Review: name-picker

## Scope

Static security audit of all 38 tracked files in the current repository working tree, including the preexisting data/names.json modification; current ignored winner data also inspected for embedded credentials. Independent baseline audit, architecture review and focused request-boundary investigation reconciled by parent.

- Scan mode: repository
- Target kind: git_worktree
- Target ID: target_sha256_d2847d150f7ec6d5060a7aeeff294d335e5a2a266d0f0763dc6c31480489a4b2
- Revision: a13d2586899ef78bfe7dab8eb4fbabf7c4693ea7
- Snapshot digest: codex-security-snapshot/v1:sha256:cc401770433620edd681dd521569c8a134df2736551b16088daceeed388e9fd4
- Inventory strategy: repository
- Included paths: .
- Excluded paths: none
- Artifacts reviewed: .gitignore, README.md, data/names.json, lib/browser-session.js, lib/request-security.js, lib/store.js, package-lock.json, package.json, public/css/style.css, public/index.html, public/js/audience.js, public/js/audio.js, public/js/effects.js, public/js/eligibility.js, public/js/game.js, public/js/hud.js, public/js/lobby-settings.js, public/js/main.js, public/js/obstacles.js, public/js/racers.js, public/js/roster.js, public/js/scenery.js, public/js/session.js, public/js/sim.js, public/js/track.js, public/js/util3d.js, public/roster.html, requirements.txt, server.js, start.cmd, test/lobby-settings.test.js, test/random-pick.test.js, test/security.test.js, test/server.test.js, test/session.test.js, test/sim.test.js, test/store.test.js, usage.md
- Scan context: Security assessment contributor and report co-author: OpenAI Codex (AI assistant). User requested GitHub issues with appropriate priority/labels for security issues; no reportable findings were found, so no issues or labels are required.

Limitations and exclusions:
- No external advisory/database queries or installed third-party dependency source audit.
- No runtime/browser exploitation or OS ACL validation; result applies to documented local presenter deployment and current source only.
- Git history and ignored dependency/build trees excluded; preexisting working-tree changes preserved.
- Excluded .git/\*\*: Git internals and historical revisions are outside current-source audit.
- Excluded node_modules/\*\*: Third-party installed source is excluded; dependency manifest and lockfile are reviewed offline.

### Scan Summary

| Field | Value |
| --- | --- |
| Scan outcome | completed |
| Reportable findings | 0 |
| Severity mix | none |
| Confidence mix | none |
| Coverage | complete |
| Validation mode | offline_static_source_review |

Canonical artifacts: `scan-manifest.json`, `findings.json`, and `coverage.json`. This report is a deterministic projection of those files.

## Threat Model

Chesapeake Dev Derby is a local presenter application selecting a meeting leader through a browser-side Three.js race or random pick. The Node HTTP server serves public/ and locally installed Three.js, reads the roster, and persists roster edits and recent winners (package.json:4; server.js:100,157,162,172,186,200). npm start runs node server.js; npm run open adds --open; Windows start.cmd changes to its own directory, optionally installs dependencies, and runs node server.js --open --exit-on-close (package.json:8-9; start.cmd:3,10,19). Direct execution accepts only HOST values 127.0.0.1, localhost, or ::1; default binding is 127.0.0.1:4100, with PORT converted to a Number and falling back to 4100 when falsy (server.js:223-225,239). The browser computes the result and submits the winning name; the server validates roster membership rather than replaying the race (public/js/main.js:97,262,288; lib/store.js:157).

### Assets

- Roster integrity and availability: all normal startup paths consume \<repository\>/data/names.json, derived from the server module's location rather than working directory. Successful roster writes use \<repository\>/data/names.json.tmp followed by rename (server.js:22,100; lib/store.js:107,145,147-148).
- Recent-winner integrity and availability: \<repository\>/data/winners.json contains up to three names/dates; writes use \<repository\>/data/winners.json.tmp followed by rename. All store mutations share a per-store promise queue; no separate OS access-control policy is implemented (lib/store.js:8,76,108,110,127,170,181).
- Served application code and dependency integrity: GET/HEAD consume \<repository\>/public/\<resolved path\> and /vendor/three/\* consumes \<repository\>/node_modules/three/\<resolved path\>; the public import map selects /vendor/three/build/three.module.js (server.js:102-103,200; public/index.html:10).
- Presenter tab state: absent-name keys and race speed reside in sessionStorage key derby-lobby-settings; the mute preference resides in localStorage key derby-muted (public/js/lobby-settings.js:3,43,59; public/js/audio.js:3,11,38).
- Local Node process authority and launcher availability: --open invokes an OS browser opener; --exit-on-close tracks same-origin EventSource connections and closes the server after the final connection closes and the grace period expires (server.js:129,143,147,229,243).

### Trust Boundaries

- Network client to local HTTP server: direct startup restricts binding hosts. Every request independently requires a loopback socket peer and a Host header naming localhost, 127.0.0.1, or \[::1\] with the actual listening port. The parsed request-target origin must also equal the trusted origin; forwarded host headers are not used (server.js:112,115,225; lib/request-security.js:1,5).
- Untrusted web origin to local mutations and launcher lifecycle: PUT /api/names, POST/DELETE /api/winners, and GET /api/session require same-origin Fetch Metadata/Origin checks. If Sec-Fetch-Site is present it must equal same-origin; an Origin header, when present, must exactly match; without Origin, Sec-Fetch-Site must establish same-origin. Mutations additionally require application/json (server.js:117,120,123; lib/request-security.js:14,22). These are browser-origin protections, not user authentication.
- Browser/operator to persistent state: the browser sends names and winning names, but never chooses filesystem paths. The server reads bodies with a 10,000-byte buffering limit, parses JSON, validates roster writes to 30 names of at most 40 characters, normalizes names, and requires recorded winners to match the current roster. Eligibility, attendance, and race outcome originate in the browser; local authorized clients have the same write capability (server.js:47,165,175; lib/store.js:135,157; public/js/eligibility.js:13; public/js/main.js:101).
- Request path to filesystem static resources: only public/ or node_modules/three/ is selected; resolveInside normalizes and resolves paths and verifies the resulting lexical path remains in the selected base. File stat/read follows filesystem behavior; host-managed source/dependency directory integrity and any links in those directories remain host responsibilities (server.js:68,74,195,200).
- Stored roster/winner strings to browser rendering: lobby names, warnings, recent winners, and roster-editor status use textContent or textarea value (public/js/main.js:76,133,177; public/js/roster.js:26). Parent verified HUD HTML paths separately: escapeHtml protects dynamic names in who()/podium(), and winner-name uses textContent (public/js/hud.js:8-9,192,206). Three.js name tags draw canvas text (public/js/racers.js:451; public/js/util3d.js:170-191). Framing is independently denied for every response through CSP frame-ancestors and X-Frame-Options (server.js:109-111).
- Operator configuration to OS browser opener: only direct CLI --open enables exec. The URL is constructed from an allowlisted host and Number-converted port; the fixed opener is start on Windows, open on macOS, or xdg-open elsewhere. HTTP request content does not feed that command (server.js:223,225,240,242-244).
- Installation to runtime dependency: Windows start.cmd runs npm install only when node_modules/three is absent. package-lock.json pins Three.js 0.170.0 with registry location and integrity metadata. Installed code is served locally; this is an operator installation path, not an HTTP-request capability (start.cmd:10,12; package-lock.json:17-20).

### Attacker Capabilities

- An untrusted website may cause the presenter's browser to attempt local HTTP requests or framing. It does not inherently control the local socket/Host checks, browser-generated Origin/Fetch Metadata, filesystem, environment, or process command line (lib/request-security.js:5,14; server.js:109).
- A remote LAN/public client does not have supported access through direct startup; both listener binding and request-time loopback-peer checks enforce that restriction. Public deployment, reverse proxying, or shared-host multi-user isolation must not be assumed (server.js:225,239; lib/request-security.js:7; README.md:206).
- A program already running locally can supply an approved Host and matching Origin and use the API. There are no application accounts, sessions establishing identity, roles, or per-user ownership controls in the request path; documentation explicitly excludes authenticating other local programs (server.js:112,120; README.md:210-214).
- The presenter or a party already controlling the presenter's same-origin browser execution can modify attendance, seed/speed, select/reset winners, and submit roster-member names; those are existing application authority rather than proof of a new remote capability (public/js/main.js:17,97,206,288).
- A local filesystem writer or trusted importer can modify dataDir, application files, and dependencies according to its existing OS permissions. createServer's dataDir option and callers' listen choices are programmatic capabilities, not remotely configurable inputs (server.js:100; test/server.test.js:9,11-12).

### Security Objectives

- Preserve local-only operation through accepted listener configuration and independent loopback peer/Host/request-target checks (server.js:112,115,225; lib/request-security.js:5).
- Prevent unrelated browser origins from changing roster/history or controlling launcher-session lifetime, and prevent embedding of application pages (server.js:109,120,123).
- Keep request-selected static resources within the intended public or dependency tree and keep data-file locations chosen by server/operator code (server.js:68,100,200; lib/store.js:107).
- Preserve valid bounded roster/history representations and serialized atomic replacement of persistent files (lib/store.js:7-9,127,135,157).
- Render roster-derived text as data throughout browser display paths; maintain distinction between ordinary text sinks and HTML-generating HUD paths (public/js/main.js:133; public/js/roster.js:26; public/js/hud.js:8-9,175,206).
- Keep subprocess authority restricted to the explicitly requested operator browser-opening workflow, and keep launcher lifecycle controls separate from data-write controls (server.js:129,242).

### Assumptions

- Architecture mapping was independently reviewed; it does not itself count as completed security audit coverage. Source inspection was read-only and offline; no application code, external services, or vulnerability inputs were executed.
- User context authorizes a scan and conditional repository issue creation with suitable labels/priority and contributor/co-author identification. That reporting request does not create an application deployment or authentication boundary.
- The normal supported deployment is a presenter-owned local machine with trusted local programs. README explicitly states participants watch the presenter's screen and local programs are not authenticated (README.md:9,210-214). Host OS account boundaries and filesystem permissions are external controls.
- No material documentation/configuration contradiction was established. README's local-only guarantee matches direct CLI binding plus independent request-peer/authority enforcement. The exported createServer function permits caller-selected listener configuration, but request-time loopback-peer checks remain active (README.md:206; server.js:100,112,225; lib/request-security.js:7).
- There is no supported DATA_DIR environment option or production mount mapping in inspected startup code. All normal launchers use \<repository\>/data; tests pass temporary dataDir values. Relative caller-provided dataDir values would resolve through Node filesystem behavior relative to the importer process working directory (server.js:100,230; lib/store.js:107; test/server.test.js:9).
- Per-store promise queues protect writes within one createStore instance; cross-process coordination and host filesystem link/permission behavior are outside that implementation (lib/store.js:106,110,127).
- The API is a trusted local presenter tool, not an independently verifiable competition service: server-side winner recording enforces roster membership while recent-win exclusion and attendance are browser-side (lib/store.js:157; public/js/eligibility.js:13,26).
- README documents explicit seeded races as demo/testing behavior rather than real picks; the URL seed overrides browser randomness by selecting mulberry32 (README.md:126; public/js/main.js:18,267).
- All normal data consumers resolve to C:\\Local\\Github\\name-picker\\data\\names.json and winners.json, with temporary siblings before rename. Test harnesses override dataDir under os.tmpdir (test/server.test.js:9-12; test/security.test.js:13-16).
- Launcher SSE heartbeat is 15 seconds, default shutdown delay 3,000 ms, and initial browser-reconnect window 4,000 ms; ordinary npm launches without --exit-on-close return 204 without session tracking (server.js:100,130,143,147; lib/browser-session.js:2).
- Third-party dependency internals, external advisory databases, Git history, OS ACL validation, and browser/runtime reproduction are outside this static current-source audit.

## Findings

### No findings

No reportable findings survived the canonical discovery, validation, and reportability gates.

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| Independent baseline audit | Repository-wide static audit and embedded credentials | No issue found | Independent baseline fully security-audited all 38 tracked current files plus ignored data/winners.json. Parent reconciled source inventory, verified material controls, and combined baseline, focused investigation, and independent architecture review. No embedded credentials or source-supported vulnerabilities survived. Current-source scope is complete; runtime execution and installed dependency internals were excluded. |
| Focused request-boundary investigation | Host/origin enforcement, static paths, browser text, persistence | No issue found | Focused investigator returned no findings. server.js:112-124 and lib/request-security.js:1-23 enforce loopback peer/Host/port and exact browser origin. server.js:68-71 resolves platform paths and applies separator-qualified containment. public/js/hud.js:8-9,192,206 escapes names or uses textContent; racers.js:451 feeds canvas text. server.js:47-63 caps bodies; lib/store.js:107-182 fixes paths and serializes atomic writes. Local programs and same-authority filesystem tampering are outside the untrusted-web boundary (README.md:204-216). Tests reviewed statically only. |
| Local listener, browser-origin and framing controls | Cross-origin writes, DNS rebinding, clickjacking, launcher lifecycle | No issue found | server.js:109-124 validates all requests before routing and denies frames; lib/request-security.js:1-23 checks loopback socket address, exact approved authority and bound port, exact Origin and Sec-Fetch-Site, and JSON media type. Direct startup allowlists HOST (server.js:223-239). No CORS permission is emitted. SSE requires the same browser-origin check, preventing an unrelated web origin from suppressing browser opening or scheduling shutdown. Local programs can send matching Origin by design (README.md:204-216). |
| Request-selected static files and subprocess boundaries | Path traversal and command injection | No issue found | server.js:68-71 combines URL normalization, native path.resolve, and separator-qualified containment; server.js:195-208 selects fixed public or node_modules/three roots and GET/HEAD only. Windows backslash traversal remains subject to native resolution and final containment. No in-scope reparse points were found. Link planting requires preexisting local filesystem authority. Browser opening uses fixed platform commands with allowlisted host and numeric port, never HTTP inputs (server.js:223-245). |
| Roster and history persistence | Input bounds, file integrity and authorization | No issue found | server.js:47-63 bounds request buffering to 10,000 bytes; lib/store.js:7-9,135-154 limits roster count and name length and validates element types. Fixed names.json/winners.json paths and sibling temporary files prevent request-selected filenames (lib/store.js:107-108,127-148). All mutations use a per-store promise queue and atomic rename; history retains three entries and recorded names must match the roster (lib/store.js:76,157-182). Presenter control over resetting and race results is intended; local programs are trusted and OS/cross-process isolation is not promised. |
| Browser data rendering and storage | Stored XSS, malicious roster text and browser state | No issue found | public/js/main.js:76,133,177 and public/js/roster.js:26-33,54-61 render user-derived text through textContent/value. public/js/hud.js:8-9,192,206 escapes dynamic names in HTML or uses textContent. Racer labels flow through racers.js:451 to util3d.js:170-191 canvas fillText. No eval or executable construction from user data exists. Session-scoped absent names/speed and origin-scoped mute preference have bounded normalized inputs (lobby-settings.js:43-69; audio.js:3-38). |
| Simulation, visual assets, configuration, tests and secret exposure | Code execution, hidden network access, embedded credentials, unsafe installation | No issue found | All simulation, geometry, scenery, audience, particle, audio, CSS, HTML and test files were fully inspected by the independent baseline. No additional code-execution/network/HTML input sinks or embedded credentials were found. Seeded outcomes are an explicit demo feature, and the presenter already controls results (README.md:126-137; public/js/main.js:17-22,262-296). package-lock.json:17-20 pins Three.js with integrity metadata; installation is an operator-only launcher workflow (start.cmd:10-19). Dependency source and external vulnerability databases were not audited. No application code or tests were executed. |
