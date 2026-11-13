# Chesapeake Dev Derby

Pick who leads the team meeting — by racing for it.

Every name on your roster becomes a 3D kart racer (a browser tab, a blue crab, a hamburger menu…) and
runs an obstacle course of web-developer hazards over the Chesapeake Bay. First across the line leads the
meeting. A race takes about 50 seconds at 1x speed, or about 25 seconds at the default 2x.

Built with [Three.js](https://threejs.org/) and a tiny zero-dependency Node server.

## Quick start

You need [Node.js](https://nodejs.org/) 18 or newer.

```bash
npm install     # first time only (downloads Three.js)
npm start       # then open http://127.0.0.1:4100
```

`npm run open` does the same and opens your browser for you. On Windows you can also double-click
**`start.cmd`**. This launcher automatically stops the server and closes its terminal about three
seconds after the last game or roster-editor tab closes. Reloading or moving between those screens keeps
it running. On startup it waits up to four seconds for an existing tab to reconnect, avoiding a duplicate
tab after you stop the server with Ctrl+C and restart the launcher. `npm start` and `npm run open` keep running until you press Ctrl+C.

To use a different port: `PORT=5000 npm start` (PowerShell: `$env:PORT=5000; npm start`).

## Running a meeting pick

1. **Edit the roster** using **Modify list** in the lobby (one name per line), or in [`data/names.json`](data/names.json) — up to 30 names:

   ```json
   { "names": ["Ada", "Grace", "Linus"] }
   ```

   A plain array (`["Ada", "Grace"]`) works too. Blank entries and duplicates are ignored, and anything
   past the 30th name is dropped (the lobby tells you when this happens). Reload the page after editing.

2. **Open the lobby.** Set the **Race speed** slider from 1 to 20 (default 2); higher values finish sooner. Everyone is listed with a checkbox. A ticked box means that person is racing.
   - **Untick** anyone who is absent today.
   - The **last three winners are not eligible**: they are shown greyed out with an unticked, locked
     checkbox ("won last race", "won 2 races ago"…).

3. Click **🏁 Run** (or press **Enter**). You need at least two racers.

4. Watch the race. The winner is announced and **saved to [`data/winners.json`](data/winners.json)**
   the moment they cross the line. That file holds the last three winners; when it already has three,
   the new winner replaces the oldest.

5. **Back to lobby** returns to the roster with the new winner now sitting out.

Quitting a race before anyone finishes saves nothing. Press **M** (or the speaker button) to mute.

### Resetting or correcting the history

`data/winners.json` is plain JSON, oldest first. Edit it by hand to fix a mistake, or empty the list to
make everyone eligible again:

```json
{ "winners": [] }
```

## What's on the track

**Racers** — each name is dealt one at random; all 14 appear before any repeats:

Browser tab · Dev tools panel · CSS stylesheet scroll · Hamburger menu · Responsive layout ·
Hosting server · Domain name · Loading spinner · Flexbox box · Cookie banner · Sticky navbar ·
Baltimore oriole · Blue crab · Diamondback terrapin

**Obstacles**

| Obstacle            | What it does                                                  |
| ------------------- | ------------------------------------------------------------- |
| 404 pit             | You fall in and respawn a moment later                        |
| Broken link         | Trip over the chain and spin out                              |
| Merge conflict      | A wall of `<<<<<<<` — stop and resolve it                     |
| Infinite scroll     | A conveyor of feed cards dragging you backwards               |
| Slow load zone      | Crawl along at 99% loaded                                     |
| Redirect loop       | Round and round, twice                                        |
| Null pointer        | A sweeping mouse cursor that turns you into `null`            |
| Unhandled exception | A mine that throws everyone nearby (and re-arms)              |

**Items** — picked up from the spinning `{?}` crates:

| Item          | Effect                                                              |
| ------------- | ------------------------------------------------------------------- |
| ☕ Coffee      | Speed boost                                                         |
| 💨 Bay Breeze  | Big tailwind — only racers near the back get these                  |
| 🛡️ Firewall    | Blocks the next obstacle or attack                                  |
| 🐛 Bug         | Thrown at the racer directly ahead; they spin out                   |
| 💥 Force Push  | Homes in on the leader — only racers in the back half get these     |

## Is it fair?

Yes. Every racer has identical odds:

- Grid positions are shuffled, so the order of `names.json` gives no advantage.
- Character type is cosmetic; all racers share the same stats.
- Obstacle layout, item rolls and "did they see that pit in time?" are all random.
- Catch-up help (trailing racers get a tailwind and better items) depends only on race position.

The test suite runs 600 simulated races and checks the wins are spread evenly across the roster.

## URL options

Handy for demos and testing:

| Option      | Effect                                                    |
| ----------- | --------------------------------------------------------- |
| `?speed=3`  | Initial race speed (1 to 20; default 2)                  |
| `?seed=123` | Replay the exact same race every time (not for real picks) |

## Tests

```bash
npm test
```

Uses Node's built-in test runner — no extra packages. Covers:

- **`test/store.test.js`** — reading `names.json` (30-name cap, duplicates, bad JSON), the
  three-winner history and its oldest-out rotation, and eligibility rules.
- **`test/server.test.js`** — the HTTP API against a temporary data folder, input validation, and
  path-traversal protection.
- **`test/sim.test.js`** — the race itself: every race finishes with one winner, every obstacle and item
  comes into play, firewalls block exactly one hit, races replay from a seed, and outcomes are unbiased.

## How it's put together

```
server.js            Serves the game; GET /api/state, POST /api/winners
lib/store.js         Reads names.json, reads/writes winners.json
data/names.json      Your roster (edit this)
data/winners.json    Last three winners (written by the game)
public/
  index.html         Lobby, race HUD and winner card
  css/style.css
  js/main.js         Lobby logic, starts races, saves the winner
  js/eligibility.js  Who may race (last three winners sit out)
  js/sim.js          The race simulation — pure logic, no graphics
  js/game.js         Three.js scene, camera, and syncing models to the simulation
  js/track.js        The winding bridge and the (distance, offset) → 3D mapping
  js/scenery.js      Bay, islands, lighthouses, sailboats, billboards
  js/racers.js       The 14 racer models and their karts
  js/obstacles.js    The 8 obstacle models, item crates, thrown items
  js/effects.js      Particles (explosions, confetti)
  js/hud.js          Countdown, standings, event feed, winner card
  js/audio.js        Synthesised sound effects
test/                Unit and API tests
```

The browser cannot write files, which is why there is a small server: it is the only thing that touches
`data/winners.json`. It listens on `127.0.0.1` only, so it is not reachable from other machines unless
you set `HOST=0.0.0.0`.

The simulation (`sim.js`) works in simple track coordinates — distance along the course and sideways
offset — and knows nothing about 3D. `game.js` advances it at a fixed 60 steps per second and positions
the models to match, so the outcome is the same on a fast or slow machine.

## Troubleshooting

| Problem                                  | Fix                                                                    |
| ---------------------------------------- | ---------------------------------------------------------------------- |
| "Could not load the roster"              | `data/names.json` is missing or not valid JSON. Fix it, click Retry.   |
| "Could not save the winner"              | The server stopped. Run `npm start` again, then click **Retry save**.  |
| "Port 4100 is already in use"            | Another copy is running, or use `PORT=4101 npm start`.                 |
| Blank page / module errors               | Run `npm install` — Three.js is served from `node_modules`.            |
| "3D is not available in this browser"    | WebGL is off. The race is decided off-screen and the winner still shown and saved. |
| No sound                                 | Click the speaker button (or press **M**); the setting is remembered.  |
