import { useState, useEffect, useRef } from 'react';
import { Timer, Play, Pause, RotateCcw } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useI18n } from '../../lib/i18n';

const PRESET_DEFS = [
  { key: 'focus25' as const, work: 25 * 60, break: 5 * 60 },
  { key: 'sprint10' as const, work: 10 * 60, break: 2 * 60 },
  { key: 'deep50' as const, work: 50 * 60, break: 10 * 60 },
];

interface StudyTimerProps {
  onSessionComplete?: (minutes: number, label: string) => void;
}

export function StudyTimer({ onSessionComplete }: StudyTimerProps) {
  const { t } = useI18n();
  const [presetIdx, setPresetIdx] = useState(0);
  const [phase, setPhase] = useState<'work' | 'break'>('work');
  const [secondsLeft, setSecondsLeft] = useState(PRESET_DEFS[0].work);
  const [running, setRunning] = useState(false);
  const [loggedWork, setLoggedWork] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onSessionComplete);
  onCompleteRef.current = onSessionComplete;

  const preset = PRESET_DEFS[presetIdx];
  const total = phase === 'work' ? preset.work : preset.break;
  const pct = ((total - secondsLeft) / total) * 100;

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          const nextPhase = phase === 'work' ? 'break' : 'work';
          if (phase === 'work') {
            const mins = Math.round(preset.work / 60);
            setLoggedWork((w) => w + mins);
            onCompleteRef.current?.(mins, t(preset.key));
          }
          setPhase(nextPhase);
          return nextPhase === 'work' ? preset.work : preset.break;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, phase, preset]);

  const reset = () => {
    setRunning(false);
    setPhase('work');
    setSecondsLeft(preset.work);
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div className="flex flex-col h-full p-4 items-center justify-center">
      <h3 className="text-sm font-semibold flex items-center gap-2 mb-6 self-start">
        <Timer className="w-4 h-4 text-accent-teal" />
        {t('studyTimer')}
      </h3>

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

      <div className="relative w-40 h-40 mb-6">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="var(--viz-track)" strokeWidth="6" />
          <circle
            cx="50" cy="50" r="42" fill="none"
            stroke={phase === 'work' ? '#818cf8' : '#34d399'}
            strokeWidth="6"
            strokeDasharray={`${pct * 2.64} 264`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold font-mono">{mm}:{ss}</span>
          <span className={cn('text-[10px] font-medium mt-1', phase === 'work' ? 'text-brand-400' : 'text-accent-emerald')}>
            {phase === 'work' ? t('focus') : t('break')}
          </span>
        </div>
      </div>

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
      {loggedWork > 0 && (
        <p className="text-[10px] text-text-muted mt-4">{t('loggedStudyTime').replace('{n}', String(loggedWork))}</p>
      )}
    </div>
  );
}
