import type { Lang } from './i18n';
import type { WorkspaceToolId } from './taskFlows';
import type { WorkspaceCorrelation } from './workspaceCorrelation';
import type { WorkspaceSourceIntelligence } from './workspaceNoteContent';
import type { NextActionRecommendation } from './nextActionEngine';
import { applyNextActionToDiscoverability } from './discoverabilityNextActionSync';

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
    title: 'Parametric Sandbox',
    summary: 'Economics equilibrium or numeric cues from your notes; sensitivity heatmap shows which parameter matters most.',
    features: ['Note-grounded sliders', 'P* sensitivity heatmap', 'Auto-detects most sensitive parameter'],
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
    summary: 'Tables from your notes; sort columns, highlight diffs vs focus row, export CSV.',
    features: ['Focus-term highlight', 'Sortable columns', 'Diff highlight + CSV [≠]'],
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
    summary: 'Explain in simple terms; rubric scores accuracy/completeness; gap terms jump to Reader.',
    features: ['Gap → Reader', 'Rubric PDF export', 'Voice input + auto-gap'],
    quickActionIds: ['open-reader-focus'],
  },
  timer: {
    title: 'Study Timer',
    summary: 'Focus sessions bound to concept/step; exam countdown with calendar .ics export.',
    features: ['Concept/step label', 'Exam countdown', 'Calendar .ics'],
    quickActionIds: [],
  },
  debate: {
    title: 'Argument Map',
    summary: 'Claim tree from notes; counter-arguments grounded in source; interactive rebuttal graph.',
    features: ['Claim → Reader', 'Counter-args', 'Rebuttal graph'],
    quickActionIds: ['open-reader-focus'],
  },
  reader: {
    title: 'Reader',
    summary: 'BM25 excerpt, dyslexia mode, bilingual sync, paragraph TTS, OCR overlay for scans.',
    features: ['Bilingual paragraph sync', 'Paragraph TTS + scroll', 'OCR overlay'],
    quickActionIds: ['open-reader-focus'],
  },
  scratchpad: {
    title: 'Formula Scratchpad',
    summary: 'Formulas from notes; step solver, graph plot, send to whiteboard.',
    features: ['KaTeX + whiteboard bridge', 'CAS graph plot'],
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
    title: 'Παράμετρος sandbox',
    summary: 'Οικονομική ισορροπία ή αριθμητικά cues από σημειώσεις· heatmap ευαισθησίας.',
    features: ['Sliders από σημειώσεις', 'Heatmap ευαισθησίας'],
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
    summary: 'Πίνακες από σημειώσεις· ταξινόμηση, diff vs focus row, CSV export.',
    features: ['Εστίαση όρου', 'Sortable columns', 'Diff + CSV'],
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
    summary: 'Εξήγηση με απλά λόγια· rubric· κενά → Reader· φωνητική εισαγωγή.',
    features: ['Gap → Reader', 'Rubric PDF', 'Voice + auto-gap'],
    quickActionIds: ['open-reader-focus'],
  },
  timer: {
    title: 'Χρονόμετρο',
    summary: 'Συνεδρίες + exam countdown· εξαγωγή .ics ημερολογίου.',
    features: ['Concept/step', 'Exam countdown', 'Calendar .ics'],
    quickActionIds: [],
  },
  debate: {
    title: 'Argument Map',
    summary: 'Δέντρο ισχυρισμών· counter-args· interactive rebuttal graph.',
    features: ['Claim → Reader', 'Counter-args', 'Rebuttal graph'],
    quickActionIds: ['open-reader-focus'],
  },
  reader: {
    title: 'Ανάγνωση',
    summary: 'BM25 απόσπασμα, dyslexia, bilingual sync, TTS ανά παράγραφο, OCR overlay.',
    features: ['Bilingual sync', 'Paragraph TTS', 'OCR overlay'],
    quickActionIds: ['open-reader-focus'],
  },
  scratchpad: {
    title: 'Scratchpad τύπων',
    summary: 'Τύποι από σημειώσεις· solver, γράφημα, αποστολή στον πίνακα.',
    features: ['KaTeX + board', 'Graph plot'],
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
      headline: lang === 'el' ? 'Ανέβασε σημειώσεις για πλήρη εργαλεία' : 'Upload notes to unlock all tools',
      subline: lang === 'el'
        ? 'Χωρίς πηγή (>80 χαρακτήρες) τα εργαλεία μένουν κενά — όχι demo.'
        : 'Without source text (80+ chars) tools stay empty — no demo filler.',
      chips,
      toolGuide: baseGuide,
      recommendedTool: null,
      nextAction: null,
    };
  }

  const headline = lang === 'el'
    ? `Grounded workspace · σκορ πηγών ${sourceIntel?.score ?? '—'}/100`
    : `Grounded workspace · source score ${sourceIntel?.score ?? '—'}/100`;

  const fallbackSubline = sourceIntel?.bestToolReason
    ?? (lang === 'el' ? 'Όλα τα εργαλεία συνδέονται μέσω correlation bus.' : 'All tools share the correlation bus.');

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
