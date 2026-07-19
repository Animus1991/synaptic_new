/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { WorkspaceStatusBusProvider, useWorkspaceStatusBus } from '../../lib/workspaceStatusBus';
import { WorkspacePanelWarnStrip } from './WorkspacePanelWarnStrip';
import { WorkspaceStatusPanel } from './WorkspaceStatusPanel';

afterEach(() => cleanup());

function BusProbe() {
  const bus = useWorkspaceStatusBus();
  return <div data-testid="bus-count">{bus?.items.length ?? 0}</div>;
}

function Harness({ showStrip, mirror }: { showStrip: boolean; mirror?: boolean }) {
  return (
    <WorkspaceStatusBusProvider mirrorInPanel={mirror}>
      {showStrip ? (
        <WorkspacePanelWarnStrip testId="quiz-weak-extraction">
          Weak extraction notice
        </WorkspacePanelWarnStrip>
      ) : null}
      <BusProbe />
      <WorkspaceStatusPanel defaultOpen />
    </WorkspaceStatusBusProvider>
  );
}

describe('OPT-M9 status bus', () => {
  it('registers warn strips into the bus and shows Status panel', () => {
    render(<Harness showStrip mirror />);
    expect(screen.getByTestId('bus-count').textContent).toBe('1');
    expect(screen.getByTestId('workspace-status-panel')).toBeTruthy();
    expect(screen.getByTestId('workspace-status-item-quiz-weak-extraction')).toBeTruthy();
    expect(screen.getByTestId('quiz-weak-extraction').getAttribute('data-status-mirrored')).toBe('true');
  });

  it('removes items when strip unmounts', () => {
    const { rerender } = render(<Harness showStrip />);
    expect(screen.getByTestId('bus-count').textContent).toBe('1');
    rerender(<Harness showStrip={false} />);
    expect(screen.getByTestId('bus-count').textContent).toBe('0');
    expect(screen.queryByTestId('workspace-status-panel')).toBeNull();
  });

  it('reveals mirrored strip from Status panel click', () => {
    render(<Harness showStrip mirror />);
    fireEvent.click(screen.getByTestId('workspace-status-item-quiz-weak-extraction'));
    expect(screen.getByTestId('quiz-weak-extraction').getAttribute('data-status-mirrored')).toBeNull();
  });
});
