# Game Mode Spec: The Claw of Destiny

**App:** Chesapeake Dev Derby  
**Genre:** 3D Arcade Claw Machine (Choreographed Physics Spectacle)  
**Player Count:** 2–30 players  
**Duration:** Scales with existing 10s–120s slider  

---

## Overview

**The Claw of Destiny** packs all active developers into a glass 3D arcade cabinet as bobblehead/gachapon capsules. An overhead mechanical claw—labeled **THE STANDUP**—hovers, fakes out a few devs, drops into the pile, and scoops up a cluster of 2–4 people. As it rises toward the prize chute, decoy capsules slip out one by one with dev-themed excuses until the sole survivor drops down the hatch to lead standup.

The face of the boobleheads come from the reference images used for the Standup Deathmatch.

### Core Design Principle: Choreographed Physics
Pure physics claw machines are notorious for whiffing completely or grabbing zero capsules. Instead, the round **pre-rolls the winner (and 1–3 decoys) using fair RNG** at the start of the round, then uses the 3D engine to act out the drama. This guarantees a clean, suspenseful finish that respects the duration slider every single time.

---

## 1. The 4-Phase Round Flow (10–15s Mode)

1. **Phase 1: The Hunt (0–3s)**  
   The overhead gantry whirs across the X/Z rails while a circular spotlight scans the pile of dev capsules below. The claw hovers over a random dev, pauses just long enough to make them sweat, then fakes out and zips over to the real target cluster. Capsules inside the spotlight jitter and rattle.
2. **Phase 2: The Scoop (3–6s)**  
   The cable drops with a pneumatic hiss. The 3-pronged claw opens, buries itself in the pile, and clamps down on the pre-rolled winner plus 1–3 adjacent "decoy" devs (scaled to team size).
3. **Phase 3: The Ascent & Heartbreak (6–10s)**  
   As the claw rises and sways toward the prize chute, the decoys fall out one by one with floating dev-excuse popups:
   * *Immediate slip:* **"Blocked by Common Sense"** or **"In another meeting"** or **"SSL Certs Expired"** 
   * *Mid-air tumble:* **"Was not clear"** or **"Had URL Modified"**
   * *Rim bounce (right at the chute):* **"Testing in production"** or **"Rolling back server clock"** or **"Busy scrolling 800 columns"**
4. **Phase 4: The Drop (10–12s)**  
   The claw opens directly over the glowing prize chute. The sole survivor drops down the hatch, triggering flashing cabinet LEDs, a retro arcade siren, and the winner banner.

---

## 2. Scaling with the Duration Slider (10s–120s)

Rather than simply slowing down the animation for longer durations, the claw machine scales its mechanics to match the selected round length:

| Duration | Mode Variant | Pacing & Mechanics |
| :--- | :--- | :--- |
| **10s–15s** | *Quick Grab* | 1–2 quick fake-outs, single drop, 2 decoys slip on the way to the chute. |
| **30s** | *Rigged Arcade* | 2 attempts. Attempt 1 has classic "weak arcade grip"—lifts a dev 90% of the way before dropping them (*"500 Internal Server Error"*). Attempt 2 lands the winner. |
| **60s–120s** | *Elimination Pit* | Multi-drop tension. Failed grabs knock capsules around the pile, or the claw pulls "safe" devs out of the machine until a final sudden-death grab decides the leader. |

---

## 3. Visual, Audio & Dev-Humor Polish

* **Cabinet Details:**  
  * Top marquee reads **THE ALGORITHM** or **STANDUP-O-MATIC**.  
  * Glowing coin slot displays `INSERT STORY POINTS`.  
  * A 3D arcade joystick at the base jiggles automatically in sync with the gantry's X/Z movement.
* **Capsule Design:**  
  * Clear gachapon spheres containing each dev's color, avatar, or bobblehead inside, paired with a clean billboarded nameplate that stays readable in a crowded pile.  
  * *Cooldown Touch:* Devs sitting out on cooldown can be displayed sitting on a tiny "VIP Lounge" shelf outside the glass.
* **Dynamic Camera Cuts:**  
  * Start with a 3/4 wide shot of the cabinet.  
  * Zoom in slightly during the grab.  
  * Snap to a dramatic low-angle **"Chute Cam"** looking straight up at the claw as the final capsule drops past the rim.
* **Synthesized Arcade Audio (Web Audio API):**  
  * Stepper-motor whirs for X/Z gantry travel.  
  * Pitch-dropping slide whistle when a decoy slips.  
  * Metallic *clank* on a chute rim bounce.  
  * 3-note chiptune fanfare when the chute sensor trips.

---

## 4. Implementation Blueprint (Lightweight 3D Stack)

Designed for Three.js / WebGL with a lightweight physics engine or custom spring math:

1. **Pit Settling (Lobby State):**  
   Spawn all active devs as rigid spheres/capsules above the pit before the user hits Start so they naturally tumble and settle into a realistic pile during the lobby screen.
2. **Guided Claw Target:**  
   On round start, read the current `(x, y, z)` coordinates of the pre-rolled winner's capsule and steer the overhead gantry directly above it (after 1–2 fake-out waypoints).
3. **Fake-Physics Attachment:**  
   When the prongs close, temporarily parent the winner and the 1–3 nearest decoy capsules to the claw bone with a subtle wobble animation.
4. **Timed Releases:**  
   At predetermined timestamps (e.g., `t = 6.5s`, `t = 8.2s`), detach the decoys and hand them back to the physics engine with a small outward impulse so they bounce naturally off the pile or the chute rim while the winner rides cleanly to the drop zone.