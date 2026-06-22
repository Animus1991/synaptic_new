import { useState, useEffect, useRef, useMemo } from 'react';
import { Timer, Play, Pause, RotateCcw, BookOpen, GraduationCap, Calendar } from 'lucide-react';
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
  onSessionComplete?: (minutes: number, label: string) => void;
}

function buildSessionLabel(concept: string, stepLabel?: string, stepIndex?: number, lang: 'en' | 'el' = 'en'): string {
  const stepPart = stepLabel
    ? (stepIndex !== undefined ? `${lang === 'el' ? 'Βήμα' : 'Step'} ${stepIndex + 1}: ${stepLabel}` : stepLabel)
    : (lang === 'el' ? 'Εστίαση' : 'Focus');
  return concept ? `${concept} · ${stepPart}` : stepPart;
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
  onSessionComplete,
}: StudyTimerProps) {
  const { t, lang } = useI18n();
  const [mode, setMode] = useState<TimerMode>('pomodoro');
  const [presetIdx, setPresetIdx] = useState(0);
  const [phase, setPhase] = useState<'work' | 'break'>('work');
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
  const sessionLabel = buildSessionLabel(concept, stepLabel, stepIndex, lang);

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
    : (phase === 'work' ? preset.work : preset.break);
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
            const mins = Math.round(preset.work / 60);
            setLoggedWork((w) => w + mins);
            const log: TimerSessionLog = {
              at: new Date().toISOString(),
              minutes: mins,
              label: sessionLabel,
              preset: preset.key,
            };
            appendTimerSession(scopeKey, log);
            setRecentSessions(loadTimerSessions(scopeKey));
            onCompleteRef.current?.(mins, sessionLabel);
          }
          setPhase(nextPhase);
          return nextPhase === 'work' ? preset.work : preset.break;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, phase, preset, sessionLabel, scopeKey, mode]);

  const reset = () => {
    setRunning(false);
    setPhase('work');
    setSecondsLeft(preset.work);
  };

  const h = Math.floor(displaySeconds / 3600);
  const m = Math.floor((displaySeconds % 3600) / 60);
  const s = displaySeconds % 60;
  const timeDisplay = h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  return (
    <div className="flex flex-col h-full p-4" data-testid="study-timer">
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
            className={cn('px-2 py-1', mode === 'pomodoro' ? 'bg-brand-600/20 text-brand-300' : 'text-text-muted')}
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
            {lang === 'el' ? 'Εξέταση' : 'Exam'}
          </button>
        </div>
      </div>

      {concept && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-border-subtle bg-surface-primary/50 px-3 py-2">
          <BookOpen className="w-3.5 h-3.5 text-brand-400 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-text-muted">{lang === 'el' ? 'Συνεδρία' : 'Session'}</p>
            <p className="text-xs font-medium text-brand-300 truncate">{sessionLabel}</p>
            {conceptMastery !== undefined && (
              <p className="text-[9px] text-text-muted mt-0.5">
                {lang === 'el' ? 'Κατάκτηση' : 'Mastery'}: {conceptMastery}%
              </p>
            )}
          </div>
        </div>
      )}

      {mode === 'pomodoro' && (
        <div className="flex gap-2 mb-6 self-start">
          {PRESET_DEFS.map((p, i) => (
            <button
              key={p.key}
              onClick={() => { setPresetIdx(i); setPhase('work'); setSecondsLeft(p.work); setRunning(false); }}
              className={cn(
                'px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all',
                presetIdx === i ? 'border-brand-500/40 text-brand-300 bg-brand-600/10' : 'border-border-subtle text-text-muted',
              )}
            >
              {t(p.key)}
            </button>
          ))}
        </div>
      )}

      {mode === 'exam' && (
        <div className="mb-4 space-y-2">
          <label className="text-[10px] text-text-muted">{lang === 'el' ? 'Ημερομηνία εξέτασης' : 'Exam date'}</label>
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
            {lang === 'el' ? 'Εξαγωγή .ics' : 'Export .ics'}
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="relative w-40 h-40 mb-6">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="var(--viz-track)" strokeWidth="6" />
            <circle
              cx="50" cy="50" r="42" fill="none"
              stroke={mode === 'exam' ? '#fbbf24' : (phase === 'work' ? '#818cf8' : '#34d399')}
              strokeWidth="6"
              strokeDasharray={`${pct * 2.64} 264`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold font-mono">{timeDisplay}</span>
            <span className={cn('text-[10px] font-medium mt-1', mode === 'exam' ? 'text-accent-amber' : phase === 'work' ? 'text-brand-400' : 'text-accent-emerald')}>
              {mode === 'exam' ? (lang === 'el' ? 'Αντίστροφη' : 'Countdown') : (phase === 'work' ? t('focus') : t('break'))}
            </span>
          </div>
        </div>

        {mode === 'pomodoro' && (
          <div className="flex gap-3">
            <button
              onClick={() => setRunning(!running)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium"
            >
              {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {running ? t('pause') : t('start')}
            </button>
            <button onClick={reset} className="p-2.5 rounded-xl border border-border-subtle hover:bg-surface-hover text-text-secondary">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {loggedWork > 0 && mode === 'pomodoro' && (
        <p className="text-[10px] text-text-muted mt-2 text-center">{t('loggedStudyTime').replace('{n}', String(loggedWork))}</p>
      )}

      {recentSessions.length > 0 && (
        <div className="mt-4 border-t border-border-subtle pt-3 shrink-0">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold text-text-muted">{lang === 'el' ? 'Πρόσφατες συνεδρίες' : 'Recent sessions'}</p>
            <button
              type="button"
              data-testid="timer-export-sessions-calendar"
              onClick={() => downloadIcs(
                `sessions-${scopeKey}`,
                buildStudySessionsIcs(recentSessions, lang),
              )}
              className="inline-flex items-center gap-1 text-[9px] text-brand-400 hover:text-brand-300"
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
