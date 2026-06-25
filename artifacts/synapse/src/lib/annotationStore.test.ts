import { describe, expect, it } from 'vitest';
import { exportAnnotationsMarkdown } from './annotationStore';

describe('annotationStore', () => {
  it('exports markdown with margin notes', () => {
    const md = exportAnnotationsMarkdown('notes.md', ['line one', 'line two'], [
      { id: '1', type: 'comment', text: 'margin', color: '#fff', lineStart: 0, lineEnd: 0, focusTerm: 'elasticity' },
    ]);
    expect(md).toContain('elasticity');
    expect(md).toContain('margin');
  });
});
