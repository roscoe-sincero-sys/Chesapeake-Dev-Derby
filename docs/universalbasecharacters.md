# Using free character models in wrestling mode

Analysis date: November 16, 2026. Scope: replace or improve the existing wrestling characters while preserving the app's battle royal and meeting-leader selection behavior.

## Recommendation and feasibility

**Yes. Universal Base Characters is a viable starting point for this app.** The existing Three.js renderer can display imported, skinned glTF characters without moving to another engine. Free assets can supply bodies, rigs, hair and some general animations. They will not supply the finished Mahabharata roster or all the wrestling choreography.

Recommended approach: use the free Standard pack, retain the existing scripted match and world-space movement, and adapt its procedural poses to the imported skeleton. Add custom clothing and accessories over a small number of shared bodies. Introduce reusable animation clips where they improve the result, rather than making the first release depend on a complete wrestling animation library.

Estimated effort for one developer comfortable with Three.js and Blender:

| Deliverable | Estimated hands-on effort | Approximate full-time duration |
| --- | ---: | ---: |
| Two-character feasibility prototype; not production ready | 12–24 hours | 1.5–3 working days |
| Generic wrestlers with simple colors/accessories, existing movement quality, loading and deployment integration | 48–80 hours total | 1–2 weeks |
| Recommended: all 12 existing characters, recognizable outfits, adapted poses, reliable grounding, deployment and verification | **120–210 hours total** | **3–5.25 weeks** |
| More polished roster with authored paired grapples/throws, better contact and transitions | 200–360 hours total | 5–9 weeks |

These are engineering estimates, not measured implementation times or vendor quotes. Each row is an alternative cumulative scope, not an amount to add to the other rows. One day means eight focused hours; review, interruptions and unfamiliarity with rigging extend calendar time. The recommended estimate includes the prototype and roughly 25% contingency. An experienced artist working alongside a developer could shorten elapsed time, but not necessarily total labor. Custom likenesses, realistic cloth simulation, facial animation and a physics-driven wrestling game are outside these estimates.

## What the app already has

Repository inspection found a useful separation between rules and visuals:

| Existing code | What it does | Implication |
| --- | --- | --- |
| [package.json](../package.json) | Depends on Three.js; installed version inspected is 0.170.0 | Loading skeletal models is supported by the existing rendering stack. |
| [public/js/wrestle-sim.js](../public/js/wrestle-sim.js) | Plans a 2–10-person match, assigns 12 distinct character kinds/styles, draws elimination order, and schedules match beats | Keep this logic intact. Character size and animation must not influence who wins. |
| [public/js/wrestlers.js](../public/js/wrestlers.js) | Builds bodies from primitive meshes; exposes hips, torso, head, arms and legs; poses them procedurally; creates labels | This is the main replacement/adapter boundary. Imported bone axes and rest poses will differ. |
| [public/js/wrestle.js](../public/js/wrestle.js) | Moves characters, stages grapples and ring-outs, animates special styles, places bodies on the floor, controls cameras | Preserve its timing and trajectories, but recalibrate contact, dimensions and pose handling. |
| [public/js/game.js](../public/js/game.js), [public/js/main.js](../public/js/main.js) | Start wrestling synchronously, return the lineup immediately, handle HUD/results and a no-WebGL draw | Asynchronous asset preparation needs an explicit loading step or a fallback. |
| [scripts/build-demo.mjs](../scripts/build-demo.mjs) | Copies public assets and only the Three.js core module into the static demo | Imported models will copy with public assets, but loader utilities and their dependencies need packaging changes. |
| [test/wrestle.test.js](../test/wrestle.test.js) | Checks fairness, character assignment, timing, feet touching the mat and bodies resting on the floor | Preserve behavior tests and adapt geometry checks for skinned bodies. |

This is a scripted battle royal, not a combat simulator. That makes the replacement substantially easier: no new gameplay AI, hit detection or physics engine is required. The current visual vocabulary includes overhead lifts, hip tosses, pushes, ducking, rope survival, tumbling, sitting, celebrations, illusion flicker and shapeshift scaling. A model that only walks is insufficient.

