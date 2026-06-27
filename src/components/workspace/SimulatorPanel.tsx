import { useMemo, useState } from 'react';
import { AlertTriangle, BookOpen, Search, Timer } from '@/lib/lucide-shim';
import type { SimulatorSessionContent } from '../../lib/simulatorSessionModel';
import { filterNumericCues } from '../../lib/simulatorSessionModel';
import { examPracticeLabel } from '../../lib/examPracticePresets';
import type { ExamPracticePresetId, SimulatorScenarioId } from '../../lib/examPracticePresets';
import { auditSimulatorTimerPresetSync } from '../../lib/simulatorTimerPresetSyncQA';
import { WorkspaceEmptyState } from './WorkspaceEmptyState';
import { InteractiveSimulator } from './InteractiveSimulator';
import { ArtifactStaleBanner } from './ArtifactStaleBanner';
import { SimulatorTimerPresetSyncStrip } from './SimulatorTimerPresetSyncStrip';

type Props = {
  session: SimulatorSessionContent;
  concept: string;
  lang: 'en' | 'el';
  emptyMessage?: string;
  onUpload?: () => void;
  onEngage?: () => void;
  onSensitivityCue?: (cueId: string) => void;
  onOpenInReader?: (query: string) => void;
  onScenarioSelect?: (scenarioId: SimulatorScenarioId) => void;
  onStartTimedPractice?: (presetId: ExamPracticePresetId) => void;
  artifactStale?: boolean;
  onAcknowledgeStale?: () => void;
  scopeKey?: string;
};

