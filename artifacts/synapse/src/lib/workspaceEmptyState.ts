import type { Lang } from './i18n';

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
  | 'lesson';

export function workspaceNoSourceMessage(lang: Lang): string {
  return lang === 'el'
    ? 'Ανέβασε σημειώσεις για να εμφανιστεί εξατομικευμένο περιεχόμενο από το δικό σου υλικό.'
    : 'Upload your notes to see personalized content from your own material.';
}

const NO_EXTRACT: Record<WorkspaceEmptyTool, { en: (concept?: string) => string; el: (concept?: string) => string }> = {
  reader: {
    en: (c) =>
      c
        ? `No readable excerpt matched «${c}» in your uploaded notes. Try another topic from the lesson rail.`
        : 'No readable excerpt matched the current focus in your uploaded notes.',
    el: (c) =>
      c
        ? `Δεν βρέθηκε απόσπασμα για «${c}» στο ανεβασμένο υλικό. Δοκίμασε άλλο θέμα από τη ράβδο μαθήματος.`
        : 'Δεν βρέθηκε απόσπασμα για το τρέχον θέμα στο ανεβασμένο υλικό.',
  },
  scratchpad: {
    en: (c) =>
      c
        ? `No formulas were detected in your notes for «${c}». Add a custom formula or switch topic.`
        : 'No formulas were detected in your uploaded notes. Add a custom formula or switch topic.',
    el: (c) =>
      c
        ? `Δεν εντοπίστηκαν τύποι στο υλικό για «${c}». Πρόσθεσε προσαρμοσμένο τύπο ή άλλαξε θέμα.`
        : 'Δεν εντοπίστηκαν τύποι στο ανεβασμένο υλικό. Πρόσθεσε προσαρμοσμένο τύπο ή άλλαξε θέμα.',
  },
  debate: {
    en: (c) =>
      c
        ? `No debate claims were extracted for «${c}». Start a tree manually or try another topic.`
        : 'No debate claims were extracted from your notes. Start a tree manually or try another topic.',
    el: (c) =>
      c
        ? `Δεν εξήχθησαν επιχειρήματα για «${c}». Ξεκίνα χειροκίνητα ή δοκίμασε άλλο θέμα.`
        : 'Δεν εξήχθησαν επιχειρήματα από τις σημειώσεις. Ξεκίνα χειροκίνητα ή δοκίμασε άλλο θέμα.',
  },
  compare: {
    en: (c) =>
      c
        ? `No comparison table or A/B pairs were found for «${c}» in your notes.`
        : 'No comparison table or A/B pairs were found in your uploaded notes.',
    el: (c) =>
      c
        ? `Δεν βρέθηκε πίνακας σύγκρισης ή ζεύγη Α/Β για «${c}» στο υλικό.`
        : 'Δεν βρέθηκε πίνακας σύγκρισης ή ζεύγη Α/Β στο ανεβασμένο υλικό.',
  },
  quiz: {
    en: (c) =>
      c
        ? `No quiz questions could be generated for «${c}» from your notes. Try Reprocess or another topic.`
        : 'No quiz questions could be generated from your uploaded notes. Try Reprocess.',
    el: (c) =>
      c
        ? `Δεν δημιουργήθηκαν ερωτήσεις για «${c}» από τις σημειώσεις. Δοκίμασε Reprocess ή άλλο θέμα.`
        : 'Δεν δημιουργήθηκαν ερωτήσεις από το ανεβασμένο υλικό. Δοκίμασε Reprocess.',
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
        ? `No formulas were detected for «${c}» — you can still sketch on the board after uploading notes.`
        : 'No formulas were detected in your notes — you can still sketch on the board.',
    el: (c) =>
      c
        ? `Δεν εντοπίστηκαν τύποι για «${c}» — μπορείς να σχεδιάσεις στον πίνακα μετά το upload.`
        : 'Δεν εντοπίστηκαν τύποι — μπορείς να σχεδιάσεις στον πίνακα.',
  },
  leitner: {
    en: (c) =>
      c
        ? `No flashcards could be built for «${c}» from glossary or definitions in your notes.`
        : 'No flashcards could be built from glossary or definitions in your notes.',
    el: (c) =>
      c
        ? `Δεν δημιουργήθηκαν κάρτες για «${c}» από γλωσσάρι ή ορισμούς στο υλικό.`
        : 'Δεν δημιουργήθηκαν κάρτες από γλωσσάρι ή ορισμούς στο υλικό.',
  },
  timer: {
    en: (c) =>
      c
        ? `Upload notes to start a focused timer session for «${c}».`
        : 'Upload notes to start a focused study timer session.',
    el: (c) =>
      c
        ? `Ανέβασε σημειώσεις για χρονόμετρο μελέτης για «${c}».`
        : 'Ανέβασε σημειώσεις για χρονόμετρο μελέτης.',
  },
  dashboard: {
    en: (c) =>
      c
        ? `Upload notes to track personalized progress for «${c}» — weak spots, tool activity, and next actions.`
        : 'Upload notes to track personalized progress — weak spots, tool activity, and next actions.',
    el: (c) =>
      c
        ? `Ανέβασε σημειώσεις για εξατομικευμένη πρόοδο για «${c}» — αδύναμα σημεία, εργαλεία, επόμενα βήματα.`
        : 'Ανέβασε σημειώσεις για εξατομικευμένη πρόοδο — αδύναμα, εργαλεία, επόμενα βήματα.',
  },
  'concept-map': {
    en: (c) =>
      c
        ? `Not enough concepts were linked for «${c}» to draw a map. Check course topics or glossary.`
        : 'Not enough concepts were found to draw a map from your course topics and glossary.',
    el: (c) =>
      c
        ? `Δεν συνδέθηκαν αρκετές έννοιες για «${c}» σε χάρτη. Έλεγξε θέματα μαθήματος ή γλωσσάρι.`
        : 'Δεν βρέθηκαν αρκετές έννοιες για χάρτη από θέματα και γλωσσάρι.',
  },
  annotations: {
    en: () => 'No source text is available to annotate for the current focus.',
    el: () => 'Δεν υπάρχει διαθέσιμο κείμενο προς σχολιασμό για το τρέχον θέμα.',
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
