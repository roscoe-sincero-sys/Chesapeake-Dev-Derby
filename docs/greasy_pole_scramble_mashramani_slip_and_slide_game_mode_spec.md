# Game Mode Spec: Mashramani Slip-and-Slide

**App:** Chesapeake Dev Derby

**Genre:** 3D Vertical Slapstick Climbing Race (Cylindrical Grip Physics & Domino-Slide Chaos)

**Player Count:** 2–30 players

**Duration:** Scales with existing 10s–120s slider

## Overview

Inspired by the iconic Guyanese **Mashramani ("Mash")** and village-fair greasy pole contest—where brave climbers scramble up a slick, lard-coated timber pole for the prize perched at the summit—**Greasy Pole Scramble** pits your entire dev team against a towering, neon-slicked cedar pole rising from a glowing twilight carnival square. Perched at the very top is a fluttering gold-and-emerald **`LEAD STANDUP`** Mashramani banner (alongside a dangling golden coffee thermos).

On the blast of a steelpan airhorn (**`MASH UP DE POLE!`**), all active developers dogpile onto the base and claw their way skyward in frantic, arm-pumping bursts. Along the ascent, slick bands of **"Management Grease,"** sudden bursts of **"Unclear Requirements,"** and falling teammates turn every hard-won foot of elevation into pure slapstick terror. One slipped climber slides straight down the column like a bowling ball, knocking three coworkers off their grips in a cascading wipeout into the soft mud pit below. The first dev to slap the summit flag—or the very first climber knocked flat into the mud in **`MUD-DROP`** mode—leads standup.

### Core Design Principle: Vertical Cylindrical Slapstick & Chain-Reaction Wipeouts

Whereas horizontal races spread players across a flat plane, a **360-degree vertical pole** packs all 2–30 devs into a single dramatic, rising column where everyone is constantly climbing over, bumping elbows with, and sliding directly into each other. Treating the pole as a clean cylindrical surface keeps climbing math razor-fast while creating unmistakable upward momentum, heart-stopping $2\text{ m}$ slips, and laugh-out-loud human-avalanche pileups.

## 1. The 4-Phase Round Flow (10–15s Mode)

1. **Phase 1: Chalk Up at the Mud Pit — `LINE UP!` (0–2s)**
   All active devs circle the base of the glistening, freshly greased 30-foot pole, slapping chalk dust onto their hands while colorful Mashramani carnival lights pulse overhead and steelpan drums roll into a fast soca buildup.

2. **Phase 2: The Dogpile Scramble — `MASH UP!` (2–5.5s)**
   The airhorn blasts and the entire team leaps onto the pole simultaneously, spiraling around its circumference like frantic squirrels. Early sprinters shoot halfway up the first tier before hitting a gleaming magenta band of **"Scope-Creep Lard"** and shooting straight back down into the trailing crowd.

3. **Phase 3: The Great Grease Avalanche (5.5–9.5s)**
   Devs battle through the upper slick zones—bouncing off each other's shoulders, pausing to wipe grease off their visors, and dodging sudden **`BadalJwala`** cross-gusts that rattle the pole. Near the three-quarter mark, a high-flying leader loses grip and triggers a glorious 5-dev domino slide all the way back to the mud pit (`SPLORCH!`).

4. **Phase 4: Summit Lunge & Flag Grab (9.5–12s)**
   Two or three chalk-dusted finalists claw inch-by-inch through the final glistening grease collar right beneath the banner. Time drops to $0.4\times$ slow motion as the runner-up's boots kick out horizontally in midair, while the winning dev makes a desperate one-handed lunge, yanks down the glowing **`LEAD STANDUP`** flag, and triggers a shower of carnival feathers, confetti, and steelpan victory fanfare.

## 2. Grease Zones, Climbing Mishaps & Dev-Humor Catalog

Glowing painted rings and dripping slick patches divide the pole into distinct workplace-satire hazards, each firing floating comic-book toasts whenever a dev loses grip:

