/** YouTube URL parsing and audio/video transcript fetch (via server proxy to avoid CORS). */

export interface TranscriptResult {
  text: string;
  language?: string;
  duration?: number;
}

export function extractYoutubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

export async function fetchYoutubeTranscript(
  youtubeUrl: string,
  settings?: { authProxyBase?: string; llmProxyUrl?: string; authToken?: string },
): Promise<string | null> {
  const base = (settings?.authProxyBase ?? settings?.llmProxyUrl?.replace(/\/v1\/?$/, '') ?? 'http://localhost:8787')
    .replace(/\/$/, '');
  const headers: Record<string, string> = {};
  if (settings?.authToken) headers.Authorization = `Bearer ${settings.authToken}`;
  try {
    const res = await fetch(
      `${base}/v1/youtube/transcript?url=${encodeURIComponent(youtubeUrl)}`,
      { headers },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { transcript?: string };
    return data.transcript?.trim() || null;
  } catch {
    return null;
  }
}

const AUDIO_VIDEO_EXTENSIONS = /\.(mp3|mp4|m4a|webm|wav|ogg|oga|ogv|mov|mkv|flac|aac)$/i;

export function isAudioVideoFile(file: File): boolean {
  if (AUDIO_VIDEO_EXTENSIONS.test(file.name)) return true;
  if (/^audio\/|^video\//.test(file.type)) return true;
  return false;
}

export async function extractAudioVideoTranscript(
  file: File,
  settings?: { authProxyBase?: string; llmProxyUrl?: string; authToken?: string; language?: string },
): Promise<TranscriptResult | null> {
  const base = (settings?.authProxyBase ?? settings?.llmProxyUrl?.replace(/\/v1\/?$/, '') ?? 'http://localhost:8787')
    .replace(/\/$/, '');
  const headers: Record<string, string> = {};
  if (settings?.authToken) headers.Authorization = `Bearer ${settings.authToken}`;

  const form = new FormData();
  form.append('file', file);
  if (settings?.language) form.append('language', settings.language);

  try {
    const query = settings?.language ? `?language=${encodeURIComponent(settings.language)}` : '';
    const res = await fetch(`${base}/v1/transcribe${query}`, {
      method: 'POST',
      headers,
      body: form,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { text?: string; language?: string; duration?: number };
    const text = data.text?.trim();
    if (!text) return null;
    return { text, language: data.language, duration: data.duration };
  } catch {
    return null;
  }
}

/**
 * Unified entry point: transcribe a YouTube URL or an audio/video file.
 */
export async function extractMediaTranscript(
  source: string | File,
  settings?: { authProxyBase?: string; llmProxyUrl?: string; authToken?: string; language?: string },
): Promise<TranscriptResult | null> {
  if (typeof source === 'string') {
    const transcript = await fetchYoutubeTranscript(source, settings);
    return transcript ? { text: transcript } : null;
  }
  if (isAudioVideoFile(source)) {
    return extractAudioVideoTranscript(source, settings);
  }
  return null;
}
