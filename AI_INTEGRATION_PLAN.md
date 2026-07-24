# Synapse Learning — Εξαντλητικό Σχέδιο AI Ενσωμάτωσης

**Ημερομηνία σχεδίου:** Ιούλιος 2026  
**Baseline:** Πλήρης έλεγχος κώδικα + GitHub remote (9f0e816) + Replit OpenAI integration ενεργοποιημένο  
**Στόχος:** Παροχή πραγματικής AI σε κάθε εργαλείο του Study Workspace, χωρίς να απαιτεί ο χρήστης δικό του API key.

---

## 0. Κατάσταση Βάσης (Τι υπάρχει ΗΔΗ)

### ✅ Υπάρχουσα AI Υποδομή

| Αρχείο | Περιγραφή |
|--------|-----------|
| `src/lib/llmClient.ts` | Πλήρης client: `chatCompletion`, `streamChatCompletion`, `streamAgentReply`, `embedTexts`. Υποστηρίζει API key, proxy URL ή built-in proxy. |
| `src/lib/feynmanCoach.ts` | LLM-based αξιολόγηση Feynman explanations. Rubric: accuracy / completeness / simplicity / structure. |
| `src/lib/readerTranslation.ts` | AI μετάφραση ενότητας reader (ΕΝ↔ΕΛ). |
| `src/lib/courseGenerator.ts` | AI-based course outline generation από εξαγόμενο κείμενο. |
| `src/lib/lessonGenerator.ts` | AI δημιουργία lesson steps ανά topic. |
| `src/lib/contentAnalysis.ts` | AI ανάλυση περιεχομένου για concept extraction. |
| `src/lib/agentContent.ts` | System prompts για 15 agent modes. |
| `src/components/Agent.tsx` | Fully-featured AI agent: 15 modes, RAG-grounded, SSE streaming. |
| `src/components/workspace/FeynmanCheck.tsx` | AI rubric evaluation (live, uses `feynmanCoach`). |
| `src/components/workspace/CognitiveReader.tsx` | AI translation, bionic reading, concept highlighting. |

### ❌ Εργαλεία ΧΩΡΙΣ ενεργή AI (ή με template/offline fallbacks μόνο)

| Εργαλείο | Κατάσταση | Προτεραιότητα |
|----------|-----------|---------------|
| QuizPanel | Template questions από glossary. Χωρίς LLM generation ή explanation. | 🔴 Υψηλή |
| LeitnerBox | Flashcards από glossary, χωρίς AI hints / μνημονικά. | 🔴 Υψηλή |
| DebatePanel | ArgumentMap από templates, χωρίς AI counter-argument. | 🔴 Υψηλή |
| InteractiveSimulator | Αριθμητικά what-if, χωρίς AI εξήγηση αποτελεσμάτων. | 🟠 Μέτρια |
| DraggableConceptMap | Force-directed graph, χωρίς AI edge suggestion. | 🟠 Μέτρια |
| WhiteboardPanel | Diagram coach (στατικό), χωρίς real-time AI critique. | 🟠 Μέτρια |
| ComparePanel | Comparison table από glossary, `onExplainDifference` → Agent handoff. | 🟡 Χαμηλή (Agent handles it) |
| TimerPanel | Pomodoro/countdown, χωρίς AI session planning. | 🟡 Χαμηλή |
| DashboardPanel | Stats, χωρίς AI insight generation. | 🟡 Χαμηλή |

---

## 1. Κρίσιμη Αλλαγή Υποδομής: Built-in AI Proxy

### 1.1 Πρόβλημα
Η `llmClient.ts` απαιτεί `openaiApiKey` στο user settings ή `llmProxyUrl`. Χωρίς αυτά, `isLlmAvailable()` επιστρέφει `false` και ΟΛΑ τα εργαλεία πέφτουν σε offline/template mode.

### 1.2 Λύση (ΕΦΑΡΜΟΣΤΗΚΕ)
- **`artifacts/api-server/src/routes/ai.ts`** — νέο endpoint `/api/ai/chat` που proxάρει στο Replit OpenAI integration (μοντέλο: `gpt-5.6-luna`).
- **`artifacts/synapse/src/lib/llmClient.ts`** — η `isLlmAvailable()` επιστρέφει `true` πάντα (built-in proxy). Fallback: `baseUrl()` → `/api/ai`.

