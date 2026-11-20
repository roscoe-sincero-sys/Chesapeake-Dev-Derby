# Chesapeake Dev Derby lobby redesign

Give the lobby a **mode selector, one settings area for the selected mode, and one Start button**. Keep attendance shared across modes and keep **Pick now** within reach for teams that want an immediate result. A third game, such as a third-person shooter called Arena, would add one choice to the selector and reuse the same settings and launch area.

## What the current lobby does well and where it runs out of room

I reviewed the v1.6.2 lobby in Chrome at 1440 × 900, 390 × 844, and 320 × 568 with 12 teammates and three recent winners. The Maryland flag, dark panel, and 3D scenery give the app a recognizable identity. The attendance checkboxes and sit-out labels make the selection rules visible. The bright Start race button is easy to find.

- **Race owns most of the screen.** The tagline, attendance count, large Race length control, field guide, and start hint all use race language. Wrestling appears at the end of the footer as “Or Let’s Rumble” and a separate “HD” button. The footer mixes mode selection, a graphics variant, launch actions, and a preview link.
- **The footer is already at its limit.** At 390 px wide, Start race and the immediate pick occupy one row, with Rumble and HD on a second. At 320 px they take three button rows. The sticky footer and its summary measure about 260 px tall in the 568 px viewport. At the top of the scroll area, it covers the roster rows.
- **The header and status copy compete for space on phones.** The title, badge, tagline, and Exit use about 188 px at 320 px wide. The bottom hint repeats the attendance count and wraps beside the preview link. Mode-specific requirements are revealed through tooltips, which are easy to miss on a touch screen.

The pressure points are the fixed-width panel and sticky footer in [`style.css`](public/css/style.css), the race settings and launch controls in [`index.html`](public/index.html), and the mode-specific button wiring in [`main.js`](public/js/main.js).

## Proposed layout

Use one responsive panel. On desktop, place **Team list** on the left and **Game mode** on the right. At widths where both columns stop fitting comfortably, stack a compact team summary above the selector. Keep recent winners and history below the main setup on both layouts.

```text
Desktop                                   Phone
┌─────────────────────────────────────┐   ┌──────────────────────────┐
│ Chesapeake Dev Derby     Sound Exit │   │ Chesapeake Dev Derby     │
│ Pick who leads the team meeting.    │   │ v1.6.2        Sound Exit │
├────────────────┬────────────────────┤   ├──────────────────────────┤
│ Team list      │ Game mode          │   │ Team list · 9 ready    ▸ │
│ 9 ready        │ ● Race   ○ Rumble  │   ├──────────────────────────┤
│ 3 sitting out  │ ○ Arena            │   │ Game mode                │
│                │                    │   │ ● Race                   │
│ [x] Alan       │ Race length [60s]  │   │ ○ Rumble                 │
│ [x] Barbara    │ Field guide ▸      │   │ ○ Arena                  │
│ [ ] Ada        │                    │   │ Race length [60s]        │
│ Edit team list │ [Start race]       │   │ [Start race]             │
│                │ Pick now           │   │ Pick now                 │
├────────────────┴────────────────────┤   ├──────────────────────────┤
│ Recent winners         Full history │   │ Recent winners / history │
└─────────────────────────────────────┘   └──────────────────────────┘
```

“Arena” illustrates the space a third mode would occupy. The first release of this layout ships with Race and Rumble.

### Visual direction

- Keep the Maryland flag mark and dark palette. Reduce the flag mark on phones and use the existing system typeface. Keep the app name and utility controls compact, and keep the Demo label and disclosure readable whenever the browser-only demo is active.
- Use compact, consistently sized mode choices with a visible radio indicator and an outline for the selection. Reserve the strong orange fill for Start. Keep secondary actions, including Pick now and previews, visually quieter. Let labels wrap at larger text sizes.
- Increase space between sections and reduce decoration inside them. Use consistent row heights and subtle dividers for the team list. Keep checked, absent, and sitting-out states distinguishable by their controls or text as well as by color.
- Use the existing scenery as a backdrop around the panel with an optional subdued lobby treatment. Keep text surfaces opaque and avoid rotating previews or separate canvases for modes. Honor reduced-motion preferences and keep the layout usable when the 3D backdrop is unavailable.
- Start with a desktop panel around 1,000–1,080 px wide and 16 px outer gutters on phones. Use a single vertical scrolling surface. Start sits directly below the active settings in the scroll flow. The desktop team list is open by default. On phones it opens inline from the team summary.

### Mode and attendance behavior

