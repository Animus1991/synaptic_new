/** @vitest-environment jsdom */
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { StudyWorkspaceGate } from './StudyWorkspaceGate';

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('StudyWorkspaceGate', () => {
  it('shows boot shell then children after one frame', () => {
    render(
      <StudyWorkspaceGate sessionKey="s1">
        <div data-testid="workspace-ready">ready</div>
      </StudyWorkspaceGate>,
    );
    expect(screen.getByTestId('workspace-ready')).toBeTruthy();
  });

  it('calls onBootComplete once per sessionKey without re-looping', () => {
    const onBootComplete = vi.fn();
    const { rerender } = render(
      <StudyWorkspaceGate sessionKey="s1" onBootComplete={onBootComplete}>
        <div>child</div>
      </StudyWorkspaceGate>,
    );
    expect(onBootComplete).toHaveBeenCalledTimes(1);

    rerender(
      <StudyWorkspaceGate sessionKey="s1" onBootComplete={onBootComplete}>
        <div>child</div>
      </StudyWorkspaceGate>,
    );
    expect(onBootComplete).toHaveBeenCalledTimes(1);
  });
});
