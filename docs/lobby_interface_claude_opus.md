# Lobby Interface Redesign Plan

**Goal:** Rework the lobby so that new game modes (a third, fourth, or sixth) can be added without crowding the screen. The lobby should look cleaner than it does today with two modes.

**Scope:** `public/index.html` (the `#lobby` panel), `public/css/style.css` (lobby section), `public/js/main.js` (lobby controller), `public/js/lobby-settings.js`, and the tests that touch the lobby. The race, the wrestling match, the HUD, and the results card are not changed.

---

## 1. How the lobby works today

The lobby is one card, 760 px wide, centred over the 3D scene. From top to bottom:

| # | Block | Notes |
|---|-------|-------|
| 1 | Header: flag chip, title, version, demo badge, tagline, **Exit** | |
| 2 | `#status` warnings | Empty most of the time |
| 3 | **Team list**: count, Select all / Clear all / Edit team list, hint, checkbox grid | The main task |
| 4 | **Last three winners**: pills, Full history, Reset list | Repeats information the roster already shows with "Sits out N more races" badges |
| 5 | **Race length** slider (120 s to 10 s) | Applies only to the race, but sits in the card as if it applied to every mode |
| 6 | **Field guide** `<details>` | Race obstacles and items, racers, plus one paragraph about Let's Rumble at the end of the items column |
| 7 | Sticky footer: **Start race** (primary), **Skip race, just pick**, **🤼 Or Let's Rumble**, **HD**, a hint line, **Preview wrestlers** link | Every way to start lives in one row |

### Problems

1. **Modes are buttons in one row.** The footer already holds four buttons of three different weights plus a link. A third mode means a fifth button. At 760 px it wraps onto a second line, and on phones it becomes a stack of buttons. Nothing groups the buttons, so users can't tell which button picks a game and which button sets an option.
2. **A variant looks like a mode.** **HD** is a model style for Rumble, but it is drawn as a separate peer button. Each future variant (a map, a difficulty, a team size) would repeat this.
3. **Mode-specific settings look global.** Race length sits in the middle of the card while Rumble is selected, and Rumble has no settings area of its own. A shooter's settings (match length, map, and so on) would have no place to go.
4. **Rules are hidden in tooltips.** The "2 to 12 wrestlers" limit appears only in a hover/focus tooltip on a button marked `aria-disabled`. Touch users never see it, and each new mode would add another tooltip.
5. **The copy assumes a race.** "Select at least two racers", "N racers on the grid", "Skip race", and `racer-count: "N racing"` are written for the race even when the user wants to wrestle.
6. **The Field guide is mostly race content.** Rumble is one paragraph at the end of the items column. A third mode would make the guide longer and harder to scan.
7. **Each mode is wired in by hand.** Adding a mode today touches `index.html` (button and tooltip markup), `main.js` (`updateRunButton`, click handlers, a start function, and the `wrestle`/`wrestle-hd` id list), `style.css` (`.rumble-buttons`, `.wrestle-wrap`, `button.wrestle`), `data-rules.js` (`WIN_MODES` and its error message), `page-common.js` (`MODE` labels), `history.js` (per-mode counts), and the tests.
8. **The card is tall.** Header, roster, winners, slider, guide, and footer stack vertically. On a 1366×768 laptop with a full team the user scrolls before seeing anything below the roster.

---

## 2. Design direction

The lobby asks the user three questions, in this order:

