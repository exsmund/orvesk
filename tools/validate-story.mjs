import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export function validateStory(root, suppliedStory) {
  const errors = [], blockers = [];
  const check = (ok, message) => { if (!ok) errors.push(message); };
  const read = (name) => JSON.parse(readFileSync(resolve(root, name), 'utf8'));
  const story = suppliedStory ?? read('data/story.json');
  const characters = new Map(read('data/story-characters.json').map(x => [x.id, x]));
  const creatures = new Map(read('data/creatures.json').map(x => [x.id, x]));
  const maps = new Set(read('data/journey-maps.json').map(x => x.id));
  const ids = new Set(), stages = new Map();
  const scenes = story.scenes ?? {};
  const blockTypes = new Set(['dialogue', 'narration', 'choice', 'action', 'instruction', 'interfaceInstruction', 'conditionalInstruction', 'choiceInstruction', 'encounterInstruction']);
  const instructionTypes = new Set([...blockTypes].filter(x => x.endsWith('Instruction') || x === 'instruction'));
  let instructions = 0, choices = 0, dialogue = 0;
  const recordId = (id, path) => {
    check(typeof id === 'string' && id.length > 0, `${path}: missing ID`);
    check(!ids.has(id), `${path}: duplicate ID ${id}`);
    if (id) ids.add(id);
  };
  const state = story.state ?? {};
  const context = new Set(story.conditions?.externalContext ?? []);
  const valueAllowed = (definition, value) => value === null ? definition?.initial === null : definition?.type === 'enum'
    ? definition.values.includes(value)
    : definition?.type === 'integer' ? Number.isInteger(value)
    : typeof value === definition?.type;
  function condition(c, path) {
    check(c && typeof c === 'object' && Object.keys(c).length === 1, `${path}: invalid condition`);
    if (!c || typeof c !== 'object') return;
    for (const [op, args] of Object.entries(c)) {
      check(['eq','gt','gte','all'].includes(op), `${path}: unsupported operator ${op}`);
      check(Array.isArray(args), `${path}: condition arguments must be array`);
      if (!Array.isArray(args)) continue;
      if (op === 'all') { args.forEach((x,i) => condition(x, `${path}/${i}`)); continue; }
      check(args.length === 2, `${path}: expected field and value`);
      const [key, value] = args;
      check(key in state || context.has(key), `${path}: unknown state/context ${key}`);
      if (key in state) {
        check(valueAllowed(state[key], value), `${path}: invalid value for ${key}`);
        if (op !== 'eq') check(['number','integer'].includes(state[key].type), `${path}: comparison of non-number`);
      }
    }
  }
  function walk(x, path) {
    if (Array.isArray(x)) { x.forEach((v,i) => walk(v, `${path}/${i}`)); return; }
    if (!x || typeof x !== 'object') return;
    if (blockTypes.has(x.type)) recordId(x.id, path);
    if (instructionTypes.has(x.type)) {
      instructions++;
      check(x.display === false, `${path}: instruction must not be displayed`);
    }
    if (x.type === 'dialogue') {
      dialogue++;
      check(Boolean(x.speaker) !== Boolean(x.speakerId), `${path}: exactly one speaker reference required`);
      if (x.speaker) check(x.speaker in story.characters, `${path}: unknown character ${x.speaker}`);
      if (x.speakerId) check(x.speakerId in story.speakers, `${path}: unknown local speaker ${x.speakerId}`);
      check(!['Интерфейс','Общее продолжение — Тея','Дополнительный вопрос героя'].includes(x.speakerRole), `${path}: editorial label used as speaker`);
      check(typeof x.text === 'string' && !/[→]|\*\*/.test(x.text), `${path}: malformed speech`);
    }
    if (['dialogue', 'narration'].includes(x.type)) check(typeof x.text === 'string' && /[.!?…][»”"]?$/.test(x.text), `${path}: displayed sentence needs terminal punctuation`);
    if (x.type === 'narration') check(x.portrait === null && !x.speaker && !x.speakerId, `${path}: narration must have no portrait or speaker`);
    if (x.type === 'choice') {
      choices++;
      check(Array.isArray(x.options) && x.options.length > 0, `${path}: empty choice`);
      for (const o of x.options ?? []) {
        recordId(o.id, path + '/option');
        check(['speech','action','actionWithSpeech'].includes(o.selectionType), `${path}: invalid selectionType`);
      }
    }
    if (x.type === 'set') {
      check(x.key in state, `${path}: effect targets unknown state ${x.key}`);
      if (state[x.key]) check(valueAllowed(state[x.key], x.value), `${path}: invalid effect value for ${x.key}`);
    }
    if (x.when) condition(x.when, path + '/when');
    if (x.returnTo) check(['menu','commonContinuation'].includes(x.returnTo), `${path}: unknown return target`);
    if (typeof x.next === 'string') check(x.next in scenes, `${path}: missing next scene ${x.next}`);
    if (x.creatureId) check(creatures.has(x.creatureId), `${path}: missing creature ${x.creatureId}`);
    for (const [key, value] of Object.entries(x)) walk(value, path + '/' + key);
  }
  check(story.version === 1, 'Unsupported story version');
  check(story.runtimeEnabled === false, 'Authoring story must not be enabled in runtime');
  check(story.entryScene in scenes, 'Missing entry scene');
  for (const source of [story.source, ...(story.source?.dependencies ?? [])]) {
    const path = source?.document && resolve(root, source.document);
    check(path && existsSync(path), `Missing source ${source?.document}`);
    if (path && existsSync(path)) check(createHash('sha256').update(readFileSync(path)).digest('hex') === source.sha256, `Stale source ${source.document}`);
  }
  for (const [key, path] of Object.entries(story.catalogs ?? {})) check(existsSync(resolve(root, path)), `Missing catalog ${key}: ${path}`);
  for (const [id, c] of Object.entries(story.characters ?? {})) {
    check(c.characterId === id && characters.has(id), `Unknown character binding ${id}`);
    check(!('portrait' in c) && !('facing' in c) && !('portraitSide' in c), `Duplicated character presentation ${id}`);
    const source = characters.get(id);
    if (source?.portrait) check(existsSync(resolve(root, 'public', source.portrait.src.replace(/^\//,''))), `Missing character image ${id}`);
  }
  const unassigned = [];
  for (const [id, speaker] of Object.entries(story.speakers ?? {})) {
    check(speaker.portraitSide === 'right' && speaker.facing === 'left', `Wrong local speaker orientation ${id}`);
    const p = speaker.portrait;
    check(['character','creature','unassigned'].includes(p?.kind), `Invalid local portrait kind ${id}`);
    if (p?.kind === 'creature') {
      const c = creatures.get(p.id);
      check(!!c, `Unknown portrait creature ${p.id}`);
      if (c) check(existsSync(resolve(root,'public',c.portrait.src.replace(/^\//,''))), `Missing creature image ${p.id}`);
    } else if (p?.kind === 'character') {
      const c = characters.get(p.id);
      check(!!c && p.id === id, `Unknown or mismatched portrait character ${id}: ${p.id}`);
      check(c?.portraitSource === 'asset' && !!c?.portrait?.src, `Missing portrait asset binding ${id}`);
      check(c?.portrait?.facing === 'left' && c?.dialogueSide === 'right', `Wrong portrait character orientation ${id}`);
      if (c?.portrait?.src) check(existsSync(resolve(root, 'public', c.portrait.src.replace(/^\//,''))), `Missing character image ${id}`);
    } else if (p?.kind === 'unassigned') unassigned.push(id);
    if (speaker.revealedSpeakerId) check(speaker.revealedSpeakerId in story.speakers, `Missing revealed identity ${id}`);
  }
  const declaredUnassigned = story.unresolvedBindings?.find(x=>x.id === 'localAndDisguisedPortraits')?.speakerIds ?? [];
  check(JSON.stringify([...unassigned].sort()) === JSON.stringify([...declaredUnassigned].sort()), 'Unassigned portraits are not accurately listed');
  check(story.chapters?.length === 6, 'Expected six chapters');
  for (const [ci, chapter] of (story.chapters ?? []).entries()) {
    check(chapter.number === ci+1 && chapter.expedition === ci+1, `Wrong chapter mapping ${chapter.id}`);
    check(chapter.introScene in scenes, `Missing intro ${chapter.id}`);
    check(chapter.stages.length === 9, `Expected nine stages ${chapter.id}`);
    if (chapter.mapBinding?.mapId) check(maps.has(chapter.mapBinding.mapId), `Unknown map ${chapter.id}`);
    for (const [i, st] of chapter.stages.entries()) {
      check(!stages.has(st.id), `Duplicate stage ${st.id}`); stages.set(st.id, st);
      const n=Math.floor(i/2)+1, stop=i%2===1;
      check(st.kind === (stop?'stop':i===8?'boss':'combat'), `Wrong stage kind ${st.id}`);
      check(st.scene in scenes && st.repeatScene in scenes, `Missing stage/repeat scene ${st.id}`);
      check(st.engineBinding?.journeyStage === n, `Wrong engine stage ${st.id}`);
      check(JSON.stringify(st.engineBinding?.nodeIds) === JSON.stringify(stop?[`camp-${n}`,`forge-${n}`]:[`fight-${n}`]), `Wrong map nodes ${st.id}`);
      const next = chapter.stages[i+1]?.scene ?? story.chapters[ci+1]?.introScene ?? 'final-choice';
      check(st.next === next, `Wrong chapter continuation ${st.id}`);
      if (stop) {
        for (const a of st.activities) {
          check(a.effectBinding || a.availability === 'requiresStoryActivityAdapter', `Untracked activity binding ${st.id}/${a.id}`);
          if (a.id === 'forge') check(a.availability === 'whenRouteExists', `Forge cannot be guaranteed ${st.id}`);
        }
      } else for (const e of st.encounter.variants ?? [st.encounter]) {
        if (e.kind === 'human') {
          check(e.creatureId === null && e.bindingStatus === 'existingHumanGenerator', `Invalid human binding ${st.id}`);
          check(e.speakerId in story.speakers, `Unknown human identity ${st.id}`);
        } else check(e.kind === 'creature' && creatures.get(e.creatureId)?.encounter.combat, `Noncombat or missing creature ${st.id}`);
      }
    }
  }
  for (const [key, definition] of Object.entries(state)) {
    if (definition.initial !== null) check(valueAllowed(definition, definition.initial), `Invalid initial state ${key}`);
    if (definition.scope === 'campaign') check(story.persistence.retainOnDefeat.includes(key), `State lost on defeat ${key}`);
  }
  for (const key of story.persistence.retainOnDefeat) check(key in state, `Unknown persisted state ${key}`);
  walk(story.chapters, '/chapters');
  walk(scenes, '/scenes');
  walk(story.defeat, '/defeat');
  walk(story.persistence.repeatOverrides, '/persistence/repeatOverrides');
  for (const override of story.persistence.repeatOverrides) check(stages.has(override.stage) && override.scene in scenes, 'Unknown repeat override');
  for (const h of story.presentation.hiddenIdentities) {
    check(h.scene in scenes, `Unknown reveal scene ${h.scene}`);
    check(h.maskedSpeakerId in story.speakers && h.revealedSpeakerId in story.speakers, `Missing reveal speakers ${h.scene}`);
    const mask = story.speakers[h.maskedSpeakerId]?.portrait;
    check(mask?.kind === 'unassigned' || (mask?.kind === 'character' && mask.id === h.maskedSpeakerId && characters.get(mask.id)?.portrayal === 'humanDisguise'), `Mask must not reveal creature ${h.scene}`);
  }
  const protectsKnowledge = c => c?.eq?.[0] === 'attractorKnown' && c.eq[1] === true
    || Array.isArray(c?.all) && c.all.some(protectsKnowledge);
  check(story.state.attractorKnown?.initial === false, 'Attractor knowledge must start hidden');
  const reveal = scenes['1.2']?.script.find(x => x.id === '1.2.cargo-explanation');
  check(reveal?.effects?.some(x => x.key === 'attractorKnown' && x.value === true), 'Missing cargo knowledge effect');
  check(!/аттрактор|захоронени/iu.test(JSON.stringify(scenes.prologue?.script)), 'Prologue must not reveal the cargo');
  for (const k of ['first', 'beforeKnowledge']) {
    const n = story.defeat.selection[k];
    check(n?.type === 'narration' && n.portrait === null && !/аттрактор|камень/iu.test(n.text), `Early defeat reveals cargo: ${k}`);
  }
  for (const k of ['second', 'random']) check(protectsKnowledge(story.defeat.selection[k]?.when), `Defeat ${k} requires cargo knowledge`);
  for (const v of story.defeat.selection.random.variants) check(protectsKnowledge(v.when), `Defeat ${v.id} requires cargo knowledge`);
  const endings = ['ending-duty','ending-release','ending-keep'];
  check(JSON.stringify(scenes['final-choice']?.script.find(x=>x.type==='choice')?.options.map(x=>x.next).sort()) === JSON.stringify([...endings].sort()), 'All three endings must remain selectable');
  for (const id of endings) check(scenes[id]?.terminal === true && scenes[id]?.allowFurtherCombat === false, `Ending is not terminal ${id}`);
  check(story.defeat.selection.random.rememberVariantIn === 'lastDeathVariant', 'Random defeat variant must be remembered');
  for (const x of story.unresolvedBindings ?? []) blockers.push(`${x.id}: ${x.reason}`);
  if (instructions) blockers.push(`${instructions} authoring instructions require compilation to an action graph`);
  if (story.engineContract?.status !== 'implemented') blockers.push('Story engine adapter is not implemented');
  return { errors, blockers, summary: { chapters: story.chapters.length, stages: stages.size, blockAndOptionIds: ids.size, dialogue, choices, instructions, unassignedPortraits: unassigned.length } };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
    const result = validateStory(root);
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.errors.length || (process.argv.includes('--runtime') && result.blockers.length) ? 1 : 0;
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
