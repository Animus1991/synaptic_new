/**
 * Prompt 18 — cross-module integration smoke tests (unit-level).
 */

import { describe, expect, it } from 'vitest';
import { buildFlashcardFromEntry, createScratchpadEntry } from './scratchpadEntryStore';
import { appendScratchpadAnnotation } from './scratchpadEntryStore';
import { recordConceptActivity, isStruggling, type ConceptBusState } from './workspaceConceptBus';
import { buildQuizSession } from './quizSession';
import { buildToolActivityBreakdown } from './conceptBusPanelModel';
import { resolveReaderNavToStep, isReaderNavNoop } from './readerStepSyncBridge';

describe('workspace integration', () => {
  it('scratchpad confusion entry → flashcard + annotation + concept bus struggle', () => {
    const entry = createScratchpadEntry('Why does w/w* matter?', {
      mode: 'confusion-log',
      concept: 'Introduction',
      sectionLabel: 'Introduction',
    });
    const card = buildFlashcardFromEntry(entry);
    expect(card.front).toBeTruthy();
    expect(card.back).toContain('w/w');

    const ann = appendScratchpadAnnotation('lecture.pdf', entry, 'Introduction\nTrade theory w/w*');
    expect(ann.category).toBe('confusing');

    let bus: ConceptBusState = {};
    bus = recordConceptActivity(bus, 'Introduction', 'annotations', 'annotated-confusing', 1);
    expect(isStruggling(Object.values(bus)[0]!)).toBe(true);
  });

  it('quiz session generates after weak extraction via fallback', () => {
    const text = 'Exports require labor units. Imports satisfy domestic demand.';
    const items = buildQuizSession(text, 'Introduction', [], 'en', 0, 40, 3);
    expect(items.length).toBeGreaterThan(0);
  });

  it('tool activity breakdown reflects deliberate tool hits', () => {
    let bus = {};
    bus = recordConceptActivity(bus, 'Tariffs', 'quiz', 'quiz-wrong', 1);
    bus = recordConceptActivity(bus, 'Tariffs', 'annotations', 'annotated', 2);
    const chips = buildToolActivityBreakdown(bus);
    expect(chips.some((c) => c.tool === 'quiz' && c.count >= 1)).toBe(true);
  });

  it('reader step sync noop and round-trip', () => {
    const steps = [{ title: 'Introduction', type: 'core' }, { title: 'Ricardo', type: 'deep' }];
    expect(isReaderNavNoop(0, 'Introduction', steps, 'Introduction trade exports')).toBe(true);
    const action = resolveReaderNavToStep('Ricardo', steps, 'Ricardo comparative advantage theory');
    expect(action.type).toBe('select-step');
    if (action.type === 'select-step') expect(action.stepIndex).toBe(1);
  });
});
