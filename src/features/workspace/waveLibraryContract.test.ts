/**
 * Wave H4 — Library densify: upload-first + nested Find/Tools + warm purpose
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

describe('Wave H4 — Library productization', () => {
  const library = read('components/Library.tsx');
  const i18n = read('lib/i18n.ts');

  it('is full-bleed work surface (page + work surface + drop zones)', () => {
    expect(library).toContain('data-testid="library-page"');
    expect(library).toContain('data-testid="library-work-surface"');
    expect(library).toContain('data-bleed="full"');
    expect(library).toContain('data-testid="library-drop-zone"');
    expect(library).toContain('data-testid="library-drop-zone-compact"');
    expect(library).toMatch(/library-drop-zone-compact[\s\S]{0,200}data-bleed="full"|data-bleed="full"[\s\S]{0,200}library-drop-zone-compact/);
  });

  it('upload-first: compact drop strip before course grid; PrimaryCTA Upload', () => {
    expect(library).toContain('PrimaryCTA');
    expect(library).toContain('data-testid="library-upload"');
    expect(library).toContain("t('libUpload'");
    const compactIdx = library.indexOf('data-testid="library-drop-zone-compact"');
    const gridIdx = library.indexOf("viewMode === 'grid'");
    expect(compactIdx).toBeGreaterThan(-1);
    expect(gridIdx).toBeGreaterThan(-1);
    expect(compactIdx).toBeLessThan(gridIdx);
  });

  it('nests Find courses + Tools & tips + Alerts + Topics closed by default', () => {
    expect(library).toContain('data-testid="library-find-chrome"');
    expect(library).toContain('data-testid="library-extras-chrome"');
    expect(library).toContain('data-testid="library-quality-alerts-chrome"');
    expect(library).toContain('data-testid="library-topics-chrome"');
    expect(library).toMatch(/library-find-chrome[\s\S]{0,80}alwaysCollapse|alwaysCollapse[\s\S]{0,80}library-find-chrome/);
    expect(library).toMatch(/library-extras-chrome[\s\S]{0,80}alwaysCollapse|alwaysCollapse[\s\S]{0,80}library-extras-chrome/);
    expect(library).toMatch(/library-quality-alerts-chrome[\s\S]{0,80}alwaysCollapse|alwaysCollapse[\s\S]{0,80}library-quality-alerts-chrome/);
    expect(library).toMatch(/library-topics-chrome[\s\S]{0,80}alwaysCollapse|alwaysCollapse[\s\S]{0,80}library-topics-chrome/);
    expect(library).not.toMatch(/library-quality-alerts-chrome[\s\S]{0,120}defaultOpen/);
    expect(i18n).toMatch(/libraryFindChrome: 'Find courses'/);
    expect(i18n).toMatch(/libraryFindChrome: 'Βρες μαθήματα'/);
    expect(i18n).toMatch(/libraryTopicsChrome: 'Topics & examples'/);
    expect(i18n).toMatch(/libraryTopicsChrome: 'Θέματα & παραδείγματα'/);
  });

  it('warm purpose EN+EL (upload-first; no study-mode / workspace / generated-course jargon)', () => {
    expect(i18n).toMatch(/librarySubtitle: 'Upload notes — Synapse turns them into courses you can open and study\.'/);
    expect(i18n).toMatch(/librarySubtitle: 'Ανέβασε σημειώσεις — το Synapse τις κάνει μαθήματα που ανοίγεις και μελετάς\.'/);
    expect(i18n).toMatch(/libraryEmptyCoursesTitle: 'Start with one file'/);
    expect(i18n).toMatch(/libraryEmptyCoursesTitle: 'Ξεκίνα με ένα αρχείο'/);
    expect(i18n).not.toMatch(/librarySubtitle: '.*study mode/);
    expect(i18n).not.toMatch(/libraryEmptyCoursesTitle: 'Ξεκίνα με ένα upload'/);
    expect(i18n).not.toMatch(/libraryEmptyCoursesDescription: '.*workspace\.'/);
    expect(i18n).not.toMatch(/libraryEmptyFilesDescription: '.*generated course/);
  });
});
