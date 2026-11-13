// Chesapeake Dev Derby — tiny zero-dependency web server.
//
// A browser cannot write files on its own, so this server does two jobs:
//   1. serves the game (public/) and Three.js (node_modules/three)
//   2. reads data/names.json and reads/writes data/winners.json
//
//   GET  /api/state    -> { names, winners, warnings }
//   PUT  /api/names    -> body { names: [...] } ; returns { names, warnings }
//   POST /api/winners  -> body { name } ; returns { winners }

import http from 'node:http';
import path from 'node:path';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';
import { createStore } from './lib/store.js';
import { openBrowserUnlessConnected } from './lib/browser-session.js';
import { trustedOrigin, isSameOriginRequest, isJsonRequest } from './lib/request-security.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
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

async function serveFile(res, file, method) {
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
  res.writeHead(200, {
    'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
    'Content-Length': info.size,
    'Cache-Control': 'no-cache',
  });
  if (method === 'HEAD') return res.end();
  createReadStream(file).pipe(res);
}

/**
 * Builds the HTTP server. `dataDir` is where names.json / winners.json live;
 * tests point it at a temp folder.
 */
export function createServer({ dataDir = path.join(ROOT, 'data'), exitOnClose = false, shutdownDelay = 3000 } = {}) {
  const store = createStore(dataDir);
  const publicDir = path.join(ROOT, 'public');
  const threeDir = path.join(ROOT, 'node_modules', 'three');

  let tabs = 0;
  let shutdownTimer;
  const server = http.createServer(async (req, res) => {
    try {
      // Apply framing protections to pages and error responses alike.
      res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
      res.setHeader('X-Frame-Options', 'DENY');
      const origin = trustedOrigin(req, server.address()?.port);
      if (!origin) return sendJson(res, 421, { error: 'Untrusted request host.' });
      const url = new URL(req.url, origin);
      if (url.origin !== origin) return sendJson(res, 421, { error: 'Untrusted request target.' });
      const pathname = decodeURIComponent(url.pathname);
      const mutation = (pathname === '/api/names' && req.method === 'PUT') ||
        (pathname === '/api/winners' && req.method === 'POST');
      const session = pathname === '/api/session' && req.method === 'GET';
      if ((mutation || session) && !isSameOriginRequest(req, origin)) {
        return sendJson(res, 403, { error: 'A same-origin request is required.' });
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

      if (pathname === '/api/state' && req.method === 'GET') {
        const [{ names, warnings }, winners] = await Promise.all([store.loadNames(), store.loadWinners()]);
        return sendJson(res, 200, { names, winners, warnings });
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
        const winners = await store.recordWinner(payload.name);
        return sendJson(res, 200, { winners });
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
      await serveFile(res, file, req.method);
    } catch (err) {
      const status = err.statusCode || 500;
      if (status >= 500) console.error(`[error] ${req.method} ${req.url}: ${err.message}`);
      if (!res.headersSent) sendJson(res, status, { error: err.message });
      else res.end();
    }
  });
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
      const opener = process.platform === 'win32' ? `start "" "${address}"` : process.platform === 'darwin' ? `open "${address}"` : `xdg-open "${address}"`;
      const open = () => exec(opener, () => {});
      if (exitOnClose) openBrowserUnlessConnected(server, open);
      else open();
    }
  });
}
