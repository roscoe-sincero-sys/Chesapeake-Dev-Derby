// Chesapeake Dev Derby — tiny zero-dependency web server.
//
// A browser cannot write files on its own, so this server does two jobs:
//   1. serves the game (public/) and Three.js (node_modules/three)
//   2. reads data/names.json and reads/writes data/winners.json
//
//   GET  /api/state    -> { names, winners, warnings }
//   POST /api/winners  -> body { name } ; returns { winners }

import http from 'node:http';
import path from 'node:path';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';
import { createStore } from './lib/store.js';

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
export function createServer({ dataDir = path.join(ROOT, 'data') } = {}) {
  const store = createStore(dataDir);
  const publicDir = path.join(ROOT, 'public');
  const threeDir = path.join(ROOT, 'node_modules', 'three');

  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const pathname = decodeURIComponent(url.pathname);

      if (pathname === '/api/state' && req.method === 'GET') {
        const [{ names, warnings }, winners] = await Promise.all([store.loadNames(), store.loadWinners()]);
        return sendJson(res, 200, { names, winners, warnings });
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
}

// Start listening only when run directly (`node server.js`), not when imported by tests.
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const port = Number(process.env.PORT) || 4100;
  const host = process.env.HOST || '127.0.0.1';
  const server = createServer();
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Try: PORT=${port + 1} npm start  (PowerShell: $env:PORT=${port + 1}; npm start)`);
    } else {
      console.error(err);
    }
    process.exit(1);
  });
  server.listen(port, host, () => {
    const address = `http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`;
    console.log(`\n  🏁 Chesapeake Dev Derby is running at ${address}\n  Press Ctrl+C to stop.\n`);
    if (process.argv.includes('--open')) {
      const opener = process.platform === 'win32' ? `start "" "${address}"` : process.platform === 'darwin' ? `open "${address}"` : `xdg-open "${address}"`;
      exec(opener, () => {});
    }
  });
}
