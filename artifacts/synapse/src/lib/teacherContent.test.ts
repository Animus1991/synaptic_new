import { describe, expect, it } from 'vitest';
import { getTeacherContent } from './teacherContent';

describe('teacherContent', () => {
  it('returns Greek copy when lang is el', () => {
    const el = getTeacherContent('el');
    const en = getTeacherContent('en');
    expect(el.title).toBe('Πίνακας Εκπαιδευτή');
    expect(el.courseRoster).not.toBe(en.courseRoster);
  });
});
