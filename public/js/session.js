// The launcher watches this connection instead of unreliable unload requests.
// pagehide/pageshow also handle navigation through the browser's back cache.
import { DEMO } from './config.js';

let session;
let ended = false;
function connect() {
  // The browser-only demo has no server (and no launcher) to keep alive.
  if (!DEMO && !ended && !session && 'EventSource' in window) session = new EventSource('api/session');
}

/** Exit: close the connection and don't reconnect (resumeSession() undoes it if Exit fails). */
export function endSession() {
  ended = true;
  session?.close();
  session = null;
}
export function resumeSession() {
  ended = false;
  connect();
}
window.addEventListener('pagehide', () => {
  session?.close();
  session = null;
});
window.addEventListener('pageshow', connect);
connect();
