/**
 * §13.5 Unified selection-action contract — same affordances in every tool surface.
 */

import { t, type I18nKey, type Lang } from './i18n';
import type { WorkspaceToolId } from './taskFlows';

export type WorkspaceSelectionActionId =
  | 'annotate'
  | 'ask-agent'
  | 'make-card'
  | 'make-occlusion'
  | 'quiz'
  | 'compare'
  | 'debate'
  | 'scratchpad'
  | 'open-reader';

export type WorkspaceSelectionContext = {
  /** Selected passage or concept label. */
  text: string;
  /** Active concept for correlation bus. */
  term: string;
  sectionLabel?: string;
  originTool: WorkspaceToolId;
};

export type SelectionActionDef = {
  id: WorkspaceSelectionActionId;
  label: string;
  hint: string;
  /** Hide when already on Reader and action is open-reader. */
  hideOnReader?: boolean;
  /** Hide when already on Quiz and action is quiz. */
  hideOnQuiz?: boolean;
  /** Only shown in Reader when OCR/heuristic regions match selection. */
  readerOcclusionOnly?: boolean;
};

export type SelectionActionOptions = {
  /** Show make-occlusion when selection maps to an OCR bbox. */
  occlusionAvailable?: boolean;
};

type ActionMeta = {
  labelKey: I18nKey;
  hintKey: I18nKey;
  hideOnReader?: boolean;
  hideOnQuiz?: boolean;
  readerOcclusionOnly?: boolean;
};

const ACTION_META: Record<WorkspaceSelectionActionId, ActionMeta> = {
  annotate: { labelKey: 'selectionActionAnnotateLabel', hintKey: 'selectionActionAnnotateHint' },
  'ask-agent': { labelKey: 'selectionActionAskAgentLabel', hintKey: 'selectionActionAskAgentHint' },
  'make-card': { labelKey: 'selectionActionMakeCardLabel', hintKey: 'selectionActionMakeCardHint' },
  'make-occlusion': {
    labelKey: 'selectionActionMakeOcclusionLabel',
    hintKey: 'selectionActionMakeOcclusionHint',
    readerOcclusionOnly: true,
  },
  quiz: { labelKey: 'selectionActionQuizLabel', hintKey: 'selectionActionQuizHint', hideOnQuiz: true },
  compare: { labelKey: 'selectionActionCompareLabel', hintKey: 'selectionActionCompareHint' },
  debate: { labelKey: 'selectionActionDebateLabel', hintKey: 'selectionActionDebateHint' },
  scratchpad: { labelKey: 'selectionActionScratchpadLabel', hintKey: 'selectionActionScratchpadHint' },
  'open-reader': {
    labelKey: 'selectionActionOpenReaderLabel',
    hintKey: 'selectionActionOpenReaderHint',
    hideOnReader: true,
  },
};

export const SELECTION_ACTION_ORDER: WorkspaceSelectionActionId[] = [
  'annotate',
  'ask-agent',
  'make-card',
  'make-occlusion',
  'quiz',
  'compare',
  'debate',
  'scratchpad',
  'open-reader',
];

/** Reader-only actions excluded from §13.5 parity on other tools. */
export const READER_ONLY_SELECTION_ACTIONS = new Set<WorkspaceSelectionActionId>(['make-occlusion']);

export function getSelectionActionDefs(
  lang: Lang,
  originTool: WorkspaceToolId,
  options?: SelectionActionOptions,
): SelectionActionDef[] {
  return SELECTION_ACTION_ORDER
    .map((id) => {
      const meta = ACTION_META[id];
      return {
        id,
        label: t(meta.labelKey, lang),
        hint: t(meta.hintKey, lang),
        hideOnReader: meta.hideOnReader,
        hideOnQuiz: meta.hideOnQuiz,
        readerOcclusionOnly: meta.readerOcclusionOnly,
      };
    })
    .filter((def) => {
      if (originTool === 'reader' && def.hideOnReader) return false;
      if (originTool === 'quiz' && def.hideOnQuiz) return false;
      if (def.readerOcclusionOnly) {
        if (originTool !== 'reader') return false;
        if (!options?.occlusionAvailable) return false;
      }
      return true;
    });
}

export function buildSelectionAgentPrompt(
  text: string,
  sectionLabel: string | undefined,
  concept: string,
  lang: Lang,
): string {
  const excerpt = text.trim().slice(0, 600);
  const section = sectionLabel?.trim() || concept;
  return t('selectionAgentPrompt', lang)
    .replace('{section}', section)
    .replace('{concept}', concept)
    .replace('{excerpt}', excerpt);
}

export function buildSelectionFlashcard(
  text: string,
  concept: string,
  glossaryDefinition?: string,
): { front: string; back: string; cardType: 'definition' | 'term' } {
  const front = text.trim().slice(0, 120);
  const back = glossaryDefinition?.trim() || concept;
  return {
    front,
    back,
    cardType: glossaryDefinition?.trim() ? 'definition' : 'term',
  };
}

export function selectionExcerptPreview(text: string, max = 72): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}
