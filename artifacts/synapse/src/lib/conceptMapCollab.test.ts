import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import {
  CONCEPT_MAP_LOCAL_ORIGIN,
  readConceptMapGraph,
  writeConceptMapGraph,
} from './conceptMapCrdt';
import {
  conceptMapDocumentName,
  parseConceptMapDocumentName,
} from './conceptMapCollab';

describe('conceptMapCollab', () => {
  it('conceptMapDocumentName round-trips via parse', () => {
    const name = conceptMapDocumentName('550e8400-e29b-41d4-a716-446655440000', 'Elasticity & demand');
    expect(parseConceptMapDocumentName(name)).toEqual({
      roomId: '550e8400-e29b-41d4-a716-446655440000',
      conceptKey: 'Elasticity & demand',
    });
  });
});

describe('conceptMapCrdt', () => {
  it('writeConceptMapGraph merges nodes and edges into Yjs maps', () => {
    const doc = new Y.Doc();
    writeConceptMapGraph(doc, {
      nodes: [{ id: 'n1', label: 'A', mastery: 0, type: 'concept', x: 1, y: 2 }],
      edges: [{ from: 'n1', to: 'n2', relation: 'related' }],
    });
    expect(readConceptMapGraph(doc)).toEqual({
      nodes: [{ id: 'n1', label: 'A', mastery: 0, type: 'concept', x: 1, y: 2 }],
      edges: [{ from: 'n1', to: 'n2', relation: 'related' }],
    });
  });

  it('writeConceptMapGraph removes deleted nodes on sync', () => {
    const doc = new Y.Doc();
    writeConceptMapGraph(doc, {
      nodes: [
        { id: 'n1', label: 'A', mastery: 0, type: 'concept', x: 0, y: 0 },
        { id: 'n2', label: 'B', mastery: 0, type: 'concept', x: 1, y: 1 },
      ],
      edges: [],
    });
    writeConceptMapGraph(doc, {
      nodes: [{ id: 'n2', label: 'B', mastery: 0, type: 'concept', x: 1, y: 1 }],
      edges: [],
    }, CONCEPT_MAP_LOCAL_ORIGIN);
    expect(readConceptMapGraph(doc).nodes.map((n) => n.id)).toEqual(['n2']);
  });
});
