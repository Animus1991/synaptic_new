export type LessonStepKey =
  | 'intro'
  | 'explanation'
  | 'example'
  | 'misconception'
  | 'practice'
  | 'quiz'
  | 'summary';

export type LessonStepDef = { key: LessonStepKey; label: string };

export type QuizDef = {
  question: string;
  options: string[];
  correctIndex: number;
};

const STEP_LABELS: Record<Lang, Record<LessonStepKey, string>> = {
  en: {
    intro: 'Introduction',
    explanation: 'Core Concept',
    example: 'Example',
    misconception: 'Common Mistakes',
    practice: 'Practice',
    quiz: 'Check',
    summary: 'Summary',
  },
  el: {
    intro: 'Εισαγωγή',
    explanation: 'Βασική Έννοια',
    example: 'Παράδειγμα',
    misconception: 'Συχνά Λάθη',
    practice: 'Εξάσκηση',
    quiz: 'Έλεγχος',
    summary: 'Περίληψη',
  },
};

export function lessonStepLabel(key: LessonStepKey, lang: Lang): string {
  return STEP_LABELS[lang][key];
}

const QUIZ_MARKET: Record<Lang, QuizDef> = {
  en: {
    question: 'In Bertrand competition with identical products, the equilibrium price is:',
    options: ['Above marginal cost', 'Equal to marginal cost', 'Equal to average total cost', 'Zero'],
    correctIndex: 1,
  },
  el: {
    question: 'Στον ανταγωνισμό Bertrand με ίδια προϊόντα, η τιμή ισορροπίας είναι:',
    options: ['Πάνω από το οριακό κόστος', 'Ίση με το οριακό κόστος', 'Ίση με το μέσο συνολικό κόστος', 'Μηδέν'],
    correctIndex: 1,
  },
};

const QUIZ_ELASTIC: Record<Lang, QuizDef> = {
  en: {
    question: 'Price elasticity of demand measures:',
    options: [
      'Absolute change in price',
      'Percentage change in quantity / percentage change in price',
      'Total revenue only',
      'Consumer surplus',
    ],
    correctIndex: 1,
  },
  el: {
    question: 'Η ελαστικότητα ζήτησης ως προς την τιμή μετρά:',
    options: [
      'Απόλυτη μεταβολή τιμής',
      '% μεταβολή ποσότητας / % μεταβολή τιμής',
      'Μόνο συνολικά έσοδα',
      'Πλεόνασμα καταναλωτή',
    ],
    correctIndex: 1,
  },
};

const QUIZ_PANDAS: Record<Lang, QuizDef> = {
  en: {
    question: 'Which pandas method groups rows and applies aggregation?',
    options: ['merge()', 'groupby()', 'pivot()', 'concat()'],
    correctIndex: 1,
  },
  el: {
    question: 'Ποια μέθοδος pandas ομαδοποιεί γραμμές και εφαρμόζει aggregation;',
    options: ['merge()', 'groupby()', 'pivot()', 'concat()'],
    correctIndex: 1,
  },
};

export function quizForConcept(concept: string, lang: Lang): QuizDef {
  const c = concept.toLowerCase();
  if (c.includes('bertrand') || c.includes('cournot') || c.includes('oligopoly') || c.includes('market')) {
    return QUIZ_MARKET[lang];
  }
  if (c.includes('elastic')) return QUIZ_ELASTIC[lang];
  if (c.includes('pandas') || c.includes('groupby')) return QUIZ_PANDAS[lang];
  return {
    question: lang === 'el'
      ? `Ποια πρόταση περιγράφει καλύτερα την έννοια «${concept}»;`
      : `Which statement best describes ${concept}?`,
    options: lang === 'el'
      ? ['Ο βασικός ορισμός από το υλικό σου', 'Άσχετη έννοια', 'Το αντίθετο της σωστής ιδέας', 'Ισχύει μόνο σε edge cases']
      : ['The core definition from your material', 'An unrelated concept', 'The opposite of the correct idea', 'Only applies in edge cases'],
    correctIndex: 0,
  };
}

export type WorkspaceStep = { title: string; type: string };

