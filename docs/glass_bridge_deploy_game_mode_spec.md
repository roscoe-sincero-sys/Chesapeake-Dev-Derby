# Game Mode Spec: Glass Bridge Deploy (Tempered vs. Untested Prod Panes)

**App:** Chesapeake Dev Derby

**Genre:** 3D High-Altitude 50/50 Leap & Betrayal Dash (Parabolic Hop & Glass-Shatter Physics)

**Player Count:** 2–30 players

**Duration:** Scales with existing 10s–120s slider

## Overview

Inspired by the iconic *Squid Game* **Glass Stepping Stones** catwalk, **Glass Bridge Deploy** suspends your entire dev team high above a pitch-black data-center chasm illuminated only by twin rows of warm golden carnival bulbs. Spanning the void is a narrow steel-framed bridge paved with pairs of glowing glass panels—one side labeled **`TESTED (TEMPERED)`** and the other secretly **`UNTESTED PROD (FRAGILE)`**. Pink-jumpsuit **Scrum Guards** wearing glowing circle, triangle, and square Jira-priority masks stand watch along the distant **`DEPLOY TO PROD`** platform.

All active developers draw numbered vests (`01`–`30`) and sprint onto the catwalk. Every pair of panes is a nerve-wracking $50/50$ gamble: land on tempered glass and it holds firm with a crisp metallic ring; land on untested glass and the panel explodes in a dazzling shower of crystalline shards, plunging the dev straight into the dark server abyss below. Front-runners hesitate, squint at the glass reflections, and get shoved forward by impatient coworkers trailing behind—until one survivor leaps onto the far platform (or the very first canary plunges through a shattered pane in **`CANARY DEPLOY`** mode) to claim the mic and lead standup.

### Core Design Principle: Reverse-Advantage Suspense & Workplace Betrayal

Unlike standard races where leading early is an advantage, **Glass Bridge Deploy** flips the psychology completely: **being first in line is a curse**. Early leaders act as reluctant QA testers for the whole team, creating hilarious moments of sudden hesitation, traffic-jam pileups on a single safe pane, and brazen mid-bridge shoves as trailing devs leapfrog over freshly revealed safe paths right into the final sprint.

## 1. The 4-Phase Round Flow (10–15s Mode)

1. **Phase 1: Draw Vest Numbers & Bridge Ignition — `CHOOSE YOUR LANE!` (0–2s)**
   All active devs receive glowing numbered vests (`01` to `N`) on the starting steel gantry. Down the length of the bridge, twin strings of warm incandescent bulbs snap on sequentially from Pair 1 to the far **`PROD`** platform as a tense ticking-clock synth pulse kicks in.

2. **Phase 2: The Blind Leap Wave — `DEPLOYING!` (2–5.5s)**
   Devs `01` through `05` bolt onto the first three pairs of glass. Two lucky leaps hold with bright cyan rings, while three wrong picks shatter instantly into sparkling cascades (`404 FLOOR NOT FOUND!`)—instantly mapping out the safe path for the surging pack behind them.

3. **Phase 3: The Hesitation Freeze & Bus-Shove (5.5–9s)**
   Halfway across the chasm, a cautious front-runner skids to a dead stop on Pair 5, squinting dramatically at the two glowing panes (`"Checking StackOverflow..."`). Six coworkers pile up precariously on the single $1.5\text{ m}$ tempered square behind them until an impatient teammate shoves the leader onto the right-hand glass—which shatters cleanly on impact, letting the whole trailing pack sprint across the safe left lane.

4. **Phase 4: Final Pane Sprint & Bridge Detonation (9–12s)**
   Only two or three finalists remain with two untested pairs left and the giant red scoreboard timer plunging toward `00:00`. Time drops to $0.4\times$ slow motion as the bridge lights flick off in a sudden **`DARK MODE`** flash; the runner-up dives blindly onto a fragile pane that bursts apart beneath their boots, while the winning dev leaps clean onto the steel **`DEPLOYED TO PROD`** gantry—triggering a dramatic domino-shatter detonation of the entire bridge behind them, gold confetti, and the **`SURVIVED PROD CUTOVER — LEADS STANDUP!`** banner.

## 2. Bridge Mishaps, Betrayals & Dev-Humor Catalog

Floating comic-book tags turn every shattered pane, timid freeze, and cowardly shove into an IT deployment and *Squid Game* inside joke:

