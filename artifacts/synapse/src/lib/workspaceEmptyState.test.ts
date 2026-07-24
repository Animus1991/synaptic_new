import { describe, expect, it, vi } from 'vitest';
import {
  buildWorkspaceEmptyActions,
  buildWorkspaceEmptyView,
  workspaceEmptyTitle,
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

  it('builds upload action when no source', () => {
    const upload = vi.fn();
    const actions = buildWorkspaceEmptyActions({
      tool: 'reader',
      hasSource: false,
      lang: 'en',
      onUpload: upload,
    });
    expect(actions).toHaveLength(1);
    expect(actions[0]?.id).toBe('upload');
    actions[0]?.onClick();
    expect(upload).toHaveBeenCalled();
  });

  it('builds weak-areas tool switch actions when source exists', () => {
    const switchTool = vi.fn();
    const actions = buildWorkspaceEmptyActions({
      tool: 'weak-areas',
      hasSource: true,
      lang: 'en',
      onSwitchTool: switchTool,
    });
    expect(actions.length).toBeGreaterThanOrEqual(2);
    expect(actions[0]?.id).toBe('switch-tool');
    actions[0]?.onClick();
    expect(switchTool).toHaveBeenCalledWith('quiz');
  });

  it('builds reprocess and related-tool actions when source exists', () => {
    const reprocess = vi.fn();
    const switchTool = vi.fn();
    const actions = buildWorkspaceEmptyActions({
      tool: 'quiz',
      hasSource: true,
      lang: 'en',
      onReprocess: reprocess,
      onSwitchTool: switchTool,
    });
    expect(actions.map((a) => a.id)).toEqual(['reprocess', 'switch-tool']);
    actions[0]?.onClick();
    actions[1]?.onClick();
    expect(reprocess).toHaveBeenCalled();
    expect(switchTool).toHaveBeenCalled();
  });

  it('buildWorkspaceEmptyView bundles title, message, and actions', () => {
    const view = buildWorkspaceEmptyView({
      tool: 'reader',
      hasSource: false,
      lang: 'en',
      onUpload: () => {},
    });
    expect(view.title).toBe(workspaceEmptyTitle({ hasSource: false, lang: 'en' }));
    expect(view.message).toBe(workspaceNoSourceMessage('en'));
    expect(view.actions).toHaveLength(1);
    expect(view.actions[0]?.id).toBe('upload');
  });
});
