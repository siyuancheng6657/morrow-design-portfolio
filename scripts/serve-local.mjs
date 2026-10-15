import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { realpath, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';

const project = await realpath(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
const publicRoot = await realpath(path.join(project, 'dist'));
await stat(path.join(publicRoot, 'index.html'));
const host = '127.0.0.1';
const port = 5188;
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.pdf': 'application/pdf', '.psd': 'image/vnd.adobe.photoshop',
  '.txt': 'text/plain; charset=utf-8',
};
const insideRoot = file => {
  const relative = path.relative(publicRoot, file);
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
};

function plain(res, status, message, head = false) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Length': Buffer.byteLength(message) });
  res.end(head ? undefined : message);
}

const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Morrow-Server', 'local-static-v1');
  res.setHeader('Cache-Control', 'no-cache');
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.setHeader('Allow', 'GET, HEAD');
    plain(res, 405, 'Method not allowed');
    return;
  }
  const head = req.method === 'HEAD';
  let route;
  try { route = decodeURIComponent((req.url || '/').split('?')[0]); }
  catch { plain(res, 400, 'Invalid URL', head); return; }
  if (route === '/__morrow_health') {
    // Launcher diagnostics are local only; do not publish machine paths through a tunnel.
    if (!['127.0.0.1:5188', 'localhost:5188'].includes(req.headers.host) || req.headers.forwarded || req.headers['x-forwarded-for'] || req.headers['x-forwarded-host']) {
      plain(res, 404, 'File not found', head); return;
    }
    const body = JSON.stringify({ app: 'morrow-local', version: 1, pid: process.pid, project, url: `http://${host}:${port}/` });
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body), 'Cache-Control': 'no-store' });
    res.end(head ? undefined : body);
    return;
  }
  if (!route.startsWith('/') || /[\\\0:]/.test(route) || route.split('/').some(part => part === '..' || part.startsWith('.'))) {
    plain(res, 403, 'Forbidden', head); return;
  }
  const candidate = path.resolve(publicRoot, '.' + (route === '/' ? '/index.html' : route));
  if (!insideRoot(candidate)) { plain(res, 403, 'Forbidden', head); return; }
  try {
    const file = await realpath(candidate);
    if (!insideRoot(file)) { plain(res, 403, 'Forbidden', head); return; }
    const metadata = await stat(file);
    if (!metadata.isFile()) { plain(res, 404, 'File not found', head); return; }
    let start = 0, end = metadata.size - 1, status = 200;
    if (req.headers.range) {
      const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if (range && (range[1] || range[2])) {
        start = range[1] ? Number(range[1]) : Math.max(0, metadata.size - Number(range[2]));
        end = range[1] && range[2] ? Math.min(Number(range[2]), end) : end;
      }
      if (!range || (!range[1] && !range[2]) || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= metadata.size || metadata.size === 0) {
        res.setHeader('Content-Range', `bytes */${metadata.size}`);
        plain(res, 416, 'Range not satisfiable', head); return;
      }
      status = 206;
      res.setHeader('Content-Range', `bytes ${start}-${end}/${metadata.size}`);
    }
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', types[path.extname(file).toLowerCase()] || 'application/octet-stream');
    res.setHeader('Content-Length', metadata.size ? end - start + 1 : 0);
    res.writeHead(status);
    if (head || !metadata.size) { res.end(); return; }
    const stream = createReadStream(file, { start, end });
    stream.on('error', () => res.destroy());
    res.on('close', () => stream.destroy());
    stream.pipe(res);
  } catch (error) {
    if (!res.headersSent) plain(res, ['ENOENT', 'ENOTDIR'].includes(error.code) ? 404 : 500, error.code === 'ENOENT' ? 'File not found' : 'Unable to read file', head);
    else res.destroy();
  }
});

server.requestTimeout = 15000;
server.headersTimeout = 10000;
server.keepAliveTimeout = 5000;
server.on('error', error => { console.error(`MORROW: ${error.code || error.message}`); process.exitCode = 1; });
server.listen(port, host, () => console.log(`MORROW is ready at http://${host}:${port}/`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
