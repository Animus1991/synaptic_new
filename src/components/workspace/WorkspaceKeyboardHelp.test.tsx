import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react';
import { WorkspaceKeyboardHelp } from './WorkspaceKeyboardHelp';

describe('WorkspaceKeyboardHelp (SW-P3-08)', () => {
  afterEach(() => {
    cleanup();
  });
  it('shows Greek shortcut labels', () => {
    render(<WorkspaceKeyboardHelp open onClose={vi.fn()} lang="el" />);
    expect(screen.getByTestId('workspace-keyboard-help')).toBeTruthy();
    expect(screen.getByText('Συντομεύσεις πληκτρολογίου')).toBeTruthy();
    expect(screen.getByText(/συντομεύσεων πληκτρολογίου/)).toBeTruthy();
  });

  it('closes via close button', () => {
    const onClose = vi.fn();
    render(<WorkspaceKeyboardHelp open onClose={onClose} lang="en" />);
    const dialog = screen.getByTestId('workspace-keyboard-help');
    fireEvent.click(within(dialog).getByLabelText('Close'));
    expect(onClose).toHaveBeenCalled();
  });
});
