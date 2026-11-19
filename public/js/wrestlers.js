// Shared character/label/pose API for Rumble and HD. Classic mode explicitly selects the original
// jointed primitive models below; HD uses loaded CC0 skinned models, with the originals as fallback.
// They face -Z, like the racers. The root sits at floor level: pose() keeps the lower foot on it.

import * as THREE from 'three';
import { mat, box, ball, cyl, cone, torus, at, group, makeSprite, nameTagTexture } from './util3d.js';
import { createWrestlerRig, poseWrestlerModel, captureWrestlerModel, modelLowestFoot } from './wrestler-models.js';
export { prepareWrestlerModels } from './wrestler-models.js';

const GOLD = '#d4a017';
const HAIR = '#16110d';

// Leg geometry, shared by the model and by pose() to keep the feet on the floor.
const HIP_DROP = 0.12; // hip joints below the hips group
const THIGH = 0.52;
const SHIN = 0.5;
const FOOT = 0.085; // ankle to sole, standing
// The foot: an ellipsoid hanging from the ankle (centre offset and half-sizes, in the shin's frame).
const FOOT_CY = -FOOT + 0.045;
const FOOT_CZ = -0.065;
const FOOT_SY = 0.045;
const FOOT_SZ = 0.15;

/** A smooth surface of revolution from [radius, y] points, bottom to top. */
function lathe(points, material, segments = 28) {
  const mesh = new THREE.Mesh(new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segments), material);
  mesh.castShadow = true;
  return mesh;
}

/** A tapered limb hanging from its joint (rounded at both ends); returns { joint, end }. */
function limb(length, rTop, rBottom, material) {
  const joint = new THREE.Group();
  joint.add(at(cyl(rTop, rBottom, length, material, 14), 0, -length / 2, 0));
  joint.add(ball(rTop, material));
  const end = new THREE.Group();
  end.position.y = -length;
  end.add(ball(rBottom, material));
  joint.add(end);
  return { joint, end };
}

