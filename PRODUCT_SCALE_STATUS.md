# Product-scale status (canonical snapshot)

**Last reconciled:** 2026-07-06 — aligned through **Sprint L9-1** (student calendar) + **L9-2** (class announcements).

This file is the **single shipped-truth status doc**. Use it for readiness reviews,
sprint close-outs, and investor/contributor snapshots.

| Doc | Role |
| --- | ---- |
| **`PRODUCT_SCALE_STATUS.md`** (this file) | What ships today + open gaps |
| `ROADMAP.md` | Layer completion table + sprint tables |
| `CHANGELOG.md` | Dated shipped history |
| `PRODUCT_SCALE_PLAN.md` | Forward masterplan (workstreams, sequencing) |

---

## Overall readiness

**~99% product-scale** — Sprint I–**L7** shipped (Jul 2026).
Remaining gaps: App Store signed builds, SOC2/DPA deployment docs, brand/GTM (see `L8_KICKOFF.md`).

---

## Sprint L8 — distribution & trust — in progress (Jul 2026)

| Scope | Deliverable |
| ----- | ----------- |
| **L8-2 audit export** | `GET /v1/orgs/:orgId/audit-logs/export?format=csv\|json` — SOC2/FERPA audit bundle |
| **L8-2 compliance docs** | `docs/compliance/{DATA_MAP,RETENTION,DPA_TEMPLATE}.md` + `docs/legal/PRIVACY_POLICY.md` |
| **L8-1 mobile scaffold** | `mobile/fastlane/*`, store metadata, npm `mobile:*` scripts |
| **L8-4 STATUS sync** | This file + competitive matrix canvas reconciled through L7 |
| **L8-3 Brand/GTM** | Not code — marketing backlog |

Regression gate: `cd server && npm test` (includes `auditLogExport.test.ts`).

---

## Sprint L9 — institution depth — in progress (Jul 2026)

| Scope | Deliverable |
| ----- | ----------- |
| **L9-1 student calendar** | `StudentOrgCalendarPanel` — class due dates + exam feed; filters All / Class work / Exams |
| **L9-2 class announcements** | Teacher `GET/POST/DELETE /v1/teacher/classes/:id/announcements`; student `GET /v1/student/announcements`; collapsible feed in `StudentOrgView` |
| **L9-3 discussion threads** | Per-assignment Q&A stub — teacher/student `.../assignments/:id/discussion`; `AssignmentDiscussionThread` inline expand |
| **L9-4 LTI roster sync** | Deep link → teacher dashboard; `POST /v1/lti/classes/:id/context-link` + `roster-sync` (NRPS or stub) |
| **L9-5 SAML auto-provision** | Not started |

Regression gate: `cd server && npm test` (announcement integration sweep).

---

## Sprint L7 — student org UI & SAML crypto — shipped (Jul 2026)

| Scope | Deliverable |
| ----- | ----------- |
| **Student dashboard** | `GET /v1/student/dashboard` + `StudentOrgSummary` + `StudentUpcomingPanel` |
| **SAML XML signature** | `samlXmlVerify.ts` — `xml-crypto` + `SAML_IDP_CERT` fingerprint verify |
| **SAML deep link** | App `?saml=1&saml_email=` → `student-org` view |
| **Assignment UX** | graded/submitted/pending/overdue badges + completion bars |
| **Health** | `features.l7Enterprise.studentOrgDashboard`, `samlXmlSignature` |

Regression gate: `cd server && npm test`; Sprint L7 e2e green.

---

## Sprint L6 — production enterprise & delight — shipped (Jul 2026)

| Scope | Deliverable |
| ----- | ----------- |
| **Production LTI JWT** | `ltiJwtVerify.ts` — platform JWKS on `/v1/lti/launch` |
| **SAML ACS** | `samlAcs.ts` — parse SAMLResponse, redirect with `saml_email` |
| **Live Canvas AGS** | `ltiAgsOAuth.ts` — client_credentials + `resolveLtiAgsBearer` |
| **Neural audio podcast** | `audioStudyGuideServer.ts` + `/v1/audio/study-guide`, `/v1/audio/tts` |
| **Cohort heatmaps** | `cohortHeatmap` in `orgAnalytics` + `CohortHeatmap.tsx` |
| **FERPA audit path** | `audit_logs` + `GET /v1/orgs/:orgId/audit-logs` |

Regression gate: `cd server && npm test`.

---

## Sprint L5 — mobile & competitive polish — shipped (Jul 2026)

