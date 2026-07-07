import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isLearnerRole,
  linkLtiContextToClass,
  parseNrpsLinkNextUrl,
  parseNrpsMembers,
  fetchNrpsMembers,
  resetLtiRosterSyncState,
  syncLtiMembersToClass,
} from './ltiRosterSync';
import { resetClassStore } from '../store/classStore';
import { createTeacherClassAsync } from '../store/classStore';

describe('ltiRosterSync', () => {
  beforeEach(() => {
    resetLtiRosterSyncState();
    resetClassStore();
  });

  it('parseNrpsMembers keeps learners and drops instructors', () => {
    const members = parseNrpsMembers({
      members: [
        {
          user_id: '1',
          email: 'learner@school.edu',
          name: 'Learner One',
          roles: ['http://purl.imsglobal.org/vocab/lis/v2/membership#Learner'],
          status: 'Active',
        },
        {
          user_id: '2',
          email: 'teacher@school.edu',
          name: 'Teacher',
          roles: ['http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor'],
          status: 'Active',
        },
      ],
    });
    expect(members).toHaveLength(1);
    expect(members[0]?.email).toBe('learner@school.edu');
  });

  it('syncLtiMembersToClass enrolls new students and skips duplicates', async () => {
    const cls = await createTeacherClassAsync('teacher-1', { name: 'LTI Class' });
    linkLtiContextToClass(cls.id, { ltiContextId: 'ctx-100', contextTitle: 'Canvas 100' });

    const first = await syncLtiMembersToClass(
      cls.id,
      [
        {
          userId: 'u1',
          email: 'a@school.edu',
          displayName: 'A',
          roles: ['Learner'],
        },
        {
          userId: 'u2',
          email: 'b@school.edu',
          displayName: 'B',
          roles: ['Learner'],
        },
      ],
      'stub',
      'ctx-100',
    );
    expect(first.added).toBe(2);

    const second = await syncLtiMembersToClass(
      cls.id,
      [
        {
          userId: 'u1',
          email: 'a@school.edu',
          displayName: 'A',
          roles: ['Learner'],
        },
      ],
      'stub',
      'ctx-100',
    );
    expect(second.added).toBe(0);
    expect(second.skipped).toBe(1);
  });

  it('isLearnerRole accepts learner markers', () => {
    expect(isLearnerRole(['http://purl.imsglobal.org/vocab/lis/v2/membership#Learner'])).toBe(true);
    expect(isLearnerRole(['http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor'])).toBe(false);
  });

  it('parseNrpsLinkNextUrl extracts rel=next URL', () => {
    const next = parseNrpsLinkNextUrl(
      '<https://lms.example/nrps?page=2>; rel="next", <https://lms.example/nrps?page=1>; rel="current"',
    );
    expect(next).toBe('https://lms.example/nrps?page=2');
  });

  it('fetchNrpsMembers paginates through Link rel=next', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) =>
            name.toLowerCase() === 'link' ? '<https://lms.example/nrps?page=2>; rel="next"' : null,
        },
        json: async () => ({
          members: [
            {
              user_id: 'u1',
              email: 'page1@school.edu',
              roles: ['Learner'],
              status: 'Active',
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => null },
        json: async () => ({
          members: [
            {
              user_id: 'u2',
              email: 'page2@school.edu',
              roles: ['Learner'],
              status: 'Active',
            },
          ],
        }),
      });

    const members = await fetchNrpsMembers(
      'https://lms.example/nrps?page=1',
      'bearer-token',
      fetchMock as unknown as typeof fetch,
    );
    expect(members).toHaveLength(2);
    expect(members.map((m) => m.email)).toEqual(['page1@school.edu', 'page2@school.edu']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
