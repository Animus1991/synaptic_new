# Synapse Learning — Page-by-Page Optimization & Implementation Master Plan

> **Έκδοση:** 1.1  
> **Ημερομηνία βάσης:** 2026-07-11  
> **Τελευταία συμφωνία (reconciliation):** 2026-07-11 · Cursor session  
> **Git baseline (committed):** `eff76a8` — *Add Waves R6-R8 Replit landing frosting and app chrome polish*  
> **Κατάσταση:** Ενεργό execution plan, audit trail και reconciliation ledger  
> **Σχέση με άλλα έγγραφα:** Συμπληρώνει — δεν αντικαθιστά — το `STATE_OF_THE_ART_MASTER_UPGRADE_PROMPT.md`.  
> **Authoritative runtime:** `src/App.tsx`, `src/types/index.ts`, `src/store/useStore.ts` και τα πραγματικά page/component contracts.

---

## 0. Αποστολή, όρια και αρχές αξιολόγησης

### 0.1 Αποστολή

Το παρόν έγγραφο ορίζει έναν πλήρη, διαδοχικό και επαληθεύσιμο έλεγχο και ένα εξειδικευμένο σχέδιο υλοποίησης για **κάθε user-facing σελίδα, route-like state, full-screen overlay και κρίσιμο global flow** του Synapse Learning. Ο στόχος δεν είναι η προσθήκη περισσότερου UI. Ο στόχος είναι:

1. κάθε στοιχείο να λύνει συγκεκριμένο πρόβλημα χρήστη,
2. κάθε πληροφορία να προέρχεται από authoritative πραγματικό state,
3. κάθε action να ολοκληρώνει πραγματική ροή,
4. κάθε σελίδα να είναι συνεπής με το υπόλοιπο learning system,
5. κάθε demo/prototype λειτουργία να απομονώνεται, να επισημαίνεται, να συνδέεται πλήρως ή να αφαιρείται,
6. κάθε αλλαγή να συνοδεύεται από αντικειμενικά acceptance criteria και tests.

### 0.2 Ρητά εκτός στόχου

- Δεν θα προστεθούν features μόνο για οπτικό εντυπωσιασμό.
- Δεν θα παρουσιαστεί backend capability ως διαθέσιμη αν δεν υπάρχει πραγματικό API και authorization path.
- Δεν θα δημιουργηθεί δεύτερο store, δεύτερο event model, δεύτερο uploader ή δεύτερη πηγή navigation truth.
- Δεν θα χρησιμοποιηθούν fabricated metrics, testimonials, progress values, AI status ή “live” indicators.
- Δεν θα διατηρηθεί control χωρίς owner, state transition και επαληθεύσιμο αποτέλεσμα.

### 0.3 Κανόνας evidence

Κάθε εύρημα ταξινομείται ως:

- **Confirmed:** τεκμηριώνεται από πραγματικό code path ή test.
- **Inferred:** προκύπτει από code composition αλλά απαιτεί runtime επιβεβαίωση.
- **Unknown:** χρειάζεται API/runtime/product απόφαση πριν από υλοποίηση.
- **Backend-gated:** επιτρέπεται μόνο όταν το αντίστοιχο server contract είναι διαθέσιμο.

Καμία inferred ή unknown δυνατότητα δεν θα παρουσιάζεται ως ολοκληρωμένη.

---

## 1. Πραγματική απογραφή επιφανειών

### 1.1 Top-level `AppView` states

| View | Κύριο component | Entry/owner | Τρέχουσα αντικειμενική κατάσταση | Execution status |
|---|---|---|---|---|
| `landing` | `Landing.tsx` | pre-auth entry | B1 demo sandbox + legal footer shipped· a11y polish pending | B1 complete (demo/legal) |
| `onboarding` | `Onboarding.tsx` | first-run flow | B2 complete: profile/goals persistence, validation, skip split, resume draft, upload handoff | B2 complete |
| `dashboard` | `Dashboard.tsx` | daily hub | Needs polish· ολοκληρώθηκε πρώτο data/i18n/a11y/anti-fake pass | Pass 1 complete |
| `library` | `Library.tsx` | course/material owner | Needs polish· ολοκληρώθηκε πρώτο lifecycle/filter/metrics/i18n pass | Pass 1 complete |
| `note-analysis` | `NoteAnalysisView.tsx` | post-upload diagnosis | Partial· πραγματικό snapshot, αλλά developer-facing metrics και labels χρειάζονται productization | Audit pending |
| `course` | `CourseView.tsx` | course overview | Partial· ισχυρό lifecycle wiring, εκτεταμένο hardcoded UI και διπλές/ανεξήγητες analytics | Audit pending |
| `tasks` | `Tasks.tsx` | execution queue | Partial· πραγματικά task/session/FSRS data, αλλά semantics και actions έχουν ασυνέπειες | Audit pending |
| `agent` | `Agent.tsx` | grounded tutor | MVP-ready core / needs polish· πραγματικό retrieval, streaming και grounding, αλλά mode overload και error-state gaps | Audit pending |
| `analytics` | `Analytics.tsx` | learning projections | Partial· πλούσια πραγματικά projections, αλλά πληροφοριακή υπερφόρτωση, raw research metrics και ελλιπή empty/action links | Audit pending |
| `settings` | `Settings.tsx` | preferences/account/data | Partial· πραγματικές ρυθμίσεις και integrations, αλλά υπερφορτωμένη IA και client API-key/security risk | Audit pending |
| `teacher` | `TeacherDashboard.tsx` | teacher/org server flow | Partial, backend-gated· πολλά πραγματικά APIs, ανεπαρκής role gating και πυκνή μονολιθική IA | Audit pending |
| `student-org` | `StudentOrgView.tsx` | student institution flow | Partial, backend-gated· πραγματικά APIs, αλλά incomplete localization/deep-link/action contracts | Audit pending |
| `lesson` | legacy type state | δεν renderάρεται ως main page | Route residue· η πραγματική lesson εμπειρία είναι overlay | Decide/remove alias |

### 1.2 Full-screen και modal flows

| Surface | Owner | Τύπος | Κύριος κίνδυνος |
|---|---|---|---|
| Study Workspace | `StudyWorkspaceBody` + `useStudyWorkspace` | core full-screen product | complexity, duplicated chrome modes, context drift |
| Workspace classic/notebook | `StudyWorkspaceChrome`, layouts | mode | duplicate controls και inconsistent labels |
| Workspace + Agent split | `App.tsx` | split mode | responsive/close/context consistency |
| Workspace + Course split | `App.tsx` | split mode | duplicate `CourseView`, narrow viewport behavior |
| Notebook shell | `NotebookShellView.tsx` | full-screen bridge | hardcoded i18n, external dependency honesty, overlapping ownership |
| Upload lifecycle | `UploadModal.tsx` | modal state machine | fabricated static processing steps, modal accessibility, cancellation |
| Lesson | `LessonView.tsx` | task overlay | separate progress model vs workspace/event spine |
| Practical lesson | `PracticalLessonView.tsx` | task overlay | coding-only assumptions, fallback simulation honesty, hardcoded UI |
| Review session | `ReviewSessionView.tsx` | task overlay | minimal i18n/a11y, completion semantics |
| Mistake retry | `MistakeRetryView.tsx` | task overlay | “I got it” self-assertion without reassessment |
| Exam prep | `ExamPrepView.tsx` | task overlay | timer/answer persistence and integrity |
| Prerequisite repair | `PrerequisiteRepairView.tsx` | task overlay | fabricated fallback question/content |
| Command palette | `CommandPalette.tsx` | global modal | duplicate actions/search ownership |
| Notifications | `NotificationsPanel.tsx` + toast stack | global overlay | unread/read/deep-link truth |
| Product tour | `ProductTour.tsx` | onboarding overlay | selector drift and interruption |
| Take-breath | `TakeBreathModal` | wellness overlay | avoid medical claims; optional/non-disruptive |

### 1.3 Shared shell surfaces

Το `Shell` είναι ξεχωριστό product surface και ελέγχεται ως τέτοιο: desktop sidebar, mobile drawer, mobile bottom nav, top bar, breadcrumb, quick access, active-course card, search, notifications, theme/language, profile/streak, offline banner και skip links.

---

## 2. Labels ετοιμότητας και προτεραιότητας

### 2.1 Readiness labels

- **Launch-ready:** πραγματικό, πλήρως συνδεδεμένο, ασφαλές, accessible, bilingual, tested.
- **MVP-ready:** λειτουργικά πλήρες για περιορισμένο scope· γνωστά non-blocking polish gaps.
- **Needs polish:** core contract σωστό· χρειάζεται συνοχή, states, i18n, a11y ή tests.
- **Partial:** μέρος της ροής λειτουργεί, αλλά υπάρχουν dead ends ή μη πλήρης σύνδεση.
- **Prototype:** αποδεικνύει ιδέα, όχι ασφαλές για production claim.
- **Backend-gated:** UI εμφανίζεται μόνο όταν server capability/role/permission είναι verified.
- **Remove/merge:** δεν δικαιολογεί ξεχωριστή παρουσία.
- **Broken/blocker:** παραβιάζει data truth, security, accessibility ή κύρια ροή.

### 2.2 Severity

- **P0:** data loss, security/privacy, false claim, broken primary journey, orphaned state.
- **P1:** dead action, wrong context, inaccessible primary control, misleading metric, missing error recovery.
- **P2:** IA, duplication, responsive, performance, incomplete i18n, insufficient tests.
- **P3:** visual polish και non-critical ergonomics.

---

## 3. Καθολικό quality contract κάθε σελίδας

Καμία σελίδα δεν θεωρείται ολοκληρωμένη αν δεν ικανοποιεί όλα τα παρακάτω.

### 3.1 Product ownership και information architecture

- Ένας σαφής σκοπός και μία προφανής primary action ανά state.
- Κάθε panel έχει owner page· shared controls δεν αντιγράφονται χωρίς λόγο.
- Progressive disclosure για advanced/debug/research πληροφορία.
- Heading hierarchy, landmarks και focus order αντιστοιχούν στην οπτική ιεραρχία.

### 3.2 Data truth

- Κάθε αριθμός έχει source selector, μονάδα, χρονικό scope και fallback.
- Δεν παράγονται “live”, progress, quality, readiness ή confidence values μόνο για decoration.
- Derived metrics υπολογίζονται σε pure tested selectors, όχι ανεξάρτητα μέσα σε κάθε component.
- Κενό dataset αποδίδεται ως empty/insufficient-data state, όχι ως μηδέν με ψευδή βεβαιότητα.

### 3.3 Action contract

Κάθε control καταγράφει:

1. user intent,
2. owner,
3. read dependencies,
4. state/API mutation,
5. success result,
6. error recovery,
7. navigation/deep-link target,
8. event/telemetry effect,
9. reprocess/delete/version behavior,
10. test coverage.

### 3.4 States

Κάθε data-bearing surface έχει explicit:

- initial/loading skeleton,
- empty state με σχετική ενέργεια,
- recoverable error με retry,
- offline/degraded state,
- partial/stale data state,
- success/confirmation feedback,
- permission/auth state όπου απαιτείται.

### 3.5 i18n και localization

- Όλο το user-facing copy περνά από το υπάρχον bilingual contract.
- Ημερομηνίες, χρόνοι, αριθμοί, percentages, counts και plurals είναι locale-aware.
- Δεν χρησιμοποιείται `capitalize` raw enum ως label.
- Generated/server text παραμένει data, αλλά τα surrounding labels και errors είναι localized.

### 3.6 Accessibility

- Native semantic controls κατά προτίμηση.
- Keyboard parity για κάθε pointer action.
- Visible focus, `aria-current`, `aria-expanded`, `aria-live` και dialog focus trap όπου απαιτούνται.
- Touch targets τουλάχιστον 44×44 όπου είναι primary/mobile controls.
- Charts έχουν accessible summary/table ή text equivalent.
- Reduced motion, AA contrast και zoom/reflow 200%.

### 3.7 Responsive και cross-device

- Valid states σε 320, 375, 768, 1024, 1440 και 1920 px.
- Tables αποκτούν mobile card/scroll strategy χωρίς απώλεια primary actions.
- Full-screen overlays διαχειρίζονται safe areas, virtual keyboard και back behavior.
- Δεν βασίζεται κρίσιμη πληροφορία αποκλειστικά σε hover.

### 3.8 Source confidence και learning integrity

- Source quality/confidence συνοδεύει generated artifacts.
- Low-confidence/corrupted sections δεν τροφοδοτούν quiz/card/simulation ως fact.
- AI enrichment, inference και source-grounded content διακρίνονται καθαρά.
- Remediation ενημερώνει τα κοινά learning events/selectors.

### 3.9 Persistence, deletion και versioning

- Κάθε persisted artifact έχει scope και processing version όπου σχετίζεται με source.
- Reprocess κάνει remap ή visible stale marking.
- Delete δεν αφήνει orphaned tasks, cards, annotations, glossary, search ή dashboard references.
- Local/server merge strategy είναι deterministic και εμφανής στον χρήστη όταν υπάρχει conflict.

### 3.10 Security και privacy

- Tokens/secrets δεν εκτίθενται σε logs, analytics ή exports.
- Client-side provider API keys χαρακτηρίζονται development-only ή αφαιρούνται από production UI.
- Role/permission checks γίνονται server-side· το hidden UI δεν θεωρείται authorization.
- Destructive και external-navigation actions έχουν σαφή consent.
- Research/export flows εξηγούν scope, provenance και privacy.

### 3.11 Performance και observability

- Lazy boundaries σε πραγματικά βαριά flows, όχι σε κάθε μικρό component.
- Ακύρωση stale async requests και προστασία από race conditions.
- Μετρήσιμα budgets για LCP, interaction latency, workspace TTI και bundle chunks.
- Errors έχουν contextual logging χωρίς sensitive payloads.

### 3.12 Tests

Ανά σελίδα απαιτούνται:

- pure unit tests για selectors/formatters,
- component tests για states και keyboard behavior,
- store integration test για read/write fan-out,
- route/deep-link test,
- one mobile E2E primary journey,
- axe/a11y check,
- EL/EN smoke test,
- visual snapshots μόνο για σταθερά deterministic states.

---

## 4. Anti-demo decision gate

### 4.1 Απόφαση ανά στοιχείο

