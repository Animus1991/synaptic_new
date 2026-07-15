/** Format concept-map edge glyphs / PMI score labels (TOOL-CM-03). */

export type ConceptMapRelation = 'prerequisite' | 'related' | 'contrasts';

const RELATION_GLYPH: Record<ConceptMapRelation, string> = {
  prerequisite: '→',
  related: '~',
  contrasts: '≠',
};

/** Round PMI for on-canvas labels (one decimal). */
export function formatPmiScore(pmi: number): string {
  if (!Number.isFinite(pmi)) return '';
  return pmi.toFixed(1);
}

/**
 * Canvas edge label: relation glyph, plus PMI when the edge came from
 * co-occurrence inference (`related` + score).
 */
export function formatConceptMapEdgeGlyph(
  relation: ConceptMapRelation,
  pmi?: number,
): string {
  const glyph = RELATION_GLYPH[relation];
  if (relation === 'related' && pmi != null && Number.isFinite(pmi) && pmi > 0) {
    return `${glyph} ${formatPmiScore(pmi)}`;
  }
  return glyph;
}

/** Human-readable PMI suffix for the edge inspector panel. */
export function formatConceptMapPmiPanel(pmi?: number): string | null {
  if (pmi == null || !Number.isFinite(pmi) || pmi <= 0) return null;
  return `PMI ${formatPmiScore(pmi)}`;
}
