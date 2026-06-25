import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LessonStepToolBar } from './LessonStepToolBar';

describe('LessonStepToolBar (SW-P1-03)', () => {
  it('renders unified step actions and fires onLearningAction', () => {
    const onAction = vi.fn();
    render(
      <LessonStepToolBar
        step={{ title: 'Supply and Demand', type: 'core' }}
        stepIndex={2}
        stepCount={8}
        onOpenTool={vi.fn()}
        onLearningAction={onAction}
        lang="en"
        nextActionRecommendation={{
          primary: 'test-me',
          reason: 'Knowledge check due',
          secondary: ['study-section'],
        }}
      />,
    );
    expect(screen.getByTestId('lesson-step-unified-actions')).toBeTruthy();
    fireEvent.click(screen.getByTestId('lesson-action-explain-zero'));
    expect(onAction).toHaveBeenCalledWith('explain-zero');
    expect(screen.getByTestId('lesson-action-test-me').getAttribute('data-recommended')).toBe('true');
  });
});
