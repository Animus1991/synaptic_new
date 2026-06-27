import { AlertTriangle, Cpu, FileSearch, RefreshCw } from '@/lib/lucide-shim';
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
  /** Stored pipeline version on the course/file (may be stale). */
  storedPipelineVersion?: string;
  /** Wave 8B-β hygiene metrics from courseSourceQuality or live analyzeTextHygiene. */
  textHygieneScore?: number;
  textCorruptionScore?: number;
  textHygieneFlags?: string[];
  onInspect?: () => void;
  onReprocess?: () => void;
  onReupload?: () => void;
  onContinue?: () => void;
  className?: string;
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
}: Props) {
  const isEl = lang === 'el';
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

  return (
    <div
      className={cn(
        'ws-source-alert mb-4 max-w-2xl mx-auto rounded-md border border-y border-r border-border-subtle px-3.5 py-2.5',
        className,
      )}
      data-testid="workspace-source-status-bar"
      role="alert"
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-accent-amber" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 ws-eyebrow text-text-muted">
            {typeof score === 'number' && (
              <span className="text-text-primary" data-testid="source-status-score">
                {isEl ? 'Ποιότητα πηγής' : 'Source quality'}{' '}
                <span className="ws-num">{score}/100</span>
                {typeof sectionCount === 'number' && (
                  <span className="ml-1 text-text-muted">
                    · <span className="ws-num">{sectionCount}</span> {isEl ? 'ενότητες' : 'sections'}
                  </span>
                )}
              </span>
            )}
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
            <div className="mt-1.5 flex flex-wrap gap-1" data-testid="source-status-hygiene-flags">
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
          <p className="mt-1.5 text-[11px] leading-relaxed text-text-secondary">{message}</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {onInspect && (
              <button
                type="button"
                onClick={onInspect}
                className="ws-eyebrow inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-surface-card/60 px-2 py-1 text-text-secondary hover:text-text-primary hover:border-brand-400/40 transition-colors"
                data-testid="source-status-inspect"
              >
                <FileSearch className="h-3 w-3" aria-hidden />
                {isEl ? 'Προεπισκόπηση' : 'Preview'}
              </button>
            )}
            {onReprocess && (
              <button
                type="button"
                onClick={onReprocess}
                disabled={reprocessing}
                className="ws-eyebrow inline-flex items-center gap-1.5 rounded-md ws-chip-brand px-2 py-1 transition-colors hover:opacity-90 disabled:opacity-60"
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
                onClick={onReupload}
                className="ws-eyebrow inline-flex items-center gap-1.5 rounded-md ws-chip-warn px-2 py-1 transition-colors hover:opacity-90"
                data-testid="source-status-reupload"
              >
                <RefreshCw className="h-3 w-3" aria-hidden />
                {isEl ? 'Ανέβασμα ξανά' : 'Re-upload'}
              </button>
            )}
            {onContinue && (
              <button
                type="button"
                onClick={onContinue}
                className="ws-eyebrow rounded-md border border-transparent px-2 py-1 text-text-muted hover:text-text-secondary hover:border-border-subtle transition-colors"
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
