import { describe, it, expect } from 'vitest';
import { resolveSourceThumbnail } from './sourceThumbnail';

describe('resolveSourceThumbnail', () => {
  it('maps notebooklm imports', () => {
    const v = resolveSourceThumbnail({
      name: 'guide.md',
      type: 'md',
      ingestMethod: 'notebooklm-import',
    });
    expect(v.kind).toBe('notebooklm');
    expect(v.initials).toBe('NL');
  });

  it('maps pdf by extension', () => {
    const v = resolveSourceThumbnail({ name: 'Lecture.pdf', type: 'txt' });
    expect(v.kind).toBe('pdf');
  });

  it('maps youtube', () => {
    const v = resolveSourceThumbnail({ name: 'vid', type: 'youtube' });
    expect(v.kind).toBe('video');
  });
});
