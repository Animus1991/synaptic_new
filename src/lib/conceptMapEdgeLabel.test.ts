import { describe, expect, it } from 'vitest';
import {
  formatConceptMapEdgeGlyph,
  formatConceptMapPmiPanel,
  formatPmiScore,
} from './conceptMapEdgeLabel';

describe('conceptMapEdgeLabel (TOOL-CM-03)', () => {
  it('formats PMI to one decimal', () => {
    expect(formatPmiScore(1.456)).toBe('1.5');
  });

  it('keeps related edges glyph-only on canvas (PMI stays in inspector)', () => {
    expect(formatConceptMapEdgeGlyph('related', 2.14)).toBe('~');
  });

  it('keeps glyph-only for non-PMI relations', () => {
    expect(formatConceptMapEdgeGlyph('prerequisite')).toBe('→');
    expect(formatConceptMapEdgeGlyph('contrasts')).toBe('≠');
    expect(formatConceptMapEdgeGlyph('related')).toBe('~');
  });

  it('formats panel relatedness suffix', () => {
    expect(formatConceptMapPmiPanel(1.2)).toBe('Relatedness 1.2');
    expect(formatConceptMapPmiPanel(undefined)).toBeNull();
  });
});
