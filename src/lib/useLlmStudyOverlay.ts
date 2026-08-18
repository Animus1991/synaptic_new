import { useEffect, useState } from 'react';
import type { UserSettings } from '../types';
import type { Lang } from './i18n';
import type { QuizDef } from './lessonTypes';
import { isLlmAvailable } from './llmClient';
import { generateStudyCardsWithLlm, generateStudyQuizWithLlm, type LlmFlashcard } from './llmStudyContent';

export function useLlmStudyOverlay(opts: {
  notes: string;
  concept: string;
  lang: Lang;
  settings?: UserSettings;
  enabled: boolean;
}): { quizzes: QuizDef[]; cards: LlmFlashcard[] } {
  const [quizzes, setQuizzes] = useState<QuizDef[]>([]);
  const [cards, setCards] = useState<LlmFlashcard[]>([]);
  const notes = opts.notes.trim();
  const concept = opts.concept.trim();

  useEffect(() => {
    if (!opts.enabled || !isLlmAvailable(opts.settings) || notes.length < 40 || !concept) {
      setQuizzes([]);
      setCards([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const [nextQuiz, nextCards] = await Promise.all([
        generateStudyQuizWithLlm({ notes, concept, lang: opts.lang, settings: opts.settings }),
        generateStudyCardsWithLlm({ notes, concept, lang: opts.lang, settings: opts.settings }),
      ]);
      if (cancelled) return;
      setQuizzes(nextQuiz ?? []);
      setCards(nextCards ?? []);
    })();
    return () => { cancelled = true; };
  }, [opts.enabled, opts.settings, opts.lang, notes, concept]);

  return { quizzes, cards };
}
