# Bundle / lazy budgets (B4)

## Heavy libs (must stay out of Landing / Dashboard / main entry)

| Library | Load path | Chunk name (manualChunks) |
|---------|-----------|---------------------------|
| Pyodide | `pyodideRunner` dynamic | `pyodide` |
| Tesseract.js | `bilingualOcrEnsemble` dynamic | `tesseract` |
| HF transformers | `localEmbedder` / `handwritingOcr` dynamic | `transformers` |
| pdfjs-dist | `pdfExtract` / OCR helpers dynamic | `pdf` |
| mermaid | `MermaidDiagram` → lazy Inner | `mermaid` |
| sql.js | `ankiApkg` dynamic | `sqljs` |

Contract: `src/lib/heavyLibLazyGuard.test.ts`.

## Workspace entry budget

Prefetch targets (see `workspace-entry-chunks.json` from Vite plugin):

- StudyWorkspace / CognitiveReader / workspace.worker only — not Landing/Dashboard initial graph.

Soft budgets (track via `npm run build:analyze` → `dist/stats.html`):

| Surface | Soft budget (gzip JS, approximate) |
|---------|-------------------------------------|
| Initial Landing graph | ≤ 450 kB |
| Dashboard route chunk | ≤ 350 kB |
| Workspace entry (prefetch set) | document in PR notes |

## CI

`ANALYZE=1 npm run build:analyze` uploads `dist/stats.html` as a PR artifact (`bundle-visualizer` job).
