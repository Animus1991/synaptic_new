import { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, RotateCcw } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import { useI18n } from '../../lib/i18n';
import {
  appendTimerSession,
  loadExamTarget,
  loadTimerSessions,
  saveExamTarget,
  type TimerSessionLog,
} from '../../lib/workspacePersistence';
import { buildExamIcs, buildStudySessionsIcs, downloadIcs } from '../../lib/timerCalendarSync';
import type { TimerPresetKey } from '../../lib/timerSessionModel';
import { buildTimerSessionLabel } from '../../lib/timerSessionModel';
import {
  EXAM_PRACTICE_PRESETS,
  examPracticeLabel,
  getExamPracticePreset,
  workSecondsForExamPractice,
  type ExamPracticePresetId,
} from '../../lib/examPracticePresets';
import { saveExamPracticePreset } from '../../lib/workspacePersistence';
import { emitTakeBreathPrompt } from '../../lib/examPrep/takeBreathEvents';
import { PomodoroRing } from './PomodoroRing';
import { PomodoroSessionModeList } from './PomodoroSessionModeList';
import { CollapsibleChromeSection } from './CollapsibleChromeSection';
import { PrimaryCTA } from '../ui/primitives';

const PRESET_DEFS = [
  { key: 'focus25' as const, work: 25 * 60, break: 5 * 60 },
  { key: 'sprint10' as const, work: 10 * 60, break: 2 * 60 },
  { key: 'deep50' as const, work: 50 * 60, break: 10 * 60 },
];

type TimerMode = 'pomodoro' | 'exam';

interface StudyTimerProps {
  concept?: string;
  stepLabel?: string;
  stepIndex?: number;
  scopeKey?: string;
  conceptMastery?: number;
  suggestedPreset?: TimerPresetKey;
  suggestedExamPractice?: ExamPracticePresetId;
  onSessionComplete?: (minutes: number, label: string) => void;
  onOpenSimulator?: () => void;
  /** TOOL-TM-02 — open Leitner (or other break tool) during Pomodoro break */
  onOpenBreakTool?: () => void;
}

function defaultExamIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

