import { describe, it, expect } from 'vitest';
import { inferQuizProvenance, isPastPaperSource } from './quizProvenance';

describe('quizProvenance', () => {
  it('detects past paper from filename', () => {
    expect(isPastPaperSource('Panellinies 2024 Informatics.pdf')).toBe(true);
    expect(isPastPaperSource('lecture-notes.pdf')).toBe(false);
  });

  it('infers provenance from upload', () => {
    expect(inferQuizProvenance('notes.pdf', 'chapter 1')).toBe('from-notes');
    expect(inferQuizProvenance('palia themata 2023.pdf', '')).toBe('from-uploaded-past-paper');
  });
});
