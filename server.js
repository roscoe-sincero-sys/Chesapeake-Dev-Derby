// Chesapeake Dev Derby — tiny zero-dependency web server.
//
// A browser cannot write files on its own, so this server does two jobs:
//   1. serves the game (public/) and Three.js (node_modules/three)
//   2. reads data/names.json and reads/writes data/winners.json
//
//   GET  /api/version  -> { version } from package.json (shown next to the app name in the lobby)
//   GET  /api/state    -> { names, winners, warnings }
//   PUT  /api/names    -> body { names: [...] } ; returns { names, warnings }
//   GET  /api/history  -> { history } every recorded result, newest first
//   POST /api/winners  -> body { name, mode? } (mode "race", "skip" or "wrestle") ; returns { winners }
//   DELETE /api/winners -> body {} ; clears the history, returns { winners: [] }

import crypto from 'node:crypto';
import http from 'node:http';
import path from 'node:path';
import { createReadStream, readdirSync, readFileSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { createStore } from './lib/store.js';
import { openBrowserUnlessConnected } from './lib/browser-session.js';
import { trustedOrigin, isSameOriginRequest, isJsonRequest, isCrossSiteFetch } from './lib/request-security.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

/** The app's version: package.json is the single source of truth (see Versioning in the README). */
export const VERSION = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;

const MIME = {
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.woff2': 'font/woff2',
};

function sendJson(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(text),
    'Cache-Control': 'no-store',
  });
  res.end(text);
}

function readBody(req, limit = 10_000) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        // Stop buffering but keep draining, so the client can still read our 413 reply.
        reject(Object.assign(new Error('Request body too large'), { statusCode: 413 }));
        req.removeAllListeners('data');
        req.resume();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/** Resolves a URL path inside `baseDir`, or returns null if it tries to escape it. */
function resolveInside(baseDir, urlPath) {
  const target = path.resolve(baseDir, '.' + path.posix.normalize('/' + urlPath));
  if (target !== baseDir && !target.startsWith(baseDir + path.sep)) return null;
  return target;
}