function humanoid(look, belt) {
  const bulk = look.bulk ?? 1;
  const skin = new THREE.MeshStandardMaterial({ color: look.skin, roughness: 0.48, metalness: 0.02 });
  const shade = new THREE.MeshStandardMaterial({ color: new THREE.Color(look.skin).multiplyScalar(0.82), roughness: 0.5 });
  // Materials made for this wrestler alone (everything else is shared through util3d.js).
  const owned = [skin, shade];
  const gold = mat(GOLD, { metalness: 0.75, roughness: 0.28 });
  const cloth = mat(look.dhoti, { roughness: 0.85 });
  const border = mat(look.border ?? GOLD, { roughness: 0.55, metalness: 0.2 });
  const hair = mat(HAIR, { roughness: 0.7 });
  const root = new THREE.Group();

  // ---- hips: a draped dhoti with a pleated front fall, the wrestler's belt and a gold waist chain
  const hips = new THREE.Group();
  hips.position.y = HIP_DROP + THIGH + SHIN + FOOT;
  root.add(hips);
  // The clothes round the hips, flattened front to back like a real pelvis (a round dhoti would prop
  // a wrestler lying on their back up off the floor).
  const pelvis = new THREE.Group();
  pelvis.scale.z = 0.8;
  hips.add(pelvis);
  if (look.female) {
    // A long skirt to mid-calf (short enough to stay off the mat in a crouch), with a gold border.
    pelvis.add(lathe([[0.37 * bulk, -0.86], [0.345 * bulk, -0.55], [0.31 * bulk, -0.18], [0.26 * bulk, 0.16]], cloth));
    pelvis.add(at(cyl(0.372 * bulk, 0.372 * bulk, 0.05, border, 28), 0, -0.84, 0));
    pelvis.add(at(box(0.06, 0.95, 0.02, border), 0, -0.36, -0.33 * bulk, 0.12)); // front pleat
  } else {
    pelvis.add(lathe([[0.3 * bulk, -0.36], [0.335 * bulk, -0.2], [0.32 * bulk, 0.02], [0.27 * bulk, 0.16]], cloth));
    pelvis.add(at(cyl(0.302 * bulk, 0.302 * bulk, 0.04, border, 28), 0, -0.36, 0));
    for (let i = -1; i <= 1; i++) {
      pelvis.add(at(box(0.07, 0.62, 0.025, cloth), i * 0.055, -0.22, -0.29 * bulk, 0.08, 0, i * 0.04)); // pleats
    }
    pelvis.add(at(box(0.2, 0.025, 0.03, border), 0, -0.53, -0.31 * bulk));
  }
  pelvis.add(at(torus(0.272 * bulk, 0.035, mat(belt, { roughness: 0.5 })), 0, 0.14, 0, Math.PI / 2));
  pelvis.add(at(torus(0.285 * bulk, 0.012, gold), 0, 0.09, 0, Math.PI / 2));

  // ---- legs: cloth over the thighs (the dhoti), bare muscular calves, anklets, feet
  const legs = [-1, 1].map((side) => {
    const thigh = limb(THIGH, 0.15 * bulk, 0.105 * bulk, cloth);
    thigh.joint.position.set(side * 0.155 * bulk, -HIP_DROP, 0);
    const shin = limb(SHIN, 0.095 * bulk, 0.06 * bulk, skin);
    shin.joint.add(at(ball(0.085 * bulk, skin, 0.95, 1.9, 1.05), 0, -0.17, 0.035)); // calf
    shin.joint.add(at(ball(0.07 * bulk, shade, 1, 0.8, 0.9), 0, 0, -0.03)); // knee
    shin.joint.add(at(torus(0.068 * bulk, 0.016, gold), 0, -SHIN + 0.05, 0, Math.PI / 2)); // anklet
    // Foot: heel to toes, sole at FOOT below the ankle.
    shin.end.add(at(ball(1, skin, 0.072, FOOT_SY, FOOT_SZ), 0, FOOT_CY, FOOT_CZ));
    thigh.end.add(shin.joint);
    hips.add(thigh.joint);
    return { thigh: thigh.joint, shin: shin.joint };
  });

  // ---- torso: V-shaped, bare-chested as in the akhada, with chest, shoulders and abdomen
  const torso = new THREE.Group();
  torso.position.y = 0.16;
  hips.add(torso);
  if (look.female) {
    // A fitted choli (blouse) over the chest, bare midriff.
    const choli = mat(look.top ?? look.dhoti, { roughness: 0.7 });
    torso.add(at(ball(1, skin, 0.22 * bulk, 0.24, 0.17 * bulk), 0, 0.13, 0)); // waist
    torso.add(at(ball(1, choli, 0.27 * bulk, 0.21, 0.19 * bulk), 0, 0.47, 0)); // choli
    for (const side of [-1, 1]) {
      torso.add(at(ball(1, choli, 0.11 * bulk, 0.1, 0.09), side * 0.1 * bulk, 0.45, -0.15 * bulk)); // bust
      torso.add(at(ball(0.1 * bulk, choli, 1.05, 0.9, 1), side * 0.33 * bulk, 0.6, 0)); // sleeve
    }
    torso.add(at(torus(0.24 * bulk, 0.016, border), 0, 0.3, 0, Math.PI / 2)); // choli hem
    torso.add(at(ball(0.012, shade), 0, 0.07, -0.16 * bulk)); // navel
  } else {
    torso.add(at(ball(1, skin, 0.26 * bulk, 0.26, 0.19 * bulk), 0, 0.13, 0)); // abdomen
    torso.add(at(ball(1, skin, 0.33 * bulk, 0.27, 0.22 * bulk), 0, 0.45, 0)); // ribcage
    for (const side of [-1, 1]) {
      torso.add(at(ball(1, skin, 0.14 * bulk, 0.1, 0.07), side * 0.125 * bulk, 0.52, -0.17 * bulk)); // chest
      torso.add(at(ball(0.12 * bulk, skin, 1.05, 0.95, 1), side * 0.37 * bulk, 0.62, 0)); // shoulder
    }
    torso.add(at(ball(1, skin, 0.2 * bulk, 0.08, 0.14), 0, 0.7, 0.02)); // trapezius
    torso.add(at(box(0.012, 0.22, 0.01, shade), 0, 0.2, -0.185 * bulk)); // abdominal line
    torso.add(at(ball(0.012, shade), 0, 0.07, -0.18 * bulk)); // navel
  }
  if (look.kavacha) {
    // Karna's divine golden armour, worn from birth: a breastplate with a sun boss.
    torso.add(at(ball(1, gold, 0.345 * bulk, 0.285, 0.235 * bulk), 0, 0.45, 0));
    torso.add(at(ball(1, gold, 0.27 * bulk, 0.2, 0.2 * bulk), 0, 0.17, 0));
    torso.add(at(cyl(0.07, 0.07, 0.02, mat('#ff922b', { emissive: '#ff6b00', emissiveIntensity: 0.6, metalness: 0.5 }), 16), 0, 0.5, -0.235 * bulk, Math.PI / 2));
  }
  if (look.amulet) {
    // Ghatotkacha's glowing amulet: his magic.
    torso.add(at(ball(0.05, mat(look.amulet, { emissive: look.amulet, emissiveIntensity: 1.2 })), 0, 0.52, -0.23 * bulk));
  }
  // Jewellery: a two-strand gold necklace with a ruby pendant.
  torso.add(at(torus(0.16 * bulk, 0.014, gold), 0, 0.69, -0.04, Math.PI / 2 - 0.5));
  torso.add(at(torus(0.2 * bulk, 0.014, gold), 0, 0.64, -0.06, Math.PI / 2 - 0.55));
  torso.add(at(ball(0.035, mat('#b00020', { metalness: 0.3, roughness: 0.25 })), 0, 0.53, -0.215 * bulk));
  if (look.sash) torso.add(at(box(0.08, 0.86, 0.035, mat(look.sash, { roughness: 0.8 })), 0.03, 0.38, -0.2 * bulk, 0.1, 0, 0.6)); // angavastram
  if (look.seam) torso.add(at(box(0.01, 0.6, 0.012, mat('#3d2414')), 0, 0.33, -0.222 * bulk)); // Jarasandha, joined from two halves
  if (look.cape) {
    // A cape hanging down the back: the back half of a surface of revolution.
    const profile = [[0.08, -0.55], [0.32 * bulk, -0.5], [0.3 * bulk, 0.2], [0.2 * bulk, 0.68]].map(([r, y]) => new THREE.Vector2(r, y));
    const cape = new THREE.Mesh(new THREE.LatheGeometry(profile, 16, -Math.PI / 2, Math.PI), new THREE.MeshStandardMaterial({ color: look.cape, roughness: 0.9, side: THREE.DoubleSide }));
    owned.push(cape.material);
    cape.scale.set(1.05, 1, 0.55);
    cape.position.set(0, 0.05, 0.1);
    torso.add(cape);
  }
  if (look.back === 'mace' || look.back === 'goldMace') {
    const head = look.back === 'goldMace' ? gold : mat('#59636b', { metalness: 0.6, roughness: 0.35 });
    const mace = group(at(cyl(0.03, 0.035, 1.0, mat('#5c3a1e'), 10), 0, 0, 0), at(ball(0.16, head), 0, 0.56, 0), at(cone(0.045, 0.12, head, 8), 0, 0.74, 0));
    for (let i = 0; i < 6; i++) mace.add(at(torus(0.16, 0.012, head), 0, 0.56, 0, Math.PI / 2, (i * Math.PI) / 6, 0)); // ridges
    mace.userData.gear = true;
    // Strapped close to the back, so a fallen wrestler lies on it rather than being propped up.
    torso.add(at(mace, 0.12, 0.4, 0.2 * bulk, 0, 0, 0.5));
  }
  if (look.back === 'sword') {
    const sword = group(
      at(box(0.06, 0.8, 0.03, mat('#2b2016')), 0, 0, 0), // scabbard
      at(box(0.16, 0.03, 0.04, gold), 0, 0.42, 0), // guard
      at(cyl(0.018, 0.018, 0.16, mat('#5c3a1e'), 8), 0, 0.52, 0), // grip
      at(ball(0.03, gold), 0, 0.61, 0), // pommel
    );
    sword.userData.gear = true;
    torso.add(at(sword, -0.08, 0.38, 0.24 * bulk, 0, 0, -0.55));
  }
  if (look.back === 'shield') {
    const face = mat(look.shield ?? '#7a4a22', { roughness: 0.6 });
    const shield = group(at(cyl(0.3, 0.3, 0.04, face, 24), 0, 0, 0, Math.PI / 2), at(torus(0.3, 0.02, gold), 0, 0, -0.01), at(ball(0.06, gold), 0, 0, 0.03));
    shield.userData.gear = true;
    torso.add(at(shield, 0, 0.4, 0.27 * bulk));
  }
  if (look.back === 'bow') {
    // Gandiva on the back, with a quiver of arrows.
    // Slung across the back, flat against it (as a bow is carried), so it lies flat under a fallen archer.
    const bow = at(torus(0.66, 0.022, mat('#6b3d17', { roughness: 0.6 }), Math.PI * 0.86), 0.05, 0.42, 0.25 * bulk, 0, 0, Math.PI * 0.07);
    bow.userData.gear = true;
    torso.add(bow);
    const quiver = group(at(cyl(0.065, 0.055, 0.56, mat('#7a4a22'), 10), 0, 0, 0), at(torus(0.066, 0.012, gold), 0, 0.25, 0, Math.PI / 2));
    for (let i = 0; i < 5; i++) {
      quiver.add(at(cyl(0.007, 0.007, 0.34, mat('#d8c9a3'), 4), (i - 2) * 0.02, 0.42, (i % 2) * 0.015));
      quiver.add(at(cone(0.022, 0.06, mat('#e9ecef'), 4), (i - 2) * 0.02, 0.6, (i % 2) * 0.015, Math.PI));
    }
    quiver.userData.gear = true;
    torso.add(at(quiver, 0.17, 0.44, 0.24, 0, 0, -0.35));
  }

  // ---- arms: shoulder, biceps, forearm, fist; armlets and bracelets
  const arms = [-1, 1].map((side) => {
    const upper = limb(0.42, 0.098 * bulk, 0.078 * bulk, skin);
    upper.joint.position.set(side * 0.4 * bulk, 0.62, 0);
    upper.joint.add(at(ball(1, skin, 0.085 * bulk, 0.15, 0.09 * bulk), 0, -0.2, -0.025)); // biceps
    upper.joint.add(at(torus(0.092 * bulk, 0.02, gold), 0, -0.13, 0, Math.PI / 2)); // keyura
    const fore = limb(0.38, 0.08 * bulk, 0.055 * bulk, skin);
    fore.joint.add(at(ball(1, skin, 0.075 * bulk, 0.13, 0.07 * bulk), 0, -0.11, 0)); // forearm
    fore.joint.add(at(torus(0.06 * bulk, 0.017, gold), 0, -0.34, 0, Math.PI / 2)); // bracelet
    fore.end.add(at(ball(1, skin, 0.05 * bulk, 0.075, 0.06 * bulk), 0, -0.06, 0)); // fist
    fore.end.add(at(ball(0.022, skin), side * -0.04, -0.04, -0.035)); // thumb
    upper.end.add(fore.joint);
    torso.add(upper.joint);
    return { upper: upper.joint, fore: fore.joint };
  });

  // ---- head: neck, face, long hair, crown
  const head = new THREE.Group();
  head.position.y = 0.78;
  torso.add(head);
  head.add(at(cyl(0.068, 0.08, 0.16, skin, 12), 0, 0.02, 0)); // neck
  head.add(at(ball(1, skin, 0.118, 0.145, 0.13), 0, 0.22, 0)); // skull
  head.add(at(ball(1, skin, 0.1, 0.08, 0.1), 0, 0.13, -0.025)); // jaw
  head.add(at(cone(0.022, 0.06, skin, 8), 0, 0.2, -0.135, -Math.PI / 2 - 0.25)); // nose
  for (const side of [-1, 1]) {
    head.add(at(ball(1, skin, 0.02, 0.04, 0.025), side * 0.118, 0.21, 0.005)); // ear
    head.add(at(torus(look.bigEarrings ? 0.045 : 0.022, look.bigEarrings ? 0.012 : 0.006, gold), side * 0.122, look.bigEarrings ? 0.13 : 0.16, 0, 0, Math.PI / 2, 0)); // kundala
    head.add(at(ball(1, mat('#f1ede6', { roughness: 0.3 }), 0.022, 0.012, 0.01), side * 0.045, 0.235, -0.118)); // eye white
    head.add(at(ball(0.008, mat('#1a120b')), side * 0.045, 0.235, -0.128)); // iris
    head.add(at(box(0.05, 0.01, 0.012, hair), side * 0.046, 0.262, -0.122, 0, 0, side * -0.18)); // brow
  }
  if (look.female) head.add(at(ball(0.012, mat('#c92a2a')), 0, 0.272, -0.126)); // bindi
  else head.add(at(box(0.012, 0.045, 0.006, mat('#c92a2a')), 0, 0.29, -0.124)); // tilak
  if (look.noseRing) head.add(at(torus(0.014, 0.003, gold), 0.018, 0.19, -0.14, 0, Math.PI / 2, 0));
  if (look.tusks) {
    // Small tusks: Ghatotkacha is half-rakshasa.
    for (const side of [-1, 1]) head.add(at(cone(0.011, 0.045, mat('#f8f4e6'), 6), side * 0.032, 0.15, -0.115));
  }
  head.add(at(box(0.035, 0.006, 0.006, mat('#7a3b2e')), 0, 0.135, -0.118)); // mouth
  if (look.mustache) {
    const thick = look.mustache === 'thick';
    for (const side of [-1, 1]) {
      const m = at(ball(1, hair, thick ? 0.05 : 0.035, thick ? 0.014 : 0.009, 0.014), side * 0.035, 0.16, -0.122, 0, 0, side * 0.2);
      head.add(m);
      if (thick) head.add(at(ball(0.012, hair), side * 0.08, 0.172, -0.11)); // twirled ends
    }
  }
  if (look.beard) head.add(at(ball(1, hair, 0.105, 0.11, 0.09), 0, 0.09, -0.04));
  // Long hair falling to the shoulders, as the epic's heroes are drawn.
  head.add(at(ball(1, hair, 0.125, 0.15, 0.13), 0, 0.24, 0.02));
  head.add(at(ball(1, hair, 0.12, 0.17, 0.07), 0, 0.08, 0.1));
  if (look.hair === 'wild') {
    // A great mane of wild curls.
    for (const [x, y, z, r] of [[-0.12, 0.28, 0.05, 0.08], [0.12, 0.28, 0.05, 0.08], [0, 0.34, 0.08, 0.09], [-0.1, 0.12, 0.12, 0.08], [0.1, 0.12, 0.12, 0.08], [0, 0.0, 0.14, 0.09]]) head.add(at(ball(r, hair), x, y, z));
  }
  if (look.braid) {
    // A long braid down the back.
    for (let i = 0; i < 7; i++) head.add(at(ball(0.04 - i * 0.002, hair), 0, -0.02 - i * 0.075, 0.14 + i * 0.01));
    head.add(at(ball(0.02, gold), 0, -0.56, 0.21));
  }
  const crownY = 0.33;
  if (look.feather) {
    // A peacock feather in the crown, as worn by the Yadavas.
    const plume = group(at(cyl(0.006, 0.006, 0.28, mat('#2b8a3e'), 4), 0, 0.14, 0), at(ball(1, mat('#0b7285'), 0.04, 0.07, 0.012), 0, 0.3, 0), at(ball(1, mat('#1864ab'), 0.022, 0.035, 0.014), 0, 0.3, -0.004), at(ball(0.01, mat('#f2b817')), 0, 0.3, -0.012));
    head.add(at(plume, 0.06, crownY + 0.02, 0.04, -0.25, 0, -0.25));
  }
  if (look.crown === 'tiara') {
    head.add(at(torus(0.122, 0.012, gold), 0, crownY - 0.02, 0, Math.PI / 2 - 0.15));
    head.add(at(ball(0.025, mat(look.gem ?? '#e03131', { emissive: look.gem ?? '#e03131', emissiveIntensity: 0.3 })), 0, crownY - 0.01, -0.125));
  } else if (look.crown === 'band') {
    head.add(at(cyl(0.124, 0.124, 0.06, gold, 24), 0, crownY, 0));
    head.add(at(cone(0.03, 0.09, gold, 8), 0, crownY + 0.07, -0.11));
  } else {
    const tall = look.crown === 'tall' ? 0.3 : 0.22;
    head.add(at(cyl(0.118, 0.13, 0.08, gold, 24), 0, crownY, 0));
    head.add(at(cone(0.115, tall, gold, 24), 0, crownY + 0.04 + tall / 2, 0));
    for (let i = 0; i < 3; i++) head.add(at(torus(0.12 - i * 0.03, 0.01, gold), 0, crownY + 0.05 + i * tall * 0.28, 0, Math.PI / 2));
    head.add(at(ball(0.028, gold), 0, crownY + 0.05 + tall, 0));
    if (look.gem) head.add(at(ball(0.03, mat(look.gem, { emissive: look.gem, emissiveIntensity: 0.35, metalness: 0.3, roughness: 0.2 })), 0, crownY + 0.01, -0.125));
  }

  const build = look.build ?? 1;
  root.scale.setScalar(build);
  return { root, hips, torso, head, arms, legs, height: 2.45 * build, owned };
}

