"""Validation/report regressions; run with python3 -B -m unittest discover ..."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('run_balance', Path(__file__).resolve().parents[1]/'scripts/run_balance.py')
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)


class BalanceReportTest(unittest.TestCase):
    def scenario(self, case_id, build='a', name='A', level=5, **loadout):
        return {'id': case_id, 'build': build, 'name': name, 'level': level,
                'enemyLevel': max(1, level-1), 'hands': 0, 'armor': False,
                'shield': False, 'enemyKind': 'human', **loadout}

    def test_mean_is_over_combination_percentages_per_build_and_level(self):
        results = [
            {'scenario': self.scenario('low'), 'wins': 1, 'samples': 10},
            {'scenario': self.scenario('high', hands=1, armor=True, shield=True, enemyKind='creature'),
             'wins': 4, 'samples': 5},
            {'scenario': self.scenario('higher-level', level=10), 'wins': 1, 'samples': 4},
            {'scenario': self.scenario('other-build', build='b', name='B'), 'wins': 2, 'samples': 4},
        ]
        a, higher, b = runner.summarize(results)
        self.assertEqual((a['minPercent'], a['meanPercent'], a['maxPercent']), (10, 45, 80))
        self.assertEqual(a['combinations'], 2)
        self.assertEqual(a['minScenario'], results[0]['scenario'])
        self.assertEqual(a['maxScenario'], results[1]['scenario'])
        self.assertEqual((higher['level'], higher['meanPercent']), (10, 25))
        self.assertEqual(b['meanPercent'], 50)
        self.assertIn('| A | 5 | 10.0% — без оружия; без брони; без щита; человек ур. 4 | 45.0% | '
                      '80.0% — одноручное; тело + обувь; со щитом; существо ур. 4 |',
                      runner.table([a, higher, b]))

    def test_tied_extremes_select_one_stable_combination(self):
        results = [
            {'scenario': self.scenario('z', hands=2), 'wins': 10, 'samples': 20},
            {'scenario': self.scenario('a', hands=1, shield=True), 'wins': 10, 'samples': 20},
        ]
        summary = runner.summarize(results)
        self.assertEqual(summary, runner.summarize(list(reversed(results))))
        self.assertEqual(summary[0]['minScenario']['id'], 'a')
        self.assertEqual(summary[0]['maxScenario']['id'], 'a')
        self.assertNotIn('двуручное', runner.table(summary))

    def result(self):
        seed, scenario = 17, self.scenario('example', build='example', name='Пример')
        offset = int(hashlib.sha256(b'17:example').hexdigest()[:8], 16)*100000
        return {'scenario': scenario, 'samples': 2, 'seed': str(seed), 'wins': 1, 'losses': 1,
                'draws': 1, 'winPercent': 50,
                'battles': [{'sample': 0, 'seed': offset, 'first': 'player', 'outcome': 'victory',
                             'heroLevel': 5, 'enemyLevel': 4},
                            {'sample': 1, 'seed': offset+10, 'first': 'enemy', 'outcome': 'draw',
                             'heroLevel': 5, 'enemyLevel': 4}]}

    def read(self, result):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp)/'case.json'
            path.write_text(json.dumps(result))
            return runner.read_case(path, self.result()['scenario'], 2, 17)

    def test_draw_is_in_loss_denominator(self):
        self.assertEqual(self.read(self.result())['winPercent'], 50)
        bad = self.result()
        bad['winPercent'] = 100
        with self.assertRaises(ValueError): self.read(bad)

    def test_partial_duplicate_and_unfinished_cases_are_rejected(self):
        source = self.result()
        variants = []
        partial = copy.deepcopy(source)
        partial['battles'].pop()
        variants.append(partial)
        duplicate = copy.deepcopy(source)
        duplicate['battles'][1] = duplicate['battles'][0]
        variants.append(duplicate)
        capped = copy.deepcopy(source)
        capped['battles'][1].update(outcome='combat', error='Round limit exceeded')
        variants.append(capped)
        wrong_seed = copy.deepcopy(source)
        wrong_seed['battles'][1]['seed'] += 1
        variants.append(wrong_seed)
        wrong_first = copy.deepcopy(source)
        wrong_first['battles'][1]['first'] = 'player'
        variants.append(wrong_first)
        for field in ('heroLevel', 'enemyLevel'):
            wrong_level = copy.deepcopy(source)
            wrong_level['battles'][1][field] += 1
            variants.append(wrong_level)
        for result in variants:
            with self.subTest(result=result), self.assertRaises(ValueError): self.read(result)

if __name__ == '__main__': unittest.main()
