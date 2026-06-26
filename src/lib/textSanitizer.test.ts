import { describe, expect, it } from 'vitest';
import { sanitizeUnicode } from './textSanitizer';
import { stripPresentationMarkup } from './presentationSanitizer';

describe('textSanitizer', () => {
  it('strips PUA and replacement characters', () => {
    const { text, report } = sanitizeUnicode('hello\uE001\uFFF0world\uFFFD');
    expect(text).toBe('helloworld');
    expect(report.puaStripped).toBeGreaterThan(0);
    expect(report.replacementChars).toBe(1);
  });

  it('NFKC normalizes compatibility characters', () => {
    const { text } = sanitizeUnicode('ﬁle');
    expect(text).toContain('file');
  });
});

describe('presentationSanitizer', () => {
  it('flattens font markup to plain text', () => {
    const out = stripPresentationMarkup('<span style="font-family: Wingdings">Διανομή</span> <i>test</i>');
    expect(out).toContain('Διανομή');
    expect(out).toContain('test');
    expect(out).not.toContain('<');
  });
});
