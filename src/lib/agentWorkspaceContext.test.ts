import { describe, expect, it } from 'vitest';
import {
  buildAgentRetrievalQuery,
  buildAgentContextBanner,
  buildAgentContextSystemBlock,
  formatAgentWorkspaceContextLine,
  serializeAgentWorkspaceContextJson,
  toAgentWorkspaceContextJson,
} from './agentWorkspaceContext';

describe('buildAgentRetrievalQuery', () => {
  it('widens query with course, section, and concept', () => {
    const q = buildAgentRetrievalQuery('Explain tariffs', {
      courseName: 'International Economics',
      stepTitle: 'Lecture 3 — Trade policy',
      concept: 'tariffs',
      stepIndex: 2,
    });
    expect(q).toContain('Explain tariffs');
    expect(q).toContain('tariffs');
    expect(q).toContain('Lecture 3');
    expect(q).toContain('International Economics');
  });

  it('includes selected passage excerpt when present', () => {
    const q = buildAgentRetrievalQuery('Explain this', {
      concept: 'trade',
      selectionExcerpt: 'comparative advantage in beans',
    });
    expect(q).toContain('comparative advantage in beans');
  });
});

describe('formatAgentWorkspaceContextLine', () => {
  it('formats Greek context line', () => {
    const line = formatAgentWorkspaceContextLine(
      { courseName: 'Οικονομία', stepTitle: 'Διάλεξη 1', concept: 'εμπόριο', stepIndex: 0 },
      'el',
    );
    expect(line).toContain('Οικονομία');
    expect(line).toContain('Διάλεξη 1');
  });
});

describe('buildAgentContextBanner', () => {
  it('shows section, step, tool, quality, and pipeline warning', () => {
    const banner = buildAgentContextBanner({
      stepTitle: 'Αγαθά Αναγκαία',
      stepIndex: 3,
      stepCount: 8,
      activeToolLabel: 'Ανάγνωση',
      sourceQuality: 37,
      oldPipeline: true,
      pipelineVersion: '2.0.0',
    }, 'el');
    expect(banner?.line).toContain('Αγαθά');
    expect(banner?.line).toContain('Βήμα 4/8');
    expect(banner?.line).toContain('Ανάγνωση');
    expect(banner?.line).toContain('37/100');
    expect(banner?.caution).toBeTruthy();
    expect(banner?.contextJson?.stepTitle).toBe('Αγαθά Αναγκαία');
  });

  it('surfaces a handwriting caution and bit when source was handwritten', () => {
    const banner = buildAgentContextBanner({
      stepTitle: 'Notes page 2',
      stepIndex: 1,
      stepCount: 4,
      activeToolLabel: 'Reader',
      sourceQuality: 80,
      handwrittenSource: true,
    }, 'en');
    expect(banner?.line).toContain('Handwritten source');
    expect(banner?.caution).toContain('handwriting recognition');
    expect(banner?.contextJson?.handwrittenSource).toBe(true);
  });

  it('prioritizes low-quality caution over handwriting caution', () => {
    const banner = buildAgentContextBanner({
      stepTitle: 'Notes',
      stepIndex: 0,
      stepCount: 3,
      activeToolLabel: 'Reader',
      sourceQuality: 30,
      handwrittenSource: true,
    }, 'en');
    expect(banner?.caution).toContain('low extraction quality');
  });

  it('surfaces selection excerpt in banner and JSON handoff', () => {
    const excerpt = 'Απόλυτα πλεονεκτήματα και διεθνές εμπόριο';
    const banner = buildAgentContextBanner({
      stepTitle: 'Lecture 2',
      stepIndex: 1,
      stepCount: 4,
      activeToolLabel: 'Reader',
      selectionExcerpt: excerpt,
    }, 'en');
    expect(banner?.line).toContain('Απόλυτα');
    expect(banner?.contextJson?.selectionExcerpt).toBe(excerpt);
  });
});

describe('toAgentWorkspaceContextJson (SW-P2-05)', () => {
  it('strips undefined and serializes stable JSON', () => {
    const json = toAgentWorkspaceContextJson({
      courseName: 'Microeconomics',
      stepIndex: 1,
      stepCount: 5,
      stepTitle: 'Supply',
      concept: 'elasticity',
      activeTool: 'reader',
      activeToolLabel: 'Reader',
    });
    expect(json).toEqual({
      courseName: 'Microeconomics',
      stepIndex: 1,
      stepCount: 5,
      stepTitle: 'Supply',
      concept: 'elasticity',
      activeTool: 'reader',
      activeToolLabel: 'Reader',
    });
    const text = serializeAgentWorkspaceContextJson(json);
    expect(text).toContain('"concept": "elasticity"');
    expect(text).not.toContain('undefined');
  });

  it('buildAgentContextSystemBlock includes JSON fence', () => {
    const block = buildAgentContextSystemBlock({
      courseName: 'Οικονομία',
      stepTitle: 'Διάλεξη 1',
      concept: 'εμπόριο',
      stepIndex: 0,
    }, 'el');
    expect(block).toContain('Context χώρου μελέτης');
    expect(block).toContain('```json');
    expect(block).toContain('"concept": "εμπόριο"');
  });
});
