import { describe, expect, it } from 'vitest';
import { buildRumPayload, rumEndpoint } from './webVitalsRum';

describe('webVitalsRum', () => {
  it('builds route-tagged LCP payload', () => {
    const payload = buildRumPayload(
      { name: 'LCP', value: 1234.5, rating: 'good', id: 'v1' },
      'dashboard',
    );
    expect(payload).toEqual({
      name: 'LCP',
      value: 1234.5,
      rating: 'good',
      route: 'dashboard',
      id: 'v1',
      navigationType: undefined,
      ts: expect.any(String),
    });
  });

  it('rejects unknown metric names', () => {
    expect(buildRumPayload({ name: 'FID', value: 1 }, 'landing')).toBeNull();
  });

  it('resolves rum endpoint from proxy base', () => {
    expect(rumEndpoint('http://localhost:8787/v1')).toBe('http://localhost:8787/v1/rum');
    expect(rumEndpoint(null)).toBe('/v1/rum');
  });
});
