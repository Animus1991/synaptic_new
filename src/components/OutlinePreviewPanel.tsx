import { Layers, ListTree, Loader2, AlertTriangle } from '@/lib/lucide-shim';
import type { UploadOutlinePreview } from '../lib/uploadOutlinePreview';
import type { DocumentStructureKind } from '../lib/documentStructureReport';
import { cn } from '../utils/cn';

const KIND_BADGE: Record<DocumentStructureKind, string> = {
  conversation: 'Chat / Q&A',
  faq: 'FAQ',
  slides: 'Slides',
  headings: 'Sections',
  dialogue: 'Dialogue',
  journal: 'Journal',
  flat: 'Plain text',
};

const KIND_BADGE_EL: Record<DocumentStructureKind, string> = {
  conversation: 'Chat / Q&A',
  faq: 'FAQ',
  slides: 'Διαφάνειες',
  headings: 'Ενότητες',
  dialogue: 'Διάλογος',
  journal: 'Ημερολόγιο',
  flat: 'Συνεχές κείμενο',
};

export function OutlinePreviewPanel({
  preview,
  loading,
  error,
  compact = false,
  language = 'en',
  editable = false,
  editedTopicTitles,
  onTopicTitleChange,
}: {
  preview: UploadOutlinePreview | null;
  loading?: boolean;
  error?: string | null;
  compact?: boolean;
  language?: 'en' | 'el';
  editable?: boolean;
  editedTopicTitles?: string[];
  onTopicTitleChange?: (index: number, title: string) => void;
}) {
  const isEl = language === 'el';
  const kindBadge = isEl ? KIND_BADGE_EL : KIND_BADGE;

  if (loading) {
    return (
      <div
        data-testid="upload-outline-preview"
        className="rounded-2xl border border-border-subtle bg-surface-card p-4"
      >
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
          {isEl ? 'Ανάλυση δομής και προεπισκόπηση outline…' : 'Analyzing structure and building outline preview…'}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        data-testid="upload-outline-preview"
        className="rounded-2xl border border-accent-amber/30 bg-accent-amber/5 p-4"
      >
        <p className="text-xs text-accent-amber flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </p>
      </div>
    );
  }

  if (!preview) return null;

  const { outline, quality, structure, warnings } = preview;
  const bandColor =
    quality.band === 'strong'
      ? 'text-accent-emerald'
      : quality.band === 'moderate'
        ? 'text-accent-cyan'
        : 'text-accent-amber';
  const topicLimit = compact ? 4 : 8;

  return (
    <div
      data-testid="upload-outline-preview"
      className={cn(
        'rounded-2xl border border-brand-500/25 bg-brand-500/5',
        compact ? 'p-3' : 'p-4',
      )}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide bg-brand-500/15 text-brand-300">
              <ListTree className="w-3 h-3" />
              {isEl ? 'Προεπισκόπηση outline' : 'Outline preview'}
            </span>
            <span className={cn('text-[11px] font-semibold', bandColor)}>
              {quality.score}/100 · {quality.band}
            </span>
            {structure.sectionCount >= 1 && (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium bg-surface-hover text-text-secondary">
                <Layers className="w-3 h-3" />
                {structure.sectionCount} {kindBadge[structure.kind]}
              </span>
            )}
          </div>

          {!compact && (
            <p className="mt-2 text-sm font-semibold text-text-primary truncate" title={outline.title}>
              {outline.title}
            </p>
          )}
          {!compact && outline.summary && (
            <p className="mt-1 text-xs text-text-secondary line-clamp-2">{outline.summary}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] text-text-tertiary uppercase tracking-wide">
            {isEl ? 'Προτεινόμενα modules' : 'Proposed modules'}
          </p>
          <p className="text-lg font-bold text-text-primary">{outline.topics.length}</p>
        </div>
      </div>

      {structure.sections.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
          {structure.sections.slice(0, compact ? 5 : 8).map((sec, i) => {
            const label = sec.heading ?? `§${i + 1}`;
            if (/page break/i.test(label)) return null;
            return (
              <span
                key={i}
                title={sec.preview}
                className="inline-block max-w-[200px] truncate rounded-lg border border-border-subtle bg-surface-card px-2 py-1 text-[10px] text-text-secondary"
              >
                {label.slice(0, 48)}
              </span>
            );
          })}
        </div>
      )}

      <ol className={cn('mt-3 space-y-1.5', compact && 'max-h-32 overflow-y-auto')}>
        {outline.topics.slice(0, topicLimit).map((topic, i) => {
          const displayTitle = editedTopicTitles?.[i] ?? topic.title;
          return (
          <li
            key={`${topic.title}-${i}`}
            className="flex items-start gap-2 text-xs"
          >
            <span className="shrink-0 w-5 h-5 rounded-md bg-surface-hover flex items-center justify-center text-[10px] font-semibold text-brand-300">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              {editable && onTopicTitleChange ? (
                <input
                  type="text"
                  data-testid={`outline-topic-edit-${i}`}
                  value={displayTitle}
                  onChange={(e) => onTopicTitleChange(i, e.target.value)}
                  className="w-full rounded-lg border border-border-subtle bg-surface-input px-2 py-1 text-xs font-medium text-text-primary focus:outline-none focus:border-brand-500/50"
                />
              ) : (
                <p className="font-medium text-text-primary truncate">{displayTitle}</p>
              )}
              {!compact && topic.description && (
                <p className="text-text-tertiary line-clamp-1 mt-0.5">{topic.description}</p>
              )}
            </div>
          </li>
          );
        })}
        {outline.topics.length > topicLimit && (
          <li className="text-[10px] text-text-muted pl-7">
            +{outline.topics.length - topicLimit} {isEl ? 'ακόμη' : 'more'}
          </li>
        )}
      </ol>

      {warnings.length > 0 && (
        <div className="mt-3 space-y-1">
          {warnings.slice(0, compact ? 1 : 2).map((w) => (
            <p key={w} className="text-[11px] text-accent-amber/90 flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {w}
            </p>
          ))}
        </div>
      )}

      {!compact && quality.strengths[0] && (
        <p className="mt-2 text-[11px] text-accent-emerald/90">{quality.strengths[0]}</p>
      )}
    </div>
  );
}
