// The full roster built on free Universal Base Characters. Costumes/props are authored here.
// All dimensions below are in the upstream body's bind space (metres, +Z forward).
import * as THREE from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { WRESTLER_LOOKS } from './wrestler-looks.js';

const ASSETS = new URL('../assets/wrestlers/', import.meta.url);
function assetURL(file) {
  const url = new URL(file, ASSETS);
  const build = new URL(import.meta.url).searchParams.get('v');
  if (build) url.searchParams.set('v', build);
  return url.href;
}
let assets = null;
let pending = null;
const coveredBodies = new WeakMap();

// All costumes cover these regions. Remove hidden body triangles so hips/thighs cannot poke
// through the clothing in a crouch. Each base shares one masked geometry for the page lifetime.
function coveredBody(geometry, female) {
  if (coveredBodies.has(geometry)) return coveredBodies.get(geometry);
  const covered = geometry.clone(), pos = geometry.attributes.position, index = geometry.index.array;
  const kept = [], bottom = female ? 0.36 : 0.58;
  for (let i = 0; i < index.length; i += 3) {
    const triangle = [index[i], index[i + 1], index[i + 2]];
    if (!triangle.every((j) => pos.getY(j) > bottom && pos.getY(j) < 1.025)) kept.push(...triangle);
  }
  covered.setIndex(kept);
  coveredBodies.set(geometry, covered);
  return covered;
}

/** Lazy, retryable loading. The match clock must not run while this is pending. */
export function prepareWrestlerModels() {
  if (assets) return Promise.resolve();
  if (pending) return pending;
  pending = (async () => {
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    const loader = new GLTFLoader();
    const [body, female, longHair, partedHair, beard, lightSkin] = await Promise.all([
      loader.loadAsync(assetURL('superhero-male.glb')),
      loader.loadAsync(assetURL('superhero-female.glb')),
      loader.loadAsync(assetURL('hair-long.glb')),
      loader.loadAsync(assetURL('hair-parted.glb')),
      loader.loadAsync(assetURL('hair-beard.glb')),
      new THREE.TextureLoader().loadAsync(assetURL('skin-light.png')),
    ]);
    lightSkin.flipY = false;
    lightSkin.colorSpace = THREE.SRGBColorSpace;
    assets = { body: body.scene, female: female.scene, longHair: longHair.scene, partedHair: partedHair.scene, beard: beard.scene, lightSkin };
  })().finally(() => { pending = null; });
  return pending;
}

/** Supplies already-decoded assets (Node tests run the HD match without a browser loader). */
export function installWrestlerAssets(source) {
  assets = source;
}

