import { describe, expect, it, vi } from 'vitest';
import { buildLtiAgsScore, resetLtiPassbackState, submitLtiGradePassback } from './ltiGradePassback';
import { resetLtiAgsTokenCache } from './ltiAgsOAuth';

describe('LTI AGS passback (OPS-07)', () => {
  it('buildLtiAgsScore clamps and stamps FullyGraded', () => {
    const score = buildLtiAgsScore(142, 'user-1');
    expect(score.scoreGiven).toBe(100);
    expect(score.gradingProgress).toBe('FullyGraded');
  });

  it('POSTs score when line item + bearer are available', async () => {
    resetLtiPassbackState();
    resetLtiAgsTokenCache();
    const prevToken = process.env.LTI_AGS_TOKEN;
    process.env.LTI_AGS_TOKEN = 'test-ags-token';

    const fetchMock = vi.fn(async () => new Response('ok', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    // Re-import resolve path uses config — token already set on env before module cache;
    // submit uses resolveLtiAgsBearer which reads config at call time via already-loaded config.
    // Force static token via dynamic: submitLtiGradePassback already uses resolveLtiAgsBearer.
    // Config is loaded once — patch by calling with line item; if token missing, stub_queued.
    // Use vi.resetModules pattern is heavy; instead mock fetch and set line item URL.
    const { config } = await import('../config');
    const original = config.ltiAgsToken;
    (config as { ltiAgsToken?: string }).ltiAgsToken = 'test-ags-token';

    const record = await submitLtiGradePassback({
      classId: 'c1',
      assignmentId: 'a1',
      enrollmentId: 'e1',
      ltiUserId: 'lms-user',
      score: 88,
      lineItemUrl: 'https://lms.example/api/lti/courses/1/line_items/9',
    });

    expect(fetchMock).toHaveBeenCalled();
    expect(record.status).toBe('submitted');
    expect(record.payload.scoreGiven).toBe(88);

    (config as { ltiAgsToken?: string }).ltiAgsToken = original;
    if (prevToken === undefined) delete process.env.LTI_AGS_TOKEN;
    else process.env.LTI_AGS_TOKEN = prevToken;
    vi.unstubAllGlobals();
  });
});
