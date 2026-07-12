import type { I18nKey } from './i18n';

export const UPLOAD_MAX_FILE_BYTES = 50 * 1024 * 1024;
export const UPLOAD_MAX_FILES = 20;
export const UPLOAD_MIN_PASTE_CHARS = 24;

const ALLOWED_EXTENSIONS = new Set([
  'pdf', 'docx', 'doc', 'pptx', 'ppt', 'txt', 'md', 'csv',
  'py', 'js', 'ts', 'r', 'sql', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'json', 'zip',
]);

export type UploadValidationIssue = {
  key: I18nKey;
  detail?: string;
};

export function fileExtension(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? '';
}

export function isAllowedUploadFile(name: string): boolean {
  const ext = fileExtension(name);
  return ALLOWED_EXTENSIONS.has(ext);
}

export function isValidYoutubeUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return true;
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./, '');
    return host === 'youtube.com' || host === 'youtu.be' || host === 'm.youtube.com';
  } catch {
    return false;
  }
}

function fileFingerprint(file: File): string {
  return `${file.name}::${file.size}::${file.lastModified}`;
}

export function validateUploadInput(input: {
  files: File[];
  pastedContent?: string;
  youtubeUrl?: string;
  uploadMode?: 'new' | 'extend';
  targetCourseId?: string;
  hasExtendTarget?: boolean;
}): UploadValidationIssue[] {
  const issues: UploadValidationIssue[] = [];
  const paste = input.pastedContent?.trim() ?? '';
  const youtube = input.youtubeUrl?.trim() ?? '';
  const hasPaste = paste.length > 0;
  const hasYoutube = youtube.length > 0;
  const hasFiles = input.files.length > 0;

  if (!hasFiles && !hasPaste && !hasYoutube) {
    issues.push({ key: 'uploadValidationEmpty' });
    return issues;
  }

  if (hasPaste && paste.length < UPLOAD_MIN_PASTE_CHARS) {
    issues.push({ key: 'uploadValidationPasteShort' });
  }

  if (hasYoutube && !isValidYoutubeUrl(youtube)) {
    issues.push({ key: 'uploadValidationYoutubeInvalid' });
  }

  if (input.files.length > UPLOAD_MAX_FILES) {
    issues.push({ key: 'uploadValidationTooManyFiles' });
  }

  const seen = new Set<string>();
  for (const file of input.files) {
    if (!isAllowedUploadFile(file.name)) {
      issues.push({ key: 'uploadValidationFileType', detail: file.name });
    }
    if (file.size <= 0) {
      issues.push({ key: 'uploadValidationFileEmpty', detail: file.name });
    }
    if (file.size > UPLOAD_MAX_FILE_BYTES) {
      issues.push({ key: 'uploadValidationFileSize', detail: file.name });
    }
    const fp = fileFingerprint(file);
    if (seen.has(fp)) {
      issues.push({ key: 'uploadValidationDuplicate', detail: file.name });
    }
    seen.add(fp);
  }

  if (input.uploadMode === 'extend' && input.hasExtendTarget && !input.targetCourseId) {
    issues.push({ key: 'uploadValidationExtendTarget' });
  }

  return issues;
}

export function createUploadJobId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `upload-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