### 1.3 Αποτέλεσμα
Μόλις ο χρήστης ανοίξει την πλατφόρμα, ΟΛΑ τα εργαλεία που χρησιμοποιούν `chatCompletion` / `streamChatCompletion` λειτουργούν αυτόματα, χωρίς καμία ρύθμιση.

---

## 2. Ανελυτική Κατάσταση Κάθε Σελίδας / Εργαλείου

### 2.1 Landing Page (`Landing.tsx`)

**Τρέχουσα κατάσταση:** Στατική σελίδα με demo showcase, 3-step explanation, trust indicators.

**AI Ενσωμάτωση — Σχέδιο:**
- [ ] **AI Demo Chat Widget** — Live mini-agent στο hero που απαντά σε ερωτήσεις demo (grounded in sample content). Δείχνει τις δυνατότητες του agent ΠΡΙΝ ο χρήστης κάνει upload.
- [ ] **Adaptive CTA copy** — Η/Ο πρόταση action (`Get Started` / `See Demo`) αλλάζει δυναμικά με βάση τo referrer ή το query string.

**Εκτίμηση προσπάθειας:** 🟠 Μέτρια (1-2 ημέρες)

---

### 2.2 Onboarding (`Onboarding.tsx`)

**Τρέχουσα κατάσταση:** Multi-step wizard: γλώσσα, learning style, goals.

**AI Ενσωμάτωση — Σχέδιο:**
- [ ] **AI Syllabus Suggester** — Μετά το upload στο onboarding, AI προτείνει εβδομαδιαίο πρόγραμμα μελέτης βάσει `daysToExam` + `estimatedHours` + `topicCount`.
- [ ] **Learning Style Calibration** — Σύντομη AI συνομιλία (3 ερωτήσεις) που βαθμονομεί `agentMode` (socratic / direct / feynman κλπ).

**Εκτίμηση προσπάθειας:** 🟠 Μέτρια (2 ημέρες)

---

### 2.3 Dashboard (`Dashboard.tsx`)

**Τρέχουσα κατάσταση:** Readiness ring, priority queue, concept mastery bars, weak areas, anti-passive alert.

**AI Ενσωμάτωση — Σχέδιο:**
- [ ] **AI Daily Brief** — Κάθε πρωί, ένα 2-3 πρότασης AI summary: "Χθες έκανες X. Σήμερα εστίασε σε Y γιατί Z." Χρησιμοποιεί `learnerModel`, `activities`, `daysToExam`.
- [ ] **Predictive "Next Best Action"** — Αντί για static queue, ο agent υπολογίζει ποια ενέργεια μεγιστοποιεί retention πριν την εξέταση (FSRS + forgetting curve analysis).
- [ ] **Misconception Alerts** — AI εντοπίζει από `openMistakes` + `quizHistory` επαναλαμβανόμενα λάθη και δημιουργεί targeted alert: "Φαίνεται να μπερδεύεις X με Y — θέλεις να το ξεκαθαρίσουμε;"
- [ ] **Study Momentum Coach** — Όταν `streak = 0` ή `lastStudied > 2 days`, AI στέλνει micro-intervention με συγκεκριμένο next step.

**Εκτίμηση προσπάθειας:** 🔴 Υψηλή (3-4 ημέρες)

---

### 2.4 Library (`Library.tsx`)

**Τρέχουσα κατάσταση:** Course/file management, outline preview, source quality indicators.

**AI Ενσωμάτωση — Σχέδιο:**
- [ ] **AI Source Quality Advisor** — Όταν `sourceQuality.band = 'weak'`, ο AI εξηγεί ΓΙΑΤΊ η ποιότητα είναι χαμηλή και δίνει actionable βήματα ("Το PDF σου έχει κυρίως εικόνες χωρίς κείμενο — δοκίμασε να προσθέσεις ένα Word document με σημειώσεις").
- [ ] **Smart Course Merge Suggestions** — AI εντοπίζει σημασιολογικά overlapping courses και προτείνει merge ή cross-references.
- [ ] **YouTube Transcript AI Summary** — Αυτόματη περίληψη YouTube transcripts πριν γίνουν course.

