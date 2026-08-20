/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { InfoHint } from './InfoHint';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('InfoHint', () => {
  it('is hidden by default; first tap opens, second tap closes, and outside tap dismisses', () => {
    render(<InfoHint label="Explains the control" triggerAriaLabel="What is this?" />);
    expect(screen.queryByRole('tooltip')).toBeNull();

    const trigger = screen.getByRole('button', { name: 'What is this?' });
    fireEvent.pointerDown(trigger, { pointerType: 'touch' });
    fireEvent.focus(trigger);
    fireEvent.click(trigger);
    expect(screen.getByRole('tooltip').textContent).toContain('Explains the control');

    fireEvent.pointerDown(trigger, { pointerType: 'touch' });
    fireEvent.click(trigger);
    expect(screen.queryByRole('tooltip')).toBeNull();

    fireEvent.pointerDown(trigger, { pointerType: 'touch' });
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

  it('keeps hover content open while the pointer moves from trigger to bubble', () => {
    vi.useFakeTimers();
    render(<InfoHint label="Hoverable content" triggerAriaLabel="Info" />);
    const trigger = screen.getByRole('button', { name: 'Info' });

    fireEvent.mouseEnter(trigger);
    const tooltip = screen.getByRole('tooltip');
    fireEvent.mouseLeave(trigger);
    fireEvent.mouseEnter(tooltip);
    act(() => vi.advanceTimersByTime(200));
    expect(screen.getByRole('tooltip')).toBe(tooltip);

    fireEvent.mouseLeave(tooltip);
    act(() => vi.advanceTimersByTime(200));
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('clamps a wide tooltip within a narrow viewport', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 320 });
    render(<InfoHint label="A long explanation" triggerAriaLabel="Info" maxWidth={500} />);
    const trigger = screen.getByRole('button', { name: 'Info' });
    trigger.getBoundingClientRect = () => ({
      x: 300,
      y: 20,
      width: 20,
      height: 20,
      top: 20,
      right: 320,
      bottom: 40,
      left: 300,
      toJSON: () => ({}),
    });

    fireEvent.focus(trigger);
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip.style.maxWidth).toBe('304px');
    expect(Number.parseFloat(tooltip.style.left)).toBeLessThanOrEqual(312);
  });
});
