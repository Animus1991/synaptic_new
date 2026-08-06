/**
 * First-glance "how to use" guidance for every workspace tool.
 * Complements workspaceToolS20Spine (purpose / learnerProblem) and
 * workspaceToolCrossLinks (next tools) with concrete, new-user-friendly steps.
 *
 * Goal: a brand-new user understands what a tool does, how to use it in 3 steps,
 * and what they will get out of it — without hunting.
 */

import type { WorkspaceToolId } from './taskFlows';
import type { BilingualText } from './workspaceToolS20Spine';

export type WorkspaceToolGuide = {
  /** 3 short imperative steps — the minimum to be productive. */
  howTo: BilingualText[];
  /** The concrete outcome a learner walks away with. */
  produces: BilingualText;
};

export const WORKSPACE_TOOL_GUIDE: Record<WorkspaceToolId, WorkspaceToolGuide> = {
  reader: {
    howTo: [
      { en: 'Read the passage for this step, section by section.', el: 'Διάβασε το απόσπασμα για αυτό το βήμα, ενότητα προς ενότητα.' },
      { en: 'Tap a highlighted term to see what it means and keep it in focus.', el: 'Πάτα έναν υπογραμμισμένο όρο για να δεις τι σημαίνει και να μείνει σε εστίαση.' },
      { en: 'Use Study when a section clicks — or Ask Tutor if you get stuck.', el: 'Πάτα Μελέτη όταν μια ενότητα «κουμπώνει» — ή Ρώτα τον βοηθό αν κολλήσεις.' },
    ],
    produces: { en: 'A clear read of your notes before you practice.', el: 'Καθαρή ανάγνωση των σημειώσεών σου πριν την εξάσκηση.' },
  },
  'concept-map': {
    howTo: [
      { en: 'Glance at the map — colors show how solid each idea feels.', el: 'Ρίξε μια ματιά στον χάρτη — τα χρώματα δείχνουν πόσο στέρεη νιώθεις κάθε ιδέα.' },
      { en: 'Tap an idea to focus it — drag only moves it (won’t jump your notes).', el: 'Πάτα μια ιδέα για εστίαση — το σύρσιμο μόνο τη μετακινεί (χωρίς άλμα στις σημειώσεις).' },
      { en: 'Drag the idea cards to arrange them your way — we save the layout.', el: 'Σύρε τις κάρτες ιδεών όπως σου βολεύει — αποθηκεύουμε τη διάταξη.' },
    ],
    produces: { en: 'A clear picture of how the ideas fit together.', el: 'Καθαρή εικόνα για το πώς ταιριάζουν οι ιδέες μεταξύ τους.' },
  },
  scratchpad: {
    howTo: [
      { en: 'Type a formula (or paste one from your notes).', el: 'Γράψε έναν τύπο (ή επικόλλησε από τις σημειώσεις).' },
      { en: 'Fill in the numbers for each letter.', el: 'Βάλε τις τιμές για κάθε γράμμα.' },
      { en: 'Tap check — good steps light up green.', el: 'Πάτα έλεγχο — τα σωστά βήματα γίνονται πράσινα.' },
    ],
    produces: {
      en: 'A clear walkthrough you can trust before the exam.',
      el: 'Καθαρή λύση που μπορείς να εμπιστευτείς πριν την εξέταση.',
    },
  },
  whiteboard: {
    howTo: [
      { en: 'Start drawing — the board is yours.', el: 'Ξεκίνα να σχεδιάζεις — ο πίνακας είναι δικός σου.' },
      { en: 'Pull labels or formulas from your notes when you need them.', el: 'Τράβα ετικέτες ή τύπους από τις σημειώσεις όταν τους χρειάζεσαι.' },
      { en: 'Open the drawing guide to see what to include next.', el: 'Άνοιξε τον οδηγό σχεδίου για να δεις τι να βάλεις μετά.' },
    ],
    produces: { en: 'A sketch that shows you can rebuild the idea from memory.', el: 'Ένα σκίτσο που δείχνει ότι ξαναχτίζεις την ιδέα από μνήμη.' },
  },
  leitner: {
    howTo: [
      { en: 'Tap a card, try to recall the answer, then flip to check.', el: 'Πάτα μια κάρτα, προσπάθησε να θυμηθείς, και γύρισέ την για έλεγχο.' },
      { en: 'Rate how it felt: Again, Hard, Good, or Easy.', el: 'Βαθμολόγησε πώς σου φάνηκε: Ξανά, Δύσκολο, Καλό ή Εύκολο.' },
      { en: 'Harder cards come back sooner — easier ones wait longer.', el: 'Οι δύσκολες επανέρχονται νωρίτερα — οι εύκολες περιμένουν περισσότερο.' },
    ],
    produces: { en: 'Terms that stick when you need them on exam day.', el: 'Όροι που μένουν όταν τους χρειαστείς την ημέρα της εξέτασης.' },
  },
  feynman: {
    howTo: [
      { en: 'Write as if you are teaching a curious beginner — no unexplained jargon.', el: 'Γράψε σαν να διδάσκεις έναν περίεργο αρχάριο — χωρίς ανεξήγητο jargon.' },
      { en: 'Tap Check my explanation to see what is clear and what is missing.', el: 'Πάτα «Έλεγξε την εξήγησή μου» για να δεις τι είναι καθαρό και τι λείπει.' },
      { en: 'Open the gaps in Reader, fix them in your draft, then save a report if you want.', el: 'Άνοιξε τα κενά στον Reader, διόρθωσέ τα στο κείμενο, και αποθήκευσε αναφορά αν θες.' },
    ],
    produces: { en: 'An explanation you can actually say out loud on exam day.', el: 'Μια εξήγηση που μπορείς πραγματικά να πεις δυνατά την ημέρα της εξέτασης.' },
  },
  quiz: {
    howTo: [
      { en: 'Pick the answer that best matches your notes.', el: 'Διάλεξε την απάντηση που ταιριάζει καλύτερα στις σημειώσεις σου.' },
      { en: 'Say how sure you felt — honest ratings make the next questions fairer.', el: 'Πες πόσο σίγουρος ήσουν — οι ειλικρινείς βαθμοί κάνουν τις επόμενες ερωτήσεις πιο δίκαιες.' },
      { en: 'Open mistakes in Reader, or jump to Flashcards / Feynman to fix them.', el: 'Άνοιξε τα λάθη στον Reader, ή πήγαινε σε Κάρτες / Feynman για να τα διορθώσεις.' },
    ],
    produces: { en: 'A clear picture of what you can recall under a little pressure.', el: 'Μια καθαρή εικόνα για το τι μπορείς να ανακαλέσεις με λίγη πίεση.' },
  },
  simulator: {
    howTo: [
      { en: 'Pick a preset or drag the sliders to try a what-if.', el: 'Διάλεξε προεπιλογή ή σύρε τους διακόπτες για ένα «τι θα γινόταν αν».' },
      { en: 'Watch the graph and numbers update as you move them.', el: 'Δες το γράφημα και τους αριθμούς να αλλάζουν καθώς κινείς.' },
      { en: 'Start a timed block when you want exam-style practice.', el: 'Ξεκίνα χρονισμένο μπλοκ όταν θες εξάσκηση τύπου εξέτασης.' },
    ],
    produces: { en: 'A feel for how each change moves the result.', el: 'Αίσθηση για το πώς κάθε αλλαγή κινεί το αποτέλεσμα.' },
  },
  compare: {
    howTo: [
      { en: 'Scan the table — two ideas sit in columns side by side.', el: 'Σάρωσε τον πίνακα — δύο ιδέες στις στήλες δίπλα-δίπλα.' },
      { en: 'Tap Highlight differences to see what actually changes.', el: 'Πάτα «Δείξε διαφορές» για να δεις τι πραγματικά αλλάζει.' },
      { en: 'Tap a row when you want to open it in your notes or ask the Tutor.', el: 'Πάτα μια σειρά όταν θες να την ανοίξεις στις σημειώσεις ή να ρωτήσεις τον βοηθό.' },
    ],
    produces: { en: 'A clear picture of what separates two easy-to-mix ideas.', el: 'Καθαρή εικόνα για το τι χωρίζει δύο εύκολα μπερδεμένες ιδέες.' },
  },
  debate: {
    howTo: [
      { en: 'Pick a claim from your material.', el: 'Διάλεξε έναν ισχυρισμό από το υλικό σου.' },
      { en: 'Read its support and the counter-arguments.', el: 'Διάβασε την τεκμηρίωση και τα αντεπιχειρήματα.' },
      { en: 'Write your own rebuttal — it is saved.', el: 'Γράψε τη δική σου αντίκρουση — αποθηκεύεται.' },
    ],
    produces: { en: 'Understanding that survives challenge, not just recall.', el: 'Κατανόηση που αντέχει στην αμφισβήτηση, όχι απλή ανάκληση.' },
  },
  timer: {
    howTo: [
      { en: 'Pick Focus or Exam, then choose a length.', el: 'Διάλεξε Εστίαση ή Εξέταση, μετά διάρκεια.' },
      { en: 'Tap Start and stay with the material until it rings.', el: 'Πάτα Έναρξη και μείνε στο υλικό μέχρι να χτυπήσει.' },
      { en: 'On a break, review a few cards if you like.', el: 'Στο διάλειμμα, κάνε λίγες κάρτες αν θες.' },
    ],
    produces: { en: 'Steady focus blocks with a clear sense of exam time left.', el: 'Σταθερά μπλοκ εστίασης με καθαρή αίσθηση χρόνου μέχρι την εξέταση.' },
  },
  annotations: {
    howTo: [
      { en: 'Tap Highlight, then select words or a whole line.', el: 'Πάτα Επισήμανση, μετά επίλεξε λέξεις ή ολόκληρη γραμμή.' },
      { en: 'Add a margin note or pin on anything confusing.', el: 'Πρόσθεσε σημείωση περιθωρίου ή καρφίτσα σε ό,τι σε μπερδεύει.' },
      { en: 'Open your marks from the side list whenever you need them.', el: 'Άνοιξε τις σημειώσεις σου από τη λίστα στο πλάι όποτε τις χρειάζεσαι.' },
    ],
    produces: { en: 'A personal layer of marks on top of your material.', el: 'Ένα προσωπικό στρώμα σημειώσεων πάνω στο υλικό σου.' },
  },
  dashboard: {
    howTo: [
      { en: 'Check your exam readiness ring and today’s study time.', el: 'Δες τον δακτύλιο ετοιμότητας και τον χρόνο μελέτης σήμερα.' },
      { en: 'Open Weak to pick a spot that needs work.', el: 'Άνοιξε τα Αδύναμα για να διαλέξεις τι χρειάζεται δουλειά.' },
      { en: 'Tap the suggested next step when you are ready.', el: 'Πάτα το προτεινόμενο επόμενο βήμα όταν είσαι έτοιμος/η.' },
    ],
    produces: { en: 'Always knowing what to study next, and why.', el: 'Να ξέρεις πάντα τι να μελετήσεις μετά, και γιατί.' },
  },
};

export function getToolGuide(toolId: WorkspaceToolId): WorkspaceToolGuide {
  return WORKSPACE_TOOL_GUIDE[toolId];
}

export function toolHowToSteps(toolId: WorkspaceToolId, lang: 'en' | 'el'): string[] {
  return WORKSPACE_TOOL_GUIDE[toolId].howTo.map((s) => (lang === 'el' ? s.el : s.en));
}

export function toolProduces(toolId: WorkspaceToolId, lang: 'en' | 'el'): string {
  const p = WORKSPACE_TOOL_GUIDE[toolId].produces;
  return lang === 'el' ? p.el : p.en;
}
