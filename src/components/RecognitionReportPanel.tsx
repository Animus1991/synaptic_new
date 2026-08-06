import type { DocumentModelSnapshot, RecognitionSummary } from '../lib/documentModelSnapshot';
import { recognitionSummaryFromSnapshot } from '../lib/documentModelSnapshot';
import { t, type Lang } from '../lib/i18n';
import { cn } from '../utils/cn';
import { AllCapsLabel } from './ui/AllCapsLabel';

type RecognitionReportPanelProps = {
  snapshot?: DocumentModelSnapshot;
  summary?: RecognitionSummary;
  compact?: boolean;
  language?: Lang;
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
      <p className="type-micro uppercase tracking-wide text-text-muted"><AllCapsLabel>{label}</AllCapsLabel></p>
      <p className="type-meta font-semibold text-text-primary tabular-nums">{value}</p>
    </div>
  );
}

/* OPT-K101 — residual markup debt: decorative brand type -> ink */
export function RecognitionReportPanel({
  snapshot,
  summary: summaryProp,
  compact = false,
  language = 'en',
}: RecognitionReportPanelProps) {
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
          <p className="type-caption font-semibold text-text-secondary">
            {t('recognitionReportTitle', language)}
          </p>
          <p className="type-caption text-text-muted mt-0.5">
            {summary.subject}
            {summary.hasEmbeddingClusters && (
              <span className="ml-2 text-accent-emerald">
                · {t('recognitionReportOfflineClusters', language)}
              </span>
            )}
          </p>
        </div>
        <span className="type-micro text-text-muted shrink-0">
          {new Date(summary.createdAt).toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US')}
        </span>
      </div>

      <div className={cn('grid gap-2', compact ? 'grid-cols-3' : 'grid-cols-4 sm:grid-cols-6')}>
        <Metric label={t('recognitionMetricSections', language)} value={summary.sectionCount} />
        <Metric label={t('recognitionMetricConcepts', language)} value={summary.conceptCount} />
        <Metric label={t('recognitionMetricDefinitions', language)} value={summary.definitionCount} />
        <Metric label={t('recognitionMetricFormulas', language)} value={summary.formulaCount} />
        <Metric label={t('recognitionMetricRelations', language)} value={summary.relationCount} />
        <Metric label={t('recognitionMetricBlocks', language)} value={summary.blockCount} />
      </div>

      {topConcepts.length > 0 && (
        <div>
          <p className="type-micro uppercase tracking-wide text-text-muted mb-1.5">
            <AllCapsLabel>{t('recognitionKeyConcepts', language)}</AllCapsLabel>
          </p>
          <div className="flex flex-wrap gap-1">
            {topConcepts.map((c) => (
              <span
                key={c}
                className="platform-meta-chip px-2 py-0.5 rounded type-caption truncate max-w-[140px]"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {relationTypes.length > 0 && !compact && (
        <p className="type-caption text-text-muted">
          {t('recognitionRelationTypes', language)}{' '}
          {relationTypes.join(', ')}
        </p>
      )}
    </div>
  );
}
