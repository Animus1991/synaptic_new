import {
  BookOpen, FileText, Image, Mic, Sparkles, Video,
} from '@/lib/lucide-shim';
import type { LucideIcon } from '@/lib/lucide-shim';
import type { UploadedFile } from '../types';

export type SourceThumbnailVisual = {
  icon: LucideIcon;
  bgClass: string;
  textClass: string;
  initials: string;
  kind: string;
};

type SourceLike = Pick<UploadedFile, 'name' | 'type' | 'ingestMethod'>;

type ThumbnailHintLike = Pick<UploadedFile, 'type' | 'thumbnailRef' | 'thumbnailStatus'>;

/** PDF without a stored cover preview — user should reprocess to regenerate. */
export function needsSourceThumbnailReprocessHint(file: ThumbnailHintLike | undefined): boolean {
  if (!file || file.type !== 'pdf') return false;
  if (file.thumbnailRef) return false;
  if (file.thumbnailStatus === 'unsupported' || file.thumbnailStatus === 'pending') return false;
  return true;
}

/** Deterministic visual chip for a library / course source row. */
export function resolveSourceThumbnail(file: SourceLike): SourceThumbnailVisual {
  const ingest = file.ingestMethod;
  if (ingest === 'notebooklm-import' || ingest === 'notebooklm-chat') {
    return {
      icon: Sparkles,
      bgClass: 'bg-brand-100/90',
      textClass: 'text-brand-800',
      initials: 'NL',
      kind: 'notebooklm',
    };
  }
  if (ingest === 'notebooklm-audio-transcript' || ingest === 'transcript' || file.type === 'audio') {
    return {
      icon: Mic,
      bgClass: 'bg-accent-violet/15',
      textClass: 'text-accent-violet',
      initials: 'AU',
      kind: 'audio',
    };
  }
  if (ingest === 'youtube' || file.type === 'youtube' || file.type === 'video') {
    return {
      icon: Video,
      bgClass: 'bg-accent-rose/15',
      textClass: 'text-accent-rose',
      initials: 'YT',
      kind: 'video',
    };
  }
  if (file.type === 'image') {
    return {
      icon: Image,
      bgClass: 'bg-accent-teal/15',
      textClass: 'text-accent-teal',
      initials: 'IMG',
      kind: 'image',
    };
  }
  const lower = file.name.toLowerCase();
  if (file.type === 'pdf' || lower.endsWith('.pdf')) {
    return {
      icon: FileText,
      bgClass: 'bg-accent-amber/15',
      textClass: 'text-accent-amber',
      initials: 'PDF',
      kind: 'pdf',
    };
  }
  if (file.type === 'md' || lower.endsWith('.md') || ingest === 'paste') {
    return {
      icon: BookOpen,
      bgClass: 'bg-surface-secondary',
      textClass: 'text-text-secondary',
      initials: 'MD',
      kind: 'markdown',
    };
  }
  return {
    icon: FileText,
    bgClass: 'bg-surface-secondary',
    textClass: 'text-text-secondary',
    initials: file.name.slice(0, 2).toUpperCase() || 'DOC',
    kind: 'document',
  };
}
