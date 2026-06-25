import type { Lang } from './i18n';
import type { RubricDimension } from './feynmanRubric';

const DIM_LABEL_EN: Record<RubricDimension, string> = {
  accuracy: 'accuracy and precise terminology',
  completeness: 'completeness — missing key points',
  simplicity: 'simplicity — too jargon-heavy',
  structure: 'structure — logical flow and examples',
};

const DIM_LABEL_EL: Record<RubricDimension, string> = {
  accuracy: 'ακρίβεια και ακριβείς όροι',
  completeness: 'πληρότητα — λείπουν βασικά σημεία',
  simplicity: 'απλότητα — πολύ jargon',
  structure: 'δομή — λογική ροή και παραδείγματα',
};

export function buildFeynmanWeakDimensionPrompt(
  dimension: RubricDimension,
  concept: string,
  draft: string,
  lang: Lang,
): string {
  const excerpt = draft.trim().slice(0, 600);
  const dimLabel = lang === 'el' ? DIM_LABEL_EL[dimension] : DIM_LABEL_EN[dimension];
  if (lang === 'el') {
    return `Βοήθησέ με να βελτιώσω την ${dimLabel} στην Feynman εξήγησή μου για «${concept}». Αυτό έγραψα:\n\n«${excerpt}»\n\nΔώσε μου συγκεκριμένες βελτιώσεις και μια απλούστερη αναδιατύπωση.`;
  }
  return `Help me improve ${dimLabel} in my Feynman explanation of "${concept}". I wrote:\n\n"${excerpt}"\n\nGive concrete fixes and a simpler rewrite.`;
}
