// The wrestlers for "Let's Wrestle Instead": Mahabharata characters built from simple shapes,
// with a jointed rig (hips, torso, head, two-part arms and legs) that wrestle.js poses each frame.
// They face -Z, like the racers.

import * as THREE from 'three';
import { mat, box, ball, cyl, cone, torus, at, group, makeSprite, nameTagTexture } from './util3d.js';

const GOLD = '#d4a017';
const HAIR = '#1b1410';

/** A limb segment hanging down from its joint: returns { joint, end } groups. */
function segment(length, radiusTop, radiusBottom, material) {
  const joint = new THREE.Group();
  joint.add(at(cyl(radiusTop, radiusBottom, length, material, 10), 0, -length / 2, 0));
  const end = new THREE.Group();
  end.position.y = -length;
  joint.add(end);
  return { joint, end };
}

/**
 * Builds a humanoid rig. `look` sets the build and costume:
 *   skin, build (overall size), bulk (width), dhoti, border, sash, crown ('band' | 'mukuta' | 'tall'),
 *   gem, mustache, beard, back ('mace' | 'goldMace' | 'bow'), cape, seam.
 */
function humanoid(look, belt) {
  const skin = mat(look.skin, { roughness: 0.55 });
  const gold = mat(GOLD, { metalness: 0.6, roughness: 0.3 });
  const cloth = mat(look.dhoti, { roughness: 0.8 });
  const border = mat(look.border ?? GOLD, { roughness: 0.6 });
  const bulk = look.bulk ?? 1;
  const root = new THREE.Group();

  // Hips and dhoti.
  const hips = new THREE.Group();
  hips.position.y = 1.0;
  hips.add(at(cyl(0.3 * bulk, 0.36 * bulk, 0.42, cloth, 14), 0, -0.08, 0));
  hips.add(at(cyl(0.305 * bulk, 0.305 * bulk, 0.08, mat(belt), 14), 0, 0.12, 0)); // the wrestler's colour
  hips.add(at(box(0.16, 0.5, 0.05, cloth), 0, -0.3, -0.27 * bulk)); // front pleats
  hips.add(at(box(0.17, 0.04, 0.06, border), 0, -0.54, -0.27 * bulk));
  root.add(hips);

  const legs = [-1, 1].map((side) => {
    const thigh = segment(0.5, 0.13 * bulk, 0.11 * bulk, cloth);
    thigh.joint.position.set(side * 0.16 * bulk, -0.12, 0);
    const shin = segment(0.48, 0.09 * bulk, 0.07 * bulk, skin);
    shin.end.add(at(box(0.13, 0.08, 0.28, mat('#5c3a21')), 0, -0.02, -0.06)); // foot
    shin.joint.add(at(torus(0.085 * bulk, 0.02, gold), 0, -0.4, 0, Math.PI / 2)); // anklet
    thigh.end.add(shin.joint);
    hips.add(thigh.joint);
    return { thigh: thigh.joint, shin: shin.joint };
  });

  // Torso: bare-chested, as wrestlers in the akhada, with jewellery and a sash.
  const torso = new THREE.Group();
  torso.position.y = 0.14;
  hips.add(torso);
  torso.add(at(ball(0.34 * bulk, skin, 1.05, 0.9, 0.7), 0, 0.42, 0));
  torso.add(at(ball(0.3 * bulk, skin, 1.0, 0.85, 0.72), 0, 0.12, 0));
  torso.add(at(torus(0.17, 0.025, gold), 0, 0.72, -0.05, Math.PI / 2 - 0.35)); // necklace
  torso.add(at(ball(0.04, mat('#c92a2a', { metalness: 0.3 })), 0, 0.6, -0.22 * bulk)); // pendant
  if (look.sash) torso.add(at(box(0.09, 0.82, 0.05, mat(look.sash)), 0.02, 0.38, -0.2 * bulk, 0, 0, 0.62));
  if (look.seam) torso.add(at(box(0.012, 0.62, 0.02, mat('#4a2c18')), 0, 0.3, -0.235 * bulk)); // Jarasandha, joined from two halves
  if (look.cape) {
    const cape = at(box(0.66 * bulk, 0.95, 0.03, mat(look.cape, { roughness: 0.9 })), 0, 0.2, 0.26 * bulk, -0.12);
    cape.castShadow = false;
    torso.add(cape);
  }
  if (look.back === 'mace' || look.back === 'goldMace') {
    const head = look.back === 'goldMace' ? gold : mat('#5f6b73', { metalness: 0.5, roughness: 0.4 });
    torso.add(at(group(at(cyl(0.035, 0.035, 0.9, mat('#6b4423'), 8), 0, 0, 0), at(ball(0.17, head), 0, 0.5, 0), at(cone(0.05, 0.12, head, 6), 0, 0.68, 0)), 0.12, 0.4, 0.3 * bulk, 0, 0, 0.5));
  }
  if (look.back === 'bow') {
    // Gandiva on the back, with a quiver of arrows.
    const bow = at(torus(0.62, 0.025, mat('#7c4a1e'), Math.PI * 0.9), -0.05, 0.42, 0.28, 0, Math.PI / 2, Math.PI * 0.55);
    const quiver = group(at(cyl(0.07, 0.06, 0.55, mat('#8c5a2b'), 8), 0, 0, 0));
    for (let i = 0; i < 4; i++) quiver.add(at(cyl(0.008, 0.008, 0.3, mat('#e9ecef'), 4), (i - 1.5) * 0.025, 0.4, 0));
    torso.add(bow, at(quiver, 0.18, 0.45, 0.25, 0, 0, -0.35));
  }

  const arms = [-1, 1].map((side) => {
    const upper = segment(0.42, 0.1 * bulk, 0.085 * bulk, skin);
    upper.joint.position.set(side * 0.4 * bulk, 0.62, 0);
    upper.joint.add(at(torus(0.1 * bulk, 0.025, gold), 0, -0.14, 0, Math.PI / 2)); // armlet
    const fore = segment(0.38, 0.08 * bulk, 0.065 * bulk, skin);
    fore.joint.add(at(torus(0.075 * bulk, 0.022, gold), 0, -0.32, 0, Math.PI / 2)); // bangle
    fore.end.add(at(ball(0.085 * bulk, skin), 0, -0.03, 0));
    upper.end.add(fore.joint);
    torso.add(upper.joint);
    return { upper: upper.joint, fore: fore.joint };
  });

  // Head: crown, hair, face.
  const head = new THREE.Group();
  head.position.y = 0.88;
  torso.add(head);
  head.add(at(cyl(0.08, 0.09, 0.12, skin, 8), 0, -0.04, 0)); // neck
  head.add(at(ball(0.19, skin, 1, 1.12, 1), 0, 0.17, 0));
  head.add(at(ball(0.195, mat(HAIR), 1, 1.0, 1), 0, 0.2, 0.04)); // hair at the back
  for (const side of [-1, 1]) {
    head.add(at(ball(0.026, mat('#ffffff')), side * 0.07, 0.2, -0.17));
    head.add(at(ball(0.014, mat('#111111')), side * 0.07, 0.2, -0.19));
    head.add(at(torus(0.035, 0.012, gold), side * 0.19, 0.1, 0, 0, Math.PI / 2, 0)); // earrings
  }
  head.add(at(box(0.025, 0.06, 0.01, mat('#c92a2a')), 0, 0.29, -0.185)); // tilak
  if (look.mustache) head.add(at(box(look.mustache === 'thick' ? 0.2 : 0.13, 0.035, 0.04, mat(HAIR)), 0, 0.09, -0.18));
  if (look.beard) head.add(at(ball(0.15, mat(HAIR), 1.05, 0.9, 0.8), 0, 0.02, -0.07));
  const crownMat = gold;
  if (look.crown === 'band') {
    head.add(at(cyl(0.2, 0.2, 0.08, crownMat, 16), 0, 0.3, 0));
  } else {
    const tall = look.crown === 'tall' ? 0.42 : 0.3;
    head.add(at(cyl(0.17, 0.2, 0.12, crownMat, 16), 0, 0.33, 0));
    head.add(at(cone(0.16, tall, crownMat, 16), 0, 0.39 + tall / 2, 0));
    head.add(at(ball(0.045, crownMat), 0, 0.41 + tall, 0));
    if (look.gem) head.add(at(ball(0.045, mat(look.gem, { emissive: look.gem, emissiveIntensity: 0.4 })), 0, 0.36, -0.19));
  }

  root.scale.setScalar(look.build ?? 1);
  return { root, hips, torso, head, arms, legs, height: 2.15 * (look.build ?? 1) };
}