/** The optional source parameter also allows tests to use the real rig without browser image APIs. */
export function createWrestlerRig(kind, belt = '#ffffff', source = assets) {
  const look = WRESTLER_LOOKS[kind.id];
  if (!look || !source) return null;
  const giant = kind.id === 'ghatotkacha';
  const female = look.body === 'female';
  if (female && !source.female) return null;
  const scene = clone(female ? source.female : source.body);
  const root = new THREE.Group();
  root.name = `Universal_${kind.id}`;
  const normalize = new THREE.Group();
  normalize.rotation.y = Math.PI; // the app faces -Z
  const scale = look.height / (female ? 1.775 : 1.82);
  normalize.scale.set(scale * look.width, scale, scale * look.depth);
  root.add(normalize);
  normalize.add(scene);
  const owned = new Set();
  const geometries = new Set();
  const bones = {};
  let body;
  scene.traverse((o) => {
    if (o.isBone) bones[o.name] = o;
    if (o.isMesh) {
      o.castShadow = o.receiveShadow = true;
      o.frustumCulled = false; // animated limbs must not be culled using bind-pose bounds
      o.material = o.material.clone();
      owned.add(o.material);
      if (o.name === 'SuperHero_Male' || o.name === 'Superhero_Female') {
        body = o;
        o.geometry = coveredBody(o.geometry, female);
        if (!look.darkSkin && !female && source.lightSkin) o.material.map = source.lightSkin;
        o.material.color.set(look.skin);
        o.material.roughness = 0.72;
        o.material.metalness = 0;
      }
    }
  });
  if (!body || !bones.pelvis || !bones.Head) throw new Error('Unsupported Universal Base Characters skeleton.');
  root.updateMatrixWorld(true);

  const rests = {};
  const sceneInverse = scene.getWorldQuaternion(new THREE.Quaternion()).invert();
  for (const [name, bone] of Object.entries(bones)) {
    rests[name] = { q: bone.quaternion.clone(), parent: sceneInverse.clone().multiply(bone.parent.getWorldQuaternion(new THREE.Quaternion())) };
  }
  const material = (color, options = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...options });
    owned.add(m);
    return m;
  };
  const gold = material('#e2b554', { metalness: 0.72, roughness: 0.3 });
  const trim = material(look.trim, { metalness: 0.3, roughness: 0.5 });
  const cloth = material(look.cloth, { roughness: 0.95, side: THREE.DoubleSide });
  const lightCloth = material(look.sash, { roughness: 0.9, side: THREE.DoubleSide });
  const hairMat = material('#171019', { roughness: 0.88 });
  const gem = material(look.gem, { roughness: 0.25, metalness: 0.25,
    emissive: look.amulet ? '#8146df' : '#160b12', emissiveIntensity: look.amulet ? 0.9 : 0.15 });

  function mesh(geometry, m) {
    geometries.add(geometry);
    const o = new THREE.Mesh(geometry, m);
    o.castShadow = o.receiveShadow = true;
    return o;
  }
  function ornament(bone, geometry, m, position, rotation = null, size = null, gear = false) {
    const o = mesh(geometry, m);
    o.position.set(...position);
    // Fit decorations authored on the male base to the female base's lower landmarks.
    if (female) o.position.y -= bone === 'Head' ? 0.044 : bone === 'pelvis' ? 0.017 : 0.025;
    if (rotation) o.rotation.set(...rotation);
    if (size) o.scale.set(...size);
    o.userData.gear = gear;
    scene.add(o);
    scene.updateMatrixWorld(true);
    bones[bone].attach(o); // retain its bind-space placement, then follow the bone
    return o;
  }
  function ring(bone, radius, tube, position, m = gold, rotation = [Math.PI / 2, 0, 0], size = null) {
    return ornament(bone, new THREE.TorusGeometry(radius, tube, 8, 40), m, position, rotation, size);
  }
  // Bind newly authored cloth to the actual imported skeleton, rather than hanging rigid skirts.
  function skinned(geometry, m, weights) {
    const pos = geometry.attributes.position;
    const indices = [], values = [];
    for (let i = 0; weights && i < pos.count; i++) {
      const weighted = weights(pos.getX(i), pos.getY(i), pos.getZ(i));
      const joints = weighted.map(([name]) => body.skeleton.bones.indexOf(bones[name]));
      indices.push(...joints, ...Array(4 - joints.length).fill(0));
      values.push(...weighted.map(([, weight]) => weight), ...Array(4 - joints.length).fill(0));
    }
    if (weights) {
      geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
      geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(values, 4));
    }
    geometries.add(geometry);
    const o = new THREE.SkinnedMesh(geometry, m);
    o.castShadow = o.receiveShadow = true;
    o.frustumCulled = false;
    scene.add(o);
    o.bind(body.skeleton, body.bindMatrix);
    return o;
  }
  // Transfer weights from the nearest body vertex. Matching the body's own pelvis/thigh and
  // spine blends avoids the sharp cloth creases produced by a hard left/right bone assignment.
  const bodyPositions = body.geometry.attributes.position;
  const bodyJoints = body.geometry.attributes.skinIndex;
  const bodyWeights = body.geometry.attributes.skinWeight;
  const surfaceWeights = (x, y, z) => {
    let nearest = 0, distance = Infinity;
    for (let i = 0; i < bodyPositions.count; i++) {
      const d = (bodyPositions.getX(i) - x) ** 2 + (bodyPositions.getY(i) - y) ** 2 + (bodyPositions.getZ(i) - z) ** 2;
      if (d < distance) { distance = d; nearest = i; }
    }
    const weights = [];
    for (let j = 0; j < 4; j++) {
      const weight = bodyWeights.getComponent(nearest, j);
      if (weight > 0) weights.push([body.skeleton.bones[bodyJoints.getComponent(nearest, j)].name, weight]);
    }
    return weights;
  };
  // Separate loose trouser legs keep the dhoti covered during deep bends and seated recovery.
  // The overlapping wrap alone would expose the thighs when its open hem turns toward the camera.
  if (!female) for (const side of [-1, 1]) {
    const trousers = new THREE.LatheGeometry([
      new THREE.Vector2(0, 0.575), new THREE.Vector2(0.095, 0.575),
      new THREE.Vector2(0.122, 0.65), new THREE.Vector2(0.137, 0.78),
      new THREE.Vector2(0.128, 0.89), new THREE.Vector2(0.112, 0.975), new THREE.Vector2(0, 0.975),
    ], 32);
    trousers.translate(side * 0.114, 0, -0.036);
    skinned(trousers, cloth, surfaceWeights);
  }
  // Wrapped dhoti, with overlapping pleated panels and a contrasting woven hem.
  const wrap = new THREE.LatheGeometry(female ? [
    new THREE.Vector2(0.305, 0.36), new THREE.Vector2(0.29, 0.54),
    new THREE.Vector2(0.27, 0.77), new THREE.Vector2(0.25, 0.94), new THREE.Vector2(0.19, 1.025),
  ] : [
    new THREE.Vector2(0.255, 0.72), new THREE.Vector2(0.245, 0.8),
    new THREE.Vector2(0.211, 0.94), new THREE.Vector2(0.185, 1.045),
  ], 48);
  wrap.scale(1, 1, 0.8);
  if (female) wrap.translate(0, 0, -0.02);
  skinned(wrap, cloth, surfaceWeights).name = female ? 'Skirt' : 'DhotiWrap';
  function panel(center, width, top, bottom, z, m, pleats = true) {
    const g = new THREE.PlaneGeometry(width, top - bottom, 12, 12);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i) + (top + bottom) / 2;
      const fold = pleats ? 0.014 * Math.cos(x / width * Math.PI * 8) : 0;
      p.setXYZ(i, x + center, y, z + fold + (top - y) * 0.04);
    }
    g.computeVertexNormals();
    return skinned(g, m, surfaceWeights);
  }
  const panelBottom = female ? 0.37 : 0.52;
  panel(0, 0.18, 1.04, panelBottom, female ? 0.225 : 0.199, lightCloth);
  panel(-0.048, 0.018, 1.03, panelBottom, female ? 0.245 : 0.219, trim, false);
  panel(0.048, 0.018, 1.03, panelBottom, female ? 0.245 : 0.219, trim, false);
  panel(0, 0.18, panelBottom + 0.03, panelBottom, female ? 0.26 : 0.234, trim, false);
  const hem = new THREE.CylinderGeometry(female ? 0.303 : 0.254, female ? 0.307 : 0.26, 0.032, 48, 2, true);
  hem.translate(0, female ? 0.375 : 0.735, 0);
  hem.scale(1, 1, 0.8);
  if (female) hem.translate(0, 0, -0.02);
  skinned(hem, trim, surfaceWeights);
  ring('pelvis', 0.187, 0.025, [0, 1.037, 0], material(belt), [Math.PI / 2, 0, 0], [1, 0.84, 1]);
  ring('pelvis', 0.189, 0.009, [0, 1.068, 0], gold, [Math.PI / 2, 0, 0], [1, 0.84, 1]);
  ornament('pelvis', new THREE.SphereGeometry(0.04, 16, 12), gem, [0, 1.04, 0.17], null, [1, 0.85, 0.4]);

  // A diagonal angavastram, following spine and pelvis deformation.
  const sash = new THREE.PlaneGeometry(0.065, 0.49, 3, 18);
  const sp = sash.attributes.position;
  for (let i = 0; i < sp.count; i++) {
    const y = sp.getY(i) + 1.265;
    sp.setXYZ(i, sp.getX(i) + (1.265 - y) * 0.58, y, 0.205);
  }
  sash.computeVertexNormals();
  skinned(sash, lightCloth, surfaceWeights);
  function fittedTorso(m, bottom, top, name) {
    const g = body.geometry.clone();
    const positions = g.attributes.position, normals = g.attributes.normal;
    const originalIndex = g.index.array, kept = [];
    for (let i = 0; i < originalIndex.length; i += 3) {
      const triangle = [originalIndex[i], originalIndex[i + 1], originalIndex[i + 2]];
      if (triangle.every((j) => positions.getY(j) >= bottom && positions.getY(j) <= top && Math.abs(positions.getX(j)) < 0.25)) kept.push(...triangle);
    }
    g.setIndex(kept);
    for (let i = 0; i < positions.count; i++) {
      positions.setXYZ(i, positions.getX(i) + normals.getX(i) * 0.012,
        positions.getY(i) + normals.getY(i) * 0.012, positions.getZ(i) + normals.getZ(i) * 0.012);
    }
    skinned(g, m, null).name = name;
  }
  if (female) {
    fittedTorso(material(look.top, { roughness: 0.9, side: THREE.DoubleSide }), 1.16, 1.48, 'Choli');
    ring('spine_02', 0.135, 0.012, [0, 1.18, -0.005], gold, [Math.PI / 2, 0, 0], [1, 0.77, 1]);
  }
  if (look.armor) {
    fittedTorso(gold, 1.12, 1.49, 'Kavacha');
    ornament('spine_03', new THREE.CylinderGeometry(0.064, 0.064, 0.018, 24), gem, [0, 1.375, 0.16], [Math.PI / 2, 0, 0]).name = 'SunEmblem';
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      ornament('spine_03', new THREE.ConeGeometry(0.011, 0.045, 5), gold,
        [Math.sin(a) * 0.086, 1.375 + Math.cos(a) * 0.086, 0.165], [0, 0, -a]);
    }
  }
  if (look.cape) {
    const g = new THREE.PlaneGeometry(0.5, 0.84, 14, 18);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i) + 1.055;
      p.setXYZ(i, p.getX(i) * (0.75 + (1.475 - y) * 0.6), y, -0.215 - 0.022 * Math.cos(p.getX(i) * 48));
    }
    g.computeVertexNormals();
    skinned(g, material(look.cape, { roughness: 0.95, side: THREE.DoubleSide }), (x, y) => {
      const k = THREE.MathUtils.clamp((y - 0.96) / 0.45, 0, 1);
      return [['pelvis', 1 - k], ['spine_03', k]];
    }).name = 'Cape';
    for (const side of [-1, 1]) ornament('spine_03', new THREE.SphereGeometry(0.021, 12, 8), gold, [side * 0.15, 1.465, 0.06]);
  }
  // Bone-local armlets and wrist cuffs: their axes follow the limbs even while grappling.
  for (const side of ['l', 'r']) {
    for (const [name, radius, y, tube] of [['upperarm', 0.09, 0.09, 0.012], ['lowerarm', 0.052, 0.19, 0.013], ['calf', 0.047, 0.37, 0.01]]) {
      const cuff = mesh(new THREE.TorusGeometry(radius, tube, 8, 28), gold);
      cuff.rotation.x = Math.PI / 2;
      cuff.position.y = y;
      bones[`${name}_${side}`].add(cuff);
    }
  }
  // Necklace, pendant and earrings.
  const necklace = [];
  for (let i = 0; i <= 48; i++) {
    const a = i / 48 * Math.PI * 2;
    necklace.push(new THREE.Vector3(Math.cos(a) * 0.145, 1.487 - Math.max(0, Math.sin(a)) * 0.15, Math.sin(a) * 0.155));
  }
  ornament('spine_03', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(necklace), 48, 0.008, 6, true), gold, [0, 0, 0]);
  ornament('spine_03', new THREE.OctahedronGeometry(giant ? 0.048 : 0.03), gem, [0, 1.335, 0.17], null, [0.8, 1.2, 0.45]);
  for (const side of [-1, 1]) {
    ring('Head', look.bigEarrings ? 0.032 : 0.019, look.bigEarrings ? 0.006 : 0.004,
      [side * 0.108, look.bigEarrings ? 1.645 : 1.66, -0.007], gold, [0, Math.PI / 2, 0]);
  }
  // Free hair meshes. Fit regular hair to the superhero head; materials are independently owned.
  function attachHair(hairSource, name, short = false) {
    if (!hairSource) return;
    const hair = hairSource.clone(true);
    hair.name = name;
    hair.scale.set(female ? 1 : 1.02, short ? 0.94 : female ? 1 : 1.02, female ? 1 : 1.02);
    hair.position.y = short ? 0.12 : female ? 0 : 0.025;
    if (name === 'Beard' && !short) { hair.scale.y = 1.35; hair.position.y = -0.57; }
    hair.traverse((o) => {
      if (o.isMesh) {
        o.material = o.material.clone();
        o.material.color.set('#352329');
        o.castShadow = true;
        owned.add(o.material);
      }
    });
    scene.add(hair);
    scene.updateMatrixWorld(true);
    bones.Head.attach(hair);
  }
  attachHair(look.hair === 'parted' ? source.partedHair : source.longHair, 'Hair');
  if (look.beard) attachHair(source.beard, 'Beard', look.shortBeard);
  ring('Head', 0.109, 0.012, [0, 1.758, -0.015], gold).name = 'Crown';
  if (look.hair === 'wild') {
    // A wild mane above and around the free long-hair mesh, plus two small upward tusks.
    for (let i = 0; i < 11; i++) {
      const a = i / 11 * Math.PI * 2;
      ornament('Head', new THREE.ConeGeometry(0.043, 0.16, 7), hairMat,
        [Math.cos(a) * 0.087, 1.83 + Math.sin(i * 3) * 0.022, -0.035 + Math.sin(a) * 0.07],
        [Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4]);
    }
  }
  if (look.tusks) {
    const ivory = material('#efe1bf');
    for (const side of [-1, 1]) {
      ornament('Head', new THREE.ConeGeometry(0.012, 0.065, 12), ivory, [side * 0.04, 1.645, 0.102], [0.18, 0, side * -0.22]);
    }
  }
  if (look.mustache) {
    for (const side of [-1, 1]) {
      const thick = look.mustache === 'thick';
      ornament('Head', new THREE.SphereGeometry(1, 16, 8), hairMat, [side * 0.027, 1.665, 0.105],
        [0, 0, side * 0.12], [thick ? 0.036 : 0.028, thick ? 0.01 : 0.006, 0.01]);
      if (thick) {
        const points = [[side * 0.025, 1.664, 0.109], [side * 0.055, 1.665, 0.105], [side * 0.064, 1.681, 0.098]].map((p) => new THREE.Vector3(...p));
        ornament('Head', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 12, 0.005, 6), hairMat, [0, 0, 0]);
      }
    }
  }
  if (look.crown === 'tall') {
    const points = [[0.105, 1.76], [0.108, 1.81], [0.081, 1.85], [0.068, 1.94], [0.025, 2.045], [0, 2.065]];
    ornament('Head', new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), 32), gold, [0, 0, -0.015]);
    for (let i = 0; i < 3; i++) ring('Head', 0.091 - i * 0.024, 0.007, [0, 1.84 + i * 0.065, -0.015], trim);
  } else if (look.crown === 'mukuta') {
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + i / 6 * Math.PI;
      ornament('Head', new THREE.ConeGeometry(0.025, i === 3 ? 0.14 : 0.075, 5), gold,
        [Math.sin(a) * 0.102, 1.8, Math.cos(a) * 0.095 - 0.015]);
    }
  }
  ornament('Head', new THREE.OctahedronGeometry(look.crown === 'tiara' ? 0.02 : 0.025), gem,
    [0, look.crown === 'tall' ? 1.825 : 1.789, 0.1], null, [0.8, 1.25, 0.5]);
  ornament('Head', new THREE.BoxGeometry(female ? 0.012 : 0.009, female ? 0.012 : 0.031, 0.003), material('#b72e2b'), [0, 1.728, 0.1]);
  if (look.braid) {
    const points = [];
    for (let i = 0; i <= 14; i++) points.push(new THREE.Vector3(Math.sin(i * Math.PI) * 0.012, 1.62 - i * 0.045, -0.145 - i * 0.003));
    ornament('Head', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 40, 0.026, 10), hairMat, [0, 0, 0]).name = 'Braid';
    for (let i = 0; i < 7; i++) ring('Head', 0.028, 0.005, [0, 1.57 - i * 0.09, -0.148 - i * 0.006], gold);
  }
  if (look.noseRing) ring('Head', 0.012, 0.003, [0.021, 1.681, 0.107], gold, [0, Math.PI / 2, 0]).name = 'NoseRing';
  if (look.feather) {
    const green = material('#248366'), blue = material('#226291');
    ornament('Head', new THREE.CylinderGeometry(0.003, 0.004, 0.22, 6), gold, [0.065, 1.87, -0.01], [0, 0, -0.25]);
    ornament('Head', new THREE.SphereGeometry(1, 16, 12), green, [0.09, 1.98, -0.01], [0, 0, -0.25], [0.042, 0.075, 0.009]).name = 'PeacockFeather';
    ornament('Head', new THREE.SphereGeometry(1, 16, 12), blue, [0.09, 1.99, 0], null, [0.021, 0.03, 0.008]);
    ornament('Head', new THREE.SphereGeometry(0.011, 12, 8), gem, [0.09, 1.99, 0.009]);
  }
  if (look.seam) {
    const points = [];
    for (let i = 0; i <= 10; i++) points.push(new THREE.Vector3(i % 2 ? 0.007 : -0.007, 1.08 + i * 0.038, 0.14));
    ornament('spine_02', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 24, 0.004, 5), material('#63392f'), [0, 0, 0]).name = 'Seam';
  }
  // Carried equipment is decorative: exclude it from floor support while tumbling.
  if (look.weapon === 'mace' || look.weapon === 'goldMace') {
    const metal = look.weapon === 'goldMace' ? gold : material('#64717c', { metalness: 0.8, roughness: 0.4 });
    const z = look.cape ? -0.28 : -0.19;
    ornament('spine_03', new THREE.CylinderGeometry(0.015, 0.018, 0.78, 12), gold, [0.07, 1.21, z], [0, 0, -0.35], null, true).name = 'MaceHandle';
    ornament('spine_03', new THREE.SphereGeometry(0.115, 16, 12), metal, [0.205, 1.58, z], null, [1, 1.2, 1], true).name = 'Mace';
    for (let i = 0; i < 5; i++) ornament('spine_03', new THREE.TorusGeometry(0.116, 0.009, 6, 24), gold, [0.205, 1.58, z], [Math.PI / 2, 0, i * Math.PI / 5], null, true);
  }
  function addBow() {
    const points = [];
    for (let i = 0; i <= 16; i++) {
      const a = i / 16 * Math.PI, y = 0.74 + i / 16;
      points.push(new THREE.Vector3(0.1 + (y - 1.24) * 0.25 - Math.sin(a) * 0.32, y, -0.24));
    }
    const curve = new THREE.CatmullRomCurve3(points);
    ornament('spine_03', new THREE.TubeGeometry(curve, 48, 0.012, 8), material('#704626'), [0, 0, 0], null, null, true).name = 'Gandiva';
    const string = new THREE.LineCurve3(points[0], points[points.length - 1]);
    ornament('spine_03', new THREE.TubeGeometry(string, 1, 0.002, 4), material('#ddd1aa'), [0, 0, 0], null, null, true).name = 'Bowstring';
    ornament('spine_03', new THREE.CylinderGeometry(0.058, 0.05, 0.48, 16), material('#69412b'), [0.17, 1.18, -0.235], [0, 0, -0.12], null, true).name = 'Quiver';
    for (let i = 0; i < 5; i++) {
      const x = 0.14 + i * 0.015, y = 1.51 + (i % 2) * 0.025;
      ornament('spine_03', new THREE.CylinderGeometry(0.003, 0.003, 0.33, 5), gold, [x, y, -0.235], null, null, true);
      ornament('spine_03', new THREE.OctahedronGeometry(0.02), lightCloth, [x, y + 0.14, -0.235], null, [0.5, 1.5, 0.6], true);
    }
  }
  if (look.weapon === 'bow') addBow();
  if (look.weapon === 'sword') {
    ornament('spine_03', new THREE.BoxGeometry(0.045, 0.64, 0.03), material('#422e25'), [-0.03, 1.14, -0.22], [0, 0, -0.4], null, true).name = 'Sword';
    ornament('spine_03', new THREE.BoxGeometry(0.15, 0.025, 0.05), gold, [0.1, 1.45, -0.22], [0, 0, -0.4], null, true);
    ornament('spine_03', new THREE.CylinderGeometry(0.018, 0.018, 0.15, 10), gold, [0.135, 1.53, -0.22], [0, 0, -0.4], null, true);
    ornament('spine_03', new THREE.OctahedronGeometry(0.027), gem, [0.17, 1.61, -0.22], null, null, true);
  }
  if (look.weapon === 'shield') {
    const shield = material(look.shield, { metalness: 0.3, roughness: 0.45 });
    ornament('spine_03', new THREE.CylinderGeometry(0.205, 0.205, 0.035, 40), shield, [0, 1.3, -0.175], [Math.PI / 2, 0, 0], null, true).name = 'Shield';
    ornament('spine_03', new THREE.TorusGeometry(0.205, 0.012, 8, 40), gold, [0, 1.3, -0.2], null, null, true);
    ornament('spine_03', new THREE.SphereGeometry(0.045, 16, 12), gold, [0, 1.3, -0.21], null, [1, 1, 0.6], true);
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      ornament('spine_03', new THREE.SphereGeometry(0.009, 8, 6), gold, [Math.cos(a) * 0.155, 1.3 + Math.sin(a) * 0.155, -0.2], null, null, true);
    }
  }
  const footVertices = [], seatedSupport = [];
  const positions = body.geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    if (positions.getY(i) < 0.13) footVertices.push(i);
  }
  scene.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    const indices = [];
    const pos = o.geometry.attributes.position;
    const drawn = o.geometry.index ? new Set(o.geometry.index.array) : Array.from({ length: pos.count }, (_, i) => i);
    for (const i of drawn) if (pos.getY(i) < 1.08) indices.push(i);
    seatedSupport.push({ mesh: o, indices });
  });
  const rig = { root, scene, normalize, bones, rests, body, footVertices, seatedSupport, look,
    skinnedRig: true, height: look.height + (look.crown === 'tall' ? 0.36 : giant ? 0.23 : 0.18), owned: [...owned],
    disposeBody() {
      for (const g of geometries) g.dispose();
      for (const m of owned) m.dispose();
      // Geometry and image textures from the source are shared for this page's lifetime.
      const skeletons = new Set();
      scene.traverse((o) => { if (o.isSkinnedMesh) skeletons.add(o.skeleton); });
      for (const s of skeletons) s.dispose();
    },
  };
  poseWrestlerModel(rig);
  return rig;
}

