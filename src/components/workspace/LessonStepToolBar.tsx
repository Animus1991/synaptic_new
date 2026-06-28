import { Map, Calculator, Layers, GitCompare, PenSquare, Sparkles, Timer, GitCommit, Type, Highlighter, SlidersHorizontal, CheckSquare, LayoutDashboard, BookOpen, MessageCircle } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import type { WorkspaceToolId } from '../../lib/taskFlows';
import { stepToolActionLabel, type WorkspaceStep } from '../../lib/workspaceStepTools';
import { buildLessonStepToolbarTools } from '../../lib/lessonStepToolbarNextActionSync';
import { buildLessonStepUnifiedActions } from '../../lib/lessonStepUnifiedActions';
import type { NextActionRecommendation } from '../../lib/nextActionEngine';
import { useI18n } from '../../lib/i18n';
import type { LearningActionId } from '../../lib/workspaceLearningActions';

const ACTION_ICONS: Record<LearningActionId, typeof BookOpen> = {
  'study-section': BookOpen,
  'test-me': CheckSquare,
  'explain-zero': Sparkles,
  'ask-agent': MessageCircle,
  'flashcards': Layers,
  'mark-understood': CheckSquare,
  'mark-confusing': Sparkles,
};

const TOOL_ICONS: Record<WorkspaceToolId, typeof Map> = {
  'concept-map': Map,
  simulator: SlidersHorizontal,
  leitner: Layers,
  compare: GitCompare,
  whiteboard: PenSquare,
  feynman: Sparkles,
  timer: Timer,
  debate: GitCommit,
  reader: Type,
  scratchpad: Calculator,
  annotations: Highlighter,
  quiz: CheckSquare,
  dashboard: LayoutDashboard,
};

export function LessonStepToolBar({
  step,
  stepIndex,
  stepCount,
  activeTool,
  onOpenTool,
  onLearningAction,
  lang,
  nextActionRecommendation,
  sourceBestTool,
}: {
  step: WorkspaceStep;
  stepIndex: number;
  stepCount: number;
  activeTool?: WorkspaceToolId;
  onOpenTool: (tool: WorkspaceToolId) => void;
  onLearningAction?: (action: LearningActionId) => void;
  lang: 'en' | 'el';
  nextActionRecommendation?: NextActionRecommendation | null;
  sourceBestTool?: WorkspaceToolId | null;
}) {
  const { t } = useI18n();
  const { tools, recommendedTool } = buildLessonStepToolbarTools({
    step,
    stepIndex,
    stepCount,
    nextAction: nextActionRecommendation,
    sourceBestTool,
  });

  const unifiedActions = buildLessonStepUnifiedActions(lang, nextActionRecommendation);

  return (
    <div className="space-y-2 pt-2 border-t border-border-subtle/60 mt-3">
      {onLearningAction && (
        <div className="flex flex-wrap items-center gap-1.5" data-testid="lesson-step-unified-actions">
          <span className="text-[9px] font-semibold text-text-muted w-full sm:w-auto">
            {t('stepActions')}
          </span>
          {unifiedActions.map((action) => {
            const Icon = ACTION_ICONS[action.id];
            return (
              <button
                key={action.id}
                type="button"
                title={action.hint}
                data-testid={`lesson-action-${action.id}`}
                data-recommended={action.recommended ? 'true' : undefined}
                onClick={() => onLearningAction(action.id)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[10px] font-medium transition-all',
                  action.recommended
                    ? 'border-brand-600/30 bg-brand-100/70 text-brand-800'
                    : 'border-border-subtle text-text-secondary hover:border-brand-500/30 hover:text-brand-800',
                )}
              >
                <Icon className="w-3 h-3 shrink-0" />
                {action.label}
              </button>
            );
          })}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[9px] font-semibold text-text-muted w-full sm:w-auto">
          {t('openTool')}
        </span>
      {tools.map((tool) => {
        const Icon = TOOL_ICONS[tool];
        const isActive = activeTool === tool;
        const isRecommended = recommendedTool === tool;
        return (
          <button
            key={tool}
            type="button"
            onClick={() => onOpenTool(tool)}
            className={cn(
              'inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-medium transition-all',
              isRecommended
                ? 'border-accent-emerald/35 bg-accent-emerald/10 text-accent-emerald'
                : isActive
                  ? 'border-brand-600/30 bg-brand-100/70 text-brand-800'
                  : 'border-border-subtle text-text-muted hover:border-brand-500/30 hover:text-brand-800',
            )}
            data-testid={`lesson-open-tool-${tool}`}
            data-recommended={isRecommended ? 'true' : undefined}
          >
            <Icon className="w-3 h-3" />
            {stepToolActionLabel(tool, lang)}
            {isRecommended && (
              <span className="rounded bg-accent-emerald/15 px-1 text-[8px] font-semibold">
                {t('next')}
              </span>
            )}
          </button>
        );
      })}
      </div>
    </div>
  );
}
