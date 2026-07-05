import { config } from '../config';

type TokenCache = { token: string; expiresAt: number };

const AGS_SCOPE = 'https://purl.imsglobal.org/spec/lti-ags/scope/score';
const NRPS_SCOPE = 'https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly';

const cachedTokens = new Map<string, TokenCache>();

/**
 * Obtain OAuth2 bearer for LTI services (AGS, NRPS) via client_credentials.
 * Falls back to static LTI_AGS_TOKEN when OAuth env is not set.
 */
export async function resolveLtiOAuthBearer(scope: string): Promise<string | undefined> {
  const staticToken = config.ltiAgsToken?.trim();
  const tokenUrl = config.ltiAgsTokenUrl?.trim();
  const clientId = config.ltiAgsClientId?.trim() || config.ltiClientId?.trim();
  const clientSecret = config.ltiAgsClientSecret?.trim();

  if (!tokenUrl || !clientId || !clientSecret) {
    return staticToken;
  }

  const cached = cachedTokens.get(scope);
  if (cached && cached.expiresAt > Date.now() + 30_000) {
    return cached.token;
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope,
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

  cachedTokens.set(scope, {
    token: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  });
  return json.access_token;
}

export async function resolveLtiAgsBearer(): Promise<string | undefined> {
  return resolveLtiOAuthBearer(AGS_SCOPE);
}

export async function resolveLtiNrpsBearer(): Promise<string | undefined> {
  return resolveLtiOAuthBearer(NRPS_SCOPE);
}

export function resetLtiAgsTokenCache(): void {
  cachedTokens.clear();
}
