import { describe, expect, it } from 'vitest';
import {
  auditCompareReaderSelectionParity,
  buildCompareSelectionContext,
  isCompareRowOcrNoisy,
} from './compareReaderSelectionParityQA';
import { SPACED_INCOME_DISTRIBUTION } from './greekOcrFixtures';

describe('compareReaderSelectionParityQA', () => {
  const rows: Array<[string, string, string]> = [
    ['Elasticity', 'Price sensitivity', 'Responsiveness measure'],
    ['OCR row', SPACED_INCOME_DISTRIBUTION, 'Column B'],
  ];

  it('audits §13.5 parity with Reader for compare origin', () => {
    const report = auditCompareReaderSelectionParity({
      lang: 'en',
      rows,
      concept: 'Microeconomics',
      sectionLabel: 'Lecture 2',
      selectionHandlerWired: true,
    });
    expect(report.selectionActionCount).toBe(8);
    expect(report.readerVisibleActionCount).toBe(7);
    expect(report.openReaderAvailable).toBe(true);
    expect(report.ok).toBe(true);
    expect(report.bannerSummary).toContain('Text selection');
  });

  it('flags unwired selection handler when rows exist', () => {
    const report = auditCompareReaderSelectionParity({
      lang: 'en',
      rows,
      concept: 'Micro',
      selectionHandlerWired: false,
    });
    expect(report.ok).toBe(false);
    expect(report.issues.some((i) => i.code === 'handler-unwired')).toBe(true);
  });

  it('normalizes OCR-noisy row text for selection context', () => {
    const ctx = buildCompareSelectionContext(
      ['OCR row', SPACED_INCOME_DISTRIBUTION, 'Column B'],
      'Income',
    );
    expect(ctx.text).toContain('Διανομή');
    expect(ctx.originTool).toBe('compare');
    expect(isCompareRowOcrNoisy(['OCR row', SPACED_INCOME_DISTRIBUTION, 'B'])).toBe(true);
  });
});
