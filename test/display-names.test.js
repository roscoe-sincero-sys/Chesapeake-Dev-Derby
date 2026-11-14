import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRoster, displayNames, sortByDisplayName, nameKey } from '../public/js/eligibility.js';

const shownList = (names) => {
  const shown = displayNames(names);
  return names.map((n) => shown.get(nameKey(n)));
};

test('an email address with a unique local part is shown without the @ and domain', () => {
  assert.deepEqual(shownList(['tony.stark@ultron.com', 'Ada']), ['tony.stark', 'Ada']);
});

test('email addresses that share a local part keep their full address', () => {
  assert.deepEqual(
    shownList(['tony.stark@ultron.com', 'tony.stark@vision.com', 'pepper@stark.com']),
    ['tony.stark@ultron.com', 'tony.stark@vision.com', 'pepper'],
  );
  // Case-insensitive, like every other name comparison.
  assert.deepEqual(shownList(['Tony.Stark@ultron.com', 'tony.stark@vision.com']), ['Tony.Stark@ultron.com', 'tony.stark@vision.com']);
});

test('an address whose local part matches a plain name stays in full', () => {
  assert.deepEqual(shownList(['Tony.Stark', 'tony.stark@ultron.com']), ['Tony.Stark', 'tony.stark@ultron.com']);
});

test('names that only partly look like email are left alone', () => {
  assert.deepEqual(shownList(['@handle', 'ada@localhost', 'Ada Lovelace', 'grace@navy.mil ']), ['@handle', 'ada@localhost', 'Ada Lovelace', 'grace']);
});

test('the team list sorts alphabetically by the name shown, ignoring case', () => {
  const names = ['zed', 'Ada', 'tony.stark@ultron.com', 'bob', 'Grace', 'Racer 10', 'Racer 2'];
  const roster = buildRoster(names, [{ name: 'bob' }]);
  const sorted = sortByDisplayName(roster, displayNames(names)).map((e) => e.name);
  assert.deepEqual(sorted, ['Ada', 'bob', 'Grace', 'Racer 2', 'Racer 10', 'tony.stark@ultron.com', 'zed']);
  // The roster itself (and so the stored order) is untouched.
  assert.deepEqual(roster.map((e) => e.name), names);
});
