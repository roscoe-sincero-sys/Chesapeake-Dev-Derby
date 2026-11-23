# Game Mode Spec: Chaupar Cowrie-Clash (Boardroom Edition)

**App:** Chesapeake Dev Derby

**Genre:** 3D Tabletop Cross-Board Race & Bumper-Pawn Knockout (Discrete Path-Hop & Cowrie-Scatter Physics)

**Player Count:** 2–30 players

**Duration:** Scales with existing 10s–120s slider

## Overview

Adapted from **Chaupar** (*Pachisi*)—the ancient North Indian royal cross-board game—**Chaupar Cowrie-Clash** unrolls a gleaming, gold-stitched crimson-and-emerald embroidered *chaupar* cloth straight down the center of a massive, varnished teak Indian corporate conference table. Framed by humming overhead ceiling fans, glass partitions with frosted privacy stripes, a flickering projector screen cycling through an endless `Q4 STATUS DECK`, coiled HDMI dongles, and trays of *cutting chai* glasses, every active developer spawns as an oversized, carved wooden pawn sporting a neon base ring and tiny office lanyard.

From above the boardroom table, colossal glowing ivory cowrie shells (*kaudi*) rain onto the polished wood with sharp percussive clatters—rolling sudden hop bursts (`1`, `4`, `6`, or the blazing **`PACHEES! (25)`** turbo leap). Pawns vault along the four intersecting cloth arms toward the central **`CHARKONI` (Chair of the Board)** throne. Land directly on a coworker's square and you execute a brutal corporate **Cut (`KAAT DIYA!`)**, flicking their wooden pawn straight off the teak edge into a rolling metal office trash bin (`SENT BACK TO SPRINT 0!`). The first pawn to storm the central *Charkoni*—or the very first pawn flicked into the trash can in **`FIRST CUT`** mode—claims the mic and leads standup.

### Core Design Principle: Tabletop Storytelling & Bumper-Pawn Betrayal

Because *Chaupar* is natively a tabletop game, setting it inside a late-evening Indian boardroom creates immediate, unmistakable visual comedy with zero clutter. A fixed elevated isometric boardroom camera keeps all four cross arms and up to 30 hopping pawns crystal clear while giant rattling cowrie shells, vibrating spider speakerphones, and flying pawns turn a dignified status meeting into total slapstick chaos.

## 1. The 4-Phase Round Flow (10–15s Mode)

1. **Phase 1: Unroll the Cloth & Mute the Mic — `CHALO!` (0–2s)**
   The embroidered red-and-green *chaupar* cloth snaps smoothly across the dark teak boardroom table, brushing past brass paperweights and sticky notes. All active dev pawns drop onto the four outer arms as the dusty Polycom spider speakerphone beeps (`"WELCOME TO STANDUP"`) and upbeat *tabla*-synth percussion kicks in.

2. **Phase 2: First Cowrie Rain & Opening Cuts — `KAUDI PHEKO!` (2–5.5s)**
   Six giant luminous ivory cowrie shells drop onto the mahogany rim, skittering across the table and bouncing off a *cutting chai* tray. Pawns rocket down the outer lanes in rhythmic wooden *clack-clack-clack* hops. Within two seconds, three aggressive movers land straight on crowded squares—triggering gleaming golden **`KAAT DIYA!`** sparks that launch 4–6 unlucky teammates soaring straight off the table into the rolling wastebasket.

3. **Phase 3: The `SHAKUNI` Loaded Roll & Speakerphone Quake (5.5–9s)**
   As survivors turn inward onto the final home stretches, a sinister purple dice-aura flashes overhead (**`SHAKUNI LOADED ROLL!`**), flipping the embroidered starred safe squares (*chira*) into glowing red trapdoors (`"MEETING EXTENDED BY 30 MIN!"`). Seconds later, the giant conference speakerphone roars to life (`"HELLO? AM I AUDIBLE?!"`), sending sonic vibration rings across the teak surface that rattle pawns sideways and knock careless stragglers right into rival cut lanes.

4. **Phase 4: The `PACHEES!` Charkoni Photo Finish (9–12s)**
   Two or three gleaming finalists sit inches from the golden central *Charkoni* square. Time drops to $0.4\times$ slow motion for a tight tabletop-level angle as a final giant cowrie bounces off a brass paperweight and settles mouth-up—launching the winning pawn in a soaring parabolic arc that clips the runner-up into the trash bin and slams squarely onto the central throne. Marigold confetti and sticky notes erupt from the overhead ceiling fan with the banner: **`CHARKONI CLAIMED — LEADS STANDUP!`**

## 2. Cowrie Rolls, Boardroom Hazards & Dev-Humor Catalog

Floating embroidered-gold and sticky-note popups turn every tabletop cut, cursed roll, and boardroom interruption into an authentic Indian office and IT-satire punchline:

