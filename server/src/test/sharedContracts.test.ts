import { describe, expect, it } from 'vitest';
import { parseAuthCredentials, LibrarySyncSchema, AuthErrorCodes } from '../../../packages/shared/src/index';

describe('B1 shared Zod contracts', () => {
  it('accepts valid auth credentials', () => {
    const ok = parseAuthCredentials({ email: 'a@b.co', password: 'password1' });
    expect(ok).toEqual({ email: 'a@b.co', password: 'password1' });
  });

  it('rejects short passwords and bad emails', () => {
    expect(parseAuthCredentials({ email: 'nope', password: 'password1' })).toBeNull();
    expect(parseAuthCredentials({ email: 'a@b.co', password: 'short' })).toBeNull();
  });

  it('parses library sync bodies with defaults', () => {
    const parsed = LibrarySyncSchema.parse({});
    expect(parsed.uploadedFiles).toEqual([]);
    expect(parsed.glossaryEntries).toEqual([]);
    expect(AuthErrorCodes.INVALID_CREDENTIALS).toBe('INVALID_CREDENTIALS');
  });
});
