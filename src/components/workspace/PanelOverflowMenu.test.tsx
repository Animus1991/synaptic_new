/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PanelOverflowMenu } from './PanelOverflowMenu';

afterEach(cleanup);

describe('PanelOverflowMenu', () => {
  it('opens via summary and closes on Escape', () => {
    render(
      <PanelOverflowMenu ariaLabel="More actions" triggerTestId="overflow-trigger">
        <button type="button">Export</button>
      </PanelOverflowMenu>,
    );

    const trigger = screen.getByTestId('overflow-trigger');
    const details = trigger.closest('details');
    expect(details).not.toBeNull();
    expect(details!.open).toBe(false);

    fireEvent.click(trigger);
    expect(details!.open).toBe(true);
    expect(screen.getByRole('menu')).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(details!.open).toBe(false);
  });

  it('closes on outside pointerdown', () => {
    render(
      <PanelOverflowMenu ariaLabel="More" triggerTestId="overflow-trigger">
        <button type="button">Item</button>
      </PanelOverflowMenu>,
    );
    const trigger = screen.getByTestId('overflow-trigger');
    const details = trigger.closest('details')!;
    fireEvent.click(trigger);
    expect(details.open).toBe(true);

    fireEvent.pointerDown(document.body);
    expect(details.open).toBe(false);
  });
});
