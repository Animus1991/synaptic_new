import { describe, it, expect } from 'vitest';
import {
  formatConversationWithLabels,
  isLikelyChatGptExportJson,
  parseChatGptExportJson,
} from './chatGptImport';
import { detectDocumentSections } from './textSegmentation';

describe('chatGptImport', () => {
  it('detects ChatGPT export shape', () => {
    expect(isLikelyChatGptExportJson({ mapping: { a: { children: [] } }, title: 'Test' })).toBe(true);
    expect(isLikelyChatGptExportJson({ foo: 'bar' })).toBe(false);
  });

  it('formats messages with User:/Assistant: labels', () => {
    const text = formatConversationWithLabels([
      { role: 'user', content: 'Explain supply.' },
      { role: 'assistant', content: 'Supply is quantity offered.' },
    ]);
    expect(text).toContain('User: Explain supply.');
    expect(text).toContain('Assistant: Supply is quantity offered.');
  });

  it('parses legacy messages array export', () => {
    const json = JSON.stringify({
      title: 'Economics chat',
      messages: [
        { author: { role: 'user' }, content: { parts: ['What is demand?'] } },
        { author: { role: 'assistant' }, content: { parts: ['Demand is willingness to pay.'] } },
      ],
    });
    const result = parseChatGptExportJson(json);
    expect(result.conversations.length).toBe(1);
    expect(result.text).toContain('User:');
    expect(result.text).toContain('Assistant:');
    const sections = detectDocumentSections(result.text);
    expect(sections.length).toBeGreaterThanOrEqual(2);
  });

  it('parses mapping-based export in document order', () => {
    const json = JSON.stringify([{
      title: 'Mapping chat',
      create_time: 1000,
      mapping: {
        root: { children: ['n1'] },
        n1: {
          message: {
            author: { role: 'user' },
            content: { parts: ['Hello'] },
            create_time: 1001,
          },
          children: ['n2'],
        },
        n2: {
          message: {
            author: { role: 'assistant' },
            content: { parts: ['Hi there'] },
            create_time: 1002,
          },
          children: [],
        },
      },
    }]);
    const result = parseChatGptExportJson(json);
    expect(result.text.indexOf('User:')).toBeLessThan(result.text.indexOf('Assistant:'));
  });
});
