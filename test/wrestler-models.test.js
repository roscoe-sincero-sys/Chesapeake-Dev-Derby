import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { createWrestlerRig, poseWrestlerModel, captureWrestlerModel, modelLowestFoot } from '../public/js/wrestler-models.js';
import { loadHdAssets } from './headless.js';
import { lowestBodyPoint } from '../public/js/wrestlers.js';
import { WRESTLER_LOOKS, WRESTLER_MODEL_IDS } from '../public/js/wrestler-looks.js';
import { WRESTLER_KINDS } from '../public/js/wrestle-sim.js';

const source = await loadHdAssets();
const { body, female } = source;
const kind = (id) => ({ id });

test('free models have independent skeletons/materials while sharing source geometry', () => {
  const first = createWrestlerRig(kind('ghatotkacha'), '#663399', source);
  const second = createWrestlerRig(kind('ghatotkacha'), '#aa3366', source);
  assert.equal(first.body.geometry, second.body.geometry);
  assert.notEqual(first.body.skeleton, second.body.skeleton);
  assert.notEqual(first.bones.pelvis, second.bones.pelvis);
  assert.notEqual(first.body.material, second.body.material);
  const before = second.bones.upperarm_l.quaternion.clone();
  poseWrestlerModel(first, { armsUp: 1, crouch: 0.5 });
  assert.ok(second.bones.upperarm_l.quaternion.equals(before));
  first.body.material.color.set('#ffffff');
  assert.notEqual(first.body.material.color.getHex(), second.body.material.color.getHex());
  first.disposeBody();
  poseWrestlerModel(second, { guard: 1 }); // disposing an instance must not break another
  assert.ok(Number.isFinite(lowestBodyPoint(second)));
  second.disposeBody();
});

test('all twelve skinned characters keep a supporting foot on the floor through movement and reset poses', () => {
  for (const id of WRESTLER_MODEL_IDS) {
    const rig = createWrestlerRig(kind(id), '#ffffff', source);
    const poses = [{}, { crouch: 1 }, { armsUp: 1 }, { armsForward: 1, crouch: 0.35, lean: 0.3 },
      { flail: 1, walk: 2, spread: 0.6 }, { lean: -0.95, crouch: 0.15 }, { sit: 1 }];
    for (let walk = 0; walk < Math.PI * 2; walk += 0.4) poses.push({ walk, stride: 0.7, guard: 0.8, crouch: 0.25 });
    for (const p of poses) {
      poseWrestlerModel(rig, p);
      const low = modelLowestFoot(rig);
      assert.ok(low >= -0.002, `${id}: foot below floor in ${JSON.stringify(p)}: ${low}`);
      if (!p.sit) assert.ok(low < 0.002, `${id}: supporting foot floats: ${low}`);
      const bodyLow = lowestBodyPoint(rig);
      assert.ok(bodyLow > -0.03, `${id}: posed body or costume clips below floor in ${JSON.stringify(p)}: ${bodyLow}`);
    }
    const pose = { armsForward: 1, crouch: 0.3 };
    poseWrestlerModel(rig, pose);
    const expected = rig.bones.upperarm_l.quaternion.clone();
    poseWrestlerModel(rig, { flail: 1, walk: 3 });
    poseWrestlerModel(rig, pose);
    assert.ok(expected.angleTo(rig.bones.upperarm_l.quaternion) < 1e-6, 'poses do not accumulate offsets');
    rig.disposeBody();
  }
});

test('deformed body grounding works while tilted/on the back and ignores carried gear', () => {
  for (const id of WRESTLER_MODEL_IDS) {
    const rig = createWrestlerRig(kind(id), '#ffffff', source);
    poseWrestlerModel(rig, { spread: 0.4 });
    rig.root.position.set(4, 2, -3);
    rig.root.rotation.set(Math.PI / 2, 0.6, 0, 'YXZ');
    rig.root.position.y -= lowestBodyPoint(rig);
    assert.ok(Math.abs(lowestBodyPoint(rig)) < 1e-5);
    const low = lowestBodyPoint(rig);
    const gear = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    gear.position.y = -100;
    gear.userData.gear = true;
    rig.root.add(gear);
    assert.ok(Math.abs(lowestBodyPoint(rig) - low) < 1e-5);
    gear.geometry.dispose(); gear.material.dispose();
    rig.disposeBody();
  }
});

