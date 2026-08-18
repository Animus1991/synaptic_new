/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ExamPrepPage } from './ExamPrepPage';
import { mockCourses, mockTasks } from '../demo/mockData';

afterEach(() => cleanup());

describe('ExamPrepPage', () => {
  it('renders as a bookmarkable page and starts the first exam task', () => {
    const onStartTask = vi.fn();
    const onOpenExamTasks = vi.fn();
    render(
      <ExamPrepPage
        lang="en"
        courses={mockCourses}
        tasks={mockTasks}
        daysToExam={12}
        onStartTask={onStartTask}
        onOpenExamTasks={onOpenExamTasks}
      />,
    );
    expect(screen.getByTestId('exam-prep-page')).toBeTruthy();
    expect(screen.getByTestId('exam-prep-task-list')).toBeTruthy();
    fireEvent.click(screen.getByTestId('exam-prep-start'));
    expect(onStartTask).toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('exam-prep-open-tasks'));
    expect(onOpenExamTasks).toHaveBeenCalled();
  });

  it('shows an empty state when there are no exam tasks', () => {
    render(
      <ExamPrepPage
        lang="el"
        courses={[]}
        tasks={[]}
        daysToExam={null}
        onStartTask={vi.fn()}
        onOpenExamTasks={vi.fn()}
      />,
    );
    expect((screen.getByTestId('exam-prep-start') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByTestId('exam-prep-task-list')).toBeNull();
  });
});