const LOOKS = {
  // The mighty Pandava: the broadest of them, saffron dhoti, twirled mustache, iron mace on his back.
  bhima: { skin: '#8a5a3c', build: 1.1, bulk: 1.22, dhoti: '#e8590c', sash: '#ffd43b', crown: 'band', mustache: 'thick', back: 'mace' },
  // King of Magadha: maroon and gold, full beard, tall crown with a ruby, and the seam where he was joined.
  jarasandha: { skin: '#7a4f33', build: 1.08, bulk: 1.14, dhoti: '#8f1d3f', border: '#f2b817', sash: '#f2b817', crown: 'tall', gem: '#e03131', beard: true, mustache: 'thick', seam: true },
  // The Kaurava prince: royal blue, tall jewelled crown, golden mace and a red cape for the crowd.
  duryodhana: { skin: '#a06e4d', build: 1.04, bulk: 1.06, dhoti: '#1c3d7a', sash: '#f8f9fa', crown: 'tall', gem: '#1c7ed6', mustache: 'thin', back: 'goldMace', cape: '#a61e4d' },
  // Commander of King Virata's army: a heavy bruiser in forest green, thick mustache, sword on his back.
  kichaka: { skin: '#7d5236', build: 1.12, bulk: 1.2, dhoti: '#2b5f2b', border: '#c9a227', sash: '#c9a227', crown: 'band', mustache: 'thick', back: 'sword' },
  // Son of the sun god, born with golden armour (kavacha) and earrings (kundala): crimson and gold.
  karna: { skin: '#b07d58', build: 1.04, bulk: 1.04, dhoti: '#9c1c1c', border: '#f2b817', crown: 'tall', gem: '#ff922b', mustache: 'thin', kavacha: true, bigEarrings: true, back: 'bow' },
  // Arjuna's young son: lean and quick, sky blue, small crown, clean-shaven, round shield on his back.
  abhimanyu: { skin: '#a87250', build: 0.95, bulk: 0.9, dhoti: '#4dabf7', border: '#f2b817', sash: '#f8f9fa', crown: 'mukuta', gem: '#e64980', back: 'shield', shield: '#1864ab' },
  // Bhima's towering half-rakshasa son: dark skin, wild hair, small tusks, glowing amulet of his magic.
  ghatotkacha: { skin: '#4e342e', build: 1.3, bulk: 1.25, dhoti: '#3b1f4f', border: '#b197fc', sash: '#b197fc', crown: 'band', mustache: 'thick', hair: 'wild', tusks: true, amulet: '#9775fa', back: 'mace' },
  // A rakshasi and Ghatotkacha's mother: green choli and skirt, long braid, nose ring, tiara.
  hidimbi: { skin: '#5d4037', build: 1.02, bulk: 0.9, female: true, dhoti: '#087f5b', top: '#2f9e44', border: '#f2b817', crown: 'tiara', gem: '#9775fa', braid: true, noseRing: true, bigEarrings: true },
  // Duryodhana's brother: Kaurava green and gold, short beard, golden mace (no cape: he isn't the showman).
  dushasana: { skin: '#946243', build: 1.06, bulk: 1.1, dhoti: '#1b4d3e', border: '#f2b817', sash: '#f2b817', crown: 'tall', gem: '#2f9e44', mustache: 'thick', beard: true, back: 'goldMace' },
  // The warrior whose presence turned the battle against Bhishma: violet, pointed crown, sword and shield.
  shikhandi: { skin: '#9c6b4a', build: 1.0, bulk: 1.0, dhoti: '#6741d9', border: '#f2b817', sash: '#e9ecef', crown: 'mukuta', gem: '#4dabf7', mustache: 'thin', back: 'shield', shield: '#5f3dc4' },
  // Krishna's Yadava ally: teal, a peacock feather in his crown, sword on his back, built for speed.
  satyaki: { skin: '#8f5e3e', build: 0.98, bulk: 0.98, dhoti: '#0b7285', border: '#f2b817', sash: '#ffd43b', crown: 'band', feather: true, mustache: 'thin', back: 'sword' },
  // The archer: lean, yellow pitambara, pointed crown, Gandiva and a quiver on his back.
  arjuna: { skin: '#9a6a48', build: 1.0, bulk: 0.95, dhoti: '#f2b817', border: '#c92a2a', sash: '#1971c2', crown: 'mukuta', gem: '#2f9e44', mustache: 'thin', back: 'bow' },
};

