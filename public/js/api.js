// The one way the pages talk to "the server": the real derby server in the local app, or the
// in-browser demo store in the GitHub Pages demo (see config.js).

import { DEMO, DEMO_VERSION } from './config.js';
import { createDemoApi, demoStorage } from './demo-api.js';

let demo = null;

/** Like fetch(), for the derby's API routes. */
export function apiFetch(url, options) {
  if (!DEMO) return fetch(url, options);
  demo ??= createDemoApi({ storage: demoStorage(), version: DEMO_VERSION });
  return demo.fetch(url, options);
}

export { DEMO };
