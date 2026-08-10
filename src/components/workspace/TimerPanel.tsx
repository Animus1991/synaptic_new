import { useMemo, useState } from 'react';
import type { TimerSessionContent } from '../../lib/timerSessionModel';
import { filterTimerSessionLogs } from '../../lib/timerSessionModel';
import { examPracticeLabel } from '../../lib/examPracticePresets';
import type { ExamPracticePresetId } from '../../lib/examPracticePresets';
import { auditTimerExamCountdownDashboard } from '../../lib/timerExamCountdownDashboardQA';
import { auditSimulatorTimerPresetSync } from '../../lib/simulatorTimerPresetSyncQA';
import { loadTimerSessions } from '../../lib/workspacePersistence';
import { WorkspaceToolEmptyState } from './WorkspaceToolEmptyState';
import { StudyTimer } from './StudyTimer';
import { TimerExamCountdownDashboardStrip } from './TimerExamCountdownDashboardStrip';
import { SimulatorTimerPresetSyncStrip } from './SimulatorTimerPresetSyncStrip';
import { WorkspacePanelWarnStrip } from './WorkspacePanelWarnStrip';
import { CollapsibleChromeSection } from './CollapsibleChromeSection';
import { useI18n } from '../../lib/i18n';

type Props = {
  session: TimerSessionContent;
  concept: string;
  lang: 'en' | 'el';
  scopeKey: string;
  stepLabel?: string;
  stepIndex?: number;
  conceptMastery?: number;
  emptyMessage?: string;
  onUpload?: () => void;
  onSessionComplete?: (minutes: number, label: string) => void;
  onOpenBreakTool?: () => void;
  onOpenInReader?: (query: string) => void;
  onOpenSimulator?: () => void;
  activeExamPractice?: ExamPracticePresetId | null;
  settingsExamDate?: string | null;
  courseExamDate?: string | null;
};

const PRESET_LABELS: Record<TimerSessionContent['suggestedPreset'], { en: string; el: string }> = {
  focus25: { en: 'Focus 25', el: 'Εστίαση 25′' },
  sprint10: { en: 'Sprint 10', el: 'Σπριντ 10′' },
  deep50: { en: 'Deep 50', el: 'Βαθιά 50′' },
};

