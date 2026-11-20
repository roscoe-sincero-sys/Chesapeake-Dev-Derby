// Page markup checks that need no browser: every button on every page has a name a screen reader can read,
// so checkers like WAVE find no "empty button", even on a button that stays hidden until it's needed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const PUBLIC = new URL('../public/', import.meta.url);
const pages = (await readdir(PUBLIC)).filter((file) => file.endsWith('.html'));

test('every button in the pages has text or a label', async () => {
  assert.ok(pages.includes('index.html'));
  for (const page of pages) {
    const html = (await readFile(new URL(page, PUBLIC), 'utf8')).replace(/<!--[\s\S]*?-->/g, '');
    for (const [, attrs, inner] of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) {
      const text = inner.replace(/<[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/[^>]+>/g, '').replace(/<[^>]+>/g, '').trim();
      const labelled = /\baria-label(?:ledby)?="[^"]+"/.test(attrs);
      assert.ok(text || labelled, `${page}: <button${attrs}> has no text or label`);
    }
  }
});
