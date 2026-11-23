# Game Mode Spec: Ddakji Flip-Out (Paper-Tile Slam Royale)

**App:** Chesapeake Dev Derby

**Genre:** 3D Paper-Tile Slam Royale & Air-Blast Physics (Rigid-Tile Flip Kinematics)

**Player Count:** 2–30 players

**Duration:** Scales with existing 10s–120s slider

## Overview

Inspired by **ddakji-chigi** (딱지치기)—South Korea's fiercely competitive schoolyard and subway-platform game of slamming heavy folded-paper squares onto the pavement to flip an opponent's tile—**Ddakji Flip-Out** turns your entire dev team into crisp, color-coded origami paper tiles scattered across a twilight Seoul courtyard. Surrounded by glowing slate pavers, neon-lit alley signage, and chalk court lines, every active developer hovers, winds up, and body-slams onto the stone beside their coworkers.

Each thunderous **`TTAK!`** slap fires a localized blast of displaced air underneath neighboring tiles—lifting paper corners, sending rivals cartwheeling through the air, and slamming them upside-down onto a stark crimson **`FLIPPED`** underside. Between volleys, an oversized glossy cardboard **"Executive `CHEOL-DDAKJI`"** (*Reinforced Iron Tile*) drops from above to trigger wild chain-reaction flips. The last tile still resting face-up—or the very first tile flipped over in **`RECRUITER SLAP`** mode—claims the mic and leads standup.

### Core Design Principle: Edge-Teeter Suspense & Percussive Paper Physics

What makes real-life *ddakji* electric is the razor-thin margin between a harmless rattle and a clean flip. Modeling each dev as a flat, folded-paper square pivoting around its edges creates instant visual comedy: tiles catch an air blast, rock dramatically up to an agonizing $87^\circ$ vertical balance on one crisp paper edge, hang there for a split second—and either flop safely back face-up or tip past $90^\circ$ into total defeat.

## 1. The 4-Phase Round Flow (10–15s Mode)

1. **Phase 1: Fold & Lay Out — `KKA-RA!` (0–2s)**
   All active dev tiles flutter down onto the dark slate courtyard like thick folded cardstock, snapping flat with sharp origami crease highlights while energetic *janggu* (hourglass drum) beats kick in.

2. **Phase 2: The Opening Slam Volley — `TTAK!` (2–5s)**
   Devs hop skyward in staggered waves, tilt nose-down, and slam into the stone beside nearby rivals. Crisp shock-rings of compressed air burst outward from every impact—rattling adjacent tiles, launching 4–6 unlucky devs into full end-over-end tumbles, and slapping them face-down (`FLIPPED!`).

3. **Phase 3: Heavy Cardstock Chaos & Cross-Breezes (5–9.5s)**
   Survivors hop aggressively toward tighter clusters as a giant, foil-stamped **`CHEOL-DDAKJI`** (*"Mandatory Architecture Reorg"*) crashes into center court, sending shockwaves that bounce half the pack sideways and flip two stacked tiles at once. Occasional neon alley gusts nudge teetering tiles right past the tipping point.

4. **Phase 4: The $89^\circ$ Edge-Balance Photo Finish (9.5–12s)**
   Two or three finalists duel in the middle of the pavers. Time drops to $0.4\times$ slow motion for a low pavement-level shot as a crisp final slam catches the runner-up's corner—lifting it straight onto its razor-thin paper edge, hovering vertically for half a heartbeat, and flopping face-down onto the glowing red `REVERTED` side. Confetti erupts over the sole face-up survivor with the banner: **`UNFLIPPED CHAMPION — LEADS STANDUP!`**

## 2. Ddakji Moves, Paper Hazards & Dev-Humor Catalog

Floating comic-book tags turn every crisp slap, whiffed air-ball, and dramatic tile flip into a Korean street-game and IT workplace punchline:

* **Clean Flip (`DWI-JIP-GI!`)** *(A direct edge blast sends a rival cleanly upside-down)*

  * *Popups:* `"New security feature screwed prod"`, `"Rolling back server time as a service"`

