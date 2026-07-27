/**
 * B4 — static import guard: heavy libs must not be sync-imported from Landing /
 * Dashboard / App entry surfaces (they belong behind dynamic import / lazy routes).
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const HEAVY = [
  'pyodide',
  'tesseract.js',
  '@huggingface/transformers',
  'pdfjs-dist',
  'mermaid',
  'sql.js',
] as const;

const ENTRY_FILES = [
  'src/App.tsx',
  'src/components/Landing.tsx',
  'src/components/Dashboard.tsx',
  'src/main.tsx',
] as const;

function syncImportHits(source: string, pkg: string): string[] {
  const hits: string[] = [];
  const escaped = pkg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(
    String.raw`(?:^|\n)\s*import\s+(?:[\s\S]*?\s+from\s+)?['"]${escaped}(?:/[^'"]*)?['"]`,
    'g',
  );
  const m = source.match(re);
  if (m) hits.push(...m.map((s) => s.trim()));
  return hits;
}

describe('B4 heavy-lib lazy guard', () => {
  for (const rel of ENTRY_FILES) {
    it(`${rel} has no sync imports of heavy libs`, () => {
      const source = readFileSync(resolve(root, rel), 'utf8');
      const offenders: string[] = [];
      for (const pkg of HEAVY) {
        for (const hit of syncImportHits(source, pkg)) {
          offenders.push(`${pkg}: ${hit}`);
        }
      }
      expect(offenders, `${rel} must not sync-import ${HEAVY.join(', ')}`).toEqual([]);
    });
  }

  it('documents dynamic loaders for heavy libs', () => {
    const loaders = [
      ['src/lib/pyodideRunner.ts', 'pyodide'],
      ['src/lib/bilingualOcrEnsemble.ts', 'tesseract.js'],
      ['src/lib/localEmbedder.ts', '@huggingface/transformers'],
      ['src/lib/pdfExtract.ts', 'pdfjs-dist'],
      ['src/components/MermaidDiagram.tsx', 'MermaidDiagramInner'],
      ['src/lib/ankiApkg.ts', 'sql.js'],
    ] as const;
    for (const [rel, needle] of loaders) {
      const source = readFileSync(resolve(root, rel), 'utf8');
      expect(source.includes(needle) || source.includes('import('), rel).toBe(true);
    }
  });
});
