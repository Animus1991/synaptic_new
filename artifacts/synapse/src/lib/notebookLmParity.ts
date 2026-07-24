/**
 * AI-05 — NotebookLM parity surface default strategy.
 *
 * Resolution order (highest wins):
 * 1. localStorage override `synapse:notebooklm-parity` = "1" | "0"
 * 2. VITE_SHOW_NOTEBOOKLM_PARITY = "true" | "false" (explicit)
 * 3. unset → DEV default ON, production default OFF
 *
 * Surfaces gated: standalone Agent nav, Cross-library synthesis panel.
 */

import { loadJson, saveJson } from './persistence';

const OVERRIDE_KEY = 'notebooklm-parity';

function readEnvTriState(): boolean | null {
  const raw = import.meta.env.VITE_SHOW_NOTEBOOKLM_PARITY;
  if (raw === 'true' || raw === '1') return true;
  if (raw === 'false' || raw === '0') return false;
  return null;
}

function readLocalOverride(): boolean | null {
  try {
    const raw = localStorage.getItem(`synapse:${OVERRIDE_KEY}`);
    if (raw === null) return null;
    const v = loadJson<string | boolean>(OVERRIDE_KEY, '');
    if (v === true || v === '1' || v === 'true') return true;
    if (v === false || v === '0' || v === 'false') return false;
    return null;
  } catch {
    return null;
  }
}

/** Effective flag after env + local override + DEV/PROD default. */
export function resolveNotebookLmParity(): boolean {
  const override = readLocalOverride();
  if (override !== null) return override;
  const env = readEnvTriState();
  if (env !== null) return env;
  return Boolean(import.meta.env.DEV);
}

export function getNotebookLmParityOverride(): boolean | null {
  return readLocalOverride();
}

export function setNotebookLmParityOverride(value: boolean | null): void {
  if (value === null) {
    try {
      localStorage.removeItem(`synapse:${OVERRIDE_KEY}`);
    } catch {
      /* ignore */
    }
    return;
  }
  saveJson(OVERRIDE_KEY, value ? '1' : '0');
}

export function notebookLmParityStrategyLabel(lang: 'en' | 'el'): string {
  if (lang === 'el') {
    return 'Εμφάνιση επιφανειών NotebookLM-parity (Agent nav, σύνθεση βιβλιοθήκης). Προεπιλογή: ON στο DEV, OFF σε production· το env και το override έχουν προτεραιότητα.';
  }
  return 'Show NotebookLM-parity surfaces (Agent nav, library synthesis). Default: ON in DEV, OFF in production; env and local override win.';
}
