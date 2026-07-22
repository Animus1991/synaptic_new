# Library — exhaustive audit & upgrade plan (OPT-L*)

**Scope:** `Library` page only (courses / files / topics / demos / import / upload entry).  
**Themes:** Blueprint · Spectrum · Minimal · Minimal Dark (and any resolved aliases).  
**Viewports:** mobile (~390) · tablet (~768–900) · desktop (≥1024).  
**Gates:** Zero feature removal · demo paths stay usable · Human Pass separate from engineering.

---

## 1. Current inventory (ground truth)

| Surface | Primary files | Demo path | Prod path |
|---------|---------------|-----------|-----------|
| Page shell | `Library.tsx` | `enableDemoContent` → sample courses | `visibleCourses` + `uploadedFiles` |
| Tabs | `DescriptiveStickyTabBar` | same | same |
| Course grid/list | `CourseCard` / `CourseListItem` | `isDemoCourse` blocks delete | delete + cascade confirm |
| Topics / prereqs stack | `InfoStack` + `OverflowChipRow` | demo topic titles | course.topics + glossary |
| Examples / enrichment | `InfoStack` | glossary seed | `glossaryEntries` |
| NotebookLM import | `NotebookLmImportPanel` | paste → local import | + optional FSRS |
| Combined study / synthesis | `CrossLibrarySynthesisPanel` | when ≥2 courses | same |
| Upload entry | `onUpload` → `UploadModal` | works in demo | persists library |
| Post-upload banner | `PostUploadBanner` | n/a | after pipeline |
| File tab | `FileItem` + outline preview | sample files if seeded | real uploads |
| Quality alerts | `MiniAlert` in chrome | quality flags on demo | `sourceQuality` |
| Concept deep-link | `onOpenConcept` → `openStudyWorkspaceForConcept` | yes if wired | yes |

### Topics — known gaps (pre OPT-L1)

1. Primary topic click opened **course review only** (`onSelectCourse`), not study workspace.  
2. Course-card topic chips were **non-interactive** (labels only).  
3. Layout: `max-w-[12rem]` / OverflowChipRow `max-w-[7.5rem] truncate` + column stack → wasted desktop width, heavy truncation.  
4. Secondary pills used `rounded-full` (9999) vs Minimal radius tokens.  
5. Meta still used `text-[10px]`/`[11px]` in places on cards.

---

## 2. Feature matrix (audit axes)

For each row: **UI · Wired · Backend/store · Themes · Mobile · Tablet · Desktop · Gap**

| Feature | UI | Wired | Store/API | Themes | M/T/D | Gap / OPT |
|---------|----|-------|-----------|--------|-------|-----------|
| Upload CTA / drop zone | ✓ | ✓ | modal + pipeline | all | ok | polish density L2 |
| Search / filters / sort | ✓ | ✓ | local prefs | all | chips wrap | L2 filter a11y |
| Grid ↔ list toggle | ✓ | ✓ | localStorage | Minimal defaults list | ok | — |
| Course open | ✓ | ✓ | `openCourseReview` | all | ok | — |
| Study / notebook shell | ✓ | ✓ | workspace / notebook | all | list hides nb on xs | L2 |
| Delete course/file | ✓ | ✓ | cascade copy | all | confirm modal | demo blocked ✓ |
| Topic stack primary | ✓ | **L1** | workspace concept | all | **L1 responsive** | L1 |
| Topic stack secondary | ✓ | ✓ concept | workspace | all | L1 | L1 |
| Examples / enrichment | ✓ | ✓ concept | glossary | all | L1 | L1 |
| Course topic chips | ✓ | **L1** | workspace | all | densify | L1 |
| NotebookLM import | ✓ | ✓ | import + FSRS opt | all | panel collapse | L3 verify |
| Cross-library synthesis | ✓ | ✓ | LLM/local | gated focus | panel | L3 |
| Demo sandbox banner | shell | ✓ | demoMode | all | ok | L4 demo study |
| RAG index banner | ✓ | ✓ | progress | all | ok | — |
| Empty states | ✓ | ✓ | — | all | ok | — |
| Combined study Select | UI | verify | — | all | — | L3 |
| Outline on file expand | ✓ | ✓ | preview builders | all | — | L2 typography |
| Reprocess | file/course | ✓ | pipeline | all | — | L3 errors |

