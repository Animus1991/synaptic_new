import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildDocumentModelInWorker,
  resetDocumentModelWorkerForTests,
} from './documentModelWorkerClient';

const sample = `# Topic One

First paragraph about energy.

## Subtopic

Second paragraph with F = m a.
`;

describe('documentModelWorkerClient', () => {
  beforeEach(() => {
    resetDocumentModelWorkerForTests();
  });

  it('falls back to sync build when Worker is unavailable', async () => {
    const model = await buildDocumentModelInWorker({
      text: sample,
      file: {
        id: 'file-test-1',
        name: 'notes.md',
        type: 'md',
        size: sample.length,
      },
    });
    expect(model.fileId).toBe('file-test-1');
    expect(model.sections.length).toBeGreaterThan(0);
    expect(model.blocks.length).toBeGreaterThan(0);
  });
});
