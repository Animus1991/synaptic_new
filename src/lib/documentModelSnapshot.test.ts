import { describe, it, expect } from 'vitest';
import {
  attachDocumentSnapshots,
  recognizeDocumentModelsForUpload,
} from './uploadPipeline';
import { snapshotFromText } from './documentModelSnapshot';
import type { UploadedFile } from '../types';

const SAMPLE = `# Thermodynamics

Heat is energy transferred due to temperature difference.

## First Law

Energy cannot be created or destroyed. The change in internal energy equals heat minus work.
`;

function mockFile(id: string, text: string): UploadedFile {
  return {
    id,
    name: 'notes.md',
    type: 'md',
    size: text.length,
    uploadedAt: new Date().toISOString(),
    status: 'analyzed',
    extractedText: text,
  };
}

describe('recognizeDocumentModelsForUpload', () => {
  it('builds per-file snapshots and course summary', async () => {
    const files = [mockFile('f1', SAMPLE)];
    const result = await recognizeDocumentModelsForUpload(files, SAMPLE, 'en');
    expect(result.byFileId.has('f1')).toBe(true);
    expect(result.courseSummary?.sectionCount).toBeGreaterThan(0);
    expect(result.courseSummary?.conceptCount).toBeGreaterThan(0);
  });

  it('attaches snapshots to uploaded files', () => {
    const snapshot = snapshotFromText(SAMPLE, { id: 'f1', name: 'notes.md', type: 'md' });
    const files = [mockFile('f1', SAMPLE)];
    const attached = attachDocumentSnapshots(files, { byFileId: new Map([['f1', snapshot]]) });
    expect(attached[0]!.documentModelSnapshot?.fileId).toBe('f1');
    expect(attached[0]!.documentModelSnapshot?.quality.blockCount).toBeGreaterThan(0);
  });
});
