/** @vitest-environment jsdom */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  saveOcrCorrection,
  loadOcrCorrections,
  reanchorOcrCorrections,
} from './readerOcrCorrectionStore';

const SCOPE = 'test-ocr-reanchor';
const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
  });
});

describe('reanchorOcrCorrections', () => {
  it('remaps by corrected text when block order changes', () => {
    saveOcrCorrection({
      id: '1',
      scopeKey: SCOPE,
      blockIndex: 0,
      originalText: 'alpha line with enough chars',
      correctedText: 'alpha line with enough chars FIXED',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    const result = reanchorOcrCorrections(
      SCOPE,
      'intro paragraph one\n\nalpha line with enough chars FIXED\n\ntrailer block here',
    );
    expect(result.remapped).toBe(1);
    expect(result.dropped).toBe(0);
    const saved = loadOcrCorrections(SCOPE);
    expect(saved).toHaveLength(1);
    expect(saved[0]!.blockIndex).toBe(1);
  });

  it('drops corrections that no longer match any block', () => {
    saveOcrCorrection({
      id: '2',
      scopeKey: SCOPE,
      blockIndex: 0,
      originalText: 'vanished original text block xx',
      correctedText: 'vanished corrected text block xx',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    const result = reanchorOcrCorrections(SCOPE, 'entirely different source material now');
    expect(result.dropped).toBe(1);
    expect(loadOcrCorrections(SCOPE)).toHaveLength(0);
  });
});
