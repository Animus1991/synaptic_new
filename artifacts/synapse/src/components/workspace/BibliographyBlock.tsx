import { Library } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import { t, type Lang } from '../../lib/i18n';

export function BibliographyBlock({
  title,
  items,
  lang,
}: {
  title?: string;
  items: string[];
  lang: Lang;
}) {
  if (items.length === 0) return null;

  const heading = title ?? t('referencesHeading', lang);

  return (
    <div
      className="rounded-2xl border border-accent-violet/25 bg-gradient-to-br from-accent-violet/8 via-surface-card/40 to-transparent p-4"
      data-testid="reader-bibliography"
    >
      <div className="mb-3 flex items-center gap-2">
        <Library className="h-4 w-4 shrink-0 text-accent-violet" />
        <h3 className="text-sm font-semibold text-text-primary">{heading}</h3>
      </div>
      <ol className={cn('list-decimal space-y-2 pl-5 text-[13px] leading-relaxed text-text-secondary')}>
        {items.map((item, i) => (
          <li key={i} className="whitespace-pre-line">
            {item.replace(/^\[\d{1,3}\]\s*/, '').replace(/^\(\d{1,3}\)\s*/, '')}
          </li>
        ))}
      </ol>
    </div>
  );
}
