import type { NotebookLmAudioSegment } from './notebooklmAudioTranscript';
import type { NotebookLmImportResult, NotebookLmQuizCard } from './notebooklmImport';
import { formatChapterTimestamp } from './videoChapters';

/** Map audio transcript chapters to Leitner/FSRS cards (title → front, body → back). */
export function audioSegmentsToQuizCards(segments: NotebookLmAudioSegment[]): NotebookLmQuizCard[] {
  return segments
    .filter((s) => s.text.trim().length >= 12)
    .map((s) => {
      const stamp = s.startSec != null ? ` [${formatChapterTimestamp(s.startSec)}]` : '';
      const front = `${s.title.trim() || `Part ${s.index + 1}`}${stamp}`;
      return {
        front,
        back: s.text.trim().slice(0, 900),
      };
    });
}

export function buildAudioFsrsImportResult(
  title: string,
  segments: NotebookLmAudioSegment[],
): NotebookLmImportResult {
  return {
    kind: 'audio-transcript',
    title,
    markdown: '',
    quizCards: audioSegmentsToQuizCards(segments),
    chatTurns: [],
    audioSegments: segments,
  };
}
