import { describe, it, expect } from 'vitest';
import { buildDeleteFileCascadeCopy } from './deleteFileCascadeCopy';

describe('deleteFileCascadeCopy', () => {
  it('describes reprocess path when other files remain', () => {
    const copy = buildDeleteFileCascadeCopy({
      lang: 'en',
      fileName: 'notes.pdf',
      remainingFilesForCourse: 2,
      generatedTaskCount: 5,
      glossaryCount: 12,
    });
    expect(copy.title).toContain('notes.pdf');
    expect(copy.description).toContain('reprocessed from the 2 remaining');
    expect(copy.description).toContain('flagged as outdated');
    expect(copy.description).not.toContain('5 auto-generated');
  });

  it('describes full cascade when last file is removed', () => {
    const copy = buildDeleteFileCascadeCopy({
      lang: 'en',
      fileName: 'only.pptx',
      courseTitle: 'Macro',
      remainingFilesForCourse: 0,
      generatedTaskCount: 3,
      glossaryCount: 8,
    });
    expect(copy.description).toContain('3 auto-generated tasks');
    expect(copy.description).toContain('8 glossary terms');
    expect(copy.description).toContain('Macro');
  });

  it('supports Greek copy', () => {
    const copy = buildDeleteFileCascadeCopy({
      lang: 'el',
      fileName: 'σημειώσεις.pdf',
      remainingFilesForCourse: 0,
      generatedTaskCount: 1,
      glossaryCount: 0,
    });
    expect(copy.title).toContain('σημειώσεις.pdf');
    expect(copy.description).toContain('δεν αναιρείται');
  });
});
