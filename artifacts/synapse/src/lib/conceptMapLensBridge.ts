/**
 * Wave 6.8b — Keep Concept Map selection aligned with Concept Lens / workspace focus.
 */

import type { ConceptLensView } from './conceptGraphModel';
import { normalizeFocusTerm } from './workspaceFocus';

export function conceptMapSelectionMatchesLens(
  selectedLabel: string | null | undefined,
  lens: ConceptLensView,
): boolean {
  if (!selectedLabel?.trim()) return false;
  const key = normalizeFocusTerm(selectedLabel);
  const active = normalizeFocusTerm(lens.activeConcept);
  return key === active || key.includes(active) || active.includes(key);
}

export function resolveConceptMapFocusLabel(
  selectedLabel: string | null | undefined,
  workspaceFocus: string | null | undefined,
  fallbackConcept: string,
): string {
  return selectedLabel?.trim() || workspaceFocus?.trim() || fallbackConcept;
}

export function lensHighlightsMapNode(
  nodeLabel: string,
  lens: ConceptLensView,
): boolean {
  const key = normalizeFocusTerm(nodeLabel);
  const active = normalizeFocusTerm(lens.activeConcept);
  if (key === active) return true;
  return lens.related.some((r) => normalizeFocusTerm(r.label) === key)
    || lens.prerequisites.some((r) => normalizeFocusTerm(r.label) === key);
}
