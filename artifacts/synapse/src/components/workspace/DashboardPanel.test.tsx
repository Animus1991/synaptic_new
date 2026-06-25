/** @vitest-environment jsdom */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { DashboardPanel } from './DashboardPanel';

afterEach(() => cleanup());

const session = {
  sectionLabel: 'Markets',
  weakExtraction: false,
  passageGrounded: false,
  hasSource: true,
  weakSpotCount: 1,
  toolActivityCount: 2,
  engagedToolCount: 2,
  suggestFocusTool: 'quiz' as const,
};

const miniProps = {
  readiness: 58,
  streak: 2,
  reviewsDue: 1,
  studyTimeToday: 20,
  studyTimeWeek: 80,
  weakSpots: [{ concept: 'Tariffs', mastery: 40, course: 'Econ' }],
  nextActions: [],
  conceptsMastered: 2,
  totalConcepts: 8,
  toolActivity: [{ tool: 'reader' as const, count: 2, lastAt: 1 }],
};

describe('DashboardPanel — session export (Wave 5E)', () => {
  it('renders export actions when source is grounded', () => {
    render(
      <DashboardPanel
        session={session}
        concept="Tariffs"
        lang="en"
        miniProps={miniProps}
        courseName="Econ 101"
      />,
    );
    expect(screen.getByTestId('dashboard-export-actions')).toBeTruthy();
    expect(screen.getByTestId('dashboard-export-pdf')).toBeTruthy();
    expect(screen.getByTestId('dashboard-export-json')).toBeTruthy();
  });

  it('triggers HTML download on export click', () => {
    const click = vi.fn();
    const createElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = createElement(tag);
      if (tag === 'a') {
        el.click = click;
      }
      return el;
    });
    URL.createObjectURL = vi.fn(() => 'blob:test');
    URL.revokeObjectURL = vi.fn();

    render(
      <DashboardPanel
        session={session}
        concept="Tariffs"
        lang="en"
        miniProps={miniProps}
      />,
    );
    fireEvent.click(screen.getByTestId('dashboard-export-html'));
    expect(click).toHaveBeenCalled();
  });
});
