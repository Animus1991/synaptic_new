import { describe, expect, it } from 'vitest';
import { isImageOnlyPdf, needsOcr, OCR_MIN_TOTAL_CHARS, OCR_MIN_CHARS_PER_PAGE } from './ocrExtract';

describe('needsOcr', () => {
  it('returns false for text-rich PDF extraction', () => {
    const text = 'Supply and demand determine market equilibrium in competitive markets. '.repeat(3);
    expect(needsOcr(text, 2)).toBe(false);
  });

  it('returns true when text layer is nearly empty', () => {
    expect(needsOcr('   ', 5)).toBe(true);
    expect(needsOcr('page 1', 4)).toBe(true);
  });

  it('returns true when total chars fall below threshold', () => {
    expect(needsOcr('a'.repeat(OCR_MIN_TOTAL_CHARS - 1), 1)).toBe(true);
  });

  it('returns true when total chars are high but per-page density is sparse (scanned PDF)', () => {
    const sparse = 'header\ffooter\fheader\f'.repeat(25);
    expect(sparse.replace(/\f/g, ' ').trim().length).toBeGreaterThan(OCR_MIN_TOTAL_CHARS);
    expect(needsOcr(sparse, 50)).toBe(true);
  });
});

describe('isImageOnlyPdf', () => {
  it('flags PDFs where most pages lack a text layer', () => {
    expect(isImageOnlyPdf([0, 2, 0, 1, 0, 0])).toBe(true);
    expect(isImageOnlyPdf([120, 95, 88, 102])).toBe(false);
  });

  it('uses per-page threshold consistent with needsOcr', () => {
    const borderline = Array(4).fill(OCR_MIN_CHARS_PER_PAGE - 1);
    expect(isImageOnlyPdf(borderline)).toBe(true);
  });
});
