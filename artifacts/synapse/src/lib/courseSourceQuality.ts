import type { Course, CourseSourceQuality } from '../types';
import type { GeneratedOutline, GeneratedTopic } from './courseGenerator';
import { detectSections, extractDefinitions, rankKeyphrases } from './contentAnalysis';
import { extractComparisons, extractFormulas } from './noteContentExtractors';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function wordCount(text: string): number {
  return (text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? []).length;
}

function countWorkedExamples(text: string): number {
  const markers = text.match(/\b(example|for instance|e\.g\.|suppose|given|calculate|solve|worked example|παράδειγμα|υποθέστε|δεδομέν|υπολόγι|λύν)\b/giu);
  return markers?.length ?? 0;
}

function averageConceptsPerTopic(topics: GeneratedTopic[]): number {
  if (topics.length === 0) return 0;
  return topics.reduce((sum, topic) => sum + topic.concepts.length, 0) / topics.length;
}

function strongestDifficulty(topics: GeneratedTopic[]): GeneratedTopic['difficulty'] {
  if (topics.some((topic) => topic.difficulty === 'advanced')) return 'advanced';
  if (topics.some((topic) => topic.difficulty === 'intermediate')) return 'intermediate';
  return 'beginner';
}

function dedupeStrings(values: string[], limit: number): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].slice(0, limit);
}

function mergeTopicTitle(bucket: GeneratedTopic[]): string {
  const first = bucket[0]?.title?.trim() ?? 'Module';
  const second = bucket[1]?.title?.trim();
  if (!second) return first;
  const pair = `${first} & ${second}`;
  return pair.length <= 56 ? pair : first;
}

function mergeTopicBucket(bucket: GeneratedTopic[], index: number, previousTitle?: string): GeneratedTopic {
  const concepts = dedupeStrings(bucket.flatMap((topic) => topic.concepts), 10);
  const objectives = dedupeStrings(bucket.flatMap((topic) => topic.objectives ?? []), 5);
  const description = dedupeStrings(bucket.map((topic) => topic.description), bucket.length)
    .join(' ')
    .slice(0, 240) || `Module ${index + 1}`;
  return {
    title: mergeTopicTitle(bucket),
    description,
    concepts,
    prerequisites: previousTitle ? [previousTitle] : [],
    difficulty: strongestDifficulty(bucket),
    estimatedMinutes: clamp(bucket.reduce((sum, topic) => sum + topic.estimatedMinutes, 0), 15, 90),
    ...(objectives.length > 0 ? { objectives } : {}),
  };
}

function topicBudget(text: string, outline: GeneratedOutline): number {
  const words = wordCount(text);
  const sections = detectSections(text).length;
  const breadth = rankKeyphrases(text, 18).length;
  const examples = countWorkedExamples(text);
  const formulas = extractFormulas(text, undefined, 8).length;

  let budget = words >= 1800 ? 7 : words >= 1200 ? 6 : words >= 750 ? 5 : words >= 350 ? 4 : 3;
  if (sections >= 5) budget += 1;
  if (breadth >= 12) budget += 1;
  if (examples + formulas >= 4) budget += 1;
  if (outline.topics.some((topic) => topic.concepts.length >= 6) && budget < 6) budget += 1;
  return clamp(budget, 3, 8);
}

export function buildOutlinePreviewFromTitles(opts: {
  title: string;
  subject: string;
  topics: string[];
}): GeneratedOutline {
  const topics = opts.topics.length > 0 ? opts.topics : [opts.title];
  return {
    title: opts.title,
    subject: opts.subject,
    difficulty: 'intermediate',
    summary: '',
    topics: topics.map((topic, index) => ({
      title: topic,
      description: `Topic: ${topic}`,
      concepts: [topic],
      prerequisites: index > 0 ? [topics[index - 1]!] : [],
      difficulty: 'intermediate',
      estimatedMinutes: 20,
    })),
    glossary: [],
  };
}

export function buildOutlinePreviewFromCourse(
  course: Course,
  glossaryEntries: Array<{ term: string; definition?: string }> = [],
): GeneratedOutline {
  return {
    title: course.title,
    subject: course.subject,
    difficulty: course.difficulty,
    summary: course.description,
    topics: course.topics.map((topic, index) => ({
      title: topic.title,
      description: topic.description,
      concepts: topic.keyConcepts?.slice(0, 10) ?? [topic.title],
      prerequisites: index > 0 ? [course.topics[index - 1]!.title] : [],
      difficulty: course.difficulty === 'mixed' ? 'intermediate' : course.difficulty,
      estimatedMinutes: topic.estimatedMinutes,
      ...(topic.objectives?.length ? { objectives: topic.objectives.slice(0, 5) } : {}),
    })),
    glossary: glossaryEntries.map((entry) => ({
      term: entry.term,
      definition: entry.definition?.trim() || `${entry.term} from uploaded material.`,
    })),
  };
}

