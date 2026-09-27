#!/usr/bin/env python3
"""Run the debug APK in a dedicated local ARM64 foldable Android emulator."""
import argparse
import os
from pathlib import Path
import socket
import subprocess
import sys
import time

MOBILE = Path(__file__).resolve().parents[1]
AVD = 'Orvesk_Fold_API_36'
IMAGE = 'system-images;android-36;default;arm64-v8a'
PACKAGE = 'com.exsmund.orvesk'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apk', type=Path, default=MOBILE / 'build/orvesk-debug.apk')
    parser.add_argument('--build', action='store_true', help='Build and test a new APK before launching')
    parser.add_argument('--screen', choices=['cover', 'inner'], help='Change fold posture and Android viewport without restarting a running game')
    args = parser.parse_args()
    env = os.environ.copy()
    sdk_value = env.get('ANDROID_HOME') or env.get('ANDROID_SDK_ROOT')
    if not sdk_value:
        raise SystemExit('Set ANDROID_HOME, or source mobile/.toolchain/local-env.sh first.')
    sdk = Path(sdk_value)
    env['ANDROID_HOME'] = str(sdk)
    env['ANDROID_SDK_ROOT'] = str(sdk)
    env.setdefault('ANDROID_AVD_HOME', str(MOBILE / '.toolchain/avd'))
    env.setdefault('ANDROID_USER_HOME', str(MOBILE / '.toolchain/android-user'))
    # Current avdmanager rejects differing legacy SDK_HOME and USER_HOME paths.
    env.pop('ANDROID_SDK_HOME', None)
    avd_home = Path(env['ANDROID_AVD_HOME'])
    avd_home.mkdir(parents=True, exist_ok=True)
    adb = sdk / 'platform-tools/adb'
    emulator = sdk / 'emulator/emulator'
    avdmanager = sdk / 'cmdline-tools/latest/bin/avdmanager'
    if not all(path.is_file() for path in [adb, emulator, avdmanager]):
        raise SystemExit('Install platform-tools, emulator and cmdline-tools; see mobile/README.md.')
    if not (sdk / 'system-images/android-36/default/arm64-v8a/system.img').is_file():
        raise SystemExit(f'Install the SDK image with sdkmanager "{IMAGE}".')
    if args.build or not args.apk.is_file():
        subprocess.run([sys.executable, str(MOBILE / 'scripts/build_android.py'), '--output', str(args.apk)], env=env, check=True)
    if not (avd_home / (AVD + '.ini')).is_file():
        print(f'Creating {AVD}…', flush=True)
        avd_directory = avd_home / (AVD + '.avd')
        # A failed first creation may leave an empty directory; never erase AVD data.
        if avd_directory.is_dir() and not any(avd_directory.iterdir()):
            avd_directory.rmdir()
        subprocess.run([str(avdmanager), 'create', 'avd', '--name', AVD, '--package', IMAGE,
                        '--device', 'pixel_9_pro_fold', '--path', str(avd_directory)],
                       input='no\n', text=True, env=env, check=True)

    def command(*args):
        return subprocess.check_output([str(adb), *args], env=env, text=True, stderr=subprocess.STDOUT, timeout=15).strip()

    command('start-server')
    serial = None
    for line in command('devices').splitlines()[1:]:
        fields = line.split()
        if len(fields) < 2 or not fields[0].startswith('emulator-'):
            continue
        try:
            if AVD in command('-s', fields[0], 'emu', 'avd', 'name').splitlines():
                serial = fields[0]
                break
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
            continue
    process = None
    if serial is None:
        def free(port):
            with socket.socket() as probe:
                return probe.connect_ex(('127.0.0.1', port)) != 0
        port = next((port for port in range(5560, 5682, 2) if free(port) and free(port + 1)), None)
        if port is None:
            raise SystemExit('No free Android Emulator port.')
        serial = f'emulator-{port}'
        log_path = MOBILE / '.toolchain/emulator.log'
        with log_path.open('w') as log:
            process = subprocess.Popen([str(emulator), '-avd', AVD, '-port', str(port),
                                        '-no-snapshot-load', '-no-snapshot-save', '-no-boot-anim',
                                        '-no-audio', '-no-metrics', '-gpu', 'auto'],
                                       env=env, stdin=subprocess.DEVNULL, stdout=log,
                                       stderr=subprocess.STDOUT, start_new_session=True)
        print(f'Opening {AVD} ({serial}). Log: {log_path}', flush=True)
    deadline = time.monotonic() + 180
    while time.monotonic() < deadline:
        if process is not None and process.poll() is not None:
            raise SystemExit(f'Emulator exited. See {MOBILE / ".toolchain/emulator.log"}.')
        try:
            if command('-s', serial, 'shell', 'getprop', 'sys.boot_completed') == '1':
                break
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
            pass
        time.sleep(1)
    else:
        raise SystemExit('Android is still booting; retry the command after the emulator finishes starting.')
    if args.screen:
        # The AOSP image reports the hinge state but does not change its display size.
        # Set the Android viewport explicitly for cover/inner layout testing.
        command('-s', serial, 'emu', 'fold' if args.screen == 'cover' else 'unfold')
        command('-s', serial, 'shell', 'wm', 'user-rotation', 'lock', '0')
        command('-s', serial, 'shell', 'wm', 'size', '1080x2424' if args.screen == 'cover' else 'reset')
        command('-s', serial, 'shell', 'input', 'keyevent', 'KEYCODE_WAKEUP')
        if not args.build:
            try:
                if command('-s', serial, 'shell', 'pidof', PACKAGE):
                    print(f'Switched to {args.screen} screen on {serial}; game process preserved.')
                    return
            except subprocess.CalledProcessError:
                pass
    print('Android ready. Installing the APK without clearing app data…', flush=True)
    subprocess.run([str(adb), '-s', serial, 'install', '-r', str(args.apk.resolve())], env=env, check=True)
    component = command('-s', serial, 'shell', 'cmd', 'package', 'resolve-activity', '--brief', PACKAGE).splitlines()[-1]
    if not component.startswith(PACKAGE + '/'):
        raise SystemExit(f'Could not resolve the game activity: {component}')
    print(command('-s', serial, 'shell', 'am', 'start', '-W', '-n', component))
    print(f'Game running in {serial}. Close the emulator window to stop it.\n'
          'Cover: python3 mobile/scripts/run_android.py --screen cover\n'
          'Inner: python3 mobile/scripts/run_android.py --screen inner', flush=True)


if __name__ == '__main__':
    main()
