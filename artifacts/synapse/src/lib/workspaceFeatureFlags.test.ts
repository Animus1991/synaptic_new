/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  isWorkspaceV2Canary,
  persistWorkspaceV2CanaryFromUrl,
  workspaceFeatureFlags,
} from './workspaceFeatureFlags';

describe('workspaceFeatureFlags', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { value: originalLocation, writable: true });
  });

  it('detects ?ws=v2=1 in the URL', () => {
    Object.defineProperty(window, 'location', {
      value: new URL('https://app.test/?ws=v2=1'),
      writable: true,
    });
    expect(persistWorkspaceV2CanaryFromUrl()).toBe(true);
    expect(isWorkspaceV2Canary()).toBe(true);
  });

  it('persists canary in sessionStorage', () => {
    Object.defineProperty(window, 'location', {
      value: new URL('https://app.test/'),
      writable: true,
    });
    sessionStorage.setItem('synapse.ws.v2', '1');
    expect(isWorkspaceV2Canary()).toBe(true);
    expect(workspaceFeatureFlags().v2Canary).toBe(true);
  });
});