/** Just the posable body (no name tags), e.g. for tests. */
export function buildRig(kind, color = '#ffffff', { original = false } = {}) {
  return (!original && createWrestlerRig(kind, color)) || humanoid(LOOKS[kind.id], color);
}

/**
 * Builds one wrestler: rig + floating name tag (the teammate's name) and a smaller "as <character>" tag.
 * `color` is the wrestler's own belt colour, so two of the same character can be told apart.
 */
export function buildWrestler(kind, color, name, options = {}) {
  const rig = buildRig(kind, color, options);
  const tagTexture = nameTagTexture(name, color);
  const tag = makeSprite(tagTexture, 3.2, 0.8, { depthTest: false });
  tag.renderOrder = 10;
  const asTexture = nameTagTexture(`as ${kind.label}`, '#adb5bd');
  const asTag = makeSprite(asTexture, 2.0, 0.5, { depthTest: false });
  asTag.renderOrder = 10;
  // Tags hang in a holder that stays upright even while the body tumbles.
  const tags = new THREE.Group();
  tags.add(tag, asTag);
  tag.position.y = rig.height + 0.95;
  asTag.position.y = rig.height + 0.42;
  return {
    ...rig,
    kind,
    color,
    name,
    tags,
    tag,
    asTag,
    dispose() {
      for (const t of [tagTexture, asTexture]) t.dispose();
      tag.material.dispose();
      asTag.material.dispose();
      if (rig.disposeBody) {
        rig.disposeBody();
        return;
      }
      rig.root.traverse((o) => {
        // Lathes (dhoti, skirt, cape) are built per wrestler; other shapes are shared by util3d.
        if (o.geometry?.type === 'LatheGeometry') o.geometry.dispose();
      });
      for (const m of rig.owned) m.dispose();
    },
  };
}

