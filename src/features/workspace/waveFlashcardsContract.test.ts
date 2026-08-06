/**
 * Wave FC — Flashcards (Leitner) warm densify (screenshot-grounded)
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

describe('Wave FC — Flashcards productization', () => {
  const panel = read('components/workspace/LeitnerPanel.tsx');
  const box = read('components/workspace/LeitnerBox.tsx');
  const spine = read('lib/workspaceToolS20Spine.ts');
  const guide = read('lib/workspaceToolGuide.ts');
  const empty = read('lib/workspaceEmptyState.ts');
  const i18n = read('lib/i18n.ts');
  const labels = read('lib/workspaceConceptPanelLabels.ts');
  const registry = read('lib/workspaceToolRegistry.ts');

  it('purpose is warm learner copy (no spaced-repetition / passage jargon)', () => {
    expect(spine).toMatch(/Flip a card, say the answer/);
    expect(spine).toMatch(/Γύρισε την κάρτα/);
    expect(spine).not.toMatch(/Spaced-repetition flashcards grounded/);
    expect(spine).not.toMatch(/spaced repetition από αποσπάσματα/);
  });

  it('how-to is friendly and card-first', () => {
    expect(guide).toMatch(/Tap a card, try to recall/);
    expect(guide).toMatch(/Πάτα μια κάρτα/);
    expect(guide).not.toMatch(/Long-term retention through spaced repetition/);
  });

  it('chrome labels drop FSRS / deck jargon for learners', () => {
    expect(i18n).toMatch(/Find cards & options/);
    expect(i18n).toMatch(/Βρες κάρτες & επιλογές/);
    expect(i18n).toMatch(/What is due next/);
    expect(i18n).toMatch(/Τι είναι για σήμερα/);
    expect(i18n).not.toMatch(/Queues & FSRS/);
    expect(i18n).not.toMatch(/Ουρές & FSRS/);
    expect(i18n).not.toMatch(/Leitner Box — FSRS/);
    expect(i18n).toMatch(/Due today/);
    expect(i18n).not.toMatch(/FSRS due queue/);
  });

  it('passage warn and empty are warm, not repo-toned', () => {
    expect(i18n).toMatch(/still quite general/);
    expect(i18n).toMatch(/ακόμα αρκετά γενικές/);
    expect(i18n).not.toMatch(/Cards are passage-grounded \(generic concept\)/);
    expect(empty).toMatch(/No cards yet/);
    expect(empty).toMatch(/Δεν υπάρχουν ακόμα κάρτες/);
  });

  it('panel is card-first: compact meta + soft warn + collapsed filters', () => {
    expect(panel).toContain('data-testid="leitner-card-count"');
    expect(panel).toContain('data-testid="leitner-filters-chrome"');
    expect(panel).toContain('alwaysCollapse');
    expect(panel).toMatch(/text-text-secondary/);
    expect(panel).toContain('leitner-weak-extraction');
  });

  it('box demotes reset/Anki to ⋯; flip hint; queues nested; no Layers title', () => {
    expect(box).toContain('data-testid="leitner-flip-card"');
    expect(box).toContain('leitnerTapToFlip');
    expect(box).toContain('data-testid="leitner-reset-deck"');
    expect(box).toContain('data-testid="leitner-queues-chrome"');
    expect(box).toContain('leitner-deck-menu');
    expect(box).not.toMatch(/from '@\/lib\/lucide-shim'[\s\S]*Layers/);
    expect(box).not.toMatch(/<Layers/);
  });

  it('shell labels say Flashcards with warm registry desc', () => {
    expect(labels).toMatch(/leitner: \{ en: 'Flashcards'/);
    expect(registry).toMatch(/Quick recall practice/);
    expect(registry).toMatch(/Γρήγορη εξάσκηση ανάκλησης/);
  });
});
