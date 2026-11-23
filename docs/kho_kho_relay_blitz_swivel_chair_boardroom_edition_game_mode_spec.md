# Game Mode Spec: Kho-Kho Relay Blitz (Swivel-Chair Boardroom Edition)

**App:** Chesapeake Dev Derby

**Genre:** 3D Office-Chair Directional-Lock Tag & Relay Ambush Chaos (Swivel-Launch & Caster-Drift Physics)

**Player Count:** 2–30 players

**Duration:** Scales with existing 10s–120s slider

## Overview

A corporate workplace reskin of **Kho-Kho Relay Blitz** that transplants North India's lightning-fast schoolyard chase straight into a sleek, late-evening Indian IT conference room. Down the center of the glass-walled boardroom runs a narrow, neon-underlit **Conference Table Spine** lined with eight alternating leather **Executive Swivel Chairs** facing North and South (`N–S–N–S–N–S–N–S`), anchored at opposite ends of the room by a **Rolling Projector Cart** (*West Post*) and a rattling **Stainless-Steel Chai & Samosa Trolley** (*East Post*).

All active developers sprint around the low-pile blue office carpet weaving between the seated swivel chairs and grabbing the two rolling carts to execute crisp $180^\circ$ **Cart-Whip Reversals**. Hunting them down is a furious, caffeine-powered active chaser (**`P1 ESCALATION`**) rolling on glowing neon caster wheels—strictly locked to one half of the room and one direction along the table spine until it slaps the leather backrest of a seated teammate shouting **`KHO!`**. Instantly, the slapped colleague's chair whips $180^\circ$ on its hydraulic cylinder and rockets sideways out from under the table like a spring-loaded missile across the carpet. Tagged runners get spun into a dizzy chair timeout (`REASSIGNED TO P1!`) until the last elusive survivor beats the meeting buzzer—or the very first runner ambushed leads standup in **`FIRST ESCALATION`** mode.

### Core Design Principle: Hydraulic Swivel-Ambush Comedy & Shared-Engine Reskin

Built directly on top of the exact same lightweight half-plane kinematics as the outdoor *maidan* **Kho-Kho Relay Blitz**, this boardroom edition swaps chalk lines for glowing floor cable-trays and turns every **`KHO!`** handoff into pure office-chair slapstick—complete with squeaky caster-wheel drifts, scattering sticky notes, and dramatic $180^\circ$ whips around the *cutting chai* trolley.

## 1. The 4-Phase Round Flow (10–15s Mode)

1. **Phase 1: Pull Up the Swivel Chairs — `MEETING STARTING!` (0–2s)**
   Overhead fluorescent-and-amber boardroom fixtures flicker on while eight AI **On-Call Bench** devs lock into alternating leather swivel chairs along the central conference table, projecting glowing directional laser chevrons onto the office carpet. Active dev runners stretch beside the Projector Cart and Chai Trolley as brisk *tabla*-synth office beats kick in.

2. **Phase 2: First Whistle & Carpet Sprint — `BHAAGO!` (2–5s)**
   The conference-phone chime blasts and the active **`P1 ESCALATION`** chaser launches down the South Aisle on screeching caster wheels. Runners vault over taped-down power strips and dart between swivel chairs—until the chaser slaps Chair 3's backrest (**`KHO!`**), spinning a fresh colleague sideways straight across the North Aisle to blindside 3–4 runners before they can pivot.

3. **Phase 3: Rapid `KHO!` Swivel-Chains & Cart-Whips (5–9.5s)**
   The conference room erupts into a blur of spinning armrests and fluttering whiteboard markers (`KHO!` $\to$ `KHO!` $\to$ `KHO!`). Agile runners grab the steel handle of the **Chai Trolley** at full speed, whipping $180^\circ$ into the opposite aisle while *cutting chai* cups clink furiously behind them—while decoy runners fall for a sneaky **Fake `KHO!` (*Jhoota Kho* Chair-Feint)** and sprint directly into a waiting armrest.

4. **Phase 4: Final Projector-Cart Whip Photo Finish (9.5–12s)**
   Only two or three finalists remain sprinting past the glowing glass whiteboard wall as a frantic triple-`KHO!` relay closes from both aisles. Time dips to $0.4\times$ slow motion for a low carpet-level shot: the chaser lunges forward off a rolling swivel chair in a full horizontal **Diving Tag (*Tappaa*)**, brushing the runner-up's lanyard in a shower of yellow sticky notes while the winning dev whips cleanly around the **Projector Cart** as the Outlook meeting-end chime rings—triggering ceiling-fan confetti and **`DODGED THE ESCALATION — LEADS STANDUP!`**

## 2. Boardroom Maneuvers, Office Hazards & Dev-Humor Catalog

