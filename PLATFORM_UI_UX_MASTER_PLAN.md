# Synapse — Πλήρες Σχέδιο Αναβάθμισης UI/UX & Αξιοπιστίας Πλατφόρμας

> **Έκδοση:** Ιούνιος 2026  
> **Σκοπός:** Να γίνει η πλατφόρμα **αυτοεπεξηγούμενη με την πρώτη ματιά**, **άμεσα λειτουργική**, και **έτοιμη για product launch** — όχι demo με κουμπιά χωρίς λόγο ύπαρξης.  
> **Συμπληρώνει:** `STUDY_WORKSPACE_LAUNCH_PLAN.md` (λειτουργικότητα workspace) · `PRODUCT_UPGRADE_MASTER_PLAN.md` (ολική προϊοντική οπτική)

---

## 0. Αρχές σχεδιασμού (μη διαπραγματεύσιμες)

| Αρχή | Ερμηνεία για τον χρήστη |
|------|--------------------------|
| **Άμεση αντίδραση** | Κάθε κλικ δίνει οπτική/ακουστική ανατροφοδότηση σε &lt;100ms· το βαρύ φορτώνει στο background |
| **Ένα πράγμα τη φορά** | Κάθε οθόνη έχει **μία κύρια ενέργεια**· τα υπόλοιπα είναι δευτερεύοντα |
| **Λόγος ύπαρξης** | Κάθε κουμπί απαντά: *Τι κάνει; Γιατί τώρα; Τι θα δω μετά;* |
| **Συνέπεια** | Ίδια affordances σε Reader, Quiz, Annotations, Compare, Debate (selection contract §13.5) |
| **Ελληνικά πρώτα όπου χρειάζεται** | EL/EN παράλληλα· όχι hardcoded αγγλικά σε κύρια ροές |
| **Καμία σιωπηλή αποτυχία** | Αν κάτι δεν ανοίγει / δεν έχει πηγή / κολλάει → μήνυμα + επόμενο βήμα |

---

## 1. Διάγνωση: Γιατί «κολλούσε» το Study Workspace (και παρόμοια)

### 1.1 Ρίζες προβλήματος (διορθώθηκαν Ιούνιος 2026)

| Πρόβλημα | Συμπτώματα | Διόρθωση |
|----------|------------|----------|
| **Remount σε κάθε κλικ** | `workspaceMountToken++` σε κάθε `openStudyWorkspace()` → πλήρες ξαναφόρτωμα 13+ εργαλείων | Token μόνο σε **cold open** (κλειστό → ανοιχτό) |
| **Race close/open** | `flushConceptBusSync().finally(close)` έτρεχε μετά από γρήγορο reopen → workspace έκλεινε ξανά | `workspaceCloseGenRef` + `cancelPendingWorkspaceClose()` |
| **Βαρύ sync mount** | `StudyWorkspace` eager import ~2000+ γραμμές στο main bundle | **Lazy load** + `WorkspaceBootShell` άμεσο overlay |
| **Επικαλυπτόμενα overlays** | Lesson + Workspace + Review ανοιχτά ταυτόχρονα | `closeCompetingTaskOverlays()` πριν από κάθε έναρξη |
| **Λάθος context** | Dashboard «Study Workspace» κρατούσε παλιό `activeTaskId` | `openStudyWorkspace()` καθαρίζει task· `keepTask` μόνο από `startTask` |

### 1.2 Υπόλοιπα ρίσκα απόδοσης (προτεραιότητα P1)

- `buildWorkspaceNoteBundle()` sync στο πρώτο render — σκέψη: `useDeferredValue` / Web Worker για μεγάλα PDF
- `framer-motion` σε κάθε Dashboard card — μείωση σε `prefers-reduced-motion`
- Concept Bus persist σε κάθε keystroke — ήδη debounced sync· έλεγχος main-thread blocking
- Πολλαπλά `useEffect` στο `StudyWorkspace.tsx` — audit με React Profiler

---

## 2. Χάρτης επιφανειών — UI/UX ανά οθόνη

**Κλίμακα ωριμότητας:** 🟢 Launch · 🟡 Polish · 🟠 Demo gaps · 🔴 Broken / misleading

