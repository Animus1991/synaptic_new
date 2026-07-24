# Synapse Learning — Σχέδιο AI Ενσωμάτωσης (v2, μετά τη συγχώνευση)

> Έκδοση 2 — 24 Ιουλίου 2026. Αντικαθιστά πλήρως το προηγούμενο σχέδιο.
> Το v1 γράφτηκε πριν από τη συγχώνευση με το `synaptic_new` και θεωρούσε ότι
> «πραγματικό merge είναι αδύνατο» — αυτό δεν ισχύει πλέον: η συγχώνευση
> ολοκληρώθηκε (remote UI + τοπικά AI features + Replit scaffolding), οπότε
> όλες οι ενότητες ξαναγράφτηκαν με βάση την **πραγματική** κατάσταση του κώδικα.

---

## 0. Σύνοψη — Τι ισχύει σήμερα

### ✅ Ενεργή AI υποδομή (χωρίς καμία ρύθμιση από τον χρήστη)
- **Built-in AI proxy**: το SPA μιλά same-origin στο `/api`, ο api-server
  προωθεί στο Replit AI Integrations upstream (ανώνυμα, χωρίς κλειδί χρήστη).
  `isLlmAvailable()` επιστρέφει πάντα `true` — δεν υπάρχει πια «κενή» κατάσταση.
- **RAG με pgvector**: ενεργό (η βάση PostgreSQL είναι συνδεδεμένη).
- **Grounding**: `applyAgentGroundingGate` (Agent) και
  `verifyLessonPanelsFaithfulness` (lessonGenerator) — οι απαντήσεις
  αγκυρώνονται στις πηγές του χρήστη.
- **Πολυτροπικά**: OCR (`/api/ocr/*`), μεταγραφή ήχου (`/api/transcribe*`),
  TTS & audio study guide (`/api/audio/*`), σύνοψη βίντεο (YouTube route +
  `videoSummarize.ts`).

### 📌 Τα περισσότερα εργαλεία είναι ΗΔΗ συνδεδεμένα με AI
Σε αντίθεση με το v1 (που κατέγραφε Quiz/Leitner/Debate/ConceptMap «ΧΩΡΙΣ AI»),
μετά τη συγχώνευση καλούν `chatCompletion` απευθείας:
CognitiveReader, WorkspaceQuizSession, LeitnerBox, FeynmanCheck, SimulatorPanel,
ComparePanel, DebatePanel, TimerPanel, DraggableConceptMap, ScratchpadNotesPanel —
συν Agent και Dashboard σε επίπεδο σελίδας.

---

## 1. Αρχιτεκτονική AI (post-merge)

```
┌────────────────────────────── Browser (synapse SPA) ──────────────────────────────┐
│  llmClient.ts:  isLlmAvailable · chatCompletion · streamAgentReply · embedTexts   │
│                 vision/OCR helpers · readerTranslation · videoSummarize           │
└───────────────┬───────────────────────────────────────────────────────────────────┘
                │ same-origin  ${window.location.origin}/api   (κανένα hardcoded host)
┌───────────────▼───────────────── api-server (Express) ────────────────────────────┐
│  routes/ai.ts:      /api/ai/chat · /api/ai/chat/completions · /api/ai/status      │
│  proxy.ts:          /v1/chat/completions · /v1/embeddings  (OpenAI-συμβατό)       │
│  routes/rag.ts:     /api/rag/*            (pgvector index + recall)               │
│  routes/ocr.ts:     /api/ocr/*            routes/nlp.ts: /api/nlp/entities        │
│  routes/transcribe: /api/transcribe*      routes/audio.ts: /api/audio/tts,        │
│                                            /api/audio/study-guide                 │
│  routes/analytics:  /api/analytics/insights   routes/youtube.ts: σύνοψη βίντεο    │
└───────────────┬───────────────────────────────────────────────────────────────────┘
                │ upstream: Replit AI Integrations (ανώνυμο — χωρίς κλειδί χρήστη)
                ▼
        Μοντέλα LLM / embeddings         PostgreSQL + pgvector (RAG)
```

Σχεδιαστικοί κανόνες που ΔΕΝ πρέπει να παραβιαστούν:
1. **Same-origin πάντα**: κανένα fallback σε `localhost:8787` στον client.
   (`apiBase.ts`, `authClient.ts`, `samlAuthClient.ts`, `Settings.tsx` — όλα
   καταλήγουν σε `${origin}/api` όταν δεν έχει οριστεί ρητά proxy.)
