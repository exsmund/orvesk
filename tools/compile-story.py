#!/usr/bin/env python3
"""Prepare the reviewed dialogue graph + canonical encounters for the mobile adapter.

Authoring prose is never executed or displayed. IDs and texts come from data;
no character, item, damage type or scene-specific behavior lives in this compiler.
"""
import copy
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(name):
    return json.loads((ROOT / name).read_text())


def compile_story():
    story = read('data/story.json')
    preview = read('data/story-preview.json')
    rules = read('data/story-gameplay.json')
    nodes = copy.deepcopy(preview['nodes'])
    scenes = copy.deepcopy(preview['scenes'])
    points = {p['id'] for p in read('data/map-points.json')['points']}
    chars = {c['id']: c for c in read('data/story-characters.json')}
    creatures = {c['id'] for c in read('data/creatures.json')}
    maps = {m['id'] for m in read('data/journey-maps.json')}
    for point, activity in rules['activities'].items():
        assert point in points and activity['handler'] in ('recover', 'equipment', 'dialogue'), activity
        if activity['handler'] == 'recover':
            assert all(0 <= activity[key] <= 1 for key in ('healthFraction', 'staminaFraction')), activity
        elif activity['handler'] == 'equipment':
            assert isinstance(activity['offers'], int) and activity['offers'] > 0, activity
            assert all(activity['price'][key] >= 0 for key in ('base', 'perLevel', 'perTier')), activity
    for source in preview['sources']:
        assert hashlib.sha256((ROOT / source['path']).read_bytes()).hexdigest() == source['sha256'], 'Unreviewed graph source: ' + source['path']
    for speaker in preview['speakers'].values():
        if 'characterId' in speaker:
            assert speaker['characterId'] in chars, speaker
        else:
            assert speaker.get('portrait', {}).get('kind') == 'creature' and speaker['portrait']['id'] in creatures, speaker
    for ident, override in rules.get('dialogueOverrides', {}).items():
        assert ident in nodes, ident
        assert set(override) <= {'when', 'effects', 'textVariants'}, ident
        nodes[ident].update(copy.deepcopy(override))
    stage_index = {}
    for chapter in story['chapters']:
        assert chapter['mapBinding']['mapId'] in maps
        for stage in chapter['stages']:
            sid = stage['id']
            stage_index[sid] = copy.deepcopy(stage)
            stage_index[sid]['chapter'] = chapter['number']
            assert sid in scenes
            if stage['kind'] == 'stop':
                choices = [n for n in nodes.values() if n['scene'] == sid and n['kind'] == 'choice' and n['mode'] == 'activity']
                assert len(choices) == 1, sid
                choice = choices[0]
                stage_index[sid]['activityChoice'] = choice['id']
                for activity in stage['activities']:
                    matches = [nodes[i] for i in choice['options'] if nodes[i].get('mapPointType') == activity['mapPointType']]
                    assert len(matches) == 1 and activity['mapPointType'] in rules['activities'], activity
                    activity_id = matches[0]['id']
                    stage_index[sid].setdefault('activityOptions', {})[activity_id] = copy.deepcopy(activity)
                continue
            encounters = stage['encounter'].get('variants', [stage['encounter']])
            for encounter in encounters:
                assert encounter['kind'] in ('human', 'creature'), encounter
                assert (encounter['creatureId'] is None) if encounter['kind'] == 'human' else (encounter['creatureId'] in creatures), encounter
            fights = [n for n in nodes.values() if n['scene'] == sid and n['kind'] == 'combat']
            assert len(fights) == 1, sid
            stage_index[sid]['combatNode'] = fights[0]['id']
            reward_id = rules['rewardNodeBindings'].get(sid)
            if reward_id:
                assert reward_id in nodes and nodes[reward_id]['scene'] == sid
                nodes[reward_id]['kind'] = 'battleReward'
                nodes[reward_id]['text'] = rules['ui']['rewardLabel']
            else:
                exits = {n['next'] for n in nodes.values() if n['scene'] == sid and n['next'] and nodes[n['next']]['scene'] != sid}
                assert len(exits) == 1, ('Ambiguous post-battle reward', sid, exits)
                destination = exits.pop()
                reward_id = sid + '.runtime.battle-reward'
                for node in nodes.values():
                    if node['scene'] == sid and node['next'] == destination:
                        node['next'] = reward_id
                nodes[reward_id] = {'id': reward_id, 'scene': sid, 'kind': 'battleReward', 'text': rules['ui']['rewardLabel'], 'next': destination}
            fights[0]['replayNext'] = reward_id
            stage_index[sid]['rewardNode'] = reward_id
    for reward in rules['storyRewards']:
        assert reward['afterNode'] in nodes, reward
        nodes[reward['afterNode']]['rewardId'] = reward['id']
    def condition(value):
        if not value: return
        assert len(value) == 1, value
        op, args = next(iter(value.items()))
        assert op in ('all', 'not', 'eq', 'gt', 'gte'), value
        if op == 'all':
            for nested in args: condition(nested)
        elif op == 'not': condition(args)
        else: assert len(args) == 2 and args[0] in preview['state'], value

    for ident, node in nodes.items():
        condition(node.get('when'))
        for effect in node.get('effects', []):
            assert effect['type'] == 'set' and effect['key'] in preview['state'], effect
            condition(effect.get('when'))
        assert ident == node['id'] and node['scene'] in scenes
        assert node['kind'] in ('dialogue', 'narration', 'choice', 'option', 'effect', 'combat', 'battleReward', 'end')
        for dest in [node.get('next'), node.get('replayNext'), *node.get('options', [])]:
            assert dest is None or dest == '$chapterStart' or dest in nodes, (ident, dest)
        if node.get('mapPointType'): assert node['mapPointType'] in points
        if node.get('speaker'): assert node['speaker'] in preview['speakers']
    # Every published scene entry and ending is connected to the initial graph.
    reachable, pending = set(), [preview['entry'], preview['defeat']['entry']]
    while pending:
        ident = pending.pop()
        if not ident or ident == '$chapterStart' or ident in reachable: continue
        reachable.add(ident)
        node = nodes[ident]
        pending += [node.get('next'), node.get('replayNext'), *node.get('options', [])]
    assert all(n['id'] in reachable for n in nodes.values() if n['kind'] == 'end')
    return {
        'version': 1, 'revision': rules['revision'], 'id': story['id'], 'title': story['title'],
        'entry': preview['entry'], 'nodes': nodes, 'scenes': scenes,
        'state': preview['state'], 'speakers': preview['speakers'], 'defeat': preview['defeat'],
        'chapters': story['chapters'], 'stages': stage_index, 'rules': rules,
        'sources': {name: hashlib.sha256((ROOT / name).read_bytes()).hexdigest() for name in ['data/story.json', 'data/story-preview.json', 'data/story-gameplay.json', 'data/story-characters.json', 'data/map-points.json', 'data/journey-maps.json']}
    }


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    result = compile_story()
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(f'STORY_RUNTIME: {len(result["chapters"])} chapters, {len(result["nodes"])} nodes; references and ending reachability OK')
