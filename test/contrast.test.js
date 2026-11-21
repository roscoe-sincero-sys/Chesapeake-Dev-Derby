// Colour contrast (WCAG 2 AA, issue #84). Text on the panels must reach 4.5:1 (3:1 for large text),
// and its background must be a solid colour: contrast checkers that ignore see-through colours or
// gradients would otherwise measure the wrong background and report errors.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = (await readFile(new URL('../public/css/style.css', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
const vars = Object.fromEntries([...css.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));

/** The declarations of the first rule whose selector is exactly `selector`. */
function rule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`));
  assert.ok(m, `rule ${selector} exists`);
  return Object.fromEntries(
    m[1]
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split(';')
      .map((d) => d.split(/:(.*)/s).map((s) => s?.trim()))
      .filter(([k, v]) => k && v),
  );
}
const resolve = (v) => v.replace(/var\(--([\w-]+)\)/g, (_, n) => vars[n]);
function hex(value) {
  const m = resolve(value).match(/#([0-9a-f]{6})\b/i);
  assert.ok(m, `a solid #rrggbb colour in "${value}"`);
  return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
}
const lum = (rgb) => {
  const [r, g, b] = rgb.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// [selector of the box, its text colours]
const SURFACES = [
  ['.panel', ['var(--text)', 'var(--muted)', 'var(--gold)']],
  ['.lobby-head', ['var(--text)', 'var(--muted)', 'var(--gold)']],
  ['.lineup-drawer', ['var(--text)', 'var(--muted)', 'var(--gold)']],
  ['.command-dock', ['var(--text)', 'var(--muted)', 'var(--gold)', '#ffa8a8']],
  ['.studio-panel', ['var(--text)', 'var(--muted)', 'var(--gold)']],
  ['.studio-pill', ['var(--text)']],
  ['.studio-back', ['var(--text)']],
  ['.studio-back:hover', ['var(--text)']],
  ['.studio-tab', ['var(--text)']],
  ['.studio-tab:hover', ['var(--text)']],
  ['.studio-tab.active', ['#1b0f00']],
  ['.stat-card', ['var(--text)', 'var(--muted)']],
  ['.filter-chip', ['var(--text)']],
  ['.filter-chip:hover', ['var(--text)']],
  ['.filter-chip[aria-pressed="true"]', ['#1b0f00']],
  ['.studio-search', ['var(--text)', 'var(--muted)']],
  ['.cooldown-pill', ['#ffa8a8']],
  ['.fit-pill.ok', ['#8ce99a']],
  ['.fit-pill.warn', ['#ffa8a8']],
  ['.roster-chip', ['var(--text)']],
  ['.chip-remove', ['var(--text)']],
  ['.chip-remove:hover', ['#ffa8a8']],
  ['.studio-foot', ['var(--text)', 'var(--muted)', '#ffa8a8', '#8ce99a']],
  ['.log-table th', ['var(--muted)']],
  ['.live-pill', ['#ffffff']],
  ['.drawer-toggle', ['var(--text)']],
  ['.drawer-toggle:hover', ['var(--text)']],
  ['.surprise-btn', ['var(--text)']],
  ['.surprise-btn:disabled', ['var(--muted)']],
  ['.chyron', ['var(--text)']],
  ['.chyron-tag', ['#1b0f00']],
  ['#reset-dialog, #guide-dialog', ['var(--text)', 'var(--muted)', '#8ab4f8']],
  ['#status', ['var(--text)']],
  ['#status.error', ['var(--text)']],
  ['#status.warn', ['var(--text)']],
  ['#status button', ['var(--text)']],
  ['#roster label', ['var(--text)', 'var(--muted)']],
  ['.team-toggle', ['var(--text)', 'var(--muted)', 'var(--gold)']],
  ['.team-toggle:hover', ['var(--text)', 'var(--muted)', 'var(--gold)']],
  ['#roster label:hover', ['var(--text)', 'var(--muted)']],
  ['#roster label:has(input:checked)', ['var(--text)']],
  ['#roster li.ineligible label', ['var(--muted)', '#ffa8a8']],
  // Mode cards: unselected, hovered and selected, each with the red "doesn't fit" range line.
  ['.mode-card', ['var(--text)', 'var(--muted)', '#ffa8a8']],
  ['.mode-card:hover', ['var(--text)', 'var(--muted)', '#ffa8a8']],
  ['.mode-card[aria-pressed="true"]', ['var(--text)', 'var(--muted)', '#ffa8a8', 'var(--gold)']],
  // The selected mode's options panel, and the Classic | HD toggle in it.
  ['.mode-config', ['var(--text)', 'var(--muted)', 'var(--gold)', '#8ab4f8']],
  ['.segment', ['var(--text)']],
  ['.segment:hover', ['var(--text)']],
  ['.segment[aria-pressed="true"]', ['#1b0f00']],
  ['#ring-toggle', ['var(--text)']],
  ['code', ['var(--text)', 'var(--muted)']],
  ['#retry-save', ['var(--text)']],
  ['button.secondary', ['var(--text)']],
  ['button.primary:disabled', ['var(--muted)']],
  ['button.primary[aria-disabled="true"]', ['var(--muted)']],
  // Standup Deathmatch: Google Meet chrome, 4-line Quake console, chat sidebar & 0:00 frag leaderboard.
  ['.dm-lobby-chat', ['#1f1f1f', '#5f6368']],
  ['.dm-chat-panel', ['#1f1f1f', '#5f6368', '#b42318']],
  ['.dm-chat-badge', ['#ffffff']],
  ['.dm-chat-notice', ['#3c4043']],
  ['.dm-chat-composer', ['#3c4043']],
  ['.dm-meet-bar', ['#e8eaed']],
  ['.dm-meet-btn', ['#ffffff']],
  ['.dm-meet-btn-active', ['#14171f']],
  ['.dm-meet-count-pill', ['#ffffff']],
  ['.dm-meet-leave', ['#ffffff']],
  ['.dm-present-pill', ['#e8eaed']],
  ['.dm-clock', ['#f2b817']],
  ['.dm-clock.rolled-back', ['#ffe066']],
  ['.dm-console', ['#e9c46a', '#ffffff']],
  ['.dm-quake-hud', ['#f8f9fa', '#f2b817', '#8ab4f8', '#8ce99a', '#ff8787']],
  ['.dm-leaderboard', ['#f8f9fa', '#f2b817', 'var(--muted)']],
  ['.dm-lb-row', ['#f8f9fa', 'var(--muted)', '#8ce99a']],
  ['.dm-lb-winner', ['#f8f9fa', '#f2b817', 'var(--muted)', '#8ce99a']],
];

test('text on every panel surface reaches WCAG AA contrast, on a solid background', () => {
  for (const [selector, colours] of SURFACES) {
    const bg = rule(selector).background;
    assert.doesNotMatch(bg, /rgba|hsla|transparent|\/\s*0?\.\d/, `${selector} background is solid`);
    for (const colour of colours) {
      const r = ratio(hex(colour), hex(bg));
      assert.ok(r >= 4.5, `${selector}: ${colour} on ${bg} is ${r.toFixed(2)}:1`);
    }
  }
});

test('the primary button has a solid colour under its gradient, and its dark text reads on every part', () => {
  const { background, color } = rule('button.primary');
  const solid = background.split(/\s+linear-gradient/)[0];
  assert.match(background, /linear-gradient/);
  for (const part of [solid, '#ff9a2e', 'var(--orange)']) {
    assert.ok(ratio(hex(color), hex(part)) >= 4.5, `${color} on ${part}`);
  }
});

test('disabled controls stay readable: no see-through or dimming filters on their text', () => {
  for (const selector of ['button.primary:disabled', 'button.primary[aria-disabled="true"]']) {
    const primary = rule(selector);
    assert.equal(primary.opacity, undefined, selector);
    assert.equal(primary.filter, undefined, selector);
  }
  // A card that doesn't fit the headcount isn't disabled: it says so in red text, not by fading.
  assert.deepEqual(rule('.mode-card.misfit .mode-players'), { color: '#ffa8a8' });
  assert.doesNotMatch(css, /#ring-roster li\.out\s*\{\s*opacity/, 'knocked-out wrestlers are greyed by colour, not opacity');
});

test('hover tips are hidden with visibility, not only opacity, so checkers like WAVE skip them (#86)', () => {
  // Exit's is the only tooltip left in the lobby (#117): rules such as player limits are shown as text.
  for (const wrap of ['.exit-wrap']) {
    const hidden = rule(`${wrap} .tip`);
    assert.equal(hidden.visibility, 'hidden', `${wrap} tip at rest`);
    assert.match(hidden.transition, /visibility/, `${wrap} tip still fades`);
    const shown = rule(`${wrap}:hover .tip, ${wrap}:focus-within .tip`);
    assert.equal(shown.visibility, 'visible', `${wrap} tip on hover and focus`);
    assert.equal(shown.opacity, '1');
    assert.ok(ratio(hex(hidden.color), hex(hidden.background)) >= 4.5, `${wrap} tip text`);
  }
  // No other text is hidden by opacity alone.
  const transparent = [...css.matchAll(/([^{}]+)\{([^}]*\bopacity:\s*0\s*;[^}]*)\}/g)]
    // Animation frames that fade in from opacity 0 are fine.
    .filter(([, sel, body]) => !/visibility:\s*hidden/.test(body) && !/@keyframes|^\s*(?:from|to|\d+%)\s*$/.test(sel));
  assert.deepEqual(transparent.map(([, sel]) => sel.trim()), []);
});
