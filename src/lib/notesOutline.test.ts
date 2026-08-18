import { describe, expect, it } from 'vitest';
import { extractNotesOutline, isNotesOnlySourceMode } from './notesOutline';

describe('extractNotesOutline', () => {
  it('keeps markdown headings and drops body paragraphs', () => {
    const outline = extractNotesOutline(`# Markets\n\nLong body about prices.\n\n## Elasticity\n\nMore body.\n\n## Surplus\n`);
    expect(outline).toContain('# Markets');
    expect(outline).toContain('## Elasticity');
    expect(outline).not.toContain('Long body');
  });

  it('falls back to first sentences when headings are missing', () => {
    const outline = extractNotesOutline('Price is what buyers pay. Extra.\n\nQuantity is units sold. Extra.');
    expect(outline).toContain('Price is what buyers pay.');
    expect(outline).toContain('Quantity is units sold.');
  });
});

describe('isNotesOnlySourceMode', () => {
  it('is true only for notes-only', () => {
    expect(isNotesOnlySourceMode('notes-only')).toBe(true);
    expect(isNotesOnlySourceMode('strict')).toBe(false);
    expect(isNotesOnlySourceMode('enriched')).toBe(false);
  });
});