test('every match character has its own complete free model recipe and characteristic equipment', () => {
  assert.deepEqual(new Set(WRESTLER_MODEL_IDS), new Set(WRESTLER_KINDS.map((k) => k.id)));
  const expected = {
    bhima: ['Mace'], jarasandha: ['Seam', 'Beard'], duryodhana: ['Cape', 'Mace'], kichaka: ['Sword'],
    arjuna: ['Gandiva', 'Bowstring', 'Quiver'], karna: ['Kavacha', 'SunEmblem', 'Quiver'],
    abhimanyu: ['Shield'], ghatotkacha: ['Mace'], hidimbi: ['Choli', 'Skirt', 'Braid', 'NoseRing'],
    dushasana: ['Mace', 'Beard'], shikhandi: ['Shield'], satyaki: ['Sword', 'PeacockFeather'],
  };
  for (const id of WRESTLER_MODEL_IDS) {
    const rig = createWrestlerRig(kind(id), '#ffffff', source);
    assert.ok(rig?.skinnedRig, `${id}: must use the skinned model, not a silent original-model fallback`);
    const original = id === 'hidimbi' ? female : body;
    let originalBody;
    original.traverse((o) => { if (o.name === rig.body.name) originalBody = o; });
    assert.ok(rig.body.geometry.index.count < originalBody.geometry.index.count, `${id}: hidden skin triangles are masked`);
    for (const name of expected[id]) assert.ok(rig.scene.getObjectByName(name), `${id}: missing ${name}`);
    if (id === 'hidimbi') assert.equal(rig.body.name, 'Superhero_Female');
    if (id === 'karna') assert.ok(rig.scene.getObjectByName('Kavacha').geometry.index.count > 100);
    rig.disposeBody();
  }
  const byHeight = [...WRESTLER_MODEL_IDS].sort((a, b) => WRESTLER_LOOKS[a].height - WRESTLER_LOOKS[b].height);
  assert.equal(byHeight[0], 'abhimanyu');
  assert.equal(byHeight.at(-1), 'ghatotkacha');
});

test('the pose adapter lowers neutral arms and raises overhead arms in the character frame', () => {
  const rig = createWrestlerRig(kind('ghatotkacha'), '#ffffff', source);
  const position = (name) => rig.bones[name].getWorldPosition(new THREE.Vector3());
  for (const side of ['l', 'r']) {
    poseWrestlerModel(rig, {});
    assert.ok(position(`hand_${side}`).y < position(`upperarm_${side}`).y - 0.3, 'neutral hands below shoulders');
    poseWrestlerModel(rig, { armsUp: 1 });
    assert.ok(position(`hand_${side}`).y > position(`upperarm_${side}`).y + 0.3, 'overhead hands above shoulders');
  }
  rig.disposeBody();
});

test('asset manifest identifies free Standard files and matches their hashes', async () => {
  const { createHash } = await import('node:crypto');
  const manifest = JSON.parse(await readFile(new URL('../public/assets/wrestlers/manifest.json', import.meta.url)));
  assert.equal(manifest.license, 'CC0-1.0');
  assert.match(manifest.archive, /Standard/);
  for (const [file, metadata] of Object.entries(manifest.files)) {
    const contents = await readFile(new URL(`../public/assets/wrestlers/${file}`, import.meta.url));
    assert.equal(contents.length, metadata.bytes);
    assert.equal(createHash('sha256').update(contents).digest('hex'), metadata.sha256);
  }
});

test('a new pose can ease in from the last one, bone by bone (#98)', () => {
  const rig = createWrestlerRig(kind('bhima'), '#ffffff', source);
  poseWrestlerModel(rig, { armsForward: 1, crouch: 0.35 });
  const from = captureWrestlerModel(rig);
  const grip = rig.bones.upperarm_l.quaternion.clone();
  poseWrestlerModel(rig, { armsUp: 1 }, { from, k: 0 });
  assert.ok(rig.bones.upperarm_l.quaternion.angleTo(grip) < 1e-6, 'k = 0: still the captured pose');
  assert.ok(modelLowestFoot(rig) > -0.002 && modelLowestFoot(rig) < 0.002, 'blended poses keep a foot on the floor');
  poseWrestlerModel(rig, { armsUp: 1 });
  const up = rig.bones.upperarm_l.quaternion.clone();
  poseWrestlerModel(rig, { armsUp: 1 }, { from, k: 0.5 });
  const half = rig.bones.upperarm_l.quaternion;
  assert.ok(Math.abs(half.angleTo(grip) - half.angleTo(up)) < 1e-3, 'k = 0.5: halfway between');
  rig.disposeBody();
});
