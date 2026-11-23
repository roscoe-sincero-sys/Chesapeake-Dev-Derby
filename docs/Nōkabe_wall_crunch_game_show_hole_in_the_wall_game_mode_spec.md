# Game Mode Spec: Nōkabe Wall Crunch (Game-Show "Hole in the Wall")

**App:** Chesapeake Dev Derby

**Genre:** 3D Variety-Show Silhouette Contortion & Dunk-Tank Slapstick (Sliding-Wall Clearance & Knockback Physics)

**Player Count:** 2–30 players

**Duration:** Scales with existing 10s–120s slider

## Overview

Inspired by Japan's legendary late-night TV game show **Nōkabe** (*Brain Wall* / *Hole in the Wall*), **Nōkabe Wall Crunch** dresses your entire dev team in gleaming, oversized silver-spandex variety-show jumpsuits (accented with bright color-coded helmets and jersey stripes) and lines them up along a sleek neon-edged studio dock suspended directly over a glowing turquoise dunk tank. Down twin brushed-steel rails ahead of them, towering painted styrofoam walls hurtle straight toward the platform—each stamped with an increasingly absurd, glowing corporate cutout silhouette (`"SIMPLE HOTFIX"`, `"LEGACY ORG CHART"`, `"WCAG 2.2 PRETZEL"`).

As the studio klaxon blares (**`KABE GA KURU YO! — WALL INCOMING!`**), all active developers scramble sideways to claim an open cutout bay and frantically twist their arms, legs, and torsos into ridiculous yoga-ragdoll poses before the styrofoam wall arrives. Fit cleanly inside the silhouette and you stay dry to cheers and confetti; clip the edge by three inches and you burst through a spray of white styrofoam pellets—or get body-slammed straight backward into the dunk tank (`SPLASH!`). The last dry developer still standing on the dock—or the very first one belly-flopping into the pool in **`DUNK-TANK CANARY`** mode—claims the mic and leads standup.

### Core Design Principle: Looming Countdown Dread & Slapstick Pose-Matching

What makes *Nōkabe* universally hilarious on a shared screen is **unmistakable visual anticipation**. You see the absurd cutout hurtling down the track three full seconds before impact—watching 20 silver-suited coworkers simultaneously panic-scramble for the same gap, strike wildly crooked poses, and get swept cleanly into the glowing water in one glorious wave delivers instant variety-show comedy every single round.

## 1. The 4-Phase Round Flow (10–15s Mode)

1. **Phase 1: Studio Spotlights & Suit-Up — `JUNBI OK!` (0–2s)**
   Overhead Tokyo TV-studio truss lights snap on across the dark soundstage, casting crisp reflections on the turquoise pool below. All active devs hop onto the cantilevered acrylic dock in gleaming silver jumpsuits, striking confident warm-up stances while bouncy game-show brass kicks in.

2. **Phase 2: Wall 1 — The Warm-Up Hotfix (2–5.5s)**
   The crimson rail lights flash and **Wall 1** (`"SIMPLE HOTFIX — T-POSE"`) rockets down the track. Most of the team scrambles cleanly into the glowing star-shaped cutouts, while 4–6 distracted devs strike the wrong pose (`"Still reading the ticket!"`) and get flat-paneled straight into the dunk tank in a roaring splash wave.

3. **Phase 3: Wall 2 — The Twisted Requirement Gauntlet (5.5–9s)**
   The studio siren pitches up as **Wall 2** (`"CONFLICTING STAKEHOLDER SPECS"`) barrels forward with wild asymmetric yoga silhouettes—one leg kicked horizontally at $90^\circ$, arms twisted overhead, plus one notorious **Fake Painted Cutout** (`TEMP_WORKAROUND`) that isn't actually cut through! A frantic lateral traffic jam knocks half the remaining pack off-center, blasting white styrofoam chunks and silver-suited limbs into the water.

4. **Phase 4: Wall 3 — The High-Speed Final Boss Cutout (9–12s)**
   Only two or three finalists remain trembling on the wet dock as **Wall 3** (`"PRODUCTION CUTOVER — KEYHOLE"`) accelerates down the rails with flashing neon warning strobes. Time drops to $0.4\times$ slow motion right before impact: the runner-up's elbow clips a reinforced foam corner and flips them backward in a full somersault into the pool, while the winning dev contorts cleanly through the razor-thin silhouette—triggering studio airhorns, giant Japanese variety-show *telop* banners, gold confetti, and **`PASSED COMPLIANCE — LEADS STANDUP!`**

## 2. Wall Cutouts, Dunk-Tank Mishaps & Dev-Humor Catalog

Bold, colorful Japanese variety-show *telop* popups (bouncy outlined impact text) turn every missed pose, broken foam edge, and dunk-tank wipeout into an IT satire punchline:

* **Wall 1: The Clean Checkmark / T-Pose (`"SIMPLE HOTFIX"`)** *(Deceptive warm-up cutout that catches devs who react half a beat too late)*

  * *Popups:* `"Group policy hotfix stops SQL Server restarts"`, `"URL edits banned. Breaks reports. Fix: add ?ReturnUrl="`

* **Wall 2: The Contorted Pretzel (`"WCAG / LEGACY EDGE CASE"`)** *(Requires an absurd leaning split and one-arm salute right as the wall accelerates)*

  * *Popups:*  `"Yuiitsu-kakka blames you for not being clear"`, `"Yuiitsu-kakka derailed by common sense again"`

* **Wall 3: The Moving-Goalpost Wall (`"MID-SPRINT SCOPE PIVOT"`)** *(The glowing cutout suddenly shifts $1.5\text{ m}$ sideways one second before arrival!)*

  * *Popups:* `"Muriyari security feature bakuha'd prod"`, `"Renamed the dbo.user table to dbo.user-x!"`

* **The Solid Painted Trap (`"DEPRECATED DOCS"`)** *(Looks like a neon cutout until a dev slams straight into solid styrofoam marked `DO NOT TOUCH`)*

  * *Popups:* `"16+ char passwords deprecated in v2"`, `"Blocked by PanganodSilab 502"`, `"BadalJwala 502 wall-slammed you!"`

* **Foam-Graze Near Miss (`"KIRI-KIRI CLEAR!"`)** *(A survivor clips the outer $10\text{ cm}$ rim, shattering a cloud of white styrofoam beads while wildly windmilling their arms on the edge of the dock without falling in)*

  * *Popups:* `"自己責任！ Tables secretly recreated from scratch"`

* **Optional Mode Toggle — "Last Dry Dev" vs. "`DUNK-TANK CANARY` (First Splash)":**

  * **Dry Champion Mode (Default):** Survive every incoming styrofoam wall to remain standing on the dock and lead standup.

  * **First Splash Mode:** Flip the win condition so the very first dev body-slammed off the dock into the turquoise pool gets stamped **`FIRST IN THE TANK — LEAD STANDUP!`** for an instant 10-second slapstick round.

## 3. Scaling with the Duration Slider (10s–120s)

Rather than making walls creep slowly down the runway, scale the **number of incoming walls, rail speed tiers, and studio twist mechanics** to match the selected timer cleanly:

| Duration | Mode Variant | Pacing & Mechanics | 
| ----- | ----- | ----- | 
| **10s–15s** | *Prime-Time 3-Wall Blitz* | Fast 3-wall barrage (`Warm-Up` $\to$ `Scope Pivot` $\to$ `Final Keyhole`). Rapid $3.5\text{ s}$ intervals sweep away most of the pack quickly so 2–3 finalists face the final wall right at the buzzer. | 
| **30s** | *Full Variety-Show Episode* | 6 escalating walls featuring a **`SPEED-UP!`** rail boost, a **`DOUBLE-WALL`** back-to-back combo, and a **`PanganodUlbo` Strobe Wall** where the cutout flickers out briefly mid-approach before revealing the true pose. | 
| **60s–120s** | *Grand Tokyo Soundstage Championship* | Multi-round elimination show across 3 themed stages (**Stage 1: Junior Onboarding Walls**, **Stage 2: Shifting-Spec Chaos**, **Stage 3: Sudden-Death Golden Foam Finals**). Dunked devs bob around hilariously in inflatable rubber ducks inside the glowing pool cheering on the survivors until one champion stands dry. | 

## 4. Visual, Camera & Audio Polish

* **Dark-Mode Friendly Late-Night Tokyo TV Studio Aesthetic:**

  * Deep obsidian soundstage rafters crisscrossed with volumetric magenta, electric-cyan, and amber studio spotlights—making the bright turquoise dunk tank and glowing neon-rimmed styrofoam walls pop vividly in dark mode.

  * **The Silver Jumpsuits & Helmets:** Reflective metallic-silver variety-show bodysuits paired with high-contrast color-coded helmets and glowing chest nameplates so every single dev stands out against both dark rafters and bright white foam.

  * **The Styrofoam Walls:** Thick textured white/pastel foam slabs accented with bold hazard chevrons, crisp glowing LED rims tracing every cutout silhouette, and explosive white styrofoam pellet bursts whenever a dev grazes or breaks a foam edge.

* **Readability for 2–30 Players:**

  * Dynamically widen the studio dock and scale the number of cutout bays per wall ($B \in \{1, 2, 3, 4\}$) based on active player count so up to 30 devs fan out cleanly across the stage without turning into an unreadable blob.

  * Crisp overhead 3/4 diagonal framing keeps both the incoming wall cutout and the contorting team on the dock visible simultaneously, anchored by a bold Japanese variety-show **`DRY SURVIVORS: 5 / 18`** scoreboard badge in the top corner.