- **KEEP:** έχει σαφή αξία, πραγματικό state/action και tests.
- **CONNECT:** έχει αξία, αλλά χρειάζεται authoritative data ή mutation.
- **MERGE:** επικαλύπτεται με άλλο owner/control.
- **SIMPLIFY:** πραγματικό αλλά υπερφορτωμένο ή developer-facing.
- **GATE:** απαιτεί backend, permission, feature flag ή επαρκές data threshold.
- **LABEL DEMO:** επιτρέπεται μόνο σε ρητά opt-in demo mode, με μη ανάμιξη στα πραγματικά δεδομένα.
- **REMOVE:** διακοσμητικό, παραπλανητικό, dead ή ασύνδετο.

### 4.2 Υποχρεωτικό questionnaire

Για κάθε button, card, tab, badge, chart, hint, modal και metric απαντώνται:

1. Ποιο ακριβές πρόβλημα λύνει;
2. Για ποιο persona και σε ποια στιγμή;
3. Ποια σελίδα το κατέχει;
4. Από ποιο authoritative entity/selectors διαβάζει;
5. Τι mutation/API/event εκτελεί;
6. Πώς φαίνεται η επιτυχία;
7. Πώς ανακάμπτει από failure/offline;
8. Πού οδηγεί και διατηρεί context;
9. Ενημερώνει Progress, Concept Bus, Weak Areas, Tasks ή Analytics;
10. Τι κάνει χωρίς source ή με χαμηλό confidence;
11. Τι κάνει μετά από reprocess/delete;
12. Είναι χρήσιμο σε mobile και keyboard;
13. Είναι bilingual και locale-aware;
14. Έχει permission/privacy implications;
15. Ποιο test αποδεικνύει ότι λειτουργεί;
16. Αν αφαιρεθεί, ποιο user outcome χάνεται;

Αν δεν υπάρχει ικανοποιητική απάντηση, εφαρμόζεται `MERGE`, `GATE` ή `REMOVE`.

---

## 5. Αρχιτεκτονικές invariants

1. **Navigation truth:** το `AppView` και οι store actions παραμένουν η μοναδική πηγή view state μέχρι τυχόν συνειδητή μετάβαση σε router.
2. **Workspace truth:** ένα typed `WorkspaceContext` τροφοδοτεί breadcrumb, Agent, tools, source, active concept και step counts.
3. **Learning truth:** deliberate `LearningEvent` records τροφοδοτούν κοινά selectors για mastery, weakness, activity, readiness και next action.
4. **No local mastery forks:** Dashboard, Analytics, Course, Tasks και Workspace MiniDashboard δεν επανεφευρίσκουν τον ίδιο δείκτη.
5. **Document truth:** source, extraction, enrichment και user-created artifacts είναι διακριτές οντότητες.
6. **Version truth:** κάθε source-derived artifact γνωρίζει `processingVersion` και stale status.
7. **Demo isolation:** demo datasets είναι explicit mode, δεν ενεργοποιούνται σιωπηρά από generic deep links και δεν συγχωνεύονται με user data.
8. **Server truth:** teacher/org/billing/auth capabilities εμφανίζονται μόνο με verified endpoint και permission.
9. **i18n truth:** labels προέρχονται από canonical i18n/content modules, όχι από raw enum ή scattered ternaries.
10. **UI truth:** shared primitives για page headers, empty/error/loading, confirmation, tabs και action hierarchy.

---

## 6. Execution protocol ανά σελίδα

1. **Freeze scope:** components, store fields/actions, APIs, overlays, tests και downstream consumers.
2. **Runtime audit:** EN/EL × empty/normal/error/offline × mobile/desktop × keyboard.
3. **Control inventory:** εφαρμογή questionnaire και απόφαση KEEP/CONNECT/MERGE/GATE/REMOVE.
4. **Data-flow diagram:** entry → read model → derived selectors → actions → mutations/events → downstream fan-out.
5. **Risk/blast radius:** shared types/store/server contracts δηλώνονται πριν από edit.
6. **Implementation slices:** P0 correctness, P1 connectivity/states, P2 UX/a11y/i18n, P3 polish/performance.
7. **Tests πριν ή μαζί με behavior:** όχι μόνο snapshot.
8. **Verification:** typecheck:all, targeted/full tests, i18n lint, build, axe, keyboard, mobile, visual diff.
9. **Audit trail:** ενημέρωση status, αποφάσεων, files, tests, known gaps στο παρόν αρχείο.
10. **Exit gate:** καμία μετάβαση στην επόμενη σελίδα με ανοιχτό P0/P1 χωρίς ρητή τεκμηρίωση.

## 7. PAGE 01 — Landing

### 7.1 Product contract

- **Persona:** first-time visitor πριν από onboarding/auth.
- **Job to be done:** να καταλάβει σε λιγότερο από 10 δευτερόλεπτα τι κάνει το Synapse, τι χρειάζεται να δώσει και ποιο αποτέλεσμα θα λάβει.
- **Primary action:** έναρξη onboarding.
- **Secondary action:** ρητά επισημασμένο, απομονωμένο demo sandbox.
- **Success:** μετάβαση σε onboarding ή demo χωρίς αμφίσημη υπόσχεση, dead link ή silent data mutation.

### 7.2 Confirmed current state

- Τα hero, features, differentiation, FAQ και CTA χρησιμοποιούν bilingual content modules.
- `onGetStarted` οδηγεί σε onboarding και `onSeeDemo` ενεργοποιεί πραγματικό demo dataset.
- Τα intent chips είναι καθαρά decorative και `aria-hidden`.
- Το “social proof” είναι στατικό πεντάστερο testimonial χωρίς evidence model.
- Το trust strip περιγράφει γενικές κατηγορίες ιδρυμάτων, όχι επαληθευμένους πελάτες.
- Δεν υπάρχουν πραγματικά privacy/terms/support links στο footer.
- Η σελίδα υποστηρίζει theme toggle αλλά όχι εμφανή language switch.

### 7.3 Decisions

- **KEEP:** source-grounded value proposition, how-it-works, capability grid, FAQ, primary CTA.
- **SIMPLIFY:** επαναλαμβανόμενα CTA blocks ώστε να μην ανταγωνίζονται ισότιμα.
- **CONNECT:** demo CTA σε explicit sandbox contract με badge, reset/exit και μη ανάμιξη δεδομένων.
- **REPLACE:** μη επαληθευμένο testimonial/πεντάστερο rating με demonstrable product proof: supported inputs, source citation, real workflow screenshot ή measured local capability.
- **RENAME:** trust strip ως “Designed for …” εφόσον δεν υπάρχουν verified customers.
- **ADD:** πραγματικά privacy/terms/contact links μόνο όταν τα URLs είναι configured.
- **ADD:** language switch και reduced-motion-safe animation behavior.

### 7.4 Implementation plan

- **P0:** αφαίρεση κάθε μη επαληθευμένου social-proof claim και σαφής demo isolation.
- **P1:** legal/footer contract, language switching, focus/landmark/FAQ `aria-expanded` και valid heading order.
- **P1:** capability claims αντιστοιχίζονται σε πραγματικά supported formats και runtime features.
- **P2:** responsive content density, LCP optimization, defer non-critical animation, no layout shift.
- **P2:** CTA analytics με privacy-safe events (`landing.get_started`, `landing.demo_opened`).

### 7.5 Acceptance and tests

- Μόνο μία visually dominant primary CTA ανά viewport.
- Demo CTA δεν μεταβάλλει ή συνδυάζει existing user library.
- Κανένα testimonial/customer/logo claim χωρίς verified source.
- CTA, FAQ keyboard, language, reduced motion και 320px layout tests.
- Playwright: Landing → Onboarding και Landing → Demo → explicit exit/reset.
- Lighthouse budgets: LCP ≤2.5s target, CLS ≤0.1, no critical a11y findings.

### 7.6 Status

`B1 complete (demo isolation + legal footer) · a11y polish pending`

---

## 8. PAGE 02 — Onboarding

### 8.1 Product contract

- **Persona:** νέος learner/teacher χωρίς ολοκληρωμένο profile.
- **Job:** να δώσει μόνο τις πληροφορίες που πράγματι αλλάζουν το προϊόν και να φτάσει σε πρώτο πραγματικό learning outcome.
- **Primary outcome learner:** πρώτο upload ή καθαρό empty dashboard/library.
- **Primary outcome teacher:** verified teacher entry, χωρίς να υπονοείται authorization μόνο από client role.

### 8.2 Confirmed current state

- Υπάρχουν τέσσερα UI steps: welcome, role, goals, schedule· όχι πραγματικό upload step.
- Αποθηκεύονται display name, role/segment, daily goal και exam date.
- Τα επιλεγμένα goals διαβιβάζονται αλλά δεν αποθηκεύονται/χρησιμοποιούνται από το current store completion path.
- `openUpload` ανοίγει το κοινό πραγματικό `UploadModal`, άρα δεν απαιτείται δεύτερος uploader.
- Teacher role μεταφέρει στο teacher view και αποθηκεύει client role.
- Δεν υπάρχει υποχρεωτική επιλογή role/goal, typed validation, resume/re-entry ή error state.
- “Skip” ενεργοποιεί demo content και παρακάμπτει πραγματικό setup.

### 8.3 Decisions

- **KEEP:** κοινό UploadModal, daily goal, optional exam date, localized summary.
- **CONNECT:** goals σε typed user profile και πραγματικά defaults για task mix, pacing, exam planning και theory/practice.
- **TYPE:** role/goal IDs ως unions, όχι arbitrary strings.
- **GATE:** teacher destination με server role/capability όταν υπάρχει auth· αλλιώς teacher preview με καθαρή σήμανση.
- **REDESIGN:** skip ως δύο καθαρές επιλογές: “Continue without upload” και “Explore demo sandbox”.
- **ADD:** final upload/finish step με real processing success/error handoff.
- **ADD:** resumable onboarding state και δυνατότητα επανεκκίνησης από Settings.

### 8.4 Implementation plan

- **P0:** persist/use goals ή αφαίρεση claims ότι επηρεάζουν defaults.
- **P0:** validation: role απαιτείται, exam date δεν μπορεί να είναι παρελθοντική, extend/upload target valid.
- **P1:** typed `OnboardingProfile`; pure mapper profile → settings/scheduler defaults με tests.
- **P1:** integrate actual upload as final flow state, preserving successful course result and post-upload routing.
- **P1:** semantic progressbar, `aria-current=step`, selected states, validation summary και focus-on-error.
- **P2:** resume draft, back navigation χωρίς data loss και mobile virtual-keyboard behavior.

### 8.5 Acceptance and tests

- Κάθε ερώτηση αποδεδειγμένα αλλάζει persisted state ή αφαιρείται.
- Complete/reload διατηρεί profile και σωστό role-aware destination.
- Goal “exam” με date αλλάζει planner/countdown· practice goal αλλάζει task defaults.
- Upload χρησιμοποιεί αποκλειστικά το κοινό pipeline.
- Demo remains isolated and explicitly reversible.
- Component tests για κάθε step/validation· integration test profile → store → Dashboard/Tasks.

### 8.6 Status

`B2 complete (2026-07-12)` — typed profile/goals, validation, skip split, a11y, **resume draft**, **upload UploadModal handoff E2E**, profile persistence across reload.

---

## 9. GLOBAL SURFACE — Shell, Navigation και Global Overlays

### 9.1 Product contract

Το Shell είναι το σταθερό orientation/action layer. Πρέπει να απαντά: πού βρίσκομαι, ποιο είναι το ενεργό course/context, ποια είναι η επόμενη σχετική ενέργεια και πώς μεταβαίνω χωρίς απώλεια context.

### 9.2 Confirmed current state

- Desktop nav περιέχει dashboard, library, tasks, agent υπό flag, analytics, teacher, student-org, settings.
- Teacher και student-org εμφανίζονται χωρίς role/capability filtering.
- Mobile nav δημιουργείται από τα πρώτα τέσσερα visible items, optional workspace και settings· άρα δεν έχει parity με desktop ή overflow menu.
- Breadcrumb fallback εμφανίζει raw `currentView` με CSS capitalization και το Note Analysis label είναι hardcoded στο App.
- Notifications badge χρησιμοποιεί το συνολικό `activities.length`, όχι πραγματικό unread count.
- Profile/streak row εμφανίζεται clickable χωρίς action.
- Sidebar user footer έχει hardcoded `Level`/`XP`.
- Quick Access επαναλαμβάνει upload/workspace/exam actions και απαιτεί ownership/de-duplication με palette/pages.
- Search palette, offline banner, skip links, language και theme έχουν πραγματικά callbacks.

### 9.3 Decisions

- **CONNECT:** canonical navigation registry με role, capability, label, mobile priority, palette visibility και deep-link policy.
- **GATE:** teacher/student-org από verified role/org membership, όχι client selection μόνο.
- **REPLACE:** raw view breadcrumb με localized view metadata και real workspace/course context.
- **CONNECT:** notification unread/read state και deep links· badge όχι activity count.
- **REMOVE ή CONNECT:** profile row cursor/action ambiguity.
- **MERGE:** Quick Access και Command Palette να διαβάζουν κοινό action registry.
- **ADD:** mobile “More” destination για μη ορατές σελίδες.

### 9.4 Implementation plan

- **P0:** role/capability nav gating και safe deep-link authorization behavior.
- **P1:** canonical `navigationRegistry` και `globalActionRegistry` shared από Shell/Palette/Tour.
- **P1:** localized breadcrumbs με `aria-current`, sidebar/drawer focus management και Escape/backdrop close.
- **P1:** real notifications model: unread, mark read, clear, owning deep link, `aria-live` μόνο για νέα events.
- **P2:** responsive nav parity, active-course card action clarity, profile destination και localized level/XP.
- **P2:** remove duplicated quick actions που δεν προσφέρουν context advantage.

### 9.5 Acceptance and tests

- Κάθε reachable view εμφανίζεται σε τουλάχιστον ένα mobile navigation path.
- Μη εξουσιοδοτημένος χρήστης δεν βλέπει ούτε ανοίγει gated views μέσω URL.
- Palette και Shell χρησιμοποιούν ίδιες labels/actions.
- Breadcrumb δεν εμφανίζει raw enums ή stale task/course.
- Keyboard loop, focus restoration, mobile drawer, unread deep-link και offline tests.

