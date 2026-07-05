import { upstreamFetch } from './upstream';
import { config } from '../config';

export type StudyGuideScriptSection = {
  title: string;
  script: string;
};

export type StudyGuideScript = {
  courseTitle: string;
  lang: 'en' | 'el';
  sections: StudyGuideScriptSection[];
  generatedAt: string;
};

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
      ? 'Γράψε σενάριο podcast μελέτης σε φυσικό ελληνικό, σαν δύο φιλικοί ομιλητές (Host και Expert). Κάθε ενότητα 2-4 προτάσεις. JSON μόνο.'
      : 'Write a NotebookLM-style study podcast script with two friendly speakers (Host and Expert). Each section 2-4 sentences. JSON only.';

  const user =
    opts.lang === 'el'
      ? `Μάθημα: ${opts.courseTitle}\nΘέματα:\n${topicLines}\n\nΕπέστρεψε JSON: {"sections":[{"title":"...","script":"..."}]}`
      : `Course: ${opts.courseTitle}\nTopics:\n${topicLines}\n\nReturn JSON: {"sections":[{"title":"...","script":"..."}]}`;

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
  const parsed = JSON.parse(raw) as { sections?: StudyGuideScriptSection[] };

  const sections =
    parsed.sections?.filter((s) => s.title?.trim() && s.script?.trim()) ??
    opts.topics
      .filter((t) => t.description?.trim())
      .map((t) => ({ title: t.title, script: t.description!.trim() }));

  return {
    courseTitle: opts.courseTitle,
    lang: opts.lang,
    sections,
    generatedAt: new Date().toISOString(),
  };
}

/** Neural TTS via OpenAI /audio/speech — returns MP3 bytes. */
export async function synthesizeStudyGuideAudio(
  text: string,
  lang: 'en' | 'el',
): Promise<ArrayBuffer> {
  const input = text.trim().slice(0, 4096);
  if (!input) throw new Error('empty TTS input');

  const res = await upstreamFetch('/audio/speech', {
    model: 'tts-1',
    voice: config.audioTtsVoice,
    input,
    response_format: 'mp3',
    speed: lang === 'el' ? 0.95 : 1.0,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`TTS failed: ${res.status} ${detail.slice(0, 200)}`);
  }

  return res.arrayBuffer();
}
