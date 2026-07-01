/**
 * §5.B7 — Six-gate course quality rubric before marking a course ready.
 */

import type { ConceptSpan, Course, CourseSourceQuality } from '../types';
import type { GeneratedOutline } from './courseGenerator';
import { normalizeConcept } from './contentAnalysis';

export type QualityGateId =
  | 'coverage'
  | 'grounding'
  | 'ordering'
  | 'assessment'
  | 'readability'
  | 'determinism';

export type QualityGateResult = {
  id: QualityGateId;
  pass: boolean;
  score: number;
  detail: string;
};

export type CourseQualityReport = {
  gates: QualityGateResult[];
  overallScore: number;
  passes: boolean;
  warnings: string[];
  recommendations: string[];
};

const PASS_THRESHOLD = 58;
const CRITICAL_GATES: QualityGateId[] = ['coverage', 'grounding'];

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function conceptInSource(concept: string, sourceText: string): boolean {
  const norm = normalizeConcept(concept);
  if (!norm || norm.length < 3) return false;
  const hay = sourceText.toLowerCase();
  return hay.includes(norm) || hay.includes(norm.slice(0, Math.max(4, norm.length - 2)));
}

function gateCoverage(outline: GeneratedOutline): QualityGateResult {
  const topics = outline.topics;
  if (topics.length === 0) {
    return { id: 'coverage', pass: false, score: 0, detail: 'No topics generated' };
  }
  const empty = topics.filter((t) => t.concepts.length === 0);
  const placed = topics.reduce((s, t) => s + t.concepts.length, 0);
  const unique = new Set(topics.flatMap((t) => t.concepts.map((c) => normalizeConcept(c))).filter(Boolean));
  const base = (placed / Math.max(topics.length * 2, 1)) * 70;
  const breadth = Math.min(20, unique.size * 3);
  const penalty = empty.length * 18;
  const score = clampScore(base + breadth - penalty);
  return {
    id: 'coverage',
    pass: empty.length === 0 && unique.size >= Math.min(3, topics.length),
    score,
    detail:
      empty.length > 0
        ? `${empty.length} module(s) lack concepts`
        : `${unique.size} concepts across ${topics.length} modules`,
  };
}

function gateGrounding(
  outline: GeneratedOutline,
  sourceText: string | undefined,
  sourceQuality: CourseSourceQuality | undefined,
  conceptSpans: ConceptSpan[] | undefined,
): QualityGateResult {
  const concepts = [...new Set(outline.topics.flatMap((t) => t.concepts))].filter(Boolean);
  if (concepts.length === 0) {
    return { id: 'grounding', pass: false, score: 20, detail: 'No concepts to ground' };
  }

  if (conceptSpans && conceptSpans.length > 0) {
    const grounded = new Set(conceptSpans.map((s) => normalizeConcept(s.concept)));
    const ratio = concepts.filter((c) => grounded.has(normalizeConcept(c))).length / concepts.length;
    const score = clampScore(ratio * 100);
    return {
      id: 'grounding',
      pass: ratio >= 0.35,
      score,
      detail: `${Math.round(ratio * 100)}% of concepts have source spans`,
    };
  }

  if (sourceText && sourceText.trim().length > 80) {
    const ratio =
      concepts.filter((c) => conceptInSource(c, sourceText)).length / concepts.length;
    const score = clampScore(ratio * 95);
    return {
      id: 'grounding',
      pass: ratio >= 0.4,
      score,
      detail: `${Math.round(ratio * 100)}% of concepts found in source text`,
    };
  }

  const sq = sourceQuality?.score ?? 0;
  const score = clampScore(sq * 0.85);
  return {
    id: 'grounding',
    pass: sq >= 42,
    score,
    detail: sq > 0 ? `Source quality signal ${sq}/100` : 'No source grounding signal',
  };
}

function gateOrdering(outline: GeneratedOutline): QualityGateResult {
  const titleToIndex = new Map(outline.topics.map((t, i) => [t.title.toLowerCase(), i]));
  let violations = 0;
  for (const [idx, topic] of outline.topics.entries()) {
    for (const prereq of topic.prerequisites) {
      const pIdx = titleToIndex.get(prereq.toLowerCase());
      if (pIdx != null && pIdx >= idx) violations += 1;
    }
  }
  const score = clampScore(100 - violations * 25);
  return {
    id: 'ordering',
    pass: violations === 0,
    score,
    detail: violations > 0 ? `${violations} prerequisite ordering issue(s)` : 'Prerequisite order is acyclic',
  };
}

