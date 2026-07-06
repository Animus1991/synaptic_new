import type { UploadedFile } from '../types';
import { CONTENT_PIPELINE_VERSION } from './pipelineConstants';
import {
  formatNotebookLmAudioMarkdown,
  inferNotebookLmAudioTitle,
  isNotebookLmAudioTranscript,
  parseNotebookLmAudioFromMarkdown,
  parseNotebookLmAudioTranscript,
  type NotebookLmAudioSegment,
} from './notebooklmAudioTranscript';
import { detectConversationSections } from './textSegmentation';

export type NotebookLmImportKind = 'study-guide' | 'quiz' | 'notes' | 'mixed' | 'chat' | 'audio-transcript';

export type NotebookLmQuizCard = {
  front: string;
  back: string;
};

export type NotebookLmChatTurn = {
  speaker: string;
  text: string;
};

export type { NotebookLmAudioSegment };

export type NotebookLmImportResult = {
  kind: NotebookLmImportKind;
  title: string;
  markdown: string;
  quizCards: NotebookLmQuizCard[];
  chatTurns: NotebookLmChatTurn[];
  audioSegments: NotebookLmAudioSegment[];
};

const NLM_USER_SPEAKER = /^(user|you|human|χρήστης)\s*$/i;
const NLM_ASSISTANT_SPEAKER = /^(notebooklm|assistant|model|ai|βοηθός|βοηθος)\s*$/i;

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

function inferChatTitle(turns: NotebookLmChatTurn[], fallback: string): string {
  const firstUser = turns.find((t) => NLM_USER_SPEAKER.test(t.speaker.trim()));
  const seed = firstUser?.text.trim() ?? turns[0]?.text.trim() ?? '';
  if (!seed) return fallback;
  const line = seed.split(/\r?\n/).map((l) => l.trim()).find(Boolean) ?? seed;
  return stripMarkdownInline(line).slice(0, 80) || fallback;
}

/** Normalize NotebookLM speaker labels for conversation segmentation. */
export function normalizeNotebookLmChatSpeakers(text: string): string {
  return text
    .replace(/^NotebookLM\s*:/gim, 'Assistant:')
    .replace(/^NLM\s*:/gim, 'Assistant:')
    .replace(/^Χρήστης\s*:/gim, 'User:')
    .replace(/^Βοηθός\s*:/gim, 'Assistant:');
}

/** Parse labelled chat turns from a copied NotebookLM conversation. */
export function parseNotebookLmChatTranscript(raw: string): NotebookLmChatTurn[] {
  const normalized = normalizeNotebookLmChatSpeakers(raw.trim());
  const sections = detectConversationSections(normalized);
  if (!sections) return [];

  return sections
    .map((s) => ({
      speaker: s.heading?.trim() || 'Unknown',
      text: s.text.trim(),
    }))
    .filter((t) => t.text.length > 0 || t.speaker !== 'Unknown');
}

export function formatNotebookLmChatMarkdown(turns: NotebookLmChatTurn[], title?: string): string {
  const lines: string[] = [];
  if (title?.trim()) {
    lines.push(`# ${title.trim()}`, '');
  }
  for (const turn of turns) {
    lines.push(`### ${turn.speaker}`, '', turn.text, '');
  }
  return lines.join('\n').trim();
}

