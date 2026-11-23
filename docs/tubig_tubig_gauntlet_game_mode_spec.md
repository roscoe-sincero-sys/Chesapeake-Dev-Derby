# Game Mode Spec: Tubig-Tubig Gauntlet (Line-Blocking Dash)

**App:** Chesapeake Dev Derby

**Genre:** 3D Overhead Grid-Crossing Tag & Juke Chaos (Choreographed Lane-Running Physics)

**Player Count:** 2–30 players

**Duration:** Scales with existing 10s–120s slider

## Overview

Adapted from **tubig-tubig**—the classic Cebuano street game played across a glowing grid of lines poured onto dark asphalt with water (known elsewhere in the Philippines as *patintero*)—**Tubig-Tubig Gauntlet** turns a twilight barangay street into a high-stakes deployment pipeline. Four glowing cyan water lines stretch across the road, each patrolled by a frantic, arm-waving AI blocker representing a classic IT bottleneck: **Linter**, **Code Review**, **QA Gate**, and **CAB Approval**, plus one dreaded **Center-Line Roamer (*Patotot*)** who patrols both the front line and the vertical spine.

All active developers line up behind the starting curb (`LOCALHOST`). On **`DEPLOY! — PANAGAN!`**, the entire team sprints forward—feinting left, juking right, and dashing across the wet lines toward the far turnaround zone (`STAGING`) and all the way back to `PROD` without getting tagged. Anyone slapped by a blocker splatters dramatically into a glowing water puddle. The first dev to survive the round trip (or the last un-splattered runner standing) claims the mic and leads standup.

### Core Design Principle: High-Contrast Overhead Readability & Fake-Out Tension

Because *tubig-tubig* plays out on a clean rectangular court, a high-angle 3/4 overhead camera keeps all 2–30 runners and every patrolling blocker crystal clear on a shared meeting screen—even during peak chaos. What makes it nail-biting is the authentic street-game rhythm of **stop-and-go jukes**: runners pause inches from a wet line, bait a blocker to overcommit left, and burst through the open gap before the arms snap shut.

## 1. The 4-Phase Round Flow (10–15s Mode)

1. **Phase 1: Pour the Lines & Standoff (0–2s)**
   Bright cyan water lines shimmer across the dark street as a glowing watering can finishes drawing the court. The four horizontal blockers drop into wide defensive stances, bouncing on their toes and clapping their hands (`"NONE SHALL MERGE!"`), while the **Center-Line *Patotot*** paces down the vertical spine.

2. **Phase 2: Outbound Surge — `DEPLOY!` (2–6s)**
   The team bolts off the `LOCALHOST` curb in a chaotic wave. Aggressive sprinters charge straight into Line 1 (**Linter**) and immediately explode into comical water-splash puddles. Smarter runners stutter-step, baiting **Code Review** and **QA Gate** out of position before slicing diagonally across into the **`STAGING` Turnaround Zone**.

3. **Phase 3: The Turnaround & Gauntlet Squeeze (6–9.5s)**
   Survivors touch the glowing **`STAGING`** line (`"APPROVED FOR RETURN TRIP!"`) and spin back toward **`PROD`**, colliding visually with late stragglers still heading outbound. Meanwhile, the blockers enter **Overtime Frenzy**, sliding faster along their water rails as the *Patotot* darts down the center spine to cut off crossing lanes.

4. **Phase 4: Final Line Photo-Finish (9.5–12s)**
   Two or three finalists weave toward the final exit line with the **Linter** and **CAB Approval** lunging from opposite sides. Time dips to $0.4\times$ slow motion as a decoy gets tagged half a step from freedom and bursts into a sparkling splash, while the winning dev dives cleanly across the final water line—triggering fiesta confetti and the **`CLEARED ALL GATES — LEADS STANDUP!`** banner.

## 2. The Line Blockers, Tag Mishaps & Dev-Humor Catalog

