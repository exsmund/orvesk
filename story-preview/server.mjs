import http from 'node:http';
import {readFile,realpath} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve,extname,sep} from 'node:path';
import {createHash} from 'node:crypto';
const app=dirname(fileURLToPath(import.meta.url)),root=resolve(app,'..');
const dataFiles=new Set(['story-preview.json','story.json','story-characters.json','creatures.json','portraits.json']);
const appFiles=new Set(['index.html','app.js','engine.mjs','style.css']);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.webp':'image/webp'};
export const server=http.createServer(async(req,res)=>{
 try {
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405).end();return;}
  const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(path==='/api/source-status'){
   const config=JSON.parse(await readFile(resolve(root,'data/story-preview.json'),'utf8'));
   const changed=[];
   for(const src of config.sources){
    if(!['data/story.json','docs/STORY.md','data/story-characters.json','data/map-points.json','data/journey-maps.json'].includes(src.path))continue;
    const digest=createHash('sha256').update(await readFile(resolve(root,src.path))).digest('hex');
    if(digest!==src.sha256)changed.push(src.path);
   }
   res.writeHead(200,{'Content-Type':types['.json'],'Cache-Control':'no-store'}).end(JSON.stringify({changed}));return;
  }
  let base,file;
  if(path.startsWith('/data/')){const name=path.slice(6);if(!dataFiles.has(name)){res.writeHead(404).end();return;}base=resolve(root,'data');file=resolve(base,name);}
  else if(path==='/'||appFiles.has(path.slice(1))){base=app;file=resolve(base,path==='/'?'index.html':path.slice(1));}
  else {base=resolve(root,'public');file=resolve(base,'.'+path);}
  const real=await realpath(file),realBase=await realpath(base);
  if(!real.startsWith(realBase+sep)){res.writeHead(403).end();return;}
  const content=await readFile(real);res.writeHead(200,{'Content-Type':types[extname(real)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(req.method==='HEAD'?undefined:content);
 }catch(error){res.writeHead(error.code==='ENOENT'?404:400).end('Файл недоступен');}
});
if(process.argv[1]===fileURLToPath(import.meta.url))server.listen(Number(process.env.PORT||5180),'127.0.0.1',()=>console.log('Story preview: http://127.0.0.1:'+ (process.env.PORT||5180)));
