/**
 * Wave 3B — explainable weak-area reasons from Concept Bus + mastery.
 */

import type { Lang } from './i18n';
import type { WeakSpotRef } from './workspaceWeakAreas';
import {
  activityFor,
  type ConceptBusState,
  type ConceptSignal,
} from './workspaceConceptBus';

export type WeakAreaReason = {
  id: string;
  label: string;
  severity: 'high' | 'medium' | 'low';
};

const STRUGGLE_SIGNALS: ConceptSignal[] = [
  'quiz-wrong',
  'leitner-hard',
  'annotated-confusing',
];

const SIGNAL_COPY: Record<ConceptSignal, { en: (n: number) => string; el: (n: number) => string }> = {
  'quiz-wrong': {
    en: (n) => `${n}× quiz mistake${n > 1 ? 's' : ''}`,
    el: (n) => `${n}× λάθος κουίζ`,
  },
  'leitner-hard': {
    en: (n) => `${n}× hard card rating`,
    el: (n) => `${n}× δύσκολη κάρτα`,
  },
  'annotated-confusing': {
    en: (n) => `${n}× marked confusing`,
    el: (n) => `${n}× σημειώθηκε μπερδευτικό`,
  },
  focus: { en: () => '', el: () => '' },
  read: { en: () => '', el: () => '' },
  mapped: { en: () => '', el: () => '' },
  noted: { en: () => '', el: () => '' },
  annotated: { en: () => '', el: () => '' },
  explained: { en: () => '', el: () => '' },
  simulated: { en: () => '', el: () => '' },
  'quiz-correct': { en: () => '', el: () => '' },
  'leitner-easy': { en: () => '', el: () => '' },
  'annotated-exam': { en: () => '', el: () => '' },
};

function countSignals(signals: ConceptSignal[]): Partial<Record<ConceptSignal, number>> {
  const out: Partial<Record<ConceptSignal, number>> = {};
  for (const s of signals) {
    out[s] = (out[s] ?? 0) + 1;
  }
  return out;
}

export function buildWeakAreaReasons(
  concept: string,
  bus: ConceptBusState,
  lang: Lang,
  opts?: { mastery?: number; source?: WeakSpotRef['source'] },
): WeakAreaReason[] {
  const isEl = lang === 'el';
  const reasons: WeakAreaReason[] = [];
  const activity = activityFor(bus, concept);

  if (activity) {
    const counts = countSignals(activity.signals);
    for (const signal of STRUGGLE_SIGNALS) {
      const n = counts[signal] ?? 0;
      if (n <= 0) continue;
      const label = SIGNAL_COPY[signal][lang](n);
      if (!label) continue;
      reasons.push({
        id: signal,
        label,
        severity: signal === 'quiz-wrong' ? 'high' : 'medium',
      });
    }
    if (activity.struggleScore > 1 && reasons.length === 0) {
      reasons.push({
        id: 'struggle-score',
        label: isEl ? 'Συνολική δυσκολία στη συνεδρία' : 'Net struggle this session',
        severity: 'medium',
      });
    }
  }

  const mastery = opts?.mastery;
  if (mastery != null && mastery < 50) {
    reasons.push({
      id: 'low-mastery',
      label: isEl ? `Χαμηλό mastery (${mastery}%)` : `Low mastery (${mastery}%)`,
      severity: mastery < 35 ? 'high' : 'medium',
    });
  }

  if (opts?.source === 'bus' && reasons.length === 0) {
    reasons.push({
      id: 'session-weak',
      label: isEl ? 'Αδύναμο σήμα αυτή τη συνεδρία' : 'Weak signal this session',
      severity: 'low',
    });
  }

  return reasons.slice(0, 4);
}

export type WeakSpotWithReasons = WeakSpotRef & { reasons: WeakAreaReason[] };

export function enrichWeakSpotsWithReasons(
  spots: WeakSpotRef[],
  bus: ConceptBusState,
  lang: Lang,
): WeakSpotWithReasons[] {
  return spots.map((spot) => ({
    ...spot,
    reasons: buildWeakAreaReasons(spot.concept, bus, lang, {
      mastery: spot.mastery,
      source: spot.source,
    }),
  }));
}
