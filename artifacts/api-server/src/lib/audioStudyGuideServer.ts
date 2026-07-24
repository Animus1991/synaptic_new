import { upstreamFetch } from './upstream';
import { config } from '../config';

export type PodcastSpeaker = 'host' | 'expert';

export type StudyGuideDialogueTurn = {
  speaker: PodcastSpeaker;
  line: string;
};

export type StudyGuideScriptSection = {
  title: string;
  /** Legacy single-voice block — normalized to turns on read. */
  script?: string;
  turns?: StudyGuideDialogueTurn[];
};

export type StudyGuideScript = {
  courseTitle: string;
  lang: 'en' | 'el';
  sections: StudyGuideScriptSection[];
  multiSpeaker: true;
  generatedAt: string;
};

const SPEAKER_LINE_RE = /^(Host|Expert|Οικοδεσπότης|Ειδικός)\s*:\s*(.+)$/i;

/** Resolve OpenAI TTS voice id for Host vs Expert. */
export function voiceForPodcastSpeaker(speaker: PodcastSpeaker): string {
  if (speaker === 'expert') return config.audioTtsExpertVoice;
  return config.audioTtsHostVoice;
}

function normalizeSpeaker(raw: string): PodcastSpeaker | null {
  const v = raw.trim().toLowerCase();
  if (v === 'host' || v === 'οικοδεσπότης' || v === 'οικοδεσποτης') return 'host';
  if (v === 'expert' || v === 'ειδικός' || v === 'ειδικος') return 'expert';
  return null;
}

/** Flatten section script or turns into ordered dialogue for TTS playback. */
export function normalizeSectionTurns(section: StudyGuideScriptSection): StudyGuideDialogueTurn[] {
  if (section.turns?.length) {
    return section.turns
      .map((t) => {
        const speaker = normalizeSpeaker(String(t.speaker)) ?? 'host';
        const line = t.line?.trim();
        return line ? { speaker, line } : null;
      })
      .filter((t): t is StudyGuideDialogueTurn => Boolean(t));
  }

  const script = section.script?.trim();
  if (!script) return [];

  const turns: StudyGuideDialogueTurn[] = [];
  for (const paragraph of script.split(/\n+/)) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;
    const match = trimmed.match(SPEAKER_LINE_RE);
    if (match) {
      const speaker = normalizeSpeaker(match[1]!) ?? 'host';
      turns.push({ speaker, line: match[2]!.trim() });
    } else {
      turns.push({ speaker: turns.length % 2 === 0 ? 'host' : 'expert', line: trimmed });
    }
  }
  return turns;
}

export function flattenStudyGuideTurns(sections: StudyGuideScriptSection[]): Array<{
  sectionTitle: string;
  turn: StudyGuideDialogueTurn;
}> {
  const flat: Array<{ sectionTitle: string; turn: StudyGuideDialogueTurn }> = [];
  for (const section of sections) {
    for (const turn of normalizeSectionTurns(section)) {
      flat.push({ sectionTitle: section.title, turn });
    }
  }
  return flat;
}

export async function generateStudyGuideScript(opts: {
  courseTitle: string;
  topics: { title: string; description?: string }[];
  lang: 'en' | 'el';
}): Promise<StudyGuideScript> {
  const topicLines = opts.topics
    .map((t) => `- ${t.title}: ${t.description?.trim() || '(no summary)'}`)
    .join('\n');

  const system =
    opts.lang === 'el'
      ? 'Γράψε σενάριο podcast μελέτης NotebookLM-style: δύο ομιλητές (host, expert) εναλλάσσονται. Κάθε ενότητα 4-8 turns, 1-2 προτάσεις ανά turn. JSON μόνο.'
      : 'Write a NotebookLM-style study podcast: two speakers (host, expert) alternate. Each section 4-8 turns, 1-2 sentences per turn. JSON only.';

  const user =
    opts.lang === 'el'
      ? `Μάθημα: ${opts.courseTitle}\nΘέματα:\n${topicLines}\n\nΕπέστρεψε JSON: {"sections":[{"title":"...","turns":[{"speaker":"host"|"expert","line":"..."}]}]}`
      : `Course: ${opts.courseTitle}\nTopics:\n${topicLines}\n\nReturn JSON: {"sections":[{"title":"...","turns":[{"speaker":"host"|"expert","line":"..."}]}]}`;

  const res = await upstreamFetch('/chat/completions', {
    model: 'gpt-4o-mini',
    temperature: 0.6,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });

  if (!res.ok) {
    throw new Error(`LLM script generation failed: ${res.status}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = data.choices?.[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(raw) as {
    sections?: Array<{
      title?: string;
      script?: string;
      turns?: { speaker?: string; line?: string }[];
    }>;
  };

  const sections: StudyGuideScriptSection[] =
    parsed.sections
      ?.filter((s) => s.title?.trim())
      .map((s) => ({
        title: s.title!.trim(),
        turns: s.turns
          ?.map((t) => {
            const speaker = normalizeSpeaker(String(t.speaker ?? '')) ?? 'host';
            const line = t.line?.trim();
            return line ? { speaker, line } : null;
          })
          .filter((t): t is StudyGuideDialogueTurn => Boolean(t)),
        script: s.script?.trim(),
      }))
      .filter((s) => normalizeSectionTurns(s).length > 0) ?? [];

  if (sections.length === 0) {
    for (const topic of opts.topics.filter((t) => t.description?.trim())) {
      sections.push({
        title: topic.title,
        turns: [
          { speaker: 'host', line: `Let's talk about ${topic.title}.` },
          { speaker: 'expert', line: topic.description!.trim() },
        ],
      });
    }
  }

  return {
    courseTitle: opts.courseTitle,
    lang: opts.lang,
    sections,
    multiSpeaker: true,
    generatedAt: new Date().toISOString(),
  };
}

/** Neural TTS via OpenAI /audio/speech — returns MP3 bytes. */
export async function synthesizeStudyGuideAudio(
  text: string,
  opts: { lang: 'en' | 'el'; speaker?: PodcastSpeaker; voice?: string },
): Promise<ArrayBuffer> {
  const input = text.trim().slice(0, 4096);
  if (!input) throw new Error('empty TTS input');

  const voice = opts.voice?.trim() || voiceForPodcastSpeaker(opts.speaker ?? 'host');

  const res = await upstreamFetch('/audio/speech', {
    model: 'tts-1',
    voice,
    input,
    response_format: 'mp3',
    speed: opts.lang === 'el' ? 0.95 : 1.0,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`TTS failed: ${res.status} ${detail.slice(0, 200)}`);
  }

  return res.arrayBuffer();
}
