import type { Lang } from './i18n';

export type ToggleOption = { value: string; label: string };

export type SettingsContent = {
  pageTitle: string;
  pageSubtitle: string;
  sectionTeachingApproach: string;
  labelTeachingStyle: string;
  teachingStyleOptions: ToggleOption[];
  labelExplanationDepth: string;
  explanationDepthOptions: ToggleOption[];
  labelFeedbackTone: string;
  feedbackToneOptions: ToggleOption[];
  sectionContentBalance: string;
  labelTheoryVsPractice: string;
  theoryVsPracticeLeft: string;
  theoryVsPracticeRight: string;
  labelQuestionFrequency: string;
  questionFrequencyOptions: ToggleOption[];
  labelExampleDensity: string;
  exampleDensityOptions: ToggleOption[];
  labelDiagramFrequency: string;
  diagramFrequencyOptions: ToggleOption[];
  sectionPacingDifficulty: string;
  labelPacing: string;
  pacingOptions: ToggleOption[];
  labelChallengeLevel: string;
  challengeLevelOptions: ToggleOption[];
  labelLessonLength: string;
  lessonLengthOptions: ToggleOption[];
  labelMasteryThreshold: string;
  sectionPracticeRevision: string;
  labelPracticeIntensity: string;
  practiceIntensityOptions: ToggleOption[];
  labelRevisionLoops: string;
  revisionLoopsOptions: ToggleOption[];
  sectionSourceContent: string;
  labelSourceMode: string;
  sourceModeOptions: ToggleOption[];
  sourceModeHint: string;
  sectionStudyGoals: string;
  labelDailyStudyGoal: string;
  labelExamDate: string;
  sectionAiLlm: string;
  labelOpenAiKey: string;
  placeholderOpenAiKey: string;
  labelModel: string;
  labelApiBaseUrl: string;
  placeholderApiBaseUrl: string;
  labelManagedProxyUrl: string;
  placeholderManagedProxyUrl: string;
  managedProxyHint: string;
  labelUseLlm: string;
  useLlmOptions: ToggleOption[];
  llmOfflineHint: string;
  labelUseVisionOcr: string;
  visionOcrOptions: ToggleOption[];
  visionOcrHint: string;
  sectionAccountSync: string;
  planLabel: string;
  upgradePro: string;
  upgradeTeam: string;
  refreshPlan: string;
  labelProxyBaseUrl: string;
  placeholderProxyBaseUrl: string;
  placeholderEmail: string;
  placeholderPassword: string;
  signIn: string;
  register: string;
  google: string;
  signOut: string;
  pullLibrary: string;
  pushLibrary: string;
  pullProgress: string;
  pushProgress: string;
  loggedIn: string;
  sectionGoogleWorkspace: string;
  sectionInterface: string;
  labelTheme: string;
  themeOptions: ToggleOption[];
  labelLanguage: string;
  languageOptions: ToggleOption[];
  sectionDataProgress: string;
  labelDemoContent: string;
  demoContentOptions: ToggleOption[];
  demoContentHint: string;
  exportBackup: string;
  importBackup: string;
  clearLocalData: string;
  sectionDeveloper: string;
  developerHint: string;
  footerNote: string;
  signedInAs: string;
  registeredAs: string;
  authSyncedSuffix: string;
  signInBeforeUpgrade: string;
  checkoutUrlMissing: string;
  checkoutFailed: string;
  planRefreshed: string;
  refreshFailed: string;
  loginFailed: string;
  registerFailed: string;
  libraryPulled: string;
  pullFailed: string;
  librarySynced: string;
  syncFailed: string;
  progressPulled: string;
  sessionPullFailed: string;
  progressSynced: string;
  sessionPushFailed: string;
  exportFailed: string;
  deleteFailed: string;
  backupDownloaded: string;
  clearConfirm: string;
  formatImported: (count: number) => string;
  formatCleared: (count: number) => string;
  formatAuthStatus: (label: string, email: string) => string;
  formatAuthStatusSynced: (label: string, email: string) => string;
};

