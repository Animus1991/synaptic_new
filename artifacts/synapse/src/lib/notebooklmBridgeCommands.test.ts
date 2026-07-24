import { describe, it, expect } from 'vitest';
import { buildNotebookLmBridgeCommands } from './notebooklmBridgeCommands';

describe('notebooklmBridgeCommands', () => {
  it('lists import command when query matches notebooklm', () => {
    const cmds = buildNotebookLmBridgeCommands('notebooklm', 'en');
    expect(cmds.some((c) => c.id === 'import')).toBe(true);
  });

  it('hides course-only commands without active course', () => {
    const cmds = buildNotebookLmBridgeCommands('', 'en', { hasCourse: false });
    expect(cmds.some((c) => c.id === 'shell')).toBe(false);
    expect(cmds.some((c) => c.id === 'export-review')).toBe(false);
  });

  it('includes shell and export when course is active', () => {
    const cmds = buildNotebookLmBridgeCommands('', 'en', { hasCourse: true });
    expect(cmds.some((c) => c.id === 'shell')).toBe(true);
    expect(cmds.some((c) => c.id === 'export-review')).toBe(true);
  });
});
