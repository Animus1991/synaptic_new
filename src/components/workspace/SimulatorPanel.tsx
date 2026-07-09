import { useMemo, useState, useEffect } from 'react';
import { BookOpen, Search, Timer } from '@/lib/lucide-shim';
import type { SimulatorSessionContent } from '../../lib/simulatorSessionModel';
import { filterNumericCues } from '../../lib/simulatorSessionModel';
import { examPracticeLabel } from '../../lib/examPracticePresets';
import type { ExamPracticePresetId, SimulatorScenarioId } from '../../lib/examPracticePresets';
import { auditSimulatorTimerPresetSync } from '../../lib/simulatorTimerPresetSyncQA';
import { WorkspaceToolEmptyState } from './WorkspaceToolEmptyState';
import { InteractiveSimulator } from './InteractiveSimulator';
import { ArtifactStaleBanner } from './ArtifactStaleBanner';
import { WorkspacePanelWarnStrip } from './WorkspacePanelWarnStrip';
import { SimulatorTimerPresetSyncStrip } from './SimulatorTimerPresetSyncStrip';
import { useI18n } from '../../lib/i18n';
import { ExamPrepPanel } from './ExamPrepPanel';
import { cn } from '../../utils/cn';

type MainTab = 'simulator' | 'exam-prep';

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
  initialMainTab?: MainTab;
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
  initialMainTab,
}: Props) {
  const [filterQuery, setFilterQuery] = useState('');
  const [mainTab, setMainTab] = useState<MainTab>(initialMainTab ?? 'simulator');
  const { t } = useI18n();

  useEffect(() => {
    if (initialMainTab) setMainTab(initialMainTab);
  }, [initialMainTab]);

  const tabBar = (
    <div className="shrink-0 flex gap-1 border-b border-border-subtle px-4 py-2" data-testid="simulator-main-tabs">
      <button
        type="button"
        data-testid="simulator-tab-simulator"
        onClick={() => setMainTab('simulator')}
        className={cn(
          'rounded-lg px-3 py-1.5 text-[11px] font-medium',
          mainTab === 'simulator' ? 'bg-brand-600/15 text-brand-800' : 'text-text-secondary hover:bg-surface-hover',
        )}
      >
        {t('toolSimulator')}
      </button>
      <button
        type="button"
        data-testid="simulator-tab-exam-prep"
        onClick={() => setMainTab('exam-prep')}
        className={cn(
          'rounded-lg px-3 py-1.5 text-[11px] font-medium',
          mainTab === 'exam-prep' ? 'bg-brand-600/15 text-brand-800' : 'text-text-secondary hover:bg-surface-hover',
        )}
      >
        {t('examPrepPanelTitle')}
      </button>
    </div>
  );

  if (mainTab === 'exam-prep') {
    return (
      <div className="flex h-full flex-col overflow-hidden" data-testid="simulator-panel">
        {tabBar}
        <ExamPrepPanel />
      </div>
    );
  }

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
      <div className="flex h-full flex-col overflow-hidden" data-testid="simulator-panel">
        {tabBar}
        <WorkspaceToolEmptyState
          tool="simulator"
          concept={concept}
          message={emptyMessage}
          hasSource={false}
          onUpload={onUpload}
        />
      </div>
    );
  }

  if (!session.hasActionableContent) {
    return (
      <div className="flex h-full flex-col overflow-hidden" data-testid="simulator-panel">
        {tabBar}
        <div className="p-4 flex-1 overflow-y-auto" data-testid="simulator-panel-empty">
        <WorkspaceToolEmptyState
          tool="simulator"
          concept={concept}
          message={emptyMessage}
          hasSource
        />
        {session.sandboxInsight && (
          <div className="mt-4 rounded-xl border border-accent-cyan/25 bg-accent-cyan/5 p-3 text-[11px] text-text-secondary">
            {session.sandboxInsight}
          </div>
        )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden" data-testid="simulator-panel">
      {tabBar}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <div className="shrink-0 border-b border-border-subtle px-4 py-3">
        {session.sectionLabel && (
          <p className="mb-2 text-[10px] text-text-muted" data-testid="simulator-section-label">
            {t('wsSectionColon')}{' '}
            <span className="text-text-secondary">{session.sectionLabel}</span>
          </p>
        )}

        {artifactStale && onAcknowledgeStale && (
          <ArtifactStaleBanner lang={lang} tool="simulator" onDismiss={onAcknowledgeStale} />
        )}

        {(session.weakExtraction || session.passageGrounded) && (
          <WorkspacePanelWarnStrip testId="simulator-weak-extraction">
            {session.passageGrounded
              ? t('panelPassageGroundedSimulator')
              : t('panelWeakExtractionSimulator')}
          </WorkspacePanelWarnStrip>
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
                placeholder={t('panelSearchParameters')}
                className="w-full rounded-lg border border-border-subtle bg-surface-card py-1.5 pl-7 pr-2 text-[11px] text-text-secondary placeholder:text-text-muted focus:border-accent-cyan/40 focus:outline-none"
                data-testid="simulator-filter"
              />
            </div>
          )}
          <span className="text-[10px] text-text-muted">
            {session.numericCues.length} {t('panelParameters')}
            {session.economicsMode && (
              <> · {t('panelEconMode')}</>
            )}
          </span>
          {onStartTimedPractice && (
            <button
              type="button"
              data-testid="simulator-start-timed-practice"
              onClick={() => onStartTimedPractice(session.suggestedExamPractice)}
              className="ws-eyebrow ws-chip-warn inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium hover:opacity-90"
            >
              <Timer className="w-3 h-3" />
              {t('panelTimedBlock')} · {examPracticeLabel(session.suggestedExamPractice, lang)}
            </button>
          )}
          {onOpenInReader && (
            <button
              type="button"
              onClick={() => onOpenInReader(concept)}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[10px] text-text-secondary hover:border-brand-600/35 hover:text-brand-800"
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
                className="rounded-full border border-accent-cyan/25 bg-accent-cyan/8 px-2 py-0.5 text-[9px] text-brand-800 hover:opacity-90"
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
    </div>
  );
}
