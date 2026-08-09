import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Cpu, FileSearch, RefreshCw } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import { CONTENT_PIPELINE_VERSION } from '../../lib/pipelineConstants';
import { reuploadMigrationMessage } from '../../lib/pipelineMigration';
import { pre24GreekReprocessMessage } from '../../lib/pre24GreekReprocess';
import { lowSourceQualityMessage } from '../../lib/sourceQualityPrompt';
import { hygieneFlagLabel } from '../../lib/textQualityMetrics';
import { useI18n } from '../../lib/i18n';

type Props = {
  lang: 'en' | 'el';
  score: number | null;
  sectionCount?: number;
  showMigration: boolean;
  /** TOOL-RD-03 — pre-v2.4 column/Greek corruption path */
  showPre24Greek?: boolean;
  showQualityWarning: boolean;
  reprocessing?: boolean;
  storedPipelineVersion?: string;
  textHygieneScore?: number;
  textCorruptionScore?: number;
  textHygieneFlags?: string[];
  onInspect?: () => void;
  onReprocess?: () => void;
  onReupload?: () => void;
  onContinue?: () => void;
  className?: string;
  defaultExpanded?: boolean;
};

/**
 * OPT-K119 — Source quality panel (course + workspace).
 * Layout is self-contained (Tailwind) so it stays organized outside warm workspace CSS.
 * Wash surface only — no outline cage; actions are clear horizontal wash CTAs.
 */
