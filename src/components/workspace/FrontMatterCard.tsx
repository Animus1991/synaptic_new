import { BookOpen } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import { t, type Lang } from '../../lib/i18n';

/* OPT-K101 — residual markup debt: decorative brand type -> ink */
export function FrontMatterCard({
  title,
  items,
  lang,
}: {
  title?: string;
  items: string[];
  lang: Lang;
}) {
  if (items.length === 0) return null;

  const heading = title ?? t('courseInfo', lang);

  return (
    <div
      className="mb-4 rounded-2xl border border-accent-cyan/30 bg-gradient-to-br from-accent-cyan/10 via-brand-600/5 to-transparent p-4"
      data-testid="reader-front-matter"
    >
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="w-4 h-4 text-text-secondary shrink-0" />
        <h3 className="type-meta font-semibold text-text-secondary">{heading}</h3>
      </div>
      <ol className={cn('list-decimal space-y-2 pl-5 type-body text-text-primary')}>
        {items.map((item, i) => (
          <li key={i} className="whitespace-pre-line leading-relaxed">
            {item}
          </li>
        ))}
      </ol>
    </div>
  );
}
