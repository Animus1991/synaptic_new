# Synapse Learning — Exhaustive Product-Scale Blueprint

> **Scope:** `C:\Users\anast\.cursor\projects\C-Users-anast-AppData-Local-Temp-c2ac0b3d-a59c-4dd0-a69e-116aa07b0c50\synapse-learning` only.  
> **Purpose:** The most rigorous, evidence-based, omission-free audit of every project Markdown file and a concrete, product-scale blueprint for every page, tool, algorithm, and backend surface. This document is written to be the single source of truth for taking Synapse from its current ~80% post-MVP state to a state-of-the-art, note-grounded adaptive learning platform.  
> **Methodology:** Each MD file was read in full and cross-checked against the actual source tree (`src/lib/`, `src/components/`, `src/store/`, `server/`). Claims are annotated with file/function pointers so they can be verified without re-discovery. The plan is sequenced by dependency and value, with explicit acceptance criteria for every item. No shortcuts, no omissions, no illusions of capability.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Scientific Audit of all Markdown Files](#2-scientific-audit-of-all-markdown-files)
3. [North-Star Architecture: The Document Model](#3-north-star-architecture-the-document-model)
4. [Workstream A: Content Recognition & Course Creation (Primary Emphasis)](#4-workstream-a-content-recognition--course-creation-primary-emphasis)
5. [Workstream B: Study Workspace UI/UX (Primary Emphasis)](#5-workstream-b-study-workspace-uiux-primary-emphasis)
6. [Workstream C: Phase 6 Backend to Production Scale](#6-workstream-c-phase-6-backend-to-production-scale)
7. [Cross-Cutting Concerns](#7-cross-cutting-concerns)
8. [Per-Surface / Per-Page Enrichment Plan](#8-per-surface--per-page-enrichment-plan)
9. [Phased Execution Roadmap](#9-phased-execution-roadmap)
10. [Risks, Metrics & Appendices](#10-risks-metrics--appendices)

---

## 1. Executive Summary

### 1.1 Baseline verdict

Synapse Learning is already **past MVP**. The codebase contains a working client (Vite + React + TypeScript), a real Node/Express server, Postgres persistence, Stripe billing, OCR, NER, semantic RAG, a teacher aggregate endpoint, refresh/reset token flows, and per-account rate limiting. The biggest problems are not missing foundations but **depth, documentation fidelity, and a few correctness defects**.

### 1.2 Three highest-leverage opportunities

1. **Content recognition & course creation** — The offline engine (`contentAnalysis.ts`) is strong, but it still flattens rich documents to text, depends on a proxy for embeddings/clustering, and lacks a typed `DocumentModel`. Upgrading this to layout-aware, offline-embedder, typed-knowledge-graph recognition is the single biggest product differentiator.
2. **Study Workspace UI/UX** — The 11 tools are functional but not delightful or powerful. Upgrading the shell, adding cross-tool deep links, TTS, CAS, LaTeX, canvas editing, and WCAG 2.2 AA is the highest-touch user impact.
3. **Backend hardening** — The server exists; it needs secrets vaulting, distributed rate limiting, pgvector RAG, a teacher/class UI, async job queue, and production IaC.

### 1.3 Guiding principles (non-negotiable)

1. **Subject-agnostic.** No hardcoded domain vocabulary on any production path.
2. **Deterministic.** Same notes → same course. Seeded randomness, no uncontrolled sampling.
3. **Citable.** Every concept, claim, quiz item, and lesson panel points to a source span.
4. **Offline-first.** Every core capability runs without a proxy; the server only upgrades quality.
5. **Grounded.** LLM output is verified against source spans before display.
6. **Accessible.** WCAG 2.2 AA is release-blocking, not a polish step.
7. **Bilingual.** Every user-facing string flows through `i18n.ts` (EN/EL).
8. **Measured.** Every algorithm ships with a gold-set eval + metric.
9. **Privacy-first.** Local-first storage, explicit sync consent, export/delete.
10. **Honest.** Partial features are marked `[PARTIAL]` in docs and have a tracked task.

---

## 2. Scientific Audit of all Markdown Files

### 2.1 Audit method

Every `.md` file in the project root, `server/`, and `e2e/` (where present) was read in full. Third-party vendored files (e.g., `public/pyodide/README.md`) are excluded from the project-documentation scope. Each file was scored on four axes:

- **Accuracy:** Do its claims match the current code?
- **Completeness:** Does it cover the surface it purports to cover?
- **Clarity:** Is it usable by a new contributor without re-discovery?
- **Product-scale readiness:** Does it expose the gaps that must be closed?

Scores are on a 0–5 scale. Evidence is cited with absolute file paths and line ranges where possible.

### 2.2 Per-file verdicts

| File | Accuracy | Completeness | Clarity | Product-Scale | Verdict | Key gaps / drift |
| ---- | -------- | ------------ | ------- | ------------- | ------- | ---------------- |
| `README.md` | 5 | 4 | 5 | 4 | Strong | Missing OCR + advanced server endpoints in the quick feature list; tool count may need updating if tools are added. |
| `ARCHITECTURE.md` | 4 | 4 | 5 | 4 | Good | `processUpload` location is wrong (says `uploadPipeline.ts`, actually in `src/store/useStore.ts`); undocumented NER/clustering/section-binding/provenance stages; `server/` table omits `nlp/rag/ocr/teacher`. |
| `ALGORITHMS.md` | 5 | 4 | 5 | 4 | Best doc | Missing §2.8 NER, §2.9 embedding clustering, §2.10 concept→section binding, §5.5 concept provenance; OCR is live but still listed in roadmap §13. |
| `AGENT_RAG.md` | 4 | 4 | 5 | 4 | Good | Correctly documents optional `POST /v1/rag/query` after reconciliation; before that it was wrong. |
| `CONTENT_PIPELINE.md` | 5 | 4 | 5 | 4 | Good | Correctly marks OCR as live; audio/Whisper remains the only genuinely missing ingestion mode. |
| `STUDY_WORKSPACE.md` | 5 | 4 | 5 | 3 | Accurate but shallow | Does not document planned tool upgrades (TTS, CAS, LaTeX, canvas editing, sub-line annotations); needs expansion once Workstream B lands. |
| `API.md` | 5 | 4 | 5 | 4 | Good | Now includes auth refresh/reset, nlp/entities, ocr/pages, rag/query, teacher/dashboard after reconciliation; still needs exact request/response schema for some advanced endpoints. |
| `SECURITY.md` | 5 | 4 | 4 | 4 | Good | Correctly lists rate-limit + refresh/reset as in place; roadmap items are still relevant (email verify, OAuth, distributed limiter, audit logs). |
| `DEPLOYMENT.md` | 5 | 4 | 5 | 4 | Good | Missing Helm/Compose example, OCR resource notes, `RATE_LIMIT_RPM` documentation. |
| `PERSISTENCE.md` | 5 | 4 | 5 | 4 | Good | Should document `Course.conceptSpans` and future `Course.conceptGraph`. |
| `ROADMAP.md` | 4 | 4 | 4 | 4 | Good but stale | Needs to re-baseline completion percentages and move OCR/server-RAG/teacher/rate-limit/refresh-tokens to "done". |
| `CHANGELOG.md` | 5 | 4 | 5 | 3 | Good discipline | Needs backfill for OCR, NER, server RAG, teacher, rate-limit, refresh tokens. |
| `CONTRIBUTING.md` | 5 | 4 | 5 | 4 | Strong | Should cite the D9 hardcoded-vocab defect as the cautionary example for the no-hardcoded-vocab rule. |
| `TESTING.md` | 5 | 4 | 4 | 4 | Accurate | Needs expansion once the eval harness, E2E CI, server integration tests, and a11y tests land. |
| `I18N.md` | 5 | 3 | 4 | 3 | Accurate | ~35% coverage; must track to 100% per product-scale bar. |
| `PRODUCT_SCALE_PLAN.md` | 5 | 5 | 5 | 5 | Comprehensive | Already the most complete plan; this blueprint extends it with a formal audit table and more per-page/per-tool detail. |
| `ENHANCEMENT_PLAN.md` | 4 | 4 | 4 | 4 | Good | Overlaps with `PRODUCT_SCALE_PLAN.md`; contains useful priorities but lacks the code-level file pointers and sequencing. |
| `server/README.md` | 5 | 4 | 5 | 4 | Good | Correctly lists teacher/rate-limit/refresh as done after reconciliation; still needs audit-log roadmap status. |

### 2.3 Critical documentation ⇄ code drift (resolved + remaining)

| # | Drift | Status | Evidence |
| - | ----- | ------ | -------- |
| D1 | OCR described as roadmap / not wired | **Resolved** in `CONTENT_PIPELINE.md` | `src/lib/ocrExtract.ts`, `server/src/routes/ocr.ts` |
| D2 | No server RAG endpoint documented | **Resolved** in `AGENT_RAG.md` | `server/src/routes/rag.ts`, `server/src/lib/ragServer.ts` |
| D3 | Teacher dashboard UI remaining | **Partial** — endpoint documented, UI not built | `server/src/routes/teacher.ts` |
| D4 | Server NER not in `API.md` | **Resolved** | `server/src/routes/nlp.ts`, `server/src/lib/ner.ts` |
| D5 | Per-account RPM limiter roadmap | **Resolved** in `SECURITY.md` | `server/src/middleware/rateLimit.ts` |
| D6 | Refresh/reset tokens roadmap | **Resolved** | `server/src/store/tokenStore.ts`, `server/src/routes/auth.ts` |
| D7 | NER/clustering/section-binding/provenance undocumented | **Resolved** in `ALGORITHMS.md` | `src/lib/entityExtract.ts`, `embeddingCluster.ts`, `conceptSectionBinding.ts`, `conceptProvenance.ts` |
| D8 | `processUpload` location incorrect | **Resolved** | `src/store/useStore.ts` |
| D9 | Hardcoded economics vocabulary fallback | **Resolved** | `src/lib/uploadPipeline.ts`, `src/lib/uploadPipeline.test.ts` |
| D10 | `STUDY_WORKSPACE.md` does not describe planned upgrades | **Remaining** | This blueprint addresses it in §5 |
| D11 | `ROADMAP.md` percentages stale | **Remaining** | Update once phases complete |
| D12 | `DEPLOYMENT.md` lacks Helm/Compose/IaC | **Remaining** | This blueprint addresses it in §6 |

### 2.4 Meta-recommendation: documentation as code

Documentation drift is a product-scale risk. The cheapest insurance is:

1. **CI doc-lint** — link check, drift-marker detection, and a grep that fails if `src/lib/**` contains domain-specific token arrays.
2. **Per-PR checklist** — every PR must update `ARCHITECTURE.md`, `ALGORITHMS.md`, `STUDY_WORKSPACE.md`, `API.md`, `PERSISTENCE.md`, `CHANGELOG.md`, or `ROADMAP.md` if the relevant surface changed.
3. **Single source of truth** — `PRODUCT_SCALE_PLAN.md` (or this blueprint) is the canonical forward plan; `ROADMAP.md` is the current-state snapshot; `CHANGELOG.md` is the shipped history.

---

## 3. North-Star Architecture: The Document Model

### 3.1 The current pipeline (accurate)

```
Upload → extractFileContent() → extractedText (with \f page separators)
  → analyzeContentToOutline() [offline] OR generateCourseOutline() [LLM]
  → analyzeCourseSourceQuality()
  → adaptOutlineToSourceQuality()
  → buildCourseFromOutline()
  → buildConceptSpans()
  → mergeCourseTasks()
  → persistLibrary()
  → CourseView → Study Workspace
```

`processUpload` lives in `src/store/useStore.ts`, not `src/lib/uploadPipeline.ts`.

### 3.2 The target architecture (Document Understanding Pipeline)

The current pipeline flattens rich documents into a single string. To reach product scale, we introduce a canonical, typed, **DocumentModel** as the single intermediate representation between ingestion and every downstream consumer (course builder, workspace tools, RAG, Agent).

```typescript
// Proposed: src/lib/documentModel.ts
interface DocumentModel {
  metadata: DocumentMeta;
  blocks: Block[];              // heading | paragraph | list | table | code | figure | equation | caption
  readingOrder: number[];       // layout-aware order
  sentences: Sentence[];        // { text, blockId, charStart, charEnd, lang }
  sections: Section[];          // hierarchical H1→H2→H3 with byte ranges
  entities: Entity[];           // typed concepts with provenance spans + salience
  definitions: Definition[];    // term → definition + span + confidence
  relations: Relation[];        // prereq | part-of | cause | contrast | example-of | defines
  claims: Claim[];              // claim / evidence / counter with spans
  figures: Figure[];            // image/diagram regions + OCR/caption
  equations: Equation[];        // LaTeX/MathML + variables
  quality: QualityReport;       // coverage, confidence, warnings
}
```

### 3.3 Why this matters

- **Recognition improvements compound.** Every downstream consumer reads the same `DocumentModel`, so better table extraction improves the Compare tool, the course builder, the Agent, and the quiz generator simultaneously.
- **Citations become first-class.** Every block, sentence, figure, and equation carries a provenance span, so "show the source" works for every generated unit.
- **Determinism is enforceable.** The model is produced by a deterministic pipeline; the same input bytes produce the same `DocumentModel`.
- **Offline capability is preserved.** The model can be built without any proxy.

### 3.4 Migration path

1. Introduce `DocumentModel` types alongside the existing string-based pipeline.
2. Implement `buildDocumentModel(text, fileMeta)` in a new `src/lib/documentModel.ts`.
3. Phase the existing `contentAnalysis.ts` functions to accept `DocumentModel` (backward-compatible wrappers that build the model from the legacy text).
4. Once consumers are migrated, make `DocumentModel` the primary input to the course builder and workspace extractors.
5. Keep the legacy text path as a fallback for tiny/simple inputs.

---

## 4. Workstream A: Content Recognition & Course Creation (Primary Emphasis)

> **Primary emphasis.** This is the heart of the product: turning raw, heterogeneous notes into a faithful, structured, citable knowledge representation and then into a pedagogically sound course. The bar is a recognition engine that is measurably as good as a careful human reader at finding concepts, definitions, structure, relationships, and evidence — across subjects and languages — **without ever inventing content**.

### 4.1 Current state (verified)

| Stage | Module | Status |
| ----- | ------ | ------ |
| Text extraction (PDF/PPTX/DOCX/TXT/MD/CSV) | `src/lib/pdfExtract.ts`, `src/lib/uploadPipeline.ts` | Ships |
| OCR (image + scanned PDF) | `src/lib/ocrExtract.ts` + `server/src/lib/ocrServer.ts` | Ships |
| YouTube transcript | `src/lib/youtubeTranscript.ts` + `server/src/lib/youtubeCaptions.ts` | Ships |
| Sentence/section segmentation | `src/lib/contentAnalysis.ts` | Ships |
| Keyphrase extraction (RAKE + TextRank blend) | `src/lib/contentAnalysis.ts` | Ships |
| Rule-based NER | `src/lib/entityExtract.ts` | Ships |
| Concept normalization | `src/lib/contentAnalysis.ts` | Ships |
| Concept→section binding | `src/lib/conceptSectionBinding.ts` | Ships |
| Embedding clustering | `src/lib/embeddingCluster.ts` | Partial — proxy-gated |
| Definition/acronym mining | `src/lib/contentAnalysis.ts` | Ships |
| Extractive summary (biased TextRank + MMR) | `src/lib/contentAnalysis.ts` | Ships |
| Prerequisite inference | `src/lib/contentAnalysis.ts` + `src/lib/conceptEdges.ts` | Ships |
| PMI co-occurrence edges | `src/lib/noteContentExtractors.ts` | Ships |
| Sentence-level concept provenance | `src/lib/conceptProvenance.ts` | Ships |
| BM25 retrieval | `src/lib/rag.ts` | Ships |
| Hybrid embedding rerank | `src/lib/sourceContext.ts` | Partial — proxy-gated |
| Course assembly | `src/lib/uploadPipeline.ts` | Ships |
| Source quality scoring | `src/lib/courseSourceQuality.ts` | Ships |
| Task generation | `src/lib/taskGenerator.ts` | Ships |
| Quiz generation | `src/lib/noteContentExtractors.ts` | Ships |
| Feynman rubric | `src/lib/feynmanRubric.ts` | Ships |
| Formula solver | `src/lib/formulaSolver.ts` | Ships |

The pipeline is already powerful. The remaining work is **depth**, not scaffolding.

### 4.2 A0 — Fix the hardcoded-vocabulary defect (DONE)

- **Problem:** `src/lib/uploadPipeline.ts` used a hardcoded `TOPIC_KEYWORDS` list (economics + Python terms) and `inferSubject()` defaulted to `'Economics'` when no outline was produced.
- **Fix:** Removed the hardcoded fallback. The no-outline path now runs the offline analyzer (`analyzeContentToOutline`) and derives the subject from content-derived topics, falling back to `'General Studies'`.
- **Acceptance:** Regression tests in `src/lib/uploadPipeline.test.ts` verify that biology, law, history, and medicine uploads never yield `subject: 'Economics'`.
- **CI guard:** A future test should grep `src/lib/**` for banned domain token arrays and fail the build.

### 4.3 A1 — Ingestion depth: from "text out" to "structure out"

Current extraction flattens everything to a UTF-8 string with `\f` page breaks. To reach state-of-the-art, we must preserve layout, modality, and structure.

| Upgrade | What | Where | Priority | Acceptance |
| ------- | ---- | ----- | -------- | ---------- |
| **Layout-aware PDF extraction** | Use `pdfjs` text-item geometry (x/y/width/font-size) to cluster lines into blocks, detect columns, strip headers/footers, and infer a reading order. | `src/lib/pdfExtract.ts` | High | A multi-column PDF with figures and tables produces a `DocumentModel` whose `readingOrder` matches human reading. |
| **Table extraction** | Detect tables geometrically (lines + whitespace) and in DOCX/PPTX XML, emitting typed `table` blocks with cells. | New `src/lib/tableExtract.ts` | High | Tables feed `extractComparisons` tier-1 directly; no manual Markdown conversion required. |
| **Math/equation recognition** | Detect inline and display math from PDF fonts/symbols and from images; store `Equation{latex, variables, sourceSpan}`. | `src/lib/pdfExtract.ts` + new server `/v1/ocr?mode=math` | High | Equations render inline in lessons and are editable in the Scratchpad. |
| **Code-block recognition** | Detect monospace-font, indentation, and lexical signals; classify language via lightweight classifier; route to Pyodide/CodeEditor. | `src/lib/documentModel.ts` | Medium | Code blocks in notes produce runnable exercises. |
| **Figure/diagram capture** | Extract image regions and nearby captions from PDFs; OCR text inside figures; bind captions by proximity. | `src/lib/pdfExtract.ts` | Medium | Figures appear in the Reader and can be dropped into the Whiteboard. |
| **Audio/video transcription (Whisper)** | The only genuinely missing ingestion mode. Server-side job: upload → Whisper (faster-whisper / whisper.cpp) → timestamped transcript → same pipeline. | New `src/lib/audioTranscript.ts` + server job queue | High | Audio/video files produce courses with the same quality as text uploads. |
| **Handwriting OCR (HTR)** | Specialized mode for handwritten notes using Tesseract LSTM or TrOCR; confidence-gated. | `src/lib/ocrExtract.ts` + server | Low | Handwritten notes are transcribed with confidence warnings. |
| **DOCX/PPTX structure** | Use real XML styles, headings, slide titles, and speaker notes. | `src/lib/uploadPipeline.ts` | Medium | Headings and slide titles become sections automatically. |
| **EPUB / HTML / web import** | Broaden sources with `epubjs` + Readability extraction. | New `src/lib/webExtract.ts` | Medium | Web articles produce the same `DocumentModel` as PDFs. |
| **Encoding/language detection** | Robust UTF-8, mixed-script, RTL guard; per-block language tag. | `src/lib/documentModel.ts` | Medium | Mixed-language notes are handled gracefully. |

### 4.4 A2 — Segmentation & document structure

| Upgrade | Detail | Where |
| ------- | ------ | ----- |
| **Hierarchical sections** | Build a real H1→H2→H3 tree with byte ranges, not flat `{heading, text}`. | `src/lib/contentAnalysis.ts` (`detectSections`) |
| **Discourse segmentation** | Detect intro / body / example / summary roles per paragraph using discourse markers. | New `src/lib/discourseSegment.ts` |
| **Robust multilingual sentence splitting** | Replace brittle regex with `Intl.Segmenter` where available; keep regex fallback for older browsers. | `src/lib/contentAnalysis.ts` (`splitSentences`) |
| **Reading-order repair** | Use layout geometry to fix multi-column / footnote interleaving before sentence splitting. | `src/lib/pdfExtract.ts` |
| **De-duplication** | Detect repeated headers/footers/slide boilerplate and drop them from keyphrase mining. | `src/lib/documentModel.ts` |

### 4.5 A3 — Concept & entity extraction (the recognition core)

This is the most critical algorithmic work. The current RAKE+TextRank blend is strong; the target is state-of-the-art **while staying offline-capable**.

| Upgrade | Detail | Where | Acceptance |
| ------- | ------ | ----- | ---------- |
| **Offline embeddings** | Ship a quantized multilingual model via `transformers.js` (e.g., `bge-small` / `multilingual-MiniLM`) in a Web Worker + WASM. This unblocks clustering and hybrid rerank without a proxy. | New `src/lib/localEmbedder.ts` | Deterministic embeddings; cache by `(model, contentHash)`; falls back to BM25-only when unsupported. |
| **Embedding-augmented keyphrase ranking** | Re-rank RAKE/TextRank candidates by cosine similarity to document/section centroid (KeyBERT-style). | `src/lib/contentAnalysis.ts` (`rankKeyphrases`) | Improves topicality on a gold set by ≥10% relative F1. |
| **Multiword-term & terminology mining** | C-value / NC-value for nested multiword terms; glossary-aware boosting. | New `src/lib/termhood.ts` | Better multi-word concept extraction than RAKE alone. |
| **Concept canonicalization v2** | Replace stem-lite with lemmatization (small EN/EL lemma tables) + embedding-based synonym merge + acronym↔expansion linking. | `src/lib/contentAnalysis.ts` (`canonicalConcept`) | "firm" / "firms" / "Firm" merge; acronyms link to expansions. |
| **Salience model v2** | Combine TextRank centrality + embedding-centroid similarity + positional prior + definition boost + frequency into a calibrated 0–1 score. | New `src/lib/conceptSalience.ts` | Salience scores correlate with human judgments on a ranked list. |
| **Entity typing** | Type concepts as term / method / person / dataset / theorem / event / metric to drive richer UI and quiz variety. | `src/lib/entityExtract.ts` | Typed entities feed tool-specific extraction. |
| **Cross-lingual concept mapping** | Mixed EL/EN notes map equivalent terms via embeddings so one concept node spans both. | `src/lib/localEmbedder.ts` + canonicalization | Bilingual notes produce one concept graph. |
| **Coreference-lite** | Resolve "it / this / the model" back to the nearest salient concept for better definition + relation mining. | `src/lib/documentModel.ts` | Improves relation extraction accuracy. |

### 4.6 A4 — Relations & knowledge graph

Today: prerequisite inference + PMI co-occurrence edges. Target: a typed knowledge graph that is the substrate for concept maps, course ordering, and the "explain how X relates to Y" Agent skill.

| Upgrade | Detail | Where |
| ------- | ------ | ----- |
| **Typed relations** | `defines`, `part-of`, `example-of`, `causes`, `contrasts-with`, `depends-on`, `generalizes`, `prereq`. Mine from connective patterns + dependency cues. | `src/lib/conceptEdges.ts` + new `src/lib/relationMine.ts` |
| **Prerequisite DAG learning** | Combine section order, definitional dependency, and embedding-implied difficulty; enforce acyclicity with topological repair. | `src/lib/conceptEdges.ts` |
| **PPMI + significance** | Replace raw PMI with positive PMI + log-likelihood ratio to cut spurious edges. | `src/lib/noteContentExtractors.ts` |
| **Knowledge-graph object** | Persist `ConceptGraph{nodes, edges}` on `Course` alongside `conceptSpans`. | `src/lib/documentModel.ts` + `src/types/course.ts` |
| **Graph quality** | Detect orphan nodes, hubs, cycles; surface as `QualityReport` warnings. | `src/lib/courseSourceQuality.ts` |

### 4.7 A5 — Definitions, claims & argument mining

| Upgrade | Detail | Where |
| ------- | ------ | ----- |
| **Definition confidence + ranking** | Score `(term, definition)` by pattern strength + salience + uniqueness; keep best per term; expose confidence in glossary UI. | `src/lib/contentAnalysis.ts` |
| **Claim detection v2** | Classify sentences into claim / evidence / elaboration / counter using connective + modality + numeric-density features. | `src/lib/noteContentExtractors.ts` (`buildDebateTreeFromNotes`) |
| **Evidence linking** | Attach supporting/contradicting evidence sentences to each claim with spans. | `src/lib/noteContentExtractors.ts` |
| **Stance & hedging** | Detect hedges to mark uncertainty in lessons and avoid quizzing hedged claims as facts. | `src/lib/documentModel.ts` |
| **Numeric/statistic extraction** | Pull figures, units, comparisons, dates → feeds scratchpad, exam numeric items, and grounding verification. | New `src/lib/numericExtract.ts` |

### 4.8 A6 — Grounding & anti-hallucination

| Upgrade | Detail | Where |
| ------- | ------ | ----- |
| **Span-level provenance everywhere** | Extend `buildConceptSpans` to lessons, quiz items, summaries, objectives. | `src/lib/conceptProvenance.ts` |
| **Numeric span-check** | Any number/date/quantity the LLM emits must match a number in the cited chunk; otherwise flag/strip. | New `src/lib/groundingVerify.ts` |
| **Entity span-check** | Named entities in generated text must appear in retrieved chunks; otherwise mark as "model-added background" (only allowed in `enriched` mode). | `src/lib/groundingVerify.ts` |
| **Faithfulness score** | Per generated paragraph, compute lexical+embedding overlap with its citation; below threshold → regenerate or fall back to extractive. | `src/lib/groundingVerify.ts` |
| **"Show the source" affordance** | Every generated sentence is click-to-source. | `src/components/Reader.tsx` + workspace tools |
| **Citation accuracy metric** | Track % of generated claims with a valid, verifiable citation; target ≥ 0.95 in strict mode. | Eval harness |

### 4.9 A7 — Course creation from notes

The current path (`outline → buildCourseFromOutline`) is excellent. We deepen each stage.

| Stage | Current | Target | Where |
| ----- | ------- | ------ | ----- |
| **Outline synthesis** | Headings + RAKE topics | Headings + semantic clusters + difficulty calibration + DAG ordering | `src/lib/contentAnalysis.ts` + `src/lib/outlineSynthesis.ts` |
| **Topic structuring** | Flat list | Hierarchical topics; auto-split >2000 words; merge <200 words; topological prereq sort | `src/lib/outlineSynthesis.ts` |
| **Lesson generation** | Section-aware panels | Learning-science arc: hook → prior-knowledge → core → worked example → guided practice → misconception → retrieval → summary | `src/lib/groundedLesson.ts` + `src/lib/lessonGenerator.ts` |
| **Worked examples** | Detect "Example" sentences | Extract full problem→steps→answer structures; generate scaffolded variants | `src/lib/noteContentExtractors.ts` |
| **Multimodal lessons** | Mostly prose | Render equations (KaTeX), tables, figures, code inline | `src/components/Reader.tsx` |
| **Assessment generation** | Cloze + MC | Multi-select, ordering, matching, short-answer, numeric, diagram-label, code-output, T/F-with-justification | `src/lib/noteContentExtractors.ts` |
| **Item bank + blueprint** | One item per concept | Generate a bank; assemble by Bloom × difficulty × concept coverage | `src/lib/noteContentExtractors.ts` |
| **Distractor quality** | Jaccard near-miss | Add embedding-based plausibility + "common confusion" mining from contrast relations | `src/lib/noteContentExtractors.ts` |
| **IRT-lite calibration** | None | Track per-item difficulty/discrimination from real attempts; adaptive item selection | `src/lib/pedagogy.ts` |
| **Objective alignment** | Bloom templates | Each objective maps to ≥1 assessment + ≥1 lesson panel; coverage matrix | `src/lib/contentAnalysis.ts` + UI |
| **Personalization** | Beta mastery + FSRS independent | Joint scheduler; knowledge tracing; adaptive daily plan | `src/lib/adaptiveScheduler.ts` |
| **Multi-document merge** | Extend mode merges by title | Cross-document course with conflict detection and versioned diff | `src/lib/courseMerge.ts` |
| **Course quality gates** | Source quality score | Rubric: coverage, grounding, ordering, assessment, readability, determinism | `src/lib/courseSourceQuality.ts` |

### 4.10 A8 — Evaluation harness

A product-scale algorithm must be measured. Add a `src/eval/` directory and an `npm run eval` script.

| Eval | Metric | Gold set |
| ---- | ------ | -------- |
| Concept extraction | precision/recall/F1 | Multi-subject, multi-lingual annotated corpus in `src/eval/fixtures/` |
| Definition mining | exact + fuzzy match accuracy | Annotated term/def pairs |
| Section/structure | boundary F1, reading-order Kendall-τ | Layout-annotated PDFs |
| Summarization | ROUGE-1/2/L + redundancy check | Reference summaries |
| Relations/prereq DAG | edge precision + cycle count | Annotated graphs |
| Citation/grounding | citation accuracy, faithfulness | LLM-on transcripts with span checks |
| Quiz quality | distractor plausibility, answerability | Item-bank review |
| Determinism | byte-identical output across 3 runs | All fixtures |

Gate algorithm PRs on "no regression vs baseline scorecard".

### 4.11 A9 — Algorithmic performance & resilience

| Upgrade | Detail | Where |
| ------- | ------ | ----- |
| **Web Worker pipeline** | Move heavy recognition off the main thread. | New `src/workers/recognition.worker.ts` |
| **Streaming/progressive output** | Emit sections → entities → graph incrementally so the course skeleton appears fast. | `src/lib/documentModel.ts` |
| **Incremental re-analysis** | Re-uploading an edited doc re-analyzes only changed blocks (by content hash). | `src/lib/documentModel.ts` |
| **Backpressure + size limits** | Page caps, time budgets, graceful degradation. | `src/store/useStore.ts` |
| **Telemetry** | Stage timings + confidence (opt-in). | `src/lib/activityAnalytics.ts` |

### 4.12 Workstream A acceptance summary

- Single typed `DocumentModel` documented in `ALGORITHMS.md`.
- No proxy required for any recognition stage (offline embedder).
- Typed knowledge graph + claim graph persisted on `Course`.
- Span provenance + grounding verification on all generated content.
- Reproducible eval scorecard checked into CI.

---

## 5. Workstream B: Study Workspace UI/UX (Primary Emphasis)

> **Primary emphasis.** The Study Workspace (`src/components/workspace/StudyWorkspace.tsx`, ~59 KB) is where learning happens. The target is a cohesive, professional, accessible, powerful study environment — not a tab bar over widgets. Every one of the 11 tools must move from "functional" to "genuinely useful + delightful".

### 5.1 Design system foundation (do first)

Before per-tool work, establish a workspace design system so quality is consistent and implementation does not fragment.

| Layer | Current | Target | Where |
| ----- | ------- | ------ | ----- |
| **Tokens** | Partially in `index.css` / `theme.ts` | Centralized spacing, radius, typography, color (cyan/teal brand), elevation, motion | `index.css` + `theme.ts` |
| **Primitives** | Each tool reinvents UI | Shared `Panel`, `Toolbar`, `EmptyState`, `Tooltip`, `Popover`, `Dialog`, `SegmentedControl`, `Slider`, `Tag`, `Skeleton`, `Toast`, `Badge`, `Button` | `src/components/ui/` |
| **Interaction grammar** | Inconsistent | Unified selection, hover, focus-ring, drag handles, context menus, keyboard model | `src/components/workspace/` |
| **Motion** | Partial | One motion spec; `prefers-reduced-motion` honored everywhere | `index.css` + components |
| **Icons** | Mixed | Standardized `icon-sm` / `icon-md` / `icon-lg` classes via Lucide | All workspace components |

### 5.2 Workspace shell, layout & navigation

| Upgrade | Detail | Where |
| ------- | ------ | ----- |
| **Resizable split** | Draggable divider between lesson pane and tool pane (min 25%, max 75%). | `StudyWorkspace.tsx` |
| **2×2 grid layout** | Power-user layout: lesson + tool + notes + agent/dashboard. | `StudyWorkspace.tsx` |
| **Pop-out tool** | Open active tool in a separate browser window for dual-monitor study. | `StudyWorkspace.tsx` |
| **Tool launcher** | Visual switcher with descriptions and "content available" indicators (gray out empty tools). | `StudyWorkspace.tsx` |
| **Breadcrumbs** | Course ▸ Topic ▸ Concept ▸ Tool, all clickable. | `StudyWorkspace.tsx` |
| **Progress rail** | Step rail with completion ticks, time-on-step, quiz scores. | `StudyWorkspace.tsx` + `lessonProgress.ts` |
| **Session continuity** | Resume exactly where left off: tool, step, scroll, selection, per task. | `workspacePersistence.ts` |
| **Coachmarks / onboarding** | First-run guided tour of the workspace (dismissible, skippable). | `StudyWorkspace.tsx` |
| **Command palette v2** | Fuzzy actions across tools, recent/most-used, "jump to concept X in tool Y". | `CommandPalette.tsx` |

### 5.3 Cross-tool integration

| Upgrade | Detail | Where |
| ------- | ------ | ----- |
| **Shared focus bus** | A `workspaceFocus` object (concept + optional source span) that all tools read. | `src/lib/workspaceData.ts` |
| **Deep links** | Map → Reader scroll-to-span; quiz → Reader; Feynman → Map; scratchpad → Whiteboard; Agent → Reader. | All tools |
| **Unified selection** | Selecting a concept in any tool updates all open tools in split view. | `workspaceData.ts` |
| **Notes everywhere** | The `N` session-notes panel becomes a persistent side-rail usable from any tool. | `StudyWorkspace.tsx` |

### 5.4 Per-tool deep enhancement

#### 5.4.1 Concept Map — `DraggableConceptMap.tsx`

| Current | To product-scale |
| ------- | ---------------- |
| Drag/zoom of topic nodes + prereq/PMI edges | **Interactive editing:** add node, draw/delete typed edge, rename, merge/split — write back to `ConceptGraph` with provenance kept. |
| Positions persisted per task | **Typed-edge rendering:** color/label by relation type (prereq/part-of/contrast…). |
| | **Layout engine:** force-directed + hierarchical DAG toggle; auto-fit; cluster hulls. |
| | **Mastery overlay:** node color = mastery band; size = salience. |
| | **Filtering/search:** focus a concept + n-hop neighborhood; minimap for large graphs. |
| | **Click-through:** node → Reader span; double-click → lesson step; → quiz on concept. |
| | **Export:** PNG/SVG/JSON; share image. |
| | **A11y:** keyboard graph navigation (arrow keys between nodes, Enter to focus), ARIA roles, text alternative listing nodes/edges. |

#### 5.4.2 Reader — `CognitiveReader.tsx`

| Current | To product-scale |
| ------- | ---------------- |
| Relevant excerpt via BM25; bionic + complexity heatmap | **TTS:** Web Speech API read-aloud with word highlight, speed/voice control, EL/EN voices, pause/resume, sentence navigation. |
| | **Click-to-define:** tap any term → glossary popover (def + citation + "open in map"). |
| | **Dyslexia-friendly mode:** OpenDyslexic/Atkinson font, line spacing, ruler/focus line. |
| | **Scroll-to-span:** accept `{fileId, charStart, charEnd}` and highlight + scroll. |
| | **Full-source view:** toggle excerpt ↔ full document with all concept spans highlighted. |
| | **Inline annotations:** integrate `AnnotationOverlay` so highlighting + notes happen in the Reader. |
| | **Reading progress + time:** track coverage; feed analytics. |
| | **Focus mode:** dim everything except current paragraph; advance with spacebar. |

#### 5.4.3 Leitner / Flashcards — `LeitnerBox.tsx`

| Current | To product-scale |
| ------- | ---------------- |
| Glossary/definition cards; FSRS-4 ratings | **Card types:** cloze, image-occlusion, term↔def, reverse, audio (TTS). |
| | **Due-queue + heatmap:** today's due, upcoming load, streak; honor joint scheduler. |
| | **Card editing/suspend/bury/tag;** per-deck stats (retention, lapses). |
| | **Keyboard-first review:** space=flip, 1–4=grade; swipe on mobile; undo. |
| | **Anki-style export/import** for power users. |

#### 5.4.4 Compare — `extractComparisons` view

| Current | To product-scale |
| ------- | ---------------- |
| Three-tier extraction; read-only render | Sortable columns, dimension diff highlighting, add/remove dimensions, CSV/Markdown export, "compare these 3 concepts" picker, provenance per cell. |

#### 5.4.5 Whiteboard — `StudyWhiteboard.tsx`

| Current | To product-scale |
| ------- | ---------------- |
| Canvas strokes + text + formula sidebar | **Shape tools:** rect/ellipse/arrow/line with select/move/resize. |
| | **LaTeX rendering:** KaTeX formulas as objects. |
| | **Image import:** paste/drag images (including extracted figures). |
| | **Sticky notes, layers, infinite canvas + pan/zoom, minimap.** |
| | **Templates:** Cornell notes, mind-map, blank. |
| | **Export:** PNG/SVG/PDF. |
| | **Optional real-time collaboration** (CRDT/WebSocket). |
| | **A11y:** keyboard object nav + alt text. |

#### 5.4.6 Feynman — `FeynmanCheck.tsx`

| Current | To product-scale |
| ------- | ---------------- |
| Outline + gap hints + rubric | Per-axis actionable feedback with cited reference spans; highlight missed terms (link to Reader); voice input (speech-to-text); iterative attempts with score trend; "explain to a 10-year-old vs peer" modes; optional LLM coach that stays grounded. |

#### 5.4.7 Timer — `StudyTimer.tsx`

| Current | To product-scale |
| ------- | ---------------- |
| Session timer → activity stream | Pomodoro with configurable focus/break; auto-logging to active concept; daily goal + streak; gentle break prompts; ambient focus sounds (opt-in); integration with adaptive plan ("review X for 10 min"). |

#### 5.4.8 Debate / Argument Map — `ArgumentMap.tsx`

| Current | To product-scale |
| ------- | ---------------- |
| Static claim/support/refute tree | Interactive argument graph (claim↔evidence↔counter with spans); add/critique nodes; strength weighting; "steelman/counter" prompts; grounded LLM counter-argument generation. |

#### 5.4.9 Sandbox / Simulator — `InteractiveSimulator.tsx`

| Current | To product-scale |
| ------- | ---------------- |
| Sliders + insight from notes | Generalize into a **parameter-explorer** driven by extracted formulas/relations: bind variables from `formulaSolver` + numerics, plot outputs (charts), show cited relationship, support code-backed simulations (Pyodide) when notes contain code. |

#### 5.4.10 Scratchpad — `FormulaScratchpad.tsx`

| Current | To product-scale |
| ------- | ---------------- |
| Generic shunting-yard evaluator | **Symbolic CAS layer:** simplify/solve/differentiate via tiny CAS or `mathjs`; unit-aware computation; LaTeX input + render; step explanations; "insert into whiteboard/lesson"; graphing of functions. |

#### 5.4.11 Quiz — `WorkspaceQuiz.tsx`

| Current | To product-scale |
| ------- | ---------------- |
| Single cloze/MC, deterministic shuffle | All item types from §4.9; immediate grounded feedback with source span; confidence rating → calibration; retry-wrong; adaptive difficulty; per-attempt logging for IRT. |

#### 5.4.12 Source / Annotations — `AnnotationOverlay.tsx`

| Current | To product-scale |
| ------- | ---------------- |
| Whole-line local highlights | **Sub-line text selection** highlights; multi-color; margin notes; tags; jump-to-annotation index; shared annotations for teachers/peers. Merge visually into the Reader. |

#### 5.4.13 Mini Dashboard — `MiniDashboard.tsx`

| Current | To product-scale |
| ------- | ---------------- |
| In-workspace stats | Concept mastery bars; due reviews; session goal; "next best action" from adaptive engine; retention-risk warnings. |

### 5.5 New tools to add

| Tool | Purpose | Where |
| ---- | ------- | ----- |
| **Cornell Notes** | Structured note-taking template with auto-populated cues from concepts. | New `src/components/workspace/CornellNotes.tsx` |
| **Progress Journal** | Per-session reflective journaling with prompts. | New `src/components/workspace/ProgressJournal.tsx` |
| **Spaced Writing** | Periodic short-paragraph prompts, FSRS-scheduled. | New `src/components/workspace/SpacedWriting.tsx` |
| **Mind Map** | Free-form hierarchical map (lighter than Concept Map). | New `src/components/workspace/MindMap.tsx` |

### 5.6 Accessibility (WCAG 2.2 AA) — workspace-wide

Accessibility is currently the weakest area and is **release-blocking**.

| Requirement | Implementation |
| ----------- | -------------- |
| Keyboard path | Every action, including canvas/SVG tools (concept map, whiteboard, argument map). |
| ARIA roles/labels | Live regions for quiz feedback, timer, agent. |
| Focus | Visible focus rings; logical tab order; skip links; ESC/return stack. |
| Screen reader | Text alternatives for every visualization (concept map → navigable list/tree). |
| Contrast | Color-contrast audit in both themes; never color-only signals. |
| Motion | Respect `prefers-reduced-motion` for all animation. |
| Touch targets | ≥ 24 px (2.2 AA); generous on mobile. |
| Automated testing | axe in CI on key screens. |

### 5.7 Responsive, mobile & PWA

| Upgrade | Detail | Where |
| ------- | ------ | ----- |
| **Mobile shell** | Bottom tool dock, gesture nav, touch-optimized canvas (pinch-zoom, two-finger pan). | `StudyWorkspace.tsx` |
| **PWA** | Installable, service worker caches app + Pyodide + embedder, background sync of library/session, "available offline" badge. | `vite.config.ts` + `public/manifest.webmanifest` |
| **Performance** | Virtualize long lists; lazy-load tool bundles; keep main thread free via recognition worker; target INP < 200 ms on mid-range phone. | All tools |

### 5.8 Empty/error/quality states

| Upgrade | Detail |
| ------- | ------ |
| **Actionable empty states** | "No formulas found — upload material with equations, or try the Reader." |
| **Quality report surfacing** | Show §4.9 `QualityReport` in-workspace ("this concept has thin source coverage"). |
| **Graceful degradation** | Clear, non-alarming indicator when proxy/LLM is down (offline templates still work). |

### 5.9 Workstream B acceptance summary

- Coherent workspace design system with tokens + primitives.
- Every tool upgraded from functional to powerful (editing, TTS, LaTeX, CAS, interactive compare, sub-line annotations, varied quizzes).
- Cross-tool deep linking via a shared focus bus.
- WCAG 2.2 AA across all SVG/canvas tools.
- PWA offline; mobile-class touch UX.
- New tools (Cornell Notes, Journal, Spaced Writing, Mind Map) integrated.

---

## 6. Workstream C: Phase 6 Backend to Production Scale

> **Important correction.** The server is **not** a separate project that needs to be scaffolded. This repo already contains a real, running Node/Express server under `server/` with accounts, JWT, refresh/reset tokens, metering, rate limiting, library/session sync, Stripe, YouTube proxy, OCR, NER, semantic RAG, and a teacher aggregate endpoint. The remaining work is **hardening to production scale** and **fully wiring the client**.

### 6.1 Current backend capability matrix

| Surface | Route | Status |
| ------- | ----- | ------ |
| OpenAI-compatible chat + embeddings | `/v1/chat/completions`, `/v1/embeddings` | Ships |
| JWT auth + `/auth/me` | `/auth/*` | Ships |
| Refresh + password reset | `/auth/refresh`, `/auth/forgot-password`, `/auth/reset-password` | Ships |
| Per-account metering + quotas | `/v1/*` via `middleware/usage.ts` | Ships |
| Sliding-window rate limit | `/v1/*` via `middleware/rateLimit.ts` | Ships (single-node) |
| Library + session sync | `/v1/library`, `/v1/session` | Ships |
| Stripe billing | `/v1/billing/*` | Ships |
| YouTube transcripts | `/v1/youtube/transcript` | Ships |
| OCR | `/v1/ocr/pages` | Ships |
| NLP entities | `/v1/nlp/entities` | Ships |
| Semantic RAG | `/v1/rag/query` | Ships (over client chunks) |
| Teacher dashboard | `/v1/teacher/dashboard` | Ships (endpoint only) |
| Admin stats | `/v1/admin/stats` | Ships |
| Postgres migrations | `server/migrations/` | Ships |

### 6.2 Reconcile + fully wire existing endpoints

| Endpoint | Client wiring | Action |
| -------- | ------------- | ------ |
| `POST /v1/rag/query` | Client RAG is local (`rag.ts`) | Add optional server-RAG path in `sourceContext.ts` for large libraries; document in `AGENT_RAG.md`. |
| `POST /v1/nlp/entities` | Wired (`extractEntitiesEnriched`) | Confirm enabled when proxy set; add to `API.md`. |
| `POST /v1/ocr/pages` | Wired (`ocrExtract`) | Add to `API.md`; document math-OCR mode. |
| `GET /v1/teacher/dashboard` | **No client UI** | Build the teacher/class UI. |
| `/auth/refresh`, `/auth/forgot-password`, `/auth/reset-password` | `tokenStore` exists; routes expose them | Wire silent refresh in `authClient.ts`; add password-reset flows in Settings. |
| Rate-limit 429 | Server-side only | Surface 429 handling in client with retry-after UI. |

**First task:** an integration test sweep hitting every server route to know the real contract, then keep `API.md` and `server/README.md` in sync.

### 6.3 Security & secrets hardening

| Control | Current | Target | Where |
| ------- | ------- | ------ | ----- |
| LLM key | Server-only (`lib/upstream.ts`) | Secrets manager integration (AWS/GCP/Vault) + rotation | `server/src/lib/secrets.ts` + `config.ts` |
| JWT | HS256, short-lived access | Key rotation with force-logout; `exp`/`iat` | `server/src/middleware/auth.ts` |
| Password hashing | scrypt (default cost) | Argon2id audit with recommended params | `server/src/store/accounts.ts` |
| Audit logs | `console.log` | Structured logs for `/auth/*`, `/v1/billing/*`, `/v1/admin/*` → aggregator | `server/src/lib/audit.ts` |
| Input validation | Partial | Zod schemas on all route bodies; per-route payload size caps | All `routes/*.ts` |
| Content moderation | None | Moderation pass on Agent prompts | `server/src/middleware/moderation.ts` |
| Security headers | Basic | CSP, HSTS, HSTS preload, CORS pinned | Edge / reverse proxy |
| GDPR | Partial | Data export + delete endpoints; retention policy; encryption at rest for JSONB | `server/src/routes/gdpr.ts` |

### 6.4 Server-side RAG at scale

Today `server/src/lib/ragServer.ts` retrieves over client-supplied chunks. For large libraries and cross-device retrieval, we need a persistent server-side index.

| Upgrade | Detail | Where |
| ------- | ------ | ----- |
| **pgvector** | Postgres extension storing per-account chunk embeddings (`vector(1536)` or chosen dim). | `server/migrations/` |
| **Hybrid retrieval** | BM25 via Postgres `tsvector` + pgvector cosine, reranked — mirrors client blend. | `server/src/lib/ragServer.ts` |
| **Incremental indexing** | Re-embed only changed files on `PUT /v1/library`. | `server/src/routes/library.ts` |
| **Privacy** | Per-account isolation enforced in SQL (parameterized). | All RAG queries |
| **New endpoint** | `POST /v1/rag/search` — cross-device retrieval over server index. | `server/src/routes/rag.ts` |

### 6.5 Teacher / class dashboard (real product surface)

The endpoint exists; the product UI does not. This is a major product surface.

| Feature | Detail | Where |
| ------- | ------ | ----- |
| **Multi-tenant orgs** | Institution → classes → students. | `server/src/store/accounts.ts` + `server/migrations/` |
| **Class management** | Create class, invite by email/code, roster, assign courses/decks, due dates. | `server/src/routes/teacher.ts` + new UI |
| **Per-student progress** | Mastery, retention risk, time-on-task, weak areas — privacy-gated, consented. | `server/src/routes/teacher.ts` |
| **Cohort analytics** | Class-level mastery heatmap, common misconceptions, item stats. | `server/src/routes/teacher.ts` + UI |
| **Assignments + grading** | Push assessments; collect attempts; rubric/IRT-graded; export grades. | `server/src/routes/teacher.ts` |
| **Roles & permissions** | student / teacher / org-admin; RBAC middleware. | `server/src/middleware/rbac.ts` |

### 6.6 Async jobs, scaling & ops

| Upgrade | Detail | Where |
| ------- | ------ | ----- |
| **Job queue** | BullMQ + Redis for heavy work: Whisper, OCR batches, embedding/indexing, course regeneration — with progress polling. | `server/src/jobs/` |
| **Horizontal scale** | Stateless API; move rate-limit + token buckets to Redis. | `server/src/middleware/rateLimit.ts` |
| **Observability** | OpenTelemetry traces, metrics (latency, token usage, error rate), health/readiness probes. | `server/src/lib/telemetry.ts` |
| **Infra-as-code** | Dockerfile + docker-compose (Postgres+Redis+API) + Helm chart / Fly / Render config. | `server/Dockerfile`, `server/docker-compose.yml`, `server/helm/` |
| **Backups** | `pg_dump` schedule; PITR for Postgres. | `DEPLOYMENT.md` + CI |
| **Cost controls** | Per-account + global LLM spend caps; model routing (cheap model for outline, better for lessons); caching of identical generations. | `server/src/lib/upstream.ts` |

### 6.7 Optional: standalone minimal Node/Edge proxy

If a lightweight, separately-deployable proxy is wanted (Cloudflare Workers / Vercel Edge) as an alternative to the full Express server:

- A ~200-line Edge function mirroring `/v1/chat/completions` + `/v1/embeddings`.
- KV-based monthly meter and the same auth header contract.
- API-compatible so `src/lib/llmClient.ts` is unchanged.
- **Verdict:** This is a small add-on; the full server already covers these capabilities. Only build it if a separate lightweight deployment is explicitly required.

### 6.8 Workstream C acceptance summary

- `API.md` matches reality; client fully wired to nlp/rag/ocr/teacher + token refresh.
- Secrets in a vault with rotation + audit logs.
- pgvector server RAG with incremental indexing.
- Redis-backed rate limit + BullMQ job queue.
- Real multi-tenant teacher dashboard with class management, assignments, and grading.
- IaC + observability + GDPR export/delete.

---

## 7. Cross-Cutting Concerns

### 7.1 Testing & QA

| Layer | Current | Target | Where |
| ----- | ------- | ------ | ----- |
| Unit tests | 12 files / ~59 tests | 80%+ coverage of `src/lib/`; cover `noteContentExtractors`, `pedagogy`, `spacedRepetition`, `courseMerge`, `librarySync`, `sessionSync` | `src/lib/*.test.ts` |
| Eval harness | None | `npm run eval` producing a scorecard; gated in CI | `src/eval/` |
| Component tests | None | Workspace tools with mocked store | `src/components/**/*.test.tsx` |
| E2E | 2 Playwright specs | PDF upload → course → lesson → quiz → analytics; auth+sync; teacher flow; mobile/PWA; wired into CI | `e2e/` |
| Server integration | None | Every route against ephemeral Postgres | `server/src/**/*.test.ts` |
| A11y | None | axe on key screens in CI | `e2e/a11y*.spec.ts` |
| Visual regression | None | Playwright snapshots for workspace tools | `e2e/visual*.spec.ts` |
| Determinism | Partial | Same notes → same course across 3 runs | `src/eval/` |

### 7.2 CI/CD

| Upgrade | Detail |
| ------- | ------ |
| **Eval job** | Run `npm run eval` and gate on no regression. |
| **E2E job** | Wire `npm run test:e2e` into CI with Postgres/Redis services. |
| **A11y job** | Run axe on key screens. |
| **Server integration** | Ephemeral Postgres + Supertest. |
| **Doc-lint** | Link check, drift markers, untranslated-string check. |
| **Bundle-size gate** | Fail if main chunk exceeds budget. |
| **Preview deploys** | Per-PR Vercel/Netlify preview. |

### 7.3 Security & privacy

| Concern | Action |
| ------- | ------ |
| Client secrets | Never store provider keys; only JWT in `localStorage` under `synapse:auth-v1`. |
| Note privacy | Local-first; explicit sync consent; encrypted backup export option. |
| GDPR | "Delete all my data" in Settings; export all `synapse:*` data; server-side cascade delete. |
| Audit | Structured logs for auth, billing, admin mutations. |
| Dependency audit | `npm audit` in CI; fail on high/critical. |

### 7.4 Performance

| Area | Target | Where |
| ---- | ------ | ----- |
| Recognition | Web Worker for heavy analysis; streaming output. | `src/workers/recognition.worker.ts` |
| Lists | Virtualize long lists (glossary, cards, annotations). | All list components |
| Loading | Lazy-load tool bundles; image/figure lazy-load. | `vite.config.ts` + components |
| Caching | Cache embeddings, generations, and RAG corpora by content hash. | `src/lib/sourceContext.ts`, IndexedDB |
| Metrics | Lighthouse budget in CI. | `.github/workflows/ci.yml` |

### 7.5 Observability (client)

| Signal | Use |
| ------ | --- |
| Recognition stage timings | Find regressions. |
| Error rates | Surface quality issues. |
| Feature usage | Guide UX priorities. |
| "Recognition report" | User-visible per-upload quality breakdown. |

All telemetry is opt-in and privacy-preserving.

### 7.6 Internationalization (35% → 100%)

| Area | Current | Target |
| ---- | ------- | ------ |
| Shell / nav | Full | Full |
| Settings | Full | Full |
| Upload modal | Partial | Full |
| Dashboard | Partial | Full |
| Tasks | Partial | Full |
| Workspace tools | Full labels | Full labels + empty states + instructions |
| Agent | Mostly EN | Full EL + EN |
| Analytics | Mostly EN | Full EL + EN |
| Landing / Onboarding | Partial | Full |
| Server errors | EN | Localized error messages |

CI check: no untranslated `t()` keys; lint for hardcoded user-facing strings.

### 7.7 Design system & content style

- Tokens + primitives (see §5.1).
- Writing style guide for generated content: tone, citation format, EL/EN parity, avoiding hallucinated confidence.
- Component library documentation (Storybook or equivalent) for shared primitives.

---

## 8. Per-Surface / Per-Page Enrichment Plan

Every product surface gets a concrete upgrade path. This is where the "no omissions" requirement is enforced.

| Surface | Current | Product-scale target | Primary file(s) |
| ------- | ------- | --------------------- | --------------- |
| **Dashboard** | KPIs, activity, readiness | "Next best action" from adaptive engine; due-today; retention-risk; streak; weekly review; per-course progress; goals/exam countdown | `Dashboard.tsx` |
| **Library** | Uploads, courses, glossary | Course quality badges; re-analyze/version; multi-doc course builder; search/filter/tag; bulk ops; storage usage; per-file recognition report | `Library.tsx` |
| **Upload Modal** | Files/paste/YouTube, extend mode | Audio upload; OCR image/scanned; drag-drop; progress with stage breakdown; live quality preview; source-mode explainer | `UploadModal.tsx` |
| **CourseView** | Diagnostics, source quality, warnings | Richer quality report; topic-level action cards; "Add Material" CTA; conflict surfacing; export course plan | `CourseView.tsx` |
| **Analytics** | Mastery map from real data | Per-objective outcomes; calibration; forgetting curve; time analytics; cohort compare (teacher); export; full i18n | `Analytics.tsx` |
| **Tasks** | Generated tasks | Adaptive daily plan; spaced-coverage scheduler to exam date; task types (study/review/practice/repair/exam); snooze/reorder | `Tasks.tsx` |
| **Agent** | RAG chat + citations | Grounding verification; multi-turn over course graph; "quiz me / explain / compare" skills; voice; server-RAG for big libraries; strict/enriched toggle in UI | `Agent.tsx` |
| **Settings** | Proxy, language, demo, theme, auth/sync | Account lifecycle (verify/reset via existing tokens); data export/delete; offline-model toggle; accessibility prefs; notification prefs | `Settings.tsx` |
| **Onboarding** | Initial flow | Goal/exam setup; first-upload guided; sample-course try; workspace tour | `Onboarding.tsx` |
| **Landing** | Marketing | Honest capability messaging; accessibility; full i18n; demo gated | `Landing.tsx` |
| **Notifications** | Basic | Due reviews, streak risk, exam countdown, course-ready — opt-in push (FCM/web push) | `NotificationsPanel.tsx` |
| **Teacher Dashboard** | Endpoint only | Full class management, assignments, grading, cohort analytics | New `src/components/teacher/` + `src/app/teacher/` |
| **Admin Panel** | Stats endpoint | Usage analytics, audit log viewer, feature flags, moderation queue | New `src/components/admin/` (if not existing) |

### 8.1 Dashboard page detail

- **Morning brief**: today's due reviews, next best action, exam countdown.
- **Streak & goals**: weekly study goal progress, streak risk warning.
- **Course cards**: per-course progress ring, quality badge, last studied.
- **Weak areas**: top 3 concepts with mastery < 0.5 and direct links to repair tasks.
- **Activity feed**: locale-aware dates, i18n labels.

### 8.2 Library page detail

- **List view**: sortable columns (title, subject, files, quality, last studied).
- **Bulk actions**: export, delete, merge into multi-doc course.
- **Quality badges**: `ready`, `needs_review`, `rich`, `sparse`.
- **Recognition report**: per-file extraction summary (pages, sections, concepts, figures, equations, warnings).
- **Versioning**: diff between re-uploaded versions of the same file.

### 8.3 Upload modal detail

- **Drag-and-drop anywhere**: desktop file drop, paste from clipboard.
- **Audio/video tab**: record or upload audio/video; show transcription progress.
- **OCR tab**: upload image/scanned PDF; show page preview and progress.
- **Source mode explainer**: radio buttons for strict / enriched / notes-only with human-readable descriptions.
- **Live quality preview**: as extraction finishes, show word count, detected sections, concept count, and a preliminary quality band.

### 8.4 Agent page detail

- **Skills**: quick-action chips `/quiz X`, `/explain X`, `/compare X Y`, `/summarize ch.3`.
- **Grounding indicators**: citation confidence, strict/enriched toggle, "show sources" panel.
- **Conversation memory**: reference earlier Q&A in follow-ups.
- **Voice**: speech input + TTS output.

### 8.5 Settings page detail

- **Account lifecycle**: verify email, change password, reset via token, delete account.
- **Sync & storage**: auto-sync toggle, storage usage, conflict resolution preview.
- **Accessibility**: reduced motion, dyslexia font, high contrast, focus mode defaults.
- **Notifications**: due reminders, streak alerts, exam countdown, push opt-in.
- **Offline models**: toggle local embedder/audio model download.

---

## 9. Phased Execution Roadmap

Phases are ordered by dependency and value. Each item is independently shippable, tested, and documented. Nothing merges without tests + docs.

### Phase 0 — Documentation & truth foundations (unblockers)

| # | Task | Acceptance | Owner-agnostic |
| - | ---- | ---------- | -------------- |
| 0.1 | Reconcile all MD files per §2 drift table | `ROADMAP.md`, `ALGORITHMS.md`, `STUDY_WORKSPACE.md`, `API.md`, `SECURITY.md`, `DEPLOYMENT.md`, `PERSISTENCE.md`, `CHANGELOG.md` updated | Yes |
| 0.2 | Fix D9 defect + regression test + CI vocab guard | `uploadPipeline.test.ts` passes for non-econ subjects; CI greps for banned domain arrays | Yes |
| 0.3 | Server route integration sweep | Supertest covers every `/auth/*` and `/v1/*` route against ephemeral Postgres | Yes |
| 0.4 | CI doc-lint + untranslated-string check | CI fails on broken internal links or untranslated user-facing strings | Yes |
| 0.5 | Eval harness scaffold | `npm run eval` runs and produces a baseline scorecard | Yes |

### Phase 1 — Document Model & offline embedder

| # | Task | Acceptance | Owner-agnostic |
| - | ---- | ---------- | -------------- |
| 1.1 | `DocumentModel` types + builder | `src/lib/documentModel.ts` compiles; produces typed model from text | Yes |
| 1.2 | Offline embedder (`localEmbedder.ts`) | `transformers.js` quantized model runs in Web Worker; deterministic; cache by content hash | Yes |
| 1.3 | Wire embedder into `sourceContext.ts` | Hybrid rerank works without proxy; falls back to BM25 | Yes |
| 1.4 | Wire embedder into `embeddingCluster.ts` | Semantic clustering works without proxy | Yes |
| 1.5 | Recognition Web Worker | `processUpload` runs heavy analysis off main thread; UI stays responsive | Yes |

### Phase 2 — Recognition depth

| # | Task | Acceptance | Owner-agnostic |
| - | ---- | ---------- | -------------- |
| 2.1 | Layout-aware PDF extraction | Multi-column PDF reading order verified on gold set | Yes |
| 2.2 | Table extraction | Tables extracted from PDF/DOCX/PPTX; feed Compare tool | Yes |
| 2.3 | Math/equation recognition | Equations rendered inline in Reader and Scratchpad | Yes |
| 2.4 | Code-block recognition | Code blocks classified; route to Pyodide/CodeEditor | Yes |
| 2.5 | Audio/video transcription | Whisper server job; client upload + progress polling | Yes |
| 2.6 | Hierarchical sections + discourse segmentation | Real H1→H2→H3 tree; intro/body/example/summary roles | Yes |
| 2.7 | Concept extraction v2 | KeyBERT-style rerank, termhood, canonicalization v2, salience v2 | Yes |
| 2.8 | Typed knowledge graph + prereq DAG | `ConceptGraph` persisted on `Course`; acyclic DAG drives ordering | Yes |
| 2.9 | Claim/evidence/counter mining | Interactive argument graph with evidence links | Yes |
| 2.10 | Grounding verification layer | Numeric + entity span-check; faithfulness score; ≥0.95 citation accuracy in strict mode | Yes |

### Phase 3 — Course creation depth

| # | Task | Acceptance | Owner-agnostic |
| - | ---- | ---------- | -------------- |
| 3.1 | Outline synthesis v2 | Semantic clusters + difficulty + DAG ordering | Yes |
| 3.2 | Learning-science lesson arc | Hook → prior-knowledge → core → worked example → guided practice → misconception → retrieval → summary | Yes |
| 3.3 | Worked-example mining + scaffolded variants | Full problem→steps→answer structures; fade steps for practice | Yes |
| 3.4 | Assessment item bank + variety | Multi-select, ordering, matching, short-answer, numeric, diagram-label, code-output, T/F-with-justification | Yes |
| 3.5 | IRT-lite calibration | Per-item difficulty/discrimination; adaptive item selection | Yes |
| 3.6 | Objective ↔ assessment alignment | Coverage matrix; flag unassessed objectives | Yes |
| 3.7 | Unified adaptive scheduler | FSRS × mastery joint scheduler; knowledge tracing; daily plan | Yes |
| 3.8 | Multi-document merge + conflict detection | Cross-document course; surface conflicting definitions | Yes |
| 3.9 | Course quality gates | Rubric: coverage, grounding, ordering, assessment, readability, determinism | Yes |

### Phase 4 — Workspace UI/UX (primary emphasis)

| # | Task | Acceptance | Owner-agnostic |
| - | ---- | ---------- | -------------- |
| 4.1 | Workspace design system + primitives | Tokens + shared UI components; Storybook/docs | Yes |
| 4.2 | Resizable split + 2×2 grid + pop-out tool | Layouts usable; state persisted | Yes |
| 4.3 | Cross-tool focus bus + deep links | Map→Reader, quiz→Reader, Feynman→Map, scratchpad→Whiteboard | Yes |
| 4.4 | Concept Map editing | Add/delete nodes/edges; typed relations; layouts; export | Yes |
| 4.5 | Reader TTS + click-to-define + dyslexia mode | Web Speech API; glossary popover; OpenDyslexic | Yes |
| 4.6 | Leitner v2 | Card types, due queue, deck stats, keyboard review, Anki export | Yes |
| 4.7 | Whiteboard pro features | Shapes, LaTeX, images, layers, infinite canvas, templates, export | Yes |
| 4.8 | Scratchpad CAS | Symbolic algebra, units, graphing, step explanations | Yes |
| 4.9 | Quiz variety + IRT wiring | All item types; grounded feedback; confidence calibration | Yes |
| 4.10 | Compare interactive | Sortable columns, diff highlighting, CSV export, concept picker | Yes |
| 4.11 | Argument Map interactive | Add/critique nodes, strength, counter-arguments | Yes |
| 4.12 | Simulator parameter explorer | Formula-driven plots, Pyodide simulations | Yes |
| 4.13 | Sub-line annotations + Reader merge | Multi-color highlights, margin notes, shared annotations | Yes |
| 4.14 | WCAG 2.2 AA pass | axe CI passes on workspace + key screens | Yes |
| 4.15 | PWA + mobile touch UX | Installable, offline, INP < 200 ms on mid-range phone | Yes |

### Phase 5 — Backend production scale

| # | Task | Acceptance | Owner-agnostic |
| - | ---- | ---------- | -------------- |
| 5.1 | Client wiring of nlp/rag/ocr/teacher + token refresh | `sourceContext.ts` optionally uses server RAG; `authClient.ts` silent refresh; teacher UI scaffolded | Yes |
| 5.2 | Secrets vault + JWT/argon2 hardening | Secrets manager integration; argon2id; key rotation; force-logout | Yes |
| 5.3 | Structured audit logs | Pino/Winston for auth, billing, admin | Yes |
| 5.4 | pgvector server RAG + incremental indexing | `POST /v1/rag/search`; re-embed only changed files | Yes |
| 5.5 | Redis-backed rate limit + BullMQ job queue | Multi-replica safe; Whisper/OCR/index/generation jobs with progress | Yes |
| 5.6 | Teacher/class dashboard UI | Class management, assignments, grading, cohort analytics | Yes |
| 5.7 | Multi-tenant RBAC | student/teacher/org-admin roles; privacy-gated progress | Yes |
| 5.8 | GDPR export/delete endpoints | User can export/delete all data; server cascade | Yes |
| 5.9 | IaC + observability | Docker Compose + Helm; OpenTelemetry; alerts; backups | Yes |
| 5.10 | Optional Edge proxy | If requested, ~200-line Cloudflare/Vercel Edge function | Yes |

### Phase 6 — Breadth, polish & scale

| # | Task | Acceptance | Owner-agnostic |
| - | ---- | ---------- | -------------- |
| 6.1 | Full i18n (100%) | EL + EN coverage everywhere; CI lint | Yes |
| 6.2 | Other-surface enrichments (§8) | Dashboard, Library, Upload, CourseView, Analytics, Tasks, Agent, Settings, Onboarding, Landing, Notifications | Yes |
| 6.3 | Collaboration | Shared annotations, collaborative concept map, discussion threads | Yes |
| 6.4 | Visual regression + performance budgets | CI gates | Yes |
| 6.5 | Push notifications | Web push for due reviews, streak risk, exam countdown | Yes |
| 6.6 | Curriculum / multi-course | Cross-course prereqs, programs, versioning | Yes |

### Sequencing rule

- Phase 0 before everything (removes false assumptions).
- Phase 1 unblocks Phase 2 and 3 (DocumentModel + offline embedder).
- Phase 4 (workspace) can run in parallel with Phase 2/3 once the design system + focus bus land.
- Phase 5 (backend) can run in parallel but should wait for Phase 0 server sweep.
- Phase 6 is polish and breadth.

---

## 10. Risks, Metrics & Appendices

### 10.1 Risks & mitigations

| Risk | Likelihood | Impact | Mitigation |
| ---- | ---------- | ------ | ---------- |
| **Doc drift recurs** | Medium | High | CI doc-lint + per-PR documentation checklist (§2.4). |
| **Offline embedder bundle size/perf** | Medium | High | Quantized model, Web Worker, lazy-load, feature flag, BM25-only fallback. |
| **Determinism breaks with embeddings/LLM** | Medium | High | Pin models, seed everything, determinism tests in CI, deterministic fallback for all LLM paths. |
| **Hallucination in LLM paths** | High | High | §4.8 grounding verification; default to extractive when faithfulness low; strict mode. |
| **In-memory rate-limit/token buckets don't scale** | Medium | High | Move to Redis before multi-replica (§6.6). |
| **Scope explosion** | Medium | Medium | Phase gates; each item independently shippable; `[PARTIAL]` honesty. |
| **Privacy/GDPR exposure** | Low | High | Local-first, consent, export/delete, encryption at rest. |
| **A11y treated as optional** | Medium | High | Release-blocking + axe in CI (§5.6). |
| **Eval gold-set bias** | Medium | Medium | Multi-subject, multi-lingual fixtures; community-reviewed. |
| **Offline-first UX degraded by proxy dependency** | Medium | High | Every feature must have a deterministic offline path; proxy only upgrades quality. |

### 10.2 Metrics dashboard

Track these to know if the product-scale work is actually working.

| Metric | Baseline | Target | How measured |
| ------ | -------- | ------ | ------------ |
| Course generation success rate | ? | ≥ 99% | Telemetry / logs |
| Course quality score (source) | 0.7 avg | ≥ 0.9 | `courseSourceQuality.ts` rubric |
| Citation accuracy | ? | ≥ 0.95 | Eval harness strict mode |
| Concept extraction F1 | ? | ≥ 0.85 | Eval harness |
| Prereq DAG acyclicity | ? | 100% | Unit test |
| Workspace INP (mobile) | ? | < 200 ms | Lighthouse / CrUX |
| WCAG violations | ? | 0 | axe CI |
| i18n coverage | ~35% | 100% | i18n lint |
| Test coverage | ~59 tests | 80% `src/lib/` | Vitest coverage |
| Server route integration coverage | 0 | 100% | Supertest |
| Rate-limit false positives | ? | < 1% | Logs |
| Teacher dashboard adoption | 0 | Measured | Analytics |

### 10.3 File/function pointer index

**Client recognition/course:**
- `src/store/useStore.ts` (`processUpload`)
- `src/lib/uploadPipeline.ts` (`buildCourseFromOutline`, `buildCourseFromUpload`)
- `src/lib/contentAnalysis.ts` (`analyzeContentToOutline`, `extractiveSummary`, `buildObjectives`, `canonicalConcept`, `rankKeyphrases`, `detectSections`, `splitSentences`)
- `src/lib/noteContentExtractors.ts` (`buildQuizFromNotes`, `extractComparisons`, `buildConceptMapFromCourse`, `buildDebateTreeFromNotes`)
- `src/lib/entityExtract.ts`, `src/lib/embeddingCluster.ts`, `src/lib/conceptSectionBinding.ts`, `src/lib/conceptProvenance.ts`, `src/lib/conceptEdges.ts`, `src/lib/courseGenerator.ts`, `src/lib/courseMerge.ts`, `src/lib/taskGenerator.ts`, `src/lib/taskFlowContent.ts`, `src/lib/groundedLesson.ts`, `src/lib/lessonGenerator.ts`, `src/lib/practiceExercises.ts`

**Retrieval/pedagogy:**
- `src/lib/rag.ts`, `src/lib/sourceContext.ts`, `src/lib/pedagogy.ts`, `src/lib/spacedRepetition.ts`, `src/lib/skillNodes.ts`, `src/lib/retentionAnalytics.ts`, `src/lib/activityLog.ts`, `src/lib/feynmanRubric.ts`, `src/lib/feynmanCoach.ts`, `src/lib/formulaSolver.ts`

**Ingestion:**
- `src/lib/pdfExtract.ts`, `src/lib/ocrExtract.ts`, `src/lib/youtubeTranscript.ts`, `src/lib/pyodideRunner.ts`

**Workspace UI:**
- `src/components/workspace/StudyWorkspace.tsx`
- `src/components/workspace/DraggableConceptMap.tsx`, `CognitiveReader.tsx`, `LeitnerBox.tsx`, `StudyWhiteboard.tsx`, `FeynmanCheck.tsx`, `StudyTimer.tsx`, `ArgumentMap.tsx`, `WorkspaceQuiz.tsx`, `FormulaScratchpad.tsx`, `AnnotationOverlay.tsx`, `InteractiveSimulator.tsx`, `MiniDashboard.tsx`, `CommandPalette.tsx`, `WorkspaceEmptyState.tsx`

**Store/persistence:**
- `src/store/useStore.ts`, `src/lib/libraryStorage.ts`, `src/lib/indexedDbStorage.ts`, `src/lib/librarySync.ts`, `src/lib/sessionSync.ts`, `src/lib/workspacePersistence.ts`, `src/lib/authClient.ts`, `src/lib/i18n.ts`, `src/lib/identity.ts`, `src/lib/demoMode.ts`

**Server:**
- `server/src/index.ts`
- `server/src/routes/` (`auth`, `proxy`, `usage`, `library`, `session`, `youtube`, `billing`, `admin`, `nlp`, `rag`, `ocr`, `teacher`)
- `server/src/middleware/` (`auth`, `usage`, `rateLimit`)
- `server/src/lib/` (`upstream`, `ner`, `ragServer`, `ocrServer`, `youtubeCaptions`)
- `server/src/store/` (`accounts`, `libraryStore`, `sessionStore`, `tokenStore`, `postgres`)
- `server/migrations/`

**New modules proposed by this plan:**
- `src/lib/documentModel.ts`, `src/lib/localEmbedder.ts`, `src/lib/outlineSynthesis.ts`, `src/lib/termhood.ts`, `src/lib/conceptSalience.ts`, `src/lib/relationMine.ts`, `src/lib/discourseSegment.ts`, `src/lib/numericExtract.ts`, `src/lib/groundingVerify.ts`, `src/lib/audioTranscript.ts`, `src/lib/webExtract.ts`, `src/lib/tableExtract.ts`, `src/lib/adaptiveScheduler.ts`, `src/workers/recognition.worker.ts`, `src/eval/`
- `server/src/lib/secrets.ts`, `server/src/lib/audit.ts`, `server/src/lib/telemetry.ts`, `server/src/middleware/rbac.ts`, `server/src/middleware/moderation.ts`, `server/src/routes/gdpr.ts`, `server/src/jobs/`

### 10.4 Glossary of terms

| Term | Meaning |
| ---- | ------- |
| **DUP** | Document Understanding Pipeline — the target architecture with a typed `DocumentModel`. |
| **D9** | The hardcoded-economics-vocabulary defect in `uploadPipeline.ts` (fixed). |
| **Grounding** | The property that generated content is verifiable against source spans. |
| **Strict mode** | Agent/lesson generation uses only retrieved source material; no LLM enrichment. |
| **Enriched mode** | LLM may add background knowledge, but flagged and separated from grounded content. |
| **IRT-lite** | Item Response Theory without a full ML model: track difficulty/discrimination from attempts. |
| **FSRS** | Free Spaced Repetition Scheduler — a modern spaced-repetition algorithm. |
| **PMI** | Pointwise Mutual Information — a co-occurrence-based association measure. |
| **MMR** | Maximal Marginal Relevance — a redundancy-aware ranking method. |

### 10.5 Conclusion & next step

Synapse Learning is already a credible post-MVP product. The path to state-of-the-art is not to add more half-features, but to deepen the three core pillars:

1. **A typed, offline-first Document Understanding Pipeline** with measurable quality.
2. **A powerful, accessible, deeply integrated Study Workspace** where every tool is genuinely useful.
3. **A hardened, scalable backend** with real teacher/classroom capabilities.

This blueprint is the canonical reference. The recommended next step is **Phase 0**: documentation reconciliation + D9 regression + server integration sweep + eval harness scaffold. Those are low-risk, high-trust actions that make every subsequent phase easier and more accurate.

> **Status:** This blueprint is the single source of truth for product-scale direction. Maintain it as decisions are made; update `ROADMAP.md` and `CHANGELOG.md` as phases ship. No shortcuts, no omissions, no illusions of capability.

---

