# Game Mode Spec: Karang Derby (3D Bamboo Stilt Wobble Race)

**App:** Chesapeake Dev Derby

**Genre:** 3D Slapstick Stilt-Balancing Race (Procedural Wobble Physics & Fiesta Chaos)

**Player Count:** 2–30 players

**Duration:** Scales with existing 10s–120s slider

## Overview

Inspired by **karang** (the Cebuano bamboo stilt race, widely known as *kadang-kadang*), **Karang Derby** hoists every active developer onto precariously tall, 10-foot segmented bamboo poles (*kawayan*) along a glowing twilight fiesta boulevard. Instead of sleek race cars, the team teeters, stomps, and windmills their arms wildly down a lane strung with low-hanging *banderitas*, tangled overhead ethernet cables, and treacherous patches of tech debt. Devs bump poles, snap rotten legacy bamboo, and face-plant in slow motion—until the steadiest (or luckiest) stilt-walker wobbles across the finish tape to lead standup.

### Core Design Principle: Inverted-Pendulum Slapstick

What sets **Karang Derby** apart from a standard footrace is vertical comedy. Raising every player's center of gravity 10 feet off the asphalt turns tiny nudges, crosswinds, and uneven pavement into dramatic two-second teetering recoveries—or spectacular timber-style topples. Using lightweight **inverted-pendulum balance math** rather than full rigid-body ragdolls keeps 30 simultaneous stilt-walkers running smoothly at 60 FPS with crisp, hilarious silhouettes.

## 1. The 4-Phase Round Flow (10–15s Mode)

1. **Phase 1: Mount the *Kawayan* — `SAKA NA!` (0–2s)**
   Devs hop onto the notched footrests of their color-coded bamboo poles behind a chalk starting line, already wobbling slightly and flailing their arms for balance while fiesta drums build a rhythmic cadence.

2. **Phase 2: The Stomp-Off — `DAGAN!` (2–5.5s)**
   The starting horn blasts and a thunderous chorus of hollow bamboo *clack-clack-clacks* erupts down the street. Early overconfident sprinters lean too far forward and immediately pole-vault themselves nose-first into the pavement.

3. **Phase 3: Fiesta & Tech-Debt Gauntlet (5.5–9.5s)**
   The pack stretches out through a gauntlet of low-hanging *banderitas* and workplace hazards. A sudden **`BadalJwala`** crosswind sends half the middle pack leaning at $35^\circ$ angles, tangled poles cause chain-reaction domino wipeouts, and a rotten **`do-not-touch-utils-safe-to-delete`** bamboo pole snaps cleanly in half mid-stride.

4. **Phase 4: The Photo-Finish Teeter (9.5–12s)**
   Two or three finalists stagger desperately toward the glowing finish ribbon. Time drops to $0.45\times$ slow motion as the runner-up catches a low *banderita* across the forehead and tumbles backward, while the winner barely catches their balance, lunges forward on one stilt, and snaps the tape—triggering confetti, street-fiesta drums, and the **`STILL STANDING — LEADS STANDUP!`** banner.

## 2. Stilt Mishaps, Fiesta Hazards & Dev-Humor Catalog

Floating comic-book tags turn every dramatic wobble and splintering bamboo pole into a workplace punchline:

* **Snapped Legacy Bamboo** *(One stilt suddenly cracks in half mid-step, dropping the dev straight down)*
  * *Popups:* `"Leaned on do-not-touch-utils-safe-to-delete"`, `"Blocked by pan-os software license"`

* **Low-Hanging *Banderitas* / Overhead Cable Snag** *(Colorful fiesta flags mixed with dangling CAT-6 cables clothesline a tall stilt-walker)*
  * *Popups:* `"Clotheslined by common sense"`, `"Zabardasti feature paksit'd prod"`, `"URL edits banned. Fix: add ?ReturnUrl="`

* **Pole-on-Pole Tangle** *(Two neighboring devs cross stilts, clack loudly, and pinwheel apart)*
  * *Popups:* `"Tumba'd the user table!"`, `"Failed to read Iklauti-ji's mind"`

* **The `PanganodSilab` Crosswind Gust** *(Glowing orange wind streaks sweep sideways across the street, forcing dramatic arms-flailing balance checks)*
  * *Popups:* `"PanganodSilab 500 Crosswind"`, `"Prod is down — PANAGAN!"`

* **Cobblestone & Spilled-Coffee Slick** *(The tip of a bamboo pole slides straight out from under the dev like a cartoon banana peel)*
  * *Popups:* `"Unstable Iklauti-ji's mind"`, `"IYAHAY NA!"`

* **Optional Mode Toggle — *Bagol* (Coconut-Shell) Classic Mode:**
  * Toggle between **Tall Bamboo Stilts** (default high-altitude slapstick) and **Coconut-Shell *Bagol* Stilts** (devs clomping along on tied half-coconuts with glowing ropes, making frantic high-pitched *klok-klok-klok* sounds for an extra nostalgic Bisayan variation).

## 3. Scaling with the Duration Slider (10s–120s)

Instead of making devs walk in sluggish slow motion, scale the **course length, recovery climbs, and heat structure** to match the selected timer:

