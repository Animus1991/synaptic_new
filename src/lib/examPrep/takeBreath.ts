export type BreathPhase = 'inhale' | 'hold' | 'exhale' | 'pause';

export type BreathPreset = {
  id: string;
  labelKey: string;
  phases: { phase: BreathPhase; seconds: number }[];
};

export const BREATH_PRESETS: BreathPreset[] = [
  {
    id: 'calm-30',
    labelKey: 'wellnessBreathCalm30',
    phases: [
      { phase: 'inhale', seconds: 4 },
      { phase: 'hold', seconds: 2 },
      { phase: 'exhale', seconds: 4 },
    ],
  },
  {
    id: 'focus-60',
    labelKey: 'wellnessBreathFocus60',
    phases: [
      { phase: 'inhale', seconds: 4 },
      { phase: 'hold', seconds: 4 },
      { phase: 'exhale', seconds: 6 },
      { phase: 'pause', seconds: 2 },
    ],
  },
];

export function totalBreathSeconds(preset: BreathPreset, cycles = 3): number {
  const cycle = preset.phases.reduce((s, p) => s + p.seconds, 0);
  return cycle * cycles;
}

export function phaseLabelKey(phase: BreathPhase): string {
  switch (phase) {
    case 'inhale':
      return 'wellnessBreathInhale';
    case 'hold':
      return 'wellnessBreathHold';
    case 'exhale':
      return 'wellnessBreathExhale';
    default:
      return 'wellnessBreathPausePhase';
  }
}
