import { useState } from 'react';
import { ChevronDown, ChevronRight, Target, ArrowRight, Sparkles, CircleDot, BookOpen, HelpCircle } from 'lucide-react';
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
  /** Jump to a related tool. */
  onJumpTool?: (tool: WorkspaceToolId) => void;
  /** Open the source reader for the current concept/step. */
  onOpenReader?: () => void;
  /** Ask the AI agent about the current tool/concept. */
  onAskAgent?: () => void;
};

const COLLAPSE_KEY = 'tool-guide-collapsed';

/**
 * Single, self-explanatory guide shown above every workspace tool. The title +
 * one-line purpose are always visible (calm by default); the full how-to, why,
 * outcome, live context, source/agent shortcuts, and related tools live under one
 * "Guide" disclosure. Merges the former WorkspaceToolHeader + WorkspaceToolCrossLinkBar
 * so there is exactly one guidance surface and no competing primary CTAs.
 */
export function WorkspaceToolHeader({
  activeTool,
  lang,
  concept,
  hasSource = false,
  sourceName,
  onJumpTool,
  onOpenReader,
  onAskAgent,
}: Props) {
  const isEl = lang === 'el';
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>(() =>
    loadJson<Record<string, boolean>>(COLLAPSE_KEY, {}),
  );
  // Calm by default: the guide starts collapsed; the title + purpose line stay
  // visible so each tool still explains itself at a glance. Expanding persists per tool.
  const collapsed = collapsedMap[activeTool] ?? true;

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
  const relatedTools = crossLink.related;
  const showSourceBtn = crossLink.readerAnchor && !!onOpenReader && activeTool !== 'reader' && hasSource;

  return (
    <div
      className="shrink-0 border-b border-border-subtle bg-surface-card/70"
      data-testid="workspace-tool-header"
      data-tool={activeTool}
    >
      {/* Always-visible title row */}
      <div className="flex items-center gap-2.5 px-3.5 py-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 text-brand-200">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="ws-title truncate text-text-primary">{name}</h2>
            {s20.readiness !== 'launch-ready' && (
              <span className="rounded-full bg-accent-amber/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent-amber">
                {isEl ? 'βελτιώνεται' : 'polishing'}
              </span>
            )}
          </div>
          <p className="ws-caption mt-0.5 truncate text-text-secondary" title={purpose}>
            {purpose}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          data-testid="workspace-tool-header-toggle"
          aria-expanded={!collapsed}
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
            collapsed
              ? 'border-border-subtle text-text-secondary hover:border-brand-400/40 hover:text-brand-200'
              : 'border-brand-500/30 bg-brand-500/10 text-brand-200',
          )}
        >
          <HelpCircle className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden sm:inline">{isEl ? 'Οδηγός' : 'Guide'}</span>
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Expandable guidance */}
      {!collapsed && (
        <div className="space-y-2.5 px-3.5 pb-3" data-testid="workspace-tool-header-guide">
          {/* 3-step how-to */}
          <ol className="flex flex-col gap-1.5 sm:flex-row sm:gap-2">
            {steps.map((step, i) => (
              <li
                key={i}
                className="flex flex-1 items-start gap-2 rounded-lg border border-border-subtle bg-surface-primary/40 px-2.5 py-2"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-[11px] font-bold text-brand-200">
                  {i + 1}
                </span>
                <span className="ws-caption text-text-secondary">{step}</span>
              </li>
            ))}
          </ol>

          {/* Why it matters + outcome */}
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-stretch">
            <p className="ws-caption flex flex-1 items-start gap-2 rounded-lg bg-accent-cyan/8 px-2.5 py-2 text-text-secondary">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-cyan" aria-hidden />
              <span>
                <span className="font-semibold text-text-primary">{isEl ? 'Γιατί: ' : 'Why: '}</span>
                {why}
              </span>
            </p>
            <p className="ws-caption flex flex-1 items-start gap-2 rounded-lg bg-brand-500/8 px-2.5 py-2 text-text-secondary">
              <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-300" aria-hidden />
              <span>
                <span className="font-semibold text-text-primary">{isEl ? 'Θα πάρεις: ' : "You'll get: "}</span>
                {produces}
              </span>
            </p>
          </div>

          {/* Live context chips */}
          {hasSource && (concept || sourceName) && (
            <div className="flex flex-wrap items-center gap-1.5">
              {concept && (
                <span
                  className="ws-caption inline-flex items-center gap-1 rounded-full border border-border-subtle bg-surface-primary/50 px-2 py-0.5 text-text-secondary"
                  data-testid="workspace-tool-header-concept"
                >
                  <CircleDot className="h-3 w-3 text-brand-300" aria-hidden />
                  {isEl ? 'Εστίαση:' : 'Focus:'}{' '}
                  <span className="max-w-[180px] truncate font-medium text-text-primary">{concept}</span>
                </span>
              )}
              {sourceName && (
                <span className="ws-caption inline-flex max-w-[220px] items-center gap-1 truncate rounded-full border border-border-subtle bg-surface-primary/50 px-2 py-0.5 text-text-muted">
                  {isEl ? 'Πηγή:' : 'Source:'} <span className="truncate">{sourceName}</span>
                </span>
              )}
            </div>
          )}

          {/* Connected tools + source/agent shortcuts */}
          <div className="flex flex-wrap items-center gap-1.5 border-t border-border-subtle/60 pt-2.5">
            <span className="ws-eyebrow shrink-0 text-text-muted">
              {isEl ? 'Συνδέεται με' : 'Connects to'}
            </span>
            {relatedTools.map((link, i) => (
              <button
                key={link.tool}
                type="button"
                onClick={() => onJumpTool?.(link.tool)}
                disabled={!onJumpTool}
                data-testid={i === 0 ? 'workspace-tool-header-next' : `crosslink-jump-${link.tool}`}
                className="ws-caption inline-flex items-center gap-1 rounded-full border border-border-subtle bg-surface-card/80 px-2.5 py-1 font-medium text-text-secondary transition-colors hover:border-brand-500/30 hover:text-brand-200 disabled:opacity-50"
              >
                {isEl ? link.labelEl : link.labelEn}
                <ArrowRight className="h-3 w-3 opacity-50" />
              </button>
            ))}
            <span className="flex-1" />
            {showSourceBtn && (
              <button
                type="button"
                data-testid="crosslink-open-reader"
                onClick={onOpenReader}
                className="ws-caption inline-flex items-center gap-1.5 rounded-lg border border-border-subtle px-2.5 py-1 text-text-secondary transition-colors hover:border-brand-400/40 hover:text-brand-200"
              >
                <BookOpen className="h-3.5 w-3.5" />
                {isEl ? 'Πηγή' : 'Source'}
              </button>
            )}
            {onAskAgent && (
              <button
                type="button"
                data-testid="crosslink-ask-agent"
                onClick={onAskAgent}
                className="ws-caption inline-flex items-center gap-1.5 rounded-lg border border-accent-cyan/30 bg-accent-cyan/10 px-2.5 py-1 text-accent-cyan transition-colors hover:bg-accent-cyan/15"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {isEl ? 'Ρώτα τον Agent' : 'Ask Agent'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
