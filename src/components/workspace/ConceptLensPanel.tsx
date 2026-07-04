import { Aperture, AlertTriangle, CheckCircle2, BookOpen, ChevronDown, ChevronUp } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import type { ConceptLensAction, ConceptLensView } from '../../lib/conceptGraphModel';
import {
  conceptEngagement,
  isConfident,
  isStruggling,
  type ConceptActivity,
} from '../../lib/workspaceConceptBus';
import type { WorkspaceToolId } from '../../lib/taskFlows';
import { useI18n } from '../../lib/i18n';

const TOOL_LABELS: Record<WorkspaceToolId, { en: string; el: string }> = {
  'concept-map': { en: 'Map', el: 'Χάρτης' },
  reader: { en: 'Reader', el: 'Reader' },
  leitner: { en: 'Leitner', el: 'Leitner' },
  quiz: { en: 'Quiz', el: 'Quiz' },
  feynman: { en: 'Feynman', el: 'Feynman' },
  compare: { en: 'Compare', el: 'Σύγκριση' },
  simulator: { en: 'Sandbox', el: 'Sandbox' },
  scratchpad: { en: 'Scratch', el: 'Scratch' },
  whiteboard: { en: 'Board', el: 'Πίνακας' },
  debate: { en: 'Debate', el: 'Debate' },
  timer: { en: 'Timer', el: 'Χρόνος' },
  annotations: { en: 'Notes', el: 'Σχόλια' },
  dashboard: { en: 'Stats', el: 'Στατιστ.' },
};

const ACTION_LABELS: Record<ConceptLensAction, { en: string; el: string }> = {
  explain: { en: 'Explain', el: 'Εξήγηση' },
  quiz: { en: 'Quiz', el: 'Quiz' },
  flashcards: { en: 'Cards', el: 'Κάρτες' },
  compare: { en: 'Compare', el: 'Σύγκριση' },
  debate: { en: 'Debate', el: 'Debate' },
  feynman: { en: 'Feynman', el: 'Feynman' },
  'mark-confusing': { en: 'Confusing', el: 'Μπερδευτικό' },
  'mark-mastered': { en: 'Mastered', el: 'Κατάλαβα' },
  'open-reader': { en: 'Reader', el: 'Ανάγνωση' },
};

type Props = {
  lens: ConceptLensView;
  activity?: ConceptActivity;
  activeTool: WorkspaceToolId;
  lang: 'en' | 'el';
  /** overlay = floating on tool pane (desktop); strip = inline under context strip (< lg). */
  placement?: 'overlay' | 'strip';
  expanded?: boolean;
  onToggleExpand?: () => void;
  onFocus: (term: string) => void;
  onJumpTool: (tool: WorkspaceToolId) => void;
  onAction: (action: ConceptLensAction) => void;
  onExplainRelation?: (relatedLabel: string) => void;
  onOpenReaderSection?: () => void;
};

