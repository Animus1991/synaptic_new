# Synapse Local OCR Server

A drop-in, self-hostable implementation of the Synapse `POST /v1/ocr/pages`
contract. Run it locally and the Synapse client will send scanned PDFs and
image uploads here instead of the hosted proxy — giving you **higher quality
Greek recognition, including handwriting**.

## Why this improves Greek OCR

The browser client can only run lightweight models:

- **Tesseract.js (`eng+ell`)** — trained on *printed* text; weak on handwriting.
- **TrOCR handwritten** — *Latin only*, so it cannot read Greek handwriting.

A local server removes that ceiling. It ships two engines:

| Engine | Quality | Greek handwriting | Needs |
|--------|---------|-------------------|-------|
| **Tesseract** (default) | Good on printed | Poor | Nothing (fully offline) |
| **Vision-LLM** (optional) | Excellent | **Strong** | An OpenAI-compatible vision model |

Modern vision LLMs (GPT-4o, Qwen2.5-VL, Llama-3.2-Vision, …) are currently the
best available approach for cursive/accented Greek and low-quality scans, and
they also raise quality for all printed Greek and English across every file type
(the client already rasterizes PDFs and images to page images before sending).

## Quick start (offline, zero config)

```bash
cd ocr-server
npm install
npm start
```

The server listens on `http://localhost:8787`. Because the Synapse client
defaults its proxy base to that exact URL, **no client configuration is needed** —
uploads that require OCR are routed here automatically. (If you set a custom
`authProxyBase`/`llmProxyUrl` in the app, point it at this server.)

Check it is up:

```bash
curl http://localhost:8787/health
```

## Enable high-quality Greek handwriting (vision engine)

```bash
cp .env.example .env
```

Then edit `.env`:

```ini
OCR_VISION_ENABLED=true
OCR_VISION_BASE_URL=https://api.openai.com/v1   # or http://localhost:11434/v1 for Ollama
OCR_VISION_API_KEY=sk-...                        # blank for local servers
OCR_VISION_MODEL=gpt-4o-mini                      # or qwen2.5-vl:7b, llama3.2-vision, ...
```

### Fully local option (no API key, no cloud)

Use [Ollama](https://ollama.com):

```bash
ollama pull qwen2.5-vl:7b
```

```ini
OCR_VISION_ENABLED=true
OCR_VISION_BASE_URL=http://localhost:11434/v1
OCR_VISION_API_KEY=
OCR_VISION_MODEL=qwen2.5-vl:7b
```

## API contract

### `POST /v1/ocr/pages`

Request body:

```json
{
  "pages": ["<base64 jpeg/png>", "..."],
  "pageCount": 3,
  "languages": "eng+ell",
  "mode": "auto"
}
```

- `pages` — required, base64 image strings (raw or `data:` URLs).
- `languages` — optional Tesseract language string (default `eng+ell`).
- `mode` — optional: `auto` (default), `handwriting`, or `printed`.

Response:

```json
{
  "text": "recognized text with \f page breaks",
  "pageCount": 3,
  "ocrUsed": true,
  "regions": [
    { "text": "word", "left": 12.3, "top": 8.1, "width": 4.2, "height": 2.0, "confidence": 0.94, "pageIndex": 0 }
  ],
  "modelsUsed": ["vision-llm:gpt-4o-mini"],
  "engine": "vision"
}
```

`regions` (word bounding boxes as page-size percentages) are produced by the
Tesseract engine and power the Reader's OCR overlay. The vision engine returns
text only, so `regions` is empty for vision responses.

### Engine selection

| `mode` | Vision enabled | Result |
|--------|----------------|--------|
| `auto` | yes (`OCR_AUTO_STRATEGY=vision-first`) | Vision |
| `auto` | no | Tesseract |
| `handwriting` | yes | Vision (handwriting prompt) |
| `handwriting` | no | Tesseract (best-effort) |
| `printed` | — | Tesseract |

If the vision endpoint errors mid-request, the server automatically falls back
to Tesseract and tags `modelsUsed` with `vision-fallback-error`.

## Configuration reference

See [`.env.example`](./.env.example) for every option (port, CORS, auth token,
languages, page cap, vision settings, auto strategy).

## Security notes

- Set `OCR_AUTH_TOKEN` to require `Authorization: Bearer <token>` on requests.
- Restrict `CORS_ORIGIN` to your app origin in production instead of `*`.
- Never commit `.env`; it is gitignored.

## Scripts

- `npm start` — run the server.
- `npm run dev` — run with auto-reload (`node --watch`).
- `npm run check` — syntax-check all source files (no model download).