export function analyzeCourseSourceQuality(
  text: string,
  outline: GeneratedOutline,
): CourseSourceQuality {
  const words = wordCount(text);
  const sections = detectSections(text).length;
  const definitions = extractDefinitions(text, 24).length;
  const glossaryCount = outline.glossary.length;
  const keyphraseCount = rankKeyphrases(text, 18).length;
  const formulaCount = extractFormulas(text, outline.title || outline.subject, 10).length;
  const comparisonGlossary = outline.glossary.map((entry) => ({
    term: entry.term,
    definition: entry.definition,
    source: 'generated',
    relatedConcepts: [],
    courseId: 'generated',
  }));
  const comparisonCount = extractComparisons(text, outline.title || outline.subject, comparisonGlossary).length;
  const workedExampleCount = countWorkedExamples(text);
  const recommendedTopicCount = topicBudget(text, outline);
  const detectedTopicCount = outline.topics.length;
  const avgConcepts = averageConceptsPerTopic(outline.topics);
  const topicPressure = Math.max(0, detectedTopicCount - recommendedTopicCount);
  const conceptDensityScore = clamp01(1 - Math.abs(avgConcepts - 4) / 4);

  let score = Math.round(
    clamp01(words / 1800) * 18
    + clamp01(sections / 5) * 16
    + clamp01((definitions + glossaryCount) / 12) * 16
    + clamp01(keyphraseCount / 14) * 12
    + clamp01((workedExampleCount + formulaCount + comparisonCount) / 8) * 14
    + clamp01(1 - topicPressure / Math.max(1, recommendedTopicCount)) * 12
    + conceptDensityScore * 12,
  );
  if (words < 220 && detectedTopicCount > 3) score = Math.min(score, 42);
  if (sections < 2 && definitions < 2 && glossaryCount < 2) score = Math.min(score, 48);

  const band: CourseSourceQuality['band'] =
    score >= 75 ? 'strong'
      : score >= 45 ? 'moderate'
        : 'weak';
  const needsMoreMaterial =
    score < 45
    || words < 220
    || (sections < 2 && definitions < 2 && workedExampleCount === 0 && formulaCount === 0);

  const strengths: string[] = [];
  if (sections >= 3) strengths.push(`The material has ${sections} clear sections that support stable topic grounding.`);
  if (definitions + glossaryCount >= 5) strengths.push('Terminology coverage is strong enough for glossary-driven recall and quizzes.');
  if (workedExampleCount + formulaCount >= 3) strengths.push('The source includes worked-example or formula signals that support active practice generation.');
  if (comparisonCount >= 2) strengths.push('The notes contain comparison structure that supports deeper conceptual differentiation.');
  if (detectedTopicCount <= recommendedTopicCount + 1) strengths.push('The current topic count is well matched to the density of the source material.');

  const warnings: string[] = [];
  if (needsMoreMaterial) warnings.push('This course was generated from relatively sparse material, so some modules may remain lightly grounded.');
  if (topicPressure >= 2) warnings.push(`The source currently supports about ${recommendedTopicCount} solid modules, but ${detectedTopicCount} were detected.`);
  if (definitions + glossaryCount < 3) warnings.push('Explicit term/definition coverage is limited, which weakens quizzes, flashcards, and retrieval practice.');
  if (workedExampleCount + formulaCount === 0) warnings.push('No worked examples or formula cues were detected, so practice generation will be lighter.');

  const nextActions: string[] = [];
  if (needsMoreMaterial) nextActions.push('Upload another lecture, chapter, or fuller note set before relying on this course as the main study source.');
  if (sections < 2) nextActions.push('Prefer notes with headings or slide structure so topic splitting becomes more reliable.');
  if (definitions + glossaryCount < 3) nextActions.push('Add glossary-heavy material or slides with explicit definitions to improve concept recognition.');
  if (workedExampleCount + formulaCount === 0) nextActions.push('Add solved exercises, worked examples, or problem sheets to strengthen practice-mode generation.');

  return {
    score,
    band,
    needsMoreMaterial,
    warnings: warnings.slice(0, 4),
    strengths: strengths.slice(0, 4),
    nextActions: nextActions.slice(0, 4),
    recommendedTopicCount,
    detectedTopicCount,
    finalTopicCount: detectedTopicCount,
    outlineAdjusted: false,
    metrics: {
      wordCount: words,
      sectionCount: sections,
      definitionCount: definitions,
      glossaryCount,
      keyphraseCount,
      workedExampleCount,
      formulaCount,
      comparisonCount,
      averageConceptsPerTopic: Number(avgConcepts.toFixed(2)),
    },
  };
}

export function adaptOutlineToSourceQuality(
  outline: GeneratedOutline,
  quality: CourseSourceQuality,
): { outline: GeneratedOutline; quality: CourseSourceQuality } {
  const targetCount = clamp(quality.recommendedTopicCount, 2, 8);
  if (outline.topics.length <= targetCount) {
    return {
      outline,
      quality: {
        ...quality,
        finalTopicCount: outline.topics.length,
      },
    };
  }

  const buckets: GeneratedTopic[][] = Array.from({ length: targetCount }, () => []);
  outline.topics.forEach((topic, index) => {
    const bucketIndex = Math.min(targetCount - 1, Math.floor((index * targetCount) / outline.topics.length));
    buckets[bucketIndex]!.push(topic);
  });

  const compacted: GeneratedTopic[] = [];
  for (const bucket of buckets) {
    if (bucket.length === 0) continue;
    compacted.push(mergeTopicBucket(bucket, compacted.length, compacted[compacted.length - 1]?.title));
  }

  const adjustedQuality: CourseSourceQuality = {
    ...quality,
    finalTopicCount: compacted.length,
    outlineAdjusted: compacted.length < outline.topics.length,
    warnings: compacted.length < outline.topics.length
      ? [
        `The outline was compacted from ${outline.topics.length} to ${compacted.length} modules to match current source density.`,
        ...quality.warnings,
      ].slice(0, 4)
      : quality.warnings,
  };

  return {
    outline: {
      ...outline,
      topics: compacted,
    },
    quality: adjustedQuality,
  };
}
