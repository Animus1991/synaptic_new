import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { ocrMathBase64Regions } from '../lib/mathOcrServer';
import { ocrBase64Pages } from '../lib/ocrServer';

export const ocrRouter = Router();
ocrRouter.use(authenticate);

/** POST /v1/ocr/pages — Tesseract OCR over client-rendered page images (base64 JPEG). */
ocrRouter.post('/ocr/pages', async (req, res) => {
  const body = req.body as { pages?: string[]; pageCount?: number; languages?: string };
  const pages = Array.isArray(body.pages) ? body.pages : [];
  const pageCount = typeof body.pageCount === 'number' ? body.pageCount : pages.length;
  const languages = typeof body.languages === 'string' ? body.languages : 'eng+ell';

  if (pages.length === 0) {
    res.status(400).json({ error: 'pages required (base64 JPEG array)' });
    return;
  }

  try {
    const { text, pagesProcessed, regions, modelsUsed } = await ocrBase64Pages(pages, languages);
    res.json({
      text,
      pageCount: Math.max(pageCount, pagesProcessed),
      ocrUsed: true,
      pagesProcessed,
      regions,
      modelsUsed,
    });
  } catch {
    res.status(502).json({ error: 'OCR processing failed' });
  }
});

/** POST /v1/ocr/math — formula crop OCR (base64 JPEG regions) → LaTeX-ish strings. */
ocrRouter.post('/ocr/math', async (req, res) => {
  const body = req.body as { regions?: string[] };
  const regions = Array.isArray(body.regions) ? body.regions : [];
  if (regions.length === 0) {
    res.status(400).json({ error: 'regions required (base64 JPEG array)' });
    return;
  }
  try {
    const { latex, modelsUsed } = await ocrMathBase64Regions(regions);
    res.json({ latex, modelsUsed, ocrUsed: true });
  } catch {
    res.status(502).json({ error: 'Math OCR processing failed' });
  }
});
