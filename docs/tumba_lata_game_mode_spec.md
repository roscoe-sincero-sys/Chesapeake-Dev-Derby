# Game Mode Spec: Tumba Lata (Slipper-Slinging Server Raid)

**App:** Chesapeake Dev Derby

**Genre:** 3D Street-Game Arcade Chaos (Ballistic Volley + Scramble & Tag)

**Player Count:** 2–30 players

**Duration:** Scales with existing 10s–120s slider

## Overview

Adapted from the classic Bisayan street game **Tumba Lata** (also known as *Bato Lata*), this mode drops your team onto a glowing twilight fiesta street lined with colorful *banderitas* and a neon **`SARI-SARI DEV SHOP`** storefront. Sitting upright inside a chalk circle at center street is a shiny tin can (*lata*) labeled **`PROD SERVER`**, guarded by an overworked, heavily caffeinated AI **Bantay** (*Release Manager*).

All active devs line up behind the glowing chalk throw line (*badlis*) armed with neon rubber flip-flops (*tsinelas*). On **`BATO!`**, everyone unleashes a chaotic volley at the can. Once the can goes clattering down the asphalt, the entire team bolts into the street to retrieve their slippers and race back to safety before the Bantay sets **`PROD SERVER`** upright again. Whoever gets tagged out in the open becomes the new **Bantay**—and leads standup.

### Core Design Principle: Authentic Two-Act Street Chaos

What makes real-life *Tumba Lata* unforgettable is the sudden whiplash between **the throw** and **the panic scramble**. Structuring every round as a choreographed two-act sequence—a simultaneous slipper barrage followed by a frantic race back to the safe line—guarantees instant slapstick comedy, high suspense right up to the final second, and exact alignment with your duration slider.

## 1. The 4-Phase Round Flow (10–15s Mode)

1. **Phase 1: Line Up at the *Badlis* (0–2s)**
   Active devs bounce impatiently behind the glowing chalk throw line holding color-coded *tsinelas*. Down the street, the **Bantay** paces nervously around the upright **`PROD SERVER`** tin can, clutching an oversized coffee mug.

2. **Phase 2: The *Tsinelas* Volley — `BATO!` (2–4.5s)**
   All 2–30 devs hurl their flip-flops simultaneously in a glorious, spinning rainbow arc.

   * 1–2 direct hits blast the **`PROD SERVER`** can flying across the asphalt in a shower of sparks (`PROD DOWN!`).

   * Other slippers ricochet wildly off curbs, skim past the circle, or flop weakly two feet past the line.

3. **Phase 3: The Great Scramble (4.5–9s)**
   The Bantay sprints frantically after the tumbling tin can to haul it back to the center circle. Simultaneously, every dev dashes past the *badlis* to snatch their scattered *tsinelas* and sprint back to safety. Devs bump elbows, grab the wrong slipper, and juke around each other in pure street-game mayhem.

4. **Phase 4: Can Restored & The Tag (9–12s)**
   The Bantay slams **`PROD SERVER`** back upright inside the chalk ring—flashing the street lights red (**`PROD RESTORED — HUNTING MODE!`**)—and lunges at the last 2–3 devs still scrambling in the street. One dev slips inches shy of the safe line and gets tagged. A spotlight locks on them with confetti and the banner: **`TAG! YOU'RE THE NEW BANTAY — LEAD STANDUP!`**

## 2. Throw Mishaps, Scramble Events & Dev-Humor Catalog

Floating comic-book tags turn every wild throw and close call into an inside joke:

* **Direct Hit (*Tumba!*):**
  * `"SMTP Relay Server is down — SIBAT!"`
  * `"Impas ang user table!"`
  * `"Way-gamit feature paksit'd prod"`

* **Weak / Whiffed Slipper Throws:**
  * `"Blocked by bahaw software license"`
  * `"Works on my side of the badlis"`
  * `"Zabardasti feature giguba ang prod"`
  * `"URL edits banned. Fix: add ?ReturnUrl="`

