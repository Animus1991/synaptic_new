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

  it('exports span excerpt in markdown', () => {
    const md = exportAnnotationsMarkdown('notes.md', ['Price elasticity measures demand.'], [{
      id: '2',
      type: 'highlight',
      text: '',
      color: '#818cf8',
      lineStart: 0,
      lineEnd: 0,
      charStart: 6,
      charEnd: 16,
    }]);
    expect(md).toContain('span');
    expect(md).toContain('elasticity');
  });
});