### 9.6 Status

`B3 complete (2026-07-12)` — `navigationRegistry` + `globalActionRegistry`, role/capability gating, mobile More overflow, localized breadcrumbs, `notificationState` unread/read watermark + deep links, Shell Quick Access ↔ palette merge, mobile drawer Escape/focus trap/`aria-modal`. Tests: `navCapabilities.test.ts`, `notificationState.test.ts`, `e2e/shell-nav-b3.spec.ts` (6 cases).

---

## 10. PAGE 03 — Dashboard

### 10.1 Product contract

Daily decision hub: μία explainable Next Best Action, πραγματικές υποχρεώσεις, due reviews, weak remediation και course continuation.

### 10.2 Completed Pass 1

- Connected theory/practice lens από persisted settings.
- Localized task metadata, priorities, durations, XP, weekdays και empty states.
- Keyboard activation/focus για task/course rows.
- In-progress tasks περιλαμβάνονται στα active priority data.
- Empty mastery/weak/course-processing states και unresolved-only misconceptions.
- Αφαιρέθηκε fabricated live pipeline progress.

### 10.3 Remaining plan

- **P0:** integration test ότι learning event ενημερώνει Next Action, weak area, review count και analytics projection.
- **P1:** κάθε metric αποκτά definition/time scope και actionable deep link ή αφαιρείται.
- **P1:** deduplicate hero pipeline explanation έναντι daily operational content.
- **P1:** normalize loading/error/offline states από store hydration/server sync.
- **P2:** chart accessibility summaries και mobile ordering βάσει urgency.
- **P2:** dedicated component tests για empty/normal/active-session/post-upload states.

### 10.4 Exit criteria

- Κανένα widget χωρίς owner action.
- Καμία διπλή ή αντιφατική mastery/readiness τιμή.
- Fan-out test από deliberate learning event.
- EL/EN, keyboard, mobile και axe green.

### 10.5 Status

`Pass 1 complete · Final integration pass pending`

---

## 11. PAGE 04 — Library

### 11.1 Product contract

Authoritative owner του course/material lifecycle: find, inspect, continue, reprocess, replace και delete χωρίς orphaned state.

### 11.2 Completed Pass 1

- Search, sort, quality/attention filters και grid/list controls.
- Interactive topic/concept InfoStack deep links.
- Real pending-task/due-review counts και old-pipeline badge.
- File/course delete cascades, reprocess actions και NotebookLM paths.
- Comprehensive EN/EL labels και context-aware empty states.

### 11.3 Remaining plan

- **P0:** integration tests delete/reprocess/re-upload → no orphaned tasks/glossary/search/dashboard.
- **P1:** explicit loading/error/offline/remote-sync/conflict states.
- **P1:** per-file inspect extraction/source-quality deep link και before/after reprocess evidence.
- **P1:** pagination/virtualization strategy για μεγάλες βιβλιοθήκες.
- **P2:** saved filters/sort, keyboard grid navigation και mobile action menus.
- **P2:** deterministic visual tests χωρίς demo dataset leakage.

### 11.4 Exit criteria

- Κάθε file lifecycle action ολοκληρώνεται και ενημερώνει όλες τις εξαρτώμενες projections.
- Demo courses δεν αναμιγνύονται με real content χωρίς explicit mode.
- Search/filter counts και empty states παραμένουν ακριβή μετά από mutations.

### 11.5 Status

`Pass 1 complete · Lifecycle integration pass pending`

## 12. PAGE 05 — Note Analysis

### 12.1 Product contract

Post-upload diagnostic που εξηγεί **τι αναγνωρίστηκε, πόσο αξιόπιστα, τι χρειάζεται διόρθωση και ποιο είναι το επόμενο learning action**. Δεν είναι developer telemetry dump.

### 12.2 Confirmed current state και risks

- Χρησιμοποιεί πραγματικό `Course`, `UploadedFile`, `SourceIntelligenceSnapshot` και learning-event counts.
- Εμφανίζει quality, words, concepts, formulas, citations, weak/strong concepts και plan.
- Το readiness υπολογίζεται από heuristic συνδυασμό source quality, concept coverage και word volume· χρειάζεται ορισμό/label, όχι implied exam readiness.
- “Citations checked” προκύπτει από citation events και όχι κατ’ ανάγκη από end-to-end factual verification.
- Entity-type labels εμφανίζονται ως raw keys και fallback values μπορούν να δώσουν τεχνητά ουδέτερη εικόνα όταν λείπουν data.
- Expand details δεν έχει πλήρες disclosure/a11y contract και αρκετά labels είναι hardcoded EN.

### 12.3 Decisions και implementation

- **RENAME:** heuristic score ως “Material processing readiness” με formula/inputs και “insufficient data” threshold.
- **CONNECT:** citation count σε πραγματικό verification result· διαφορετικά label ως “citation interactions”.
- **CONNECT:** κάθε weak/missing entity/concept σε Reader, reprocess ή remediation deep link.
- **SIMPLIFY:** default view σε 3 outputs: source health, extracted structure, recommended next step.
- **GATE:** formulas/entities/confidence panels όταν το pipeline παρείχε το αντίστοιχο capability.
- **P0:** μηδενισμός fabricated fallbacks και σαφής distinction unknown vs zero.
- **P1:** shared source-quality definitions με Library/Course/Workspace.
- **P1:** localized entity labels, dates, counts, pluralization, `aria-expanded` και accessible progress.
- **P2:** side-by-side before/after evidence μετά από reprocess.

### 12.4 Acceptance and tests

- Μη διαθέσιμα data εμφανίζονται ως unknown/insufficient, ποτέ ως invented readiness.
- Κάθε recommendation έχει λειτουργικό target και preserved course/concept context.
- Same source quality σημαίνει ακριβώς το ίδιο σε Analysis, Library, Course και Workspace.
- Unit tests για score thresholds και component matrices για no-source/partial/healthy/stale.

### 12.5 Status

`B5 complete (2026-07-12)` — `noteAnalysisDiagnostics` (material processing readiness, unknown vs zero, truthful QA metrics), 3-panel summary + action links, gated algorithm transparency stage, E2E `e2e/note-analysis-b5.spec.ts`.

---

## 13. PAGE 06 — Course

### 13.1 Product contract

Course-level decision page: orientation, topic progression, source health, due work και είσοδος στο σωστό study context. Η Library κατέχει το cross-course lifecycle· το Course κατέχει το συγκεκριμένο course.

### 13.2 Confirmed current state

- Πέντε tabs: overview, tasks, files, study tools, lifecycle.
- Πραγματικά callbacks για workspace, file deletion, reprocess, re-upload, course deletion και NotebookLM actions.
- Topics, mastery, prerequisites, concept graph και source quality προέρχονται από course/store data.
- Mastery/progress εμφανίζονται σε πολλαπλές θέσεις και remediation count μπορεί να ανταγωνίζεται tasks/reviews.
- Tab/buttons δεν έχουν ολοκληρωμένα tab semantics, deep-link state ή URL restoration.
- Πολλά labels, dates, statuses, alerts και action copy είναι hardcoded ή mixed EN/EL.
- NotebookLM actions εμφανίζονται μέσα σε Course, Library και ξεχωριστό shell, χωρίς σαφή ownership.
- Course deletion/reprocessing έχει υψηλό blast radius, αλλά το visible evidence/confirmation είναι περιορισμένο.

### 13.3 Decisions

- **KEEP:** overview, topic continuation, tasks summary, sources, lifecycle.
- **MERGE:** “Study tools” ως contextual workspace launcher, όχι δεύτερο tool catalogue με ανεξάρτητη state logic.
- **OWNERSHIP:** Notebook integrations συγκεντρώνονται στο Sources/Lifecycle area· το shell είναι execution surface.
- **CONNECT:** topic click ανοίγει workspace με exact course/topic/tool/focus context.
- **SIMPLIFY:** μία canonical mastery τιμή και μία explainable next action.
- **GATE:** reprocess/re-upload/delete με impact preview, disabled/busy/error states και confirmation.

### 13.4 Implementation plan

- **P0:** cascade/version tests για file/course delete και reprocess· stale artifacts εμφανίζονται και δεν χρησιμοποιούνται σιωπηρά.
- **P1:** canonical course selectors για progress/mastery/due/reviews/source health.
- **P1:** route-preservable tab/query state και canonical deep links από Dashboard/Tasks/Analytics.
- **P1:** `role=tablist/tab`, keyboard arrows, mobile tab overflow, focus restoration.
- **P1:** full i18n/locale pass και standard PageHeader/Empty/Error/Loading primitives.
- **P2:** large-topic virtualization, source preview και progressive disclosure του concept graph.

### 13.5 Acceptance and tests

- Ένα click από topic/task/weak concept ανοίγει σωστό workspace context.
- Delete/reprocess ενημερώνει Library, Dashboard, Tasks, Agent retrieval και Analytics.
- Tab state επιβιώνει reload/back όταν υποστηρίζεται deep linking.
- No duplicate conflicting metrics ή unlabeled heuristics.

### 13.6 Status

`B6 complete (2026-07-12)` — `coursePageSelectors` (canonical progress/mastery/tasks/source health), shared Library metrics, tab persistence + keyboard a11y, confirm gates (`course-delete-confirm`, `course-file-delete-confirm`), E2E `e2e/course-page-b6.spec.ts`.

---

## 14. PAGE 07 — Tasks

### 14.1 Product contract

Η μοναδική execution queue για generated/manual/due-review/remediation work, με σαφές “γιατί τώρα”, διάρκεια, source και completion outcome.

### 14.2 Confirmed current state

- Πραγματικό task list, search/filter/sort, in-progress state, smart plan και grouped sections.
- Start/resume δρομολογεί σε πραγματικά task overlays ή Workspace.
- Έχει FSRS-style review UI και callbacks, αλλά task/review semantics συνυπάρχουν σε μία μεγάλη σελίδα.
- Η completion λογική και τα labels είναι εν μέρει localized, εν μέρει hardcoded/raw enum.
- Reset task progress είναι global/destructive και χρειάζεται explicit confirmation/impact.
- Empty/filter-empty/loading/error/offline states δεν είναι πλήρως διαφοροποιημένα.
- Reason/priority metadata δεν εξηγεί πάντα ποιος selector δημιούργησε την εργασία.

### 14.3 Decisions και implementation

- **KEEP:** canonical queue, resume, review, filters, smart plan.
- **MERGE:** duplicate smart suggestions με Dashboard μέσω ενός `TaskRecommendation` model.
- **CONNECT:** `reason`, source concept, prerequisite, due logic και expected outcome σε explainable metadata.
- **TYPE:** canonical task kind/status/priority labels και route contract.
- **GATE:** reset με preview του affected progress και confirmation.
- **P0:** fan-out completion test ώστε κάθε task type να ενημερώνει events/mastery/reviews/mistakes.
- **P1:** normalize task/review cards και separate “Today”, “Due review”, “Upcoming”, “Completed”.
- **P1:** loading/error/offline/stale states και optimistic rollback μόνο όπου ασφαλές.
- **P1:** full i18n, locale dates, pluralization, keyboard card/action behavior.
- **P2:** saved views, bulk actions μόνο αν αποδειχθεί πραγματικό use case.

### 14.4 Acceptance and tests

- Κάθε task kind ανοίγει ακριβώς ένα valid execution flow και επιστρέφει σωστά.
- Completion/failure/retry ενημερώνουν shared learning spine μία φορά, χωρίς double counting.
- Filter counts, overdue state και in-progress state παραμένουν σωστά σε timezone/reload.
- Reset δεν εκτελείται accidental και δεν αφήνει orphaned artifacts.

### 14.5 Status

`Audit complete · Implementation pending`

---

## 15. PAGE 08 — Agent

### 15.1 Product contract

Grounded tutor με διατηρούμενο course/task/workspace context, transparent retrieval/citations, cancel/retry και σαφή διάκριση ανάμεσα σε source answer και general model knowledge.

### 15.2 Confirmed current state

- Πραγματικό context resolution, retrieval, citations, streaming, provider/model settings και persisted messages.
- Workspace μπορεί να ανοίξει inline/split agent με structured context και draft/auto-send prompt.
- Υπάρχει μεγάλος αριθμός modes, suggestion chips και context chips· το primary mental model μπορεί να υπερφορτωθεί.
- No-source και provider configuration έχουν paths, αλλά απαιτούν ενιαίο recoverable UX.
- Generated citations/tool calls και mode capabilities χρειάζονται strict validation αντί decorative display.
- Privacy/cost/external-provider disclosure και sensitive source handling χρειάζονται explicit production policy.
- Message history/context lifecycle, stale course deletion και abort/retry πρέπει να δοκιμαστούν end-to-end.

### 15.3 Decisions

- **KEEP:** grounded chat, streaming, citations, workspace context handoff, cancel/retry.
- **SIMPLIFY:** primary modes σε μικρό task-oriented set· advanced modes σε progressive disclosure.
- **CONNECT:** every citation opens exact source location and handles deleted/reprocessed source.
- **GATE:** provider/model/mode combinations από capability registry· unavailable modes hidden/disabled με reason.
- **LABEL:** ungrounded answer explicitly και require user opt-in όταν υπάρχει no source.
- **REMOVE:** suggestion chips που δεν αλλάζουν πραγματικά prompt/context ή επαναλαμβάνουν άλλα controls.

### 15.4 Implementation plan

- **P0:** citation integrity, abort/race safety, deleted-source invalidation και no duplicate sends.
- **P0:** secrets/privacy audit· production keys μέσω secure server proxy, όχι exposed client storage.
- **P1:** canonical conversation/context state machine με visible active source/course/task.
- **P1:** unified loading/error/rate-limit/offline/provider-missing states και retry preserving draft.
- **P1:** keyboard/ARIA chat log, streaming announcements χωρίς verbosity και focus after send/error.
- **P2:** long-history virtualization, token/context budget visibility μόνο αν accurate/actionable.
- **P2:** grounded-answer evaluation fixtures και citation-opening E2E.

### 15.5 Acceptance and tests

- Source-backed answer έχει valid openable citations ή δηλώνει ότι δεν βρέθηκε επαρκής evidence.
- Course/task context δεν αλλάζει σιωπηρά μεταξύ full-page και split/inline modes.
- Cancel σταματά request/stream και retry δεν διπλασιάζει messages/events.
- Provider failure, 401, 429, offline και malformed response έχουν recoverable state.