1. **Who's here?** (attendance)
2. **What are we playing?** (mode)
3. **How?** (that mode's options)

Then one button starts it.

The redesign gives each question its own clearly separated area. Modes become **selectable cards** in a grid that grows with the number of modes. Each mode gets an **options panel** that appears only while that mode is selected. The footer holds a **single primary button** whose label follows the selected mode.

### Principles

- **One primary action.** The footer always has exactly one prominent button: "Start race", "Start rumble", "Start match", and so on.
- **Modes are a choice, not a set of actions.** Selecting a card commits to nothing. Only Start commits.
- **Settings belong to their mode.** A setting appears only while its mode is selected.
- **Rules are shown as text.** Player limits and other requirements appear as text on the card and next to Start, never only in a tooltip.
- **New modes are data.** Adding a mode means adding a registry entry and a module, not editing lobby markup or CSS.
- **Keep the current look.** Keep the dark panel, the gold accent, the orange primary button, and the Maryland flag chip. This is a reorganisation, not a rebrand.

---

## 3. Proposed layout

### 3.1 Wide screens (≥ 1000 px): two columns

The card widens from 760 px to about 980 px. Attendance goes on the left and the game choice on the right, so both are visible without scrolling.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [MD]  Chesapeake Dev Derby  v1.7.0                                    [Exit] │
│       First across the line leads the team meeting.                          │
├────────────────────────────────────┬─────────────────────────────────────────┤
│ WHO'S HERE              12 playing │ PICK A GAME                             │
│ Select all · Clear all · Edit list │ ┌───────────┐ ┌───────────┐ ┌─────────┐ │
│ ┌──────────┐┌──────────┐┌────────┐ │ │ 🏁        │ │ 🤼        │ │ 🎯      │ │
│ │☑ Ada     ││☑ Grace   ││☐ Linus │ │ │ Derby Race│ │ Rumble    │ │ (new    │ │
│ └──────────┘└──────────┘└────────┘ │ │ 2+ players│ │ 2–12      │ │  mode)  │ │
│ ┌──────────┐┌──────────┐┌────────┐ │ └───────────┘ └───────────┘ └─────────┘ │
│ │☑ Hedy    ││⊘ Barbara ││☑ Alan  │ │   ▲ selected: gold border + check       │
│ │          ││ sits out 2│ │       │ │                                         │
│ └──────────┘└──────────┘└────────┘ │ ── RUMBLE OPTIONS ───────────────────── │
│   …                                │ Models   ( Original | HD )              │
│                                    │ Preview wrestlers ›                     │
│ Sitting out: Barbara, Ken, Mo      │ ▸ How to play                           │
│ Full history · Reset               │                                         │
├────────────────────────────────────┴─────────────────────────────────────────┤
│ 12 wrestlers ready — last one in the ring leads standup.                     │
│                         [ Just pick someone ]   [  ▶ Start rumble  ]         │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Narrow screens (< 1000 px): one column

The same blocks stack in question order. The footer stays sticky, so Start is always on screen.

```
┌───────────────────────────────┐
│ [MD] Chesapeake Dev Derby     │
│                        [Exit] │
├───────────────────────────────┤
│ WHO'S HERE        12 playing  │
│ [roster grid, 2 columns]      │
│ Sitting out: Barbara, Ken, Mo │
├───────────────────────────────┤
│ PICK A GAME                   │
│ ┌─────────────┐┌────────────┐ │
│ │🏁 Derby Race││🤼 Rumble   │ │
│ └─────────────┘└────────────┘ │
│ ┌─────────────┐               │
│ │🎯 (new mode)│               │
│ └─────────────┘               │
│ ── RACE OPTIONS ───────────── │
│ Race length  About 60 s       │
│ ●━━━━━━○──────────────        │
│ ▸ How to play                 │
├───────────────────────────────┤
│ 12 racers ready               │
│ [Just pick]  [ ▶ Start race ] │
└───────────────────────────────┘
```

### 3.3 How the mode grid scales

`grid-template-columns: repeat(auto-fill, minmax(140px, 1fr))`

| Modes | Wide right column (~460 px) | Phone (~340 px) |
|-------|-----------------------------|-----------------|
| 2 | 1 row of 2 (cards stretch) | 1 row of 2 |
| 3 | 1 row of 3 | 2 rows |
| 4–6 | 2 rows | 2–3 rows |
| 7+ | Show the 5 most recently played, plus a **More games…** card that opens the full list in a `<dialog>` | Same |

Cards are short: icon, name, and one line for the player range. The tagline appears in the options panel, not on the card. This keeps the grid compact as modes are added.

---

## 4. Component specifications

### 4.1 "Who's here" (attendance)

- Keep the checkbox grid, the "Sits out N more races" badges, and the Select all / Clear all / Edit team list actions.
- Make the counter mode-neutral: **"12 playing"** instead of "12 racing".
- **Fold "Last three winners" into one line** under the grid: `Sitting out: Barbara (Nov 18), Ken (Nov 14), Mo (Nov 11) · Full history · Reset`. The roster badges already mark these people. The pill list repeats that information and takes a full section. The empty state stays: "No winners yet — everyone is eligible."
- Keep the attendance status line (the count of absent people, and the storage warning) where it is today.
- The badge text "Sits out N more races" becomes **"Sits out N more picks"**. Since 1.6 the three-pick rule applies to any mode (see `saveWinner`).

### 4.2 "Pick a game" (mode cards)

- Markup: a `<fieldset>` with a `<legend>` ("Pick a game") and one native `<input type="radio" name="mode">` per mode, each wrapped in a `<label class="mode-card">`. Native radios give arrow-key navigation, one tab stop, and screen-reader semantics with no extra code.
- Card content:
  - Icon (emoji, matching the existing style)
  - Name ("Derby Race", "Let's Rumble")
  - Player range ("2+ players", "2–12 players")
- States:
  - **Selected**: gold border and tinted background (the same treatment as a checked roster tile: `rgba(242,184,23,.55)` border on `#27241f`), plus a ✓ in the corner.
  - **Hover / focus-visible**: the same blue outline used elsewhere (`#8ab4f8`).
  - **Doesn't fit the current headcount**: the card stays selectable, the player-range line turns red (`#ffa8a8`), and the line reads "2–12 players · 14 checked". The card is not disabled, because users must be able to select a mode and then adjust attendance to fit it.
- The selected mode is saved in `lobby-settings` (sessionStorage, next to `absent` and `speed`). It is restored on reload and when returning from a match.

### 4.3 Mode options panel

- Directly under the cards, with the heading **"‹Mode› options"**. Only the selected mode's panel is rendered. The others are `hidden`.
- Each mode declares its options in the registry (see §5). The lobby renders a small, fixed set of control types:
  - `range`: a stepped slider with a value read-out and scale labels. The current race-length slider becomes this control unchanged, with the same look, `aria-valuetext`, and `--fill`.
  - `segmented`: a radio group styled as a pill toggle. Rumble's **Original | HD** model choice uses it, replacing the separate HD button.
  - `link`: a secondary link, such as **Preview wrestlers ›**.
- **How to play**: a `<details>` element at the bottom of the panel holding that mode's part of today's Field guide. Race gets obstacles, items, and racers. Rumble gets the battle royal rules and the wrestler list. The single global Field guide is removed.
- A mode with no options shows only its tagline and How to play. The panel then stays short instead of showing an empty box.

### 4.4 Footer

- Left: a **readiness line** written by the mode, for example "12 racers ready — may the best tab win." or "Rumble needs 2–12 players. 14 are checked — uncheck 2." The line is a live region (`role="status"`), so screen-reader users hear why Start is disabled.
- Right:
  - **Primary**: `▶ Start ‹verb›`. The label comes from the registry ("Start race", "Start rumble"). The button is disabled when the headcount doesn't fit the mode.
  - **Secondary**: **Just pick someone**, which replaces "Skip race, just pick". It works with any mode selected, so it keeps a small fixed place and never competes with the mode cards. It needs only two players.
- Enter on the page starts the **selected** mode. Today Enter always starts the race.
- First-load focus goes to Start when it is enabled, as now.

### 4.5 Header

- No structural change. On narrow screens the header could become a single line by dropping the tagline under the title. This is optional.

### 4.6 What gets removed

- `.rumble-buttons`, `.wrestle-wrap`, `button.wrestle`, `button.rumble-hd`, and their tooltip CSS.
- The `#wrestle` / `#wrestle-hd` buttons and their `-tip` tooltips.
- The `#pick` label "Skip race, just pick", the "Or Let's Rumble" copy, and the global `#guide`.
- The `.lobby-summary` row. Its hint moves into the readiness line, and its link moves into the Rumble options.

---

## 5. Architecture: a mode registry

The key change for growth is a new module, `public/js/modes.js`. It makes each mode one self-describing object. The lobby renders from the registry and doesn't need to know which modes exist.

```js
// public/js/modes.js
export const MODES = [
  {
    id: 'race',
    winMode: 'race',              // what saveWinner() records; must be in WIN_MODES
    icon: '🏁',
    name: 'Derby Race',
    verb: 'race',                 // "Start race", "N racers ready"
    tagline: 'First across the line leads the team meeting.',
    players: { min: 2, max: Infinity },
    options: [
      { id: 'speed', type: 'range', label: 'Race length', steps: RACE_LENGTHS /* … */ },
    ],
    guide: 'race',                // id of a <template> holding the How to play content
    ready: (n) => `${n} racers on the grid — may the best tab win.`,
    start: (ctx, opts) => startRace(ctx, opts),
  },
  {
    id: 'rumble',
    winMode: 'wrestle',
    icon: '🤼',
    name: 'Let’s Rumble',
    verb: 'rumble',
    tagline: 'Battle royal: last one in the ring leads standup.',
    players: { min: MIN_WRESTLERS, max: MAX_WRESTLERS },
    options: [
      { id: 'models', type: 'segmented', label: 'Models',
        choices: [{ value: 'classic', label: 'Original' }, { value: 'hd', label: 'HD' }] },
      { id: 'preview', type: 'link', label: 'Preview wrestlers', href: 'character-prototype.html' },
    ],
    guide: 'rumble',
    ready: (n) => `${n} wrestlers ready — last one in the ring leads standup.`,
    start: (ctx, opts) => startRumble(ctx, opts.models),
  },
];
```

- `ctx` is a small object the lobby passes in: the selected names, the `show`/`stored` helpers, `rng`, `game`, `hud`, `sfx`, `saveWinner`, and `setPhase`. The current `run()` and `wrestle()` bodies move behind `start` almost unchanged. The no-WebGL fallbacks stay inside each start function.
- The lobby controller becomes generic:
  - `renderModeCards()`, `renderOptions(mode)`, and `updateReadiness()` replace `updateRunButton()`'s hard-coded `wrestle` / `wrestle-hd` loop.
  - A single `start()` click handler calls `selectedMode.start(ctx, selectedOptions)`.
- `lobby-settings.js` grows to `{ absent, mode, options: { race: { speed }, rumble: { models } } }`. It reads the old `{ speed }` shape so saved sessions survive the upgrade. `?speed=` keeps working, and a new `?mode=rumble` URL switch is added for demos and tests.
- How to play content lives in `<template id="guide-race">` and `<template id="guide-rumble">` in `index.html`. Static text stays in HTML, where it is easy to edit, and is cloned into the panel on selection.
- **Server/history coupling:**
  - `WIN_MODES` in `data-rules.js` and `MODE` labels in `page-common.js` remain the source of truth for what the server accepts and how history is labelled.
  - A new unit test asserts that every registry `winMode` is in `WIN_MODES` and has a `MODE` label. A mode that forgets this fails CI instead of failing at save time.
  - The `data-rules.js` error message is built from `WIN_MODES` rather than hard-coded.
  - `history.js`'s summary line counts per mode generically rather than with three hand-written filters.

### Adding a mode after the redesign (e.g. a third-person shooter)

1. Write the game module (for example `shooter.js` and `shooter-sim.js`), following the `wrestle.js` / `wrestle-sim.js` split.
2. Add one entry to `MODES` with its icon, name, player range, options, readiness text, and `start`.
3. Add its `winMode` to `WIN_MODES` and a label to `MODE`.
4. Add `<template id="guide-shooter">` with its How to play text.
5. No changes to the lobby layout, CSS, or footer.

---

## 6. Visual details

- **Section headings**: small caps style with letter-spacing (`font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: var(--muted)`) for "Who's here", "Pick a game", and "‹Mode› options". The headings get quieter, and the cards and Start button become the focal points.
- **Spacing**: an 8 px rhythm. 24 px between the three areas, 12 px inside them. Use one divider (`1px solid var(--panel-border)`) between the columns, or between stacked areas on narrow screens, instead of a separately bordered box per block. Today the speed control has its own box.
- **Mode card size**: 140 px minimum width, about 76 px tall, 12 px radius (matching the roster tiles' rounded look), and a 28 px icon. Name in `font-weight: 650`.
- **Colour**: keep the existing tokens. Gold means "selected / count", orange means "the one action", blue means "link / focus", and red text means "doesn't fit". No new hues. Use solid colours on the panel instead of `rgba` overlays, as the stylesheet already does, so `contrast.test.js` can still measure every pair.
- **Motion**: a 120 ms crossfade when switching options panels, and the existing pressed effect on Start. All of it is disabled under `prefers-reduced-motion`, as now.
- **Tooltips**: none are needed in the lobby after the redesign except Exit's. Remove the "hover to learn the rules" pattern.

---

## 7. Accessibility checklist

- Mode cards are native radios in a `<fieldset>`/`<legend>`. They are reachable by Tab and moved between with the arrow keys.
- Each card's player-range line is part of its label, so "Let's Rumble, 2–12 players, 14 checked" is announced together.
- Start uses the real `disabled` attribute. The readiness line explains why, in a live region, and is linked with `aria-describedby`.
- The options panel is announced through its heading. Avoid moving focus on mode change. Focus stays on the selected card.
- Focus outlines, contrast ≥ 4.5:1 for all text, and 44 px minimum touch targets on cards and footer buttons.
- The whole lobby works at 320 px width without horizontal scrolling.

---

## 8. Implementation phases

Each phase is one PR that passes `npm test` and leaves the app shippable.

### Phase 1: Mode registry, no visual change
- Add `public/js/modes.js` with `race` and `rumble`. Move the `run()`/`wrestle()` bodies behind `start`.
- Rewire the existing buttons to call through the registry, keeping today's DOM ids.
- Generalise the `WIN_MODES` error message and the `history.js` per-mode counts.
- Add a test: every registry `winMode` is in `WIN_MODES` and has a `MODE` label.
- **Result:** identical lobby, with the plumbing ready.

### Phase 2: Settings model
- Extend `lobby-settings.js` to `{ absent, mode, options }`, reading the old `{ speed }` shape.
- Add the `?mode=` URL switch.
- Extend `test/lobby-settings.test.js`: round trip, the old format upgraded, an unknown mode falling back to `race`, and invalid option values falling back to defaults.

### Phase 3: New layout
- Replace the footer button row, the global speed section, and the global guide with: mode cards, the options panel (range, segmented, link, How to play), and the new footer (readiness line, Just pick someone, Start ‹verb›).
- Fold Last three winners into the "Sitting out" line.
- Add the two-column layout at ≥ 1000 px and the single column below.
- Delete the obsolete CSS and markup listed in §4.6.
- Update the tests:
  - `test/callout-browser.test.js`: today it waits for `#wrestle-hd` and clicks it. Instead, select the Rumble card, choose HD, and click Start (or load `?mode=rumble` with an HD option switch).
  - `test/contrast.test.js`: replace the `button.wrestle[aria-disabled]` and `.wrestle-wrap` tip checks with checks on `.mode-card` (selected, unselected, and doesn't-fit text) and the disabled primary button.
  - Check `test/demo.test.js` and any other test that looks up lobby ids.

### Phase 4: Polish and verification
- Copy pass: mode-neutral wording throughout ("playing", "picks", "Just pick someone").
- Keyboard pass: Enter starts the selected mode, first-load focus works, and arrow keys move between cards.
- Screenshot pass at 1920×1080, 1366×768, 768×1024, and 375×667, with 2, 12, and 30 names. Also show a dummy third card, hidden behind `?test`, to confirm the grid with three modes.
- Update `README.md` and `usage.md` screenshots and instructions. Add a CHANGELOG entry.

### Phase 5 (when needed): More than six modes
- Add the **More games…** card and the full-list `<dialog>`, which sorts recently played modes first using the history file's `mode` field.
- Only build this once a seventh mode actually exists.

---

## 9. Success criteria

- With two modes, the lobby has **one primary button and one secondary button** in the footer, down from four buttons and a link.
- At 1366×768 with 15 names, the roster, all mode cards, the selected mode's options, and Start are visible **without scrolling**.
- Adding a mock third mode in a test branch touches **only** `modes.js`, the new game module, `WIN_MODES`/`MODE`, and one `<template>`. `style.css` and the lobby markup are unchanged.
- No lobby rule (player limits, eligibility) is visible only in a tooltip.
- `npm test` passes, including the updated contrast and browser tests.

---

## 10. Open questions

1. **Should "Just pick someone" become a mode card ("Quick pick")?** This plan keeps it as a footer action, because it is an escape hatch that ignores mode options. As a card it would be more consistent, but it would push real games down the grid.
2. **The default mode for first-time visitors.** Use Race, which matches today's behaviour, or the most recently played mode from the history file? This plan uses the last mode in the session, falling back to Race.
3. **Branding as modes grow.** "Chesapeake **Dev Derby**" and the tagline "First across the line…" describe a race. With several modes, the header tagline could follow the selected mode (each registry entry has a `tagline`), or become neutral ("Pick who leads the team meeting").
