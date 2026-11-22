# Game Mode Spec: Kanban Plinko (3D Vertical Pinball)

**App:** Chesapeake Dev Derby

**Genre:** 3D Vertical Pinball / Pachinko Physics Gauntlet (2.5D Simulation)

**Player Count:** 2–30 players

**Duration:** Scales with existing 10s–120s slider

## Overview

**Kanban Plinko** drops all active developers as glowing marbles/pucks down a giant, tilted 3D vertical Kanban board. Instead of moving left-to-right across columns, devs tumble top-to-bottom through the software delivery lifecycle—ricocheting off dev-themed bumpers, spinners, and warp pipes—until one threads the needle past the final **LGTM** flippers into the **Prod / Lead Standup** slot.

### Core Design Principle: True 2.5D Physics Chaos

Unlike choreographed modes, Kanban Plinko thrives on genuine, unscripted physics. All marble collisions are calculated in a fast, jitter-free 2D plane (`x, y`) and mapped directly onto the tilted 3D arcade board, preventing marbles from popping out of the glass while supporting up to 30 simultaneous players effortlessly.

## 1. Vertical Board Layout (4 Swimlane Tiers)

1. **Zone 1: The Backlog (Spawn Hopper)**

   Active devs start as glowing spheres/pucks with floating nameplates bouncing inside a vibrating glass hopper at the top of the cabinet. When the round starts, the **Sprint Kickoff** trapdoor opens and dumps everyone onto the peg grid simultaneously.

2. **Zone 2: In Progress (The Peg Field)**

   A classic staggered pachinko grid of metallic pegs mixed with high-energy bumpers that break up clusters and randomize the pack.

3. **Zone 3: Code Review & QA (The Bottleneck)**

   The board narrows into 2–3 tight funnels guarded by spinning gates, friction pads, and side-wall warp pipes. Early leaders routinely get stalled here while stragglers slip past.

4. **Zone 4: Deploy to Prod (The Finish Funnel)**

   A wide V-shaped chute with active mechanical flippers at the bottom that bounce marbles back into play until one finally drops into the glowing **PROD / LEAD STANDUP** slot.

## 2. Dev-Themed Obstacles & Mechanics

Keep the obstacle set focused on 5 reusable prefabs so the board remains visually readable on a shared screen:

* **Scope Creep Bumpers** *(Round neon pop-bumpers)* — High restitution (`1.4x` bounce) that violently launches any marble sideways across the board with a light flash and synth chime.
* **Merge Conflict Spinners** *(Rotating 4-blade turnstiles)* — Slows down incoming traffic and creates pileups; marbles hitting the trailing edge get flung forward.
* **Tech Debt Sticky Pads** *(Amber friction strips)* — Briefly dampens a marble's velocity so trailing devs can overtake them.
* **"Moved to Next Sprint" Warp Pipes** *(Side-wall portals)* — Located on the far left and right edges of Zone 3. Any marble that falls in gets vacuumed up a clear pneumatic tube along the side of the cabinet and spit right back into **The Backlog** at the top.
* **LGTM Flippers** *(Bottom gatekeepers)* — Two rhythmic flippers flanking the final **Prod** slot. They fire on a staggered cadence so reaching the bottom first doesn't guarantee an instant win—you can still get batted back into a bumper at the last second.

## 3. Scaling with the Duration Slider (10s–120s)

Rather than slowing down gravity (which feels floaty), scale the **board geometry and loop rules** to match the selected round length:

| Duration | Board Variant | Pacing & Mechanics |
| :--- | :--- | :--- |
| **10s–15s** | *Hotfix Drop* | Short 2-tier board, steeper tilt, no warp pipes, wide Prod slot. Pure sprint from Backlog to Prod. |
| **30s** | *Standard Sprint* | Full 4-tier board with 1 pair of **Moved to Next Sprint** warp pipes and active **LGTM** flippers. |
| **60s–120s** | *Multi-Sprint Marathon* | Tall scrolling board (or 3-lap "Release Train" through **Dev -> Stage -> Prod** gates, or an **Elimination** mode where the *last* marble stuck on the board leads standup). |

## 4. Camera, Visuals & Audio Polish

* **Smart Lead-Follow Camera:**
  * Start framed on the **Backlog** hopper.
  * Smoothly pan down tracking the `Y`-position of the current top 3 marbles (with a slight zoom-out if the pack spreads wide).
  * Once any marble enters Zone 4, lock the camera onto the **Deploy to Prod** funnel for a photo finish.

* **Visual Readability for 2–30 Players:**
  * Color-code each marble with a faint motion trail and a crisp upright billboarded nameplate slightly above the sphere.
  * Display a mini **Live Leader Ticker** (e.g., `1st: Roscoe3 • In QA`) along the side bezel so the team can track leaders during fast ricochets.

* **Synthesized Pinball Audio (Web Audio API):**
  * Short wooden/metallic clicks on peg hits (pitch-shifted slightly upward as marbles descend deeper into the board to build tension).
  * Punchy synth *boings* on Scope Creep bumpers.
  * Rising pneumatic *whoosh* on Warp Pipes.
  * Classic mechanical bell + confetti burst when the Prod sensor triggers.

## 5. Implementation Safeguards (Avoiding Physics Traps)

Three lightweight guardrails keep pure physics from ever stalling a standup meeting:

1. **2.5D Math over Full 3D Colliders:**

   Run all collisions in 2D (`x, y` circle-vs-circle and circle-vs-capsule/segment), then map `(x, y)` onto the tilted 3D board plane. Fast, deterministic, and easy to tune without a heavy 3D physics engine.

2. **Anti-Stuck Micro-Nudge:**

   If any marble's speed stays below a minimum threshold for `0.6s`, apply a small random horizontal impulse (with a tiny `"Unblocking..."` tooltip) so nothing ever balances indefinitely on a peg or spinner.

3. **Hard-Cap "Force Push" Fallback:**

   If the round approaches the target duration without a winner, automatically widen the **Prod** slot, disable the **Moved to Next Sprint** warp pipes, and trigger a subtle downward gravity boost (*"Friday 4:55 PM Deploy"*) so the match always finishes right on time.