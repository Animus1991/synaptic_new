import { BookOpen } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';

export function FrontMatterCard({
  title,
  items,
  lang,
}: {
  title?: string;
  items: string[];
  lang: 'en' | 'el';
}) {
  if (items.length === 0) return null;

  const heading = title ?? (lang === 'el' ? 'Στοιχεία μαθήματος' : 'Course information');

  return (
    <div
      className="mb-4 rounded-2xl border border-accent-cyan/30 bg-gradient-to-br from-accent-cyan/10 via-brand-600/5 to-transparent p-4"
      data-testid="reader-front-matter"
    >
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="w-4 h-4 text-brand-800 shrink-0" />
        <h3 className="text-sm font-semibold text-text-primary">{heading}</h3>
      </div>
      <ol className={cn('list-decimal space-y-2 pl-5 text-[14px] text-text-primary')}>
        {items.map((item, i) => (
          <li key={i} className="whitespace-pre-line leading-relaxed">
            {item}
          </li>
        ))}
      </ol>
    </div>
  );
}