Floating sticky-note and Outlook-toast popups turn every swivel-chair ambush, squeaky caster drift, and fake-out bluff into a classic Indian conference-room inside joke:

* **The `KHO!` Swivel-Spin Launch** *(Chaser slaps a leather chair back; the seated dev whips* $180^\circ$ *and rockets across the carpet at* $2\times$ *speed)*

  * *Popups:* `"KHO! Ticket silently reassigned to you!"`, `"zorkoi security feature dubai dile prod"`

* **Fake `KHO!` (*Jhoota Kho* Armrest Bluff)** *(Chaser reaches toward a chair back then pulls away, baiting a runner straight across the table spine)*

  * *Popups:* `"एकमेव साहेब blames you for not being clear"`, `"ஒரே தலைவர் derailed by common sense again"`

* **Diving *Tappaa* Lanyard Tag (`ASSIGNED P1!`)** *(Full horizontal dive from a rolling office chair snags a runner mid-stride)*

  * *Popups:* `"Rolling back the சர்வர் நேரம்"`, `"Time travel ಸೇವೆಯಾಗಿ"`

* **Floor Cable-Snake & Jammed Caster Stumble** *(A runner trips over a glowing orange extension cord or a rogue HDMI dongle taped to the carpet)*

  * *Popups:* `"হোঁচট খেলাম by SQL Server group policy"`, `"Swatahchya jababdarivar!! Tables secretly hotfixed from scratch"`

* **Speakerphone `MeghJwala` Double-Escalation** *(The Polycom phone flashes crimson `"VP JOINED THE CALL!"`, temporarily unleashing TWO active rolling chasers for* $2.5\text{ s}$*)*

  * *Popups:* `"Blocked by MeghJwala 502"`

* **Optional Mode Toggle — "Last Untagged Dev" vs. "`ASSIGNED P1!` (First Tagged)":**

  * **Elusive Champion Mode (Default):** Outlast the relentless swivel-chair `KHO!` relay chain until the meeting chime sounds to lead standup.

  * **First Tagged Mode (`ASSIGNED P1!`):** Flip the rule so the very first dev caught by a chair-spin ambush gets slapped with a giant glowing **`ON-CALL OWNER — LEAD STANDUP!`** badge for an instant 10-second comedy round.

## 3. Scaling with the Duration Slider (10s–120s)

Rather than slowing down the chair launches, scale the **conference-table chair count, relay cooldown tempo, and boardroom twist waves** to match the selected timer cleanly:

| Duration | Mode Variant | Pacing & Mechanics | 
| ----- | ----- | ----- | 
| **10s–15s** | *Quick Huddle Blitz* | Compact 6-chair huddle room with snappy $0.6\text{ s}$ **`KHO!`** cooldowns, clearing a 20-dev roster rapidly into a crisp Projector-Cart photo finish right at the buzzer. | 
| **30s** | *Full 8-Chair Executive Boardroom* | Regulation 8-chair conference spine with spacious carpet turnarounds behind the Projector Cart and Chai Trolley, featuring two **`JHOOTA KHO`** armrest bluffs and one **`"VP JOINED"`** double-chaser surge. | 
| **60s–120s** | *3-Meeting All-Hands Gauntlet* | Multi-round elimination (**Meeting 1: Morning Standup**, **Meeting 2: `PanganodUlbo` UPS Flicker** where emergency exit lights illuminate the carpet lanes, **Meeting 3: Sudden-Death Twin-Escalation Finals**). Tagged devs roll backward to the glass wall holding glowing *cutting chai* cups cheering until one survivor clears the final chime. | 

## 4. Visual, Camera & Audio Polish

* **Dark-Mode Friendly Late-Evening Indian Boardroom Aesthetic:**

  * Deep midnight-slate geometric office carpet accented by glowing cyan floor cable-trays marking the **Central Spine** and aisle lanes, framed by frosted glass office walls, a glowing whiteboard scribbled with chaotic microservices diagrams, and a soft amber glow from the corridor outside.

  * **The Central Spine & Swivel Chairs:** Sleek matte-walnut conference table strip dotted with laptops and coiled dongles; tucked neatly along alternating sides are eight high-back black leather swivel chairs with glowing under-seat directional chevron LEDs indicating their North/South launch vector.

  * **The Twin End Posts (*Carts*):** At the West end sits a glowing **Projector Cart** projecting a live countdown onto the far wall; at the East end stands a gleaming **Stainless-Steel Chai & Samosa Trolley** whose glasses bounce and rattle whenever a runner executes a $180^\circ$ Cart-Whip.