export function workspaceStepsForConcept(concept: string, lang: Lang): WorkspaceStep[] {
  if (lang === 'el') {
    return [
      { title: `Δύο μοντέλα ${concept}`, type: 'Βασική Έννοια' },
      { title: 'Cournot: Ανταγωνισμός Ποσότητας', type: 'Εμβάθυνση' },
      { title: 'Bertrand: Ανταγωνισμός Τιμής', type: 'Εμβάθυνση' },
      { title: 'Το Παράδοξο Bertrand', type: 'Βασική Ιδέα' },
      { title: 'Εργαζόμενο Παράδειγμα', type: 'Εξάσκηση' },
      { title: 'Έλεγχος Γνώσεων', type: 'Κουίζ' },
    ];
  }
  return [
    { title: `Two Models of ${concept}`, type: 'Core Concept' },
    { title: 'Cournot: Quantity Competition', type: 'Deep Dive' },
    { title: 'Bertrand: Price Competition', type: 'Deep Dive' },
    { title: 'The Bertrand Paradox', type: 'Key Insight' },
    { title: 'Worked Example', type: 'Practice' },
    { title: 'Knowledge Check', type: 'Quiz' },
  ];
}

export type LandingFeature = { title: string; desc: string };
export type LandingUserType = { label: string; desc: string };
export type LandingStep = { num: string; title: string; desc: string };

export type DiffItem = { wrong: string; right: string };

export type LandingContent = {
  badge: string;
  heroTitle: string;
  heroHighlight: string;
  heroSubtitle: string;
  ctaPrimary: string;
  ctaSecondary: string;
  trust: string[];
  features: LandingFeature[];
  userTypes: LandingUserType[];
  steps: LandingStep[];
  getStarted: string;
  howItWorksTitle: string;
  howItWorksSubtitle: string;
  featuresSectionTitle: string;
  featuresSectionSubtitle: string;
  diffTitle: string;
  diffSubtitle: string;
  diffItems: DiffItem[];
  testimonialQuote: string;
  testimonialAuthor: string;
  ctaTitle: string;
  ctaSubtitle: string;
  ctaButton: string;
  footerTagline: string;
};

