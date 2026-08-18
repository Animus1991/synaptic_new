import type { AgentMode } from '../types';
import type { Lang } from './i18n';

function clipTopic(raw: string): string {
  const base = raw.trim();
  return base.length > 60 ? `${base.slice(0, 60)}…` : base;
}

const EN: Record<AgentMode, (topic: string) => string> = {
  socratic: (topic) =>
    `You asked about **"${topic}"**.\n\nBefore I explain directly: **what do you already know?** What would you predict if one variable changes?\n\nName your assumptions — I'll guide you through your own reasoning.`,
  direct: (topic) =>
    `**Direct explanation** for "${topic}":\n\n1. Identify core variables\n2. Apply the relevant framework\n3. Check boundary conditions\n\nWant a practice question to verify understanding?`,
  beginner: (topic) =>
    `**Beginner path** for "${topic}":\n\nStart with the everyday meaning, then the classroom definition, then one tiny example.\n\nIf a word feels new, pause and restate it in your own words before we add the next piece.`,
  'exam-coach': (topic) =>
    `**Exam coach** for "${topic}":\n\nTypical prompt: define → apply → contrast a trap.\nWrite a 4-sentence model answer, then list two mistakes markers look for.\n\nTime-box: 8 minutes, then check your structure.`,
  'deep-theory': (topic) =>
    `**Deep theory** for "${topic}":\n\n1. Precise definition and hidden assumptions\n2. Mechanism (what causes what)\n3. Edge cases that break the naive version\n\nWhich assumption do you want to stress-test first?`,
  practical: (topic) =>
    `**Practical drill** for "${topic}":\n\nDo one worked step now: write the inputs, the operation, and the expected output.\nThen change one input and predict the new result.\n\nBring the attempt back and we'll debug it.`,
  'error-diagnosis': (topic) =>
    `**Error diagnosis** for "${topic}":\n\nTell me the wrong answer and what you thought was true.\nI'll classify it as conceptual, procedural, or recall — then give one fix of that type only.`,
  feynman: (topic) =>
    `**Feynman check** for "${topic}":\n\nExplain it in 2–3 sentences as if teaching a friend. I'll highlight gaps in mechanism, example, and contrast.`,
  debate: (topic) =>
    `**Debate** on "${topic}":\n\nGive your claim in one sentence. I'll reply with the strongest counter-argument and the evidence I'd demand.\n\nThen you rebut — no new jargon, only reasons.`,
  'oral-exam': (topic) =>
    `**Oral exam** on "${topic}":\n\nQuestion 1 (60 seconds): define it without notes.\nQuestion 2: give one example and one limitation.\n\nAnswer out loud, then type your best sentence.`,
  'math-tutor': (topic) =>
    `**Math tutor** for "${topic}":\n\nWrite the first algebraic step only. I'll check the equality, then we'll do the next step.\n\nIf you are stuck, name the unknown and the given.`,
  'coding-tutor': (topic) =>
    `**Coding tutor** for "${topic}":\n\nPaste the smallest failing snippet (or describe the function signature).\nI'll suggest one fix and one follow-up exercise — not a full rewrite.`,
  'writing-coach': (topic) =>
    `**Writing coach** for "${topic}":\n\nDraft a 3-part outline: claim, evidence, so-what.\nI'll mark where the argument jumps and where a reader needs a definition.`,
  'memory-coach': (topic) =>
    `**Memory coach** for "${topic}":\n\nClose the notes. Recall 3 facts, then check.\nSchedule: today, +1 day, +3 days. Mark any fact you could not retrieve — that is the next card.`,
  motivation: (topic) =>
    `**Focus coach** for "${topic}":\n\nNext 12 minutes: one concrete action (read one section, or write 5 flashcards).\nAfter that, stop. Message me what you finished — we'll pick the next small step.`,
};

