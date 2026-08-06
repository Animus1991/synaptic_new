/** @vitest-environment jsdom */
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { FeynmanCheck } from './FeynmanCheck';

afterEach(() => cleanup());

describe('FeynmanCheck — Wave FY', () => {
  it('renders composer-first with collapsed outline chrome', () => {
    render(
      <FeynmanCheck
        concept="Introduction"
        sectionLabel="Game Theory Basics"
        hasSource
        outline={['Explain the section in plain language.', 'Name one example.']}
        keyTerms={[
          { term: 'Good\'s Own Price', definition: 'Price of the good itself' },
          { term: 'Identical Products Price', definition: 'Price of substitutes' },
        ]}
      />,
    );
    expect(screen.getByTestId('feynman-check')).toBeTruthy();
    expect(screen.getByTestId('feynman-draft')).toBeTruthy();
    expect(screen.getByTestId('feynman-coach-primary')).toBeTruthy();
    expect(screen.getByTestId('feynman-section-label')).toBeTruthy();
    expect(screen.getByTestId('feynman-outline-chrome')).toBeTruthy();
    expect(screen.getByTestId('feynman-terms-chrome')).toBeTruthy();
    expect(screen.getByTestId('feynman-layout').getAttribute('data-side')).toBe('full');
    expect(screen.queryByText(/Feynman Check —/)).toBeNull();
  });
});
