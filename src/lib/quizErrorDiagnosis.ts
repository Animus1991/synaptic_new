/**
 * OPT-AI-A — quiz miss error diagnosis (conceptual / procedural / recall).
 * Offline heuristic always; optional cheap LLM JSON when configured.
 */

import type { UserSettings } from '../types';
import type { Lang } from './i18n';
import { chatCompletion, isLlmAvailable } from './llmClient';
import type { QuizSessionItem } from './quizSession';
import { quizItemQuestion } from './quizSessionModel';
import { quizCorrectAnswerText } from './quizRemediation';
import { resolveToolAiRoute, type ToolAiActionResult } from './toolAiAction';

export type QuizErrorKind = 'conceptual' | 'procedural' | 'recall' | 'careless';

export type QuizErrorNextAction = 'make-card' | 'feynman' | 'reader' | 'diagnose-agent';

export type QuizErrorDiagnosis = {
  kind: QuizErrorKind;
  summary: string;
  nextAction: QuizErrorNextAction;
  confidence: 'low' | 'medium' | 'high';
  source: 'heuristic' | 'llm';
};

function offlineDiagnosis(
  item: QuizSessionItem,
  concept: string,
  learnerConfidence: number,
  lang: Lang,
): QuizErrorDiagnosis {
  const quiz = item.quiz;
  const highConf = learnerConfidence >= 4;
  const lowConf = learnerConfidence <= 2;

  let kind: QuizErrorKind = 'conceptual';
  if (quiz.kind === 'short-answer' && lowConf) kind = 'recall';
  else if (quiz.kind === 'ordering' || quiz.kind === 'matching') kind = 'procedural';
  else if (highConf) kind = 'conceptual';
  else if (lowConf) kind = 'recall';
  else kind = 'careless';

  const nextAction: QuizErrorNextAction =
    kind === 'recall' ? 'make-card'
    : kind === 'procedural' ? 'feynman'
    : kind === 'careless' ? 'reader'
    : 'feynman';

  const answer = quizCorrectAnswerText(quiz, concept);
  const summary =
    lang === 'el'
      ? kind === 'recall'
        ? `Πιθανό κενό ανάκλησης για «${concept}». Σωστό: «${answer.slice(0, 80)}».`
        : kind === 'procedural'
          ? `Φαίνεται λάθος διαδικασίας σε «${concept}». Ξαναπέρασε τα βήματα.`
          : kind === 'careless'
            ? `Υψηλή αβεβαιότητα — ξαναδιάβασε την ερώτηση και την πηγή για «${concept}».`
            : `Πιθανή παρανόηση έννοιας για «${concept}». Εξήγησε απλά (Feynman) πριν ξαναδοκιμάσεις.`
      : kind === 'recall'
        ? `Likely recall gap on "${concept}". Correct: "${answer.slice(0, 80)}".`
        : kind === 'procedural'
          ? `Looks like a procedural slip on "${concept}". Re-walk the steps.`
          : kind === 'careless'
            ? `Low certainty — re-read the question and source for "${concept}".`
            : `Likely conceptual mix-up on "${concept}". Explain it simply (Feynman) before retrying.`;

  return { kind, summary, nextAction, confidence: highConf ? 'high' : lowConf ? 'low' : 'medium', source: 'heuristic' };
}

function parseLlmDiagnosis(raw: string, fallback: QuizErrorDiagnosis): QuizErrorDiagnosis {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return fallback;
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as Partial<QuizErrorDiagnosis>;
    const kind = parsed.kind;
    const nextAction = parsed.nextAction;
    if (
      kind !== 'conceptual' && kind !== 'procedural' && kind !== 'recall' && kind !== 'careless'
    ) return fallback;
    if (
      nextAction !== 'make-card' && nextAction !== 'feynman'
      && nextAction !== 'reader' && nextAction !== 'diagnose-agent'
    ) return fallback;
    const summary = typeof parsed.summary === 'string' && parsed.summary.trim()
      ? parsed.summary.trim().slice(0, 280)
      : fallback.summary;
    return {
      kind,
      nextAction,
      summary,
      confidence: parsed.confidence === 'low' || parsed.confidence === 'high' ? parsed.confidence : 'medium',
      source: 'llm',
    };
  } catch {
    return fallback;
  }
}

