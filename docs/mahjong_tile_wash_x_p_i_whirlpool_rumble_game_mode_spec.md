# Game Mode Spec: Mahjong Tile Wash (*Xǐpái* Whirlpool Rumble)

**App:** Chesapeake Dev Derby

**Genre:** 3D Swirling Vortex Survival & Mechanical Tile Chaos (Whirlpool Field & Instanced Collision Physics)

**Player Count:** 2–30 players

**Duration:** Scales with existing 10s–120s slider

## Overview

Inspired by the unmistakable, thunderous roar of ***xǐpái*** (洗牌)—the high-speed ritual of swirling 144 heavy ivory Mahjong tiles across green baize before a match—**Mahjong Tile Wash** drops your entire dev team into the recessed velvet arena of a colossal, neon-rimmed automatic Mahjong parlor table. Lit by warm crimson tea-house lanterns suspended over deep emerald felt, all active developers sprint and weave among waist-high Bamboo (*Suǒzi*), Character (*Wànzi*), Dot (*Tǒngzi*), and glowing Dragon tiles churning in violent circular currents.

As the round escalates, booming table calls shatter the rhythm: **`EAST WIND REVERSAL!`** whips the entire swirling ocean of tiles backward, **`PONG!`** slams three giant matching slabs together like jaws, and **`KONG!`** drops a four-tile barrier straight across the felt. Periodically, the brass mechanical **Auto-Shuffle Chute** at center table irises open—creating swirling suction that pulls loose tiles and careless devs straight down into the clanking undercarriage (`SHUFFLED INTO THE BACKLOG!`). The last developer still standing on the baize when **`HÚ!` (WINNING HAND)** flashes—or the very first dev swallowed by the mechanical pit in **`BACKLOG FEEDER`** mode—claims the mic and leads standup.

### Core Design Principle: Swirling Current Chaos & Tactile Clatter

What makes **Mahjong Tile Wash** feel completely distinct from grid dashes or static falling hazards is **continuous orbital motion**. Instead of dodging predictable lanes, players read the swirling currents of 144 gleaming tiles like a living river—surfing around the calm outer rim, cutting across sudden **`PONG!`** pinch points, and desperately sprinting against the pull of the central mechanical drop chute before the brass hatch snaps shut.

## 1. The 4-Phase Round Flow (10–15s Mode)

1. **Phase 1: Drop Onto the Baize — `XǏPÁI!` (0–2s)**
   All active devs land across the glowing emerald tabletop as 144 heavy ivory-and-jade tiles rise smoothly from the four perimeter risers and begin clicking into a brisk clockwise swirl around the center brass plate.

2. **Phase 2: High-Speed Whirlpool & First `PONG!` (2–5.5s)**
   The vortex ramps up to full clattering roar. Early stragglers caught near the inner lane get clipped by spinning Bamboo tiles and bounced sideways into the felt walls. A booming **`PONG!`** flashes overhead—three glowing **Red Dragon (*Hóngzhōng*)** tiles magnetize straight toward center court, clamping together and blasting 4–6 caught devs over the mahogany rail or straight into the opening center pit.

3. **Phase 3: `EAST WIND REVERSAL!` & Auto-Chute Suction (5.5–9s)**
   A glowing teal wind-compass spins violently above the table (**`DŌNGFĒNG REVERSAL!`**), flipping the entire vortex counter-clockwise in half a second. Tiles crash against their own momentum in sparkling ivory collisions while the brass center hatch drops open (`AUTO-SHUFFLE ACTIVE!`), generating a fierce inward pull that drags half the remaining roster down into the dark clanking gears.

4. **Phase 4: The Four-Tile `KONG!` Squeeze & `HÚ!` Finale (9–12s)**
   Only two or three finalists remain weaving between towering sliding walls as the brass center chute opens wide for the final sweep. Time dips to $0.4\times$ slow motion as a massive four-tile **`KONG!`** wall glides cleanly across the felt—scooping the runner-up into the swirling vortex drop while the winning dev vaults neatly onto the lone stationary **White Dragon** safe tile. Golden parlor fireworks burst overhead with the banner: **`ZÌMŌ (SELF-DRAWN WIN) — LEADS STANDUP!`**

## 2. Mahjong Calls, Table Hazards & Dev-Humor Catalog

Floating jade-and-gold parlor banners turn every bone-rattling tile collision, wind reversal, and mechanical drop-chute elimination into a Mahjong and workplace satire punchline:

* **`PONG!` Three-Tile Clamp** *(Three identical tiles flash neon gold and snap together across a dev's path)*

  * *Popups:* `"Blocked by fāméi de software license"`, `"Buried in bù kěyòng audit logs"`

* **`KONG!` Four-Tile Sweeper Wall** *(Four stacked tiles lock into a sliding bulldozer bar that sweeps across a quadrant of the felt)*

  * *Popups:* `"Hòuguǒ zìfù! Tables secretly hotfixed from scratch"`, `"Qiángtuī security feature gǎo bēng le prod"`

* **Auto-Shuffle Center Pit (`SHUFFLED INTO BACKLOG`)** *(The recessed circular brass door drops open and sucks devs down into the clanking sorting gears)*

  * *Popups:* `"Pá through 800 column table"`, `"Rolling back fúwùqì shíjiān"`

* **`EAST WIND REVERSAL!` Cross-Current Whiplash** *(Sudden vortex inversion slams swirling tiles straight into each other)*

  * *Popups:* `"Wéiyī Lǎobǎn Dàrén derailed by common sense again"`, `"Wéiyī Lǎobǎn Dàrén blames you for not being clear"`

* **Cursed Flower Tile / Stray Dice Ricochet** *(Two giant ivory dice erupt from the center spinner at $3\times$ speed, ricocheting off the mahogany bumper rails like pinballs)*

  * *Popups:* `"Blocked by Yúnyàn 502"`, `"Sàibó Huófó 502 snake-eyes!"`

* **Optional Mode Toggle — "Last Standing (`HÚ!`)" vs. "`FÀNGPÀO` (First Discard)":**

  * **Self-Drawn Champion Mode (Default):** Survive the swirling tile wash and center drop chute to be the last dev standing when **`HÚ!`** rings out.

  * **First Discard Mode (*Fàngpào*):** Flip the rule so the very first dev sucked down the mechanical center chute gets stamped **`DEALT INTO THE WINNING HAND — LEAD STANDUP!`** for an instant 10-second comedy round.

## 3. Scaling with the Duration Slider (10s–120s)

Rather than letting tiles drift sluggishly across the felt, scale the **number of wind reversals, chute cycles, and rising tile-wall mazes** to match the selected timer cleanly:

| Duration | Mode Variant | Pacing & Mechanics | 
| ----- | ----- | ----- | 
| **10s–15s** | *Quick Wash Blitz* | Fast single-wind vortex, 1 sharp `PONG!` clamp, and a high-suction center-chute sweep that narrows the pack straight into a slow-motion `HÚ!` finish. | 
| **30s** | *Full 4-Wind Parlor Rumble* | Cycles rapidly through all four winds (**East** $\to$ **South** $\to$ **West** $\to$ **North**), reversing swirl direction every $7\text{ s}$ with escalating `PONG!`/`KONG!` walls and two bouncing giant-dice volleys. | 
| **60s–120s** | *Grand Automatic Table Championship* | Multi-hand knockout across 3 escalating rounds (**Round 1: Bamboo Rapids**, **Round 2: `PanganodUlbo` Blackout Wash** where only engraved tile faces glow in the dark, **Round 3: Sudden-Death Dragon Finals**). Swallowed devs pop back up on the polished mahogany spectator rail around the perimeter cheering until one survivor claims the final hand. | 

## 4. Visual, Camera & Audio Polish

* **Dark-Mode Friendly Twilight Tea-House Parlor Aesthetic:**

  * Deep, rich **emerald-jade baize felt** framed by glossy lacquered mahogany bumpers and subtle inlaid brass trim—bathed in warm crimson-and-gold reflections from swaying overhead paper lanterns against a dark charcoal parlor backdrop.

  * **The 144 Mahjong Tiles:** Crisp chamfered 3D slabs with gleaming ivory faces, translucent jade-emerald backs, and bright high-contrast engraved symbols (crimson *Wàn* characters, emerald *Bamboo* stalks, cobalt *Dots*, and glowing golden **Dragons**). Tiles visibly flip face-up and face-down during the wash before snapping upright during `PONG!` and `KONG!` calls.

  * **The Mechanical Center Chute:** Recessed circular brushed-brass centerpiece embossed with a compass rose that glows ominous amber $1.2\text{ s}$ before dropping down to reveal rotating neon-lit sorting gears underneath.

* **Readability for 2–30 Players:**

  * A crisp high-angle 3/4 overhead tabletop camera frames the entire square baize arena simultaneously so all 2–30 avatars, swirling currents, and glowing **`PONG!`** telegraph paths stay unmistakably clear.

  * Devs wear bright, high-contrast team silks/jerseys with crisp upright billboarded nameplates, subtle trailing footstep dust on the felt, and a compact **`ON TABLE: 6 / 24 • WIND: EAST`** parlor scoreboard pinned to the corner.

* **Dynamic Camera Choreography:**

  * **Opening Wash:** Smooth low sweep skimming right over the mahogany bumper rail as the 144 tiles surge outward from the risers.

  * **Active Whirlpool:** Elevated overhead 3/4 tracking slightly angled across the baize, delivering a snappy rotational micro-kick whenever **`EAST WIND REVERSAL!`** fires and a tight shake on heavy **`KONG!`** slams.

  * **Chute Finale:** Dramatic swoop down over the open glowing brass pit at $0.4\times$ slow motion as the final sweeper wall slides past the last two contenders.

* **Synthesized Audio (Web Audio API):**

  * Iconic **Mahjong *xǐpái* tile-wash roar**: continuous granular stream of crisp, velocity-jittered resonant ivory/acrylic *clack-click-clatter* bursts ($2.2\text{–}5.5\text{ kHz}$ short bandpass pops) that swell in density whenever tiles collide in mid-vortex.

  * Heavy mechanical hydraulic *whir-CLUNK* as the automatic table's center chute lowers and opens, layered with subtle bass suction hum.

  * Resonant traditional *guzheng* / brass gong stings on **`PONG!`**, **`KONG!`**, and **`EAST WIND REVERSAL!`**, culminating in a jubilant cymbal crash, cascading victory tile clatter, and festive pentatonic fanfare when **`HÚ!`** flashes.

## 5. Implementation Blueprint (Lightweight 3D Stack)

Designed for Three.js / WebGL using a single `InstancedMesh` for all 144 tiles and an analytical Rankine-vortex velocity field—no heavy 3D rigid-body physics engine required:

1. **Fairness-First Pre-Roll & Current Choreography:**
   At round start, perform a fair $1 / N$ RNG roll to select the standup leader (plus 1–2 close finalists for the final `KONG!` squeeze). Guide the pre-rolled winner smoothly along the lower-risk outer felt band away from open chute suction and `PONG!` clamp corridors, while decoys surf recklessly near the inner vortex eye or get clipped by bouncing ivory dice.

2. **Analytical Swirling Vortex & Center-Chute Suction Field:**
   Represent the circular *xǐpái* current at polar radius $r = \sqrt{x^2 + z^2}$ using a smooth Rankine vortex driven by signed wind direction $d_{\text{wind}}(t) \in \{+1, -1\}$ and core radius $R_c$:

   $$
   v_{\theta}(r, t) = d_{\text{wind}}(t) \begin{cases} \omega_0 \, r & \text{if } r \le R_c \\ \omega_0 \, \dfrac{R_c^2}{r} & \text{if } r > R_c \end{cases}
   $$

   Whenever the automatic center hatch opens ($S(t) = 1$), superimpose a radial inward suction acceleration pulling nearby tiles and unbraced devs toward the pit radius $R_{\text{pit}}$:

   $$
   a_r(r, t) = -S(t)\,\frac{\Gamma_{\text{chute}}}{r + r_0}
   $$

   Any dev crossing $r < R_{\text{pit}}$ while $S(t) = 1$ drops cleanly under gravity ($\ddot{y} = -g$) down into the glowing mechanical gears (`ELIMINATED`).

3. **Zero-Overhead 144-Tile Instanced Simulation:**
   Render all 144 Mahjong tiles in a single `THREE.InstancedMesh` (using a crisp UV texture atlas for all suits, winds, and dragons). Update each tile's $(x_k, z_k)$ via the vortex field plus fast spatial-hash tile separation and mahogany wall reflection, reserving heavyweight collision checks strictly for active players ($N \le 30$) against nearby tiles and scripted **`PONG!`** / **`KONG!`** lock-on bars.

4. **Scheduled Wind Reversals & Hard-Cap `HÚ!` Safeguard:**
   Tie all wind flips, chute openings, and sweeper-wall spawns directly to normalized round progress $u = t / T_{\text{round}}$ against the duration slider $T_{\text{round}}$. Trigger the final giant **`KONG!`** sweeper bar at $u = 0.85$ sweeping straight across the remaining finalists' lane while locking one clear safe tile for the pre-rolled winner—guaranteeing the $0.4\times$ slow-motion chute drop and **`HÚ!`** fanfare land right on schedule.