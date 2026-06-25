/** @vitest-environment jsdom */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { WorkspaceDiscoverabilityPanel } from './WorkspaceDiscoverabilityPanel';
import { buildDiscoverabilitySummary } from '../../lib/workspaceDiscoverability';
import { buildWorkspaceCorrelation } from '../../lib/workspaceCorrelation';
import type { WorkspaceSourceIntelligence } from '../../lib/workspaceNoteContent';

function sampleSourceIntel(overrides: Partial<WorkspaceSourceIntelligence> = {}): WorkspaceSourceIntelligence {
  return {
    score: 80,
    band: 'strong',
    bestTool: 'reader',
    bestToolReason: 'Read first',
    strengths: [],
    gaps: [],
    nextActions: [],
    metrics: {
      passageCount: 2,
      avgPassageRelevance: 0.7,
      sectionCount: 3,
      definitionCount: 1,
      glossaryCount: 2,
      workedExampleCount: 0,
      formulaCount: 0,
      comparisonCount: 0,
      conceptNodeCount: 1,
      stepCount: 4,
    },
    documentStructure: null,
    ...overrides,
  };
}

afterEach(() => cleanup());

function sampleSummary() {
  return buildDiscoverabilitySummary(
    true,
    sampleSourceIntel(),
    buildWorkspaceCorrelation({
      progressKey: 'p1',
      concept: 'elasticity',
      conceptMastery: 40,
      stepIndex: 0,
      stepCount: 4,
    }),
    'reader',
    'en',
    {
      primary: 'study-section',
      reason: 'Read the source text for this section first.',
      secondary: ['ask-agent'],
    },
  );
}

describe('WorkspaceDiscoverabilityPanel — next action sync (Wave 5C)', () => {
  it('renders engine primary CTA and runs handler', () => {
    const onRunNextAction = vi.fn();
    render(
      <WorkspaceDiscoverabilityPanel
        summary={sampleSummary()}
        lang="en"
        expanded
        onToggle={() => {}}
        actions={{}}
        onRunNextAction={onRunNextAction}
        onLearningAction={vi.fn()}
      />,
    );
    expect(screen.getByTestId('discoverability-next-action-primary').textContent).toMatch(/Study section/i);
    fireEvent.click(screen.getByTestId('discoverability-next-action-primary'));
    expect(onRunNextAction).toHaveBeenCalled();
  });

  it('shows secondary learning actions from engine', () => {
    render(
      <WorkspaceDiscoverabilityPanel
        summary={sampleSummary()}
        lang="en"
        expanded
        onToggle={() => {}}
        actions={{}}
        onRunNextAction={vi.fn()}
        onLearningAction={vi.fn()}
      />,
    );
    expect(screen.getByTestId('discoverability-learning-ask-agent')).toBeTruthy();
  });
});
