#!/usr/bin/env python3
"""Check the exported graph contract without running a Godot UI."""
import copy
import importlib.util
import json
import shutil
import tempfile
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('compiler', Path(__file__).with_name('compile-story.py'))
compiler = importlib.util.module_from_spec(spec)
spec.loader.exec_module(compiler)


class ExportTest(unittest.TestCase):
    def test_graph_uses_configured_cast_and_fixed_maps(self):
        graph = compiler.compile_story()
        self.assertEqual(len(graph['chapters']), 6)
        self.assertEqual(len(graph['stages']), 54)
        self.assertEqual(sum(n['kind'] == 'combat' for n in graph['nodes'].values()), 30)
        self.assertEqual(sum(n['kind'] == 'battleReward' for n in graph['nodes'].values()), 30)
        self.assertEqual(sum(n['kind'] == 'end' for n in graph['nodes'].values()), 3)
        for stage in graph['stages'].values():
            if stage['kind'] == 'stop':
                self.assertEqual(len(stage['activities']), len(stage['activityOptions']))
            else:
                fight = graph['nodes'][stage['combatNode']]
                self.assertEqual(fight['replayNext'], stage['rewardNode'])
                # Every post-combat route reaches a reward before leaving the scene.
                pending, visited = [fight['next']], set()
                while pending:
                    ident = pending.pop()
                    if ident in visited: continue
                    visited.add(ident)
                    node = graph['nodes'][ident]
                    self.assertEqual(node['scene'], stage['id'])
                    if node['kind'] == 'battleReward': continue
                    pending += [x for x in [node.get('next'), *node.get('options', [])] if x]

    def test_compile_from_json_without_manuscript(self):
        # A clean data-only checkout must compile, including edits to dialogue text.
        files = ['story', 'story-preview', 'story-gameplay', 'characters',
                 'map-points', 'maps', 'creatures']
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'data').mkdir()
            for name in files:
                shutil.copy2(compiler.ROOT / 'data' / (name + '.json'), root / 'data' / (name + '.json'))
            path = root / 'data/story-preview.json'
            preview = json.loads(path.read_text())
            ident = next(key for key, node in preview['nodes'].items() if node['kind'] == 'dialogue')
            preview['nodes'][ident]['text'] = 'Проверочная реплика из JSON.'
            path.write_text(json.dumps(preview, ensure_ascii=False))
            with patch.object(compiler, 'ROOT', root):
                graph = compiler.compile_story()
            self.assertEqual(graph['nodes'][ident]['text'], 'Проверочная реплика из JSON.')
            self.assertEqual(len(graph['chapters']), 6)

    def rejected(self, file, mutate):
        read = compiler.read
        content = copy.deepcopy(read(file))
        mutate(content)
        with patch.object(compiler, 'read', side_effect=lambda name: content if name == file else read(name)):
            with self.assertRaises((AssertionError, KeyError)):
                compiler.compile_story()

    def test_unknown_species_cannot_be_randomly_substituted(self):
        self.rejected('data/story.json', lambda s: s['chapters'][0]['stages'][0]['encounter'].update(creatureId='missing'))

    def test_unknown_activity_cannot_silently_do_nothing(self):
        self.rejected('data/story-gameplay.json', lambda s: s['activities'].pop('market'))

    def test_unknown_activity_handler_is_an_error(self):
        self.rejected('data/story-gameplay.json', lambda s: s['activities']['market'].update(handler='invented'))

    def test_missing_reward_binding_is_an_error(self):
        self.rejected('data/story-gameplay.json', lambda s: s['storyRewards'][0].update(afterNode='missing'))

    def test_unknown_effect_is_an_error(self):
        def change(s):
            next(n for n in s['nodes'].values() if n.get('effects'))['effects'][0]['type'] = 'invented'
        self.rejected('data/story-preview.json', change)

    def test_unreviewed_source_is_an_error(self):
        self.rejected('data/story-preview.json', lambda s: s['sources'][0].update(sha256='0'*64))

    def test_missing_portrait_binding_is_an_error(self):
        self.rejected('data/story-preview.json', lambda s: s['speakers']['hero'].update(characterId='missing'))


if __name__ == '__main__':
    unittest.main()
