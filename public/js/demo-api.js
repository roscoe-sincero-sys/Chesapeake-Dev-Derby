// The browser-only demo's stand-in for the derby server. It answers the same API routes with the same
// rules (shared through data-rules.js), but keeps everything in this browser's localStorage: nothing is
// sent anywhere. Used only when config.js says DEMO.

import { validateRoster, checkWinner, parseNames, parseWinners, parseHistory, addWinner, MAX_HISTORY } from './data-rules.js';

/** The demo's starting team list: characters from the Maranao epic Maharadia Lawana. */
export const DEMO_NAMES = [
  'Radia Mangandiri',
  'Radia Mangawarna',
  'Potre Malaila Ganding',
  'Laksamana',
  'Maharadia Lawana',
  'Kabayan',
];

const KEY = 'derby-demo-v1';

/** A storage that works even where localStorage is blocked (kept for this page only). */
export function demoStorage() {
  try {
    const s = window.localStorage;
    s.setItem(`${KEY}-probe`, '1');
    s.removeItem(`${KEY}-probe`);
    return s;
  } catch {
    const memory = new Map();
    return { getItem: (k) => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, String(v)), removeItem: (k) => memory.delete(k) };
  }
}

/**
 * Creates the demo store. `storage` is localStorage (or any getItem/setItem object, for tests).
 * Returns { fetch(url, options) } that answers like the server, with real Response objects.
 */
export function createDemoApi({ storage, version = null, names = DEMO_NAMES, now = () => new Date().toISOString() }) {
  const fresh = () => ({ names: [...names], winners: [], history: [] });
  const load = () => {
    try {
      const raw = JSON.parse(storage.getItem(KEY));
      if (raw && Array.isArray(raw.names)) {
        return { names: parseNames(raw.names).names, winners: parseWinners(raw.winners), history: parseHistory(raw.history) };
      }
    } catch {
      /* unreadable: start again from the sample team */
    }
    return fresh();
  };
  const save = (data) => storage.setItem(KEY, JSON.stringify(data));
  const fail = (status, error) => Object.assign(new Error(error), { statusCode: status });
  const json = (text) => {
    try {
      return JSON.parse(text ?? '');
    } catch {
      return undefined;
    }
  };

  function handle(path, method, body) {
    if (path === '/api/version' && method === 'GET') return { version };
    if (path === '/api/session' && method === 'GET') return null; // no server to keep alive
    if (path === '/api/state' && method === 'GET') {
      const data = load();
      return { names: data.names, winners: data.winners, warnings: [] };
    }
    if (path === '/api/history' && method === 'GET') return { history: [...load().history].reverse() };
    if (path === '/api/names' && method === 'PUT') {
      const payload = json(body);
      if (payload === undefined) throw fail(400, 'Body must be JSON with a "names" array.');
      const parsed = validateRoster(payload);
      const data = load();
      save({ ...data, names: parsed.names });
      return parsed;
    }
    if (path === '/api/winners' && method === 'POST') {
      const payload = json(body);
      if (payload === undefined) throw fail(400, 'Body must be JSON like { "name": "Ada" }');
      if (!payload || typeof payload.name !== 'string' || !payload.name.trim()) throw fail(400, 'A winner "name" is required.');
      const data = load();
      const match = checkWinner(data.names, payload.name, payload.mode ?? 'race');
      const date = now();
      const winners = addWinner(data.winners, match, date);
      const history = [...data.history, { name: match, date, mode: payload.mode ?? 'race' }].slice(-MAX_HISTORY);
      save({ ...data, winners, history });
      return { winners };
    }
    if (path === '/api/winners' && method === 'DELETE') {
      // Like the server: resetting the last three winners keeps the full history.
      save({ ...load(), winners: [] });
      return { winners: [] };
    }
    if (path.startsWith('/api/')) throw fail(404, 'Unknown API route.');
    throw fail(404, 'Not found.');
  }

  return {
    async fetch(url, { method = 'GET', body } = {}) {
      const path = new URL(url, 'http://demo.invalid/').pathname;
      try {
        const result = handle(path, method.toUpperCase(), body);
        if (result === null) return new Response(null, { status: 204 });
        return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: err.statusCode || 500, headers: { 'Content-Type': 'application/json' } });
      }
    },
  };
}
