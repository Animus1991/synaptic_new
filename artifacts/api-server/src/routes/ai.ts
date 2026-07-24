import { Router } from 'express';
import { openai } from '@workspace/integrations-openai-ai-server';

export const aiRouter = Router();

/**
 * POST /api/ai/chat
 *
 * Thin streaming proxy: the Synapse frontend llmClient POSTs here with an
 * OpenAI-compatible body.  We forward to the Replit AI integration and stream
 * SSE chunks back in exactly the same format the client already parses.
 *
 * Body fields recognised:
 *   messages   – required, array of {role, content}
 *   stream     – defaults to true; pass false for a single JSON response
 *   temperature / max_tokens – accepted but silently ignored for gpt-5 models
 */
aiRouter.post('/ai/chat', async (req, res) => {
  const body = req.body as {
    messages?: { role: 'system' | 'user' | 'assistant'; content: string }[];
    stream?: boolean;
    max_tokens?: number;
    temperature?: number;
  };

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) {
    res.status(400).json({ error: 'messages array required' });
    return;
  }

  const wantsStream = body.stream !== false;

  if (wantsStream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    try {
      const stream = await openai.chat.completions.create({
        // gpt-5.6-luna: fast + affordable, ideal for high-volume tutor calls
        model: 'gpt-5.6-luna',
        max_completion_tokens: Math.min(body.max_tokens ?? 1200, 2000),
        messages,
        stream: true,
      });

      for await (const chunk of stream) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
      res.write('data: [DONE]\n\n');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      req.log.error({ err: msg }, 'ai/chat stream error');
      res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
    }

    res.end();
    return;
  }

  // Non-streaming path (used by chatCompletion() in llmClient)
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-5.6-luna',
      max_completion_tokens: Math.min(body.max_tokens ?? 1200, 2000),
      messages,
      stream: false,
    });
    res.json(completion);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    req.log.error({ err: msg }, 'ai/chat error');
    res.status(502).json({ error: msg });
  }
});

/**
 * GET /api/ai/status
 * Quick health-check so the frontend can confirm the proxy is live.
 */
aiRouter.get('/ai/status', (_req, res) => {
  res.json({ available: true, model: 'gpt-5.6-luna' });
});