---

## 3. Typography / chrome checklist (per theme × viewport)

| Token / class | Target | Library offenders |
|---------------|--------|-------------------|
| Body | ≥14px (`text-sm`) | titles OK |
| Meta / hints | ≥12px (`text-xs`) prefer; floor 10px | card meta `text-[10/11px]` → L2 |
| Eyebrows | 10–11px + tracking ≤0.08em | InfoStack secondary 0.28em → L1/L2 |
| Badges | ≥10px | status chips |
| Contrast muted | dark muted ≥ `#7d8590` | inherit K30 |
| Radius | sm/md/panel tokens | InfoStack 1.5rem / pills 9999 → L1 |
| CTA | PrimaryCTA tokens | Upload OK |

Smoke: Minimal · Minimal Dark · Blueprint · Spectrum × 390 / 768 / 1280.

---

## 4. Phased delivery (no omission, no big-bang)

### Phase L1 — Topics fully functional + viewport-optimal *(this ship)*
- Primary topic → `onOpenConcept` (study workspace); fallback course review.  
- Course card topic chips → same.  
- InfoStack: full-width responsive grid (1 / 2 / 3 cols), drop narrow max-width trap, readable truncate.  
- Pills → radius-md under Minimal; eyebrow tracking nudge.  
- Demo topics use same handlers (sample data already in courses).

### Phase L2 — Density, type, list/grid chrome
- Normalize remaining `text-[10/11px]` on Library cards/list.  
- List-view Study CTA always reachable on mobile.  
- Filter chip row scroll/wrap; search clear affordance.  
- Modal titles quieter under Minimal (align K40).

### Phase L3 — Import / synthesis / combined study parity
- NotebookLM: empty/error/success + keyboard.  
- Cross-library synthesis: loading/error, demo-safe copy.  
- “Combined study / Select” end-to-end verify or wire.  
- Reprocess + quality alerts deep-link to upload/course.

### Phase L4 — Demo sandbox completeness
- Every demo control on Library opens a real surface (course, workspace topic, upload, exit).  
- Sample glossary/examples always open workspace.  
- Document demo vs prod in UI hint (no fake disabled).

### Phase L5 — Backend / sync integrity
- `libraryRemoteSync` / pull-push: conflict UX from Library if signed in.  
- File delete cascade + offline PWA reviews badge accuracy.  
- Persist view prefs across themes without clobber.

### Phase L6 — Verification matrix
- Screenshot matrix Library-only (light/dark × M/T/D).  
- Playwright smoke: topic click → workspace; chip click; filter; upload open.  
- Human Pass rows (do not self-sign).

---

## 5. Recommended execution order

`L1` → `L2` → `L3` → `L4` → `L5` → `L6`  
Each OPT: small PR, no feature removal, themes preserved.

---

## 6. Completeness log

| ID | Status |
|----|--------|
| OPT-L1 | **shipped** — topics wired + responsive InfoStack |
| OPT-L2 | **shipped** — resolve opaque `t1` prereq ids → titles; clearer secondary labels; denser readable meta |
| OPT-L3 | **shipped** — NotebookLM empty/error/success + ⌘/Ctrl+Enter; Combined study demo-safe hint + loading/error; quality MiniAlert → upload |
| OPT-L4 | **shipped** — demo sandbox hint on Library (no fake disabled); InfoStack topics/prereqs open workspace |
| OPT-L5 | **partial** — signed-in sync hint + shell offline queue; dedicated Library conflict UX / full file-cascade audit still open |
| OPT-L6 | **partial** — e2e topic/prereq smoke; Library-only screenshot matrix + Human Pass still user-owned |
| Notebook companion | See `NOTEBOOK_WORKSPACE_AUDIT_UPGRADE_PLAN.md` (OPT-N*) |
