/**
 * Package 2 — canonical design token ids declared in src/index.css @theme.
 * Used by unit tests to guard against accidental removal during refactors.
 */

export const TYPE_SCALE_TOKENS = [
  '--type-micro',
  '--type-caption',
  '--type-body-sm',
  '--type-meta',
  '--type-body',
  '--type-title',
  '--type-display-sm',
  '--type-display',
] as const;

export const SPACING_TOKENS = [
  '--space-1',
  '--space-2',
  '--space-3',
  '--space-4',
  '--space-5',
  '--space-6',
  '--space-8',
  '--space-10',
  '--space-12',
] as const;

export const RADIUS_TOKENS = [
  '--radius-sm',
  '--radius-md',
  '--radius-lg',
  '--radius-xl',
  '--radius-panel',
  '--radius-pill',
] as const;

export const ELEVATION_TOKENS = [
  '--elev-0',
  '--elev-1',
  '--elev-2',
  '--elev-3',
  '--elev-4',
  '--elev-drawer',
] as const;

export const FONT_TOKENS = ['--font-sans', '--font-display'] as const;

/** CSS custom properties that must exist in index.css @theme (Package 2C). */
export const PACKAGE2_CSS_VARS = [
  ...TYPE_SCALE_TOKENS,
  ...SPACING_TOKENS,
  ...RADIUS_TOKENS,
  ...ELEVATION_TOKENS,
  ...FONT_TOKENS,
] as const;
