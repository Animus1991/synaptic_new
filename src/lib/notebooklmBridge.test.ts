import { describe, it, expect } from 'vitest';
import { notebookLmSourceLabel } from './notebooklmBridge';

describe('notebooklmBridge', () => {
  it('labels notebooklm-import files without extension', () => {
    expect(notebookLmSourceLabel('Statistical Methods.md', 'notebooklm-import')).toBe('Statistical Methods');
  });

  it('keeps regular file names', () => {
    expect(notebookLmSourceLabel('lecture.pdf', 'text-layer')).toBe('lecture.pdf');
  });
});
