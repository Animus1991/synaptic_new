import { describe, expect, it } from 'vitest';
import { buildAgentRetrievalQuery, buildAgentContextBanner, formatAgentWorkspaceContextLine } from './agentWorkspaceContext';

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
  });
});