| Scope | Deliverable |
| ----- | ----------- |
| **Native mobile** | `@capacitor/ios`, `@capacitor/android`, `cap:sync` scripts |
| **LTI grade passback** | `ltiGradePassback.ts` + `/v1/lti/grade-passback` AGS stub |
| **Study guide export** | `studyGuideExport.ts` + `StudyGuideExportButton` |
| **Multi-doc synthesis** | Agent quick action → `POST /v1/rag/synthesize` |
| **Video summarization UX** | `VideoSummarizeButton` + transcribe poll + LLM summary |
| **Anki FSRS scheduling** | `ankiScheduling.ts` — interval/due tags on TSV export |
| **Plugin scaffold** | `pluginApi.ts` registry + Leitner export hook |

Regression gate: `npm test`; `npm run typecheck`.

---

## Sprint L4 — competitive gap closure — shipped (Jul 2026)

| Scope | Deliverable |
| ----- | ----------- |
| **Student org UI** | `StudentOrgView` + `/v1/student/classes`, Shell nav `student-org` |
| **LTI / SAML pilot** | `/v1/lti/*` (JWKS, config, login, launch), `/v1/auth/saml/metadata` |
| **Cohort analytics** | `GET /v1/orgs/:orgId/analytics` + TeacherDashboard widgets |
| **FERPA audit** | `audit_logs` migration + middleware + org audit route |
| **Anki ecosystem** | `ankiImport.ts` + Leitner import/export TSV |
| **Audio study guide** | `audioStudyGuide.ts` + `AudioStudyGuideButton` on CourseView |
| **pgvector RAG scale** | `GET /v1/rag/status`, `POST /v1/rag/synthesize` |
| **Video summarization** | Async `POST /v1/transcribe/jobs` + BullMQ/in-memory queue |
| **Mobile distribution** | PWA manifest (`standalone`); `capacitor.config.ts` scaffold |

Regression gate: `cd server && npm test`; Sprint L4 integration sweep green.

---

## Sprint L3 — org RBAC — shipped (Jul 2026)

| Scope | Deliverable |
| ----- | ----------- |
| **Institutions** | `POST/GET /v1/orgs`, members API, org-scoped class creation |
| **RBAC** | `middleware/rbac.ts` — `org_admin`, `teacher`, `student` roles |
| **Class guard** | Org admin can read/manage any class in org via `requireTeacherClass` |
| **Schema** | Migration `1740000000007_organizations`; `teacher_classes.org_id` |
| **Health** | `multiTenant.orgRbac: true` |

Regression gate: `cd server && npm test`.

---

## Sprint L2 — Redis-backed rate limits — shipped (Jul 2026)

| Scope | Deliverable |
| ----- | ----------- |
| **Distributed store** | `rateLimitStore.ts` — Redis Lua INCR+EXPIRE shared across replicas |
| **Fail-closed prod** | `RATE_LIMIT_REQUIRE_REDIS` (default on when `REDIS_URL` set) — 503 if Redis down |
| **Health** | `production.rateLimit.distributed`, `features.rateLimitDistributed` on `/health` |
| **Tests** | `rateLimitStore.test.ts` (6), `rateLimit.integration.test.ts` (429 sweep) |

Regression gate: `cd server && npm test`.

---

## Sprint L1 — server tenant isolation — shipped (Jul 2026)

| Scope | Deliverable |
| ----- | ----------- |
| **Tenant guard** | `requireTeacherClass()` — class-scoped teacher APIs return 404 for non-owners |
| **Routes** | Roster, assignments, gradebook refactored through guard |
| **Health** | `/health` → `multiTenant.teacherClassScoped`, `postgresAccountScoped`, `orgRbac: false` |
| **Tests** | `tenantGuard.test.ts`, `classStore.test.ts`, integration cross-tenant sweep |

Regression gate: `cd server && npm test`.

---

## Sprint K — lib helper i18n — shipped (Jul 2026)

| Scope | Deliverable |
| ----- | ----------- |
| **Selection actions** | `workspaceSelectionActions.ts` — 9 labels/hints + `selectionAgentPrompt` via `t()` |
| **Leitner helpers** | `leitnerCardSources.ts`, `leitnerCardTypes.ts`, `imageOcclusionCards.ts` |
| **Graph prompts** | `buildRelationExplainPrompt` → `agentRelationExplain*` keys |
| **i18n keys** | +38 EN/EL keys in `i18n.ts` |
| **Tests** | Unit tests extended; `sprint-k-helper-i18n.spec.ts` |

