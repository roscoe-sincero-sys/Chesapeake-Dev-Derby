# Game Mode Spec: Dependency Jenga (3D Collapsing Tower)

**App:** Chesapeake Dev Derby

**Genre:** 3D Structural Collapse & Survival Spectacle (Guided Instability + Debris Physics)

**Player Count:** 2–30 players

**Duration:** Scales with existing 10s–120s slider

## Overview

**Dependency Jenga** places all active developers atop a towering, rickety 3D Jenga stack built out of labeled software packages (`left-pad`, `legacy-auth-v1`, `do-not-touch-utils`, `is-odd`). An automated glowing cursor—labeled **`npm audit fix --force`**—slides out critical load-bearing blocks one by one. With every pull, the tower groans, sways further off-axis, and shakes devs off the ledges until one fatal block triggers a catastrophic slow-motion collapse. The last developer to touch the glowing red **`PROD DOWN`** floor below leads standup.

### Core Design Principle: Guided Instability + Real Collapse Physics

Pure rigid-body Jenga stacks either collapse prematurely on move one or refuse to fall at all. Instead, Dependency Jenga uses **Guided Instability**:

1. During the block-pulling phase, the tower's sway angle and structural wobble are driven by smooth spring-damper math synced to the duration slider.
2. When the fatal block is yanked at the climax, the tower switches instantly into chaotic, slow-motion rigid-body collapse physics—guaranteeing both nail-biting buildup and a slapstick finish every single round.

## 1. The 4-Phase Round Flow (10–15s Mode)

1. **Phase 1: The Monolith (0–2s)**
   The camera tilts dramatically up a 14-tier wooden/neon block tower rising above a glowing **`PROD DOWN`** pit. All active devs are perched across the top platform (and upper side ledges for larger teams), waving nervously as the tower gently creaks in the breeze.

2. **Phase 2: Risky Upgrades (2–7s)**
   A glowing 3D pointer (`DEPENDABOT` / `npm update`) highlights a lower block, rattles it, and yanks it clean out of the stack.

   * Each pull spikes the tower's tilt angle and triggers a shockwave up the stack.

   * 2–4 devs lose their footing on each tremor and tumble off the edges with floating error popups (*"Blamed for not being clear"*, *"16-char passwords deprecated in v2"*).

3. **Phase 3: The Fatal Pull (7–9s)**
   A siren chirps as the cursor locks onto a tiny, glowing crimson keystone block near the base—labeled **`left-pad`** or **`do-not-touch-utils`**. The camera snaps tight to the base as the block slides out with a loud metallic screech.

4. **Phase 4: Slow-Motion Collapse (9–12s)**
   Time slows to `0.35x` as the entire tower buckles, explodes outward into tumbling blocks, and rains devs toward the floor. Survivors frantically windmill through the air or surf falling blocks downward. The final dev to stay off the **`PROD DOWN`** floor (or land safely on a single upright base block) is crowned standup leader.

## 2. Iconic Dependency Blocks & Dev-Humor Catalog

Labeling the side faces of the 3D blocks makes the tower instantly funny on a shared screen:

* **Safe / Early Pulls** *(Amber blocks — cause big wobbles and knock off stragglers)*:

  * `lamha.js`

  * `jquery-1.9.min.js`

  * `is-even` / `is-odd`

  * `todo-fix-never`

  * `node_tables (200 GB)`

  * `temp-hotfix-1999`

* **Keystone / Fatal Pulls** *(Glowing crimson blocks — always trigger the final collapse)*:

  * `blamed-for-not-being-clear`

  * `do-not-touch-utils-x`

  * `auth-v9-final2-draft7-actual4`

  * `core-business-dont-ask-why.php`

  * `load-bearing-hotfix`

* **Elimination Popups (when devs fall off):**

  * `"Failed to rollback server clock"`

  * `"Failed to renew software license!"`

  * `"Failed to make WORD docs readible"`

  * `"Failed to complete a completed migration"`

  * `"Failed to explain it a sixth time"`