### 2.1 Shell & πλοήγηση (`Shell.tsx`, `App.tsx`)

| Στοιχείο | Κατάσταση | Αναβάθμιση |
|----------|-----------|------------|
| Sidebar nav | 🟡 | Ενεργή κατάσταση όταν workspace ανοιχτό· badge «συνεχίζεις εδώ» |
| Breadcrumb | 🟡 | Κλικ σε course → CourseView χωρίς χάσιμο workspace (split ή toast) |
| ⌘K Command Palette | 🟢 | Προσθήκη «Τι μπορώ να κάνω τώρα;» από `dashboardNextAction` |
| Mobile bottom nav | 🟡 | Study Workspace shortcut αν υπάρχει `workspaceLive` |
| Theme / γλώσσα | 🟢 | — |

**Acceptance:** Κάθε nav item έχει tooltip/subtitle μία γραμμή (EL/EN).

### 2.2 Dashboard (`Dashboard.tsx`)

| Στοιχείο | Κατάσταση | Αναβάθμιση |
|----------|-----------|------------|
| «Good morning!» | 🟠 | **Hardcoded** → `greetingForTime(lang, stats.streak)` |
| Study Workspace CTA | 🟢 | Μετά το fix· προσθήκη `aria-busy` κατά το boot |
| Resume workspace card | 🟡 | Δείξε tool + concept από `workspaceLive`· όχι γενικό κείμενο |
| Weak areas | 🟡 | Κάθε chip → `openStudyWorkspaceForConcept` με preview λόγου (weakAreaReasons) |
| Stats row | 🟡 | Κλικ σε «Reviews Due» → φίλτρο tasks review |
| Next action hero | 🟢 | Ευθυγράμμιση με workspace discoverability |

**Acceptance:** Νέος χρήστης σε 10s καταλαβαίνει: upload έγινε; τι κάνω τώρα;

### 2.3 Library & Upload (`Library.tsx`, `UploadModal.tsx`)

| Στοιχείο | Κατάσταση | Αναβάθμιση |
|----------|-----------|------------|
| Upload progress | 🟡 | Ξεκάθαρο στάδιο: extract → outline → course |
| Post-upload CTA | 🟠 | Μετά upload: «Άνοιξε workspace» + «Δες μάθημα» — όχι μόνο navigate course |
| File delete | 🟢 | Cascade copy ήδη — επιβεβαίωση με αριθμό tasks |
| Empty state | 🟡 | Illustration + «Πρόσθεσε PDF ή επικόλλησε κείμενο» |

### 2.4 Course View (`CourseView.tsx`)

| Στοιχείο | Κατάσταση | Αναβάθμιση |
|----------|-----------|------------|
| Topic → workspace | 🟢 | `onStartLesson(topic)` |
| Quality banner | 🟡 | Σύνδεση με reprocess wizard + workspace stale flags |
| Concept map tab | 🟡 | Κλικ κόμβου → workspace concept-map με focus |
| Sources tab | 🟡 | Go to source → reader highlight (ήδη) — δείξε preview snippet |

### 2.5 Tasks (`Tasks.tsx`)

| Στοιχείο | Κατάσταση | Αναβάθμιση |
|----------|-----------|------------|
| Task type icons | 🟡 | Εικονίδιο ανά `getTaskAction` (workspace / agent / review…) |
| Start task | 🟢 | Μετά fix overlays |
| Session queue bar | 🟡 | Δείξε τίτλο επόμενου task πριν το auto-advance 150ms |

### 2.6 Agent (`Agent.tsx`)

| Στοιχείο | Κατάσταση | Αναβάθμιση |
|----------|-----------|------------|
| Split view 58/42 | 🟢 | — |
| Workspace context injection | 🟢 | Banner πότε το context είναι stale |
| Empty chat | 🟡 | Προτάσεις από `dashboardNextAction` + weak areas |

### 2.7 Study Workspace (13 εργαλεία)

Βλ. `STUDY_WORKSPACE_LAUNCH_PLAN.md` Wave 6+ · **Wave 7 ✅** (`552d0ef`). Εδώ το UI/UX layer:

