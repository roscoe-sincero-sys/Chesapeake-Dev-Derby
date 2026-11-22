# Game Mode Spec: Code Freeze (Red Light, Green Light)

**App:** Chesapeake Dev Derby

**Genre:** 3D Stop-and-Go Survival Sprint

**Player Count:** 2–30 players

**Duration:** Scales with existing 10s–120s slider

## Overview

**Code Freeze** lines up all active developers along a neon CI/CD sprint runway facing a giant, swiveling **RELEASE MANAGER** spotlight tower at the finish line. On **GREEN (`SPRINT OPEN`)**, everyone dashes wildly toward the goal. On **RED (`CODE FREEZE!`)**, the arena snaps crimson and a scanning laser sweeps the floor—anyone whose momentum carries them an inch too far, twitches, or gets bumped from behind gets zapped out of the round. The first dev to cross the finish line—or the last dev still standing—leads standup.

### Core Design Principle: Momentum & Comedic Timing

The suspense comes from **braking physics and close calls**. When the warning light flickers, devs slam on the brakes, leaning backward with sparks flying off their shoes. Some freeze on one foot in dramatic poses; others slide just past the threshold and get vaporized with a dev-themed excuse popup.

## 1. The 3-State Cycle Flow

Each round alternates rapidly between three clear visual and audio states:

1. **GREEN — `SPRINT OPEN`**
   The runway lights glow emerald and an upbeat synth beat plays. Devs sprint forward down the lane with randomized speed bursts, tiny stumbles, and jostling.
2. **YELLOW — `PR IN REVIEW` (0.4s–0.7s Warning Flash)**
   An amber strobe and rising beep warn that a freeze is imminent. Devs immediately begin braking, leaning backward and skidding to a halt based on their momentum.
3. **RED — `CODE FREEZE!`**
   The arena snaps crimson with a klaxon buzz. The **RELEASE MANAGER** tower spins 180 degrees and sweeps a bright red scanning laser across the runway.
   * Any dev still sliding, twitching, or nudged forward by a trailing teammate is locked on by the laser and zapped into a puff of smoke and binary particles.
   * Floating elimination popups appear above zapped devs:
     * **"Blamed for not being clear!"**
     * **"Made secret hotfixes!"**
     * **"Added ?ReturnUrl= to all URLs."**
     * **"Created four 800-columns tables."**
     * **"Rolled back the server clock!"**

### Win Conditions
* **First Across the Line:** The first dev to break the tape at the **RELEASE / LEAD STANDUP** finish zone wins immediately.
* **Last Dev Standing:** If a brutal freeze eliminates the rest of the field, the sole survivor automatically wins with a victory dance.

## 2. Scaling with the Duration Slider (10s–120s)

Instead of stretching out awkward pauses, scale the **runway length, number of freeze cycles, and track hazards** to match the selected timer:

| Duration | Mode Variant | Pacing & Mechanics |
| :--- | :--- | :--- |
| **10s–15s** | *Hotfix Dash* | Short runway, 2 rapid freeze cycles, high zap probability so the pack thins quickly for a photo finish. |
| **30s** | *Standard Release* | Medium runway, 4–5 freeze cycles, occasional **Yellow Fake-Outs** (flashes yellow, then snaps back to green), and minor teammate bumping. |
| **60s–120s** | *Enterprise Deployment* | Long runway with mid-track checkpoints (**Staging**, **UAT**) and slippery **"Tech Debt Ice"** patches that double braking slide distance during a freeze. |

## 3. Visual, Camera & Audio Polish

* **Arena & Environment:**
  * A sleek dark-mode data-center runway with glowing lane markers matching the existing Chesapeake Dev Derby aesthetic.
  * Overhead LED gantry displays massive status text (`SPRINT OPEN`, `CODE FREEZE!`, and a live `REMAINING: X/10` counter).
  * At the finish line stands a towering retro-futuristic **RELEASE MANAGER** (a giant glowing monitor head or spotlight turret) that faces away during Green and whips around during Red.
* **Dynamic Camera Cuts:**
  * **During Green:** Smooth side-3/4 tracking shot gliding alongside the lead pack.
  * **During Red:** Quick snap to a dramatic low-angle shot looking down the runway from behind the Release Manager's laser, zooming briefly onto any dev who slides and gets zapped.
  * **Photo Finish:** Slow-motion zoom as the leader lunges across the finish line just before a final freeze.
* **Synthesized Audio (Web Audio API):**
  * Crisp ticking/chiptune sprint loop during Green (tempo speeds up slightly as leaders near the finish line).
  * Abrupt record-scratch or amber warning chirp on Yellow.
  * Deep ominous bass hum + laser *pew* / electric zap sound effect on Red eliminations.
  * Triumphant arcade fanfare when the winner crosses the line.

## 4. Implementation Blueprint (Lightweight 3D Stack)

Designed to drop cleanly into a Three.js / WebGL setup without needing complex ragdoll physics:

1. **Fairness-First RNG:**
   To ensure every active dev has an exact `1 / N` statistical chance of winning, either:
   * **Per-Cycle Fair Rolls:** Every Green phase, assign each surviving dev a fresh randomized burst speed and braking reaction time from identical distributions; or
   * **Choreographed Outcome:** Pre-roll the fair winner at round start, then subtly tune braking/slide rolls so the winner pulls off nail-biting last-millisecond stops while decoys slide into the laser.
2. **Simple 1D/2D Movement Math:**
   Track each dev's `positionZ`, `velocityZ`, and `state` (`SPRINTING`, `BRAKING`, `FROZEN`, `ZAPPED`). During `BRAKING`, apply deceleration; if `velocityZ > threshold` when the Red laser passes their `positionZ`, trigger the zap animation.
3. **Timer Pacing Guardrail:**
   Compare the lead dev's remaining distance against the time left on the duration slider. If the pack is running behind schedule, shorten the final Red phase and trigger an **"Emergency Deploy!"** sprint boost so the round always finishes right on time.