import { describe, expect, it } from 'vitest';
import { formatUploadSuccessToast, summarizeUploadStructure } from './uploadStructureSummary';

const CHAT_EXPORT = `
User: What is elasticity?
Assistant: Elasticity measures responsiveness of quantity to price changes.

User: Give an example.
Assistant: If price rises 10% and quantity falls 20%, elasticity is -2.

# Supply and Demand
Supply rises when producers can sell more at higher prices.
`.trim();

describe('uploadStructureSummary', () => {
  it('counts conversation turns and sections', () => {
    const summary = summarizeUploadStructure(CHAT_EXPORT, 'en');
    expect(summary.conversationTurns).toBeGreaterThanOrEqual(2);
    expect(summary.sectionCount).toBeGreaterThanOrEqual(1);
  });

  it('formats bilingual toast messages', () => {
    const summary = { conversationTurns: 4, sectionCount: 6, structureKind: 'conversation' };
    expect(formatUploadSuccessToast(summary, 'en')).toBe('4 conversations, 6 sections detected');
    expect(formatUploadSuccessToast(summary, 'el')).toBe('4 συνομιλίες, 6 ενότητες ανιχνεύθηκαν');
  });

  it('omits conversation clause when no turns detected', () => {
    const summary = summarizeUploadStructure('# Only headings\n\nParagraph one.\n\nParagraph two.', 'en');
    expect(formatUploadSuccessToast(summary, 'en')).toMatch(/sections detected/);
    expect(formatUploadSuccessToast(summary, 'en')).not.toMatch(/conversations/);
  });
});
