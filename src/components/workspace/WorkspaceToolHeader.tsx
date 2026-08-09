import { useState } from 'react';
import { ChevronDown, ChevronRight } from '@/lib/lucide-shim';
import type { WorkspaceToolId } from '../../lib/taskFlows';
import { workspaceToolLabel } from '../../lib/workspaceToolRegistry';
import { toolPurposeLine, toolLearnerProblem, getToolS20 } from '../../lib/workspaceToolS20Spine';
import { toolHowToSteps, toolProduces } from '../../lib/workspaceToolGuide';
import { getToolCrossLinkDef } from '../../lib/workspaceToolCrossLinks';
import { loadJson, saveJson } from '../../lib/persistence';
import { cn } from '../../utils/cn';
import { useI18n } from '../../lib/i18n';
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
 * OPT-K96 ink chrome · OPT-K152/K155/K158 — text-first; calm Guide; no label echo.
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
  const { t } = useI18n();
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

  const name = workspaceToolLabel(activeTool, lang);
  const purpose = toolPurposeLine(activeTool, lang);
  const why = toolLearnerProblem(activeTool, lang);
  const steps = toolHowToSteps(activeTool, lang);
  const produces = toolProduces(activeTool, lang);
  const s20 = getToolS20(activeTool);
  const crossLink = getToolCrossLinkDef(activeTool);
  const showSourceBtn = crossLink.readerAnchor && !!onOpenReader && activeTool !== 'reader' && hasSource;
  /* Wave SP — avoid duplicate Source when a dedicated reader control already exists */
  const relatedTools = showSourceBtn
    ? crossLink.related.filter((link) => link.tool !== 'reader')
    : crossLink.related;

  return (
    <div
      /* OPT-K142/K152 — wash header (no hairline cage); title stays near body scale */
      className="ws-tool-header shrink-0 border-b border-transparent bg-surface-card/70"
      data-testid="workspace-tool-header" data-clarity-pass="k162"
      data-tool={activeTool}
    >
      {/* OPT-K152 — text-first title row (no decorative icon tile) */}
      <div className="ws-tool-header-row relative flex items-start gap-2 overflow-hidden sm:gap-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <h2 className="ws-display-title type-meta min-w-0 break-words font-semibold leading-snug text-text-primary sm:truncate">
              {name}
            </h2>
            {s20.readiness !== 'launch-ready' && (
              <span className="ws-eyebrow ws-chip-warn rounded-md px-1.5 py-0.5 type-caption">
                {t('toolPolishing')}
              </span>
            )}
          </div>
          <p
            className="ws-purpose-line type-caption mt-0.5 line-clamp-2 leading-snug text-text-secondary sm:line-clamp-1 sm:truncate"
            title={purpose}
          >
            {purpose}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          data-testid="workspace-tool-header-toggle"
          aria-expanded={!collapsed}
          aria-label={t('toolGuideAria')}
          /* No title= — native yellow tips near GUIDE were mistaken for a Close chip (F0). */
          className={cn(
            /* OPT-K155 — ghost text Guide (no button cage / wash chip) */
            'ws-tool-guide-btn relative z-10 inline-flex min-h-8 shrink-0 items-center justify-center gap-0.5 rounded-md px-1.5 py-0.5 type-caption text-text-secondary transition-colors hover:text-text-primary',
            !collapsed && 'text-text-primary',
          )}
        >
          <span className="type-caption">{t('toolGuide')}</span>
          {collapsed ? (
            <ChevronRight className="h-3 w-3" aria-hidden />
          ) : (
            <ChevronDown className="h-3 w-3" aria-hidden />
          )}
        </button>
      </div>



      {/* Expandable guidance */}
      {!collapsed && (
        <div className="ws-tool-header-guide space-y-1.5 px-3 pb-2.5 sm:px-3.5" data-testid="workspace-tool-header-guide">
          {/* Wave SP2 — how-to collapsed by default so GUIDE never buries the work surface */}
          <details
            className="ws-tool-howto rounded-md border-0 bg-transparent px-0"
            data-testid="workspace-tool-header-howto"
          >
            <summary className="select-none type-caption text-text-secondary">
              {t('toolHowToLabel')} · {steps.length}
            </summary>
            <ol className="flex flex-col gap-0.5 pb-2 sm:flex-row sm:gap-2">
              {steps.map((step, i) => (
                <li key={i} className="flex flex-1 items-start gap-1.5 px-0.5 py-0.5">
                  <span className="type-caption font-semibold tabular-nums text-text-muted">
                    {i + 1}.
                  </span>
                  <span className="type-caption leading-snug text-text-secondary">{step}</span>
                </li>
              ))}
            </ol>
          </details>

          {/* OPT-K77 — Why/outcome nested disclosure (less chrome density by default) */}
          <details className="ws-tool-why-outcome rounded-md border-0 bg-transparent px-0">
            <summary className="select-none type-caption text-text-secondary">
              {t('toolWhyLabel').replace(/[:：]\s*$/, '')} · {t('toolYoullGetLabel').replace(/[:：]\s*$/, '')}
            </summary>
            <div className="flex flex-col gap-1 pb-2 sm:flex-row sm:items-stretch">
              {/* OPT-K158 — no repeated Γιατί/Θα πάρεις labels (summary already names both) */}
              <p className="type-caption flex flex-1 items-start rounded-md border-0 ws-info-strip px-2 py-1.5 text-text-secondary">
                {why}
              </p>
              <p className="type-caption flex flex-1 items-start rounded-md border-0 bg-surface-secondary/40 px-2 py-1.5 text-text-secondary">
                {produces}
              </p>
            </div>
          </details>

          {/* Wave SP3 — focus + tool jumps nested so GUIDE stays two thin rows by default */}
          {(hasSource && (concept || sourceName) || relatedTools.length > 0 || showSourceBtn || onAskAgent) && (
            <details
              className="ws-tool-context rounded-md border-0 bg-transparent px-0"
              data-testid="workspace-tool-header-context"
            >
              <summary className="select-none type-caption text-text-secondary">
                {t('toolContextLabel')}
                {concept ? ` · ${concept}` : ''}
              </summary>
              <div className="space-y-1.5 pb-2">
                {hasSource && (concept || sourceName) && (
                  <div
                    className="flex flex-wrap items-center gap-x-2 gap-y-0.5 type-caption text-text-secondary"
                    data-testid="workspace-tool-header-meta"
                  >
                    {concept && (
                      <span className="inline-flex min-w-0 items-center gap-1" data-testid="workspace-tool-header-concept">
                        <span className="truncate">
                          {t('focusColon')}{' '}
                          <span className="font-medium text-text-primary">{concept}</span>
                        </span>
                      </span>
                    )}
                    {concept && sourceName ? <span className="text-text-muted" aria-hidden>·</span> : null}
                    {sourceName && (
                      <span className="inline-flex min-w-0 max-w-[14rem] items-center truncate text-text-muted">
                        {t('sourceColon')}{' '}<span className="truncate">{sourceName}</span>
                      </span>
                    )}
                  </div>
                )}
                <div
                  className="flex flex-wrap items-center gap-1"
                  data-testid="workspace-tool-header-links"
                >
                  <span className="type-caption shrink-0 text-text-muted">{t('connectsTo')}</span>
                  {relatedTools.map((link, i) => (
                    <button
                      key={link.tool}
                      type="button"
                      onClick={() => onJumpTool?.(link.tool)}
                      disabled={!onJumpTool}
                      data-testid={i === 0 ? 'workspace-tool-header-next' : `crosslink-jump-${link.tool}`}
                      className="ws-touch-floor inline-flex min-h-8 items-center rounded-md border-0 bg-surface-secondary/45 px-2 type-caption font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary disabled:opacity-50"
                    >
                      {lang === 'el' ? link.labelEl : link.labelEn}
                    </button>
                  ))}
                  <span className="min-w-[0.25rem] flex-1" />
                  {showSourceBtn && (
                    <button
                      type="button"
                      data-testid="crosslink-open-reader"
                      onClick={onOpenReader}
                      className="ws-touch-floor inline-flex min-h-8 items-center justify-center rounded-md border-0 bg-surface-secondary/45 px-2.5 type-caption text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                      aria-label={t('toolSource')}
                    >
                      {t('toolSource')}
                    </button>
                  )}
                  {onAskAgent && (
                    <button
                      type="button"
                      data-testid="crosslink-ask-agent"
                      onClick={onAskAgent}
                      className="ws-touch-floor inline-flex min-h-8 items-center rounded-md border-0 bg-surface-secondary/45 px-2.5 type-caption font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                    >
                      {t('askAgentShort')}
                    </button>
                  )}
                </div>
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
