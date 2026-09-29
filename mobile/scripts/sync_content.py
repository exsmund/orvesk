#!/usr/bin/env python3
"""Build mobile content from canonical repository data; never copy player saves."""
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys

sys.dont_write_bytecode = True

MOBILE = Path(__file__).resolve().parents[1]
ROOT = MOBILE.parent
OUT = MOBILE / 'content' / 'generated'
MIPMAP_ART = {'/ui/logos-shards.png'}
CATALOGS = ['weapons', 'shields', 'armor', 'footwear', 'jewelry', 'basic-equipment', 'base-actions', 'skills', 'creatures',
            'hero-portraits', 'maps', 'journey-encounters', 'item-art', 'combat-balance', 'damage-types',
            'story', 'characters', 'story-gameplay', 'map-points', 'journey-rules', 'portrait-presentation']

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    paths = {'/ui/start-landscape.png',
             '/ui/battle-modes/free.png',
             '/ui/logos-shards.png'}
    old_manifest = json.loads((OUT / 'manifest.json').read_text()) if (OUT / 'manifest.json').exists() else {}
    spec = importlib.util.spec_from_file_location("story_compiler", ROOT / "tools/compile-story.py")
    compiler = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(compiler)
    runtime = compiler.compile_story()
    (OUT / "story-runtime.json").write_text(json.dumps(runtime, ensure_ascii=False, indent=2) + "\n")
    manifest = {}
    def collect(value):
        if isinstance(value, str) and value.startswith('/') and value.endswith(('.png', '.webp', '.jpg')):
            paths.add(value)
        elif isinstance(value, list):
            for x in value: collect(x)
        elif isinstance(value, dict):
            for x in value.values(): collect(x)
    for name in CATALOGS:
        source = ROOT / 'data' / (name + '.json')
        raw = source.read_bytes()
        value = json.loads(raw)
        collect(value)
        (OUT / (name + '.json')).write_bytes(raw)
        manifest[str(source.relative_to(ROOT))] = hashlib.sha256(raw).hexdigest()
    palette_source = MOBILE / 'content/palette.json'
    palette_raw = palette_source.read_bytes()
    colors = json.loads(palette_raw)
    if not isinstance(colors, dict) or not colors:
        raise ValueError('Palette must be a non-empty JSON object')
    for token, color in colors.items():
        if not re.fullmatch(r'color-[\w-]+', token) or not isinstance(color, str) or not re.fullmatch(r'transparent|#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})', color):
            raise ValueError('Invalid palette entry: ' + token)
    (OUT / 'palette.json').write_bytes(palette_raw)
    manifest[str(palette_source.relative_to(ROOT))] = hashlib.sha256(palette_raw).hexdigest()
    shutil.copy2(ROOT / 'images/favicon.svg', OUT / 'icon.svg')
    for path in sorted(paths):
        source = (ROOT / 'images' / path.lstrip('/')).resolve()
        if not source.is_relative_to((ROOT / 'images').resolve()):
            raise ValueError('Asset outside images: ' + path)
        if not source.is_file():
            raise FileNotFoundError(source)
        target = OUT / 'art' / path.lstrip('/')
        target.parent.mkdir(parents=True, exist_ok=True)
        digest = hashlib.sha256(source.read_bytes()).hexdigest()
        manifest[str(source.relative_to(ROOT))] = digest
        # Resize delivery copies only; original artwork is untouched.
        stamp = target.with_suffix(target.suffix + '.sha256')
        if not target.exists() or not stamp.exists() or stamp.read_text() != digest:
            shutil.copy2(source, target)
            limit = 1920 if path == '/ui/start-landscape.png' else (1280 if '/maps/' in path else 512)
            if shutil.which('sips'):
                subprocess.run(['sips', '-Z', str(limit), str(target)], check=True, stdout=subprocess.DEVNULL)
            stamp.write_text(digest)
        if path in MIPMAP_ART:
            # Preserve these tiny UI details when Godot scales a complete tab.
            # A first import accepts a parameter-only config and fills its remap/deps.
            import_file = target.with_suffix(target.suffix + '.import')
            settings = import_file.read_text() if import_file.exists() else '[remap]\nimporter="texture"\ntype="CompressedTexture2D"\n\n[params]\n'
            if 'mipmaps/generate=' in settings:
                settings = re.sub(r'mipmaps/generate=(true|false)', 'mipmaps/generate=true', settings)
            else:
                settings += '\nmipmaps/generate=true\n'
            import_file.write_text(settings)
    # Remove obsolete generated catalogs after source catalog renames.
    for name in old_manifest:
        if name.startswith('data/') and name not in manifest:
            target = OUT / Path(name).name
            target.unlink(missing_ok=True)
    # Normalize manifests written before the source directory was renamed.
    old_manifest = {('images/' + name[len('public/'):]) if name.startswith('public/') else name: digest
                    for name, digest in old_manifest.items()}
    # Only remove previously generated delivery copies whose canonical references vanished.
    for name in old_manifest:
        if not name.startswith('images/') or name in manifest:
            continue
        target = OUT / 'art' / name.removeprefix('images/')
        if not target.resolve().is_relative_to((OUT / 'art').resolve()):
            raise ValueError('Asset outside generated delivery directory: ' + name)
        for candidate in [target, Path(str(target) + '.import'), Path(str(target) + '.sha256')]:
            candidate.unlink(missing_ok=True)
    (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2, sort_keys=True))
    print(f'Synchronized {len(CATALOGS)} catalogs and {len(paths)} images into {OUT}')

if __name__ == '__main__': main()
