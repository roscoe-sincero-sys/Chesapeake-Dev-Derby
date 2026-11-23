import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { clampSpeedScale, queryDurationOverride } from '../public/js/modes.js';
import { normalizeGlassDuration } from '../public/js/glass-sim.js';
import { Hud } from '../public/js/hud.js';

test('Hud.note() renders untrusted text via textContent without parsing HTML (#143)', () => {
  const appended = [];
  const fakeFeed = {
    children: appended,
    append(el) { appended.push(el); },
    get firstChild() { return appended[0]; },
  };
  const origDoc = globalThis.document;
  globalThis.document = {
    createElement(tag) {
      return {
        tagName: tag.toUpperCase(),
        className: '',
        textContent: '',
        _innerHtmlSet: false,
        set innerHTML(_) { this._innerHtmlSet = true; },
        classList: { add() {} },
        remove() {},
      };
    },
  };
  try {
    const hud = Object.create(Hud.prototype);
    hud.feed = fakeFeed;
    hud.lastLine = -1e9;
    hud.note('💥 <img src=x onerror=alert(1)> slipped out', true);
    assert.equal(appended.length, 1);
    assert.equal(appended[0]._innerHtmlSet, false, 'Hud.note must never write innerHTML');
    assert.equal(appended[0].textContent, '💥 <img src=x onerror=alert(1)> slipped out');
  } finally {
    globalThis.document = origDoc;
  }
});

test('clampSpeedScale and queryDurationOverride reject NaN, negative and unbounded query values (#144)', () => {
  assert.equal(clampSpeedScale(null, 1), 1);
  assert.equal(clampSpeedScale('abc', 1), 1);
  assert.equal(clampSpeedScale('-5', 1), 1);
  assert.equal(clampSpeedScale('Infinity', 1), 1);
  assert.equal(clampSpeedScale('0.1', 1), 0.5);
  assert.equal(clampSpeedScale('99999', 1), 8);
  assert.equal(clampSpeedScale('3', 1), 3);

  assert.equal(queryDurationOverride('glassDuration', 15, normalizeGlassDuration, ''), 15);
  assert.equal(queryDurationOverride('glassDuration', 15, normalizeGlassDuration, '?glassDuration=-50'), 15);
  assert.equal(queryDurationOverride('glassDuration', 15, normalizeGlassDuration, '?glassDuration=Infinity'), 15);
  assert.equal(queryDurationOverride('glassDuration', 15, normalizeGlassDuration, '?glassDuration=999999'), 120);
  assert.equal(queryDurationOverride('glassDuration', 15, normalizeGlassDuration, '?glassDuration=10'), 10);
});

test('GitHub Pages workflow pins all actions to 40-char commit SHAs and scopes write permissions to deploy (#145)', async () => {
  const yml = await readFile(new URL('../.github/workflows/pages.yml', import.meta.url), 'utf8');
  const usesLines = [...yml.matchAll(/^\s*-?\s*uses:\s*([^\s#]+)/gm)].map((m) => m[1]);
  assert.ok(usesLines.length >= 5, 'found workflow action uses');
  for (const ref of usesLines) {
    assert.match(ref, /@[0-9a-f]{40}$/, `action ${ref} must be pinned to a 40-char commit SHA`);
  }
  const topPermissions = yml.split(/\r?\njobs:/)[0];
  assert.ok(!/pages:\s*write/.test(topPermissions), 'pages: write must not be granted at workflow top level');
  assert.ok(!/id-token:\s*write/.test(topPermissions), 'id-token: write must not be granted at workflow top level');
});
