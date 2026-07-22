# Notebook workspace (Sources · Chat · Studio) — audit & upgrade (OPT-N*)

**Surface:** `NotebookWorkspaceLayout` (+ `StudyWorkspaceToolSurface`, PDF strip, studio audio, chrome).  
**Entry:** Study workspace in notebook mode · demo + prod courses.  
**Themes:** Minimal / Minimal Dark / Blueprint / Spectrum.  
**Viewports:** phone (&lt;768) · tablet (768–1023) · desktop (≥1024).  
**Related:** Library OPT-L* (topics deep-link into this workspace).

---

## 1. Inventory

| Area | Files | Demo | Prod |
|------|-------|------|------|
| 3-panel layout | `NotebookWorkspaceLayout.tsx` | sample PDF + chat | uploaded sources |
| Sources list / pin / guide | same | demo files | `courseSourceFiles` |
| PDF page strip | `PdfPageThumbnailStrip.tsx` | pageCount UI | bytes render |
| Chat column | `renderCenterAgent` / Agent | seeded turns | live agent |
| Studio grid + quick actions | studio cards + audio overview | tools open | same tools |
| Tool overlay | `StudyWorkspaceToolSurface` | all tools | all tools |
| Reprocess / quality | footer + wizard | demo quality flags | pipeline |
| Mobile tabs | Sources \| Chat \| Studio | same | same |

### Pre-N1 gaps (from audit + screenshot)

1. **Viewport:** `isMobile = width < 1024` → tablets forced into phone tabs (no true tablet layout).  
2. **PDF strip:** thumbs often non-navigating (`onSelectPage` not wired from notebook). Touch targets small (~44×56 CSS px).  
3. **Context drift:** banner can show stale concept (e.g. Philosophy) while course is Microeconomics when `openStudyWorkspace()` clears override without anchoring course topic.  
4. **Typography:** `--type-micro` = 10px; mobile tab labels `text-[10px]`.  
5. **Studio density:** fixed `grid-cols-2` even on wide studio / tablet.  
6. **Library topics:** L1 already opens workspace — must keep concept sync (N1).

---

## 2. Feature matrix (abbrev.)

| Feature | UI | Wired | Store | Themes | Phone | Tablet | Desktop | OPT |
|---------|----|-------|-------|--------|-------|--------|---------|-----|
| Source open → reader | ✓ | ✓ | workspace tool | all | tab | **N1** | ✓ | N1 |
| Source guide | ✓ | ✓ agent | — | all | ✓ | N1 | ✓ | — |
| Add / reupload source | ✓ | ✓ | upload/reprocess | all | ✓ | ✓ | ✓ | N3 |
| PDF page jump | ✓ | **N1** | reader page | all | touch N1 | N1 | N1 | N1 |
| Chat ask / cite | ✓ | ✓ | agent | calm Minimal | ✓ | ✓ | ✓ | N2 |
| Studio tool open | ✓ | ✓ | `openWorkspaceTool` | all | ✓ | N1 | ✓ | — |
| Quick quiz / mindmap | ✓ | ✓ agent | — | all | wrap | wrap | ✓ | N2 |
| Audio overview | ✓ | ✓ | FSRS opt | all | ✓ | ✓ | ✓ | N3 |
| Reprocess | ✓ | ✓ | wizard | all | ✓ | ✓ | ✓ | N3 |
| Concept = course topic | banner | **N1** | override/focus | all | ✓ | ✓ | ✓ | N1 |
| Demo full parity | partial | N4 | demoMode | all | ✓ | ✓ | ✓ | N4 |

---

## 3. Phases

### OPT-N1 — Viewport tiers + concept sync + PDF jump *(shipping)*
- Phone &lt;768: tabs; labels ≥12px; tab hit ≥40px.  
- Tablet 768–1023: 2-panel (Sources+Chat) + Studio as third slide/tabs hybrid — not phone-only.  
- Desktop ≥1024: existing 3-panel.  
- Wire PDF strip → open reader + select page.  
- `openStudyWorkspace` anchors focus to selected course first topic.  
- Notebook micro type ≥11px under Minimal; studio grid 2/3 cols.

### OPT-N2 — Chat / studio chrome
- Composer touch targets; mode rail; Full view.  
- Quick-action wrap + loading states durable.  
- Active studio card visible state (Compare highlight durable).

### OPT-N3 — Sources integrity
- Multi-source pin/order; thumbnail reprocess; empty demo seed.  
- Source check deep-link; quality strip always actionable.

### OPT-N4 — Demo sandbox completeness
- Every studio card + quick action works on demo Microeconomics.  
- Context never cross-contaminates Philosophy/other courses.

### OPT-N5 — Verification
- Matrix phone/tablet/desktop × Minimal/Blueprint.  
- Playwright: topic→workspace concept; PDF page; studio open.  
- Human Pass (no self-sign).

---

## 4. Completeness

| ID | Status |
|----|--------|
| OPT-N1 | **shipped** |
| OPT-N2 | **shipped** — studio card active / pressed state |
| OPT-N3 | **shipped** — quality strip always on with sources; Source check → Note Analysis; Reprocess CTA |
| OPT-N4 | **shipped** — demo mock sources seeded; studio cards + audio overview wired on Microeconomics; course-scoped agent context |
| OPT-N5 | **verification ready** — e2e: phone layout, quality→analysis, studio open; Human Pass rows remain user-owned |
| OPT-L1 / L2 (Library topics + prereq labels) | shipped — feeds this surface |
