import { describe, it, expect } from 'vitest';
import type { UploadedFile } from '../types';
import {
  buildOcclusionCardFromSelection,
  canMakeOcclusionFromSelection,
  findOcclusionRegionForSelection,
} from './readerOcclusionFromSelection';

const OCR_FILE: UploadedFile = {
  id: 'f1',
  name: 'diagram.png',
  type: 'image',
  size: 1024,
  uploadedAt: '2026-01-01T00:00:00.000Z',
  status: 'analyzed',
  courseId: 'c1',
  ocrRegions: [
    {
      text: 'Nucleus',
      left: 10,
      top: 20,
      width: 15,
      height: 8,
      confidence: 0.92,
      pageIndex: 0,
    },
    {
      text: 'Mitochondria',
      left: 40,
      top: 30,
      width: 18,
      height: 8,
      confidence: 0.88,
      pageIndex: 0,
    },
  ],
};

describe('readerOcclusionFromSelection', () => {
  it('finds stored OCR region for exact selection', () => {
    const match = findOcclusionRegionForSelection([OCR_FILE], 'Nucleus');
    expect(match?.region.text).toBe('Nucleus');
    expect(match?.file.id).toBe('f1');
  });

  it('matches partial selection against stored word box', () => {
    expect(canMakeOcclusionFromSelection([OCR_FILE], 'the Nucleus region')).toBe(true);
  });

  it('builds occlusion Leitner card with payload', () => {
    const card = buildOcclusionCardFromSelection([OCR_FILE], 'Nucleus', 'en');
    expect(card?.cardType).toBe('occlusion');
    expect(card?.occlusion?.hiddenLabel).toBe('Nucleus');
    expect(card?.occlusion?.sourceFileName).toBe('diagram.png');
  });

  it('falls back to heuristic overlay from reader text', () => {
    const text = 'Cell biology covers the Nucleus and membrane transport in detail.';
    const match = findOcclusionRegionForSelection([], 'Nucleus', text, 0, 'Notes.pdf');
    expect(match?.region.text.toLowerCase()).toContain('nucleus');
    expect(match?.file.name).toBe('Notes.pdf');
  });

  it('returns null for empty or non-candidate selection', () => {
    expect(findOcclusionRegionForSelection([OCR_FILE], '')).toBeNull();
    expect(findOcclusionRegionForSelection([OCR_FILE], '42')).toBeNull();
  });
});
