import { t, type Lang } from '../../lib/i18n';
import type { WorkspaceToolId } from '../../lib/taskFlows';
import type { WorkspaceCorrelation } from '../../lib/workspaceCorrelation';
import type { WorkspaceSourceIntelligence } from '../../lib/workspaceNoteContent';
import type { NextActionRecommendation } from '../../lib/nextActionEngine';
import { applyNextActionToDiscoverability } from '../../lib/discoverabilityNextActionSync';

export type CorrelationChip = {
  id: string;
  label: string;
  value: string;
  active: boolean;
};

export type ToolFeatureGuide = {
  toolId: WorkspaceToolId;
  title: string;
  summary: string;
  features: string[];
  quickActionIds: DiscoverabilityActionId[];
};

export type DiscoverabilityActionId =
  | 'open-recommended-tool'
  | 'open-reader-focus'
  | 'open-leitner-due'
  | 'jump-quiz'
  | 'open-compare'
  | 'open-command-palette'
  | 'jump-spaced-step';

const TOOL_GUIDES_EN: Record<WorkspaceToolId, Omit<ToolFeatureGuide, 'toolId'>> = {
  'concept-map': {
    title: 'Concept Map',
    summary: 'Drag nodes, force/hierarchy layout, mastery colors — click a node to focus the Reader.',
    features: ['Force + hierarchical layout', 'PNG export', 'Focus → Reader deep link'],
    quickActionIds: ['open-reader-focus'],
  },
  simulator: {
    title: 'What-if sandbox',
    summary: 'Move sliders, watch the graph, try presets — then practice under a timer.',
    features: ['What-if presets', 'Live graph + numbers', 'Timed practice block'],
    quickActionIds: ['open-reader-focus'],
  },
  leitner: {
    title: 'Leitner / FSRS',
    summary: 'Flashcards from glossary + spacing bus; due cards float first with 7-day heatmap.',
    features: ['Keyboard 1–4 ratings', 'Anki export', 'Deck sync + due heatmap'],
    quickActionIds: ['open-leitner-due'],
  },
  compare: {
    title: 'Compare',
    summary: 'See two ideas side by side — highlight what differs, then ask the Tutor.',
    features: ['Side-by-side table', 'Highlight differences', 'Download CSV'],
    quickActionIds: ['open-compare', 'open-reader-focus'],
  },
  whiteboard: {
    title: 'Whiteboard',
    summary: 'Layers, scratchpad import, LaTeX stamp library from note formulas.',
    features: ['Scratchpad → board', 'Layers v2', 'LaTeX stamps'],
    quickActionIds: [],
  },
  feynman: {
    title: 'Feynman',
    summary: 'Teach the idea in plain words; get a friendly score; jump gaps to Reader.',
    features: ['Gaps → Reader', 'Score report export', 'Voice + missing bits'],
    quickActionIds: ['open-reader-focus'],
  },
  timer: {
    title: 'Timer',
    summary: 'Focus blocks and an exam countdown tied to what you are studying.',
    features: ['Start focus', 'Exam countdown', 'Save to calendar'],
    quickActionIds: [],
  },
  debate: {
    title: 'Debate',
    summary: 'Map claims from your notes, add counters, and keep your replies.',
    features: ['Open in Reader', 'Suggested counters', 'Saved replies'],
    quickActionIds: ['open-reader-focus'],
  },
  reader: {
    title: 'Reader',
    summary: 'BM25 excerpt, dyslexia mode, bilingual sync, paragraph TTS, OCR overlay for scans.',
    features: ['Bilingual paragraph sync', 'Paragraph TTS + scroll', 'OCR overlay'],
    quickActionIds: ['open-reader-focus'],
  },
  scratchpad: {
    title: 'Scratchpad',
    summary: 'Try a formula from your notes, fill in numbers, and check each step.',
    features: ['Step check', 'Graph', 'Send to whiteboard'],
    quickActionIds: [],
  },
  annotations: {
    title: 'Annotations',
    summary: 'Highlights + margin notes; teacher shared notes with SSE stream fallback.',
    features: ['Margin notes', 'Realtime SSE + poll', 'Focus term tags'],
    quickActionIds: [],
  },
  quiz: {
    title: 'Quiz',
    summary: 'Test your knowledge',
    features: ['Adaptive quiz', 'IRT tracking'],
    quickActionIds: ['jump-quiz'],
  },
  dashboard: {
    title: 'Dashboard',
    summary: 'Your progress',
    features: ['Review due cards', 'Mastery'],
    quickActionIds: [],
  },
};

