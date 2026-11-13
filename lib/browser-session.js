/** Give a tab left open after a server restart time to reconnect. */
export function openBrowserUnlessConnected(server, open, waitMs = 4000) {
  return new Promise((resolve) => {
    const finish = (shouldOpen) => {
      clearTimeout(timer);
      server.off('browser-connected', reuse);
      server.off('close', reuse);
      if (shouldOpen) open();
      resolve(shouldOpen);
    };
    const reuse = () => finish(false);
    const timer = setTimeout(() => finish(true), waitMs);
    server.once('browser-connected', reuse);
    server.once('close', reuse);
  });
}
