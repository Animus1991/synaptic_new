import type { UserSettings } from '../types';

function proxyBase(settings: UserSettings): string {
  return (settings.authProxyBase ?? settings.llmProxyUrl ?? 'http://localhost:8787')
    .replace(/\/v1\/?$/, '')
    .replace(/\/$/, '');
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export type PodcastSpeaker = 'host' | 'expert';

export type StudyGuideDialogueTurn = {
  speaker: PodcastSpeaker;
  line: string;
};

export type StudyGuideScriptSection = {
  title: string;
  script?: string;
  turns?: StudyGuideDialogueTurn[];
};

export type StudyGuideScript = {
  courseTitle: string;
  lang: 'en' | 'el';
  sections: StudyGuideScriptSection[];
  multiSpeaker?: boolean;
  generatedAt: string;
};

export function podcastSpeakerLabel(speaker: PodcastSpeaker, lang: 'en' | 'el'): string {
  if (lang === 'el') return speaker === 'host' ? 'Οικοδεσπότης' : 'Ειδικός';
  return speaker === 'host' ? 'Host' : 'Expert';
}

/** Fetch LLM-generated multi-speaker podcast script from server. */
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

/** Fetch neural TTS MP3 for a dialogue turn (voice follows speaker). */
export async function fetchStudyGuideTts(
  token: string,
  settings: UserSettings,
  text: string,
  lang: 'en' | 'el',
  speaker: PodcastSpeaker,
): Promise<Blob> {
  const res = await fetch(`${proxyBase(settings)}/v1/audio/tts`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ text, lang, speaker }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.blob();
}

export type PodcastController = { stop: () => void };

export type PodcastTurnEvent = {
  sectionTitle: string;
  speaker: PodcastSpeaker;
  line: string;
  turnIndex: number;
};

function normalizeTurns(section: StudyGuideScriptSection): StudyGuideDialogueTurn[] {
  if (section.turns?.length) {
    return section.turns.filter((t) => t.line?.trim());
  }
  const script = section.script?.trim();
  if (!script) return [];
  return [{ speaker: 'host', line: script }];
}

/**
 * Play server-generated neural podcast: alternating Host/Expert voices per turn.
 */
export async function playNeuralStudyGuide(
  token: string,
  settings: UserSettings,
  payload: {
    courseTitle: string;
    topics: { title: string; description?: string }[];
    lang: 'en' | 'el';
  },
  onTurnChange?: (event: PodcastTurnEvent) => void,
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
    const queue: PodcastTurnEvent[] = [];
    let turnIndex = 0;
    for (const section of script.sections) {
      for (const turn of normalizeTurns(section)) {
        queue.push({
          sectionTitle: section.title,
          speaker: turn.speaker === 'expert' ? 'expert' : 'host',
          line: turn.line,
          turnIndex: turnIndex++,
        });
      }
    }
    if (queue.length === 0) return null;

    void (async () => {
      for (const item of queue) {
        if (cancelled) return;
        onTurnChange?.(item);
        const blob = await fetchStudyGuideTts(token, settings, item.line, payload.lang, item.speaker);
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
