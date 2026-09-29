#!/usr/bin/env python3
"""Reproducible balance matrix on the real Godot engine; no window, APK or saves."""
import argparse
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time

MOBILE = Path(__file__).resolve().parents[1]
ROOT = MOBILE.parent


def fingerprint():
    paths = sorted(set(MOBILE.glob('game/*.gd')) | set(MOBILE.glob('content/generated/*.json'))
                   | set(MOBILE.glob('tests/balance_*.gd')) | {MOBILE/'tests/first_map_player.gd',
                   MOBILE/'scripts/analyze_stat_balance.gd', MOBILE/'project.godot', Path(__file__).resolve()})
    return {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}


def check_catalogs():
    stale = [p.stem for p in (MOBILE/'content/generated').glob('*.json')
             if (ROOT/'data'/p.name).is_file() and json.loads(p.read_text()) != json.loads((ROOT/'data'/p.name).read_text())]
    if stale:
        raise ValueError('Outdated mobile catalogs: ' + ', '.join(stale) + '. Run python3 mobile/scripts/sync_content.py')


def read_case(path, scenario, samples, seed):
    result = json.loads(path.read_text())
    if result['scenario'] != scenario or result['samples'] != samples or result['seed'] != str(seed):
        raise ValueError(f'Mismatched case configuration: {path}')
    battles = result['battles']
    if len(battles) != samples or [b['sample'] for b in battles] != list(range(samples)):
        raise ValueError(f'Incomplete or duplicate samples: {path}')
    for i, battle in enumerate(battles):
        expected_seed = int(hashlib.sha256(f'{seed}:{scenario["id"]}'.encode()).hexdigest()[:8], 16) * 100000 + i * 10
        if battle.get('error') or battle['outcome'] not in ('victory', 'defeat', 'draw'):
            raise ValueError(f'Unresolved battle: {path}, sample {i}')
        if battle['seed'] != expected_seed or battle['first'] != ('player' if i % 2 == 0 else 'enemy'):
            raise ValueError(f'Incorrect seed/first-turn balance: {path}, sample {i}')
        if battle.get('heroLevel') != scenario['level'] or battle.get('enemyLevel') != scenario['enemyLevel']:
            raise ValueError(f'Incorrect fighter levels: {path}, sample {i}')
    wins = sum(b['outcome'] == 'victory' for b in battles)
    draws = sum(b['outcome'] == 'draw' for b in battles)
    if result['wins'] != wins or result['draws'] != draws or result['losses'] != samples-wins:
        raise ValueError(f'Incorrect outcome counts: {path}')
    if abs(result['winPercent'] - wins * 100 / samples) > 0.00001:
        raise ValueError(f'Incorrect percentage: {path}')
    return result


def summarize(results):
    groups = defaultdict(list)
    for result in results:
        scenario = result['scenario']
        groups[(scenario['build'], scenario['level'])].append(result)
    summary = []
    for (build, level), cases in groups.items():
        # Stable IDs choose one representative even when several cases tie.
        ordered = sorted(cases, key=lambda r: r['scenario']['id'])
        percent = lambda r: r['wins'] * 100 / r['samples']
        minimum, maximum = min(ordered, key=percent), max(ordered, key=percent)
        summary.append({'build': build, 'name': cases[0]['scenario']['name'], 'level': level,
                        'combinations': len(cases), 'minPercent': percent(minimum),
                        'meanPercent': sum(percent(r) for r in cases)/len(cases),
                        'maxPercent': percent(maximum), 'minScenario': minimum['scenario'],
                        'maxScenario': maximum['scenario']})
    return summary


def describe_scenario(scenario):
    weapon = {0: 'без оружия', 1: 'одноручное', 2: 'двуручное'}[scenario['hands']]
    armor = 'тело + обувь' if scenario['armor'] else 'без брони'
    shield = 'со щитом' if scenario['shield'] else 'без щита'
    enemy = {'human': 'человек', 'creature': 'существо'}[scenario['enemyKind']]
    return f'{weapon}; {armor}; {shield}; {enemy} ур. {scenario["enemyLevel"]}'


