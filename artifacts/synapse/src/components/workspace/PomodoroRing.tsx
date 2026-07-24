import { cn } from '../../utils/cn';

type PomodoroRingProps = {
  pct: number;
  timeDisplay: string;
  phaseLabel: string;
  strokeTone: 'work' | 'break' | 'exam';
  className?: string;
};

export function PomodoroRing({
  pct,
  timeDisplay,
  phaseLabel,
  strokeTone,
  className,
}: PomodoroRingProps) {
  const dash = `${pct * 2.64} 264`;

  return (
    <div className={cn('ux-pomodoro-ring', className)} aria-hidden={false}>
      <svg className="ux-pomodoro-ring-svg" viewBox="0 0 100 100" aria-hidden>
        <circle className="ux-pomodoro-ring-track" cx="50" cy="50" r="42" fill="none" />
        <circle
          className={cn(
            'ux-pomodoro-ring-progress',
            strokeTone === 'work' && 'ux-pomodoro-stroke-work',
            strokeTone === 'break' && 'ux-pomodoro-stroke-break',
            strokeTone === 'exam' && 'ux-pomodoro-stroke-exam',
          )}
          cx="50"
          cy="50"
          r="42"
          fill="none"
          strokeDasharray={dash}
          strokeLinecap="round"
        />
      </svg>
      <div className="ux-pomodoro-ring-center">
        <span className="ux-pomodoro-ring-time" aria-live="polite">
          {timeDisplay}
        </span>
        <span
          className={cn(
            'ux-pomodoro-ring-phase',
            strokeTone === 'work' && 'ux-pomodoro-ring-phase-work',
            strokeTone === 'break' && 'ux-pomodoro-ring-phase-break',
            strokeTone === 'exam' && 'ux-pomodoro-ring-phase-exam',
          )}
        >
          {phaseLabel}
        </span>
      </div>
    </div>
  );
}
