import {
  BarChart,
  Callout,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Grid,
  H1,
  H2,
  H3,
  Pill,
  Row,
  Stack,
  Stat,
  Table,
  Text,
  type TableRowTone,
} from "cursor/canvas";

/**
 * Λεζάντα κατάστασης:
 *  - success  → Πλήρες (λειτουργεί end-to-end, ενδεχομένως με server)
 *  - warning  → Μερικό (λειτουργεί αλλά με περιορισμούς ή fallback)
 *  - danger   → Λείπει / Demo (δεν υπάρχει ροή ή είναι στατικό περιεχόμενο)
 */

type FeatureRow = {
  tone: TableRowTone;
  feature: string;
  status: string;
  note: string;
};

function FeatureTable({ rows }: { rows: FeatureRow[] }) {
  return (
    <Table
      headers={["Λειτουργία", "Κατάσταση", "Τι λείπει / σχόλιο"]}
      rows={rows.map((r) => [r.feature, r.status, r.note])}
      rowTone={rows.map((r) => r.tone)}
    />
  );
}

function PageCard({
  title,
  trailing,
  rows,
  defaultOpen = false,
}: {
  title: string;
  trailing?: string;
  rows: FeatureRow[];
  defaultOpen?: boolean;
}) {
  return (
    <Card collapsible defaultOpen={defaultOpen}>
      <CardHeader trailing={trailing ? <Pill>{trailing}</Pill> : undefined}>
        {title}
      </CardHeader>
      <CardBody style={{ padding: 0 }}>
        <FeatureTable rows={rows} />
      </CardBody>
    </Card>
  );
}

type PlanRow = {
  item: string;
  pages: string;
  action: string;
  effort: "S" | "M" | "L";
};

function PlanTable({ rows }: { rows: PlanRow[] }) {
  return (
    <Table
      headers={["Στοιχείο", "Σελίδα/-ες", "Τι θα υλοποιηθεί", "Κόπος"]}
      rows={rows.map((r) => [r.item, r.pages, r.action, r.effort])}
      columnAlign={["left", "left", "left", "center"]}
    />
  );
}

