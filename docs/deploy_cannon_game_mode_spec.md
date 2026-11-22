# Game Mode Spec: Deploy Cannon (3D Human Cannonball Volley)

**App:** Chesapeake Dev Derby

**Genre:** 3D Arcade Artillery & Target-Landing Spectacle (Choreographed Ballistics)

**Player Count:** 2–30 players

**Duration:** Scales with existing 10s–120s slider

## Overview

**Deploy Cannon** lines up a row of gleaming brass circus cannons along a Chesapeake Bay pier, each loaded with an active developer wearing tiny aviator goggles. Out on the water sits a bobbing bullseye barge labeled **`PROD / LEAD STANDUP`**. On **`SHIP IT!`**, every fuse burns down and the entire battery fires in one massive volley across the sky. Some shots dud right off the dock, some overshoot into the horizon, and others get blown off course by rogue gusts or seagulls. Whoever lands closest to—or dead-center on—the floating bullseye leads standup.

### Core Design Principle: Reverse-Solved Ballistics

Instead of firing random velocities and hoping someone lands near the barge, **Deploy Cannon** uses **Reverse-Solved Ballistics**. At round start, the app performs a fair $1 / N$ roll to select the winner, assigns every player a specific landing coordinate (bullseye for the winner, comical misses and rim-bounces for decoys), and solves the exact initial velocity vector needed to hit each spot on time. You get effortless 60 FPS parabolic flight, hilarious variety, and guaranteed timing aligned with the duration slider.

## 1. The 4-Phase Round Flow (10–15s Mode)

1. **Phase 1: Load & Aim (0–2.5s)**
   Devs peek out of a curved row of brass cannons on a wooden pier. Barrels crank upward with metallic clunks while a striped pier windsock whips dramatically (`CROSSWIND: 24 KTS — SCOPE CREEP`). Fuses hiss and spark across the battery.

2. **Phase 2: The Volley — `SHIP IT!` (2.5–4.5s)**
   A massive staggered boom ripples down the line with smoke rings, barrel recoil, and brief camera shake. Immediately, 20–30% of the cannons suffer classic launch duds—coughing out black smoke and plopping devs straight into the water right off the pier.

3. **Phase 3: Airborne Mayhem (4.5–8.5s)**
   The camera sweeps smoothly out over the Chesapeake Bay, gliding alongside the main arc of soaring devs with colored smoke trails. Mid-flight hazards thin the pack: sudden wind gusts shove trajectories sideways, rogue bay seagulls clip stragglers, and overly ambitious blasts rocket right past the barge.

4. **Phase 4: Slow-Mo Splashdown & Bullseye (8.5–12s)**
   The camera cuts to a low-angle **Barge Cam** looking up as the final 2–3 contenders descend. Time dips to $0.4\times$ speed: a decoy clips the outer ring and skids into the bay with a huge geyser splash, while the winner sticks the landing squarely in the glowing center bullseye—triggering fireworks and the **`SHIPPED TO PROD — LEADS STANDUP`** banner.

## 2. Flight Archetypes & Dev-Humor Catalog

Assigning distinct ballistic mishaps keeps every volley funny and readable on a shared screen:

* **The Pier Dud** — Weak *poof* of gray smoke; the dev arcs 6 feet off the dock and belly-flops straight into the bay.
  * *Popups:* `"Failed to renew software license"`, `"Failed to renew SSL cert"`

* **The Overshoot** — Overcharged cannon blasts the dev cleanly over the barge into the distant horizon with a twinkling *ding*.
  * *Popups:* `"16 chars is too long for a password"`, `"Added managerial genius' unrequested feature"`

* **The Crosswind Drift** — Starts dead-on for the bullseye before a visible wind ribbon shoves them sharply off course.
  * *Popups:* `"Blamed for not being clear"`, `"Failed to read Iklauti-ji's mind"`

* **The Seagull Interception** — A rogue Chesapeake Bay gull glides across the flight path, bonking a dev into a comical tumble.
  * *Popups:* `"Blocked by own-party API"`, `"Blocked by common sense"`

* **The Emergency Chute** — A tiny cocktail umbrella or parachute pops open mid-air, gently drifting the dev far away from responsibility.
  * *Popups:* `"Busy completing an already completed data migration"`, `"Busy scrolling 800 columns"`

* **The Rim-Bounce Heartbreak** *(Reserved for the final 1–2 decoys)* — Hits the outer ring of the barge, bounces dramatically across the paint, and tumbles over the edge at the last inch.
  * *Popups:* `"Blocked by BadalBhadak"`

