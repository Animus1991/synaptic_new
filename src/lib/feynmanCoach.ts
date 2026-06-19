import type { RubricScores, RubricDimension } from './feynmanRubric';
import type { UserSettings } from '../types';
import { agentTonePrefix } from './settingsEffects';

const DIMENSION_TIPS: Record<RubricDimension, { en: string; el: string }> = {
  accuracy: {
    en: 'Name the models explicitly (Cournot vs Bertrand), state what firms choose (quantity vs price), and mention Nash equilibrium or marginal cost where relevant.',
    el: 'Ονόμασε ρητά τα μοντέλα (Cournot vs Bertrand), τι επιλέγουν οι εταιρείες (ποσότητα vs τιμή) και αναφέρου ισορροπία Nash ή οριακό κόστος.',
  },
  completeness: {
    en: 'Compare both models side-by-side: strategic variable, equilibrium outcome, and when each applies (homogeneous vs differentiated products).',
    el: 'Σύγκρινε και τα δύο μοντέλα: στρατηγική μεταβλητή, ισορροπία και πότε ισχύει το καθένα (ομοιογενή vs διαφοροποιημένα προϊόντα).',
  },
  simplicity: {
    en: 'Shorten sentences. One idea per sentence. Replace jargon with plain words, then define any term you must keep.',
    el: 'Κόψε τις προτάσεις. Μία ιδέα ανά πρόταση. Αντικατάστησε jargon με απλά λόγια και όρισε κάθε όρο που κρατάς.',
  },
  structure: {
    en: 'Use a clear arc: core idea → why it matters → Cournot vs Bertrand → one real-world example → one-line takeaway.',
    el: 'Χρησιμοποίησε δομή: βασική ιδέα → γιατί έχει σημασία → Cournot vs Bertrand → ένα παράδειγμα → μία πρόταση σύνοψης.',
  },
};

const SAMPLE_REWRITE = {
  en: `**Suggested rewrite (coach draft):**\n\n"In oligopoly, firms interact strategically. In **Cournot**, each firm picks **quantity** and the market sets price — output sits between monopoly and perfect competition. In **Bertrand**, firms pick **price**; with identical products, undercutting drives price to **marginal cost** (the Bertrand paradox). Real markets differ when products differ or capacity binds."`,
  el: `**Προτεινόμενη επαναδιατύπωση (coach):**\n\n«Στην ολιγοπώληση, οι εταιρείες αλληλεπιδρούν στρατηγικά. Στο **Cournot** επιλέγουν **ποσότητα** και η αγορά καθορίζει τιμή — η παραγωγή είναι μεταξύ μονοπωλίου και τέλειου ανταγωνισμού. Στο **Bertrand** επιλέγουν **τιμή**· με ίδια προϊόντα, το undercutting οδηγεί σε **οριακό κόστος** (παράδοξο Bertrand). Στην πράξη, διαφοροποίηση ή περιορισμοί χωρητικότητας αλλάζουν το αποτέλεσμα.»`,
};

export type CoachFeedback = {
  headline: string;
  overallScore: number;
  strengths: string[];
  improvements: string[];
  rewrite?: string;
  nextStep: string;
};

export function generateFeynmanCoachFeedback(
  text: string,
  scores: RubricScores,
  weakDims: RubricDimension[],
  concept: string,
  settings?: UserSettings,
): CoachFeedback {
  const lang = settings?.language ?? 'en';
  const tone = settings ? agentTonePrefix(settings) : '';
  const avg = Math.round(
    (scores.accuracy + scores.completeness + scores.simplicity + scores.structure) / 4,
  );

  const strengths: string[] = [];
  const improvements: string[] = [];

  (Object.keys(scores) as RubricDimension[]).forEach((dim) => {
    const label = dim.charAt(0).toUpperCase() + dim.slice(1);
    if (scores[dim] >= 75) {
      strengths.push(
        lang === 'el'
          ? `${label}: ${scores[dim]}% — καλή κάλυψη.`
          : `${label}: ${scores[dim]}% — solid coverage.`,
      );
    }
  });

  weakDims.forEach((dim) => {
    improvements.push(DIMENSION_TIPS[dim][lang]);
  });

  if (improvements.length === 0) {
    improvements.push(
      lang === 'el'
        ? 'Δοκίμασε να εξηγήσεις την ίδια ιδέα σε 3 προτάσεις χωρίς jargon — έλεγχος κατανόησης.'
        : 'Try explaining the same idea in 3 sentences with zero jargon — retention check.',
    );
  }

  const headline =
    lang === 'el'
      ? `${tone}Αξιολόγηση Feynman για «${concept}» — ${avg}%`
      : `${tone}Feynman review for "${concept}" — ${avg}%`;

  const nextStep =
    avg >= 80
      ? lang === 'el'
        ? 'Επόμενο βήμα: κάνε spaced review σε 24 ώρες ή δοκίμασε το Knowledge Check.'
        : 'Next: schedule a spaced review in 24h or take the Knowledge Check.'
      : lang === 'el'
        ? 'Επόμενο βήμα: ξαναγράψε με τη δομή outline και σύγκρινε Cournot vs Bertrand ρητά.'
        : 'Next: rewrite using the outline and explicitly contrast Cournot vs Bertrand.';

  return {
    headline,
    overallScore: avg,
    strengths: strengths.length > 0 ? strengths : [lang === 'el' ? 'Καλή αρχή — συνέχισε να επεκτείνεις.' : 'Good start — keep expanding the mechanism.'],
    improvements,
    rewrite: avg < 78 ? SAMPLE_REWRITE[lang] : undefined,
    nextStep,
  };
}
