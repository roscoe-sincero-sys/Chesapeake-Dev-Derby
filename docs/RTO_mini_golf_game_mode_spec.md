# Game Mode Spec: RTO Mini-Golf (Indoor Office Cubicle Open)

**App:** Chesapeake Dev Derby

**Genre:** 3D Simultaneous Arcade Mini-Golf (2.5D Rolling Physics & Office-Maze Chaos)

**Player Count:** 2–30 players

**Duration:** Scales with existing 10s–120s slider

## Overview

**RTO Mini-Golf**—unofficially dubbed the **"Return-to-Office Mandate Open"** or **"Instead of Raises Putting Green"**—turns a dim, late-afternoon IT floor into a sprawling DIY indoor putt-putt course. Roll-out green putting turf is duct-taped over gray commercial carpet, snaking through fabric cubicle aisles, breakroom hazards, and propped-open server racks. At the horn, all active developers tee off as color-coded golf balls at the exact same millisecond—bouncing off stacked Dell towers, ramping over 3-ring binders, dodging a spinning ergonomic desk chair, and navigating the dreaded **`?ReturnUrl=`** security detour. The first ball to clink into the tipped-over **`World's Okayest Developer`** mug (or plastic putting-return cup) at the end of the hall leads standup.

### Core Design Principle: Simultaneous Bumper-to-Bumper Chaos

Traditional turn-based golf is too slow for a 15-minute standup. Firing all 2–30 players at once turns an instantly recognizable IT cubicle maze into a slapstick demolition derby of pool-table caroms, spilled-coffee pileups, and heartbreaking lip-outs—while keeping every player visible on a shared screen from start to finish.

## 1. Course Flow & 4-Zone Office Layout (10–15s Mode)

1. **Zone 1: The Main Aisle Tee Box (`BACKLOG`)**
   All active dev balls line up in a tight grid on a roll-out felt putting mat taped down in front of the cubicle farm, subtly rocking as glowing aim arrows sweep down the corridor. On **`TEE OFF!`**, a synchronized wave of putters swings through and launches the whole team at once.

2. **Zone 2: The Cubicle Maze (`IN PROGRESS`)**
   Balls bank sharply off fabric cubicle partitions and yellow floor cable protectors (acting as speed bumps), launch over 3-ring binders laid sideways as makeshift ramps, and try to slip past a slowly spinning ergonomic desk chair blocking the narrow choke point.

3. **Zone 3: Breakroom & Copier Alley (`QA & REVIEW`)**
   The corridor splits into two paths:
   * *The Hotfix Shortcut:* A tight tunnel running directly underneath a blinking, jammed office copier (or through a propped-open server rack with hanging ethernet cables).
   * *The "Proper Process" Bypass:* A wider banked curve bordered by a spilled iced coffee puddle and the forced **`?ReturnUrl=`** security detour loop.

4. **Zone 4: The Executive Green (`DEPLOY TO PROD`)**
   A sloped green felt mat leading to a classic green plastic putting-return cup—or an oversized tipped-over **`LEAD STANDUP`** coffee mug—flanked by tiny office-plant decorations. Balls crest the final binder ramp, circle the rim for nail-biting lip-outs, and drop in to trigger a confetti burst, ceramic mug *clink*, and the winner banner.

## 2. Office-Supply Obstacles & Dev-Humor Catalog

Keep the course modular with 6 reusable workplace prefabs so hole layouts can be randomized each morning:

* **Spinning Ergonomic Desk Chair** *(Rotating 5-caster aisle blocker)* — Spins lazily in the center of the corridor; balls that time the casters zip cleanly underneath, while mistimed shots ricochet sideways into the cubicle walls.
  * *Popups:* `"Blocked by khallas software license"`, `"Blocked by baasi SSL Certs"` 

* **The "One Quick Idea" Detour (`?ReturnUrl=` Security Loop)** *(Cardboard tube / security barrier bypass)* — A flashing red barrier blocks the straight lane (`NO URL TAMPERING!`), forcing balls into a pointless U-turn loop labeled **`?ReturnUrl=`** that spits them right back onto the exact same fairway two seconds later.
  * *Popups:* `"URL edits banned. Fix: add ?ReturnUrl="`, `"Blocked URL edits; fixed by editing the URL"`, `"Security update broke reports — use ?ReturnUrl="`

* **BadalJwala Jammed Copier Gate** *(Pulsing orange paper-tray barrier)* — Periodically slams shut with a flashing amber error light, bouncing early leaders backward so trailing devs can overtake.
  * *Popups:* `"BadalJwala 500 Internal Error"`, `"Scrolling 800 columns now"`

* **Spilled Iced Coffee Puddle** *(Sticky hazard marked with a tiny yellow Wet Floor cone)* — Applies heavy rolling drag, slowing balls to a crawl until an automated follow-up putt chips them back onto dry felt.
  * *Popups:* `"Waiting on developer poll results"`, `"Waiting to be blamed for not being clear"`

* **Retired Hardware Bumpers** *(Stacked CRT monitors, ancient Dell towers, and printer paper reams)* — High-restitution bumpers that ping balls wildly across intersections.
  * *Popups:* `"Manager's pet feature"`, `"Unrequested feature broke prod"`, `"Failed to read Iklauti-ji's mind"`

