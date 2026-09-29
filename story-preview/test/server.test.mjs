import test from 'node:test';import assert from 'node:assert/strict';import {server}from'../server.mjs';
test('serves data and assets, excludes game sessions and project files',async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
 try{
  assert.equal((await fetch(base+'/')).status,200);
  const sourceStatus=await fetch(base+'/api/source-status');
  assert.equal(sourceStatus.status,200);
  assert.deepEqual(await sourceStatus.json(),{changed:[]});
  const config=await fetch(base+'/data/story-preview.json').then(r=>r.json());assert.ok(config.nodes[config.entry]);
  assert.equal((await fetch(base+'/characters/sevran.png')).status,200);
  for(const path of ['/data/sessions/test.json','/data/combat-balance.json','/server.mjs','/package.json','/../AGENTS.md'])assert.notEqual((await fetch(base+path)).status,200,path);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
