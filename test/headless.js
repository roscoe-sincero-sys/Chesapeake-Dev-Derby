// Lets the 3D wrestling match run in Node for tests: canvas drawing becomes a no-op.
const noop = new Proxy(function () {}, {
  get: (_, key) => (key === 'measureText' ? () => ({ width: 10, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 }) : key === Symbol.toPrimitive ? () => 0 : noop),
  set: () => true,
  apply: () => noop,
});
globalThis.document ??= {
  createElement: () => ({ width: 0, height: 0, style: {}, getContext: () => noop }),
};

import { readFile } from 'node:fs/promises';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { installWrestlerAssets } from '../public/js/wrestler-models.js';

// Decode the shipped geometry/skin, removing only images so this runs without a browser/GPU.
globalThis.ProgressEvent ??= class ProgressEvent { constructor(type, values) { Object.assign(this, { type }, values); } };
export async function readGeometry(file) {
  const binary = await readFile(new URL(`../public/assets/wrestlers/${file}`, import.meta.url));
  const jsonLength = binary.readUInt32LE(12);
  const document = JSON.parse(binary.subarray(20, 20 + jsonLength));
  document.materials = [{}];
  for (const mesh of document.meshes) for (const primitive of mesh.primitives) primitive.material = 0;
  delete document.images;
  delete document.textures;
  document.buffers[0].uri = `data:application/octet-stream;base64,${binary.subarray(28 + jsonLength).toString('base64')}`;
  const { scene } = await new GLTFLoader().parseAsync(JSON.stringify(document), '');
  return scene;
}

let hd = null;
/** The HD character source (geometry and skeletons, no images), installed for the match to use. */
export async function loadHdAssets() {
  hd ??= Promise.all(['superhero-male.glb', 'superhero-female.glb', 'hair-long.glb', 'hair-parted.glb', 'hair-beard.glb'].map(readGeometry))
    .then(([body, female, longHair, partedHair, beard]) => ({ body, female, longHair, partedHair, beard }));
  const source = await hd;
  installWrestlerAssets(source);
  return source;
}
