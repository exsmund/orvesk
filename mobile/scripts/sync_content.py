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
MIPMAP_ART = {'/ui/gothic-frame.png', '/ui/portrait-frame-v1.png', '/ui/logos-shards-v3.png'}
CATALOGS = ['weapons', 'armor', 'jewelry', 'base-figures', 'skills', 'creatures',
            'portraits', 'journey-maps', 'journey-encounters', 'item-art', 'combat-balance', 'damage-types',
            'story', 'story-characters', 'story-gameplay', 'map-points', 'journey-rules', 'portrait-presentation']

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    paths = {'/ui/start-landscape-v1.png',
             '/ui/battle-modes/free-v1.png', '/ui/battle-modes/expendable-v1.png',
             '/ui/logos-shards-v3.png', '/ui/portrait-frame-round-v1.png',
             '/ui/portrait-frame-v1.png', '/ui/gothic-frame.png'}
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
    css = (ROOT / 'src/app/styles/palette.css').read_text()
    colors = dict(re.findall(r'--(color-[\w-]+):\s*(#[0-9a-fA-F]+|transparent)\s*;', css))
    for token, channels in re.findall(r'--(color-[\w-]+):\s*rgb\(([^)]+)\)\s*;', css):
        values = channels.split()
        if len(values) != 3:
            raise ValueError('Unsupported RGB token: ' + token)
        rgb = [round(float(v[:-1]) * 2.55) if v.endswith('%') else round(float(v)) for v in values]
        colors[token] = '#' + ''.join(f'{max(0, min(255, v)):02x}' for v in rgb)
    shutil.copy2(ROOT / 'public/favicon.svg', OUT / 'icon.svg')
    (OUT / 'palette.json').write_text(json.dumps(colors, ensure_ascii=False, indent=2))
    for path in sorted(paths):
        source = (ROOT / 'public' / path.lstrip('/')).resolve()
        if not source.is_relative_to((ROOT / 'public').resolve()):
            raise ValueError('Asset outside public: ' + path)
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
            limit = 1920 if path == '/ui/start-landscape-v1.png' else (1280 if '/maps/' in path else 512)
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
    # Only remove previously generated delivery copies whose canonical references vanished.
    for name in old_manifest:
        if not name.startswith('public/') or name in manifest:
            continue
        target = OUT / 'art' / name.removeprefix('public/')
        if not target.resolve().is_relative_to((OUT / 'art').resolve()):
            raise ValueError('Asset outside generated delivery directory: ' + name)
        for candidate in [target, Path(str(target) + '.import'), Path(str(target) + '.sha256')]:
            candidate.unlink(missing_ok=True)
    (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2, sort_keys=True))
    print(f'Synchronized {len(CATALOGS)} catalogs and {len(paths)} images into {OUT}')

if __name__ == '__main__': main()