2. **Προαιρετική παράκαμψη**: ο χρήστης μπορεί να ορίσει δικό του proxy/κλειδί
   στα Settings — αλλά ποτέ δεν αποθηκεύεται αυτόματα το fallback ως ρύθμιση.
3. **Grounding πρώτα**: κάθε νέα AI λειτουργία περνά από τις πηγές του χρήστη
   (RAG ή inline excerpt) πριν απαντήσει· οι αποτυχίες είναι ρητές, όχι σιωπηλές.

---

## 2. Plumbing — ποιος καλεί τι

### 2.1 Client (`src/lib/llmClient.ts` και δορυφόροι)
| Export | Καταναλωτές |
|---|---|
| `chatCompletion` | 10 εργαλεία workspace + Dashboard + libs (contentAnalysis, courseGenerator, lessonGenerator, readerTranslation, sourceContext, videoSummarize) |
| `streamAgentReply` | `Agent.tsx` (streaming συνομιλία με grounding gate) |
| `embedTexts` | RAG indexing / semantic recall (`sourceContext.ts`) |
| `isLlmAvailable` | Agent, CognitiveReader, FeynmanCheck (UI gating — πάντα true με το built-in proxy) |
| Vision/OCR helpers | Reader OCR overlay, bilingual ensemble |

### 2.2 Κανόνας επιλογής επιπέδου
- **Απλή, εφάπαξ κλήση** (π.χ. εξήγηση επιλογής): `chatCompletion` από τον client.
- **Streaming διάλογος**: `streamAgentReply`.
- **Αναζήτηση/θεμελίωση σε πολλά αρχεία**: `/api/rag/*` recall → prompt με χωρία.
- **Βαριά/πολυτροπικά** (OCR, transcribe, TTS): πάντα server-side routes.

### 2.3 Πύλες περιβάλλοντος (env-gated)
| Υποδομή | Μεταβλητή | Κατάσταση | Τι ξεκλειδώνει |
|---|---|---|---|
| PostgreSQL + pgvector | `DATABASE_URL` | ✅ ενεργό | RAG index/recall, persistence |
| Redis + BullMQ | `REDIS_URL` | ⛔ ανενεργό | background ingest queues (μεγάλα PDF, batch OCR) |
| Collab websocket (Hocuspocus) | `COLLAB_PORT` (τώρα 18081) | ⚠️ τρέχει, αλλά **δεν** περνά από το Replit path-proxy | live συνεργασία Whiteboard/StudyRoom |
| Stripe | κλειδιά Stripe | ⛔ | billing (`/api/billing/*`) |
| SAML / Google OAuth | tenant config | ⛔ | SSO, Google Calendar/Tasks/Meet |
| LTI 1.3 | platform config | ⛔ | ενσωμάτωση LMS (`/api/lti/*`) |
| OpenTelemetry | OTEL_* | ⛔ | tracing |

---

## 3. Κατάσταση & σχέδιο ανά σελίδα

| Σελίδα | Κατάσταση AI | Επόμενο βήμα (πρόταση) |
|---|---|---|
| **Landing / Onboarding** | Χωρίς AI (σωστό — στατικό περιεχόμενο) | Καμία ενέργεια |
| **Dashboard** | ✅ AI daily brief (`chatCompletion`) | Εμπλουτισμός brief με RAG recall από πρόσφατα αρχεία + FSRS στατιστικά |
| **Library** | Έμμεσο AI: upload pipeline → `contentAnalysis`/`courseGenerator` | Σημασιολογική αναζήτηση βιβλιοθήκης μέσω `/v1/embeddings` (ήδη υπάρχει endpoint) |
| **Tasks** | Χωρίς AI | Αυτόματη εξαγωγή εργασιών/προθεσμιών από νέες πηγές (server-side, με ρητή έγκριση χρήστη) |
| **Agent** | ✅ Πλήρες: `streamAgentReply` + grounding gate + RAG context | Δείκτες παραπομπών (ποιο χωρίο στήριξε κάθε πρόταση) |
| **Analytics** | ✅ `AIInsightsPanel` → `/api/analytics/insights` | Συστάσεις δράσης ανά αδύναμη έννοια (σύνδεση με Leitner/Quiz) |
| **Settings** | Διαχείριση προαιρετικού proxy/κλειδιού — same-origin default | Καμία — μην ξαναεισαχθεί localhost fallback |
| **TeacherDashboard / StudentOrgView** | Χωρίς άμεσο AI | Συνόψεις προόδου τάξης (server-side aggregate → μία κλήση LLM ανά τάξη, με cache) |
| **LessonView** | ✅ `generateLessonPanels` + `verifyLessonPanelsFaithfulness` | Επέκταση faithfulness ελέγχου σε quiz που παράγονται από panels |
| **ReviewSessionView** | FSRS (αλγοριθμικό — σκόπιμα χωρίς LLM) | Προαιρετικά: AI εξήγηση «γιατί ξαναβλέπω αυτή την κάρτα» |

