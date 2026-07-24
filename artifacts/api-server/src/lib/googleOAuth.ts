import { config } from '../config';

export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

/** Scopes for Google sign-in (identity only). */
export const GOOGLE_SCOPES_SIGNIN = ['openid', 'email', 'profile'];

/** Scopes for study collaboration integrations (Tasks + Meet). */
export const GOOGLE_SCOPES_INTEGRATIONS = [
  ...GOOGLE_SCOPES_SIGNIN,
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/meetings.space.created',
  'https://www.googleapis.com/auth/calendar.events',
];

export type GoogleOAuthMode = 'signin' | 'connect';

export function googleOAuthConfigured(): boolean {
  return Boolean(config.googleClientId && config.googleClientSecret);
}

export function scopesForMode(mode: GoogleOAuthMode): string[] {
  return mode === 'connect' ? GOOGLE_SCOPES_INTEGRATIONS : GOOGLE_SCOPES_SIGNIN;
}

export function buildGoogleAuthUrl(state: string, scopes: string[]): string {
  if (!config.googleClientId) throw new Error('GOOGLE_CLIENT_ID not configured');
  const params = new URLSearchParams({
    client_id: config.googleClientId,
    redirect_uri: config.googleRedirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
    include_granted_scopes: 'true',
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  id_token?: string;
};

export type GoogleUserInfo = {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

export async function exchangeGoogleCode(code: string): Promise<GoogleTokenResponse> {
  if (!config.googleClientId || !config.googleClientSecret) {
    throw new Error('Google OAuth not configured');
  }
  const body = new URLSearchParams({
    code,
    client_id: config.googleClientId,
    client_secret: config.googleClientSecret,
    redirect_uri: config.googleRedirectUri,
    grant_type: 'authorization_code',
  });
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token exchange failed: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as GoogleTokenResponse;
}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
  if (!config.googleClientId || !config.googleClientSecret) {
    throw new Error('Google OAuth not configured');
  }
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: config.googleClientId,
    client_secret: config.googleClientSecret,
    grant_type: 'refresh_token',
  });
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token refresh failed: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as GoogleTokenResponse;
}

export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google userinfo failed: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as GoogleUserInfo;
}

export function parseGrantedScopes(scope?: string): string[] {
  if (!scope) return [];
  return scope.split(' ').filter(Boolean);
}

export function hasGoogleScope(scopes: string[], required: string): boolean {
  return scopes.includes(required);
}
