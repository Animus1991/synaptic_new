/**
 * Wave 6.8f — QA spine for Scratchpad SymPy derivation chain edge cases.
 */

import type { Lang } from './i18n';
import type { FormulaVariable } from './formulaSolver';
import {
  buildSympyValidationPayload,
  normalizeScratchpadStepLine,
  type ScratchpadSympyValidationResult,
  type ValidatedScratchpadStep,
} from './scratchpadSympyValidation';

export type ScratchpadSympyEdgeKind =
  | 'warning-line'
  | 'empty-line'
  | 'unit-stripped'
  | 'no-parseable-steps'
  | 'missing-substitution'
  | 'chain-divergence'
  | 'target-mismatch'
  | 'sympy-unavailable'
  | 'symbolic-only'
  | 'valid-chain'
  | 'parse-error';

export type ScratchpadSympyEdgeSummary = {
  lineIndex: number;
  kind: ScratchpadSympyEdgeKind;
  text: string;
  expr?: string;
};

export type ScratchpadSympyChainReport = {
  ok: boolean;
  parseableCount: number;
  skippedCount: number;
  warningCount: number;
  unitStrippedCount: number;
  missingSubstitutionCount: number;
  invalidStepCount: number;
  engine: 'none' | 'sympy' | 'unavailable';
  entries: ScratchpadSympyEdgeSummary[];
  bannerSummary: string | null;
};

const UNIT_SUFFIX_RE = /^([\d.]+)\s+[A-Za-zΩμ]+(?:\/[A-Za-z]+)?$/i;
const SYMBOL_RE = /\b[a-zA-Z_][a-zA-Z0-9_]*\b/g;

export function hadUnitSuffixStripped(raw: string, normalized: string | null): boolean {
  if (!normalized) return false;
  let s = raw.trim();
  if (s.startsWith('✓')) {
    s = s.replace(/^✓\s*/, '').trim();
    const eq = s.indexOf('=');
    if (eq >= 0) s = s.slice(eq + 1).trim();
  }
  return UNIT_SUFFIX_RE.test(s);
}

export function extractExprSymbols(expr: string): string[] {
  const reserved = new Set(['e', 'pi', 'sin', 'cos', 'tan', 'log', 'sqrt', 'exp']);
  const found = new Set<string>();
  for (const match of expr.matchAll(SYMBOL_RE)) {
    const sym = match[0]!;
    if (!reserved.has(sym.toLowerCase())) found.add(sym);
  }
  return [...found];
}

export function missingSubstitutionSymbols(
  expr: string,
  variables: FormulaVariable[],
): string[] {
  const subs = new Set<string>();
  for (const v of variables) {
    const n = parseFloat(v.value.trim());
    if (!Number.isNaN(n)) subs.add(v.symbol);
  }
  return extractExprSymbols(expr).filter((s) => !subs.has(s));
}

export function classifyScratchpadLineEdge(
  line: string,
  index: number,
  variables: FormulaVariable[],
): ScratchpadSympyEdgeSummary {
  const text = line.trim();
  if (!text) {
    return { lineIndex: index, kind: 'empty-line', text: line };
  }
  if (text.startsWith('⚠')) {
    return { lineIndex: index, kind: 'warning-line', text: line };
  }

  const rawNorm = normalizeScratchpadStepLine(line);
  if (!rawNorm) {
    return { lineIndex: index, kind: 'parse-error', text: line };
  }

  if (hadUnitSuffixStripped(text, rawNorm)) {
    return { lineIndex: index, kind: 'unit-stripped', text: line, expr: rawNorm };
  }

  const missing = missingSubstitutionSymbols(rawNorm, variables);
  if (missing.length > 0) {
    return {
      lineIndex: index,
      kind: 'missing-substitution',
      text: line,
      expr: rawNorm,
    };
  }

  return { lineIndex: index, kind: 'valid-chain', text: line, expr: rawNorm };
}

function edgeFromValidationStep(
  step: ValidatedScratchpadStep,
): ScratchpadSympyEdgeKind {
  if (step.status === 'valid') return 'valid-chain';
  if (step.status === 'skipped') return 'parse-error';
  if (step.message?.includes('≠') || step.message?.includes('diverges')) {
    return 'chain-divergence';
  }
  if (step.message?.includes('target') || step.message?.includes('RHS')) {
    return 'target-mismatch';
  }
  return 'parse-error';
}

