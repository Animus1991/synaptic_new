/**
 * Wave RD — Reader densify: full-bleed reading surface + warm hierarchy
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

describe('Wave RD — Reader productization', () => {
  const reader = read('components/workspace/CognitiveReader.tsx');
  const spine = read('lib/workspaceToolS20Spine.ts');
  const i18n = read('lib/i18n.ts');
  const registry = read('lib/workspaceToolRegistry.ts');
  const empty = read('lib/workspaceEmptyState.ts');
  const guide = read('lib/workspaceToolGuide.ts');
  const surface = read('components/workspace/studyWorkspace/StudyWorkspaceToolSurface.tsx');

  it('is full-bleed (root + work surface + nest skip; no nested Reader title)', () => {
    expect(reader).toContain('data-testid="cognitive-reader"');
    expect(reader).toContain('data-bleed="full"');
    expect(reader).toContain('data-testid="reader-work-surface"');
    expect(reader).toContain('data-testid="reader-primary-strip"');
    expect(reader).not.toMatch(/\{t\('cognitiveReader'\)\}/);
    expect(surface).toMatch(/activeTool !== 'reader'/);
  });

  it('nests Reading aids chrome closed by default', () => {
    expect(reader).toContain('data-testid="reader-aids-chrome"');
    expect(reader).toContain('alwaysCollapse');
    expect(reader).toContain('CollapsibleChromeSection');
    expect(reader).toContain('readerReadingAidsChrome');
    expect(i18n).toMatch(/readerReadingAidsChrome: 'Reading aids'/);
    expect(i18n).toMatch(/readerReadingAidsChrome: 'Βοηθήματα ανάγνωσης'/);
  });

  it('primary CTA is Study via PrimaryCTA; Ask Tutor demoted to ⋯', () => {
    expect(reader).toContain('data-testid="reader-section-study"');
    expect(reader).toContain('PrimaryCTA');
    expect(reader).toContain("t('readerSectionStudy')");
    expect(reader).toContain('data-testid="reader-section-ask-agent"');
    expect(reader).toContain('reader-section-more-menu');
    expect(i18n).toMatch(/readerSectionStudy: 'Study'/);
    expect(i18n).toMatch(/readerSectionStudy: 'Μελέτη'/);
    expect(i18n).toMatch(/readerAskAgentBtn: 'Ask Tutor'/);
    expect(i18n).toMatch(/readerAskAgentBtn: 'Ρώτα τον βοηθό'/);
    expect(i18n).not.toMatch(/readerAskAgentBtn: 'Ask Agent'/);
  });

  it('section chips do not mid-slice labels with .slice(0, 36)', () => {
    expect(reader).not.toMatch(/item\.label\.slice\(0,\s*36\)/);
    expect(reader).not.toMatch(/activeSectionLabel\.slice\(0,\s*40\)/);
  });

  it('purpose + empty + guide drop workspace-step / source-text repo tone', () => {
    expect(spine).toMatch(/Read your notes for this step/);
    expect(spine).toMatch(/Διάβασε τις σημειώσεις για αυτό το βήμα/);
    expect(spine).not.toMatch(/aligned to the active workspace step/);
    expect(registry).toMatch(/Read your notes for this step/);
    expect(registry).toMatch(/Διάβασε τις σημειώσεις για αυτό το βήμα/);
    expect(registry).not.toMatch(/desc: 'Source text'/);
    expect(empty).toMatch(/Nothing readable for this step yet/);
    expect(empty).toMatch(/Δεν υπάρχει ακόμα κείμενο για αυτό το βήμα/);
    expect(guide).toMatch(/Read the passage for this step/);
    expect(guide).toMatch(/Use Study when a section clicks/);
  });
});
