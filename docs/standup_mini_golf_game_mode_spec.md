# Game Mode Spec: Standup Mini-Golf (3D Simultaneous Putt-Putt)

**App:** Chesapeake Dev Derby

**Genre:** 3D Simultaneous Arcade Mini-Golf (2.5D Rolling Physics & Bumper Chaos)

**Player Count:** 2–30 players

**Duration:** Scales with existing 10s–120s slider

## Overview

**Standup Mini-Golf** places all active developers as color-coded golf balls on a bright, floating 3D putt-putt course suspended over the Chesapeake Bay. At the sound of the horn, everyone tees off at the exact same millisecond—ricocheting off walls, bumping rivals out of the way, and weaving through dev-themed hazards like spinning **Sprint Review Windmills**, **Procurement Sand Traps**, and **BadalJwala Firewall Gates**. The first ball to rattle down the glowing **`PROD / LEAD STANDUP`** cup takes the mic.

### Core Design Principle: Simultaneous Bumper-to-Bumper Chaos

Traditional turn-based golf is too slow for a 15-minute standup. Firing all 2–30 players at once turns a clean overhead course into a hilarious demolition derby of last-second upsets, pool-table caroms, and heartbreaking lip-outs at the cup—while keeping every player visible on a shared screen from start to finish.

## 1. Course Flow & 4-Zone Layout (10–15s Mode)

1. **Zone 1: The Tee Box (`BACKLOG`)**
   All active dev balls line up in a tight grid on a bright astroturf tee pad, subtly rocking back and forth as glowing aim arrows sweep across the lane. On **`TEE OFF!`**, a synchronized wave of putters swings through and launches the entire pack simultaneously.

2. **Zone 2: The Fairway Gauntlet (`IN PROGRESS`)**
   Balls bank off wooden bumper rails, collide mid-fairway, and navigate 2–3 dynamic obstacles (a spinning windmill blade, a moving firewall gate, and a split-path ramp).

3. **Zone 3: The Hazard Split (`QA & REVIEW`)**
   The course forks into a fast, risky narrow bridge over open water (*"Hotfix Shortcut"*) and a wider banked curve lined with sand traps and pop-bumpers (*"Proper Process"*).

4. **Zone 4: The Putting Green (`DEPLOY TO PROD`)**
   A sloped, elevated green surrounded by Chesapeake Bay water hazards with a glowing golden cup and miniature fluttering flag (`LEAD STANDUP`). Balls crest the ramp, circle the rim for nail-biting lip-outs, and drop into the hole—triggering confetti, a cheerful bell chime, and the winner banner.

## 2. Dev-Themed Obstacles & Hazard Catalog

Keep the course modular with 5–6 reusable prefabs so you can even randomize hole layouts between days:

* **Sprint Review Windmill** *(Rotating 4-blade arch)* — Blocks the center lane rhythmically. Balls that time it right zip straight through; mistimed shots get batted sideways into the rough.
  * *Popups:* `"Blocked by baasi software license"`, `"Blocked by khallas SSL Certs"`

* **BadalJwala Firewall Gate** *(Intermittent glowing orange energy barrier)* — Snaps shut briefly on a pulsing cycle, bouncing early leaders backward so trailing devs can overtake.
  * *Popups:* `"BadalJwala 500 Error"`, `"16-chars is too long"`

* **Procurement Sand Trap** *(Tan textured bunker)* — Applies heavy rolling drag so balls slow to a crawl until an automated follow-up putt chips them back onto the turf.
  * *Popups:* `"Waiting on developer poll results"`, `"Waiting on approval"`

* **Legacy Code Water Hazard** *(Open gaps overlooking the Chesapeake Bay)* — Balls knocked over the edge splash into the bay and respawn at the last checkpoint with a brief time penalty.
  * *Popups:* `"userLogin and eventLog broke audit logs"`, `"Unrequested feature broke prod"`

* **Scope Creep Bumpers** *(Neon pinball posts & angled deflectors)* — High-restitution posts that ping balls unpredictably across the green.
  * *Popups:* `"Manager's pet feature"`, `"Failed to read Iklauti-ji's mind"`

* **The "One Quick Idea" Detour Loop** *(Optional side loop-de-loop or curved tunnel)* — Looks cool, spits the ball back onto the fairway slightly behind the pack, or occasionally launches a lucky dark-horse right onto the green.
  * *Popups:* `"Anti-URL-tampering security feature broke links—solved by tampering with the URL (?ReturnUrl=)"`

## 3. Scaling with the Duration Slider (10s–120s)

Instead of making balls roll in slow motion, scale the **course length and stroke rules** to fit the timer cleanly:

| Duration | Course Variant | Pacing & Mechanics |
| :--- | :--- | :--- |
| **10s–15s** | *Par-1 Hole-in-One Dash* | Compact straightaway with 1 windmill, 2 angled bank walls, and a gentle funnel slope into the cup. Fast single-shot chaos. |
| **30s** | *Par-3 Floating Course* | Full dogleg course with split shortcuts, a BadalJwala gate, sand traps, and automated follow-up putts every $3.5\text{ s}$ for any ball that comes to rest. |
| **60s–120s** | *3-Hole Chesapeake Championship* | Three consecutive mini-holes (**Hole 1: Local**, **Hole 2: Staging**, **Hole 3: Prod**) with a live cumulative stroke/points scoreboard, or a **Cut-Line Elimination** where the bottom half of finishers drop out after each hole until a final showdown on Hole 3. |

## 4. Visual, Camera & Audio Polish

* **Chesapeake Bay Environment:**
  * Bright emerald astroturf greens framed by weathered marina timber rails, red-and-white nautical buoys, and miniature lighthouses floating over your existing Chesapeake Bay water shader.
  * Animated flagstick that pops cleanly out of the cup the moment a ball drops in.

* **Readability for 2–30 Players:**
  * Distinct bright ball colors with subtle dimple sheen, thin colored ribbon trails, and crisp upright billboarded nameplates.
  * A compact **Distance-to-Pin Leaderboard** (e.g., `1st: Roscoe5 • 2.4m`) in the corner so everyone can follow close races even during chaotic collisions.

* **Dynamic Camera Choreography:**
  * **Tee-Off:** Slightly elevated 3/4 overview showing the whole tee box and first obstacle.
  * **Fairway Follow:** Smooth overhead dolly tracking the weighted center of the top 4 balls, zooming out slightly when the leaders split across dual paths.
  * **Cup Cam:** Low, dramatic green-level zoom once any ball comes within $3\text{ m}$ of the hole, capturing lip-outs and the winning drop up close.

* **Synthesized Audio (Web Audio API):**
  * Crisp wooden *thwack* on tee-off (staggered by $10\text{–}25\text{ ms}$ across players for a satisfying burst).
  * Hollow wooden *clacks* on bumper/wall hits, subtle billiard *clicks* on ball-to-ball collisions, gritty filtered noise in sand traps, and bright water *plops* on Bay splashes.
  * Unmistakable plastic/metal **cup rattle** followed by polite golf-clap synthesis and an arcade victory chime when the winner drops in.

## 5. Implementation Blueprint (Lightweight 3D Stack)

Designed for Three.js / WebGL using fast custom 2.5D rolling kinematics—no heavy 3D physics library needed:

1. **Heightmap Terrain + Slope Acceleration:**
   Define the course floor height with a piecewise analytical function $y = h(x, z)$ (flat pads, ramps, banked curves, and the depressed cup rim). Apply gravity along the local surface gradient each physics tick:

   $$
   \vec{a}_{\text{slope}} = -g \nabla h(x, z)
   $$

   Combine with surface-dependent rolling friction $\mu$ (low on turf, high in sand traps) so balls roll naturally up ramps and curve realistically around the rim of the cup.

2. **Elastic Ball-to-Ball & Wall Collisions:**
   Treat balls as 2D circles of radius $r$ on the $(x, z)$ plane with elastic impulse resolution ($e \approx 0.85$ for ball-to-ball caroms, $e \approx 0.75$ for wooden rails, $e \approx 1.3$ for Scope Creep bumpers). This runs smoothly at 60 FPS even with 30 simultaneous players.

3. **Auto-Putt Loop (Multi-Stroke Courses):**
   Whenever a ball's speed drops below a rest threshold $v_{\min}$ for $0.5\text{ s}$, automatically aim it toward the next course waypoint (with slight randomized angular jitter $\Delta\theta$ and power variance so everyone keeps a fair shot) and fire a crisp follow-up putt.

4. **Cup Capture & Lip-Out Physics:**
   When a ball's distance to the cup center is less than the cup radius $R_{\text{cup}}$:
   * If its speed $v < v_{\text{capture}}$, trigger the **Cup Drop** state and declare the winner.
   * If $v \ge v_{\text{capture}}$, deflect its velocity slightly around the rim for a dramatic **lip-out**!

5. **Hard-Cap "Gimme" Fallback:**
   If the round approaches the end of the selected duration slider without a winner, gradually increase the cup's inward funnel slope and activate a subtle **"Friday Afternoon Gimme"** breeze blowing straight toward the pin so the round always wraps cleanly on time.