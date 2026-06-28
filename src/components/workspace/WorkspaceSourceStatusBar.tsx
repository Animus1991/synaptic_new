import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Cpu, FileSearch, RefreshCw } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import { CONTENT_PIPELINE_VERSION } from '../../lib/pipelineConstants';
import { reuploadMigrationMessage } from '../../lib/pipelineMigration';
import { lowSourceQualityMessage } from '../../lib/sourceQualityPrompt';
import { hygieneFlagLabel } from '../../lib/textQualityMetrics';

type Props = {
  lang: 'en' | 'el';
  score: number | null;
  sectionCount?: number;
  showMigration: boolean;
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

/** Consolidated source-quality + pipeline strip with hygiene diagnostics (v2). */
export function WorkspaceSourceStatusBar({
  lang,
  score,
  sectionCount,
  showMigration,
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
  const isEl = lang === 'el';
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (!showMigration && !showQualityWarning) return null;

  const message = showMigration
    ? reuploadMigrationMessage(lang)
    : (score != null ? lowSourceQualityMessage(lang, score) : '');

  const pipelineBadge = showMigration
    ? (storedPipelineVersion
      ? `Pipeline v${storedPipelineVersion} → v${CONTENT_PIPELINE_VERSION}`
      : `Pipeline v${CONTENT_PIPELINE_VERSION}`)
    : undefined;

  const showHygiene = typeof textHygieneScore === 'number' || typeof textCorruptionScore === 'number';
  const spellGateHint = textHygieneFlags.includes('unknown-tokens')
    || textHygieneFlags.includes('spaced-glyphs')
    || textHygieneFlags.includes('glued-words');

  const collapsedHint = isEl ? 'Κλικ για λεπτομέρειες και ενέργειες' : 'Click for details and actions';

  return (
    <div
      className={cn(
        'ws-source-alert mb-4 max-w-2xl mx-auto rounded-md border border-y border-r border-border-subtle',
        expanded ? 'ws-source-alert--expanded' : 'ws-source-alert--collapsed',
        className,
      )}
      data-testid="workspace-source-status-bar"
      role="alert"
    >
      <button
        type="button"
        className="ws-source-alert-header"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        title={!expanded ? collapsedHint : undefined}
        data-testid="source-status-toggle"
      >
        <AlertTriangle className="h-4 w-4 shrink-0 text-accent-amber" aria-hidden />
        <span className="ws-source-alert-header-text min-w-0 flex-1 text-left">
          <span className="block text-[11px] font-medium text-text-primary" data-testid="source-status-score">
            {isEl ? 'Ποιότητα πηγής' : 'Source quality'}
            {typeof score === 'number' && (
              <>
                {' '}
                <span className="ws-num">{score}/100</span>
                {typeof sectionCount === 'number' && (
                  <span className="font-normal text-text-muted">
                    {' '}
                    · <span className="ws-num">{sectionCount}</span> {isEl ? 'ενότητες' : 'sections'}
                  </span>
                )}
              </>
            )}
          </span>
          {!expanded && (
            <span className="mt-0.5 block truncate text-[10px] text-text-muted">
              {showMigration
                ? (isEl ? 'Απαιτείται επανεπεξεργασία pipeline' : 'Pipeline reprocess recommended')
                : (isEl ? 'Χαμηλή ποιότητα αναγνώρισης' : 'Low recognition quality')}
            </span>
          )}
        </span>
        <span className="ws-source-alert-chevron shrink-0" aria-hidden>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      <div className={cn('ws-source-alert-body', expanded && 'ws-source-alert-body--open')}>
        <div className="ws-source-alert-body-inner">
          <div className="flex flex-wrap items-center gap-2 px-3.5 pt-2 pb-0 ws-eyebrow text-text-muted">
            {pipelineBadge && (
              <span
                className="ws-chip-warn rounded-sm px-1.5 py-0.5 font-mono normal-case tracking-normal text-[10px]"
                data-testid="source-status-pipeline-badge"
              >
                {pipelineBadge}
              </span>
            )}
            {showHygiene && (
              <span
                className="ws-chip-neutral rounded-sm px-1.5 py-0.5 font-mono normal-case tracking-normal text-[10px]"
                data-testid="source-status-hygiene"
              >
                {isEl ? 'Υγιεινότητα' : 'Hygiene'}{' '}
                <span className="ws-num text-text-primary">{textHygieneScore ?? '—'}</span>
                {typeof textCorruptionScore === 'number' && (
                  <span className="ml-1 text-text-muted">
                    · {isEl ? 'διαφθορά' : 'corruption'}{' '}
                    <span className="ws-num">{textCorruptionScore}</span>
                  </span>
                )}
              </span>
            )}
            {spellGateHint && (
              <span
                className="ws-chip-brand rounded-sm px-1.5 py-0.5 font-mono normal-case tracking-normal text-[10px]"
                data-testid="source-status-spell-gate"
                title={isEl ? 'Spell-gate (SymSpell + λεξικό)' : 'Spell-gate (SymSpell + lexicon)'}
              >
                spell-gate
              </span>
            )}
          </div>

          {textHygieneFlags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1 px-3.5" data-testid="source-status-hygiene-flags">
              {textHygieneFlags.map((flag) => (
                <span
                  key={flag}
                  className="ws-chip-warn rounded-sm px-1.5 py-0.5 text-[10px]"
                >
                  {hygieneFlagLabel(flag, lang)}
                </span>
              ))}
            </div>
          )}

          <p className="mt-2 px-3.5 text-[11px] leading-relaxed text-text-secondary">{message}</p>

          <div className="mt-2.5 flex flex-wrap gap-1.5 px-3.5 pb-3">
            {onInspect && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onInspect(); }}
                className="ws-source-action-btn"
                data-testid="source-status-inspect"
              >
                <FileSearch className="h-3 w-3" aria-hidden />
                {isEl ? 'Προεπισκόπηση' : 'Preview'}
              </button>
            )}
            {onReprocess && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onReprocess(); }}
                disabled={reprocessing}
                className="ws-source-action-btn ws-source-action-btn-primary"
                data-testid="source-status-reprocess"
              >
                <Cpu className={cn('h-3 w-3', reprocessing && 'animate-pulse')} aria-hidden />
                {reprocessing
                  ? (isEl ? 'Επεξεργασία…' : 'Processing…')
                  : (isEl ? 'Επανεπεξεργασία' : 'Reprocess')}
              </button>
            )}
            {onReupload && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onReupload(); }}
                className="ws-source-action-btn ws-source-action-btn-warn"
                data-testid="source-status-reupload"
              >
                <RefreshCw className="h-3 w-3" aria-hidden />
                {isEl ? 'Ανέβασμα ξανά' : 'Re-upload'}
              </button>
            )}
            {onContinue && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onContinue(); }}
                className="ws-source-action-btn ws-source-action-btn-ghost"
                data-testid="source-status-continue"
              >
                {isEl ? 'Συνέχεια' : 'Continue'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
