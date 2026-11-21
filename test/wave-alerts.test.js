// WAVE Aim 10/10 guardrails (#129): zero errors, zero contrast errors (test/contrast.test.js),
// and zero alerts across the lobby, Edit team list, Winner history, and Absentee list pages.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const PAGES = ['index.html', 'roster.html', 'history.html', 'absences.html'];

async function readPublic(rel) {
  return (await readFile(new URL(`../public/${rel}`, import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
}

test('no HTML page uses redundant title attributes or skipped heading levels', async () => {
  for (const page of PAGES) {
    const html = await readPublic(page);
    // No static `title="..."` attributes on the four main pages (tooltips/labels use visible text or aria-label).
    const titles = [...html.matchAll(/\btitle="([^"]*)"/g)].map((m) => m[0]);
    assert.deepEqual(titles, [], `${page} has static title attributes that can trigger WAVE alerts: ${titles.join(', ')}`);

    // No skipped heading levels (e.g. h2 -> h4).
    const levels = [...html.matchAll(/<h([1-6])\b/g)].map((m) => Number(m[1]));
    for (let i = 1; i < levels.length; i++) {
      assert.ok(levels[i] <= levels[i - 1] + 1, `${page}: skipped heading level h${levels[i - 1]} -> h${levels[i]}`);
    }

    // No redundant links pointing to the same URL on the same page.
    const hrefs = [...html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(new Set(hrefs).size, hrefs.length, `${page} has redundant links: ${hrefs.join(', ')}`);
  }
});

test('name renderers only attach title tooltips when an email address was shortened', async () => {
  for (const file of ['js/main.js', 'js/history.js', 'js/absences.js']) {
    const src = await readPublic(file);
    // Every `.title =` assignment in these three lobby/history/absences scripts must be guarded by an `if`.
    const unguarded = src
      .split('\n')
      .filter((line) => /\.\btitle\s*=/.test(line) && !/^\s*if\s*\(/.test(line));
    assert.deepEqual(unguarded, [], `${file} has unguarded .title assignments: ${unguarded.join(' | ')}`);
  }
});

test('no CSS font-size is 10px or smaller (avoids WAVE "Very small text" alert)', async () => {
  const css = await readPublic('css/style.css');
  const tiny = [...css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)]
    .map((m) => Number(m[1]))
    .filter((px) => px <= 10);
  assert.deepEqual(tiny, [], `found font-size <= 10px: ${tiny.join(', ')}`);
});
