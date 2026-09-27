export function matches(condition,state){
 if(!condition)return true;
 const [op,args]=Object.entries(condition)[0];
 if(op==='all')return args.every(c=>matches(c,state));
 if(op==='not')return !matches(args,state);
 if(op==='eq')return state[args[0]]===args[1];
 if(op==='gt')return state[args[0]]>args[1];
 if(op==='gte')return state[args[0]]>=args[1];
 throw new Error(`Неизвестное условие: ${op}`);
}
export function initialRun(config){return {node:config.entry,state:Object.fromEntries(Object.entries(config.state).map(([k,v])=>[k,v.initial])),visited:[],history:[],completedScenes:[],chapter:1,entryState:{},mode:'play'};}
export function snapshot(run){const {history,...rest}=run;return structuredClone(rest);}
function remember(run){run.history.push(snapshot(run));if(run.history.length>200)run.history.shift();}
export function applyEffects(effects,run){const before={...run.state};for(const e of effects||[]){if(e.type!=='set')throw new Error(`Неизвестный эффект: ${e.type}`);if(matches(e.when,before))run.state[e.key]=e.value;}}
export function settle(config,run,target,{force=false,replay=true}={}){
 const startScene=config.nodes[run.node]?.scene;
 if(target==='$chapterStart')target=config.defeat.chapterStartByNumber[run.chapter];
 let visited=new Set();
 while(target){
  if(visited.has(target))throw new Error('Цикл переходов без окна');visited.add(target);
  const n=config.nodes[target];if(!n)throw new Error(`Отсутствует узел ${target}`);
  const scene=config.scenes[n.scene];
  if(replay&&scene?.entry===target&&run.completedScenes.includes(n.scene)&&scene.repeatEntry){target=scene.repeatEntry;continue;}
  const values=n.conditionScope==='entry'?run.entryState:run.state;
  if(!force&&!matches(n.when,values)){target=n.next;continue;}
  if(n.kind==='effect'){applyEffects(n.effects,run);target=n.next;continue;}
  if(startScene&&startScene!==n.scene&&n.scene!==config.nodes[config.defeat.entry].scene&&run.mode==='play'&&!run.completedScenes.includes(startScene))run.completedScenes.push(startScene);
  if(scene?.chapter)run.chapter=scene.chapter;
  run.node=target;if(!run.visited.includes(target))run.visited.push(target);return run;
 }
 throw new Error('Переход не задан');
}
export function advance(config,run,optionId){
 const n=config.nodes[run.node];if(n.kind==='end')return run;
 let target=n.next;
 if(n.kind==='choice'){
  if(!n.options.includes(optionId))throw new Error('Нужно выбрать доступный ответ');
  const option=config.nodes[optionId];if(!matches(option.when,run.state))throw new Error('Ответ недоступен');
  target=option.next;
 }
 remember(run);applyEffects(n.effects,run);
 if(n.kind==='combat'&&run.completedScenes.includes(n.scene)&&n.replayNext)target=n.replayNext;
 return settle(config,run,target);
}
export function jump(config,run,id){if(!config.nodes[id])throw new Error('Узел не найден');remember(run);run.mode='inspect';run.entryState={...run.state};return settle(config,run,id,{force:true,replay:false});}
export function back(run){const prev=run.history.pop();if(prev)Object.assign(run,prev);return run;}
export function defeat(config,run,random=Math.random){
 remember(run);const variants=config.defeat.variants.filter(v=>matches(v.when,run.state));
 const alternatives=variants.filter(v=>v.id!==run.state.lastDeathVariant);const pool=alternatives.length?alternatives:variants;
 if(matches(config.defeat.randomWhen,run.state)&&pool.length){const selected=pool[Math.floor(random()*pool.length)];run.state.deathVariant=selected.id;run.state.lastDeathVariant=selected.id;}
 run.entryState={...run.state};return settle(config,run,config.defeat.entry,{replay:false});
}
export function validate(config){
 const errors=[];const keys=new Set(Object.keys(config.nodes));
 for(const [id,n]of Object.entries(config.nodes)){
  if(n.id!==id)errors.push(`Несовпадающий ID: ${id}`);
  if(!['dialogue','narration','choice','combat','option','effect','end'].includes(n.kind))errors.push(`Неизвестный тип: ${id}`);
  for(const dest of [n.next,n.defeat,n.replayNext,...(n.options||[])])if(dest&&dest!=='$chapterStart'&&!keys.has(dest))errors.push(`Нет перехода: ${id} → ${dest}`);
  if(n.speaker&&!config.speakers[n.speaker])errors.push(`Нет говорящего: ${id}`);
  if(!config.scenes[n.scene])errors.push(`Нет сцены: ${id}`);
 }
 return errors;
}
