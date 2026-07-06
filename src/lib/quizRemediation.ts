/**
 * Wave 2G — post-mistake remediation: flashcard + Feynman loop from wrong quiz answers.
 */

import type { Lang } from './i18n';
import type { QuizSessionItem } from './quizSession';
import { quizItemQuestion } from './quizSessionModel';
import type { QuizDef } from './lessonTypes';

export function quizCorrectAnswerText(quiz: QuizDef, fallback: string): string {
  if (quiz.kind === 'short-answer') {
    return quiz.acceptedAnswers[0]?.trim() || fallback;
  }
  if (quiz.kind === 'ordering') {
    return quiz.correctOrder.map((i) => quiz.items[i]).filter(Boolean).join(' → ') || fallback;
  }
  if (quiz.kind === 'matching') {
    return quiz.pairs
      .map(([li, ri]) => `${quiz.left[li] ?? ''} ↔ ${quiz.right[ri] ?? ''}`)
      .filter((s) => s.trim() && s !== '↔')
      .join('; ') || fallback;
  }
  const mc = quiz as Extract<QuizDef, { options: string[] }>;
  return mc.options[mc.correctIndex] ?? fallback;
}

export function buildQuizMistakeFlashcard(
  item: QuizSessionItem,
  concept: string,
): { front: string; back: string; cardType: 'mistake' } {
  const question = quizItemQuestion(item);
  const answer = quizCorrectAnswerText(item.quiz, concept);
  return {
    front: question.trim().slice(0, 120) || concept,
    back: answer.trim().slice(0, 200) || concept,
    cardType: 'mistake',
  };
}

export function buildQuizMistakeFeynmanPrompt(
  item: QuizSessionItem,
  concept: string,
  lang: Lang,
): string {
  const question = quizItemQuestion(item);
  const { back } = buildQuizMistakeFlashcard(item, concept);
  const q = question.trim().slice(0, 200);
  const a = back.trim().slice(0, 200);
  if (lang === 'el') {
    return `Έκανα λάθος σε αυτή την ερώτηση. Εξήγησέ μου απλά (Feynman) γιατί η σωστή απάντηση είναι «${a}» για: «${q}» (έννοια: ${concept}).`;
  }
  return `I got this wrong. Explain simply (Feynman style) why the correct answer is "${a}" for: "${q}" (concept: ${concept}).`;
}

/** Combined Feynman prompt for a cluster of wrong answers (TOOL-QZ-02). */
export function buildQuizWrongClusterFeynmanPrompt(
  items: QuizSessionItem[],
  concept: string,
  lang: Lang,
): string {
  const lines = items.slice(0, 6).map((item, i) => {
    const q = quizItemQuestion(item).trim().slice(0, 120);
    const a = quizCorrectAnswerText(item.quiz, concept).trim().slice(0, 120);
    return lang === 'el'
      ? `${i + 1}. «${q}» → σωστό: «${a}»`
      : `${i + 1}. "${q}" → correct: "${a}"`;
  });
  const body = lines.join('\n');
  if (lang === 'el') {
    return `Έκανα λάθος σε ${items.length} ερωτήσεις για «${concept}». Βοήθησέ με να εξηγήσω απλά (Feynman) γιατί έπεσα έξω:\n\n${body}`;
  }
  return `I missed ${items.length} questions on "${concept}". Help me explain simply (Feynman) why I got these wrong:\n\n${body}`;
}
