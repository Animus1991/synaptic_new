/**
 * Wave E1 — Study Workspace optical foundation, as data.
 *
 * Single source of truth for the workspace type/radius/target scale that
 * `src/index.css` applies under `[data-testid="study-workspace"]`.
 * The contract test asserts the CSS never drifts from these values.
 */

export const WORKSPACE_TYPE_SCALE = {
  /** 12px — absolute floor inside the workspace (eye strain guard). */
  micro: '0.75rem',
  /** OPT-K155/K156 — tight 12→15px ladder: near-flat hierarchy, less eye jump. */
  caption: '0.8125rem',
  bodySm: '0.8125rem',
  meta: '0.8125rem',
  body: '0.875rem',
  title: '0.875rem',
  displaySm: '0.9375rem',
  display: '0.9375rem',
} as const;

export const WORKSPACE_RADIUS_SCALE = {
  /** chips / dense controls */
  sm: '0.5rem',
  /** buttons */
  md: '0.5rem',
  /** cards / tool wells — slightly tighter wells */
  lg: '0.625rem',
  xl: '0.75rem',
  /** sheets / modals / notebook columns */
  panel: '0.875rem',
  bubble: '0.875rem',
} as const;

export const WORKSPACE_TOUCH_TARGETS = {
  /** OPT-K152/K155 — denser, equal secondary controls; the ≥44px hit area is
   *  guaranteed separately by the platform `min-height: 2.75rem` touch floors. */
  btnHeight: '2.35rem',
  btnHeightSm: '2rem',
  /** phone: minimum hit area for chrome buttons */
  phoneMin: '2.75rem',
} as const;

/** Platform-shell floor (outside the workspace). */
export const PLATFORM_TYPE_FLOOR = {
  micro: '0.6875rem',
  caption: '0.75rem',
} as const;
