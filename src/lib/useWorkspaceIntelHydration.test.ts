/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWorkspaceIntelHydration } from './useWorkspaceIntelHydration';

describe('useWorkspaceIntelHydration', () => {
  beforeEach(() => {
    vi.stubGlobal('requestIdleCallback', undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts false then becomes true after paint + short settle delay', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useWorkspaceIntelHydration());
    expect(result.current).toBe(false);

    await act(async () => {
      await Promise.resolve();
      vi.runAllTimers();
    });

    expect(result.current).toBe(true);
    vi.useRealTimers();
  });
});
