import { config } from '../config';

type TokenCache = { token: string; expiresAt: number };
let cachedToken: TokenCache | null = null;

/**
 * Obtain OAuth2 bearer for LTI AGS grade passback (Canvas client_credentials).
 * Falls back to static LTI_AGS_TOKEN when OAuth env is not set.
 */
export async function resolveLtiAgsBearer(): Promise<string | undefined> {
  const staticToken = config.ltiAgsToken?.trim();
  const tokenUrl = config.ltiAgsTokenUrl?.trim();
  const clientId = config.ltiAgsClientId?.trim() || config.ltiClientId?.trim();
  const clientSecret = config.ltiAgsClientSecret?.trim();

  if (!tokenUrl || !clientId || !clientSecret) {
    return staticToken;
  }

  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://purl.imsglobal.org/spec/lti-ags/scope/score',
  });

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    return staticToken;
  }

  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) return staticToken;

  cachedToken = {
    token: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
  return cachedToken.token;
}

export function resetLtiAgsTokenCache(): void {
  cachedToken = null;
}
