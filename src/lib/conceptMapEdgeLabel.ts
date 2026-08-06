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
 * Canvas edge label — relation only (Wave CM2). Raw PMI scores stay in the
 * inspector so the map does not look like a research graph.
 */
export function formatConceptMapEdgeGlyph(
  relation: ConceptMapRelation,
  _pmi?: number,
): string {
  return RELATION_GLYPH[relation];
}

/** Human-readable relatedness for the edge inspector panel. */
export function formatConceptMapPmiPanel(pmi?: number): string | null {
  if (pmi == null || !Number.isFinite(pmi) || pmi <= 0) return null;
  return `Relatedness ${formatPmiScore(pmi)}`;
}
