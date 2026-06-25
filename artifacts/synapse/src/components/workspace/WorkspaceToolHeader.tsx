import { useState } from 'react';
import { ChevronDown, ChevronRight, Target, ArrowRight, Sparkles, CircleDot } from 'lucide-react';
import type { WorkspaceToolId } from '../../lib/taskFlows';
import { getWorkspaceToolMeta, workspaceToolLabel } from '../../lib/workspaceToolRegistry';
import { toolPurposeLine, toolLearnerProblem, getToolS20 } from '../../lib/workspaceToolS20Spine';
import { toolHowToSteps, toolProduces } from '../../lib/workspaceToolGuide';
import { getToolCrossLinkDef } from '../../lib/workspaceToolCrossLinks';
import { loadJson, saveJson } from '../../lib/persistence';
import { cn } from '../../utils/cn';

type Props = {
  activeTool: WorkspaceToolId;
  lang: 'en' | 'el';
  /** Currently focused concept, if any — shown as live context. */
  concept?: string;
  hasSource?: boolean;
  sourceName?: string;
  /** Jump to the recommended next tool. */
  onJumpTool?: (tool: WorkspaceToolId) => void;
};

const COLLAPSE_KEY = 'tool-guide-collapsed';

/**
 * Unified, self-explanatory header shown above every workspace tool.
 * Tells a brand-new user, at first glance: what this tool is, how to use it in
 * 3 steps, why it matters, what they'll get, the live concept/source context,
 * and which tool to go to next. Replaces the thin WorkspaceToolPurposeHint.
 */
export function WorkspaceToolHeader({
  activeTool,
  lang,
  concept,
  hasSource = false,
  sourceName,
  onJumpTool,
}: Props) {
  const isEl = lang === 'el';
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>(() =>
    loadJson<Record<string, boolean>>(COLLAPSE_KEY, {}),
  );
  // First visit to a tool → guide expanded; once collapsed it stays collapsed for that tool.
  const collapsed = collapsedMap[activeTool] ?? false;

  const setCollapsed = (value: boolean) => {
    setCollapsedMap((prev) => {
      const next = { ...prev, [activeTool]: value };
      saveJson(COLLAPSE_KEY, next);
      return next;
    });
  };

  const meta = getWorkspaceToolMeta(activeTool);
  const Icon = meta.icon;
  const name = workspaceToolLabel(activeTool, lang);
  const purpose = toolPurposeLine(activeTool, lang);
  const why = toolLearnerProblem(activeTool, lang);
  const steps = toolHowToSteps(activeTool, lang);
  const produces = toolProduces(activeTool, lang);
  const s20 = getToolS20(activeTool);
  const crossLink = getToolCrossLinkDef(activeTool);
  const nextTool = crossLink.follows[0] ?? crossLink.related[0]?.tool;

  return (
    <div
      className="shrink-0 border-b border-border-subtle bg-surface-card/70"
      data-testid="workspace-tool-header"
      data-tool={activeTool}
    >
      {/* Always-visible title row */}
      <div className="flex items-start gap-2.5 px-3 py-2">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 text-brand-200">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-semibold text-text-primary">{name}</h2>
            {s20.readiness !== 'launch-ready' && (
              <span className="rounded-full bg-accent-amber/15 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-accent-amber">
                {isEl ? 'βελτιώνεται' : 'polishing'}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-[11px] leading-snug text-text-secondary" title={purpose}>
            {purpose}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          data-testid="workspace-tool-header-toggle"
          aria-expanded={!collapsed}
          className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-lg border border-border-subtle px-2 py-1 text-[10px] font-medium text-text-secondary transition-colors hover:border-brand-400/40 hover:text-brand-200"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {isEl ? 'Πώς δουλεύει' : 'How to use'}
        </button>
      </div>

      {/* Expandable guidance */}
      {!collapsed && (
        <div className="space-y-2 px-3 pb-2.5" data-testid="workspace-tool-header-guide">
          {/* 3-step how-to */}
          <ol className="flex flex-col gap-1.5 sm:flex-row sm:gap-2">
            {steps.map((step, i) => (
              <li
                key={i}
                className="flex flex-1 items-start gap-1.5 rounded-lg border border-border-subtle bg-surface-primary/40 px-2 py-1.5"
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-[9px] font-bold text-brand-200">
                  {i + 1}
                </span>
                <span className="text-[10px] leading-snug text-text-secondary">{step}</span>
              </li>
            ))}
          </ol>

          {/* Why it matters + outcome */}
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-stretch">
            <p className="flex flex-1 items-start gap-1.5 rounded-lg bg-accent-cyan/8 px-2 py-1.5 text-[10px] leading-snug text-text-secondary">
              <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-accent-cyan" aria-hidden />
              <span>
                <span className="font-medium text-text-primary">{isEl ? 'Γιατί: ' : 'Why: '}</span>
                {why}
              </span>
            </p>
            <p className="flex flex-1 items-start gap-1.5 rounded-lg bg-brand-500/8 px-2 py-1.5 text-[10px] leading-snug text-text-secondary">
              <Target className="mt-0.5 h-3 w-3 shrink-0 text-brand-300" aria-hidden />
              <span>
                <span className="font-medium text-text-primary">{isEl ? 'Θα πάρεις: ' : "You'll get: "}</span>
                {produces}
              </span>
            </p>
          </div>

          {/* Live context + next-best tool */}
          <div className="flex flex-wrap items-center gap-1.5">
            {hasSource && concept && (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-border-subtle bg-surface-primary/50 px-2 py-0.5 text-[10px] text-text-secondary"
                data-testid="workspace-tool-header-concept"
              >
                <CircleDot className="h-2.5 w-2.5 text-brand-300" aria-hidden />
                {isEl ? 'Εστίαση:' : 'Focus:'}{' '}
                <span className="max-w-[160px] truncate font-medium text-text-primary">{concept}</span>
              </span>
            )}
            {hasSource && sourceName && (
              <span className="inline-flex max-w-[200px] items-center gap-1 truncate rounded-full border border-border-subtle bg-surface-primary/50 px-2 py-0.5 text-[10px] text-text-muted">
                {isEl ? 'Πηγή:' : 'Source:'} <span className="truncate">{sourceName}</span>
              </span>
            )}
            <span className="flex-1" />
            {nextTool && onJumpTool && (
              <button
                type="button"
                onClick={() => onJumpTool(nextTool)}
                data-testid="workspace-tool-header-next"
                className="inline-flex items-center gap-1 rounded-full border border-brand-500/30 bg-brand-500/10 px-2 py-0.5 text-[10px] font-medium text-brand-200 transition-colors hover:bg-brand-500/15"
              >
                {isEl ? 'Μετά:' : 'Next:'} {workspaceToolLabel(nextTool, lang)}
                <ArrowRight className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