### 15.6 Status

`Audit complete · Implementation pending`

---

## 16. PAGE 09 — Analytics

### 16.1 Product contract

Να μετατρέπει deliberate learning evidence σε κατανοητές τάσεις και συγκεκριμένες ενέργειες. Δεν είναι research dashboard ούτε συλλογή από charts χωρίς decision value.

### 16.2 Confirmed current state

- Πραγματικά local/store-derived metrics: confidence calibration, IRT/mastery, FSRS/forgetting, misconceptions, coverage, graph, transfer και events.
- Περιλαμβάνει research export και αρκετές advanced scientific έννοιες.
- Πολλά panels είναι dense, heuristic ή δύσκολα ερμηνεύσιμα από μαθητή.
- Ορισμένα labels είναι raw technical terms, mixed-language ή δεν δηλώνουν sample size/time range.
- Empty/low-evidence states μπορούν να φαίνονται ως meaningful 0%/neutral projections.
- Actions προς Tasks/Workspace υπάρχουν σε ορισμένα panels αλλά όχι συστηματικά.

### 16.3 Decisions

- **KEEP:** progress over time, mastery by concept, confidence calibration, due retention, recurring errors.
- **MOVE/GATE:** IRT internals, transfer normalization, model diagnostics και research export σε “Advanced/Research”.
- **REQUIRE:** definition, formula summary, sample size, time window και uncertainty για κάθε metric.
- **CONNECT:** κάθε weak/error/retention insight σε exact remediation/task/workspace action.
- **REMOVE:** charts χωρίς distinct question ή action.
- **GATE:** projections μέχρι minimum evidence threshold· show “not enough evidence”.

### 16.4 Implementation plan

- **P0:** audit όλες τις metric formulas και unify με Dashboard/Course/Workspace selectors.
- **P1:** learner-first IA: Overview, Mastery, Retention, Errors, Activity· Advanced ξεχωριστά.
- **P1:** global course/time filters με shared scope banner και persisted query state.
- **P1:** accessible summaries/tables, locale formatting και print/export metadata.
- **P1:** privacy-safe research export με provenance, consent και schema version.
- **P2:** chart performance, lazy advanced panels και deterministic test fixtures.

### 16.5 Acceptance and tests

- Κανένα chart χωρίς question, definition, scope, evidence threshold και text equivalent.
- Ίδιο concept/time range δίνει συνεπείς values σε όλες τις σελίδες.
- Deep links διατηρούν selected course/concept/time scope.
- Export περιέχει schema/provenance, όχι secrets ή unintended source text.

### 16.6 Status

`Audit complete · Implementation pending`

---

## 17. PAGE 10 — Settings

### 17.1 Product contract

Central preferences/account/data/integration surface με ασφαλή defaults, explicit save semantics και ξεκάθαρο impact κάθε αλλαγής.

### 17.2 Confirmed current state

- Τέσσερις περιοχές: learning, AI, integrations, account/data.
- Πραγματικά callbacks για settings, auth, account sync, data reset και external integrations.
- Provider/model/API key, daily goal, exam date, theme, language και study preferences επηρεάζουν runtime.
- Τα client-entered provider keys είναι production security risk αν χρησιμοποιούνται απευθείας ή αποθηκεύονται μη ασφαλώς.
- Το tab είναι local-only, χωρίς deep link· η σελίδα είναι μεγάλη και mixed novice/advanced.
- Save semantics, async status και error feedback δεν είναι ομοιόμορφα ανά control.
- Reset progress, logout, account sync και integration imports χρειάζονται consistent confirmation/recovery.

### 17.3 Decisions και implementation

- **KEEP:** learning preferences, appearance/language, account, data controls.
- **GATE:** provider keys/models και debug capabilities ως advanced/development ή server-managed integrations.
- **SEPARATE:** Preferences, AI & Integrations, Account, Data & Privacy με route-preservable tabs.
- **CONNECT:** κάθε preference σε visible explanation “affects Dashboard/Tasks/Workspace”.
- **REMOVE:** settings που δεν έχουν runtime consumer.
- **P0:** secret-storage/network audit και redact from persistence/log/export.
- **P0:** destructive reset scope preview, typed confirmation και verified cascade.
- **P1:** consistent auto-save/manual-save policy, per-section pending/saved/error status.
- **P1:** schema validation, migration/versioning και reset-to-default per section.
- **P1:** full i18n, labels/descriptions/errors, fieldset/legend, password manager/autocomplete semantics.
- **P2:** import/export user settings με schema/version, χωρίς secrets.

### 17.4 Acceptance and tests

- Κάθε visible setting έχει πραγματικό read consumer και persistence test.
- Secrets δεν εμφανίζονται σε local export, DOM μετά navigation, logs ή analytics.
- Invalid provider/model/date values απορρίπτονται με accessible inline error.
- Reset/logout/sync failure δεν αφήνει μισή ή αντιφατική κατάσταση.

### 17.5 Status

`Audit complete · Implementation pending`

## 18. PAGE 11 — Teacher Dashboard

### 18.1 Product contract

Backend-authoritative educator surface για class roster, assignments, announcements, gradebook, discussions, LTI και cohort insights. Δεν πρέπει να συνδυάζει unrelated system diagnostics με καθημερινές teaching εργασίες στην ίδια ιεραρχία.

### 18.2 Confirmed current state

- Πραγματικά auth APIs για classes, roster, assignments, announcements, discussions, gradebook, CSV, LTI roster/passback και org analytics.
- Χωρίς token εμφανίζεται sign-in state· με token φορτώνει dashboard/classes και προαιρετικά πρώτο org.
- Το client Shell δεν κάνει verified teacher role gating.
- Ένα component άνω των 1.100 γραμμών συνδυάζει class admin, analytics, LLM usage, publishing, server capabilities και local session telemetry.
- `classBusy` είναι global για διαφορετικά mutations, άρα μία ενέργεια μπορεί να μπλοκάρει άσχεστα controls.
- Errors συγκεντρώνονται σε ένα global banner και επιτυχημένα mutations δεν έχουν συνεπή status/undo.
- Grade cells αποθηκεύονται στο blur, χωρίς robust invalid/dirty/saving/error indication.
- Destructive actions δεν έχουν confirmation· LTI/CSV failures έχουν ασυνεπή handling.

### 18.3 Decisions

- **GATE:** server role/permission πριν από rendering και σε κάθε mutation.
- **SPLIT:** Overview, Classes, Assignments, Gradebook, Insights, Integrations.
- **MOVE:** server capabilities και raw LLM usage σε admin/settings, όχι core teacher flow.
- **KEEP:** roster, assignments, announcements, discussions, gradebook και actionable cohort insights.
- **CONNECT:** insight → filtered student/concept/assignment remediation.
- **GATE:** LTI controls μόνο όταν capability/context verified.

### 18.4 Implementation plan

- **P0:** permission/authorization integration tests, destructive confirmations και grade validation 0–100.
- **P0:** async race/cancellation και per-action busy/error state· no stale class data after switching.
- **P1:** decompose by route/module και add query/deep-link state.
- **P1:** accessible tables/forms, labels, row/column headers, keyboard grade entry και save indicators.
- **P1:** cohort metric definitions, sample thresholds και privacy rules για small cohorts.
- **P1:** full i18n· raw capability/provider labels μόνο σε admin context.
- **P2:** pagination/virtualization, optimistic updates με rollback και CSV/LTI receipts.

### 18.5 Acceptance and tests

- Non-teacher token λαμβάνει safe forbidden state και κανένα privileged mutation.
- Switching class ακυρώνει/αγνοεί stale responses.
- Grade save έχει pending/success/error και δεν χάνει invalid input.
- Roster/assignment/delete/LTI flows έχουν confirmation, retry και server-authoritative refresh.
- Cohort insights δεν εκθέτουν προσωπικά δεδομένα σε μη επιτρεπόμενο scope.

### 18.6 Status

`Audit complete · Backend/role hardening required`

---

## 19. PAGE 12 — Student Organization View

### 19.1 Product contract

Authenticated student portal για membership, class announcements, assignments, gradebook και discussions με deep links σε πραγματικές learning actions όταν υπάρχει σχετικό course/source.

### 19.2 Confirmed current state

- Πραγματικά APIs για organization membership, classes, assignments, announcements, gradebook και discussion threads.
- Διατηρεί selected class local state και φορτώνει class data με Promise-all style flow.
- Χωρίς auth εμφανίζει sign-in state.
- Αρκετά labels/copy είναι inline bilingual ternaries και όχι canonical content contract.
- Assignment/announcement rows κυρίως ενημερώνουν· δεν ανοίγουν πάντα σχετικό task/course/workspace.
- Loading/error/offline/empty είναι coarse και η αλλαγή class χρειάζεται stale-request protection.
- Δεν υπάρχει explicit permission/privacy scope ή explanation για grade visibility.

### 19.3 Decisions και implementation

- **KEEP:** membership, class selector, announcements, assignments, own grades, discussions.
- **CONNECT:** assignment → Task/Course/Workspace όταν υπάρχει mapping· αλλιώς external/details state.
- **CONNECT:** announcement links και due dates σε calendar/task metadata μόνο με πραγματική backend support.
- **GATE:** grade/discussion visibility από server permissions.
- **MERGE:** duplicated class metadata με shared class-domain models, όχι teacher component reuse.
- **P0:** request cancellation, auth/permission/error hardening και no cross-student data.
- **P1:** canonical i18n content, locale dates, semantic tabs/tables/cards και mobile IA.
- **P1:** per-class loading/empty/error, retry και preserved class selection.
- **P2:** notification/deep-link integration με real unread state.

### 19.4 Acceptance and tests

- Student βλέπει μόνο δικό του gradebook/discussions σύμφωνα με server authorization.
- Class switch δεν εμφανίζει δεδομένα προηγούμενης τάξης.
- Assignment deep link ανοίγει valid mapped learning context ή δηλώνει καθαρά ότι δεν υπάρχει local material.
- Mobile, keyboard, EN/EL και offline/retry tests.

### 19.5 Status

`Audit complete · Backend/permission hardening required`

---

## 20. CORE SURFACE — Study Workspace

### 20.1 Product contract

Το Workspace είναι το κεντρικό learning execution environment. Πρέπει να διατηρεί ένα ενιαίο course/topic/step/source context, να επιτρέπει focused tool transitions και να καταγράφει deliberate learning evidence χωρίς duplicate ή fabricated events.

### 20.2 Confirmed composition

- Thin shell → lazy `StudyWorkspaceBody` → `useStudyWorkspace` model → Provider/EmptyActions → Chrome → classic ή Notebook layout → overlays.
- Layout modes: `split`, `focus-lesson`, `focus-tool`, `zen` και επιπλέον notebook mode.
- External App composition προσθέτει Workspace + Agent split και Workspace + Course split.
- Διαθέσιμα tool IDs: Reader, Concept Map, Scratchpad, Whiteboard, Leitner, Feynman, Quiz, Simulator, Compare, Debate, Timer, Annotations, Dashboard.
- Lazy registry/suspense χρησιμοποιείται για βαριά tools.
- Course/source/focus/context, learning events, persistence, stale artifacts, collaboration και Agent prompts είναι συνδεδεμένα σε διαφορετικό βαθμό.
- Mobile και desktop notebook/classic chrome επαναλαμβάνουν controls/labels· υπάρχουν inline ternaries και hardcoded menu text.
- Το `useStudyWorkspace`/ToolSurface API είναι πολύ μεγάλο, αυξάνοντας coupling και regression blast radius.

### 20.3 Workspace-wide decisions

- **KEEP:** one workspace, source-grounded tools, layout modes με πραγματική χρησιμότητα, lazy heavy tools.
- **MERGE:** canonical chrome/action registry για mobile/classic/notebook και external split modes.
- **TYPE:** tool capability registry: requires source, supports focus, emits events, persists artifact, agent intents, mobile suitability.
- **CONNECT:** all tool transitions preserve `WorkspaceContext` και active concept unless user explicitly changes it.
- **SIMPLIFY:** default tool set βασισμένο στο current task· full catalogue μέσω palette/progressive disclosure.
- **REMOVE/GATE:** controls χωρίς actual handler, source, capability ή meaningful mobile interaction.
- **REFACTOR:** model σε stable domain slices (context, navigation, source, pedagogy, tools, overlays, collaboration) χωρίς δεύτερο store.

### 20.4 Workspace P0 implementation

- Audit κάθε emitted learning event για user intent, deduplication και downstream selector impact.
- Ensure reprocess/delete marks or remaps Reader highlights, annotations, quizzes, cards, simulator presets και Agent citations.
- Context invariant tests για Dashboard/Task/Course → Workspace → tool → Agent → source → close/back.
- Fix focus/escape/back/scroll locks σε all full-screen/split/modal states.
- Explicit unknown/low-confidence handling: no generated assessment as fact.
- Protect local drafts/artifacts from cross-course/progress-key collision.

### 20.5 Workspace P1 implementation

- Canonical `WorkspaceToolDefinition` and action registry shared από strip, palette, cross-links και Notebook layout.
- Canonical title/breadcrumb/source-quality/step progress across all chrome modes.
- Persist only intentional preferences: layout/notebook/tool; task-specific focus remains contextual.
- Unified loading/empty/error/offline/stale shell per tool.
- Responsive contract για 320px, tablet split, wide desktop, virtual keyboard και safe areas.
- Full i18n elimination of inline hardcoded English/Greek and raw labels.
- Accessible resizable panels, tabs, canvas alternatives, reduced motion and live regions.

### 20.6 Per-tool audit matrix