Each water line has a distinct personality, patrol speed, and comic-book tag banner when it catches a runner:

* **Line 1 — Linter & Security Gate** *(Fast, twitchy lateral patrols; punishes early rushers)*

  * *Tag Popups:* `"Blocked by pan-os software license"`, `"URL edits banned. Fix: add ?ReturnUrl="`, `"Missing semicolon — BALIK!"`

* **Line 2 — Code Review & Architecture** *(Sudden fake-outs and unpredictable reversals)*

  * *Tag Popups:* `"Nitpick: rename all new tables with the -x"`, `"Ekmaatra-ji blames you for not being clear"`

* **Line 3 — QA & Infrastructure (`PanganodSilab` Wall)** *(Wide outstretched arms with crackling orange/cyan static arcs)*

  * *Tag Popups:* `"Blocked by PanganodSilab 500"`, `"BadalJwala rate-limited you"`, `"Zabardasti feature paksit'd prod"`

* **Line 4 — CAB Approval (The Final Boss)** *(Heavy, menacing stride guarding the `STAGING` turnaround line)*

  * *Tag Popups:* `"Ekmaatra-ji derailed by common sense again"`, `"Nag-inusarang Agalon derailed by common sense again"`

* **Center Spine — The *Patotot* (Scope Creep Roamer)** *(The classic tubig-tubig captain who can run up and down the vertical center line AND guard the front line, ambushing devs who hug the middle)*

  * *Tag Popups:* `"Ekmaatra is doing a flyby — PANAGAN!"`, `"Tumba'd the user table!"`

* **Optional Mode Toggle — "First Safe" vs. "First Tagged (*Bantay*)":**

  * **Champion Mode (Default):** First runner to complete the full round trip (or survive longest) leads standup.

  * **Classic Tag Mode (*Ikaw Na!*):** Flip the logic so the very first dev splattered by a blocker becomes the new *Patotot* and leads standup—instant 10-second comedy.

## 3. Scaling with the Duration Slider (10s–120s)

Rather than making runners jog slowly across an empty street, scale the **grid depth, round-trip laps, and elimination heats** to match the selected timer cleanly:

| Duration | Mode Variant | Pacing & Mechanics | 
| ----- | ----- | ----- | 
| **10s–15s** | *Hotfix Sprint* | 4-line court, single outbound + return sprint. High blocker aggression wipes out most of the pack quickly so 2–3 finalists battle at the last line right on schedule. | 
| **30s** | *Full Deployment Pipeline* | Expanded 5-line grid with wider lane spacing, allowing real cat-and-mouse juke standoffs at every line. Tagged devs respawn briefly in a `RETRY QUEUE` for the first $10\text{ s}$ before **Sudden-Death Freeze** locks out respawns for the decisive return dash. | 
| **60s–120s** | *Barangay Knockout Tournament* | Multi-heat elimination across 3 escalating rounds (**Round 1: Dev Court**, **Round 2: PanganodUlbo Storm** with slippery rain puddles, **Round 3: Sudden-Death Finals**). Survivors advance while tagged players cheer from the sidewalk bleachers until one champion clears the final gate. | 

## 4. Visual, Camera & Audio Polish

* **Dark-Mode Friendly Twilight Street Aesthetic:**

  * Deep evening dark-asphalt street reflecting glowing cyan/aqua water lines (`tubig`) painted with subtle animated wet-sheen ripples so the court boundaries read like a neon arcade board.

  * Overhead crisscrossing fiesta *banderitas*, warm corner streetlamps, glowing traffic cones at each court corner, and painted chalk labels at both ends (`LOCALHOST` $\leftrightarrow$ `STAGING`).

  * **The Splash Elimination:** Whenever a blocker's outstretched hand tags a runner, the dev bursts into a playful cartoon splash ring + soaked-hair stagger animation (`SPLASHED!`) before stepping off to the sideline bleachers—keeping the active court uncluttered as the round narrows.

