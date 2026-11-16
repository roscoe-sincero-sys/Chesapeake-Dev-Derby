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
  ['#status', ['var(--text)']],
  ['#status.error', ['var(--text)']],
  ['#status.warn', ['var(--text)']],
  ['#status button', ['var(--text)']],
  ['#roster label', ['var(--text)', 'var(--muted)']],
  ['#roster label:hover', ['var(--text)', 'var(--muted)']],
  ['#roster label:has(input:checked)', ['var(--text)']],
  ['#roster li.ineligible label', ['var(--muted)', '#ffa8a8']],
  ['#recent li', ['var(--text)', 'var(--muted)']],
  ['code', ['var(--text)', 'var(--muted)']],
  ['#retry-save', ['var(--text)']],
  ['button.secondary', ['var(--text)']],
  ['button.primary:disabled', ['var(--muted)']],
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
  const wrestle = rule('button.wrestle[aria-disabled="true"]');
  assert.equal(wrestle.opacity, undefined);
  assert.doesNotMatch(wrestle.filter ?? '', /brightness|opacity|contrast/);
  assert.ok(ratio(hex(wrestle.color), hex(wrestle.background)) >= 4.5);
  const primary = rule('button.primary:disabled');
  assert.equal(primary.opacity, undefined);
  assert.equal(primary.filter, undefined);
  assert.doesNotMatch(css, /#ring-roster li\.out\s*\{\s*opacity/, 'knocked-out wrestlers are greyed by colour, not opacity');
});

test('hover tips are hidden with visibility, not only opacity, so checkers like WAVE skip them (#86)', () => {
  for (const wrap of ['.wrestle-wrap', '.exit-wrap']) {
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