/** Height of the hips above the floor that puts this leg's sole on it, for the current angles. */
function legReach(leg) {
  const a = leg.thigh.rotation.x;
  const b = a + leg.shin.rotation.x; // the shin's (and foot's) tilt
  const splay = Math.cos(leg.thigh.rotation.z);
  const ankle = HIP_DROP + (THIGH * Math.cos(a) + SHIN * Math.cos(b)) * splay;
  // The tilted foot's lowest point: its centre's drop plus its half-height at this tilt.
  const centre = FOOT_CY * Math.cos(b) - FOOT_CZ * Math.sin(b);
  const half = Math.hypot(FOOT_SY * Math.cos(b), FOOT_SZ * Math.sin(b));
  return ankle - centre + half;
}

// The classic rig's joints, as [object, rotation axis] pairs, for capturing and blending poses.
const classicJoints = (w) => [
  ...w.legs.flatMap((l) => [[l.thigh, 'x'], [l.thigh, 'z'], [l.shin, 'x']]),
  ...w.arms.flatMap((a) => [[a.upper, 'x'], [a.upper, 'z'], [a.fore, 'x']]),
  [w.torso, 'x'], [w.torso, 'y'], [w.torso, 'z'], [w.head, 'x'],
];

/**
 * The rig's current pose, to blend from when a wrestler moves from one move into the next (#98): a
 * new pose then eases in from this one instead of snapping (pose's `blend` argument).
 */
