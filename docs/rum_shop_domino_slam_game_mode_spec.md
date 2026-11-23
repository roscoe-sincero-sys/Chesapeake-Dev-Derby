# Game Mode Spec: Rum-Shop Domino Slam (Table-Shaking Shockwave Survival)

**App:** Chesapeake Dev Derby

**Genre:** 3D Tabletop Shockwave Survival & Knockback Chaos (2.5D Bounce Physics)

**Player Count:** 2–30 players

**Duration:** Scales with existing 10s–120s slider

## Overview

Inspired by Guyana's fiercely loud, table-rattling rum-shop and bottom-house domino culture—where players slam tiles down hard enough to wake the whole street—**Rum-Shop Domino Slam** shrinks your entire dev team onto a massive, scarred hardwood tabletop lit by warm veranda bulbs. Surrounded by oversized plastic cups, shiny bottle caps, and a chalk score tally (`PROD` vs. `BUGS`), all active developers sprint and scramble across the wood while colossal double-six dominoes crash down from above with thunderous **`POSE!`** and **`SLAM!`** shockwaves.

Every tile impact ripples across the board, catapulting props into the air, turning landed dominoes into sudden tabletop walls, and launching careless devs straight off the beveled edges into the dark below. The last developer still clinging to the tabletop (or the first one blasted off the table in **`SIX-LOVE`** mode) claims the mic and leads standup.

### Core Design Principle: Percussive Shockwave Choreography

Unlike racing or target-shooting modes, **Rum-Shop Domino Slam** is built around **rhythm, anticipation, and vertical knockback**. Each incoming domino casts a glowing pip-coded landing shadow $0.8\text{ s}$ before impact, triggering a hilarious panic scatter before the table booms, props rattle skyward, and players bounce like popcorn toward the table edge.

## 1. The 4-Phase Round Flow (10–15s Mode)

1. **Phase 1: Wash the Bones — `SHUFFLE UP!` (0–2s)**
   All active dev avatars drop onto the center of the weathered wooden tabletop while a brief, deafening cascade of ceramic domino shuffling echoes overhead. Giant plastic cups vibrate gently around the perimeter as devs fan out into open wood.

2. **Phase 2: The Double-Six `POSE!` (2–5s)**
   A colossal **Double-Six ($6\text{–}6$)** domino drops straight onto center table with a bass-heavy **`POSE!`** shockwave. A glowing amber ring expands outward across the wood grain, sending early stragglers tumbling into sliding bottle caps and launching the first wave of devs straight over the edge.

3. **Phase 3: Chain-Reaction Slams & Table Knocks (5–9.5s)**
   Dominoes slam down in rapid-fire succession along expanding chain paths—each landed tile remaining on the board as a solid marble-like wall that shrinks the safe running space. Between heavy slams, an invisible player passes with a rapid **`KNOCK-KNOCK!`** double-tap on the wood, popping the entire crowd two feet into the air and tipping a giant cup across the mid-table.

4. **Phase 4: The `SIX-LOVE` Finishing Slam (9.5–12s)**
   Only 2–3 finalists remain clinging to a narrow corner of the table. A glowing gold finishing tile descends at $0.4\times$ slow motion with a deafening **`SIX-LOVE!`** slam. The shockwave tips the runner-up into a dramatic cartoon windmill off the beveled edge, while the winning dev catches their balance right on the rim—triggering confetti, chalk-dust bursts, and the **`LAST ON THE TABLE — LEADS STANDUP!`** banner.

## 2. Domino Moves, Tabletop Hazards & Dev-Humor Catalog

Floating comic-book banners turn every earth-shaking tile drop and flying prop into an IT and domino-table inside joke:

* **The Double-Six `POSE!` Slam** *(Massive central shockwave that clears the middle of the board)*

  * *Popups:* `"POSE! Prod is down — PANAGAN!"`, `"Zabardasti feature paksit'd prod"`, `"Mandatory untested script deploy"`

* **Double-Blank (`0–0`) Deadlock** *(Drops with an icy cyan shock-ring that briefly slows nearby devs right before the next slam)*

  * *Popups:* `"Blocked by 800 column table!"`, `"Blocked by pan-os software license"`, `"Blocked by PanganodSilab 500"`

* **The Pass `KNOCK-KNOCK!` Tremor** *(Rapid vertical table bounce with zero warning shadow—sends airborne devs sliding sideways)*

  * *Popups:* `"Passing the ticket to another team"`,  `"URL edits banned. Fix: add ?ReturnUrl="`

* **Runaway Rum-Shop Cup & Bottle-Cap Slide** *(Shockwaves tip giant plastic cups and spin metal caps across the board like curling stones)*

  * *Popups:* `"Tumba'd the user table!"`, `"Knocked off by BadalJwala 500"`, `"Got blamed for not being clear"`

* **Domino Wall Pinch** *(A new tile slams right beside an existing chain, launching anyone trapped in the gap)*

  * *Popups:* `"Nag-inusarang Agalon derailed by common sense again"`, `"Failed to read Ekmaatra-ji's mind"`

* **Optional Mode Toggle — "Last Standing" vs. "First `SIX-LOVE`'d":**

  * **Champion Mode (Default):** The last dev still standing on the tabletop leads standup.

  * **Six-Love Mode:** Flip the rule so the very first dev blasted off the wooden edge gets slapped with a giant glowing **`SIX-LOVE (6-0)`** stamp and leads standup—guaranteed laughs in under 10 seconds.

## 3. Scaling with the Duration Slider (10s–120s)

Instead of slowing down the slams, scale the **number of hands, tabletop clutter, and shrinking arena walls** to match the selected timer cleanly:

