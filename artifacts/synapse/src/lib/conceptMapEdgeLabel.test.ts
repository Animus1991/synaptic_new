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

  it('appends PMI on related edges', () => {
    expect(formatConceptMapEdgeGlyph('related', 2.14)).toBe('~ 2.1');
  });

  it('keeps glyph-only for non-PMI relations', () => {
    expect(formatConceptMapEdgeGlyph('prerequisite')).toBe('→');
    expect(formatConceptMapEdgeGlyph('contrasts')).toBe('≠');
    expect(formatConceptMapEdgeGlyph('related')).toBe('~');
  });

  it('formats panel PMI suffix', () => {
    expect(formatConceptMapPmiPanel(1.2)).toBe('PMI 1.2');
    expect(formatConceptMapPmiPanel(undefined)).toBeNull();
  });
});
