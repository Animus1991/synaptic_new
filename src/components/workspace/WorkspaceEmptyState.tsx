import { Upload } from 'lucide-react';
import { useI18n } from '../../lib/i18n';

interface Props {
  message: string;
  /** When true, hides the upload CTA — source exists but this tool found nothing to show. */
  hasSource?: boolean;
  onUpload?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export function WorkspaceEmptyState({
  message,
  hasSource = false,
  onUpload,
  secondaryLabel,
  onSecondary,
}: Props) {
  const { t, lang } = useI18n();
  const showUpload = !hasSource && onUpload;

  return (
    <div
      className="flex flex-col items-center justify-center h-full min-h-[200px] p-8 text-center"
      data-testid="workspace-empty-state"
      data-has-source={hasSource ? 'true' : 'false'}
    >
      <p className="text-sm text-text-secondary max-w-md leading-relaxed">{message}</p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        {showUpload && (
          <button
            type="button"
            onClick={onUpload}
            data-testid="workspace-empty-upload"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white text-sm font-medium hover:from-brand-500 hover:to-brand-400 transition-all"
          >
            <Upload className="w-4 h-4" />
            {lang === 'el' ? 'Ανέβασμα Υλικού' : t('uploadMaterial')}
          </button>
        )}
        {onSecondary && secondaryLabel && (
          <button
            type="button"
            onClick={onSecondary}
            data-testid="workspace-empty-secondary"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border-subtle bg-surface-card text-sm font-medium text-text-secondary hover:bg-surface-hover transition-all"
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}
