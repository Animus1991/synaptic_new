/**
 * TOOL-SM-02 — Course / note-derived simulator scenario presets.
 * Economics mode keeps shared exam presets; parametric mode builds cue packs.
 */

import type { NumericCue } from './numericCues';
import {
  SIMULATOR_SCENARIO_PRESETS,
  type SimulatorScenarioId,
  type SimulatorScenarioPreset,
} from './examPracticePresets';

export type ParametricScenarioId = 'baseline' | 'high-shock' | 'low-shock' | 'balanced';

export type ParametricScenarioPreset = {
  id: ParametricScenarioId;
  labelEn: string;
  labelEl: string;
  /** Absolute cue values keyed by cue id. */
  values: Record<string, number>;
};

export type CourseSimulatorPresets =
  | { mode: 'economics'; scenarios: SimulatorScenarioPreset[] }
  | { mode: 'parametric'; scenarios: ParametricScenarioPreset[] }
  | { mode: 'none'; scenarios: [] };

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Detect economics-ish course context from title / concept text. */
export function looksLikeEconomicsCourse(text: string): boolean {
  const hay = text.toLowerCase();
  return /\b(econom|supply|demand|market|elasticity|price|gdp|inflation|trade|tariff)\b/i.test(hay)
    || /\b(οικονομ|προσφορ|ζήτηση|αγορά|ελαστικότ|τιμή|πληθωρισμ)\b/i.test(hay);
}

/**
 * Build named parametric presets from extracted note cues.
 * Always includes baseline + high/low shock on the first cue when available.
 */
export function buildParametricCoursePresets(cues: NumericCue[]): ParametricScenarioPreset[] {
  if (cues.length === 0) return [];

  const baselineValues = Object.fromEntries(cues.map((c) => [c.id, c.baseline]));
  const primary = cues[0]!;
  const high = clamp(primary.baseline + (primary.max - primary.baseline) * 0.85, primary.min, primary.max);
  const low = clamp(primary.baseline - (primary.baseline - primary.min) * 0.85, primary.min, primary.max);

  const highValues = { ...baselineValues, [primary.id]: high };
  const lowValues = { ...baselineValues, [primary.id]: low };

  const midValues = Object.fromEntries(
    cues.map((c) => [c.id, clamp((c.min + c.max) / 2, c.min, c.max)]),
  );

  return [
    {
      id: 'baseline',
      labelEn: 'Baseline (notes)',
      labelEl: 'Βασική (σημειώσεις)',
      values: baselineValues,
    },
    {
      id: 'high-shock',
      labelEn: `High · ${primary.label}`,
      labelEl: `Υψηλή · ${primary.label}`,
      values: highValues,
    },
    {
      id: 'low-shock',
      labelEn: `Low · ${primary.label}`,
      labelEl: `Χαμηλή · ${primary.label}`,
      values: lowValues,
    },
    {
      id: 'balanced',
      labelEn: 'Mid-range',
      labelEl: 'Μεσαία',
      values: midValues,
    },
  ];
}

export function resolveCourseSimulatorPresets(opts: {
  economicsMode: boolean;
  numericCues: NumericCue[];
  courseTitle?: string;
  concept?: string;
}): CourseSimulatorPresets {
  const { economicsMode, numericCues, courseTitle = '', concept = '' } = opts;
  if (economicsMode || looksLikeEconomicsCourse(`${courseTitle} ${concept}`)) {
    return { mode: 'economics', scenarios: SIMULATOR_SCENARIO_PRESETS };
  }
  if (numericCues.length > 0) {
    return { mode: 'parametric', scenarios: buildParametricCoursePresets(numericCues) };
  }
  return { mode: 'none', scenarios: [] };
}

export function isSimulatorScenarioId(id: string): id is SimulatorScenarioId {
  return SIMULATOR_SCENARIO_PRESETS.some((p) => p.id === id);
}
