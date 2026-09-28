import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export function validateMapPoints(root, suppliedStory, suppliedCatalog, suppliedPreview) {
  const errors = [];
  const check = (ok, message) => { if (!ok) errors.push(message); };
  const read = name => JSON.parse(readFileSync(resolve(root, name), 'utf8'));
  const catalog = suppliedCatalog ?? read('data/map-points.json');
  const story = suppliedStory ?? read('data/story.json');
  const preview = suppliedPreview ?? read('data/story-preview.json');
  check(catalog.version === 1, 'Unsupported map point catalog version');
  const integration = catalog.integration;
  const prepared = integration?.status === 'prepared' && integration.runtimeEnabled === false;
  const integrated = integration?.status === 'integrated' && integration.runtimeEnabled === true
    && integration.clients?.includes('mobile') && typeof integration.adapter === 'string'
    && existsSync(resolve(root, integration.adapter)) && typeof integration.rules === 'string'
    && existsSync(resolve(root, integration.rules));
  check(prepared || integrated, 'Map points require a declared implemented adapter before runtime');
  check(catalog.presentation?.shape === 'circle', 'Map points must use circular frames');
  check(catalog.presentation?.minimumDisplaySize >= 48, 'Map point minimum size must be at least 48px');
  const box = catalog.presentation?.symbolBox;
  check(box && box.x >= 0 && box.y >= 0 && box.width > 0 && box.height > 0 && box.x + box.width <= 1 && box.y + box.height <= 1, 'Invalid map symbol box');
  check(existsSync(resolve(root, catalog.artDirection ?? 'missing')), 'Missing map point art direction');
  const checkImage = (src, size) => {
    if (typeof src !== 'string' || !/^\/ui\/map-points\/v1\/(?:symbols\/)?[a-z-]+\.png$/.test(src)) { check(false, `Invalid map point image path ${src}`); return; }
    const path = resolve(root, 'public' + src);
    if (!existsSync(path)) { check(false, `Missing map point image ${src}`); return; }
    const b = readFileSync(path);
    if (b.length < 33 || b.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') { check(false, `Invalid map point PNG ${src}`); return; }
    const w = b.readUInt32BE(16), h = b.readUInt32BE(20);
    check(w === h && w > 0 && (!size || w === size), `Wrong map point image dimensions ${src}`);
    check(b[25] === 6 || b[25] === 4, `Map point PNG requires alpha ${src}`);
  };
  checkImage(catalog.presentation?.frame);
  const points = new Map(), labels = new Map();
  for (const p of catalog.points ?? []) {
    check(typeof p.id === 'string' && /^[a-z]+(?:-[a-z]+)*$/.test(p.id), `Invalid map point ID ${p.id}`);
    check(!points.has(p.id), `Duplicate map point ID ${p.id}`); points.set(p.id, p);
    check(['combat', 'rest', 'service', 'encounter'].includes(p.category), `Invalid map point category ${p.id}`);
    for (const field of ['name', 'description', 'symbolDescription', 'actionLabel']) check(typeof p[field] === 'string' && p[field].trim(), `Missing map point ${field}: ${p.id}`);
    check(p.icon?.alt === p.name, `Wrong map point accessible name ${p.id}`);
    check(!p.icon?.frame, `Map point ${p.id} must share the catalog frame`);
    checkImage(p.icon?.src, catalog.presentation?.exportSize); checkImage(p.icon?.symbol);
    for (const label of p.storyLabels ?? []) {
      check(!labels.has(label), `Ambiguous map point label ${label}`); labels.set(label, p.id);
    }
    const existing = ['combat', 'boss', 'campfire', 'forge'].includes(p.id);
    check(p.engineBinding?.status === (existing ? 'existingMechanic' : 'requiresStoryActivityAdapter'), `Wrong map point integration status ${p.id}`);
    check(p.availability === (existing ? 'whenRouteExists' : 'onlyWhenDeclaredByStory'), `Wrong map point availability ${p.id}`);
    if (!existing) check(p.engineBinding?.route === null && p.engineBinding?.effectBinding === null, `Unimplemented map point must not claim engine handler ${p.id}`);
  }
  check(story.catalogs?.mapPoints === 'data/map-points.json', 'Missing story map point catalog binding');
  check(preview.mapPointsCatalog === 'data/map-points.json', 'Missing preview map point catalog binding');
  const stageTypes = new Map(), activityTypes = new Map(), used = new Set();
  let references = 0;
  for (const chapter of story.chapters ?? []) for (const stage of chapter.stages ?? []) {
    if (stage.kind === 'stop') {
      for (const activity of stage.activities ?? []) {
        const type = activity.mapPointType, p = points.get(type), key = `${stage.id}.activity.${activity.id}`;
        check(!!p && p.category !== 'combat', `Unknown activity map point type ${stage.id}/${activity.id}: ${type}`);
        check(type === labels.get(activity.label), `Wrong activity map point label ${stage.id}/${activity.id}`);
        if (p?.engineBinding.status === 'existingMechanic') check(activity.effectBinding === p.engineBinding.effectBinding, `Wrong activity effect binding ${stage.id}/${activity.id}`);
        activityTypes.set(key, type); used.add(type); references++;
        const node = preview.nodes?.[key];
        check(node?.mapPointType === type && node?.text === activity.label, `Preview map point mismatch ${key}`);
      }
    } else {
      const expected = stage.kind === 'boss' ? 'boss' : 'combat';
      check(stage.mapPointType === expected && points.has(expected), `Wrong combat map point type ${stage.id}`);
      stageTypes.set(stage.id, expected); used.add(expected); references++;
      check(Object.values(preview.nodes ?? {}).some(n => n.kind === 'combat' && n.scene === stage.id), `Missing preview combat map point ${stage.id}`);
    }
  }
  for (const [id, node] of Object.entries(preview.nodes ?? {})) {
    if (node.kind === 'combat') check(node.mapPointType === stageTypes.get(node.scene) && points.has(node.mapPointType), `Preview combat map point mismatch ${id}`);
    else if ('mapPointType' in node) check(activityTypes.has(id) && node.mapPointType === activityTypes.get(id), `Unexpected preview map point ${id}`);
  }
  for (const id of points.keys()) check(used.has(id), `Map point has no story reference ${id}`);
  return { errors, summary: { types: points.size, storyReferences: references } };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = validateMapPoints(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
    console.log(JSON.stringify(result, null, 2)); process.exitCode = result.errors.length ? 1 : 0;
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
