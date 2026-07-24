/** @vitest-environment jsdom */
import { type ReactElement } from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { WorkspaceToolEmptyState } from './WorkspaceToolEmptyState';
import { WorkspaceEmptyActionsProvider } from './WorkspaceEmptyActionsContext';
import { buildWorkspaceEmptyActions } from '../../lib/workspaceEmptyState';

afterEach(() => cleanup());

function renderWithActions(ui: ReactElement) {
  const resolve = (tool: Parameters<typeof buildWorkspaceEmptyActions>[0]['tool']) =>
    buildWorkspaceEmptyActions({
      tool,
      hasSource: true,
      lang: 'en',
      onReprocess: vi.fn(),
      onSwitchTool: vi.fn(),
    });
  return render(
    <WorkspaceEmptyActionsProvider resolve={resolve}>
      {ui}
    </WorkspaceEmptyActionsProvider>,
  );
}

describe('WorkspaceToolEmptyState — §2.7 high-traffic tools', () => {
  it('quiz no-source shows upload-gated empty state', () => {
    render(
      <WorkspaceToolEmptyState tool="quiz" hasSource={false} onUpload={vi.fn()} />,
    );
    const empty = screen.getByTestId('workspace-empty-state');
    expect(empty.getAttribute('data-tool')).toBe('quiz');
    expect(empty.getAttribute('data-has-source')).toBe('false');
    expect(screen.getByTestId('workspace-empty-upload')).toBeTruthy();
  });

  it('quiz has-source shows reprocess CTA from context, not upload', () => {
    renderWithActions(
      <WorkspaceToolEmptyState tool="quiz" hasSource concept="Elasticity" />,
    );
    const empty = screen.getByTestId('workspace-empty-state');
    expect(empty.getAttribute('data-has-source')).toBe('true');
    expect(screen.getByTestId('workspace-empty-reprocess')).toBeTruthy();
    expect(screen.queryByTestId('workspace-empty-upload')).toBeNull();
    expect(screen.getByText(/Elasticity/i)).toBeTruthy();
  });

  it('reader uses learning-outcome title when source exists', () => {
    renderWithActions(
      <WorkspaceToolEmptyState tool="reader" hasSource concept="Markets" />,
    );
    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.getByText(/Nothing to show in this tool yet/i)).toBeTruthy();
  });

  it('merges legacy secondary with context reprocess actions', () => {
    renderWithActions(
      <WorkspaceToolEmptyState
        tool="scratchpad"
        hasSource
        concept="Elasticity"
        secondaryLabel="Add custom formula"
        onSecondary={vi.fn()}
      />,
    );
    expect(screen.getByTestId('workspace-empty-reprocess')).toBeTruthy();
    expect(screen.getByText('Add custom formula')).toBeTruthy();
  });
});
