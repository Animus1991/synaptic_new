import { useState, useEffect, useCallback } from 'react';
import { Clock, Play, Pause, RotateCcw } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import type { Lang } from '../../lib/i18n';

interface Props {
  lang: Lang;
  className?: string;
}

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

/**
 * Compact inline pomodoro-style timer chip for workspace chrome.
 * Cross-pollinated from ai_tutor_studio's CompactPomodoroTimer.
 */
export function CompactStudyTimer({ lang, className }: Props) {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const toggle = useCallback(() => setRunning((r) => !r), []);
  const reset = useCallback(() => {
    setRunning(false);
    setSeconds(0);
  }, []);

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border-subtle bg-surface-card text-text-secondary text-xs font-mono tabular-nums transition-colors',
        running && 'border-brand-500/30 text-brand-600',
        className,
      )}
      title={lang === 'el' ? 'Χρονόμετρο μελέτης' : 'Study timer'}
    >
      <Clock className="w-3 h-3 shrink-0" />
      <span className="min-w-[36px] text-center">{fmt(seconds)}</span>
      <button
        type="button"
        onClick={toggle}
        aria-label={running ? 'Pause' : 'Start'}
        className="p-0.5 rounded hover:bg-surface-hover transition-colors"
      >
        {running ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
      </button>
      {seconds > 0 && (
        <button
          type="button"
          onClick={reset}
          aria-label="Reset"
          className="p-0.5 rounded hover:bg-surface-hover transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
