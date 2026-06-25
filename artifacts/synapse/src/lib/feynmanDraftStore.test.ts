import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadFeynmanDraft, saveFeynmanDraft } from './feynmanDraftStore';

describe('feynmanDraftStore', () => {
  const memory = new Map<string, string>();

  beforeEach(() => {
    memory.clear();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => { memory.set(key, value); },
      removeItem: (key: string) => { memory.delete(key); },
    });
  });

  it('persists and loads drafts per scope key', () => {
    const scope = 'task-elasticity';
    saveFeynmanDraft(scope, 'My explanation draft.');
    expect(loadFeynmanDraft(scope)).toBe('My explanation draft.');
    saveFeynmanDraft(scope, '');
    expect(loadFeynmanDraft(scope)).toBe('');
  });
});
