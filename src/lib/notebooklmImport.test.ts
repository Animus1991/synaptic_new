import { describe, it, expect } from 'vitest';
import {
  buildNotebookLmUploadedFile,
  parseNotebookLmExport,
  parseNotebookLmQuizCards,
} from './notebooklmImport';

describe('notebooklmImport', () => {
  it('parses study guide markdown with title', () => {
    const raw = `# Statistical Methods

## Range
The range is max minus min.`;

    const result = parseNotebookLmExport(raw);
    expect(result.title).toBe('Statistical Methods');
    expect(result.kind).toBe('study-guide');
    expect(result.markdown).toContain('Range');
  });

  it('parses Q/A quiz blocks', () => {
    const raw = `Q: What is range?
A: Maximum minus minimum.

Q: Define variance.
A: Average squared deviation from the mean.`;

    const cards = parseNotebookLmQuizCards(raw);
    expect(cards).toHaveLength(2);
    expect(cards[0]!.front).toContain('range');
    expect(cards[0]!.back).toContain('Maximum');
  });

  it('builds UploadedFile with notebooklm ingest method', () => {
    const result = parseNotebookLmExport('# Demo\n\nBody text.');
    const file = buildNotebookLmUploadedFile(result);
    expect(file.ingestMethod).toBe('notebooklm-import');
    expect(file.type).toBe('md');
    expect(file.extractedText).toContain('Body text');
  });

  it('detects mixed quiz + notes', () => {
    const raw = `# Review pack

Some notes here with enough prose to qualify as study material beyond the quiz block alone.

Q: Test?
A: Answer one.`;

    const result = parseNotebookLmExport(raw);
    expect(result.kind).toBe('mixed');
    expect(result.quizCards.length).toBe(1);
  });
});
