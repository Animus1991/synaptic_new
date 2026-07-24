import { Download } from '@/lib/lucide-shim';
import type { Course, GlossaryEntry } from '../types';
import { downloadStudyGuideMarkdown } from '../lib/studyGuideExport';
import { cn } from '../utils/cn';

type Props = {
  course: Course;
  glossaryEntries?: GlossaryEntry[];
  lang: 'en' | 'el';
  className?: string;
};

export function StudyGuideExportButton({ course, glossaryEntries = [], lang, className }: Props) {
  const label = lang === 'el' ? 'Εξαγωγή οδηγού' : 'Export study guide';

  return (
    <button
      type="button"
      data-testid="study-guide-export-btn"
      onClick={() => downloadStudyGuideMarkdown(course, glossaryEntries, lang)}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm border border-border-subtle hover:bg-surface-hover text-text-secondary transition-colors',
        className,
      )}
      title={label}
    >
      <Download className="w-4 h-4" />
      {label}
    </button>
  );
}