export function auditScratchpadSympyChain(input: {
  formula: string;
  stepLines: string[];
  variables: FormulaVariable[];
  validation?: ScratchpadSympyValidationResult | null;
  lang?: Lang;
}): ScratchpadSympyChainReport {
  const lang = input.lang ?? 'en';
  const payload = buildSympyValidationPayload(input.formula, input.stepLines, input.variables);
  const entries = input.stepLines.map((line, index) =>
    classifyScratchpadLineEdge(line, index, input.variables),
  );

  let warningCount = entries.filter((e) => e.kind === 'warning-line').length;
  let unitStrippedCount = entries.filter((e) => e.kind === 'unit-stripped').length;
  let missingSubstitutionCount = entries.filter((e) => e.kind === 'missing-substitution').length;
  const parseableCount = payload.stepItems.length;
  const skippedCount = input.stepLines.length - parseableCount - warningCount;

  if (parseableCount === 0 && input.stepLines.some((l) => l.trim() && !l.trim().startsWith('⚠'))) {
    for (const entry of entries) {
      if (entry.kind === 'valid-chain') entry.kind = 'no-parseable-steps';
    }
  }

  let invalidStepCount = 0;
  let engine: ScratchpadSympyChainReport['engine'] = 'none';

  if (input.validation) {
    engine = input.validation.engine;
    for (const step of input.validation.steps) {
      if (step.status === 'invalid') {
        invalidStepCount += 1;
        const entry = entries[step.index];
        if (entry) {
          entry.kind = edgeFromValidationStep(step);
        }
      } else if (step.status === 'valid' && entries[step.index]) {
        entries[step.index]!.kind = 'valid-chain';
      }
    }
    if (engine === 'unavailable' && parseableCount > 0) {
      for (const entry of entries) {
        if (entry.kind === 'missing-substitution') {
          entry.kind = 'symbolic-only';
        }
      }
    }
  }

  const bannerSummary = formatScratchpadSympyChainBanner({
    parseableCount,
    warningCount,
    unitStrippedCount,
    missingSubstitutionCount,
    invalidStepCount,
    engine,
    lang,
  });

  const ok = parseableCount > 0
    && invalidStepCount === 0
    && (input.validation?.ok ?? missingSubstitutionCount === 0);

  return {
    ok,
    parseableCount,
    skippedCount,
    warningCount,
    unitStrippedCount,
    missingSubstitutionCount,
    invalidStepCount,
    engine,
    entries,
    bannerSummary,
  };
}

export function formatScratchpadSympyChainBanner(input: {
  parseableCount: number;
  warningCount: number;
  unitStrippedCount: number;
  missingSubstitutionCount: number;
  invalidStepCount: number;
  engine: ScratchpadSympyChainReport['engine'];
  lang: Lang;
}): string | null {
  if (input.parseableCount === 0 && input.warningCount === 0) return null;
  const parts: string[] = [];
  const isEl = input.lang === 'el';

  if (input.parseableCount > 0) {
    parts.push(isEl ? `${input.parseableCount} βήματα` : `${input.parseableCount} steps`);
  }
  if (input.unitStrippedCount > 0) {
    parts.push(isEl ? `${input.unitStrippedCount} μονάδες` : `${input.unitStrippedCount} units stripped`);
  }
  if (input.missingSubstitutionCount > 0) {
    parts.push(isEl ? `${input.missingSubstitutionCount} vars` : `${input.missingSubstitutionCount} missing vars`);
  }
  if (input.invalidStepCount > 0) {
    parts.push(isEl ? `${input.invalidStepCount} λάθη` : `${input.invalidStepCount} invalid`);
  }
  if (input.engine === 'unavailable' && input.parseableCount > 0) {
    parts.push(isEl ? 'numeric fallback' : 'numeric fallback');
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

export function scratchpadSympyEdgeLabel(kind: ScratchpadSympyEdgeKind, lang: Lang): string {
  const en: Record<ScratchpadSympyEdgeKind, string> = {
    'warning-line': 'Warning',
    'empty-line': 'Empty',
    'unit-stripped': 'Units stripped',
    'no-parseable-steps': 'Unparseable',
    'missing-substitution': 'Missing vars',
    'chain-divergence': 'Chain break',
    'target-mismatch': 'Target mismatch',
    'sympy-unavailable': 'SymPy offline',
    'symbolic-only': 'Symbolic only',
    'valid-chain': 'OK',
    'parse-error': 'Parse error',
  };
  const el: Record<ScratchpadSympyEdgeKind, string> = {
    'warning-line': 'Προειδοποίηση',
    'empty-line': 'Κενό',
    'unit-stripped': 'Μονάδες',
    'no-parseable-steps': 'Μη αναγνώσιμο',
    'missing-substitution': 'Λείπουν vars',
    'chain-divergence': 'Ρήγμα αλυσίδας',
    'target-mismatch': 'Λάθος στόχος',
    'sympy-unavailable': 'SymPy offline',
    'symbolic-only': 'Μόνο συμβολικά',
    'valid-chain': 'OK',
    'parse-error': 'Σφάλμα parse',
  };
  return (lang === 'el' ? el : en)[kind];
}

export function scratchpadSympyEdgeHint(kind: ScratchpadSympyEdgeKind, lang: Lang): string | null {
  const hints: Partial<Record<ScratchpadSympyEdgeKind, { en: string; el: string }>> = {
    'unit-stripped': {
      en: 'Trailing units removed for SymPy (e.g. 10 N → 10).',
      el: 'Οι μονάδες αφαιρέθηκαν για SymPy (π.χ. 10 N → 10).',
    },
    'missing-substitution': {
      en: 'Fill all variable values before validating the chain.',
      el: 'Συμπλήρωσε όλες τις μεταβλητές πριν την επικύρωση.',
    },
    'chain-divergence': {
      en: 'This step value does not follow from the previous step.',
      el: 'Η τιμή δεν συνεχίζει από το προηγούμενο βήμα.',
    },
    'no-parseable-steps': {
      en: 'Use one expression per line (Step N:, →, or plain expr).',
      el: 'Ένα expression ανά γραμμή (Step N:, →, ή απλό expr).',
    },
    'sympy-unavailable': {
      en: 'SymPy offline — numeric fallback checks values only.',
      el: 'SymPy offline — αριθμητικό fallback μόνο για τιμές.',
    },
  };
  const row = hints[kind];
  if (!row) return null;
  return lang === 'el' ? row.el : row.en;
}