**Εκτίμηση προσπάθειας:** 🟠 Μέτρια (2 ημέρες)

---

### 2.5 Tasks (`Tasks.tsx`)

**Τρέχουσα κατάσταση:** Task list, Leitner rating, session queue.

**AI Ενσωμάτωση — Σχέδιο:**
- [ ] **AI Task Difficulty Estimation** — Αναθεωρεί `estimatedMinutes` βάσει `betaMastery` και `learningVelocity`.
- [ ] **Smart Task Sequencing** — Αντί για static topological sort, AI βελτιστοποιεί σειρά βάσει interleaving effect (διαφορετικά concept types ανά εβδομάδα = καλύτερη retention).
- [ ] **Adaptive Session Length** — Βάσει last session fatigue signals, ο AI προτείνει "Σήμερα κάνε μόνο 25 λεπτά — η performance σου πέφτει μετά."

**Εκτίμηση προσπάθειας:** 🟠 Μέτρια (2 ημέρες)

---

### 2.6 Agent (`Agent.tsx`) ← ΠΛΗΡΩΣ AI-POWERED

**Τρέχουσα κατάσταση:** 15 modes, SSE streaming, RAG-grounded (BM25), source citations.

**Υπάρχει ήδη:** ✅ Πλήρης AI με `streamAgentReply`. Μετά την ενεργοποίηση του built-in proxy, λειτουργεί χωρίς ρύθμιση.

**Επιπλέον βελτιώσεις — Σχέδιο:**
- [ ] **Semantic RAG (pgvector)** — Αντικατάσταση BM25 με vector search μέσω api-server (απαιτεί embeddings endpoint). Σημαντική βελτίωση στο relevance των citations.
- [ ] **Multi-turn Memory** — Persist conversation context σε IndexedDB ανά course/concept. Ο agent "θυμάται" τι συζητήθηκε χθες.
- [ ] **Voice Input** — STT (gpt-4o-mini-transcribe) για voice queries στον agent.
- [ ] **Proactive Suggestions** — Ο agent παρακολουθεί την workspace activity και προτείνει αυτόματα: "Είδα ότι έκανες quiz 3 φορές λάθος στο X — θέλεις να το εξηγήσω;"

**Εκτίμηση προσπάθειας για βελτιώσεις:** 🔴 Υψηλή (4-5 ημέρες)

---

### 2.7 Analytics (`Analytics.tsx`)

**Τρέχουσα κατάσταση:** Charts για mastery, velocity, calibration, prereq repairs.

**AI Ενσωμάτωση — Σχέδιο:**
- [ ] **AI Narrative Summary** — Κάτω από κάθε chart, μια AI-generated παράγραφος που ερμηνεύει τα δεδομένα: "Η ταχύτητα μάθησής σου επιβραδύνθηκε 23% την εβδομάδα του X — πιθανόν λόγω δυσκολίας στο Y topic."
- [ ] **Predictive Exam Readiness** — Βάσει trajectory, AI υπολογίζει πιθανότητα επιτυχίας στην εξέταση και τι χρειάζεται για να ανέβει.
- [ ] **Anomaly Detection** — AI εντοπίζει ασυνήθιστα patterns (π.χ. "Κάνεις quiz μόνο τις νύχτες — performance 18% χαμηλότερα απ' ό,τι το πρωί").

**Εκτίμηση προσπάθειας:** 🟠 Μέτρια (2 ημέρες)

---

### 2.8 Settings (`Settings.tsx`)

**Τρέχουσα κατάσταση:** OpenAI API key field, llmProxyUrl, model selection, source mode.

**AI Ενσωμάτωση — Σχέδιο:**
- [x] **Built-in AI Proxy indicator** — Badge "✅ Synapse AI Ενεργό" που δείχνει ότι η πλατφόρμα έχει built-in AI χωρίς API key. (ΕΦΑΡΜΟΖΕΤΑΙ)
- [ ] **Model Selection** — Dropdown για advanced users: `gpt-5.6-luna` (fast) / `gpt-5.6-terra` (powerful) / `o4-mini` (reasoning).
- [ ] **AI Quota Display** — Εμφάνιση χρήσης tokens/ημέρα αν ενεργοποιηθεί quota tracking.

