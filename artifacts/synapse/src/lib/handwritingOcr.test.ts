import { describe, it, expect, beforeEach } from 'vitest';
import {
  HANDWRITING_OCR_MODEL,
  HANDWRITING_OCR_MODEL_ID,
  greekLetterShare,
  isHandwritingRuntime,
  recognizeHandwriting,
  resetHandwritingOcr,
  shouldAttemptHandwritingOcr,
  usedHandwritingOcr,
} from './handwritingOcr';

describe('handwritingOcr', () => {
  beforeEach(() => {
    resetHandwritingOcr();
  });

  it('names a browser-friendly handwriting model', () => {
    expect(HANDWRITING_OCR_MODEL).toContain('handwritten');
  });

  it('returns null outside a browser/worker runtime', async () => {
    expect(isHandwritingRuntime()).toBe(false);
    const result = await recognizeHandwriting('data:image/png;base64,xxxx');
    expect(result).toBeNull();
  });

  it('computes Greek letter share ignoring digits and symbols', () => {
    expect(greekLetterShare('abcd')).toBe(0);
    expect(greekLetterShare('αβγδ')).toBe(1);
    expect(greekLetterShare('αβ12ab!!')).toBeCloseTo(0.5, 5);
    expect(greekLetterShare('1234 ---')).toBe(0);
  });

  it('attempts handwriting OCR only on low-confidence Latin-dominant pages', () => {
    // Low confidence, Latin text → attempt.
    expect(shouldAttemptHandwritingOcr('some blurry latin text here', 40)).toBe(true);
    // Near-empty printed output → attempt regardless of confidence.
    expect(shouldAttemptHandwritingOcr('  ', null)).toBe(true);
    // Confident printed output → skip.
    expect(shouldAttemptHandwritingOcr('a clean confident sentence', 92)).toBe(false);
  });

  it('declines handwriting OCR for Greek-dominant pages the model cannot read', () => {
    const greek = 'αυτό είναι ένα ελληνικό κείμενο με χαμηλή εμπιστοσύνη';
    expect(shouldAttemptHandwritingOcr(greek, 30)).toBe(false);
  });

  it('detects when handwriting OCR contributed to a file', () => {
    expect(usedHandwritingOcr([HANDWRITING_OCR_MODEL_ID, 'tesseract-eng'])).toBe(true);
    // Server-produced handwriting ids should also trigger detection.
    expect(usedHandwritingOcr(['vision-llm-handwriting'])).toBe(true);
    expect(usedHandwritingOcr(['tesseract-handwriting-fallback'])).toBe(true);
    expect(usedHandwritingOcr(['tesseract-eng', 'greek-document-repair'])).toBe(false);
    expect(usedHandwritingOcr(['vision-llm:gpt-4o-mini'])).toBe(false);
    expect(usedHandwritingOcr(undefined)).toBe(false);
    expect(usedHandwritingOcr([])).toBe(false);
  });
});
