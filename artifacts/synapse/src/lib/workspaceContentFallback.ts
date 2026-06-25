/**
 * Passage-grounded fallbacks when concept-specific extraction is too weak
 * (generic step titles like "Introduction", sparse glossary, low OCR quality).
 */

import type { Lang } from './i18n';
import type { QuizDef } from './lessonTypes';
import type { GlossaryEntry } from '../types';
import { detectSections, rankKeyphrases, splitSentences, titleCasePhrase } from './contentAnalysis';
import { isStudyToolExcludedText } from './readerDocumentLayout';

type DebateNode = {
  id: string;
  type: 'claim' | 'premise' | 'support' | 'refutation';
  text: string;
  x: number;
  y: number;
  expanded?: boolean;
  children?: DebateNode[];
};

function seedFromString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h || 1;
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const out = items.slice();
  let state = seed >>> 0;
  const next = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0xffffffff;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export function isGenericStudyConcept(concept: string): boolean {
  const c = concept.trim().toLowerCase();
  if (c.length < 3) return true;
  return /^(introduction|overview|summary|preface|prologue|lesson|section|chapter|unit|module|step|βήμα|εισαγωγή|σύνοψη|ενότητα|διάλεξη)$/i.test(c);
}

export function passageSentences(text: string, minLen = 28): string[] {
  return splitSentences(text)
    .filter((s) => s.length >= minLen && !isStudyToolExcludedText(s))
    .slice(0, 24);
}

/** MC quiz from any substantive sentences in the passage (no concept threshold). */
export function buildFallbackMcQuiz(
  text: string,
  concept: string,
  lang: Lang,
  variant = 0,
): QuizDef | null {
  const sentences = passageSentences(text);
  if (sentences.length < 2) return null;

  const sorted = [...sentences].sort((a, b) => b.length - a.length);
  const correct = sorted[variant % sorted.length]!;
  const distractors = sorted.filter((s) => s !== correct).slice(0, 3);
  while (distractors.length < 3) {
    distractors.push(
      lang === 'el' ? 'Δεν αναφέρεται στο απόσπασμα' : 'Not stated in this excerpt',
    );
  }

  const question = lang === 'el'
    ? `Ποια πρόταση αντανακλά καλύτερα το υλικό σου${isGenericStudyConcept(concept) ? '' : ` για «${concept}»`};`
    : `Which statement best reflects your material${isGenericStudyConcept(concept) ? '' : ` on «${concept}»`}?`;

  const correctClipped = correct.slice(0, 140);
  const options = seededShuffle(
    [correctClipped, ...distractors.map((d) => d.slice(0, 140))],
    seedFromString(`${concept}|fallback|${variant}|${correctClipped}`),
  );
  const correctIndex = Math.max(0, options.indexOf(correctClipped));

  return { question, options, correctIndex };
}

export function buildFallbackShortAnswerQuiz(
  text: string,
  concept: string,
  glossary: GlossaryEntry[],
  lang: Lang,
): QuizDef | null {
  const term = glossary[0]?.term
    ?? titleCasePhrase(rankKeyphrases(text, 1)[0]?.phrase ?? concept);
  const sentences = passageSentences(text);
  const definition = glossary[0]?.definition
    ?? sentences.find((s) => s.length > 40)?.slice(0, 160)
    ?? sentences[0]?.slice(0, 160);
  if (!definition) return null;

  return {
    kind: 'short-answer',
    question: lang === 'el'
      ? `Ποιος όρος ή ιδέα περιγράφεται: «${definition}»;`
      : `Which term or idea is described: «${definition}»?`,
    acceptedAnswers: [term, term.toLowerCase()],
    hint: lang === 'el' ? 'Απάντησε με βάση τις σημειώσεις σου.' : 'Answer from your uploaded notes.',
  };
}

export function buildFallbackQuizFromPassage(
  text: string,
  concept: string,
  glossary: GlossaryEntry[],
  lang: Lang,
  variant = 0,
): QuizDef | null {
  return buildFallbackMcQuiz(text, concept, lang, variant)
    ?? buildFallbackShortAnswerQuiz(text, concept, glossary, lang);
}

export function buildFallbackQuizSession(
  text: string,
  concept: string,
  glossary: GlossaryEntry[],
  lang: Lang,
  count = 3,
): QuizDef[] {
  const items: QuizDef[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < count + 2; i++) {
    const q = buildFallbackQuizFromPassage(text, concept, glossary, lang, i);
    if (!q) continue;
    const key = JSON.stringify(q).slice(0, 100);
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(q);
    if (items.length >= count) break;
  }
  return items;
}

