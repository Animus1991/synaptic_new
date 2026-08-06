import { t, type Lang } from './i18n';
import type { WorkspaceToolId } from './taskFlows';
import { WORKSPACE_TOOL_CROSS_LINKS } from './workspaceToolCrossLinks';

/** Tools that render `WorkspaceEmptyState` when extraction yields nothing. */
export type WorkspaceEmptyTool =
  | 'reader'
  | 'scratchpad'
  | 'debate'
  | 'compare'
  | 'quiz'
  | 'simulator'
  | 'whiteboard'
  | 'leitner'
  | 'timer'
  | 'dashboard'
  | 'concept-map'
  | 'annotations'
  | 'feynman'
  | 'lesson'
  | 'discover'
  | 'weak-areas';

export function workspaceNoSourceMessage(lang: Lang): string {
  return t('workspaceNoSource', lang);
}

export function workspaceEmptyTitle(opts: { hasSource: boolean; lang: Lang }): string {
  return t(opts.hasSource ? 'workspaceEmptyTitleNoExtract' : 'workspaceEmptyTitleNoSource', opts.lang);
}

export type WorkspaceEmptyView = {
  title: string;
  message: string;
  hasSource: boolean;
  actions: WorkspaceEmptyAction[];
};

/** Full empty-state view model for a workspace tool (§2.7). */
export function buildWorkspaceEmptyView(opts: {
  tool: WorkspaceEmptyTool;
  hasSource: boolean;
  lang: Lang;
  concept?: string;
  onUpload?: () => void;
  onReprocess?: () => void;
  onSwitchTool?: (tool: WorkspaceToolId) => void;
}): WorkspaceEmptyView {
  const hasSource = opts.hasSource;
  return {
    title: workspaceEmptyTitle({ hasSource, lang: opts.lang }),
    message: workspaceToolEmptyMessage({
      tool: opts.tool,
      hasSource,
      lang: opts.lang,
      concept: opts.concept,
    }),
    hasSource,
    actions: buildWorkspaceEmptyActions(opts),
  };
}

