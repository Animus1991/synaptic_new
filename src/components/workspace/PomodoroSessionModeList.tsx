import { cn } from '../../utils/cn';
import { useI18n } from '../../lib/i18n';
import { AllCapsLabel } from '../ui/AllCapsLabel';
import type { TimerPresetKey } from '../../lib/timerSessionModel';

type PresetDef = {
  key: TimerPresetKey;
  work: number;
  break: number;
};

const DESC_KEYS: Record<TimerPresetKey, 'pomodoroFocus25Desc' | 'pomodoroSprint10Desc' | 'pomodoroDeep50Desc'> = {
  focus25: 'pomodoroFocus25Desc',
  sprint10: 'pomodoroSprint10Desc',
  deep50: 'pomodoroDeep50Desc',
};

type Props = {
  presets: readonly PresetDef[];
  activeIdx: number;
  examPracticeActive: boolean;
  onSelect: (index: number) => void;
  className?: string;
};

export function PomodoroSessionModeList({
  presets,
  activeIdx,
  examPracticeActive,
  onSelect,
  className,
}: Props) {
  const { t } = useI18n();

  return (
    <div className={cn('ux-pomodoro-mode-list', className)} data-testid="pomodoro-session-modes">
      <p className="ux-pomodoro-mode-list-label"><AllCapsLabel>{t('pomodoroSessionModes')}</AllCapsLabel></p>
      <div className="ux-pomodoro-mode-list-stack">
        {presets.map((preset, index) => {
          const active = activeIdx === index && !examPracticeActive;
          return (
            <button
              key={preset.key}
              type="button"
              data-testid={`pomodoro-mode-${preset.key}`}
              onClick={() => onSelect(index)}
              className={cn('ux-pomodoro-mode-card', active && 'ux-pomodoro-mode-card-active')}
            >
              <div className="ux-pomodoro-mode-card-head">
                <span className="ux-pomodoro-mode-card-title">{t(preset.key)}</span>
                <span className="ux-pomodoro-mode-card-duration">
                  {Math.round(preset.work / 60)} min
                </span>
              </div>
              <p className="ux-pomodoro-mode-card-desc">{t(DESC_KEYS[preset.key])}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
