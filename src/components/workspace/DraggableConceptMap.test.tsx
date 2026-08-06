/** @vitest-environment jsdom */
import { describe, expect, it, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { DraggableConceptMap } from './DraggableConceptMap';

afterEach(() => cleanup());

describe('DraggableConceptMap — Wave CM empty', () => {
  it('shows warm empty composer and starts a map on Add idea', () => {
    render(
      <DraggableConceptMap
        initialNodes={[]}
        initialEdges={[]}
        hasSource
        focusConcept="Game Theory Basics"
      />,
    );
    expect(screen.getByTestId('concept-map-empty-composer')).toBeTruthy();
    fireEvent.click(screen.getByTestId('concept-map-empty-start'));
    expect(screen.getByTestId('concept-map-canvas')).toBeTruthy();
    expect(screen.getByTestId('concept-map-zoom-hud')).toBeTruthy();
  });
});

describe('DraggableConceptMap — Wave CM2/CM3 nodes', () => {
  it('shows label-first idea chips with band caption (no C / raw % glyphs)', () => {
    render(
      <DraggableConceptMap
        initialNodes={[
          { id: 'a', label: 'Supply & Demand', mastery: 87, type: 'concept', x: 100, y: 100 },
          { id: 'b', label: 'Elasticity', mastery: 33, type: 'concept', x: 240, y: 100 },
        ]}
        initialEdges={[{ from: 'a', to: 'b', relation: 'related', pmi: 2.14 }]}
        hasSource
      />,
    );
    expect(screen.getByTestId('concept-map-root').getAttribute('data-bleed')).toBe('full');
    expect(screen.getAllByTestId('concept-map-node-chip').length).toBeGreaterThanOrEqual(2);
    const inners = screen.getAllByTestId('concept-map-node-inner-label');
    expect(inners.some((el) => (el.textContent ?? '').includes('Supply'))).toBe(true);
    expect(inners.every((el) => !/^[CFDT]$/.test((el.textContent ?? '').trim()))).toBe(true);
    expect(screen.queryByText('87%')).toBeNull();
    const masteryCaps = screen.getAllByTestId('concept-map-node-mastery');
    expect(masteryCaps.some((el) => el.textContent === 'Strong')).toBe(true);
    expect(masteryCaps.some((el) => el.textContent === 'Weak')).toBe(true);
    const edge = screen.getByTestId('concept-map-edge-label');
    expect(edge.textContent).toBe('~');
    expect(edge.getAttribute('data-pmi')).toBe('2.1');
  });

  it('focuses study on tap, not while dragging a node', () => {
    const onConceptSelect = vi.fn();
    render(
      <DraggableConceptMap
        initialNodes={[
          { id: 'a', label: 'Supply & Demand', mastery: 87, type: 'concept', x: 100, y: 100 },
          { id: 'b', label: 'Elasticity', mastery: 33, type: 'concept', x: 240, y: 100 },
        ]}
        initialEdges={[{ from: 'a', to: 'b', relation: 'related', pmi: 2.14 }]}
        hasSource
        onConceptSelect={onConceptSelect}
      />,
    );
    const node = screen.getAllByTestId('concept-map-node')[0]!;
    const svg = screen.getByTestId('concept-map-canvas').querySelector('svg')!;
    fireEvent.pointerDown(node, { clientX: 100, clientY: 100, pointerId: 1 });
    expect(onConceptSelect).not.toHaveBeenCalled();
    fireEvent.pointerMove(svg, { clientX: 140, clientY: 130, pointerId: 1 });
    fireEvent.pointerUp(svg, { clientX: 140, clientY: 130, pointerId: 1 });
    expect(onConceptSelect).not.toHaveBeenCalled();

    fireEvent.pointerDown(node, { clientX: 100, clientY: 100, pointerId: 2 });
    fireEvent.pointerUp(svg, { clientX: 102, clientY: 101, pointerId: 2 });
    expect(onConceptSelect).toHaveBeenCalledTimes(1);
    expect(onConceptSelect).toHaveBeenCalledWith('Supply & Demand');
  });
});

describe('DraggableConceptMap — Wave 2 (CM-03 / CM-04)', () => {

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