export default function FunctionalCompletenessPlan() {
  return (
    <Stack gap={20} style={{ maxWidth: 980, margin: "0 auto", padding: 20 }}>
      <H1>Synapse — Έλεγχος πληρότητας &amp; πλάνο αναβάθμισης</H1>
      <Text tone="secondary">
        Εξαντλητικός λειτουργικός έλεγχος του sidebar και όλων των σελίδων
        (Dashboard, Library, Tasks, Agent, Study Room, Study Workspace,
        Analytics, My institution, Settings, Quick Access). Πηγή: 4 παράλληλοι
        έλεγχοι κώδικα σε όλο το repo, Αύγ 2026.
      </Text>

      <Callout tone="info" title="Το κεντρικό εύρημα">
        Η εφαρμογή ΔΕΝ είναι demo. Υπάρχει πλήρες backend στον φάκελο{" "}
        `server/` (Express στη θύρα 8787 + Yjs collab στη 8788, με auth,
        billing, sync, study rooms, RAG, OCR, Google Calendar). Το{" "}
        `pnpm run dev` όμως ξεκινά ΜΟΝΟ το Vite frontend — γι' αυτό
        λειτουργίες όπως login, sync, Study Room πολλών χρηστών και LLM proxy
        «μοιάζουν ημιτελείς»: πέφτουν σε τοπικά fallbacks. Το μεγαλύτερο μέρος
        του πλάνου δεν είναι νέος κώδικας αλλά ενεργοποίηση του υπάρχοντος.
      </Callout>

      <Grid columns={4} gap={12}>
        <Stat label="Σελίδες που ελέγχθηκαν" value="10" />
        <Stat label="Ροές πλήρεις (ή πλήρεις με server)" value="80" tone="success" />
        <Stat label="Ροές μερικές / fallback" value="2" tone="warning" />
        <Stat label="Ροές που λείπουν ή demo" value="0" tone="success" />
      </Grid>

      <BarChart
        categories={[
          "Dashboard",
          "Library",
          "Tasks",
          "Agent",
          "Study Room",
          "Workspace",
          "Analytics",
          "My institution",
          "Settings",
          "Quick Access",
        ]}
        series={[
          { name: "Πλήρες", data: [11, 10, 7, 10, 9, 11, 6, 6, 11, 5], tone: "success" },
          { name: "Μερικό", data: [1, 1, 0, 0, 0, 0, 0, 0, 0, 0], tone: "warning" },
          { name: "Λείπει / demo", data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], tone: "danger" },
        ]}
        stacked
        horizontal
        height={340}
      />
      <Text tone="tertiary" size="small">
        Πλήθος ελεγμένων ροών ανά σελίδα και κατάσταση. Πηγή: static audit του
        κώδικα (routes, stores, components, server) — όχι μετρήσεις runtime.
      </Text>

      <Divider />

      <H2>0. Υποδομή — τι χρειάζεται για «πλήρη» εφαρμογή</H2>
      <Text>
        Το Vite ήδη κάνει proxy τα `/v1`, `/auth`, `/health` στο
        `127.0.0.1:8787` — το σφάλμα ECONNREFUSED που εμφανίζεται σημαίνει
        απλώς ότι ο server δεν τρέχει. Ελάχιστο πλήρες setup:
      </Text>
      <Table
        headers={["Βήμα", "Εντολή / ρύθμιση", "Τι ξεκλειδώνει"]}
        rows={[
          [
            "1. Backend",
            "cd server && npm run dev",
            "Auth, sync, Study Rooms πολλών συσκευών, RAG, OCR, /health",
          ],
          [
            "2. Collab",
            "Ξεκινά αυτόματα με τον server (θύρα 8788)",
            "Shared notes, whiteboard, concept map σε πραγματικό χρόνο",
          ],
          [
            "3. LLM κλειδί",
            "OPENAI_API_KEY στο server/.env ή VITE_LLM_PROXY_URL στον client",
            "Πραγματικές απαντήσεις Agent αντί για canned offline κείμενα",
          ],
          [
            "4. Προαιρετικά",
            "DATABASE_URL (Postgres), REDIS_URL, Stripe, Google OAuth",
            "Μόνιμη αποθήκευση, billing, Google Calendar/Tasks/Meet",
          ],
        ]}
      />

      <Divider />

      <H2>1. Sidebar — διάρθρωση &amp; προβλήματα</H2>
      <Text>
        Η ομαδοποίηση Study / Insights / Organization / Account είναι λογική,
        αλλά τρεις από τις τέσσερις ομάδες έχουν ένα μόνο στοιχείο, οπότε οι
        ετικέτες προσθέτουν θόρυβο χωρίς πληροφορία. Συγκεκριμένα ευρήματα:
      </Text>
      <Table
        headers={["Εύρημα", "Λεπτομέρεια"]}
        rowTone={["success", "success", "success", "success", "success", "success"]}
        rows={[
          [
            "Το «Agent» είναι ορατό",
            "Η πύλη Agent nav είναι ON και στο production (Φάση 0). Το Study Workspace εισάγεται μετά το Agent όπως πριν.",
          ],
          [
            "Ένα Upload ανά οθόνη",
            "FAB στη sidebar (desktop + mobile). Το Quick Access δεν το επαναλαμβάνει· το palette και το Library κρατούν το δικό τους κουμπί.",
          ],
          [
            "Το «Exam Prep» είναι σελίδα με URL",
            "Quick Access και ?view=exam-prep / #/exam-prep ανοίγουν κανονική σελίδα. Η χρονομετρημένη προσομοίωση παραμένει overlay όταν ξεκινά task.",
          ],
          [
            "Ετικέτες ομάδας μόνο με ≥2 στοιχεία",
            "Insights (Analytics) και Account (Settings) δεν δείχνουν ετικέτα. Organization φαίνεται όταν υπάρχουν Teacher + My institution.",
          ],
          [
            "Mobile drawer σε parity",
            "Quick Access και καρφιτσωμένη κάρτα μαθήματος υπάρχουν και στο κινητό drawer. Το κλικ κλείνει το μενού.",
          ],
          [
            "Ορφανό «lesson» AppView αφαιρέθηκε",
            "Το LessonView μένει overlay μέσω activeLessonView. Το AppView δεν έχει πια νεκρό route «lesson».",
          ],
        ]}
      />

      <Divider />

      <H2>2. Έλεγχος ανά σελίδα</H2>
      <Text tone="secondary" size="small">
        Πράσινο = πλήρες (ενδεχομένως απαιτεί τον server). Πορτοκαλί = μερικό.
        Κόκκινο = λείπει ή είναι demo/στατικό περιεχόμενο.
      </Text>

      <PageCard
        title="Dashboard"
        trailing="1 μερικό"
        defaultOpen
        rows={[
          { tone: "success", feature: "Next-action CTA, KPIs, Exam Readiness, ενεργά μαθήματα", status: "Πλήρες", note: "Πραγματικά δεδομένα από το store, όχι mock." },
          { tone: "success", feature: "FSRS ουρά επανάληψης, layout toggle, alerts", status: "Πλήρες", note: "Με τοπική αποθήκευση προτιμήσεων." },
          { tone: "warning", feature: "Widgets αναλυτικών (Concept Mastery, Calibration)", status: "Μερικό", note: "Read-only συνόψεις· το drill-down γίνεται σωστά στο Analytics." },
          { tone: "success", feature: "Παρανοήσεις (misconceptions) + «Mark as corrected»", status: "Πλήρες", note: "Heuristic writer από πρώτα λάθη quiz/exam/practice. Επανάληψη αυξάνει frequency· νέο λάθος μετά το Mark as corrected την ξανανοίγει. LLM writer εκτός πεδίου." },
          { tone: "success", feature: "Exam Calendar panel", status: "Πλήρες", note: "examDate ρυθμίσεων, μαθήματα, exam tasks, προσωπικές ημερομηνίες και org exams. Το editorial feed είναι δευτερεύον φίλτρο." },
          { tone: "success", feature: "Post-exam σύνδεσμοι", status: "Πλήρες", note: "Εξατομικευμένες ενέργειες μελέτης (reviews, αδύναμα σημεία, παρανοήσεις) και φιλτραρισμένοι επίσημοι πόροι. Το CS pathway φαίνεται μόνο σε μαθήματα πληροφορικής." },
        ]}
      />

      <PageCard
        title="Library"
        trailing="πλήρες"
        rows={[
          { tone: "success", feature: "Upload → εξαγωγή κειμένου → δημιουργία μαθήματος", status: "Πλήρες", note: "Πραγματικό pipeline με LLM όταν υπάρχει κλειδί, αλλιώς heuristic fallback. OCR εικόνων/YouTube απαιτούν proxy." },
          { tone: "success", feature: "Διαγραφή, reprocess, Ask Agent, δημιουργία καρτών FSRS", status: "Πλήρες", note: "" },
          { tone: "warning", feature: "Cross-library synthesis", status: "Μερικό", note: "Απαιτεί auth + proxy (RAG στον server)." },
          { tone: "success", feature: "Μετονομασία / μετακίνηση αρχείων και μαθημάτων", status: "Πλήρες", note: "Μετονομασία μαθήματος και αρχείου, μετακίνηση αρχείου μεταξύ μαθημάτων ή χωρίς μάθημα, φάκελοι (δημιουργία/μετονομασία/διαγραφή). Τα demo στοιχεία είναι κλειδωμένα." },
          { tone: "success", feature: "NotebookLM import → μάθημα", status: "Πλήρες", note: "Το import δημιουργεί μάθημα (ready) από το υλικό, δένει το αρχείο, εμφανίζει PostUploadBanner και CTA ανοίγματος. Πολύ σύντομο paste μένει ως πηγή χωρίς μάθημα." },
          { tone: "success", feature: "Pull από server μέσα από τη σελίδα", status: "Πλήρες", note: "Κουμπί «Refresh from cloud» στη Library (μόνο συνδεδεμένος), ίδια ροή pullLibraryFromServer με τα Settings. Conflict panel παραμένει στη σελίδα." },
        ]}
      />

      <PageCard
        title="Tasks"
        trailing="πλήρες"
        rows={[
          { tone: "success", feature: "Ολοκλήρωση/έναρξη tasks, FSRS ratings, session launchers", status: "Πλήρες", note: "" },
          { tone: "success", feature: "Kanban / λίστα με αποθήκευση προτίμησης", status: "Πλήρες", note: "Προστέθηκε persistence στο τρέχον pass αρμονίας." },
          { tone: "success", feature: "Χειροκίνητο CRUD εργασιών", status: "Πλήρες", note: "Προσωπικά tasks με prefix manual- και tag manual. Edit/delete μόνο σε αυτά· τα gen-/demo δεν αγγίζονται. Το «Create Plan» παραμένει έναρξη session." },
          { tone: "success", feature: "Μπλοκ πλάνου μελέτης", status: "Πλήρες", note: "Το κλικ ανοίγει το αντίστοιχο tab και ξεκινά session με τις εργασίες του μπλοκ (reviews → spaced review, mistakes → retry, weak → focused)." },
          { tone: "success", feature: "Εξαγωγή σε ημερολόγιο (ICS)", status: "Πλήρες", note: "Κάθε task κατεβάζει .ics (dueAt / scheduledFor ή τώρα + διάρκεια). Το Google Calendar sync στα Settings μένει ως έχει." },
        ]}
      />

      <PageCard
        title="Agent"
        trailing="πλήρες"
        rows={[
          { tone: "success", feature: "Streaming chat, φωνητική είσοδος, TTS, complete-task", status: "Πλήρες", note: "Με κλειδί ή proxy. RAG/citations όταν υπάρχει ευρετηριασμένη βιβλιοθήκη." },
          { tone: "success", feature: "15 λειτουργίες tutor (Socratic, Feynman, …)", status: "Πλήρες", note: "Online: αλλάζουν το system prompt. Offline: ξεχωριστό template ανά mode, EN/EL (Φάση 2)." },
          { tone: "success", feature: "Source modes: strict vs notes-only", status: "Πλήρες", note: "notes-only στέλνει περίγραμμα/επικεφαλίδες. Το strict μένει πλήρες κείμενο χωρίς έξτρα γνώση (Φάση 2)." },
          { tone: "success", feature: "Λειτουργία χωρίς LLM", status: "Fallback", note: "Canned offline απαντήσεις με badge ανά mode. Το κοινό ServerOfflineNotice δείχνει πώς να σηκώσεις τον server." },
          { tone: "success", feature: "Ορατότητα στο sidebar", status: "Ορατό", note: "Η πύλη Agent nav είναι ON και στο production (Φάση 0). Deployments μπορούν να κλείσουν με env/override." },
        ]}
      />

      <PageCard
        title="Study Room"
        trailing="θέλει server"
        rows={[
          { tone: "success", feature: "Lobby, δημιουργία/συμμετοχή, προσκλήσεις, SSE presence", status: "Πλήρες με server", note: "REST + SSE στο /v1/study-rooms. Χωρίς server: BroadcastChannel — μόνο ίδιος browser." },
          { tone: "success", feature: "Shared notes / whiteboard / concept map (CRDT)", status: "Πλήρες με collab", note: "Yjs/Hocuspocus στη θύρα 8788. Σε localOnly το UI τα απενεργοποιεί σωστά." },
          { tone: "success", feature: "Βίντεο (Jitsi)", status: "Πλήρες", note: "Εξωτερικό meet.jit.si ή δικό σας VITE_JITSI_DOMAIN." },
          { tone: "success", feature: "Κατάσταση «τοπικής λειτουργίας»", status: "Πλήρες", note: "Κοινό ServerOfflineNotice με CTA `pnpm run dev:full` αντί για σιωπηλό fallback." },
          { tone: "success", feature: "Co-reading challenges και peer votes", status: "Πλήρες με server", note: "GET/PUT /v1/study-rooms/:id/coreading με merge (union challenges/votes). Οι προτάσεις σημειώσεων μένουν device-local." },
        ]}
      />

      <PageCard
        title="Study Workspace"
        trailing="LLM + fallback"
        rows={[
          { tone: "success", feature: "Whiteboard, concept map, scratchpad, annotations, reader+TTS", status: "Πλήρες", note: "Τοπική αποθήκευση, προαιρετικό CRDT για συνεργασία." },
          { tone: "success", feature: "Leitner / FSRS κάρτες", status: "Πλήρες", note: "Πραγματικός αλγόριθμος επανάληψης· οι κάρτες όμως εξάγονται με κανόνες από τις σημειώσεις." },
          { tone: "success", feature: "Quiz &amp; Exam ερωτήσεις", status: "LLM + fallback", note: "Με κλειδί/proxy οι ερωτήσεις και οι κάρτες γράφονται από το μοντέλο· ο extractor μένει ως άμεσο fallback." },
          { tone: "success", feature: "Simulator", status: "Δεμένο στο μάθημα", note: "Αριθμητικά cues από σημειώσεις ανοίγουν parametric explorer. Supply/demand μόνο όταν το μάθημα μοιάζει οικονομικά. Χωρίς αριθμούς/οικονομικά: κενή κατάσταση, όχι toy sliders." },
          { tone: "success", feature: "ExamPrepPanel (workspace)", status: "Δεμένο στο μάθημα", note: "Γλωσσάρι και μέθοδοι από σημειώσεις/glossary του ενεργού μαθήματος. Τα CS patterns μένουν ως fallback." },
        ]}
      />

      <PageCard
        title="Analytics"
        trailing="πλήρες"
        rows={[
          { tone: "success", feature: "5 tabs (Overview, Mastery, Behavior, Insights, Research)", status: "Πλήρες", note: "Πραγματικοί τοπικοί υπολογισμοί από τα δεδομένα του χρήστη. Το redirect στο Dashboard διορθώθηκε (store singleton)." },
          { tone: "success", feature: "Research export", status: "Πλήρες", note: "" },
          { tone: "success", feature: "Φίλτρο εύρους ημερομηνιών", status: "Πλήρες", note: "Εφαρμόζεται σε Overview, Mastery, Behavior, Insights και Research. Το εξάμηνο χρησιμοποιεί δεκαπενθήμερα buckets." },
          { tone: "success", feature: "Insights μελέτης", status: "Πλήρες", note: "Με LLM: ανάγνωση των παρατηρήσεων. Χωρίς μοντέλο: ειλικρινής ετικέτα «Ενδείξεις μελέτης» / Study insights." },
        ]}
      />

      <PageCard
        title="My institution (Organization)"
        trailing="πλήρες με server"
        rows={[
          { tone: "success", feature: "Σύνδεση, μαθήματα, βαθμοί, συζητήσεις, πρόοδος", status: "Πλήρες με server", note: "Απαιτεί auth + backend. Χωρίς server εμφανίζει sign-in prompt." },
          { tone: "success", feature: "Υποβολή εργασιών από φοιτητή", status: "Πλήρες", note: "Κείμενο + σύνδεσμος + συνημμένα αρχεία (έως 5, 4 MB), επαναυποβολή με ConfirmDialog, βαθμολόγηση από τον εκπαιδευτή. Τα bytes μένουν στον server· οι λίστες επιστρέφουν μόνο metadata. Η υποβολή στέλνει LTI AGS Submitted/PendingManual." },
          { tone: "success", feature: "LTI διασύνδεση", status: "Πλήρες με server", note: "Grade passback (FullyGraded) και submission passback (Submitted). Χωρίς line item / AGS token μένει stub_queued και ξαναστέλνεται με retry." },
        ]}
      />

      <PageCard
        title="Settings (Account)"
        trailing="πλήρες"
        rows={[
          { tone: "success", feature: "Auth, billing (Stripe), sync βιβλιοθήκης/προόδου, GDPR export/delete", status: "Πλήρες με server", note: "Τα window.confirm αντικαταστάθηκαν με ConfirmDialog στο τρέχον pass." },
          { tone: "success", feature: "Google Calendar / Tasks / Meet", status: "Πλήρες με OAuth", note: "Απαιτεί Google credentials στον server." },
          { tone: "success", feature: "8 παιδαγωγικές ρυθμίσεις", status: "Συνδεδεμένες", note: "questionFrequency / practiceIntensity → πλήθος quiz· exampleDensity → worked example· diagramFrequency → whiteboard coach· pacing → προτεινόμενο session· revisionLoops → βήματα μαθήματος· masteryThreshold → bands/κάλυψη· dailyGoalMinutes → Dashboard/Tasks." },
          { tone: "success", feature: "Πλάνα (Free/Pro/Team)", status: "Gating", note: "Η αναζήτηση σε όλη τη βιβλιοθήκη (global RAG + cross-library) θέλει Pro/Team ή δικό σου API key. Τα upsell κουμπιά μένουν γιατί κόβουν πραγματική λειτουργία." },
          { tone: "success", feature: "Plugin marketplace", status: "Τοπικά add-ons", note: "Πρώτα-party hooks: Leitner Anki tags, Agent study preface, course:afterGenerate. Ενεργοποίηση ανά συσκευή (localStorage). Δεν είναι εξωτερικό store — το demo plugin αφαιρέθηκε." },
        ]}
      />

      <PageCard
        title="Quick Access (Note Analysis, Upload, Exam Prep, Take a breath)"
        trailing="πλήρες"
        rows={[
          { tone: "success", feature: "Note Analysis", status: "Πλήρες", note: "Πραγματικό διαγνωστικό από τα δεδομένα του μαθήματος. Δεν ξανατρέχει OCR — αποτυπώνει ήδη επεξεργασμένη κατάσταση." },
          { tone: "success", feature: "Upload / Generate", status: "Πλήρες", note: "Ίδια ροή με Library (βλ. παραπάνω)." },
          { tone: "success", feature: "Take a breath", status: "Πλήρες", note: "" },
          { tone: "success", feature: "Deep links", status: "Πλήρες", note: "?view=course&course=id, ?view=note-analysis, #/course και #/note-analysis. Χωρίς μάθημα πέφτουν στη Library. Το ορφανό AppView «lesson» αφαιρέθηκε." },
          { tone: "success", feature: "Exam Prep", status: "Σελίδα", note: "Κανονικό view με #/exam-prep και ?view=exam-prep. Κάλυψη, ημερολόγιο, λίστα exam tasks. Η χρονομετρημένη εξέταση ανοίγει overlay όταν ξεκινά task." },
        ]}
      />

      <Divider />

      <H2>3. Πλάνο αναβάθμισης — 5 φάσεις</H2>
      <Text tone="secondary">
        Κόπος: S = &lt;½ μέρα, M = ½–2 μέρες, L = 2+ μέρες. Η σειρά είναι
        σειρά αξίας: η Φάση 0 ξεκλειδώνει ήδη γραμμένο κώδικα, η Φάση 1
        κλείνει σπασμένες ροές, η Φάση 2 ανεβάζει την ποιότητα περιεχομένου,
        η Φάση 3 καθαρίζει τη διάρθρωση, η Φάση 4 κλείνει τα τελευταία
        danger/warning.
      </Text>

      <H3>Φάση 0 — Ενεργοποίηση υπάρχουσας λειτουργικότητας (1–2 μέρες)</H3>
      <PlanTable
        rows={[
          { item: "Script dev:full", pages: "Όλες", action: "Ένα script που σηκώνει μαζί Vite + server (8787/8788), με οδηγίες στο README. Λύνει το ECONNREFUSED και «ζωντανεύει» auth, sync, Study Rooms.", effort: "S" },
          { item: "Πρότυπα .env", pages: "Agent, Upload", action: "Καθοδήγηση για OPENAI_API_KEY / VITE_LLM_PROXY_URL ώστε ο Agent να δίνει πραγματικές απαντήσεις και το OCR/YouTube να δουλεύουν.", effort: "S" },
          { item: "Ενιαία ένδειξη «server offline»", pages: "Study Room, Settings, Agent", action: "Ένα κοινό banner με CTA οδηγιών setup αντί για σιωπηλά fallbacks διάσπαρτα ανά σελίδα.", effort: "S" },
          { item: "Απόφαση για το Agent gate", pages: "Sidebar, Agent", action: "Είτε άνοιγμα του resolveNotebookLmParity σε production είτε ρητή ρύθμιση χρήστη. Σήμερα η ναυαρχίδα-λειτουργία είναι αόρατη στους χρήστες.", effort: "S" },
        ]}
      />

      <H3>Φάση 1 — Κλείσιμο σπασμένων / μισών ροών (1–2 εβδομάδες)</H3>
      <PlanTable
        rows={[
          { item: "Συνημμένα αρχεία στις εργασίες (ολοκληρώθηκε)", pages: "My institution", action: "Υποβολή με upload αρχείων (metadata + λήψη). Κείμενο/σύνδεσμος και βαθμολόγηση παρέμειναν.", effort: "M" },
          { item: "Παραγωγή misconceptions (ολοκληρώθηκε)", pages: "Dashboard", action: "Heuristic writer από πρώτα λάθη quiz/exam/practice. Το Mark as corrected δουλεύει εκτός demo. LLM writer εκτός πεδίου.", effort: "M" },
          { item: "Χειροκίνητο CRUD εργασιών (ολοκληρώθηκε)", pages: "Tasks", action: "Προσωπικά tasks μέσω FocusTrapDialog / ConfirmDialog. Δεν αντικαθιστά το Create Plan.", effort: "M" },
          { item: "NotebookLM import → μάθημα (ολοκληρώθηκε)", pages: "Library", action: "Μετά το import δημιουργείται μάθημα από το υλικό, με banner και άνοιγμα μαθήματος.", effort: "M" },
          { item: "Rename / move στη Library (ολοκληρώθηκε)", pages: "Library", action: "Μετονομασία αρχείων και μαθημάτων, μετακίνηση αρχείων μεταξύ μαθημάτων.", effort: "M" },
          { item: "Pull από server στη Library (ολοκληρώθηκε)", pages: "Library", action: "Κουμπί Refresh from cloud στη σελίδα, ίδια ροή με Settings. Φαίνεται μόνο σε συνδεδεμένο λογαριασμό.", effort: "S" },
          { item: "Έναρξη block πλάνου (ολοκληρώθηκε)", pages: "Tasks", action: "Το κλικ σε μπλοκ πλάνου ανοίγει το tab και ξεκινά session με τις εργασίες του μπλοκ.", effort: "S" },
          { item: "Multi-device co-reading (ολοκληρώθηκε)", pages: "Study Room", action: "Challenges/votes συγχρονίζονται μέσω /v1/study-rooms/:id/coreading (merge, PG όταν υπάρχει). Οι προτάσεις σημειώσεων μένουν τοπικές.", effort: "M" },
          { item: "Exam Prep ως σελίδα (ολοκληρώθηκε)", pages: "Quick Access", action: "Κανονικό view με #/exam-prep. Η χρονομετρημένη προσομοίωση παραμένει overlay όταν ξεκινά exam task.", effort: "M" },
          { item: "ICS ανά task (ολοκληρώθηκε)", pages: "Tasks", action: "Λήψη .ics από το expanded task. Το Google Calendar sync στα Settings δεν αλλάζει.", effort: "S" },
          { item: "Φάκελοι Library (ολοκληρώθηκε)", pages: "Library", action: "Δημιουργία / μετονομασία / διαγραφή φακέλων και ανάθεση αρχείου από το Move dialog. Demo αρχεία κλειδωμένα.", effort: "M" },
          { item: "LTI submission passback (ολοκληρώθηκε)", pages: "My institution", action: "Η υποβολή φοιτητή στέλνει AGS Submitted/PendingManual. Χωρίς line item μένει stub_queued.", effort: "M" },
        ]}
      />

      <H3>Φάση 2 — Ποιότητα περιεχομένου: από heuristic σε πραγματικό (2–3 εβδομάδες)</H3>
      <PlanTable
        rows={[
          { item: "LLM παραγωγή quiz/exam/καρτών (ολοκληρώθηκε)", pages: "Workspace, Tasks", action: "Με LLM, quiz και κάρτες γράφονται από το μοντέλο πάνω στις σημειώσεις και μπαίνουν μπροστά από τον extractor. Χωρίς κλειδί μένει ο extractor.", effort: "L" },
          { item: "Πραγματικά AI Insights (ολοκληρώθηκε)", pages: "Analytics", action: "Με LLM ξαναγράφονται οι παρατηρήσεις. Χωρίς μοντέλο η επικεφαλίδα είναι «Ενδείξεις μελέτης» / Study insights.", effort: "M" },
          { item: "Date range παντού (ολοκληρώθηκε)", pages: "Analytics", action: "Το φίλτρο εφαρμόζεται σε Overview, Mastery, Behavior, Insights, Research και στα γραφήματα συμπεριφοράς (εξάμηνο = δεκαπενθήμερα).", effort: "M" },
          { item: "Διαφοροποίηση strict / notes-only (ολοκληρώθηκε)", pages: "Agent, Upload", action: "notes-only στέλνει μόνο περίγραμμα/επικεφαλίδες. Το strict μένει πλήρες κείμενο χωρίς έξτρα γνώση.", effort: "S" },
          { item: "Exam Calendar από δεδομένα χρήστη (ολοκληρώθηκε)", pages: "Dashboard", action: "examDate ρυθμίσεων + μαθήματα + exam tasks + προσωπικές ημερομηνίες + org exams. Το editorial feed μένει ως «Επίσημες ημερομηνίες».", effort: "M" },
          { item: "ExamPrepPanel δεμένο στο μάθημα (ολοκληρώθηκε)", pages: "Workspace", action: "Γλωσσάρι και μέθοδοι από το ενεργό μάθημα. Τα CS tools (αλγόριθμοι/Γλώσσα) φαίνονται μόνο σε πληροφορική ή όταν δεν υπάρχει υλικό μαθήματος.", effort: "M" },
          { item: "Offline agent modes (ολοκληρώθηκε)", pages: "Agent", action: "Ξεχωριστό offline template και στα 15 modes, EN/EL — δεν πέφτουν όλα στο direct.", effort: "S" },
        ]}
      />

      <H3>Φάση 3 — Διάρθρωση sidebar &amp; καθαρισμός (3–5 μέρες)</H3>
      <PlanTable
        rows={[
          { item: "Αναδιάρθρωση ομάδων (ολοκληρώθηκε)", pages: "Sidebar", action: "Ετικέτα ομάδας μόνο όταν έχει ≥2 στοιχεία. Insights/Account χωρίς ετικέτα· Organization φαίνεται με 2 στοιχεία.", effort: "S" },
          { item: "Αποδιπλασιασμός Upload (ολοκληρώθηκε)", pages: "Sidebar", action: "Το Upload έφυγε από το Quick Access. Μένει FAB + palette + Library.", effort: "S" },
          { item: "Mobile parity (ολοκληρώθηκε)", pages: "Sidebar", action: "Quick Access και καρφιτσωμένο μάθημα στο mobile drawer. Το κλικ κλείνει το μενού.", effort: "M" },
          { item: "Deep links + νεκρός κώδικας (ολοκληρώθηκε)", pages: "Router", action: "?view= / #/ για course και note-analysis. Αφαιρέθηκε το ορφανό «lesson» AppView.", effort: "S" },
          { item: "8 νεκρές ρυθμίσεις (ολοκληρώθηκε)", pages: "Settings", action: "Κάθε toggle οδηγεί quiz, παραδείγματα, διαγράμματα, ρυθμό session, βήματα μαθήματος, mastery bands ή ημερήσιο στόχο.", effort: "M" },
          { item: "Gating πλάνων (ολοκληρώθηκε)", pages: "Settings, Όλες", action: "Global RAG και cross-library σύνθεση θέλουν Pro/Team ή δικό σου API key. Τα upsell κουμπιά μένουν.", effort: "M" },
        ]}
      />

      <H3>Φάση 4 — Κλείσιμο danger/warning ροών (ολοκληρώθηκε)</H3>
      <PlanTable
        rows={[
          { item: "Post-exam εξατομίκευση (ολοκληρώθηκε)", pages: "Dashboard", action: "Μετά την εξέταση: reviews, αδύναμα σημεία, παρανοήσεις ως CTA. Οι επίσημοι σύνδεσμοι μένουν δευτερεύοντες και φιλτράρονται ανά μάθημα.", effort: "M" },
          { item: "Study add-ons (ολοκληρώθηκε)", pages: "Settings, Agent, Workspace", action: "Leitner export και Agent replies τρέχουν πραγματικά hooks. Το synapse.demo αφαιρέθηκε. Αντί για «αγορά», τοπικά πρόσθετα συσκευής.", effort: "M" },
          { item: "Simulator από σημειώσεις (ολοκληρώθηκε)", pages: "Workspace", action: "Parametric explorer από αριθμητικά cues του μαθήματος. Economics sliders μόνο σε οικονομικό πλαίσιο.", effort: "M" },
          { item: "Agent canvas sync (ολοκληρώθηκε)", pages: "Agent, Sidebar", action: "Ορατότητα, 15 modes, strict/notes-only και offline ενημερώθηκαν ως πλήρη μετά τις Φάσεις 0/2.", effort: "S" },
        ]}
      />

      <Divider />

      <Callout tone="success" title="Τι ΔΕΝ χρειάζεται δουλειά">
        Πλήρη και σωστά υλοποιημένα: pipeline upload→μάθημα, FSRS/επαναλήψεις,
        Note Analysis, whiteboard/concept map/scratchpad/annotations, Jitsi
        βίντεο, auth/billing/sync/GDPR στον server, Google integrations, και
        ολόκληρο το σύστημα σχεδίασης μετά τα passes αρμονίας. Το redirect
        Analytics→Dashboard έχει ήδη διορθωθεί (store singleton + product
        tour) με regression tests.
      </Callout>

      <Text tone="tertiary" size="small">
        Πηγή: 4 παράλληλοι έλεγχοι κώδικα (Dashboard/Library/Tasks,
        Agent/Study Room/Workspace, Analytics/Settings/auth,
        sidebar/org/exam-prep) στο repo synapse-learning — Αύγουστος 2026.
      </Text>
    </Stack>
  );
}
