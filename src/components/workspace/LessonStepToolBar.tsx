import { Map, Calculator, Layers, GitCompare, PenSquare, Sparkles, Timer, GitCommit, Type, Highlighter, SlidersHorizontal, CheckSquare, LayoutDashboard } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { WorkspaceToolId } from '../../lib/taskFlows';
import { recommendToolsForStep, stepToolActionLabel, type WorkspaceStep } from '../../lib/workspaceStepTools';

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
  lang,
}: {
  step: WorkspaceStep;
  stepIndex: number;
  stepCount: number;
  activeTool?: WorkspaceToolId;
  onOpenTool: (tool: WorkspaceToolId) => void;
  lang: 'en' | 'el';
}) {
  const tools = recommendToolsForStep(step, stepIndex, stepCount);

  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border-subtle/60 mt-3">
      <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted w-full sm:w-auto">
        {lang === 'el' ? 'Άνοιγμα εργαλείου' : 'Open tool'}
      </span>
      {tools.map((tool) => {
        const Icon = TOOL_ICONS[tool];
        const isActive = activeTool === tool;
        return (
          <button
            key={tool}
            type="button"
            onClick={() => onOpenTool(tool)}
            className={cn(
              'inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-medium transition-all',
              isActive
                ? 'border-brand-500/40 bg-brand-600/15 text-brand-300'
                : 'border-border-subtle text-text-muted hover:border-brand-500/30 hover:text-brand-300',
            )}
            data-testid={`lesson-open-tool-${tool}`}
          >
            <Icon className="w-3 h-3" />
            {stepToolActionLabel(tool, lang)}
          </button>
        );
      })}
    </div>
  );
}
