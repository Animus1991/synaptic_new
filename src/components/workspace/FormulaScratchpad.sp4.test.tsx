/** @vitest-environment jsdom */
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { FormulaScratchpad } from './FormulaScratchpad';

afterEach(() => cleanup());

describe('FormulaScratchpad — Wave SP4 full-bleed', () => {
  it('empty composer spans the panel without max-width gutters', () => {
    render(<FormulaScratchpad noteFormulas={[]} hasSource concept="Game Theory Basics" />);
    const root = screen.getByTestId('scratchpad-root');
    expect(root.getAttribute('data-bleed')).toBe('full');
    const composer = screen.getByTestId('scratchpad-empty-composer');
    expect(composer.getAttribute('data-bleed')).toBe('full');
    expect(screen.getByTestId('scratchpad-composer-surface')).toBeTruthy();
    expect(screen.getByTestId('scratchpad-composer-start').textContent).toMatch(/Let.?s go|Πάμε/);
    const narrow = composer.querySelector('.max-w-lg');
    expect(narrow).toBeNull();
  });
});
