# Game Mode Spec: Launchpad Roulette (Rocket Ignition Chaos)

**App:** Chesapeake Dev Derby

**Genre:** 3D Kerbal-Style Rocket Launch Spectacle (Choreographed Parametric Flight)

**Player Count:** 2–30 players

**Duration:** Scales with existing 10s–120s slider

## Overview

**Launchpad Roulette** straps every active developer into a rickety, cobbled-together 3D rocket lined up along a coastal Chesapeake Bay launch complex. After a punchy `3... 2... 1... DEPLOY!` countdown, every thruster ignites simultaneously—and immediately descends into slapstick aerospace mayhem. Rockets fizzle on the pad, corkscrew through the sky, shed boosters prematurely, or pop into confetti mid-climb. The lone rocket that actually clears the cloud layer and reaches **Prod Orbit** leads standup.

### Core Design Principle: Choreographed Parametric Mayhem

Real aerodynamic simulation is unpredictable and hard to frame on camera. Instead, the round **pre-rolls a fair `1 / N` winner** at startup, assigns every other rocket a comedic failure archetype and staggered failure timestamp, and drives all trajectories with lightweight parametric curves. This guarantees hilarious variety, dramatic photo finishes, and exact alignment with the duration slider.

## 1. The 4-Phase Round Flow (10–15s Mode)

1. **Phase 1: Pre-Flight & Ignition (0–2.5s)**
   All active dev rockets sit on glowing launchpads venting white steam and rattling as the countdown lights flash (`3... 2... 1... DEPLOY!`). Thrusters flare with bright orange plumes and camera shake kicks in.

2. **Phase 2: Liftoff & Pad Chaos (2.5–5s)**
   The fleet lifts off in a roaring wall of smoke. Immediately, 30–40% of the rockets suffer early pad disasters—tipping over gently, sputtering sideways, or launching their boosters without the cockpit.

3. **Phase 3: Max-Q & Mid-Air Mayhem (5–9s)**
   The camera cranes smoothly upward, tracking the surviving cluster of 3–5 rockets as they race toward the cloud deck. One by one, the remaining decoys veer off in wild spirals, stall out under tiny parachutes, or burst into confetti just below the clouds.

4. **Phase 4: Orbit Achieved (9–12s)**
   The sole survivor punches through the cloud layer as the sky transitions from blue to starry deep space. The rocket deploys a tiny flag/satellite, triggering the **`DEPLOYED TO PROD — LEADS STANDUP`** banner.

## 2. Rocket Failure Archetypes (Dev-Humor Catalog)

Assigning distinct visual failure styles keeps every round fresh and readable on a shared screen:

* **The Pad Fizzle** — Thick black smoke puffs out, the rocket hops two feet, and gently tips over on the pad.
  * *Popups:* `"Oops. That was pr0dI. I needed pr0dL."`, `"16 chars secret is too big"`
* **The Corkscrew** — Thruster glitches, sending the rocket spinning in tight, frantic loops before popping into sparks.
  * *Popups:* `"Failed to add ?returnUrl= to URL"`, `"800 columns is not enough"`
* **The Sideways Veer** — Rocket banks 90 degrees immediately after liftoff and rockets horizontally out over the Bay.
  * *Popups:* `"Rolled back the server clock"`, `"Failed to ping before flushing"`
* **Premature Staging** — The bottom booster blasts cleanly into the sky while the dev's cockpit stays sitting awkwardly on the pad.
  * *Popups:* `"SSL Certs Ran Out of Fuel"`, `"Stabbed by Null pointer"`
* **Mid-Air Stall** — Engine cuts out mid-climb with a cartoon sputter; a comically tiny parachute deploys as the dev drifts slowly downward.
  * *Popups:* `"Common sense leak"`, `"Engine was voted off the team!"`
* **The Cloud-Deck Heartbreak** *(Reserved for the final 1–2 decoys)* — Climbs neck-and-neck with the winner until 90% altitude, then pops into celebratory confetti.
  * *Popups:* `"Blamed for not being clear"`, `"500 Internal Server Error"`

