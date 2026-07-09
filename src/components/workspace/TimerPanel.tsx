import { useMemo, useState } from 'react';
import { BookOpen, Layers, Search } from '@/lib/lucide-shim';
import type { TimerSessionContent } from '../../lib/timerSessionModel';
import { filterTimerSessionLogs } from '../../lib/timerSessionModel';
import { examPracticeLabel } from '../../lib/examPracticePresets';
import type { ExamPracticePresetId } from '../../lib/examPracticePresets';
import { auditTimerExamCountdownDashboard } from '../../lib/timerExamCountdownDashboardQA';
import { loadTimerSessions } from '../../lib/workspacePersistence';
import { WorkspaceToolEmptyState } from './WorkspaceToolEmptyState';
import { StudyTimer } from './StudyTimer';
import { TimerExamCountdownDashboardStrip } from './TimerExamCountdownDashboardStrip';
import { WorkspacePanelWarnStrip } from './WorkspacePanelWarnStrip';
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
  focus25: { en: 'Focus 25m', el: 'Εστίαση 25′' },
  sprint10: { en: 'Sprint 10m (weak area)', el: 'Sprint 10′ (αδύναμο)' },
  deep50: { en: 'Deep 50m (strong)', el: 'Deep 50′ (ισχυρό)' },
};

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

  const filterMatches = useMemo(() => {
    if (!filterQuery.trim()) return [];
    return filterTimerSessionLogs(loadTimerSessions(scopeKey), filterQuery);
  }, [scopeKey, filterQuery]);

  if (!session.hasSource) {
    return (
      <WorkspaceToolEmptyState
        tool="timer"
        concept={concept}
        message={emptyMessage}
        hasSource={false}
        onUpload={onUpload}
      />
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden" data-testid="timer-panel">
      <div className="shrink-0 border-b border-border-subtle px-4 py-3">
        {session.sectionLabel && (
          <p className="mb-2 text-[10px] text-text-muted" data-testid="timer-section-label">
            {t('wsSectionColon')}{' '}
            <span className="text-text-secondary">{session.sectionLabel}</span>
          </p>
        )}

        {(session.weakExtraction || session.passageGrounded) && (
          <WorkspacePanelWarnStrip testId="timer-weak-extraction">
            {session.passageGrounded ? t('panelTimerGenericTracking') : t('panelTimerGenericWeak')}
          </WorkspacePanelWarnStrip>
        )}

        <TimerExamCountdownDashboardStrip report={countdownReport} lang={lang} />

        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span
            className="rounded-full border border-brand-500/30 bg-brand-600/10 px-2 py-0.5 text-[9px] font-medium text-brand-800"
            data-testid="timer-suggested-preset"
          >
            {PRESET_LABELS[session.suggestedPreset][lang]}
          </span>
          <span
            className="ws-eyebrow ws-chip-warn rounded-full px-2 py-0.5 text-[9px] font-medium"
            data-testid="timer-suggested-exam-practice"
          >
            {examPracticeLabel(activeExamPractice ?? session.suggestedExamPractice, lang)}
          </span>
          {session.daysToExam !== null && (
            <span className="text-[10px] text-text-muted">
              {t('panelDaysToExam').replace('{days}', String(session.daysToExam))}
            </span>
          )}
          {session.recentSessionCount > 0 && (
            <span className="text-[10px] text-text-muted">
              {session.recentSessionCount} {t('panelSessions')}
            </span>
          )}
          {session.suggestBreakTool === 'leitner' && onOpenBreakTool && (
            <button
              type="button"
              onClick={onOpenBreakTool}
              className="inline-flex items-center gap-1 rounded-lg border border-accent-emerald/30 bg-accent-emerald/10 px-2 py-0.5 text-[9px] font-medium text-accent-emerald hover:bg-accent-emerald/15"
              data-testid="timer-break-leitner"
            >
              <Layers className="w-3 h-3" />
              {t('panelBreakToFlashcards')}
            </button>
          )}
          {onOpenInReader && (
            <button
              type="button"
              onClick={() => onOpenInReader(concept)}
              className="ml-auto inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[10px] text-text-secondary hover:border-brand-600/35 hover:text-brand-800"
              data-testid="timer-open-reader"
            >
              <BookOpen className="w-3 h-3" />
              Reader
            </button>
          )}
        </div>

        {session.recentSessionCount > 0 && (
          <div className="relative max-w-xs">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted" />
            <input
              type="search"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder={t('panelSearchSessions')}
              className="w-full rounded-lg border border-border-subtle bg-surface-card py-1.5 pl-7 pr-2 text-[11px] text-text-secondary placeholder:text-text-muted focus:border-accent-cyan/40 focus:outline-none"
              data-testid="timer-filter"
            />
          </div>
        )}

        {filterQuery.trim() && filterMatches.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5" data-testid="timer-filter-matches">
            {filterMatches.slice(0, 4).map((log, i) => (
              <span
                key={`${log.at}-${i}`}
                className="rounded-full border border-accent-cyan/25 bg-accent-cyan/8 px-2 py-0.5 text-[9px] text-brand-800"
              >
                {log.label.slice(0, 40)}{log.label.length > 40 ? '…' : ''} · {log.minutes}m
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
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
        />
      </div>
    </div>
  );
}