/** True when text looks like a multi-turn NotebookLM chat (not a Studio quiz export). */
export function isNotebookLmChatTranscript(
  _text: string,
  quizCards: NotebookLmQuizCard[],
  chatTurns: NotebookLmChatTurn[],
): boolean {
  if (chatTurns.length < 2) return false;

  const hasUser = chatTurns.some((t) => NLM_USER_SPEAKER.test(t.speaker.trim()));
  const hasAssistant = chatTurns.some((t) => NLM_ASSISTANT_SPEAKER.test(t.speaker.trim()));
  if (hasUser && hasAssistant) return true;

  const dialogueTurns = chatTurns.filter(
    (t) => !/^(Q|Question|A|Answer|Ερώτηση|Απάντηση)$/i.test(t.speaker.trim()),
  );
  if (dialogueTurns.length >= 3) return true;

  if (quizCards.length >= 2) return false;

  return chatTurns.length >= 4;
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
  const chatTurns = parseNotebookLmChatTranscript(trimmed);
  const isChat = isNotebookLmChatTranscript(trimmed, quizCards, chatTurns);
  const audioSegments = parseNotebookLmAudioTranscript(trimmed);
  const isAudio = isNotebookLmAudioTranscript(trimmed, audioSegments, {
    isChat,
    quizCardCount: quizCards.length,
  });

  let title = inferTitle(trimmed, 'NotebookLM import');
  if (isChat && title === 'NotebookLM import') {
    title = inferChatTitle(chatTurns, 'NotebookLM chat');
  } else if (isAudio && title === 'NotebookLM import') {
    title = inferNotebookLmAudioTitle(trimmed, audioSegments);
  }

  let kind: NotebookLmImportKind = 'notes';
  const lower = trimmed.toLowerCase();
  const proseWithoutQuiz = trimmed
    .replace(/(?:Q|Ερώτηση|Question)\s*[:.][\s\S]*?(?=(?:Q|Ερώτηση|Question)\s*[:.]|$)/gi, '')
    .replace(/\n---+\n[\s\S]*/g, '')
    .trim();
  const hasProse = proseWithoutQuiz.length > 80;

  if (isChat && quizCards.length > 0) kind = 'mixed';
  else if (isChat) kind = 'chat';
  else if (isAudio) kind = 'audio-transcript';
  else if (quizCards.length > 0 && hasProse) kind = 'mixed';
  else if (quizCards.length > 0) kind = 'quiz';
  else if (lower.includes('study guide') || lower.includes('εγχειρίδιο') || /^#{1,2}\s/m.test(trimmed)) {
    kind = 'study-guide';
  }

  const markdown = isChat
    ? formatNotebookLmChatMarkdown(chatTurns, title)
    : isAudio
      ? formatNotebookLmAudioMarkdown(audioSegments, title)
      : trimmed;

  return {
    kind,
    title,
    markdown,
    quizCards,
    chatTurns: isChat ? chatTurns : [],
    audioSegments: isAudio ? audioSegments : [],
  };
}

export function buildNotebookLmAudioImportResult(raw: string): NotebookLmImportResult | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const audioSegments = parseNotebookLmAudioTranscript(trimmed);
  if (audioSegments.length === 0) return null;
  const title = inferNotebookLmAudioTitle(trimmed, audioSegments);
  return {
    kind: 'audio-transcript',
    title,
    markdown: formatNotebookLmAudioMarkdown(audioSegments, title),
    quizCards: [],
    chatTurns: [],
    audioSegments,
  };
}

export { parseNotebookLmAudioFromMarkdown };

export function buildNotebookLmUploadedFile(
  result: NotebookLmImportResult,
  opts?: { courseId?: string },
): UploadedFile {
  const text = result.markdown;
  const defaultName =
    result.kind === 'chat'
      ? 'notebooklm-chat'
      : result.kind === 'audio-transcript'
        ? 'notebooklm-audio'
        : 'notebooklm-import';
  const safeName = result.title.replace(/[^\w\s-]/g, '').trim().slice(0, 60) || defaultName;
  const ingestMethod =
    result.kind === 'chat'
      ? 'notebooklm-chat'
      : result.kind === 'audio-transcript'
        ? 'notebooklm-audio-transcript'
        : 'notebooklm-import';
  const topics =
    result.kind === 'chat'
      ? ['notebooklm-chat']
      : result.kind === 'audio-transcript'
        ? ['notebooklm-audio']
        : result.quizCards.length > 0
          ? ['notebooklm-quiz']
          : ['notebooklm-notes'];

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
    ingestMethod,
    pipelineVersion: CONTENT_PIPELINE_VERSION,
    extractedTopics: topics,
    ...(opts?.courseId ? { courseId: opts.courseId } : {}),
  };
}
