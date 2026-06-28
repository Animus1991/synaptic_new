/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { AnnotationToolbar } from './AnnotationToolbar';

describe('AnnotationToolbar', () => {
  it('renders compact toolbar with tool buttons', () => {
    const { container } = render(
      <AnnotationToolbar
        lang="en"
        sourceName="notes.txt"
        tool="highlight"
        onToolChange={() => undefined}
        activeColor="#818cf8"
        onColorChange={() => undefined}
        activeCategory="general"
        onCategoryChange={() => undefined}
        sharedCount={0}
        syncLive={false}
        syncMode="poll"
        syncVersion={0}
        canExport={false}
        onExportMd={() => undefined}
        sourceViewerLabel="Source"
        highlightLabel="Highlight"
        commentLabel="Comment"
        pinLabel="Pin"
      />,
    );
    expect(container.querySelector('[data-testid="annotation-toolbar"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="annotation-tool-highlight"]')).not.toBeNull();
    expect(container.querySelector('.ws-panel-toolbar')).not.toBeNull();
  });
});
