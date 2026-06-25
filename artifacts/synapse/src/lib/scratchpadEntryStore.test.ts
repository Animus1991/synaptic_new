import { describe, expect, it } from 'vitest';
import {
  createScratchpadEntry,
  buildFlashcardFromEntry,
  buildAnnotationFromScratchpadEntry,
  SCRATCHPAD_MODE_LABELS,
} from './scratchpadEntryStore';

describe('scratchpadEntryStore', () => {
  it('creates entry with section anchor', () => {
    const entry = createScratchpadEntry('My explanation text', {
      mode: 'self-explanation',
      concept: 'Introduction',
      sectionLabel: 'Introduction',
      sectionIndex: 0,
    });
    expect(entry.mode).toBe('self-explanation');
    expect(entry.sectionLabel).toBe('Introduction');
    expect(entry.resolved).toBe(false);
  });

  it('builds flashcard from entry', () => {
    const entry = createScratchpadEntry('Ricardo model basics', {
      mode: 'summary',
      concept: 'Comparative advantage',
    });
    const card = buildFlashcardFromEntry(entry);
    expect(card.front).toContain('Comparative advantage');
    expect(card.back).toContain('Ricardo');
  });

  it('builds confusing annotation from confusion log', () => {
    const entry = createScratchpadEntry('Why w/w* ratio?', {
      mode: 'confusion-log',
      concept: 'Introduction',
      sectionLabel: 'Introduction',
    });
    const lines = ['Introduction', 'Trade theory text'];
    const ann = buildAnnotationFromScratchpadEntry(entry, 'notes.pdf', lines);
    expect(ann.category).toBe('confusing');
    expect(ann.type).toBe('comment');
    expect(ann.anchor?.excerpt).toBeTruthy();
  });

  it('maps exam draft to exam-relevant category', () => {
    const entry = createScratchpadEntry('Exam answer draft', { mode: 'exam-draft', concept: 'Tariffs' });
    const ann = buildAnnotationFromScratchpadEntry(entry, 'f.pdf', ['Tariffs section']);
    expect(ann.category).toBe('exam-relevant');
  });

  it('has labels for all modes', () => {
    expect(Object.keys(SCRATCHPAD_MODE_LABELS).length).toBeGreaterThanOrEqual(7);
  });
});
