// A one-page AI video generator with sound. Zero dependencies: Node 18+ and the Movoa HTTP API.
// Set MOVOA_API_KEY (create one at https://movoa.ai/settings/apikeys); every clip runs on that account.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { submit, status, allowed, configured } from './lib/movoa.js';

const PORT = Number(process.env.PORT || 3000);
const PAGE = readFileSync(new URL('./index.html', import.meta.url));

const json = (res, code, body) => {
  res.writeHead(code, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
};
const readBody = (req) =>
  new Promise((ok, fail) => {
    let s = '';
    req.on('data', (c) => (s += c));
    req.on('end', () => { try { ok(JSON.parse(s || '{}')); } catch (e) { fail(e); } });
  });

createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://x');
    if (req.method === 'GET' && u.pathname === '/') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(PAGE);
    }
    if (u.pathname === '/health') return json(res, 200, { ok: true });
    if (u.pathname.startsWith('/api/') && !allowed(req.headers['x-access-password'])) {
      return json(res, 401, { error: 'Wrong or missing access password.' });
    }
    if (req.method === 'POST' && u.pathname === '/api/generate') {
      const body = await readBody(req);
      if (!body.prompt || String(body.prompt).length > 2000) return json(res, 400, { error: 'Write a prompt (up to 2,000 characters).' });
      return json(res, 200, await submit({ ...body, prompt: String(body.prompt) }));
    }
    if (req.method === 'GET' && u.pathname === '/api/status') {
      return json(res, 200, await status(u.searchParams.get('id') || ''));
    }
    res.writeHead(404).end();
  } catch {
    json(res, 502, { error: 'Could not reach Movoa. Try again in a moment.' });
  }
}).listen(PORT, () => console.log(`listening on :${PORT}${configured() ? '' : ' (MOVOA_API_KEY is not set)'}`));
