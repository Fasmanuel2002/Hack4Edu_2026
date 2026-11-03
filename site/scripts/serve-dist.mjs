// Serves the production build (dist/site/browser) the way the FastAPI app does in production:
// existing files first (including architecture/index.html), then every other path, such as
// /chat or an unknown URL, falls back to the client-side app shell, index.csr.html.
// Text files are compressed (brotli or gzip), so Lighthouse numbers are comparable.
// No dependencies and no internet needed. Usage: node scripts/serve-dist.mjs  (PORT=4300 default)
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

const root = resolve(fileURLToPath(new URL('../dist/site/browser', import.meta.url)));
const port = Number(process.env.PORT ?? 4300);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};
const compressible = new Set(['.html', '.js', '.mjs', '.css', '.json', '.txt', '.svg']);
const cache = new Map();

async function isFile(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

async function resolvePath(urlPath) {
  const relative = normalize(decodeURIComponent(urlPath)).replace(/^([/\\])+/, '');
  const candidate = join(root, relative);
  if (candidate !== root && !candidate.startsWith(root + sep)) {
    return null;
  }
  if (await isFile(candidate)) {
    return candidate;
  }
  if (await isFile(join(candidate, 'index.html'))) {
    return join(candidate, 'index.html');
  }
  return join(root, 'index.csr.html');
}

function encode(path, body, acceptEncoding) {
  if (!compressible.has(extname(path))) {
    return { body, encoding: null };
  }
  const encoding = /\bbr\b/.test(acceptEncoding) ? 'br' : /\bgzip\b/.test(acceptEncoding) ? 'gzip' : null;
  if (!encoding) {
    return { body, encoding: null };
  }
  // Keyed by content, so a rebuild while the server runs never serves stale files.
  const key = `${encoding}:${createHash('sha1').update(body).digest('hex')}`;
  if (!cache.has(key)) {
    cache.set(
      key,
      encoding === 'br'
        ? brotliCompressSync(body, { params: { [constants.BROTLI_PARAM_QUALITY]: 9 } })
        : gzipSync(body, { level: 9 }),
    );
  }
  return { body: cache.get(key), encoding };
}

createServer(async (request, response) => {
  try {
    const path = await resolvePath(new URL(request.url ?? '/', 'http://localhost').pathname);
    if (!path) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    const raw = await readFile(path);
    const { body, encoding } = encode(path, raw, String(request.headers['accept-encoding'] ?? ''));
    response.writeHead(200, {
      'Content-Type': types[extname(path)] ?? 'application/octet-stream',
      'Cache-Control': 'no-cache',
      Vary: 'Accept-Encoding',
      ...(encoding ? { 'Content-Encoding': encoding } : {}),
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch {
    response.writeHead(500).end('Build not found. Run: ng build --configuration production');
  }
}).listen(port, () => {
  console.log(`Serving ${root} at http://localhost:${port} (Ctrl + C to stop)`);
});
