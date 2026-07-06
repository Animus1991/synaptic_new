import { describe, it, expect, beforeEach } from 'vitest';
import { saveJson } from './persistence';
import { appendCustomLeitnerCards } from './leitnerCustomCards';
import {
  buildNewCardSpacing,
  mergeQuizSpacing,
  notebookLmProgressKey,
  notebookLmStudyConcept,
  prepareNotebookLmFsrsImport,
} from './notebooklmFsrsImport';
import type { NotebookLmImportResult } from './notebooklmImport';

describe('notebooklmFsrsImport', () => {
  beforeEach(() => {
    saveJson('leitner-custom-cards', {});
  });

  it('builds due-now spacing for a new concept', () => {
    const now = new Date('2026-07-06T12:00:00.000Z');
    const row = buildNewCardSpacing('What is range?', now);
    expect(row.reviewCount).toBe(0);
    expect(row.nextReview).toBe(now.toISOString());
    expect(row.concept).toBe('What is range?');
  });

  it('merges quiz cards into spacing without duplicates', () => {
    const existing = [buildNewCardSpacing('Existing card')];
    const quiz = [
      { front: 'Existing card', back: 'dup' },
      { front: 'New card', back: 'answer' },
    ];
    const { spacing, added, skipped } = mergeQuizSpacing(existing, quiz);
    expect(added).toBe(1);
    expect(skipped).toBe(1);
    expect(spacing).toHaveLength(2);
  });

  it('prepares leitner + spacing import bundle', () => {
    const result: NotebookLmImportResult = {
      kind: 'quiz',
      title: 'Stats quiz',
      markdown: '',
      quizCards: [
        { front: 'Q1', back: 'A1' },
        { front: 'Q2', back: 'A2' },
      ],
      chatTurns: [],
    };
    const prepared = prepareNotebookLmFsrsImport(result, []);
    expect(prepared.studyConcept).toBe('Stats quiz');
    expect(prepared.scopeKey).toBe(notebookLmProgressKey('Stats quiz'));
    expect(prepared.added).toBe(2);
    expect(prepared.spacing.filter((s) => s.reviewCount === 0)).toHaveLength(2);
    expect(prepared.customCards).toHaveLength(2);
  });

  it('defaults study concept when title is empty', () => {
    expect(notebookLmStudyConcept('')).toBe('NotebookLM quiz');
  });
});

describe('appendCustomLeitnerCards', () => {
  beforeEach(() => {
    saveJson('leitner-custom-cards', {});
  });

  it('batch appends and dedupes by front', () => {
    const { added, cards } = appendCustomLeitnerCards('scope-a', [
      { front: 'A', back: '1', source: 'notebooklm-quiz' },
      { front: 'A', back: '2', source: 'notebooklm-quiz' },
      { front: 'B', back: '3', source: 'notebooklm-quiz' },
    ]);
    expect(added).toBe(2);
    expect(cards).toHaveLength(2);
    expect(cards.find((c) => c.front === 'A')?.back).toBe('2');
  });
});