const EN: SettingsContent = {
  pageTitle: 'Learning Preferences',
  pageSubtitle:
    'Customize how Synapse teaches you. These are UI preferences — the adaptive engine also learns from your behavior.',
  sectionTeachingApproach: 'Teaching Approach',
  labelTeachingStyle: 'Teaching style',
  teachingStyleOptions: [
    { value: 'socratic', label: 'Socratic' },
    { value: 'direct', label: 'Direct' },
    { value: 'mixed', label: 'Mixed' },
  ],
  labelExplanationDepth: 'Explanation depth',
  explanationDepthOptions: [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
    { value: 'expert', label: 'Expert' },
  ],
  labelFeedbackTone: 'Feedback tone',
  feedbackToneOptions: [
    { value: 'gentle', label: 'Gentle' },
    { value: 'balanced', label: 'Balanced' },
    { value: 'strict', label: 'Strict' },
  ],
  sectionContentBalance: 'Content Balance',
  labelTheoryVsPractice: 'Theory vs Practice',
  theoryVsPracticeLeft: 'More theory',
  theoryVsPracticeRight: 'More practice',
  labelQuestionFrequency: 'Question frequency',
  questionFrequencyOptions: [
    { value: 'minimal', label: 'Fewer' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'frequent', label: 'Frequent' },
  ],
  labelExampleDensity: 'Example density',
  exampleDensityOptions: [
    { value: 'fewer', label: 'Fewer' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'many', label: 'Many' },
  ],
  labelDiagramFrequency: 'Diagram frequency',
  diagramFrequencyOptions: [
    { value: 'minimal', label: 'Minimal' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'rich', label: 'Rich' },
  ],
  sectionPacingDifficulty: 'Pacing & Difficulty',
  labelPacing: 'Pacing',
  pacingOptions: [
    { value: 'slow', label: 'Slow' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'fast', label: 'Fast' },
  ],
  labelChallengeLevel: 'Challenge level',
  challengeLevelOptions: [
    { value: 'low-stress', label: 'Low Stress' },
    { value: 'balanced', label: 'Balanced' },
    { value: 'high-challenge', label: 'High Challenge' },
  ],
  labelLessonLength: 'Lesson length',
  lessonLengthOptions: [
    { value: 'short', label: 'Short (5-10m)' },
    { value: 'medium', label: 'Medium (15-20m)' },
    { value: 'long', label: 'Long (25-40m)' },
  ],
  labelMasteryThreshold: 'Mastery threshold',
  sectionPracticeRevision: 'Practice & Revision',
  labelPracticeIntensity: 'Practice intensity',
  practiceIntensityOptions: [
    { value: 'light', label: 'Light' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'intense', label: 'Intense' },
  ],
  labelRevisionLoops: 'Revision loops',
  revisionLoopsOptions: [
    { value: 'fewer', label: 'Fewer' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'more', label: 'More' },
  ],
  sectionSourceContent: 'Source & Content Mode',
  labelSourceMode: 'Source mode',
  sourceModeOptions: [
    { value: 'strict', label: 'Strict (Notes Only)' },
    { value: 'enriched', label: 'Notes + Enrichment' },
    { value: 'notes-only', label: 'Notes Structure Only' },
  ],
  sourceModeHint:
    'Strict mode only uses your uploaded material. Enriched mode adds trusted external explanations.',
  sectionStudyGoals: 'Study Goals',
  labelDailyStudyGoal: 'Daily study goal',
  labelExamDate: 'Exam date',
  sectionAiLlm: 'AI & LLM',
  labelOpenAiKey: 'OpenAI API key (stored locally in browser)',
  placeholderOpenAiKey: 'sk-… or set VITE_OPENAI_API_KEY at build time',
  labelModel: 'Model',
  labelApiBaseUrl: 'API base URL (optional, for OpenAI-compatible proxies)',
  placeholderApiBaseUrl: 'https://api.openai.com/v1',
  labelManagedProxyUrl: 'Managed proxy URL (keeps the API key off the browser)',
  placeholderManagedProxyUrl: 'https://your-proxy.example.com/v1',
  managedProxyHint:
    'When set, chat & embeddings route here with no browser key — the proxy injects the secret server-side and can meter managed (paid) usage.',
  labelUseLlm: 'Use LLM for Agent & Feynman',
  useLlmOptions: [
    { value: 'true', label: 'Enabled' },
    { value: 'false', label: 'Offline only' },
  ],
  llmOfflineHint:
    'Without a key, Agent and Feynman use offline templates. Keys never leave your browser except to your chosen API endpoint.',
  labelUseVisionOcr: 'Vision OCR for Greek handwriting & scans',
  visionOcrOptions: [
    { value: 'true', label: 'Enabled' },
    { value: 'false', label: 'Offline OCR only' },
  ],
  visionOcrHint:
    'When enabled, scanned pages and handwritten Greek notes are transcribed by a vision-capable LLM (via your key or local OCR proxy) for far higher accuracy. Falls back to offline Tesseract when unavailable.',
  sectionAccountSync: 'Account & Sync',
  planLabel: 'Plan:',
  upgradePro: 'Upgrade to Pro',
  upgradeTeam: 'Upgrade to Team',
  refreshPlan: 'Refresh plan',
  labelProxyBaseUrl: 'Proxy base URL (auth + library sync)',
  placeholderProxyBaseUrl: 'http://localhost:8787',
  placeholderEmail: 'Email',
  placeholderPassword: 'Password',
  signIn: 'Sign in',
  register: 'Register',
  google: 'Google',
  signOut: 'Sign out',
  pullLibrary: 'Pull library',
  pushLibrary: 'Push library',
  pullProgress: 'Pull progress',
  pushProgress: 'Push progress',
  loggedIn: 'Logged in:',
  sectionGoogleWorkspace: 'Google Workspace',
  sectionInterface: 'Interface',
  labelTheme: 'Theme',
  themeOptions: [
    { value: 'dark', label: 'Dark' },
    { value: 'light', label: 'Light (Warm Sand)' },
    { value: 'spectrum', label: 'Spectrum' },
    { value: 'blueprint', label: 'Blueprint (Option-B)' },
    { value: 'system', label: 'System' },
  ],
  labelLanguage: 'Language',
  languageOptions: [
    { value: 'en', label: 'English' },
    { value: 'el', label: 'Ελληνικά' },
  ],
  sectionDataProgress: 'Data & Progress',
  labelDemoContent: 'Demo showcase content',
  demoContentOptions: [
    { value: 'off', label: 'Hidden' },
    { value: 'on', label: 'Show demo' },
  ],
  demoContentHint:
    'When hidden, only courses and tasks from your uploaded notes appear. Reload after toggling.',
  exportBackup: 'Export backup',
  importBackup: 'Import backup',
  clearLocalData: 'Clear local data',
  sectionDeveloper: 'Developer',
  developerHint: 'Study Workspace load timings — open a course, then review.',
  footerNote:
    'These are your UI preferences. The adaptive engine also learns from your behavior — response time, accuracy, confidence calibration, error patterns, help-seeking rate, and retention over time. It adjusts independently of these settings.',
  signedInAs: 'Signed in as',
  registeredAs: 'Registered',
  authSyncedSuffix: '— library & progress synced',
  signInBeforeUpgrade: 'Sign in before upgrading',
  checkoutUrlMissing: 'Checkout URL missing — check Stripe configuration',
  checkoutFailed: 'Checkout failed',
  planRefreshed: 'Plan refreshed from server',
  refreshFailed: 'Refresh failed',
  loginFailed: 'Login failed',
  registerFailed: 'Register failed',
  libraryPulled: 'Library pulled from server',
  pullFailed: 'Pull failed',
  librarySynced: 'Library synced to server',
  syncFailed: 'Sync failed',
  progressPulled: 'Progress pulled from server',
  sessionPullFailed: 'Session pull failed',
  progressSynced: 'Progress synced to server',
  sessionPushFailed: 'Session push failed',
  exportFailed: 'Export failed',
  deleteFailed: 'Delete failed',
  backupDownloaded: 'Backup downloaded.',
  clearConfirm: 'Clear all Synapse local data? This cannot be undone.',
  formatImported: (count) => `Imported ${count} saved items. Reload to apply everywhere.`,
  formatCleared: (count) => `Cleared ${count} stored items. Reload recommended.`,
  formatAuthStatus: (label, email) => `${label} ${email}`,
  formatAuthStatusSynced: (label, email) => `${label} ${email} — library & progress synced`,
};

