/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { SubjectDrillDown } from '../../components/analytics/SubjectDrillDown';
import { AnalyticsVisualLabPanel } from '../../components/analytics/AnalyticsVisualLabPanel';
import { VISUAL_LAB_MODES } from '../../lib/visualLabModes';
import type { SubjectMasteryTile } from './subjectMasteryAnalytics';

function makeTopic(
  id: string,
  title: string,
  mastery: number,
  order: number,
): SubjectMasteryTile['topics'][number] {
  return {
    id,
    title,
    description: `${title} description`,
    lessons: [],
    mastery,
    prerequisites: [],
    order,
    isLocked: false,
    estimatedMinutes: 10,
    conceptCount: 1,
    retentionPrediction: 0.75,
  };
}

function makeTile(): SubjectMasteryTile {
  return {
    courseId: 'c1',
    title: 'Physics',
    mastery: 55,
    pendingConcepts: 2,
    trend: 'up',
    trendDelta: 1,
    color: '#abc',
    icon: 'atom',
    topics: [
      makeTopic('t1', 'Kinematics', 40, 0),
      makeTopic('t2', 'Dynamics', 70, 1),
    ],
  };
}

afterEach(() => {
  cleanup();
  document.body.style.overflow = '';
});

describe('SubjectDrillDown a11y', () => {
  it('renders nothing when no tile is selected', () => {
    const { container } = render(
      <SubjectDrillDown tile={null} onClose={vi.fn()} onStudyConcept={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('uses the latest onClose without restarting the modal lifecycle and fully handles Escape', () => {
    const firstOnClose = vi.fn();
    const latestOnClose = vi.fn();
    const escapedToWindow = vi.fn();
    const tile = makeTile();
    const { rerender } = render(
      <SubjectDrillDown tile={tile} onClose={firstOnClose} onStudyConcept={vi.fn()} />,
    );
    const studyButton = screen.getByTestId('subject-drill-study-t1');
    studyButton.focus();

    rerender(
      <SubjectDrillDown tile={tile} onClose={latestOnClose} onStudyConcept={vi.fn()} />,
    );
    expect(document.activeElement).toBe(studyButton);

    window.addEventListener('keydown', escapedToWindow);
    try {
      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      });
      studyButton.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
      expect(escapedToWindow).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('keydown', escapedToWindow);
    }

    expect(firstOnClose).not.toHaveBeenCalled();
    expect(latestOnClose).toHaveBeenCalledTimes(1);
  });

  it('moves focus on open and traps backward/forward focus at the dialog boundaries', () => {
    render(<SubjectDrillDown tile={makeTile()} onClose={vi.fn()} onStudyConcept={vi.fn()} />);
    const closeButton = screen.getByTestId('subject-drill-down-close');
    const lastStudyButton = screen.getByTestId('subject-drill-study-t2');
    expect(document.activeElement).toBe(closeButton);

    fireEvent.keyDown(closeButton, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(lastStudyButton);

    fireEvent.keyDown(lastStudyButton, { key: 'Tab' });
    expect(document.activeElement).toBe(closeButton);
  });

  it('restores the exact prior scroll lock and opener focus when closed', () => {
    const opener = document.createElement('button');
    opener.textContent = 'Open concepts';
    document.body.appendChild(opener);
    document.body.style.overflow = 'clip';
    opener.focus();

    try {
      const { unmount } = render(
        <SubjectDrillDown tile={makeTile()} onClose={vi.fn()} onStudyConcept={vi.fn()} />,
      );
      expect(document.body.style.overflow).toBe('hidden');
      expect(document.activeElement).toBe(screen.getByTestId('subject-drill-down-close'));

      unmount();
      expect(document.body.style.overflow).toBe('clip');
      expect(document.activeElement).toBe(opener);
    } finally {
      opener.remove();
      document.body.style.overflow = '';
    }
  });

  it('labels the modal from unique visible headings and keeps controls at least 44px', () => {
    render(<SubjectDrillDown tile={makeTile()} onClose={vi.fn()} onStudyConcept={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    const labelledBy = dialog.getAttribute('aria-labelledby');
    expect(labelledBy).not.toBeNull();

    const ids = labelledBy!.split(/\s+/).filter(Boolean);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    const headings = ids.map((id) => document.getElementById(id));
    expect(headings.every(Boolean)).toBe(true);
    expect(headings.map((heading) => heading?.tagName)).toEqual(['H2', 'H3']);
    expect(headings.map((heading) => heading?.textContent)).toEqual(['Course concepts', 'Physics']);

    const closeButton = screen.getByTestId('subject-drill-down-close');
    const studyButton = screen.getByTestId('subject-drill-study-t1');
    expect(closeButton.classList.contains('min-h-11')).toBe(true);
    expect(closeButton.classList.contains('min-w-11')).toBe(true);
    expect(studyButton.classList.contains('min-h-11')).toBe(true);
  });

  it('invokes onStudyConcept with the topic title', () => {
    const onStudyConcept = vi.fn();
    render(<SubjectDrillDown tile={makeTile()} onClose={vi.fn()} onStudyConcept={onStudyConcept} />);
    // topics are sorted ascending by mastery, so t1 (40) renders before t2 (70)
    fireEvent.click(screen.getByTestId('subject-drill-study-t1'));
    expect(onStudyConcept).toHaveBeenCalledWith('Kinematics');
  });
});

describe('AnalyticsVisualLabPanel tab keyboard navigation', () => {
  function renderPanel() {
    return render(
      <AnalyticsVisualLabPanel
        sankeyLinks={[]}
        sankeyHasData={false}
        forecast={[]}
        skills={[]}
      />,
    );
  }

  const firstId = VISUAL_LAB_MODES[0]!.id;
  const secondId = VISUAL_LAB_MODES[1]!.id;
  const thirdId = VISUAL_LAB_MODES[2]!.id;
  const lastId = VISUAL_LAB_MODES[VISUAL_LAB_MODES.length - 1]!.id;

  async function flushAnimationFrame() {
    await act(async () => {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
    });
  }

  it('applies roving tabindex with the first tab selected', () => {
    renderPanel();
    const first = screen.getByTestId(`visual-lab-mode-${firstId}`);
    const second = screen.getByTestId(`visual-lab-mode-${secondId}`);
    expect(first.getAttribute('aria-selected')).toBe('true');
    expect(first.tabIndex).toBe(0);
    expect(second.getAttribute('aria-selected')).toBe('false');
    expect(second.tabIndex).toBe(-1);
  });

  it('selects and focuses the next tab on ArrowRight', async () => {
    renderPanel();
    const first = screen.getByTestId(`visual-lab-mode-${firstId}`);
    const second = screen.getByTestId(`visual-lab-mode-${secondId}`);
    first.focus();

    fireEvent.keyDown(first, { key: 'ArrowRight' });
    await flushAnimationFrame();

    expect(second.getAttribute('aria-selected')).toBe('true');
    expect(first.getAttribute('aria-selected')).toBe('false');
    expect(document.activeElement).toBe(second);
  });

  it('derives arrow navigation from the focused tab instead of stale selection state', async () => {
    renderPanel();
    const second = screen.getByTestId(`visual-lab-mode-${secondId}`);
    const third = screen.getByTestId(`visual-lab-mode-${thirdId}`);
    second.focus();

    fireEvent.keyDown(second, { key: 'ArrowRight' });
    await flushAnimationFrame();

    expect(third.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(third);
  });

  it('jumps to the last tab on End and back to first on Home', async () => {
    renderPanel();
    const first = screen.getByTestId(`visual-lab-mode-${firstId}`);
    const last = screen.getByTestId(`visual-lab-mode-${lastId}`);
    first.focus();

    fireEvent.keyDown(first, { key: 'End' });
    await flushAnimationFrame();
    expect(last.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(last);

    fireEvent.keyDown(last, { key: 'Home' });
    await flushAnimationFrame();
    expect(first.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(first);
  });

  it('links each tab to the tabpanel via aria-controls', () => {
    renderPanel();
    const panel = screen.getByRole('tabpanel');
    const first = screen.getByTestId(`visual-lab-mode-${firstId}`);
    expect(panel.id).not.toBe('');
    expect(panel.getAttribute('aria-labelledby')).toBe(first.id);
    expect(first.getAttribute('aria-controls')).toBe(panel.id);
  });

  it('creates collision-free tab and panel relationships for multiple instances', () => {
    render(
      <>
        <AnalyticsVisualLabPanel sankeyLinks={[]} sankeyHasData={false} forecast={[]} skills={[]} />
        <AnalyticsVisualLabPanel sankeyLinks={[]} sankeyHasData={false} forecast={[]} skills={[]} />
      </>,
    );

    const tablists = screen.getAllByRole('tablist');
    const panels = screen.getAllByRole('tabpanel');
    expect(panels[0]!.id).not.toBe(panels[1]!.id);

    tablists.forEach((tablist, index) => {
      const selectedTab = within(tablist).getByRole('tab', { selected: true });
      expect(selectedTab.getAttribute('aria-controls')).toBe(panels[index]!.id);
      expect(panels[index]!.getAttribute('aria-labelledby')).toBe(selectedTab.id);
    });
  });

  it('cancels a pending focus frame when the tabset unmounts', () => {
    const requestFrame = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(73);
    const cancelFrame = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);

    try {
      const { unmount } = renderPanel();
      const first = screen.getByTestId(`visual-lab-mode-${firstId}`);
      fireEvent.keyDown(first, { key: 'ArrowRight' });
      expect(requestFrame).toHaveBeenCalledTimes(1);

      unmount();
      expect(cancelFrame).toHaveBeenCalledWith(73);
    } finally {
      requestFrame.mockRestore();
      cancelFrame.mockRestore();
    }
  });
});
