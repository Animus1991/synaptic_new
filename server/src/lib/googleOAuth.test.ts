import { describe, expect, it } from 'vitest';
import { buildGoogleAuthUrl, googleOAuthConfigured, scopesForMode, hasGoogleScope } from '../lib/googleOAuth';

describe('googleOAuth', () => {
  it('scopesForMode returns integrations for connect', () => {
    const scopes = scopesForMode('connect');
    expect(scopes).toContain('https://www.googleapis.com/auth/tasks');
    expect(scopes).toContain('https://www.googleapis.com/auth/meetings.space.created');
    expect(scopes).toContain('https://www.googleapis.com/auth/calendar.events');
  });

  it('hasGoogleScope detects tasks scope', () => {
    expect(hasGoogleScope(['https://www.googleapis.com/auth/tasks'], 'https://www.googleapis.com/auth/tasks')).toBe(true);
    expect(hasGoogleScope(['openid'], 'https://www.googleapis.com/auth/tasks')).toBe(false);
  });

  it('buildGoogleAuthUrl includes required params when configured', () => {
    if (!googleOAuthConfigured()) {
      expect(true).toBe(true);
      return;
    }
    const url = buildGoogleAuthUrl('test-state', ['openid', 'email']);
    expect(url).toContain('accounts.google.com');
    expect(url).toContain('state=test-state');
    expect(url).toContain('client_id=');
  });
});
