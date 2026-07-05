import { createHash, generateKeyPairSync, randomUUID } from 'crypto';
import { config } from '../config';

export type LtiDeployment = {
  id: string;
  orgId: string;
  deploymentId: string;
  platformIssuer: string;
  clientId: string;
  platformAuthUrl?: string;
  platformJwksUrl?: string;
  createdAt: string;
};

const deployments = new Map<string, LtiDeployment>();

let devKeyPair: { publicKey: string; privateKey: string } | null = null;

function getDevKeyPair(): { publicKey: string; privateKey: string } {
  if (!devKeyPair) {
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    devKeyPair = { publicKey, privateKey };
  }
  return devKeyPair;
}

export function ltiToolPrivateKey(): string {
  return config.ltiPrivateKey?.trim() || getDevKeyPair().privateKey;
}

export function ltiToolPublicKeyPem(): string {
  return config.ltiPublicKey?.trim() || getDevKeyPair().publicKey;
}

export function ltiJwks(): { keys: Record<string, unknown>[] } {
  const pem = ltiToolPublicKeyPem();
  const b64 = pem
    .replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\s/g, '');
  const kid = createHash('sha256').update(b64).digest('hex').slice(0, 16);
  return {
    keys: [
      {
        kty: 'RSA',
        kid,
        use: 'sig',
        alg: 'RS256',
        e: 'AQAB',
      },
    ],
  };
}

export function registerLtiDeployment(payload: {
  orgId: string;
  deploymentId: string;
  platformIssuer: string;
  clientId: string;
  platformAuthUrl?: string;
  platformJwksUrl?: string;
}): LtiDeployment {
  const id = `lti_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
  const row: LtiDeployment = {
    id,
    orgId: payload.orgId,
    deploymentId: payload.deploymentId.trim(),
    platformIssuer: payload.platformIssuer.trim(),
    clientId: payload.clientId.trim(),
    platformAuthUrl: payload.platformAuthUrl?.trim(),
    platformJwksUrl: payload.platformJwksUrl?.trim(),
    createdAt: new Date().toISOString(),
  };
  deployments.set(`${payload.orgId}:${row.deploymentId}`, row);
  return row;
}

export function getLtiDeployment(orgId: string, deploymentId: string): LtiDeployment | null {
  return deployments.get(`${orgId}:${deploymentId}`) ?? null;
}

export function listLtiDeployments(orgId: string): LtiDeployment[] {
  return [...deployments.values()].filter((d) => d.orgId === orgId);
}

export function ltiToolConfig(baseUrl: string): Record<string, unknown> {
  return {
    title: 'Synapse Learning',
    description: 'AI study workspace with OCR, FSRS, and institution RBAC',
    target_link_uri: `${baseUrl}/v1/lti/launch`,
    oidc_initiation_url: `${baseUrl}/v1/lti/login`,
    public_jwk_url: `${baseUrl}/v1/lti/jwks`,
    scopes: ['openid', 'https://purl.imsglobal.org/spec/lti-ags/scope/score'],
    extensions: {
      'https://canvas.instructure.com/lti/tool_configuration': {
        domain: new URL(baseUrl).host,
        privacy_level: 'public',
        placements: ['course_navigation', 'assignment_selection'],
      },
    },
  };
}

export function buildOidcLoginRedirect(params: {
  platformAuthUrl: string;
  clientId: string;
  loginHint?: string;
  ltiMessageHint?: string;
  redirectUri: string;
  state: string;
  nonce: string;
}): string {
  const url = new URL(params.platformAuthUrl);
  url.searchParams.set('scope', 'openid');
  url.searchParams.set('response_type', 'id_token');
  url.searchParams.set('client_id', params.clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('login_hint', params.loginHint ?? '');
  url.searchParams.set('state', params.state);
  url.searchParams.set('nonce', params.nonce);
  url.searchParams.set('response_mode', 'form_post');
  url.searchParams.set('prompt', 'none');
  if (params.ltiMessageHint) {
    url.searchParams.set('lti_message_hint', params.ltiMessageHint);
  }
  return url.toString();
}

export function samlSpMetadata(baseUrl: string): string {
  const entityId = config.samlEntityId ?? `${baseUrl}/v1/auth/saml/metadata`;
  const acs = `${baseUrl}/v1/auth/saml/acs`;
  return `<?xml version="1.0"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${entityId}">
  <SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</NameIDFormat>
    <AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${acs}" index="0"/>
  </SPSSODescriptor>
</EntityDescriptor>`;
}