* **The Glossy `CHEOL-DDAKJI` Drop** *(An illegally thick, tape-reinforced corporate presentation-folder tile that crashes down with $3\times$ blast radius)*

  * *Popups:* `"Ekmaatra-ji derailed by common sense again"`, `"Crushed by unavailable audit logs"`

* **Whiffed Slap (`BARAM-PPA-JIM!` / Air-Ball)** *(A dev slams too far away, creating a sad tiny paper puff while leaving themselves wide open)*

  * *Popups:* `"Defeated by a graveyard of patay buttons."`, `"URL edits banned. Broke reports. Fix: add ?ReturnUrl="`

* **Paper-Crease Tear / Soggy Puddle Tile** *(Landing in a damp neon-lit courtyard puddle softens a tile's corners, making it twice as easy to flip)*

  * *Popups:* `"Piped userLogs.db to /dev/null"`, `"Ekmaatra-ji's group policy stopped SQL Server restarts"`, `"Blocked by PanganodSilab 502"`

* **Chain-Reaction Double Flip (`YANG-TTAK!`)** *(One flipped tile lands directly on another dev's corner, flipping both in a cascading domino slap)*

  * *Popups:*  `"IYAHAY NA! Cascade failure"`, `"BadalJwala 502 blast wave"`

* **Optional Mode Toggle — "Last Unflipped" vs. "First Flipped (`RECRUITER MODE`)":**

  * **Courtyard Champion Mode (Default):** The last *ddakji* remaining face-up leads standup.

  * **First-Flipped Mode:** Flip the win condition so the very first dev slapped upside-down gets handed a glowing mystery business card (`YOU'RE UP — LEAD STANDUP!`) for instant 10-second comedy.

## 3. Scaling with the Duration Slider (10s–120s)

Rather than making slams sluggish, scale the **volley count, tile toughness, and courtyard hazards** to fit the selected timer cleanly:

| Duration | Mode Variant | Pacing & Mechanics | 
| ----- | ----- | ----- | 
| **10s–15s** | *Subway Platform Quick Slap* | Tight stone square, light single-fold paper tiles, and 3 rapid slam volleys so air-blasts quickly narrow the field to a crisp edge-teeter finale. | 
| **30s** | *Schoolyard Courtyard Royale* | Wider tiled courtyard featuring damp puddle zones, two drops of the giant **`CHEOL-DDAKJI`**, and a **`RE-FOLD!`** wind mechanic where half-tilted tiles can wiggle back flat if they survive under $80^\circ$. | 
| **60s–120s** | *3-Round Seoul Courtyard Championship* | Multi-round knockout across escalating cardstock tiers (**Round 1: Newspaper Flyers**, **Round 2: `PanganodUlbo` Gusty Alley**, **Round 3: Heavy Glossy Cardstock Finals**). Flipped tiles neatly stack into a glowing **Winner's Pot** pile beside the court until one champion takes all. | 

## 4. Visual, Camera & Audio Polish

* **Dark-Mode Friendly Twilight Seoul Courtyard Aesthetic:**

  * Moody evening slate-gray stone pavers with subtle wet neon reflections (warm coral, electric cyan, and lantern gold) from surrounding Seoul alley signs and traditional curved hanok roof silhouettes—keeping dark-mode contrast razor-sharp.

  * **Authentic Origami Tile Geometry:** Each *ddakji* is built with crisp beveled edges and the iconic interlocking 4-triangle pinwheel crease pattern on top, giving specular highlights real folded-paper depth.

  * **Instant State Readability (2–30 Players):**

    * **Face-Up (Alive):** Bright, high-contrast team paper colors (classic red/blue *ddakji* accents plus per-dev hues) with crisp upright floating nameplates.

    * **Face-Down (Eliminated):** Stark matte charcoal underside stamped with a glowing crimson **`FLIPPED`** / **`404`** icon so viewers immediately spot who is out—even with 30 tiles flying across the court.

    * A compact **`FACE-UP: 6 / 20`** live survivor counter sits cleanly in the corner.

* **Dynamic Camera Choreography:**

  * **Fold-In Intro:** Low skimming sweep across the stone pavers as the colorful folded tiles flutter flat into place.

  * **Active Slams:** Elevated 3/4 courtyard overview tracking the center of active survivors, with punchy vertical micro-shake synced to heavy **`TTAK!`** impacts and crisp translucent air-ring puffs expanding along the ground.

  * **Edge-Teeter Finale:** Ultra-low pavement-level macro angle at $0.4\times$ slow motion focusing straight down the paper seam as the runner-up balances past $88^\circ$ and slaps face-down.

* **Synthesized Audio (Web Audio API):**

  * Iconic dry **cardstock slap *TTAK!***: layered from a razor-sharp bandpass crack ($1.8\text{–}3.6\text{ kHz}$), a fast sub-bass compressed-air thump ($110\text{ Hz}$), and a brief rustling paper-flutter tail.

  * Crisp papery *flup-flup-flup* whooshes whenever a tile tumbles mid-air, shifting to a tense creaking-paper rustle during slow-motion edge teeters.

  * Upbeat traditional Korean *samulnori* percussion accents (*kkwaenggwari* small gong pings and punchy *janggu* rim clicks) building tempo into a bright arcade victory fanfare on the winning flip.

## 5. Implementation Blueprint (Lightweight 3D Stack)

Designed for Three.js / WebGL using clean single-axis edge-pivot dynamics and radial air-blast impulses—no heavy 3D rigid-body physics engine required:

1. **Fairness-First Pre-Roll & Slam Choreography:**
   At round start, run a fair $1 / N$ RNG roll to select the standup leader (plus 1–2 close finalists for the edge-teeter finish). During each slam volley, bias the pre-rolled winner's hop targets away from direct edge blasts (giving them occasional dramatic $70^\circ\text{–}82^\circ$ close-call wobbles that safely settle back flat), while decoys receive stronger off-center air impulses.

2. **Air-Blast Flip Impulse Model:**
   When a slamming tile impacts the pavers at $\vec{p}_s$ with kinetic energy $E_s$, compute the horizontal separation $d_i = \Vert \vec{p}_i - \vec{p}_s \Vert$ and outward unit vector $\hat{r}_i$ for each neighboring tile of width $w$ and mass $m$. Apply an angular kick $\Delta \omega_i$ around the horizontal edge axis $\hat{u}_{\perp, i} = \hat{y} \times \hat{r}_i$ plus a small vertical hop $\Delta v_{y,i}$:

   $$
   \Delta \omega_i = \frac{\kappa \, E_s}{m w \left(1 + \left(\frac{d_i}{R_{\text{blast}}}\right)^2\right)}, \qquad \Delta v_{y,i} = \beta \, E_s \, e^{-d_i / \lambda}
   $$

   Boost $\kappa$ by $1.8\times$ for damp puddle tiles and scale $E_s$ by $3.0\times$ when the giant **`CHEOL-DDAKJI`** slams down.

3. **Edge-Pivot Tipping & $90^\circ$ Teeter Physics:**
   Track each tile's flip angle $\theta_i \in [0, \pi]$ around its contact edge ($\theta_i = 0$ is flat face-up; $\theta_i = \pi/2$ is balanced vertically on edge; $\theta_i = \pi$ is flipped face-down). Integrate angular acceleration using exact edge-pivot gravitational torque and air damping $c_{\theta}$:

   $$
   \ddot{\theta}_i = -\frac{3 g}{2 w}\cos\theta_i - c_{\theta}\dot{\theta}_i
   $$

   * While $\theta_i < \pi/2$, gravity ($\cos\theta_i > 0$) pulls the tile back toward $0$ (safe recovery with a crisp *slap* bounce).

   * Once $\theta_i > \pi/2$, gravity ($\cos\theta_i < 0$) flips sign and accelerates the tile forward to $\theta_i = \pi$, locking it into the **`FLIPPED`** state and triggering a celebratory pop-up toast.

4. **Guaranteed On-Time Finale Safeguard:**
   Track elapsed round time against the duration slider $T_{\text{round}}$. If more than one tile remains upright past $0.82 \, T_{\text{round}}$, trigger a synchronized **`FINAL TTAK!`** leap by the pre-rolled winner straight beside the remaining finalists—calibrating $\Delta \omega_i$ so the runner-up crosses $\theta_i = \pi/2$ slowly for a dramatic $0.4\times$ slow-motion teeter right at the buzzer.