export async function diagnoseQuizError(opts: {
  item: QuizSessionItem;
  concept: string;
  learnerConfidence: number;
  lang: Lang;
  settings?: UserSettings;
  preferLocal?: boolean;
  sourceExcerpt?: string;
}): Promise<ToolAiActionResult<QuizErrorDiagnosis>> {
  const heuristic = offlineDiagnosis(
    opts.item,
    opts.concept,
    opts.learnerConfidence,
    opts.lang,
  );
  const route = resolveToolAiRoute({
    intent: 'quiz-error-diagnosis',
    settings: opts.settings,
    preferLocal: opts.preferLocal,
  });

  if (route !== 'llm' || !isLlmAvailable(opts.settings)) {
    return {
      kind: 'local',
      intent: 'quiz-error-diagnosis',
      usedLlm: false,
      data: heuristic,
    };
  }

  const question = quizItemQuestion(opts.item).slice(0, 240);
  const answer = quizCorrectAnswerText(opts.item.quiz, opts.concept).slice(0, 160);
  const langName = opts.lang === 'el' ? 'Greek' : 'English';
  const sourceBlock = opts.sourceExcerpt?.trim()
    ? `\nSource excerpt:\n${opts.sourceExcerpt.trim().slice(0, 500)}\n`
    : '';

  try {
    const raw = await chatCompletion(
      [
        {
          role: 'system',
          content:
            `You diagnose quiz mistakes for Synapse. Reply ONLY with JSON: `
            + `{"kind":"conceptual"|"procedural"|"recall"|"careless","summary":"…","nextAction":"make-card"|"feynman"|"reader"|"diagnose-agent","confidence":"low"|"medium"|"high"}. `
            + `Respond in ${langName}. Keep summary under 40 words. Prefer source-grounded reasoning.`,
        },
        {
          role: 'user',
          content:
            `Concept: ${opts.concept}\nQuestion: ${question}\nCorrect: ${answer}\n`
            + `Learner confidence (1-5): ${opts.learnerConfidence}${sourceBlock}`,
        },
      ],
      opts.settings,
      { temperature: 0.2, maxTokens: 180 },
    );
    const data = parseLlmDiagnosis(raw, heuristic);
    return {
      kind: 'llm',
      intent: 'quiz-error-diagnosis',
      usedLlm: data.source === 'llm',
      data,
      agentHandoff: data.nextAction === 'diagnose-agent'
        ? {
            prompt:
              opts.lang === 'el'
                ? `Διέγνωσε το λάθος μου σε «${opts.concept}»: ${question}`
                : `Diagnose my mistake on "${opts.concept}": ${question}`,
            mode: 'error-diagnosis',
            autoSend: true,
          }
        : undefined,
    };
  } catch {
    return {
      kind: 'local',
      intent: 'quiz-error-diagnosis',
      usedLlm: false,
      data: heuristic,
    };
  }
}

export function quizErrorKindLabel(kind: QuizErrorKind, lang: Lang): string {
  if (lang === 'el') {
    if (kind === 'conceptual') return 'Παρανόηση έννοιας';
    if (kind === 'procedural') return 'Λάθος διαδικασίας';
    if (kind === 'recall') return 'Κενό ανάκλησης';
    return 'Απροσεξία / βιασύνη';
  }
  if (kind === 'conceptual') return 'Conceptual mix-up';
  if (kind === 'procedural') return 'Procedural slip';
  if (kind === 'recall') return 'Recall gap';
  return 'Careless / rushed';
}