export function capturePose(w) {
  if (w.skinnedRig) return captureWrestlerModel(w);
  return classicJoints(w).map(([o, axis]) => o.rotation[axis]);
}

/**
 * Poses the rig. Anything not given relaxes to neutral.
 * pose: { walk (phase), stride, armsUp, armsForward, guard, lean, twist, tilt, crouch, flail, spread, wide, sit, look }
 * The hips are then set so the lower foot rests exactly on the floor (no feet through the ring).
 * `blend` { from: capturePose(), k: 0..1 } shows a mix: k of this pose and the rest of the captured one.
 */
export function pose(w, p = {}, blend = null) {
  if (w.skinnedRig) return poseWrestlerModel(w, p, blend);
  const t = p.walk ?? 0;
  const stride = p.stride ?? 0;
  const swing = Math.sin(t) * stride;
  const crouch = p.crouch ?? 0;
  const sit = p.sit ?? 0;
  // Rotation about x: positive swings a limb forward (towards -Z, the way the wrestler faces).
  // Thighs swing forward for a crouch or a sit; shins bend back at the knee (negative).
  w.legs[0].thigh.rotation.x = swing + crouch * 0.6 + sit * 1.5;
  w.legs[1].thigh.rotation.x = -swing + crouch * 0.6 + sit * 1.5;
  w.legs[0].shin.rotation.x = -(Math.max(0, -swing) * 0.8 + crouch * 1.0);
  w.legs[1].shin.rotation.x = -(Math.max(0, swing) * 0.8 + crouch * 1.0);
  w.legs[0].thigh.rotation.z = -0.05 - (p.wide ?? 0);
  w.legs[1].thigh.rotation.z = 0.05 + (p.wide ?? 0);
  // Feet on the floor: the hips sit exactly as high as the longer leg reaches. Sitting (legs stretched
  // out in front) lowers them to seat height, but never below where the legs reach.
  const reach = Math.max(legReach(w.legs[0]), legReach(w.legs[1]));
  w.hips.position.y = sit > 0 ? Math.max(reach, 0.34) : reach;

  // `lean` > 0 bends forward, < 0 arches back (as over the top rope).
  w.torso.rotation.x = -(p.lean ?? 0) - crouch * 0.25;
  w.torso.rotation.y = p.twist ?? 0;
  w.torso.rotation.z = p.tilt ?? 0;
  w.head.rotation.x = p.look ?? 0;

  const up = p.armsUp ?? 0;
  const fwd = p.armsForward ?? 0;
  const guard = p.guard ?? 0;
  const flail = p.flail ?? 0;
  w.arms.forEach((arm, i) => {
    const side = i === 0 ? -1 : 1;
    const wave = flail ? Math.sin(t * 3 + i * 2) * 0.9 * flail : 0;
    // Shoulder: forward, overhead (almost straight up), out to the side. Elbows bend forward.
    arm.upper.rotation.x = fwd * 1.35 + guard * 0.9 + up * 2.9 - swing * 0.4 * (1 - guard) + wave;
    arm.upper.rotation.z = side * (0.12 + guard * 0.25 + flail * 0.9 + (p.spread ?? 0) * 1.2);
    arm.fore.rotation.x = guard * 1.3 + fwd * 0.35 + up * 0.2;
  });
  if (blend && blend.k < 1) {
    classicJoints(w).forEach(([o, axis], i) => {
      o.rotation[axis] = blend.from[i] + (o.rotation[axis] - blend.from[i]) * blend.k;
    });
    const mixed = Math.max(legReach(w.legs[0]), legReach(w.legs[1]));
    w.hips.position.y = sit > 0 ? Math.max(mixed, 0.34) : mixed;
  }
}

