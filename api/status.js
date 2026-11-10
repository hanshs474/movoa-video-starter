// Vercel function: GET /api/status?id=.
import { status, allowed } from '../lib/movoa.js';

export default async function handler(req, res) {
  if (!allowed(req.headers['x-access-password'])) return res.status(401).json({ error: 'Wrong or missing access password.' });
  try {
    res.status(200).json(await status(String(req.query.id || '')));
  } catch {
    res.status(502).json({ error: 'Could not reach Movoa. Try again in a moment.' });
  }
}