**Εκτίμηση προσπάθειας:** 🟢 Χαμηλή (1 ημέρα)

---

### 2.9 Teacher Dashboard (`TeacherDashboard.tsx`)

**Τρέχουσα κατάσταση:** LLM usage tracking, course roster, server capabilities toggle.

**AI Ενσωμάτωση — Σχέδιο:**
- [ ] **Class Insights** — AI summary των learner patterns στο roster: "3 μαθητές έχουν κολλήσει στο Κεφάλαιο 4 — προτείνω targeted worksheet."
- [ ] **Auto-Assessment Generation** — AI δημιουργεί εξετάσεις από course content με calibrated difficulty.
- [ ] **Learning Gap Detection** — Εντοπίζει concepts που ΟΛΟΙ οι μαθητές βρίσκουν δύσκολα → "Αυτά τα 3 concepts χρειάζονται διδακτική αναθεώρηση."

**Εκτίμηση προσπάθειας:** 🔴 Υψηλή (3-4 ημέρες)

---

## 3. Study Workspace — Λεπτομερής AI Σχέδιο ανά Εργαλείο

### 3.1 🧠 CognitiveReader — ΜΕΡΙΚΩΣ AI-POWERED

**Τρέχουσα AI:** Translation (EN↔EL), concept highlighting, bionic reading.
**Proxy ενεργοποιεί:** Translation χωρίς API key.

**Επιπλέον:**
- [ ] **AI Section Summary** (💡) — Κουμπί "Περίληψη" κάτω από κάθε section που δημιουργεί 3-bullet summary.
- [ ] **Difficulty Adaptation** — AI ανιχνεύει πολύπλοκες προτάσεις και προσφέρει "Απλοποιημένη εκδοχή".
- [ ] **Vocabulary Spotlight** — AI υπογραμμίζει terms που ο χρήστης έχει δείξει weakness (βάσει quiz history).
- [ ] **AI Q&A on Selection** — Select text → "Ρώτα τον AI" inline (χωρίς να ανοίξεις τον Agent).

**Εκτίμηση:** 🔴 Υψηλή (3 ημέρες)

---

### 3.2 ❓ QuizPanel — ΧΩΡΙΣ AI → ΠΡΟΤΕΡΑΙΟΤΗΤΑ

**Τρέχουσα κατάσταση:** Questions από template/glossary extraction, IRT calibration, confidence selector.

**Σχέδιο:**
- [ ] **AI Dynamic Question Generation** — Αντί για template questions, LLM δημιουργεί ερωτήσεις από source text βάσει concept + difficulty level + Bloom taxonomy.
  - Prompt: `"Create 3 multiple-choice questions about {concept} at {bloomLevel} level. Ground them in: {sourceExcerpt}. Format: JSON {question, choices: [A,B,C,D], correct, explanation}"`
- [ ] **AI Wrong Answer Explanation** — Μετά από λανθασμένη απάντηση, inline AI εξήγηση γιατί η απάντηση του χρήστη ήταν λάθος και γιατί η σωστή είναι σωστή.
- [ ] **Adaptive Difficulty** — AI αυξάνει δυσκολία αυτόματα βάσει IRT θ (ability estimate).
- [ ] **Distractor Generation** — AI δημιουργεί realistic λανθασμένες επιλογές (plausible distractors) αντί για random terms.

**Implementation:**
```typescript
// QuizPanel.tsx - προσθήκη
async function generateAIQuestion(concept: string, source: string, bloomLevel: string) {
  const resp = await chatCompletion([
    { role: 'system', content: 'You generate quiz questions. Return JSON only.' },
    { role: 'user', content: `Generate 1 MCQ about "${concept}" at ${bloomLevel} level.\nSource: ${source.slice(0,800)}\nJSON: {question, choices:{A,B,C,D}, correct, explanation}` }
  ], settings);
  return JSON.parse(resp);
}
```

**Εκτίμηση:** 🔴 Υψηλή (3-4 ημέρες)

---

### 3.3 🃏 LeitnerBox/Panel — ΧΩΡΙΣ AI → ΠΡΟΤΕΡΑΙΟΤΗΤΑ

**Τρέχουσα κατάσταση:** FSRS flashcards, box progression, Anki export. Χωρίς AI.