| Duration | Mode Variant | Pacing & Mechanics | 
| ----- | ----- | ----- | 
| **10s–15s** | *Quick Hand Blitz* | Fast 5-slam barrage on a compact tabletop. High shockwave knockback clears the crowd rapidly so 2–3 finalists battle on the edge right at the buzzer. | 
| **30s** | *Bottom-House Clash* | Wider 12-tile domino chain that gradually fences off the table into tight wooden pockets, punctuated by two **`KNOCK-KNOCK!`** table tremors and rolling plastic cup sweeps. | 
| **60s–120s** | *First-to-Six Championship* | Multi-hand tournament (**Hand 1: Warm-Up Shuffle**, **Hand 2: PanganodUlbo Table Quake**, **Hand 3: Sudden-Death `SIX-LOVE` Finals**). Between hands, a giant arm sweeps the board clear of fallen tiles (`WASH DE BONES!`) while eliminated devs cheer from the rim of a giant coffee mug beside the table. | 

## 4. Visual, Camera & Audio Polish

* **Dark-Mode Friendly Twilight Rum-Shop Aesthetic:**

  * Deep mahogany and weathered pine tabletop with visible wood grain, subtle glass ring stains, and glowing chalk tally marks along the edge—set against a moody twilight veranda backdrop strung with warm amber Edison bulbs.

  * **The Dominoes:** Heavy, glossy ivory-white or midnight-onyx 3D slabs with recessed metallic brass spinners in the center and brightly glowing neon pips (color-coded by hazard type: gold for `POSE!`, cyan for `0–0` Deadlock, crimson for `SIX-LOVE` Finishers).

  * **Tabletop Details:** Oversized translucent red/amber plastic cups that bounce and wobble realistically on every slam, scattered bottle caps, and tiny puffs of white chalk dust rising from the wood grain on impact.

* **Readability for 2–30 Players:**

  * High-contrast overhead 3/4 view across the rectangular table guarantees every avatar and glowing red landing shadow stays crystal clear—even with 30 active devs.

  * Bright jersey colors, crisp billboarded nameplates, and a compact **`ON TABLE: 7 / 18`** live survivor counter pinned to the corner.

* **Dynamic Camera Choreography:**

  * **Shuffle Intro:** Low sweep skimming right across the scarred wood grain as the team drops in.

  * **Active Slams:** Elevated 3/4 tabletop view with punchy **micro-camera shake** (damped vertical kick synced to every tile slam) and brief $40\text{ ms}$ hit-stop freezes on giant Double-Six drops.

  * **Edge-of-Table Finale:** Smooth zoom-in on the last remaining corner as the final `SIX-LOVE` tile crashes down at $0.4\times$ slow motion.

* **Synthesized Audio (Web Audio API):**

  * Unmistakable **domino *CLACK-THOOM***: layered from a sharp high-frequency acrylic/ivory transient slap ($2.5\text{–}4\text{ kHz}$), a resonant hollow hardwood table boom ($90\text{–}140\text{ Hz}$), and a brief rattling chorus of bouncing plastic cups and tiles.

  * Crisp double wood-tap **`KNOCK-KNOCK!`** cues just before vertical tremor bounces.

  * Cartoon whistling drop when a dev sails off the beveled table edge, resolving into an upbeat steelpan/chutney-inspired arcade fanfare when the winner survives the final slam.

## 5. Implementation Blueprint (Lightweight 3D Stack)

Designed for Three.js / WebGL using clean 2.5D tabletop kinematics and analytical shockwave impulses—no heavy 3D physics engine required:

1. **Fairness-First Pre-Roll & Safe-Tile Guidance:**
   At round start, perform a fair $1 / N$ RNG roll to choose the standup leader (plus 1–2 close finalists). As each domino's landing shadow spawns at $(x_s, z_s)$, steer the pre-rolled winner smoothly toward the safest open pocket away from the edge, while decoys react slightly late or dash straight into a sliding bottle cap.

2. **Radial Shockwave Impulse Model:**
   When a domino slams at $(x_s, z_s)$ at impact time $t_s$, compute the horizontal distance $d_i = \Vert \vec{p}_i - \vec{p}_s \Vert$ and outward unit vector $\hat{r}_i$ for every active dev on the table, applying a combined outward push and vertical pop:

   $$
   \Delta \vec{v}_i = \hat{r}_i \, \frac{J_0}{1 + \left(\frac{d_i}{R_0}\right)^2} + \hat{y} \, J_y \, e^{-d_i / \lambda}
   $$

   Scale $J_0$ and $J_y$ up for heavy **`POSE!`** and **`SIX-LOVE`** tiles, and invert the ratio (high $J_y$, low $J_0$) for **`KNOCK-KNOCK!`** vertical table tremors.

3. **2.5D Tabletop Friction, Bounce & Edge Drop:**
   Integrate each dev's position on the tabletop plane with wooden surface drag $\mu$ while grounded ($y = 0$) and ballistic gravity $g$ while airborne ($y > 0$), plus elastic circle-vs-AABB bounce against already-landed domino slabs. The instant a dev crosses the table boundary ($\vert x_i \vert > W/2$ or $\vert z_i \vert > D/2$), disable floor support so they arc cleanly off the beveled edge into the dark abyss (`ELIMINATED`).

4. **Deterministic Chain Placement & Hard-Cap Finale:**
   Pre-generate a clean, non-overlapping domino chain layout matching real domino end-to-end rules (or parallel double-spinner branches) scaled to the duration slider $T_{\text{round}}$. Schedule the final **`SIX-LOVE`** slam at $0.88 \, T_{\text{round}}$ right beside the last remaining decoys so the match always reaches a dramatic table-edge climax right on time.