| Tool | Keep value | Required authoritative inputs | Required outputs/fan-out | Main action |
|---|---|---|---|---|
| Reader | primary source owner | stable text, OCR regions, section map, highlight | read/focus/section events, annotations | keep/connect exact anchors |
| Concept Map | prerequisite/relationship view | concept nodes/edges + confidence | map/focus events, persisted user graph | gate weak extraction; accessible list |
| Scratchpad | learner-created notes/formulas | progress/course/concept scope | drafts, cards, annotations, whiteboard import | keep; version/scope hardening |
| Whiteboard | visual explanation | concept/context + user strokes | persisted board, meaningful engagement | keep only with keyboard/export alternative |
| Leitner/FSRS | due recall | source-valid cards, FSRS state | rating/review event, next due | keep; dedupe Review overlay |
| Feynman | self-explanation | source excerpt/key terms | submission/gap evidence | keep; rubric/source transparency |
| Quiz | retrieval practice | validated source-derived questions | answer/confidence/IRT/mistake events | keep; integrity and stale versioning |
| Simulator | scenario practice | source-valid variables/scenarios | sensitivity/practice events | gate by supported domain/data |
| Compare | concept differences | two grounded entities/claims | focus/read events | keep when comparison evidence exists |
| Debate | argument/rebuttal | source claims and provenance | learner rebuttal evidence | gate; distinguish source/inference |
| Timer | session structure | task/concept/exam context | intentional duration completion | keep; no passive fake study time |
| Annotations | source-linked notes | stable anchor/source/version | personal/shared annotation events | keep; remap/conflict/privacy |
| Dashboard mini | in-context summary | canonical selectors | remediation/navigation only | simplify; no duplicate analytics |

### 20.7 Tool-specific acceptance

- **Reader:** deterministic open-at-source after reload; extraction changes produce remap/stale UI.
- **Map/Whiteboard:** keyboard-readable alternative and persisted artifact isolation.
- **Scratchpad/Annotations:** draft recovery, conflict handling, source version provenance.
- **Quiz/Leitner/Feynman:** one attempt = one deliberate event; answer and confidence semantics tested.
- **Simulator/Compare/Debate:** hidden or useful empty action when unsupported; no fabricated scenario/claims.
- **Timer:** elapsed time alone does not imply mastery; background/visibility behavior specified.
- **MiniDashboard:** exact agreement with main Dashboard/Analytics under same scope.

### 20.8 Layout and overlay acceptance

- Close/back returns to originating page/context and restores focus.
- Split panes remain usable at minimum widths and expose keyboard resize controls.
- Zen hides nonessential chrome but retains accessible exit and emergency navigation.
- Notebook/classic switch does not reset tool drafts, source position or context.
- Inline Agent and Course split have one close owner and no nested full-screen focus trap conflict.

### 20.9 Status

`Audit complete at architecture level · Per-tool runtime passes pending`

## 21. SURFACE — Notebook Mode και NotebookLM Bridge

### 21.1 Product contract

Notebook mode είναι εναλλακτική IA του ίδιου Workspace — Sources, grounded Chat, Studio — όχι δεύτερο learning system. Το NotebookLM bridge είναι explicit external import/export/handoff, όχι native capability claim.

### 21.2 Confirmed current state

- Το `NotebookWorkspaceLayout` παρέχει πραγματικό responsive Sources/Chat/Studio layout και χρησιμοποιεί τα ίδια workspace tools.
- Το standalone `NotebookShellView` επαναλαμβάνει sources, workspace launch, FSRS import και Studio/integration actions.
- Studio quick actions ανοίγουν tool + Agent prompt, αλλά εμφανίζουν “Ready” μετά από σταθερό timeout 600ms ανεξάρτητα από πραγματικό generation result. Αυτό είναι confirmed fabricated status.
- Studio grid εμφανίζει όλα τα tools χωρίς πλήρες source/capability gating.
- External NotebookLM ανοίγει νέο handoff· το browser δεν εγγυάται content transfer/import completion.
- Πολλά labels είναι inline ternaries ή ίδιο EN copy και στις δύο γλώσσες.
- Source row στο standalone shell ανοίγει external NotebookLM, ενώ στο workspace ανοίγει local Reader· ownership/expectation διαφέρει.

### 21.3 Decisions

- **P0 REMOVE:** timeout-based “Ready”. Generation status προέρχεται μόνο από πραγματικό async operation/artifact creation· αλλιώς action λέγεται “Ask Agent to create”.
- **MERGE:** το standalone Notebook Shell μεταβαίνει σταδιακά στο Notebook Workspace mode + Sources/Lifecycle integrations. Αφαιρείται όταν υπάρχει feature parity.
- **GATE:** tools/quick actions από shared capability registry και source quality.
- **LABEL:** κάθε external NotebookLM action ως external handoff, με τι εξάγεται/τι δεν μεταφέρεται αυτόματα.
- **OWNERSHIP:** local source rows ανοίγουν Reader· external NotebookLM είναι ξεχωριστή action.
- **KEEP:** verified import/export parsers, FSRS conversion και audio transcript flows με provenance/version.

### 21.4 Implementation and acceptance

- Async state machine `idle/running/succeeded/failed/cancelled` συνδεδεμένο με πραγματικό operation ID.
- Import preview με counts, source, duplicates, conflicts και confirmation πριν mutation.
- Export receipt/download success, failure και retry· no sensitive unintended learner data.
- Notebook/classic parity tests: source, tool draft, active focus και Agent citations.
- External link security (`noopener`/Capacitor contract), offline state και user consent.
- Standalone shell removal checklist: all entry points migrated, old state/types/tests removed, deep links redirected.

### 21.5 Status

`Audit complete · Fabricated quick-action status is P0`

---

## 22. GLOBAL FLOW — Upload, Preview, Process, Reprocess

### 22.1 Product contract

Μία transactional ingestion ροή: validate input → preview real extraction/outline → configure → process with truthful status → commit course/artifacts → navigate to analysis. Partial failure δεν πρέπει να δημιουργεί αόρατη ή μισή κατάσταση.

### 22.2 Confirmed current state

- Ένα κοινό `UploadModal` χρησιμοποιείται από onboarding, Shell, Library, Course και Workspace.
- Inputs: files, pasted text, YouTube URL, new/extend target, source mode, focus tags, exam date και edited outline.
- Preview κάνει πραγματικό async `previewUploadOutline`; processing καλεί `store.processUpload`; success ανοίγει Note Analysis.
- File type/size/duplicate/empty-file validation και YouTube domain validation δεν είναι explicit στο UI state.
- `PROCESSING_STEPS` έχει στατικά `done: true/false`, άρα εμφανίζει fabricated progress που δεν συνδέεται με pipeline.
- Backdrop και close button παραμένουν ενεργά κατά processing· δεν υπάρχει abort/leave-confirm contract.
- Δεν υπάρχει semantic dialog/focus trap/Escape restore contract.
- `sourceMode` δεν resetάρεται από `resetForm`, άρα μπορεί να διαρρεύσει προηγούμενη επιλογή σε νέα συνεδρία.
- Preview αγνοεί stale results με boolean cancellation αλλά δεν ακυρώνει πραγματική εργασία.
- Selected files χρησιμοποιούν index keys και legacy `onUpload` είναι no-op στο App επειδή υπάρχει process handler.

### 22.3 Decisions

- **P0 REMOVE:** στατικά processing checkmarks/progress. Αν backend δεν παρέχει progress, χρησιμοποίησε indeterminate status με πραγματικές completed phases μόνο.
- **VALIDATE:** MIME/extension, size/count, duplicate hash/name, empty content, URL provider, target course και date.
- **TRANSACTION:** stable `uploadJobId`, explicit preview/process/commit result και recovery από partial failure.
- **LOCK/CANCEL:** during commit, close απαιτεί safe cancel ή “continue in background” μόνο αν υποστηρίζεται πραγματικά.
- **RESET:** όλες οι form/config/transient states reset deterministically.
- **KEEP:** editable preview, source policy, focus and extend/new επιλογή, εφόσον downstream consumers είναι verified.
- **REMOVE:** legacy no-op upload prop/path μετά migration.

### 22.4 Implementation plan

- **P0:** real validation/errors, truthful processing state, transaction/cancellation, duplicate-submit guard.
- **P0:** extend-course atomicity και rollback test.
- **P1:** accessible dialog, focus trap/restore, progress semantics, keyboard drop alternative και error summary.
- **P1:** per-input provenance and privacy notice; file list with stable IDs and extraction status.
- **P1:** preview debounce/cache/cancel and clear stale preview when source changes.
- **P1:** post-success receipt: created/extended course, files/topics, warnings, analysis action.
- **P2:** background job/resume only if server/local worker supports durable jobs.

### 22.5 Acceptance and tests

- Unsupported/oversized/duplicate/invalid input μπλοκάρεται πριν process με localized actionable error.
- One submit = one course mutation.
- Closing/reloading at each phase έχει documented deterministic result.
- Extend failure αφήνει target course unchanged ή δείχνει recoverable partial state.
- Upload → Analysis → Course/Workspace preserves exact new course ID.
- E2E matrices: file, paste, URL, multi-file, new, extend, preview edit, failure, cancel, offline.

### 22.6 Status

`B4 complete (2026-07-12)` — validation, upload job id, close guard, truthful indeterminate processing UI, `uploadTransaction` snapshot/rollback on commit (`synapse:upload-force-fail` test hook), `setGlossaryEntries` on commit, E2E matrix in `e2e/upload-lifecycle-b4.spec.ts` (validation, hero popup, processing status, escape close-confirm, commit rollback, extend rollback).

---

## 23. TASK EXECUTION SURFACES — Lesson, Practice, Review, Mistakes, Exam, Prerequisites

### 23.1 Shared contract

Όλες οι task εμπειρίες χρησιμοποιούν ένα typed `TaskExecutionState`/route contract, κοινό header/footer/focus behavior και deliberate-event semantics. Πολλαπλά boolean overlays δεν επιτρέπεται να είναι ταυτόχρονα active.

### 23.2 Lesson View

- **Keep:** grounded note bundle, generated/fallback panels, retrieval gate, persisted step, confidence.
- **Connect:** progress/version με task/session spine και Workspace context.
- **Fix:** loading/fallback generation messaging, close confirmation for active progress, full state matrix and i18n.
- **Test:** reload resume, wrong→retry→correct, one completion/event, source reprocess stale behavior.

### 23.3 Practical Lesson

- **Confirmed P0:** `completedCount = max(index + 1)` μπορεί να θεωρήσει προηγούμενες ασκήσεις ολοκληρωμένες όταν ο χρήστης λύσει μεταγενέστερη άσκηση. Αντικατάσταση με `Set<exerciseId>`.
- **Confirmed risk:** non-Python/fallback path μπορεί να εμφανίσει simulated expected output ή regex validation. Πρέπει να επισημαίνεται καθαρά ή να χρησιμοποιεί πραγματικό runtime/validator.
- **Fix:** domain-aware renderer, actual test results, run/cancel/error state, draft persistence και complete only all IDs passed.
- **i18n/a11y:** όλα τα hardcoded editor/output/hint/solution/status labels, accessible code editor and mobile pane switching.

### 23.4 Review Session

- **Keep:** FSRS rating and due-card flow.
- **Merge:** κοινό review engine με Workspace Leitner αντί δύο διαφορετικά completion/state contracts.
- **Fix:** localized instructions, course/context source, explicit session progress/completion, empty/stale card state.
- **Integrity:** reveal/recall/rating event μία φορά· no mastery from simply opening/flipping.

### 23.5 Mistake Retry

- **Confirmed P0:** “I got it” διαγράφει/επιλύει mistake χωρίς reassessment.
- **Replace:** source-grounded retry question ή explain-then-check checkpoint πριν resolution.
- **Keep:** mistake provenance, wrong/correct answer evidence και Agent diagnosis.
- **Fix:** irreversible resolution only after validated attempt; allow postpone/keep-open; localize all copy.

### 23.6 Exam Prep

- **Confirmed P0:** fixed confidence `75` καταγράφεται για κάθε answer χωρίς user input.
- **Confirmed P0:** μικρό quiz μπορεί να δηλώσει “ready for the real exam”, μη υποστηριζόμενο claim.
- **Confirmed:** “module breakdown” δημιουργεί ένα bucket ανά ερώτηση (`Q1`, `Q2`), άρα δεν είναι module analysis.
- **Confirmed:** empty questions επιτρέπει setup/active flow χωρίς useful assessment.
- **Fix:** real module/concept metadata, no-readiness claim without calibrated threshold/sample, confidence capture ή omit confidence event.
- **Fix:** autosave/resume, timer visibility rules, submit confirmation, unanswered handling, accurate time measurement.
- **Policy:** Agent unavailable during standard timed phase ή pauses/invalidates exam with explicit rule; practice mode may expose help.
- **Test:** timeout, reload, background tab, retake event isolation, zero questions, mobile nav, keyboard MCQ.

### 23.7 Prerequisite Repair

- **Confirmed P0:** completion ενεργοποιείται με `checkpointDone` ακόμη και όταν η απάντηση είναι λανθασμένη.
- **Confirmed P0:** όταν λείπουν steps/checkpoint δημιουργείται generic fabricated teaching content/question.
- **Fix:** no-content state with source/reprocess/Agent action; require correct validated checkpoint or explicit alternative remediation.
- **Connect:** successful repair updates prerequisite edge/evidence and returns to dependent concept.

### 23.8 Shared implementation plan

- **P0:** one active task execution union instead of independent booleans; invariant test prevents overlay stacking.
- **P0:** fix all four integrity defects above before polish.
- **P1:** shared `LearningFlowChrome`, focus trap/restore, close/resume, session bar and error boundary.
- **P1:** common result schema: attempts, correctness, confidence optional, duration, source/version, artifact, completion.
- **P1:** full bilingual/localized content and consistent XP/completion explanation.
- **P2:** migrate Lesson/Review/Practice into Workspace where this removes duplication without degrading focused flows.
- **REMOVE:** unused top-level `AppView='lesson'` after route/state migration and regression tests.

### 23.9 Exit criteria

- Wrong answer alone never unlocks successful repair/completion unless task semantics explicitly allow review-only completion.
- No synthetic confidence, readiness, module breakdown, runtime result or educational content.
- Every execution flow survives back/reload or clearly warns before discard.
- Exactly one completion and one deliberate attempt event per user action.

---

## 24. GLOBAL OVERLAYS — Palette, Notifications, Tour, Toasts, Take-Breath

### 24.1 Decisions

- **Command Palette:** shared action/navigation registry, fuzzy content search with course scope, no action unavailable to role/context.
- **Notifications:** real unread/read timestamps and deep links; activity history is not notification count.
- **Product Tour:** target registry shared with navigation/actions, skip/replay/persistence, wait-for-target timeout and no interruption of Workspace.
- **Toasts:** reserved for transient outcome; errors requiring recovery remain inline/persistent; no duplicate toast + banner.
- **Take-Breath:** optional, dismissible, non-medical wording, reduced motion and no automatic interruption.

