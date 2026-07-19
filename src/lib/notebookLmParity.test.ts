import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  getNotebookLmParityOverride,
  resolveNotebookLmParity,
  setNotebookLmParityOverride,
} from './notebookLmParity';

describe('notebookLmParity', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setNotebookLmParityOverride(null);
  });

  it('honors local override over defaults', () => {
    setNotebookLmParityOverride(true);
    expect(getNotebookLmParityOverride()).toBe(true);
    expect(resolveNotebookLmParity()).toBe(true);
    setNotebookLmParityOverride(false);
    expect(resolveNotebookLmParity()).toBe(false);
  });
});