## 3. Scaling with the Duration Slider (10s–120s)

Scale the **tower height, pull count, and structural phases** to fit the timer naturally:

| Duration | Mode Variant | Pacing & Mechanics | 
| ----- | ----- | ----- | 
| **10s–15s** | *Friday Patch* | 12-tier tower, 3 rapid block pulls, fast transition straight into the slow-motion collapse. | 
| **30s** | *Major Version Bump* | 18-tier tower, 6–7 pulls including **Fake-Out Taps** (cursor nudges a block, thinks better of it, and switches targets) plus progressive side-ledge shedding. | 
| **60s–120s** | *Full Monolith Migration* | 24-tier mega-tower with **Stack-On-Top Rebuilding**: pulled blocks get dropped clumsily onto the top platform, making the tower taller and increasingly top-heavy while devs scramble to dodge falling packages before the final collapse. | 

## 4. Visual, Camera & Audio Polish

* **Arena & Tower Aesthetic:**

  * Warm stylized wooden Jenga blocks fused with dark-mode neon edge trim and crisp canvas-textured package labels on the sides.

  * A live **`STABILITY: 42%`** / **`BUILD HEALTH`** hologram meter floating beside the tower that shifts from emerald to amber to flashing crimson.

  * Below the tower sits a glowing red floor grid labeled **`PROD OUTAGE ZONE`** (or a splashy Chesapeake Bay pier platform so falling devs splash into the water).

* **Dynamic Camera Choreography:**

  * **Wide Orbit:** Slow, tense circular orbit around the leaning tower during block pulls so the team can see every dev's nameplate.

  * **Keystone Cut-In:** Brief 0.8s zoom onto the base when the fatal block (`left-pad`) slides out.

  * **Slow-Mo Hero Pan:** Pulls back and tracks the last 2–3 airborne devs in dramatic slow motion until the final elimination triggers.

* **Synthesized Audio (Web Audio API):**

  * Wooden sliding scrape + rising creak pitch as each block is pulled.

  * Tense heartbeat/bass throb as tower lean crosses `15 degrees`.

  * Deep cinematic bass drop when slow-motion collapse starts, layered with crisp wooden clatter sounds and cartoon falling whistles.

  * Upbeat arcade fanfare when the sole survivor wins.

## 5. Implementation Blueprint (Lightweight 3D Stack)

Designed for Three.js / WebGL with minimal physics overhead:

1. **Fairness-First Winner Selection:**
   Pre-roll the fair `1 / N` winner at round start. During Phase 2 tremors, shed non-winning devs smoothly across early pulls so 3–5 finalists remain perched at the very top for the climax.

2. **Hierarchical Tower Sway (Pre-Collapse):**
   Parent all intact tower tiers to a curved spine or nested pivot hierarchy driven by a damped harmonic oscillator:

   $$\theta(t) = A \cdot e^{-\zeta t} \sin(\omega t)$$

   Increase the base lean offset and amplitude $A$ after every block pull so the visual tension escalates predictably without premature physics glitches.

3. **Collapse Handoff (Zero Heavy Engine Needed):**
   When the fatal block exits:

   * Detach all blocks and remaining dev avatars from the tower spine.

   * Assign each block an outward radial explosion velocity + random angular spin under standard gravity ($g$ scaled to `0.35x` for slow-mo).

   * Give the pre-rolled winner a slightly higher upward "hop" or buoyed block trajectory (e.g., landing upright on a floating `LTS-support` raft/block or hitting the floor `0.4s` after the runner-up) so the finish is always unambiguous and hilarious.

4. **Canvas-Generated Block Labels:**
   Generate the package text textures dynamically onto offscreen HTML `<canvas>` elements once at round initialization, applying them as diffuse maps to your block materials so you can easily customize the dependency names from a simple JSON array.