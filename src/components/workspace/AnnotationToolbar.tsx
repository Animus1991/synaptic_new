import {
  FileText, Highlighter, MessageSquare, Pin, Download,
} from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import type { AnnotationCategory } from '../../lib/annotationStore';
import type { UiIconId } from '../../lib/uiIconRegistry';
import { UiIcon } from '../ui/UiIcon';

import { ANNOTATION_PALETTE } from '../../lib/masteryPalette';
import { useI18n } from '../../lib/i18n';
import { AllCapsLabel } from '../ui/AllCapsLabel';

const COLORS = [...ANNOTATION_PALETTE];

const SEMANTIC_CATEGORIES: {
  cat: AnnotationCategory;
  iconId: UiIconId;
  labelEn: string;
  labelEl: string;
}[] = [
  { cat: 'confusing', iconId: 'warning', labelEn: 'Confusing', labelEl: 'Μπερδεμένο' },
  { cat: 'exam-relevant', iconId: 'notes', labelEn: 'Exam', labelEl: 'Εξέταση' },
];

type Tool = 'highlight' | 'comment' | 'pin';

type Props = {
  lang: 'en' | 'el';
  sourceName: string;
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  activeColor: string;
  onColorChange: (color: string) => void;
  activeCategory: AnnotationCategory | 'general';
  onCategoryChange: (cat: AnnotationCategory | 'general') => void;
  sharedCount: number;
  syncLive: boolean;
  syncMode: 'stream' | 'poll' | 'off';
  syncVersion: number;
  canExport: boolean;
  onExportMd: () => void;
  sourceViewerLabel: string;
  highlightLabel: string;
  commentLabel: string;
  pinLabel: string;
};

export function AnnotationToolbar({
  lang,
  sourceName,
  tool,
  onToolChange,
  activeColor,
  onColorChange,
  activeCategory,
  onCategoryChange,
  sharedCount,
  syncLive,
  syncMode,
  syncVersion,
  canExport,
  onExportMd,
  sourceViewerLabel,
  highlightLabel,
  commentLabel,
  pinLabel,
}: Props) {
  const { t } = useI18n();
  const tools: { id: Tool; icon: typeof Highlighter; label: string }[] = [
    { id: 'highlight', icon: Highlighter, label: highlightLabel },
    { id: 'comment', icon: MessageSquare, label: commentLabel },
    { id: 'pin', icon: Pin, label: pinLabel },
  ];

  return (
    <div className="ws-panel-toolbar" data-testid="annotation-toolbar">
      <div className="ws-panel-toolbar-row">
        <FileText className="h-3 w-3 shrink-0 text-brand-700" aria-hidden />
        <span className="ws-eyebrow shrink-0 text-text-secondary"><AllCapsLabel>{sourceViewerLabel}</AllCapsLabel></span>
        {sharedCount > 0 && (
          <span className="ws-chip-warn rounded px-1 py-0.5 text-[10px]">
            {sharedCount} {t('annoTeacherShort')}
          </span>
        )}
        {syncLive && (
          <span
            data-testid="annotation-sync-live"
            className="ws-chip-ok rounded px-1 py-0.5 text-[10px]"
            title={t('annoSyncVersion').replace('{version}', String(syncVersion))}
          >
            {syncMode === 'stream' ? t('annoStream') : t('annoLive')}
          </span>
        )}
        {sourceName && (
          <span className="min-w-0 flex-1 truncate text-[10px] text-text-muted" title={sourceName}>
            {sourceName}
          </span>
        )}
        {canExport && (
          <button
            type="button"
            onClick={onExportMd}
            className="ws-panel-tool-btn shrink-0 text-text-muted hover:text-brand-700"
            title={t('exportLabel')}
            aria-label={t('exportLabel')}
          >
            <Download className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="ws-panel-toolbar-row">
        {tools.map((b) => (
          <button
            key={b.id}
            type="button"
            data-testid={`annotation-tool-${b.id}`}
            data-active={tool === b.id}
            onClick={() => onToolChange(b.id)}
            className="ws-panel-tool-btn"
            aria-pressed={tool === b.id}
            title={b.label}
          >
            <b.icon className="h-3 w-3 shrink-0" aria-hidden />
            <span className="hidden sm:inline">{b.label}</span>
          </button>
        ))}

        <div className="hidden h-3 w-px bg-border-subtle sm:block" aria-hidden />

        <div className="flex items-center gap-0.5">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onColorChange(c)}
              aria-label={t('annoHighlightColor')}
              aria-pressed={activeColor === c}
              className={cn(
                'h-3 w-3 rounded-full border transition-transform',
                activeColor === c ? 'scale-110 border-brand-800' : 'border-transparent opacity-65',
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <div className="ws-panel-toolbar-actions">
          <button
            type="button"
            data-active={activeCategory === 'general'}
            onClick={() => onCategoryChange('general')}
            className="ws-panel-tool-btn"
            aria-pressed={activeCategory === 'general'}
          >
            {t('annoGeneral')}
          </button>
          {SEMANTIC_CATEGORIES.map(({ cat, iconId, labelEn, labelEl }) => (
            <button
              key={cat}
              type="button"
              data-testid={`annotation-category-${cat}`}
              data-active={activeCategory === cat}
              onClick={() => onCategoryChange(cat)}
              className={cn(
                'ws-panel-tool-btn',
                activeCategory === cat && cat === 'confusing' && 'ws-chip-warn',
                activeCategory === cat && cat === 'exam-relevant' && 'ws-chip-brand',
              )}
              aria-pressed={activeCategory === cat}
            >
              <UiIcon id={iconId} size="xs" />
              <span className="hidden md:inline">{lang === 'el' ? labelEl : labelEn}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export { COLORS as ANNOTATION_COLORS, SEMANTIC_CATEGORIES };
