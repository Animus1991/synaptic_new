/**
 * Wave I1 + remaining study surfaces: spectrum/light chrome parity,
 * Lesson overlay + Note analysis densify (no functionality loss).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

describe('Wave I1 — spectrum/light neutral chrome', () => {
  const clarity = read('styles/cursor-clarity.css');

  it('ports nav pill + type roles + full width to spectrum and light', () => {
    expect(clarity).toMatch(/Wave I1/);
    expect(clarity).toMatch(
      /:is\(\[data-theme="spectrum"\], \[data-theme="light"\]\) \.app-shell #platform-sidebar-nav \.platform-nav-active/,
    );
    expect(clarity).toMatch(
      /:is\(\[data-theme="spectrum"\], \[data-theme="light"\]\) \.app-shell \.ux-page-subtitle/,
    );
    expect(clarity).toMatch(
      /:is\(\[data-theme="spectrum"\], \[data-theme="light"\]\) \.app-shell #platform-main \.platform-page/,
    );
    expect(clarity).toMatch(/:is\(\[data-theme="minimal"\], \[data-theme="minimal-dark"\]\) \.app-shell #platform-sidebar-nav \.platform-nav-active/);
  });
});

describe('Wave I1 — Lesson + Note analysis chrome', () => {
  const lesson = read('components/LessonView.tsx');
  const notes = read('components/NoteAnalysisView.tsx');
  const content = read('lib/noteAnalysisContent.ts');

  it('Lesson overlay uses type tokens and shared button primitives', () => {
    expect(lesson).toContain('data-testid="lesson-page"');
    expect(lesson).toContain('data-bleed="full"');
    expect(lesson).toContain('PrimaryCTA');
    expect(lesson).toContain("t('askAgentShort')");
    expect(lesson).not.toMatch(/\btext-(base|lg)\b/);
    expect(lesson).not.toMatch(/AllCapsLabel/);
  });

  it('Note analysis uses shared CTAs and sentence-case title', () => {
    expect(notes).toContain('data-bleed="full"');
    expect(notes).toContain('PrimaryCTA');
    expect(notes).toMatch(/from '\.\/ui\/Button'/);
    expect(notes).not.toMatch(/bg-brand-600 px-4/);
    expect(notes).not.toMatch(/AllCapsLabel/);
    expect(content).toMatch(/pageTitle: 'Note analysis'/);
    expect(content).toMatch(/exploreDetails: 'More detail'/);
    expect(content).toMatch(/exploreDetails: 'Περισσότερες λεπτομέρειες'/);
  });
});