| Choice | Settings shown when selected | Action and eligibility |
| --- | --- | --- |
| Race | The existing five race lengths, presented as a compact labeled control, and the race field guide inside a disclosure | **Start race** with at least two ready teammates. Keep the current 60-second default and saved race length. |
| Rumble | **Character models** with **Classic** and **HD** choices, plus **Preview wrestlers** | **Start rumble** with 2–12 ready teammates. Classic is the initial variant. HD uses the existing model-loading path and fallback. |
| Pick now | Shared secondary action below Start | Immediately chooses an eligible attendee with at least two ready teammates. The wording makes clear that no game plays. |
| Arena (example) | A short mode description and any settings that mode actually needs | **Start arena** would use the same launch position. The future mode supplies its own participant limits and availability rules. |

Keep one attendance selection across mode changes. Selecting a mode reveals its setup. If the selected mode cannot run, show the reason beside Start, such as “Rumble supports 2–12. You have 13 ready.” Keep the mode selectable so users can inspect it. Offer **Review team list** from that message when attendance can resolve the problem, and link to the editor when the team is empty. Changing attendance updates the reason and the action immediately. Select all and Clear all operate on eligible teammates. Keep the last-three-winner rule, reset confirmation, history, and team editor.

For two or three modes, show every choice in the compact selector. Use a two-column grid where labels fit and one column on narrow screens. Use the same choice treatment for up to six modes. If the catalog grows beyond six, offer an inline **Show all modes** disclosure with the choices kept in a stable order. Keep the current selection visible while it is active. Expanding the selector adds rows while the settings and launch positions remain part of the same flow.

## Implementation plan

1. **Rebuild the lobby shell with Race and Rumble.** In `public/index.html` and `public/css/style.css`, create the header, roster, mode setup, and history sections. Use the team-first order in the document and on-screen. Make attendance an inline disclosure on phones and scope scrolling and responsive styles to the lobby.
2. **Unify selection and launch.** Define a small lobby mode list with a stable ID, display name, description, eligibility rule, settings view, and launch label. Wire its entries to the existing `run()` and `wrestle(modelStyle)` functions in `public/js/main.js`. Keep `pick()` as a shared action. Use the existing eligibility helpers and the same start guard for click and keyboard activation. Recheck eligibility on launch and prevent a second launch while the current request is loading.
3. **Move options and guides into the active mode.** Render Race length and its guide under Race. Render Classic/HD and the preview link under Rumble. Keep a new tab’s initial selection as Race. Store deliberate mode and variant selections with existing tab settings in `public/js/lobby-settings.js` so returning from a result or editor preserves them. Continue reading older attendance and race-length settings. Fall back to Race if a saved mode ID no longer exists.
4. **Handle focus and feedback.** Use native radio groups with labels for mode and variant, retain clearly visible keyboard focus, and put the selected mode’s availability message next to Start. Preserve Enter to start the selected, available mode from non-interactive lobby space. Give radios, form fields, and focused controls their normal behavior. Return focus to a visible setup control after Quit or Back to lobby. Test loading, missing team data, connection errors with Retry, blocked storage, and HD fallback. Use an accessible status message for consequential state changes.
5. **Prove the layout with a third-mode fixture.** Add a test-only Arena entry to verify selection, mode-specific settings, capacity messages, and the shared Start control. Use a stub launcher for the fixture. Exercise a six-mode fixture, a long label, and the Show all modes disclosure with seven or more choices. Any production mode that adds a new winner-history type will need an explicit update to `public/js/data-rules.js`, the server and demo paths, and the history and absentee views. The lobby redesign can ship with the current result types.
6. **Update tests and usage docs.** Update browser tests that click `#wrestle-hd` so they select Rumble, choose HD, and use Start. Update the README’s lobby instructions and keyboard behavior. Run the full suite with browser tests required. Capture desktop and phone screenshots for review with the same attendance fixture used for the baseline.

## Acceptance checks

- At **1440 × 900**, **768 × 1024**, **390 × 844**, **320 × 568**, and **844 × 390**, the header, team summary, mode choices, active settings, and Start remain readable in one scroll flow. No controls overlap or require horizontal scrolling. With the default roster collapsed on a phone, a third mode adds one choice and no extra launch row.
- Check 0, 1, 2, 12, 13, and 30 ready teammates, plus long names and recent winners. Rumble blocks at 13, Race and Pick now remain available, and changing modes keeps attendance. Start stays in the same place in the setup order when settings change.
- Check Race length persistence, Classic and HD starts, an HD fallback, and a result or quit followed by return to the same setup. Check the installed app and the browser-only demo, including existing winner and absentee history.
- Verify keyboard-only operation, screen-reader names and selected states, visible focus, 200% text zoom, sufficient contrast over the backdrop, and touch targets sized to at least 44 × 44 CSS px for the primary controls. Pointer, Space, and arrow-key selection only update the mode settings. Start and Pick now each honor their own availability.
