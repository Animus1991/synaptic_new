import { describe, expect, it } from 'vitest';
import {
  workspaceEmptyUploadHandler,
  workspaceNoSourceMessage,
  workspaceToolEmptyMessage,
} from './workspaceEmptyState';

describe('workspaceEmptyState', () => {
  it('returns upload message when hasSource is false', () => {
    expect(workspaceToolEmptyMessage({ tool: 'scratchpad', hasSource: false, lang: 'en' }))
      .toBe(workspaceNoSourceMessage('en'));
    expect(workspaceToolEmptyMessage({ tool: 'debate', hasSource: false, lang: 'el' }))
      .toBe(workspaceNoSourceMessage('el'));
  });

  it('returns tool-specific no-extract message when hasSource is true', () => {
    const msg = workspaceToolEmptyMessage({
      tool: 'scratchpad',
      hasSource: true,
      lang: 'en',
      concept: 'Elasticity',
    });
    expect(msg).toContain('Elasticity');
    expect(msg.toLowerCase()).not.toContain('upload');
  });

  it('suppresses upload handler when source exists', () => {
    const upload = () => {};
    expect(workspaceEmptyUploadHandler(true, upload)).toBeUndefined();
    expect(workspaceEmptyUploadHandler(false, upload)).toBe(upload);
  });
});
