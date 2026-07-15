import { useState, useEffect, useRef, useMemo } from 'react';
import { Timer, Play, Pause, RotateCcw, BookOpen, GraduationCap, Calendar, Layers } from '@/lib/lucide-shim';
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
    const id = setInterval(() => setExamTick((t) => t + 1), 1000);
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
    <div className="ux-tier-b-tool ux-pomodoro-shell flex flex-col h-full p-4" data-testid="study-timer">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Timer className="w-4 h-4 text-accent-teal" />
          {t('studyTimer')}
        </h3>
        <div className="flex rounded-lg border border-border-subtle overflow-hidden text-[10px]">
          <button
            type="button"
            data-testid="timer-mode-pomodoro"
            onClick={() => { setMode('pomodoro'); setRunning(false); reset(); }}
            className={cn('px-2 py-1', mode === 'pomodoro' ? 'bg-brand-600/20 text-brand-800' : 'text-text-muted')}
          >
            Pomodoro
          </button>
          <button
            type="button"
            data-testid="timer-mode-exam"
            onClick={() => { setMode('exam'); setRunning(true); }}
            className={cn('px-2 py-1 flex items-center gap-1', mode === 'exam' ? 'bg-accent-amber/20 text-accent-amber' : 'text-text-muted')}
          >
            <GraduationCap className="w-3 h-3" />
            {t('timerExam')}
          </button>
        </div>
      </div>

      {concept && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-border-subtle bg-surface-primary/50 px-3 py-2">
          <BookOpen className="w-3.5 h-3.5 text-brand-700 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-text-muted">{t('timerSession')}</p>
            <p className="text-xs font-medium text-brand-800 truncate">{sessionLabel}</p>
            {conceptMastery !== undefined && (
              <p className="text-[9px] text-text-muted mt-0.5">
                {t('timerMasteryColon')}: {conceptMastery}%
              </p>
            )}
          </div>
        </div>
      )}

      {mode === 'pomodoro' && phase === 'break' && onOpenBreakTool && !leitnerBreakDismissed && (
        <div
          className="mb-3 flex items-center gap-2 rounded-lg border border-accent-cyan/30 bg-accent-cyan/10 px-3 py-2"
          data-testid="timer-break-leitner-suggest"
        >
          <Layers className="w-3.5 h-3.5 text-accent-cyan shrink-0" />
          <p className="flex-1 text-[11px] text-brand-800 min-w-0">{t('timerBreakLeitnerSuggest')}</p>
          <button
            type="button"
            data-testid="timer-break-open-leitner"
            onClick={onOpenBreakTool}
            className="shrink-0 rounded-md border border-accent-cyan/40 bg-accent-cyan/15 px-2 py-1 text-[10px] font-semibold text-brand-800 hover:bg-accent-cyan/25"
          >
            {t('timerBreakOpenLeitner')}
          </button>
          <button
            type="button"
            aria-label={t('dismiss')}
            onClick={() => setLeitnerBreakDismissed(true)}
            className="shrink-0 text-[10px] text-text-muted hover:text-text-secondary px-1"
          >
            ×
          </button>
        </div>
      )}

      {mode === 'pomodoro' && (
        <>
          <div className="ux-pomodoro-preset-pills flex gap-2 mb-3 self-start flex-wrap xl:hidden">
            {PRESET_DEFS.map((p, i) => (
              <button
                key={p.key}
                type="button"
                onClick={() => selectPreset(i)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all',
                  presetIdx === i && !examPracticeId ? 'border-brand-500/40 text-brand-800 bg-brand-600/10' : 'border-border-subtle text-text-muted',
                )}
              >
                {t(p.key)}
              </button>
            ))}
          </div>
          <div className="mb-6 w-full max-w-md">
            <p className="mb-1.5 text-[10px] font-semibold text-text-muted">
              {t('timerExamPracticeBlocks')}
            </p>
            <div className="flex flex-wrap gap-1.5" data-testid="timer-exam-practice-presets">
              {EXAM_PRACTICE_PRESETS.map((block) => (
                <button
                  key={block.id}
                  type="button"
                  onClick={() => {
                    setExamPracticeId(block.id);
                    setPhase('work');
                    setSecondsLeft(workSecondsForExamPractice(block.id));
                    setRunning(false);
                    saveExamPracticePreset(scopeKey, block.id);
                  }}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[10px] font-medium transition-all',
                    examPracticeId === block.id
                      ? 'border-accent-amber/40 bg-accent-amber/15 text-accent-amber'
                      : 'border-border-subtle text-text-muted hover:border-accent-amber/30',
                  )}
                >
                  {examPracticeLabel(block.id, lang)}
                </button>
              ))}
            </div>
            {examPracticeId && onOpenSimulator && getExamPracticePreset(examPracticeId).simulatorScenarioId && (
              <button
                type="button"
                data-testid="timer-open-simulator"
                onClick={onOpenSimulator}
                className="mt-2 text-[10px] text-brand-800 hover:underline"
              >
                {t('timerOpenSimulator')}
              </button>
            )}
          </div>
        </>
      )}

      {mode === 'exam' && (
        <div className="mb-4 space-y-2">
          <label className="text-[10px] text-text-muted">{t('timerExamDate')}</label>
          <input
            type="datetime-local"
            data-testid="exam-target-input"
            value={examTarget.slice(0, 16)}
            onChange={(e) => {
              const iso = new Date(e.target.value).toISOString();
              setExamTarget(iso);
              saveExamTarget(scopeKey, iso);
            }}
            className="w-full rounded-lg border border-border-subtle bg-surface-input px-2 py-1.5 text-xs"
          />
          <button
            type="button"
            data-testid="timer-export-calendar"
            onClick={() => downloadIcs(
              `exam-${concept || scopeKey}`,
              buildExamIcs(examTarget, concept || 'Study exam', lang),
            )}
            className="inline-flex items-center gap-1 rounded-lg border border-accent-amber/30 bg-accent-amber/10 px-2 py-1 text-[10px] font-medium text-accent-amber hover:bg-accent-amber/20"
          >
            <Calendar className="w-3 h-3" />
            {t('timerExportIcs')}
          </button>
        </div>
      )}

      <div className="ux-pomodoro-stage flex-1 min-h-0">
        <div className="ux-pomodoro-stage-inner flex flex-col xl:grid xl:grid-cols-[1fr_minmax(200px,260px)] xl:items-center xl:gap-8 h-full">
          <div className="ux-pomodoro-ring-col flex flex-col items-center justify-center py-4">
            <PomodoroRing
              pct={pct}
              timeDisplay={timeDisplay}
              phaseLabel={ringPhaseLabel}
              strokeTone={ringStrokeTone}
              className="mb-6"
            />

            {mode === 'pomodoro' && (
              <div className="ux-pomodoro-controls flex gap-3">
                <button
                  type="button"
                  data-testid="timer-play-pause"
                  onClick={() => setRunning(!running)}
                  aria-label={running ? t('pause') : t('start')}
                  className={cn(
                    'ux-pomodoro-play-btn flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium',
                    running ? 'ux-pomodoro-play-btn-pause' : 'ux-pomodoro-play-btn-start',
                  )}
                >
                  {running ? <Pause className="w-4 h-4" aria-hidden /> : <Play className="w-4 h-4" aria-hidden />}
                  {running ? t('pause') : t('start')}
                </button>
                <button
                  type="button"
                  data-testid="timer-reset"
                  onClick={reset}
                  aria-label={t('reset')}
                  className="ux-pomodoro-reset-btn p-2.5 rounded-xl border border-border-subtle hover:bg-surface-hover text-text-secondary"
                >
                  <RotateCcw className="w-4 h-4" aria-hidden />
                </button>
              </div>
            )}
          </div>

          {mode === 'pomodoro' && (
            <PomodoroSessionModeList
              presets={PRESET_DEFS}
              activeIdx={presetIdx}
              examPracticeActive={!!examPracticeId}
              onSelect={selectPreset}
              className="hidden xl:flex"
            />
          )}
        </div>
      </div>

      {loggedWork > 0 && mode === 'pomodoro' && (
        <p className="text-[10px] text-text-muted mt-2 text-center">{t('loggedStudyTime').replace('{n}', String(loggedWork))}</p>
      )}

      {recentSessions.length > 0 && (
        <div className="mt-4 border-t border-border-subtle pt-3 shrink-0">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold text-text-muted">{t('timerRecentSessions')}</p>
            <button
              type="button"
              data-testid="timer-export-sessions-calendar"
              onClick={() => downloadIcs(
                `sessions-${scopeKey}`,
                buildStudySessionsIcs(recentSessions, lang),
              )}
              className="inline-flex items-center gap-1 text-[9px] text-brand-700 hover:text-brand-800"
            >
              <Calendar className="w-3 h-3" />
              .ics
            </button>
          </div>
          <ul className="space-y-1 max-h-24 overflow-y-auto">
            {recentSessions.slice(-4).reverse().map((s, i) => (
              <li key={`${s.at}-${i}`} className="text-[10px] text-text-tertiary flex justify-between gap-2">
                <span className="truncate">{s.label}</span>
                <span className="shrink-0 font-mono">{s.minutes}m</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
