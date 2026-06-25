import { describe, expect, it } from 'vitest';
import {
  WORKSPACE_TOOLS,
  WORKSPACE_TOOL_GROUPS,
  getWorkspaceToolMeta,
  workspaceToolLabel,
  PRIMARY_WORKSPACE_TOOLS,
} from './workspaceToolRegistry';

describe('workspaceToolRegistry', () => {
  it('lists all dock tools with metadata', () => {
    expect(WORKSPACE_TOOLS.length).toBeGreaterThanOrEqual(10);
    expect(getWorkspaceToolMeta('reader').label).toBe('Reader');
    expect(workspaceToolLabel('reader', 'el')).toBe('Ανάγνωση');
    expect(workspaceToolLabel('concept-map', 'el')).toBe('Χάρτης εννοιών');
  });

  it('groups cover every registered tool once', () => {
    const grouped = new Set(WORKSPACE_TOOL_GROUPS.flatMap((g) => g.tools));
    for (const tool of WORKSPACE_TOOLS) {
      expect(grouped.has(tool.id)).toBe(true);
    }
  });

  it('does not duplicate Greek Σημειώσεις between scratchpad and annotations', () => {
    const scratch = workspaceToolLabel('scratchpad', 'el');
    const ann = workspaceToolLabel('annotations', 'el');
    expect(scratch).not.toBe(ann);
    expect(scratch).toBe('Πρόχειρο');
    expect(ann).toBe('Επισημάνσεις');
  });

  it('exposes primary tool strip subset', () => {
    expect(PRIMARY_WORKSPACE_TOOLS).toContain('reader');
    expect(PRIMARY_WORKSPACE_TOOLS).toContain('quiz');
    expect(PRIMARY_WORKSPACE_TOOLS.length).toBeLessThan(WORKSPACE_TOOLS.length);
  });
});
