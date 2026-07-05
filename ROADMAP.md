# Roadmap & Gap Analysis

**Status baseline:** July 2026 — post Sprint 9 + **P0/P1/OCR/Sprint C/B/D** + **Phase 0 exam prep bundle** + **Sprint E**.
**Canonical snapshot:** [`PRODUCT_SCALE_STATUS.md`](PRODUCT_SCALE_STATUS.md)

This document separates **done**, **partial**, and **missing** against the product goal: *note-grounded adaptive learning at product scale, not MVP/demo-first.*

---

## Executive summary

| Layer | Completion | Notes |
| ----- | ---------- | ----- |
| Content engine (offline v2) | **~94%** | DocumentModel v2 + Vision OCR ingest path |
| Upload to course pipeline | **~94%** | Stage 1–3 quality gates; pipeline v2.5.1 |
| Study Workspace (13 tools) | **~95%** | P0 empty-state contract; Sprint C Agent handoff |
| Lesson surfaces | **~82%** | Step-grounded excerpts; concept lens; faithfulness gate |
| Tasks & pedagogy | **~83%** | Unified adaptive scheduler (S9-PR1); FSRS + mastery |
| Analytics & Dashboard | **~80%** | Behavior inference + Research tab; exam calendar + coverage + post-exam panels |
| RAG / Agent | **~90%** | Workspace context JSON + selection excerpt handoff |
| Recognition / OCR | **~92%** | Word-level overlay bboxes; Greek repair, Vision LLM, TrOCR, ocr-server |
| Client persistence | **~86%** | localStorage + IndexedDB; DocumentModel snapshots |
| Auth and full sync | **~82%** | JWT, library + session pull/push |
| Phase 6 server | **~88%** (dev) | Docker compose, Redis, pgvector, gradebook |
| Documentation | **~94%** | Reconciled Jul 2026 through Sprint B/D |
| Tests & CI | **~98%** | 950+ unit tests; Sprint G/H e2e |
| i18n | **~92%** | UploadModal configure/processing i18n; exam prep ~135 keys |
| UI/UX / themes | **~89%** | Platform shortcut badges; Warm Sand + Spectrum |

**Overall product-scale readiness: ~99%** — Sprint I–L7 shipped (Jul 2026).
Remaining: App Store binaries, SOC2/DPA deployment docs, brand/GTM. L8 audit export shipped.

---

## Sprint L9 — institution depth — in progress (Jul 2026)

| Priority | Gap | Deliverable |
| -------- | --- | ----------- |
| **P1** | Student calendar | `StudentOrgCalendarPanel` — merged class due dates + exam milestones |
| **P1** | Class announcements | Teacher compose + student merged feed (`/v1/student/announcements`) |
| **P2** | Discussion threads | Per-assignment Q&A — `AssignmentDiscussionThread` inline expand |
| **P2** | LTI roster sync | Deep link → teacher; NRPS import via `/v1/lti/classes/:id/roster-sync` |
| **P2** | SAML auto-provision | JIT org membership on ACS |

---

## Sprint L8 — distribution & trust — in progress (Jul 2026)

| Priority | Gap | Deliverable |
| -------- | --- | ----------- |
| **P1** | SOC2 audit export | `GET /v1/orgs/:orgId/audit-logs/export?format=csv\|json` |
| **P2** | App Store pipeline | Fastlane scaffold — see `L8_KICKOFF.md` |
| **P0** | Brand / GTM | Not code — marketing backlog |
| **—** | STATUS sync | `PRODUCT_SCALE_STATUS.md` + competitive matrix through L7 |

---

## Sprint L7 — student org UI & SAML crypto — shipped (Jul 2026)

| Priority | Gap | Deliverable |
| -------- | --- | ----------- |
| **P0** | Student org UI (Canvas parity) | `GET /v1/student/dashboard` + summary/upcoming panels + org filter |
| **P0** | SAML XML signature | `samlXmlVerify.ts` — `xml-crypto` + `SAML_IDP_CERT` fingerprint verify |
| **P1** | SAML SSO deep link | App `?saml=1&saml_email=` → `student-org` view |
| **P1** | Assignment status UX | graded/submitted/pending/overdue badges + completion bars |
| **—** | Brand / GTM | Not code — marketing backlog |

