import { describe, expect, it } from 'vitest';
import {
  buildOcclusionCardsFromFiles,
  isOcclusionCandidate,
  pickOcclusionCandidates,
} from './imageOcclusionCards';
import type { UploadedFile } from '../types';

describe('imageOcclusionCards', () => {
  it('accepts meaningful OCR labels', () => {
    expect(isOcclusionCandidate({
      text: 'Mitochondria',
      left: 10,
      top: 20,
      width: 15,
      height: 8,
      confidence: 0.9,
      pageIndex: 0,
    })).toBe(true);
    expect(isOcclusionCandidate({
      text: '42',
      left: 0,
      top: 0,
      width: 5,
      height: 5,
      confidence: 0.9,
      pageIndex: 0,
    })).toBe(false);
  });

  it('builds occlusion cards from uploaded OCR regions', () => {
    const file: UploadedFile = {
      id: 'f1',
      name: 'diagram.png',
      type: 'image',
      size: 1000,
      uploadedAt: '2026-01-01',
      status: 'analyzed',
      ocrRegions: [
        { text: 'Nucleus', left: 12, top: 18, width: 20, height: 10, confidence: 0.92, pageIndex: 0 },
        { text: 'Cell wall', left: 40, top: 22, width: 18, height: 9, confidence: 0.88, pageIndex: 0 },
      ],
    };
    const cards = buildOcclusionCardsFromFiles([file], 'en', 2);
    expect(cards).toHaveLength(2);
    expect(cards[0]?.cardType).toBe('occlusion');
    expect(cards[0]?.occlusion?.hiddenLabel).toBe('Nucleus');
    expect(pickOcclusionCandidates(file.ocrRegions!)).toHaveLength(2);
  });

  it('builds Greek occlusion card front', () => {
    const file: UploadedFile = {
      id: 'f2',
      name: 'cell.png',
      type: 'image',
      size: 500,
      uploadedAt: '2026-01-01',
      status: 'analyzed',
      ocrRegions: [
        { text: 'Mitochondria', left: 1, top: 2, width: 10, height: 8, confidence: 0.9, pageIndex: 0 },
      ],
    };
    const cards = buildOcclusionCardsFromFiles([file], 'el', 1);
    expect(cards[0]?.front).toContain('cell.png');
    expect(cards[0]?.front).toContain('ετικέτα');
  });
});
