/** @vitest-environment jsdom */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { FocusTrapDialog } from './FocusTrapDialog';

describe('FocusTrapDialog (OPT-K105)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders dialog content and closes on Escape', () => {
    const onClose = vi.fn();
    render(
      <FocusTrapDialog open onClose={onClose} title="Trap title" data-testid="trap-dialog">
        <p>Body copy</p>
      </FocusTrapDialog>,
    );
    expect(screen.getByTestId('trap-dialog')).toBeTruthy();
    expect(screen.getByText('Trap title')).toBeTruthy();
    expect(screen.getByText('Body copy')).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
