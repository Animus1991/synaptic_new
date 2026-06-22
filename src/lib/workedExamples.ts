/**
 * Worked-example mining + scaffolded variants.
 *
 * Identifies multi-sentence worked examples in the source material and produces
 * scaffolded versions so the learner can progress from a fully worked solution
 * to a faded, partially solved version and finally an independent exercise.
 */

import { splitSentences } from './contentAnalysis';
import { relevantExcerpt } from './noteContentExtractors';

export interface WorkedExample {
  /** Source sentence(s) that triggered the extraction. */
  trigger: string;
  /** The problem statement or prompt. */
  problem: string;
  /** Solution steps; the last step is the final answer. */
  steps: string[];
  /** Final answer or conclusion. */
  answer: string;
  /** Estimated difficulty of the original example. */
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface ScaffoldedVariant {
  kind: 'worked' | 'faded' | 'prompt';
  title: string;
  problem: string;
  steps: string[];
  /** Blank indices for the faded variant (step index, blank text). */
  blanks?: [number, string][];
}

const EXAMPLE_MARKERS = /\b(example|for instance|e\.g\.|suppose|given|calculate|solve|worked example|let's say|consider the case|παράδειγμα|υποθέστε|δεδομέν|υπολογίστε|λύστε)/i;
const NUMERIC_MARKER = /\b(\d+(?:\.\d+)?%?|\$?\d+(?:,\d{3})*(?:\.\d+)?)\b/;
const STEP_MARKERS = /\b(step|first|then|next|finally|therefore|thus|so|hence|substitute|simplify|rearrange|combine|divide|multiply|add|subtract|αφού|έτσι|επομένως|άρα|βήμα|πρώτα|μετά|τελικά)/i;

function estimateDifficulty(steps: string[]): WorkedExample['difficulty'] {
  const score = steps.length + (steps.some((s) => NUMERIC_MARKER.test(s)) ? 2 : 0);
  if (score <= 3) return 'beginner';
  if (score >= 6) return 'advanced';
  return 'intermediate';
}

function extractProblemAndSteps(text: string): { problem: string; steps: string[] } {
  const sentences = splitSentences(text);
  if (sentences.length === 0) return { problem: text, steps: [] };

  const problem = sentences[0]!;
  const rest = sentences.slice(1);

  // If the rest contains clear step markers, each sentence is a step.
  const hasStepMarkers = rest.some((s) => STEP_MARKERS.test(s));
  if (hasStepMarkers) {
    return { problem, steps: rest };
  }

  // Otherwise, group sentences into a small number of steps by length.
  const steps: string[] = [];
  let buffer = '';
  for (const s of rest) {
    buffer += (buffer ? ' ' : '') + s;
    if (buffer.length > 180) {
      steps.push(buffer);
      buffer = '';
    }
  }
  if (buffer) steps.push(buffer);
  if (steps.length === 0) steps.push(rest.join(' '));
  return { problem, steps };
}

/**
 * Mine worked examples from source text for a given concept.
 */
export function mineWorkedExamples(text: string, concept: string, max = 3): WorkedExample[] {
  const excerpt = relevantExcerpt(text, concept, 16000);
  const sentences = splitSentences(excerpt);
  const examples: WorkedExample[] = [];

  const CONCLUSION = /\b(therefore|thus|hence|so that|in conclusion|επομένως|άρα|συνεπώς)\b/i;
  const NEW_EXAMPLE = /^(however|but|in contrast|on the other hand|meanwhile|αντίθετα|ωστόσο|από την άλλη)/i;

  for (let i = 0; i < sentences.length && examples.length < max; i++) {
    const s = sentences[i]!;
    if (!EXAMPLE_MARKERS.test(s)) continue;
    if (s.length < 24) continue;

    // Gather the trigger sentence plus following sentences until we reach a
    // conclusion ("Therefore …"), a new contrasting example, or a length cap.
    const chunk: string[] = [s];
    let last = i;
    for (let j = i + 1; j < sentences.length && j <= i + 6; j++) {
      const next = sentences[j]!;
      if (next.length < 8) break;
      if (NEW_EXAMPLE.test(next)) break;
      // A second example marker (excluding the same trigger word) starts a new one.
      if (chunk.length > 1 && EXAMPLE_MARKERS.test(next)) break;
      chunk.push(next);
      last = j;
      // Include the conclusion sentence, then stop — it is the final answer.
      if (CONCLUSION.test(next)) break;
      if (chunk.length >= 5) break;
    }

    const { problem, steps } = extractProblemAndSteps(chunk.join(' '));
    if (steps.length === 0) continue;

    examples.push({
      trigger: s,
      problem,
      steps,
      answer: steps[steps.length - 1] ?? '',
      difficulty: estimateDifficulty(steps),
    });

    // Skip past the consumed sentences so examples don't overlap.
    i = last;
  }

  return examples;
}

function extractBlankableFragments(step: string): string[] {
  // Pull out short numeric expressions or final result phrases as blanks.
  const fragments: string[] = [];
  const numeric = step.match(/\b(\d+(?:\.\d+)?%?)\b/g);
  if (numeric) fragments.push(...numeric);
  const result = step.match(/(?:=|is|are|equals|γίνεται|είναι)\s+(.{2,40})/i);
  if (result) fragments.push(result[1]!.trim());
  return [...new Set(fragments)].filter((f) => f.length > 0 && f.length < 40);
}

function makeFaded(steps: string[]): { steps: string[]; blanks: [number, string][] } {
  const faded: string[] = [];
  const blanks: [number, string][] = [];
  steps.forEach((step, i) => {
    const fragments = extractBlankableFragments(step);
    if (fragments.length > 0 && i > 0) {
      const blank = fragments[0]!;
      blanks.push([i, blank]);
      faded.push(step.replace(blank, '___'));
    } else {
      faded.push(step);
    }
  });
  return { steps: faded, blanks };
}

/**
 * Build scaffolded variants from a worked example.
 */
export function scaffoldExample(example: WorkedExample, lang: 'en' | 'el' = 'en'): ScaffoldedVariant[] {
  const faded = makeFaded(example.steps);
  const promptProblem = lang === 'el'
    ? `Χρησιμοποίησε την ίδια μέθοδο με το παράδειγμα για να λύσεις: ${example.problem}`
    : `Use the same method as the example to solve: ${example.problem}`;

  return [
    {
      kind: 'worked',
      title: lang === 'el' ? 'Επιλυμένο Παράδειγμα' : 'Worked Example',
      problem: example.problem,
      steps: example.steps,
    },
    {
      kind: 'faded',
      title: lang === 'el' ? 'Παράδειγμα με Κενά' : 'Faded Example',
      problem: example.problem,
      steps: faded.steps,
      blanks: faded.blanks,
    },
    {
      kind: 'prompt',
      title: lang === 'el' ? 'Εξάσκηση' : 'Practice',
      problem: promptProblem,
      steps: [],
    },
  ];
}

/**
 * Find the best worked example for a concept and return its scaffolded variants.
 */
export function workedExampleVariants(
  text: string,
  concept: string,
  lang: 'en' | 'el' = 'en',
): ScaffoldedVariant[] | null {
  const examples = mineWorkedExamples(text, concept, 1);
  if (examples.length === 0) return null;
  return scaffoldExample(examples[0]!, lang);
}
