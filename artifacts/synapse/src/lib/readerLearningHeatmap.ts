/**
 * Wave 6.1 — Reader learning heatmap from Concept Bus + step marks (not word-count proxy).
 */

import type { ReaderSegment } from './readerDocumentLayout';
import type { ConceptBusState, ConceptSignal } from './workspaceConceptBus';
import { activityFor, normalizeConceptBusState } from './workspaceConceptBus';
import { normalizeFocusTerm } from './workspaceFocus';

export type ReaderHeatmapLevel = 'none' | 'low' | 'medium' | 'high';

export type ReaderSegmentHeat = {
  segmentIndex: number;
  score: number;
  level: ReaderHeatmapLevel;
  reasons: string[];
};

const STRUGGLE_WEIGHT: Partial<Record<ConceptSignal, number>> = {
  'quiz-wrong': 3,
  'annotated-confusing': 2,
  'leitner-hard': 2,
};

function levelForScore(score: number): ReaderHeatmapLevel {
  if (score <= 0) return 'none';
  if (score < 2) return 'low';
  if (score < 5) return 'medium';
  return 'high';
}

function segmentHaystack(seg: ReaderSegment): string {
  const text = seg.kind === 'heading' ? seg.content : seg.content;
  return normalizeFocusTerm(text);
}

function conceptMentionsSegment(concept: string, haystack: string): boolean {
  const key = normalizeFocusTerm(concept);
  if (!key || key.length < 3) return false;
  return haystack.includes(key) || key.split(/\s+/).some((w) => w.length >= 4 && haystack.includes(w));
}

export function buildReaderLearningHeatmap(input: {
  segments: ReaderSegment[];
  conceptBus?: ConceptBusState | null;
  primaryConcept?: string;
  stepMarks?: Record<number, 'understood' | 'confusing'>;
  stepTitles?: string[];
  stepToSegmentIndex?: Record<number, number>;
}): ReaderSegmentHeat[] {
  const bus = normalizeConceptBusState(input.conceptBus ?? {});
  const scores = new Map<number, { score: number; reasons: string[] }>();

  const bump = (index: number, amount: number, reason: string) => {
    if (index < 0 || index >= input.segments.length) return;
    const prev = scores.get(index) ?? { score: 0, reasons: [] };
    prev.score += amount;
    if (!prev.reasons.includes(reason)) prev.reasons.push(reason);
    scores.set(index, prev);
  };

  for (const [key, activity] of Object.entries(bus)) {
    const struggleHits = activity.signals.filter((s) => STRUGGLE_WEIGHT[s]);
    if (struggleHits.length === 0) continue;

    let struggle = 0;
    for (const s of struggleHits) {
      struggle += STRUGGLE_WEIGHT[s] ?? 1;
    }

    input.segments.forEach((seg, i) => {
      const hay = segmentHaystack(seg);
      if (conceptMentionsSegment(activity.concept, hay) || hay.includes(key)) {
        bump(i, struggle, activity.concept);
      }
    });
  }

  if (input.primaryConcept) {
    const primary = activityFor(bus, input.primaryConcept);
    if (primary && primary.struggleScore > 0) {
      input.segments.forEach((seg, i) => {
        if (conceptMentionsSegment(input.primaryConcept!, segmentHaystack(seg))) {
          bump(i, primary.struggleScore, input.primaryConcept!);
        }
      });
    }
  }

  const marks = input.stepMarks ?? {};
  const stepToSeg = input.stepToSegmentIndex ?? {};
  const titles = input.stepTitles ?? [];
  for (const [stepStr, mark] of Object.entries(marks)) {
    if (mark !== 'confusing') continue;
    const step = Number(stepStr);
    let segIdx = stepToSeg[step];
    if (segIdx == null && titles[step]) {
      const titleKey = normalizeFocusTerm(titles[step]);
      segIdx = input.segments.findIndex(
        (s) => s.kind === 'heading' && normalizeFocusTerm(s.content).includes(titleKey.slice(0, 24)),
      );
    }
    if (segIdx != null && segIdx >= 0) {
      bump(segIdx, 5, titles[step] ? `confusing: ${titles[step]}` : 'marked confusing');
      if (input.segments[segIdx + 1]?.kind === 'paragraph' || input.segments[segIdx + 1]?.kind === 'list') {
        bump(segIdx + 1, 2, 'section body');
      }
    }
  }

  return input.segments.map((_, segmentIndex) => {
    const entry = scores.get(segmentIndex) ?? { score: 0, reasons: [] };
    return {
      segmentIndex,
      score: entry.score,
      level: levelForScore(entry.score),
      reasons: entry.reasons.slice(0, 3),
    };
  });
}

export function readerHeatmapLevelClass(level: ReaderHeatmapLevel): string {
  switch (level) {
    case 'high':
      return 'border-l-2 border-accent-rose bg-accent-rose/15';
    case 'medium':
      return 'border-l-2 border-accent-amber bg-accent-amber/12';
    case 'low':
      return 'border-l-2 border-brand-400/50 bg-brand-600/8';
    default:
      return '';
  }
}
