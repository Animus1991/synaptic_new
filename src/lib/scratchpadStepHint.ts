/**
 * OPT-AI-B — scratchpad next-step hint (local heuristics first; optional LLM).
 */

import type { UserSettings } from '../types';
import type { Lang } from './i18n';
import { chatCompletion, isLlmAvailable } from './llmClient';
import { resolveToolAiRoute, type ToolAiActionResult } from './toolAiAction';

export type ScratchpadStepHint = {
  hint: string;
  source: 'heuristic' | 'llm';
};

function localHint(formulaOrNote: string, lang: Lang): ScratchpadStepHint {
  const text = formulaOrNote.trim();
  const hasEquals = text.includes('=');
  const hasFraction = text.includes('/') || text.includes('\\frac');
  let hint: string;
  if (!text) {
    hint = lang === 'el'
      ? 'Γράψε τον τύπο ή ένα βήμα λύσης για να λάβεις υπόδειξη.'
      : 'Write a formula or solution step to get a hint.';
  } else if (hasEquals && hasFraction) {
    hint = lang === 'el'
      ? 'Έλεγξε μονάδες και αν μπορείς να απλοποιήσεις το κλάσμα πριν αντικαταστήσεις τιμές.'
      : 'Check units and whether you can simplify the fraction before substituting values.';
  } else if (hasEquals) {
    hint = lang === 'el'
      ? 'Απομόνωσε τον άγνωστο στο ένα μέλος· μετά επαλήθευσε με αντικατάσταση.'
      : 'Isolate the unknown on one side; then verify by substitution.';
  } else {
    hint = lang === 'el'
      ? 'Μετέτρεψε τη σημείωση σε εξίσωση ή απαριθμημένα βήματα πριν ζητήσεις Agent.'
      : 'Turn the note into an equation or numbered steps before asking the Agent.';
  }
  return { hint, source: 'heuristic' };
}

export async function buildScratchpadStepHint(opts: {
  text: string;
  sectionTitle?: string;
  lang: Lang;
  settings?: UserSettings;
  preferLocal?: boolean;
}): Promise<ToolAiActionResult<ScratchpadStepHint>> {
  const heuristic = localHint(opts.text, opts.lang);
  const route = resolveToolAiRoute({
    intent: 'scratchpad-step-hint',
    settings: opts.settings,
    preferLocal: opts.preferLocal,
  });

  if (route !== 'llm' || !isLlmAvailable(opts.settings)) {
    return {
      kind: 'local',
      intent: 'scratchpad-step-hint',
      usedLlm: false,
      data: heuristic,
      agentHandoff: {
        prompt:
          opts.lang === 'el'
            ? `Δώσε μόνο την επόμενη υπόδειξη (όχι τελική λύση) για:\n${opts.text.slice(0, 400)}`
            : `Give only the next hint (not the final answer) for:\n${opts.text.slice(0, 400)}`,
        mode: 'math-tutor',
      },
    };
  }

  const langName = opts.lang === 'el' ? 'Greek' : 'English';
  try {
    const raw = await chatCompletion(
      [
        {
          role: 'system',
          content:
            `You are a math/study coach. Give ONE next-step hint only — never the full solution. `
            + `Reply with plain text under 35 words in ${langName}.`,
        },
        {
          role: 'user',
          content:
            `${opts.sectionTitle ? `Section: ${opts.sectionTitle}\n` : ''}`
            + `Learner work:\n${opts.text.trim().slice(0, 500)}`,
        },
      ],
      opts.settings,
      { temperature: 0.3, maxTokens: 80 },
    );
    const hint = raw.trim().slice(0, 220) || heuristic.hint;
    return {
      kind: 'llm',
      intent: 'scratchpad-step-hint',
      usedLlm: true,
      data: { hint, source: 'llm' },
    };
  } catch {
    return {
      kind: 'local',
      intent: 'scratchpad-step-hint',
      usedLlm: false,
      data: heuristic,
    };
  }
}
