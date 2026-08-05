/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { WorkspaceToolHeader } from './WorkspaceToolHeader';

describe('WorkspaceToolHeader', () => {
  it('uses ws-tool-header density class', () => {
    const { container } = render(
      <WorkspaceToolHeader activeTool="reader" lang="en" hasSource={false} />,
    );
    const header = container.querySelector('[data-testid="workspace-tool-header"]');
    expect(header?.className).toContain('ws-tool-header');
    expect(container.querySelector('.ws-tool-header-row')).not.toBeNull();
  });

  it('exposes a quiet guide toggle (not a filled chip)', () => {
    const { container } = render(
      <WorkspaceToolHeader activeTool="reader" lang="en" hasSource={false} />,
    );
    const toggle = container.querySelector('[data-testid="workspace-tool-header-toggle"]');
    expect(toggle?.className).toContain('ws-tool-guide-btn');
    expect(toggle?.className).not.toMatch(/ws-chip-/);
  });
});
