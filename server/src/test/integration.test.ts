import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import type { Application } from 'express';
import { createTestDatabase } from './testDb';
import { config } from '../config';

// Integration sweep scaffold for the Synapse Learning server.
// Uses Supertest + ephemeral Postgres databases created via the helper.
// Set DATABASE_URL in the environment to a Postgres server that allows CREATE DATABASE.
// If no DATABASE_URL is provided, the suite runs in in-memory mode and skips DB-specific assertions.

async function createTestApp(): Promise<{ app: Application; cleanup?: () => Promise<void> }> {
  const baseUrl = process.env.DATABASE_URL || config.databaseUrl;
  process.env.NODE_ENV = 'test';
  vi.resetModules();

  if (!baseUrl) {
    const { createApp } = await import('../index');
    return { app: createApp() };
  }

  try {
    const testDb = await createTestDatabase(baseUrl);
    process.env.DATABASE_URL = testDb.databaseUrl;
    const { createApp } = await import('../index');
    return { app: createApp(), cleanup: () => testDb.cleanup() };
  } catch (err) {
    console.warn('[integration test] failed to create ephemeral DB; falling back to in-memory mode:', (err as Error).message);
    delete process.env.DATABASE_URL;
    vi.resetModules();
    const { createApp } = await import('../index');
    return { app: createApp() };
  }
}