* **Corporate Pawn Cut (`KAAT DIYA!`)** *(Landing on a rival's square flicks them cleanly off the teak table into the office wastebasket)*

  * *Popups:* `"Cut by Ekmaatra-ji — back to Sprint 0!"`, `"Oshitsuke security feature gekichin'd prod"`

* **The `SHAKUNI` Loaded Roll (Safe-Square Betrayal)** *(Starred safe *chira* tiles suddenly glow crimson and eject anyone camping on them)*

  * *Popups:* `"Yuiitsu-sama blames you for not being clear"`, `"Nag-inusarang Agalon derailed by common sense again"`

* **Unmuted Speakerphone Blast (`"AM I AUDIBLE?!"`)** *(The Polycom conference phone pulses violently, knocking pawns off-balance across nearby lanes)*

  * *Popups:* `"Blocked by MeghJwala 502"`, `"BadalJwala 502 echo feedback!"`

* **Spilled *Cutting Chai* Slick & Coiled HDMI Snag** *(A tumbling cowrie clips a chai glass or tangles a pawn in a dongle cord, forcing a skipped turn)*

  * *Popups:* `"Blocked by dead SSL certs"`, `"URL edits banned. Fix: add ?ReturnUrl="`

* **Phantom Projector Update (`"HOLD ON, SHARING SCREEN"`)** *(A glowing blue error window slides across the boardroom cloth, scrambling lane squares momentarily)*

  * *Popups:* `"You're on your own! Tables secretly recreated from scratch"`, `"Stepped on ekmaatra group policy land mine"`

* **Optional Mode Toggle — "Crown the *Charkoni*" vs. "`KAAT DIYA!` First Cut":**

  * **Throne Champion Mode (Default):** First pawn to leap cleanly onto the central *Charkoni* throne (or last uncut pawn remaining) leads standup.

  * **First Cut Mode (`KAAT DIYA!`):** Flip the win condition so the very first dev pawn flicked off the teak table into the metal trash bin gets stamped **`CUT TO SPRINT 0 — LEAD STANDUP!`** for an instant 10-second comedy round.

## 3. Scaling with the Duration Slider (10s–120s)

Rather than making pawns hop sluggishly one tile at a time, scale the **arm length, cowrie throw volleys, and boardroom disruption waves** to fit the selected timer cleanly:

| Duration | Mode Variant | Pacing & Mechanics | 
| ----- | ----- | ----- | 
| **10s–15s** | *Quick Status Sync* | Short 6-square arms, 4 rapid cowrie-rain volleys, and high-frequency **`KAAT DIYA!`** collisions that funnel 2–3 finalists straight onto the *Charkoni* right at the buzzer. | 
| **30s** | *Full Boardroom Chaupar* | Classic 8-square cross lanes with full outer-circuit wraparounds before turning down the home arm. Features two **`SHAKUNI`** safe-tile flips, a **`"AM I AUDIBLE?!"`** speakerphone tremor, and dramatic last-second comeback **`PACHEES!`** leaps. | 
| **60s–120s** | *All-Hands Quarterly Boardroom Derby* | Multi-round elimination tournament (**Quarter 1: Morning Chai Warm-Up**, **Quarter 2: `PanganodUlbo` Power-Flicker** where the projector and ceiling fan surge on backup UPS power, **Quarter 3: Sudden-Death *Charkoni* Finals**). Cut pawns pile visibly inside a glowing wireframe office wastebasket beside the table until one champion claims the throne. | 

## 4. Visual, Camera & Audio Polish

* **Dark-Mode Friendly Twilight Indian Boardroom Aesthetic:**

  * Rich, dark polished **teakwood conference table** catching warm amber reflections from overhead recessed downlights and cool cyan glow from a glass-walled office corridor beyond—keeping dark-mode contrast effortlessly sharp.

  * **The *Chaupar* Cloth:** Deep velvet-crimson and royal-emerald cross arms edged with subtle metallic-gold embroidery and glowing neon stitch-lines delineating every square, with gleaming golden lotus stars marking the safe *chira* tiles.

  * **Authentic Boardroom Props:** Surrounding the cloth sit a dusty gray spider conference phone with a blinking red/green mute LED, a stainless-steel tray of ribbed *cutting chai* glasses, half-eaten triangular samosas on a napkin, stacked yellow sticky notes that flutter under the slow-spinning overhead ceiling fan, and a distant projector screen cycling deadpan slide titles (`"SYNERGY ROADMAP v14_FINAL_REAL.PPTX"`).

  * **The Pawns & Cowries:** Sleek turned-wood Indian *chaupar* chess-like pawns painted in vibrant per-dev colors with crisp upright billboarded nameplates, contrasted against gleaming ivory-white cowrie shells (*kaudi*) whose slit undersides flash neon gold whenever they land mouth-up.

* **Readability for 2–30 Players:**

  * A fixed elevated isometric 3/4 boardroom view keeps all four arms and the central *Charkoni* completely unobstructed. When 2–3 pawns share a non-cut safe square, they automatically nest into neat triangular micro-offsets inside the tile so no nameplate ever overlaps.

  * A compact **`IN PLAY: 9 / 24 • LAST ROLL: PACHEES!`** scoreboard badge anchors the top corner alongside a mini live cowrie-count strip.

* **Dynamic Camera Choreography:**

  * **Cloth Unroll Intro:** Smooth low glide down the varnished teak table past the chai tray and spider phone as the embroidered arms unfurl.

  * **Active Turns:** Crisp elevated isometric overview with subtle vertical camera punch whenever a handful of colossal cowries crashes onto the wood, plus a snappy $35\text{ ms}$ hit-stop flash on brutal **`KAAT DIYA!`** knockouts.

  * **Charkoni Finale:** Dramatic low tabletop-level dolly sweeping right beside the central golden square at $0.4\times$ slow motion as the winning pawn drops in from orbit.

* **Synthesized Audio (Web Audio API):**

  * Unmistakable **cowrie-shell *CLATTER-RATTLE***: rapid burst of 6 high-frequency ceramic/bone resonant taps ($2.8\text{–}6.2\text{ kHz}$) with natural bounce-decay spacing every time a roll hits the teak table.

  * Crisp hollow **wooden pawn *TOK-TOK-TOK*** hops ascending subtly in pitch across multi-square leaps, punctuated by a punchy billiard-style ***SMACK!*** and metallic wastebasket ***CLANG!*** whenever a pawn gets cut off the table.

  * Classic conference-phone **DTMF chime / `"BEEP!"`** alerts on speakerphone blasts, backed by a brisk *tabla*-and-marimba arcade groove that resolves into celebratory brass/sitar victory chords on the winning *Charkoni* landing.

## 5. Implementation Blueprint (Lightweight 3D Stack)

Designed for Three.js / WebGL using a clean 1D discrete tile-graph mapped to 3D cross coordinates and ballistic hop/knockout arcs—no heavy 3D physics engine required:

1. **Fairness-First Pre-Roll & Roll Choreography:**
   At round start, perform a fair $1 / N$ RNG roll to select the standup leader (plus 1–2 close finalists for the *Charkoni* finish). Assign every pawn to one of the four starting arms ($a \in \{0, 1, 2, 3\}$) and pre-schedule key cowrie-roll totals $R_i(k) \in \{1, 2, 4, 6, 12, 25\}$ so the lead trades organically across cuts while ensuring the pre-rolled winner reaches the final home tile right on schedule.

2. **Cross-Board Coordinate Graph & Parabolic Tile Hops:**
   Represent the *chaupar* board as a clean ordered array of tile center points $\vec{P}[m] = (x_m, y_{\text{table}}, z_m)$ along each arm's outer loop and inner home lane ($m \in \{0, \dots, M_{\text{max}}\}$, where $M_{\text{max}}$ is the central *Charkoni* at $(0, y_{\text{table}}, 0)$). When pawn $i$ hops from tile $m$ to $m + 1$ over duration $\tau_{\text{hop}}$:

   $$
   \vec{p}_i(u) = (1 - u)\vec{P}[m] + u\vec{P}[m+1] + \hat{y}\, 4 H_{\text{hop}}\, u(1 - u), \qquad u \in [0, 1]
   $$

   Scale $H_{\text{hop}}$ upward by $2.2\times$ on **`PACHEES!`** leaps and add subtle pitch-tilt leaning forward along the tangent vector for lively squash-and-stretch feel.

3. **`KAAT DIYA!` Knockout Flick & Cowrie Bounce Kinematics:**
   Whenever moving pawn $i$ finishes a turn on an occupied non-safe square held by decoy $j$, trigger an instant radial ballistic flick launching decoy $j$ straight toward the nearest boardroom wastebasket $\vec{p}_{\text{bin}}$:

   $$
   \vec{p}_j(t) = \vec{p}_{\text{hit}} + \vec{v}_{\text{flick}}\, t - \frac{1}{2} g t^2 \hat{y}, \qquad \vec{\omega}_j = \vec{\omega}_{\text{tumble}}
   $$

   Animate the 6 giant cowrie shells via lightweight damped vertical bounces ($v_{y, n+1} = -e \, v_{y, n}$ with $e = 0.55$) confined to the wooden margin zones outside the cloth arms so shells never obscure active pawns while always landing cleanly on their scripted mouth-up / mouth-down orientation.

4. **Guaranteed On-Time *Charkoni* Safeguard:**
   Map the total turn wave count $W$ directly from the duration slider $T_{\text{round}}$. At normalized progress $u = 0.86$, fire the final high-roll **`PACHEES!`** cowrie volley calibrated to drop the pre-rolled winner precisely onto $M_{\text{max}}$ (while cutting the runner-up one tile shy at $M_{\text{max}} - 1$) so the slow-motion throne claim and confetti burst always land right at $T_{\text{round}}$.