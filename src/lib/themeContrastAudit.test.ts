import { describe, expect, it } from 'vitest';
import { AUDIT_THEMES, auditThemeContrast, contrastAuditSummary } from './themeContrastAudit';

describe('OPT-K168 theme contrast CI gate', () => {
  const results = auditThemeContrast();

  it('audits every registered product theme', () => {
    for (const theme of AUDIT_THEMES) {
      expect(results.some((r) => r.theme === theme)).toBe(true);
    }
  });

  it('hard pairs meet AA 4.5:1 (or are skipped when non-hex)', () => {
    const hardFails = results.filter((r) => r.gate === 'hard' && r.status === 'fail');
    expect(hardFails).toEqual([]);
  });

  it('soft pairs stay above the 3:1 large-text floor', () => {
    const softFails = results.filter((r) => r.gate === 'soft' && r.status === 'fail');
    expect(softFails).toEqual([]);
  });

  it('summary reports no failures', () => {
    expect(contrastAuditSummary(results).failures).toBe(0);
  });
});
