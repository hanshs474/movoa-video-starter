# AI Video Generator with Sound: Movoa starter

Unlimited AI video generator with sound: on paid plans the tenth take of a shot costs what the first did, and your first clip is free to make right now. This starter is a one-page [text to video](https://movoa.ai/video/text-to-video) and [photo to video](https://movoa.ai/video/photo-to-video) app on the API of [Movoa](https://movoa.ai/?utm_source=github&utm_medium=starter) (movoa.ai): a prompt box, an optional first-frame photo, aspect ratio, length and resolution, and the finished clip with its soundtrack. One file of server code, no dependencies, Node 18+.

The default model is [MiniMax H3](https://movoa.ai/video/minimax-h3); set `MOVOA_MODEL=seedance-2-5` for [Seedance 2.5](https://movoa.ai/video/seedance-2-5), or `veo-3-1-fast`, `seedance-2`, `seedance-2-fast`, `seedance-2-mini`.

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fhanshs474%2Fmovoa-video-starter&env=MOVOA_API_KEY,ACCESS_PASSWORD)
[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/ai-video-generator-with-sound-movoa)

Or run the prebuilt image: `docker run -p 3000:3000 -e MOVOA_API_KEY=sk-... san8888/movoa-video-starter` (amd64 and arm64).

## Run it

```bash
MOVOA_API_KEY=sk-... node server.js          # http://localhost:3000
```

| Variable | What it does |
|---|---|
| `MOVOA_API_KEY` | Required. Create one at [movoa.ai/settings/apikeys](https://movoa.ai/settings/apikeys). Runs cost credits on that Movoa account, at the prices on [movoa.ai/pricing](https://movoa.ai/pricing). |
| `ACCESS_PASSWORD` | Optional, but set it on a public URL: anyone who can open the page spends your credits. The page asks for it once and remembers it. |
| `MOVOA_MODEL` | Default `minimax-h3`. Others: `seedance-2-5`, `veo-3-1-fast`, `seedance-2`, `seedance-2-fast`, `seedance-2-mini`. |
| `PORT` | Port to listen on. Default `3000`. |

## How it works

- On Vercel the routes are serverless functions in `api/`; everywhere else `server.js` serves them. Both call `lib/movoa.js`.
- `POST /api/generate` sends `{provider:"auto", mediaType:"video", model, scene, prompt, options}` to `https://movoa.ai/api/ai/generate` with `sound: true` and returns the task id. A length or resolution the model does not take is snapped to the nearest one it does.
- `GET /api/status?id=` reads `https://movoa.ai/api/ai/query`; the page polls it every 10 seconds until the clip is `success` (a few minutes) and plays it. While the clip waits its turn the page shows the queue estimate.
- Paste an https photo URL as the first frame for photo to video. Every clip comes back with [AI-generated sound](https://movoa.ai/video/ai-video-with-audio).

`node test.mjs` runs the mocked tests.

## License

MIT
