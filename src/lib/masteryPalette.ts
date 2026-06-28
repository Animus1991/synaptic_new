import type { MasteryBand } from './pedagogy';
import { masteryBand } from './pedagogy';

/** CSS custom properties — resolved per theme in index.css */
export const MASTERY_VAR: Record<MasteryBand, string> = {
  weak: 'var(--mastery-weak)',
  developing: 'var(--mastery-developing)',
  proficient: 'var(--mastery-proficient)',
  strong: 'var(--mastery-strong)',
};

export function bandColorVar(band: MasteryBand): string {
  return MASTERY_VAR[band];
}

export function masteryColorForValue(mastery: number): string {
  return bandColorVar(masteryBand(mastery));
}

/** Course ring: strong / mid / weak without harsh purple–rose jump */
export function courseRingColor(mastery: number): string {
  if (mastery >= 80) return MASTERY_VAR.strong;
  if (mastery >= 50) return 'var(--palette-purple)';
  return MASTERY_VAR.weak;
}

const COURSE_HEX_TO_VAR: Record<string, string> = {
  '#818cf8': 'var(--palette-purple)',
  '#6366f1': 'var(--palette-purple)',
  '#7b61ff': 'var(--palette-purple)',
  '#a78bfa': 'var(--palette-purple)',
  '#22d3ee': 'var(--palette-cyan)',
  '#38bdf8': 'var(--palette-cyan)',
  '#00c2ff': 'var(--palette-cyan)',
  '#2dd4bf': 'var(--palette-teal)',
  '#00d1b2': 'var(--palette-teal)',
  '#34d399': 'var(--palette-green)',
  '#6ee7b7': 'var(--palette-green)',
  '#fbbf24': 'var(--palette-amber)',
  '#fb7185': 'var(--palette-rose)',
  '#ff6b6b': 'var(--palette-rose)',
  '#fb923c': 'var(--palette-orange)',
};

/** Map stored course hex to theme-aware palette token */
export function resolveCourseColor(stored: string): string {
  return COURSE_HEX_TO_VAR[stored.toLowerCase()] ?? stored;
}

export const ANNOTATION_PALETTE = [
  'var(--palette-purple)',
  'var(--palette-amber)',
  'var(--palette-green)',
  'var(--palette-rose)',
  'var(--palette-cyan)',
] as const;

export function accentHighlightVar(): string {
  return 'var(--palette-purple)';
}

export function readinessBandMeta(value: number): {
  label: 'Strong' | 'Proficient' | 'Developing' | 'Weak';
  color: string;
} {
  const band = masteryBand(value);
  const labels = {
    strong: 'Strong',
    proficient: 'Proficient',
    developing: 'Developing',
    weak: 'Weak',
  } as const;
  return { label: labels[band], color: bandColorVar(band) };
}
