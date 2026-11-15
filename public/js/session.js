// The launcher watches this connection instead of unreliable unload requests.
// pagehide/pageshow also handle navigation through the browser's back cache.
import { DEMO } from './config.js';

let session;
function connect() {
  // The browser-only demo has no server (and no launcher) to keep alive.
  if (!DEMO && !session && 'EventSource' in window) session = new EventSource('/api/session');
}
window.addEventListener('pagehide', () => {
  session?.close();
  session = null;
});
window.addEventListener('pageshow', connect);
connect();
