import { useEffect, useState } from 'react';
import { X, Wind } from '@phosphor-icons/react';
import { BREATH_PRESETS, phaseLabelKey, type BreathPreset } from '../../lib/examPrep/takeBreath';
import { useI18n } from '../../lib/i18n';
import { cn } from '../../utils/cn';

type Props = {
  open: boolean;
  onClose: () => void;
  presetId?: string;
};

export function TakeBreathModal({ open, onClose, presetId = 'calm-30' }: Props) {
  const { t } = useI18n();
  const preset = BREATH_PRESETS.find((p) => p.id === presetId) ?? BREATH_PRESETS[0]!;
  const [running, setRunning] = useState(false);
  const [cycle, setCycle] = useState(0);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(preset.phases[0]?.seconds ?? 4);

  useEffect(() => {
    if (!open) {
      setRunning(false);
      setCycle(0);
      setPhaseIdx(0);
      setSecondsLeft(preset.phases[0]?.seconds ?? 4);
    }
  }, [open, preset]);

  useEffect(() => {
    if (!open || !running) return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s > 1) return s - 1;
        advancePhase(preset);
        return 0;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [open, running, phaseIdx, cycle, preset]);

  function advancePhase(p: BreathPreset) {
    const nextIdx = phaseIdx + 1;
    if (nextIdx >= p.phases.length) {
      const nextCycle = cycle + 1;
      if (nextCycle >= 3) {
        setRunning(false);
        return;
      }
      setCycle(nextCycle);
      setPhaseIdx(0);
      setSecondsLeft(p.phases[0]!.seconds);
      return;
    }
    setPhaseIdx(nextIdx);
    setSecondsLeft(p.phases[nextIdx]!.seconds);
  }

  if (!open) return null;

  const currentPhase = preset.phases[phaseIdx]?.phase ?? 'inhale';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      data-testid="take-breath-modal"
      role="dialog"
      aria-modal="true"
      aria-label={t('wellnessBreathTitle')}
    >
      <div className="w-full max-w-md rounded-2xl border border-border-subtle bg-surface-primary p-6 shadow-xl">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wind className="w-5 h-5 text-brand-600" />
            <h2 className="text-lg font-semibold text-text-primary">{t('wellnessBreathTitle')}</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-hover" aria-label={t('wellnessBreathClose')}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-text-secondary mb-6">{t('wellnessBreathSubtitle')}</p>

        <div className="flex flex-col items-center py-8">
          <div
            className={cn(
              'w-32 h-32 rounded-full border-4 flex items-center justify-center transition-all duration-1000',
              currentPhase === 'inhale' && 'scale-110 border-brand-500/60',
              currentPhase === 'hold' && 'scale-105 border-accent-amber/60',
              currentPhase === 'exhale' && 'scale-90 border-accent-emerald/60',
              currentPhase === 'pause' && 'scale-95 border-border-subtle',
            )}
          >
            <div className="text-center">
              <p className="text-2xl font-bold font-mono">{secondsLeft}</p>
              <p className="text-xs text-text-muted mt-1">{t(phaseLabelKey(currentPhase) as never)}</p>
            </div>
          </div>
          <p className="text-[10px] text-text-muted mt-4">
            {t('wellnessBreathCycle').replace('{n}', String(cycle + 1))}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRunning(!running)}
            data-testid="take-breath-start"
            className="flex-1 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-500"
          >
            {running ? t('wellnessBreathPause') : t('wellnessBreathStart')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-border-subtle text-sm text-text-secondary hover:bg-surface-hover"
          >
            {t('wellnessBreathClose')}
          </button>
        </div>
      </div>
    </div>
  );
}
