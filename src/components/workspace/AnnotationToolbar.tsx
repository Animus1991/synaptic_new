import {
  FileText, Highlighter, MessageSquare, Pin, Download,
} from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import type { AnnotationCategory } from '../../lib/annotationStore';
import type { UiIconId } from '../../lib/uiIconRegistry';
import { UiIcon } from '../ui/UiIcon';

import { ANNOTATION_PALETTE } from '../../lib/masteryPalette';
import { useI18n, type I18nKey } from '../../lib/i18n';

const COLORS = [...ANNOTATION_PALETTE];

const COLOR_LABEL_KEYS: I18nKey[] = [
  'annoColorPurple',
  'annoColorAmber',
  'annoColorGreen',
  'annoColorRose',
  'annoColorCyan',
];

const SEMANTIC_CATEGORIES: {
  cat: AnnotationCategory;
  iconId: UiIconId;
  labelKey: I18nKey;
}[] = [
  { cat: 'confusing', iconId: 'warning', labelKey: 'annoConfusing' },
  { cat: 'exam-relevant', iconId: 'notes', labelKey: 'annoExam' },
];

type Tool = 'highlight' | 'comment' | 'pin';

export type AnnotationCategoryCounts = Partial<Record<AnnotationCategory | 'general', number>>;

type Props = {
  lang: 'en' | 'el';
  sourceName: string;
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  activeColor: string;
  onColorChange: (color: string) => void;
  activeCategory: AnnotationCategory | 'general';
  onCategoryChange: (cat: AnnotationCategory | 'general') => void;
  categoryCounts?: AnnotationCategoryCounts;
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

/* OPT-K100 — markup debt: Agent/Reader/tools decorative brand type -> ink */
export function AnnotationToolbar({
  lang: _lang,
  sourceName,
  tool,
  onToolChange,
  activeColor,
  onColorChange,
  activeCategory,
  onCategoryChange,
  categoryCounts,
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

  const countFor = (cat: AnnotationCategory | 'general') => categoryCounts?.[cat] ?? 0;

  return (
    <div className="ws-panel-toolbar" data-testid="annotation-toolbar">
      <div className="ws-panel-toolbar-row">
        <FileText className="h-3.5 w-3.5 shrink-0 text-text-secondary" aria-hidden />
        <span className="type-caption shrink-0 font-semibold text-text-secondary">{sourceViewerLabel}</span>
        {sharedCount > 0 && (
          <span className="ws-chip-warn rounded px-1.5 py-0.5 type-caption">
            {sharedCount} {t('annoTeacherShort')}
          </span>
        )}
        {syncLive && (
          <span
            data-testid="annotation-sync-live"
            className="ws-chip-ok rounded px-1.5 py-0.5 type-caption"
            title={t('annoSyncVersion').replace('{version}', String(syncVersion))}
          >
            {syncMode === 'stream' ? t('annoStream') : t('annoLive')}
          </span>
        )}
        {sourceName && (
          <span className="min-w-0 flex-1 truncate type-caption text-text-muted" title={sourceName}>
            {sourceName}
          </span>
        )}
        {canExport && (
          <button
            type="button"
            onClick={onExportMd}
            className="ws-panel-tool-btn shrink-0 text-text-muted hover:text-text-primary"
            title={t('exportLabel')}
            aria-label={t('exportLabel')}
          >
            <Download className="h-3.5 w-3.5" />
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
            <b.icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>{b.label}</span>
          </button>
        ))}

        <div className="h-3 w-px bg-border-subtle" aria-hidden />

        <div className="flex items-center gap-1" data-testid="annotation-color-swatches">
          {COLORS.map((c, i) => {
            const colorLabel = t(COLOR_LABEL_KEYS[i] ?? 'annoHighlightColor');
            return (
              <button
                key={c}
                type="button"
                onClick={() => onColorChange(c)}
                aria-label={colorLabel}
                title={colorLabel}
                aria-pressed={activeColor === c}
                className={cn(
                  'h-4 w-4 rounded-full border transition-transform',
                  activeColor === c ? 'scale-110 border-brand-800 ring-1 ring-brand-500/40' : 'border-border-subtle opacity-80',
                )}
                style={{ backgroundColor: c }}
              />
            );
          })}
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
            {countFor('general') > 0 && (
              <span className="ws-num opacity-80">{countFor('general')}</span>
            )}
          </button>
          {SEMANTIC_CATEGORIES.map(({ cat, iconId, labelKey }) => (
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
              <span>{t(labelKey)}</span>
              {countFor(cat) > 0 && (
                <span className="ws-num opacity-80">{countFor(cat)}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export { COLORS as ANNOTATION_COLORS, SEMANTIC_CATEGORIES };