* **Shattered Untested Pane (`404 CAR NOT FOUND FLOOR`)** *(Dev lands cleanly on fragile glass and drops straight into the dark server pit)*

  * *Popups:* `"In an accident? So? Here's your reprimand for car-accident tardiness."`, `"Traffic collision is not an approved excuse. Here's your tardiness reprimand."`

* **The "Thrown Under the Bus" Shove** *(A trailing dev shoves a hesitating leader onto an untested pane to reveal the safe path)*

  * *Popups:* `"Ekmaatra-ji blames you for not being clear"`, `"Ekmaatra-ji voluntold you for blame duty"`

* **Glass-Inspector Squint (`REFRACTION CHECK`)** *(A dev pauses dramatically to study the light sheen on the panes—just before the Pink Scrum Guard switches the bridge lights off)*
  * *Popups:* `"Drive accident victim to the clinic to cosplay as a concerned human"`, `"FakeConcern 502 empathy blast wave"` 

* **Overloaded Safe Pane Wobble** *(Four or more devs crowd onto a single tempered panel at once, making it groan and bounce one unlucky dev off the steel rail)*

  * *Popups:* `"Blocked by AirbagFlare 502: Unplanned merge at intersection"`

* **The Misleading Label Trap** *(A fragile pane sports a peeling green sticker reading `TEMP_SAFE_V2_FINAL` right before it explodes)*

  * *Popups:* `"Loaded a deprecated 'Concerned Human' SOP."`

* **Optional Mode Toggle — "Prod Survivor" vs. "`CANARY DEPLOY` (First Fall)":**

  * **Prod Survivor Mode (Default):** The first dev to reach the far steel **`DEPLOYED TO PROD`** platform leads standup.

  * **Canary Deploy Mode:** Flip the rule so the very first dev who plummets through a shattered pane gets stamped **`CANARY FAILED — LEAD STANDUP!`** for an instant 10-second comedy round.

## 3. Scaling with the Duration Slider (10s–120s)

Rather than making devs hop in sluggish slow motion, scale the **bridge length (number of glass pairs), hesitation standoffs, and lighting-outage waves** to fit the selected timer cleanly:

| Duration | Mode Variant | Pacing & Mechanics | 
| ----- | ----- | ----- | 
| **10s–15s** | *Hotfix Catwalk Blitz* | Compact 6-pair glass bridge. Rapid leaping cadence with 1 dramatic mid-bridge shove and a fast timer-shatter chase across the final two pairs. | 
| **30s** | *Full Staging-to-Prod Crossing* | Iconic 12-pair high-altitude bridge featuring two hesitation traffic jams, a **`PanganodUlbo` Blackout** phase where the warm bridge bulbs flicker off for $4\text{ s}$, and a high-speed overtaking scramble across the safe lane. | 
| **60s–120s** | *3-Bridge Release Pipeline* | Multi-stage gauntlet spanning three consecutive catwalks (**Bridge 1: Dev Chasm**, **Bridge 2: QA Lights-Out**, **Bridge 3: Sudden-Death Prod Cutover**) separated by steel checkpoint landings where pink Scrum Guards tally survivors on a glowing scoreboard until one dev crosses the final gantry. | 

## 4. Visual, Camera & Audio Polish

* **Dark-Mode Friendly High-Altitude Circus-Data-Center Aesthetic:**

  * Pitch-black server-void backdrop punctuated by distant blinking emerald/crimson rack LEDs far below, framed by the iconic glowing twin strings of warm amber incandescent carnival bulbs lining both steel bridge beams.

  * **The Glass Panes:** Semi-transparent reflective panes framed in brushed gunmetal steel. Safe tempered panes flash a subtle crisp cyan edge-glow once proven by a surviving footstep, while fragile panes fracture instantaneously into gleaming rotating glass triangles that tumble out of sight into the abyss.

  * **The Cast:** Devs wear color-coded tracksuits with crisp oversized chest vest numbers (`01`–`30`) and upright billboarded nameplates, contrasted against tall silhouetted **Pink Scrum Guards** holding giant Jira-shape paddles (`○`, `△`, `□`) at the finish gantry.

* **Readability for 2–30 Players:**

  * An elevated 3/4 diagonal chase angle running along the bridge axis keeps both Left and Right lanes unmistakably distinct, even when 15 devs sprint across proven panels in a single-file rush.

  * A compact live **`BRIDGE PROGRESS: PAIR 7 / 12 • ALIVE: 8`** HUD ticker paired with a glowing countdown clock anchors the top edge.

