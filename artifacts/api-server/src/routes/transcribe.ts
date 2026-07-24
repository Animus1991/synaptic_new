import { Router, type Request, type Response } from 'express';
import { authenticate } from '../middleware/auth';
import { config } from '../config';
import { enqueueTranscribeJob, getTranscribeJob } from '../jobs/transcribeQueue';

export const transcribeRouter = Router();

/**
 * POST /v1/transcribe
 *
 * Forward an audio/video file to the upstream transcription service.
 * Expects multipart/form-data with a field named "file" and an optional "language" query param.
 * Returns { text: string, language?: string }.
 */
transcribeRouter.post('/transcribe', authenticate, async (req: Request, res: Response) => {
  try {
    if (!config.upstreamApiKey) {
      res.status(503).json({ error: 'Transcription service not configured' });
      return;
    }

    if (!req.headers['content-type']?.startsWith('multipart/form-data')) {
      res.status(400).json({ error: 'Expected multipart/form-data upload' });
      return;
    }

    // Express has not parsed the multipart body; we pass the raw bytes upstream.
    // For this route we use a small helper that reads the raw body and re-encodes it.
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks);
    const boundary = req.headers['content-type']!.split('boundary=')[1];
    if (!boundary) {
      res.status(400).json({ error: 'Missing multipart boundary' });
      return;
    }

    const form = new FormData();
    const parts = body.toString('latin1').split(`--${boundary}`);
    let fileBlob: Blob | null = null;
    let filename = 'audio.mp3';
    for (const part of parts) {
      const headerEnd = part.indexOf('\r\n\r\n');
      if (headerEnd === -1) continue;
      const header = part.slice(0, headerEnd);
      const content = part.slice(headerEnd + 4).replace(/\r\n$/, '');
      const nameMatch = header.match(/name="([^"]+)"/);
      const filenameMatch = header.match(/filename="([^"]+)"/);
      if (!nameMatch) continue;
      const name = nameMatch[1];
      if (name === 'file') {
        filename = filenameMatch?.[1] ?? 'audio.mp3';
        const contentType = header.match(/Content-Type:\s*([^\r\n]+)/)?.[1] ?? 'application/octet-stream';
        fileBlob = new Blob([Buffer.from(content, 'latin1')], { type: contentType });
      } else {
        form.append(name, content);
      }
    }

    if (!fileBlob) {
      res.status(400).json({ error: 'Missing file field' });
      return;
    }

    form.append('file', fileBlob, filename);
    form.append('model', 'whisper-1');
    if (!form.has('language') && req.query.language) {
      form.append('language', String(req.query.language));
    }
    if (!form.has('response_format')) {
      form.append('response_format', 'json');
    }

    const upstreamRes = await fetch(`${config.upstreamBaseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.upstreamApiKey}`,
      },
      body: form,
    });

    if (!upstreamRes.ok) {
      const err = await upstreamRes.text().catch(() => 'Transcription failed');
      res.status(502).json({ error: err });
      return;
    }

    const data = (await upstreamRes.json()) as { text?: string; language?: string };
    res.json({ text: data.text?.trim() ?? '', language: data.language });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Transcription failed' });
  }
});

/** POST /v1/transcribe/jobs — async Whisper job (StudyFetch-style video summarization pipeline). */
transcribeRouter.post('/transcribe/jobs', authenticate, async (req, res) => {
  const account = req.account!;
  const body = req.body as {
    audioBase64?: string;
    filename?: string;
    language?: string;
  };
  if (!body.audioBase64?.trim()) {
    res.status(400).json({ error: 'audioBase64 required' });
    return;
  }
  if (!config.upstreamApiKey) {
    res.status(503).json({ error: 'Transcription service not configured' });
    return;
  }
  const job = enqueueTranscribeJob({
    accountId: account.id,
    audioBase64: body.audioBase64.trim(),
    filename: body.filename?.trim() || 'audio.mp3',
    language: body.language?.trim(),
  });
  res.status(202).json({ jobId: job.id, status: job.status, createdAt: job.createdAt });
});

/** GET /v1/transcribe/jobs/:jobId — poll async transcription status. */
transcribeRouter.get('/transcribe/jobs/:jobId', authenticate, (req, res) => {
  const account = req.account!;
  const job = getTranscribeJob(req.params.jobId, account.id);
  if (!job) {
    res.status(404).json({ error: 'job not found' });
    return;
  }
  res.json({
    jobId: job.id,
    status: job.status,
    text: job.resultText,
    segments: job.segments,
    chapters: job.chapters,
    language: job.language,
    error: job.error,
    createdAt: job.createdAt,
    completedAt: job.completedAt,
  });
});