async function serveFile(req, res, file, method) {
  let info;
  try {
    info = await stat(file);
    if (info.isDirectory()) {
      file = path.join(file, 'index.html');
      info = await stat(file);
    }
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 — you found the pit.');
    return;
  }
  const contentType = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const range = method === 'GET' ? req.headers.range : undefined;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (!match || (!match[1] && !match[2])) {
      res.writeHead(416, { 'Content-Range': `bytes */${info.size}` });
      return res.end();
    }
    let start = match[1] ? Number.parseInt(match[1], 10) : Math.max(0, info.size - Number.parseInt(match[2], 10));
    let end = match[1] && match[2] ? Number.parseInt(match[2], 10) : info.size - 1;
    if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= info.size) {
      res.writeHead(416, { 'Content-Range': `bytes */${info.size}` });
      return res.end();
    }
    end = Math.min(end, info.size - 1);
    res.writeHead(206, {
      'Content-Type': contentType,
      'Content-Range': `bytes ${start}-${end}/${info.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Cache-Control': 'no-cache',
    });
    createReadStream(file, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, {
    'Content-Type': contentType,
    'Accept-Ranges': 'bytes',
    'Content-Length': info.size,
    'Cache-Control': 'no-cache',
  });
  if (method === 'HEAD') return res.end();
  createReadStream(file).pipe(res);
}

/** Computes SHA-256 CSP hashes for the inline <script type="importmap"> blocks in public/*.html. */
function buildCspHeader(publicDir) {
  const hashes = new Set();
  for (const name of readdirSync(publicDir).filter((f) => f.endsWith('.html'))) {
    const html = readFileSync(path.join(publicDir, name), 'utf8');
    for (const match of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)) {
      if (!match[1].trim()) continue;
      // HTML parsers normalise CRLF/CR to LF before evaluating inline script CSP hashes.
      const body = match[1].replace(/\r\n?/g, '\n');
      const digest = crypto.createHash('sha256').update(body, 'utf8').digest('base64');
      hashes.add(`'sha256-${digest}'`);
    }
  }
  const scriptSrc = ["'self'", ...hashes].join(' ');
  return `default-src 'self'; script-src ${scriptSrc}; img-src 'self' data: blob:; style-src 'self'; frame-ancestors 'none'`;
}

/** Removes local filesystem prefixes from client-facing error messages (full paths stay in server logs). */
function sanitizeErrorMessage(message, dirs) {
  let text = String(message ?? 'Internal server error.');
  for (const dir of dirs) {
    if (!dir) continue;
    text = text.replaceAll(dir + path.sep, '').replaceAll(dir, '');
  }
  return text.replace(/[A-Za-z]:\\[^\s'"]+/g, (m) => path.basename(m)).replace(/\/(?:Users|home|tmp|var|etc)\/[^\s'"]+/g, (m) => path.basename(m));
}

/**
 * Builds the HTTP server. `dataDir` is where names.json / winners.json live;
 * tests point it at a temp folder.
 */
export function createServer({ dataDir = path.join(ROOT, 'data'), exitOnClose = false, shutdownDelay = 3000, maxSessions = 32 } = {}) {
  const store = createStore(dataDir);
  const publicDir = path.join(ROOT, 'public');
  const threeDir = path.join(ROOT, 'node_modules', 'three');
  const cspHeader = buildCspHeader(publicDir);

  let tabs = 0;
  let shutdownTimer;
  const server = http.createServer(async (req, res) => {
    try {
      // Apply security and framing protections to pages and error responses alike (#66).
      res.setHeader('Content-Security-Policy', cspHeader);
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Referrer-Policy', 'no-referrer');
      const origin = trustedOrigin(req, server.address()?.port);
      if (!origin) return sendJson(res, 421, { error: 'Untrusted request host.' });
      const url = new URL(req.url, origin);
      if (url.origin !== origin) return sendJson(res, 421, { error: 'Untrusted request target.' });
      let pathname;
      try {
        pathname = decodeURIComponent(url.pathname);
      } catch {
        return sendJson(res, 400, { error: 'Malformed request path.' });
      }
      const mutation = (pathname === '/api/names' && req.method === 'PUT') ||
        (pathname === '/api/winners' && (req.method === 'POST' || req.method === 'DELETE')) ||
        (pathname === '/api/exit' && req.method === 'POST');
      const session = pathname === '/api/session' && req.method === 'GET';
      if ((mutation || session) && !isSameOriginRequest(req, origin)) {
        return sendJson(res, 403, { error: 'A same-origin request is required.' });
      }
      if (pathname.startsWith('/api/') && isCrossSiteFetch(req)) {
        return sendJson(res, 403, { error: 'Cross-site API requests are not allowed.' });
      }
      if (mutation && !isJsonRequest(req)) {
        return sendJson(res, 415, { error: 'Content-Type must be application/json.' });
      }

      // One persistent connection per page, including background tabs. A grace
      // period lets reloads and navigation reconnect before the server stops.
      if (pathname === '/api/session' && req.method === 'GET') {
        if (!exitOnClose) {
          res.writeHead(204);
          return res.end();
        }
        if (tabs >= maxSessions) {
          return sendJson(res, 429, { error: 'Too many active sessions.' });
        }
        clearTimeout(shutdownTimer);
        tabs++;
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-store',
          Connection: 'keep-alive',
        });
        res.write('retry: 1000\n: connected\n\n');
        server.emit('browser-connected');
        const heartbeat = setInterval(() => res.write(': alive\n\n'), 15000);
        res.on('close', () => {
          clearInterval(heartbeat);
          tabs--;
          if (tabs === 0 && server.listening) {
            shutdownTimer = setTimeout(() => {
              server.close();
              server.closeIdleConnections?.();
            }, shutdownDelay);
          }
        });
        return;
      }

      // The lobby's Exit button: answer first, then stop serving. Winners are already saved, and
      // any save still being written finishes before the server closes.
      if (pathname === '/api/exit' && req.method === 'POST') {
        await readBody(req);
        sendJson(res, 200, { stopping: true });
        res.on('finish', () => {
          server.emit('exit-requested');
          server.close();
          server.closeAllConnections?.();
        });
        return;
      }

      if (pathname === '/api/version' && req.method === 'GET') {
        return sendJson(res, 200, { version: VERSION });
      }

      if (pathname === '/api/state' && req.method === 'GET') {
        const [{ names, warnings }, winners] = await Promise.all([store.loadNames(), store.loadWinners()]);
        return sendJson(res, 200, { names, winners, warnings });
      }

      if (pathname === '/api/history' && req.method === 'GET') {
        const list = await store.loadHistory({ recover: true });
        const body = { history: [...list].reverse() };
        if (list.warning) body.warning = list.warning;
        return sendJson(res, 200, body);
      }

      if (pathname === '/api/names' && req.method === 'PUT') {
        let payload;
        try {
          payload = JSON.parse(await readBody(req));
        } catch (err) {
          return sendJson(res, err.statusCode || 400, { error: err.statusCode ? err.message : 'Body must be JSON with a "names" array.' });
        }
        return sendJson(res, 200, await store.saveNames(payload));
      }

      if (pathname === '/api/winners' && req.method === 'POST') {
        let payload;
        try {
          payload = JSON.parse(await readBody(req));
        } catch (err) {
          return sendJson(res, err.statusCode || 400, { error: err.statusCode ? err.message : 'Body must be JSON like { "name": "Ada" }' });
        }
        if (!payload || typeof payload.name !== 'string' || !payload.name.trim()) {
          return sendJson(res, 400, { error: 'A winner "name" is required.' });
        }
        const winners = await store.recordWinner(payload.name, payload.mode ?? 'race', payload.absent);
        const body = { winners };
        if (winners.warning) body.warning = winners.warning;
        return sendJson(res, 200, body);
      }

      if (pathname === '/api/winners' && req.method === 'DELETE') {
        await readBody(req);
        return sendJson(res, 200, { winners: await store.clearWinners() });
      }

      if (pathname.startsWith('/api/')) {
        return sendJson(res, 404, { error: 'Unknown API route.' });
      }

      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { Allow: 'GET, HEAD' });
        return res.end();
      }

      const vendorPrefix = '/vendor/three/';
      const file = pathname.startsWith(vendorPrefix)
        ? resolveInside(threeDir, pathname.slice(vendorPrefix.length))
        : resolveInside(publicDir, pathname);
      if (!file) {
        res.writeHead(403);
        return res.end();
      }
      await serveFile(req, res, file, req.method);
    } catch (err) {
      const status = err.statusCode || 500;
      if (status >= 500) console.error(`[error] ${req.method} ${req.url}: ${err.message}`);
      if (!res.headersSent) sendJson(res, status, { error: sanitizeErrorMessage(err.message, [dataDir, ROOT]) });
      else res.end();
    }
  });
  server.headersTimeout = 15_000;
  server.requestTimeout = 30_000;
  server.on('close', () => clearTimeout(shutdownTimer));
  return server;
}

// Start listening only when run directly (`node server.js`), not when imported by tests.
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const port = Number(process.env.PORT) || 4100;
  const host = (process.env.HOST || '127.0.0.1').toLowerCase();
  if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
    console.error('HOST must be 127.0.0.1, localhost, or ::1. This app supports local access only.');
    process.exit(1);
  }
  const exitOnClose = process.argv.includes('--exit-on-close');
  const server = createServer({ exitOnClose });
  server.on('exit-requested', () => console.log('\n  👋 Exit was clicked in the lobby. Chesapeake Dev Derby has stopped.\n'));
  server.on('close', () => process.exit(0));
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Try: PORT=${port + 1} npm start  (PowerShell: $env:PORT=${port + 1}; npm start)`);
    } else {
      console.error(err);
    }
    process.exit(1);
  });
  server.listen(port, host, () => {
    const address = `http://${host === '::1' ? '[::1]' : host}:${port}`;
    console.log(`\n  🏁 Chesapeake Dev Derby is running at ${address}\n  Press Ctrl+C to stop.\n`);
    if (process.argv.includes('--open')) {
      const open = () => {
        if (process.platform === 'win32') execFile('cmd.exe', ['/c', 'start', '', address], () => {});
        else if (process.platform === 'darwin') execFile('open', [address], () => {});
        else execFile('xdg-open', [address], () => {});
      };
      if (exitOnClose) openBrowserUnlessConnected(server, open);
      else open();
    }
  });
}
