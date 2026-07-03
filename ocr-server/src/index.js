import express from 'express';
import cors from 'cors';
import { config, visionAvailable } from './config.js';
import { runOcr } from './ocr.js';
import { shutdownTesseract } from './engines/tesseract.js';

const app = express();

app.use(
  cors({
    origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',').map((s) => s.trim()),
  }),
);
// Page images arrive as base64; allow a generous body size.
app.use(express.json({ limit: '60mb' }));

/** Optional bearer-token gate. Open when OCR_AUTH_TOKEN is unset. */
function checkAuth(req, res) {
  if (!config.authToken) return true;
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (token && token === config.authToken) return true;
  res.status(401).json({ error: 'unauthorized' });
  return false;
}

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    tesseractLangs: config.tesseractLangs,
    visionEnabled: config.vision.enabled,
    visionAvailable: visionAvailable(),
    visionModel: config.vision.enabled ? config.vision.model : null,
    maxPages: config.maxPages,
  });
});

app.post('/v1/ocr/pages', async (req, res) => {
  if (!checkAuth(req, res)) return;

  const { pages, pageCount, languages, mode } = req.body ?? {};
  if (!Array.isArray(pages) || pages.length === 0) {
    res.status(400).json({ error: 'pages must be a non-empty array of base64 images' });
    return;
  }

  try {
    const result = await runOcr({ pages, pageCount, languages, mode });
    res.json(result);
  } catch (err) {
    console.error('[ocr] request failed:', err);
    res.status(500).json({ error: 'ocr_failed', detail: String(err?.message ?? err) });
  }
});

const server = app.listen(config.port, () => {
  console.log(`[ocr] Synapse OCR server listening on http://localhost:${config.port}`);
  console.log(`[ocr] Tesseract langs: ${config.tesseractLangs}`);
  console.log(
    `[ocr] Vision engine: ${visionAvailable() ? `enabled (${config.vision.model})` : 'disabled'}`,
  );
});

async function shutdown(signal) {
  console.log(`\n[ocr] ${signal} received, shutting down...`);
  server.close();
  await shutdownTesseract();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
