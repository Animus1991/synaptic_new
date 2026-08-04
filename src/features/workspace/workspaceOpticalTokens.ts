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
  caption: '0.8125rem',
  bodySm: '0.875rem',
  meta: '0.875rem',
  body: '1rem',
  title: '1.125rem',
  displaySm: '1.25rem',
  display: '1.5rem',
} as const;

export const WORKSPACE_RADIUS_SCALE = {
  /** chips / dense controls */
  sm: '0.5rem',
  /** buttons */
  md: '0.5rem',
  /** cards / tool wells */
  lg: '0.75rem',
  xl: '1rem',
  /** sheets / modals / notebook columns */
  panel: '1rem',
  bubble: '1rem',
} as const;

export const WORKSPACE_TOUCH_TARGETS = {
  btnHeight: '2.75rem',
  btnHeightSm: '2.5rem',
  /** phone: minimum hit area for chrome buttons */
  phoneMin: '2.75rem',
} as const;

/** Platform-shell floor (outside the workspace). */
export const PLATFORM_TYPE_FLOOR = {
  micro: '0.6875rem',
  caption: '0.75rem',
} as const;
