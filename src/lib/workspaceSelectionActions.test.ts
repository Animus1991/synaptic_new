import { describe, it, expect } from 'vitest';
import {
  buildSelectionAgentPrompt,
  buildSelectionFlashcard,
  getSelectionActionDefs,
  selectionExcerptPreview,
} from './workspaceSelectionActions';

describe('workspaceSelectionActions', () => {
  it('returns full action set outside Reader', () => {
    const defs = getSelectionActionDefs('en', 'concept-map');
    expect(defs.map((d) => d.id)).toContain('open-reader');
    expect(defs.map((d) => d.id)).toContain('make-card');
  });

  it('hides open-reader when origin is Reader', () => {
    const defs = getSelectionActionDefs('en', 'reader');
    expect(defs.some((d) => d.id === 'open-reader')).toBe(false);
    expect(defs.some((d) => d.id === 'annotate')).toBe(true);
  });

  it('shows make-occlusion only in Reader when OCR match available', () => {
    expect(getSelectionActionDefs('en', 'reader').some((d) => d.id === 'make-occlusion')).toBe(false);
    expect(getSelectionActionDefs('en', 'reader', { occlusionAvailable: true }).some((d) => d.id === 'make-occlusion')).toBe(true);
    expect(getSelectionActionDefs('en', 'concept-map', { occlusionAvailable: true }).some((d) => d.id === 'make-occlusion')).toBe(false);
  });

  it('hides quiz action when origin is Quiz', () => {
    const defs = getSelectionActionDefs('en', 'quiz');
    expect(defs.some((d) => d.id === 'quiz')).toBe(false);
    expect(defs.some((d) => d.id === 'ask-agent')).toBe(true);
    expect(defs.some((d) => d.id === 'open-reader')).toBe(true);
  });

  it('builds bilingual agent prompts', () => {
    const en = buildSelectionAgentPrompt('Supply shifts right', 'Market equilibrium', 'Supply', 'en');
    expect(en).toContain('Supply shifts right');
    const el = buildSelectionAgentPrompt('Διάθεση', 'Ισορροπία', 'Διάθεση', 'el');
    expect(el).toContain('Διάθεση');
  });

  it('builds flashcard front/back', () => {
    const card = buildSelectionFlashcard('Elasticity measures responsiveness', 'Elasticity', 'Price sensitivity');
    expect(card.cardType).toBe('definition');
    expect(card.front).toContain('Elasticity');
    expect(card.back).toBe('Price sensitivity');
  });

  it('truncates excerpt preview', () => {
    expect(selectionExcerptPreview('short')).toBe('short');
    expect(selectionExcerptPreview('x'.repeat(100)).endsWith('…')).toBe(true);
  });
});
