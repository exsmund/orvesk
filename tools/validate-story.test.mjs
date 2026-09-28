import { validateMapPoints } from './validate-map-points.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateStory } from './validate-story.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fresh = () => JSON.parse(readFileSync(resolve(root,'data/story.json'),'utf8'));
const rejects = (mutate, pattern) => {
  const story = fresh(); mutate(story);
  assert.ok(validateStory(root,story).errors.some(e=>pattern.test(e)), `Expected ${pattern}`);
};
test('authoring references validate but runtime still has explicit blockers', () => {
  const result = validateStory(root);
  assert.deepEqual(result.errors, []);
  assert.equal(result.summary.stages,54);
  assert.ok(result.blockers.length>0);
});
test('missing creature and changed scene transition are rejected', () => {
  rejects(s=>{s.chapters[0].stages[0].encounter.creatureId='missing';}, /missing creature|Noncombat/);
  rejects(s=>{s.chapters[0].stages[0].next='missing';}, /continuation|missing next/);
});
test('missing local speaker and duplicate nested ID are rejected', () => {
  rejects(s=>{s.scenes['1.1'].script.find(b=>b.speakerId).speakerId='missing';}, /unknown local speaker/);
  rejects(s=>{const c=s.scenes.prologue.script.find(b=>b.type==='choice');c.options[0].responsePlan[0].id=c.id;}, /duplicate ID/);
});
test('invalid effect and unknown condition field are rejected', () => {
  rejects(s=>{s.scenes.prologue.script.find(b=>b.type==='choice').options[0].effects[0].value='unknown';}, /invalid effect/);
  rejects(s=>{s.defeat.selection.first.when={eq:['unknown',0]};}, /unknown state/);
});
test('instructions cannot become displayed speech and masks cannot disclose the species', () => {
  rejects(s=>{s.scenes['1.1'].script[0].display=true;}, /must not be displayed/);
  rejects(s=>{s.speakers['bridge-woman'].portrait={kind:'creature',id:'demon'};}, /Mask must not reveal/);
});
test('chapter mapping, persistence and final choice are protected', () => {
  rejects(s=>{s.chapters[0].stages[1].engineBinding.nodeIds=['camp-2'];}, /Wrong map nodes/);
  rejects(s=>{s.persistence.retainOnDefeat=s.persistence.retainOnDefeat.filter(k=>k!=='motivation');}, /State lost on defeat/);
  rejects(s=>{s.scenes['final-choice'].script.find(b=>b.type==='choice').options.pop();}, /three endings/);
});
test('unreviewed source changes and enabling the authoring file are rejected', () => {
  rejects(s=>{s.source.sha256='0'.repeat(64);}, /Stale source/);
  rejects(s=>{s.runtimeEnabled=true;}, /must not be enabled/);
});
test('late disclosure uses the same pre-effect guard for both speeches and the update', () => {
  const option=fresh().scenes['6.6'].script.find(b=>b.type==='choice').options.find(o=>o.id==='6.6.290c67ce9e6d');
  assert.deepEqual(option.responsePlan[1].when,option.effects[0].when);
  assert.deepEqual(option.responsePlan[2].when,option.effects[0].when);
  assert.deepEqual(option.effects[0].when.all[1],{eq:['astaInformedAt',null]});
});

test('all local portraits are assigned and invalid catalog links are rejected', () => {
  assert.equal(validateStory(root).summary.unassignedPortraits, 0);
  rejects(s=>{s.speakers['convoy-driver'].portrait={kind:'character',id:'missing'};}, /Unknown or mismatched portrait character/);
  rejects(s=>{s.speakers['bridge-woman'].portrait={kind:'character',id:'thea'};}, /Mask must not reveal/);
});

test('dialogue punctuation and cargo secrecy are protected', () => {
  rejects(s=>{s.scenes.prologue.script.find(b=>b.type==='dialogue').text='Реплика без точки';}, /terminal punctuation/);
  rejects(s=>{s.scenes.prologue.script[0].text='Мы несём аттрактор.';}, /Prologue must not reveal/);
  rejects(s=>{s.defeat.selection.first.text='Аттрактор возвращает тебя.';}, /Early defeat reveals/);
  rejects(s=>{s.defeat.selection.second.when={eq:['deathReveals',1]};}, /requires cargo knowledge/);
  rejects(s=>{s.defeat.selection.random.variants[0].when={all:[]};}, /requires cargo knowledge/);
  rejects(s=>{s.scenes['1.2'].script.find(b=>b.id==='1.2.cargo-explanation').effects=[];}, /Missing cargo knowledge effect/);
});


test('story map point types and activity labels remain synchronized', () => {
  rejects(s => { delete s.chapters[0].stages[0].mapPointType; }, /Wrong combat map point type/);
  rejects(s => { s.chapters[0].stages[1].activities[0].mapPointType = 'missing'; }, /Unknown activity map point type/);
  rejects(s => { s.chapters[0].stages[1].activities[0].label = 'Рынок'; }, /Wrong activity map point label/);
});


test('map catalog rejects duplicate IDs, missing images and broken preview links', () => {
  const catalog = () => JSON.parse(readFileSync(resolve(root, 'data/map-points.json'), 'utf8'));
  let c = catalog(); c.points[1].id = c.points[0].id;
  assert.ok(validateMapPoints(root, undefined, c).errors.some(e => /Duplicate map point ID/.test(e)));
  c = catalog(); c.points[0].icon.src = '/ui/map-points/v1/missing.png';
  assert.ok(validateMapPoints(root, undefined, c).errors.some(e => /Missing map point image/.test(e)));
  const preview = JSON.parse(readFileSync(resolve(root, 'data/story-preview.json'), 'utf8'));
  preview.nodes['1.2.activity.campfire'].mapPointType = 'market';
  assert.ok(validateMapPoints(root, undefined, undefined, preview).errors.some(e => /Preview map point mismatch/.test(e)));
});


test('chapter artwork is fixed, valid and synchronized with the preview', () => {
  rejects(s => { delete s.chapters[0].mapBinding.mapId; }, /Missing or unknown map/);
  rejects(s => { s.chapters[0].mapBinding.mapId = 'missing'; }, /Missing or unknown map/);
  rejects(s => { s.chapters[0].mapBinding.selection = 'existingJourneyMapSelection'; }, /requires fixed map binding/);
  rejects(s => { s.chapters[0].mapBinding.mapId = s.chapters[1].mapBinding.mapId; }, /Preview chapter map mismatch/);
});


test('integrated map catalog requires an existing adapter and rules', () => {
  const catalog=JSON.parse(readFileSync(resolve(root,'data/map-points.json'),'utf8'));
  assert.deepEqual(validateMapPoints(root,undefined,catalog).errors,[]);
  catalog.integration.adapter='mobile/missing.gd';
  assert.ok(validateMapPoints(root,undefined,catalog).errors.some(e=>/implemented adapter/.test(e)));
});
