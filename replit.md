# Synapse Learning

An AI-powered adaptive learning platform: upload your notes, PDFs, slides, or YouTube videos — Synapse builds a personalized tutor-course then adapts to how you actually learn through your behavior, errors, and progress.

## Run & Operate

- `pnpm --filter @workspace/synapse run dev` — run the Synapse frontend (port 22167, preview at `/`)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, at `/api`)
- `pnpm run typecheck` — full typecheck across all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite 7 + Tailwind CSS v4
- Animation: Framer Motion
- PDF parsing: pdfjs-dist, Tesseract.js (OCR), mammoth (DOCX)
- Code editor: CodeMirror + @uiw/react-codemirror
- Diagrams: Mermaid, KaTeX (math)
- AI/Retrieval: BM25 RAG (no external API needed for core features)
- State: Zustand-like custom store (useStore.ts) with localStorage + IndexedDB persistence
- i18n: Greek / English bilingual

## Where things live

- `artifacts/synapse/src/` — all frontend source
- `artifacts/synapse/src/App.tsx` — root routing and view orchestration
- `artifacts/synapse/src/store/useStore.ts` — central state (1700+ lines)
- `artifacts/synapse/src/lib/` — 200+ utility/library files
- `artifacts/synapse/src/components/` — UI components
- `artifacts/synapse/src/components/workspace/` — 11-tool Study Workspace
- `artifacts/synapse/src/index.css` — design tokens (Tailwind CSS v4 `@theme`)
- `artifacts/synapse/src/types/` — TypeScript types

## Architecture decisions

- **Fully client-side**: All learning logic, FSRS spaced repetition, BM25 RAG, and course generation run in the browser. No backend required for core functionality.
- **Custom CSS design tokens**: Uses Tailwind v4 `@theme` with `--color-brand-*`, `--color-surface-*`, `--color-text-*`, `--color-border-*` tokens instead of shadcn.
- **`@xenova/transformers` and `pyodide` are stubbed**: Both packages are unavailable in this environment. `localEmbedder.ts` returns null (falls back to BM25 lexical retrieval). `pyodideRunner.ts` returns error messages. All other functionality is unaffected.
- **Internal view routing**: Uses an internal `AppView` state (not react-router/wouter) for view transitions.
- **11-tool Study Workspace**: CognitiveReader, QuizPanel, LeitnerPanel, SimulatorPanel, WhiteboardPanel, DebatePanel, ComparePanel, TimerPanel, FeynmanCheck, DraggableConceptMap, DashboardPanel.

## Product

- Upload PDFs, DOCX, PPTX, YouTube URLs → AI extracts text and builds a structured course
- 11-tool adaptive study workspace grounded in uploaded content
- FSRS spaced repetition, Leitner flashcards, quiz IRT scoring
- BM25 RAG agent for source-grounded Q&A
- Greek/English bilingual UI
- Teacher dashboard, analytics, course library
- Light/dark theme with system preference detection

## Gotchas

- `@xenova/transformers` blocked by Replit package firewall (uses protobufjs). Stubbed in `localEmbedder.ts`.
- `pyodide` excluded from package.json (requires postinstall script to copy WASM files). Stubbed in `pyodideRunner.ts`.
- The CSS uses Tailwind v4 `@theme` tokens — do NOT add shadcn/radix CSS variables.
- The original repo uses `react: 19.2.6` but workspace catalog pins `react: 19.1.0` — using catalog version to avoid conflicts.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._
