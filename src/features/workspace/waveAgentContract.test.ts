/**
 * Wave AG — Agent densify: full-bleed chat + warm hierarchy
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

describe('Wave AG — Agent productization', () => {
  const agent = read('components/Agent.tsx');
  const banner = read('components/AgentContextBanner.tsx');
  const calm = read('styles/chatgpt-calm.css');
  const content = read('features/agent/agentContent.ts');
  const i18n = read('lib/i18n.ts');
  const mock = read('demo/mockData.ts');

  it('is full-bleed (page + thread + no 48rem centered column)', () => {
    expect(agent).toContain("data-testid={embedded ? 'agent-embedded' : 'agent-page'}");
    expect(agent).toContain('data-bleed="full"');
    expect(agent).toContain('data-testid="agent-thread"');
    expect(agent).toContain('max-w-none');
    expect(agent).not.toMatch(/max-w-\[85%\] sm:max-w-\[75%\]/);
    expect(agent).not.toMatch(/max-w-xl mx-auto/);
    expect(calm).toMatch(/--chat-column-max:\s*none/);
    expect(calm).toMatch(/\.agent-chat-column\s*\{[^}]*max-width:\s*none/);
  });

  it('nests Study flow + Quick actions + How answers work', () => {
    expect(agent).toContain('data-testid="agent-flow-chrome"');
    expect(agent).toContain('data-testid="agent-quick-actions-chrome"');
    expect(agent).toMatch(/agent-quick-actions-chrome[\s\S]{0,80}alwaysCollapse|alwaysCollapse[\s\S]{0,80}agent-quick-actions-chrome/);
    expect(banner).toContain('data-testid="agent-how-answers-chrome"');
    expect(banner).toContain('alwaysCollapse');
    expect(i18n).toMatch(/agentHowAnswersChrome: 'How answers work'/);
    expect(i18n).toMatch(/agentHowAnswersChrome: 'Πώς δουλεύουν οι απαντήσεις'/);
  });

  it('primary CTA is Send via PrimaryCTA', () => {
    expect(agent).toContain('data-testid="agent-send"');
    expect(agent).toContain('PrimaryCTA');
    expect(agent).toContain("t('agentSendMessage')");
  });

  it('learner copy drops LLM / source-grounded / pipeline / Strict source jargon', () => {
    expect(content).toMatch(/Ready · answers stream as they write/);
    expect(content).toMatch(/Έτοιμο · οι απαντήσεις γράφονται ζωντανά/);
    expect(content).not.toMatch(/LLM connected/);
    expect(content).toMatch(/From your notes/);
    expect(content).toMatch(/My notes only/);
    expect(content).not.toMatch(/Strict source mode/);
    expect(content).not.toMatch(/Source-grounded/);
    expect(i18n).not.toMatch(/source-grounded answers/);
    expect(i18n).not.toMatch(/Old pipeline \(v\{version\}\)/);
    expect(i18n).toMatch(/Older note version/);
    expect(i18n).toMatch(/agentJsonContext: 'Session details'/);
    expect(mock).not.toMatch(/Strict source-grounded/);
    expect(mock).toMatch(/My notes only/);
  });
});
