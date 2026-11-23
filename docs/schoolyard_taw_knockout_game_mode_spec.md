# Game Mode Spec: Schoolyard "Taw" Knockout

**App:** Chesapeake Dev Derby

**Genre:** 3D Arcade Billiard-Style Knockout Chaos (2.5D Elastic Sphere Physics)

**Player Count:** 2–30 players

**Duration:** Scales with existing 10s–120s slider

## Overview

Adapted from Guyanese schoolyard and bottom-house marble pitching (*goli* / *ring-out*), **Ring-Out Marbles** transforms your dev team into a gleaming collection of glass shooter marbles—classic swirling *cat's-eyes*, glowing frosted *milkies*, and prized agate *taws*—packed inside a glowing chalk circle drawn in twilight yard dirt. Surrounded by scattered bottle caps, concrete yard edges, and warm evening veranda lights, all active devs line up inside the ring with glowing aim reticles sweeping across their rivals.

On **`KNUCKLES DOWN — PITCH!`**, every marble fires simultaneously in a deafening, crystalline pool-break crossfire. Glass slams into glass in sparkling chain reactions, ricocheting off stray dirt pebbles and dodging a colossal, unhinged chrome **`STEELIE BOLER`** (*The Architect's Taw*) that bulldozes straight through center ring. Any marble knocked across the glowing chalk boundary is **`DEAD`** (eliminated into the grass). The last gleaming *taw* remaining inside the ring—or the first one blasted out in **`KEEPSIES!`** mode—claims the mic and leads standup.

### Core Design Principle: Explosive Glass-on-Glass Chain Reactions

Unlike directional races or platform survival, **Ring-Out Marbles** delivers pure, kinetic billiard satisfaction. Watching 20 brightly lit glass spheres slam together at once—sparking, spinning, kissing off the rim, and launching three coworkers out of the circle in a single domino carom—gives every round instant readability, razor-sharp audio feedback, and nail-biting chalk-line teeters right up to the final second.

## 1. The 4-Phase Round Flow (10–15s Mode)

1. **Phase 1: Draw the Ring & `KNUCKLES DOWN!` (0–2s)**
   A glowing white-and-cyan chalk circle etches itself rapidly across the dark packed dirt. All active dev marbles drop into a tight cluster inside the ring, humming gently as translucent aim lasers sweep back and forth across their neighbors.

2. **Phase 2: The Simultaneous `PITCH!` Break (2–4.5s)**
   The whistle blows and every marble launches at once in an explosive glass-on-glass cascade. Sparkling collisions ring out across the yard as half a dozen unfortunate devs get immediately cannonballed straight across the chalk line (`OUT OF THE RING!`).

3. **Phase 3: Re-Pitch Volleys & The Rogue `STEELIE BOLER` (4.5–9s)**
   As surviving marbles decelerate, glowing power rings charge around them for rapid **`RE-PITCH!`** volleys. Mid-round, an oversized, gleaming chrome **`STEELIE BOLER`** drops from the sideline and plows directly through center ring, scattering tight clusters, kicking up tiny puffs of reddish dirt dust, and triggering wild 3-way caroms.

4. **Phase 4: The Chalk-Rim Photo Finish (9–12s)**
   Two or three gleaming finalists clash inches from the glowing chalk perimeter. Time drops to $0.4\times$ slow motion for a macro ground-level shot as a heavy *cat's-eye* slams the runner-up straight onto the white line—where it wobbles agonizingly for half a second before tipping one millimeter outside (`DEAD!`). Confetti bursts above the lone survivor inside the chalk ring with the banner: **`KING OF THE RING — LEADS STANDUP!`**

## 2. Schoolyard Calls, Ring Hazards & Dev-Humor Catalog

Floating comic-book tags turn every crisp billiard collision, foul call, and rim-out into an authentic Guyanese marble-yard and workplace inside joke:

* **Direct Ring-Out Knockout (`DEAD!`)** *(A clean hit blasts a rival straight across the chalk boundary)*

  * *Popups:* `"Zabardasti feature paksit'd prod"`, `"Knocked out by Ekmaatra-ji's blame game"`

* **The Rogue `STEELIE BOLER` Bulldozer** *(Oversized metallic ball-bearing boss marble—labeled `EXEC PRIORITY`—that plows straight through the ring with heavy mass)*

  * *Popups:* `"Ekmaatra-ji derailed by common sense again"`, `"Failed to read Ekmaatra-ji's mind"`, `"Unscheduled Ekmaatra-ji override!"`

* **`FUDGING!` Foul Penalty** *(A marble tries to cheat past its launch spot and gets penalized with a wild sideways flick)*

  * *Popups:* `"FUDGING! URL edits banned. Fix: add ?ReturnUrl="`, `"Blocked by pan-os software license"`

* **Triple-Carom `KISS!` Cascade** *(One marble clips two teammates in rapid succession, triggering a multi-elimination scatter)*

  * *Popups:* `"Ekmaatra-ji is on the hunt — PANAGAN!"`, `"IYAHAY NA! Chain-reaction Ekmaatra-ji hotfixes"`

* **Yard Pebble & Concrete Crack Deflection** *(Tiny raised pebbles or dry cracks in the dirt ring send a rolling marble veering wildly off-target)*

  * *Popups:* `"Tripped on Ekmaatra-ji's secretly recreated tables"`, `"Databases knocked out by Ekmaatra-ji's group policy push"`

* **Optional Mode Toggle — "King of the Ring" vs. "`KEEPSIES!` First-Out":**

  * **Ring Champion Mode (Default):** The last gleaming *taw* still inside the chalk circle leads standup.

  * **`KEEPSIES!` Mode:** Flip the rule so the very first dev knocked cleanly across the chalk line gets pocketed into a glowing velvet marble pouch (`FOR KEEPSIES — LEAD STANDUP!`) for instant 10-second comedy.

## 3. Scaling with the Duration Slider (10s–120s)

Rather than letting marbles crawl sluggishly across the dirt, scale the **ring diameter, volley cycles, and shrinking chalk waves** to fit the selected timer cleanly:

| Duration | Mode Variant | Pacing & Mechanics | 
| ----- | ----- | ----- | 
| **10s–15s** | *Recess Quick Break* | Compact chalk ring with 2 explosive `PITCH!` volleys and high bounce restitution ($e \approx 0.95$) so collisions rapidly clear the crowd down to a crisp rim-out finish. | 
| **30s** | *Bottom-House Ring-Out* | Larger yard circle with 4 timed `RE-PITCH!` volleys, two passes of the giant chrome **`STEELIE BOLER`**, and a glowing **`CHALK RING CLOSING`** wave after $18\text{ s}$ that forces survivors into the middle. | 
| **60s–120s** | *Georgetown Keepsies Championship* | 3-stage elimination tournament (**Stage 1: The Lag Line Warm-Up**, **Stage 2: `PanganodUlbo` Gravel Pit** packed with deflecting dirt clods, **Stage 3: Sudden-Death Steelie Finals**). Knocked-out marbles roll into a wooden spectator tray beside the ring until one champion claims the pot. | 

## 4. Visual, Camera & Audio Polish

* **Dark-Mode Friendly Twilight Schoolyard Aesthetic:**

  * Rich, dark umber packed-earth texture sprinkled with subtle micro-pebbles, faint sneaker scuffs, and stray bottle caps—contrasted sharply against a softly glowing white-and-cyan chalk circle so every marble silhouette pops effortlessly in dark mode.

  * Warm amber reflections from unseen evening veranda bulbs glinting across curved glass marble surfaces.

  * **Authentic Marble Styles:** Procedurally tinted glass shaders cycling across classic Guyanese favorites—translucent **Cat's-Eyes** (colored ribbon blades suspended inside clear glass), glossy **Milkies** (frosted neon-pastel opal), fiery **Aggies** (swirled marble veins), and metallic **Steelies**—each emitting a thin colored motion trail during high-speed caroms and tiny bright spark bursts on direct hits.

* **Readability for 2–30 Players:**

  * Clean elevated 3/4 overhead framing keeps the entire circular arena visible with zero overlapping occlusion, even with 30 active spheres.

  * Crisp upright billboarded nameplates hover just above each marble, paired with a compact **`IN RING: 5 / 22`** counter pinned in the corner.

* **Dynamic Camera Choreography:**

  * **Opening Sweep:** Low ground-skimming macro glide right past the gleaming glass swirls as the chalk ring finishes drawing.

  * **Active Break:** Smooth overhead 3/4 arena camera with crisp micro-shake on heavy **`STEELIE BOLER`** impacts, subtly zooming inward as the chalk ring tightens around the final 5 marbles.

  * **Chalk-Rim Finale:** Dramatic ultra-low macro camera right on the white boundary line at $0.4\times$ slow motion to capture the final agonizing rim teeter.

* **Synthesized Audio (Web Audio API):**

  * Unmistakable **crystalline glass-on-glass *CLACK-TINK***: layered high-Q resonant sine pings ($3.2\text{–}6.8\text{ kHz}$) plus a $4\text{ ms}$ sharp click transient, velocity-scaled and slightly pitch-jittered so a 20-marble break sounds uncannily real.

  * Subtle filtered noise rumble as marbles roll over gritty dirt, punctuated by a heavy, ringing metallic ***CLANG*** whenever the chrome **`STEELIE BOLER`** collides with glass.

  * Dry chalk-scrape sound during the intro ring draw, a comical hollow *plop* when a marble drops into the grass out-of-bounds, and a bright steelpan/chutney victory chime when the final champion holds the ring.

## 5. Implementation Blueprint (Lightweight 3D Stack)

Designed for Three.js / WebGL using exact 2D elastic disc collisions and analytical pure-roll kinematics—no heavy 3D physics library required:

1. **Fairness-First Pre-Roll & Trajectory Bias:**
   At round start, run a fair $1 / N$ RNG roll to choose the standup leader (plus 1–2 close finalists). During each `PITCH!` volley, bias the pre-rolled winner's aim vector toward safe, inward-glancing hits near center ring, while assigning decoys aggressive high-speed crossing vectors that naturally ricochet toward the chalk perimeter.

2. **Elastic Glass-on-Glass Impulse Resolution:**
   Treat all $N \le 30$ marbles as circles of radius $r_i$ and mass $m_i$ (standard glass $m = 1.0$, heavy **`STEELIE BOLER`** $m = 6.0$) on the $(x, z)$ plane. Whenever two marbles overlap ($\Vert \vec{p}_B - \vec{p}_A \Vert < r_A + r_B$), resolve positional overlap and apply exact elastic impulse along collision normal $\hat{n}$:

   $$
   j = -\frac{(1 + e)\left(\vec{v}_{AB} \cdot \hat{n}\right)}{\frac{1}{m_A} + \frac{1}{m_B}}, \qquad \Delta \vec{v}_A = -\frac{j}{m_A}\hat{n}, \quad \Delta \vec{v}_B = \frac{j}{m_B}\hat{n}
   $$

   Pair with subtle tangential spin transfer so glancing **`KISS!`** hits curl realistically across the dirt.

3. **Pure-Roll Visual Rotation & Dirt Drag:**
   Decelerate rolling marbles smoothly via kinetic yard friction $\vec{a}_{\text{drag}} = -\mu_d \, \hat{v}_i$ (with a tiny speed snap to zero below $v_{\min}$). Drive every marble mesh's 3D rotation quaternion strictly from its linear velocity so internal cat's-eye ribbons visibly tumble accurately across the ground:

   $$
   \vec{\omega}_i = \frac{\hat{y} \times \vec{v}_i}{r_i}
   $$

4. **Chalk-Ring Boundary & Guaranteed On-Time Climax:**
   Eliminate any marble whose center crosses the live chalk radius ($\Vert \vec{p}_i \Vert > R_{\text{ring}}(t)$). Starting at $0.72 \, T_{\text{round}}$, smoothly contract $R_{\text{ring}}(t)$ inward and trigger a final synchronized **`LAST PITCH!`** burst at $0.88 \, T_{\text{round}}$ aimed squarely at the last remaining decoy—ensuring a dramatic slow-motion chalk-rim knockout right on time.