Regression gate: `npm test`; `npm run i18n-lint`; `npm run typecheck`; Sprint K e2e.

---

## Sprint J — reader occlusion + UploadModal i18n — shipped (Jul 2026)

| Scope | Deliverable |
| ----- | ----------- |
| **Occlusion from selection** | `readerOcclusionFromSelection.ts` — match selection to OCR bbox; `make-occlusion` action |
| **Leitner persist** | Custom cards with `occlusion` payload + `reader-occlusion` source |
| **UploadModal i18n** | Source mode, focus tags, processing steps, error/footer (~30 EN/EL keys) |
| **Tests** | `readerOcclusionFromSelection.test.ts`, `sprint-j-reader-occlusion.spec.ts` |

Regression gate: `npm test` 963/963; `npm run i18n-lint`; `npm run typecheck`; Sprint I + J e2e **4/4 green**.

---

## Sprint P0–P1 + OCR + C — shipped (`20b4ff1`)

| Commit | Scope |
| ------ | ----- |
| `e32c0b6` | **P0** — upload-gated empty states; quiz `placeholder` (no fake `- - -`); debate `seedTree = null`; platform shortcuts (`Ctrl K` on Windows, breadcrumb `›`); migration affected-items list; dark elevation + WCAG brand text |
| `ee24088` | **E2e** — no-demo onboarding → 8 tools show `workspace-empty-state[data-has-source="false"]` |
| `a237ac2` | **P1 slice 1** — `readerGreekDisplay.ts` stale v2.2.0 repair; `prepareWorkspaceDisplayText` + glossary in Reader; `reader-greek-ocr-banner` |
| `8d0bf7e` | **Vision OCR** — `transcribeImageWithVision`, TrOCR handwriting (`handwritingOcr.ts`), bilingual ensemble vision path, `useVisionOcr` setting, local `ocr-server/` (Tesseract + optional vision-LLM) |
| `38fa960` | **Sprint C + P1 e2e** — `selectionExcerpt` in Agent context JSON; full empty-state audit (11 session models); e2e for 13 dock tools + Agent selection handoff |
| `20b4ff1` | **P1 closure** — concept-map empty when `!hasSource`; Greek reader visual snapshot `reader-greek-v220-body.png`; agent-handoff + greek-syllabus e2e green |

Regression gate (Jul 2026): `npm test`, `npm run eval` (30/30 Stage 3), key e2e specs
including `greek-syllabus-reader.spec.ts`, `workspace-empty-tools.spec.ts`,
`workspace-agent-handoff.spec.ts`.

---

## Phase 0 — exam prep bundle — shipped (Jul 2026)

| Scope | Deliverable |
| ----- | ----------- |
| **P1 — coverage + FAQ** | `syllabusCoverageTracker.ts` + `SyllabusCoverageWidget.tsx` on Dashboard (topics, %, countdown); `LandingFAQ.tsx` on Landing (6 Q&A) |
| **P2 — calendar + wellness** | `examCalendarFeed.ts` + `ExamCalendarPanel.tsx` (General/Panhellenic filters); Take a breath modal in Shell + StudyTimer pomodoro (`takeBreath.ts`, `TakeBreathModal.tsx`) |
| **P3 — quiz + exercises** | Quiz provenance tags (`quizProvenance.ts`, `WorkspaceQuizSession.tsx`); Theme G/D exercise archetypes (`exerciseArchetypes.ts`) |
| **P4 — Simulator sub-tab** | `ExamPrepPanel.tsx` inside Simulator: methodology patterns, algorithm stepper, GLOSSA sandbox; post-exam next steps on Dashboard |
| **i18n + tests** | ~135 EN/EL keys; 7 unit tests in `src/lib/examPrep/*.test.ts`; e2e `technotes-features.spec.ts` |

Regression gate: `npm test` 926/926; `npm run i18n-lint`; `npm run typecheck`.

**Next:** pgvector RAG at scale + student-facing org surfaces.

---

## Sprint I — knowledge graph v2 — shipped (Jul 2026)

| Scope | Deliverable |
| ----- | ----------- |
| **Graph persist** | `attachConceptGraphToCourse` in recognition worker → `Course.conceptGraph` |
| **Course UI** | `ConceptMap` tab uses typed graph + `course-knowledge-graph-meta` |
| **Agent skill** | Concept Lens `?` → `buildRelationExplainPrompt` + `graphRelation` context |
| **Tests** | `courseConceptGraph.test.ts` (8), `workspaceStoreSpine.test.ts` (`graphRelation` merge), `sprint-i-knowledge-graph.spec.ts` (2/2) |