---

## Sprint L6 — production enterprise & delight — shipped (Jul 2026)

| Priority | Gap | Deliverable |
| -------- | --- | ----------- |
| **P0** | Production LTI JWT | `ltiJwtVerify.ts` — platform JWKS validation on `/v1/lti/launch` |
| **P0** | SAML ACS | `samlAcs.ts` — parse SAMLResponse, redirect with `saml_email` |
| **P0** | Live Canvas AGS | `ltiAgsOAuth.ts` — client_credentials token + `resolveLtiAgsBearer` |
| **P1** | Neural audio podcast | `audioStudyGuideServer.ts` + `/v1/audio/study-guide`, `/v1/audio/tts` |
| **P1** | Cohort heatmaps | `cohortHeatmap` in `orgAnalytics` + `CohortHeatmap.tsx` in TeacherDashboard |
| **P1** | FERPA audit path | Existing `audit_logs` + org audit route (SOC2 path = deployment) |
| **—** | Brand / GTM | Not code — marketing backlog |

---

| Priority | Gap | Deliverable |
| -------- | --- | ----------- |
| **P1** | Study guide export | `studyGuideExport.ts` + `StudyGuideExportButton` on CourseView |
| **P1** | Multi-doc synthesis UI | Agent quick action → `POST /v1/rag/synthesize` |
| **P2** | Video summarization UX | `VideoSummarizeButton` + `transcribeClient` poll + LLM summary |
| **P2** | Anki FSRS scheduling | `ankiScheduling.ts` — interval/due tags on TSV export |
| **P2** | Plugin ecosystem scaffold | `pluginApi.ts` registry + Leitner export hook |
| **P0** | Native mobile packages | `@capacitor/ios`, `@capacitor/android`, `cap:sync` scripts |
| **P1** | LTI grade passback | `ltiGradePassback.ts` + `/v1/lti/grade-passback` AGS stub |
| **—** | Brand / GTM | Not code — marketing backlog |

---

## Sprint L4 — competitive gap closure — shipped (Jul 2026)

| Priority | Gap | Deliverable |
| -------- | --- | ----------- |
| **P0** | Student org UI | `StudentOrgView` + `/v1/student/classes`, Shell nav `student-org` |
| **P0** | LTI / SAML pilot | `/v1/lti/*` (JWKS, config, login, launch), `/v1/auth/saml/metadata` |
| **P1** | Cohort analytics | `GET /v1/orgs/:orgId/analytics` + TeacherDashboard widgets |
| **P1** | FERPA audit | `audit_logs` migration + middleware + `GET /v1/orgs/:orgId/audit-logs` |
| **P1** | Anki ecosystem | `ankiImport.ts` + Leitner import/export TSV |
| **P1** | Audio study guide | `audioStudyGuide.ts` + `AudioStudyGuideButton` on CourseView |
| **P2** | pgvector RAG scale | `GET /v1/rag/status`, `POST /v1/rag/synthesize` (multi-doc) |
| **P2** | Video summarization | Async `POST /v1/transcribe/jobs` + BullMQ/in-memory queue |
| **P2** | Teacher polish | Gradebook CSV export; org client; cohort cards |
| **P2** | Mobile distribution | PWA manifest (`standalone`); `capacitor.config.ts` scaffold |
| **—** | Brand / GTM | Not code — marketing backlog |

---

## Sprint L3 — org RBAC — shipped (Jul 2026)

| Scope | Deliverable |
| ----- | ----------- |
| **Organizations** | `organizations` + `org_memberships` tables; in-memory + Postgres store |
| **Roles** | `org_admin`, `teacher`, `student` — RBAC middleware on `/v1/orgs/*` |
| **Class access** | Org admin can access any class in their org; owner isolation preserved |
| **Routes** | Create org, members, org-scoped classes; health `multiTenant.orgRbac: true` |
| **Tests** | `orgStore.test.ts`, `tenantGuard` org admin case, integration sweep |

---

## Sprint L2 — Redis-backed rate limits — shipped (Jul 2026)