const NO_EXTRACT: Record<WorkspaceEmptyTool, { en: (concept?: string) => string; el: (concept?: string) => string }> = {
  reader: {
    en: (c) =>
      c
        ? `Nothing readable for «${c}» yet — try another topic from the lesson rail, or refresh notes.`
        : 'Nothing readable for this step yet — pick another topic or refresh your notes.',
    el: (c) =>
      c
        ? `Δεν υπάρχει ακόμα κείμενο για «${c}» — δοκίμασε άλλο θέμα από τη ράβδο μαθήματος ή ανανέωσε τις σημειώσεις.`
        : 'Δεν υπάρχει ακόμα κείμενο για αυτό το βήμα — διάλεξε άλλο θέμα ή ανανέωσε τις σημειώσεις.',
  },
  scratchpad: {
    en: (c) =>
      c
        ? `Nothing pulled from your notes for «${c}» yet — type a formula below and we’ll check the steps with you.`
        : 'Nothing pulled from your notes yet — type a formula below and we’ll check the steps with you.',
    el: (c) =>
      c
        ? `Δεν βρήκαμε τύπο για «${c}» ακόμα — γράψε έναν παρακάτω και θα ελέγξουμε τα βήματα μαζί.`
        : 'Δεν βρήκαμε τύπο στις σημειώσεις σου ακόμα — γράψε έναν παρακάτω και θα ελέγξουμε τα βήματα μαζί.',
  },
  debate: {
    en: (c) =>
      c
        ? `No claims yet for «${c}» — start one below, or pick another topic.`
        : 'No claims yet from your notes — start one below, or try another topic.',
    el: (c) =>
      c
        ? `Δεν υπάρχουν ισχυρισμοί για «${c}» ακόμα — ξεκίνα έναν παρακάτω, ή διάλεξε άλλο θέμα.`
        : 'Δεν υπάρχουν ισχυρισμοί από τις σημειώσεις ακόμα — ξεκίνα έναν παρακάτω, ή δοκίμασε άλλο θέμα.',
  },
  compare: {
    en: (c) =>
      c
        ? `Nothing to compare for «${c}» yet — pick a section with two related ideas, or reprocess your notes.`
        : 'Nothing to compare yet — pick a section with two related ideas, or reprocess your notes.',
    el: (c) =>
      c
        ? `Δεν υπάρχει σύγκριση για «${c}» ακόμα — διάλεξε ενότητα με δύο σχετικές ιδέες, ή ξαναεπεξεργάσου τις σημειώσεις.`
        : 'Δεν υπάρχει σύγκριση ακόμα — διάλεξε ενότητα με δύο σχετικές ιδέες, ή ξαναεπεξεργάσου τις σημειώσεις.',
  },
  quiz: {
    en: (c) =>
      c
        ? `No questions yet for «${c}». Reprocess your notes, or pick a section with clearer definitions.`
        : 'No questions yet. Reprocess your notes, or open a section with clearer definitions.',
    el: (c) =>
      c
        ? `Δεν υπάρχουν ακόμα ερωτήσεις για «${c}». Κάνε Reprocess, ή διάλεξε ενότητα με πιο καθαρούς ορισμούς.`
        : 'Δεν υπάρχουν ακόμα ερωτήσεις. Κάνε Reprocess, ή άνοιξε ενότητα με πιο καθαρούς ορισμούς.',
  },
  simulator: {
    en: (c) =>
      c
        ? `No numeric parameters were found for «${c}» to simulate. Tables and indicators in your notes unlock this tool.`
        : 'No numeric parameters were found in your notes to simulate.',
    el: (c) =>
      c
        ? `Δεν βρέθηκαν αριθμητικές παράμετροι για «${c}». Πίνακες και δείκτες στο υλικό ενεργοποιούν το εργαλείο.`
        : 'Δεν βρέθηκαν αριθμητικές παράμετροι στο υλικό για προσομοίωση.',
  },
  whiteboard: {
    en: (c) =>
      c
        ? `No formulas pulled for «${c}» yet — you can still sketch freely, or reprocess your notes.`
        : 'No formulas pulled yet — sketch freely, or reprocess your notes to load stamps.',
    el: (c) =>
      c
        ? `Δεν τραβήξαμε ακόμη τύπους για «${c}» — σχεδίασε ελεύθερα, ή επανεπεξεργάσου τις σημειώσεις.`
        : 'Δεν τραβήξαμε ακόμη τύπους — σχεδίασε ελεύθερα, ή επανεπεξεργάσου τις σημειώσεις.',
  },
  leitner: {
    en: (c) =>
      c
        ? `No cards yet for «${c}». Reprocess your notes, or pick a clearer section with definitions.`
        : 'No cards yet. Reprocess your notes, or open a section that defines key terms.',
    el: (c) =>
      c
        ? `Δεν υπάρχουν ακόμα κάρτες για «${c}». Κάνε Reprocess, ή διάλεξε ενότητα με ορισμούς.`
        : 'Δεν υπάρχουν ακόμα κάρτες. Κάνε Reprocess, ή άνοιξε ενότητα με βασικούς ορισμούς.',
  },
  timer: {
    en: (c) =>
      c
        ? `Add your notes to time a focus block for «${c}».`
        : 'Add your notes to start a timed focus block.',
    el: (c) =>
      c
        ? `Πρόσθεσε σημειώσεις για να χρονομετρήσεις εστίαση στο «${c}».`
        : 'Πρόσθεσε σημειώσεις για να ξεκινήσεις χρονομετρημένη εστίαση.',
  },
  dashboard: {
    en: (c) =>
      c
        ? `Upload notes to see your readiness and next step for «${c}».`
        : 'Upload notes to see your readiness, weak spots, and what to do next.',
    el: (c) =>
      c
        ? `Ανέβασε σημειώσεις για να δεις την ετοιμότητά σου και το επόμενο βήμα για «${c}».`
        : 'Ανέβασε σημειώσεις για ετοιμότητα, αδύναμα σημεία και τι να κάνεις μετά.',
  },
  'concept-map': {
    en: (c) =>
      c
        ? `Nothing mapped yet for «${c}». Add an idea below, or reprocess your notes so we can pull more links.`
        : 'Nothing mapped yet. Add an idea yourself, or reprocess your notes so we can pull links from them.',
    el: (c) =>
      c
        ? `Δεν υπάρχει ακόμη χάρτης για «${c}». Πρόσθεσε μια ιδέα παρακάτω, ή επανεπεξεργάσου τις σημειώσεις.`
        : 'Δεν υπάρχει ακόμη χάρτης. Πρόσθεσε μια ιδέα μόνος σου, ή επανεπεξεργάσου τις σημειώσεις.',
  },
  annotations: {
    en: () => 'Open a file to highlight lines and leave study notes in the margin.',
    el: () => 'Άνοιξε ένα αρχείο για να επισημάνεις γραμμές και να αφήσεις σημειώσεις στο περιθώριο.',
  },
  feynman: {
    en: (c) =>
      c
        ? `Nothing to explain yet for «${c}». Open Reader or Reprocess your notes, then come back.`
        : 'Nothing to explain yet. Open Reader or Reprocess your notes, then come back here.',
    el: (c) =>
      c
        ? `Δεν υπάρχει ακόμα κάτι να εξηγήσεις για «${c}». Άνοιξε τον Reader ή κάνε Reprocess.`
        : 'Δεν υπάρχει ακόμα κάτι να εξηγήσεις. Άνοιξε τον Reader ή κάνε Reprocess και ξαναέλα.',
  },
  lesson: {
    en: (c) =>
      c
        ? `No lesson content matched «${c}» in your notes yet.`
        : 'No lesson content matched your uploaded notes for this step.',
    el: (c) =>
      c
        ? `Δεν βρέθηκε περιεχόμενο μαθήματος για «${c}» στις σημειώσεις.`
        : 'Δεν βρέθηκε περιεχόμενο μαθήματος για αυτό το βήμα.',
  },
  discover: {
    en: () =>
      'Upload notes in Library, generate a course, then open Workspace for personalized study guidance.',
    el: () =>
      'Ανέβασε σημειώσεις στη Library, δημιούργησε μάθημα και άνοιξε Workspace για εξατομικευμένη καθοδήγηση.',
  },
  'weak-areas': {
    en: (c) =>
      c
        ? `No weak spots for «${c}» yet — complete a quiz or rate flashcards to build mastery signals.`
        : 'No weak spots yet — complete a quiz or rate flashcards to build your mastery profile.',
    el: (c) =>
      c
        ? `Δεν υπάρχουν αδύναμα σημεία για «${c}» — ολοκλήρωσε quiz ή βαθμολόγησε κάρτες.`
        : 'Δεν υπάρχουν αδύναμα σημεία — ολοκλήρωσε quiz ή βαθμολόγησε κάρτες για προφίλ mastery.',
  },
};

