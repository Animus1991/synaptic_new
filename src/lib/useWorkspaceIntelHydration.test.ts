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

  it('starts false then becomes true after paint', async () => {
    const { result } = renderHook(() => useWorkspaceIntelHydration());
    expect(result.current).toBe(false);

    await act(async () => {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
    });

    expect(result.current).toBe(true);
  });
});
