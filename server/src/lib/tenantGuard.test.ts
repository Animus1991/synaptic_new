import { describe, it, expect, beforeEach } from 'vitest';
import { getTenantIsolationStatus, requireTeacherClass } from './tenantGuard';
import {
  createTeacherClass,
  getTeacherClass,
  resetClassStore,
} from '../store/classStore';

describe('tenantGuard', () => {
  beforeEach(() => {
    resetClassStore();
  });

  it('getTenantIsolationStatus reflects database flag', () => {
    expect(getTenantIsolationStatus(false).postgresAccountScoped).toBe(false);
    expect(getTenantIsolationStatus(true).postgresAccountScoped).toBe(true);
    expect(getTenantIsolationStatus(true).teacherClassScoped).toBe(true);
    expect(getTenantIsolationStatus(true).orgRbac).toBe(false);
  });

  it('requireTeacherClass returns class for owner', async () => {
    const cls = createTeacherClass('acct_a', { name: 'Econ 101' });
    const guard = await requireTeacherClass(cls.id, 'acct_a');
    expect(guard.ok).toBe(true);
    if (guard.ok) expect(guard.class.name).toBe('Econ 101');
  });

  it('requireTeacherClass rejects non-owner (404, no leak)', async () => {
    const cls = createTeacherClass('acct_a', { name: 'Private' });
    const guard = await requireTeacherClass(cls.id, 'acct_b');
    expect(guard.ok).toBe(false);
    if (!guard.ok) {
      expect(guard.status).toBe(404);
      expect(guard.error).toBe('class not found');
    }
    expect(getTeacherClass(cls.id, 'acct_b')).toBeNull();
  });
});
