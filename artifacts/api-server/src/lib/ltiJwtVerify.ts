import jwt from 'jsonwebtoken';
import { createPublicKey } from 'crypto';
import { config } from '../config';
import { getLtiDeployment } from './ltiLaunch';

export type LtiLaunchClaims = {
  sub: string;
  email?: string;
  name?: string;
  iss: string;
  aud: string | string[];
  exp: number;
  iat: number;
  nonce?: string;
  'https://purl.imsglobal.org/spec/lti/claim/message_type'?: string;
  'https://purl.imsglobal.org/spec/lti/claim/version'?: string;
  'https://purl.imsglobal.org/spec/lti/claim/deployment_id'?: string;
  'https://purl.imsglobal.org/spec/lti/claim/roles'?: string[];
  'https://purl.imsglobal.org/spec/lti/claim/context'?: { id?: string; label?: string; title?: string };
  'https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice'?: {
    context_memberships_url?: string;
    service_versions?: string[];
  };
  'https://purl.imsglobal.org/spec/lti-ags/claim/endpoint'?: {
    lineitems?: string;
    lineitem?: string;
    scope?: string[];
  };
  [key: string]: unknown;
};

type JwkKey = {
  kty: string;
  kid?: string;
  n?: string;
  e?: string;
  x5c?: string[];
  alg?: string;
  use?: string;
};

const jwksCache = new Map<string, { keys: JwkKey[]; fetchedAt: number }>();
const JWKS_TTL_MS = 60 * 60_000;

function jwkToPem(jwk: JwkKey): string | null {
  if (jwk.kty !== 'RSA' || !jwk.n || !jwk.e) return null;
  try {
    const key = createPublicKey({ key: jwk as unknown as Record<string, string>, format: 'jwk' });
    return key.export({ type: 'spki', format: 'pem' }) as string;
  } catch {
    return null;
  }
}

async function fetchPlatformJwks(jwksUrl: string): Promise<JwkKey[]> {
  const cached = jwksCache.get(jwksUrl);
  if (cached && Date.now() - cached.fetchedAt < JWKS_TTL_MS) return cached.keys;
  const res = await fetch(jwksUrl);
  if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
  const body = (await res.json()) as { keys?: JwkKey[] };
  const keys = body.keys ?? [];
  jwksCache.set(jwksUrl, { keys, fetchedAt: Date.now() });
  return keys;
}

function decodeHeaderKid(idToken: string): string | undefined {
  const header = jwt.decode(idToken, { complete: true })?.header as { kid?: string } | undefined;
  return header?.kid;
}

export function resetLtiJwksCache(): void {
  jwksCache.clear();
}

/**
 * Verify LTI 1.3 id_token from platform OIDC launch.
 * Uses deployment JWKS URL when org/deployment known; falls back to LTI_PLATFORM_JWKS_URL.
 */
export async function verifyLtiIdToken(
  idToken: string,
  opts?: { orgId?: string; deploymentId?: string; expectedNonce?: string },
): Promise<{ ok: true; claims: LtiLaunchClaims } | { ok: false; error: string }> {
  if (!idToken?.trim()) return { ok: false, error: 'id_token missing' };

  let issuer = config.ltiPlatformIssuer?.trim();
  let audience = config.ltiClientId?.trim();
  let jwksUrl = process.env.LTI_PLATFORM_JWKS_URL?.trim();

  if (opts?.orgId && opts.deploymentId) {
    const dep = getLtiDeployment(opts.orgId, opts.deploymentId);
    if (dep) {
      issuer = dep.platformIssuer || issuer;
      audience = dep.clientId || audience;
      jwksUrl = dep.platformJwksUrl || jwksUrl;
    }
  }

  if (!jwksUrl) {
    return { ok: false, error: 'LTI platform JWKS URL not configured' };
  }

  try {
    const kid = decodeHeaderKid(idToken);
    const keys = await fetchPlatformJwks(jwksUrl);
    const jwk = keys.find((k) => (kid ? k.kid === kid : true));
    if (!jwk) return { ok: false, error: 'No matching JWK for token kid' };
    const pem = jwkToPem(jwk);
    if (!pem) return { ok: false, error: 'Unable to convert JWK to PEM' };

    const verifyOpts: jwt.VerifyOptions = { algorithms: ['RS256'] };
    if (issuer) verifyOpts.issuer = issuer;
    if (audience) verifyOpts.audience = audience;

    const claims = jwt.verify(idToken, pem, verifyOpts) as LtiLaunchClaims;

    if (opts?.expectedNonce && claims.nonce !== opts.expectedNonce) {
      return { ok: false, error: 'nonce mismatch' };
    }

    const msgType = claims['https://purl.imsglobal.org/spec/lti/claim/message_type'];
    if (msgType && msgType !== 'LtiResourceLinkRequest' && msgType !== 'LtiDeepLinkingRequest') {
      return { ok: false, error: `unsupported LTI message type: ${msgType}` };
    }

    return { ok: true, claims };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'JWT verification failed' };
  }
}
