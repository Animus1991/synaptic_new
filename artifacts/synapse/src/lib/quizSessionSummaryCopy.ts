import type { Lang } from './i18n';

export type QuizSessionSummaryCopy = {
  headline: string;
  detail: string;
  suggestion?: string;
};

export function buildQuizSessionSummaryCopy(
  accuracy: number,
  meanConfidence: number,
  lang: Lang,
): QuizSessionSummaryCopy {
  const accBand =
    accuracy >= 80 ? 'strong'
    : accuracy >= 60 ? 'ok'
    : accuracy >= 40 ? 'weak'
    : 'low';
  const confBand =
    meanConfidence >= 4 ? 'high'
    : meanConfidence >= 3 ? 'mid'
    : 'low';

  if (lang === 'el') {
    const headline =
      accBand === 'strong' ? 'Πολύ καλή επίδοση — κράτα τη ροή!'
      : accBand === 'ok' ? 'Καλή βάση — λίγη επανάληψη θα βοηθήσει'
      : accBand === 'weak' ? 'Χρειάζεται επανάληψη — δες τα λάθη σου'
      : 'Χαμηλή ακρίβεια — ξεκίνα με κάρτες και Feynman';

    const detail =
      `Ακρίβεια ${accuracy}% · μέση εμπιστοσύνη ${meanConfidence.toFixed(1)}/5`
      + (confBand === 'high' && accBand !== 'strong'
        ? ' — νιώθεις σιγουριά αλλά κάποιες απαντήσεις ήταν λάθος (ψευδαίσθηση μάθησης).'
        : confBand === 'low' && accBand === 'ok'
          ? ' — η αβεβαιότητά σου ταιριάζει με το αποτέλεσμα.'
          : '.');

    const suggestion =
      accuracy < 70
        ? 'Πρότεινεται: κάρτες από λάθη + Feynman εξήγηση πριν το επόμενο κουίζ.'
        : accuracy < 85
          ? 'Πρότεινεται: μια γρήγορη επανάληψη Leitner για τις αδύναμες έννοιες.'
          : undefined;

    return { headline, detail, suggestion };
  }

  const headline =
    accBand === 'strong' ? 'Strong session — keep the momentum!'
    : accBand === 'ok' ? 'Solid base — a quick review will help'
    : accBand === 'weak' ? 'Needs review — revisit your mistakes'
    : 'Low accuracy — start with cards and Feynman';

  const detail =
    `Accuracy ${accuracy}% · mean confidence ${meanConfidence.toFixed(1)}/5`
    + (confBand === 'high' && accBand !== 'strong'
      ? ' — you felt confident but missed some answers (possible illusion of learning).'
      : confBand === 'low' && accBand === 'ok'
        ? ' — your uncertainty matches the result.'
        : '.');

  const suggestion =
    accuracy < 70
      ? 'Suggested: cards from mistakes + Feynman explanation before the next quiz.'
      : accuracy < 85
        ? 'Suggested: a quick Leitner pass on weak concepts.'
        : undefined;

  return { headline, detail, suggestion };
}
