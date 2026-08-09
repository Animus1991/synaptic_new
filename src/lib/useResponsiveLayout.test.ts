/** @vitest-environment jsdom */
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResponsiveLayout } from './useResponsiveLayout';
import { WORKSPACE_PHONE_MAX_WIDTH, SHELL_MOBILE_NAV_MAX_WIDTH } from './workspaceViewport';

function setWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  });
  window.dispatchEvent(new Event('resize'));
}

describe('useResponsiveLayout', () => {
  beforeEach(() => {
    setWidth(1280);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prefers split on desktop widths', () => {
    setWidth(1280);
    const { result } = renderHook(() => useResponsiveLayout());
    expect(result.current.preferSplit).toBe(true);
    expect(result.current.surfaceMode).toBe('split');
    expect(result.current.isPhone).toBe(false);
    expect(result.current.isShellMobileNav).toBe(false);
  });

  it('stacks full-width on phone widths', () => {
    setWidth(WORKSPACE_PHONE_MAX_WIDTH - 1);
    const { result } = renderHook(() => useResponsiveLayout());
    expect(result.current.preferSplit).toBe(false);
    expect(result.current.surfaceMode).toBe('stack');
    expect(result.current.isPhone).toBe(true);
    expect(result.current.isShellMobileNav).toBe(true);
  });

  it('keeps shell-nav clearance on tablet under lg', () => {
    setWidth(SHELL_MOBILE_NAV_MAX_WIDTH - 1);
    const { result } = renderHook(() => useResponsiveLayout());
    expect(result.current.isPhone).toBe(false);
    expect(result.current.preferSplit).toBe(true);
    expect(result.current.isShellMobileNav).toBe(true);
  });

  it('updates when the window resizes', () => {
    setWidth(1280);
    const { result } = renderHook(() => useResponsiveLayout());
    expect(result.current.surfaceMode).toBe('split');
    act(() => {
      setWidth(390);
    });
    expect(result.current.surfaceMode).toBe('stack');
    expect(result.current.isPhone).toBe(true);
  });
});
