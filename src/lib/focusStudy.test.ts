/** @vitest-environment jsdom */
import { describe, expect, it, beforeEach } from 'vitest';
import { loadFocusStudy, persistFocusStudy } from './focusStudy';
import { isFocusStudyView } from './focusStudyPages';

describe('focusStudy (OPT-K105)', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('defaults to false and persists toggles', () => {
    expect(loadFocusStudy()).toBe(false);
    persistFocusStudy(true);
    expect(loadFocusStudy()).toBe(true);
    persistFocusStudy(false);
    expect(loadFocusStudy()).toBe(false);
  });

  it('applies to study surfaces, not Settings / Teacher / My institution', () => {
    expect(isFocusStudyView('dashboard')).toBe(true);
    expect(isFocusStudyView('library')).toBe(true);
    expect(isFocusStudyView('tasks')).toBe(true);
    expect(isFocusStudyView('agent')).toBe(true);
    expect(isFocusStudyView('study-room')).toBe(true);
    expect(isFocusStudyView('analytics')).toBe(true);
    expect(isFocusStudyView('course')).toBe(true);
    expect(isFocusStudyView('exam-prep')).toBe(true);
    expect(isFocusStudyView('note-analysis')).toBe(true);
    expect(isFocusStudyView('settings')).toBe(false);
    expect(isFocusStudyView('teacher')).toBe(false);
    expect(isFocusStudyView('student-org')).toBe(false);
    expect(isFocusStudyView('settings', true)).toBe(true);
  });
});
