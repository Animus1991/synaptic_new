import { describe, it, expect, beforeEach } from 'vitest';
import {
  addClassEnrollment,
  createTeacherClass,
  getTeacherClass,
  listTeacherClasses,
  resetClassStore,
} from './classStore';

describe('classStore tenant isolation', () => {
  beforeEach(() => {
    resetClassStore();
  });

  it('lists classes only for owning teacher', () => {
    createTeacherClass('teacher_a', { name: 'A1' });
    createTeacherClass('teacher_a', { name: 'A2' });
    createTeacherClass('teacher_b', { name: 'B1' });
    expect(listTeacherClasses('teacher_a')).toHaveLength(2);
    expect(listTeacherClasses('teacher_b')).toHaveLength(1);
  });

  it('getTeacherClass returns null for wrong teacherAccountId', () => {
    const cls = createTeacherClass('teacher_a', { name: 'Secret' });
    addClassEnrollment(cls.id, { email: 'student@school.edu' });
    expect(getTeacherClass(cls.id, 'teacher_a')?.name).toBe('Secret');
    expect(getTeacherClass(cls.id, 'teacher_b')).toBeNull();
  });
});