const TOOL_GUIDES_EL: Record<WorkspaceToolId, Omit<ToolFeatureGuide, 'toolId'>> = {
  'concept-map': {
    title: 'Χάρτης εννοιών',
    summary: 'Σύρσιμο κόμβων, force/hierarchy layout — κλικ σε κόμβο → Reader με εστίαση.',
    features: ['Force + ιεραρχικό layout', 'PNG export', 'Focus → Reader'],
    quickActionIds: ['open-reader-focus'],
  },
  simulator: {
    title: 'Τι θα γινόταν αν…',
    summary: 'Κούνα διακόπτες, δες το γράφημα, δοκίμασε προεπιλογές — μετά εξάσκηση με χρονόμετρο.',
    features: ['Προεπιλογές σεναρίων', 'Ζωντανό γράφημα', 'Χρονισμένο μπλοκ'],
    quickActionIds: ['open-reader-focus'],
  },
  leitner: {
    title: 'Leitner / FSRS',
    summary: 'Κάρτες από glossary + spacing· ληξιπρόθεσμα πρώτα + heatmap 7 ημερών.',
    features: ['Πληκτρολόγιο 1–4', 'Anki export', 'Deck sync + heatmap'],
    quickActionIds: ['open-leitner-due'],
  },
  compare: {
    title: 'Σύγκριση',
    summary: 'Δες δύο ιδέες δίπλα-δίπλα — τόνισε τι διαφέρει, μετά ρώτα τον βοηθό.',
    features: ['Πίνακας δίπλα-δίπλα', 'Δείξε διαφορές', 'Λήψη CSV'],
    quickActionIds: ['open-compare', 'open-reader-focus'],
  },
  whiteboard: {
    title: 'Πίνακας',
    summary: 'Επίπεδα, scratchpad import, βιβλιοθήκη LaTeX stamps από τύπους σημειώσεων.',
    features: ['Scratchpad → board', 'Layers v2', 'LaTeX stamps'],
    quickActionIds: [],
  },
  feynman: {
    title: 'Feynman',
    summary: 'Δίδαξε την ιδέα με απλά λόγια· φιλικό σκορ· κενά → Reader.',
    features: ['Κενά → Reader', 'Εξαγωγή αναφοράς score', 'Φωνή + ελλείψεις'],
    quickActionIds: ['open-reader-focus'],
  },
  timer: {
    title: 'Χρονόμετρο',
    summary: 'Μπλοκ εστίασης και αντίστροφη μέτρηση μέχρι την εξέταση.',
    features: ['Έναρξη εστίασης', 'Αντίστροφη εξέτασης', 'Αποθήκευση στο ημερολόγιο'],
    quickActionIds: [],
  },
  debate: {
    title: 'Συζήτηση',
    summary: 'Χάρτης ισχυρισμών από τις σημειώσεις, αντίλογος και αποθηκευμένες απαντήσεις.',
    features: ['Άνοιγμα στην Ανάγνωση', 'Προτεινόμενα αντίθετα', 'Αποθηκευμένες απαντήσεις'],
    quickActionIds: ['open-reader-focus'],
  },
  reader: {
    title: 'Ανάγνωση',
    summary: 'BM25 απόσπασμα, dyslexia, bilingual sync, TTS ανά παράγραφο, OCR overlay.',
    features: ['Bilingual sync', 'Paragraph TTS', 'OCR overlay'],
    quickActionIds: ['open-reader-focus'],
  },
  scratchpad: {
    title: 'Πρόχειρο',
    summary: 'Δοκίμασε τύπο από τις σημειώσεις, βάλε τιμές και έλεγξε κάθε βήμα.',
    features: ['Έλεγχος βημάτων', 'Γράφημα', 'Στον πίνακα'],
    quickActionIds: [],
  },
  annotations: {
    title: 'Σημειώσεις',
    summary: 'Highlights + margin notes· shared teacher SSE stream.',
    features: ['Margin notes', 'SSE + poll'],
    quickActionIds: [],
  },
  quiz: {
    title: 'Κουίζ',
    summary: 'Τεστ γνώσεων',
    features: ['Προσαρμοστικό', 'IRT tracking'],
    quickActionIds: ['jump-quiz'],
  },
  dashboard: {
    title: 'Ταμπλό',
    summary: 'Η πρόοδος σου',
    features: ['Κάρτες', 'Εκμάθηση'],
    quickActionIds: [],
  },
};