| Ζώνη | Στόχος | Wave 7 |
|------|--------|--------|
| **Tool dock** | Μόνο ενεργό + recommended + 3 recent· «Όλα τα εργαλεία» drawer | ✅ Desktop clusters + mobile `WorkspaceMobileToolDrawer` (SW-P1-02) |
| **Intelligence rail** | Κλειστό by default· 3 tabs (Concept Bus / Weak / Discoverability) με badge counts | ✅ (Wave 6.7) |
| **Context strip** | Πάντα: μάθημα · concept · πηγή · επόμενη ενέργεια | ✅ |
| **Empty states** | Κάθε tool: γιατί άδειο + CTA (upload / reprocess / άλλο tool) | 🟡 |
| **Mobile** | Tool drawer + intelligence ως bottom sheet· όχι 4 στήλες ταυτόχρονα | 🟡 Tool drawer ✅ · intelligence bottom sheet pending |
| **Reader typography** | EL+EN long-form, no mojibake | ✅ Noto Greek + `utf8MojibakeRepair` |

**Acceptance:** §20 questionnaire — κάθε κουμπί έχει τεκμηριωμένο learning outcome.

---

## 3. Σύστημα σχεδιασμού (Design System)

### 3.1 Tokens (υπάρχον `index.css` blueprint)

- **Επέκταση:** `--motion-duration-fast` (120ms), `--motion-duration-ui` (200ms)
- **Spacing scale:** 4/8/12/16/24/32 — απαγόρευση arbitrary `p-[13px]`
- **Elevation:** 3 επιπέδα μόνο (card / overlay / modal)

### 3.2 Components να τυποποιηθούν

| Component | Χρήση |
|-----------|--------|
| `PrimaryCTA` / `SecondaryCTA` | Όλα τα κύρια κουμπιά |
| `EmptyState` | Library, workspace tools, analytics |
| `LoadingShell` | Workspace, Agent, Lesson (αντί generic «Loading…») |
| `StatusChip` | stale, weak, due, exam |
| `ConfirmDialog` | delete, reprocess, end session |
| `SelectionActionBar` | ήδη στο workspace — μην ξαναεφεύρουμε |

### 3.3 Copy & i18n

- Μεταφορά **όλων** hardcoded strings → `i18n.ts`
- Tone: ενθαρρυντικό, συγκεκριμένο («Διάβασε §3 για X» όχι «Study more»)
- EL πρώτα για ελληνικά μαθήματα — detect από `course.locale` ή `user.settings`

### 3.4 Προσβασιμότητα

- Focus trap σε overlays (workspace, modals)
- `aria-busy` σε async actions
- Keyboard: Esc κλείνει overlay· `?` shortcuts help panel στο workspace
- Contrast audit WCAG AA σε brand colors

---

## 4. Ροές χρήστη (E2E journeys)

### 4.1 Πρώτη επίσκεψη

```
Landing → Onboarding (ρόλος, στόχος) → Upload → Course created toast
→ Dashboard με hero «Άνοιξε τον χώρο μελέτης» → Workspace boot shell <300ms
→ Reader με πρώτο βήμα + discoverability «Πρότεινε επόμενο»
```

### 4.2 Καθημερινή μελέτη

```
Dashboard resume card → Workspace (ίδιο concept/tool)
→ Quiz wrong answer → auto-select passage → Selection bar → Leitner card
→ Progress export PDF
```

### 4.3 Αδύναμο σημείο

```
Dashboard weak chip → Workspace reader focus
→ WeakAreas rail remediation → next action CTA
```

### 4.4 Εξετάσεις

```
Exam countdown → exam-prep task → Timer preset → Simulator
→ Dashboard readiness ring ενημερωμένο
```

**Κριτήριο επιτυχίας:** Κάθε ροή ολοκληρώνεται χωρίς «που να πάω τώρα;»

---

## 5. Κατάσταση κουμπιών & affordances (audit checklist)

Για **κάθε** interactive στοιχείο συμπληρώνουμε:

| Πεδίο | Ερώτηση |
|-------|---------|
| ID | `data-testid` |
| Purpose | Τι learning outcome εξυπηρετεί; |
| Preconditions | Χρειάζεται upload; task; auth; |
| Success UI | Τι βλέπει ο χρήστης; |
| Empty / error | Τι αν λείπει πηγή; |
| Correlation | Τι γράφει στο Concept Bus; |
| Mobile | Λειτουργεί με touch; |

**Προτεραιότητα audit:** Dashboard CTAs → Workspace dock → Intelligence rail → Course path → Tasks list.

---

## 6. Φάσεις υλοποίησης

### Phase A — Αξιοπιστία & αίσθηση ταχύτητας (1–2 εβδομάδες) ✅ μερικώς

- [x] Workspace open/close lifecycle fix
- [x] Lazy `StudyWorkspace` + `WorkspaceBootShell`
- [x] Overlay mutual exclusion στο `startTask`
- [ ] `greetingForTime` + i18n dashboard header
- [ ] `aria-busy` σε Study Workspace button κατά boot
- [ ] Post-upload CTA → workspace
- [ ] React Profiler session — document baseline ms

### Phase B — Αυτοεπεξήγηση (2–3 εβδομάδες)

- [ ] Empty states παντού (shared component)
- [ ] Context strip workspace πάντα ορατό
- [ ] Tool dock σύμπτυξη + discoverability primary CTA
- [ ] Onboarding βήμα «upload → workspace»
- [ ] Shortcuts help `?` στο workspace
- [ ] Resume card με live tool/concept

### Phase C — Οπτική συνοχή (2 εβδομάδες)

- [ ] CTA component library
- [ ] Μείωση motion / reduced-motion
- [ ] Mobile intelligence bottom sheet QA
- [ ] Sidebar active states + badges
- [ ] Illustration set για empty states (consistent blueprint style)

### Phase D — Launch hardening (ongoing)

- [ ] §20 questionnaire ανά tool
- [ ] E2E Playwright: open workspace, quiz flow, upload flow
- [ ] Performance budget: LCP, TTI με workspace closed
- [ ] Error boundaries με recover copy EL/EN

**Σύνδεση με Wave 6+** (`STUDY_WORKSPACE_LAUNCH_PLAN.md`): Phase A–B παράλληλα με reader heatmap, debate persistence κ.λπ.

---

## 7. Μετρήσεις επιτυχίας (πριν / μετά)

| Μετρική | Στόχος |
|---------|--------|
| Time to workspace visible (click → shell) | &lt; 100ms |
| Time to workspace interactive | &lt; 2s (μεσαίο course) |
| Double-click remount count | 0 |
| Overlays stacked | max 1 task overlay |
| User confusion reports (qualitative) | «δεν άνοιξε» → 0 |
| i18n coverage κύριων οθονών | 100% keys |

---

## 8. Anti-patterns να μην επαναληφθούν

1. **`key={token++}` σε κάθε user action** — μόνο σε session identity change ή error recovery
2. **Async close χωρίς cancel token** — πάντα generation counter
3. **Eager import 2000+ line components** στο App entry
4. **Πολλαπλά overlays χωρίς mutual exclusion**
5. **Κουμπιά που αλλάζουν μόνο state χωρίς οπτική ανατροφοδότηση**
6. **Demo copy («Good morning», «Lorem») σε production paths**
7. **Νέα panel χωρίς σύνδεση σε Concept Bus / next action**

---

## 9. Επόμενα βήματα (σύσταση ομάδας)

1. **Τώρα:** Δοκίμασε Study Workspace μετά το fix — ένα κλικ, πολλαπλά κλικ, close→reopen γρήγορα
2. **Αυτή την εβδομάδα:** Phase A υπόλοιπα (greeting i18n, post-upload CTA)
3. **Παράλληλα:** Wave 6 workspace features από `STUDY_WORKSPACE_LAUNCH_PLAN.md`
4. **Πριν launch:** Playwright E2E + §20 audit

---

*Τελευταία ενημέρωση: Ιούνιος 2026 — Wave 7 (SW-P1-02 mobile drawer, SW-P1-04 reader sync, typography/mojibake) + lifecycle fixes.*