* **Dynamic Camera Choreography:**

  * **Ignition Sweep:** Dramatic low fly-through skimming right down the twin glass lanes as the marquee bulbs snap on one by one.

  * **Mid-Bridge Tracking:** Smooth side-rail dolly staying slightly ahead of the front-most active explorer—punching in briefly with a crisp $45\text{ ms}$ freeze-frame whenever a bus-shove sends someone crashing through glass.

  * **Final Detonation:** Sweeping reverse angle from the **`DEPLOYED TO PROD`** gantry at $0.4\times$ slow motion as the winner dives clear and the remaining glass panes explode sequentially behind them.

* **Synthesized Audio (Web Audio API):**

  * Distinct **safe tempered glass *CLACK-RING***: tight damped metallic-glass ping ($1.4\text{–}2.2\text{ kHz}$) signaling a solid landing.

  * Spectacular **fragile pane *KRA-SHATTER***: layered crisp transient crack + shimmering high-frequency glass-shard cascade ($3.5\text{–}9.0\text{ kHz}$ randomized bandpass bursts) paired with a fast descending Doppler scream/whistle fade into the chasm.

  * Rhythmic ticking-clock synth pulse and eerie circus-waltz undertones that accelerate sharply during the final $3\text{ s}$, capped by a thunderous cascading shatter boom and triumphant brass/synth fanfare on the winning landing.

## 5. Implementation Blueprint (Lightweight 3D Stack)

Designed for Three.js / WebGL using clean parabolic hop trajectories and instanced glass-shard bursts—no heavy 3D fracture or physics engine required:

1. **Fairness-First Pre-Roll & Vest Assignment:**
   At round start, run a fair $1 / N$ RNG roll to select the standup leader (plus 1–2 close finalists). Assign vest numbers and bridge pair outcomes $S_k \in \{L, R\}$ for $k = 1, \dots, M$ so the pre-rolled winner can win organically from any starting slot (e.g., an early vest number riding a lucky streak, or a mid-pack runner surviving a shove and overtaking during the final two pairs).

2. **Parabolic Pane-to-Pane Hop Kinematics:**
   Model every leap from pane center $\vec{p}_0$ to target pane $\vec{p}_1$ over hop duration $T_{\text{hop}}$ with an exact closed-form parabolic arc:

   $$
   \vec{p}(t) = \vec{p}_0 + \frac{t}{T_{\text{hop}}}\left(\vec{p}_1 - \vec{p}_0\right) + \hat{y}\left(v_{y,0} t - \frac{1}{2} g t^2\right), \qquad v_{y,0} = \frac{1}{2} g T_{\text{hop}}
   $$

   * On landing ($t = T_{\text{hop}}$), check the pane state: if safe (or already proven), play a brief knee-bend squash and queue the next hop; if fragile, hide the intact pane mesh, spawn an instanced shard burst, and immediately drop the dev under vertical acceleration $\ddot{y} = -g$ with a comical spin quaternion $\vec{\omega}_{\text{fall}}$.

3. **Zero-Cost Instanced Glass Shatter:**
   Pre-allocate a single `InstancedMesh` pool of $K \approx 18$ jagged triangular glass shards per shattering pane. Upon impact at $\vec{p}_{\text{pane}}$, activate a slice of the pool with randomized outward radial velocity $\vec{v}_{\text{shard}}$, downward drop bias, and tumbling angular speed—keeping frame rates locked at 60 FPS even during the full-bridge finale detonation.

4. **Queue Congestion, Bus-Shoves & Hard-Cap Bridge Detonation:**
   Maintain a simple slot index $k_i \in \{0, \dots, M+1\}$ for every surviving dev. Whenever a front-runner enters a scripted `HESITATE` state on Pair $k$, trailing devs compress into tight circular sub-offsets on Pair $k$ until a scheduled `SHOVE` event launches the leader onto the adjacent fragile pane. Compute the remaining bridge pairs against the duration slider $T_{\text{round}}$ and trigger the sequential **`TIMER DETONATION`** wave starting at $0.90 \, T_{\text{round}}$ from Pair 1 toward Pair $M$ so the winner's dive onto the finish gantry lands right at the buzzer.