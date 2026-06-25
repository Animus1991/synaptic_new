import type { Lang } from './i18n';

export type LearningActionId =
  | 'study-section'
  | 'test-me'
  | 'explain-zero'
  | 'flashcards'
  | 'ask-agent'
  | 'mark-understood'
  | 'mark-confusing';

export type LearningActionDef = {
  id: LearningActionId;
  label: string;
  hint: string;
  primary?: boolean;
};

const ACTIONS_EN: Record<LearningActionId, Omit<LearningActionDef, 'id'>> = {
  'study-section': { label: 'Study section', hint: 'Open Reader at this step', primary: true },
  'test-me': { label: 'Test me', hint: 'Jump to knowledge check' },
  'explain-zero': { label: 'Explain from zero', hint: 'Ask Agent in beginner mode' },
  'flashcards': { label: 'Flashcards', hint: 'Open spaced-repetition deck' },
  'ask-agent': { label: 'Ask Agent', hint: 'Contextual tutor for this section' },
  'mark-understood': { label: 'Understood', hint: 'Mark section as clear' },
  'mark-confusing': { label: 'Confusing', hint: 'Flag for review' },
};

const ACTIONS_EL: Record<LearningActionId, Omit<LearningActionDef, 'id'>> = {
  'study-section': { label: 'Μελέτη ενότητας', hint: 'Άνοιγμα Reader σε αυτό το βήμα', primary: true },
  'test-me': { label: 'Δοκίμασέ με', hint: 'Μετάβαση στο knowledge check' },
  'explain-zero': { label: 'Εξήγηση από μηδέν', hint: 'Agent σε beginner mode' },
  'flashcards': { label: 'Κάρτες', hint: 'Leitner / επανάληψη' },
  'ask-agent': { label: 'Ρώτα Agent', hint: 'Tutor με context ενότητας' },
  'mark-understood': { label: 'Κατάλαβα', hint: 'Σημείωση ως σαφές' },
  'mark-confusing': { label: 'Μπερδευτικό', hint: 'Σημείωση για επανάληψη' },
};

export function getLearningActions(lang: Lang): LearningActionDef[] {
  const table = lang === 'el' ? ACTIONS_EL : ACTIONS_EN;
  return (Object.keys(table) as LearningActionId[]).map((id) => ({ id, ...table[id] }));
}

export function buildAgentPromptForSection(
  action: 'explain-zero' | 'ask-agent',
  sectionTitle: string,
  concept: string,
  lang: Lang,
): string {
  const title = sectionTitle.trim() || concept;
  if (lang === 'el') {
    if (action === 'explain-zero') {
      return `Εξήγησε από το μηδέν την ενότητα «${title}» (έννοια: ${concept}). Χρησιμοποίησε μόνο το υλικό των σημειώσεων μου όπου είναι δυνατόν.`;
    }
    return `Βοήθησέ με με την ενότητα «${title}» (έννοια: ${concept}). Τι πρέπει να ξέρω για εξετάσεις;`;
  }
  if (action === 'explain-zero') {
    return `Explain from zero: section "${title}" (concept: ${concept}). Ground in my uploaded notes where possible.`;
  }
  return `Help me with section "${title}" (concept: ${concept}). What should I know for exams?`;
}