const LOOKS = {
  // The mighty Pandava: the biggest of them, saffron dhoti, heavy mustache, iron mace on his back.
  bhima: { skin: '#8d5524', build: 1.16, bulk: 1.18, dhoti: '#e8590c', sash: '#ffd43b', crown: 'band', mustache: 'thick', back: 'mace' },
  // King of Magadha: maroon and gold, full beard, tall crown with a ruby, and the seam where he was joined.
  jarasandha: { skin: '#7a4a2a', build: 1.12, bulk: 1.12, dhoti: '#8f1d3f', border: '#f2b817', sash: '#f2b817', crown: 'tall', gem: '#e03131', beard: true, mustache: 'thick', seam: true },
  // The Kaurava prince: royal blue, tall jewelled crown, golden mace and a red cape for the crowd.
  duryodhana: { skin: '#9c6644', build: 1.06, bulk: 1.05, dhoti: '#1c3d7a', sash: '#f8f9fa', crown: 'tall', gem: '#1c7ed6', mustache: 'thin', back: 'goldMace', cape: '#a61e4d' },
  // The archer: slender, yellow pitambara, pointed crown, Gandiva and a quiver on his back.
  arjuna: { skin: '#b07a52', build: 1.0, bulk: 0.94, dhoti: '#f2b817', border: '#c92a2a', sash: '#1971c2', crown: 'mukuta', gem: '#2f9e44', mustache: 'thin', back: 'bow' },
};

