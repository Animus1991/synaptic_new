/**
 * OPT-AI-B — compare source-diff + debate counter helpers (local prompts; optional LLM).
 */

import type { UserSettings } from '../types';
import type { Lang } from './i18n';
import { chatCompletion, isLlmAvailable } from './llmClient';
import { resolveToolAiRoute, type ToolAiActionResult } from './toolAiAction';

export type CompareSourceDiff = {
  summary: string;
  trap?: string;
  source: 'heuristic' | 'llm';
};

export type DebateCounter = {
  counter: string;
  steelman?: string;
  source: 'heuristic' | 'llm';
};

export function buildCompareDiffPrompt(left: string, right: string, concept: string, lang: Lang): string {
  if (lang === 'el') {
    return `Σύγκρινε «${left}» με «${right}» (έννοια: ${concept}) μόνο από τις σημειώσεις μου· δώσε 3 διαφορές και 1 παγίδα εξέτασης.`;
  }
  return `Compare "${left}" vs "${right}" (concept: ${concept}) using only my notes; give 3 differences and 1 exam trap.`;
}

export function buildDebateCounterPrompt(claim: string, lang: Lang): string {
  const excerpt = claim.trim().slice(0, 220);
  if (lang === 'el') {
    return `Δώσε αντίλογο (και steelman) για τον ισχυρισμό «${excerpt}» με βάση τις σημειώσεις μου.`;
  }
  return `Give a counter-argument (and steelman) for the claim "${excerpt}" using my notes.`;
}

export async function buildCompareSourceDiff(opts: {
  left: string;
  right: string;
  concept: string;
  lang: Lang;
  settings?: UserSettings;
  preferLocal?: boolean;
  sourceExcerpt?: string;
}): Promise<ToolAiActionResult<CompareSourceDiff>> {
  const heuristic: CompareSourceDiff = {
    summary:
      opts.lang === 'el'
        ? `Διάκριση: «${opts.left}» vs «${opts.right}» κάτω από «${opts.concept}». Άνοιξε Agent για πλήρη σύγκριση από πηγές.`
        : `Contrast "${opts.left}" vs "${opts.right}" under "${opts.concept}". Open Agent for a full source-grounded compare.`,
    trap:
      opts.lang === 'el'
        ? 'Μην τα αντιμετωπίζεις ως συνώνυμα σε ερωτήσεις ορισμού.'
        : 'Do not treat them as synonyms on definition items.',
    source: 'heuristic',
  };

  const route = resolveToolAiRoute({
    intent: 'compare-source-diff',
    settings: opts.settings,
    preferLocal: opts.preferLocal,
  });

  const handoff = {
    prompt: buildCompareDiffPrompt(opts.left, opts.right, opts.concept, opts.lang),
    mode: 'exam-coach' as const,
    autoSend: true,
  };

  if (route !== 'llm' || !isLlmAvailable(opts.settings)) {
    return {
      kind: 'local',
      intent: 'compare-source-diff',
      usedLlm: false,
      data: heuristic,
      agentHandoff: handoff,
    };
  }

  try {
    const raw = await chatCompletion(
      [
        {
          role: 'system',
          content:
            `Compare two study terms using the learner's material. `
            + `Reply ONLY JSON {"summary":"…","trap":"…"}. `
            + `Language: ${opts.lang === 'el' ? 'Greek' : 'English'}. Max 45 words in summary.`,
        },
        {
          role: 'user',
          content:
            `Left: ${opts.left}\nRight: ${opts.right}\nConcept: ${opts.concept}\n`
            + (opts.sourceExcerpt ? `Notes:\n${opts.sourceExcerpt.slice(0, 600)}` : 'Notes: (use general contrast; flag uncertainty)'),
        },
      ],
      opts.settings,
      { temperature: 0.3, maxTokens: 160 },
    );
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const parsed = JSON.parse(raw.slice(start, end + 1)) as { summary?: string; trap?: string };
      if (parsed.summary?.trim()) {
        return {
          kind: 'llm',
          intent: 'compare-source-diff',
          usedLlm: true,
          data: {
            summary: parsed.summary.trim().slice(0, 280),
            trap: parsed.trap?.trim().slice(0, 160),
            source: 'llm',
          },
          agentHandoff: handoff,
        };
      }
    }
  } catch {
    /* fall through */
  }

  return {
    kind: 'local',
    intent: 'compare-source-diff',
    usedLlm: false,
    data: heuristic,
    agentHandoff: handoff,
  };
}

export async function buildDebateCounter(opts: {
  claim: string;
  lang: Lang;
  settings?: UserSettings;
  preferLocal?: boolean;
  sourceExcerpt?: string;
}): Promise<ToolAiActionResult<DebateCounter>> {
  const heuristic: DebateCounter = {
    counter:
      opts.lang === 'el'
        ? `Ποια ένσταση από τις σημειώσεις σου αποδυναμώνει: «${opts.claim.slice(0, 100)}»;`
        : `Which objection from your notes weakens: "${opts.claim.slice(0, 100)}"?`,
    steelman:
      opts.lang === 'el'
        ? 'Πρώτα διατύπωσε την ισχυρότερη εκδοχή του ισχυρισμού, μετά αντίλογο.'
        : 'First state the strongest version of the claim, then counter it.',
    source: 'heuristic',
  };

  const handoff = {
    prompt: buildDebateCounterPrompt(opts.claim, opts.lang),
    mode: 'debate' as const,
    autoSend: true,
  };

  const route = resolveToolAiRoute({
    intent: 'debate-counter',
    settings: opts.settings,
    preferLocal: opts.preferLocal,
  });

  if (route !== 'llm' || !isLlmAvailable(opts.settings)) {
    return {
      kind: 'local',
      intent: 'debate-counter',
      usedLlm: false,
      data: heuristic,
      agentHandoff: handoff,
    };
  }

  try {
    const raw = await chatCompletion(
      [
        {
          role: 'system',
          content:
            `Produce a brief academic counter-argument. `
            + `JSON only: {"counter":"…","steelman":"…"}. `
            + `Language: ${opts.lang === 'el' ? 'Greek' : 'English'}.`,
        },
        {
          role: 'user',
          content:
            `Claim: ${opts.claim.slice(0, 400)}\n`
            + (opts.sourceExcerpt ? `Notes:\n${opts.sourceExcerpt.slice(0, 500)}` : ''),
        },
      ],
      opts.settings,
      { temperature: 0.4, maxTokens: 180 },
    );
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const parsed = JSON.parse(raw.slice(start, end + 1)) as { counter?: string; steelman?: string };
      if (parsed.counter?.trim()) {
        return {
          kind: 'llm',
          intent: 'debate-counter',
          usedLlm: true,
          data: {
            counter: parsed.counter.trim().slice(0, 280),
            steelman: parsed.steelman?.trim().slice(0, 200),
            source: 'llm',
          },
          agentHandoff: handoff,
        };
      }
    }
  } catch {
    /* fall through */
  }

  return {
    kind: 'local',
    intent: 'debate-counter',
    usedLlm: false,
    data: heuristic,
    agentHandoff: handoff,
  };
}
