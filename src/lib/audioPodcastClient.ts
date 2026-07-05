import type { UserSettings } from '../types';

function proxyBase(settings: UserSettings): string {
  return (settings.authProxyBase ?? settings.llmProxyUrl ?? 'http://localhost:8787')
    .replace(/\/v1\/?$/, '')
    .replace(/\/$/, '');
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export type StudyGuideScriptSection = { title: string; script: string };

export type StudyGuideScript = {
  courseTitle: string;
  lang: 'en' | 'el';
  sections: StudyGuideScriptSection[];
  generatedAt: string;
};

/** Fetch LLM-generated podcast script from server (NotebookLM parity). */
export async function fetchStudyGuideScript(
  token: string,
  settings: UserSettings,
  payload: {
    courseTitle: string;
    topics: { title: string; description?: string }[];
    lang: 'en' | 'el';
  },
): Promise<StudyGuideScript> {
  const res = await fetch(`${proxyBase(settings)}/v1/audio/study-guide`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as StudyGuideScript;
}

/** Fetch neural TTS MP3 for a script section. */
export async function fetchStudyGuideTts(
  token: string,
  settings: UserSettings,
  text: string,
  lang: 'en' | 'el',
): Promise<Blob> {
  const res = await fetch(`${proxyBase(settings)}/v1/audio/tts`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ text, lang }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.blob();
}

export type PodcastController = { stop: () => void };

/**
 * Play server-generated neural podcast: LLM script + OpenAI TTS per section.
 * Falls back to caller-provided onError for offline/browser-TTS fallback.
 */
export async function playNeuralStudyGuide(
  token: string,
  settings: UserSettings,
  payload: {
    courseTitle: string;
    topics: { title: string; description?: string }[];
    lang: 'en' | 'el';
  },
  onSectionChange?: (index: number, title: string) => void,
  onError?: (err: Error) => void,
): Promise<PodcastController | null> {
  let cancelled = false;
  let currentAudio: HTMLAudioElement | null = null;

  const stop = () => {
    cancelled = true;
    currentAudio?.pause();
    currentAudio = null;
  };

  try {
    const script = await fetchStudyGuideScript(token, settings, payload);
    if (script.sections.length === 0) return null;

    void (async () => {
      for (let i = 0; i < script.sections.length; i += 1) {
        if (cancelled) return;
        const section = script.sections[i]!;
        onSectionChange?.(i, section.title);
        const blob = await fetchStudyGuideTts(token, settings, section.script, payload.lang);
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        await new Promise<void>((resolve, reject) => {
          const audio = new Audio(url);
          currentAudio = audio;
          audio.onended = () => {
            URL.revokeObjectURL(url);
            resolve();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('audio playback failed'));
          };
          void audio.play().catch(reject);
        });
      }
    })().catch((e) => onError?.(e instanceof Error ? e : new Error(String(e))));

    return { stop };
  } catch (e) {
    onError?.(e instanceof Error ? e : new Error(String(e)));
    return null;
  }
}
