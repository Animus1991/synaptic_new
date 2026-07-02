import { describe, expect, it } from 'vitest';
import type { StoredAnnotation } from './annotationStore';
import {
  buildAnnotationAnchor,
  conceptSignalForAnnotationCategory,
  refreshAnnotationsAfterReprocess,
  resolveAnnotationLineIndex,
  countAnnotationsNeedingReview,
  normalizeAnnotationAnchorStatus,
} from './annotationAnchor';

describe('annotationAnchor', () => {
  const lines = [
    'ΔΙΑΛΕΞΗ 1 ΕΙΣΑΓΩΓΗ',
    'Θεματική: εμπορική πολιτική.',
    'Απόλυτα πλεονεκτήματα.',
  ];

  it('builds anchor with excerpt from line', () => {
    const anchor = buildAnnotationAnchor('syllabus.pdf', lines, 1, {
      courseId: 'c1',
      pipelineVersion: '2.4.0',
    });
    expect(anchor.excerpt).toContain('εμπορική');
    expect(anchor.pipelineVersion).toBe('2.4.0');
  });

  it('builds anchor with span excerpt', () => {
    const line = 'Price elasticity measures responsiveness.';
    const anchor = buildAnnotationAnchor('notes.pdf', [line], 0, {
      charStart: 6,
      charEnd: 16,
    });
    expect(anchor.excerpt).toBe('elasticity');
  });

  it('resolves line index from excerpt after text shift', () => {
    const newLines = ['Header', ...lines];
    expect(resolveAnnotationLineIndex('εμπορική πολιτική', newLines)).toBe(2);
  });

  it('maps confusing and exam categories to concept signals', () => {
    expect(conceptSignalForAnnotationCategory('confusing')).toBe('annotated-confusing');
    expect(conceptSignalForAnnotationCategory('exam-relevant')).toBe('annotated-exam');
  });

  it('re-anchors annotations on reprocess when excerpt still exists', () => {
    const items: StoredAnnotation[] = [{
      id: 'a1',
      type: 'highlight',
      text: '',
      color: '#818cf8',
      lineStart: 1,
      lineEnd: 1,
      anchor: buildAnnotationAnchor('f.pdf', lines, 1, { pipelineVersion: '2.0.0' }),
    }];
    const refreshed = refreshAnnotationsAfterReprocess(items, lines, '2.4.0');
    expect(refreshed[0]!.lineStart).toBe(1);
    expect(refreshed[0]!.anchorStatus).toBe('ok');
    expect(refreshed[0]!.anchor?.pipelineVersion).toBe('2.4.0');
  });

  it('flags needs-review when excerpt cannot be found', () => {
    const items: StoredAnnotation[] = [{
      id: 'a2',
      type: 'comment',
      text: 'note',
      color: '#fbbf24',
      lineStart: 99,
      lineEnd: 99,
      anchor: { fileKey: 'f.pdf', excerpt: 'Deleted paragraph about tariffs', pipelineVersion: '2.0.0' },
    }];
    const refreshed = refreshAnnotationsAfterReprocess(items, lines, '2.4.0');
    expect(refreshed[0]!.anchorStatus).toBe('needs-review');
    expect(countAnnotationsNeedingReview(refreshed)).toBe(1);
  });

  it('marks legacy when pipeline version differs', () => {
    const ann: StoredAnnotation = {
      id: 'a3',
      type: 'pin',
      text: '',
      color: '#34d399',
      lineStart: 0,
      lineEnd: 0,
      anchor: { fileKey: 'f.pdf', excerpt: 'ΔΙΑΛΕΞΗ 1', pipelineVersion: '2.0.0' },
      anchorStatus: 'ok',
    };
    const normalized = normalizeAnnotationAnchorStatus(ann, '2.4.0');
    expect(normalized.anchorStatus).toBe('legacy');
  });
});
