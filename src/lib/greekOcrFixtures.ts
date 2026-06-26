/**
 * Synthetic OCR corruption patterns for Greek PDF text-layer repair tests.
 * No user-uploaded document content — only minimal algorithm regression vectors.
 */

/** Spaced glyphs — single-char tokens with spaces. */
export const SPACED_ABSOLUTE_ADVANTAGE =
  'Α π ό λ υ τ α π λ ε ο ν ε κ τ ή μ α τ α και διεθνές εμπόριο.';

export const SPACED_INCOME_DISTRIBUTION =
  'Δ ι α ν ο μ ή ε ι σ ο δή μ α τ ο ς';

export const SPACED_PRODUCTION_INCOME =
  'π α ρ α γ ω γής εισοδήματος';

/** OCR glue — merged words without spaces. */
export const GLUED_TWO_SPACES_LECTURE =
  '6.Δύοχώρες;ΗημεδαπήκαιΑλλοδαπή';

export const GLUED_INCOME_TITLE = 'Διανομήεισοδήματος';

export const GLUED_PARTICLE_FOREIGN = 'καιΑλλοδαπή';

export const GLUED_ARTICLE_PRODUCTION = 'τηνπαραγωγή';

export const SPACED_COMPETITION =
  'Ο α ν τ α γωνισ μ ός ε π ιτρέ π ει στους εργαζόμενους να μειώσουν το μισθό τους.';

export const SPACED_TWO_SPACES_TITLE = 'Δ Υ Ο Χ Ω Ρ Ε Σ : Η ημεδαπή και η αλλοδαπή';

/** Behavioral-economics translation PDF — severe word glue (synthetic). */
export const GLUED_RATIONAL_CHOICE = 'ορθολογικήςεπιλογήςλέει';

export const GLUED_REAL_CHOICES = 'πραγματικάεπιλογέςκαιοικονομικέςαποφάσεις';

export const GLUED_HYPERBOLIC_LINE =
  '1μετάαπόένανμήνααπόσήμερασυνήθωςαποδίδειστοδολάριο';

export const SPACED_COST_WORD = 'Κό στο ς';

export const HTML_ENTITY_MATH = 'είναι &lt;1 όπου n';

export const GLUED_CURRENCY = 'Το $1 . 000 . 000 ;';

export const EXPECTED_REPAIRS: Array<{ input: string; mustContain: string[]; mustNotContain?: string[] }> = [
  {
    input: SPACED_ABSOLUTE_ADVANTAGE,
    mustContain: ['Απόλυτα', 'πλεονεκτήματα', 'διεθνές', 'εμπόριο'],
    mustNotContain: ['α π ό', 'Απόλυταπλεονεκτήματα', 'διεθνέςεμπόριο'],
  },
  {
    input: SPACED_INCOME_DISTRIBUTION,
    mustContain: ['Διανομή', 'εισοδήματος'],
    mustNotContain: ['Δ ι α', 'Διανομήεισοδήματος'],
  },
  {
    input: SPACED_PRODUCTION_INCOME,
    mustContain: ['παραγωγής', 'εισοδήματος'],
    mustNotContain: ['π α ρ α', 'παραγωγήςεισοδήματος'],
  },
  {
    input: GLUED_TWO_SPACES_LECTURE,
    mustContain: ['Δύο χώρες', 'Η ημεδαπή', 'και', 'Αλλοδαπή'],
    mustNotContain: ['Δύοχώρες', 'Ηημεδαπή'],
  },
  {
    input: GLUED_INCOME_TITLE,
    mustContain: ['Διανομή', 'εισοδήματος'],
  },
  {
    input: GLUED_PARTICLE_FOREIGN,
    mustContain: ['και', 'Αλλοδαπή'],
  },
  {
    input: GLUED_ARTICLE_PRODUCTION,
    mustContain: ['την', 'παραγωγή'],
  },
  {
    input: GLUED_RATIONAL_CHOICE,
    mustContain: ['ορθολογικής', 'επιλογής'],
    mustNotContain: ['ορθολογικήςεπιλογής'],
  },
  {
    input: GLUED_REAL_CHOICES,
    mustContain: ['πραγματικά', 'επιλογές', 'οικονομικές', 'αποφάσεις'],
    mustNotContain: ['πραγματικάεπιλογές', 'οικονομικέςαποφάσεις'],
  },
  {
    input: SPACED_COST_WORD,
    mustContain: ['Κόστος'],
    mustNotContain: ['Κό στο'],
  },
  {
    input: HTML_ENTITY_MATH,
    mustContain: ['<1'],
    mustNotContain: ['&lt;'],
  },
  {
    input: GLUED_CURRENCY,
    mustContain: ['$1.000.000'],
    mustNotContain: ['$1 . 000'],
  },
];