---

## 4. Κατάσταση & σχέδιο ανά εργαλείο Workspace

### 4.1 Με ενεργό AI (καλούν `chatCompletion`)
| Εργαλείο | Τι κάνει με AI σήμερα | Πρόταση εξέλιξης |
|---|---|---|
| **CognitiveReader** | ask-ai-inline (επιλογή → inline απάντηση), μετάφραση (`readerTranslation`), OCR overlay | Σύνδεση inline απαντήσεων με RAG ώστε να αντλούν και από άλλα αρχεία του μαθήματος |
| **WorkspaceQuizSession / QuizPanel** | Παραγωγή/βαθμολόγηση ερωτήσεων | Adaptive δυσκολία από ιστορικό λαθών (FSRS σήμα) |
| **LeitnerBox** | AI-βοηθούμενη δημιουργία καρτών | Auto-tagging καρτών ανά έννοια για cross-tool ροές |
| **FeynmanCheck** | ✅ πλήρης κύκλος εξήγησης-ανατροφοδότησης | Ηχητική εξήγηση μέσω `/api/transcribe` (μιλάς αντί να γράφεις) |
| **SimulatorPanel** | Παραμετρικά σενάρια με AI | Έλεγχος ορίων τιμών από τις πηγές (grounding) |
| **ComparePanel** | AI σύγκριση εννοιών σε πίνακα | «Στείλε γραμμή στο Quiz» με auto-generated ερώτηση |
| **DebatePanel** | Επιχειρήματα/αντεπιχειρήματα (CounterArgument objects) | Βαθμολόγηση πειστικότητας με ρουμπρίκα |
| **TimerPanel** | AI μικρο-προτάσεις εστίασης | Καμία επέκταση — να παραμείνει ελαφρύ |
| **DraggableConceptMap** | AI πρόταση κόμβων/συνδέσεων | Έλεγχος «ορφανών» εννοιών σε σχέση με τις πηγές |
| **ScratchpadNotesPanel** | AI βοήθεια σημειώσεων | Σύνοψη σημειώσεων → κάρτες Leitner με ένα βήμα |

### 4.2 Χωρίς άμεσο AI (σκόπιμα ή εκκρεμεί)
| Εργαλείο | Γιατί | Πρόταση |
|---|---|---|
| **FormulaScratchpad** | Συμβολικοί υπολογισμοί — ντετερμινιστικό | Προαιρετική AI εξήγηση βημάτων (χαμηλή προτεραιότητα) |
| **WhiteboardPanel** | CRDT συνεργασία (Yjs) — το AI δεν είναι το κενό· το κενό είναι το websocket (βλ. §6) | DiagramCoach αφού λυθεί το collab transport |
| **AnnotationOverlay** | Λεπτό UI layer | Ομαδοποίηση επισημάνσεων ανά έννοια (μέσω `/api/nlp/entities`) |
| **DashboardPanel / Discoverability / Status panels** | Καθαρά προγραμματιστικά widgets | Καμία — να μείνουν χωρίς LLM |

### 4.3 Συμβόλαιο επιλογών κειμένου (§13.5) — δεσμευτικό
- Κοινή μπάρα ενεργειών σε όλα τα εργαλεία (`WorkspaceSelectionActionBar` →
  `getSelectionActionDefs`).
- **Reader-only ενέργειες**: `make-occlusion` (μόνο με OCR bbox) και
  `ask-ai-inline` (μόνο στον Reader, gated σε διαθεσιμότητα LLM μέσω
  `askAiInlineAvailable`). ΔΕΝ εμφανίζονται σε Compare/Quiz/Debate/ConceptMap.
- Parity μετρήσεις που φυλάσσονται από QA tests: Compare = 8 ενέργειες,
  Reader χωρίς occlusion = 7 (`compareReaderSelectionParityQA`,
  `quizSelectionRemediationQA`). Κάθε νέα ενέργεια πρέπει να ενημερώνει ΚΑΙ τα
  δύο QA modules.

---

## 5. Δυνατότητες που μπήκαν in-tree με τη συγχώνευση

