import { describe, expect, it } from 'vitest';
import { NAVIGATION_REGISTRY } from './navigationRegistry';
import { groupShellNavEntries } from './shellNavGroups';

describe('groupShellNavEntries', () => {
  it('keeps every registry view exactly once', () => {
    const grouped = groupShellNavEntries(NAVIGATION_REGISTRY);
    const flat = grouped.flatMap((g) => g.entries.map((e) => e.view));
    expect(flat).toEqual(NAVIGATION_REGISTRY.map((e) => e.view));
  });

  it('omits empty organization group when teacher/org absent', () => {
    const studentOnly = NAVIGATION_REGISTRY.filter(
      (e) => e.view !== 'teacher' && e.view !== 'student-org',
    );
    const grouped = groupShellNavEntries(studentOnly);
    expect(grouped.some((g) => g.id === 'organization')).toBe(false);
    expect(grouped.flatMap((g) => g.entries)).toHaveLength(studentOnly.length);
  });
});