/**
 * The lowest point of the body in world space: everything except the gear carried on the back (maces,
 * bows, quivers, shields, swords), which is marked `userData.gear`. A wrestler lying on their back rests
 * on their body, not propped up on a mace or a bow. Exact, from the vertices; call after posing.
 * `every` > 1 checks only every that-many-th vertex: cheaper, and within a centimetre or so on the
 * detailed models (used for knockdowns in the ring, where several can be down at once).
 */
const _v = new THREE.Vector3();
const supportVertices = new WeakMap();
export function lowestBodyPoint(rig, every = 1) {
  let lowest = Infinity;
  eachVertex(rig, every, false, (p) => {
    if (p.y < lowest) lowest = p.y;
  });
  return lowest;
}

/**
 * The box round the whole posed body in world space, gear included (for keeping it in the picture),
 * from every `every`-th vertex: a sample, so pad it by a few centimetres.
 */
export function bodyBounds(rig, box, every = 4) {
  box.makeEmpty();
  eachVertex(rig, every, true, (p) => box.expandByPoint(p));
  return box;
}

function eachVertex(rig, every, gear, fn) {
  rig.root.updateMatrixWorld(true);
  if (rig.skinnedRig) rig.body.skeleton.update();
  const visit = (o) => {
    if (o.userData.gear && !gear) return;
    if (o.isMesh) {
      const pos = o.geometry.attributes.position;
      let indices = supportVertices.get(o.geometry);
      if (!indices) {
        indices = o.geometry.index ? [...new Set(o.geometry.index.array)] : Array.from({ length: pos.count }, (_, i) => i);
        supportVertices.set(o.geometry, indices);
      }
      for (let n = 0; n < indices.length; n += every) fn(o.getVertexPosition(indices[n], _v).applyMatrix4(o.matrixWorld));
    }
    for (const c of o.children) visit(c);
  };
  visit(rig.root);
}

/** For tests: the lowest point of the rig's feet relative to its root, after posing. */
export function lowestFoot(w) {
  if (w.skinnedRig) return modelLowestFoot(w);
  w.root.updateMatrixWorld(true);
  const rootY = w.root.getWorldPosition(new THREE.Vector3()).y;
  let lowest = Infinity;
  const box3 = new THREE.Box3();
  for (const leg of w.legs) {
    box3.setFromObject(leg.shin, true); // exact, from the vertices
    lowest = Math.min(lowest, box3.min.y);
  }
  return (lowest - rootY) / w.root.scale.y;
}
