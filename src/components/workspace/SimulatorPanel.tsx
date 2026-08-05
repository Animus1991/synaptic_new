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
  courseTitle?: string;
  emptyMessage?: string;
  onUpload?: () => void;
  onEngage?: () => void;
  onSensitivityCue?: (cueId: string) => void;
  onOpenInReader?: (query: string) => void;
  onScenarioSelect?: (scenarioId: SimulatorScenarioId) => void;
  onStartTimedPractice?: (presetId: ExamPracticePresetId) => void;
  onSendToWhiteboard?: (payload: import('../../lib/workspaceScratchpadBridge').ScratchpadExport) => void;
  artifactStale?: boolean;
  onAcknowledgeStale?: () => void;
  scopeKey?: string;
  initialMainTab?: MainTab;
};

/* OPT-K101 — residual markup debt: decorative brand type -> ink */
export function SimulatorPanel({
  session,
  concept,
  lang,
  courseTitle,
  emptyMessage,
  onUpload,
  onEngage,
  onSensitivityCue,
  onOpenInReader,
  onScenarioSelect,
  onStartTimedPractice,
  onSendToWhiteboard,
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
          'rounded-lg px-3 py-1.5 type-caption font-medium',
          mainTab === 'simulator' ? 'bg-surface-secondary text-text-primary border border-border-subtle' : 'text-text-secondary hover:bg-surface-hover',
        )}
      >
        {t('toolSimulator')}
      </button>
      <button
        type="button"
        data-testid="simulator-tab-exam-prep"
        onClick={() => setMainTab('exam-prep')}
        className={cn(
          'rounded-lg px-3 py-1.5 type-caption font-medium',
          mainTab === 'exam-prep' ? 'bg-surface-secondary text-text-primary border border-border-subtle' : 'text-text-secondary hover:bg-surface-hover',
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
          <div className="mt-4 rounded-xl border border-accent-cyan/25 bg-accent-cyan/5 p-3 type-caption text-text-secondary">
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
          <p className="mb-2 type-caption text-text-muted" data-testid="simulator-section-label">
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

        {/* Wave F4 — one meta strip: search + summary · actions (less badge wall) */}
        <div
          className="flex flex-wrap items-center gap-2"
          data-testid="simulator-meta-strip"
        >
          {session.numericCues.length > 0 && (
            <div className="relative min-w-[140px] max-w-xs flex-1">
              <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-text-muted" />
              <input
                type="search"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder={t('panelSearchParameters')}
                className="w-full rounded-lg border border-border-subtle bg-surface-card py-1.5 pl-7 pr-2 type-caption text-text-secondary placeholder:text-text-muted focus:border-border-default focus:outline-none"
                data-testid="simulator-filter"
              />
            </div>
          )}
          <span className="type-caption font-medium text-text-secondary">
            {session.numericCues.length} {t('panelParameters')}
            {session.economicsMode ? ` · ${t('panelEconMode')}` : ''}
          </span>
          <span className="flex-1" />
          {onStartTimedPractice && (
            <button
              type="button"
              data-testid="simulator-start-timed-practice"
              onClick={() => onStartTimedPractice(session.suggestedExamPractice)}
              title={`${t('panelTimedBlock')}: ${examPracticeLabel(session.suggestedExamPractice, lang)}`}
              className="ws-touch-floor inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-accent-amber/35 bg-accent-amber/10 px-2.5 py-1 type-caption font-medium text-text-primary hover:bg-accent-amber/15"
            >
              <Timer className="h-3.5 w-3.5 text-accent-amber" aria-hidden />
              <span className="hidden sm:inline">{t('panelTimedBlock')}</span>
            </button>
          )}
          {onOpenInReader && (
            <button
              type="button"
              onClick={() => onOpenInReader(concept)}
              className="ws-touch-floor inline-flex min-h-9 items-center gap-1 rounded-lg border border-border-subtle px-2.5 py-1.5 type-caption text-text-secondary hover:border-border-default hover:text-text-primary"
              data-testid="simulator-open-reader"
            >
              <BookOpen className="h-3 w-3" />
              <span className="hidden sm:inline">Reader</span>
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
                className="rounded-full border border-accent-cyan/25 bg-accent-cyan/8 px-2 py-0.5 type-caption text-text-primary hover:opacity-90"
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
          courseTitle={courseTitle}
          economicsMode={session.economicsMode}
          insight={session.sandboxInsight}
          numericCues={session.numericCues}
          hasSource={session.hasSource}
          lang={lang}
          onEngage={onEngage}
          onSensitivityCue={onSensitivityCue}
          onScenarioSelect={onScenarioSelect}
          initialScenarioId={session.lastSimulatorScenario}
          onSendToWhiteboard={onSendToWhiteboard}
        />
      </div>
      </div>
    </div>
  );
}
