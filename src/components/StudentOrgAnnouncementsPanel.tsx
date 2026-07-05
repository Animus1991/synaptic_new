import { useMemo, useState } from 'react';
import { ChevronDown, FileText } from '@/lib/lucide-shim';
import type { StudentOrgContent } from '../lib/studentOrgContent';
import { formatDateTime } from '../lib/localeFormat';
import { cn } from '../utils/cn';

export type StudentAnnouncementItem = {
  id: string;
  classId: string;
  className: string;
  title: string;
  body: string;
  createdAt: string;
};

type Props = {
  announcements: StudentAnnouncementItem[];
  classOptions: { id: string; name: string }[];
  ui: StudentOrgContent;
  lang: 'en' | 'el';
};

export function StudentOrgAnnouncementsPanel({ announcements, classOptions, ui, lang }: Props) {
  const [open, setOpen] = useState(true);
  const [classFilter, setClassFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    if (classFilter === 'all') return announcements;
    return announcements.filter((a) => a.classId === classFilter);
  }, [announcements, classFilter]);

  return (
    <section className="rounded-2xl border border-border bg-surface/40" data-testid="student-org-announcements">
      <button
        type="button"
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-lg font-medium">
          <FileText className="w-5 h-5 text-accent" />
          {ui.announcementsTitle}
        </span>
        <ChevronDown className={cn('w-5 h-5 text-text-muted transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">
          <p className="text-sm text-text-muted">{ui.announcementsHint}</p>

          {classOptions.length > 1 && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                data-testid="student-announcements-filter-all"
                onClick={() => setClassFilter('all')}
                className={cn(
                  'rounded-full px-3 py-1 text-[10px] font-medium border transition-colors',
                  classFilter === 'all'
                    ? 'border-accent/40 bg-accent/10 text-accent'
                    : 'border-border text-text-secondary hover:bg-surface-hover',
                )}
              >
                {ui.announcementsFilterAll}
              </button>
              {classOptions.map((cls) => (
                <button
                  key={cls.id}
                  type="button"
                  data-testid={`student-announcements-filter-${cls.id}`}
                  onClick={() => setClassFilter(cls.id)}
                  className={cn(
                    'rounded-full px-3 py-1 text-[10px] font-medium border transition-colors truncate max-w-[160px]',
                    classFilter === cls.id
                      ? 'border-accent/40 bg-accent/10 text-accent'
                      : 'border-border text-text-secondary hover:bg-surface-hover',
                  )}
                >
                  {cls.name}
                </button>
              ))}
            </div>
          )}

          {filtered.length === 0 ? (
            <p className="text-sm text-text-muted">{ui.announcementsEmpty}</p>
          ) : (
            <ul className="space-y-2 max-h-80 overflow-y-auto">
              {filtered.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-border/60 bg-surface/60 p-3 text-sm"
                  data-testid={`student-announcement-${item.id}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] text-text-muted">
                          {formatDateTime(item.createdAt, lang)}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-hover text-text-secondary">
                          {item.className}
                        </span>
                      </div>
                      <p className="font-medium text-text-primary">{item.title}</p>
                      <p className="text-xs text-text-secondary whitespace-pre-wrap">{item.body}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