### 24.2 Overlay manager plan

- Introduce a typed overlay priority/ownership layer over existing store state; do not create a second domain store.
- Enforce one modal focus trap at a time and deterministic stacking for non-modal toasts.
- Escape/backdrop/back-button policy per overlay; restore focus to opener.
- Prevent tour, upload and task execution from co-opening unexpectedly.
- Add body scroll-lock reference counting and cleanup on error/remount.

### 24.3 Acceptance

- Automated invariant: no more than one modal dialog active.
- Keyboard-only open/use/close for every overlay.
- Deep link from notification closes panel and lands on valid target.
- Tour survives responsive layout and missing target without trapping user.

## 25. Cross-Cutting Implementation Workstreams

### 25.1 Typed navigation and deep-link contract

**Goal:** serialize and restore page, course, tab, task, concept, tool and source highlight without stale or unauthorized navigation.

- Introduce typed view metadata/serializer around existing `AppView`; do not adopt a routing library unless history/deep-link requirements cannot be satisfied safely.
- Canonical params: `view`, `course`, `tab`, `task`, `concept`, `tool`, `source`, `anchor`, `mode` with validation and migration.
- Browser back/forward closes overlays or changes pages in expected order.
- Unknown/deleted/unauthorized targets resolve to a safe page with explanation.
- One origin snapshot supports close/back/focus restoration from full-screen flows.

### 25.2 Learning event and selector spine

- Define deliberate event schema with stable ID, timestamp, course, concept, task, tool, source version, outcome, optional confidence and duration semantics.
- Event idempotency prevents double recording from rerender/retry/retake.
- Canonical selectors own mastery, weak areas, due reviews, calibration, activity, readiness and next action.
- Passive open/hover/time-in-tab does not imply learning or mastery.
- Migration handles old local events without fabricating missing fields.
- Fan-out contract test covers Dashboard, Tasks, Course, Analytics and Workspace MiniDashboard.

### 25.3 Content lifecycle and provenance

- Canonical entities: `Course`, `SourceDocument`, `SourceVersion`, `ExtractionArtifact`, `GeneratedArtifact`, `UserArtifact` and external import/export receipt.
- Every derived item records source/version/confidence/generation method.
- Reprocess produces new source version and remap/stale report.
- Delete dependency graph is testable and surfaced before confirmation.
- Search/retrieval excludes deleted/stale-invalid artifacts.
- Demo entities use isolated namespace/storage and never enter real sync/export by default.

### 25.4 Shared async state and page primitives

- Standard `AsyncState<T>` semantics: idle, loading, refreshing, success, empty, partial, stale, offline, error.
- Shared primitives: PageHeader, SectionHeader, EmptyState, ErrorState, LoadingState, PermissionState, ConfirmDialog, AsyncButton, MetricDefinition and StatusNotice.
- Components remain domain-agnostic; business state remains in current selectors/hooks/store.
- No loading animation or progress percentage without real operation state.

### 25.5 i18n reconciliation

Το current repository χρησιμοποιεί κυρίως key-based `useI18n`, ενώ ο project rule απαιτεί `useLanguage` και `t(greek, english)`. Πριν από page edits:

1. ορίζεται ένας canonical adapter/hook που ικανοποιεί το user rule χωρίς δεύτερο language store,
2. δεν αναμιγνύονται raw ternaries, key-based calls και inline labels σε νέο code,
3. existing translation keys μεταναστεύουν σταδιακά χωρίς big-bang rewrite,
4. i18n lint επεκτείνεται σε JSX text, attributes, errors, dynamic enums και accessibility labels,
5. locale formatters παραμένουν centralized και tested.

### 25.6 Accessibility system

- Reusable dialog/drawer/popover focus management.
- Route/overlay focus announcement and restoration.
- Semantic tabs, tables, progress, chat log and disclosure patterns.
- Canvas/graph alternatives and keyboard controls.
- Touch targets, AA contrast, 200% reflow, reduced motion and screen-reader smoke tests.
- Axe is necessary but not sufficient: manual keyboard and SR checklist per page.

### 25.7 Security and privacy

- Server authorization for role/org/LTI/grade actions.
- Secure AI provider proxy and secret redaction.
- Explicit data boundaries for local vs synced vs exported vs external NotebookLM/provider.
- Confirmation/receipt for destructive and external transfer actions.
- Privacy-safe telemetry with event allowlist, no raw note text, secrets or student records.
- Threat-model upload parsers, archives/ZIP, HTML/Markdown rendering, URLs and file names.

### 25.8 Performance

- Budgets measured on production build for Landing, Dashboard, Course, Workspace first open and tool switch.
- Preserve lazy heavy tool chunks; prefetch only likely next action under network/device constraints.
- Abort stale requests; memoize canonical selectors by stable inputs.
- Virtualize long chat, source, class, task and analytics lists only after measured need.
- Prevent animation, chart and markdown rendering from blocking input.

### 25.9 Observability

- Structured error context: view, operation, capability, anonymous correlation/job ID and recoverability.
- No sensitive source content/tokens/student data.
- Product events limited to meaningful journey/outcome events.
- Upload/reprocess/Agent/server sync record phase timings and failure category.
- Release dashboard tracks crash-free flows, upload success, source-open success and task completion—not vanity clicks.

---

## 26. Entity Ownership and Fan-Out Matrix

| Entity/read model | Authoritative owner | Main readers | Mutations | Mandatory fan-out |
|---|---|---|---|---|
| User/profile/settings | current store + verified account API | Onboarding, Shell, Settings, planners, Agent | onboarding/settings/account sync | theme/lang/plans/tools/navigation |
| Course | library/store/server merge contract | Library, Course, Dashboard, Workspace, Agent | upload, extend, reprocess, delete, sync | tasks/search/glossary/analytics/context |
| Source document/version | ingestion lifecycle | Analysis, Course Sources, Reader, Agent | upload, edit, reprocess, delete | citations/artifacts/stale/remap |
| Task | task scheduler/store | Dashboard, Tasks, Course, Workspace | generate/start/complete/reset | events/session/XP/next action |
| Learning event | deliberate event spine | all adaptive selectors | attempt/rating/explanation/study completion | mastery/weak/review/analytics |
| Mistake/misconception | assessment outcome model | Tasks, Dashboard, Analytics, Agent | create, validated resolve | weak/remediation/next action |
| Workspace context | typed store spine | chrome, tools, Agent, source opener | focus/tool/step/layout changes | breadcrumb/deep link/live sync |
| Agent conversation | conversation/context store | Agent full/inline/split | send/stream/cancel/retry/delete | citations/task context only |
| Upload job | ingestion state machine | Upload modal, Analysis, Library | preview/process/cancel/commit | course/source/artifact receipt |
| Org/class/grade | server APIs | Teacher/Student Org | authorized CRUD/LTI | server refresh/audit only |
| Notification | notification model | Shell/panel/toast | create/read/clear/open | unread count/deep link |

---

## 27. Keep / Merge / Gate / Remove Registry

| Surface/item | Decision | Target owner | Removal/migration condition |
|---|---|---|---|
| Landing fabricated testimonial/stars | Replace | Landing | verified evidence component available or omit entirely |
| Landing trust “institutions” implication | Rename | Landing | use “designed for” unless customers verified |
| Silent onboarding demo skip | Split/gate | Onboarding | explicit demo sandbox and no-data continuation exist |
| Shell Quick Access duplicates | Merge | global action registry | parity tests with palette/pages |
| Activity count as unread badge | Replace | notification model | real unread state available |
| Course Study Tools catalogue | Simplify/merge | Workspace launcher | contextual launch parity |
| Standalone Notebook Shell | Merge/deprecate | Notebook Workspace + Sources integrations | import/export/FSRS parity and redirected entries |
| Notebook timeout “Ready” | Remove immediately | real async artifact state | no condition; confirmed fabricated |
| Upload static process steps | Remove immediately | upload job state | no condition; confirmed fabricated |
| Workspace MiniDashboard duplicate metrics | Simplify | canonical selectors | exact parity with main analytics |
| Review overlay engine | Merge | shared FSRS engine | focused UX parity retained |
| Practical simulated runtime | Gate/label or replace | validated exercise runner | real validator or explicit simulation |
| Mistake “I got it” resolution | Remove | validated retry | reassessment path exists |
| Prerequisite generated fallback | Remove | no-content remediation | valid source/checkpoint exists |
| Exam synthetic confidence/readiness | Remove | real assessment evidence | user confidence/calibration threshold exists |
| Teacher server capabilities/LLM diagnostics | Move | Admin/Settings | admin destination/gating exists |
| Unused `AppView='lesson'` | Remove | typed task execution state | route/state migration and tests complete |
| Decorative intent chips | Keep decorative | Landing | remain non-interactive and non-claiming |

---

## 28. Prioritized Risk Register

| ID | Severity | Evidence | Risk | Required disposition | Owner chapter |
|---|---|---|---|---|---|
| P0-01 | P0 confirmed | static `PROCESSING_STEPS` | fabricated upload progress | remove/connect to real job state | Upload |
| P0-02 | P0 confirmed | 600ms timeout → done | fabricated Notebook generation status | remove/connect to operation result | Notebook |
| P0-03 | P0 confirmed | max index completion count | practical lesson can falsely complete all exercises | track passed IDs | Task flows |
| P0-04 | P0 confirmed | resolve on “I got it” | mistake removed without evidence | validated reassessment | Task flows |
| P0-05 | P0 confirmed | `checkpointDone` gate | wrong prerequisite answer permits completion | require correct/remediation | Task flows |
| P0-06 | P0 confirmed | generic fallback steps/question | fabricated instructional content | no-content state | Task flows |
| P0-07 | P0 confirmed | constant confidence 75 | synthetic learner signal | capture or omit | Exam |
| P0-08 | P0 confirmed | score copy | unsupported “ready for real exam” claim | evidence threshold/neutral result | Exam |
| P0-09 | P0 risk | client API key settings | secret exposure | secure proxy/redaction audit | Settings/Agent |
| P0-10 | P0 risk | client nav role only | unauthorized teacher/org surface/action | server capability/permission gating | Shell/Org |
| P0-11 | P0 structural | multiple overlay booleans | stacked modals/double flow state | typed exclusive execution/overlay state | App/Overlays |
| P0-12 | P0 risk | delete/reprocess blast radius | orphaned or stale artifacts | dependency graph/cascade tests | Lifecycle |
| P1-01 | P1 confirmed | activity length badge | misleading notifications | unread model | Shell |
| P1-02 | P1 confirmed | onboarding goals unused | claimed personalization not applied | persist/connect or remove | Onboarding |
| P1-03 | P1 confirmed | raw/hardcoded labels | incomplete bilingual UX | canonical i18n pass | All |
| P1-04 | P1 inferred | modal implementations | focus/escape/restore defects | shared accessible overlay | All |
| P1-05 | P1 confirmed | duplicate metrics/owners | conflicting learning truth | canonical selectors | Dashboard/Analytics/Workspace |
| P1-06 | P1 confirmed | teacher global busy/error | unrelated blocking/lost mutation feedback | per-operation async state | Teacher |
| P1-07 | P1 confirmed | external/local Notebook ambiguity | misleading handoff/source action | explicit external semantics | Notebook |
| P1-08 | P1 confirmed | no real upload validation UI | unsafe/broken ingestion attempts | validation matrix | Upload |

**Rule:** “risk” items must be verified at runtime before code claims a bug; “confirmed” items can enter implementation directly after targeted test reproduction.

## 29. Strict Implementation Sequence

### 29.1 Sequencing rule

Η εργασία εκτελείται **ένα page packet τη φορά**. Shared code αλλάζει μόνο όταν απαιτείται από το ενεργό packet και συνοδεύεται από consumer inventory. Το επόμενο packet δεν ξεκινά πριν από το exit gate του προηγούμενου, εκτός από ανεξάρτητο backend work που δεν τροποποιεί τα ίδια contracts.

### 29.2 Stage A — Baseline and integrity gate

1. Capture current typecheck, unit, build, i18n lint, a11y, visual και performance status.
2. Create deterministic fixtures: fresh user, demo-only, one healthy course, low-quality source, stale/reprocessed source, multi-course, teacher, student-org.
3. Reproduce confirmed P0s with failing targeted tests.
4. Fix P0-01 έως P0-08: static/fabricated statuses και learning-integrity defects.
5. Verify P0 risks 09–12 and promote to confirmed ticket ή close with evidence.

**Gate A:** no known false progress/result/content/confidence/readiness; full typecheck/unit/build green; regression tests added.

### 29.3 Stage B — Acquisition and first-value path

| Order | Packet | Dependencies | Relative effort | Exit evidence |
|---:|---|---|---|---|
| B1 | Landing | demo isolation decision | S | claims audit + CTA/demo/legal/a11y E2E |
| B2 | Onboarding | typed profile/goals | M | persistence + actual effect + upload handoff E2E |
| B3 | Shell/navigation | role/capability + action registry | L | desktop/mobile/keyboard/deep-link matrix |
| B4 | Upload lifecycle | upload job contract | XL | validation/transaction/failure/cancel E2E |
| B5 | Note Analysis | canonical source quality | M | truthful diagnostics + action links |

**Gate B:** first-time user can reach first grounded analysis/course without demo leakage, dead end, fabricated status or inaccessible modal.

### 29.4 Stage C — Core course execution path

| Order | Packet | Dependencies | Relative effort | Exit evidence |
|---:|---|---|---|---|
| C1 | Library final pass | lifecycle/version contract | L | delete/reprocess fan-out tests |
| C2 | Course | selectors + deep links | XL | topic/task/source/lifecycle matrix |
| C3 | Tasks | event/task contract | XL | every task kind route/completion tests |
| C4 | Focused task overlays | exclusive execution state | XL | integrity/reload/i18n/a11y E2E |
| C5 | Study Workspace shell | context + tool registry | XL | all layout/context invariants |
| C6 | Workspace tools | C5, one tool at a time | XL per group | per-tool contract/evidence |
| C7 | Notebook mode/bridge | tool registry + lifecycle | L | no fake state + import/export parity |
| C8 | Agent | context/citation/version contract | XL | grounded/cancel/failure/privacy E2E |

