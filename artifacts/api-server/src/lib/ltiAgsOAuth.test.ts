import { describe, it, expect, beforeEach } from 'vitest';
import { resetLtiAgsTokenCache } from './ltiAgsOAuth';

describe('ltiAgsOAuth', () => {
  beforeEach(() => {
    resetLtiAgsTokenCache();
  });

  it('exports resolveLtiAgsBearer helper', async () => {
    const mod = await import('./ltiAgsOAuth');
    expect(typeof mod.resolveLtiAgsBearer).toBe('function');
    const token = await mod.resolveLtiAgsBearer();
    expect(token === undefined || typeof token === 'string').toBe(true);
  });
});