Πλέον υπάρχουν στον κώδικα (δεν είναι «μελλοντικά cherry-picks» όπως στο v1):
- **StudyRoomPanel** + `/api/studyRooms` + Hocuspocus collab server
- **VideoSummarizeButton** + YouTube route + `videoSummarize.ts`
- **NoteAnalysisView** (ανάλυση σημειώσεων)
- **Audio study guide + TTS** (`/api/audio/*`)
- **Μεταγραφή ήχου** (`/api/transcribe*`)
- **RAG routes** (`/api/rag/*`, ενεργά με pgvector)
- **SAML/Google/LTI/Billing** διαδρομές (env-gated, βλ. §2.3)

---

## 6. Χαρακτηριστικά με πύλη υποδομής — τι χρειάζεται για ενεργοποίηση

1. **Collab websocket (Whiteboard/StudyRoom live)**: ο Hocuspocus τρέχει σε
   ξεχωριστό port (18081) που **δεν** δρομολογείται από το Replit path-proxy.
   Επιλογές: (α) deployment με WS στο ίδιο origin πίσω από δικό του host,
   (β) upgrade handling μέσα στον ίδιο τον api-server HTTP server ώστε το
   `/api` origin να σερβίρει και WS. Μέχρι τότε το feature μένει σωστά
   απενεργοποιημένο με ρητό μήνυμα.
2. **Redis/BullMQ**: απαιτεί `REDIS_URL`. Ξεκλειδώνει ουρές για βαριά ingest
   (μεγάλα PDF, batch OCR/embeddings) — σήμερα όλα γίνονται inline.
3. **Stripe / SAML / Google / LTI**: απαιτούν κλειδιά ή tenant configuration.
   Ο κώδικας υπάρχει και αποτυγχάνει ρητά χωρίς αυτά — δεν χρειάζεται άλλο
   γράψιμο, μόνο διαμόρφωση όταν ζητηθεί.

---

## 7. Οδικός χάρτης

- **Φάση 1 — ΟΛΟΚΛΗΡΩΘΗΚΕ**: built-in proxy, AI σε όλα τα βασικά εργαλεία,
  grounding gates, RAG ενεργό, πολυτροπικές διαδρομές in-tree.
- **Φάση 2 — Κενά σελίδων (χαμηλό ρίσκο, υψηλή αξία)**:
  1. Library semantic search (`/v1/embeddings` — υπάρχον endpoint)
  2. Tasks: εξαγωγή εργασιών από πηγές με έγκριση χρήστη
  3. Teacher: cached συνόψεις προόδου ανά τάξη
- **Φάση 3 — Βαθύ RAG παντού**: recall σε Dashboard brief, Quiz generation,
  Debate grounding· δείκτες παραπομπών στον Agent· cross-tool «στείλε στο X»
  ροές με auto-generated περιεχόμενο.
- **Φάση 4 — Infra-gated**: BullMQ ουρές ingest, collab AI (DiagramCoach σε
  κοινό whiteboard), φωνητικές ροές (transcribe → Feynman, TTS study guides
  ως podcast).

Κριτήριο προτεραιότητας: πρώτα ό,τι χρησιμοποιεί ήδη υπάρχον endpoint χωρίς
νέα υποδομή· μετά ό,τι απαιτεί schema/queue δουλειά· τελευταία τα env-gated.

---

## 8. Αρχές σχεδιασμού (αμετάβλητες)

1. **Grounding πρώτα** — καμία «ελεύθερη» απάντηση όπου υπάρχουν πηγές χρήστη.
2. **Ρητές αποτυχίες** — αν το AI αποτύχει, το UI το λέει· ποτέ σιωπηλά
   placeholder δεδομένα.
3. **Same-origin `/api`** — κανένα hardcoded host στον client· προαιρετική
   παράκαμψη μόνο με ρητή ρύθμιση χρήστη.
4. **Offline-first** — κάθε εργαλείο έχει λειτουργική μη-AI βάση (FSRS,
   templates, τοπικά δεδομένα).
5. **Διγλωσσία el/en** — κάθε AI ροή σέβεται το `lang` (prompts + UI).
6. **Κόστος/όρια** — batch όπου γίνεται (embeddings), cache όπου επιτρέπεται
   (insights, συνόψεις τάξης), streaming μόνο όπου προσθέτει UX αξία.
7. **Ιδιωτικότητα** — περιεχόμενο χρήστη μόνο μέσω του ελεγχόμενου proxy·
   τίποτα σε τρίτους εκτός της διαδρομής Replit AI Integrations.
