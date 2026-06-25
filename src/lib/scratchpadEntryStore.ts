/**
 * Structured scratchpad thinking entries — section/concept anchored notes
 * distinct from formula solver state.
 */

import { loadJson, saveJson } from './persistence';
import { loadAnnotations, saveAnnotations, type StoredAnnotation } from './annotationStore';
import { buildAnnotationAnchor } from './annotationAnchor';

export type ScratchpadMode =
  | 'free'
  | 'self-explanation'
  | 'problem-attempt'
  | 'formula-derivation'
  | 'summary'
  | 'confusion-log'
  | 'exam-draft';

export type ScratchpadEntry = {
  id: string;
  mode: ScratchpadMode;
  body: string;
  concept?: string;
  sectionLabel?: string;
  sectionIndex?: number;
  resolved?: boolean;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = 'scratchpad-entries';

export const SCRATCHPAD_MODE_LABELS: Record<ScratchpadMode, { en: string; el: string }> = {
  free: { en: 'Free notes', el: 'Ελεύθερες σημειώσεις' },
  'self-explanation': { en: 'Self-explanation', el: 'Αυτο-εξήγηση' },
  'problem-attempt': { en: 'Problem attempt', el: 'Προσπάθεια άσκησης' },
  'formula-derivation': { en: 'Formula derivation', el: 'Παράγωγος τύπου' },
  summary: { en: 'Summary draft', el: 'Πρόχειρη σύνοψη' },
  'confusion-log': { en: 'Confusion log', el: 'Καταγραφή μπερδέματος' },
  'exam-draft': { en: 'Exam answer draft', el: 'Πρόχειρη απάντηση' },
};

export function loadScratchpadEntries(scopeKey: string): ScratchpadEntry[] {
  return loadJson<Record<string, ScratchpadEntry[]>>(STORAGE_KEY, {})[scopeKey] ?? [];
}

export function saveScratchpadEntries(scopeKey: string, entries: ScratchpadEntry[]): void {
  const all = loadJson<Record<string, ScratchpadEntry[]>>(STORAGE_KEY, {});
  if (entries.length === 0) delete all[scopeKey];
  else all[scopeKey] = entries;
  saveJson(STORAGE_KEY, all);
}

export function createScratchpadEntry(
  body: string,
  opts: {
    mode?: ScratchpadMode;
    concept?: string;
    sectionLabel?: string;
    sectionIndex?: number;
  },
): ScratchpadEntry {
  const now = new Date().toISOString();
  return {
    id: `sp-${Date.now()}`,
    mode: opts.mode ?? 'free',
    body: body.trim(),
    concept: opts.concept,
    sectionLabel: opts.sectionLabel,
    sectionIndex: opts.sectionIndex,
    resolved: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function buildFlashcardFromEntry(entry: ScratchpadEntry): { front: string; back: string } {
  const modeLabel = SCRATCHPAD_MODE_LABELS[entry.mode].en;
  const front = entry.concept
    ? `${entry.concept} (${modeLabel})`
    : entry.sectionLabel
      ? `${entry.sectionLabel} — recall`
      : `Scratchpad: ${modeLabel}`;
  const back = entry.body.slice(0, 500);
  return { front, back };
}

/** Build a margin comment annotation from a scratchpad entry. */
export function buildAnnotationFromScratchpadEntry(
  entry: ScratchpadEntry,
  fileKey: string,
  sourceLines: string[],
  opts?: { courseId?: string; pipelineVersion?: string },
): StoredAnnotation {
  const lineStart = entry.sectionLabel
    ? Math.max(0, sourceLines.findIndex((l) => l.includes(entry.sectionLabel!.slice(0, 24))))
    : 0;
  const line = lineStart >= 0 ? lineStart : 0;
  return {
    id: `ann-sp-${entry.id}`,
    type: 'comment',
    text: `[${SCRATCHPAD_MODE_LABELS[entry.mode].en}] ${entry.body.slice(0, 400)}`,
    color: entry.mode === 'confusion-log' ? '#fbbf24' : '#818cf8',
    lineStart: line,
    lineEnd: line,
    focusTerm: entry.concept,
    category: entry.mode === 'confusion-log' ? 'confusing' : entry.mode === 'exam-draft' ? 'exam-relevant' : undefined,
    createdAt: new Date().toISOString(),
    anchor: buildAnnotationAnchor(fileKey, sourceLines, line, {
      courseId: opts?.courseId,
      pipelineVersion: opts?.pipelineVersion,
      sectionLabel: entry.sectionLabel,
    }),
    anchorStatus: 'ok',
  };
}

export function appendScratchpadAnnotation(
  fileKey: string,
  entry: ScratchpadEntry,
  sourceText: string,
  opts?: { courseId?: string; pipelineVersion?: string },
): StoredAnnotation {
  const lines = sourceText.split('\n');
  const ann = buildAnnotationFromScratchpadEntry(entry, fileKey, lines, opts);
  const items = loadAnnotations(fileKey);
  saveAnnotations(fileKey, [...items.filter((a) => a.id !== ann.id), ann]);
  return ann;
}
