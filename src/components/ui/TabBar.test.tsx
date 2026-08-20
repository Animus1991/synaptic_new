/** @vitest-environment jsdom */
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { TabBar } from './primitives';

afterEach(cleanup);

function Harness() {
  const [active, setActive] = useState('overview');
  return (
    <>
      <TabBar
        idPrefix="analytics"
        ariaLabel="Analytics sections"
        activeKey={active}
        onChange={setActive}
        tabs={[
          { key: 'overview', label: 'Overview' },
          { key: 'mastery', label: 'Mastery' },
          { key: 'research', label: 'Research' },
        ]}
      />
      <div
        id={`analytics-panel-${active}`}
        role="tabpanel"
        aria-labelledby={`analytics-tab-${active}`}
      >
        {active}
      </div>
    </>
  );
}

describe('TabBar', () => {
  it('uses a single roving tab stop and connects each tab to its panel id', () => {
    render(<Harness />);
    const tabs = screen.getAllByRole('tab');

    expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1]);
    expect(tabs[0]?.id).toBe('analytics-tab-overview');
    expect(tabs[0]?.getAttribute('aria-controls')).toBe('analytics-panel-overview');
    expect(screen.getByRole('tabpanel').getAttribute('aria-labelledby')).toBe('analytics-tab-overview');
  });

  it('supports Arrow, Home, and End navigation with automatic activation', () => {
    render(<Harness />);
    const overview = screen.getByRole('tab', { name: 'Overview' });
    overview.focus();

    fireEvent.keyDown(overview, { key: 'ArrowRight' });
    const mastery = screen.getByRole('tab', { name: 'Mastery' });
    expect(document.activeElement).toBe(mastery);
    expect(mastery.getAttribute('aria-selected')).toBe('true');

    fireEvent.keyDown(mastery, { key: 'End' });
    const research = screen.getByRole('tab', { name: 'Research' });
    expect(document.activeElement).toBe(research);
    expect(research.getAttribute('aria-selected')).toBe('true');

    fireEvent.keyDown(research, { key: 'Home' });
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Overview' }));
  });
});
