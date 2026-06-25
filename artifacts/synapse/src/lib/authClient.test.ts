import { describe, expect, it, vi, afterEach } from 'vitest';
import { configuredProxyBase, fetchSharedAnnotations, isProxyConfigured } from './authClient';
import type { UserSettings } from '../types';

describe('authClient proxy helpers', () => {
  it('does not assume localhost when proxy is unset', () => {
    expect(configuredProxyBase({} as UserSettings)).toBeNull();
    expect(isProxyConfigured({} as UserSettings)).toBe(false);
  });

  it('normalizes configured proxy base', () => {
    expect(configuredProxyBase({ llmProxyUrl: 'http://localhost:8787/v1' } as UserSettings)).toBe(
      'http://localhost:8787',
    );
  });
});

describe('fetchSharedAnnotations', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('skips network when proxy is not configured', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const result = await fetchSharedAnnotations({} as UserSettings, 'c1', 'notes.pdf');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.reachable).toBe(false);
    expect(result.annotations).toEqual([]);
  });
});
