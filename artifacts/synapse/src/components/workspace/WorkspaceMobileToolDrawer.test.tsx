/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkspaceMobileToolDrawer } from './WorkspaceMobileToolDrawer';

describe('WorkspaceMobileToolDrawer (SW-P1-02)', () => {
  it('lists grouped tools and selects on click', () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(
      <WorkspaceMobileToolDrawer
        open
        onClose={onClose}
        activeTool="reader"
        availableTools={['reader', 'quiz', 'leitner', 'dashboard']}
        onSelectTool={onSelect}
        lang="en"
      />,
    );
    expect(screen.getByTestId('workspace-mobile-tool-drawer')).toBeTruthy();
    fireEvent.click(screen.getByTestId('mobile-tool-quiz'));
    expect(onSelect).toHaveBeenCalledWith('quiz');
    expect(onClose).toHaveBeenCalled();
  });
});
