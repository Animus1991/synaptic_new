/**
 * Varian Ch31 (behavioral economics / present value) — synthetic OCR regression vectors
 * derived from screenshot corruption patterns. No full document text.
 */

export const VARIAN_GLUED_PRESENT_VALUE =
  '1πουθαδοθείμετάαπόμήνεςείναι';

export const VARIAN_GLUED_SHAMPOO_SALON =
  '25γιαένασαμπουσεέναακριβόκομμωτήριο';

export const VARIAN_SPACED_AFTER_MONTHS =
  '1 μ ε τ ά α π ό τ ρ ε ι ς μ ή ν ε ς μ π ο ρ ε ί ν α ι δ ω θ ε ί ω ς :';

export const VARIAN_GLUED_COMMITMENT =
  'μιαυπόσχεσηπουλαμβάνεισήμεραότιθαπάρει';

export const VARIAN_GLUED_HYPERBOLIC_BLOCK =
  '1μετάαπόένανμήνααπόσήμερασυνήθωςαποδίδειστοδολάριοαυτόαξίαμικρότερηα';

export const VARIAN_SPLIT_PROBABILITY = 'ηπιθα ενοτηταναχά σε τε';

export const VARIAN_SPLIT_TODAY = 'σή με ρα θα';

export const VARIAN_SPLIT_PHENOMENA = 'επιλογέςφαινό ενα';

export const VARIAN_GLUED_LOSS = 'απώλειακαμίαςζωήςμεπιθα';

export const VARIAN_GLUED_PAY_WOULD = 'Θαπληρώνατε15';

export const VARIAN_GLUED_WITH_FULL = 'μεπλήρηκαταρισμό';

export const VARIAN_SPLIT_DECISIONS = 'αποφά σες';

export const VARIAN_CH31_REPAIRS: Array<{
  input: string;
  mustContain: string[];
  mustNotContain?: string[];
}> = [
  {
    input: VARIAN_GLUED_PRESENT_VALUE,
    mustContain: ['1', 'δοθεί', 'μετά', 'μήνες'],
    mustNotContain: ['1πουθαδοθεί', 'μετάαπόμήνες', 'μηνες ςε', 'ςε ειναι'],
  },
  {
    input: VARIAN_GLUED_SHAMPOO_SALON,
    mustContain: ['25', 'για', 'σαμπουάν', 'κομμωτήριο'],
    mustNotContain: ['25γιαένα', 'σαμπουσεένα'],
  },
  {
    input: VARIAN_SPACED_AFTER_MONTHS,
    mustContain: ['μετά', 'τρεις', 'μήνες', 'μπορεί', 'να', 'δοθεί'],
    mustNotContain: ['μ ε τ ά', 'μ π ο ρ ε ί'],
  },
  {
    input: VARIAN_GLUED_COMMITMENT,
    mustContain: ['μια', 'υπόσχεση', 'που', 'λαμβάνει', 'σήμερα', 'θα', 'πάρει'],
    mustNotContain: ['μιαυπόσχεση', 'λαμβάνεισήμερα'],
  },
  {
    input: VARIAN_GLUED_HYPERBOLIC_BLOCK,
    mustContain: ['1', 'μετά', 'έναν', 'μήνα', 'σήμερα', 'αποδίδει', 'δολάριο'],
    mustNotContain: ['1μετάαπόέναν', 'αποδίδειστοδολάριο'],
  },
  {
    input: VARIAN_SPLIT_PROBABILITY,
    mustContain: ['πιθανότητα', 'χάσετε'],
    mustNotContain: ['πιθα ενοτητα', 'χά σε τε'],
  },
  {
    input: VARIAN_SPLIT_TODAY,
    mustContain: ['σήμερα'],
    mustNotContain: ['σή με ρα'],
  },
  {
    input: VARIAN_GLUED_LOSS,
    mustContain: ['απωλεια', 'ζω', 'με'],
    mustNotContain: ['απώλειακαμίας', 'ζωήςμεπιθα'],
  },
  {
    input: VARIAN_GLUED_PAY_WOULD,
    mustContain: ['Θα', 'πληρώνατε', '15'],
    mustNotContain: ['Θαπληρώνατε15'],
  },
  {
    input: VARIAN_GLUED_WITH_FULL,
    mustContain: ['με', 'πλήρη', 'καθαρισμό'],
    mustNotContain: ['μεπλήρη', 'θα ρισμό'],
  },
  {
    input: VARIAN_SPLIT_DECISIONS,
    mustContain: ['αποφασεις'],
    mustNotContain: ['αποφά σες'],
  },
];
