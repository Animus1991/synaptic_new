import { BookOpen } from '@/lib/lucide-shim';
import type { ContentCitation } from '../../lib/contentCitation';
import { useI18n } from '../../lib/i18n';

type Props = {
  citation: ContentCitation;
  onOpenInReader?: (query: string) => void;
  className?: string;
};

export function SourceCitationChip({ citation, onOpenInReader, className = '' }: Props) {
  const { t } = useI18n();
  if (!onOpenInReader) return null;

  const query = citation.excerpt?.trim() || citation.fileName || '';
  if (!query) return null;

  return (
    <button
      type="button"
      data-testid="source-citation-chip"
      onClick={(e) => {
        e.stopPropagation();
        onOpenInReader(query);
      }}
      className={`inline-flex items-center gap-1 rounded-full border border-brand-500/30 bg-brand-500/10 px-2 py-0.5 text-[10px] font-medium text-brand-800 hover:opacity-90 ${className}`}
      title={citation.fileName ?? citation.fileId}
    >
      <BookOpen className="h-3 w-3" />
      {t('viewSource')}
      {citation.fileName ? ` · ${citation.fileName}` : ''}
    </button>
  );
}
