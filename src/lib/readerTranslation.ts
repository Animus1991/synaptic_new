import type { GlossaryEntry, UserSettings } from '../types';
import { chatCompletion, isLlmAvailable } from './llmClient';
import { conceptRelevanceScore } from './noteContentExtractors';
import { loadJson, saveJson } from './persistence';
import { normalizeFocusTerm, termMatchesFocus } from './workspaceFocus';

export type TranslationMode = 'off' | 'glossary' | 'full';

export type BilingualParagraph = {
  source: string;
  companion: string;
  glossHits: string[];
};

const CACHE_KEY = 'reader-translation-cache';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function splitReaderParagraphs(text: string): string[] {
  return text.split(/\n\n+/).filter((p) => p.trim());
}

function scopedGlossary(glossary: GlossaryEntry[], concept?: string): GlossaryEntry[] {
  if (!concept?.trim()) return glossary;
  return [...glossary].sort(
    (a, b) => conceptRelevanceScore(b.term + b.definition, concept)
      - conceptRelevanceScore(a.term + a.definition, concept),
  );
}

/**
 * Glossary-augmented companion column — inline glosses for terms found in each paragraph.
 * Works offline; uses the same glossary bus as Leitner/Feynman/Compare.
 */
export function buildGlossaryCompanionParagraph(
  paragraph: string,
  glossary: GlossaryEntry[],
  focusTerm?: string,
): BilingualParagraph {
  const hits: string[] = [];
  const seen = new Set<string>();
  let companion = paragraph;

  const ranked = [...glossary].sort((a, b) => b.term.length - a.term.length);
  for (const g of ranked) {
    const term = g.term.trim();
    if (term.length < 3 || seen.has(term.toLowerCase())) continue;
    const re = new RegExp(`\\b(${escapeRegex(term)})\\b`, 'gi');
    if (!re.test(paragraph)) continue;
    seen.add(term.toLowerCase());
    hits.push(term);
    const gloss = g.definition.trim().slice(0, 140);
    companion = companion.replace(
      re,
      (m) => `${m} (${gloss}${g.definition.length > 140 ? '…' : ''})`,
    );
  }

  if (focusTerm?.trim()) {
    const focusEntry = glossary.find((g) => termMatchesFocus(g.term, focusTerm));
    if (focusEntry && paragraph.toLowerCase().includes(normalizeFocusTerm(focusTerm))) {
      const lead = `【${focusEntry.term}】 ${focusEntry.definition.slice(0, 200)}`;
      if (!companion.startsWith(lead)) companion = `${lead}\n\n${companion}`;
      if (!hits.includes(focusEntry.term)) hits.unshift(focusEntry.term);
    }
  }

  return { source: paragraph, companion, glossHits: hits };
}

export function buildGlossaryCompanionColumns(
  text: string,
  glossary: GlossaryEntry[],
  concept?: string,
  focusTerm?: string,
): BilingualParagraph[] {
  const scoped = scopedGlossary(glossary, concept);
  return splitReaderParagraphs(text).map((p) => buildGlossaryCompanionParagraph(p, scoped, focusTerm));
}

function cacheFingerprint(text: string, lang: string): string {
  const head = text.slice(0, 120);
  const tail = text.slice(-80);
  return `${lang}:${text.length}:${head}:${tail}`;
}

export function loadCachedTranslations(scope: string, text: string, lang: string): string[] | null {
  const fp = cacheFingerprint(text, lang);
  const all = loadJson<Record<string, Record<string, string[]>>>(CACHE_KEY, {});
  return all[scope]?.[fp] ?? null;
}

export function saveCachedTranslations(scope: string, text: string, lang: string, paragraphs: string[]): void {
  const fp = cacheFingerprint(text, lang);
  const all = loadJson<Record<string, Record<string, string[]>>>(CACHE_KEY, {});
  if (!all[scope]) all[scope] = {};
  all[scope][fp] = paragraphs;
  saveJson(CACHE_KEY, all);
}

/**
 * Full paragraph translation via LLM when proxy/key available; otherwise null.
 */
export async function translateParagraphsLlm(
  paragraphs: string[],
  targetLang: 'en' | 'el',
  settings?: UserSettings,
  concept?: string,
): Promise<string[] | null> {
  if (!isLlmAvailable(settings) || paragraphs.length === 0) return null;

  const numbered = paragraphs.map((p, i) => `[${i}] ${p}`).join('\n\n');
  const langLabel = targetLang === 'el' ? 'Greek' : 'English';
  const conceptHint = concept ? `Study concept: «${concept}».` : '';

  try {
    const raw = await chatCompletion(
      [
        {
          role: 'system',
          content:
            'You translate academic study notes faithfully. Preserve numbering [N] prefixes, '
            + 'formulas, and technical terms. Output ONLY the translated numbered paragraphs.',
        },
        {
          role: 'user',
          content: `${conceptHint} Translate each paragraph to ${langLabel}:\n\n${numbered}`,
        },
      ],
      settings,
      { temperature: 0.2, maxTokens: 1800 },
    );

    const out: string[] = [];
    const blocks = raw.split(/\n(?=\[\d+\])/).filter(Boolean);
    for (let i = 0; i < paragraphs.length; i++) {
      const block = blocks.find((b) => b.startsWith(`[${i}]`)) ?? blocks[i] ?? '';
      out.push(block.replace(/^\[\d+\]\s*/, '').trim() || paragraphs[i]!);
    }
    return out;
  } catch {
    return null;
  }
}

export function mergeFullTranslation(
  paragraphs: BilingualParagraph[],
  translated: string[],
): BilingualParagraph[] {
  return paragraphs.map((p, i) => ({
    ...p,
    companion: translated[i]?.trim() ? translated[i]! : p.companion,
  }));
}
