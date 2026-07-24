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

export type QuizIrtLearnerCopy = {
  readinessLabel: string;
  difficultyLabel: string;
  probabilityLabel: string;
  hint: string;
};

export type QuizIrtConfidenceTier = 'unknown' | 'low' | 'medium' | 'high';

export type QuizIrtConfidenceBand = {
  pointPct: number;
  lowPct: number;
  highPct: number;
  tier: QuizIrtConfidenceTier;
  bandLabel: string;
  rangeLabel: string;
};

/** Visual confidence band for pass probability — narrows as responses accumulate. */
export function buildQuizIrtConfidenceBand(
  irt: QuizIrtDisplay,
  responseCount: number,
  lang: 'en' | 'el',
): QuizIrtConfidenceBand {
  const isEl = lang === 'el';
  const pointPct = Math.round(irt.passProbability * 100);
  const margin =
    responseCount === 0 ? 25 : responseCount < 3 ? 18 : responseCount < 8 ? 12 : 8;
  const lowPct = Math.max(0, pointPct - margin);
  const highPct = Math.min(100, pointPct + margin);

  const tier: QuizIrtConfidenceTier =
    responseCount === 0
      ? 'unknown'
      : pointPct < 40
        ? 'low'
        : pointPct < 70
          ? 'medium'
          : 'high';

  const bandLabel =
    tier === 'unknown'
      ? isEl
        ? 'Εκτιμώμενο εύρος (βαθμονόμηση…)'
        : 'Estimated range (calibrating…)'
      : tier === 'low'
        ? isEl
          ? 'Χαμηλή πιθανότητα επιτυχίας'
          : 'Low success likelihood'
        : tier === 'medium'
          ? isEl
            ? 'Μέτρια πιθανότητα επιτυχίας'
            : 'Moderate success likelihood'
          : isEl
            ? 'Υψηλή πιθανότητα επιτυχίας'
            : 'High success likelihood';

  const rangeLabel = isEl
    ? `${lowPct}–${highPct}% εκτιμώμενη επιτυχία`
    : `${lowPct}–${highPct}% estimated success`;

  return { pointPct, lowPct, highPct, tier, bandLabel, rangeLabel };
}

/** User-facing quiz metrics — replaces raw θ/b/P (Prompt 5). */
export function formatQuizIrtForLearner(
  irt: QuizIrtDisplay,
  lang: 'en' | 'el',
  responseCount = 0,
): QuizIrtLearnerCopy {
  const isEl = lang === 'el';
  const pct = Math.round(irt.passProbability * 100);

  const readinessLabel = responseCount === 0
    ? (isEl ? 'Ετοιμότητα: Άγνωστη (χωρίς προσπάθειες)' : 'Readiness: Unknown (no attempts yet)')
    : irt.ability < -0.5
      ? (isEl ? 'Ετοιμότητα: Χαμηλή' : 'Readiness: Low')
      : irt.ability < 0.5
        ? (isEl ? 'Ετοιμότητα: Μέτρια' : 'Readiness: Moderate')
        : (isEl ? 'Ετοιμότητα: Καλή' : 'Readiness: Good');

  const difficultyLabel = irt.difficulty < 1.2
    ? (isEl ? 'Δυσκολία: Βασική' : 'Difficulty: Basic')
    : irt.difficulty < 2
      ? (isEl ? 'Δυσκολία: Μέτρια' : 'Difficulty: Medium')
      : (isEl ? 'Δυσκολία: Υψηλή' : 'Difficulty: Hard');

  const probabilityLabel = isEl
    ? `Πιθανότητα σωστής: ~${pct}%`
    : `Estimated success: ~${pct}%`;

  const hint = responseCount === 0
    ? (isEl ? 'Η εκτίμηση βελτιώνεται μετά την πρώτη απάντηση.' : 'Estimates improve after your first answer.')
    : '';

  return { readinessLabel, difficultyLabel, probabilityLabel, hint };
}