## 3. Scaling with the Duration Slider (10s–120s)

Rather than making arcs artificially floaty, scale the **salvo structure and barge mechanics** to match the selected timer:

| Duration | Mode Variant | Pacing & Mechanics |
| :--- | :--- | :--- |
| **10s–15s** | *Hotfix Volley* | Single simultaneous barrage from the pier to a stationary bullseye barge. Fast, chaotic, instant payoff. |
| **30s** | *Two-Stage Qualification* | **Salvo 1 (Staging):** Entire team fires at a large barge; the 3–5 closest survivors advance. **Salvo 2 (Prod):** Finalists reload for a sudden-death shot at a smaller, drifting barge with stronger crosswinds. |
| **60s–120s** | *Artillery Showcase* | Rapid-fire staggered launches (1–2 cannons every couple seconds) at a moving barge weaving between Chesapeake Bay buoys. A live **Closest to Bullseye** leaderboard updates on every landing (e.g., `1st: Roscoe4 — 0.8m`), building tension as remaining devs try to beat the mark. |

## 4. Visual, Camera & Audio Polish

* **Chesapeake Bay Environment:**
  * Wooden pier deck with bollards, glowing pier lanterns, a spinning striped windsock, and brass cannons angled out over the existing Chesapeake water shader.
  * Out in the bay, a weathered flat-deck barge painted with concentric target rings (`DEV`, `QA`, `STAGING`, and a glowing golden **`PROD`** bullseye) bobs gently on the waves.
  * Floating distance rings/buoys on the water help players immediately judge how close each splashdown was.

* **Character & Visual Readability (2–30 Players):**
  * Each launched dev wears a color-coded helmet/cape, leaves a thin translucent arc ribbon behind them, and carries a crisp billboarded nameplate.
  * Water impacts spawn bright white circular splash rings so misses remain hilarious and readable even from high altitudes.

* **Dynamic Camera Choreography:**
  * **Launch:** Sweeping low-angle shot down the cannon line as fuses spark and barrels fire in a fast left-to-right wave.
  * **Apex:** High wide tracking shot showing the rainbow of intersecting arcs arching over the water.
  * **Impact:** Dramatic low-angle **Barge Cam** tilted skyward for the final slow-motion landings.

* **Synthesized Audio (Web Audio API):**
  * Crackling white-noise fuse hiss followed by punchy low-end cannon *thumps* staggered by $30\text{–}60\text{ ms}$ so 30 cannons sound like rolling thunder rather than one clipped blast.
  * Classic rising/falling projectile whistles during the arc, comic *honk/squawk* on seagull hits, big watery *sploosh* bursts on misses, and a brass bell + confetti fanfare on the bullseye landing.

## 5. Implementation Blueprint (Lightweight 3D Stack)

Designed for Three.js / WebGL with zero external physics engine required:

1. **Responsive Battery Layout (2–30 Players):**
   Arrange cannons along a gently curved pier arc for $2\text{–}12$ players, or in two staggered stadium tiers (front pier deck + raised back parapet) for $13\text{–}30$ players so every cannon is clearly visible in the opening shot.

2. **Exact Trajectory Solver:**
   For each dev, given cannon muzzle position $\vec{p}_0$, pre-assigned target landing coordinate $\vec{p}_T$, gravity $\vec{g} = (0, -g, 0)$, and flight duration $T$, compute the exact initial launch velocity:

   $$\vec{v}_0 = \frac{\vec{p}_T - \vec{p}_0 - \frac{1}{2}\vec{g}T^2}{T}$$

   Update position each frame with standard kinematics plus an optional mid-air perturbation $\vec{d}(t)$ for decoys (such as a smooth crosswind curve or seagull deflection impulse):

   $$\vec{p}(t) = \vec{p}_0 + \vec{v}_0 t + \frac{1}{2}\vec{g}t^2 + \vec{d}(t)$$

3. **Staggered Arrival Polish:**
   Slightly vary $T$ across players (e.g., duds hit early at $t = 3.5\text{ s}$, main pack splashes between $t = 7\text{–}9\text{ s}$, and the winner + 1–2 rim-bounce finalists arrive last at $t = 9.5\text{–}10.5\text{ s}$) so the final slow-motion shot is uncluttered and dramatic.

4. **Lightweight Particle Pooling:**
   Reuse pooled spheres/billboards for cannon smoke rings, arc trail dots, and water splash columns so a 30-cannon simultaneous salvo runs smoothly at 60 FPS on any browser.