* **Zone 1 (Base): Legacy Onboarding Mud** *(Thick, sticky mud splashed up from the pit; slows the initial launch)*

  * *Popups:* `"Ekmaatra-ji still setting up an internal SSL cert for public website"`

* **Zone 2 (Mid-Pole): Management Grease Collar** *(Hyper-slick iridescent band that cuts grip in half and sends careless rushers sliding backward)*

  * *Popups:* `"Ekmaatra-ji's secret hotfixes recreates vital tables"`, `"Ekmaatra-ji bans URL edits to break reports. Fix: add ?ReturnUrl= to URL"`

* **Zone 3 (Upper-Mid): `PanganodSilab` Static Rings** *(Crackling amber/orange rings that briefly zap a climber's hands loose)*

  * *Popups:* `"Ekmaatra-ji says you were not being clear"`, `"Zabardasti security feature paksit'd prod"`

* **Domino Knockdown (Teammate Collision)** *(A falling dev slams straight into climbers below them, dragging everyone down in a comical cartoon tumble)*

  * *Popups:* `"IYAHAY NA! Ekmaatra-ji is on a witch hunt!"`

* **Splintered Handhold** *(A climber grabs a loose wooden peg labeled `TEMP FIX` that snaps right off in their fist)*

  * *Popups:* `"Ekmaatra-ji rolled out an 800-column table aur gir gaya"`, `"Ekmaatra-ji rolling back server clock to June 1996"`

* **Optional Mode Toggle — "King of the Pole" vs. "First in the Mud":**

  * **Summit Champion Mode (Default):** First dev to grab the Mashramani banner at the top leads standup.

  * **Mud-Drop Mode:** Flip the rule so the very first dev who slides all the way back down and face-plants into the mud pit gets stamped **`FIRST IN DE MUD — LEAD STANDUP!`** for a rapid-fire 10-second comedy round.

## 3. Scaling with the Duration Slider (10s–120s)

Rather than making climbers inch upward in boring slow motion, scale the **pole height, recovery climbs, and grease-wave intensity** to match the selected timer cleanly:

| Duration | Mode Variant | Pacing & Mechanics | 
| ----- | ----- | ----- | 
| **10s–15s** | *Village Fair Blitz* | Compact $12\text{ m}$ pole with 2 slick grease bands. High slip-and-cascade chaos delivers one big mid-round avalanche before 2–3 finalists lunge for the flag right on cue. | 
| **30s** | *Full Mashramani Climb* | Towering $22\text{ m}$ carnival pole with 4 distinct hazard tiers. Devs knocked back into the mud bounce straight back up (`CHALKING UP... 1.5s`) for genuine lead-swapping comeback climbs. | 
| **60s–120s** | *Republic Day Knockout Towers* | Multi-stage **High-Water Elimination**: every $18\text{ s}$, a glowing **`DEADLINE RISING`** mud-line surges partway up the pole, eliminating anyone still clinging below the cut line while a fresh bucket of **`PanganodUlbo`** grease pours down from the top until the final 4 climbers duel for the summit banner. | 

## 4. Visual, Camera & Audio Polish

* **Dark-Mode Friendly Twilight Mashramani Festival Aesthetic:**

  * Deep twilight indigo sky framed by silhouetted Georgetown palms, glowing Mashramani carnival float arches, strings of warm festival bulbs, and bright emerald-gold-red bunting—keeping neon UI readability sharp without washing out dark mode.

  * **The Pole:** Rich weathered hardwood core wrapped in shiny, specular wet-grease sheen maps that visibly glisten as lights pan past, ringed with glowing hazard bands and topped by a fluttering animated **`LEAD STANDUP`** pennant.

  * **The Mud Pit:** Circular wooden ring around the base filled with dark glossy mud that erupts into stylized cartoon splash rings (`SPLORCH!`) whenever a sliding dev hits bottom.

* **Readability for 2–30 Players:**

  * Distributing climbers evenly around the pole's $360^\circ$ circumference prevents overlapping blobs, while a gentle orbital camera sweep reveals everyone clinging to both the front and sides.

  * Every dev wears a high-contrast carnival-striped jersey with a crisp outward-offset billboard nameplate and a live vertical **Elevation Ladder** bar pinned to the side of the screen (e.g., `1st: 18.4m • 2nd: 17.9m`).

* **Dynamic Camera Choreography:**

  * **Launch:** Low upward hero shot from the edge of the mud pit looking straight up the gleaming pole toward the distant flag.

  * **Mid-Climb:** Smooth ascending helical crane shot tracking the leading cluster of climbers while subtly pulling back whenever a massive downward chain-reaction wipeout occurs.

  * **Summit Finale:** Dramatic tight angle just above the golden banner looking down at the final two climbers lunging upward at $0.4\times$ slow motion.

* **Synthesized Audio (Web Audio API):**

  * Playful, squeaky **rubber-on-grease *SKWEE-EE-EEK*** pitch sweeps whenever a dev loses traction and shoots downward.

  * Wet, percussive **mud-pit *SPLORCH*** + cartoon bass thump on bottom landings, layered with comical shoulder-bump bonks during domino collisions.

  * Upbeat, lightweight **steelpan & soca cowbell groove** that climbs in tempo as the lead climber crosses $75\%$ height, exploding into an airhorn blast, carnival whistle, and bright steelpan major-chord flourish on the flag grab.

## 5. Implementation Blueprint (Lightweight 3D Stack)

Designed for Three.js / WebGL using clean cylindrical surface kinematics—no heavy 3D rigid-body or ragdoll engine required:

1. **Fairness-First Pre-Roll & Elevation Choreography:**
   At round start, perform a fair $1 / N$ RNG roll to select the standup leader (plus 1–2 close contenders for the summit photo finish). Assign randomized burst-climb rhythms and scripted grease-slip windows across the pack so the lead changes hands organically 2–3 times before the summit.

2. **Cylindrical Pole Kinematics:**
   Map every climber's 3D world position cleanly from cylindrical coordinates $(\theta_i, y_i)$ on a pole of radius $R_{\text{pole}}$ plus an avatar offset $r_{\text{off}}$:

   $$
   x_i = (R_{\text{pole}} + r_{\text{off}})\cos\theta_i, \qquad z_i = (R_{\text{pole}} + r_{\text{off}})\sin\theta_i
   $$

   Drive vertical motion with a simple 2-state grip model:

   * **`CLIMBING`:** Advance upward with rhythmic hand-over-hand speed modulated by local grease slickness $\gamma(y_i) \in [0, 0.85]$:

     $$
     \dot{y}_i = v_{\text{climb}, i}(t)\bigl(1 - \gamma(y_i)\bigr)
     $$

   * **`SLIPPING`:** Once a hazard or collision breaks grip, accelerate downward under gravity with viscous grease drag $c_{\text{grease}}$ until the climber regains traction or hits the mud pit ($y_i = 0$):

     $$
     \dot{v}_{y,i} = -g + c_{\text{grease}}\vert v_{y,i}\vert
     $$

3. **Angular Separation & Domino-Avalanche Sweeps:**
   Apply lightweight 1D angular repulsion along $\theta_i$ so up to 30 climbers distribute smoothly around the pole without clipping into each other. Whenever a `SLIPPING` dev $i$ passes a `CLIMBING` dev $j$ within vertical window $\vert y_i - y_j \vert < h_{\text{hit}}$ and angular arc $\Delta\theta_{ij} < \theta_{\text{hit}}$, flip dev $j$ into `SLIPPING` with an immediate downward impulse—creating instant chain-reaction pileups with $O(N^2)$ scalar math that runs in microseconds for $N \le 30$.

4. **Guaranteed On-Time Summit Safeguard:**
   Track elapsed round time against the duration slider $T_{\text{round}}$. Starting at $0.78 \, T_{\text{round}}$, boost the pre-rolled winner's grip multiplier and dial back grease slickness along their angular lane (while triggering one final dramatic slip for the runner-up at $0.92 \, T_{\text{round}}$) so the flag grab always lands right on schedule.