* **Scramble & Near-Miss Popups:**
  * `"Grabbed someone else's branch!"` *(Dev accidentally bends down for a teammate's slipper before realizing)*
  * `"Hotfix rolled back the clock too fast!"` *(Triggered when the Bantay restores the can early)*
  * `"Failed to read Iklauti-ji's mind"` *(Dev jukes left straight into the Bantay's path)*
  * `"Blocked by audit logs not being available"` *(Dev gets tripped up two steps before crossing the badlis)*

* **Optional Mode Toggle — "Champion vs. Bantay":**
  * **Classic Bantay Mode (Default):** Whoever gets tagged becomes the new Bantay and leads standup.
  * **Sharpshooter Mode:** Flip the win condition so the dev whose *tsinelas* knocks **`PROD SERVER`** the farthest down the street claims the mic.

## 3. Scaling with the Duration Slider (10s–120s)

Rather than dragging out one slow sprint, scale the **number of volleys and Bantay intensity** to match the selected timer:

| Duration | Mode Variant | Pacing & Mechanics | 
| ----- | ----- | ----- | 
| **10s–15s** | *Street Blitz* | Single synchronized volley, guaranteed can knockdown, short frantic scramble, first tag crowns the standup leader. | 
| **30s** | *Classic Barangay Round* | 2–3 rapid volleys. On Volley 1, everyone narrowly makes it back behind the *badlis* just as the can stands up (*"Safe! Reload!"*). The Bantay chugs coffee (`CAFFEINE BOOST x2`) and moves faster on the decisive final scramble. | 
| **60s–120s** | *Fiesta Elimination* | Multi-round survival. Each volley, devs who safely retrieve their *tsinelas* and cross back are marked **SAFE** for the day—leaving only the slowest/unluckiest stragglers to face increasingly wild throws and a turbo-charged Bantay until one final dev gets tagged. | 

## 4. Visual, Camera & Audio Polish

* **Dark-Mode Friendly Twilight Fiesta Aesthetic:**
  * Deep evening twilight sky over a dark asphalt barangay street (or a Chesapeake-meets-Cebu waterfront boardwalk) so neon elements pop cleanly against your existing dark UI.
  * Overhead crisscross strings of brightly lit fiesta *banderitas* swaying gently in the breeze, warm streetlamps, chalk-drawn glowing cyan circle and *badlis* line, and a glowing **`SARI-SARI DEV SHOP`** awning on the sidewalk.
  * **The *Lata*:** Oversized shiny ribbed tin can with a wrapped red/amber **`PROD SERVER`** label that dents, sparks, and emits a tiny puff of server smoke when knocked flying.
  * **The *Tsinelas*:** Chunky, stylized 3D rubber flip-flops (classic blue-and-white strap geometry tinted in each dev's signature color) that spin end-over-end with bright ribbon motion trails so every player can track their slipper mid-flight.

* **Dynamic Camera Choreography:**
  * **Volley Shot:** Low, dramatic 3/4 angle from behind the *badlis* watching dozens of colorful *tsinelas* launch toward the glowing tin can.
  * **Impact Cut:** Quick punch-in on the tin can exploding off its chalk circle with a crisp hit-stop freeze frame ($60\text{ ms}$).
  * **Scramble Cam:** Elevated angled street overview tracking the Bantay returning the can and the pack sprinting back to safety.
  * **The Tag:** Tight slow-motion ($0.4\times$) zoom at the *badlis* line as the Bantay tags the final straggler.

* **Synthesized Audio (Web Audio API):**
  * Rapid staggered rubber *whoosh / thwip* sounds as the flip-flop volley launches.
  * Unmistakable, bright metallic **TING-KLANG-KLANG-KLANG** synthesized via high-Q bandpass resonances as the tin can bounces and skids down the asphalt.
  * Frantic pattering footsteps and cartoon rubber-squeak skids during the scramble.
  * Sharp metallic *CLANK* + warning siren chirp the instant the Bantay sets the can back upright.
  * Festive street-fiesta percussive fanfare + arcade buzzer when the tag lands.

## 5. Implementation Blueprint (Lightweight 3D Stack)

Designed for Three.js / WebGL using clean kinematics and 2D steering—no heavy physics engine required:

1. **Fairness-First Pre-Roll:**
   At round start, run a fair $1 / N$ RNG roll to select the target standup leader (plus 1–2 "close-call" finalists who cross the safe line half a step ahead for maximum suspense).

2. **Slipper Ballistics & Tumble:**
   Each *tsinelas* follows an exact parabolic arc from dev hand $\vec{p}_0$ to its assigned landing spot $\vec{p}_L$ over flight time $T$:

   $$
   \vec{v}_0 = \frac{\vec{p}_L - \vec{p}_0 - \frac{1}{2}\vec{g}T^2}{T}
   $$

   Add a randomized end-over-end spin quaternion $\vec{\omega}$ plus 1–2 damped ground skips after landing. Place the pre-rolled target's slipper slightly deeper down the street (or trigger a playful "grabbed the wrong slipper" $0.6\text{ s}$ detour) so their sprint back is naturally the tightest.

3. **Tin Can Knockdown & Pacemaker Timing:**
   When the winning strike hits the can, launch it along a damped bounce curve to distance $d_{\text{can}}$. Compute the Bantay's run speed $v_{\text{bantay}}$ from the remaining round budget so the can is guaranteed to be restored right at $\approx 75\%$ of the round duration:

   $$
   v_{\text{bantay}} \approx \frac{2 d_{\text{can}}}{t_{\text{restore}} - t_{\text{hit}}}
   $$

4. **Lightweight 2D Scramble Steering:**
   During Phase 3, each dev follows a 2-state steering loop on the $(x, z)$ street plane:
   * `SEEK_SLIPPER`: Move directly toward their landed *tsinelas* with lightweight boid-style separation forces so 30 devs weave cleanly without clipping into one blob.
   * `FLEE_TO_BADLIS`: Once within pickup radius $r_{\text{grab}}$, attach the slipper back to the dev's hand and sprint back across $z_{\text{safe}}$ while the Bantay runs a simple pursuit vector toward the pre-rolled target once the can is restored.