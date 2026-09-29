import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync}from'node:fs';
import {initialRun,advance,jump,back,defeat,validate}from'../engine.mjs';
const c=JSON.parse(readFileSync(new URL('../../data/story-preview.json',import.meta.url)));
const sceneNode=(scene,p)=>Object.values(c.nodes).find(n=>n.scene===scene&&p(n));
function finish(run,choose=()=>0){let count=0,seen=[];while(c.nodes[run.node].kind!=='end'){const n=c.nodes[run.node];seen.push(n);assert.ok(++count<2500,'must terminate');let option;if(n.kind==='choice')option=n.options[n.mode==='questions'?n.options.length-1:choose(n)];advance(c,run,option);}return seen;}
test('all nodes, references and combat counts valid',()=>{assert.deepEqual(validate(c),[]);assert.equal(Object.values(c.nodes).filter(n=>n.kind==='combat').length,30);assert.equal(Object.values(c.scenes).filter(s=>s.kind==='stop').length,24);});
for(let ending=0;ending<3;ending++)test(`campaign reaches ending ${ending} without entering other options`,()=>{const r=initialRun(c);const seen=finish(r,n=>n.scene==='final-choice'?ending:0);assert.equal(c.nodes[r.node].scene,['ending-duty','ending-release','ending-keep'][ending]);assert.equal(seen.filter(n=>n.kind==='combat').length,30);assert.ok(!seen.some(n=>n.speaker==='border-faun'));});
test('hostile choices pick alternate encounter dialogue',()=>{const r=initialRun(c);r.state.voiceCapability='coherent';const seen=finish(r,n=>n.scene==='final-choice'?0:n.options.length-1);assert.ok(seen.some(n=>n.speaker==='border-faun'));assert.ok(!seen.some(n=>n.speaker==='border-raider'));assert.equal(r.state.marauder,'killed');});
test('late confession appears before its effect; question menu returns',()=>{const r=initialRun(c);r.state.astaDisclosure='hidden';const n=sceneNode('6.6',n=>n.kind==='choice'&&n.mode==='questions');jump(c,r,n.id);advance(c,r,n.options[1]);let text=[];for(let i=0;i<10&&r.node!==n.id;i++){text.push(c.nodes[r.node].text);advance(c,r);}assert.ok(text.includes('«Мой камень тоже говорит.»'));assert.equal(r.state.astaInformedAt,'6.6');assert.equal(r.node,n.id);});
test('conditional day and night scenes never both display',()=>{for(const time of ['day','night']){const r=initialRun(c);r.state.vampireTime=time;jump(c,r,c.scenes['2.9'].entry);const texts=[];while(c.nodes[r.node].kind!=='combat'){texts.push(c.nodes[r.node].text);advance(c,r);}assert.equal(texts.some(t=>t.includes('Полоса солнца')),time==='day');assert.equal(texts.some(t=>t.includes('погашены лампы')),time==='night');}});
test('first death never also shows second revelation and retains choices',()=>{const r=initialRun(c);r.state.medicines='sold';r.chapter=3;defeat(c,r,()=>0);const first=r.node;advance(c,r);assert.equal(r.node,'death-return');assert.equal(r.state.deathReveals,1);advance(c,r);assert.equal(c.nodes[r.node].scene,'chapter-3.intro');assert.equal(r.state.medicines,'sold');defeat(c,r);assert.notEqual(r.node,first);});
test('back restores state atomically',()=>{const r=initialRun(c);const n=sceneNode('prologue',n=>n.kind==='choice');jump(c,r,n.id);advance(c,r,n.options[0]);advance(c,r);advance(c,r);assert.equal(r.state.motivation,'money');back(r);assert.equal(r.state.motivation,null);});
test('seed sale only appears with retained seeds and market selection',()=>{const r=initialRun(c);r.state.seeds='returned';jump(c,r,c.scenes['5.2'].entry);let hit=false;for(let i=0;i<20&&c.nodes[r.node].scene==='5.2';i++){const n=c.nodes[r.node];if(n.id==='5.2.sell-seeds')hit=true;advance(c,r,n.kind==='choice'?n.options.find(id=>c.nodes[id].text==='Рынок'):undefined);}assert.equal(hit,false);});
test('defeat must not mark the unfinished combat scene completed',()=>{const r=initialRun(c);const battle=sceneNode('1.3',n=>n.kind==='combat');r.node=battle.id;defeat(c,r);assert.ok(!r.completedScenes.includes('1.3'));});
test('optional campfire dialogue excluded when forge chosen',()=>{const r=initialRun(c);jump(c,r,c.scenes['1.6'].entry);const seen=[];for(let i=0;i<30&&c.nodes[r.node].scene==='1.6';i++){const n=c.nodes[r.node];seen.push(n.text);advance(c,r,n.kind==='choice'?n.options.find(id=>c.nodes[id].text==='Кузница'):undefined);}assert.ok(!seen.some(t=>t.includes('Логос разделился')));});
test('normal play can sell seeds, sale persists',()=>{const r=initialRun(c);r.state.seeds='kept';jump(c,r,c.scenes['5.2'].entry);for(let i=0;i<30&&c.nodes[r.node].scene==='5.2';i++){const n=c.nodes[r.node];advance(c,r,n.kind==='choice'?n.options.find(id=>c.nodes[id].mapPointType==='market'||id==='5.2.sell'):undefined);}assert.equal(r.state.seedsSold,true);assert.equal(r.state.seeds,'kept');});

