/** @vitest-environment jsdom */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LibraryNameDialog } from './LibraryNameDialog';

afterEach(() => cleanup());

describe('LibraryNameDialog', () => {
  it('saves a trimmed name and blocks empty values', () => {
    const onSave = vi.fn().mockReturnValue(true);
    const onClose = vi.fn();
    render(
      <LibraryNameDialog
        open
        lang="en"
        title="Rename course"
        initialValue="Biology"
        onSave={onSave}
        onClose={onClose}
      />,
    );
    fireEvent.change(screen.getByTestId('library-rename-input'), { target: { value: '  Cell biology  ' } });
    fireEvent.click(screen.getByTestId('library-rename-save'));
    expect(onSave).toHaveBeenCalledWith('  Cell biology  ');
    expect(onClose).toHaveBeenCalled();

    cleanup();
    onSave.mockClear();
    render(
      <LibraryNameDialog
        open
        lang="en"
        title="Rename course"
        initialValue="Biology"
        onSave={onSave}
        onClose={onClose}
      />,
    );
    fireEvent.change(screen.getByTestId('library-rename-input'), { target: { value: '   ' } });
    fireEvent.click(screen.getByTestId('library-rename-save'));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toMatch(/name/i);
  });
});
