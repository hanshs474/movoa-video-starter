// node test.mjs — mocked tests against the response shapes of the live Movoa API (no network).
import assert from 'node:assert';

process.env.MOVOA_API_KEY = 'sk-test';
const calls = [];
let queryReplies = [];
globalThis.fetch = async (url, init) => {
  const body = JSON.parse(init.body || '{}');
  calls.push({ url, body, auth: init.headers.authorization });
  const path = new URL(url).pathname;
  let status = 200, json;
  if (path === '/api/ai/generate') {
    json = body.prompt === 'broke' ? { code: -1, message: 'x', data: { reason: 'insufficient_credits' } }
      : body.prompt === 'blocked' ? { code: -2, message: 'Prompt refused' }
      : body.prompt === 'badkey' ? (status = 401, { code: -1, message: 'invalid', data: { reason: 'invalid_api_key' } })
      : { code: 0, data: { id: 't1', status: 'pending' } };
  } else if (path === '/api/ai/query') {
    [status, json] = queryReplies.shift();
  }
  return { status, json: async () => json };
};
const { submit, status } = await import('./lib/movoa.js');

// text to video, options snapped to MiniMax H3
assert.deepStrictEqual(await submit({ prompt: 'a lantern', aspectRatio: '9:16', duration: '7', resolution: '720p' }), { id: 't1' });
assert.deepStrictEqual(calls[0].body, { provider: 'auto', mediaType: 'video', model: 'minimax-h3', scene: 'text-to-video', prompt: 'a lantern', options: { sound: true, duration: 6, resolution: '480p', aspect_ratio: '9:16' } });
assert.strictEqual(calls[0].auth, 'Bearer sk-test');

// image to video
await submit({ prompt: 'move', image: 'https://x/a.png', aspectRatio: '16:9', duration: '10', resolution: '768p' });
assert.deepStrictEqual(calls[1].body.options, { sound: true, duration: 10, resolution: '768p', image_input: ['https://x/a.png'] });
assert.strictEqual(calls[1].body.scene, 'image-to-video');

// refusals
assert.match((await submit({ prompt: 'broke' })).error, /Not enough credits/);
assert.match((await submit({ prompt: 'blocked' })).error, /Reword/);
assert.match((await submit({ prompt: 'badkey' })).error, /apikeys/);

// polling
queryReplies = [[200, { code: 0, data: { status: 'processing', queued: true, queueEta: 120 } }], [502, {}],
  [200, { code: 0, data: { status: 'success', videos: ['https://cdn.movoa.ai/x.mp4'] } }],
  [200, { code: 0, data: { status: 'failed', errorMessage: 'moderation' } }]];
assert.deepStrictEqual(await status('t1'), { done: false, queueEta: 120 });
assert.deepStrictEqual(await status('t1'), { done: false });
assert.deepStrictEqual(await status('t1'), { done: true, url: 'https://cdn.movoa.ai/x.mp4' });
assert.match((await status('t1')).error, /failed: moderation/);

console.log('all tests passed');