| Duration | Mode Variant | Pacing & Mechanics |
| :--- | :--- | :--- |
| **10s–15s** | *Barangay Sprint* | Short, chaotic 60-meter dash. One big wipeout takes a dev out of contention; the steadiest sprinter crosses the ribbon cleanly on time. |
| **30s** | *Fiesta Obstacle Derby* | Longer 150-meter boulevard featuring 3 distinct hazard zones (Low *Banderitas*, Cobblestone Slick, and `BadalJwala` Wind Tunnel). Fallen devs can scramble back onto their stilts (`REBOOTING... 2.5s`) for dramatic comeback rallies. |
| **60s–120s** | *Grand Cebu-Chesapeake Relay / Knockout* | Multi-lap fiesta street circuit with a **Last-Place Wipeout Cut** at every glowing checkpoint arch (eliminating the trailing pack each lap until the final 4–5 balance masters duel on the home stretch). |

## 4. Visual, Camera & Audio Polish

* **Dark-Mode Friendly Twilight Fiesta Aesthetic:**
  * Deep indigo twilight sky over a dark cobblestone-and-asphalt street lined with glowing paper lanterns, crisscross neon *banderitas*, Chesapeake pier pilings blended with Cebu fiesta banners, and a cheering silhouette crowd along the wooden barricades.
  * **The Stilts:** Segmented bamboo poles with subtle glowing tape bands matching each dev's jersey color, notched wooden footrests, and faint dust puffs/sparks whenever a pole tip slams into the asphalt.
  * **High-Altitude Readability (2–30 Players):** Putting devs 10 feet in the air naturally staggers silhouettes above the street clutter. Nameplates float cleanly right above each dev's head, paired with a tiny curved **Balance Meter** arc that flashes red just before a wipeout.

* **Dynamic Camera Choreography:**
  * **Start Line:** Low-angle upward tilt from asphalt level looking up at the towering forest of bamboo poles wobbling against the *banderitas*.
  * **Mid-Race Tracking:** Elevated 3/4 sweeping side-dolly moving with the lead pack, gently zooming out whenever a massive domino pileup happens behind them.
  * **Finish Line:** Tight low-angle ribbon cam looking straight down the final 10 meters in slow motion as the finalists teeter toward the tape.

* **Synthesized Audio (Web Audio API):**
  * Signature rhythmic **hollow bamboo *clack-clack-clack*** synthesized via short pitched woodblock-style bandpass bursts triggered on every pole plant.
  * Creaking wooden stress groans as a dev leans past $25^\circ$, escalating into a crisp dry **bamboo *SNAP*** and comedic slide-whistle tumble on wipeouts.
  * Upbeat, lightweight *Sinulog*-inspired fiesta snare/tom drum groove that accelerates slightly during the final 3 seconds, capped with a ribbon-snap chime and brass fanfare.

## 5. Implementation Blueprint (Lightweight 3D Stack)

Designed for Three.js / WebGL using procedural kinematics and 1D/2D inverted-pendulum balance equations—no heavy 3D ragdoll physics engine required:

1. **Fairness-First Pre-Roll & Pacing Curves:**
   At round start, perform a fair $1 / N$ RNG roll to select the standup leader (plus 2–3 close contenders for a tight photo finish). Generate randomized pace-curve profiles for every player so the lead swaps organically 2–3 times before the finish tape.

2. **Procedural Inverted-Pendulum Balance Model:**
   Represent each dev's lean angle $\theta$ (forward/back and lateral wobble) as a damped inverted pendulum of stilt height $L$, stabilized by a PD balance controller $(k_p, k_d)$ and disturbed by hazard torques $\tau_{\text{hazard}}(t)$:

   $$
   \ddot{\theta} = \frac{g}{L}\sin\theta - k_p \theta - k_d \dot{\theta} + \tau_{\text{hazard}}(t)
   $$

   * While $|\theta| < \theta_{\text{crit}}$ (e.g., $32^\circ$), the dev waves their arms proportionally to $|\dot{\theta}|$ and fights back upright.
   * When a scripted hazard spikes $\tau_{\text{hazard}}(t)$ or lowers $k_p$ on a decoy, $|\theta|$ crosses $\theta_{\text{crit}}$ and transitions cleanly into a gravity-driven **Timber Fall** arc (with stilts flying off along simple ballistic trajectories).

3. **Bipedal Stilt Stride Kinematics:**
   Drive each stilt-walker's stride with a phase oscillator $\phi(t)$ tied to forward speed $v$:

   $$
   y_{\text{left}}(\phi) = \max\left(0, A\sin\phi\right), \quad y_{\text{right}}(\phi) = \max\left(0, -A\sin\phi\right)
   $$

   Whenever a pole crosses zero downward ($y \to 0$), spawn a small asphalt dust puff and fire a velocity-scaled hollow bamboo *clack* sound.

4. **Scalable Crowd & Lane Management (2–30 Players):**
   Arrange 2–10 players in a single row across the boulevard, and stagger 11–30 players into 2–3 tight rows with lightweight lateral separation forces so stilts visibly jostle and clack without clipping into a single unreadable mass.