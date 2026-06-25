import { describe, expect, it } from 'vitest';
import type { StoredAnnotation } from './annotationStore';
import {
  autoRemapAnnotations,
  buildAnnotationRemapPlan,
  remapAnnotationToLine,
  suggestAnnotationRemapCandidates,
} from './annotationAnchorRemap';

const newLines = [
  'ΔΙΑΛΕΞΗ 1 — ΕΙΣΑΓΩΓΗ',
  'Θεματική: εμπορική πολιτική και συναλλαγές.',
  'Απόλυτα πλεονεκτήματα Ricardo.',
  'Συγκριτικό πλεονέκτημα.',
];

describe('annotationAnchorRemap', () => {
  it('suggests high-confidence line for shifted but similar excerpt', () => {
    const ann: StoredAnnotation = {
      id: 'a1',
      type: 'highlight',
      text: '',
      color: '#818cf8',
      lineStart: 99,
      lineEnd: 99,
      anchor: { fileKey: 'f.pdf', excerpt: 'εμπορική πολιτική', pipelineVersion: '2.0.0' },
      anchorStatus: 'needs-review',
    };
    const candidates = suggestAnnotationRemapCandidates(ann, newLines);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0]!.confidence).toBe('high');
    expect(candidates[0]!.lineIndex).toBe(1);
  });

  it('builds remap plan only for flagged annotations', () => {
    const items: StoredAnnotation[] = [
      {
        id: 'ok',
        type: 'pin',
        text: '',
        color: '#34d399',
        lineStart: 0,
        lineEnd: 0,
        anchorStatus: 'ok',
      },
      {
        id: 'bad',
        type: 'comment',
        text: 'note',
        color: '#fbbf24',
        lineStart: 50,
        lineEnd: 50,
        anchor: { fileKey: 'f.pdf', excerpt: 'Deleted tariffs paragraph', pipelineVersion: '2.0.0' },
        anchorStatus: 'needs-review',
      },
    ];
    const plan = buildAnnotationRemapPlan(items, newLines);
    expect(plan).toHaveLength(1);
    expect(plan[0]!.annotation.id).toBe('bad');
  });

  it('auto-remaps high-confidence matches', () => {
    const items: StoredAnnotation[] = [{
      id: 'a1',
      type: 'highlight',
      text: '',
      color: '#818cf8',
      lineStart: 99,
      lineEnd: 99,
      anchor: { fileKey: 'f.pdf', excerpt: 'εμπορική πολιτική', pipelineVersion: '2.0.0' },
      anchorStatus: 'needs-review',
    }];
    const result = autoRemapAnnotations(items, newLines, '2.4.0');
    expect(result.remapped).toBe(1);
    expect(result.stillFlagged).toBe(0);
    expect(result.items[0]!.anchorStatus).toBe('ok');
    expect(result.items[0]!.lineStart).toBe(1);
  });

  it('remapAnnotationToLine updates anchor excerpt and status', () => {
    const ann: StoredAnnotation = {
      id: 'a1',
      type: 'highlight',
      text: '',
      color: '#818cf8',
      lineStart: 0,
      lineEnd: 0,
      anchorStatus: 'legacy',
    };
    const remapped = remapAnnotationToLine(ann, 2, newLines, '2.4.0');
    expect(remapped.anchorStatus).toBe('ok');
    expect(remapped.anchor?.excerpt).toContain('Ricardo');
    expect(remapped.anchor?.pipelineVersion).toBe('2.4.0');
  });

  it('preserves multi-line span when remapping', () => {
    const ann: StoredAnnotation = {
      id: 'multi',
      type: 'highlight',
      text: '',
      color: '#818cf8',
      lineStart: 99,
      lineEnd: 101,
      anchor: { fileKey: 'f.pdf', excerpt: 'εμπορική πολιτική', pipelineVersion: '2.0.0' },
      anchorStatus: 'needs-review',
    };
    const remapped = remapAnnotationToLine(ann, 1, newLines, '2.4.0');
    expect(remapped.lineStart).toBe(1);
    expect(remapped.lineEnd).toBe(3);
  });

  it('skips auto-remap when high-confidence candidates are ambiguous', () => {
    const ambiguousLines = [
      'Supply shifts when costs rise.',
      'Demand shifts when income rises.',
    ];
    const items: StoredAnnotation[] = [{
      id: 'a1',
      type: 'highlight',
      text: '',
      color: '#818cf8',
      lineStart: 5,
      lineEnd: 5,
      anchor: { fileKey: 'f.pdf', excerpt: 'shifts when', pipelineVersion: '2.0.0' },
      anchorStatus: 'needs-review',
    }];
    const result = autoRemapAnnotations(items, ambiguousLines, '2.4.0');
    expect(result.remapped).toBe(0);
    expect(result.stillFlagged).toBe(1);
  });
});
