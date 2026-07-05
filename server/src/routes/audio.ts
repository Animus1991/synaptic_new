import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { enforceQuota } from '../middleware/usage';
import { generateStudyGuideScript, synthesizeStudyGuideAudio } from '../lib/audioStudyGuideServer';

export const audioRouter = Router();
audioRouter.use(authenticate, enforceQuota);

/**
 * POST /v1/audio/study-guide — LLM podcast script from course topics (NotebookLM parity).
 * Body: { courseTitle, topics: [{title, description?}], lang?: 'en'|'el' }
 */
audioRouter.post('/audio/study-guide', async (req, res) => {
  const body = req.body as {
    courseTitle?: string;
    topics?: { title?: string; description?: string }[];
    lang?: 'en' | 'el';
  };
  if (!body.courseTitle?.trim()) {
    res.status(400).json({ error: 'courseTitle required' });
    return;
  }
  const topics = (body.topics ?? [])
    .filter((t) => t.title?.trim())
    .map((t) => ({ title: t.title!.trim(), description: t.description?.trim() }));

  try {
    const script = await generateStudyGuideScript({
      courseTitle: body.courseTitle.trim(),
      topics,
      lang: body.lang === 'el' ? 'el' : 'en',
    });
    res.json(script);
  } catch (e) {
    res.status(502).json({ error: e instanceof Error ? e.message : 'script generation failed' });
  }
});

/**
 * POST /v1/audio/tts — neural TTS for a script turn (returns audio/mpeg).
 * Body: { text, lang?: 'en'|'el', speaker?: 'host'|'expert' }
 */
audioRouter.post('/audio/tts', async (req, res) => {
  const body = req.body as { text?: string; lang?: 'en' | 'el'; speaker?: 'host' | 'expert' };
  if (!body.text?.trim()) {
    res.status(400).json({ error: 'text required' });
    return;
  }
  const speaker = body.speaker === 'expert' ? 'expert' : body.speaker === 'host' ? 'host' : undefined;
  try {
    const buf = await synthesizeStudyGuideAudio(body.text, {
      lang: body.lang === 'el' ? 'el' : 'en',
      speaker,
    });
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(Buffer.from(buf));
  } catch (e) {
    res.status(502).json({ error: e instanceof Error ? e.message : 'TTS failed' });
  }
});
