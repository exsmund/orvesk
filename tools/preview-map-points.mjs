import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Allowlist only: never expose project files or data/sessions through this art preview.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fallback = process.env.MAP_POINT_REFERENCE_ROOT && resolve(process.env.MAP_POINT_REFERENCE_ROOT);
const port = Number(process.env.PORT || 4197);
const mapFiles = new Set(JSON.parse(readFileSync(resolve(root, 'data/journey-maps.json'), 'utf8')).flatMap(m => [m.background, m.battleBackground]));
const allowed = p => ['/ui/map-point-preview.html', '/data/map-points.json', '/data/journey-maps.json'].includes(p)
  || /^\/ui\/map-points\/v1\/(?:symbols\/|previews\/)?[a-z-]+\.png$/.test(p)
  || mapFiles.has(p);
const server = createServer((req, res) => {
  let path;
  try { path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400).end(); return; }
  if (path === '/') path = '/ui/map-point-preview.html';
  if (!['GET', 'HEAD'].includes(req.method) || !allowed(path)) { res.writeHead(404).end(); return; }
  const rel = path.startsWith('/data/') ? path.slice(1) : 'public' + path;
  let file = resolve(root, rel);
  if (!existsSync(file) && fallback) file = resolve(fallback, rel);
  if (!existsSync(file)) { res.writeHead(404).end(); return; }
  const mime = path.endsWith('.png') ? 'image/png' : path.endsWith('.json') ? 'application/json' : 'text/html; charset=utf-8';
  res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-store' });
  res.end(req.method === 'HEAD' ? undefined : readFileSync(file));
});
server.listen(port, '127.0.0.1', () => console.log(`Map point art preview: http://127.0.0.1:${server.address().port}`));
