/**
 * L13 — Learning OS focus flags.
 * NotebookLM-parity surfaces follow AI-05 resolveNotebookLmParity() strategy.
 */
import { resolveNotebookLmParity } from './notebookLmParity';

/** Standalone Agent tab in shell nav + command palette. */
export function showStandaloneAgentNav(): boolean {
  return resolveNotebookLmParity();
}

/** Cross-library synthesis panel on Library (NotebookLM-style digest). */
export function showCrossLibrarySynthesis(): boolean {
  return resolveNotebookLmParity();
}

export const NOTEBOOKLM_URL = 'https://notebooklm.google.com/';
