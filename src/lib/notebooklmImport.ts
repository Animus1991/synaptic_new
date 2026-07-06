import type { UploadedFile } from '../types';
import { CONTENT_PIPELINE_VERSION } from './pipelineConstants';

export type NotebookLmImportKind = 'study-guide' | 'quiz' | 'notes' | 'mixed';

export type NotebookLmQuizCard = {
  front: string;
  back: string;
};

export type NotebookLmImportResult = {
  kind: NotebookLmImportKind;
  title: string;
  markdown: string;
  quizCards: NotebookLmQuizCard[];
};

function stripMarkdownInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .trim();
}

function inferTitle(raw: string, fallback: string): string {
  const heading = raw.match(/^#\s+(.+)$/m);
  if (heading?.[1]) return stripMarkdownInline(heading[1]).slice(0, 120);
  const firstLine = raw.split(/\r?\n/).map((l) => l.trim()).find(Boolean);
  if (firstLine && firstLine.length <= 120) return stripMarkdownInline(firstLine);
  return fallback;
}

/** Parse Q:/A: and numbered quiz blocks common in NotebookLM Studio exports. */
export function parseNotebookLmQuizCards(text: string): NotebookLmQuizCard[] {
  const cards: NotebookLmQuizCard[] = [];
  const seen = new Set<string>();

  const push = (front: string, back: string) => {
    const f = stripMarkdownInline(front);
    const b = stripMarkdownInline(back);
    if (!f || !b) return;
    const key = `${f}::${b}`;
    if (seen.has(key)) return;
    seen.add(key);
    cards.push({ front: f, back: b });
  };

  const qaBlocks = text.split(/\n(?=(?:Q|Ερώτηση|Question)\s*[:.])/gi);
  for (const block of qaBlocks) {
    const m = block.match(
      /^(?:Q|Ερώτηση|Question)\s*[:.]\s*([\s\S]+?)\n(?:A|Απάντηση|Answer)\s*[:.]\s*([\s\S]+)$/i,
    );
    if (m) push(m[1]!, m[2]!);
  }

  const numbered = text.split(/\n(?=\d+[.)]\s+)/);
  for (const block of numbered) {
    const m = block.match(
      /^\d+[.)]\s*([\s\S]+?)(?:\n(?:Answer|Απάντηση|A)\s*[:.]?\s*([\s\S]+))?$/i,
    );
    if (m?.[2]) push(m[1]!, m[2]!);
  }

  const flashBlocks = text.split(/\n---+\n/);
  if (flashBlocks.length > 1) {
    for (const block of flashBlocks) {
      const lines = block.trim().split(/\r?\n/).filter(Boolean);
      if (lines.length >= 2) push(lines[0]!, lines.slice(1).join('\n'));
    }
  }

  return cards;
}

export function parseNotebookLmExport(raw: string): NotebookLmImportResult {
  const trimmed = raw.trim();
  const quizCards = parseNotebookLmQuizCards(trimmed);
  const title = inferTitle(trimmed, 'NotebookLM import');

  let kind: NotebookLmImportKind = 'notes';
  const lower = trimmed.toLowerCase();
  const proseWithoutQuiz = trimmed
    .replace(/(?:Q|Ερώτηση|Question)\s*[:.][\s\S]*?(?=(?:Q|Ερώτηση|Question)\s*[:.]|$)/gi, '')
    .replace(/\n---+\n[\s\S]*/g, '')
    .trim();
  const hasProse = proseWithoutQuiz.length > 80;

  if (quizCards.length > 0 && hasProse) kind = 'mixed';
  else if (quizCards.length > 0) kind = 'quiz';
  else if (lower.includes('study guide') || lower.includes('εγχειρίδιο') || /^#{1,2}\s/m.test(trimmed)) {
    kind = 'study-guide';
  }

  return {
    kind,
    title,
    markdown: trimmed,
    quizCards,
  };
}

export function buildNotebookLmUploadedFile(result: NotebookLmImportResult): UploadedFile {
  const text = result.markdown;
  const safeName = result.title.replace(/[^\w\s-]/g, '').trim().slice(0, 60) || 'notebooklm-import';
  return {
    id: `file-nlm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: `${safeName}.md`,
    type: 'md',
    size: text.length,
    uploadedAt: new Date().toISOString(),
    status: 'analyzed',
    progress: 100,
    extractedText: text,
    detectedLanguage: 'en',
    ingestMethod: 'notebooklm-import',
    pipelineVersion: CONTENT_PIPELINE_VERSION,
    extractedTopics: result.quizCards.length > 0 ? ['notebooklm-quiz'] : ['notebooklm-notes'],
  };
}