export function buildCorrelationChips(
  correlation: WorkspaceCorrelation,
  lang: Lang,
): CorrelationChip[] {
  const el = lang === 'el';
  return [
    {
      id: 'mastery',
      label: el ? 'Εξοικείωση' : 'Mastery',
      value: `${correlation.conceptMastery}%`,
      active: correlation.conceptMastery > 0,
    },
    {
      id: 'focus',
      label: el ? 'Εστίαση' : 'Focus',
      value: correlation.focusTerm?.slice(0, 18) ?? correlation.concept.slice(0, 18),
      active: Boolean(correlation.focusTerm),
    },
    {
      id: 'leitner',
      label: 'Leitner',
      value: correlation.leitnerDueCount > 0 ? `${correlation.leitnerDueCount} ${el ? 'ληξ.' : 'due'}` : '—',
      active: correlation.leitnerDueCount > 0,
    },
    {
      id: 'quiz-irt',
      label: 'IRT θ',
      value: correlation.quizAbility.toFixed(2),
      active: correlation.quizAbility !== 0,
    },
    {
      id: 'spaced',
      label: el ? 'Spaced' : 'Spaced',
      value: correlation.dueStepIndices.length > 0 ? String(correlation.dueStepIndices.length) : '—',
      active: correlation.dueStepIndices.length > 0,
    },
    {
      id: 'sandbox',
      label: el ? 'Ευαισθ.' : 'Sensitivity',
      value: correlation.sandboxTopSensitivityCue?.slice(0, 10) ?? '—',
      active: Boolean(correlation.sandboxTopSensitivityCue),
    },
  ];
}

export function buildToolFeatureGuide(
  toolId: WorkspaceToolId,
  lang: Lang,
): ToolFeatureGuide {
  const base = lang === 'el' ? TOOL_GUIDES_EL[toolId] : TOOL_GUIDES_EN[toolId];
  return { toolId, ...base };
}

export type DiscoverabilitySummary = {
  grounded: boolean;
  headline: string;
  subline: string;
  chips: CorrelationChip[];
  toolGuide: ToolFeatureGuide;
  recommendedTool: WorkspaceToolId | null;
  /** Wave 5C — engine recommendation mirrored for panel + context strip harmony */
  nextAction: NextActionRecommendation | null;
};

export function buildDiscoverabilitySummary(
  hasSource: boolean,
  sourceIntel: WorkspaceSourceIntelligence | null,
  correlation: WorkspaceCorrelation,
  activeTool: WorkspaceToolId,
  lang: Lang,
  nextAction?: NextActionRecommendation | null,
): DiscoverabilitySummary {
  const baseGuide = buildToolFeatureGuide(activeTool, lang);
  const chips = buildCorrelationChips(correlation, lang);

  if (!hasSource) {
    return {
      grounded: false,
      headline: t('discoverUploadHeadline', lang),
      subline: t('discoverUploadSubline', lang),
      chips,
      toolGuide: baseGuide,
      recommendedTool: null,
      nextAction: null,
    };
  }

  const headline = t('discoverGroundedHeadline', lang)
    .replace('{score}', String(sourceIntel?.score ?? '—'));

  const fallbackSubline = sourceIntel?.bestToolReason
    ?? t('discoverCorrelationBusFallback', lang);

  const synced = applyNextActionToDiscoverability({
    nextAction,
    sourceBestTool: sourceIntel?.bestTool ?? null,
    subline: fallbackSubline,
    quickActionIds: baseGuide.quickActionIds,
  });

  return {
    grounded: true,
    headline,
    subline: synced.subline,
    chips,
    toolGuide: { ...baseGuide, quickActionIds: synced.quickActionIds },
    recommendedTool: synced.recommendedTool,
    nextAction: synced.nextAction,
  };
}