const EL: Record<AgentMode, (topic: string) => string> = {
  socratic: (topic) =>
    `Ρώτησες για **«${topic}»**.\n\nΠριν εξηγήσω απευθείας: **τι ξέρεις ήδη;** Τι θα προέβλεπες αν άλλαζε μία μεταβλητή;\n\nΠες μου τις παραδοχές σου — θα σε καθοδηγήσω μέσα από τη δική σου σκέψη.`,
  direct: (topic) =>
    `**Άμεση εξήγηση** για «${topic}»:\n\n1. Εντόπισε τις βασικές μεταβλητές\n2. Εφάρμοσε το σχετικό πλαίσιο\n3. Έλεγξε τις οριακές συνθήκες\n\nΘες μια ερώτηση εξάσκησης για επιβεβαίωση κατανόησης;`,
  beginner: (topic) =>
    `**Διαδρομή αρχαρίου** για «${topic}»:\n\nΞεκίνα από την καθημερινή σημασία, μετά τον ορισμό του μαθήματος, μετά ένα μικρό παράδειγμα.\n\nΑν μια λέξη είναι καινούργια, πες την με δικά σου λόγια πριν προσθέσουμε το επόμενο κομμάτι.`,
  'exam-coach': (topic) =>
    `**Exam coach** για «${topic}»:\n\nΤυπικό θέμα: όρισε → εφάρμοσε → αντιπαράβαλε μια παγίδα.\nΓράψε απάντηση 4 προτάσεων και δύο λάθη που ψάχνει ο διορθωτής.\n\nΧρόνος: 8 λεπτά, μετά έλεγξε τη δομή.`,
  'deep-theory': (topic) =>
    `**Βαθιά θεωρία** για «${topic}»:\n\n1. Ακριβής ορισμός και κρυφές παραδοχές\n2. Μηχανισμός (τι προκαλεί τι)\n3. Οριακές περιπτώσεις που σπάνε την απλοϊκή εκδοχή\n\nΠοια παραδοχή θέλεις να δοκιμάσουμε πρώτα;`,
  practical: (topic) =>
    `**Πρακτική άσκηση** για «${topic}»:\n\nΚάνε ένα βήμα τώρα: γράψε εισόδους, πράξη και αναμενόμενο αποτέλεσμα.\nΆλλαξε μία είσοδο και προέβλεψε το νέο αποτέλεσμα.\n\nΦέρε την προσπάθεια και θα τη διορθώσουμε.`,
  'error-diagnosis': (topic) =>
    `**Διάγνωση σφάλματος** για «${topic}»:\n\nΠες μου τη λάθος απάντηση και τι νόμιζες ότι ισχύει.\nΘα το ταξινομήσω ως εννοιολογικό, διαδικαστικό ή ανάκλησης — και θα δώσω μία διόρθωση αυτού του τύπου.`,
  feynman: (topic) =>
    `**Έλεγχος Feynman** για «${topic}»:\n\nΕξήγησέ το σε 2–3 προτάσεις σαν να διδάσκεις έναν φίλο. Θα επισημάνω κενά σε μηχανισμό, παράδειγμα και αντιπαραβολή.`,
  debate: (topic) =>
    `**Συζήτηση** για «${topic}»:\n\nΔώσε τον ισχυρισμό σου σε μία πρόταση. Θα απαντήσω με το ισχυρότερο αντίθετο επιχείρημα και τα τεκμήρια που θα ζητούσα.\n\nΜετά αντέκρουσε — μόνο λόγοι, χωρίς νέα ορολογία.`,
  'oral-exam': (topic) =>
    `**Προφορική εξέταση** για «${topic}»:\n\nΕρώτηση 1 (60"): όρισέ το χωρίς σημειώσεις.\nΕρώτηση 2: ένα παράδειγμα και ένας περιορισμός.\n\nΑπάντησε φωναχτά και γράψε την καλύτερη πρόταση.`,
  'math-tutor': (topic) =>
    `**Math tutor** για «${topic}»:\n\nΓράψε μόνο το πρώτο αλγεβρικό βήμα. Θα ελέγξω την ισότητα και μετά το επόμενο.\n\nΑν κόλλησες, πες το άγνωστο και τα δεδομένα.`,
  'coding-tutor': (topic) =>
    `**Coding tutor** για «${topic}»:\n\nΚόλλησε το μικρότερο αποτυχημένο απόσπασμα (ή την υπογραφή της συνάρτησης).\nΘα προτείνω μία διόρθωση και μία άσκηση συνέχεια — όχι ολόκληρη ξαναγραφή.`,
  'writing-coach': (topic) =>
    `**Writing coach** για «${topic}»:\n\nΣχεδίασε περίγραμμα 3 μερών: ισχυρισμός, τεκμήριο, σημασία.\nΘα σημειώσω πού πηδάει το επιχείρημα και πού χρειάζεται ορισμός.`,
  'memory-coach': (topic) =>
    `**Memory coach** για «${topic}»:\n\nΚλείσε τις σημειώσεις. Ανάκλησε 3 γεγονότα και έλεγξε.\nΠρόγραμμα: σήμερα, +1 μέρα, +3 μέρες. Ό,τι δεν ήρθε είναι η επόμενη κάρτα.`,
  motivation: (topic) =>
    `**Focus coach** για «${topic}»:\n\nΕπόμενα 12 λεπτά: μία συγκεκριμένη ενέργεια (ένα κεφάλαιο ή 5 κάρτες).\nΜετά σταμάτα. Πες μου τι τελείωσες — διαλέγουμε το επόμενο μικρό βήμα.`,
};

export function offlineAgentReply(
  input: string,
  mode: AgentMode,
  lang: Lang = 'en',
  topicHint?: string,
): string {
  const topic = clipTopic(topicHint || input);
  const table = lang === 'el' ? EL : EN;
  return (table[mode] ?? table.direct)(topic);
}

export function offlineAgentModeCovered(mode: AgentMode): boolean {
  return mode in EN && mode in EL;
}
