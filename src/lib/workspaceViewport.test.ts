/** @vitest-environment node */
import { describe, expect, it } from 'vitest';
import { isWorkspacePhoneWidth, WORKSPACE_PHONE_MAX_WIDTH } from './workspaceViewport';

describe('workspaceViewport (OPT-K67)', () => {
  it('treats widths under 768 as phone', () => {
    expect(WORKSPACE_PHONE_MAX_WIDTH).toBe(768);
    expect(isWorkspacePhoneWidth(390)).toBe(true);
    expect(isWorkspacePhoneWidth(767)).toBe(true);
  });

  it('treats tablet/desktop widths as non-phone', () => {
    expect(isWorkspacePhoneWidth(768)).toBe(false);
    expect(isWorkspacePhoneWidth(1023)).toBe(false);
    expect(isWorkspacePhoneWidth(1280)).toBe(false);
  });
});