export function buildFallbackComparisons(
  text: string,
  concept: string,
): [string, string, string][] {
  const rows: [string, string, string][] = [];
  const sections = detectSections(text).filter((s) => s.text.trim().length > 40);

  for (let i = 0; i < sections.length - 1 && rows.length < 4; i++) {
    const a = sections[i]!;
    const b = sections[i + 1]!;
    const titleA = (a.heading ?? `Section ${i + 1}`).slice(0, 48);
    const titleB = (b.heading ?? `Section ${i + 2}`).slice(0, 48);
    const bodyA = a.text.split('\n').find((l) => l.trim().length > 20)?.trim().slice(0, 80) ?? '—';
    const bodyB = b.text.split('\n').find((l) => l.trim().length > 20)?.trim().slice(0, 80) ?? '—';
    rows.push([`${titleA} vs ${titleB}`, bodyA, bodyB]);
  }

  if (rows.length === 0) {
    const phrases = rankKeyphrases(text, 6).map((p) => p.phrase).filter((p) => p.length > 3);
    for (let i = 0; i < phrases.length - 1 && rows.length < 3; i += 2) {
      rows.push([concept, phrases[i]!.slice(0, 80), phrases[i + 1]!.slice(0, 80)]);
    }
  }

  if (rows.length === 0) {
    const sentences = passageSentences(text, 40);
    if (sentences.length >= 2) {
      rows.push([concept, sentences[0]!.slice(0, 80), sentences[1]!.slice(0, 80)]);
    }
  }

  return rows;
}

/** Passage-grounded Feynman outline when concept/topic metadata is too generic. */
export function buildFallbackFeynmanOutline(
  text: string,
  concept: string,
  sectionLabel: string | undefined,
  lang: Lang,
): string[] {
  const items: string[] = [];
  const isEl = lang === 'el';

  if (sectionLabel?.trim() && !isGenericStudyConcept(sectionLabel)) {
    items.push(
      isEl
        ? `Εξήγησε με απλά λόγια τι καλύπτει η ενότητα «${sectionLabel}».`
        : `In plain language, explain what the section «${sectionLabel}» covers.`,
    );
  }

  const sentences = passageSentences(text, 36).slice(0, 3);
  for (const sentence of sentences) {
    const clip = sentence.length > 90 ? `${sentence.slice(0, 87)}…` : sentence;
    items.push(
      isEl
        ? `Με δικά σου λόγια: ${clip}`
        : `In your own words: ${clip}`,
    );
  }

  const phrases = rankKeyphrases(text, 5)
    .map((p) => titleCasePhrase(p.phrase))
    .filter((p) => p.length > 3 && !isGenericStudyConcept(p));
  for (const phrase of phrases.slice(0, 3)) {
    items.push(
      isEl
        ? `Τι σημαίνει «${phrase}» στο υλικό σου;`
        : `What does «${phrase}» mean in your material?`,
    );
  }

  items.push(
    isEl
      ? 'Δώσε ένα συγκεκριμένο παράδειγμα από τις σημειώσεις σου.'
      : 'Give one concrete example from your notes.',
  );

  if (items.length === 1 && isGenericStudyConcept(concept)) {
    items.unshift(
      isEl
        ? 'Ποια είναι η κύρια ιδέα αυτού του κειμένου;'
        : 'What is the main idea of this passage?',
    );
  }

  return items.slice(0, 5);
}

export function buildFallbackDebateTree(text: string, _concept: string): DebateNode | null {
  const sentences = passageSentences(text, 35);
  if (sentences.length < 1) return null;

  const claim = sentences[0]!;
  const supports = sentences.slice(1, 3);
  const mk = (
    id: string,
    type: DebateNode['type'],
    label: string,
    x: number,
    y: number,
    children?: DebateNode[],
  ): DebateNode => ({
    id,
    type,
    text: label.slice(0, 160),
    x,
    y,
    expanded: true,
    children,
  });

  const supportNodes = supports.map((s, i) => mk(`fs${i}`, 'support', s, 120 + i * 160, 250));
  const children = supportNodes.length > 0
    ? [mk('fp', 'premise', 'From your notes', 200, 150, supportNodes)]
    : undefined;

  return mk('fc', 'claim', claim, 360, 40, children);
}
