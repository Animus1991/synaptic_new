import { describe, expect, it } from 'vitest';
import {
  mergeSubmissionAttachments,
  parseIncomingAttachments,
  sanitizeAttachmentName,
  toPublicAttachments,
} from './submissionAttachments';

function pdfPayload(name = 'essay.pdf') {
  return {
    name,
    mime: 'application/pdf',
    contentBase64: Buffer.from('%PDF-1.4 test').toString('base64'),
  };
}

describe('submissionAttachments', () => {
  it('sanitizes path-like names', () => {
    expect(sanitizeAttachmentName('../../etc/passwd.pdf')).toBe('passwd.pdf');
    expect(sanitizeAttachmentName('my essay (final).pdf')).toBe('my essay (final).pdf');
  });

  it('accepts an allowed file and strips nothing from stored payload', () => {
    const parsed = parseIncomingAttachments([pdfPayload()]);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.attachments).toHaveLength(1);
    expect(parsed.attachments[0]!.name).toBe('essay.pdf');
    expect(parsed.attachments[0]!.size).toBeGreaterThan(0);
    expect(toPublicAttachments(parsed.attachments)[0]).not.toHaveProperty('contentBase64');
  });

  it('rejects disallowed types and empty payloads', () => {
    expect(parseIncomingAttachments([{ name: 'evil.exe', mime: 'application/octet-stream', contentBase64: 'QQ==' }]).ok).toBe(false);
    expect(parseIncomingAttachments([{ name: 'a.pdf', mime: 'application/pdf', contentBase64: '@@@' }]).ok).toBe(false);
  });

  it('keeps existing files when the client omits attachment fields', () => {
    const existing = [
      { id: 'att_1', name: 'old.pdf', mime: 'application/pdf', size: 12, contentBase64: 'QQ==' },
    ];
    const merged = mergeSubmissionAttachments({ existing, specified: false });
    expect(merged.ok).toBe(true);
    if (!merged.ok) return;
    expect(merged.attachments).toEqual(existing);
  });

  it('drops removed files and appends new ones when specified', () => {
    const existing = [
      { id: 'att_1', name: 'old.pdf', mime: 'application/pdf', size: 12, contentBase64: 'QQ==' },
      { id: 'att_2', name: 'drop.pdf', mime: 'application/pdf', size: 8, contentBase64: 'Qg==' },
    ];
    const merged = mergeSubmissionAttachments({
      existing,
      specified: true,
      keepIds: ['att_1'],
      incoming: [pdfPayload('new.pdf')],
    });
    expect(merged.ok).toBe(true);
    if (!merged.ok) return;
    expect(merged.attachments.map((a) => a.name)).toEqual(['old.pdf', 'new.pdf']);
  });
});
