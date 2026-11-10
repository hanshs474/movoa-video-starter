// Vercel function: POST /api/generate. Same contract as server.js.
import { submit, allowed } from '../lib/movoa.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!allowed(req.headers['x-access-password'])) return res.status(401).json({ error: 'Wrong or missing access password.' });
  const body = req.body || {};
  if (!body.prompt || String(body.prompt).length > 2000) return res.status(400).json({ error: 'Write a prompt (up to 2,000 characters).' });
  try {
    res.status(200).json(await submit({ ...body, prompt: String(body.prompt) }));
  } catch {
    res.status(502).json({ error: 'Could not reach Movoa. Try again in a moment.' });
  }
}