describe('server integration sweep', () => {
  let app: Application;
  let cleanup: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    const result = await createTestApp();
    app = result.app;
    cleanup = result.cleanup;
  }, 60_000);

  afterAll(async () => {
    await cleanup?.();
  });

  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.production).toBeDefined();
    expect(res.body.features.rateLimitBackend).toMatch(/redis|memory/);
    expect(res.body.production.rateLimit).toBeDefined();
    expect(typeof res.body.production.rateLimit.distributed).toBe('boolean');
    expect(typeof res.body.features.rateLimitDistributed).toBe('boolean');
    expect(res.body.multiTenant).toBeDefined();
    expect(res.body.multiTenant.teacherClassScoped).toBe(true);
    expect(res.body.multiTenant.orgRbac).toBe(true);
    expect(typeof res.body.multiTenant.postgresAccountScoped).toBe('boolean');
  });

  it('POST /auth/register creates an account', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'test@example.com', password: 'password123' })
      .expect(201);
    expect(res.body.account).toBeDefined();
    expect(res.body.account.email).toBe('test@example.com');
    expect(res.body.token).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  it('POST /auth/login returns tokens for a registered account', async () => {
    await request(app)
      .post('/auth/register')
      .send({ email: 'login@example.com', password: 'password123' });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'login@example.com', password: 'password123' })
      .expect(200);
    expect(res.body.account.email).toBe('login@example.com');
    expect(res.body.token).toBeDefined();
  });

  it('POST /auth/login rejects invalid credentials', async () => {
    await request(app)
      .post('/auth/login')
      .send({ email: 'notfound@example.com', password: 'password123' })
      .expect(401);
  });

  it('POST /auth/register rejects duplicate email', async () => {
    await request(app)
      .post('/auth/register')
      .send({ email: 'dup@example.com', password: 'password123' });
    await request(app)
      .post('/auth/register')
      .send({ email: 'dup@example.com', password: 'password123' })
      .expect(409);
  });

  it('PUT /v1/session persists concept bus and step schedules', async () => {
    const reg = await request(app)
      .post('/auth/register')
      .send({ email: 'bus@example.com', password: 'password123' })
      .expect(201);
    const token = reg.body.token as string;

    const payload = {
      learnerModel: null,
      dashboardStats: null,
      tasks: [],
      xp: 0,
      betaMastery: [],
      firstAttemptKeys: [],
      openMistakes: [],
      activities: [],
      userSettings: null,
      conceptBuses: {
        'workspace:task-1': {
          elasticity: {
            concept: 'Elasticity',
            key: 'elasticity',
            tools: ['quiz'],
            signals: ['quiz-wrong'],
            firstAt: 1,
            lastAt: 2,
            struggleScore: 1,
          },
        },
      },
      stepSchedules: {
        'workspace:task-1': {
          '0': {
            lastVisitedAt: '2020-01-01T00:00:00.000Z',
            visitCount: 1,
            intervalDays: 1,
            easeFactor: 2,
            nextDueAt: '2020-01-01T00:00:00.000Z',
          },
        },
      },
    };

    await request(app)
      .put('/v1/session')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(200);

    const res = await request(app)
      .get('/v1/session')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.conceptBuses['workspace:task-1'].elasticity.concept).toBe('Elasticity');
    expect(res.body.stepSchedules['workspace:task-1']['0'].visitCount).toBe(1);
  });

  it('POST /__chunk_errors accepts beacon payloads (A4)', async () => {
    await request(app)
      .post('/__chunk_errors')
      .send({ flow: 'test', message: 'chunk load failed', version: 'dev' })
      .expect(204);
  });

  it('GET /v1/teacher/dashboard returns library and usage aggregates', async () => {
    const reg = await request(app)
      .post('/auth/register')
      .send({ email: 'teacher@example.com', password: 'password123' })
      .expect(201);
    const token = reg.body.token as string;

    await request(app)
      .put('/v1/library')
      .set('Authorization', `Bearer ${token}`)
      .send({
        uploadedFiles: [{ id: 'f1', name: 'notes.pdf' }],
        glossaryEntries: [{ id: 'g1', term: 'elasticity' }],
        generatedCourses: [{
          id: 'c1',
          title: 'Microeconomics',
          topics: [{ id: 't1' }, { id: 't2' }],
          sourceFiles: ['notes.pdf'],
          mastery: 42,
          status: 'ready',
        }],
      })
      .expect(200);

    const res = await request(app)
      .get('/v1/teacher/dashboard')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.library.courseCount).toBe(1);
    expect(res.body.library.fileCount).toBe(1);
    expect(res.body.library.topicCount).toBe(2);
    expect(res.body.library.glossaryCount).toBe(1);
    expect(res.body.courses).toHaveLength(1);
    expect(res.body.courses[0].title).toBe('Microeconomics');
    expect(res.body.courses[0].topicCount).toBe(2);
    expect(res.body.account.email).toBe('teacher@example.com');
    expect(res.body.usage.quota).toBeGreaterThan(0);
    expect(res.body.syncedAt).toBeDefined();
    expect(res.body.publishing.annotationCount).toBe(0);
  });

  it('teacher class roster APIs create class and manage enrollments', async () => {
    const reg = await request(app)
      .post('/auth/register')
      .send({ email: 'roster@example.com', password: 'password123' })
      .expect(201);
    const token = reg.body.token as string;

    const empty = await request(app)
      .get('/v1/teacher/classes')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(empty.body.classes).toEqual([]);

    const created = await request(app)
      .post('/v1/teacher/classes')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Micro 101' })
      .expect(201);
    expect(created.body.name).toBe('Micro 101');

    const listed = await request(app)
      .get('/v1/teacher/classes')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(listed.body.classes).toHaveLength(1);
    expect(listed.body.classes[0].studentCount).toBe(0);

    const classId = created.body.id as string;
    const enrolled = await request(app)
      .post(`/v1/teacher/classes/${classId}/roster`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'student@school.edu', displayName: 'Alex' })
      .expect(201);
    expect(enrolled.body.studentEmail).toBe('student@school.edu');

    const roster = await request(app)
      .get(`/v1/teacher/classes/${classId}/roster`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(roster.body.roster).toHaveLength(1);

    await request(app)
      .delete(`/v1/teacher/classes/${classId}/roster/${enrolled.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    const afterRemove = await request(app)
      .get(`/v1/teacher/classes/${classId}/roster`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(afterRemove.body.roster).toHaveLength(0);
  });

  it('teacher class assignment APIs create list and delete assignments', async () => {
    const reg = await request(app)
      .post('/auth/register')
      .send({ email: 'assign@example.com', password: 'password123' })
      .expect(201);
    const token = reg.body.token as string;

    const created = await request(app)
      .post('/v1/teacher/classes')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'History 201' })
      .expect(201);
    const classId = created.body.id as string;

    const empty = await request(app)
      .get(`/v1/teacher/classes/${classId}/assignments`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(empty.body.assignments).toEqual([]);

    const assignment = await request(app)
      .post(`/v1/teacher/classes/${classId}/assignments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Essay draft', dueAt: '2026-08-15' })
      .expect(201);
    expect(assignment.body.title).toBe('Essay draft');
    expect(assignment.body.dueAt).toBe('2026-08-15');

    const listed = await request(app)
      .get(`/v1/teacher/classes/${classId}/assignments`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(listed.body.assignments).toHaveLength(1);

    await request(app)
      .delete(`/v1/teacher/classes/${classId}/assignments/${assignment.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    const afterDelete = await request(app)
      .get(`/v1/teacher/classes/${classId}/assignments`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(afterDelete.body.assignments).toHaveLength(0);
  });

  it('teacher class announcement APIs create list delete and student feed', async () => {
    const teacher = await request(app)
      .post('/auth/register')
      .send({ email: 'ann-teacher@example.com', password: 'password123' })
      .expect(201);
    const teacherToken = teacher.body.token as string;

    const student = await request(app)
      .post('/auth/register')
      .send({ email: 'ann-student@example.com', password: 'password123' })
      .expect(201);
    const studentToken = student.body.token as string;

    const created = await request(app)
      .post('/v1/teacher/classes')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ name: 'Announcements 101' })
      .expect(201);
    const classId = created.body.id as string;

    await request(app)
      .post(`/v1/teacher/classes/${classId}/roster`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ email: 'ann-student@example.com', displayName: 'Ann Student' })
      .expect(201);

    const empty = await request(app)
      .get(`/v1/teacher/classes/${classId}/announcements`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(200);
    expect(empty.body.announcements).toEqual([]);

    const posted = await request(app)
      .post(`/v1/teacher/classes/${classId}/announcements`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ title: 'Welcome', body: 'First day materials are posted.' })
      .expect(201);
    expect(posted.body.title).toBe('Welcome');
    expect(posted.body.body).toBe('First day materials are posted.');

    const listed = await request(app)
      .get(`/v1/teacher/classes/${classId}/announcements`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(200);
    expect(listed.body.announcements).toHaveLength(1);

    const feed = await request(app)
      .get('/v1/student/announcements')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);
    expect(feed.body.announcements).toHaveLength(1);
    expect(feed.body.announcements[0].className).toBe('Announcements 101');
    expect(feed.body.announcements[0].title).toBe('Welcome');

    const filtered = await request(app)
      .get(`/v1/student/announcements?classId=${classId}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);
    expect(filtered.body.announcements).toHaveLength(1);

    await request(app)
      .delete(`/v1/teacher/classes/${classId}/announcements/${posted.body.id}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(204);

    const afterDelete = await request(app)
      .get('/v1/student/announcements')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);
    expect(afterDelete.body.announcements).toHaveLength(0);
  });

  it('assignment discussion APIs let teacher and enrolled student post and list', async () => {
    const teacher = await request(app)
      .post('/auth/register')
      .send({ email: 'disc-teacher@example.com', password: 'password123' })
      .expect(201);
    const teacherToken = teacher.body.token as string;

    const student = await request(app)
      .post('/auth/register')
      .send({ email: 'disc-student@example.com', password: 'password123' })
      .expect(201);
    const studentToken = student.body.token as string;

    const created = await request(app)
      .post('/v1/teacher/classes')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ name: 'Discussion 101' })
      .expect(201);
    const classId = created.body.id as string;

    await request(app)
      .post(`/v1/teacher/classes/${classId}/roster`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ email: 'disc-student@example.com' })
      .expect(201);

    const assignment = await request(app)
      .post(`/v1/teacher/classes/${classId}/assignments`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ title: 'Problem set 1' })
      .expect(201);
    const assignmentId = assignment.body.id as string;

    const empty = await request(app)
      .get(`/v1/teacher/classes/${classId}/assignments/${assignmentId}/discussion`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(200);
    expect(empty.body.posts).toEqual([]);

    await request(app)
      .post(`/v1/teacher/classes/${classId}/assignments/${assignmentId}/discussion`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ body: 'Submit by Friday.' })
      .expect(201);

    const studentPost = await request(app)
      .post(`/v1/student/classes/${classId}/assignments/${assignmentId}/discussion`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ body: 'Can we use notes?' })
      .expect(201);
    expect(studentPost.body.authorRole).toBe('student');

    const studentView = await request(app)
      .get(`/v1/student/classes/${classId}/assignments/${assignmentId}/discussion`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);
    expect(studentView.body.posts).toHaveLength(2);

    await request(app)
      .delete(
        `/v1/teacher/classes/${classId}/assignments/${assignmentId}/discussion/${studentPost.body.id}`,
      )
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(204);

    const afterDelete = await request(app)
      .get(`/v1/student/classes/${classId}/assignments/${assignmentId}/discussion`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);
    expect(afterDelete.body.posts).toHaveLength(1);
  });

  it('assignment discussion supports threaded replies on root posts', async () => {
    const teacher = await request(app)
      .post('/auth/register')
      .send({ email: 'thread-teacher@example.com', password: 'password123' })
      .expect(201);
    const teacherToken = teacher.body.token as string;

    const student = await request(app)
      .post('/auth/register')
      .send({ email: 'thread-student@example.com', password: 'password123' })
      .expect(201);
    const studentToken = student.body.token as string;

    const created = await request(app)
      .post('/v1/teacher/classes')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ name: 'Threaded 101' })
      .expect(201);
    const classId = created.body.id as string;

    await request(app)
      .post(`/v1/teacher/classes/${classId}/roster`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ email: 'thread-student@example.com' })
      .expect(201);

    const assignment = await request(app)
      .post(`/v1/teacher/classes/${classId}/assignments`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ title: 'Essay draft' })
      .expect(201);
    const assignmentId = assignment.body.id as string;

    const question = await request(app)
      .post(`/v1/student/classes/${classId}/assignments/${assignmentId}/discussion`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ body: 'How long should the essay be?' })
      .expect(201);

    await request(app)
      .post(`/v1/teacher/classes/${classId}/assignments/${assignmentId}/discussion`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ body: 'About 800 words.', parentPostId: question.body.id })
      .expect(201);

    const nestedReply = await request(app)
      .post(`/v1/student/classes/${classId}/assignments/${assignmentId}/discussion`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ body: 'Can I use bullet points?', parentPostId: question.body.id })
      .expect(201);
    expect(nestedReply.body.parentPostId).toBe(question.body.id);

    await request(app)
      .post(`/v1/student/classes/${classId}/assignments/${assignmentId}/discussion`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ body: 'Nested reply', parentPostId: nestedReply.body.id })
      .expect(400);

    const listed = await request(app)
      .get(`/v1/teacher/classes/${classId}/assignments/${assignmentId}/discussion`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(200);
    expect(listed.body.posts).toHaveLength(3);
    expect(listed.body.posts.filter((p: { parentPostId?: string }) => !p.parentPostId)).toHaveLength(1);
  });

  it('LTI context link and stub roster sync enroll learners', async () => {
    const teacher = await request(app)
      .post('/auth/register')
      .send({ email: 'lti-roster@example.com', password: 'password123' })
      .expect(201);
    const token = teacher.body.token as string;

    const created = await request(app)
      .post('/v1/teacher/classes')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'LTI Linked Class' })
      .expect(201);
    const classId = created.body.id as string;

    const linked = await request(app)
      .post(`/v1/lti/classes/${classId}/context-link`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ltiContextId: 'canvas-course-42', contextTitle: 'Intro Biology' })
      .expect(201);
    expect(linked.body.link.ltiContextId).toBe('canvas-course-42');

    const synced = await request(app)
      .post(`/v1/lti/classes/${classId}/roster-sync`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        members: [
          {
            userId: 'canvas-u1',
            email: 'nrps.student@school.edu',
            displayName: 'NRPS Student',
            roles: ['Learner'],
          },
        ],
      })
      .expect(200);
    expect(synced.body.added).toBe(1);

    const roster = await request(app)
      .get(`/v1/teacher/classes/${classId}/roster`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(roster.body.roster).toHaveLength(1);
    expect(roster.body.roster[0].studentEmail).toBe('nrps.student@school.edu');
  });

  it('SAML ACS auto-provisions account and org membership', async () => {
    const admin = await request(app)
      .post('/auth/register')
      .send({ email: 'saml-admin@example.com', password: 'password123' })
      .expect(201);
    const adminToken = admin.body.token as string;

    const org = await request(app)
      .post('/v1/orgs')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'SAML Academy' })
      .expect(201);
    const orgId = org.body.id as string;

    const samlXml = Buffer.from(
      `<saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
        <saml:Subject><saml:NameID>saml-jit@school.edu</saml:NameID></saml:Subject>
        <saml:AttributeStatement>
          <saml:Attribute Name="orgId"><saml:AttributeValue>${orgId}</saml:AttributeValue></saml:Attribute>
          <saml:Attribute Name="role"><saml:AttributeValue>student</saml:AttributeValue></saml:Attribute>
        </saml:AttributeStatement>
        <Signature/>
      </saml:Assertion>`,
      'utf8',
    ).toString('base64');

    const acs = await request(app)
      .post('/v1/auth/saml/acs')
      .type('form')
      .send({ SAMLResponse: samlXml })
      .expect(302);
    const location = acs.headers.location as string;
    expect(location).toContain('saml_auth_code=');
    const authCode = new URL(location).searchParams.get('saml_auth_code');
    expect(authCode).toBeTruthy();

    const session = await request(app)
      .post('/v1/auth/saml/complete')
      .send({ code: authCode })
      .expect(200);
    const samlToken = session.body.token as string;
    expect(session.body.account.email).toBe('saml-jit@school.edu');

    const orgs = await request(app)
      .get('/v1/student/orgs')
      .set('Authorization', `Bearer ${samlToken}`)
      .expect(200);
    expect(orgs.body.orgs.some((row: { org: { id: string } }) => row.org.id === orgId)).toBe(true);
  });

  it('GET/PATCH /v1/teacher/classes/:id/gradebook stores scores', async () => {
    const reg = await request(app)
      .post('/auth/register')
      .send({ email: 'gradebook@example.com', password: 'password123' })
      .expect(201);
    const token = reg.body.token as string;

    const cls = await request(app)
      .post('/v1/teacher/classes')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Calculus A' })
      .expect(201);
    const classId = cls.body.id as string;

    const enrolled = await request(app)
      .post(`/v1/teacher/classes/${classId}/roster`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'student@school.edu', displayName: 'Alex' })
      .expect(201);

    const assignment = await request(app)
      .post(`/v1/teacher/classes/${classId}/assignments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Quiz 1' })
      .expect(201);

    const empty = await request(app)
      .get(`/v1/teacher/classes/${classId}/gradebook`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(empty.body.cells).toHaveLength(0);

    const patched = await request(app)
      .patch(`/v1/teacher/classes/${classId}/gradebook`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        enrollmentId: enrolled.body.id,
        assignmentId: assignment.body.id,
        score: 92,
      })
      .expect(200);
    expect(patched.body.score).toBe(92);

    const book = await request(app)
      .get(`/v1/teacher/classes/${classId}/gradebook`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(book.body.cells).toHaveLength(1);
  });

  it('teacher B cannot access teacher A class roster, assignments, or gradebook (404)', async () => {
    const teacherA = await request(app)
      .post('/auth/register')
      .send({ email: 'tenant_a@example.com', password: 'password123' })
      .expect(201);
    const tokenA = teacherA.body.token as string;

    const teacherB = await request(app)
      .post('/auth/register')
      .send({ email: 'tenant_b@example.com', password: 'password123' })
      .expect(201);
    const tokenB = teacherB.body.token as string;

    const cls = await request(app)
      .post('/v1/teacher/classes')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Tenant A Secret Class' })
      .expect(201);
    const classId = cls.body.id as string;

    await request(app)
      .post(`/v1/teacher/classes/${classId}/roster`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ email: 'student@school.edu', displayName: 'Sam' })
      .expect(201);

    const assignment = await request(app)
      .post(`/v1/teacher/classes/${classId}/assignments`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ title: 'Private quiz' })
      .expect(201);

    const notFound = { error: 'class not found' };

    await request(app)
      .get(`/v1/teacher/classes/${classId}/roster`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404, notFound);

    await request(app)
      .post(`/v1/teacher/classes/${classId}/roster`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ email: 'intruder@school.edu' })
      .expect(404, notFound);

    await request(app)
      .get(`/v1/teacher/classes/${classId}/assignments`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404, notFound);

    await request(app)
      .post(`/v1/teacher/classes/${classId}/assignments`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ title: 'Injected assignment' })
      .expect(404, notFound);

    await request(app)
      .delete(`/v1/teacher/classes/${classId}/assignments/${assignment.body.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404, notFound);

    await request(app)
      .get(`/v1/teacher/classes/${classId}/gradebook`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404, notFound);

    await request(app)
      .patch(`/v1/teacher/classes/${classId}/gradebook`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ enrollmentId: 'fake', assignmentId: assignment.body.id, score: 100 })
      .expect(404, notFound);

    const ownerRoster = await request(app)
      .get(`/v1/teacher/classes/${classId}/roster`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(ownerRoster.body.roster).toHaveLength(1);
  });

  it('org RBAC: admin accesses teacher class roster; outsider gets 404', async () => {
    const adminReg = await request(app)
      .post('/auth/register')
      .send({ email: 'orgadmin@example.com', password: 'password123' })
      .expect(201);
    const adminToken = adminReg.body.token as string;

    const teacherReg = await request(app)
      .post('/auth/register')
      .send({ email: 'orgteacher@example.com', password: 'password123' })
      .expect(201);
    const teacherToken = teacherReg.body.token as string;
    const teacherAccountId = teacherReg.body.account.id as string;

    const outsiderReg = await request(app)
      .post('/auth/register')
      .send({ email: 'outsider@example.com', password: 'password123' })
      .expect(201);
    const outsiderToken = outsiderReg.body.token as string;

    const org = await request(app)
      .post('/v1/orgs')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Pilot School' })
      .expect(201);
    const orgId = org.body.id as string;

    await request(app)
      .post(`/v1/orgs/${orgId}/members`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ accountId: teacherAccountId, role: 'teacher' })
      .expect(201);

    const cls = await request(app)
      .post(`/v1/orgs/${orgId}/classes`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ name: 'Physics 101' })
      .expect(201);
    const classId = cls.body.id as string;

    await request(app)
      .post(`/v1/teacher/classes/${classId}/roster`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ email: 'student@school.edu', displayName: 'Sam' })
      .expect(201);

    const adminRoster = await request(app)
      .get(`/v1/teacher/classes/${classId}/roster`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(adminRoster.body.roster).toHaveLength(1);

    await request(app)
      .get(`/v1/teacher/classes/${classId}/roster`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .expect(404, { error: 'class not found' });

    const orgClasses = await request(app)
      .get(`/v1/orgs/${orgId}/classes`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(orgClasses.body.classes).toHaveLength(1);
    expect(orgClasses.body.classes[0].name).toBe('Physics 101');
  });

  it('Sprint L4: org analytics, student classes, LTI jwks, rag status', async () => {
    const admin = await request(app)
      .post('/auth/register')
      .send({ email: 'l4admin@example.com', password: 'password123' })
      .expect(201);
    const adminToken = admin.body.token as string;

    const student = await request(app)
      .post('/auth/register')
      .send({ email: 'l4student@example.com', password: 'password123' })
      .expect(201);
    const studentToken = student.body.token as string;

    const org = await request(app)
      .post('/v1/orgs')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'L4 Academy' })
      .expect(201);
    const orgId = org.body.id as string;

    const orgClass = await request(app)
      .post(`/v1/orgs/${orgId}/classes`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Bio 101' })
      .expect(201);
    const classId = orgClass.body.id as string;

    await request(app)
      .post(`/v1/teacher/classes/${classId}/roster`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'l4student@example.com', displayName: 'Student L4' })
      .expect(201);

    const analytics = await request(app)
      .get(`/v1/orgs/${orgId}/analytics`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(analytics.body.orgId).toBe(orgId);
    expect(analytics.body.totalStudents).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(analytics.body.notebooklmBridgeHeatmap)).toBe(true);

    const studentClasses = await request(app)
      .get('/v1/student/classes')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);
    expect(studentClasses.body.classes.length).toBeGreaterThanOrEqual(1);

    const jwks = await request(app).get('/v1/lti/jwks').expect(200);
    expect(Array.isArray(jwks.body.keys)).toBe(true);

    await request(app)
      .post('/v1/teacher/classes/' + classId + '/assignments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'LTI Assignment' })
      .expect(201)
      .then(async (asgRes) => {
        const assignmentId = asgRes.body.id as string;
        const roster = await request(app)
          .get(`/v1/teacher/classes/${classId}/roster`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
        const enrollmentId = roster.body.roster[0]!.id as string;
        await request(app)
          .patch(`/v1/teacher/classes/${classId}/gradebook`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ enrollmentId, assignmentId, score: 92, status: 'graded' })
          .expect(200);
        const passback = await request(app)
          .post('/v1/lti/grade-passback')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ classId, assignmentId, enrollmentId, ltiUserId: 'canvas-user-1' })
          .expect(202);
        expect(passback.body.status).toBe('stub_queued');
        expect(passback.body.payload.scoreGiven).toBe(92);
      });

    await request(app)
      .put('/v1/library')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        uploadedFiles: [{
          id: 'f-rag',
          name: 'econ.pdf',
          extractedText:
            'Price elasticity of demand measures how quantity demanded responds to price changes in competitive markets.\n\n'
              .repeat(6),
          status: 'analyzed',
        }],
        glossaryEntries: [],
        generatedCourses: [],
      })
      .expect(200);

    await request(app)
      .get('/v1/library')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    let indexedChunks = 0;
    for (let i = 0; i < 40 && indexedChunks === 0; i += 1) {
      const statusProbe = await request(app)
        .get('/v1/rag/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      indexedChunks = statusProbe.body.indexedChunks as number;
      if (indexedChunks === 0) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
    expect(indexedChunks).toBeGreaterThan(0);

    const ragStatus = await request(app)
      .get('/v1/rag/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(typeof ragStatus.body.indexedChunks).toBe('number');
    expect(ragStatus.body.indexing).toBeDefined();
    expect(typeof ragStatus.body.indexing.status).toBe('string');
    expect(typeof ragStatus.body.indexing.progress).toBe('number');

    const crossDeviceSearch = await request(app)
      .post('/v1/rag/search')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ query: 'elasticity of demand', topK: 3 })
      .expect(200);
    expect(crossDeviceSearch.body.global).toBe(true);
    expect(crossDeviceSearch.body.indexedChunks).toBeGreaterThan(0);

    const ragSynth = await request(app)
      .post('/v1/rag/synthesize')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ query: 'Summarize my library themes', lang: 'en' })
      .expect(200);
    expect(typeof ragSynth.body.synthesis).toBe('string');
    expect(Array.isArray(ragSynth.body.sources)).toBe(true);

    const health = await request(app).get('/health').expect(200);
    expect(health.body.features.l4Enterprise).toBeDefined();
    expect(health.body.features.l4Enterprise.orgAnalytics).toBe(true);
    expect(health.body.features.l4Enterprise.ltiGradePassback).toBe(true);
    expect(health.body.features.l6Enterprise).toBeDefined();
    expect(health.body.features.l6Enterprise.cohortHeatmap).toBe(true);
    expect(health.body.features.l7Enterprise).toBeDefined();
    expect(health.body.features.l7Enterprise.studentOrgDashboard).toBe(true);
    expect(health.body.features.l8Enterprise).toBeDefined();
    expect(health.body.features.l8Enterprise.auditExport).toBe(true);
    expect(health.body.features.l9Enterprise).toBeDefined();
    expect(health.body.features.l9Enterprise.classAnnouncements).toBe(true);
    expect(health.body.features.l9Enterprise.assignmentDiscussion).toBe(true);
    expect(health.body.features.l9Enterprise.ltiRosterSync).toBe(true);
    expect(health.body.features.l9Enterprise.samlAutoProvision).toBe(true);
    expect(health.body.features.l10Enterprise).toBeDefined();
    expect(health.body.features.l10Enterprise.multiSpeakerPodcast).toBe(true);
    expect(health.body.features.l10Enterprise.videoChaptering).toBe(true);
    expect(health.body.features.l10Enterprise.ragIndexProgress).toBe(true);
    expect(health.body.features.l10Enterprise.crossLibrarySynthesis).toBe(true);
    expect(health.body.features.l10Enterprise.quizIrtConfidenceBands).toBe(true);
    expect(health.body.features.l11Enterprise).toBeDefined();
    expect(health.body.features.l11Enterprise.ankiApkgImportExport).toBe(true);
    expect(health.body.features.l11Enterprise.fsrsDueQueuePanel).toBe(true);
    expect(health.body.features.l11Enterprise.pluginMarketplace).toBe(true);
    expect(health.body.features.l11Enterprise.cohortTopicMasteryHeatmap).toBe(true);
    expect(health.body.features.l12Enterprise).toBeDefined();
    expect(health.body.features.l12Enterprise.notificationBus).toBe(true);
    expect(health.body.features.l12Enterprise.workspacePerfBudget).toBe(true);
    expect(health.body.features.l13Enterprise.notebooklmImport).toBe(true);
    expect(health.body.features.l13Enterprise.platformFocusConsolidation).toBe(true);
    expect(health.body.features.l13Enterprise.notebooklmDeepLink).toBe(true);
    expect(health.body.features.l13Enterprise.notebookShellView).toBe(true);
    expect(health.body.features.l13Enterprise.notebooklmQuizFsrs).toBe(true);
    expect(health.body.features.l13Enterprise.notebooklmChatImport).toBe(true);
    expect(health.body.features.l13Enterprise.notebooklmAudioTranscript).toBe(true);
    expect(health.body.features.l14Enterprise).toBeDefined();
    expect(health.body.features.l14Enterprise.notebooklmExport).toBe(true);
    expect(health.body.features.l14Enterprise.courseMediaAudioUpload).toBe(true);
    expect(health.body.features.l15Enterprise).toBeDefined();
    expect(health.body.features.l15Enterprise.audioTranscriptFsrs).toBe(true);
    expect(health.body.features.l15Enterprise.notebookShellExport).toBe(true);
    expect(health.body.features.l15Enterprise.notebooklmBridgeCommands).toBe(true);
    expect(health.body.features.l16Enterprise).toBeDefined();
    expect(health.body.features.l16Enterprise.notebooklmCohortHeatmap).toBe(true);
    expect(health.body.features.l16Enterprise.teacherBridgeVisibility).toBe(true);
    expect(health.body.features.l17Enterprise).toBeDefined();
    expect(health.body.features.l17Enterprise.pdfThumbnails).toBe(true);
    expect(health.body.features.l17Enterprise.notebookWorkspace).toBe(true);
    expect(health.body.features.l17Enterprise.thumbnailBackfill).toBe(true);
    expect(health.body.features.l17Enterprise.pdfThumbnailWorker).toBe(true);
    expect(health.body.features.l18Enterprise).toBeDefined();
    expect(health.body.features.l18Enterprise.thumbnailCdn).toBe(true);
    expect(health.body.features.l18Enterprise.thumbnailCdnImmutableCache).toBe(true);
    expect(health.body.features.l18Enterprise.thumbnailQueryTokenAuth).toBe(true);

    const auditExport = await request(app)
      .get(`/v1/orgs/${orgId}/audit-logs/export?format=csv`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(auditExport.headers['content-type']).toMatch(/text\/csv/);
    expect(auditExport.text).toContain('id,createdAt');

    const studentDash = await request(app)
      .get('/v1/student/dashboard')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);
    expect(typeof studentDash.body.classCount).toBe('number');

    const samlXml = Buffer.from(
      '<saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"><saml:Subject><saml:NameID>saml@test.edu</saml:NameID></saml:Subject><Signature/></saml:Assertion>',
      'utf8',
    ).toString('base64');
    await request(app)
      .post('/v1/auth/saml/acs')
      .type('form')
      .send({ SAMLResponse: samlXml })
      .expect(302);
  });

  it('POST /v1/billing/webhook deduplicates Stripe event ids', async () => {
    const reg = await request(app)
      .post('/auth/register')
      .send({ email: 'billing@example.com', password: 'password123' })
      .expect(201);
    const accountId = reg.body.account.id as string;

    const payload = {
      id: 'evt_test_checkout_dup',
      type: 'checkout.session.completed',
      data: {
        object: {
          client_reference_id: accountId,
          metadata: { plan: 'pro', accountId },
          customer: 'cus_billing_test',
        },
      },
    };

    const first = await request(app)
      .post('/v1/billing/webhook')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(payload))
      .expect(200);
    expect(first.body.status).toBe('processed');

    const second = await request(app)
      .post('/v1/billing/webhook')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(payload))
      .expect(200);
    expect(second.body.status).toBe('duplicate');

    const dash = await request(app)
      .get('/v1/teacher/dashboard')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .expect(200);
    expect(dash.body.account.plan).toBe('pro');
  });

  it('GET /v1/account/export returns account data for signed-in user', async () => {
    const reg = await request(app)
      .post('/auth/register')
      .send({ email: 'export@example.com', password: 'password123' })
      .expect(201);

    const res = await request(app)
      .get('/v1/account/export')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .expect(200);

    expect(res.headers['content-type']).toContain('application/json');
    const payload = JSON.parse(res.text);
    expect(payload.account.email).toBe('export@example.com');
    expect(payload.version).toBe('1');
  });

  it('DELETE /v1/account removes account when confirmEmail matches', async () => {
    const reg = await request(app)
      .post('/auth/register')
      .send({ email: 'delete@example.com', password: 'password123' })
      .expect(201);

    await request(app)
      .delete('/v1/account')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send({ confirmEmail: 'delete@example.com' })
      .expect(200);

    await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .expect(401);
  });

  it('DELETE /v1/account rejects wrong confirmEmail', async () => {
    const reg = await request(app)
      .post('/auth/register')
      .send({ email: 'nodelete@example.com', password: 'password123' })
      .expect(201);

    await request(app)
      .delete('/v1/account')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send({ confirmEmail: 'wrong@example.com' })
      .expect(400);
  });
});
