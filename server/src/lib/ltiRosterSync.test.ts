import { describe, it, expect, beforeEach } from 'vitest';
import {
  isLearnerRole,
  linkLtiContextToClass,
  parseNrpsMembers,
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
});
