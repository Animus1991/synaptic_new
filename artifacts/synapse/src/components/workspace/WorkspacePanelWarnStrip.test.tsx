/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { WorkspacePanelWarnStrip } from './WorkspacePanelWarnStrip';

afterEach(() => cleanup());

describe('WorkspacePanelWarnStrip', () => {
  it('renders strip layout with warn tokens', () => {
    render(
      <WorkspacePanelWarnStrip testId="panel-warn-demo">
        Weak extraction notice
      </WorkspacePanelWarnStrip>,
    );

    const strip = screen.getByTestId('panel-warn-demo');
    expect(strip.getAttribute('data-ws-status')).toBe('warn');
    expect(strip.className).toContain('ws-status-warn');
    expect(strip.textContent).toContain('Weak extraction notice');
  });

  it('renders box layout for nested content', () => {
    render(
      <WorkspacePanelWarnStrip testId="panel-warn-box" layout="box">
        <span>Gaps list</span>
      </WorkspacePanelWarnStrip>,
    );

    expect(screen.getByTestId('panel-warn-box').textContent).toContain('Gaps list');
  });
});