**Σχέδιο:**
- [x] **AI Hint Button** — Όταν ο χρήστης πατήσει "Again" ή "Hard", εμφανίζεται κουμπί "💡 AI Βοήθεια" που παράγει:
  - Ένα mnemonic device για την κάρτα
  - Μια αναλογία
  - Ένα mini-explanation 2 προτάσεων (ΕΦΑΡΜΟΖΕΤΑΙ)
- [ ] **AI Card Generation** — Δημιουργία νέων flashcards από οποιοδήποτε source excerpt, βάσει cloze deletion ή Q&A format.
- [ ] **Adaptive Interval Tuning** — AI αναλύει πότε ο χρήστης κάνει λάθος και fine-tunes FSRS parameters.
- [ ] **Occlusion Cards** — AI δημιουργεί image-based cloze deletion cards από diagrams.

**Εκτίμηση:** 🟠 Μέτρια (2 ημέρες)

---

### 3.4 🎭 DebatePanel — ΧΩΡΙΣ AI → ΠΡΟΤΕΡΑΙΟΤΗΤΑ

**Τρέχουσα κατάσταση:** ArgumentMap από templates. Ο χρήστης μπορεί να δει επιχειρήματα αλλά δεν αλληλεπιδρά με AI.

**Σχέδιο:**
- [ ] **AI Counter-Argument Generator** — Select ένα claim → "AI Αντεπιχείρημα" → streaming AI rebuttal grounded in source.
  - Prompt: `"Given this claim: '{claim}', generate a well-reasoned counter-argument using the learner's notes: {source}. Be specific, cite evidence, stay academic."`
- [ ] **Socratic Debate Mode** — AI ρωτά τον χρήστη να υπερασπιστεί μια θέση, παρέχει counter-arguments, βαθμολογεί argument quality.
- [ ] **Claim Strength Analysis** — AI βαθμολογεί κάθε claim: "Αυτό το επιχείρημα είναι αδύναμο γιατί δεν έχει empirical support."
- [ ] **Argument Map AI Expansion** — AI προσθέτει νέους nodes στον χάρτη βάσει source content.

**Εκτίμηση:** 🔴 Υψηλή (3 ημέρες)

---

### 3.5 📊 InteractiveSimulator — ΜΕΡΙΚΩΣ AI

**Τρέχουσα κατάσταση:** Numeric what-if sandboxes (Economics/Physics). Χωρίς AI εξήγηση.

**Σχέδιο:**
- [ ] **AI Result Explanation** — Μετά από simulation run, AI εξηγεί αυτόματα: "Όταν αύξησες το X κατά 10%, το Y μειώθηκε κατά 3% λόγω της σχέσης Z."
- [ ] **What-If Suggester** — AI προτείνει interesting parameter combinations: "Δοκίμασε X=5, Y=2 — θα δεις μια unexpected outcome."
- [ ] **Formula Derivation Coach** — AI εξηγεί step-by-step πώς φτάσαμε στη φόρμουλα που χρησιμοποιεί ο simulator.

**Εκτίμηση:** 🟠 Μέτρια (2 ημέρες)

---

### 3.6 ✏️ WhiteboardPanel/DiagramCoach — ΜΕΡΙΚΩΣ AI

**Τρέχουσα κατάσταση:** Free drawing canvas με blueprint coverage audit. WhiteboardDiagramCoach.tsx υπάρχει αλλά είναι static.

**Σχέδιο:**
- [ ] **Real-time AI Diagram Critique** — Ο χρήστης σχεδιάζει → "Ανάλυση AI" → streaming feedback: "Βλέπω ότι σχεδίασες X αλλά λείπει Y. Η σχέση μεταξύ A και B δεν είναι αρκετά σαφής."
- [ ] **AI Blueprint Generation** — Βάσει concept, AI δημιουργεί ένα reference diagram (Mermaid) που ο χρήστης μπορεί να αντιγράψει/συγκρίνει.
- [ ] **OCR + Concept Matching** — AI εντοπίζει χειρόγραφα labels στο whiteboard και τα matchάρει με τα course concepts.

**Εκτίμηση:** 🔴 Υψηλή (4 ημέρες)

---

### 3.7 🧪 FeynmanCheck — ΠΛΗΡΩΣ AI-POWERED ✅

