/** @vitest-environment jsdom */
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { DraggableConceptMap } from './DraggableConceptMap';

afterEach(() => cleanup());

describe('DraggableConceptMap — Wave 2 (CM-03 / CM-04)', () => {
  it('renders PMI score on related edge labels', () => {
    render(
      <DraggableConceptMap
        initialNodes={[
          { id: 'a', label: 'Supply', mastery: 60, type: 'concept', x: 100, y: 100 },
          { id: 'b', label: 'Demand', mastery: 50, type: 'concept', x: 240, y: 100 },
        ]}
        initialEdges={[{ from: 'a', to: 'b', relation: 'related', pmi: 2.14 }]}
        hasSource
      />,
    );
    const label = screen.getByTestId('concept-map-edge-label');
    expect(label.textContent).toContain('2.1');
    expect(label.getAttribute('data-pmi')).toBe('2.1');
  });

  it('exposes screen-reader tree with aria-level', () => {
    render(
      <DraggableConceptMap
        initialNodes={[
          { id: 'root', label: 'Markets', mastery: 70, type: 'concept', x: 120, y: 80 },
          { id: 'child', label: 'Price', mastery: 40, type: 'concept', x: 120, y: 180 },
        ]}
        initialEdges={[{ from: 'root', to: 'child', relation: 'prerequisite' }]}
        hasSource
      />,
    );
    const tree = screen.getByTestId('concept-map-node-tree');
    expect(tree.getAttribute('role')).toBe('tree');
    const items = tree.querySelectorAll('[role="treeitem"]');
    expect(items.length).toBe(2);
    expect(items[0]!.getAttribute('aria-level')).toBeTruthy();
    expect(items[0]!.getAttribute('aria-posinset')).toBe('1');
    expect(items[0]!.getAttribute('aria-setsize')).toBe('2');
  });
});
