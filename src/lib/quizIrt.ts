import type { QuizDef } from './lessonTypes';
import { quizKind } from './lessonTypes';
import { loadJson, saveJson } from './persistence';

/** Rasch 1PL IRT state — scoped per workspace task (correlation bus). */
export type QuizIrtState = {
  ability: number;
  responses: number;
  correct: number;
  lastUpdated: string;
};

const IRT_KEY = 'quiz-irt-state';

export function loadQuizIrt(scopeKey: string): QuizIrtState {
  const all = loadJson<Record<string, QuizIrtState>>(IRT_KEY, {});
  return all[scopeKey] ?? { ability: 0, responses: 0, correct: 0, lastUpdated: '' };
}

export function saveQuizIrt(scopeKey: string, state: QuizIrtState): void {
  const all = loadJson<Record<string, QuizIrtState>>(IRT_KEY, {});
  all[scopeKey] = state;
  saveJson(IRT_KEY, all);
}

/** P(correct | θ, b) — Rasch 1PL. */
export function probabilityCorrect(ability: number, difficulty: number): number {
  const x = ability - difficulty;
  return 1 / (1 + Math.exp(-x));
}

/** Heuristic item difficulty from quiz structure (calibration prior). */
export function estimateQuizDifficulty(quiz: QuizDef): number {
  const kind = quizKind(quiz);
  if (kind === 'matching') return 2.4;
  if (kind === 'ordering') return 2.0;
  if (kind === 'short-answer') return 1.6;
  const opts = 'options' in quiz ? quiz.options.length : 4;
  return opts >= 4 ? 1.0 : 1.2;
}

/**
 * Target difficulty for adaptive selection — zone of proximal development (~65% P).
 * Blends calibrated ability with concept mastery from correlation bus.
 */
export function targetQuizDifficulty(ability: number, conceptMastery: number): number {
  const masteryNorm = (conceptMastery - 50) / 25;
  const blended = ability * 0.65 + masteryNorm * 0.35;
  return blended + 0.35;
}

/** Stable item id for calibration persistence. */
export function quizItemId(concept: string, quiz: QuizDef): string {
  const q = 'question' in quiz ? quiz.question.slice(0, 80) : '';
  const k = quizKind(quiz);
  return `${concept}|${k}|${q}`.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Update learner ability after a response (online EAP-style delta rule).
 * Also nudges ability toward mastery bus when sample is small.
 */
export function updateQuizAbility(
  state: QuizIrtState,
  difficulty: number,
  correct: boolean,
  conceptMastery: number,
): QuizIrtState {
  const p = probabilityCorrect(state.ability, difficulty);
  const residual = (correct ? 1 : 0) - p;
  const learningRate = state.responses < 5 ? 0.55 : 0.35;
  let ability = state.ability + learningRate * residual;

  if (state.responses < 3) {
    const masteryPrior = (conceptMastery - 50) / 30;
    ability = ability * 0.7 + masteryPrior * 0.3;
  }

  return {
    ability: Math.max(-3, Math.min(3, ability)),
    responses: state.responses + 1,
    correct: state.correct + (correct ? 1 : 0),
    lastUpdated: new Date().toISOString(),
  };
}

export function recordQuizResponse(
  scopeKey: string,
  _concept: string,
  quiz: QuizDef,
  correct: boolean,
  conceptMastery: number,
): QuizIrtState {
  const prev = loadQuizIrt(scopeKey);
  const difficulty = estimateQuizDifficulty(quiz);
  const next = updateQuizAbility(prev, difficulty, correct, conceptMastery);
  saveQuizIrt(scopeKey, next);
  return next;
}

export type QuizIrtDisplay = {
  ability: number;
  difficulty: number;
  targetDifficulty: number;
  passProbability: number;
  itemId: string;
};

export function buildQuizIrtDisplay(
  quiz: QuizDef,
  concept: string,
  ability: number,
  conceptMastery: number,
): QuizIrtDisplay {
  const difficulty = estimateQuizDifficulty(quiz);
  const targetDifficulty = targetQuizDifficulty(ability, conceptMastery);
  return {
    ability,
    difficulty,
    targetDifficulty,
    passProbability: probabilityCorrect(ability, difficulty),
    itemId: quizItemId(concept, quiz),
  };
}