## 3. Scaling with the Duration Slider (10s–120s)

Rather than stretching out a slow ascent, scale the **staging milestones and altitude layers** to match the selected timer:

| Duration | Mode Variant | Pacing & Mechanics | 
| ----- | ----- | ----- | 
| **10s–15s** | *Hotfix Launch* | Single-stage mass ignition, rapid staggered failures, fast sprint straight to the cloud deck. | 
| **30s** | *Two-Stage Ascent* | Rockets climb through **Stage 1 (Local -> Staging)** where half the pack fails, trigger a dramatic mid-air **Stage Separation**, and race through **Stage 2 (Staging -> Prod)** for the final showdown. | 
| **60s–120s** | *Orbital Gauntlet* | Three atmospheric tiers (**Dev Troposphere -> QA Stratosphere -> Prod Orbit**) with floating hazard zones (drifting **Legacy Code Asteroids** and **Bug Swarms**) that knock out stragglers across a prolonged climb. | 

## 4. Visual, Camera & Audio Polish

* **Environment:**
  * A coastal launchpad deck overlooking the Chesapeake Bay (reusing the water shader aesthetic from Derby Race), complete with miniature gantry towers, warning beacons, and an overhead Mission Control LED sign reading `MISSION: STANDUP`.
  * Skybox dynamically shifts color with altitude: coastal daylight -> deep twilight blue -> starry orbit.
* **Rocket Design:**
  * Distinct, quirky low-poly rockets with randomized cosmetic flair (duct-tape bands, oversized fins, coffee-mug nosecones, tiny antennas) color-coded per dev with crisp billboarded nameplates.
  * Lightweight particle trails (white/orange exhaust for healthy rockets, dark gray puffs for sputtering ones, neon confetti bursts on pops).
* **Dynamic Camera Choreography:**
  * **Pre-Launch:** Low-angle hero shot sweeping across the row/arc of launchpads.
  * **Climb:** Smooth upward crane + slight zoom tracking the bounding box of the top 3–4 surviving rockets so the action stays centered.
  * **Finish:** Tight follow-cam on the final 2 rockets punching through the clouds, locking onto the winner as they hit zero-G orbit.
* **Synthesized Audio (Web Audio API):**
  * Crisp NASA-style countdown beeps (`3, 2, 1`) followed by a filtered white-noise thruster roar.
  * Comedic pitch-dropping slide whistles for corkscrews, cartoon sputters for stalls, and crisp confetti *pops*.
  * Warm retro synth chord / mission-control chime (`"We have liftoff!"`) when orbit is reached.

## 5. Implementation Blueprint (Lightweight 3D Stack)

Designed for Three.js / WebGL with zero external physics engine required:

1. **Responsive Launchpad Formation (2–30 Players):**
   Arrange launchpads in a clean single arc for `2–10` players, or a staggered 2–3 row amphitheater grid for `11–30` players so every rocket is clearly visible in the opening shot.
2. **Pre-Rolled Timeline Array:**
   At round start, select 1 fair winner (`survivalTime = totalDuration`) and assign every other dev a `failureType` and `failureTime` distributed smoothly between `25%` and `92%` of the round duration (ensuring at least 1–2 decoys survive until the final 15% for suspense).
3. **Parametric Flight Math:**
   Update each rocket's `(x, y, z)` and pitch/roll quaternion each frame from its current phase:
   * *Healthy Climb:* Smooth upward acceleration with tiny Perlin/sine wobble so rockets feel alive.
   * *Failure Curve:* Switch seamlessly from climb velocity into the assigned failure math (e.g., damped spiral for Corkscrew, parabolic arc for Stall, gravity tumble for Pad Fizzle).
4. **Object-Pooled Particles:**
   Use a single instanced mesh or pooled sprite array for exhaust smoke, flames, and confetti bursts to keep frame rates locked at 60 FPS even with 30 rockets igniting at once.