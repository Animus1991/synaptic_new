/** @vitest-environment jsdom */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NotebookLmImportPanel } from './NotebookLmImportPanel';

afterEach(() => cleanup());

const SAMPLE = `# Study Guide — Supply & Demand

Market equilibrium is the price where quantity demanded equals quantity supplied.
When price sits above equilibrium, sellers offer more than buyers want.
`;

describe('NotebookLmImportPanel', () => {
  it('shows the created course and opens it', () => {
    const onImport = vi.fn().mockReturnValue({
      kind: 'study-guide',
      title: 'Study Guide — Supply & Demand',
      markdown: SAMPLE,
      quizCards: [],
      chatTurns: [],
      audioSegments: [],
      courseId: 'c-nlm-1',
      courseTitle: 'Supply & Demand',
    });
    const onOpenCourse = vi.fn();
    render(
      <NotebookLmImportPanel
        lang="en"
        onImport={onImport}
        onOpenCourse={onOpenCourse}
        demoSample
      />,
    );
    fireEvent.change(screen.getByTestId('notebooklm-import-text'), { target: { value: SAMPLE } });
    fireEvent.click(screen.getByTestId('notebooklm-import-submit'));
    expect(onImport).toHaveBeenCalled();
    expect(screen.getByTestId('notebooklm-import-course').textContent).toMatch(/Supply & Demand/);
    fireEvent.click(screen.getByTestId('notebooklm-import-open-course'));
    expect(onOpenCourse).toHaveBeenCalledWith('c-nlm-1');
  });
});
