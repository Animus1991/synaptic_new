import { describe, expect, it } from 'vitest';
import { paletteQuickActions, quickAccessActions } from './globalActionRegistry';

describe('globalActionRegistry', () => {
  it('keeps upload in the command palette but not Quick Access', () => {
    const access = quickAccessActions(true).map((a) => a.id);
    const palette = paletteQuickActions(true).map((a) => a.id);
    expect(access).not.toContain('upload');
    expect(palette).toContain('upload');
    expect(access).toEqual(['note-analysis', 'exam']);
    expect(palette).toContain('workspace');
  });
});