Workspace tool sub-order: Reader → Annotations → Scratchpad → Quiz → Leitner → Feynman → Timer → Concept Map → Whiteboard → Compare → Debate → Simulator → MiniDashboard. Η σειρά ακολουθεί source/provenance και event dependencies.

**Gate C:** source-to-study-to-assessment-to-remediation journey λειτουργεί end-to-end, με μία learning truth και no orphaned artifacts.

### 29.5 Stage D — Decision, preference and insights

| Order | Packet | Dependencies | Relative effort | Exit evidence |
|---:|---|---|---|---|
| D1 | Dashboard final pass | canonical selectors/actions | M | fan-out and empty/active/post-upload matrix |
| D2 | Analytics | stable event/selectors | XL | metric definitions/thresholds/deep links |
| D3 | Settings | stable consumers/security policy | L | consumer/persistence/secret/reset matrix |

**Gate D:** metrics agree across pages; every preference affects a verified consumer; advanced information is gated and explainable.

### 29.6 Stage E — Institutional surfaces

1. Student Organization: server authorization, class switch safety, deep links, bilingual/mobile.
2. Teacher: server role gate, module decomposition, gradebook integrity, cohort privacy, LTI.
3. Cross-role navigation and forbidden-route tests.

**Gate E:** server-authoritative access, no cross-user/class leakage, robust mutations and no admin diagnostics mixed into learner/teacher core IA.

### 29.7 Stage F — Release hardening

- Full regression, a11y, visual, performance, offline/PWA and Capacitor smoke tests.
- Dependency/security review, privacy/data-transfer review and support/recovery runbooks.
- Remove deprecated routes/components/flags only after usage search and migration tests.
- Update README/workflow/release notes and freeze known gaps with owner/severity.

**Release gate:** all P0/P1 closed or explicitly waived with owner, rationale, mitigation and expiry; no “launch-ready” label without evidence.

---

## 30. Per-Page Audit and Delivery Packet

Κάθε page packet δημιουργεί/ενημερώνει τα ακόλουθα artifacts:

1. **Scope manifest:** entry points, components, store reads/writes, APIs, persisted keys, overlays, consumers and tests.
2. **Runtime state sheet:** normal, loading, empty, partial, stale, error, offline, permission and destructive states.
3. **Control ledger:** every control with KEEP/CONNECT/MERGE/GATE/REMOVE decision.
4. **Data dictionary:** each metric/label with formula, source, unit, scope, threshold and fallback.
5. **Flow diagram:** origin → page → action → mutation/event → destination/fan-out.
6. **Risk list:** security, privacy, data loss, learning integrity, race, responsive, a11y and performance.
7. **Implementation slices:** small reviewable changes with dependency order and rollback.
8. **Test plan/results:** exact commands, fixtures, cases and failures.
9. **Before/after evidence:** screenshots or recordings for key states at agreed viewports.
10. **Exit report:** completed, removed, deferred, backend-gated and next-page dependencies.

### 30.1 Definition of Ready

- Purpose/persona/outcome known.
- Authoritative state/actions identified.
- P0 uncertainties reproduced or classified.
- Dependencies and consumers mapped.
- Acceptance tests written in observable terms.
- Backend/API/permission assumptions confirmed or gated.

### 30.2 Definition of Done

- No open P0/P1 within scope.
- Every visible control passes action questionnaire.
- Every metric passes data-truth contract.
- All required states implemented.
- EN/EL and locale formatting complete.
- Keyboard, focus, semantics, contrast and responsive checks complete.
- Targeted tests plus required global gates green.
- No new duplicate owner/store/action registry.
- Audit trail and deprecation registry updated.
- Rollback path and residual risks documented.

---

## 31. Verification Matrix

### 31.1 Required fixture dimensions

- **Data:** fresh/empty; demo-only; healthy source; low-confidence source; stale source; multi-course; large lists.
- **Identity:** guest; learner; teacher; org student; unauthorized authenticated; expired token.
- **Network:** online; slow; offline; timeout; 401; 403; 429; 5xx; malformed response.
- **Language/theme:** EN/EL × light/dark/system/blueprint as supported.
- **Viewport/input:** 320, 375, 768, 1024, 1440, 1920 × keyboard/pointer/touch.
- **Lifecycle:** first upload; extend; reprocess; delete; sync conflict; imported external data.

Δεν απαιτείται πλήρες Cartesian product. Κάθε page packet ορίζει pairwise coverage και mandatory high-risk combinations, π.χ. EL+320px, keyboard+dialog, offline+mutation, stale+assessment.

### 31.2 Mandatory end-to-end journeys

1. Landing → onboarding → real upload → preview → processing → analysis → course → workspace.
2. Landing → explicit demo → demo badge → exit/reset → empty real account.
3. Returning learner → Dashboard next action → task → assessment → remediation → updated analytics.
4. Library/Course → reprocess/delete → stale/remap/cascade across search, Agent, tasks and workspace.
5. Task queue → each execution type → completion/retry/close/resume.
6. Workspace → Reader citation → Agent → exact source → tool switch → close with context restored.
7. Notebook import/export/external handoff → provenance → FSRS conversion.
8. Settings change → verified consumer effect → reload/migration.
9. Student org class switch/assignment/discussion/grade permission.
10. Teacher class/roster/assignment/grade/LTI with success and server failure.
11. Offline read-only use and blocked/retriable mutation.
12. Browser back/forward and mobile system back through overlay/workspace/page states.

### 31.3 Repository commands

Per implementation slice:

```bash
npm run typecheck
npm test -- <targeted-test-files>
npm run i18n-lint
```

Per completed page packet:

```bash
npm run typecheck:all
npm test
npm run i18n-lint
npm run build
npm run test:a11y
```

Per stage/release as applicable:

```bash
npm run test:e2e
npm run test:e2e:visual
npm run test:e2e:perf:prod
npm run doc-lint
```

Visual snapshots ενημερώνονται μόνο αφού ελεγχθεί η αλλαγή· ποτέ για να κρυφτεί regression. Performance tests εκτελούνται σε production build και καταγράφουν hardware/browser variance.

### 31.4 Manual checks not replaced by automation

- Screen-reader labels/order for one desktop and one mobile journey.
- Keyboard-only navigation, resize and modal recovery.
- 200% zoom/reflow and OS reduced motion.
- Real file samples including corrupt/large/mixed language/scanned/handwritten.
- External Notebook/provider consent and return path.
- Teacher/student privacy with realistic permission combinations.

---

## 32. Continuous Audit Trail

### 32.1 Status values

`not-started` · `auditing` · `blocked` · `implementing` · `verifying` · `complete` · `deferred` · `removed`

### 32.2 Master ledger

| Packet | Status | Current evidence | Next required action | Gate |
|---|---|---|---|---|
| Stage A baseline | not-started | plan/code inspection only | run baseline suite and save results | A |
| P0 integrity bundle | not-started | confirmed code findings listed | add reproductions, then fix | A |
| Landing | audited | chapter 7 | implementation packet | B |
| Onboarding | audited | chapter 8 | goals/profile/upload contract | B |
| Shell/global navigation | audited | chapter 9 | role/action/notification registries | B |
| Dashboard | pass-1 | prior implementation + chapter 10 | final selector integration | D |
| Library | pass-1 | prior implementation + chapter 11 | lifecycle integration | C |
| Note Analysis | audited | chapter 12 | truthful diagnostics | B |
| Course | audited | chapter 13 | lifecycle/deep-link/i18n packet | C |
| Tasks | audited | chapter 14 | event/route packet | C |
| Agent | audited | chapter 15 | citation/security/state packet | C |
| Analytics | audited | chapter 16 | metric dictionary and IA | D |
| Settings | audited | chapter 17 | security/consumer audit | D |
| Teacher | audited | chapter 18 | backend permission + decomposition | E |
| Student Org | audited | chapter 19 | permission/deep-link packet | E |
| Study Workspace | architecture-audited | chapter 20 | per-tool runtime audits | C |
| Notebook/NotebookLM | audited | chapter 21 | remove fake status/merge plan | C |
| Upload lifecycle | audited | chapter 22 | job/validation/modal packet | B |
| Task overlays | audited | chapter 23 | P0 integrity + shared state | C |
| Global overlays | audited | chapter 24 | overlay ownership/focus packet | B/C |

### 32.3 Per-change log template

```text
Change ID:
Date / owner:
Page packet:
Status transition:
Problem and evidence:
Decision (KEEP/CONNECT/MERGE/GATE/REMOVE):
Files/symbols changed:
Data/API/persistence impact:
Migration/rollback:
Tests added or updated:
Commands and results:
EN/EL evidence:
Viewport/input/a11y evidence:
Security/privacy review:
Performance evidence:
Known gaps / blockers:
Exit-gate decision:
```

### 32.4 Audit discipline

- Status αλλάζει σε `complete` μόνο με recorded evidence.
- Κάθε deferred item έχει reason, owner, dependency and revisit trigger.
- Κάθε removed feature έχει usage search, migration and regression evidence.
- Κάθε backend-gated item παραμένει hidden/disabled with honest explanation until verified.
- Κάθε scope increase περνά ξανά από anti-demo questionnaire.

## 33. Evidence-Based Page Scorecard

Κάθε completed packet βαθμολογείται ανά κατηγορία `0 = fails`, `1 = partial`, `2 = verified`. Δεν χρησιμοποιείται aggregate score για να κρυφτεί P0· οποιοδήποτε P0 κρατά τη σελίδα εκτός completion.

| Dimension | 0 | 1 | 2 |
|---|---|---|---|
| User value | unclear/decorative | partial outcome | one clear verified job/outcome |
| Data truth | fabricated/ambiguous | mostly real, gaps | authoritative, defined, scoped |
| Action connectivity | dead/misleading | incomplete recovery | end-to-end success/failure/fan-out |
| States | happy path only | some states | full required state matrix |
| Learning integrity | synthetic/unsafe | unproven edge cases | deliberate, source-valid, deduplicated |
| i18n | hardcoded/mixed | partial | EN/EL + locale verified |
| Accessibility | blocker | automated-only/partial | keyboard + semantics + manual evidence |
| Responsive | broken primary flow | usable with compromises | verified target viewports/inputs |
| Security/privacy | exposed/unauthorized | risk unresolved | threat/permission/data boundary verified |
| Performance | blocking/unmeasured | measured, over budget | production budget met |
| Tests | none/snapshot only | targeted partial | unit/integration/E2E appropriate |
| Maintainability | duplicate owner | transitional | canonical owner/typed contract |

**Minimum completion rule:** all dimensions ≥1, all user-critical dimensions (`data truth`, `action`, `learning integrity`, `security`, `accessibility`) =2, and no open P0/P1.

---

## 34. Initial File and Symbol Impact Map

Αυτό είναι discovery map, όχι άδεια για blanket edits. Κάθε packet ξαναεπιβεβαιώνει call sites πριν από αλλαγή.

| Domain | Primary areas | High-risk consumers |
|---|---|---|
| App composition/routes/overlays | `src/App.tsx`, `src/types/index.ts`, `src/store/useStore.ts` | Shell, all pages, browser query parsing |
| Landing/onboarding | `src/components/Landing*`, `Onboarding.tsx`, content modules | demo/store completion, settings/profile |
| Shell/navigation | `src/components/layout/Shell.tsx`, palette/notifications/tour | role gates, all views, mobile navigation |
| Upload/lifecycle | `UploadModal.tsx`, upload pipeline/preview/store processing | Library, Course, Analysis, Workspace, Agent |
| Course/library | `Library.tsx`, `CourseView.tsx`, lifecycle/version modules | tasks, glossary, retrieval, Notebook |
| Tasks/execution | `Tasks.tsx`, six execution views, taskFlows/pedagogy | events, XP, sessions, mastery, mistakes |
| Workspace | `src/components/workspace/**`, `useStudyWorkspace.ts` | Agent, source/version, all tool stores |
| Agent | `Agent.tsx`, Agent subcomponents, retrieval/stream/context modules | provider settings, citations, workspace |
| Analytics/dashboard | `Dashboard.tsx`, `Analytics.tsx`, selectors/events | course/task/workspace metric parity |
| Settings/auth | `Settings.tsx`, settings/auth/provider clients | all setting consumers, secrets, migrations |
| Institutional | `TeacherDashboard.tsx`, `StudentOrgView.tsx`, auth/org clients/server | permissions, PII, LTI, grade data |
| Tests/tooling | `src/**/*.test.*`, `e2e/**`, scripts, Playwright/Vitest config | CI runtime, deterministic fixtures |

### 34.1 Central abstraction change rule

Πριν αλλάξει `AppView`, `Course`, `UploadedFile`, `Task`, `LearningEvent`, `UserSettings`, `WorkspaceContext`, persistence schema ή API response:

1. search all definitions and consumers,
2. document compatibility/migration,
3. add/adjust contract tests,
4. update writers before or atomically with readers,
5. handle persisted old data and server skew,
6. run full typecheck/unit/build before packet completion.

---

## 35. Open Decisions and Safe Defaults

| Decision needed | Owner | Safe default until resolved |
|---|---|---|
| Verified testimonial/customer evidence | Product/legal | omit ratings/testimonial/customer implication |
| Privacy/terms/contact URLs | Product/legal | do not render dead/legal-placeholder links |
| Server roles/capabilities | Backend/security | hide/forbid teacher/org privileged flows |
| AI provider secret architecture | Security/backend | no production client key path; gate advanced config |
| Onboarding goal behavior | Product/learning | persist only goals with tested consumer; otherwise remove claim/control |
| Notification source/unread semantics | Product/data | no numeric unread badge; show activity history label only |
| NotebookLM transfer guarantees | Integration owner | describe as external open/export/import, never automatic sync |
| Exam readiness definition | Learning science | show assessment score/sample only; no readiness claim |
| Timer background behavior | Product/learning | pause or exclude hidden time from meaningful study event |
| Low-confidence source thresholds | Content pipeline | gate generated assessments and recommend review/reprocess |
| Research export schema/consent | Privacy/research | advanced hidden/gated; no raw source/PII export |
| Standalone Notebook Shell sunset | Product/engineering | freeze new features there; migrate to Notebook Workspace |

Unresolved decisions never justify invented UI or silent assumptions. Η ασφαλής προεπιλογή είναι hide/gate/label honestly.

---

## 36. Governance and Change Control

### 36.1 Decision authority

