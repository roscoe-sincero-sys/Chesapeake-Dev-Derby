// Build-time switches. In the repository this is the local presenter app: the browser talks to the
// derby server. scripts/build-demo.mjs replaces this file in the published GitHub Pages demo.

/** True in the browser-only demo: requests go to an in-browser store instead of a server. */
export const DEMO = false;

/** The version shown in the demo (the local app asks its server instead). */
export const DEMO_VERSION = null;
