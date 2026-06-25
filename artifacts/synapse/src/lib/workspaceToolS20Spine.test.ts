import { describe, expect, it } from 'vitest';
import {
  WORKSPACE_TOOL_S20,
  allWorkspaceToolsAudited,
  getToolS20,
  listToolsByReadiness,
  toolLearnerProblem,
  toolsSharingEntity,
} from './workspaceToolS20Spine';
import { WORKSPACE_TOOLS } from './workspaceToolRegistry';

describe('workspaceToolS20Spine', () => {
  it('audits every registered workspace tool', () => {
    expect(allWorkspaceToolsAudited()).toBe(true);
    expect(Object.keys(WORKSPACE_TOOL_S20).length).toBe(WORKSPACE_TOOLS.length);
  });

  it('documents ConceptBus writers for harmonized tools', () => {
    const busWriters = WORKSPACE_TOOLS
      .map((t) => t.id)
      .filter((id) => getToolS20(id).updatesConceptBus);
    expect(busWriters).toContain('reader');
    expect(busWriters).toContain('quiz');
    expect(busWriters).toContain('annotations');
  });

  it('exposes bilingual learner problems', () => {
    expect(toolLearnerProblem('reader', 'en')).toMatch(/understand/i);
    expect(toolLearnerProblem('reader', 'el')).toMatch(/κατανοήσω/i);
  });

  it('links tools through shared Document entity', () => {
    const docTools = toolsSharingEntity('Document');
    expect(docTools.length).toBeGreaterThanOrEqual(8);
    expect(docTools).toContain('reader');
  });

  it('tracks launch-ready vs polish queue', () => {
    const ready = listToolsByReadiness('launch-ready');
    const polish = listToolsByReadiness('needs-polish');
    expect(ready.length + polish.length).toBeLessThanOrEqual(WORKSPACE_TOOLS.length);
    expect(ready).toContain('reader');
  });
});
