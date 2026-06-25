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
      { en: 'Read the source text, section by section.', el: 'Διάβασε το κείμενο πηγής, ενότητα προς ενότητα.' },
      { en: 'Click a highlighted term to see its meaning and focus it everywhere.', el: 'Κάνε κλικ σε υπογραμμισμένο όρο για επεξήγηση και εστίαση παντού.' },
      { en: 'Mark passages as understood or confusing to steer your plan.', el: 'Σημείωσε σημεία ως κατανοητά ή μπερδεμένα για να καθοδηγήσεις το πλάνο.' },
    ],
    produces: { en: 'A solid grasp of the original material before you practice.', el: 'Στέρεη κατανόηση του υλικού πριν την εξάσκηση.' },
  },
  'concept-map': {
    howTo: [
      { en: 'See how concepts connect as a draggable graph.', el: 'Δες πώς συνδέονται οι έννοιες σε διαδραστικό γράφο.' },
      { en: 'Click a node to focus that concept across every tool.', el: 'Κάνε κλικ σε κόμβο για εστίαση της έννοιας σε όλα τα εργαλεία.' },
      { en: 'Drag nodes to arrange them your way — positions are saved.', el: 'Σύρε τους κόμβους όπως θες — οι θέσεις αποθηκεύονται.' },
    ],
    produces: { en: 'A clear mental model of how the ideas relate.', el: 'Καθαρό νοητικό μοντέλο για το πώς σχετίζονται οι ιδέες.' },
  },
  scratchpad: {
    howTo: [
      { en: 'Write a formula or derivation step by step.', el: 'Γράψε έναν τύπο ή μια παραγωγή βήμα-βήμα.' },
      { en: 'Assign values to the variables.', el: 'Δώσε τιμές στις μεταβλητές.' },
      { en: 'Check each line — verified math is flagged.', el: 'Έλεγξε κάθε γραμμή — τα σωστά βήματα επισημαίνονται.' },
    ],
    produces: { en: 'Confidence that your working is mathematically correct.', el: 'Σιγουριά ότι η λύση σου είναι μαθηματικά σωστή.' },
  },
  whiteboard: {
    howTo: [
      { en: 'Pick a concept and draw it freely.', el: 'Διάλεξε μια έννοια και σχεδίασέ την ελεύθερα.' },
      { en: 'Drop concept labels and formulas as stamps.', el: 'Πρόσθεσε ετικέτες εννοιών και τύπους ως σφραγίδες.' },
      { en: 'Check coverage — see which required labels are still missing.', el: 'Έλεγξε την κάλυψη — δες ποιες ετικέτες λείπουν ακόμη.' },
    ],
    produces: { en: 'A diagram that proves you can reconstruct the concept.', el: 'Ένα διάγραμμα που αποδεικνύει ότι ανασυνθέτεις την έννοια.' },
  },
  leitner: {
    howTo: [
      { en: 'Review the cards that are due today.', el: 'Επανάλαβε τις κάρτες που είναι για σήμερα.' },
      { en: 'Rate your recall: Again, Hard, Good, or Easy.', el: 'Βαθμολόγησε την ανάκληση: Ξανά, Δύσκολο, Καλό ή Εύκολο.' },
      { en: 'Cards you struggle with come back sooner.', el: 'Οι δύσκολες κάρτες επανέρχονται νωρίτερα.' },
    ],
    produces: { en: 'Long-term retention through spaced repetition.', el: 'Μακροπρόθεσμη συγκράτηση μέσω επανάληψης με διαστήματα.' },
  },
  feynman: {
    howTo: [
      { en: 'Explain the concept in plain words, as if to a beginner.', el: 'Εξήγησε την έννοια με απλά λόγια, σαν σε αρχάριο.' },
      { en: 'Get a rubric score on accuracy, simplicity and completeness.', el: 'Πάρε βαθμολογία rubric για ακρίβεια, απλότητα και πληρότητα.' },
      { en: 'Export the rubric report (HTML or PDF) and fix gaps it finds.', el: 'Εξήγαγε την αναφορά rubric (HTML ή PDF) και διόρθωσε τα κενά.' },
    ],
    produces: { en: 'Real understanding you can actually put into words.', el: 'Πραγματική κατανόηση που μπορείς να διατυπώσεις.' },
  },
  quiz: {
    howTo: [
      { en: 'Answer each active-recall question.', el: 'Απάντησε σε κάθε ερώτηση active recall.' },
      { en: 'Rate how confident you were.', el: 'Βαθμολόγησε πόσο σίγουρος ήσουν.' },
      { en: 'Review wrong answers against the source.', el: 'Δες τις λάθος απαντήσεις σε σχέση με την πηγή.' },
    ],
    produces: { en: 'Proof of what you truly remember vs. only recognize.', el: 'Απόδειξη για το τι θυμάσαι πραγματικά κι όχι απλώς αναγνωρίζεις.' },
  },
  simulator: {
    howTo: [
      { en: 'Adjust the input parameters with the sliders.', el: 'Ρύθμισε τις παραμέτρους εισόδου με τους sliders.' },
      { en: 'Watch the outputs and sensitivity update live.', el: 'Δες τα αποτελέσματα και την ευαισθησία να ενημερώνονται ζωντανά.' },
      { en: 'Test "what-if" scenarios against your notes.', el: 'Δοκίμασε σενάρια "τι-αν" σε σχέση με τις σημειώσεις σου.' },
    ],
    produces: { en: 'Intuition for how each variable drives the result.', el: 'Διαίσθηση για το πώς κάθε μεταβλητή επηρεάζει το αποτέλεσμα.' },
  },
  compare: {
    howTo: [
      { en: 'Pick two related concepts.', el: 'Διάλεξε δύο σχετικές έννοιες.' },
      { en: 'See them side by side across key dimensions.', el: 'Δες τες δίπλα-δίπλα στις βασικές διαστάσεις.' },
      { en: 'Study the differences that trip you up.', el: 'Μελέτησε τις διαφορές που σε μπερδεύουν.' },
    ],
    produces: { en: 'Clear separation of easily-confused terms.', el: 'Καθαρός διαχωρισμός εύκολα μπερδεμένων όρων.' },
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
      { en: 'Set a focus goal and pick a preset.', el: 'Όρισε στόχο εστίασης και διάλεξε preset.' },
      { en: 'Study until the timer ends.', el: 'Μελέτησε μέχρι να λήξει το χρονόμετρο.' },
      { en: 'Log a quick reflection — minutes feed your analytics.', el: 'Κατάγραψε έναν σύντομο αναστοχασμό — τα λεπτά τροφοδοτούν τα analytics.' },
    ],
    produces: { en: 'Focused sessions with measured, exam-ready pacing.', el: 'Εστιασμένες συνεδρίες με μετρημένο ρυθμό εξέτασης.' },
  },
  annotations: {
    howTo: [
      { en: 'Highlight passages in the source.', el: 'Υπογράμμισε αποσπάσματα στην πηγή.' },
      { en: 'Add a margin note or pin.', el: 'Πρόσθεσε σημείωση περιθωρίου ή pin.' },
      { en: 'Revisit your marks any time — they survive reprocessing.', el: 'Δες ξανά τις σημειώσεις σου — επιβιώνουν μετά την επανεπεξεργασία.' },
    ],
    produces: { en: 'A personal layer of marks anchored to the material.', el: 'Ένα προσωπικό στρώμα σημειώσεων πάνω στο υλικό.' },
  },
  dashboard: {
    howTo: [
      { en: 'See your mastery and weak spots at a glance.', el: 'Δες την κυριαρχία και τα αδύναμα σημεία με μια ματιά.' },
      { en: 'Read what changed in this session.', el: 'Δες τι άλλαξε σε αυτή τη συνεδρία.' },
      { en: 'Follow the recommended next action.', el: 'Ακολούθησε την προτεινόμενη επόμενη ενέργεια.' },
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