**Τρέχουσα AI:** Rubric evaluation (accuracy/completeness/simplicity/structure) via `chatCompletion`.
**Proxy ενεργοποιεί:** Λειτουργεί χωρίς API key.

**Επιπλέον:**
- [ ] **Streaming Feedback** — Μετατροπή από non-streaming σε streaming feedback για άμεση απόκριση.
- [ ] **Targeted Follow-up Questions** — Μετά το feedback, AI ρωτά: "Μπορείς να εξηγήσεις τι συμβαίνει στα boundaries;"
- [ ] **Voice Feynman** — Ο χρήστης εξηγεί φωνητικά (STT), AI αξιολογεί.

**Εκτίμηση:** 🟢 Χαμηλή (1-2 ημέρες)

---

### 3.8 🗺️ DraggableConceptMap — ΧΩΡΙΣ AI

**Τρέχουσα κατάσταση:** Force-directed graph, manual edge creation, mastery coloring.

**Σχέδιο:**
- [ ] **AI Edge Suggestion** — AI προτείνει νέες σχέσεις μεταξύ concepts: "Παρατήρησα ότι δεν έχεις συνδέσει X με Y — υπάρχει σχέση αιτίου-αποτελέσματος."
- [ ] **Auto-Map Generation** — AI δημιουργεί αυτόματα αρχικό concept map από course content.
- [ ] **Mastery-Adaptive Expansion** — Βάσει quiz performance, AI προτείνει ποιους νέους concepts να προσθέσει ο χρήστης.

**Εκτίμηση:** 🟠 Μέτρια (2 ημέρες)

---

### 3.9 ⏱️ TimerPanel — ΧΩΡΙΣ AI

**Τρέχουσα κατάσταση:** Pomodoro + exam countdown. Χωρίς intelligence.

**Σχέδιο:**
- [ ] **AI Session Planner** — Βάσει `daysToExam`, `weakAreas`, `learningVelocity`, ο AI δημιουργεί optimized study schedule: "Σήμερα: 2x25min Quiz (Κεφ.3), 1x25min Feynman (Κεφ.5), 1x25min Reader (Κεφ.6)."
- [ ] **Fatigue Detection** — Αν o χρήστης κάνει συνεχώς λάθη στο quiz τα τελευταία 15 λεπτά, ο AI προτείνει break.
- [ ] **Interleaving Scheduler** — AI εναλλάσσει subjects/topics στα Pomodoro slots για καλύτερη retention (spacing effect).

**Εκτίμηση:** 🟠 Μέτρια (2 ημέρες)

---

### 3.10 📈 DashboardPanel (Workspace) — ΧΩΡΙΣ AI

**Τρέχουσα κατάσταση:** Mini stats panel μέσα στο workspace.

**Σχέδιο:**
- [ ] **AI Micro-Insights** — 2-3 γραμμές AI insight βάσει session data: "Απαντάς 40% πιο σωστά σε retrieval questions απ' ό,τι σε comprehension. Εστίασε σε deeper understanding."
- [ ] **Progress Celebration** — AI δημιουργεί personalized celebration message όταν mastery > threshold.

**Εκτίμηση:** 🟢 Χαμηλή (1 ημέρα)

---

### 3.11 🔬 FormulaScratchpad — ΜΕΡΙΚΩΣ AI

**Τρέχουσα κατάσταση:** Formula evaluator, variable sliders, Sympy chain validation. Χωρίς LLM εξήγηση.

**Σχέδιο:**
- [ ] **AI Formula Explainer** — Select formula → AI εξηγεί τι αντιπροσωπεύει κάθε variable και πότε χρησιμοποιείται.
- [ ] **Derivation Validator** — Ο χρήστης γράφει steps → AI ελέγχει αν κάθε βήμα είναι algebraically correct.
- [ ] **Units Checker AI** — AI επαληθεύει dimensional consistency: "Το αποτέλεσμά σου έχει μονάδες m/s² αλλά αναμένεται N/m."

**Εκτίμηση:** 🟠 Μέτρια (2 ημέρες)

---

### 3.12 📝 ScratchpadNotesPanel — ΧΩΡΙΣ AI

**Τρέχουσα κατάσταση:** Free-text notes panel.

