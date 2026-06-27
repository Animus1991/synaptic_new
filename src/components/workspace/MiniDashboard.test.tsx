/** @vitest-environment jsdom */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MiniDashboard } from './MiniDashboard';

afterEach(() => cleanup());

const baseProps = {
  readiness: 62,
  streak: 3,
  reviewsDue: 2,
  weakSpots: [],
  nextActions: [],
  conceptsMastered: 4,
  totalConcepts: 12,
};

describe('MiniDashboard — Progress tool activity (Prompt 17)', () => {
  it('renders session tool activity chips when breakdown is non-empty', () => {
    render(
      <MiniDashboard
        {...baseProps}
        embedded
        toolActivity={[
          { tool: 'reader', count: 2, lastAt: 10 },
          { tool: 'quiz', count: 1, lastAt: 20 },
        ]}
      />,
    );

    expect(screen.getByTestId('progress-tool-activity')).toBeTruthy();
    expect(screen.getByTestId('progress-tool-reader').textContent).toContain('×2');
    expect(screen.getByTestId('progress-tool-quiz').textContent).toContain('×1');
  });

  it('hides tool activity section when breakdown is empty', () => {
    render(<MiniDashboard {...baseProps} embedded toolActivity={[]} />);
    expect(screen.queryByTestId('progress-tool-activity')).toBeNull();
  });

  it('opens workspace tool when chip click handler is provided', () => {
    const onOpenToolActivity = vi.fn();
    render(
      <MiniDashboard
        {...baseProps}
        embedded
        toolActivity={[{ tool: 'feynman', count: 1, lastAt: 1 }]}
        onOpenToolActivity={onOpenToolActivity}
      />,
    );

    fireEvent.click(screen.getByTestId('progress-tool-feynman'));
    expect(onOpenToolActivity).toHaveBeenCalledWith('feynman');
  });

  it('shows weak spot reasons and remediation when detail is provided', () => {
    const onRemediate = vi.fn();
    render(
      <MiniDashboard
        {...baseProps}
        embedded
        weakSpots={[{ concept: 'Tariffs', mastery: 30, course: 'Econ' }]}
        weakSpotsDetail={[{
          concept: 'Tariffs',
          mastery: 30,
          course: 'Econ',
          source: 'bus',
          reasons: [{ id: 'quiz-wrong', label: '2× quiz mistakes', severity: 'high' }],
          remediation: [{ id: 'quiz', label: 'Quiz', hint: 'Retest' }],
        }]}
        onRemediateWeakSpot={onRemediate}
      />,
    );
    fireEvent.click(screen.getByText(/status/i));
    fireEvent.click(screen.getByRole('button', { name: /weak/i }));
    expect(screen.getByText('2× quiz mistakes')).toBeTruthy();
    fireEvent.click(screen.getByText('Quiz'));
    expect(onRemediate).toHaveBeenCalledWith('Tariffs', 'quiz');
  });
});
