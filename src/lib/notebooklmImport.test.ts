import { describe, it, expect } from 'vitest';
import {
  buildNotebookLmUploadedFile,
  formatNotebookLmChatMarkdown,
  isNotebookLmChatTranscript,
  normalizeNotebookLmChatSpeakers,
  parseNotebookLmChatTranscript,
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

  it('parses NotebookLM chat transcript with normalized speakers', () => {
    const raw = `User: Explain elasticity.
NotebookLM: Elasticity measures responsiveness of quantity to price.
User: Give an example.
NotebookLM: Luxury goods often have elastic demand.`;

    const normalized = normalizeNotebookLmChatSpeakers(raw);
    expect(normalized).toContain('Assistant:');

    const turns = parseNotebookLmChatTranscript(raw);
    expect(turns.length).toBeGreaterThanOrEqual(4);
    expect(turns.some((t) => /elasticity/i.test(t.text))).toBe(true);

    const result = parseNotebookLmExport(raw);
    expect(result.kind).toBe('chat');
    expect(result.chatTurns.length).toBeGreaterThanOrEqual(4);
    expect(result.markdown).toContain('### User');
    expect(result.markdown).toContain('### Assistant');
  });

  it('builds chat UploadedFile with notebooklm-chat ingest method', () => {
    const raw = `User: What is GDP?
Assistant: Gross domestic product measures total output.
User: Why does it matter?
Assistant: It tracks economic growth.`;

    const result = parseNotebookLmExport(raw);
    expect(result.kind).toBe('chat');
    const file = buildNotebookLmUploadedFile(result);
    expect(file.ingestMethod).toBe('notebooklm-chat');
    expect(file.extractedTopics).toContain('notebooklm-chat');
  });

  it('formats chat markdown with title', () => {
    const md = formatNotebookLmChatMarkdown(
      [
        { speaker: 'User', text: 'Hi' },
        { speaker: 'Assistant', text: 'Hello' },
      ],
      'Demo chat',
    );
    expect(md).toContain('# Demo chat');
    expect(md).toContain('### User');
    expect(md).toContain('Hello');
  });

  it('prefers quiz over chat for FAQ-style Q/A exports', () => {
    const raw = `Q: One?
A: First.

Q: Two?
A: Second.`;

    const quizCards = parseNotebookLmQuizCards(raw);
    const chatTurns = parseNotebookLmChatTranscript(raw);
    expect(isNotebookLmChatTranscript(raw, quizCards, chatTurns)).toBe(false);
    expect(parseNotebookLmExport(raw).kind).toBe('quiz');
  });
});