* **The Under-Desk Cable Abyss** *(Out-of-bounds gap off the taped mat)* — Balls knocked off the felt roll under a desk into a tangled nest of power strips and respawn at the last checkpoint with a brief time penalty.
  * *Popups:* `"userLogin and eventLog broke audit logs"`, `"Rolling back server clock broke login"`

## 3. Scaling with the Duration Slider (10s–120s)

Instead of making balls roll in slow motion, scale the **office floor footprint and stroke rules** to match the selected timer cleanly:

| Duration | Course Variant | Pacing & Mechanics |
| :--- | :--- | :--- |
| **10s–15s** | *Hallway Hotfix Dash* | Compact single-aisle sprint: 1 binder ramp, 1 spinning desk chair, and a gentle funnel slope straight into the coffee mug. |
| **30s** | *Return-to-Office Mandate Open* | Full cubicle maze with the split copier shortcut, spilled coffee puddle, **`?ReturnUrl=`** detour loop, and automated follow-up putts every $3.5\text{ s}$ for any ball that comes to rest. |
| **60s–120s** | *3-Hole "Instead of Raises" Championship* | Three consecutive indoor holes (**Hole 1: Cubicle Farm**, **Hole 2: Breakroom & Copier Alley**, **Hole 3: Server Room & Executive Green**) with a live cumulative scoreboard—or a **Cut-Line Elimination** where the trailing half drops out after each hole until a final showdown on Hole 3. |

## 4. Visual, Camera & Audio Polish

* **Dark-Mode Friendly Office Aesthetic:**
  * Styled like a moody, after-hours IT floor so it fits the dark UI cleanly without harsh fluorescent glare: muted charcoal carpet, glowing monitor screens lighting up the cubicles, blinking green/amber server rack LEDs, neon edge tape lining the bright emerald putting mats, and tiny yellow wet-floor cones.
  * Details like sticky notes on cubicle walls, tangled ethernet curtains, and duct tape strips holding down the felt sell the DIY gag immediately.

* **Readability for 2–30 Players:**
  * Bright, high-contrast ball colors with subtle dimple sheen, thin colored ribbon trails, and crisp upright billboarded nameplates.
  * A compact **Distance-to-Mug Leaderboard** (e.g., `1st: Roscoe5 • 2.4m`) pinned in the corner so everyone can follow close races through tight cubicle turns.

* **Dynamic Camera Choreography:**
  * **Tee-Off:** Elevated 3/4 corridor overview showing the entire tee mat and first binder ramp.
  * **Cubicle Follow:** Smooth overhead dolly tracking the weighted center of the top 4 balls, rising slightly so fabric cubicle walls never obscure leaders.
  * **Mug Cam:** Low, dramatic floor-level zoom once any ball comes within $3\text{ m}$ of the finish, capturing rim lip-outs and the winning drop up close.

* **Synthesized Audio (Web Audio API):**
  * Crisp putter *thwacks* on tee-off (staggered by $10\text{–}25\text{ ms}$ across players for a clean burst).
  * Hollow plastic/binder *clacks* on ramps, muffled thuds against fabric cubicle walls, billiard *clicks* on ball-to-ball caroms, faint swivel-chair squeaks, copier error *beeps*, and sticky squelches in coffee puddles.
  * Distinct **ceramic mug clink** (or plastic putting-cup rattle) followed by polite, sarcastic golf claps and an arcade victory chime when the winner drops in.

## 5. Implementation Blueprint (Lightweight 3D Stack)

Designed for Three.js / WebGL using fast custom 2.5D rolling kinematics—no heavy 3D physics library required:

1. **Heightmap Terrain + Slope Acceleration:**
   Define the putting mat and binder ramp elevations with a piecewise analytical function $y = h(x, z)$ (flat felt strips, angled 3-ring binder ramps, floor cable-protector speed bumps, and the cup funnel). Apply gravity along the local surface gradient each tick:

   $$
   \vec{a}_{\text{slope}} = -g \nabla h(x, z)
   $$

   Pair this with surface-dependent rolling friction $\mu$ (low on green felt, medium on bare office carpet, high inside spilled iced coffee puddles).

2. **Elastic Ball-to-Ball & Wall Collisions:**
   Treat balls as 2D circles of radius $r$ on the $(x, z)$ plane with elastic impulse resolution ($e \approx 0.85$ for ball-to-ball caroms, $e \approx 0.55$ for cushioned fabric cubicle walls, $e \approx 1.3$ for stacked hardware bumpers). Keeps frame rates locked at 60 FPS even with 30 simultaneous players.

3. **Auto-Putt Loop (Multi-Stroke Courses):**
   Whenever a ball's speed drops below a rest threshold $v_{\min}$ for $0.5\text{ s}$, automatically aim it toward the next aisle waypoint (with slight randomized angular jitter $\Delta\theta$ and power variance so everyone maintains a fair shot) and fire a crisp follow-up putt.

4. **Cup / Mug Capture & Lip-Out Physics:**
   When a ball's distance to the cup center is less than $R_{\text{cup}}$:
   * If its speed $v < v_{\text{capture}}$, trigger the **Cup Drop** state and declare the standup leader.
   * If $v \ge v_{\text{capture}}$, deflect its velocity around the rim for a dramatic **lip-out**.

5. **Hard-Cap "Gimme" Fallback:**
   If the round approaches the end of the selected duration slider without a winner, gradually increase the cup's inward funnel slope and trigger an **"HVAC Draft / Friday 4:55 PM Gimme"** breeze straight toward the finish so the match always finishes right on time.