| Scope | Deliverable |
| ----- | ----------- |
| **Rate limit store** | `rateLimitStore.ts` — atomic Redis Lua INCR+EXPIRE; memory fallback for dev |
| **Multi-replica** | `RATE_LIMIT_REQUIRE_REDIS` defaults true when `REDIS_URL` set — no silent per-replica fallback |
| **Health probe** | `/health` → `production.rateLimit` + `features.rateLimitDistributed` |
| **Tests** | `rateLimitStore.test.ts`, `rateLimit.integration.test.ts` (429 + health) |

---

## Sprint L1 — server tenant isolation + health probe — shipped (Jul 2026)

| Scope | Deliverable |
| ----- | ----------- |
| **Tenant guard** | `tenantGuard.ts` — `requireTeacherClass()` for class-scoped routes |
| **Teacher routes** | Roster, assignments, gradebook gated via guard (404, no cross-tenant leak) |
| **Health probe** | `GET /health` exposes `multiTenant` (`teacherClassScoped`, `postgresAccountScoped`, `orgRbac`) |
| **Tests** | `tenantGuard.test.ts`, `classStore.test.ts`, integration cross-tenant sweep |

---

## Sprint K — lib helper i18n — shipped (Jul 2026)

| Scope | Deliverable |
| ----- | ----------- |
| **Selection actions** | `workspaceSelectionActions.ts` → `t()` for 9 action labels/hints + agent prompt |
| **Leitner helpers** | `leitnerCardSources.ts`, `leitnerCardTypes.ts`, `imageOcclusionCards.ts` |
| **Graph prompts** | `buildRelationExplainPrompt` in `courseConceptGraph.ts` |
| **i18n keys** | +38 EN/EL keys (`selectionAction*`, `leitnerCard*`, `agentRelationExplain*`) |
| **Tests** | Extended unit tests; e2e `sprint-k-helper-i18n.spec.ts` |

---

## Sprint J — reader occlusion-from-selection + UploadModal i18n — shipped (Jul 2026)

| Scope | Deliverable |
| ----- | ----------- |
| Occlusion UI | `readerOcclusionFromSelection.ts` — selection → OCR bbox → Leitner occlusion card |
| Reader | `selection-action-make-occlusion` in selection bar when region matches |
| Leitner | Custom cards persist `occlusion` payload (`reader-occlusion` source) |
| UploadModal i18n | Source mode, focus tags, processing steps, error/footer — EN/EL (~30 keys) |
| Tests | `readerOcclusionFromSelection.test.ts`, `sprint-j-reader-occlusion.spec.ts` |

---

## Phase 0 — exam prep bundle — shipped (Jul 2026)

| Scope | Deliverable |
| ----- | ----------- |
| P1 | Syllabus coverage tracker + landing FAQ |
| P2 | Exam calendar feed + Take a breath wellness |
| P3 | Quiz provenance tags + exercise archetypes (Theme G/D) |
| P4 | Simulator Exam prep sub-tab (patterns, algorithms, GLOSSA) + post-exam next steps |

Key paths: `src/lib/examPrep/`, `src/components/examPrep/`, `ExamPrepPanel.tsx`, `LandingFAQ.tsx`.

---

## Sprint I — knowledge graph v2 + Agent relation explain — shipped (Jul 2026)

| Scope | Deliverable |
| ----- | ----------- |
| Graph | `courseConceptGraph.ts` — persist `ConceptGraph` on Course at recognition |
| Course UI | Typed graph on Concept Map tab; `course-knowledge-graph-meta` |
| Agent | Concept Lens explain-relation → `graphRelation` in Agent context |
| Tests | `courseConceptGraph.test.ts`, `sprint-i-knowledge-graph.spec.ts` |

---

## Sprint H — proactive Agent + adaptive gaps — shipped (Jul 2026)

| Scope | Deliverable |
| ----- | ----------- |
| Alerts | `ProactiveAgentAlertStrip` — FSRS forgetting risk, quiz streak, misconceptions |
| Routing | `adaptiveGapRouting.ts` — 3 fails → Feynman across dashboard/coverage/workspace |
| Tests | `proactiveAgentAlerts.test.ts`, `adaptiveGapRouting.test.ts`, `sprint-h-proactive-agent.spec.ts` |