const ax = new THREE.Vector3(1, 0, 0);
const ay = new THREE.Vector3(0, 1, 0);
const az = new THREE.Vector3(0, 0, 1);
const delta = new THREE.Quaternion();
const extra = new THREE.Quaternion();
const temp = new THREE.Vector3();
const target = new THREE.Quaternion();

/** Apply a bind-space rotation through the parent rest orientation. */
function rotate(w, name, x = 0, y = 0, z = 0) {
  const bone = w.bones[name], rest = w.rests[name];
  delta.setFromAxisAngle(ax, x);
  delta.multiply(extra.setFromAxisAngle(ay, y));
  delta.multiply(extra.setFromAxisAngle(az, z));
  bone.quaternion.copy(rest.parent).invert().multiply(delta).multiply(rest.parent).multiply(rest.q).normalize();
}

/** Every bone's current rotation, to blend from (see pose in wrestlers.js). */
export function captureWrestlerModel(w) {
  return Object.keys(w.rests).map((name) => w.bones[name].quaternion.clone());
}

export function poseWrestlerModel(w, p = {}, blend = null) {
  const t = p.walk ?? 0, stride = p.stride ?? 0;
  const swing = Math.sin(t) * stride;
  const crouch = p.crouch ?? 0, sit = p.sit ?? 0;
  for (const [name, rest] of Object.entries(w.rests)) w.bones[name].quaternion.copy(rest.q);
  for (const [i, side] of ['l', 'r'].entries()) {
    const sign = i === 0 ? 1 : -1;
    const step = sign * swing;
    const thigh = -(step + crouch * 0.6 + sit * 1.5);
    const knee = Math.max(0, -step) * 0.8 + crouch;
    rotate(w, `thigh_${side}`, thigh, 0, sign * (0.035 + (p.wide ?? 0)));
    rotate(w, `calf_${side}`, knee);
    rotate(w, `foot_${side}`, -0.45 * (thigh + knee));
    const guard = p.guard ?? 0, flail = p.flail ?? 0;
    const wave = Math.sin(t * 3 + i * 2) * 0.55 * flail;
    const forward = (p.armsForward ?? 0) * 1.25 + guard * 0.65 + (p.armsUp ?? 0) * 2.9 - step * 0.4 * (1 - guard) + wave;
    const spread = 0.12 + guard * 0.2 + (p.spread ?? 0) * 1.1 + flail * 0.55;
    rotate(w, `upperarm_${side}`, -forward, 0, -sign * (Math.PI / 2 - spread));
    rotate(w, `lowerarm_${side}`, 0, -sign * (guard * 1.15 + (p.armsForward ?? 0) * 0.38 + (p.armsUp ?? 0) * 0.2));
    // Close the open bind-pose hands into relaxed wrestling fists.
    for (const finger of ['index', 'middle', 'ring', 'pinky']) {
      for (const joint of ['01', '02', '03']) {
        const name = `${finger}_${joint}_${side}`;
        w.bones[name].quaternion.multiply(extra.setFromAxisAngle(ax, 1.15));
      }
    }
  }
  rotate(w, 'spine_01', (p.lean ?? 0) + crouch * 0.25, p.twist ?? 0, -(p.tilt ?? 0));
  rotate(w, 'Head', -(p.look ?? 0));
  if (blend && blend.k < 1) {
    // Ease in from the captured pose, bone by bone, so a new move never snaps the limbs (#98).
    Object.keys(w.rests).forEach((name, i) => {
      const q = w.bones[name].quaternion;
      target.copy(q);
      q.copy(blend.from[i]).slerp(target, blend.k);
    });
  }
  w.scene.position.y = 0;
  w.root.updateMatrixWorld(true);
  w.body.skeleton.update();
  // Compute support in body bind space, independent of last frame's gameplay pitch/translation.
  let lowest = Infinity;
  for (const i of w.footVertices) lowest = Math.min(lowest, w.body.getVertexPosition(i, temp).y);
  if (sit > 0) {
    // Include the dhoti and its weighted panels so seated cloth also rests above the mat.
    for (const { mesh, indices } of w.seatedSupport) {
      for (const i of indices) lowest = Math.min(lowest, mesh.getVertexPosition(i, temp).y);
    }
  }
  w.scene.position.y = -lowest;
}

export function modelLowestFoot(w) {
  w.root.updateMatrixWorld(true);
  w.body.skeleton.update();
  const inverse = w.root.matrixWorld.clone().invert();
  let lowest = Infinity;
  for (const i of w.footVertices) {
    w.body.getVertexPosition(i, temp).applyMatrix4(w.body.matrixWorld).applyMatrix4(inverse);
    lowest = Math.min(lowest, temp.y);
  }
  return lowest;
}
