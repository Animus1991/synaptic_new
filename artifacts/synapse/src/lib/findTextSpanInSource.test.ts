import { describe, expect, it } from 'vitest';
import { findTextSpanInFiles } from './findTextSpanInSource';
import type { UploadedFile } from '../types';

describe('findTextSpanInFiles', () => {
  it('finds exact substring', () => {
    const file: UploadedFile = {
      id: 'f1',
      name: 'a.md',
      type: 'md',
      size: 100,
      uploadedAt: new Date().toISOString(),
      status: 'analyzed',
      extractedText: 'Hello elasticity world',
    };
    const hit = findTextSpanInFiles([file], 'elasticity');
    expect(hit?.charStart).toBe(6);
    expect(hit?.excerpt).toContain('elasticity');
  });
});