/* OPT-K101/K154 — Timer epitome clarity: wash chrome, text-first secondary */
export function TimerPanel({
  session,
  concept,
  lang,
  scopeKey,
  stepLabel,
  stepIndex,
  conceptMastery,
  emptyMessage,
  onUpload,
  onSessionComplete,
  onOpenBreakTool,
  onOpenInReader,
  onOpenSimulator,
  activeExamPractice,
  settingsExamDate,
  courseExamDate,
}: Props) {
  const [filterQuery, setFilterQuery] = useState('');
  const { t } = useI18n();

  const countdownReport = useMemo(
    () => auditTimerExamCountdownDashboard({
      scopeKey,
      settingsExamDate,
      courseExamDate,
      lang,
    }),
    [scopeKey, settingsExamDate, courseExamDate, lang],
  );

  const examPractice = activeExamPractice ?? session.suggestedExamPractice;
  const presetSyncReport = useMemo(
    () => auditSimulatorTimerPresetSync({
      scopeKey,
      suggestedExamPractice: examPractice,
      lang,
    }),
    [scopeKey, examPractice, lang],
  );

  const filterMatches = useMemo(() => {
    if (!filterQuery.trim()) return [];
    return filterTimerSessionLogs(loadTimerSessions(scopeKey), filterQuery);
  }, [scopeKey, filterQuery]);

  if (!session.hasSource) {
    return (
      <div className="p-3" data-testid="timer-panel-empty" data-bleed="full">
        <WorkspaceToolEmptyState
          tool="timer"
          concept={concept}
          message={emptyMessage}
          hasSource={false}
          onUpload={onUpload}
        />
      </div>
    );
  }

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden bg-surface-card"
      data-testid="timer-panel"
      data-bleed="full"
      data-clarity-pass="k154"
    >
      <div className="shrink-0 space-y-1.5 px-3 py-2">
        {session.sectionLabel && (
          <p className="type-caption text-text-muted" data-testid="timer-section-label">
            {t('wsSectionColon')}{' '}
            <span className="text-text-secondary">{session.sectionLabel}</span>
          </p>
        )}

        {(session.weakExtraction || session.passageGrounded) && (
          <WorkspacePanelWarnStrip testId="timer-weak-extraction">
            {session.passageGrounded ? t('panelTimerGenericTracking') : t('panelTimerGenericWeak')}
          </WorkspacePanelWarnStrip>
        )}

        {/* Wave TM — status strips only when something needs attention */}
        {!countdownReport.syncOk && (
          <TimerExamCountdownDashboardStrip report={countdownReport} lang={lang} />
        )}
        {!presetSyncReport.ok && (
          <SimulatorTimerPresetSyncStrip report={presetSyncReport} lang={lang} />
        )}

        <CollapsibleChromeSection
          title={t('timerSessionChrome')}
          alwaysCollapse
          data-testid="timer-session-chrome"
        >
          <div className="space-y-2 px-3 pb-2">
            <div className="flex flex-wrap items-center gap-2" data-testid="timer-suggested-row">
              <span
                className="rounded-lg border-0 bg-surface-secondary/55 px-2.5 py-1 type-caption font-medium text-text-secondary"
                data-testid="timer-suggested-preset"
                title={`${PRESET_LABELS[session.suggestedPreset][lang]} · ${examPracticeLabel(examPractice, lang)}`}
              >
                {t('timerSharedPresetHint')}: {examPracticeLabel(examPractice, lang)}
                <span className="text-text-muted"> · {PRESET_LABELS[session.suggestedPreset][lang]}</span>
              </span>
              <span className="sr-only" data-testid="timer-suggested-exam-practice">
                {examPracticeLabel(examPractice, lang)}
              </span>
              {session.daysToExam !== null && (
                <span className="type-caption text-text-muted">
                  {t('panelDaysToExam').replace('{days}', String(session.daysToExam))}
                </span>
              )}
              {session.recentSessionCount > 0 && (
                <span className="type-caption tabular-nums text-text-muted">
                  {session.recentSessionCount} {t('panelSessions')}
                </span>
              )}
              {session.suggestBreakTool === 'leitner' && onOpenBreakTool && (
                <button
                  type="button"
                  onClick={onOpenBreakTool}
                  className="ws-touch-floor inline-flex min-h-8 items-center rounded-lg border-0 bg-surface-secondary/55 px-2.5 type-caption font-medium text-text-secondary hover:bg-surface-hover"
                  data-testid="timer-break-leitner"
                >
                  {t('panelBreakToFlashcards')}
                </button>
              )}
              {onOpenInReader && (
                <button
                  type="button"
                  onClick={() => onOpenInReader(concept)}
                  className="ws-touch-floor ml-auto inline-flex min-h-8 items-center rounded-lg border-0 bg-surface-secondary/55 px-2.5 type-caption text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                  data-testid="timer-open-reader"
                >
                  {t('panelReaderSource')}
                </button>
              )}
            </div>

            {session.recentSessionCount > 0 && (
              <div className="max-w-sm">
                <label className="sr-only" htmlFor="timer-filter-input">
                  {t('panelSearchSessions')}
                </label>
                <input
                  id="timer-filter-input"
                  type="search"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder={t('panelSearchSessions')}
                  className="w-full min-h-8 rounded-lg border-0 bg-surface-secondary/55 py-1.5 px-2.5 type-caption text-text-primary placeholder:text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/35"
                  data-testid="timer-filter"
                />
              </div>
            )}

            {filterQuery.trim() && filterMatches.length > 0 && (
              <div className="flex flex-wrap gap-1.5" data-testid="timer-filter-matches">
                {filterMatches.slice(0, 4).map((log, i) => (
                  <span
                    key={`${log.at}-${i}`}
                    className="rounded-lg bg-surface-secondary/40 px-2 py-0.5 type-caption text-text-secondary"
                  >
                    {log.label.slice(0, 40)}{log.label.length > 40 ? '…' : ''} · {log.minutes}m
                  </span>
                ))}
              </div>
            )}
          </div>
        </CollapsibleChromeSection>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <StudyTimer
          concept={concept}
          stepLabel={stepLabel}
          stepIndex={stepIndex}
          scopeKey={scopeKey}
          conceptMastery={conceptMastery}
          suggestedPreset={session.suggestedPreset}
          suggestedExamPractice={activeExamPractice ?? session.suggestedExamPractice}
          onSessionComplete={onSessionComplete}
          onOpenSimulator={onOpenSimulator}
          onOpenBreakTool={onOpenBreakTool}
        />
      </div>
    </div>
  );
}
