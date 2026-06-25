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
  headers: ['Dimension', 'A', 'B'],
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

  it('shows §13.5 parity strip', () => {
    render(
      <ComparePanel
        session={session}
        concept="Elasticity"
        lang="en"
        onSelectionAction={vi.fn()}
      />,
    );
    expect(screen.getByTestId('compare-selection-parity-strip')).toBeTruthy();
    expect(screen.getByTestId('compare-selection-parity-strip').textContent).toMatch(/§13\.5/);
  });
});
