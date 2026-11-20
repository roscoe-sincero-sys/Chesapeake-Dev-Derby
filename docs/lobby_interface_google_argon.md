# Lobby UI Redesign Plan: Extensible Multi-Mode Architecture

## 1. Visual & Structural Audit of the Current Lobby

The current lobby (`#lobby` in [index.html](file:///C:/Local/Github/name-picker/public/index.html#L22-L153) and [style.css](file:///C:/Local/Github/name-picker/public/css/style.css#L82-L396)) was originally built around a single **Derby Race** mode, with **Wrestling ("Let's Rumble" / "HD")** and **Random Pick ("Skip race, just pick")** bolted onto the footer over subsequent releases.

### Why Adding a Third Mode (e.g., Third-Person Shooter) Breaks the Current Design

1. **Footer Action Crowding (`.lobby-foot`):**
   - The sticky footer ([index.html](file:///C:/Local/Github/name-picker/public/index.html#L135-L152), [style.css](file:///C:/Local/Github/name-picker/public/css/style.css#L353-L366)) currently packs **four action buttons** (`#run`, `#pick`, `#wrestle`, `#wrestle-hd`) plus a full-width summary line (`#run-hint` + `Preview wrestlers` link) into a 760px container.
   - Adding a third-person shooter mode (especially with sub-options like map/style or preview links) would force the footer into multiple ragged rows of competing buttons, breaking visual hierarchy and consuming vertical viewport space on laptops and phones.

2. **Race-Biased Copy and Controls:**
   - **Header & Roster:** The tagline says *"First across the line leads the team meeting"* ([index.html](file:///C:/Local/Github/name-picker/public/index.html#L27)), the counter says `N racing` (`#racer-count` in [main.js](file:///C:/Local/Github/name-picker/public/js/main.js#L279)), and recent winners show badges saying `Sits out N more races` ([main.js](file:///C:/Local/Github/name-picker/public/js/main.js#L176)).
   - **Always-Visible Race Slider:** The `.speed-control` section (`Race length`, [index.html](file:///C:/Local/Github/name-picker/public/index.html#L76-L90)) occupies a prominent 110px-tall box even when the user intends to run a wrestling match (where `race-speed` does nothing) or a future shooter match.
   - **Monolithic Field Guide (`#guide`):** The `<details id="guide">` block ([index.html](file:///C:/Local/Github/name-picker/public/index.html#L92-L133)) mixes race obstacles, race `{?}` crate items, racer vehicles, and a tacked-on *"Let's Rumble"* paragraph at the bottom of the right column. Adding shooter rules, weapons, or arena hazards here would turn the guide into a wall of unrelated text.
   - **Orphaned Mode Links:** The `Preview wrestlers` link (`a.wrestler-preview` in [index.html](file:///C:/Local/Github/name-picker/public/index.html#L150)) sits permanently in the bottom-right corner of the footer regardless of mode.

3. **Inconsistent Eligibility & Constraint Feedback:**
   - Race and Random Pick require `2+` participants (`disabled` attribute), whereas Wrestling requires `2 to 12` participants (`aria-disabled="true"` with custom `.wrestle-wrap .tip` tooltips in [style.css](file:///C:/Local/Github/name-picker/public/css/style.css#L889-L904)).
   - If a future Third-Person Shooter mode requires `2 to 16` or `3 to 10` players, having separate hover tooltips on individual launch buttons makes it unclear why a mode is unavailable until the user hovers or focuses each button.

---

## 2. Core Design Proposal: "Select Mode -> Configure -> Launch"

To keep the lobby clean, balanced, and ready for 3, 4, or more modes without visual clutter, we separate **Mode Selection** from **Launch Execution**.

```
+-----------------------------------------------------------------------+
| [MD]  Chesapeake Dev Derby  v1.5.0                            [Exit]  |
|       Pick today's standup leader — by race, ring, or arena.          |
+-----------------------------------------------------------------------+
| Team list  (8 ready)                 Select all · Clear all · Edit    |
| [x] Ada          [x] Grace        [x] Linus        [ ] Hedy (absent)  |
| [x] Margaret     [x] Radia        [ ] Ken (Sits out 2 more picks)     |
+-----------------------------------------------------------------------+
| Last three winners                               Full history · Reset |
| (trophy) Ken (Nov 19)   (trophy) Barbara (Nov 18)                     |
+-----------------------------------------------------------------------+
| Game mode                                                             |
| +-------------------+  +-------------------+  +-------------------+   |
| | 🏁 Derby Race     |  | 🤼 Let's Rumble   |  | 🎯 Laser Tag / TPS|   |
| | 2+ players        |  | 2–12 players      |  | 2–16 players      |   |
| | Obstacle track    |  | Mahabharata ring  |  | Arena elimination |   |
| +-------------------+  +-------------------+  +-------------------+   |
|                                                                       |
| +-------------------------------------------------------------------+ |
| | [Contextual Mode Panel — changes based on selected mode card]     | |
| | • When "Derby Race" is selected:                                  | |
| |     Race length slider (120s .. 10s)                              | |
| |     ▸ Field guide: obstacles, items & racers                      | |
| | • When "Let's Rumble" is selected:                                | |
| |     Character style: (•) HD Detailed   ( ) Classic                | |
| |     ▸ Ring guide: Mahabharata roster & rules   [Preview wrestlers]| |
| | • When "Third-Person Shooter" is selected:                        | |
| |     Arena / pacing options                                        | |
| |     ▸ Arena guide: cover, gadgets & rules                         | |
| +-------------------------------------------------------------------+ |
+-----------------------------------------------------------------------+
| [ ▶ Start Derby Race ]   [ 🎲 Just pick someone ]   8 ready to play.  |
+-----------------------------------------------------------------------+
```

### Key UX Principles

1. **Mode Picker Grid (`.mode-grid`):**
   - A responsive CSS Grid (`grid-template-columns: repeat(auto-fit, minmax(155px, 1fr))`) of selectable mode cards (`role="radiogroup"` or segmented buttons with `aria-checked`).
   - Each card displays an icon, mode title, one-line tagline, and a player-count pill (`2+`, `2–12`, `2–16`).
   - Scales effortlessly from 2 modes to 3, 4, or 6 modes without adding a single button to the sticky footer.
   - If the current checked roster count is outside a mode's bounds (e.g., 15 people checked when Wrestling allows 2–12), the card remains selectable so the user can inspect it and read why, while its count pill highlights the requirement (`2–12 needed · 15 checked`) and the primary launch button disables with a clear explanation in `#run-hint`.

2. **Contextual Mode Drawer (`.mode-config`):**
   - Only the **active mode's** settings, preview link, and field guide are shown inside the `.mode-config` surface (`#1b2639` solid background, matching the existing `.speed-control` aesthetic).
   - **Derby Race:** Shows the `Race length` slider (`#race-speed`) and the race-specific `<details>` guide (Obstacles, Items, Racers).
   - **Let's Rumble:** Replaces the race slider with a clean segmented toggle for **Character Models** (`HD Detailed` vs `Classic Original`), the `Preview wrestlers` link, and the wrestling-specific guide (`#guide-wrestlers` & ring rules).
   - **Future Modes (e.g., Third-Person Shooter):** Plugs into the same slot with its own mode options and guide without elongating the page.

3. **Single Primary CTA + Universal Quick-Pick Footer (`.lobby-foot`):**
   - The sticky footer shrinks to **two buttons**:
     1. **Primary CTA (`#run`):** Dynamically labeled for the active mode (`Start race`, `Start rumble (HD)`, `Start arena match`, etc.). Pressing `Enter` anywhere in the lobby triggers the active mode.
     2. **Secondary Quick-Pick (`#pick`):** `Skip & just pick` (always available whenever `2+` teammates are checked, independent of mode-specific upper limits like Wrestling's 12-player cap).
     3. **Status Hint (`#run-hint`):** Concise, mode-aware readiness message (e.g., `"8 wrestlers ready for the ring."` or `"You need 2 to 12 wrestlers (14 checked)."`).

4. **Mode-Neutral Roster Terminology:**
   - Change `#racer-count` from `"8 racing"` to `"8 ready"` (or `"8 checked"`).
   - Change recent-winner badges from `"Sits out 2 more races"` to `"Sits out 2 more picks"`, matching the post-match save message introduced in `saveWinner()` ([main.js](file:///C:/Local/Github/name-picker/public/js/main.js#L127)).

---

## 3. Data-Driven Mode Registry Architecture

To make adding a new mode declarative rather than a scattershot edit across HTML, CSS, and JS event listeners, introduce a `MODES` registry in `public/js/lobby-settings.js` (or a dedicated `public/js/modes.js` module):

```js
export const MODES = [
  {
    id: 'race',
    icon: '🏁',
    title: 'Derby Race',
    summary: 'Side-scrolling obstacle track',
    minPlayers: 2,
    maxPlayers: Infinity,
    ctaLabel: () => 'Start race',
    quitLabel: '✕ Quit race',
    readyHint: (n) => `${n} racers on the grid — may the best tab win.`,
    winnerMode: 'race',
  },
  {
    id: 'wrestle',
    icon: '🤼',
    title: 'Let’s Rumble',
    summary: 'Mahabharata ring battle royal',
    minPlayers: MIN_WRESTLERS, // 2
    maxPlayers: MAX_WRESTLERS, // 12
    variants: [
      { id: 'hd', label: 'HD (Detailed models)', tip: 'Detailed character models.' },
      { id: 'classic', label: 'Classic (Original)', tip: 'Original character models.' },
    ],
    defaultVariant: 'hd',
    ctaLabel: (variant) => (variant === 'hd' ? 'Start Rumble (HD)' : 'Start Rumble'),
    quitLabel: '✕ Quit match',
    readyHint: (n) => `${n} ready to wrestle — last one in the ring leads standup.`,
    winnerMode: 'wrestle',
  },
  // Future mode example: adding a 3rd mode requires only a registry entry + mode runner!
  /*
  {
    id: 'shooter',
    icon: '🎯',
    title: 'Bay Blaster',
    summary: '3D arena tag elimination',
    minPlayers: 2,
    maxPlayers: 16,
    ctaLabel: () => 'Start arena match',
    quitLabel: '✕ Quit match',
    readyHint: (n) => `${n} players entering the arena.`,
    winnerMode: 'shooter',
  },
  */
];
```

### Persistence & URL Parameters
- Extend `readLobbySettings()` and `writeLobbySettings()` in [lobby-settings.js](file:///C:/Local/Github/name-picker/public/js/lobby-settings.js#L43-L66) to persist `mode` (default `'race'`) and `wrestleStyle` (default `'hd'` or `'classic'`) alongside `absent` and `speed` in `sessionStorage` (`derby-lobby-settings`), while keeping backwards compatibility with existing stored JSON.
- Support `?mode=wrestle` (or `?mode=race`) in the URL query string for direct testing and bookmarks.
- Preserve backwards compatibility for existing tests (`test/callout-browser.test.js`, `test/contrast.test.js`, `test/lobby-settings.test.js`) during migration.

---

## 4. Accessibility & WCAG Contrast Compliance

This project enforces strict automated WCAG 2 AA checks in [test/contrast.test.js](file:///C:/Local/Github/name-picker/test/contrast.test.js):
- **Solid Surface Backgrounds Only:** Every surface selector tested in `SURFACES` must use an opaque `#rrggbb` background color (no `rgba()`, `hsla()`, or `transparent`), because automated contrast checkers like WAVE measure text against the element's own solid background.
  - Unselected mode card (`.mode-card`): `background: #1e222d;` (matches `#roster label`), text `var(--text)` (`#f1f3f8`, ratio **13.5:1**) and `var(--muted)` (`#a9b1c3`, ratio **7.2:1**).
  - Selected mode card (`.mode-card[aria-checked="true"]`): `background: #27241f; border-color: var(--gold);` (matches `#roster label:has(input:checked)`), text `var(--text)` (ratio **13.1:1**) and `var(--gold)` (`#f2b817`, ratio **8.3:1**).
  - Out-of-range player count pill on a mode card (`.mode-card.out-of-range .mode-limit`): text `#ffa8a8` on `#1e222d` (ratio **7.8:1**).
  - Mode configuration panel (`.mode-config`): `background: #1b2639; border: 1px solid #67758d;` (matches `.speed-control`).
- **No Opacity Dimming on Disabled Controls:** Disabled buttons (`button.primary:disabled`, `.mode-card[aria-disabled="true"]`) must use explicit solid colors (`background: #2f3440; color: var(--muted);`) and never `opacity` or `filter: brightness()`.
- **Keyboard Navigation:**
  - The mode selector uses `role="radiogroup"` with `role="radio"` buttons (or native `<input type="radio">` inside styled labels, just like `#roster label`), giving full arrow-key navigation, `:focus-visible` outlines, and screen-reader announcements out of the box.
  - Pressing `Enter` in the lobby launches the currently selected mode if the player count is valid.

---

## 5. Step-by-Step Implementation Plan

### Phase 1: State & Settings Extension (`public/js/lobby-settings.js`)
1. Add `MODES` metadata and helper validators (`normalizeMode(value)`, `normalizeWrestleStyle(value)`).
2. Extend `readLobbySettings()` and `writeLobbySettings()` to read/write `mode` and `wrestleStyle` with safe defaults (`mode: 'race'`, `wrestleStyle: 'hd'`), ensuring existing `sessionStorage` payloads without those keys still parse cleanly.
3. Update [test/lobby-settings.test.js](file:///C:/Local/Github/name-picker/test/lobby-settings.test.js) to cover mode and variant persistence and fallback behavior.

### Phase 2: HTML Structure Refactor (`public/index.html`)
1. Update the lobby header tagline and roster section hints to use mode-neutral phrasing (`"Pick today's standup leader"`, `"Sits out N more picks"`).
2. Replace the standalone `.speed-control` and monolithic `<details id="guide">` with a unified `<section id="mode-section" aria-labelledby="mode-heading">`:
   - Mode card grid (`#mode-picker`) containing the selectable cards for **Derby Race** and **Let's Rumble** (and structured so a 3rd card drops straight in).
   - Contextual configuration container (`.mode-config`) with:
     - `#mode-panel-race`: The existing `#race-speed` slider and race-only field guide (Obstacles, Items, Racers).
     - `#mode-panel-wrestle`: The model style selector (`Classic` vs `HD`), the `Preview wrestlers` link, and the wrestling field guide (`#guide-wrestlers`).
3. Simplify `<footer class="lobby-foot">` to:
   - Primary launch button (`#run`), dynamically dispatching the selected mode.
   - Secondary quick-pick button (`#pick`, `"Skip, just pick"`).
   - Status hint (`#run-hint`).
   - *(Compatibility note)*: Keep `#wrestle` and `#wrestle-hd` as either the variant radio/buttons inside the Rumble panel or aliased hooks so existing browser tests (`test/callout-browser.test.js`) can select and start an HD wrestling match reliably.

### Phase 3: Styling & Responsive Layout (`public/css/style.css`)
1. Add `.mode-grid`, `.mode-card`, `.mode-config`, and `.variant-toggle` styles using opaque `#rrggbb` backgrounds that match the Maryland palette (`--gold`, `--orange`, `--red`, `--panel`).
2. Ensure mobile responsiveness (`@media (max-width: 720px)` and `@media (max-width: 560px)`):
   - Mode cards wrap cleanly from a 3-column grid on desktop to a 2-column or 1-column compact list on phones.
   - The simplified `.lobby-foot` fits on a single row on desktop/tablet and wraps cleanly on 390px phone viewports.
3. Register all new surface selectors (`.mode-card`, `.mode-config`, `.variant-option`) in [test/contrast.test.js](file:///C:/Local/Github/name-picker/test/contrast.test.js) `SURFACES` to guarantee WCAG 2 AA compliance.

### Phase 4: Lobby Controller Logic (`public/js/main.js`)
1. Track `state.mode` and `state.wrestleStyle` (initialized from URL params `?mode=` / `readLobbySettings()`).
2. Update `updateRunButton()`:
   - Evaluate player-count eligibility against the active mode's `minPlayers` and `maxPlayers`.
   - Update each mode card's count badge (showing a warning state if the current checked count exceeds a mode's cap, e.g., `2–12 players`).
   - Update `#run` text (`Start race`, `Start Rumble (HD)`, `Start Rumble`) and disabled state, plus `#run-hint`.
3. Update `#run` click and `Enter` key handler to invoke `run()` when `state.mode === 'race'`, `wrestle(state.wrestleStyle)` when `state.mode === 'wrestle'`, or any future mode runner registered in `MODES`.

### Phase 5: Verification & Regression Testing
1. **Contrast & Accessibility Tests:** Run `node --test test/contrast.test.js` to verify all new mode card and configuration panel surfaces meet `>= 4.5:1` contrast on solid backgrounds and no hidden elements fail opacity checks.
2. **Unit & Settings Tests:** Run `npm test` to verify all 155+ unit and simulation tests pass.
3. **Headless Chrome Browser Tests:** Update/verify [test/callout-browser.test.js](file:///C:/Local/Github/name-picker/test/callout-browser.test.js) if needed so starting the HD match in headless Chrome works seamlessly with the new mode selector, and run with `DERBY_BROWSER_TESTS=required`.
4. **3-Mode Scalability Proof:** Verify layout rendering at `1280×800`, `844×390`, and `390×844` with both 2 modes and a mocked 3rd mode (Third-Person Shooter) to confirm zero footer crowding or horizontal overflow.
