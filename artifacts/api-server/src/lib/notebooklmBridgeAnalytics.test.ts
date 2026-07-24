import { describe, it, expect } from 'vitest';
import {
  buildNotebookLmBridgeCell,
  buildNotebookLmCohortHeatmap,
  isNotebookLmIngestMethod,
  summarizeNotebookLmFiles,
} from './notebooklmBridgeAnalytics';

describe('notebooklmBridgeAnalytics', () => {
  it('detects notebooklm ingest methods', () => {
    expect(isNotebookLmIngestMethod('notebooklm-import')).toBe(true);
    expect(isNotebookLmIngestMethod('notebooklm-chat')).toBe(true);
    expect(isNotebookLmIngestMethod('paste')).toBe(false);
  });

  it('summarizes files by artifact kind', () => {
    const totals = summarizeNotebookLmFiles([
      { ingestMethod: 'notebooklm-import' },
      { ingestMethod: 'notebooklm-chat' },
      { ingestMethod: 'notebooklm-audio-transcript' },
      { ingestMethod: 'paste' },
    ]);
    expect(totals).toEqual({ import: 1, chat: 1, audio: 1 });
  });

  it('filters by class courseId when provided', () => {
    const totals = summarizeNotebookLmFiles(
      [
        { ingestMethod: 'notebooklm-import', courseId: 'c1' },
        { ingestMethod: 'notebooklm-chat', courseId: 'c2' },
      ],
      'c1',
    );
    expect(totals.import).toBe(1);
    expect(totals.chat).toBe(0);
  });

  it('builds cohort heatmap from student cells', () => {
    const students = [
      buildNotebookLmBridgeCell(
        { id: 'e1', classId: 'cls', studentEmail: 'a@test.edu', enrolledAt: '' },
        [{ ingestMethod: 'notebooklm-import' }],
      ),
      buildNotebookLmBridgeCell(
        { id: 'e2', classId: 'cls', studentEmail: 'b@test.edu', enrolledAt: '' },
        [],
      ),
    ];
    const hm = buildNotebookLmCohortHeatmap('cls', 'Bio', students);
    expect(hm.studentsWithImports).toBe(1);
    expect(hm.totalImports).toBe(1);
    expect(hm.artifactTotals.import).toBe(1);
  });
});
