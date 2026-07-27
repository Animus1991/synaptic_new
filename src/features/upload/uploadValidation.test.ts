import { describe, expect, it } from 'vitest';
import { isValidYoutubeUrl, validateUploadInput } from './uploadValidation';

describe('uploadValidation', () => {
  it('blocks empty input', () => {
    expect(validateUploadInput({ files: [] })).toHaveLength(1);
  });

  it('accepts valid youtube url', () => {
    expect(isValidYoutubeUrl('https://www.youtube.com/watch?v=abc')).toBe(true);
    expect(isValidYoutubeUrl('https://example.com/x')).toBe(false);
  });

  it('flags oversize files', () => {
    const big = new File([new ArrayBuffer(UPLOAD_MAX + 1)], 'notes.pdf', { type: 'application/pdf' });
    const issues = validateUploadInput({ files: [big] });
    expect(issues.some((i) => i.key === 'uploadValidationFileSize')).toBe(true);
  });
});

const UPLOAD_MAX = 50 * 1024 * 1024;