---

## Sprint H — proactive Agent + adaptive gaps — shipped (Jul 2026)

| Scope | Deliverable |
| ----- | ----------- |
| **Proactive alerts** | `proactiveAgentAlerts.ts` + `ProactiveAgentAlertStrip` — FSRS forgetting, quiz streak, misconceptions |
| **Adaptive gap** | `adaptiveGapRouting.ts` — 3 quiz fails → Feynman (dashboard, coverage, workspace next action) |
| **Tests** | Unit tests + e2e `sprint-h-proactive-agent.spec.ts` |

Regression gate: `npm test`; `npm run typecheck`; `npm run i18n-lint`; Sprint H e2e green.

---

## Sprint G — FSRS-4 + image occlusion — shipped (Jul 2026)

| Scope | Deliverable |
| ----- | ----------- |
| **FSRS-4 productization** | Quiz spacing via `quizOutcomeToFsrsRating` + `applyFsrsToSpacing`; retrievability forecast helpers in `adaptiveScheduler.ts` |
| **Analytics panel** | `analytics-fsrs-forecast` — avg retrievability, due count, 14-day curve |
| **Interleaved Leitner** | `leitnerInterleaving.ts` + `leitner-interleave-toggle` in `LeitnerPanel` |
| **Image occlusion** | `imageOcclusionCards.ts` from `UploadedFile.ocrRegions`; `LeitnerOcclusionFace` card UI |
| **Demo + tests** | Demo `spacingIntervals` seed; unit tests + e2e `sprint-g-retention.spec.ts` |

Regression gate: `npm test`; `npm run typecheck`; `npm run i18n-lint`; Sprint G e2e green.

---

## Sprint E — dashboard smart CTAs — shipped (Jul 2026)

| Scope | Deliverable |
| ----- | ----------- |
| **Smart CTA strip** | `dashboardSmartCTAs.ts` + `DashboardSmartCTAStrip.tsx` — scheduler, coverage, review-due actions (max 3) |
| **Coverage deep links** | Per-topic Practice on `SyllabusCoverageWidget`; `recommendToolForTopic` → quiz / Leitner / Simulator exam-prep |
| **Workspace routing** | `openStudyWorkspaceForPractice`; `WorkspaceFocus.preferredTool` + `simulatorTab`; unified scheduler `workspaceTool` on next actions |
| **Tests** | 6 unit tests (`coveragePracticeActions`, `dashboardSmartCTAs`); e2e `sprint-e-dashboard.spec.ts` (3/3) |

Regression gate: `npm test` 932/932; `npm run typecheck`; `npm run i18n-lint`; Sprint E e2e green.

---

## Sprint B + D — shipped (Jul 2026)

| Scope | Deliverable |
| ----- | ----------- |
| **Sprint B — OCR bboxes** | Word-level heuristic + stored-region split in `readerOcrOverlay.ts`; `data-testid="reader-ocr-word-{i}"` + `data-ocr-granularity` in Reader overlay; 5 unit tests |
| **Sprint B — PDF e2e** | `e2e/fixtures/greek-syllabus-min.pdf` + generator; `upload-file-input` testid; `greek-pdf-upload.spec.ts` (file input → outline → workspace → reader) |
| **Sprint D — i18n** | 24 EN/EL keys for UploadModal drop zone/header/errors + RecognitionReportPanel; `npm run i18n-lint` pass |
| **Sprint D — Reader e2e** | `greek-syllabus-reader.spec.ts` table segment / indicator fallback assertion |
| **Sprint D — Teacher MVP e2e** | `teacher-dashboard.spec.ts` offline sign-in smoke |
| **Sprint D — Mobile polish e2e** | `mobile-workspace-drawer.spec.ts` @ 390×844 — bottom nav, drawer, tool switch |

Regression gate: `npm test` 919/919; `npm run i18n-lint`; e2e green for
`greek-pdf-upload`, `teacher-dashboard`, `mobile-workspace-drawer`, `greek-syllabus-reader`.

---

## Layer completion