def table(summary):
    lines = ['| Билд | Уровень | Минимум побед — сочетание | Среднее | Максимум побед — сочетание |',
             '|---|---:|---|---:|---|']
    for row in summary:
        lines.append(f'| {row["name"]} | {row["level"]} | {row["minPercent"]:.1f}% — '
                     f'{describe_scenario(row["minScenario"])} | {row["meanPercent"]:.1f}% | '
                     f'{row["maxPercent"]:.1f}% — {describe_scenario(row["maxScenario"])} |')
    return '\n'.join(lines) + '\n'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--godot', default=os.environ.get('GODOT_BIN') or shutil.which('godot') or shutil.which('godot4'))
    parser.add_argument('--samples', type=int, default=20)
    parser.add_argument('--seed', type=int, default=20260929)
    parser.add_argument('--levels', default='1,5,10,20,50,100')
    parser.add_argument('--builds', default='', help='Comma-separated build IDs; omit for all builds')
    parser.add_argument('--jobs', type=int, default=min(4, os.cpu_count() or 1))
    parser.add_argument('--max-rounds', type=int, default=500)
    parser.add_argument('--output', type=Path, default=Path('/tmp/orvesk-balance'))
    parser.add_argument('--resume', action='store_true')
    args = parser.parse_args()
    if not args.godot: parser.error('Set GODOT_BIN or pass --godot')
    if args.samples < 2 or args.samples % 2: parser.error('--samples must be positive and even')
    if args.jobs < 1 or args.max_rounds < 1: parser.error('Invalid jobs or round limit')
    levels = [int(x) for x in args.levels.split(',')]
    if not levels or min(levels) < 1 or len(set(levels)) != len(levels): parser.error('Levels must be positive and unique')
    output = args.output.resolve()
    if output.is_relative_to(ROOT): parser.error('Reports must be outside the repository (AGENTS.md)')
    check_catalogs()
    hashes = fingerprint()
    version = subprocess.check_output([args.godot, '--headless', '--version'], text=True).strip()
    config = {'samples': args.samples, 'seed': args.seed, 'levels': levels, 'builds': args.builds,
              'maxRounds': args.max_rounds, 'godotVersion': version, 'fingerprint': hashes}
    manifest = output/'run.json'
    if output.exists() and any(output.iterdir()):
        if not args.resume: raise ValueError('Output directory is not empty; choose another or pass --resume')
        if not manifest.exists() or json.loads(manifest.read_text()) != config:
            raise ValueError('Resume refused: engine/catalogs/seed/options changed')
    output.mkdir(parents=True, exist_ok=True)
    manifest.write_text(json.dumps(config, ensure_ascii=False, indent=2) + '\n')
    # Freeze only code and JSON. No artwork, player saves or APK is needed, and
    # concurrent development cannot change the rules halfway through a long run.
    snapshot = output/'runtime'
    for name, expected in hashes.items():
        target = snapshot/name
        if not target.exists():
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT/name, target)
        if hashlib.sha256(target.read_bytes()).hexdigest() != expected:
            raise ValueError(f'Inconsistent runtime snapshot: {name}')
    common = [args.godot, '--headless', '--path', str(snapshot/'mobile'), '--script', 'res://scripts/analyze_stat_balance.gd']
    options = ['--samples', str(args.samples), '--seed', str(args.seed), '--levels', args.levels,
               '--builds', args.builds, '--max-rounds', str(args.max_rounds), '--output', str(output)]
    describe = subprocess.run(common + ['--log-file', str(output/'describe.log'), '--'] + options + ['--describe', 'true'], text=True, capture_output=True)
    if describe.returncode or 'SCRIPT ERROR:' in describe.stdout + describe.stderr or not (output/'suite.json').exists():
        raise ValueError('Cannot enumerate balance cases:\n' + describe.stdout + describe.stderr)
    suite = json.loads((output/'suite.json').read_text())
    cases = suite['cases']
    paths = {c['id']: output/'cases'/(c['id'].replace(':', '-') + '.json') for c in cases}
    for c in cases:
        if paths[c['id']].exists(): read_case(paths[c['id']], c, args.samples, args.seed)
    started = time.monotonic()
    print(f'{len(cases)} combinations, {len(cases)*args.samples} fights, {args.jobs} headless workers; {output}', flush=True)

    def worker(index):
        log = output/f'worker-{index}.stdout'
        with log.open('w') as stream:
            process = subprocess.run(common + ['--log-file', str(output/f'worker-{index}.log'), '--'] + options
                                     + ['--worker', str(index), '--workers', str(args.jobs)], stdout=stream, stderr=subprocess.STDOUT)
        text = log.read_text()
        if process.returncode or 'SCRIPT ERROR:' in text or 'BALANCE_ERROR:' in text or 'BALANCE_DONE' not in text:
            return f'Worker {index} failed: see {log}'
        return None

    errors = []
    with ThreadPoolExecutor(max_workers=args.jobs) as pool:
        futures = [pool.submit(worker, i) for i in range(args.jobs)]
        # Report progress without loading all individual battle records repeatedly.
        while any(not f.done() for f in futures):
            time.sleep(10)
            count = sum(p.exists() for p in paths.values())
            print(f'Progress: {count}/{len(cases)} combinations; {time.monotonic()-started:.0f}s', flush=True)
        errors = [f.result() for f in futures if f.result()]
    if errors: raise ValueError('\n'.join(errors))
    if any(hashlib.sha256((snapshot/name).read_bytes()).hexdigest() != digest for name, digest in hashes.items()):
        raise ValueError('Frozen runtime was modified during the run')
    results = [read_case(paths[c['id']], c, args.samples, args.seed) for c in cases]
    summary = summarize(results)
    (output/'summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n')
    rendered = table(summary)
    (output/'summary.md').write_text(rendered)
    # Compact full-combination table; per-fight gear/stats/seeds stay in cases/.
    (output/'combinations.json').write_text(json.dumps([{k:v for k,v in r.items() if k != 'battles'} for r in results], ensure_ascii=False, indent=2) + '\n')
    print(rendered, end='')
    print(f'Completed {len(results)*args.samples} fights in {time.monotonic()-started:.1f}s. Report: {output}')

if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, subprocess.SubprocessError) as exc:
        print(f'BALANCE_ERROR: {exc}', file=sys.stderr)
        sys.exit(1)
