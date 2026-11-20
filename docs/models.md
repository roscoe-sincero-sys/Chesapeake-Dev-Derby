# Make a wrestling character: Arjuna

This guide recreates **Arjuna in this app**, starting with a free body and adding his costume,
hair, crown, jewelry, bow and arrows. The body and skeleton come from Quaternius; the costume
and equipment are built with JavaScript. You do not need to sculpt a human body yourself.

The finished character is assembled when the app runs. There is no separate `arjuna.glb`:
the reusable body/hair files, a character recipe and the model-building code make the character.

## 1. Get the tools

| Tool | What it does | Where to get it |
| --- | --- | --- |
| Node.js and npm | Install Three.js and run the app | [Node.js download](https://nodejs.org/en/download). Choose an LTS release. |
| A text editor | Edit the character recipe and shapes | [Visual Studio Code](https://code.visualstudio.com/download) is a free option; another plain-text editor also works. |
| Python 3 | Run the asset-preparation script | [Python download](https://www.python.org/downloads/). These assets were prepared with Python 3.14. |
| Pillow | Resize the model textures | Install using the command below; [official installation instructions](https://pillow.readthedocs.io/en/stable/installation/basic-installation.html). |
| A browser with WebGL | View, rotate and test the character | [Chrome](https://www.google.com/chrome/) or [Firefox](https://www.mozilla.org/firefox/new/). Browser checks for this project used Chrome. |
| Three.js | Load the body, build clothes/props and animate the skeleton | Installed by this repository's `npm ci`; [Three.js website](https://threejs.org/). This app currently uses 0.170.0. |
| Free character pack | Supplies the body, skeleton, hair and skin textures | [Universal Base Characters by Quaternius](https://quaternius.itch.io/universal-base-characters). Download **Standard**, not Source. |

The commands below use Windows PowerShell, which comes with Windows. Open a terminal in your
copy of this repository, in the folder containing `package.json`. In VS Code, **Terminal → New
Terminal** opens one. On macOS/Linux, use `npm` wherever the guide says `npm.cmd`.

## 2. Download and prepare the free body

1. On the Quaternius page, click **Download Now**. If a donation dialog appears, continue without paying.
2. Download `Universal Base Characters[Standard].zip`. Keep it as a ZIP; the script reads it directly.
3. In the terminal, install the app dependencies and Pillow:

```powershell
npm.cmd ci
python -m pip install Pillow
```

4. Run the asset-preparation script. Replace the example ZIP path with your own:

```powershell
python scripts/prepare-wrestler-assets.py "C:\Users\YOUR_NAME\Downloads\Universal Base Characters[Standard].zip"
```

The script writes ready-to-load files into `public/assets/wrestlers/`. For Arjuna, the important
ones are `superhero-male.glb`, `hair-long.glb` and `skin-light.png`. The script also prepares the
female body and beard used by other characters, fixes two upstream texture filenames, caps
textures at 1024 pixels, and saves the original license and a file manifest.

The checked-in assets are already prepared, so someone only changing a costume can skip this
step. It is included here so the character can be rebuilt starting from the original download.
The tested archive is identified in [the manifest](../public/assets/wrestlers/manifest.json).

## 3. Give Arjuna his own recipe

Open [public/js/wrestler-looks.js](../public/js/wrestler-looks.js). Find the `arjuna` entry in
`WRESTLER_LOOKS`. To recreate it from a blank recipe, use this entry; replace the existing entry
rather than adding a second `arjuna`:

```js
arjuna: {
  height: 2.42, width: 0.96, depth: 0.98,
  skin: '#c59777',
  cloth: '#e5b52b',   // yellow pitambara / dhoti
  trim: '#b72f37',    // red border
  sash: '#2462a5',    // blue angavastram
  hair: 'long',
  crown: 'mukuta',
  gem: '#3ca775',
  mustache: 'thin',
  weapon: 'bow',
  description: 'Yellow pitambara with red trim, a blue angavastram, pointed crown, Gandiva bow and a quiver of arrows.',
},
```

Save the file. These values choose his proportions, materials and accessories. `height` is in
game units. `width` and `depth` stretch the base relative to that height. `skin` tints the skin
texture; it is not the final on-screen color because lighting and the texture also affect it.

For a quick first experiment, change only the sash color, reload the preview, then restore blue.

## 4. Assemble his costume

Open [public/js/wrestler-models.js](../public/js/wrestler-models.js). The function
`createWrestlerRig()` reads the recipe and does the construction. Arjuna uses these pieces:

| Piece | How the code makes it |
| --- | --- |
| Body | Clones the free male skeleton and mesh. It fits the body to the recipe and removes body triangles hidden beneath the dhoti, preventing skin from poking through. |
| Dhoti | `LatheGeometry` makes two loose trouser legs and the outer wrap. `panel()` adds pleated front fabric and red trim. |
| Blue sash | A narrow, subdivided `PlaneGeometry` runs diagonally across the torso. |
| Hair | The free long-hair mesh is fitted to the head and attached to `Head`. |
| Crown | The `mukuta` branch places small gold cones around the headband, with a taller central point and green jewel. |
| Jewelry | Torus shapes make bands, bracelets and earrings; a tube curve makes the necklace. |
| Mustache | Small dark ellipsoids sit above the mouth. |

For cloth, `surfaceWeights()` finds nearby body vertices and copies their bone influences.
`skinned()` binds the new geometry to the imported skeleton. That is what makes the costume bend
with the legs and torso. The recipe's colors are applied with `MeshStandardMaterial`.

For rigid pieces, `ornament()` places the object in the base body's coordinates, then attaches it
to a bone. Use `Head` for a crown, `pelvis` for a belt and `spine_03` for carried equipment.

You can keep the shared construction unchanged when making a color/accessory variant. To change
the actual cut of the dhoti, edit its radius/height points or the `panel()` dimensions. Those
shared shape changes affect the other characters too; add an Arjuna-specific condition if the
change should apply only to him.

## 5. Add Gandiva and the quiver

The recipe's `weapon: 'bow'` calls `addBow()` in `wrestler-models.js`. That helper builds:

1. **The curved bow:** a brown `TubeGeometry` following a curve of control points.
2. **The string:** a very thin tube joining the two ends.
3. **The quiver:** a brown cylinder, with a top radius of `0.058`, bottom radius of `0.05` and height of `0.48`.
4. **Five arrows:** thin shafts topped with small feather shapes.

The bow uses a tube radius of `0.012`. Increase that value slightly for a thicker bow. Change
the curve's control points for a different silhouette. The bow and quiver sit behind the body,
where **Back & gear** in the preview makes them easy to inspect.

The helper attaches all these pieces to `spine_03`. Its calls to `ornament()` set the final
`gear` argument to `true`: a fallen wrestler must rest on their body and clothes, rather than
be propped up by a decorative bow.

## 6. See him move

Start the app:

```powershell
npm.cmd start
```

Open [Arjuna's character preview](http://127.0.0.1:4100/character-prototype.html?character=arjuna).
You can also open the preview from the lobby and choose **Arjuna** in either character selector.

For a normal match, choose the lobby's **HD** button to use this model. **Let’s Rumble** uses
the original models instead; both buttons use the same rules and support twelve participants.

Compare your result with the [front view](wrestling-prototype.png) and
[back view showing the bow and quiver](arjuna-back.png).

- Use **Front**, **Back & gear** and **Close-up** to inspect the outfit.
- Drag to rotate the camera; scroll or pinch to zoom.
- Try walking, grappling, overhead lift, falling and seated recovery. Pause to inspect a pose.
- Watch a match, then replay with the roles reversed. The preview does not save meeting results.

After saving a recipe or shape change, reload the page. The app's existing `poseWrestlerModel()`
adapts the procedural poses to the imported bones; no animation download is needed. Keep the
imported bone names unchanged. Geometry is authored with **+Z forward**; the model wrapper turns
it to the app's **−Z forward** direction.

## 7. Check and share the result

Run the checks from a second terminal while the app is running, or stop the server with Ctrl+C:

```powershell
npm.cmd test
npm.cmd run build:demo
```

The second command makes the browser-only version in `_site/`, including the free assets.
Open it through a web server, rather than double-clicking an HTML file.

Before sharing, check that the feet touch the mat, the costume covers the body from the back,
the bow follows the torso, and the character can lie down without hovering on the equipment.
Deep bends can still need costume-fitting work; these garments use skin weights, not cloth physics.

To check the complete roster under load, open `wrestling-performance.html` and compare twelve
characters against ten. See the [performance results and method](wrestling-performance.md).

Keep the files in `public/assets/wrestlers/`, the recipe, the model builder, and the attribution in
`NOTICE` with the app. The downloaded assets are [CC0](https://creativecommons.org/publicdomain/zero/1.0/),
which permits modification and redistribution, including commercial use. Original costume/code
contributions in this repository follow the app's Apache-2.0 license. No paid pack was used.
