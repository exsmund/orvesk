/** Generate oracle cases from the existing TypeScript engine, never from the port. */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildDeck } from '../../src/game/combat/deck';
import { calculateClash, placementCost } from '../../src/game/combat/clash-damage';
import { possiblePlacements, placementCells } from '../../src/game/combat/board';
import { ITEMS } from '../../src/game/equipment/catalog';
import { CREATURES } from '../../src/game/creatures/catalog';
import { SKILLS } from '../../src/game/skills/skills';
import { figureCellParts } from '../../src/game/combat/figure-power';
import type { Fighter, Placement, BoardModifiers } from '../../src/game/types';
let seed = 73129;
const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
const pick = <T>(a: T[]): T => a[Math.floor(random() * a.length)];
const fighter = (rank: number): Fighter => ({name: 'Fixture', stats:{strength:rank,agility:rank,vitality:rank,intelligence:rank}, hp:30+20*(rank-1), stamina:8, gear:{weapon:null,shield:null,body:null,feet:null},skills:[]});
const decks: unknown[] = [];
for (const equipment of ITEMS) for (const rank of [1,3,10]) {
 const f=fighter(rank); if(!equipment.unarmed) f.gear[equipment.slot]=`${equipment.id}@${rank}`;
 const deck=buildDeck(f); decks.push({fighter:f,deck,parts:deck.map(m=>figureCellParts(f,m))});
}
for (const c of CREATURES.filter(c=>c.encounter.combat)) {
 for (const variant of [undefined, ...Object.keys(c.variants ?? {})]) {
  const f=fighter(variant ? 1 : 3); f.creatureId=c.id;
  if (variant) f.creatureVariant=variant;
  const deck=buildDeck(f); decks.push({fighter:f,deck,parts:deck.map(m=>figureCellParts(f,m))});
 }
}
for (const s of SKILLS) {const f=fighter(2); f.skills=[s.id]; const deck=buildDeck(f); decks.push({fighter:f,deck,parts:deck.map(m=>figureCellParts(f,m))});}
const cases: unknown[]=[];
for(let n=0;n<240;n++) {
 const p=structuredClone((pick(decks) as any).fighter) as Fighter;
 const e=structuredClone((pick(decks) as any).fighter) as Fighter;
 for(const f of [p,e]) {const deck=buildDeck(f); f.deck={hand:deck.sort(()=>random()-.5).slice(0,4),draw:[],discard:[],exchanged:false}; f.stamina=Math.floor(random()*9); f.hp=Math.max(.1,Math.round(f.hp*random()*10)/10);}
 const mods:Record<string,BoardModifiers>={player:{},enemy:{}};
 const moves:Record<string,Placement[]>={player:[],enemy:[]};
 for(const [side,f] of [['player',p],['enemy',e]] as const){
  if(n%5===0 && f.deck!.hand.length) mods[side]={compressed:f.deck!.hand[0].id};
  const used:number[]=[];
  for(const m of f.deck!.hand){
   const options=possiblePlacements(m,[],used,mods[side]);
   if(!options.length || random()<.3) continue;
   const place=pick(options); moves[side].push(place); used.push(...placementCells(m,place,mods[side]));
  }
 }
 const typedMoves=moves as Record<'player'|'enemy',Placement[]>;
 const typedMods=mods as Record<'player'|'enemy',BoardModifiers>;
 const calculation=calculateClash({player:p,enemy:e},typedMoves,typedMods);
 cases.push({fighters:{player:p,enemy:e},moves,mods,expected:calculation.sides,cells:calculation.cells,blindCost:placementCost(p,moves.player,mods.player)});
}
const out=resolve('mobile/tests/generated'); mkdirSync(out,{recursive:true});
writeFileSync(resolve(out,'reference.json'),JSON.stringify({decks,cases}));
console.log(`Generated ${decks.length} deck cases and ${cases.length} clash cases`);
