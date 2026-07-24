/** @vitest-environment jsdom */
import { describe, expect, it, afterEach, vi, beforeEach } from 'vitest';
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react';
import { CognitiveReader } from './CognitiveReader';
import type { GlossaryEntry } from '../../types';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const glossary: GlossaryEntry[] = [{
  term: 'Elasticity',
  definition: 'Responsiveness of quantity to price.',
  source: 'test',
  relatedConcepts: [],
  courseId: 'c1',
}];

describe('CognitiveReader — TOOL-RD-02 glossary hover', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('opens glossary popover on hover after delay', () => {
    render(
      <CognitiveReader
        text="Elasticity measures how quantity responds to price changes in markets."
        concept="Elasticity"
        glossary={glossary}
        hasSource
      />,
    );

    const term = screen.getByTestId('reader-glossary-term');
    fireEvent.mouseEnter(term);
    expect(screen.queryByTestId('reader-glossary-popover')).toBeNull();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    const popover = screen.getByTestId('reader-glossary-popover');
    expect(popover.textContent).toMatch(/Elasticity/i);
    expect(popover.textContent).toMatch(/Responsiveness/i);
  });

  it('opens glossary popover immediately on click', () => {
    render(
      <CognitiveReader
        text="Elasticity measures how quantity responds to price."
        concept="Elasticity"
        glossary={[{ ...glossary[0]!, definition: 'Price sensitivity.' }]}
        hasSource
      />,
    );

    fireEvent.click(screen.getByTestId('reader-glossary-term'));
    expect(screen.getByTestId('reader-glossary-popover')).toBeTruthy();
  });
});