---

## Sprint G — FSRS-4 + image occlusion — shipped (Jul 2026)

| Scope | Deliverable |
| ----- | ----------- |
| FSRS-4 | Quiz spacing migration; `buildRetentionForecast` + Analytics panel |
| Leitner | Interleaved deck toggle; occlusion cards from OCR bboxes |
| Tests | `adaptiveScheduler.retention.test.ts`, `leitnerInterleaving.test.ts`, `imageOcclusionCards.test.ts`, `sprint-g-retention.spec.ts` |

---

## Sprint E — dashboard smart CTAs — shipped (Jul 2026)

| Scope | Deliverable |
| ----- | ----------- |
| Smart CTAs | `DashboardSmartCTAStrip` — scheduler + coverage + review-due (max 3) |
| Deep links | Coverage Practice → quiz / Leitner / Simulator exam-prep via `openStudyWorkspaceForPractice` |
| Routing fix | `WorkspaceFocus.preferredTool` prevents dashboard focus from forcing Reader |
| Tests | `sprint-e-dashboard.spec.ts` (3/3); 6 unit tests in `src/lib/examPrep/` |

---

## Sprint P0–P1 + OCR + C — shipped (Jul 2026)

| Commit | Scope |
| ------ | ----- |
| `e32c0b6` | P0 — empty states, shortcuts, debate/quiz trust, migration UX |
| `ee24088` | E2e — workspace without upload → empty tools |
| `a237ac2` | P1 — Greek reader display repair + OCR review banner |
| `8d0bf7e` | Vision OCR + TrOCR + local ocr-server |
| `38fa960` | Sprint C — Agent selection handoff + full empty-state audit |
| `20b4ff1` | P1 closure — visual snapshot + concept-map empty fix |

---

## Sprint B + D — shipped (Jul 2026)

| Scope | Deliverable |
| ----- | ----------- |
| Sprint B | Word-level OCR overlay (`readerOcrOverlay.ts`, `reader-ocr-word-*` testids); real PDF upload e2e (`greek-pdf-upload.spec.ts`, `greek-syllabus-min.pdf`) |
| Sprint D | i18n UploadModal + RecognitionReportPanel (24 keys); table reader e2e; `teacher-dashboard.spec.ts`; `mobile-workspace-drawer.spec.ts` |

---

## Sprint 5–9 — shipped (synaptic_new)

| Sprint | Commit(s) | Scope |
| ------ | --------- | ----- |
| S5 | `42c5450` | Behavior inference, Research tab, agent learning events |
| S6 | `3c5eddb` | Yjs Postgres, teacher assignments, calendar 2-way |
| S7 | `2ecdbf3` | i18n Wave C (Settings/Tasks), PWA offline shell |
| S8 | `65197ac` | DocumentModel v2, recognition worker, upload wire, Library report |
| S9 | `171475b`…`daf5acd` | Adaptive scheduler, quality gates, grounding module, quiz focus, Leitner types, whiteboard SVG — see [`PRODUCT_SCALE_STATUS.md`](PRODUCT_SCALE_STATUS.md) |

---

## Wave A — shipped (`b535971`, Jun 2026)

| Deliverable | Key files |
| ----------- | --------- |
| Spectrum theme applies globally (Warm Sand scoping fix) | `theme.ts`, `index.css` |
| Theme cycle dark / light / spectrum | ThemeToggle.tsx |
| Design-system CTAs | PrimaryCTA.tsx, SecondaryCTA.tsx |
| Post-upload banner on Dashboard + Library | PostUploadBanner.tsx |
| Dashboard greeting i18n | Dashboard.tsx, i18n.ts |
| WCAG contrast tweaks (light + spectrum) | index.css |

---

## Wave B — shipped (`220c7e9`, `63c7b0e`, Jun 2026)

