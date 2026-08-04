/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { InfoHint } from './InfoHint';

afterEach(cleanup);

describe('InfoHint', () => {
  it('is hidden by default; tap opens (even after the tap already fired focus) and outside tap closes', () => {
    render(<InfoHint label="Explains the control" triggerAriaLabel="What is this?" />);
    expect(screen.queryByRole('tooltip')).toBeNull();

    // Real touch order: mouseenter + focus land before click. Click must be
    // open-only, otherwise the first tap closes the hint it just opened.
    const trigger = screen.getByRole('button', { name: 'What is this?' });
    fireEvent.mouseEnter(trigger);
    fireEvent.focus(trigger);
    fireEvent.click(trigger);
    expect(screen.getByRole('tooltip').textContent).toContain('Explains the control');

    fireEvent.click(trigger);
    expect(screen.getByRole('tooltip')).not.toBeNull();

    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('opens on keyboard focus and closes on Escape', () => {
    render(<InfoHint label="Keyboard accessible" triggerAriaLabel="Info" />);
    const trigger = screen.getByRole('button', { name: 'Info' });

    fireEvent.focus(trigger);
    expect(screen.getByRole('tooltip').textContent).toContain('Keyboard accessible');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('links the trigger to the tooltip via aria-describedby when open', () => {
    render(<InfoHint label="Described" triggerAriaLabel="Info" />);
    const trigger = screen.getByRole('button', { name: 'Info' });
    expect(trigger.getAttribute('aria-describedby')).toBeNull();

    fireEvent.focus(trigger);
    const tooltip = screen.getByRole('tooltip');
    expect(trigger.getAttribute('aria-describedby')).toBe(tooltip.id);
  });
});