**Σχέδιο:**
- [ ] **AI Notes Summarizer** — "Σύνοψη" κουμπί που παράγει structured bullet list από τις σημειώσεις.
- [ ] **Smart Tags** — AI προτείνει tags/concepts για τις σημειώσεις.
- [ ] **AI to Flashcard** — Μετατροπή highlighted notes σε Leitner flashcards.

**Εκτίμηση:** 🟢 Χαμηλή (1 ημέρα)

---

## 4. Upload Pipeline — AI Ενισχύσεις

### 4.1 Τρέχουσα κατάσταση
Το pipeline εξάγει text → keyphrases → outline → course/glossary/tasks.

### 4.2 Σχέδιο Βελτίωσης
- [ ] **Multi-Pass Deep Analysis** — Discourse structure parsing (RST-lite): nucleus-satellite, cause-effect chains.
- [ ] **Cross-Document Synthesis** — Unified concept graph από πολλαπλά uploads με conflict detection.
- [ ] **Implicit Prerequisite Detection** — AI ανακαλύπτει ποια concepts πρέπει να γνωρίζει ο χρήστης ΠΡΙΝ μελετήσει κάθε topic.
- [ ] **Bloom Taxonomy Classification** — Κάθε learning objective ταξινομείται αυτόματα (Remember/Understand/Apply/Analyze/Evaluate/Create).
- [ ] **Difficulty Estimation** — AI βαθμολογεί δυσκολία κάθε topic: readability + vocabulary density + formula density.
- [ ] **YouTube Deep Transcription** — Timecoded transcript → Chapter detection → per-chapter course generation.

---

## 5. Επίπεδα Ενσωμάτωσης AI

### Επίπεδο 1: Content Generation (Υπάρχει ήδη)
Δημιουργία course structure, lessons, glossary από uploaded content.

### Επίπεδο 2: Tutoring AI (Υπάρχει ήδη + built-in proxy)
Real-time AI tutor (15 modes), Feynman evaluation, translation.

### Επίπεδο 3: Adaptive Intelligence (Σε εξέλιξη)
Quiz difficulty adaptation, FSRS fine-tuning, learning velocity tracking.

### Επίπεδο 4: Predictive AI (Σχέδιο)
Exam readiness prediction, study session optimization, fatigue detection.

### Επίπεδο 5: Collaborative AI (Μελλοντικό)
Group study sessions, teacher insights, peer learning matching.

---

## 6. Εκτελεστικό Πρόγραμμα (Roadmap)

### Phase 1 — Foundation (ΟΛΟΚΛΗΡΩΘΗΚΕ / ΕΦΑΡΜΟΖΕΤΑΙ)
- [x] Replit OpenAI Integration setup
- [x] API Server AI proxy (`/api/ai/chat`)
- [x] llmClient built-in proxy fallback
- [x] LeitnerBox AI hint button
- [x] Settings AI status indicator

### Phase 2 — High-Impact Tools (Εβδομάδα 1)
- [ ] QuizPanel: AI dynamic question generation + wrong answer explanation
- [ ] DebatePanel: AI counter-argument generation
- [ ] DashboardPanel (main): AI Daily Brief
- [ ] CognitiveReader: inline AI Q&A on text selection

### Phase 3 — Depth (Εβδομάδα 2)
- [ ] Agent: semantic RAG (vector embeddings via api-server)
- [ ] Agent: multi-turn memory (IndexedDB per course)
- [ ] WhiteboardPanel: real-time AI diagram critique
- [ ] Analytics: AI narrative summaries
- [ ] TimerPanel: AI session planner

### Phase 4 — Advanced (Εβδομάδα 3-4)
- [ ] Voice input στον Agent (STT)
- [ ] Feynman voice mode
- [ ] AI exam readiness prediction
- [ ] Teacher Dashboard AI insights
- [ ] Upload pipeline: multi-pass deep analysis
- [ ] Concept map auto-generation

### Phase 5 — Scale (Μήνας 2)
- [ ] Semantic RAG με pgvector (server-side)
- [ ] Billing / quota tracking
- [ ] Model selection per user
- [ ] Collaborative AI features

---

## 7. Τεχνική Αρχιτεκτονική AI