const LANDING: Record<Lang, LandingContent> = {
  en: {
    badge: 'AI-Powered Adaptive Learning Platform',
    heroTitle: 'From Static Notes to',
    heroHighlight: 'Adaptive Tutoring',
    heroSubtitle:
      'Upload your notes, PDFs, or slides. The AI builds a personalized interactive tutor-course — then discovers how you actually learn through your behavior, errors, and progress.',
    ctaPrimary: 'Start Learning Now',
    ctaSecondary: 'See Demo',
    getStarted: 'Get Started',
    trust: ['No credit card required', 'Works with any subject', 'Source-grounded AI'],
    features: [
      { title: 'Upload Anything', desc: 'PDFs, slides, notes, images, code files, lecture transcripts — the AI handles it all.' },
      { title: 'AI Course Generation', desc: 'Automatically extracts topics, concepts, prerequisites, and builds a structured learning path.' },
      { title: 'Adaptive Tutoring', desc: 'The system learns how you learn — adjusting pace, depth, and practice based on real behavior.' },
      { title: 'Interactive Practice', desc: 'Quizzes, coding challenges, Socratic dialogues, exam simulations, and problem-solving loops.' },
      { title: 'Spaced Repetition', desc: 'Scientifically-timed reviews based on your forgetting curve and retention predictions.' },
      { title: 'Learning Analytics', desc: 'See mastery maps, weak spots, error patterns, misconceptions, and predicted retention.' },
    ],
    userTypes: [
      { label: 'University Students', desc: 'Turn lecture notes into exam-ready courses' },
      { label: 'High School Students', desc: 'Structured tutoring and exam preparation' },
      { label: 'Self-Learners', desc: 'Learn anything from your own materials' },
      { label: 'Tutors & Teachers', desc: 'Generate interactive lessons instantly' },
      { label: 'Companies', desc: 'Transform manuals into training modules' },
    ],
    steps: [
      { num: '01', title: 'Upload Your Material', desc: 'Drop your notes, PDFs, slides, or paste any content.' },
      { num: '02', title: 'AI Analyzes & Structures', desc: 'Topics, concepts, prerequisites, gaps — all extracted automatically.' },
      { num: '03', title: 'Learn Interactively', desc: 'Step-by-step lessons, practice, quizzes, and Socratic tutoring.' },
      { num: '04', title: 'Adapt & Master', desc: 'The platform discovers how you learn and optimizes your path.' },
    ],
    howItWorksTitle: 'How It Works',
    howItWorksSubtitle: 'Four simple steps from raw material to mastery',
    featuresSectionTitle: 'Everything You Need to Master Any Subject',
    featuresSectionSubtitle: 'Powered by cognitive science, not gimmicks',
    diffTitle: 'Not Just Another AI Chat',
    diffSubtitle: "Synapse doesn't guess how you learn. It discovers it through your behavior.",
    diffItems: [
      { wrong: '❌ Fixed "learning styles" (visual/auditory)', right: '✅ Evidence-based adaptive model from real behavior' },
      { wrong: '❌ Generic AI chat with no structure', right: '✅ Full interactive course with mastery tracking' },
      { wrong: '❌ Flashcards only or summaries only', right: '✅ Lessons, quizzes, practice, Socratic tutoring, exam prep' },
      { wrong: '❌ Hallucinated content without sources', right: '✅ Source-grounded with citation verification' },
      { wrong: '❌ One-size-fits-all pacing', right: '✅ Adapts difficulty, depth, and pace to your errors' },
      { wrong: '❌ Passive reading without recall', right: '✅ Anti-passive learning with active recall prompts' },
    ],
    testimonialQuote:
      "I uploaded my entire semester's notes and Synapse turned them into an interactive course that actually taught me better than re-reading ever could. I went from a C to an A.",
    testimonialAuthor: 'Sarah K. · Economics Major, University of Amsterdam',
    ctaTitle: 'Ready to Transform How You Learn?',
    ctaSubtitle: 'Upload your first document and experience AI-powered adaptive tutoring in minutes.',
    ctaButton: 'Get Started Free',
    footerTagline: '© 2026 Synapse Learning. From static notes to adaptive tutoring.',
  },
  el: {
    badge: 'Πλατφόρμα Προσαρμοστικής Μάθησης με AI',
    heroTitle: 'Από στατικές σημειώσεις σε',
    heroHighlight: 'Προσαρμοστική Διδασκαλία',
    heroSubtitle:
      'Ανέβασε σημειώσεις, PDF ή διαφάνειες. Το AI δημιουργεί εξατομικευμένο διαδραστικό μάθημα — και μαθαίνει πώς μαθαίνεις εσύ από τη συμπεριφορά, τα λάθη και την πρόοδό σου.',
    ctaPrimary: 'Ξεκίνα Τώρα',
    ctaSecondary: 'Δες Demo',
    getStarted: 'Ξεκίνα',
    trust: ['Χωρίς πιστωτική κάρτα', 'Για κάθε αντικείμενο', 'AI με βάση τις πηγές σου'],
    features: [
      { title: 'Ανέβασμα Οτιδήποτε', desc: 'PDF, slides, σημειώσεις, εικόνες, κώδικας, transcripts — το AI τα χειρίζεται όλα.' },
      { title: 'Δημιουργία Μαθήματος', desc: 'Εξαγωγή θεμάτων, εννοιών, προαπαιτούμενων και δομημένης διαδρομής μάθησης.' },
      { title: 'Προσαρμοστική Διδασκαλία', desc: 'Το σύστημα προσαρμόζει ρυθμό, βάθος και εξάσκηση από τη συμπεριφορά σου.' },
      { title: 'Διαδραστική Εξάσκηση', desc: 'Κουίζ, coding, Socratic διάλογος, προσομοίωση εξετάσεων και loops επίλυσης.' },
      { title: 'Spaced Repetition', desc: 'Επιστημονικά χρονομετρημένες επαναλήψεις με βάση την καμπύλη λήθης.' },
      { title: 'Αναλυτικά Μάθησης', desc: 'Χάρτες mastery, αδύναμα σημεία, λάθη, παρανοήσεις και πρόβλεψη retention.' },
    ],
    userTypes: [
      { label: 'Φοιτητές Πανεπιστημίου', desc: 'Μετέτρεψε σημειώσεις σε ετοιμότητα εξετάσεων' },
      { label: 'Μαθητές Λυκείου', desc: 'Δομημένη διδασκαλία και προετοιμασία εξετάσεων' },
      { label: 'Αυτοδίδακτοι', desc: 'Μάθε οτιδήποτε από δικό σου υλικό' },
      { label: 'Καθηγητές & Tutors', desc: 'Δημιούργησε διαδραστικά μαθήματα άμεσα' },
      { label: 'Εταιρείες', desc: 'Μετέτρεψε εγχειρίδια σε εκπαιδευτικά modules' },
    ],
    steps: [
      { num: '01', title: 'Ανέβασε Υλικό', desc: 'Σημειώσεις, PDF, slides ή επικόλληση περιεχομένου.' },
      { num: '02', title: 'AI Ανάλυση & Δομή', desc: 'Θέματα, έννοιες, προαπαιτούμενα — αυτόματη εξαγωγή.' },
      { num: '03', title: 'Μάθε Διαδραστικά', desc: 'Βήμα-βήμα μαθήματα, εξάσκηση, κουίζ και Socratic tutoring.' },
      { num: '04', title: 'Προσαρμογή & Κατάκτηση', desc: 'Η πλατφόρμα βελτιστοποιεί τη διαδρομή σου.' },
    ],
    howItWorksTitle: 'Πώς Λειτουργεί',
    howItWorksSubtitle: 'Τέσσερα απλά βήματα από το υλικό σου στην κατάκτηση',
    featuresSectionTitle: 'Ό,τι Χρειάζεσαι για Κάθε Αντικείμενο',
    featuresSectionSubtitle: 'Βασισμένο σε γνωστική επιστήμη, όχι gimmicks',
    diffTitle: 'Όχι Ακόμα ένα AI Chat',
    diffSubtitle: 'Το Synapse δεν μαντεύει πώς μαθαίνεις — το ανακαλύπτει από τη συμπεριφορά σου.',
    diffItems: [
      { wrong: '❌ Σταθερά «learning styles» (visual/auditory)', right: '✅ Προσαρμοστικό μοντέλο από πραγματική συμπεριφορά' },
      { wrong: '❌ Γενικό AI chat χωρίς δομή', right: '✅ Πλήρες διαδραστικό μάθημα με mastery tracking' },
      { wrong: '❌ Μόνο flashcards ή summaries', right: '✅ Μαθήματα, κουίζ, εξάσκηση, Socratic tutoring, exam prep' },
      { wrong: '❌ Hallucinations χωρίς πηγές', right: '✅ Source-grounded με επαλήθευση citations' },
      { wrong: '❌ Ίδιος ρυθμός για όλους', right: '✅ Προσαρμογή δυσκολίας, βάθους και ρυθμού στα λάθη σου' },
      { wrong: '❌ Παθητική ανάγνωση χωρίς recall', right: '✅ Active recall prompts — anti-passive learning' },
    ],
    testimonialQuote:
      'Ανέβασα όλες τις σημειώσεις του εξαμήνου και το Synapse τις έκανε διαδραστικό μάθημα που με δίδαξε καλύτερα από το ξαναδιάβασμα. Πήγα από C σε A.',
    testimonialAuthor: 'Sarah K. · Οικονομικά, Πανεπιστήμιο Amsterdam',
    ctaTitle: 'Έτοιμος να Αλλάξεις τον Τρόπο που Μαθαίνεις;',
    ctaSubtitle: 'Ανέβασε το πρώτο σου έγγραφο και δοκίμασε προσαρμοστική διδασκαλία με AI σε λίγα λεπτά.',
    ctaButton: 'Ξεκίνα Δωρεάν',
    footerTagline: '© 2026 Synapse Learning. Από στατικές σημειώσεις σε προσαρμοστική διδασκαλία.',
  },
};

export function getLandingContent(lang: Lang): LandingContent {
  return LANDING[lang];
}

export const FEYNMAN_OUTLINE: Record<Lang, string[]> = {
  en: [
    'What is the core idea?',
    'Why does it matter economically?',
    'How does Cournot differ from Bertrand?',
    'Give one real-world example.',
  ],
  el: [
    'Ποια είναι η βασική ιδέα;',
    'Γιατί έχει οικονομική σημασία;',
    'Πώς διαφέρει το Cournot από το Bertrand;',
    'Δώσε ένα πραγματικό παράδειγμα.',
  ],
};

export const FEYNMAN_PLACEHOLDER: Record<Lang, string> = {
  en: 'Explain Cournot vs Bertrand competition in your own words...',
  el: 'Εξήγησε τον ανταγωνισμό Cournot vs Bertrand με δικά σου λόγια...',
};
