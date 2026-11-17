"""Package selected CC0 Standard assets; no paid/source files are required.

Usage: python scripts/prepare-wrestler-assets.py path/to/Universal-Base-Characters-Standard.zip
Requires Pillow for texture resizing. Runtime has no Python dependency.
"""
import hashlib
import io
import json
from pathlib import Path
import struct
import sys
import zipfile

from PIL import Image

OUT = Path(__file__).resolve().parents[1] / 'public/assets/wrestlers'
ROOT = 'Universal Base Characters[Standard]/'


def texture(z, path, size=1024):
    # The upstream glTF references two normal maps with an extra _png suffix.
    if path not in z.namelist():
        path = path.replace('_png.png', '.png')
    im = Image.open(io.BytesIO(z.read(path))).convert('RGB')
    im.thumbnail((size, size), Image.Resampling.LANCZOS)
    output = io.BytesIO()
    im.save(output, 'PNG', optimize=True)
    return output.getvalue()


def glb(z, folder, name, output):
    data = json.loads(z.read(folder + name + '.gltf'))
    binary = bytearray(z.read(folder + data['buffers'][0]['uri']))
    for image in data.get('images', []):
        payload = texture(z, folder + image.pop('uri'))
        binary.extend(b'\0' * (-len(binary) % 4))
        image['bufferView'] = len(data['bufferViews'])
        image['mimeType'] = 'image/png'
        data['bufferViews'].append({'buffer': 0, 'byteOffset': len(binary), 'byteLength': len(payload)})
        binary.extend(payload)
    data['buffers'] = [{'byteLength': len(binary)}]
    data['asset']['extras'] = {'source': 'Quaternius Universal Base Characters Standard', 'license': 'CC0-1.0'}
    encoded = json.dumps(data, separators=(',', ':')).encode()
    encoded += b' ' * (-len(encoded) % 4)
    binary.extend(b'\0' * (-len(binary) % 4))
    payload = (struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(encoded) + 8 + len(binary))
               + struct.pack('<II', len(encoded), 0x4E4F534A) + encoded
               + struct.pack('<II', len(binary), 0x004E4942) + binary)
    (OUT / output).write_bytes(payload)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(sys.argv[1]) as z:
        base = ROOT + 'Base Characters/Godot - UE/'
        hair = ROOT + 'Hairstyles/Origin at 0/glTF (Godot)/'
        glb(z, base, 'Superhero_Male_FullBody', 'superhero-male.glb')
        glb(z, base, 'Superhero_Female_FullBody', 'superhero-female.glb')
        glb(z, hair, 'Hair_Long', 'hair-long.glb')
        glb(z, hair, 'Hair_SimpleParted', 'hair-parted.glb')
        glb(z, hair, 'Hair_Beard', 'hair-beard.glb')
        (OUT / 'skin-light.png').write_bytes(texture(z, ROOT + 'Base Characters/Textures/T_Superhero_Male_Ligh.png'))
        (OUT / 'LICENSE-Quaternius.txt').write_bytes(z.read(ROOT + 'License_Standard.txt'))
    files = {p.name: {'bytes': p.stat().st_size, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()}
             for p in sorted(OUT.iterdir()) if p.suffix in ('.glb', '.png')}
    manifest = {
        'creator': 'Quaternius', 'license': 'CC0-1.0',
        'source': 'https://quaternius.itch.io/universal-base-characters',
        'archive': 'Universal Base Characters[Standard].zip',
        'upstreamUploadId': 15861669,
        'archiveSha256': hashlib.sha256(Path(sys.argv[1]).read_bytes()).hexdigest(),
        'notes': 'Free Standard only. PNGs resized to at most 1024px; missing normal-map URI suffixes repaired. '
                 'The roster uses the free Superhero male and female bodies with distinct proportions; no Teen body is included in Standard. '
                 'Costumes, jewelry and props are authored in wrestler-models.js; recipes are in wrestler-looks.js.',
        'files': files,
    }
    (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(files, indent=2))


if __name__ == '__main__':
    main()
