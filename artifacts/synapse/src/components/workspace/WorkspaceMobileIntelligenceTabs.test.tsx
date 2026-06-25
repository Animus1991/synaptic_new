/** @vitest-environment jsdom */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { WorkspaceMobileIntelligenceTabs, intelPanelId } from './WorkspaceMobileIntelligenceTabs';

afterEach(() => cleanup());

describe('WorkspaceMobileIntelligenceTabs', () => {
  it('renders three intelligence tabs with touch-friendly targets', () => {
    render(<WorkspaceMobileIntelligenceTabs active={null} onChange={() => {}} lang="en" />);

    const tablist = screen.getByTestId('workspace-mobile-intel-tabs');
    expect(tablist.getAttribute('role')).toBe('tablist');

    for (const id of ['discover', 'concept-bus', 'weak-areas'] as const) {
      const tab = screen.getByTestId(`workspace-mobile-intel-tab-${id}`);
      expect(tab.className).toContain('min-h-11');
      expect(tab.getAttribute('aria-controls')).toBe(intelPanelId(id));
    }
  });

  it('toggles selection and shows badges', () => {
    const onChange = vi.fn();
    render(
      <WorkspaceMobileIntelligenceTabs
        active="concept-bus"
        onChange={onChange}
        lang="el"
        badges={{ 'weak-areas': 3, 'concept-bus': 5 }}
      />,
    );

    const conceptsTab = screen.getByTestId('workspace-mobile-intel-tab-concept-bus');
    expect(conceptsTab.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();

    fireEvent.click(screen.getByTestId('workspace-mobile-intel-tab-discover'));
    expect(onChange).toHaveBeenCalledWith('discover');
  });

  it('exposes stable panel ids for tabpanels', () => {
    expect(intelPanelId('discover')).toBe('workspace-intel-panel-discover');
    expect(intelPanelId('weak-areas')).toBe('workspace-intel-panel-weak-areas');
  });
});
