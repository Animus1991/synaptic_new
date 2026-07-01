import { normalizeConcept } from './contentAnalysis';
import { conceptRelevanceScore } from './noteContentExtractors';

function ribbonConceptKey(phrase: string): string {
  return normalizeConcept(
    phrase.toLowerCase().replace(/&/g, ' and ').replace(/[^\p{L}\p{N}\s]/gu, ' '),
  );
}

/** True when active concept and lesson step title refer to the same topic. */
export function conceptMatchesStepTitle(concept: string, stepTitle: string | undefined): boolean {
  if (!concept?.trim() || !stepTitle?.trim()) return false;
  if (ribbonConceptKey(concept) === ribbonConceptKey(stepTitle)) return true;
  return conceptRelevanceScore(stepTitle, concept) >= 0.85
    || conceptRelevanceScore(concept, stepTitle) >= 0.85;
}

/** Related concepts excluding the active focus label. */
export function relatedConceptChips(
  related: { label: string }[] | undefined,
  activeLabel: string,
  limit = 4,
): { label: string }[] {
  return (related ?? [])
    .filter((c) => !conceptMatchesStepTitle(c.label, activeLabel))
    .slice(0, limit);
}