/**
 * Builds one wrestler: rig + floating name tag (the teammate's name) and a smaller "as <character>" tag.
 * `color` is the wrestler's own belt colour, so two of the same character can be told apart.
 */
export function buildWrestler(kind, color, name) {
  const rig = humanoid(LOOKS[kind.id], color);
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
    },
  };
}

/**
 * Poses the rig. All angles in radians; anything not given relaxes to neutral.
 * pose: { walk (phase), stride, armsUp, armsForward, guard, lean, twist, crouch, flail, kneel, sit }
 */
export function pose(w, p = {}) {
  const t = p.walk ?? 0;
  const stride = p.stride ?? 0;
  const swing = Math.sin(t) * stride;
  // Rotation about x: positive swings a limb forward (towards -Z, the way the wrestler faces).
  // Thighs swing forward for a crouch or a sit; shins bend back at the knee (negative).
  w.legs[0].thigh.rotation.x = swing + (p.crouch ?? 0) * 0.6 + (p.sit ?? 0) * 1.45;
  w.legs[1].thigh.rotation.x = -swing + (p.crouch ?? 0) * 0.6 + (p.sit ?? 0) * 1.45;
  w.legs[0].shin.rotation.x = -(Math.max(0, -swing) * 0.8 + (p.crouch ?? 0) * 1.0 + (p.sit ?? 0) * 1.5);
  w.legs[1].shin.rotation.x = -(Math.max(0, swing) * 0.8 + (p.crouch ?? 0) * 1.0 + (p.sit ?? 0) * 1.5);
  w.legs[0].thigh.rotation.z = -0.06 - (p.wide ?? 0);
  w.legs[1].thigh.rotation.z = 0.06 + (p.wide ?? 0);
  w.hips.position.y = 1.0 - (p.crouch ?? 0) * 0.18 - (p.sit ?? 0) * 0.55;

  // `lean` > 0 bends forward, < 0 arches back (as over the top rope).
  w.torso.rotation.x = -(p.lean ?? 0) - (p.crouch ?? 0) * 0.25;
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
    // Shoulder: forward (-x rotation raises the arm in front), up (overhead), out to the side.
    // Shoulder: forward, overhead (almost straight up), out to the side. Elbows bend forward.
    arm.upper.rotation.x = fwd * 1.35 + guard * 0.9 + up * 2.9 - swing * 0.4 * (1 - guard) + wave;
    arm.upper.rotation.z = side * (0.12 + guard * 0.25 + flail * 0.9 + (p.spread ?? 0) * 1.2);
    arm.fore.rotation.x = guard * 1.3 + fwd * 0.35 + up * 0.2;
  });
}