```
Browser (Synapse Frontend)
│
├── llmClient.ts ──────────────────────────────────────────────┐
│   ├── chatCompletion()        → POST /api/ai/chat (non-stream)│
│   ├── streamChatCompletion()  → POST /api/ai/chat (SSE)      │
│   └── embedTexts()            → (BM25 fallback, no server)   │
│                                                               │
├── Tools using chatCompletion directly:                        │
│   ├── FeynmanCheck → feynmanCoach.ts                          │
│   ├── CognitiveReader → readerTranslation.ts                  │
│   ├── LeitnerBox → AI hint (new) ← PHASE 1                   │
│   ├── QuizPanel → AI Q generation (planned) ← PHASE 2        │
│   └── DebatePanel → AI counter-arg (planned) ← PHASE 2       │
│                                                               │
└── Agent.tsx → streamAgentReply() → streamChatCompletion()    │
                                                               │
                                          ↓                    │
API Server (artifacts/api-server)         ↓                    │
│                                         ↓                    │
└── POST /api/ai/chat ←────────────────────                    │
    │                                                           │
    └── @workspace/integrations-openai-ai-server               │
        └── openai.chat.completions.create(gpt-5.6-luna)       │
            └── Replit AI Integration (no user API key needed)  │
```

---

## 8. Git Merge Σχέδιο (από GitHub remote `main`)

### Κατάσταση
- Local `main` (f0a04783): Πλήρης pnpm monorepo με 11+ workspace tools, πλήρης redesign, AI proxy.
- Remote `main` (9f0e8168): Standalone React app + server. ΔΙΑΦΟΡΕΤΙΚΗ δομή, unrelated history.

### Γιατί δεν γίνεται true git merge
- Unrelated git histories (δεν μοιράζονται common ancestor commit)
- Εντελώς διαφορετική δομή directories (standalone vs monorepo)
- Κάθε path θα ήταν σε conflict

### Τι έχει ΗΔΗ ληφθεί από το remote
✅ Έχουμε εξαντλητικά μελετήσει το GitHub remote και έχουμε ενσωματώσει:
- Την αρχιτεκτονική του AI proxy (inspired by `server/src/routes/proxy.ts`)
- Τη δομή του RAG server (inspired by `server/src/lib/ragServer.ts`)
- Τα planning docs: ENHANCEMENT_PLAN.md, WORKSPACE_TOOLS_UPGRADE.md, EXHAUSTIVE_PRODUCT_SCALE_BLUEPRINT.md (αναλύθηκαν πλήρως)
- Όλα τα workspace tools του remote υπάρχουν ήδη στο local (τα local είναι πιο εξελιγμένα)

### Συγκεκριμένα αρχεία για cherry-pick (μελλοντικό)
| Αρχείο remote | Ενέργεια |
|--------------|---------|
| `server/src/lib/ragServer.ts` | Port vector search λογικής στο api-server |
| `server/src/lib/graphRag.ts` | Port graph RAG algorithm |
| `server/src/routes/annotationStream.ts` | Port real-time annotations |
| `server/src/routes/conceptMapStream.ts` | Port collaborative cursor sync |
| `src/components/workspace/StudyRoomPanel.tsx` | Port collaborative study room |
| `src/components/VideoSummarizeButton.tsx` | Port video AI summarization |
| `src/components/NoteAnalysisView.tsx` | Port note analysis view |

---

## 9. Αρχές Σχεδιασμού AI

1. **Graceful Degradation** — Κάθε AI call έχει offline fallback. Το εργαλείο δουλεύει χωρίς LLM.
2. **Source Grounding** — Κάθε AI response cite specific source excerpts. Δεν hallucinate facts.
3. **User Control** — Ο χρήστης μπορεί να επιλέξει strict/notes-only mode για να αποκλείσει AI inference.
4. **Transparency** — Κάθε AI response badge: 🟢 Source-grounded / 🔵 AI inference / 🟡 Hybrid.
5. **Cost Awareness** — gpt-5.6-luna για high-volume calls. gpt-5.6-terra για critical reasoning.
6. **Privacy** — Τα uploaded materials δεν αποστέλλονται ολόκληρα στο LLM — μόνο relevant excerpts (max 1200 chars).
7. **Bilingual** — Κάθε AI response είναι στη γλώσσα του χρήστη (ΕΝ/ΕΛ).