* **Readability for 2–30 Players:**

  * Crisp overhead 3/4 view ensures zero occlusion between lanes. Runners wear bright, color-coded street jerseys with distinct upright nameplates and subtle glowing footsteps when sprinting.

  * Each blocker wears a glowing referee/guard visor and projects a faint, translucent red **Reach Zone** bar along their water line so viewers can immediately feel how close every dive and juke is.

* **Dynamic Camera Choreography:**

  * **Opening:** Slight sweeping pan along the gleaming water grid as the *Patotot* drops into a defensive crouch.

  * **Mid-Round:** Smooth elevated overhead tracking centered on the leading cluster of active runners, gently zooming in as the survivor pool shrinks below 6 players.

  * **Final Crossing:** Quick punch-in angle down the last water line at $0.4\times$ slow motion for the winning dive.

* **Synthesized Audio (Web Audio API):**

  * Playful pouring-water trickle during line setup, followed by a sharp street whistle (`BEEP!`) to launch the sprint.

  * Rapid sneaker *squeak-squeak* chirps whenever runners execute fake-out jukes at a line.

  * Juicy, percussive **water-bucket *SPLASH*** + comedic descending slide tone on every tag.

  * Building street-handclap rhythm when the final 3 survivors are on the return leg, resolving into a triumphant arcade chime + crowd cheer on the winning crossing.

## 5. Implementation Blueprint (Lightweight 3D Stack)

Designed for Three.js / WebGL using clean 2D grid kinematics and state-machine steering—no heavy 3D physics engine required:

1. **Fairness-First Pre-Roll & Gate Choreography:**
   At round start, perform a fair $1 / N$ RNG roll to select the standup leader (plus 1–2 close finalists for a photo finish). Assign each decoy a target elimination line ($L \in \{1, 2, 3, 4, \text{spine}\}$) and timing window so the crowd thins organically across both the outbound and return legs.

2. **1D Blocker Rail Kinematics:**
   Horizontal blockers stay constrained to fixed street depths $z_k$ ($k = 1, \dots, 4$), moving strictly along $x \in [-W/2, W/2]$ with bounded acceleration and snappy deceleration:

   $$
   x_k(t + \Delta t) = \text{clamp}\left(x_k(t) + v_k \Delta t,\; -\frac{W}{2},\; \frac{W}{2}\right)
   $$

   The center *Patotot* moves along $x = 0$ over $z \in [z_1, z_4]$ (plus Line 1). Each blocker uses simple target-tracking toward the nearest non-protected runner approaching its line, while slightly over-shooting on scripted fake-outs so the pre-rolled winner and finalists slip cleanly past their reach radius $R_{\text{tag}}$.

3. **Runner Juke & Sprint State Machine:**
   Each runner operates on a lightweight 3-state loop over the $(x, z)$ court plane:

   * `APPROACH`: Advance toward the next uncrossed water line $z_k$ with mild lateral boid separation so 30 runners fan out across the width of the street rather than clumping.

   * `BAIT_AND_JUKE`: Pause briefly $0.8\text{ m}$ shy of $z_k$, oscillating laterally ($x_{\text{juke}} = A \sin(\omega t)$) to bait the blocker into sliding away from a crossing lane.

   * `DASH`: Once the lateral clearance satisfies $\vert x_{\text{runner}} - x_k \vert > R_{\text{safe}}$ (or when a decoy triggers a risky dive), burst across $z_k$ at $1.6\times$ sprint speed.

4. **Zero-Stuck Pacing Safeguard:**
   Track elapsed round time against the duration slider $T_{\text{round}}$. If any finalists are stuck in an extended juke standoff past $0.82 \, T_{\text{round}}$, trigger a **`PANGANODSILAB FLUSH — IYAHAY NA!`** sprint boost that forces all remaining runners to commit across the final lines so the round always wraps right on time.