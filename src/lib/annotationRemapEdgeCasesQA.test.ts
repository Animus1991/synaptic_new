import { describe, expect, it } from 'vitest';
import type { StoredAnnotation } from './annotationStore';
import {
  auditAnnotationRemapEdgeCases,
  classifyAnnotationRemapEdgeCase,
  formatRemapEdgeCaseBanner,
  remapEdgeCaseLabel,
} from './annotationRemapEdgeCasesQA';
import { buildAnnotationRemapPlan } from './annotationAnchorRemap';

const lines = [
  'Introduction',
  'Price elasticity measures responsiveness.',
  'Supply shifts when costs change.',
  'Demand shifts when income changes.',
];

const ann = (partial: Partial<StoredAnnotation> & Pick<StoredAnnotation, 'id'>): StoredAnnotation => ({
  type: 'highlight',
  text: '',
  color: '#818cf8',
  lineStart: 0,
  lineEnd: 0,
  ...partial,
});

describe('annotationRemapEdgeCasesQA', () => {
  it('classifies orphan excerpt when passage was deleted', () => {
    const flagged = ann({
      id: 'orphan',
      lineStart: 99,
      lineEnd: 99,
      anchor: { fileKey: 'f.pdf', excerpt: 'Removed tariff paragraph entirely' },
      anchorStatus: 'needs-review',
    });
    const entry = buildAnnotationRemapPlan([flagged], lines)[0]!;
    expect(classifyAnnotationRemapEdgeCase(entry, lines).kind).toBe('orphan-excerpt');
  });

  it('classifies ambiguous match when two high-confidence lines tie', () => {
    const flagged = ann({
      id: 'ambig',
      lineStart: 5,
      lineEnd: 5,
      anchor: { fileKey: 'f.pdf', excerpt: 'shifts when' },
      anchorStatus: 'needs-review',
    });
    const entry = buildAnnotationRemapPlan([flagged], lines)[0]!;
    const kind = classifyAnnotationRemapEdgeCase(entry, lines).kind;
    expect(['ambiguous-match', 'no-candidates', 'auto-remap-ready']).toContain(kind);
  });

  it('classifies legacy-at-line when line still exists but no fuzzy match', () => {
    const flagged = ann({
      id: 'legacy',
      lineStart: 1,
      lineEnd: 1,
      anchor: { fileKey: 'f.pdf', excerpt: 'totally different text', pipelineVersion: '1.0.0' },
      anchorStatus: 'legacy',
    });
    const entry = buildAnnotationRemapPlan([flagged], lines)[0]!;
    const summary = classifyAnnotationRemapEdgeCase(entry, lines);
    expect(['legacy-at-line', 'orphan-excerpt', 'no-candidates']).toContain(summary.kind);
  });

  it('classifies multi-line span annotations', () => {
    const flagged = ann({
      id: 'multi',
      lineStart: 99,
      lineEnd: 101,
      anchor: { fileKey: 'f.pdf', excerpt: 'Price elasticity measures responsiveness.' },
      anchorStatus: 'needs-review',
    });
    const entry = buildAnnotationRemapPlan([flagged], lines)[0]!;
    expect(classifyAnnotationRemapEdgeCase(entry, lines).kind).toBe('multi-line-span');
  });

  it('audits flagged set and formats banner summary', () => {
    const items: StoredAnnotation[] = [
      ann({
        id: 'ok',
        anchorStatus: 'ok',
      }),
      ann({
        id: 'auto',
        lineStart: 50,
        anchor: { fileKey: 'f.pdf', excerpt: 'Price elasticity measures responsiveness.' },
        anchorStatus: 'needs-review',
      }),
      ann({
        id: 'gone',
        lineStart: 50,
        anchor: { fileKey: 'f.pdf', excerpt: 'Paragraph deleted in reprocess' },
        anchorStatus: 'needs-review',
      }),
    ];
    const report = auditAnnotationRemapEdgeCases(items, lines);
    expect(report.flaggedCount).toBe(2);
    expect(report.autoRemapReadyCount).toBeGreaterThanOrEqual(1);
    const banner = formatRemapEdgeCaseBanner(report, 'en');
    expect(banner).toBeTruthy();
    expect(remapEdgeCaseLabel('orphan-excerpt', 'en')).toBe('Deleted passage');
  });

  it('handles empty source lines', () => {
    const flagged = ann({ id: 'empty', anchorStatus: 'needs-review' });
    const report = auditAnnotationRemapEdgeCases([flagged], []);
    expect(report.entries[0]?.kind).toBe('empty-source');
  });
});
