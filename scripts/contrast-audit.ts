/*
 * OPT-K168 — WCAG contrast CI gate (Canon-informed).
 * Run: `npm run audit:contrast`
 */
import { auditThemeContrast, contrastAuditSummary } from '../src/lib/themeContrastAudit';

const results = auditThemeContrast();
let current = '';
for (const row of results) {
  if (row.theme !== current) {
    current = row.theme;
    console.log(`\n${row.theme}`);
  }
  const ratio = row.ratio === null ? 'n/a' : `${row.ratio.toFixed(2)}:1`;
  const mark = row.status === 'pass' ? '✓' : row.status === 'warn' ? '!' : row.status === 'skip' ? '~' : '✗';
  console.log(`  ${mark} ${row.name.padEnd(26)} ${ratio}`);
}

const summary = contrastAuditSummary(results);
console.log(
  `\n${summary.failures} failure(s), ${summary.warnings} warning(s), ${summary.skipped} skipped, ${summary.passes} pass.`,
);
process.exit(summary.failures > 0 ? 1 : 0);