/* OPT-K101 — residual markup debt: decorative brand type -> ink */
export function StudyTimer({
  concept = '',
  stepLabel,
  stepIndex,
  scopeKey = '__global',
  conceptMastery,
  suggestedPreset,
  suggestedExamPractice,
  onSessionComplete,
  onOpenSimulator,
  onOpenBreakTool,
}: StudyTimerProps) {
  const { t, lang } = useI18n();
  const [mode, setMode] = useState<TimerMode>('pomodoro');
  const [presetIdx, setPresetIdx] = useState(0);
  const [examPracticeId, setExamPracticeId] = useState<ExamPracticePresetId | null>(null);
  const [phase, setPhase] = useState<'work' | 'break'>('work');
  const [leitnerBreakDismissed, setLeitnerBreakDismissed] = useState(false);
  const [examTarget, setExamTarget] = useState(() => loadExamTarget(scopeKey) ?? defaultExamIso());
  const [examTick, setExamTick] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(PRESET_DEFS[0].work);
  const [running, setRunning] = useState(false);
  const [loggedWork, setLoggedWork] = useState(0);
  const [recentSessions, setRecentSessions] = useState<TimerSessionLog[]>(() => loadTimerSessions(scopeKey));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onSessionComplete);
  onCompleteRef.current = onSessionComplete;

  const preset = PRESET_DEFS[presetIdx];
  const workDurationSeconds = examPracticeId
    ? workSecondsForExamPractice(examPracticeId)
    : preset.work;
  const sessionLabel = buildTimerSessionLabel(concept, stepLabel, stepIndex, lang);

  useEffect(() => {
    if (!suggestedPreset || running) return;
    const idx = PRESET_DEFS.findIndex((p) => p.key === suggestedPreset);
    if (idx < 0) return;
    setPresetIdx(idx);
    setPhase('work');
    setSecondsLeft(examPracticeId ? workSecondsForExamPractice(examPracticeId) : PRESET_DEFS[idx].work);
  }, [suggestedPreset, scopeKey, running, examPracticeId]);

  useEffect(() => {
    if (!suggestedExamPractice || running) return;
    setExamPracticeId(suggestedExamPractice);
    setMode('pomodoro');
    setPhase('work');
    setSecondsLeft(workSecondsForExamPractice(suggestedExamPractice));
    saveExamPracticePreset(scopeKey, suggestedExamPractice);
  }, [suggestedExamPractice, scopeKey, running]);

  const examBaselineRef = useRef(0);
  useEffect(() => {
    const target = new Date(examTarget).getTime();
    examBaselineRef.current = Math.max(Math.floor((target - Date.now()) / 1000), 1);
  }, [examTarget]);

  const examSecondsLeft = useMemo(() => {
    const target = new Date(examTarget).getTime();
    return Math.max(0, Math.floor((target - Date.now()) / 1000));
  }, [examTarget, examTick]);

  const displaySeconds = mode === 'exam' ? examSecondsLeft : secondsLeft;
  const total = mode === 'exam'
    ? Math.max(examSecondsLeft, 1)
    : (phase === 'work' ? workDurationSeconds : preset.break);
  const pct = mode === 'exam'
    ? Math.min(100, Math.max(0, 100 - (examSecondsLeft / examBaselineRef.current) * 100))
    : ((total - secondsLeft) / total) * 100;

  useEffect(() => {
    if (mode !== 'exam') return;
    const id = setInterval(() => setExamTick((tick) => tick + 1), 1000);
    return () => clearInterval(id);
  }, [mode]);

  useEffect(() => {
    setRecentSessions(loadTimerSessions(scopeKey));
  }, [scopeKey]);

  useEffect(() => {
    if (mode === 'exam') {
      setRunning(true);
      return;
    }
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          const nextPhase = phase === 'work' ? 'break' : 'work';
          if (phase === 'work') {
            const mins = Math.round(workDurationSeconds / 60);
            setLoggedWork((w) => w + mins);
            const log: TimerSessionLog = {
              at: new Date().toISOString(),
              minutes: mins,
              label: examPracticeId
                ? `${sessionLabel} · ${examPracticeLabel(examPracticeId, lang)}`
                : sessionLabel,
              preset: preset.key,
            };
            appendTimerSession(scopeKey, log);
            setRecentSessions(loadTimerSessions(scopeKey));
            onCompleteRef.current?.(mins, sessionLabel);
            emitTakeBreathPrompt();
          }
          setPhase(nextPhase);
          if (nextPhase === 'break') setLeitnerBreakDismissed(false);
          return nextPhase === 'work' ? workDurationSeconds : preset.break;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, phase, preset, workDurationSeconds, examPracticeId, sessionLabel, scopeKey, mode, lang]);

  const reset = () => {
    setRunning(false);
    setPhase('work');
    setSecondsLeft(workDurationSeconds);
  };

  const selectPreset = (index: number) => {
    const next = PRESET_DEFS[index];
    setPresetIdx(index);
    setExamPracticeId(null);
    setPhase('work');
    setSecondsLeft(next.work);
    setRunning(false);
  };

  const h = Math.floor(displaySeconds / 3600);
  const m = Math.floor((displaySeconds % 3600) / 60);
  const s = displaySeconds % 60;
  const timeDisplay = h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  const ringStrokeTone = mode === 'exam' ? 'exam' : phase === 'work' ? 'work' : 'break';
  const ringPhaseLabel = mode === 'exam' ? t('timerCountdown') : (phase === 'work' ? t('focus') : t('break'));

  return (
    <div
      className="ux-tier-b-tool ux-pomodoro-shell flex h-full min-h-0 flex-col"
      data-testid="study-timer"
      data-bleed="full"
      data-layout="hero"
      data-clarity-pass="k154"
    >
      {/* Wave TM / OPT-K154 — wash mode strip; text-first exam tab */}
      <div
        className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-transparent bg-surface-secondary/30 px-3 py-1.5"
        data-testid="timer-mode-strip"
      >
        <div className="flex overflow-hidden rounded-lg border-0 bg-surface-secondary/45 type-caption" role="group" aria-label={t('studyTimer')}>
          <button
            type="button"
            data-testid="timer-mode-pomodoro"
            onClick={() => { setMode('pomodoro'); setRunning(false); reset(); }}
            className={cn(
              'ws-touch-floor min-h-8 px-2.5 py-1 font-medium',
              mode === 'pomodoro' ? 'bg-surface-card text-text-primary' : 'text-text-muted hover:text-text-secondary',
            )}
          >
            {t('timerModeFocus')}
          </button>
          <button
            type="button"
            data-testid="timer-mode-exam"
            onClick={() => { setMode('exam'); setRunning(true); }}
            className={cn(
              'ws-touch-floor inline-flex min-h-8 items-center px-2.5 py-1 font-medium',
              mode === 'exam' ? 'bg-surface-card text-text-primary' : 'text-text-muted hover:text-text-secondary',
            )}
          >
            {t('timerExam')}
          </button>
        </div>
        {concept ? (
          <p className="min-w-0 max-w-[14rem] truncate type-caption text-text-muted" title={sessionLabel}>
            {sessionLabel}
          </p>
        ) : null}
      </div>

      {mode === 'pomodoro' && phase === 'break' && onOpenBreakTool && !leitnerBreakDismissed && (
        <div
          className="flex items-center gap-2 border-b border-transparent bg-surface-secondary/35 px-3 py-2"
          data-testid="timer-break-leitner-suggest"
        >
          <p className="min-w-0 flex-1 type-caption text-text-secondary">{t('timerBreakLeitnerSuggest')}</p>
          <button
            type="button"
            data-testid="timer-break-open-leitner"
            onClick={onOpenBreakTool}
            className="ws-touch-floor shrink-0 rounded-lg border-0 bg-surface-secondary/70 px-2.5 py-1 type-caption font-medium text-text-primary hover:bg-surface-hover"
          >
            {t('timerBreakOpenLeitner')}
          </button>
          <button
            type="button"
            aria-label={t('dismiss')}
            onClick={() => setLeitnerBreakDismissed(true)}
            className="shrink-0 px-1 type-caption text-text-muted hover:text-text-secondary"
          >
            ×
          </button>
        </div>
      )}

      {mode === 'pomodoro' && (
        <CollapsibleChromeSection
          title={t('timerExamPracticeBlocks')}
          alwaysCollapse
          data-testid="timer-exam-blocks-chrome"
        >
          <div className="space-y-2 px-3 pb-2">
            {conceptMastery !== undefined && (
              <p className="type-caption text-text-muted" data-testid="timer-mastery-meta">
                {t('timerMasteryColon')}: {conceptMastery}%
              </p>
            )}
            <label className="sr-only" htmlFor="timer-exam-practice-select">
              {t('timerExamPracticeBlocks')}
            </label>
            <select
              id="timer-exam-practice-select"
              data-testid="timer-exam-practice-presets"
              value={examPracticeId ?? ''}
              onChange={(e) => {
                const id = e.target.value as ExamPracticePresetId | '';
                if (!id) {
                  setExamPracticeId(null);
                  setPhase('work');
                  setSecondsLeft(PRESET_DEFS[presetIdx].work);
                  setRunning(false);
                  saveExamPracticePreset(scopeKey, null);
                  return;
                }
                setExamPracticeId(id);
                setPhase('work');
                setSecondsLeft(workSecondsForExamPractice(id));
                setRunning(false);
                saveExamPracticePreset(scopeKey, id);
              }}
              className="w-full min-h-8 rounded-lg border-0 bg-surface-secondary/55 px-2.5 py-2 type-caption text-text-primary"
            >
              <option value="">{t(PRESET_DEFS[presetIdx].key)} — {t('timerModeFocus')}</option>
              {EXAM_PRACTICE_PRESETS.map((block) => (
                <option key={block.id} value={block.id}>
                  {examPracticeLabel(block.id, lang)}
                </option>
              ))}
            </select>
            {examPracticeId && onOpenSimulator && getExamPracticePreset(examPracticeId).simulatorScenarioId && (
              <button
                type="button"
                data-testid="timer-open-simulator"
                onClick={onOpenSimulator}
                className="type-caption text-text-secondary hover:text-text-primary hover:underline"
              >
                {t('timerGoToExam')}
              </button>
            )}
          </div>
        </CollapsibleChromeSection>
      )}

      {mode === 'exam' && (
        <CollapsibleChromeSection
          title={t('timerExamDate')}
          alwaysCollapse={false}
          defaultOpen
          data-testid="timer-exam-date-chrome"
        >
          <div className="space-y-2 px-3 pb-2">
            <input
              type="datetime-local"
              data-testid="exam-target-input"
              value={examTarget.slice(0, 16)}
              onChange={(e) => {
                const iso = new Date(e.target.value).toISOString();
                setExamTarget(iso);
                saveExamTarget(scopeKey, iso);
              }}
              className="w-full min-h-8 rounded-lg border-0 bg-surface-secondary/55 px-2 py-1.5 type-caption text-text-primary"
            />
            <button
              type="button"
              data-testid="timer-export-calendar"
              onClick={() => downloadIcs(
                `exam-${concept || scopeKey}`,
                buildExamIcs(examTarget, concept || 'Study exam', lang),
              )}
              className="ws-touch-floor inline-flex min-h-8 items-center rounded-lg border-0 bg-surface-secondary/55 px-2.5 type-caption font-medium text-text-secondary hover:bg-surface-hover"
            >
              {t('timerExportIcs')}
            </button>
          </div>
        </CollapsibleChromeSection>
      )}

      {/* Hero: ring + Start dominate full width (no side Session modes column) */}
      <div
        className="ux-pomodoro-stage flex min-h-0 flex-1 flex-col items-center justify-center px-3 py-6"
        data-testid="timer-hero"
      >
        <PomodoroRing
          pct={pct}
          timeDisplay={timeDisplay}
          phaseLabel={ringPhaseLabel}
          strokeTone={ringStrokeTone}
          className="ux-pomodoro-ring-hero mb-6"
        />

        {mode === 'pomodoro' && (
          <div className="ux-pomodoro-controls flex w-full max-w-sm items-center justify-center gap-2" data-testid="timer-primary-actions">
            {running ? (
              <button
                type="button"
                data-testid="timer-play-pause"
                onClick={() => setRunning(false)}
                aria-label={t('pause')}
                className="ux-pomodoro-play-btn-pause ws-touch-floor inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-5 type-meta font-medium"
              >
                <Pause className="h-4 w-4" aria-hidden />
                {t('pause')}
              </button>
            ) : (
              <PrimaryCTA
                type="button"
                size="md"
                data-testid="timer-play-pause"
                onClick={() => setRunning(true)}
                aria-label={t('start')}
                className="ws-touch-floor min-h-11 flex-1 rounded-xl px-5"
              >
                <Play className="h-4 w-4" aria-hidden />
                {t('start')}
              </PrimaryCTA>
            )}
            <button
              type="button"
              data-testid="timer-reset"
              onClick={reset}
              aria-label={t('reset')}
              className="ws-touch-floor inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border-0 bg-surface-secondary/55 text-text-secondary hover:bg-surface-hover"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
            </button>
          </div>
        )}

        {loggedWork > 0 && mode === 'pomodoro' && (
          <p className="mt-3 text-center type-caption text-text-muted">
            {t('loggedStudyTime').replace('{n}', String(loggedWork))}
          </p>
        )}
      </div>

      {mode === 'pomodoro' && (
        <>
          <div className="ux-pomodoro-preset-pills flex shrink-0 justify-center gap-1 border-t border-transparent px-3 py-2 sm:hidden">
            {PRESET_DEFS.map((p, i) => (
              <button
                key={p.key}
                type="button"
                onClick={() => selectPreset(i)}
                className={cn(
                  'ws-touch-floor min-h-8 rounded-lg px-2.5 type-caption font-medium',
                  presetIdx === i && !examPracticeId
                    ? 'border-0 bg-surface-secondary text-text-primary'
                    : 'border-0 bg-surface-secondary/35 text-text-muted hover:text-text-secondary',
                )}
              >
                {t(p.key)}
              </button>
            ))}
          </div>
          <CollapsibleChromeSection
            title={t('timerLengthsChrome')}
            alwaysCollapse
            data-testid="timer-lengths-chrome"
            className="hidden w-full sm:block"
          >
            {/* Wave TM2 — full panel width (no shrink-wrapped / sidebar column gutters) */}
            <div className="w-full px-3 pb-3" data-testid="timer-lengths-body">
              <PomodoroSessionModeList
                presets={PRESET_DEFS}
                activeIdx={presetIdx}
                examPracticeActive={!!examPracticeId}
                onSelect={selectPreset}
                hideLabel
                className="w-full"
              />
            </div>
          </CollapsibleChromeSection>
        </>
      )}

      {recentSessions.length > 0 && (
        <CollapsibleChromeSection
          title={t('timerRecentChrome')}
          alwaysCollapse
          data-testid="timer-recent-chrome"
        >
          <div className="px-3 pb-3">
            <div className="mb-2 flex items-center justify-end">
              <button
                type="button"
                data-testid="timer-export-sessions-calendar"
                onClick={() => downloadIcs(
                  `sessions-${scopeKey}`,
                  buildStudySessionsIcs(recentSessions, lang),
                )}
                className="inline-flex items-center type-caption text-text-secondary hover:text-text-primary"
              >
                {t('timerExportIcs')}
              </button>
            </div>
            <ul className="max-h-24 space-y-1 overflow-y-auto">
              {recentSessions.slice(-4).reverse().map((entry, i) => (
                <li key={`${entry.at}-${i}`} className="flex justify-between gap-2 type-caption text-text-secondary">
                  <span className="truncate">{entry.label}</span>
                  <span className="shrink-0 font-mono">{entry.minutes}m</span>
                </li>
              ))}
            </ul>
          </div>
        </CollapsibleChromeSection>
      )}
    </div>
  );
}
