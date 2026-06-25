import { useMemo, useState } from 'react';
import { AlertTriangle, BookOpen, Layers, Search } from 'lucide-react';
import type { TimerSessionContent } from '../../lib/timerSessionModel';
import { filterTimerSessionLogs } from '../../lib/timerSessionModel';
import { examPracticeLabel } from '../../lib/examPracticePresets';
import type { ExamPracticePresetId } from '../../lib/examPracticePresets';
import { auditTimerExamCountdownDashboard } from '../../lib/timerExamCountdownDashboardQA';
import { loadTimerSessions } from '../../lib/workspacePersistence';
import { WorkspaceEmptyState } from './WorkspaceEmptyState';
import { StudyTimer } from './StudyTimer';
import { TimerExamCountdownDashboardStrip } from './TimerExamCountdownDashboardStrip';

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
  const isEl = lang === 'el';

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
      <WorkspaceEmptyState
        message={emptyMessage ?? (isEl ? 'Ανέβασε σημειώσεις για χρονόμετρο μελέτης.' : 'Upload notes to use the study timer.')}
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
            {isEl ? 'Ενότητα:' : 'Section:'}{' '}
            <span className="text-text-secondary">{session.sectionLabel}</span>
          </p>
        )}

        {(session.weakExtraction || session.passageGrounded) && (
          <div
            className="mb-3 flex items-start gap-2 rounded-xl border border-accent-amber/30 bg-accent-amber/8 px-3 py-2 text-[10px] text-accent-amber"
            data-testid="timer-weak-extraction"
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <p>
              {session.passageGrounded
                ? (isEl
                  ? 'Η συνεδρία δένεται σε generic concept — επίλεξε πιο συγκεκριμένο βήμα για καλύτερο tracking.'
                  : 'Session is tied to a generic concept — pick a specific step for better tracking.')
                : (isEl
                  ? 'Γενική έννοια — δοκίμασε Reprocess ή άλλαξε βήμα.'
                  : 'Generic concept — try Reprocess or switch step.')}
            </p>
          </div>
        )}

        <TimerExamCountdownDashboardStrip report={countdownReport} lang={lang} />

        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span
            className="rounded-full border border-brand-500/30 bg-brand-600/10 px-2 py-0.5 text-[9px] font-medium text-brand-300"
            data-testid="timer-suggested-preset"
          >
            {PRESET_LABELS[session.suggestedPreset][lang]}
          </span>
          <span
            className="rounded-full border border-accent-amber/30 bg-accent-amber/10 px-2 py-0.5 text-[9px] font-medium text-accent-amber"
            data-testid="timer-suggested-exam-practice"
          >
            {examPracticeLabel(activeExamPractice ?? session.suggestedExamPractice, lang)}
          </span>
          {session.daysToExam !== null && (
            <span className="text-[10px] text-text-muted">
              {isEl
                ? `${session.daysToExam} ημ. μέχρι εξέταση`
                : `${session.daysToExam}d to exam`}
            </span>
          )}
          {session.recentSessionCount > 0 && (
            <span className="text-[10px] text-text-muted">
              {session.recentSessionCount} {isEl ? 'συνεδρίες' : 'sessions'}
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
              {isEl ? 'Διάλειμμα → Κάρτες' : 'Break → Flashcards'}
            </button>
          )}
          {onOpenInReader && (
            <button
              type="button"
              onClick={() => onOpenInReader(concept)}
              className="ml-auto inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[10px] text-text-secondary hover:border-accent-cyan/35 hover:text-accent-cyan"
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
              placeholder={isEl ? 'Αναζήτηση συνεδριών…' : 'Search sessions…'}
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
                className="rounded-full border border-accent-cyan/25 bg-accent-cyan/8 px-2 py-0.5 text-[9px] text-accent-cyan"
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
