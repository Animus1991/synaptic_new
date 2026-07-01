import { describe, it, expect } from 'vitest';
import { buildDocumentModelFromText } from './documentModel';

const sample = `# Newton's Laws of Motion

An object at rest stays at rest, and an object in motion stays in motion at constant velocity, unless acted upon by a net external force.

## Second Law

The acceleration of an object depends on the net force acting on it and its mass. This relationship is expressed as F = m a.

Example: A 2 kg block pushed by a 10 N force accelerates at 5 m/s².
`;

describe('documentModel', () => {
  it('builds a typed document model from text', () => {
    const doc = buildDocumentModelFromText(sample);
    expect(doc.fileName).toBe('anonymous');
    expect(doc.sections.length).toBeGreaterThan(0);
    expect(doc.spans.length).toBeGreaterThan(0);
    expect(doc.quality.wordCount).toBeGreaterThan(0);
    expect(doc.quality.sentenceCount).toBeGreaterThan(0);
  });

  it('detects subject and language', () => {
    const doc = buildDocumentModelFromText(sample);
    expect(doc.subject).toBe('Physics');
    expect(doc.language).toBe('en');
  });

  it('extracts formulas and definitions', () => {
    const doc = buildDocumentModelFromText(sample);
    expect(doc.formulas.length).toBeGreaterThan(0);
    expect(doc.entities.some((e) => e.type === 'definition')).toBe(true);
  });

  it('produces retrievable chunks', () => {
    const doc = buildDocumentModelFromText(sample);
    expect(doc.chunks.length).toBeGreaterThan(0);
    expect(doc.chunks[0]!.fileId).toBe('anonymous');
  });

  it('has deterministic IDs for the same input', () => {
    const a = buildDocumentModelFromText(sample);
    const b = buildDocumentModelFromText(sample);
    expect(a.id).toBe(b.id);
    expect(a.sections.map((s) => s.id)).toEqual(b.sections.map((s) => s.id));
  });

  it('builds a hierarchical section tree with levels and parent links', () => {
    const doc = buildDocumentModelFromText(sample);
    expect(doc.sections.length).toBeGreaterThanOrEqual(2);
    const root = doc.sections[0]!;
    const child = doc.sections.find((s) => s.heading === 'Second Law');
    expect(root.level).toBe(1);
    expect(child?.level).toBe(2);
    expect(child?.parentId).toBe(root.id);
  });

  it('tags discourse roles for sections', () => {
    const doc = buildDocumentModelFromText(sample);
    const root = doc.sections[0]!;
    const child = doc.sections.find((s) => s.heading === 'Second Law');
    expect(root.role).toBe('intro');
    expect(child?.role).toBe('body');
  });

  it('builds typed blocks and relations (v2)', () => {
    const doc = buildDocumentModelFromText(sample);
    expect(doc.blocks.length).toBeGreaterThan(0);
    expect(doc.blocks.some((b) => b.type === 'heading')).toBe(true);
    expect(doc.blocks.some((b) => b.type === 'paragraph' || b.type === 'equation')).toBe(true);
    expect(doc.quality.blockCount).toBe(doc.blocks.length);
    expect(doc.quality.relationCount).toBe(doc.relations.length);
  });

  it('mines example-of relations from example sections', () => {
    const doc = buildDocumentModelFromText(sample);
    const exampleSection = doc.sections.find((s) => s.role === 'example');
    if (exampleSection) {
      expect(doc.relations.some((r) => r.type === 'example-of')).toBe(true);
    }
  });
});
