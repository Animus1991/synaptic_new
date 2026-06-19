import type { LearnerModel, DashboardStats, Task } from '../types';
import { findPendingTask } from './taskFlows';

export function buildMiniDashboardProps(
  learnerModel: LearnerModel,
  dashboardStats: DashboardStats,
  tasks: Task[],
  onStartTask?: (taskId: string) => void,
) {
  const weakSpots = learnerModel.weakAreas.slice(0, 5).map((s) => ({
    concept: s.concept,
    mastery: s.mastery,
    course: 'Microeconomics',
  }));

  const pendingReviews = tasks.filter((t) => t.isSpacedRepetition && t.status === 'pending');
  const nextPending = findPendingTask(tasks, () => true);

  const nextActions = [
    ...pendingReviews.slice(0, 2).map((t) => ({
      label: `Review: ${t.title.split('—')[0]?.trim() ?? t.title}`,
      type: 'review' as const,
      minutes: t.estimatedMinutes,
      xp: t.xpReward,
      taskId: t.id,
    })),
    ...learnerModel.weakAreas.slice(0, 2).map((s, i) => ({
      label: `Practice: ${s.concept}`,
      type: 'practice' as const,
      minutes: 12 + i * 3,
      xp: 35,
      taskId: nextPending?.id,
    })),
  ].slice(0, 4);

  const conceptsMastered = [
    ...learnerModel.strongAreas,
    ...learnerModel.almostKnown.filter((s) => s.mastery >= 60),
  ].length;

  return {
    readiness: Math.round(learnerModel.overallMastery),
    streak: dashboardStats.streak,
    reviewsDue: dashboardStats.reviewsDue,
    weakSpots,
    nextActions,
    conceptsMastered,
    totalConcepts: Math.max(conceptsMastered + learnerModel.weakAreas.length + 20, 100),
    onStartTask,
  };
}

export function buildConceptMapNodes(
  conceptBars: { concept: string; mastery: number }[],
  focusConcept?: string,
) {
  const defaults = [
    { id: 'sd', label: 'Supply & Demand', type: 'concept' as const, x: 140, y: 80 },
    { id: 'ct', label: 'Consumer Theory', type: 'theory' as const, x: 360, y: 60 },
    { id: 'el', label: 'Elasticity', type: 'formula' as const, x: 140, y: 240 },
    { id: 'ms', label: 'Market Structures', type: 'concept' as const, x: 380, y: 210 },
    { id: 'we', label: 'Welfare Econ', type: 'theory' as const, x: 560, y: 130 },
    { id: 'gt', label: 'Game Theory', type: 'concept' as const, x: 560, y: 300 },
  ];

  return defaults.map((n) => {
    const match = conceptBars.find((b) =>
      b.concept.toLowerCase().includes(n.label.toLowerCase().slice(0, 6))
      || n.label.toLowerCase().includes(b.concept.toLowerCase().slice(0, 6)),
    );
    return {
      ...n,
      mastery: match?.mastery ?? (n.label.toLowerCase().includes(focusConcept?.toLowerCase().slice(0, 6) ?? '') ? 45 : 0),
    };
  });
}

export function buildCompareRows(concept: string): [string, string, string][] {
  const c = concept.toLowerCase();
  if (c.includes('bertrand') || c.includes('cournot') || c.includes('market') || c.includes('oligopoly')) {
    return [
      ['Strategic variable', 'Output quantity q', 'Price p'],
      ['Nash equilibrium', 'q* above monopoly, below competitive', 'P = MC (homogeneous goods)'],
      ['Market power', 'Retained — firms earn profit', 'Eliminated — Bertrand Paradox'],
      ['Key assumption', 'Simultaneous quantity choice', 'No capacity constraints'],
    ];
  }
  if (c.includes('elastic')) {
    return [
      ['Definition', 'Responsiveness of Q to P', 'Unit-free ratio'],
      ['Formula', '%ΔQ / %ΔP', 'Always negative (normal goods)'],
      ['|E| > 1', 'Elastic — revenue falls when P rises', 'Luxury goods'],
      ['|E| < 1', 'Inelastic — revenue rises when P rises', 'Necessities'],
    ];
  }
  return [
    ['Core idea', concept, 'Related concept'],
    ['Application', 'Exam / problem solving', 'Real-world case'],
    ['Common error', 'Confusing with prerequisite', 'Skipping assumptions'],
    ['Next step', 'Practice problems', 'Spaced review'],
  ];
}

export function leitnerCardsFromSpacing(
  spacingIntervals: LearnerModel['spacingIntervals'],
  concept?: string,
): { front: string; back: string }[] {
  const cards = spacingIntervals.map((s) => ({
    front: s.concept,
    back: `Next review in ${Math.round(s.interval)} day(s) · stability ${Math.round(s.stability * 100)}%`,
  }));
  if (concept && !cards.some((c) => c.front.toLowerCase().includes(concept.toLowerCase().slice(0, 6)))) {
    cards.unshift({ front: concept, back: `Focus concept for this session: ${concept}` });
  }
  return cards.length > 0 ? cards : [
    { front: 'Cournot competition', back: 'Firms choose quantity simultaneously; price from market demand.' },
    { front: 'Bertrand Paradox', back: 'Two firms with identical products → P = MC.' },
  ];
}

export function readerTextFromUploads(
  uploadedFiles: { name: string; extractedText?: string; extractedTopics?: string[] }[],
  concept: string,
): string {
  const file = uploadedFiles.find((f) => f.extractedText && f.extractedText.trim().length > 50);
  if (file?.extractedText) {
    return file.extractedText.slice(0, 12000);
  }
  const legacy = uploadedFiles.find((f) => f.extractedTopics?.length);
  const topics = legacy?.extractedTopics?.join(', ') ?? concept;
  return `Source: ${legacy?.name ?? 'Course material'} — topics: ${topics}.

In oligopoly theory, firms interact strategically because each firm's profit depends on rivals' choices. The Cournot model assumes firms compete on quantity: each chooses output simultaneously, and the market price clears total supply against demand.

The Bertrand model instead assumes price competition. With homogeneous products, any firm charging above marginal cost loses all customers to a slightly cheaper rival. This yields the famous Bertrand Paradox: two firms are enough to drive price down to marginal cost.

Focus concept for this session: ${concept}. Product differentiation, capacity constraints, and repeated interaction can restore market power even under Bertrand-style price setting.`;
}
