import type { DocumentModelSnapshot, RecognitionSummary } from '../lib/documentModelSnapshot';
import { recognitionSummaryFromSnapshot } from '../lib/documentModelSnapshot';
import { cn } from '../utils/cn';

type RecognitionReportPanelProps = {
  snapshot?: DocumentModelSnapshot;
  summary?: RecognitionSummary;
  compact?: boolean;
  language?: 'en' | 'el';
};

function Metric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-hover/50 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-text-muted">{label}</p>
      <p className="text-sm font-semibold text-text-primary tabular-nums">{value}</p>
    </div>
  );
}

export function RecognitionReportPanel({
  snapshot,
  summary: summaryProp,
  compact = false,
  language = 'en',
}: RecognitionReportPanelProps) {
  const el = language === 'el';
  const summary = summaryProp ?? (snapshot ? recognitionSummaryFromSnapshot(snapshot) : undefined);
  if (!summary) return null;

  const topConcepts = snapshot?.entities
    .filter((e) => e.type === 'concept')
    .slice(0, compact ? 4 : 8)
    .map((e) => e.label) ?? [];

  const relationTypes = snapshot
    ? [...new Set(snapshot.relations.map((r) => r.type))]
    : [];

  return (
    <div
      className={cn(
        'rounded-xl border border-brand-500/20 bg-brand-500/5',
        compact ? 'p-3 space-y-3' : 'p-4 space-y-4',
      )}
      data-testid="recognition-report-panel"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-brand-300">
            {el ? 'Αναφορά αναγνώρισης' : 'Recognition report'}
          </p>
          <p className="text-[11px] text-text-muted mt-0.5">
            {summary.subject}
            {summary.hasEmbeddingClusters && (
              <span className="ml-2 text-accent-emerald">
                · {el ? 'offline clusters' : 'offline clusters'}
              </span>
            )}
          </p>
        </div>
        <span className="text-[10px] text-text-muted shrink-0">
          {new Date(summary.createdAt).toLocaleDateString(el ? 'el-GR' : 'en-US')}
        </span>
      </div>

      <div className={cn('grid gap-2', compact ? 'grid-cols-3' : 'grid-cols-4 sm:grid-cols-6')}>
        <Metric label={el ? 'Ενότητες' : 'Sections'} value={summary.sectionCount} />
        <Metric label={el ? 'Έννοιες' : 'Concepts'} value={summary.conceptCount} />
        <Metric label={el ? 'Ορισμοί' : 'Definitions'} value={summary.definitionCount} />
        <Metric label={el ? 'Τύποι' : 'Formulas'} value={summary.formulaCount} />
        <Metric label={el ? 'Σχέσεις' : 'Relations'} value={summary.relationCount} />
        <Metric label={el ? 'Blocks' : 'Blocks'} value={summary.blockCount} />
      </div>

      {topConcepts.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-text-muted mb-1.5">
            {el ? 'Κύριες έννοιες' : 'Key concepts'}
          </p>
          <div className="flex flex-wrap gap-1">
            {topConcepts.map((c) => (
              <span
                key={c}
                className="platform-meta-chip px-2 py-0.5 rounded text-[11px] truncate max-w-[140px]"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {relationTypes.length > 0 && !compact && (
        <p className="text-[11px] text-text-muted">
          {el ? 'Τύποι σχέσεων: ' : 'Relation types: '}
          {relationTypes.join(', ')}
        </p>
      )}
    </div>
  );
}