export function SimulatorPanel({
  session,
  concept,
  lang,
  emptyMessage,
  onUpload,
  onEngage,
  onSensitivityCue,
  onOpenInReader,
  onScenarioSelect,
  onStartTimedPractice,
  artifactStale = false,
  onAcknowledgeStale,
  scopeKey = '',
}: Props) {
  const [filterQuery, setFilterQuery] = useState('');
  const isEl = lang === 'el';

  const syncReport = useMemo(
    () => auditSimulatorTimerPresetSync({
      scopeKey,
      suggestedExamPractice: session.suggestedExamPractice,
      lang,
    }),
    [scopeKey, session.suggestedExamPractice, lang],
  );

  const filterMatches = useMemo(
    () => filterNumericCues(session.numericCues, filterQuery),
    [session.numericCues, filterQuery],
  );

  if (!session.hasSource) {
    return (
      <WorkspaceEmptyState
        message={emptyMessage ?? (isEl ? 'Ανέβασε σημειώσεις για προσομοίωση.' : 'Upload notes to simulate.')}
        hasSource={false}
        onUpload={onUpload}
      />
    );
  }

  if (!session.hasActionableContent) {
    return (
      <div className="p-4" data-testid="simulator-panel-empty">
        <WorkspaceEmptyState
          message={emptyMessage ?? (isEl
            ? 'Δεν βρέθηκαν αριθμητικές παράμετροι — δοκίμασε Reprocess ή ανέβασε πίνακες/δείκτες.'
            : 'No numeric parameters found — try Reprocess or upload tables/indicators.')}
          hasSource
          onUpload={onUpload}
        />
        {session.sandboxInsight && (
          <div className="mt-4 rounded-xl border border-accent-cyan/25 bg-accent-cyan/5 p-3 text-[11px] text-text-secondary">
            {session.sandboxInsight}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden" data-testid="simulator-panel">
      <div className="shrink-0 border-b border-border-subtle px-4 py-3">
        {session.sectionLabel && (
          <p className="mb-2 text-[10px] text-text-muted" data-testid="simulator-section-label">
            {isEl ? 'Ενότητα:' : 'Section:'}{' '}
            <span className="text-text-secondary">{session.sectionLabel}</span>
          </p>
        )}

        {artifactStale && onAcknowledgeStale && (
          <ArtifactStaleBanner lang={lang} tool="simulator" onDismiss={onAcknowledgeStale} />
        )}

        {(session.weakExtraction || session.passageGrounded) && (
          <div
            className="mb-3 flex items-start gap-2 rounded-xl border border-accent-amber/30 bg-accent-amber/8 px-3 py-2 text-[10px] text-accent-amber"
            data-testid="simulator-weak-extraction"
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <p>
              {session.passageGrounded
                ? (isEl
                  ? 'Οι παράμετροι προέρχονται από το απόσπασμα (generic concept) — Reprocess για πιο πλούσια δομή.'
                  : 'Parameters are passage-grounded (generic concept) — Reprocess for richer structure.')
                : (isEl
                  ? 'Αδύναμη εξαγωγή — λίγοι αριθμοί στο υλικό. Δοκίμασε Reprocess.'
                  : 'Weak extraction — sparse numerics in material. Try Reprocess.')}
            </p>
          </div>
        )}

        <SimulatorTimerPresetSyncStrip report={syncReport} lang={lang} />

        <div className="flex flex-wrap items-center gap-2">
          {session.numericCues.length > 0 && (
            <div className="relative flex-1 min-w-[140px] max-w-xs">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted" />
              <input
                type="search"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder={isEl ? 'Αναζήτηση παραμέτρων…' : 'Search parameters…'}
                className="w-full rounded-lg border border-border-subtle bg-surface-card py-1.5 pl-7 pr-2 text-[11px] text-text-secondary placeholder:text-text-muted focus:border-accent-cyan/40 focus:outline-none"
                data-testid="simulator-filter"
              />
            </div>
          )}
          <span className="text-[10px] text-text-muted">
            {session.numericCues.length} {isEl ? 'παράμετροι' : 'parameters'}
            {session.economicsMode && (
              <> · {isEl ? 'οικονομική λειτουργία' : 'econ mode'}</>
            )}
          </span>
          {onStartTimedPractice && (
            <button
              type="button"
              data-testid="simulator-start-timed-practice"
              onClick={() => onStartTimedPractice(session.suggestedExamPractice)}
              className="inline-flex items-center gap-1 rounded-lg border border-accent-amber/30 bg-accent-amber/10 px-2 py-1 text-[10px] font-medium text-accent-amber hover:bg-accent-amber/15"
            >
              <Timer className="w-3 h-3" />
              {isEl ? 'Χρονομέτρηση' : 'Timed block'} · {examPracticeLabel(session.suggestedExamPractice, lang)}
            </button>
          )}
          {onOpenInReader && (
            <button
              type="button"
              onClick={() => onOpenInReader(concept)}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[10px] text-text-secondary hover:border-accent-cyan/35 hover:text-accent-cyan"
              data-testid="simulator-open-reader"
            >
              <BookOpen className="w-3 h-3" />
              Reader
            </button>
          )}
        </div>

        {filterQuery.trim() && filterMatches.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5" data-testid="simulator-filter-matches">
            {filterMatches.slice(0, 6).map((cue) => (
              <button
                key={cue.id}
                type="button"
                onClick={() => onOpenInReader?.(cue.context.slice(0, 80) || cue.label)}
                className="rounded-full border border-accent-cyan/25 bg-accent-cyan/8 px-2 py-0.5 text-[9px] text-accent-cyan hover:bg-accent-cyan/15"
              >
                {cue.label.slice(0, 48)}{cue.label.length > 48 ? '…' : ''}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <InteractiveSimulator
          concept={concept}
          economicsMode={session.economicsMode}
          insight={session.sandboxInsight}
          numericCues={session.numericCues}
          hasSource={session.hasSource}
          lang={lang}
          onEngage={onEngage}
          onSensitivityCue={onSensitivityCue}
          onScenarioSelect={onScenarioSelect}
          initialScenarioId={session.lastSimulatorScenario}
        />
      </div>
    </div>
  );
}
