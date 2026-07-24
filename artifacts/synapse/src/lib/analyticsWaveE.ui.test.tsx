/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  AnalyticsDateRangeFilter,
  AnalyticsDateRangeProvider,
  useAnalyticsDateRange,
} from '../components/analytics/AnalyticsDateRangeContext';
import { SubjectMasteryGrid } from '../components/analytics/SubjectMasteryGrid';
import type { SubjectMasteryTile } from './subjectMasteryAnalytics';

function RangeProbe() {
  const { range } = useAnalyticsDateRange();
  return <span data-testid="range-probe">{range}</span>;
}

describe('AnalyticsDateRangeFilter', () => {
  it('provides range to children and updates on click', () => {
    render(
      <AnalyticsDateRangeProvider initial="7d">
        <AnalyticsDateRangeFilter />
        <RangeProbe />
      </AnalyticsDateRangeProvider>,
    );
    expect(screen.getByTestId('range-probe').textContent).toBe('7d');
    fireEvent.click(screen.getByTestId('analytics-range-30d'));
    expect(screen.getByTestId('range-probe').textContent).toBe('30d');
  });
});

describe('SubjectMasteryGrid', () => {
  it('renders a tile for each course mastery entry', () => {
    const tiles: SubjectMasteryTile[] = [
      {
        courseId: 'c1',
        title: 'Physics',
        mastery: 55,
        pendingConcepts: 2,
        trend: 'up',
        trendDelta: 1,
        color: '#abc',
        icon: 'atom',
        topics: [],
      },
      {
        courseId: 'c2',
        title: 'Math',
        mastery: 70,
        pendingConcepts: 0,
        trend: 'flat',
        trendDelta: 0,
        color: '#def',
        icon: 'calc',
        topics: [],
      },
    ];
    const onSelect = vi.fn();
    render(<SubjectMasteryGrid tiles={tiles} onSelect={onSelect} />);
    expect(screen.getByTestId('subject-mastery-tile-c1')).toBeTruthy();
    expect(screen.getByTestId('subject-mastery-tile-c2')).toBeTruthy();
    expect(screen.getByText('Physics')).toBeTruthy();
    expect(screen.getByText('Math')).toBeTruthy();
  });
});
