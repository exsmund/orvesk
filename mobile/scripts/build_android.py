#!/usr/bin/env python3
"""Reproducible debug APK export; release signing is deliberately separate."""
import argparse
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

MOBILE = Path(__file__).resolve().parents[1]
ROOT = MOBILE.parent
VERSION = '4.7.2'

def run(command, env=None):
    completed = subprocess.run(command, cwd=ROOT, env=env, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    print(completed.stdout, end='')
    if completed.returncode or 'SCRIPT ERROR:' in completed.stdout or '\nERROR:' in completed.stdout or 'FAIL:' in completed.stdout:
        raise SystemExit(completed.returncode or 1)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, default=MOBILE/'build/orvesk-debug.apk')
    parser.add_argument('--skip-tests', action='store_true')
    args = parser.parse_args()
    executable = os.environ.get('GODOT_BIN') or shutil.which('godot') or shutil.which('godot4')
    if not executable: raise SystemExit('Set GODOT_BIN to the Godot 4.7.2 executable.')
    version = subprocess.check_output([executable, '--headless', '--version'], text=True).strip()
    if not version.startswith(VERSION + '.'): raise SystemExit(f'Expected Godot {VERSION}; found {version}')
    env = os.environ.copy()
    # Avoid adb creating files directly under the user home in automated builds.
    env.setdefault('ANDROID_USER_HOME', str(MOBILE/'.toolchain/android-user'))
    env.setdefault('ANDROID_SDK_HOME', str(MOBILE/'.toolchain'))
    Path(env['ANDROID_USER_HOME']).mkdir(parents=True, exist_ok=True)
    run([sys.executable, str(MOBILE/'scripts/sync_content.py')], env)
    run([executable, '--headless', '--editor', '--path', str(MOBILE), '--import', '--quit'], env)
    if not args.skip_tests:
        for script in ['difficulty.gd', 'difficulty_ui.gd', 'campaign.gd', 'journey_levels.gd', 'story_ui.gd', 'run.gd', 'balance_matrix.gd', 'balance_rules.gd', 'creature_balance.gd', 'weapon_tier.gd', 'basic_equipment.gd', 'armor_levels.gd', 'free_mode.gd', 'skills.gd', 'skills_ui.gd', 'rewards.gd', 'ui_smoke.gd', 'adaptive_layout.gd', 'home_settings.gd', 'creation_ui.gd', 'heroes_ui.gd', 'modal_ui.gd', 'combat_ui.gd', 'combat_forecast.gd', 'combos.gd', 'combos_ui.gd', 'mixed_figures.gd', 'mixed_figures_ui.gd', 'combat_feedback.gd', 'ui_design.gd', 'ui_refinement.gd', 'reward_ui.gd', 'defeat_ui.gd', 'character_window.gd', 'inspection.gd', 'enemy_inspection.gd', 'ui_polish.gd', 'journey_map.gd', 'interaction_updates.gd', 'debug_tools.gd', 'game_header.gd', 'portraits_ui.gd', 'shared_art.gd']:
            run([executable, '--headless', '--path', str(MOBILE), '--script', 'res://tests/'+script], env)
        balance_report = Path(tempfile.mkdtemp(prefix='orvesk-balance-'))/'first-map-balance.json'
        run([executable, '--headless', '--path', str(MOBILE), '--script', 'res://tests/first_map_balance.gd',
             '--', '--report', str(balance_report)], env)
        print(f'Balance report: {balance_report}')
    output = args.output.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    run([executable, '--headless', '--path', str(MOBILE), '--export-debug', 'Android', str(output)], env)
    if not output.is_file(): raise SystemExit('Godot did not produce an APK.')
    print(f'APK: {output} ({output.stat().st_size/1024/1024:.1f} MiB)')

if __name__ == '__main__': main()
