// Movoa API calls shared by server.js (Docker, Railway, Zeabur) and api/ (Vercel).
const BASE = process.env.MOVOA_BASE_URL || 'https://movoa.ai';
const KEY = process.env.MOVOA_API_KEY || '';
const MODEL = process.env.MOVOA_MODEL || 'minimax-h3';
const PASSWORD = process.env.ACCESS_PASSWORD || '';

// Same ids and options as the official SDK (movoa-ai on npm).
const MODELS = {
  'minimax-h3': { durations: [4, 5, 6, 8, 10, 15], resolutions: ['480p', '768p'], ratios: ['16:9', '9:16', '1:1'] },
  'seedance-2-5': { durations: [5, 10, 15, 20, 25, 30], resolutions: ['480p', '720p'], ratios: ['16:9', '9:16', '1:1'] },
  'seedance-2': { durations: [4, 6, 8, 10], resolutions: ['480p', '720p'], ratios: ['16:9', '9:16', '1:1'] },
  'seedance-2-fast': { durations: [4, 6, 8, 10], resolutions: ['480p', '720p'], ratios: ['16:9', '9:16', '1:1'] },
  'seedance-2-mini': { durations: [4, 6, 8, 10], resolutions: ['480p', '720p'], ratios: ['16:9', '9:16', '1:1'] },
  'veo-3-1-fast': { durations: [8], resolutions: ['720p'], ratios: ['16:9', '9:16'] },
};

export const configured = () => Boolean(KEY);
export const model = () => (MODELS[MODEL] ? MODEL : 'minimax-h3');

// Anyone who can open the page spends your credits; ACCESS_PASSWORD keeps it to people you tell.
export const allowed = (given) => !PASSWORD || String(given || '') === PASSWORD;

const post = async (path, body) => {
  const r = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${KEY}` },
    body: JSON.stringify(body),
  });
  let json = {};
  try { json = await r.json(); } catch { /* non-JSON error page */ }
  return { status: r.status, json: json || {} };
};

// movoa.ai answers most refusals as HTTP 200 with a non-zero code and a data.reason.
const explain = (status, body) => {
  const msg = String(body.message || body.error || `HTTP ${status}`);
  const reason = body.data && body.data.reason;
  if (status === 401 || /no auth/i.test(msg)) return 'Movoa rejected MOVOA_API_KEY. Create a new key at movoa.ai/settings/apikeys.';
  if (body.code === -2 || body.code === -3) return `${msg}. Reword the prompt and try again.`;
  if (reason === 'insufficient_credits') return 'Not enough credits on the Movoa account for this clip.';
  if (reason === 'plan_required') return 'This model or quality needs a plan on the Movoa account.';
  if (reason === 'concurrency') return 'Another clip is still generating on this account. Try again when it finishes.';
  return msg;
};

// Snap a setting to what the model takes, so the page never sends an option it refuses.
const fit = (list, want, numeric) => {
  if (numeric) {
    const n = Number(want) || list[0];
    return list.includes(n) ? n : list.reduce((a, b) => (Math.abs(b - n) < Math.abs(a - n) ? b : a));
  }
  return list.includes(want) ? want : list[0];
};

export async function submit({ prompt, aspectRatio, duration, resolution, image }) {
  if (!KEY) return { error: 'Set MOVOA_API_KEY on the server (create one at movoa.ai/settings/apikeys).' };
  const m = model();
  const spec = MODELS[m];
  const options = { sound: true, duration: fit(spec.durations, duration, true), resolution: fit(spec.resolutions, resolution) };
  const img = /^https:\/\/\S+$/.test(String(image || '')) ? String(image) : '';
  if (img) options.image_input = [img];
  else options.aspect_ratio = fit(spec.ratios, aspectRatio);
  const r = await post('/api/ai/generate', {
    provider: 'auto', mediaType: 'video', model: m,
    scene: img ? 'image-to-video' : 'text-to-video', prompt, options,
  });
  const id = r.json.data && r.json.data.id;
  if (r.status !== 200 || r.json.code !== 0 || !id) return { error: explain(r.status, r.json) };
  return { id: String(id) };
}

export async function status(taskId) {
  if (!KEY) return { error: 'Set MOVOA_API_KEY on the server.' };
  const r = await post('/api/ai/query', { taskId });
  // A 5xx while polling is not a failed clip; the page simply polls again.
  if (r.status >= 500) return { done: false };
  if (r.status !== 200 || r.json.code !== 0) return { done: true, error: explain(r.status, r.json) };
  const d = r.json.data || {};
  if (d.status === 'success' && d.videos && d.videos.length) return { done: true, url: String(d.videos[0]) };
  if (d.status === 'failed' || d.status === 'canceled') {
    return { done: true, error: `The clip ${d.status}${d.errorMessage ? `: ${d.errorMessage}` : ''}. Try rewording the prompt.` };
  }
  return { done: false, queueEta: d.queued && d.queueEta ? Number(d.queueEta) : undefined };
}
