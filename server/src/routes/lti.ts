import { Router } from 'express';
import { randomBytes } from 'crypto';
import { config } from '../config';
import { authenticate } from '../middleware/auth';
import {
  buildOidcLoginRedirect,
  getLtiDeployment,
  listLtiDeployments,
  ltiJwks,
  ltiToolConfig,
  registerLtiDeployment,
  samlSpMetadata,
} from '../lib/ltiLaunch';
import { appendAuditLogAsync } from '../store/auditLogStore';
import { getOrgMembershipAsync } from '../store/orgStore';

export const ltiRouter = Router();

const pendingStates = new Map<string, { nonce: string; orgId?: string; expires: number }>();

function serverBase(req: { protocol: string; get(name: string): string | undefined }): string {
  const host = req.get('host') ?? `localhost:${config.port}`;
  return `${req.protocol}://${host}`;
}

/** GET /v1/lti/jwks — tool public keys for LTI 1.3 platform registration. */
ltiRouter.get('/lti/jwks', (_req, res) => {
  res.json(ltiJwks());
});

/** GET /v1/lti/config — JSON tool configuration for LMS admin. */
ltiRouter.get('/lti/config', (req, res) => {
  res.json(ltiToolConfig(serverBase(req)));
});

/** POST /v1/lti/deployments — register LTI deployment for an org (org_admin). */
ltiRouter.post('/lti/deployments', authenticate, async (req, res) => {
  const body = req.body as {
    orgId?: string;
    deploymentId?: string;
    platformIssuer?: string;
    clientId?: string;
    platformAuthUrl?: string;
    platformJwksUrl?: string;
  };
  if (!body.orgId?.trim() || !body.deploymentId?.trim() || !body.platformIssuer?.trim() || !body.clientId?.trim()) {
    res.status(400).json({ error: 'orgId, deploymentId, platformIssuer, clientId required' });
    return;
  }
  const membership = await getOrgMembershipAsync(body.orgId.trim(), req.account!.id);
  if (!membership || membership.role !== 'org_admin') {
    res.status(403).json({ error: 'org_admin required' });
    return;
  }
  const deployment = registerLtiDeployment({
    orgId: body.orgId.trim(),
    deploymentId: body.deploymentId.trim(),
    platformIssuer: body.platformIssuer.trim(),
    clientId: body.clientId.trim(),
    platformAuthUrl: body.platformAuthUrl,
    platformJwksUrl: body.platformJwksUrl,
  });
  await appendAuditLogAsync({
    orgId: body.orgId.trim(),
    accountId: req.account!.id,
    action: 'lti.deployment.register',
    resource: deployment.id,
    metadata: { deploymentId: deployment.deploymentId },
  });
  res.status(201).json(deployment);
});

/** GET /v1/lti/deployments?orgId= — list org LTI deployments (org_admin). */
ltiRouter.get('/lti/deployments', authenticate, async (req, res) => {
  const orgId = String(req.query.orgId ?? '');
  if (!orgId) {
    res.status(400).json({ error: 'orgId required' });
    return;
  }
  const membership = await getOrgMembershipAsync(orgId, req.account!.id);
  if (!membership || membership.role !== 'org_admin') {
    res.status(403).json({ error: 'org_admin required' });
    return;
  }
  res.json({ orgId, deployments: listLtiDeployments(orgId) });
});

/** POST /v1/lti/login — OIDC login initiation (LTI 1.3 third-party login). */
ltiRouter.post('/lti/login', (req, res) => {
  const body = req.body as {
    login_hint?: string;
    target_link_uri?: string;
    lti_message_hint?: string;
    client_id?: string;
    deployment_id?: string;
    org_id?: string;
  };
  const clientId = body.client_id ?? config.ltiClientId;
  const orgId = body.org_id?.trim();
  const deployment =
    orgId && body.deployment_id ? getLtiDeployment(orgId, body.deployment_id) : null;
  const platformAuthUrl = deployment?.platformAuthUrl ?? config.ltiPlatformAuthUrl;
  if (!clientId || !platformAuthUrl) {
    res.status(503).json({
      error: 'LTI not configured — set LTI_CLIENT_ID and LTI_PLATFORM_AUTH_URL or register a deployment',
    });
    return;
  }
  const state = randomBytes(16).toString('hex');
  const nonce = randomBytes(16).toString('hex');
  pendingStates.set(state, { nonce, orgId, expires: Date.now() + 10 * 60_000 });
  const redirectUri = body.target_link_uri ?? `${serverBase(req)}/v1/lti/launch`;
  const url = buildOidcLoginRedirect({
    platformAuthUrl,
    clientId: deployment?.clientId ?? clientId,
    loginHint: body.login_hint,
    ltiMessageHint: body.lti_message_hint,
    redirectUri,
    state,
    nonce,
  });
  res.redirect(302, url);
});

/** POST /v1/lti/launch — receive platform id_token (form_post). */
ltiRouter.post('/lti/launch', (req, res) => {
  const body = req.body as { id_token?: string; state?: string };
  const state = body.state ?? '';
  const pending = pendingStates.get(state);
  if (pending && pending.expires < Date.now()) pendingStates.delete(state);

  const redirect = new URL(config.clientAppUrl);
  redirect.pathname = '/';
  redirect.searchParams.set('lti', '1');
  if (state) redirect.searchParams.set('lti_state', state);
  if (body.id_token) redirect.searchParams.set('lti_token_present', '1');
  res.redirect(302, redirect.toString());
});

/** GET /v1/auth/saml/metadata — SP metadata for institutional IdP (SAML SSO pilot). */
ltiRouter.get('/auth/saml/metadata', (req, res) => {
  if (!config.samlEntityId && !config.ltiClientId) {
    res.status(503).json({ error: 'SAML not configured — set SAML_ENTITY_ID' });
    return;
  }
  res.type('application/xml').send(samlSpMetadata(serverBase(req)));
});

/** POST /v1/auth/saml/acs — ACS stub; production IdP wiring is deployment-specific. */
ltiRouter.post('/auth/saml/acs', (_req, res) => {
  res.status(501).json({
    error: 'SAML ACS requires IdP-specific certificate validation — contact Synapse for enterprise setup',
    docs: 'Configure SAML_ENTITY_ID and wire your IdP to /v1/auth/saml/metadata',
  });
});
