import { afterEach, describe, expect, it, vi } from 'vitest';
import type { UserSettings } from '../types';
import {
  isVisionOcrEnabled,
  transcribeImageWithVision,
  VISION_OCR_MODEL_ID,
} from './llmClient';

function settings(overrides: Partial<UserSettings> = {}): UserSettings {
  return {
    masteryThreshold: 80,
    challengeLevel: 'balanced',
    sourceMode: 'enriched',
    language: 'el',
    theme: 'dark',
    dailyGoalMinutes: 30,
    openaiApiKey: 'sk-test',
    ...overrides,
  } as UserSettings;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('isVisionOcrEnabled', () => {
  it('is enabled when an API key is present', () => {
    expect(isVisionOcrEnabled(settings())).toBe(true);
  });

  it('is disabled when the user opts out', () => {
    expect(isVisionOcrEnabled(settings({ useVisionOcr: false }))).toBe(false);
  });

  it('is disabled without a key or proxy', () => {
    expect(isVisionOcrEnabled(settings({ openaiApiKey: '' }))).toBe(false);
  });

  it('is enabled via a configured proxy without a key', () => {
    expect(
      isVisionOcrEnabled(settings({ openaiApiKey: '', llmProxyUrl: 'https://proxy.example/v1' })),
    ).toBe(true);
  });

  it('exposes a stable model id for the reader/agent surfacing', () => {
    expect(VISION_OCR_MODEL_ID).toBe('vision-llm-ocr');
  });
});

describe('transcribeImageWithVision', () => {
  it('sends a multimodal request and returns transcribed text', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({ choices: [{ message: { content: '  Ελληνικό κείμενο  ' } }] }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const text = await transcribeImageWithVision('AAAA', settings({ llmModel: 'gpt-4o' }), {
      lang: 'el',
    });

    expect(text).toBe('Ελληνικό κείμενο');
    expect(fetchMock).toHaveBeenCalledOnce();

    const [url, init] = fetchMock.mock.calls[0] as unknown as [RequestInfo, RequestInit];
    expect(String(url)).toContain('/chat/completions');
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe('gpt-4o');
    expect(body.temperature).toBe(0);
    const userMsg = body.messages.find((m: { role: string }) => m.role === 'user');
    const imagePart = userMsg.content.find((p: { type: string }) => p.type === 'image_url');
    // Raw base64 is normalized into a data URL.
    expect(imagePart.image_url.url).toBe('data:image/jpeg;base64,AAAA');
  });

  it('preserves an already-formed data URL', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: 'x' } }] }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await transcribeImageWithVision('data:image/png;base64,ZZZ', settings());
    const call = fetchMock.mock.calls[0] as unknown as [RequestInfo, RequestInit];
    const body = JSON.parse(call[1].body as string);
    const userMsg = body.messages.find((m: { role: string }) => m.role === 'user');
    const imagePart = userMsg.content.find((p: { type: string }) => p.type === 'image_url');
    expect(imagePart.image_url.url).toBe('data:image/png;base64,ZZZ');
  });

  it('throws on a non-OK response so callers can fall back', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('nope', { status: 429 })),
    );
    await expect(transcribeImageWithVision('AAAA', settings())).rejects.toThrow(/Vision OCR 429/);
  });

  it('throws when no key or proxy is configured', async () => {
    await expect(
      transcribeImageWithVision('AAAA', settings({ openaiApiKey: '' })),
    ).rejects.toThrow(/No API key or proxy/);
  });
});