function finishDeath(run){const seen=[];while(c.nodes[run.node].scene==='defeat'){seen.push(c.nodes[run.node]);advance(c,run);assert.ok(seen.length<15);}return seen;}
test('repeated early deaths never disclose cargo, even with a developed voice',()=>{
 const r=initialRun(c);r.state.voiceCapability='coherent';r.state.unspentShardsBeforeDefeat=5;r.chapter=1;
 for(let i=0;i<5;i++){
  defeat(c,r,()=>0);const seen=finishDeath(r);
  assert.equal(seen[0].id,i===0?'death-first':'death-before-knowledge');
  assert.ok(seen.every(n=>n.speaker!=='attractor'&&!/аттрактор|камень/iu.test(n.text)));
  assert.ok(seen.some(n=>n.id==='death-shards'));assert.equal(r.state.deathReveals,1);
  assert.equal(r.state.attractorKnown,false);assert.equal(r.node,c.defeat.chapterStartByNumber[1]);
 }
});
test('reading Sevran sets retained knowledge and unlocks the second disclosure',()=>{
 const r=initialRun(c);r.state.deathReveals=1;
 jump(c,r,'1.2.cargo-explanation');assert.equal(r.state.attractorKnown,false);
 advance(c,r);assert.equal(r.state.attractorKnown,true);r.chapter=4;
 defeat(c,r,()=>0);const seen=finishDeath(r);
 assert.equal(seen[0].id,'death-second');assert.equal(r.state.deathReveals,2);
 assert.equal(r.state.attractorKnown,true);assert.equal(r.node,c.defeat.chapterStartByNumber[4]);
 assert.ok(!seen.some(n=>n.id==='death-shards'));
 defeat(c,r,()=>0);assert.equal(r.node,'death-1');finishDeath(r);
});
test('a first death later in the story still shows only the first disclosure',()=>{
 const r=initialRun(c);r.state.attractorKnown=true;r.chapter=5;
 defeat(c,r);const seen=finishDeath(r);assert.equal(seen[0].id,'death-first');
 assert.ok(!seen.some(n=>n.id==='death-second'));assert.equal(r.state.deathReveals,1);
 assert.equal(r.node,c.defeat.chapterStartByNumber[5]);
});
test('every eligible random death is exclusive and respects voice and shard conditions',()=>{
 for(const voice of ['fragmentary','coherent'])for(const lost of [0,5])for(let k=0;k<7;k++){
  const r=initialRun(c);Object.assign(r.state,{attractorKnown:true,deathReveals:2,voiceCapability:voice,unspentShardsBeforeDefeat:lost});
  defeat(c,r,()=>k/7);const seen=finishDeath(r);
  assert.equal(seen.filter(n=>/^death-[1-7]$/.test(n.id)).length,1);
  assert.equal(seen.some(n=>n.id==='death-shards'),lost>0);
  if(voice==='fragmentary')assert.ok(seen.every(n=>n.speaker!=='attractor'));
 }
});
test('all displayed speeches and narrative sentences have terminal punctuation',()=>{
 for(const n of Object.values(c.nodes)){
  if(['dialogue','narration'].includes(n.kind)&&n.id!=='death-return')assert.match(n.text,/[.!?…][»”"]?$/,n.id);
  for(const v of n.textVariants||[])assert.match(v.text,/[.!?…][»”"]?$/,n.id);
 }
});

test("spoken dialogue is quoted in data",()=>{for(const n of Object.values(c.nodes)){if(n.kind==="dialogue"){assert.ok(n.text.startsWith("«")&&n.text.endsWith("»"),n.id);for(const v of n.textVariants||[])assert.ok(v.text.startsWith("«")&&v.text.endsWith("»"),n.id);}}});
