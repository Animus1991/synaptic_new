/** @vitest-environment jsdom */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ComparePanel } from './ComparePanel';
import type { CompareSessionContent } from '../../lib/compareSessionModel';

afterEach(() => cleanup());

const session: CompareSessionContent = {
  rows: [
    ['Elasticity', 'Price sensitivity', 'Responsiveness'],
    ['Supply', 'Producer side', 'Quantity offered'],
  ],
  headers: ['Dimension', 'Trade', 'Contrast'],
  sectionLabel: 'Markets',
  weakExtraction: false,
  passageGrounded: false,
  hasSource: true,
};

describe('ComparePanel — selection parity §13.5 (Wave 6.8i)', () => {
  it('shows selection bar when a row is clicked', () => {
    const onSelectionAction = vi.fn();
    render(
      <ComparePanel
        session={session}
        concept="Elasticity"
        lang="en"
        onSelectionAction={onSelectionAction}
      />,
    );
    fireEvent.click(screen.getByText('Price sensitivity'));
    expect(screen.getByTestId('compare-selection-actions')).toBeTruthy();
    fireEvent.click(screen.getByTestId('selection-action-open-reader'));
    expect(onSelectionAction).toHaveBeenCalledWith('open-reader', expect.objectContaining({
      term: 'Elasticity',
      originTool: 'compare',
      sectionLabel: 'Markets',
    }));
  });

  it('hides parity strip when selection is wired; shows when missing', () => {
    const { unmount } = render(
      <ComparePanel
        session={session}
        concept="Elasticity"
        lang="en"
        onSelectionAction={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('compare-selection-parity-strip')).toBeNull();
    unmount();

    render(
      <ComparePanel
        session={session}
        concept="Elasticity"
        lang="en"
      />,
    );
    expect(screen.getByTestId('compare-selection-parity-strip')).toBeTruthy();
  });
});

describe('ComparePanel — Wave CMP densify', () => {
  it('is full-bleed with highlight-differences primary and nested filter', () => {
    render(
      <ComparePanel
        session={session}
        concept="Game Theory Basics"
        lang="en"
        onSelectionAction={vi.fn()}
        onAskAgent={vi.fn()}
      />,
    );
    expect(screen.getByTestId('compare-panel').getAttribute('data-bleed')).toBe('full');
    expect(screen.getByTestId('comparison-table').getAttribute('data-bleed')).toBe('full');
    expect(screen.getByTestId('compare-diff-toggle').textContent).toMatch(/Highlight differences/);
    expect(screen.queryByText(/^Agent$/)).toBeNull();
    expect(screen.getByTestId('compare-more-menu')).toBeTruthy();
    expect(screen.getByTestId('compare-filter-chrome')).toBeTruthy();
    expect(screen.queryByTestId('compare-filter')).toBeNull();
    fireEvent.click(screen.getByTestId('compare-filter-chrome-toggle'));
    expect(screen.getByTestId('compare-filter')).toBeTruthy();
  });
});
