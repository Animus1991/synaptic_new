import { describe, expect, it } from 'vitest';
import { buildWorkspaceMacroCommands } from './workspaceMacros';
import { buildWorkspaceCorrelation } from './workspaceCorrelation';

describe('workspaceMacros', () => {
  it('emits leitner macro when due cards exist', () => {
    const correlation = buildWorkspaceCorrelation({
      progressKey: 'w1',
      concept: 'elasticity',
      conceptMastery: 40,
      stepIndex: 0,
      stepCount: 5,
      leitnerDueCount: 3,
    });
    const cmds = buildWorkspaceMacroCommands({
      lang: 'en',
      correlation,
      openTool: () => {},
      openReaderForTerm: () => {},
      jumpToStep: () => {},
      quizStepIndex: 4,
      focusLayout: () => {},
    });
    expect(cmds.some((c) => c.id === 'macro:leitner-due')).toBe(true);
  });
});