* **Readability for 2–30 Players:**

  * A crisp elevated 3/4 overhead conference-room camera frames both aisles, all eight alternating chairs, and both rolling carts cleanly—with the ceiling and overhead fan rendered semi-translucent/clipped out of the camera frustum so nothing ever blocks sightlines.

  * Active runners wear bright office-casual team hues with upright billboarded nameplates, contrasted sharply against the dark-charcoal-and-gold blazer uniforms of the seated **On-Call Bench** and the blazing neon-amber caster-wheel sparks trailing behind the active chaser.

  * A compact **`DODGED: 5 / 22 • KHO CHAIN: 6x`** badge sits pinned to the top corner alongside an Outlook-style meeting countdown clock (`0:04 LEFT`).

* **Dynamic Camera Choreography:**

  * **Opening Glide:** Low carpet-skimming dolly right down the row of alternating swivel chairs toward the glowing Chai Trolley.

  * **Active Chase:** Smooth overhead 3/4 room tracking gently leading the active chaser, delivering a crisp micro-zoom kick on every **`KHO!`** chair-spin burst and a $35\text{ ms}$ freeze-frame flash on diving lanyard tags.

  * **Cart-Whip Finale:** Dramatic low-angle curve beside the glowing Projector Cart at $0.4\times$ slow motion as the final diving *Tappaa* misses the winner's shoulder by an inch.

* **Synthesized Audio (Web Audio API):**

  * Distinct **leather-backrest slap `KHO!` + hydraulic chair *WHOOSH-SQUEAK***: sharp palm-slap transient ($1.6\text{–}3.6\text{ kHz}$), punchy pneumatic cylinder hiss, and high-pitched caster-wheel screech rising in pitch across combo chains.

  * Rapid carpet-sneaker squeaks during lane cuts, plus a bright metallic **chai-glass *CLINK-RATTLE*** whenever a runner whips around the East Trolley.

  * Familiar dual-tone **Outlook calendar reminder chime** for the opening whistle and sudden **`"VP JOINED"`** surges, layered over an energetic *tabla*-and-synth beat that pops into a triumphant victory fanfare at `00:00`.

## 5. Implementation Blueprint (Lightweight 3D Stack)

Designed as a **zero-rewrite reskin** of the base **Kho-Kho Relay Blitz** Three.js engine, sharing the exact half-plane state machine while layering lightweight office-chair spin and caster-drift polish:

1. **Shared Fairness-First Pre-Roll & Half-Plane Lock Engine:**
   Reuse the identical $1 / N$ RNG pre-roll, decoy intercept scheduler, and strict directional-lock equations along the central table spine ($z = 0$, $x \in [-L/2, L/2]$) with alternating seat sides $s_k = (-1)^k \in \{+1, -1\}$:

   $$
   \text{sign}(v_{cx}) = d_c, \qquad \text{sign}(z_c) = h_c \quad \text{for } \vert x_c \vert < \frac{L}{2}
   $$

2. **Swivel-Chair Hydraulic Launch & Caster-Drift Yaw:**
   Upon a **`KHO!`** transfer at chair $k$, trigger a snappy damped $180^\circ$ rotational burst on the chair mesh while launching the new chaser into half-room $s_k$ with subtle carpet caster drift angle $\delta_{\text{drift}}$:

   $$
   \theta_{\text{chair}, k}(t) = \theta_{0, k} + \pi\left(1 - e^{-\alpha t}\cos(\beta t)\right), \qquad \vec{v}_{\text{launch}} = \bigl(d_{\text{target}}\, v_{\text{sprint}},\; s_k\, v_{\text{burst}}\bigr)
   $$

   Emit tiny neon-amber sparks beneath the active chaser's caster wheels whenever lateral turn rate $\vert \dot{\psi}_c \vert$ exceeds drift threshold $\omega_{\text{drift}}$.

3. **Cart-Whip Orbit & Visual Rattle Feedback:**
   Treat the West **Projector Cart** ($\vec{p}_W = (-L/2, 0)$) and East **Chai Trolley** ($\vec{p}_E = (+L/2, 0)$) as the two circular swing posts of radius $R_{\text{cart}}$. When a runner locks into `CART_WHIP`, orbit at $\omega_{\text{whip}} = v_{\text{run}} / R_{\text{cart}}$ for $\Delta \theta = \pi$ and apply a damped rotational wobble $\phi_{\text{cart}}(t) = A_0 e^{-\zeta t}\sin(\omega_n t)$ to the cart mesh so its projector beam or chai glasses visibly jiggle without any rigid-body physics overhead.

4. **Drop-In Theme Asset Swap & Hard-Cap Finale:**
   Abstract the court environment into a single theme config (`theme: 'maidan' | 'boardroom'`) swapping only the ground shader, post meshes (teak poles vs. projector/chai carts), seated props (chalk squares vs. swivel chairs), and audio banks. Keep the identical $0.72 \, T_{\text{round}}$ double-chaser sweep and $0.91 \, T_{\text{round}}$ slow-motion final diving tag so both themes run on one clean codebase and always wrap right on schedule.