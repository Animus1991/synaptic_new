/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { OverflowChipRow } from './OverflowChipRow';

afterEach(() => cleanup());

describe('OverflowChipRow OPT-K14', () => {
  const items = [
    { key: 'a', label: 'Alpha' },
    { key: 'b', label: 'Beta' },
    { key: 'c', label: 'Gamma' },
    { key: 'd', label: 'Delta' },
  ];

  it('shows +N and expands to every tag', () => {
    render(
      <OverflowChipRow
        testId="chips"
        maxVisible={2}
        items={items}
      />,
    );

    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.getByText('Beta')).toBeTruthy();
    expect(screen.queryByText('Gamma')).toBeNull();
    expect(screen.getByTestId('chips-more').textContent).toBe('+2');

    fireEvent.click(screen.getByTestId('chips-more'));

    expect(screen.getByText('Gamma')).toBeTruthy();
    expect(screen.getByText('Delta')).toBeTruthy();
    expect(screen.getByTestId('chips').getAttribute('data-overflow-expanded')).toBe('true');
  });
});