export function WorkspaceSourceStatusBar({
  lang,
  score,
  sectionCount,
  showMigration,
  showPre24Greek = false,
  showQualityWarning,
  reprocessing = false,
  storedPipelineVersion,
  textHygieneScore,
  textCorruptionScore,
  textHygieneFlags = [],
  onInspect,
  onReprocess,
  onReupload,
  onContinue,
  className,
  defaultExpanded = true,
}: Props) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (!showMigration && !showQualityWarning && !showPre24Greek) return null;

  const message = showPre24Greek
    ? pre24GreekReprocessMessage(lang)
    : showMigration
    ? reuploadMigrationMessage(lang)
    : (score != null ? lowSourceQualityMessage(lang, score) : '');

  const pipelineBadge = (showMigration || showPre24Greek)
    ? (storedPipelineVersion
      ? `Pipeline v${storedPipelineVersion} → v${CONTENT_PIPELINE_VERSION}`
      : `Pipeline v${CONTENT_PIPELINE_VERSION}`)
    : undefined;

  const showHygiene = typeof textHygieneScore === 'number' || typeof textCorruptionScore === 'number';
  const spellGateHint = textHygieneFlags.includes('unknown-tokens')
    || textHygieneFlags.includes('spaced-glyphs')
    || textHygieneFlags.includes('glued-words');

  return (
    <div
      className={cn(
        'ws-source-alert w-full max-w-none rounded-xl border-0',
        'bg-surface-secondary/55',
        expanded ? 'ws-source-alert--expanded' : 'ws-source-alert--collapsed',
        className,
      )}
      data-testid="workspace-source-status-bar"
      data-layout="k119"
      role="alert"
    >
      <button
        type="button"
        className={cn(
          'ws-source-alert-header flex w-full items-center gap-2.5 border-0 bg-transparent',
          'px-3 py-2.5 text-left transition-colors hover:bg-surface-hover/50',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/45',
        )}
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        title={!expanded ? t('sourceStatusCollapsedHint') : undefined}
        data-testid="source-status-toggle"
      >
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-primary/70 text-text-secondary"
          aria-hidden
        >
          <AlertTriangle className="h-4 w-4" />
        </span>
        <span className="ws-source-alert-header-text min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span
              className="type-meta font-semibold text-text-primary"
              data-testid="source-status-score"
            >
              {t('sourceQualityLabel')}
              {typeof score === 'number' && (
                <span className="ml-1.5 tabular-nums text-text-secondary font-medium">
                  {score}/100
                </span>
              )}
            </span>
            {pipelineBadge && !expanded && (
              <span className="type-micro font-medium text-text-tertiary tabular-nums">
                {pipelineBadge}
              </span>
            )}
            {typeof sectionCount === 'number' && (
              <span className="type-micro text-text-muted tabular-nums">
                · {sectionCount} {t('sourceSectionsWord')}
              </span>
            )}
          </span>
          {!expanded && (
            <span className="mt-0.5 block truncate type-caption text-text-muted">
              {showMigration || showPre24Greek
                ? t('sourcePipelineReprocessRecommended')
                : t('sourceLowRecognitionQuality')}
            </span>
          )}
        </span>
        <span
          className="ws-source-alert-chevron grid h-7 w-7 shrink-0 place-items-center rounded-md text-text-muted"
          aria-hidden
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {expanded && (
        <div
          className="ws-source-alert-body ws-source-alert-body--open border-0"
          data-testid="source-status-body"
        >
          <div className="ws-source-alert-body-inner space-y-3 px-3 pb-3 pt-0 sm:px-3.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {pipelineBadge && (
                <span
                  className="rounded-md bg-surface-primary/80 px-2 py-0.5 font-mono type-micro text-text-secondary"
                  data-testid="source-status-pipeline-badge"
                >
                  {pipelineBadge}
                </span>
              )}
              {showHygiene && (
                <span
                  className="rounded-md bg-surface-primary/80 px-2 py-0.5 font-mono type-micro text-text-secondary"
                  data-testid="source-status-hygiene"
                >
                  {t('sourceHygiene')}{' '}
                  <span className="tabular-nums text-text-primary">{textHygieneScore ?? '—'}</span>
                  {typeof textCorruptionScore === 'number' && (
                    <span className="ml-1 text-text-muted">
                      · {t('sourceCorruption')}{' '}
                      <span className="tabular-nums">{textCorruptionScore}</span>
                    </span>
                  )}
                </span>
              )}
              {spellGateHint && (
                <span
                  className="rounded-md bg-surface-primary/80 px-2 py-0.5 font-mono type-micro text-text-secondary"
                  data-testid="source-status-spell-gate"
                  title={t('sourceSpellGateTitle')}
                >
                  spell-gate
                </span>
              )}
            </div>

            {textHygieneFlags.length > 0 && (
              <div className="flex flex-wrap gap-1" data-testid="source-status-hygiene-flags">
                {textHygieneFlags.map((flag) => (
                  <span
                    key={flag}
                    className="rounded-md bg-surface-primary/70 px-1.5 py-0.5 type-micro text-text-secondary"
                  >
                    {hygieneFlagLabel(flag, lang)}
                  </span>
                ))}
              </div>
            )}

            <p className="max-w-3xl type-caption leading-relaxed text-text-secondary">
              {message}
            </p>

            {(showMigration || showPre24Greek) && (
              <div
                className="max-w-3xl space-y-1.5 type-caption text-text-secondary"
                data-testid="source-status-migration-affected"
              >
                <p className="font-semibold text-text-primary">
                  {t('sourceMigrationAffectedTitle')}
                </p>
                <ul className="space-y-1 text-text-secondary">
                  <li className="flex gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--color-text-muted)]" aria-hidden />
                    <span>{t('sourceMigrationAffectedOcr')}</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--color-text-muted)]" aria-hidden />
                    <span>{t('sourceMigrationAffectedTables')}</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--color-text-muted)]" aria-hidden />
                    <span>{t('sourceMigrationAffectedGreek')}</span>
                  </li>
                  {showPre24Greek && (
                    <li className="flex gap-2" data-testid="source-status-pre24-greek">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--color-text-muted)]" aria-hidden />
                      <span>{t('sourceMigrationAffectedPre24')}</span>
                    </li>
                  )}
                </ul>
                <p className="text-text-muted">{t('sourceMigrationNonBlocking')}</p>
              </div>
            )}

            <div
              className="flex flex-wrap items-center gap-2 pt-0.5"
              data-testid="source-status-actions"
            >
              {onInspect && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onInspect(); }}
                  className="ws-source-action-btn inline-flex min-h-9 items-center gap-1.5 rounded-lg border-0 bg-surface-primary/80 px-3 py-1.5 type-caption font-semibold text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
                  data-testid="source-status-inspect"
                >
                  <FileSearch className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {t('preview')}
                </button>
              )}
              {onReprocess && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onReprocess(); }}
                  disabled={reprocessing}
                  className="ws-source-action-btn ws-source-action-btn-primary inline-flex min-h-9 items-center gap-1.5 rounded-lg border-0 bg-surface-primary px-3 py-1.5 type-caption font-semibold text-text-primary transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
                  data-testid="source-status-reprocess"
                >
                  <Cpu className={cn('h-3.5 w-3.5 shrink-0', reprocessing && 'animate-pulse')} aria-hidden />
                  {reprocessing ? t('sourceReprocessing') : t('sourceReprocess')}
                </button>
              )}
              {onReupload && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onReupload(); }}
                  className="ws-source-action-btn ws-source-action-btn-warn inline-flex min-h-9 items-center gap-1.5 rounded-lg border-0 bg-surface-primary/80 px-3 py-1.5 type-caption font-semibold text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
                  data-testid="source-status-reupload"
                >
                  <RefreshCw className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {t('sourceReupload')}
                </button>
              )}
              {onContinue && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onContinue(); }}
                  className="ws-source-action-btn ws-source-action-btn-ghost inline-flex min-h-9 items-center gap-1.5 rounded-lg border-0 bg-transparent px-3 py-1.5 type-caption font-semibold text-text-muted transition-colors hover:bg-surface-hover/60 hover:text-text-secondary"
                  data-testid="source-status-continue"
                >
                  {t('continue')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
