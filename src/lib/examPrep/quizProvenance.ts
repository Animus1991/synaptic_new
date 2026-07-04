export type QuizProvenance =
  | 'from-notes'
  | 'from-uploaded-past-paper'
  | 'similar-to-official-exam'
  | 'generated';

const PAST_PAPER_HINTS = [
  /πανελλήνι/i,
  /παλι[άα]\s+θέμα/i,
  /past\s+paper/i,
  /official\s+exam/i,
  /θέμα\s+[α-ωa-z]/i,
  /exam\s+20\d{2}/i,
  /panellin/i,
  /palia\s+themata/i,
];

export function isPastPaperSource(sourceName?: string, sourceText?: string): boolean {
  const hay = `${sourceName ?? ''}\n${sourceText ?? ''}`.slice(0, 8000);
  if (!hay.trim()) return false;
  return PAST_PAPER_HINTS.some((re) => re.test(hay));
}

export function inferQuizProvenance(
  sourceName?: string,
  sourceText?: string,
  explicitTag?: QuizProvenance,
): QuizProvenance {
  if (explicitTag) return explicitTag;
  if (isPastPaperSource(sourceName, sourceText)) return 'from-uploaded-past-paper';
  return 'from-notes';
}

export function provenanceLabelKey(provenance: QuizProvenance): string {
  switch (provenance) {
    case 'from-uploaded-past-paper':
      return 'quizProvenanceFromPastPaper';
    case 'similar-to-official-exam':
      return 'quizProvenanceSimilarOfficial';
    case 'generated':
      return 'quizProvenanceGenerated';
    default:
      return 'quizProvenanceFromNotes';
  }
}
