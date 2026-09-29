import {initialRun,advance,back,jump,defeat,matches,validate} from './engine.mjs';
const $=id=>document.getElementById(id);
const get=async name=>{const r=await fetch('/data/'+name);if(!r.ok)throw Error(`Не удалось прочитать ${name}`);return r.json();};
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const button=(text,fn,cls)=>{const b=el('button',text,cls);b.type='button';b.onclick=()=>act(fn);return b;};
let config,run,catalog,creatures,portraits,heroPortrait;let treeButtons=new Map();
const storage='duelyant-story-preview-v1';
function act(fn){try{$('error').textContent='';fn();render();}catch(e){$('error').textContent=e.message;}}
function save(){try{localStorage.setItem(storage,JSON.stringify({fingerprint:{sources:config.sources,revision:config.revision},run,heroPortrait}));}catch{$('error').textContent='Не удалось сохранить проверку в браузере.';}}
function creatureDialoguePortrait(id){const c=creatures.find(c=>c.id===id);return c?.dialoguePortrait||c?.portrait;}
function speakerInfo(node){
 const binding=config.speakers[node.speaker];if(!binding)return null;
 const char=binding.characterId?catalog.find(c=>c.id===binding.characterId):binding;
 let portrait=char?.portrait;let side=char?.dialogueSide||binding.portraitSide||'right';
 if(char?.portraitSource==='player'){portrait={src:heroPortrait};side='left';}
 if(portrait?.kind==='creature')portrait=creatureDialoguePortrait(portrait.id);
 if(char?.portraitSource==='creature'&&char.creatureId)portrait=creatureDialoguePortrait(char.creatureId);
 return {name:node.speakerName||binding.name||char?.name,side,src:portrait?.src,subtitle:binding.subtitle||char?.subtitle};
}
function render(){
 const n=config.nodes[run.node],scene=config.scenes[n.scene];
 $('title').textContent=config.title;$('scene-title').textContent=(scene.chapter?'Карта '+scene.chapter+' · ':'')+scene.title;
 $('progress').textContent=`Просмотрено окон: ${run.visited.length}`;
 $('mode').textContent=run.mode==='inspect'?'Режим проверки: переход по дереву. Состояния сохранены.':'';
 const box=$('window');box.replaceChildren();box.className=n.kind==='dialogue'?'dialogue':'narration';
 const speech=el('div',undefined,'speech');const info=speakerInfo(n);
 if(info){speech.append(el('div',info.name,'speaker'));if(info.subtitle)speech.append(el('div',info.subtitle,'subtitle'));}
 if(n.kind==='combat')speech.append(el('div','⚔','battle-badge'),el('div','Этап боя · без расчёта боя','subtle'));
 const displayText=n.textVariants?.find(v=>matches(v.when,run.state))?.text||n.text;
 speech.append(el('p',displayText||'Продолжить','text'));
 if(info){
  let image;
  const placeholder=()=>{const div=el('div',undefined,'portrait missing');div.append(el('span',info.name?.[0]||'·'),el('small','Портрет не назначен'));return div;};
  if(info.src){image=el('img',undefined,'portrait');image.src=info.src;image.alt=info.name;image.onerror=()=>image.replaceWith(placeholder());}else image=placeholder();
  box.append(...(info.side==='left'?[image,speech]:[speech,image]));
 }else box.append(speech);
 const controls=$('controls');controls.replaceChildren();
 if(n.kind==='choice'){
  for(const id of n.options){const option=config.nodes[id];if(!matches(option.when,run.state))continue;const b=button(option.text,()=>advance(config,run,id));if(option.description)b.append(el('small',option.description));controls.append(b);}
 }else if(n.kind==='end'){controls.append(button('Начать заново',reset,'primary'));}
 else{controls.append(button(n.label||'Далее →',()=>advance(config,run),'primary'));if(n.kind==='combat')controls.append(button('Проверить поражение',()=>defeat(config,run)));}
 $('back').disabled=!run.history.length;
 for(const [id,b] of treeButtons){b.classList.toggle('active',id===run.node);b.classList.toggle('visited',run.visited.includes(id));b.classList.toggle('unavailable',!matches(config.nodes[id].when,run.state));if(id===run.node)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');}
 for(const input of document.querySelectorAll('[data-state]')){const val=run.state[input.dataset.state];input.value=val===null?'__null':String(val);}
 revealActive(false);save();
}
function revealActive(scroll){const b=treeButtons.get(run.node);if(!b)return;for(let p=b.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;if(scroll)b.scrollIntoView({block:'nearest',behavior:'auto'});}
function buildTree(){
 treeButtons=new Map();const nav=$('tree');nav.replaceChildren();
 function list(items){const ul=el('ul');for(const item of items){const n=config.nodes[item.id];const li=el('li');const prefix=n.kind==='option'?'↳ ':n.kind==='choice'?'◇ ':n.kind==='combat'?'⚔ ':'';const b=button(prefix+(n.text||n.id),()=>jump(config,run,n.id));b.title=n.id;treeButtons.set(n.id,b);li.append(b);if(item.children?.length)li.append(list(item.children));ul.append(li);}return ul;}
 for(const group of config.tree){const d=el('details');d.dataset.scene=group.id;const summary=el('summary',group.id+' · '+group.title);d.append(summary,list(group.children));nav.append(d);}
}
function buildInspector(){
 $('state-fields').replaceChildren();
 for(const [key,def]of Object.entries(config.state)){
  const label=el('label',def.label||key);let field;
  if(def.type==='enum'||def.type==='boolean'){
   field=el('select');let values=def.type==='boolean'?[false,true]:def.values;
   if(def.initial===null)values=[null,...values];
   for(const value of values){const o=el('option',value===null?'Не выбрано':String(value));o.value=value===null?'__null':String(value);field.append(o);}
  }else{field=el('input');field.type=['number','integer'].includes(def.type)?'number':'text';if(field.type==='number')field.min='0';}
  field.dataset.state=key;field.onchange=()=>act(()=>{let v=field.value;if(v==='__null')v=null;else if(def.type==='boolean')v=v==='true';else if(['number','integer'].includes(def.type)){v=Number(v);if(!Number.isFinite(v)||v<0||(def.type==='integer'&&!Number.isInteger(v)))throw Error('Введите неотрицательное число');}run.state[key]=v;});label.append(field);$('state-fields').append(label);
 }
 for(const portrait of portraits){const o=el('option',portrait.label);o.value=portrait.src;$('hero-portrait').append(o);}
 $('hero-portrait').value=heroPortrait;$('hero-portrait').onchange=()=>act(()=>{heroPortrait=$('hero-portrait').value;});
 $('notes').replaceChildren(...config.previewNotes.map(t=>el('p',t)));
}
function reset(){run=initialRun(config);run.visited.push(run.node);$('search').value='';filterTree('');}
function filterTree(value){const query=value.toLocaleLowerCase();for(const d of $('tree').children){let any=false;for(const li of d.querySelectorAll('li')){const hit=!query||li.textContent.toLocaleLowerCase().includes(query);li.hidden=!hit;if(hit)any=true;}d.hidden=!any;if(query&&any)d.open=true;}}
try{
 [config,catalog,creatures,portraits]=await Promise.all(['story-preview.json','characters.json','creatures.json','hero-portraits.json'].map(get));
 const errors=validate(config);if(errors.length)throw Error(errors.join('\n'));
 run=initialRun(config);heroPortrait=portraits[0]?.src;run.visited.push(run.node);
 try{const cached=JSON.parse(localStorage.getItem(storage));if(cached&&JSON.stringify(cached.fingerprint)===JSON.stringify({sources:config.sources,revision:config.revision})&&config.nodes[cached.run?.node]){run=cached.run;heroPortrait=cached.heroPortrait||heroPortrait;}}catch{}
 buildTree();buildInspector();render();
 $('back').onclick=()=>act(()=>back(run));$('reset').onclick=()=>{if(confirm('Начать новое прохождение и сбросить сюжетные решения?'))act(reset);};
 $('locate').onclick=()=>revealActive(true);$('search').oninput=e=>filterTree(e.target.value);
 $('expand').onclick=()=>{for(const d of $('tree').children)d.open=true;};$('collapse').onclick=()=>{for(const d of $('tree').children)d.open=false;};
 const status=await fetch('/api/source-status').then(r=>r.json());if(status.changed.length){$('warning').hidden=false;$('warning').textContent='Исходные данные изменились: '+status.changed.join(', ')+'. Конфиг проверки нужно синхронизировать.';}
}catch(e){$('title').textContent='Не удалось открыть историю';$('error').textContent=e.message;}