* **Dynamic Camera Choreography:**

  * **Wall Reveal:** Dramatic low-angle look down the gleaming steel rails as the towering wall slides out of the fog gates with its neon cutout blazing.

  * **Pose Panic:** Smooth 3/4 front-side studio angle capturing both the shrinking gap and the devs twisting frantically into pose, paired with a quick **instant-replay freeze-flash** whenever a huge wave of 5+ devs gets dunked together.

  * **Final Cutout Climax:** Sweeping rail-side macro angle right beside the dock edge at $0.4\times$ slow motion as the final wall sweeps through the remaining finalists.

* **Synthesized Audio (Web Audio API):**

  * Unmistakable **hydraulic rail rumble & rising siren klaxon** (*"WOO-WOO-WOO!"*) as each wall accelerates down the track.

  * Hilarious variety-show **hollow styrofoam *BONK-THUD*** + crisp crumbling-foam crackle on wall impacts, immediately followed by a big juicy **swimming-pool *KER-SPLASH*** (low-pass filtered noise swell + bubbly water pops).

  * Classic Japanese game-show **correct-answer chime (*PIN-PON!*)** for clean passes, comedic descending trombone/buzzer (*BU-BUU!*) on wipeouts, and an energetic brass-and-synth variety-show victory fanfare when the last dry dev takes the crown.

## 5. Implementation Blueprint (Lightweight 3D Stack)

Designed for Three.js / WebGL using clean procedural pose-parameter matching and instanced foam/splash particles—no heavy 3D cloth, fluid, or mesh-boolean physics required:

1. **Fairness-First Pre-Roll & Cutout Choreography:**
   At round start, perform a fair $1 / N$ RNG roll to select the standup leader (plus 1–2 close finalists). Assign each decoy a scripted failure wall $w \in \{1, \dots, W\}$ and failure flavor (`LATE_POSE`, `WRONG_BAY`, `SOLID_TRAP`, or `GOALPOST_SHIFT`), while steering the pre-rolled winner smoothly toward an open bay with clean pose convergence (plus one dramatic `FOAM_GRAZE` close call for suspense).

2. **Procedural Limb-Pose & Clearance-Error Model:**
   Represent each wall cutout by a bay center $x_{\text{bay}}$ and a lightweight 4-DOF target pose vector $\vec{\psi}_{\text{target}} = (\theta_{\text{torso}}, \theta_{L\text{-arm}}, \theta_{R\text{-arm}}, \theta_{\text{legs}})$. As the wall advances along $z_{\text{wall}}(t) = z_{\text{start}} - v_{\text{wall}} t - \frac{1}{2} a_{\text{wall}} t^2$, smoothly damp each dev's articulated rig pose $\vec{\psi}_i(t)$ toward their attempted pose. At impact plane $z_{\text{wall}} = z_{\text{dock}}$, evaluate scalar clearance error $E_i$:

   $$
   E_i = w_x \left(\frac{x_i - x_{\text{bay}}}{W_{\text{tol}}}\right)^2 + w_\psi \left\Vert \vec{\psi}_i - \vec{\psi}_{\text{target}} \right\Vert^2
   $$

   * $E_i \le 0.75$: **Clean Pass (`PIN-PON!`)** — dev passes effortlessly through the glowing cutout.

   * $0.75 < E_i \le 1.0$: **Foam Graze (`KIRI-KIRI!`)** — dev clips the rim, spawns $12$ instanced white styrofoam chunks, wobbles near the back edge of the dock, and recovers safely.

   * $E_i > 1.0$: **Wall Crunch (`SPLASH!`)** — dev is swept backward off the dock into the dunk tank.

3. **Dunk-Tank Knockback & Buoyancy Bobbing:**
   When a dev fails clearance ($E_i > 1.0$), apply an immediate wall-matched knockback velocity and tumbling spin quaternion:

   $$
   \vec{v}_{\text{knock}, i} = -\hat{z}\,\kappa v_{\text{wall}} + \hat{y}\, v_{\text{pop}} + \hat{x}\,\xi_i
   $$

   Integrate under gravity $\ddot{y}_i = -g$ until the dev crosses the water plane $y = y_{\text{pool}}$, triggering a radial expanding splash ring + instanced water droplets before transitioning the dev into a lightweight sine-wave buoyancy bob ($y_i(t) = y_{\text{pool}} + A_{\text{bob}}\sin(\omega_b t + \phi_i)$) inside the pool for the rest of the round.

4. **Dynamic Cutout Geometry & Guaranteed On-Time Finale:**
   Build each wall cleanly in Three.js via `THREE.Shape` with punched `THREE.Path` holes (`ExtrudeGeometry`) so every cutout silhouette is crisp, genuinely hollow, and rendered in a single draw call. Schedule the final wall's rail crossing strictly at $0.90 \, T_{\text{round}}$ against the duration slider $T_{\text{round}}$ so the slow-motion final-boss splash and confetti fanfare always wrap right on schedule.