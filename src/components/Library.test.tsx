/** @vitest-environment jsdom */
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Library } from './Library';
import { mockCourses } from '../demo/mockData';
import type { UploadedFile } from '../types';

afterEach(() => cleanup());

beforeEach(() => {
  try {
    localStorage.clear();
  } catch {
    /* ignore */
  }
});

const errorFile: UploadedFile = {
  id: 'file-err-1',
  name: 'Broken_Notes.pdf',
  type: 'pdf',
  size: 12_000,
  uploadedAt: '2026-07-01T10:00:00.000Z',
  status: 'error',
  progress: 0,
  courseId: 'c1',
};

function renderLibrary(overrides: Partial<Parameters<typeof Library>[0]> = {}) {
  const onUpload = vi.fn();
  const onSelectCourse = vi.fn();
  const onRemoveFile = vi.fn();
  const onReprocessCourse = vi.fn();

  render(
    <Library
      courses={mockCourses.slice(0, 2)}
      uploadedFiles={[errorFile]}
      onSelectCourse={onSelectCourse}
      onUpload={onUpload}
      onRemoveFile={onRemoveFile}
      onReprocessCourse={onReprocessCourse}
      {...overrides}
    />,
  );

  return { onUpload, onSelectCourse, onRemoveFile, onReprocessCourse };
}

describe('Library P0', () => {
  it('error files show status pill, remove, and retry', async () => {
    const { onRemoveFile, onReprocessCourse } = renderLibrary();
    fireEvent.click(screen.getByTestId('library-tab-files'));

    await waitFor(() => {
      expect(screen.getByTestId('library-file-error-file-err-1')).toBeTruthy();
    });
    expect(screen.getByTestId('library-remove-file-err-1')).toBeTruthy();
    expect(screen.getByTestId('library-reprocess-file-err-1')).toBeTruthy();

    fireEvent.click(screen.getByTestId('library-reprocess-file-err-1'));
    expect(onReprocessCourse).toHaveBeenCalledWith('c1');

    fireEvent.click(screen.getByTestId('library-remove-file-err-1'));
    expect(screen.getByTestId('library-remove-dialog-file-err-1')).toBeTruthy();
    fireEvent.click(screen.getByTestId('library-remove-dialog-file-err-1-confirm'));
    expect(onRemoveFile).toHaveBeenCalledWith('file-err-1');
  });

  it('+ File chip opens upload in extend mode for that course', () => {
    const { onUpload } = renderLibrary();
    fireEvent.click(screen.getByTestId('library-add-file-c1'));
    expect(onUpload).toHaveBeenCalledWith({ mode: 'extend', targetCourseId: 'c1' });
  });

  it('header upload stays new-course (no intent)', () => {
    const { onUpload } = renderLibrary();
    fireEvent.click(screen.getByTestId('library-upload'));
    expect(onUpload.mock.calls[0]).toEqual([]);
  });

  it('course cards open via dedicated open control (no nested role=button)', () => {
    const { onSelectCourse } = renderLibrary();
    const cards = screen.getAllByTestId('library-course-card');
    expect(cards[0].getAttribute('role')).not.toBe('button');
    fireEvent.click(screen.getByTestId('library-open-course-c1'));
    expect(onSelectCourse).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1' }));
  });

  it('list rows are keyboard-openable via primary control', () => {
    const { onSelectCourse } = renderLibrary();
    fireEvent.click(screen.getByLabelText(/list view/i));
    const open = screen.getByTestId('library-open-course-list-c1');
    fireEvent.keyDown(open, { key: 'Enter' });
    fireEvent.click(open);
    expect(onSelectCourse).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1' }));
  });
});