## What Universal Base Characters provides

The creator advertises six body bases in three proportions, male/female variants, interchangeable hair, humanoid rigs, glTF/FBX exports and about 13,000 triangles per character. These are neutral starting bodies, not twelve finished wrestlers. The creator explicitly associates editable Blender sources and customization shaders with the Source edition. [Quaternius product overview](https://quaternius.com/packs/universalbasecharacters.html)

The download listing distinguishes a free, name-your-own-price **Standard** archive (122 MB) from a **Source** archive (600 MB), currently priced at $19.99 or more. It lists CC0 licensing. This analysis assumes a $0 Standard download; purchasing Source is optional. [Official download listing](https://quaternius.itch.io/universal-base-characters)

**Unverified:** I inspected the official listings, not the downloaded archives or an imported model. Exact free body/hair inventory, bone names, material separation, exported clips and deformation quality remain prototype checks. Do not assume every item pictured in marketing is in Standard. The website's generic tier description also warns that only part of a pack may be free.

Paid engine-specific shaders are not a prerequisite: the app can use ordinary Three.js materials. However, changing skin independently from clothing or eyes depends on the exported material/texture layout. Blender can import an exported model for editing, but that does not recover every authoring convenience of the original source file.

Keep the chosen asset license files, download URLs and version information in an asset manifest/third-party notice. The app's Apache-2.0 license and third-party asset provenance should remain distinguishable. No purchase is assumed in the estimates.

## Other free options worth considering

| Asset | Useful contribution | Fit for this app |
| --- | --- | --- |
| Universal Base Characters Standard | Neutral humanoid bodies and hair | Best starting point if preserving the current roster and proportions matters; costumes still need work. |
| [Quaternius Ultimate Modular Men](https://quaternius.com/packs/ultimatemodularcharacters.html) | Creator lists 11 characters, four interchangeable model parts per character, 24 animations and CC0 | Useful alternative for a more stylized modular cast. Existing outfits may be less suitable; skeleton compatibility with the newer Universal packs must be checked rather than assumed. |
| [KayKit Adventurers Free](https://kaylousberg.itch.io/kaykit-adventurers) | Five rigged characters, basic movement and accessories; glTF/FBX; CC0 | A strong option for generic fantasy wrestlers. Its stock silhouettes/costumes change the visual direction, and five bases still need customization to distinguish all twelve roles. Extra characters and Blender sources are separate paid tiers. |
| Keep the current procedural bodies | Existing costumes, poses, zero character downloads | Lowest integration risk. Improving faces, silhouettes or mesh construction may be preferable if the desired improvement is modest. It will retain the assembled-shapes aesthetic unless substantial modeling changes follow. |

Universal Base Characters is the strongest fit for retaining the current character identities. KayKit could reduce initial art work if generic fantasy characters are acceptable, but it does not remove skeletal integration or wrestling animation work. Mixing several unrelated rigs is likely to increase effort; pick one body/rig family first.

## Character creation work

The current roster's identity comes from much more than body color. Existing `LOOKS` definitions provide an art checklist:

| Character | Proposed customization over a shared base |
| --- | --- |
| Bhima | Broad adult body, saffron dhoti, sash, mustache, crown band, mace |
| Jarasandha | Broad body, maroon/gold costume, beard, tall crown, seam detail |
| Duryodhana | Blue costume, jeweled crown, golden mace, cape |
| Kichaka | Heavy body, green costume, mustache, sword |
| Arjuna | Lean body, distinctive crown/hair, bow and quiver |
| Karna | Crimson/gold costume, fitted armor, earrings and sun motif |
| Abhimanyu | Smaller youthful silhouette, lighter costume/accessories |
| Ghatotkacha | Large silhouette, wild hair, tusks, amulet; preserve illusion effect |
| Hidimbi | Female base, choli/skirt, jewelry/hair; preserve shapeshift effect |
| Dushasana | Distinct palette, facial hair and headgear consistent with the current look |
| Shikhandi | Preserve the existing silhouette, outfit and shield identity |
| Satyaki | Lean base, distinctive palette and feather/headgear |

These are proposed asset assignments, not claims that the free pack contains those costumes. Avoid twelve independent models: start with two or three appropriate bases and share costume/prop meshes and materials where practical. Differences in silhouette, hair, headgear and equipment should make characters readable at normal camera distance, alongside the existing name labels.

Rigid items such as crowns, earrings and weapons can attach to bones. Dhoti panels, skirts, fitted armor and capes need fitting and sometimes skin weights so crouches, raised arms and seated poses do not visibly tear or intersect the body. Existing primitive accessories can be reused initially, but their placement and scale need adjustment. Start with simplified weighted garments; cloth simulation would be a separate scope expansion.

## Animation strategy and technical changes

1. **Audit and normalize the assets.** Import the free files into Blender; inspect skinning and export a small self-contained GLB. Normalize height, origin and facing direction to the app's floor-level root and -Z forward convention. Store visual normalization below an outer gameplay transform so throws and shapeshift scaling continue to work predictably.

2. **Add local loading and caching.** Use `GLTFLoader`, provided as an explicit Three.js addon. Clone skinned hierarchies with `SkeletonUtils.clone`, not a plain scene clone. Both utilities exist in the installed 0.170.0 package. Share immutable geometry/textures, and clone materials only when independent tinting is needed. [Official GLTFLoader documentation](https://threejs.org/docs/pages/GLTFLoader.html)

3. **Adapt the existing pose interface first.** Map `guard`, `crouch`, `armsForward`, `armsUp`, `flail`, `sit`, `lean` and other pose parameters onto named bones. Apply calibrated quaternion offsets relative to the bind/rest pose. Copying the current Euler values directly will produce incorrect results on a differently oriented skeleton. This preserves existing scripted behavior while reducing initial animation-authoring requirements.

4. **Use clips selectively.** Idle, walk and celebration are good candidates for reusable clips. The free [Universal Animation Library Standard](https://quaternius.itch.io/universal-animation-library) is a candidate; its listing separates Standard from paid Pro/Source editions, so the advertised 120+ animations should not be treated as the free inventory. Recent release notes describe updated rig naming and both root-motion and no-root-motion variants. Verify the actual chosen versions together. Use in-place locomotion because the current match already moves character roots.

5. **Treat paired wrestling as custom choreography.** Generic combat animations do not establish synchronized hand contact, a two-person lift or a rope reversal. Keep scripted roots and approximate poses for the first release; author paired clips or add limited IK/contact correction for higher polish. Synchronize both performers to the existing grapple/throw durations. If mixing clips and procedural offsets, define update order and bone ownership so the animation mixer does not overwrite pose corrections.

6. **Replace grounding assumptions.** `legReach()` hard-codes the current limb dimensions. More critically, `lowestBodyPoint()` reads raw mesh vertices transformed by `matrixWorld`; that does not account for skeletal deformation. Use foot/contact markers or calibrated proxy volumes for routine grounding, and deformed vertex sampling for accurate validation or occasional corrections. The installed `SkinnedMesh.getVertexPosition()` applies bone deformation. Update bones/matrices before sampling, and continue excluding carried gear from floor support. Avoid scanning every vertex of all ten characters every frame.

7. **Handle loading and lifecycle.** Preload before starting the match clock, show progress, and prevent duplicate starts. Either keep construction synchronous after preparation or propagate async changes through `startWrestle()` and its caller. If assets fail, use the procedural roster without drawing a new match plan. Cancel stale loads after quitting. Stop/uncache mixers, release instance resources, and dispose shared assets only when their cache is released.

8. **Package and serve everything.** Add a relative `three/addons/` import-map prefix; copy required addon modules and their transitive dependencies into the demo vendor directory. `GLTFLoader` in the installed package imports `BufferGeometryUtils`, so copying just the loader is insufficient. Keep URLs compatible with GitHub Pages subdirectories and account for model cache invalidation. Add `.glb`/`.gltf` MIME entries to `server.js`; its existing binary fallback can serve bytes, but explicit types are preferable. Self-host the assets rather than relying on the creator's download host during a match.

## Performance and delivery risks

Ten bodies at the advertised average represent roughly **130,000 body triangles**, before hair, clothes, accessories, crowd and additional shadow rendering. That is a plausible desktop starting point, not a performance guarantee. Material count/draw calls, bone updates, textures, CPU contact checks and the existing arena/crowd may matter more than triangle count alone.

Export only the used models, hair, materials and clips; do not ship the 122 MB download archive. Measure actual output size and decoding cost before setting a download budget. Prefer a few shared materials and modest textures. Profile a full ten-person match on a representative work laptop, ideally while screen sharing. Start with ordinary GLB; add compression only if measurements justify the decoder and packaging complexity.

The largest uncertainties are free-tier contents, costume deformation, contact between differently proportioned bodies, and the desired animation quality. If suitable female/large bodies or clothing foundations are missing, additional modeling is necessary and the low end of the estimate becomes unlikely.

## Recommended work breakdown

| Workstream | Base estimate |
| --- | ---: |
| Asset audit and two-character prototype | 12–24 hours |
| Loader/cache, independent skeleton instances, loading/failure flow | 12–20 hours |
| Bone pose adapter, grounding and throw calibration | 20–32 hours |
| Shared costume/accessory kit and all 12 character variants | 24–48 hours |
| General clips, transitions and character-specific effects | 8–12 hours |
| Static/server packaging, provenance and lifecycle handling | 8–12 hours |
| Regression checks, browser review and performance fixes | 12–20 hours |
| **Base total** | **96–168 hours** |
| **Planning total with approximately 25% contingency** | **120–210 hours** |

For the higher-polish option, budget additional work for authored paired actions and contact refinement; do not assume the free animation download supplies it. Learning Blender skinning/retargeting during implementation also increases effort.

## Prototype acceptance and implementation decision

Before committing to the full roster, prove the following with one larger male character and one female or smaller character:

- Free assets load through the local server and a static build served beneath a URL subdirectory.
- Two instances animate independently and retain independently configurable materials.
- Guarding, crouching, overhead lifting, a ring-out, lying flat, sitting, rope survival and celebration work with plausible floor contact.
- The same planned winner, elimination order and beat timing survive the visual replacement and an asset-loading failure.
- A ten-instance stress scene has acceptable frame pacing and memory behavior, including after several quit/restart cycles.
- The free archive's actual contents and the outfit work needed for all twelve characters are recorded.

If that succeeds, proceed with the shared costume kit and full roster. For implementation verification, retain the seeded match/fairness tests, adapt foot/body contact tests to the new rig, add meaningful checks for independent skeletons and failed loading, and review the complete performance visually in a browser. Node tests alone cannot establish believable grappling or artifact-free clothing.

**Decision:** feasible with $0 asset purchases. Plan around **120–210 hours** to preserve the twelve-character identity and existing behavior at a solid stylized quality. Start with a **12–24-hour prototype** to validate the free files and the skeletal pose/grounding approach before building the rest of the roster.

At the time of this initial analysis, no asset archive had been imported, no runtime prototype had been implemented, and no performance benchmark had been run.

## Prototype implementation follow-up

The two-character free prototype is now implemented; see [implementation notes](wrestling-prototype.md).
Archive inspection confirmed that Standard contains only the male/female Superhero bodies, not the
Regular or Teen bases. Ghatotkacha and Abhimanyu therefore use the free male mesh with different
proportions, hair, skin treatment, weighted clothing and accessories. No paid content is used.
The studio is available at `character-prototype.html` and from the lobby's preview link.

The follow-up implementation now covers all twelve characters. Hidimbi uses the free female
body; the others use fitted male bases. The shared model builder is `public/js/wrestler-models.js`
and the costume recipes are in `public/js/wrestler-looks.js`. The studio can compare any two
characters. See [models.md](models.md) to recreate Arjuna from the original free archive.

Full hardware-accelerated performance testing subsequently validated twelve concurrent
wrestlers, and the normal limit is now twelve. See the [performance report](wrestling-performance.md)
for repeated ten-versus-twelve measurements and the live test page.
