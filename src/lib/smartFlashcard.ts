/**
 * OPT-AI-A — optional LLM polish for selection → Leitner cards.
 * Offline path stays extractive (buildSelectionFlashcard / buildQuizMistakeFlashcard).
 */

import type { UserSettings } from '../types';
import type { Lang } from './i18n';
import { chatCompletion, isLlmAvailable } from './llmClient';
import { resolveToolAiRoute, type ToolAiActionResult } from './toolAiAction';
import { buildSelectionFlashcard } from './workspaceSelectionActions';

export type SmartFlashcard = {
  front: string;
  back: string;
  cardType: 'definition' | 'term' | 'cloze' | 'mistake';
  source: 'extractive' | 'llm';
};

function parseCard(raw: string, fallback: SmartFlashcard): SmartFlashcard {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return fallback;
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as {
      front?: string;
      back?: string;
      cardType?: SmartFlashcard['cardType'];
    };
    const front = parsed.front?.trim().slice(0, 160);
    const back = parsed.back?.trim().slice(0, 280);
    if (!front || !back) return fallback;
    const cardType =
      parsed.cardType === 'definition'
      || parsed.cardType === 'term'
      || parsed.cardType === 'cloze'
      || parsed.cardType === 'mistake'
        ? parsed.cardType
        : fallback.cardType;
    return { front, back, cardType, source: 'llm' };
  } catch {
    return fallback;
  }
}

export async function buildSmartFlashcard(opts: {
  text: string;
  concept: string;
  glossaryDefinition?: string;
  lang: Lang;
  settings?: UserSettings;
  preferLocal?: boolean;
}): Promise<ToolAiActionResult<SmartFlashcard>> {
  const extractive = buildSelectionFlashcard(
    opts.text,
    opts.concept,
    opts.glossaryDefinition,
  );
  const fallback: SmartFlashcard = {
    ...extractive,
    source: 'extractive',
  };

  const route = resolveToolAiRoute({
    intent: 'smart-flashcard',
    settings: opts.settings,
    preferLocal: opts.preferLocal,
  });

  if (route !== 'llm' || !isLlmAvailable(opts.settings)) {
    return {
      kind: 'local',
      intent: 'smart-flashcard',
      usedLlm: false,
      data: fallback,
    };
  }

  const langName = opts.lang === 'el' ? 'Greek' : 'English';
  try {
    const raw = await chatCompletion(
      [
        {
          role: 'system',
          content:
            `Create one spaced-repetition flashcard from learner notes. `
            + `Reply ONLY with JSON {"front":"…","back":"…","cardType":"definition"|"term"|"cloze"}. `
            + `Front is a cue; back is the answer. Use ${langName}. Stay faithful to the excerpt — no invented facts.`,
        },
        {
          role: 'user',
          content:
            `Concept: ${opts.concept}\nExcerpt:\n${opts.text.trim().slice(0, 600)}`
            + (opts.glossaryDefinition ? `\nGlossary: ${opts.glossaryDefinition.slice(0, 200)}` : ''),
        },
      ],
      opts.settings,
      { temperature: 0.3, maxTokens: 160 },
    );
    const data = parseCard(raw, fallback);
    return {
      kind: data.source === 'llm' ? 'llm' : 'local',
      intent: 'smart-flashcard',
      usedLlm: data.source === 'llm',
      data,
    };
  } catch {
    return {
      kind: 'local',
      intent: 'smart-flashcard',
      usedLlm: false,
      data: fallback,
    };
  }
}