export function workspaceToolEmptyMessage(opts: {
  tool: WorkspaceEmptyTool;
  hasSource: boolean;
  lang: Lang;
  concept?: string;
}): string {
  if (!opts.hasSource) return workspaceNoSourceMessage(opts.lang);
  const fn = NO_EXTRACT[opts.tool][opts.lang];
  return fn(opts.concept?.trim() || undefined);
}

/** Upload CTA only when the workspace truly has no source material. */
export function workspaceEmptyUploadHandler(
  hasSource: boolean,
  onUpload?: () => void,
): (() => void) | undefined {
  return !hasSource ? onUpload : undefined;
}

export type WorkspaceEmptyActionId = 'upload' | 'reprocess' | 'switch-tool' | 'add-custom';

export type WorkspaceEmptyAction = {
  id: WorkspaceEmptyActionId;
  label: string;
  onClick: () => void;
  primary?: boolean;
};

const REPROCESS_ELIGIBLE = new Set<WorkspaceEmptyTool>([
  'reader', 'scratchpad', 'concept-map', 'quiz', 'leitner', 'simulator', 'compare', 'debate', 'dashboard', 'feynman',
]);

/** Per-tool CTAs: upload (no source), reprocess, or jump to a related tool. */
export function buildWorkspaceEmptyActions(opts: {
  tool: WorkspaceEmptyTool;
  hasSource: boolean;
  lang: Lang;
  onUpload?: () => void;
  onReprocess?: () => void;
  onSwitchTool?: (tool: WorkspaceToolId) => void;
}): WorkspaceEmptyAction[] {
  const { tool, hasSource, lang, onUpload, onReprocess, onSwitchTool } = opts;
  if (!hasSource) {
    if (!onUpload) return [];
    return [{
      id: 'upload',
      label: t('busUploadMaterial', lang),
      onClick: onUpload,
      primary: true,
    }];
  }

  if (tool === 'weak-areas' && onSwitchTool) {
    return [
      {
        id: 'switch-tool',
        label: t('emptyActionQuizCheck', lang),
        onClick: () => onSwitchTool('quiz'),
        primary: true,
      },
      {
        id: 'switch-tool',
        label: t('emptyActionLeitner', lang),
        onClick: () => onSwitchTool('leitner'),
      },
      {
        id: 'switch-tool',
        label: t('panelOpenReader', lang),
        onClick: () => onSwitchTool('reader'),
      },
    ];
  }

  if (tool === 'discover' && onSwitchTool) {
    return [
      {
        id: 'switch-tool',
        label: t('panelOpenReader', lang),
        onClick: () => onSwitchTool('reader'),
        primary: true,
      },
      {
        id: 'switch-tool',
        label: t('emptyActionConceptMap', lang),
        onClick: () => onSwitchTool('concept-map'),
      },
    ];
  }

  const actions: WorkspaceEmptyAction[] = [];

  if (onReprocess && REPROCESS_ELIGIBLE.has(tool)) {
    actions.push({
      id: 'reprocess',
      label: t('busReprocessMaterial', lang),
      onClick: onReprocess,
      primary: actions.length === 0,
    });
  }

  const crossKey = tool as WorkspaceToolId;
  const related = WORKSPACE_TOOL_CROSS_LINKS[crossKey]?.related?.find((r) => r.tool !== crossKey);
  if (related && onSwitchTool) {
    actions.push({
      id: 'switch-tool',
      label: lang === 'el' ? related.labelEl : related.labelEn,
      onClick: () => onSwitchTool(related.tool),
    });
  }

  return actions;
}
