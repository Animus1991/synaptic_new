/**
 * Assignment submission file attachments — metadata + base64 payload.
 * List/GET responses strip `contentBase64`; download routes stream the bytes.
 */

export const MAX_SUBMISSION_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;
export const MAX_ATTACHMENT_TOTAL_BYTES = 10 * 1024 * 1024;

export type SubmissionAttachment = {
  id: string;
  name: string;
  mime: string;
  size: number;
  contentBase64: string;
};

export type SubmissionAttachmentMeta = {
  id: string;
  name: string;
  mime: string;
  size: number;
};

export type IncomingAttachment = {
  name?: string;
  mime?: string;
  contentBase64?: string;
};

const ALLOWED_EXT = new Set([
  'pdf', 'doc', 'docx', 'txt', 'md', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'zip', 'pptx', 'csv', 'rtf',
]);

const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/markdown',
  'text/csv',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/zip',
  'application/x-zip-compressed',
  'application/rtf',
  'application/octet-stream',
]);

export function sanitizeAttachmentName(name: string): string {
  const base = name.replace(/\\/g, '/').split('/').pop() ?? 'file';
  const cleaned = base.replace(/[^\w.\- ()[\]]+/g, '_').slice(0, 120).trim();
  return cleaned || 'file';
}

function extensionOf(name: string): string {
  const idx = name.lastIndexOf('.');
  if (idx < 0 || idx === name.length - 1) return '';
  return name.slice(idx + 1).toLowerCase();
}

function decodeBase64(raw: string): Buffer | null {
  const trimmed = raw.replace(/\s+/g, '');
  if (!trimmed || trimmed.length > MAX_ATTACHMENT_BYTES * 2) return null;
  if (!/^[A-Za-z0-9+/]+=*$/.test(trimmed)) return null;
  try {
    const buf = Buffer.from(trimmed, 'base64');
    if (buf.length === 0) return null;
    return buf;
  } catch {
    return null;
  }
}

export function parseStoredAttachments(raw: unknown): SubmissionAttachment[] {
  if (!Array.isArray(raw)) return [];
  const out: SubmissionAttachment[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    if (typeof rec.id !== 'string' || typeof rec.name !== 'string') continue;
    if (typeof rec.mime !== 'string' || typeof rec.size !== 'number') continue;
    if (typeof rec.contentBase64 !== 'string') continue;
    out.push({
      id: rec.id,
      name: rec.name,
      mime: rec.mime,
      size: rec.size,
      contentBase64: rec.contentBase64,
    });
  }
  return out;
}

export function toPublicAttachments(list: SubmissionAttachment[] | undefined): SubmissionAttachmentMeta[] {
  return (list ?? []).map(({ id, name, mime, size }) => ({ id, name, mime, size }));
}

export function parseIncomingAttachments(
  raw: unknown,
): { ok: true; attachments: SubmissionAttachment[] } | { ok: false; error: string } {
  if (raw == null) return { ok: true, attachments: [] };
  if (!Array.isArray(raw)) return { ok: false, error: 'attachments must be an array' };
  if (raw.length > MAX_SUBMISSION_ATTACHMENTS) {
    return { ok: false, error: `at most ${MAX_SUBMISSION_ATTACHMENTS} attachments` };
  }
  const attachments: SubmissionAttachment[] = [];
  let total = 0;
  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      return { ok: false, error: 'invalid attachment' };
    }
    const rec = item as IncomingAttachment;
    const name = sanitizeAttachmentName(typeof rec.name === 'string' ? rec.name : 'file');
    const ext = extensionOf(name);
    if (!ALLOWED_EXT.has(ext)) {
      return { ok: false, error: `file type .${ext || 'unknown'} is not allowed` };
    }
    const mime = (rec.mime?.trim() || 'application/octet-stream').toLowerCase();
    if (!ALLOWED_MIME.has(mime)) {
      return { ok: false, error: `mime type ${mime} is not allowed` };
    }
    if (mime === 'application/octet-stream' && !ALLOWED_EXT.has(ext)) {
      return { ok: false, error: 'file type is not allowed' };
    }
    if (typeof rec.contentBase64 !== 'string') {
      return { ok: false, error: 'attachment contentBase64 required' };
    }
    const buf = decodeBase64(rec.contentBase64);
    if (!buf) return { ok: false, error: 'attachment content is not valid base64' };
    if (buf.length > MAX_ATTACHMENT_BYTES) {
      return { ok: false, error: `each file must be under ${MAX_ATTACHMENT_BYTES} bytes` };
    }
    total += buf.length;
    if (total > MAX_ATTACHMENT_TOTAL_BYTES) {
      return { ok: false, error: 'attached files exceed the total size limit' };
    }
    attachments.push({
      id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      mime,
      size: buf.length,
      contentBase64: buf.toString('base64'),
    });
  }
  return { ok: true, attachments };
}

export function mergeSubmissionAttachments(opts: {
  existing: SubmissionAttachment[];
  keepIds?: string[];
  incoming?: unknown;
  specified: boolean;
}): { ok: true; attachments: SubmissionAttachment[] } | { ok: false; error: string } {
  if (!opts.specified) return { ok: true, attachments: opts.existing };
  const keep = new Set((opts.keepIds ?? []).filter((id) => typeof id === 'string'));
  const kept = opts.existing.filter((a) => keep.has(a.id));
  const parsed = parseIncomingAttachments(opts.incoming ?? []);
  if (!parsed.ok) return parsed;
  const merged = [...kept, ...parsed.attachments];
  if (merged.length > MAX_SUBMISSION_ATTACHMENTS) {
    return { ok: false, error: `at most ${MAX_SUBMISSION_ATTACHMENTS} attachments` };
  }
  const total = merged.reduce((sum, a) => sum + a.size, 0);
  if (total > MAX_ATTACHMENT_TOTAL_BYTES) {
    return { ok: false, error: 'attached files exceed the total size limit' };
  }
  return { ok: true, attachments: merged };
}

export function findAttachment(
  list: SubmissionAttachment[] | undefined,
  attachmentId: string,
): SubmissionAttachment | undefined {
  return (list ?? []).find((a) => a.id === attachmentId);
}

export function attachmentDownloadHeaders(file: SubmissionAttachment): Record<string, string> {
  const safe = sanitizeAttachmentName(file.name).replace(/"/g, '');
  return {
    'Content-Type': file.mime || 'application/octet-stream',
    'Content-Disposition': `attachment; filename="${safe}"`,
    'Content-Length': String(file.size),
  };
}