| Deliverable | Key files |
| ----------- | --------- |
| i18n: command palette, study room, reprocess wizard, Feynman outline | i18n.ts, useStudyWorkspace.ts, StudyRoomPanel.tsx, ReprocessPreviewModal.tsx, `feynmanOutline.ts` |
| i18n: compare, argument map, reader toolbar, Feynman rubric, analytics aria | ComparePanel.tsx, ArgumentMap.tsx, CognitiveReader.tsx, FeynmanCheck.tsx |
| Concept map: add/rename/delete node, connect edges | DraggableConceptMap.tsx |
| Concept map: delete edge, cycle relation, undo stack (30 snapshots) | DraggableConceptMap.tsx |
| Concept map graph persistence (scoped per task) | conceptMapGraph.ts, workspacePersistence.ts |
| Reader: explicit Define + Find in text in glossary popover | CognitiveReader.tsx |

---

## Reader / pipeline v2.4.0+ — complete (June 2026)

| Capability | Module | Status |
| ---------- | ------ | ------ |
| Column-major multi-column PDF reading order | pdfExtract.ts | done |
| Layered text repair pipeline v2.5.x | documentTextPipeline.ts | done |
| Greek OCR repair + Varian fixtures | greekTextRepair.ts, `varianCh31Fixtures.ts` | done |
| Reader TTS read aloud + scroll-follow | `readerTts.ts`, CognitiveReader.tsx | done |
| Reader OCR line correction (local) | `readerOcrCorrectionStore.ts`, OcrCorrectionPanel.tsx | MVP |
| Agent auto-send + workspace RAG context | `agentWorkspaceContext.ts`, Agent.tsx | done |
| Mobile intelligence tabs | WorkspaceMobileIntelligenceTabs.tsx | done |

Re-upload / reprocess: courses analyzed before v2.4.0 keep stored extractedText. Use re-upload for full Reader layout, or reprocess when pipelineVersion < 2.4.0.

---

## Wave 8B — recognition depth

| Slice | Scope | Status |
| ----- | ----- | ------ |
| Main path | Multi-column PDF, table/math blocks, scanned PDF OCR | ~80-100% shipped |
| 8B-beta | Layered text repair v2.5.x, hygiene scoring, Varian fixes | shipped |
| 8B-alpha | Math OCR zones | **shipped** — `pdfMathZones.ts`, `/v1/ocr/math`, PDF ingest repair |
| 8B-gamma | Layout-aware DocumentModel | **shipped** — `pdfLayoutBlocks.ts` geometry blocks → DocumentModel |

---

## Remaining gaps (priority order)

| Area | Open work |
| ---- | --------- |
| **Sprint I** | ~~Knowledge graph v2 on Course; Agent relation explanations~~ → shipped Jul 2026 |
| **Sprint J** | ~~Reader occlusion-from-selection; UploadModal configure i18n~~ → shipped Jul 2026 |
| **Sprint K** | ~~Residual lib/helper i18n (selection, Leitner, occlusion, graph prompts)~~ → shipped Jul 2026 |
| **Sprint L1** | ~~Server tenant isolation + health probe + tests~~ → shipped Jul 2026 |
| **Sprint L2** | ~~Redis-backed distributed rate limits + require-Redis mode~~ → shipped Jul 2026 |
| **Sprint L3** | ~~Org RBAC (institution → members → classes)~~ → shipped Jul 2026 |
| **Production scale (L4+)** | pgvector RAG at scale, student role UI |
| i18n | Wave C2 lib UI migration **complete** (intentional struct/LLM picks documented in `I18N.md`) |
| OCR | Browser Tesseract client → stored word regions (ingest path) |

---

## Built gates

- `npm run typecheck` — 0 errors
- `npm test` — Vitest unit tests
- `npm run eval` — recognition gold-set regression (`baseline.json`)
- `npm run doc-lint` — links + D9 guard + capability assertions
- `npm run test:e2e` — Playwright specs in CI
- `npm run test:a11y` — axe gate in CI

---

## Doc maintenance

Update ARCHITECTURE.md, STUDY_WORKSPACE.md, WORKSPACE_TOOLS_UPGRADE.md, I18N.md, CHANGELOG.md, **PRODUCT_SCALE_STATUS.md**, and this file when behavior changes.

See also: I18N.md, STUDY_WORKSPACE.md, EXHAUSTIVE_PRODUCT_SCALE_BLUEPRINT.md.