function gateAssessment(outline: GeneratedOutline, exerciseCount?: number): QualityGateResult {
  const withObjectives = outline.topics.filter((t) => (t.objectives?.length ?? 0) > 0).length;
  const glossaryOk = outline.glossary.length >= outline.topics.length;
  const exerciseOk = (exerciseCount ?? 0) >= outline.topics.length;
  const objRatio = outline.topics.length > 0 ? withObjectives / outline.topics.length : 0;
  let score = clampScore(objRatio * 55 + (glossaryOk ? 25 : 0) + (exerciseOk ? 20 : 0));
  const pass = objRatio >= 0.3 || glossaryOk || exerciseOk;
  return {
    id: 'assessment',
    pass,
    score,
    detail: pass
      ? 'Objectives, glossary, or exercises present'
      : 'Add objectives or glossary entries for assessment alignment',
  };
}

function looksLikeRawKeyphrase(title: string): boolean {
  const t = title.trim();
  if (t.length < 4) return true;
  if (t === t.toUpperCase() && t.length > 12) return true;
  const words = t.split(/\s+/);
  if (words.length === 1 && words[0]!.length > 28) return true;
  return false;
}

function gateReadability(outline: GeneratedOutline): QualityGateResult {
  const titles = [outline.title, ...outline.topics.map((t) => t.title)];
  const bad = titles.filter((t) => looksLikeRawKeyphrase(t) || t.length > 72).length;
  const score = clampScore(100 - bad * 22);
  return {
    id: 'readability',
    pass: bad === 0,
    score,
    detail: bad > 0 ? `${bad} title(s) need editing` : 'Titles and objectives read cleanly',
  };
}

function gateDeterminism(outline: GeneratedOutline): QualityGateResult {
  const stable =
    outline.topics.length > 0
    && outline.topics.every((t) => t.title.trim().length >= 3)
    && outline.title.trim().length >= 3;
  return {
    id: 'determinism',
    pass: stable,
    score: stable ? 85 : 40,
    detail: stable ? 'Outline structure is stable for persistence' : 'Outline structure is incomplete',
  };
}

export function evaluateCourseQuality(opts: {
  outline: GeneratedOutline;
  sourceText?: string;
  sourceQuality?: CourseSourceQuality;
  conceptSpans?: ConceptSpan[];
  exerciseCount?: number;
}): CourseQualityReport {
  const gates: QualityGateResult[] = [
    gateCoverage(opts.outline),
    gateGrounding(opts.outline, opts.sourceText, opts.sourceQuality, opts.conceptSpans),
    gateOrdering(opts.outline),
    gateAssessment(opts.outline, opts.exerciseCount),
    gateReadability(opts.outline),
    gateDeterminism(opts.outline),
  ];

  const overallScore = clampScore(gates.reduce((s, g) => s + g.score, 0) / gates.length);
  const criticalFail = gates.some((g) => CRITICAL_GATES.includes(g.id) && !g.pass);
  const passes = !criticalFail && overallScore >= PASS_THRESHOLD;

  const warnings: string[] = [];
  const recommendations: string[] = [];
  for (const g of gates.filter((x) => !x.pass)) {
    warnings.push(`${g.id}: ${g.detail}`);
  }
  if (!passes) {
    recommendations.push('Upload fuller notes with headings, definitions, and worked examples.');
    if (gates.find((g) => g.id === 'grounding' && !g.pass)) {
      recommendations.push('Add more source material so concepts can link to provenance spans.');
    }
    if (gates.find((g) => g.id === 'coverage' && !g.pass)) {
      recommendations.push('Use clearer section headings so topics map to your material.');
    }
  }

  return { gates, overallScore, passes, warnings, recommendations };
}

export function resolveCourseStatus(report: CourseQualityReport): Course['status'] {
  return report.passes ? 'ready' : 'needs_review';
}

export function applyQualityGatesToCourse(
  course: Course,
  outline: GeneratedOutline,
  sourceText?: string,
): Course {
  const qualityReport = evaluateCourseQuality({
    outline,
    sourceText,
    sourceQuality: course.sourceQuality,
    conceptSpans: course.conceptSpans,
    exerciseCount: course.exerciseCount,
  });
  return {
    ...course,
    status: resolveCourseStatus(qualityReport),
    qualityReport,
  };
}
