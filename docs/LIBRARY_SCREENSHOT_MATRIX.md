# OPT-L6 — Library-only acceptance screenshot matrix

**Purpose:** Visual QA proving Library clarity on Minimal / Minimal Dark across phone · tablet · desktop without feature loss.  
**Constraint:** Human Pass rows stay user-owned — do not self-sign.  
**Companion plan:** `docs/LIBRARY_AUDIT_UPGRADE_PLAN.md` (OPT-L1…L6)

## How to capture

1. **Automated dump (recommended):** `npm run capture:library`  
   Writes PNGs + `MANIFEST.md` under `artifacts/library-l6/` (Playwright; not a CI gate).
2. Manual fill-ins: phone 390×844, tablet 768×1024, desktop 1280×800.
3. Theme cycle: **Minimal** → **Minimal Dark** (Blueprint optional baseline only).
4. Do not commit PNG binaries unless requested. Review PNGs and mark Pass? below.

## Matrix

| # | Surface | Viewport | Theme | Must show | Pass? |
|---|---------|----------|-------|-----------|-------|
| 1 | Library courses | Desktop | Minimal | Page hero; filter pills; course cards/list; Upload CTA | ☐ |
| 2 | Library courses | Desktop | Minimal Dark | Same, dark canvas | ☐ |
| 3 | Library courses | Tablet | Minimal | Filters wrap; tabs reachable; no clipped Upload | ☐ |
| 4 | Library courses | Phone | Minimal | Sticky tabs; Upload reachable; list readable | ☐ |
| 5 | Library courses | Phone | Minimal Dark | Same, dark canvas | ☐ |
| 6 | InfoStack / topics | Desktop | Minimal | Human topic/prereq titles (not raw `t1`); chip opens workspace | ☐ |
| 7 | Filter Attention | Desktop | Minimal | Attention filter toggles; aria-pressed | ☐ |
| 8 | Upload open | Desktop | Minimal | Upload CTA opens upload modal | ☐ |
| 9 | Files tab | Desktop | Minimal | Files list / empty state; delete confirm copy intact | ☐ |
| 10 | Sync conflict (signed-in) | Desktop | Minimal | Conflict panel Keep local / Keep server when pull conflicts | ☐ |
| 11 | Tools & tips chrome | Desktop | Minimal | NotebookLM / extras collapsible; still reachable | ☐ |
| 12 | Reduced motion | Desktop | Minimal | No decorative float on Library | ☐ |

## Functional checks (no screenshot required)

| Check | Pass? |
|-------|-------|
| Topic / prereq chip → study workspace | ☐ |
| Filter + sort persist across theme switch (no clobber) | ☐ |
| File delete cascade toast + Tasks reviews badge stays accurate | ☐ |
| Signed-in sync hint visible when auto-sync enabled | ☐ |

## Status

| OPT | Status |
|-----|--------|
| OPT-L6 matrix doc | **shipped** — checkboxes user-owned |
| OPT-L6 capture script | `npm run capture:library` |
| OPT-L6 Playwright smoke | `e2e/library-info-stack.spec.ts` + `e2e/library-smoke.spec.ts` |
