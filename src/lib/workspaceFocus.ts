import type { WorkspaceToolId } from './taskFlows';
import type { SourceHighlight } from './conceptProvenance';

/** Shared focus bus — selecting a term/node in one tool updates all grounded tools. */
export type WorkspaceFocus = {
  /** Active concept or glossary term for highlighting across tools. */
  term?: string;
  /** Optional sentence-level span for reader / go-to-source. */
  highlight?: SourceHighlight | null;
  /** Tool that initiated the focus (for analytics / back navigation). */
  originTool?: WorkspaceToolId;
  /** Dashboard practice CTAs — open this tool instead of defaulting to reader. */
  preferredTool?: WorkspaceToolId;
  simulatorTab?: 'simulator' | 'exam-prep';
};

export function normalizeFocusTerm(term: string): string {
  return term.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function termMatchesFocus(text: string, focusTerm?: string): boolean {
  if (!focusTerm?.trim()) return false;
  const a = normalizeFocusTerm(text);
  const b = normalizeFocusTerm(focusTerm);
  return a === b || a.includes(b) || b.includes(a);
}

export function mergeReaderHighlight(
  sourceHighlight: SourceHighlight | null | undefined,
  focus: WorkspaceFocus,
): SourceHighlight | null {
  if (sourceHighlight) return sourceHighlight;
  return focus.highlight ?? null;
}