export function ConceptLensPanel({
  lens,
  activity,
  activeTool,
  lang,
  placement = 'overlay',
  expanded = false,
  onToggleExpand,
  onFocus,
  onJumpTool,
  onAction,
  onExplainRelation,
  onOpenReaderSection,
}: Props) {
  const { t } = useI18n();
  const label = lens.activeConcept?.trim();
  if (!label) return null;

  const isStrip = placement === 'strip';

  const engagement = activity ? conceptEngagement(activity) : lens.engagement;
  const filledDots = Math.max(activity ? 1 : 0, Math.round(engagement * 4));
  const struggling = activity ? isStruggling(activity) : lens.struggling;
  const confident = activity ? isConfident(activity) : lens.confident;
  const studiedTools = (activity?.tools ?? []).filter((tl) => tl !== activeTool);

  return (
    <div
      className={cn(
        isStrip
          ? 'relative z-10 w-full px-3 py-1 border-b border-border-subtle/70 bg-surface-primary/80'
          : 'absolute top-2 right-3 z-20 flex flex-col items-end gap-1 max-w-[min(420px,72vw)]',
      )}
      data-testid={isStrip ? 'concept-lens-strip' : 'concept-lens-panel'}
    >
      <div className={cn(
        'flex items-center gap-2 w-full rounded-full border border-white/10 bg-surface-secondary/85 backdrop-blur px-2.5 py-1 shadow-[0_8px_30px_rgba(2,6,23,0.45)]',
        isStrip && 'shadow-none max-w-full',
      )}>
        <Aperture className="w-3.5 h-3.5 text-brand-800 shrink-0" />
        <button
          type="button"
          onClick={() => onFocus(label)}
          title={t('lensFocusAllTools')}
          className={cn(
            'text-[11px] font-semibold truncate text-text-primary hover:text-brand-800 transition-colors',
            isStrip ? 'max-w-[min(200px,40vw)]' : 'max-w-[140px]',
          )}
        >
          {label}
        </button>

        <div
          className="flex items-center gap-0.5 shrink-0"
          title={`${Math.round(engagement * 100)}% ${t('lensCrossToolEngagement')}`}
        >
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={cn('w-1.5 h-1.5 rounded-full', i < filledDots ? 'bg-accent-cyan' : 'bg-white/15')}
            />
          ))}
        </div>

        {struggling && (
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-accent-amber/15 px-1.5 py-0.5 text-[9px] font-semibold text-accent-amber">
            <AlertTriangle className="w-2.5 h-2.5" />
          </span>
        )}
        {confident && !struggling && (
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-accent-emerald/15 px-1.5 py-0.5 text-[9px] font-semibold text-accent-emerald">
            <CheckCircle2 className="w-2.5 h-2.5" />
          </span>
        )}

        {studiedTools.length > 0 ? (
          <div className="flex items-center gap-1 border-l border-white/10 pl-2">
            {studiedTools.slice(0, 3).map((tl) => (
              <button
                key={tl}
                type="button"
                onClick={() => onJumpTool(tl)}
                className="rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-medium text-text-secondary hover:border-accent-cyan/40 hover:text-brand-800 transition-colors"
              >
                {TOOL_LABELS[tl][lang]}
              </button>
            ))}
          </div>
        ) : null}

        {onToggleExpand && (
          <button
            type="button"
            onClick={onToggleExpand}
            className="ml-0.5 shrink-0 rounded p-0.5 text-text-muted hover:text-text-primary"
            aria-expanded={expanded}
            aria-label={expanded ? t('collapse') : t('expand')}
            data-testid="concept-lens-expand"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {expanded && (
        <div
          className={cn(
            'w-full rounded-xl border border-white/10 bg-surface-secondary/95 backdrop-blur px-3 py-2.5 shadow-lg space-y-2 max-h-56 overflow-y-auto',
            isStrip && 'mt-1 rounded-lg shadow-none',
          )}
          data-testid="concept-lens-detail"
        >
          {lens.emptyReason === 'weak-extraction' && (
            <p className="text-[10px] text-accent-amber">
              {t('lensWeakConceptExtraction')}
            </p>
          )}

          {(lens.definition || lens.note) && (
            <p className="text-[10px] text-text-secondary line-clamp-3">
              {lens.definition ?? lens.note}
            </p>
          )}

          {lens.sourceSections.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              <BookOpen className="w-3 h-3 text-text-muted shrink-0" />
              {lens.sourceSections.map((section) => (
                <button
                  key={section}
                  type="button"
                  onClick={onOpenReaderSection}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] text-text-secondary hover:border-brand-600/35 hover:text-brand-800 truncate max-w-[160px]"
                  data-testid="concept-lens-section"
                >
                  {section}
                </button>
              ))}
            </div>
          )}

          <ConceptRefRow
            title={t('lensPrerequisitesTitle')}
            refs={lens.prerequisites}
            onSelect={onFocus}
            onExplainRelation={onExplainRelation}
            explainLabel={t('lensExplainRelation')}
          />
          <ConceptRefRow
            title={t('lensRelatedTitle')}
            refs={lens.related}
            onSelect={onFocus}
            onExplainRelation={onExplainRelation}
            explainLabel={t('lensExplainRelation')}
          />
          <ConceptRefRow
            title={t('lensFollowUpTitle')}
            refs={lens.followUp}
            onSelect={onFocus}
            onExplainRelation={onExplainRelation}
            explainLabel={t('lensExplainRelation')}
          />

          {lens.toolHits.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <span className="text-[9px] text-text-muted w-full">
                {t('lensToolActivity')}
              </span>
              {lens.toolHits.map(({ tool, count }) => (
                <span
                  key={tool}
                  className="rounded-full border border-white/10 px-1.5 py-0.5 text-[9px] text-text-secondary"
                  data-testid={`concept-lens-hit-${tool}`}
                >
                  {TOOL_LABELS[tool][lang]} ×{count}
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-1 pt-0.5">
            {lens.suggestedActions.slice(0, 6).map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => onAction(action)}
                className="rounded-full border border-brand-500/30 bg-brand-600/10 px-2 py-0.5 text-[9px] font-medium text-brand-800 hover:bg-brand-600/20 transition-colors"
                data-testid={`concept-lens-action-${action}`}
              >
                {ACTION_LABELS[action][lang]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ConceptRefRow({
  title,
  refs,
  onSelect,
  onExplainRelation,
  explainLabel,
}: {
  title: string;
  refs: { label: string; mastery?: number }[];
  onSelect: (term: string) => void;
  onExplainRelation?: (term: string) => void;
  explainLabel?: string;
}) {
  if (refs.length === 0) return null;
  return (
    <div>
      <p className="text-[9px] font-semibold text-text-muted mb-0.5">{title}</p>
      <div className="flex flex-wrap gap-1">
        {refs.map((ref) => (
          <span key={ref.label} className="inline-flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => onSelect(ref.label)}
              className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] text-text-secondary hover:border-brand-600/35 hover:text-brand-800 truncate max-w-[140px]"
              data-testid={`concept-ref-${ref.label.slice(0, 12).toLowerCase().replace(/\s+/g, '-')}`}
            >
              {ref.label}
              {ref.mastery != null && ref.mastery > 0 ? (
                <span className="ml-1 opacity-60">{ref.mastery}%</span>
              ) : null}
            </button>
            {onExplainRelation && explainLabel && (
              <button
                type="button"
                onClick={() => onExplainRelation(ref.label)}
                className="rounded-full border border-brand-500/25 bg-brand-600/8 px-1.5 py-0.5 text-[8px] font-medium text-brand-800 hover:bg-brand-600/15"
                data-testid={`concept-ref-explain-${ref.label.slice(0, 12).toLowerCase().replace(/\s+/g, '-')}`}
                title={explainLabel}
              >
                ?
              </button>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