| Layer | % | Shipped truth (Jul 2026) |
| ----- | - | ------------------------ |
| Content engine (offline v2) | **~95%** | DocumentModel v2 + PDF layout blocks (8B-gamma) |
| Upload → course pipeline | **~94%** | Stage 3 quality gates — span 95%, source text 90% |
| Study Workspace (13 tools) | **~95%** | P0 empty-state contract; selection → Agent handoff; concept-map upload gate |
| Lesson surfaces | **~82%** | Step-grounded excerpts; concept lens chrome; grounding faithfulness gate |
| Tasks & pedagogy | **~83%** | Unified adaptive scheduler (S9-PR1); FSRS + Beta-Bernoulli mastery |
| Analytics & Dashboard | **~80%** | Behavior inference + Research tab (S5); exam calendar + coverage + post-exam panels |
| RAG / Agent | **~90%** | Unified grounding; workspace context JSON + **selection excerpt handoff** |
| Recognition / OCR | **~92%** | Word-level overlay bboxes; Greek repair v2.5.1; Vision LLM + TrOCR; local `ocr-server/` |
| Client persistence | **~86%** | localStorage + IndexedDB; DocumentModel snapshots |
| Auth & sync | **~80%** | JWT, library + session pull/push |
| Phase 6 server (dev) | **~92%** | Docker compose, Redis rate limit, pgvector probe, gradebook + class Postgres |
| Documentation | **~93%** | This reconciliation pass (Jul 2026) |
| Tests & CI | **~95%** | Vitest 926; + exam prep unit tests; `technotes-features.spec.ts` e2e smoke |
| i18n | **~90%** | UploadModal + RecognitionReportPanel keys; exam prep ~135 keys; component lint allowlist empty |
| UI/UX / themes | **~89%** | Warm Sand + Spectrum; platform shortcut badges (P0) |

---

## Sprint 9 — shipped (`synaptic_new/main`)

| Commit | Scope |
| ------ | ----- |
| `171475b` | S9-PR1 — unified adaptive scheduler (dashboard + workspace actions) |
| `5afb18e` | S9-PR2 — course quality gates + workspace pro polish |
| `72854ff` | S9-PR3 — grounding faithfulness gate (lessons + agent) |
| `f1bc86b` | S9-PR4 — concept lens chrome + minimal ribbon |
| `a36037e` | S9-PR4 — QuizPanel grounded feedback → focus bus |
| `d13fad6` | S9-PR5 — grounding modules → `src/lib/grounding/` |
| `a7a862b` | Stage 1 quality gates (`qualityThresholds.ts`) |
| `ec543a3` | Stage 2 quality gates (PASS 75, span 70%, faithfulness 0.75) |
| `2ad7ad5` | Fix lesson ↔ reader step-grounded excerpt matching |
| `956a4b6` | Workspace boot latency — parallel reader/body prefetch |
| `b324969` | Whiteboard SVG export alongside PNG |
| `8134462` | Doc reconciliation — `PRODUCT_SCALE_STATUS.md` + ROADMAP/CHANGELOG sync |
| `daf5acd` | Leitner card types (term/definition/cloze/formula/mistake) |
| `a5e3c4b` | Stage 3 quality gates — span 95%, faithfulness 0.95, eval baseline |
| `0688f68` | Sub-line span annotations (`charStart`/`charEnd`, `annotationSpan.ts`) |

### Sprint 5–8 (prior)

| Sprint | Commit | Scope |
| ------ | ------ | ----- |
| S5 | `42c5450` | Behavior inference, Research tab |
| S6 | `3c5eddb` | Yjs Postgres, teacher assignments, calendar 2-way |
| S7 | `2ecdbf3` | i18n Wave C, PWA offline shell |
| S8 | `65197ac` | DocumentModel v2, recognition worker, upload wire |

---

## Workspace tools — shipped vs open

| Tool | Shipped (recent) | Still open |
| ---- | ---------------- | ---------- |
| Leitner | Card types + filter chips; quiz-mistake → `mistake` type; source badges; **cross-device deck sync via `/v1/session`** | — |
| Whiteboard | PNG + SVG export; **agent explain diagram** (`describeWhiteboardDocument` → `diagram-explain`) | — |
| Reader | TTS, OCR overlay, **word-level OCR bboxes**, **Greek v2.2.0 display repair**, suspicious + **Greek OCR review banners**, section actions, **visual regression baseline**, **real PDF upload e2e** | browser Tesseract word regions; math segment dedicated e2e |
| Quiz | **Placeholder empty state** (no fake options); grounded feedback → focus bus | IRT calibration UI |
| Debate | **Empty when no tree** (no single-node fallback) | Multi-turn grounded debate |
| Concept map | **Upload-gated empty** (`!hasSource` → no fabricated node) | Prerequisite repair from concept bus |
| Agent | BM25 + hybrid rerank; **selection excerpt in context JSON + retrieval query** | Server pgvector scale path |
| Grounding | Unified module; **Stage 3** eval gates (span 95%, faithfulness 0.95) | — |
| Annotations | Sub-line span highlights | Cross-tool highlight sync |
| Simulator | **Exam prep sub-tab** + scheduler-driven CTAs from Dashboard | — |
| Dashboard | **Coverage tracker**, **smart CTA strip**, exam calendar, post-exam next steps | — |

