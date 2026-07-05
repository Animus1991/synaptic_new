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
import {
  listLtiPassbackLog,
  registerLtiLineItem,
  submitLtiGradePassback,
} from '../lib/ltiGradePassback';
import { verifyLtiIdToken } from '../lib/ltiJwtVerify';
import { buildSamlAcsRedirect, parseSamlAcsResponse } from '../lib/samlAcs';
import { provisionSamlUser } from '../lib/samlAutoProvision';
import { consumeAuthCompletion } from '../store/googleTokenStore';
import { resolveLtiNrpsBearer } from '../lib/ltiAgsOAuth';
import {
  fetchNrpsMembers,
  getClassIdForLtiContext,
  getLtiContextLink,
  getLtiLaunchSession,
  linkLtiContextToClass,
  isLearnerRole,
  saveLtiLaunchSession,
  syncLtiMembersToClass,
  type LtiNrpsMember,
} from '../lib/ltiRosterSync';
import { requireTeacherClass } from '../lib/tenantGuard';
import { getGradebookAsync } from '../store/gradebookStore';
import { listClassRosterAsync } from '../store/classStore';
import { listClassAssignmentsAsync } from '../store/assignmentStore';
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

/** POST /v1/lti/launch — receive platform id_token (form_post) with JWT validation. */
ltiRouter.post('/lti/launch', async (req, res) => {
  const body = req.body as { id_token?: string; state?: string };
  const state = body.state ?? '';
  const pending = pendingStates.get(state);
  if (pending && pending.expires < Date.now()) {
    pendingStates.delete(state);
  }
  const nonce = pending?.nonce;

  const redirect = new URL(config.clientAppUrl);
  redirect.pathname = '/';
  redirect.searchParams.set('lti', '1');
  if (state) redirect.searchParams.set('lti_state', state);

  if (!body.id_token?.trim()) {
    redirect.searchParams.set('lti_error', 'missing_id_token');
    res.redirect(302, redirect.toString());
    return;
  }

  const verified = await verifyLtiIdToken(body.id_token, {
    orgId: pending?.orgId,
    expectedNonce: nonce,
  });

  if (!verified.ok) {
    redirect.searchParams.set('lti_error', verified.error.slice(0, 120));
    res.redirect(302, redirect.toString());
    return;
  }

  const claims = verified.claims;
  redirect.searchParams.set('lti_verified', '1');
  if (claims.sub) redirect.searchParams.set('lti_sub', claims.sub);
  if (claims.email) redirect.searchParams.set('lti_email', String(claims.email));
  const roles = claims['https://purl.imsglobal.org/spec/lti/claim/roles'];
  if (Array.isArray(roles) && roles[0]) redirect.searchParams.set('lti_role', roles[0]);
  const ctx = claims['https://purl.imsglobal.org/spec/lti/claim/context'];
  if (ctx?.id) redirect.searchParams.set('lti_context', ctx.id);
  if (ctx?.title) redirect.searchParams.set('lti_context_title', ctx.title);

  const nrps = claims['https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice'];
  if (ctx?.id) {
    saveLtiLaunchSession({
      ltiContextId: ctx.id,
      contextTitle: ctx.title ?? ctx.label,
      nrpsUrl: nrps?.context_memberships_url,
      ltiSub: claims.sub,
      email: claims.email ? String(claims.email) : undefined,
    });
    const linkedClassId = getClassIdForLtiContext(ctx.id);
    if (linkedClassId) redirect.searchParams.set('lti_linked_class', linkedClassId);
  }

  if (pending) pendingStates.delete(state);
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

/** POST /v1/auth/saml/acs — SAML Assertion Consumer Service (enterprise SSO). */
ltiRouter.post('/auth/saml/acs', async (req, res) => {
  const body = req.body as { SAMLResponse?: string; RelayState?: string };
  const parsed = parseSamlAcsResponse(body);
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  try {
    const provision = await provisionSamlUser(parsed);
    const redirectUrl = buildSamlAcsRedirect(parsed.email, body.RelayState, {
      authCode: provision.authCode,
      orgId: provision.orgId,
      provisioned: provision.created || provision.membershipAdded,
    });
    res.redirect(302, redirectUrl);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'SAML auto-provision failed';
    res.status(500).json({ error: msg });
  }
});

/** POST /v1/auth/saml/complete — exchange one-time SAML auth code for JWT session. */
ltiRouter.post('/auth/saml/complete', async (req, res) => {
  const code = typeof req.body?.code === 'string' ? req.body.code : '';
  const completion = consumeAuthCompletion(code);
  if (!completion) {
    res.status(401).json({ error: 'Invalid or expired SAML auth code' });
    return;
  }
  res.json({
    token: completion.token,
    accessToken: completion.token,
    refreshToken: completion.refreshToken,
    account: { email: completion.email, plan: completion.plan },
  });
});

/** POST /v1/lti/line-items — map Synapse assignment to platform AGS line item URL. */
ltiRouter.post('/lti/line-items', authenticate, async (req, res) => {
  const body = req.body as { classId?: string; assignmentId?: string; lineItemUrl?: string };
  if (!body.classId?.trim() || !body.assignmentId?.trim() || !body.lineItemUrl?.trim()) {
    res.status(400).json({ error: 'classId, assignmentId, lineItemUrl required' });
    return;
  }
  const owned = await requireTeacherClass(body.classId.trim(), req.account!.id);
  if (!owned.ok) {
    res.status(owned.status).json({ error: owned.error });
    return;
  }
  const assignments = await listClassAssignmentsAsync(owned.class.id);
  if (!assignments.some((a) => a.id === body.assignmentId)) {
    res.status(404).json({ error: 'assignment not found' });
    return;
  }
  const mapped = registerLtiLineItem(owned.class.id, body.assignmentId.trim(), body.lineItemUrl.trim());
  await appendAuditLogAsync({
    orgId: owned.class.orgId,
    accountId: req.account!.id,
    action: 'lti.line_item.register',
    resource: `${owned.class.id}:${body.assignmentId}`,
    metadata: { lineItemUrl: mapped.lineItemUrl },
  });
  res.status(201).json(mapped);
});

/**
 * POST /v1/lti/grade-passback — push gradebook score to LMS via LTI AGS (Canvas parity stub).
 * Requires graded cell; uses registered line item or explicit lineItemUrl.
 */
ltiRouter.post('/lti/grade-passback', authenticate, async (req, res) => {
  const body = req.body as {
    classId?: string;
    assignmentId?: string;
    enrollmentId?: string;
    ltiUserId?: string;
    lineItemUrl?: string;
    score?: number;
  };
  if (!body.classId?.trim() || !body.assignmentId?.trim() || !body.enrollmentId?.trim()) {
    res.status(400).json({ error: 'classId, assignmentId, enrollmentId required' });
    return;
  }
  const owned = await requireTeacherClass(body.classId.trim(), req.account!.id);
  if (!owned.ok) {
    res.status(owned.status).json({ error: owned.error });
    return;
  }
  const [roster, assignments, gradebook] = await Promise.all([
    listClassRosterAsync(owned.class.id),
    listClassAssignmentsAsync(owned.class.id),
    getGradebookAsync(owned.class.id),
  ]);
  const enrollment = roster.find((r) => r.id === body.enrollmentId);
  if (!enrollment) {
    res.status(404).json({ error: 'enrollment not found' });
    return;
  }
  if (!assignments.some((a) => a.id === body.assignmentId)) {
    res.status(404).json({ error: 'assignment not found' });
    return;
  }
  const cell = gradebook.cells.find(
    (c) => c.enrollmentId === body.enrollmentId && c.assignmentId === body.assignmentId,
  );
  const score = body.score ?? cell?.score;
  if (score == null) {
    res.status(400).json({ error: 'score required — grade the cell first or pass score in body' });
    return;
  }
  const ltiUserId = body.ltiUserId?.trim() || enrollment.studentEmail;
  const record = await submitLtiGradePassback({
    classId: owned.class.id,
    assignmentId: body.assignmentId.trim(),
    enrollmentId: body.enrollmentId.trim(),
    ltiUserId,
    score,
    lineItemUrl: body.lineItemUrl,
  });
  await appendAuditLogAsync({
    orgId: owned.class.orgId,
    accountId: req.account!.id,
    action: 'lti.grade.passback',
    resource: record.id,
    metadata: {
      classId: owned.class.id,
      assignmentId: body.assignmentId,
      enrollmentId: body.enrollmentId,
      status: record.status,
    },
  });
  res.status(record.status === 'failed' ? 502 : 202).json(record);
});

/** GET /v1/lti/grade-passback?classId= — recent AGS passback log (teacher). */
ltiRouter.get('/lti/grade-passback', authenticate, async (req, res) => {
  const classId = String(req.query.classId ?? '').trim();
  if (!classId) {
    res.status(400).json({ error: 'classId required' });
    return;
  }
  const owned = await requireTeacherClass(classId, req.account!.id);
  if (!owned.ok) {
    res.status(owned.status).json({ error: owned.error });
    return;
  }
  res.json({ classId, records: listLtiPassbackLog(classId) });
});

/** GET /v1/lti/launch-context/:ltiContextId — NRPS session from recent LTI launch. */
ltiRouter.get('/lti/launch-context/:ltiContextId', authenticate, (req, res) => {
  const session = getLtiLaunchSession(req.params.ltiContextId);
  if (!session) {
    res.status(404).json({ error: 'launch context not found or expired' });
    return;
  }
  const linkedClassId = getClassIdForLtiContext(session.ltiContextId);
  res.json({
    ltiContextId: session.ltiContextId,
    contextTitle: session.contextTitle,
    hasNrpsUrl: Boolean(session.nrpsUrl),
    linkedClassId,
  });
});

/** GET /v1/lti/classes/:classId/context-link — LTI context linked to teacher class. */
ltiRouter.get('/lti/classes/:classId/context-link', authenticate, async (req, res) => {
  const owned = await requireTeacherClass(req.params.classId, req.account!.id);
  if (!owned.ok) {
    res.status(owned.status).json({ error: owned.error });
    return;
  }
  const link = getLtiContextLink(owned.class.id);
  if (!link) {
    res.status(404).json({ error: 'no LTI context linked' });
    return;
  }
  res.json({ link });
});

/** POST /v1/lti/classes/:classId/context-link — map Canvas course context to Synapse class. */
ltiRouter.post('/lti/classes/:classId/context-link', authenticate, async (req, res) => {
  const owned = await requireTeacherClass(req.params.classId, req.account!.id);
  if (!owned.ok) {
    res.status(owned.status).json({ error: owned.error });
    return;
  }
  const body = req.body as { ltiContextId?: string; contextTitle?: string; nrpsUrl?: string };
  if (!body.ltiContextId?.trim()) {
    res.status(400).json({ error: 'ltiContextId required' });
    return;
  }
  const link = linkLtiContextToClass(owned.class.id, {
    ltiContextId: body.ltiContextId,
    contextTitle: body.contextTitle,
    nrpsUrl: body.nrpsUrl,
  });
  await appendAuditLogAsync({
    orgId: owned.class.orgId,
    accountId: req.account!.id,
    action: 'lti.context.link',
    resource: owned.class.id,
    metadata: { ltiContextId: link.ltiContextId },
  });
  res.status(201).json({ link });
});

/** POST /v1/lti/classes/:classId/roster-sync — import LMS roster (NRPS or stub members). */
ltiRouter.post('/lti/classes/:classId/roster-sync', authenticate, async (req, res) => {
  const owned = await requireTeacherClass(req.params.classId, req.account!.id);
  if (!owned.ok) {
    res.status(owned.status).json({ error: owned.error });
    return;
  }
  const body = req.body as {
    members?: Array<{ userId?: string; email?: string; displayName?: string; roles?: string[] }>;
    ltiContextId?: string;
    useStub?: boolean;
  };

  let link = getLtiContextLink(owned.class.id);
  if (!link && body.ltiContextId?.trim()) {
    link = linkLtiContextToClass(owned.class.id, { ltiContextId: body.ltiContextId });
  }
  if (!link) {
    res.status(400).json({ error: 'link an LTI context first or pass ltiContextId' });
    return;
  }

  let members: LtiNrpsMember[] = [];
  let source: 'nrps' | 'stub' = 'stub';

  if (Array.isArray(body.members) && body.members.length > 0) {
    members = body.members
      .map((m) => ({
        userId: m.userId?.trim() || m.email?.trim() || '',
        email: (m.email?.trim() || `${m.userId?.trim()}@lti.local`).toLowerCase(),
        displayName: m.displayName?.trim(),
        roles: Array.isArray(m.roles) ? m.roles.map(String) : ['Learner'],
      }))
      .filter((m) => m.userId && m.email && isLearnerRole(m.roles));
    source = 'stub';
  } else {
    const nrpsUrl = link.nrpsUrl || getLtiLaunchSession(link.ltiContextId)?.nrpsUrl;
    if (!nrpsUrl) {
      if (body.useStub) {
        members = [
          {
            userId: 'lti-stub-1',
            email: 'lti.learner1@school.edu',
            displayName: 'LTI Learner 1',
            roles: ['Learner'],
          },
          {
            userId: 'lti-stub-2',
            email: 'lti.learner2@school.edu',
            displayName: 'LTI Learner 2',
            roles: ['Learner'],
          },
        ];
        source = 'stub';
      } else {
        res.status(400).json({ error: 'NRPS URL unavailable — pass members[] or useStub for demo sync' });
        return;
      }
    } else {
      const bearer = await resolveLtiNrpsBearer();
      members = await fetchNrpsMembers(nrpsUrl, bearer);
      source = 'nrps';
    }
  }

  const result = await syncLtiMembersToClass(owned.class.id, members, source, link.ltiContextId);
  await appendAuditLogAsync({
    orgId: owned.class.orgId,
    accountId: req.account!.id,
    action: 'lti.roster.sync',
    resource: owned.class.id,
    metadata: { added: result.added, total: result.total, source: result.source },
  });
  res.json(result);
});
