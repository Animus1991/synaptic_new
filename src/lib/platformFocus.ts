/**
 * L13 — Learning OS focus flags.
 * Hide NotebookLM-parity surfaces by default; Agent stays in Workspace context.
 */
const parityEnv = import.meta.env.VITE_SHOW_NOTEBOOKLM_PARITY === 'true';

/** Standalone Agent tab in shell nav + command palette. */
export function showStandaloneAgentNav(): boolean {
  return parityEnv;
}

/** Cross-library synthesis panel on Library (NotebookLM-style digest). */
export function showCrossLibrarySynthesis(): boolean {
  return parityEnv;
}

export const NOTEBOOKLM_URL = 'https://notebooklm.google.com/';