const EL: SettingsContent = {
  pageTitle: 'Προτιμήσεις Μάθησης',
  pageSubtitle:
    'Προσάρμοσε πώς σε διδάσκει το Synapse. Αυτές είναι προτιμήσεις UI — το προσαρμοστικό σύστημα μαθαίνει και από τη συμπεριφορά σου.',
  sectionTeachingApproach: 'Προσέγγιση Διδασκαλίας',
  labelTeachingStyle: 'Στυλ διδασκαλίας',
  teachingStyleOptions: [
    { value: 'socratic', label: 'Σωκρατικό' },
    { value: 'direct', label: 'Άμεσο' },
    { value: 'mixed', label: 'Μικτό' },
  ],
  labelExplanationDepth: 'Βάθος εξήγησης',
  explanationDepthOptions: [
    { value: 'beginner', label: 'Αρχάριος' },
    { value: 'intermediate', label: 'Μεσαίο' },
    { value: 'advanced', label: 'Προχωρημένο' },
    { value: 'expert', label: 'Ειδικό' },
  ],
  labelFeedbackTone: 'Τόνος ανατροφοδότησης',
  feedbackToneOptions: [
    { value: 'gentle', label: 'Ήπιο' },
    { value: 'balanced', label: 'Ισορροπημένο' },
    { value: 'strict', label: 'Αυστηρό' },
  ],
  sectionContentBalance: 'Ισορροπία Περιεχομένου',
  labelTheoryVsPractice: 'Θεωρία vs Πράξη',
  theoryVsPracticeLeft: 'Περισσότερη θεωρία',
  theoryVsPracticeRight: 'Περισσότερη πράξη',
  labelQuestionFrequency: 'Συχνότητα ερωτήσεων',
  questionFrequencyOptions: [
    { value: 'minimal', label: 'Λιγότερες' },
    { value: 'moderate', label: 'Μέτριες' },
    { value: 'frequent', label: 'Συχνές' },
  ],
  labelExampleDensity: 'Πυκνότητα παραδειγμάτων',
  exampleDensityOptions: [
    { value: 'fewer', label: 'Λιγότερα' },
    { value: 'moderate', label: 'Μέτρια' },
    { value: 'many', label: 'Πολλά' },
  ],
  labelDiagramFrequency: 'Συχνότητα διαγραμμάτων',
  diagramFrequencyOptions: [
    { value: 'minimal', label: 'Ελάχιστη' },
    { value: 'moderate', label: 'Μέτρια' },
    { value: 'rich', label: 'Πλούσια' },
  ],
  sectionPacingDifficulty: 'Ρυθμός & Δυσκολία',
  labelPacing: 'Ρυθμός',
  pacingOptions: [
    { value: 'slow', label: 'Αργός' },
    { value: 'moderate', label: 'Μέτριος' },
    { value: 'fast', label: 'Γρήγορος' },
  ],
  labelChallengeLevel: 'Επίπεδο πρόκλησης',
  challengeLevelOptions: [
    { value: 'low-stress', label: 'Χαμηλή πίεση' },
    { value: 'balanced', label: 'Ισορροπημένο' },
    { value: 'high-challenge', label: 'Υψηλή πρόκληση' },
  ],
  labelLessonLength: 'Διάρκεια μαθήματος',
  lessonLengthOptions: [
    { value: 'short', label: 'Σύντομο (5-10λ)' },
    { value: 'medium', label: 'Μέτριο (15-20λ)' },
    { value: 'long', label: 'Μεγάλο (25-40λ)' },
  ],
  labelMasteryThreshold: 'Όριο κυριαρχίας',
  sectionPracticeRevision: 'Εξάσκηση & Επανάληψη',
  labelPracticeIntensity: 'Ένταση εξάσκησης',
  practiceIntensityOptions: [
    { value: 'light', label: 'Ελαφριά' },
    { value: 'moderate', label: 'Μέτρια' },
    { value: 'intense', label: 'Έντονη' },
  ],
  labelRevisionLoops: 'Κύκλοι επανάληψης',
  revisionLoopsOptions: [
    { value: 'fewer', label: 'Λιγότεροι' },
    { value: 'moderate', label: 'Μέτριοι' },
    { value: 'more', label: 'Περισσότεροι' },
  ],
  sectionSourceContent: 'Πηγή & Τρόπος Περιεχομένου',
  labelSourceMode: 'Τρόπος πηγής',
  sourceModeOptions: [
    { value: 'strict', label: 'Αυστηρό (Μόνο σημειώσεις)' },
    { value: 'enriched', label: 'Σημειώσεις + εμπλουτισμός' },
    { value: 'notes-only', label: 'Μόνο δομή σημειώσεων' },
  ],
  sourceModeHint:
    'Το αυστηρό mode χρησιμοποιεί μόνο το ανεβασμένο υλικό σου. Το εμπλουτισμένο προσθέτει αξιόπιστες εξωτερικές εξηγήσεις.',
  sectionStudyGoals: 'Στόχοι Μελέτης',
  labelDailyStudyGoal: 'Ημερήσιος στόχος μελέτης',
  labelExamDate: 'Ημερομηνία εξέτασης',
  sectionAiLlm: 'AI & LLM',
  labelOpenAiKey: 'OpenAI API key (αποθηκεύεται τοπικά στον browser)',
  placeholderOpenAiKey: 'sk-… ή VITE_OPENAI_API_KEY κατά το build',
  labelModel: 'Μοντέλο',
  labelApiBaseUrl: 'API base URL (προαιρετικό, για OpenAI-compatible proxies)',
  placeholderApiBaseUrl: 'https://api.openai.com/v1',
  labelManagedProxyUrl: 'Managed proxy URL (κρατά το API key εκτός browser)',
  placeholderManagedProxyUrl: 'https://your-proxy.example.com/v1',
  managedProxyHint:
    'Όταν οριστεί, chat & embeddings περνούν από εδώ χωρίς browser key — το proxy εισάγει το secret server-side και μπορεί να μετρά managed (πληρωμένη) χρήση.',
  labelUseLlm: 'LLM για Agent & Feynman',
  useLlmOptions: [
    { value: 'true', label: 'Ενεργό' },
    { value: 'false', label: 'Μόνο offline' },
  ],
  llmOfflineHint:
    'Χωρίς key, Agent και Feynman χρησιμοποιούν offline templates. Τα keys δεν φεύγουν από τον browser εκτός από το API endpoint που επιλέγεις.',
  labelUseVisionOcr: 'Vision OCR για ελληνικό χειρόγραφο & σαρώσεις',
  visionOcrOptions: [
    { value: 'true', label: 'Ενεργό' },
    { value: 'false', label: 'Μόνο offline OCR' },
  ],
  visionOcrHint:
    'Όταν είναι ενεργό, σαρωμένες σελίδες και χειρόγραφες ελληνικές σημειώσεις μεταγράφονται από vision LLM (μέσω του key σου ή του τοπικού OCR proxy) για πολύ μεγαλύτερη ακρίβεια. Επιστρέφει σε offline Tesseract όταν δεν είναι διαθέσιμο.',
  sectionAccountSync: 'Λογαριασμός & Συγχρονισμός',
  planLabel: 'Πλάνο:',
  upgradePro: 'Αναβάθμιση σε Pro',
  upgradeTeam: 'Αναβάθμιση σε Team',
  refreshPlan: 'Ανανέωση πλάνου',
  labelProxyBaseUrl: 'Proxy base URL (auth + library sync)',
  placeholderProxyBaseUrl: 'http://localhost:8787',
  placeholderEmail: 'Email',
  placeholderPassword: 'Κωδικός',
  signIn: 'Σύνδεση',
  register: 'Εγγραφή',
  google: 'Google',
  signOut: 'Αποσύνδεση',
  pullLibrary: 'Λήψη βιβλιοθήκης',
  pushLibrary: 'Αποστολή βιβλιοθήκης',
  pullProgress: 'Λήψη προόδου',
  pushProgress: 'Αποστολή προόδου',
  loggedIn: 'Συνδεδεμένος:',
  sectionGoogleWorkspace: 'Google Workspace',
  sectionInterface: 'Διεπαφή',
  labelTheme: 'Θέμα',
  themeOptions: [
    { value: 'dark', label: 'Σκούρο' },
    { value: 'light', label: 'Φωτεινό (Warm Sand)' },
    { value: 'spectrum', label: 'Spectrum' },
    { value: 'blueprint', label: 'Blueprint (Option-B)' },
    { value: 'system', label: 'Σύστημα' },
  ],
  labelLanguage: 'Γλώσσα',
  languageOptions: [
    { value: 'en', label: 'English' },
    { value: 'el', label: 'Ελληνικά' },
  ],
  sectionDataProgress: 'Δεδομένα & Πρόοδος',
  labelDemoContent: 'Demo showcase content',
  demoContentOptions: [
    { value: 'off', label: 'Κρυμμένο' },
    { value: 'on', label: 'Εμφάνιση demo' },
  ],
  demoContentHint:
    'Όταν είναι κρυμμένο, εμφανίζονται μόνο μαθήματα και tasks από τις σημειώσεις σου. Κάνε reload μετά την αλλαγή.',
  exportBackup: 'Εξαγωγή backup',
  importBackup: 'Εισαγωγή backup',
  clearLocalData: 'Εκκαθάριση τοπικών δεδομένων',
  sectionDeveloper: 'Developer',
  developerHint: 'Study Workspace load timings — άνοιξε μάθημα και έλεγξε.',
  footerNote:
    'Αυτές είναι οι προτιμήσεις UI σου. Το προσαρμοστικό σύστημα μαθαίνει και από τη συμπεριφορά σου — χρόνο απόκρισης, ακρίβεια, βαθμονόμηση εμπιστοσύνης, μοτίβα λαθών, ζήτηση βοήθειας και retention με τον χρόνο. Προσαρμόζεται ανεξάρτητα από αυτές τις ρυθμίσεις.',
  signedInAs: 'Σύνδεση ως',
  registeredAs: 'Εγγραφή',
  authSyncedSuffix: '— βιβλιοθήκη & πρόοδος συγχρονίστηκαν',
  signInBeforeUpgrade: 'Συνδέσου πριν την αναβάθμιση',
  checkoutUrlMissing: 'Λείπει checkout URL — έλεγξε τη ρύθμιση Stripe',
  checkoutFailed: 'Αποτυχία checkout',
  planRefreshed: 'Το πλάνο ανανεώθηκε από τον server',
  refreshFailed: 'Αποτυχία ανανέωσης',
  loginFailed: 'Αποτυχία σύνδεσης',
  registerFailed: 'Αποτυχία εγγραφής',
  libraryPulled: 'Η βιβλιοθήκη λήφθηκε από τον server',
  pullFailed: 'Αποτυχία λήψης',
  librarySynced: 'Η βιβλιοθήκη συγχρονίστηκε στον server',
  syncFailed: 'Αποτυχία συγχρονισμού',
  progressPulled: 'Η πρόοδος λήφθηκε από τον server',
  sessionPullFailed: 'Αποτυχία λήψης session',
  progressSynced: 'Η πρόοδος συγχρονίστηκε στον server',
  sessionPushFailed: 'Αποτυχία αποστολής session',
  exportFailed: 'Αποτυχία εξαγωγής',
  deleteFailed: 'Αποτυχία διαγραφής',
  backupDownloaded: 'Το backup κατέβηκε.',
  clearConfirm: 'Να διαγραφούν όλα τα τοπικά δεδομένα Synapse; Δεν αναιρείται.',
  formatImported: (count) => `Εισήχθηκαν ${count} αποθηκευμένα στοιχεία. Κάνε reload για εφαρμογή παντού.`,
  formatCleared: (count) => `Διαγράφηκαν ${count} αποθηκευμένα στοιχεία. Συνιστάται reload.`,
  formatAuthStatus: (label, email) => `${label} ${email}`,
  formatAuthStatusSynced: (label, email) => `${label} ${email} — βιβλιοθήκη & πρόοδος συγχρονίστηκαν`,
};

export function getSettingsContent(lang: Lang): SettingsContent {
  return lang === 'el' ? EL : EN;
}
