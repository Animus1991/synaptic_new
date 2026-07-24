import type { LucideIcon } from '@/lib/lucide-shim';
import { Lightbulb, Calculator, BookOpen, Brain } from '@/lib/lucide-shim';

export type ConceptNodeType = 'concept' | 'formula' | 'definition' | 'theory';

/** Phosphor icons for concept-map node types (HTML UI). */
export const CONCEPT_TYPE_ICON: Record<ConceptNodeType, LucideIcon> = {
  concept: Lightbulb,
  formula: Calculator,
  definition: BookOpen,
  theory: Brain,
};

/** Single-letter glyphs for SVG nodes (no emoji). */
export const CONCEPT_TYPE_GLYPH: Record<ConceptNodeType, string> = {
  concept: 'C',
  formula: 'F',
  definition: 'D',
  theory: 'T',
};

export function conceptTypeGlyph(type: string): string {
  return CONCEPT_TYPE_GLYPH[type as ConceptNodeType] ?? 'C';
}

export function conceptTypeIcon(type: string): LucideIcon {
  return CONCEPT_TYPE_ICON[type as ConceptNodeType] ?? Lightbulb;
}
