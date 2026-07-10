/** Semantic color reference — Option-B prototype Color System (Wave E15). */

export type ColorCodingEntryId =
  | 'mastered'
  | 'proficient'
  | 'developing'
  | 'weak'
  | 'sourceGrounded'
  | 'inferred';

export type ColorCodingEntry = {
  id: ColorCodingEntryId;
  /** CSS custom property for swatch fill */
  swatchVar: string;
  wcagKey: 'colorRefWcagAa' | 'colorRefWcagAaLarge';
};

export const COLOR_CODING_ENTRIES: ColorCodingEntry[] = [
  { id: 'mastered', swatchVar: 'var(--mastery-strong)', wcagKey: 'colorRefWcagAa' },
  { id: 'proficient', swatchVar: 'var(--mastery-developing)', wcagKey: 'colorRefWcagAa' },
  { id: 'developing', swatchVar: 'var(--palette-amber)', wcagKey: 'colorRefWcagAaLarge' },
  { id: 'weak', swatchVar: 'var(--mastery-weak)', wcagKey: 'colorRefWcagAa' },
  { id: 'sourceGrounded', swatchVar: 'var(--palette-purple)', wcagKey: 'colorRefWcagAa' },
  { id: 'inferred', swatchVar: 'var(--color-text-tertiary)', wcagKey: 'colorRefWcagAa' },
];

export const HERO_PIPELINE_STEP_IDS = ['ingest', 'analyze', 'teach', 'adapt'] as const;
export type HeroPipelineStepId = (typeof HERO_PIPELINE_STEP_IDS)[number];
