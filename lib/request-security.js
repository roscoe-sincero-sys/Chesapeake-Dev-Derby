const LOOPBACK_AUTHORITY = /^(localhost|127\.0\.0\.1|\[::1\])(?::([0-9]+))?$/i;
const LOOPBACK_ADDRESSES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

/** Only serve this local app under an approved loopback host and listening port. */
export function trustedOrigin(req, port) {
  const host = req.headers.host;
  if (typeof host !== 'string' || !LOOPBACK_ADDRESSES.has(req.socket.remoteAddress)) return null;
  const match = LOOPBACK_AUTHORITY.exec(host);
  if (!match || Number(match[2] || 80) !== port) return null;
  return new URL(`http://${host}`).origin;
}

/** Browser-controlled headers establish origin; local API clients send Origin. */
export function isSameOriginRequest(req, origin) {
  const site = req.headers['sec-fetch-site'];
  if (site !== undefined && site !== 'same-origin') return false;
  const source = req.headers.origin;
  if (source !== undefined) return source === origin;
  return site === 'same-origin';
}

export function isJsonRequest(req) {
  return req.headers['content-type']?.split(';', 1)[0].trim().toLowerCase() === 'application/json';
}
