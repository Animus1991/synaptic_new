/**
 * OPT-K168 — WCAG contrast matrix over live theme tokens (Canon-style CI gate).
 * Parses `index.css` + `primer-minimal.css` so a token tweak cannot silently
 * ship an unreadable pair.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AA_LARGE, AA_NORMAL, contrastRatio } from './contrastRatio';

export const AUDIT_THEMES = [
  'dark',
  'light',
  'minimal',
  'minimal-dark',
  'blueprint',
  'spectrum',
] as const;

export type AuditThemeId = (typeof AUDIT_THEMES)[number];

export type ContrastPairGate = 'hard' | 'soft';

export type ContrastPairResult = {
  theme: AuditThemeId;
  name: string;
  fg: string;
  bg: string;
  ratio: number | null;
  gate: ContrastPairGate;
  status: 'pass' | 'fail' | 'warn' | 'skip';
};

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function extractBraceBlock(css: string, startBrace: number): string {
  let depth = 0;
  for (let i = startBrace; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') {
      depth--;
      if (depth === 0) return css.slice(startBrace + 1, i);
    }
  }
  return '';
}

function parseVars(block: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    out[m[1]] = m[2].trim();
  }
  return out;
}

function resolveVar(vars: Record<string, string>, value: string, depth = 0): string {
  if (depth > 8) return value;
  const m = /^var\((--[a-z0-9-]+)(?:,\s*([^)]+))?\)$/i.exec(value);
  if (!m) return value;
  const next = vars[m[1]] ?? m[2];
  if (!next) return value;
  return resolveVar(vars, next.trim(), depth + 1);
}

function normalizeHex(value: string): string | null {
  const v = value.trim();
  if (!HEX.test(v)) return null;
  if (v.length === 4) {
    return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`.toLowerCase();
  }
  return v.toLowerCase();
}

export function loadThemeTokenMaps(root = process.cwd()): Record<AuditThemeId, Record<string, string>> {
  const indexCss = readFileSync(resolve(root, 'src/index.css'), 'utf8');
  const primerCss = readFileSync(resolve(root, 'src/styles/primer-minimal.css'), 'utf8');
  const css = `${indexCss}\n${primerCss}`;

  const themeStart = css.indexOf('@theme {');
  const base = themeStart >= 0 ? parseVars(extractBraceBlock(css, themeStart + '@theme '.length)) : {};

  const pickThemeBlock = (id: string): Record<string, string> => {
    const re = new RegExp(`\\[data-theme=["']${id}["']\\]((?:\\s*,\\s*\\[data-theme=["'][^"']+["']\\])*)\\s*\\{`, 'g');
    let merged: Record<string, string> = {};
    let m: RegExpExecArray | null;
    while ((m = re.exec(css)) !== null) {
      const brace = m.index + m[0].length - 1;
      const body = extractBraceBlock(css, brace);
      if (body.includes('--color-text-primary:') || body.includes('--color-surface-primary:') || Object.keys(merged).length === 0) {
        merged = { ...merged, ...parseVars(body) };
      }
    }
    return merged;
  };

  const maps = {} as Record<AuditThemeId, Record<string, string>>;
  for (const id of AUDIT_THEMES) {
    maps[id] = { ...base, ...pickThemeBlock(id) };
  }
  return maps;
}

function token(vars: Record<string, string>, name: string): string | null {
  const raw = vars[name];
  if (!raw) return null;
  return normalizeHex(resolveVar(vars, raw));
}

export function auditThemeContrast(root = process.cwd()): ContrastPairResult[] {
  const maps = loadThemeTokenMaps(root);
  const results: ContrastPairResult[] = [];

  for (const theme of AUDIT_THEMES) {
    const vars = maps[theme];
    const text = token(vars, '--color-text-primary');
    const muted = token(vars, '--color-text-muted') ?? token(vars, '--color-text-secondary');
    const bg = token(vars, '--color-surface-primary');
    const card = token(vars, '--color-surface-card') ?? bg;
    /* CTA fill: prefer role token (minimal-dark brand-600 is pastel text ink). */
    const onAccent = token(vars, '--color-on-cta') ?? token(vars, '--color-on-brand') ?? token(vars, '--color-on-accent');
    const accentFill = token(vars, '--color-brand-cta') ?? token(vars, '--color-accent-fill') ?? token(vars, '--color-brand-600');
    const secondary = token(vars, '--color-text-secondary');

    const pairs: Array<{ name: string; fg: string | null; bg: string | null; gate: ContrastPairGate }> = [
      { name: 'text on bg', fg: text, bg, gate: 'hard' },
      { name: 'text on card', fg: text, bg: card, gate: 'hard' },
      { name: 'onAccent on accentFill', fg: onAccent, bg: accentFill, gate: 'hard' },
      { name: 'muted on bg', fg: muted, bg, gate: 'soft' },
      { name: 'muted on card', fg: muted, bg: card, gate: 'soft' },
      { name: 'secondary on bg', fg: secondary, bg, gate: 'soft' },
    ];

    for (const p of pairs) {
      if (!p.fg || !p.bg) {
        results.push({
          theme,
          name: p.name,
          fg: p.fg ?? '',
          bg: p.bg ?? '',
          ratio: null,
          gate: p.gate,
          status: 'skip',
        });
        continue;
      }
      const ratio = contrastRatio(p.fg, p.bg);
      let status: ContrastPairResult['status'] = 'pass';
      if (p.gate === 'hard' && ratio < AA_NORMAL) status = 'fail';
      else if (p.gate === 'soft' && ratio < AA_NORMAL) status = ratio < AA_LARGE ? 'fail' : 'warn';
      results.push({ theme, name: p.name, fg: p.fg, bg: p.bg, ratio, gate: p.gate, status });
    }
  }

  return results;
}

export function contrastAuditSummary(results: ContrastPairResult[]) {
  return {
    failures: results.filter((r) => r.status === 'fail').length,
    warnings: results.filter((r) => r.status === 'warn').length,
    skipped: results.filter((r) => r.status === 'skip').length,
    passes: results.filter((r) => r.status === 'pass').length,
  };
}