- **Product:** persona, job/outcome, IA priority, feature keep/remove.
- **Learning science/domain:** metric/assessment/remediation semantics.
- **Engineering:** architecture, state ownership, performance and migration.
- **Backend/security/privacy:** authorization, secrets, retention, transfers and PII.
- **Design/accessibility:** hierarchy, responsive behavior, interaction semantics and manual evidence.

Μία κατηγορία δεν παρακάμπτει P0 άλλης κατηγορίας. Visual approval δεν εγκρίνει false data· unit tests δεν εγκρίνουν inaccessible UX.

### 36.2 Scope control

- Νέα feature μέσα σε ενεργό packet απαιτεί questionnaire, owner, data/action contract and tests.
- Αν δεν είναι απαραίτητη για το page outcome ή για P0/P1 fix, καταγράφεται ως later candidate και δεν μπαίνει στο packet.
- Refactor χωρίς observable outcome επιτρέπεται μόνο αν είναι blocking dependency και έχει parity tests.
- “State of the art” σημαίνει robust, truthful, fast και inclusive — όχι μεγαλύτερο component count.

### 36.3 Relationship with the existing master upgrade prompt

- Το υπάρχον master prompt παραμένει architecture/domain vision.
- Το παρόν είναι το authoritative page execution order, control audit, acceptance and status ledger.
- Σε αντίφαση, runtime code/evidence υπερισχύει από παλιό documentation.
- Μεταξύ documents, το stricter security, truth, accessibility and test gate υπερισχύει.
- Completed work από το παλιό plan δεν θεωρείται complete εδώ χωρίς page-level evidence.

### 36.4 Deprecation policy

- Mark deprecated owner and replacement.
- Freeze new feature work on deprecated surface.
- Migrate callers/state/persistence/tests.
- Measure/search remaining usage.
- Remove code, types, flags, copy and tests in one cleanup packet.
- Verify old deep links and persisted state degrade safely.

---

## 37. First Actionable Execution Packet

### 37.1 Packet A0 — Baseline

**Scope:** no behavior changes.

- Run and record `typecheck:all`, full Vitest, i18n lint, build, existing a11y, visual and perf tests.
- Record existing failures separately from new work.
- Add or identify deterministic fixture builders for the required states.
- Capture screenshots for Landing, Onboarding, Dashboard, Library, Course, Tasks, Agent, Analytics, Settings, Teacher, Student Org and Workspace at 375/1440 in EN/EL where feasible.
- Create per-page control inventory starting with Landing.

### 37.2 Packet A1 — Confirmed integrity defects

**Test-first cases:**

1. Upload progress never marks phase complete without a real phase event.
2. Notebook quick action never says ready on timeout alone.
3. Completing only exercise N does not complete prior practical exercises.
4. Self-acknowledgment does not resolve a mistake.
5. Wrong prerequisite checkpoint cannot complete repair.
6. Missing prerequisite source does not create a fake question/lesson.
7. Exam attempts do not store synthetic confidence.
8. Exam score alone does not produce unsupported readiness language.
9. Empty exam questions render a recoverable no-content state.

**Implementation rule:** fix each defect in the smallest owner module, update shared schemas only when unavoidable, and run the targeted plus global gates after the bundle.

### 37.3 Packet B1 — Landing after Gate A

- Run claims/control inventory.
- Remove/replace unverified social proof.
- Make demo isolation explicit.
- Add language/legal behavior only with real targets.
- Complete keyboard/reduced-motion/mobile/a11y/performance evidence.
- Update ledger to `complete` or document blockers; only then start Onboarding.

---

## 38. Final Release Readiness Checklist

### Product truth

- [ ] No fake progress, live state, status, confidence, readiness, testimonial or metric.
- [ ] Every feature has owner, user problem, action result and evidence.
- [ ] Demo mode is explicit, isolated and reversible.
- [ ] Empty/insufficient data is not represented as meaningful zero.

### Core journeys

- [ ] First upload to grounded study works end-to-end.
- [ ] Task completion updates every intended projection once.
- [ ] Source reprocess/delete has correct cascade/remap/stale behavior.
- [ ] Agent citations open exact valid source context.
- [ ] Role/org flows are server authorized.

### UX quality

- [ ] EN/EL, locale dates/counts/plurals complete.
- [ ] Keyboard, screen reader, focus and 200% zoom verified.
- [ ] 320–1920px and touch/keyboard layouts verified.
- [ ] Loading/empty/error/offline/permission/stale/success states complete.
- [ ] Destructive/external actions explain impact and show outcome.

### Engineering quality

- [ ] Typecheck client/server, unit, build, a11y and required E2E green.
- [ ] Visual/perf budgets reviewed on production build.
- [ ] No leaked secrets, PII or raw source content in telemetry/export.
- [ ] Persistence/API migrations and rollback tested.
- [ ] Deprecated duplicate surfaces removed only after parity/migration.
- [ ] Audit trail reflects actual status and residual risks.

---

## 40. Reconciliation Ledger (v1.1 — 2026-07-11)

Αντικειμενικός έλεγχος όλων των προηγούμενων LLM/Devin/Cursor/Lovable sessions έναντι του κώδικα και του παρόντος εγγράφου. **Καμία επιφάνεια δεν θεωρείται ολοκληρωμένη χωρίς code evidence.**

### 40.1 Committed baseline (`eff76a8` και νωρίτερα)

| Wave | Commits (περίληψη) | Αρχεία / αποτέλεσμα | Κατάσταση |
|------|-------------------|---------------------|-----------|
| **R1–R4** | `07e880a` | `ux-spark-panel`, `ux-calm-panel`, `TasksKanbanStatusStrip`, `AgentFlowRail`, prompt bar, kanban cards | ✅ Shipped |
| **G/H/I** | `25edf5e` | `--type-hero`, `--btn-height`, `.landing-page`/`.app-shell`, `MotionSection`/`uxFadeUp` | ✅ Shipped |
| **R5** | `25edf5e` | `--surface-canvas`, `--ux-tracking-*` tokens | ✅ Shipped |
| **R6–R8** | `eff76a8` | `LandingIntentChips`, `LandingTrustStrip`, `ModalHeaderStack`, nav accent, Visual Lab lanes | ✅ Shipped |
| **OB-μ5/6/7** | — | Aesthetic backlog | ⛔ wontfix (by design) |
| **E9 glass sweep** | prior session | Settings/Onboarding/Teacher blueprint glass, default blueprint theme | ✅ Shipped (per GAP_AUDIT) |

### 40.2 Uncommitted working tree (άλλο εργαλείο — Pass 1 continuation)

**Typecheck:** ✅ passed πριν από P0 fixes αυτής της session.

| Αρχείο | Φύση αλλαγών | Σχέση με plan |
|--------|--------------|---------------|
| `Dashboard.tsx`, `Library.tsx` | i18n helpers, in-progress tasks, unresolved misconceptions, theoryVsPractice, empty states | §10–11 Pass 1 **συνέχιση** — μη committed |
| `i18n.ts` | ~290 νέα keys (weekdays, priorities, library labels) | Cross-cutting i18n — μη committed |
| `StudentOrg*.tsx`, `TeacherDashboard.tsx`, `Analytics.tsx`, `Settings.tsx` | i18n polish | §17–19 pending passes |
| `platformChrome.tsx`, `CommandPalette.tsx`, `App.tsx` | shell polish | §12 pending |
| `index.css`, visual regression snapshots | styling drift με Pass 1 | verify on commit |
| `e2e/helpers/onboarding.ts` | test helper | engineering |
| `PAGE_BY_PAGE_OPTIMIZATION_MASTER_PLAN.md` | αυτό το έγγραφο | untracked → v1.1 |

**Ενέργεια:** commit ως *Dashboard/Library Pass 1 continuation + i18n* όταν ζητηθεί· όχι αυτόματα.

### 40.3 Packet A1 — P0 integrity defects

| ID | Module | Πρόβλημα (v1.0) | Κατάσταση v1.1 |
|----|--------|-----------------|----------------|
| **P0-01** | `UploadModal.tsx` | Static `done: true/false` σε `PROCESSING_STEPS` | ✅ Fixed — indeterminate `Loader2` σε όλα τα βήματα· καμία ψευδο-ολοκλήρωση |
| **P0-02** | `NotebookWorkspaceLayout.tsx` | 600ms timeout → `'done'` χωρίς πραγματική γεννήτρια | ✅ Fixed — αφαίρεση fake `'done'`· agent dispatch μόνο |
| **P0-03** | `PracticalLessonView.tsx` | `completedCount = max(idx+1)` | ✅ Fixed — `Set<number>` `passedExerciseIds` ανά exercise |
| **P0-04** | `MistakeRetryView.tsx` | «I got it» χωρίς reassessment | ✅ Fixed — MC self-check + «Confirm resolved» μόνο μετά σωστή απάντηση |
| **P0-05** | `PrerequisiteRepairView.tsx` | Λάθος checkpoint επιτρέπει Complete | ✅ Fixed — Complete μόνο όταν `checkpointPassed` |
| **P0-06** | `PrerequisiteRepairView.tsx` | Fabricated fallback checkpoint | ✅ Fixed — checkpoint UI μόνο με authoritative prop· αλλιώς agent gate |
| **P0-07** | `ExamPrepView.tsx` | Synthetic confidence `75` | ✅ Fixed — `80`/`35` ανά correctness |
| **P0-08** | `ExamPrepView.tsx` | «ready for the real exam» | ✅ Fixed — neutral «Perfect score on this practice set.» |

**Gate A:** ✅ **Closed** (2026-07-11) — `NotebookStudioAudioOverview` verified: legitimate state machine (`idle|running|playing|done|error`), όχι fake timeout.

### 40.4 Packet B1 — Landing (μετά Gate A)

| Αντικείμενο | v1.0 plan | v1.1 code |
|------------|-----------|-----------|
| Unverified 5★ + testimonial | Remove P0 | ✅ Removed — § social proof block αφαιρέθηκε |
| `LandingTrustStrip` | KEEP decorative, rename if needed | ✅ Kept — single instance, `aria-hidden` decorative segments (R6) |
| `LandingIntentChips` | KEEP decorative | ✅ Shipped R6 |
| Demo isolation | Explicit labeling | ✅ Sandbox badge on CTA, microcopy, `DemoSandboxBanner`, `exitDemoSandbox` |
| Legal/footer links | Real targets only | ✅ `LandingFooter` via `siteConfig` (privacy/terms/mailto) |

**Landing status:** `B1 complete (demo/legal) · a11y evidence pending §7.5`

### 40.5 Packet B2 — Onboarding (2026-07-11)

| Αντικείμενο | v1.0 plan | v1.1 code |
|------------|-----------|-----------|
| Goals unused | P0 persist/connect | ✅ `learningGoals` + mapper → `theoryVsPractice`, `practiceIntensity`, `pacing`, `revisionLoops` |
| Typed profile | P1 | ✅ `onboardingProfile.ts` + unit tests |
| Validation | P0 role + exam date | ✅ `validateOnboardingStep` wired in UI |
| Skip redesign | Two explicit paths | ✅ `onboarding-continue-without-upload` vs `onboarding-explore-demo` |
| Teacher gating hint | Preview label | ✅ `onboarding-teacher-preview-hint` |
| a11y progress | P1 | ✅ `role=progressbar`, `aria-current=step`, validation `role=alert` |
| Resume draft | P2 | ✅ `onboardingDraft.ts` — localStorage draft + auto-route on boot |
| Profile reload | §8.5 | ✅ `userProfilePersist.ts` — onboardingComplete + segment/role |
| Upload final step | P1 integrated step | ✅ Shared `UploadModal` handoff (`onboarding-upload` → `upload-modal`) |
| Upload/resume E2E | Gate B evidence | ✅ `e2e/onboarding-b2.spec.ts` |

**Onboarding status:** `B2 complete`

### 40.6 Per-surface status sync (§1.1 ενημέρωση)

| Surface | Προηγούμενο ledger | v1.1 reconciled |
|---------|-------------------|-----------------|
| `landing` | Audit pending | B1 complete (demo/legal) · a11y pending |
| `onboarding` | Audit pending | B2 complete |
| `dashboard` | Pass 1 complete | Pass 1 + uncommitted continuation |
| `library` | Pass 1 complete | Pass 1 + uncommitted continuation |
| `upload-modal` | P0 processing fake steps | P0-01 fixed |
| `notebook-workspace` | P0 fake quick-action done | P0-02 fixed |
| `practical-lesson` | P0 progress bug | P0-03 fixed |
| `mistake-retry` | P0 self-resolve | P0-04 fixed |
| `prerequisite-repair` | P0 checkpoint | P0-05/06 fixed |
| `exam-prep` | P0 confidence/readiness | P0-07/08 fixed |
| Όλες οι υπόλοιπες §9–19, §20–24 | Audit complete · Implementation pending | **Αμετάβλητο — pending** |

### 40.7 Strict sequence — επόμενες επιτρεπτές ενέργειες

1. **Commit** uncommitted Pass 1 + master plan v1.1 + Gate A + B1 + B2 (on user request).
2. **B3 Shell** — role/capability navigation registry (§29.3).
3. **B1 a11y finish:** FAQ aria-expanded, language switch, keyboard/reduced-motion evidence (§7.5).

### 40.8 Verification record (session 2026-07-11)

```bash
npm run typecheck   # run after A1 fixes
npm run test        # targeted: upload, practice, mistake, prerequisite, exam
npm run build       # before any release claim
```

---

## 39. Completion Statement

Το παρόν σχέδιο λειτουργεί ως **single execution ledger** με ενσωματωμένο reconciliation (§40). Δεν χαρακτηρίζει το προϊόν launch-ready. Καταγράφει:

- την πλήρη πραγματική απογραφή user-facing surfaces,
- shipped aesthetic waves R1–R8 και G/H/I,
- Dashboard/Library Pass 1 (+ uncommitted continuation),
- **ολοκληρωμένο Packet A1 (9/9 P0)** και **μερικό B1**,
- αποφάσεις keep/connect/merge/gate/remove,
- strict page-by-page sequence και exit gates,
- data/action/security/accessibility/performance contracts,
- exact verification commands και continuous audit format.

**Επόμενη επιτρεπτή ενέργεια:** **B7 / Stage C1** (Library final pass ή Tasks) κατά §29.3–29.4.

