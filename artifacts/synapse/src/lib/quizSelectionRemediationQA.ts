/**
 * Wave 6.8c — QA spine linking Quiz §13.5 selection contract + post-mistake remediation.
 */

import type { Lang } from './i18n';
import { quizCorrectAnswerText } from './quizRemediation';
import type { QuizSessionItem, QuizSessionState } from './quizSession';
import { quizItemQuestion } from './quizSessionModel';
import {
  getSelectionActionDefs,
  SELECTION_ACTION_ORDER,
  type WorkspaceSelectionContext,
} from './workspaceSelectionActions';

export type QuizRemediationKind = 'make-card' | 'feynman' | 'open-reader' | 'ask-agent';

export type QuizSelectionIssue = {
  code: 'quiz-action-leaked' | 'open-reader-missing' | 'empty-wrong-item' | 'remediation-incomplete';
  message: string;
};

export type QuizWrongItemSummary = {
  itemId: string;
  question: string;
  correctAnswer: string;
  selectionContext: WorkspaceSelectionContext;
  remediationKinds: QuizRemediationKind[];
};

export type QuizSelectionRemediationReport = {
  ok: boolean;
  selectionActionCount: number;
  hiddenQuizAction: boolean;
  openReaderAvailable: boolean;
  wrongItemCount: number;
  issues: QuizSelectionIssue[];
  wrongItems: QuizWrongItemSummary[];
};

const QUIZ_REMEDIATION_KINDS: QuizRemediationKind[] = [
  'make-card',
  'feynman',
  'open-reader',
  'ask-agent',
];

/** Wrong answers recorded in a completed (or in-progress) session. */
export function listQuizWrongItems(state: QuizSessionState): QuizSessionItem[] {
  return state.items.filter((_item, index) => state.correctFlags[index] === false);
}

export function buildQuizSelectionContext(
  item: QuizSessionItem,
  concept: string,
  sectionLabel?: string,
): WorkspaceSelectionContext {
  const question = quizItemQuestion(item).trim();
  return {
    text: question || concept,
    term: concept,
    sectionLabel,
    originTool: 'quiz',
  };
}

export function buildQuizWrongItemSummary(
  item: QuizSessionItem,
  concept: string,
  sectionLabel?: string,
): QuizWrongItemSummary {
  const question = quizItemQuestion(item).trim();
  const correctAnswer = quizCorrectAnswerText(item.quiz, concept);
  return {
    itemId: item.id,
    question,
    correctAnswer,
    selectionContext: buildQuizSelectionContext(item, concept, sectionLabel),
    remediationKinds: [...QUIZ_REMEDIATION_KINDS],
  };
}

export function buildQuizWrongItemSummaries(
  state: QuizSessionState,
  sectionLabel?: string,
): QuizWrongItemSummary[] {
  return listQuizWrongItems(state).map((item) =>
    buildQuizWrongItemSummary(item, state.concept, sectionLabel),
  );
}

/** Audit §13.5 action parity for quiz origin + remediation coverage on wrong items. */
export function auditQuizSelectionRemediation(input: {
  lang: Lang;
  session?: QuizSessionState | null;
  concept: string;
  sectionLabel?: string;
}): QuizSelectionRemediationReport {
  const issues: QuizSelectionIssue[] = [];
  const defs = getSelectionActionDefs(input.lang, 'quiz');
  const hiddenQuizAction = !defs.some((d) => d.id === 'quiz');
  const openReaderAvailable = defs.some((d) => d.id === 'open-reader');

  if (defs.some((d) => d.id === 'quiz')) {
    issues.push({
      code: 'quiz-action-leaked',
      message: 'Quiz action must be hidden when originTool is quiz',
    });
  }
  if (!openReaderAvailable) {
    issues.push({
      code: 'open-reader-missing',
      message: 'Open in Reader must remain available from quiz selections',
    });
  }

  const wrongItems = input.session
    ? buildQuizWrongItemSummaries(input.session, input.sectionLabel)
    : [];

  for (const summary of wrongItems) {
    if (!summary.question.trim()) {
      issues.push({
        code: 'empty-wrong-item',
        message: `Wrong item ${summary.itemId} has no question text for selection`,
      });
    }
    if (summary.remediationKinds.length < QUIZ_REMEDIATION_KINDS.length) {
      issues.push({
        code: 'remediation-incomplete',
        message: `Wrong item ${summary.itemId} missing remediation paths`,
      });
    }
  }

  const expectedCount = SELECTION_ACTION_ORDER.filter((id) => id !== 'quiz').length;
  if (defs.length !== expectedCount) {
    issues.push({
      code: 'remediation-incomplete',
      message: `Expected ${expectedCount} selection actions from quiz, got ${defs.length}`,
    });
  }

  return {
    ok: issues.length === 0,
    selectionActionCount: defs.length,
    hiddenQuizAction,
    openReaderAvailable,
    wrongItemCount: wrongItems.length,
    issues,
    wrongItems,
  };
}

export function quizWrongAnswerHint(
  item: QuizSessionItem,
  concept: string,
  lang: Lang,
): string {
  const answer = quizCorrectAnswerText(item.quiz, concept);
  const q = quizItemQuestion(item).trim().slice(0, 80);
  if (lang === 'el') {
    return q
      ? `Η σωστή απάντηση για «${q}» είναι: ${answer}`
      : `Η σωστή απάντηση: ${answer}`;
  }
  return q
    ? `Correct answer for "${q}": ${answer}`
    : `Correct answer: ${answer}`;
}
