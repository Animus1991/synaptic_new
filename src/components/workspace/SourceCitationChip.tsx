import type { ContentCitation } from '../../lib/contentCitation';
import { useI18n } from '../../lib/i18n';

type Props = {
  citation: ContentCitation;
  onOpenInReader?: (query: string) => void;
  className?: string;
};

/* OPT-K100 — markup debt: Agent/Reader/tools decorative brand type -> ink */
export function SourceCitationChip({ citation, onOpenInReader, className = '' }: Props) {
  const { t } = useI18n();
  if (!onOpenInReader) return null;

  const query = citation.excerpt?.trim() || citation.fileName || '';
  if (!query) return null;

  return (
    <button
      type="button"
      data-testid="source-citation-chip"
      data-clarity-pass="k159"
      onClick={(e) => {
        e.stopPropagation();
        onOpenInReader(query);
      }}
      className={`inline-flex min-h-8 items-center rounded-md border-0 bg-surface-secondary/55 px-2.5 py-0.5 type-caption font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary ${className}`}
      title={citation.fileName ?? citation.fileId}
    >
      {t('viewSource')}
      {citation.fileName ? ` · ${citation.fileName}` : ''}
    </button>
  );
}
