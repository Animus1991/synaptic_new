import { describe, expect, it } from 'vitest';
import { WORKSPACE_TOOL_CROSS_LINKS, getToolCrossLinkDef } from './workspaceToolCrossLinks';
import type { WorkspaceToolId } from './taskFlows';

const ALL_TOOLS: WorkspaceToolId[] = [
  'reader', 'annotations', 'scratchpad', 'concept-map', 'feynman', 'compare',
  'debate', 'quiz', 'leitner', 'simulator', 'whiteboard', 'timer', 'dashboard',
];

describe('workspaceToolCrossLinks', () => {
  it('defines cross-links for every workspace tool', () => {
    for (const tool of ALL_TOOLS) {
      const def = getToolCrossLinkDef(tool);
      expect(def.id).toBe(tool);
      expect(def.related.length).toBeGreaterThan(0);
      expect(def.purposeEn.length).toBeGreaterThan(10);
      expect(def.agentPromptEl.length).toBeGreaterThan(5);
    }
    expect(Object.keys(WORKSPACE_TOOL_CROSS_LINKS)).toHaveLength(ALL_TOOLS.length);
  });

  it('reader follows into practice tools', () => {
    expect(WORKSPACE_TOOL_CROSS_LINKS.reader.follows).toContain('quiz');
  });

  it('quiz links to leitner for remediation', () => {
    expect(WORKSPACE_TOOL_CROSS_LINKS.quiz.related.some((l) => l.tool === 'leitner')).toBe(true);
  });
});