---

## Quality gates (`src/lib/qualityThresholds.ts`)

| Stage | PASS | Span ratio | Faithfulness (eval) | Status |
| ----- | ---- | ---------- | ------------------- | ------ |
| 1 | 68 | 55% | 0.58 (positive-only avg) | ✅ shipped |
| 2 | 75 | 70% | 0.75 | ✅ shipped |
| 3 | 75 | 95% | 0.95 | ✅ shipped |

Eval harness: `npm run eval` — 30/30 at Stage 3 baseline.

---

## Priority gaps (next)

1. **L8-1 App Store submission** — Apple/Google accounts, screenshots, signed builds, live privacy URL
2. **L8-2 legal review** — counsel sign-off on DPA template + hosted privacy policy
3. **L8-3 Brand/GTM** — landing, demo video, institution one-pager
4. **L9 institution depth** — ~~student calendar~~, ~~announcements~~, ~~LTI roster sync~~, SAML auto-provision
5. **L10 pgvector at scale** — background indexing job + progress UI

### Shipped recently (no longer open)

- ~~Sprint H proactive Agent~~ → alert strip, adaptive gap → Feynman, workspace feynman-explain (Jul 2026)
- ~~Sprint G FSRS + occlusion~~ → quiz FSRS-4, Analytics forecast, interleaved Leitner, OCR bbox cards (Jul 2026)
- ~~Sprint E smart CTAs~~ → Dashboard CTA strip, coverage Practice deep links, workspace tool routing, e2e (Jul 2026)
- ~~Phase 0 exam prep bundle~~ → coverage tracker, landing FAQ, exam calendar, Take a breath, Simulator Exam prep tab, quiz provenance, post-exam next steps (Jul 2026)
- ~~Per-word OCR bboxes~~ → `readerOcrOverlay.ts` word heuristic + `reader-ocr-word-*` testids (Sprint B)
- ~~Real PDF upload e2e~~ → `greek-pdf-upload.spec.ts` + `greek-syllabus-min.pdf` (Sprint B)
- ~~Recognition report i18n~~ → `RecognitionReportPanel.tsx` + i18n keys (Sprint D)
- ~~UploadModal drop zone i18n~~ → header, drop zone, errors (Sprint D)
- ~~Teacher MVP e2e~~ → `teacher-dashboard.spec.ts` (Sprint D)
- ~~Mobile workspace drawer e2e~~ → `mobile-workspace-drawer.spec.ts` (Sprint D)

- ~~Platform shortcuts mojibake~~ → `commandPaletteBadge()` (P0)
- ~~Fabricated quiz/debate empty content~~ → P0 + `toolEmptyStates.audit.test.ts`
- ~~Reader Greek spaced letters (v2.2.0)~~ → `readerGreekDisplay.ts` + e2e + snapshot
- ~~Vision OCR uncommitted WIP~~ → `8d0bf7e` + `ocr-server/`
- ~~Reader selection → Agent handoff~~ → `selectionExcerpt` (Sprint C)
- ~~Partial empty-state e2e (8 tools)~~ → 13 dock tools (Sprint C)

---

## Built gates

- `npm run typecheck` — 0 errors
- `npm test` / `npx vitest run` — unit tests
- `npm run eval` — recognition + grounding gold-set
- `npm run doc-lint` — links + D9 guard + capability assertions
- `npm run test:e2e` — Playwright in CI
- `npm run test:a11y` — axe gate in CI

---

## Maintenance

When shipping a user-visible feature or changing gates:

1. Add a dated entry to `CHANGELOG.md` `[Unreleased]`.
2. Update this file (commit + gap table).
3. Adjust `ROADMAP.md` layer % and sprint table if material.
4. Run `npm run doc-lint`.
