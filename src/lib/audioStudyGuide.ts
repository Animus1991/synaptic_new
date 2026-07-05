import type { Course } from '../types';
import { speakParagraphs, type ReaderTtsController } from './readerTts';

export type AudioStudyGuideSection = {
  title: string;
  paragraphs: string[];
};

/** Build NotebookLM-style audio study guide sections from a course. */
export function buildAudioStudyGuideSections(course: Course, lang: 'en' | 'el'): AudioStudyGuideSection[] {
  const intro =
    lang === 'el'
      ? `Καλώς ήρθες στον οδηγό μελέτης για το μάθημα «${course.title}». Θα ακούσεις μια σύντομη επισκόπηση των κύριων θεμάτων.`
      : `Welcome to the audio study guide for "${course.title}". You'll hear a concise overview of the main topics.`;

  const sections: AudioStudyGuideSection[] = [
    { title: lang === 'el' ? 'Εισαγωγή' : 'Introduction', paragraphs: [intro] },
  ];

  for (const topic of course.topics ?? []) {
    const summary = topic.description?.trim();
    if (!summary) continue;
    sections.push({
      title: topic.title,
      paragraphs: summary.split(/\n\n+/).map((p) => p.trim()).filter(Boolean),
    });
  }

  const outro =
    lang === 'el'
      ? 'Τέλος του οδηγού μελέτης. Άνοιξε το workspace για εξάσκηση με κάρτες και quiz.'
      : 'End of the study guide. Open the workspace to practice with flashcards and quizzes.';
  sections.push({
    title: lang === 'el' ? 'Επόμενα βήματα' : 'Next steps',
    paragraphs: [outro],
  });

  return sections;
}

export type AudioStudyGuideController = {
  stop: () => void;
  sectionIndex: number;
};

/** Play course-level audio overview using browser TTS (NotebookLM parity, client-side). */
export function playAudioStudyGuide(
  course: Course,
  lang: 'en' | 'el',
  onSectionChange?: (index: number, title: string) => void,
): AudioStudyGuideController | null {
  const sections = buildAudioStudyGuideSections(course, lang);
  const flat: { sectionIndex: number; title: string; text: string }[] = [];
  sections.forEach((s, i) => {
    for (const p of s.paragraphs) {
      flat.push({ sectionIndex: i, title: s.title, text: p });
    }
  });
  if (flat.length === 0) return null;

  let cancelled = false;
  let sectionIndex = 0;
  let tts: ReaderTtsController | null = null;
  let idx = 0;

  const stop = () => {
    cancelled = true;
    tts?.stop();
  };

  const speakNext = () => {
    if (cancelled || idx >= flat.length) return;
    const item = flat[idx]!;
    sectionIndex = item.sectionIndex;
    onSectionChange?.(item.sectionIndex, item.title);
    tts = speakParagraphs([item.text], {
      lang,
      onEnd: () => {
        idx += 1;
        speakNext();
      },
    });
  };

  speakNext();
  return { stop, get sectionIndex() { return sectionIndex; } };
}
