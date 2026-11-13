// The launcher watches this connection instead of unreliable unload requests.
// pagehide/pageshow also handle navigation through the browser's back cache.
let session;
function connect() {
  if (!session && 'EventSource' in window) session = new EventSource('/api/session');
}
window.addEventListener('pagehide', () => {
  session?.close();
  session = null;
});
window.addEventListener('pageshow', connect);
connect();
