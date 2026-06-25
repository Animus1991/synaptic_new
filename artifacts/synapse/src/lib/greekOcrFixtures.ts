/**
 * Real corruption snippets from ΕΚΠΑ economics PDFs (Διανομή εισοδήματος, Διεθνής Οικονομική).
 * Used as regression fixtures for Greek OCR repair v2.3+.
 */

/** Spaced glyphs — syllabus lecture 2 (Playwright e2e fixture). */
export const SPACED_ABSOLUTE_ADVANTAGE =
  'Α π ό λ υ τ α π λ ε ο ν ε κ τ ή μ α τ α και διεθνές εμπόριο.';

/** Spaced glyphs — income distribution title/body. */
export const SPACED_INCOME_DISTRIBUTION =
  'Δ ι α ν ο μ ή ε ι σ ο δ ή μ α τ ο ς';

export const SPACED_PRODUCTION_INCOME =
  'π α ρ α γ ω γής εισοδήματος';

/** OCR glue — lecture PDF reader screenshot (Δύο χώρες / ημεδαπή). */
export const GLUED_TWO_SPACES_LECTURE =
  '6.Δύοχώρες;ΗημεδαπήκαιΑλλοδαπή';

/** OCR glue — merged title words without spaced glyphs. */
export const GLUED_INCOME_TITLE = 'Διανομήεισοδήματος';

export const GLUED_PARTICLE_FOREIGN = 'καιΑλλοδαπή';

export const GLUED_ARTICLE_PRODUCTION = 'τηνπαραγωγή';

/** Spaced competition paragraph (ΕΚΠΑ PDF screenshot). */
export const SPACED_COMPETITION =
  'Ο α ν τ α γωνισ μ ός ε π ιτρέ π ει στους εργαζόμενους να μειώσουν το μισθό τους.';

export const SPACED_TWO_SPACES_TITLE = 'Δ Υ Ο Χ Ω Ρ Ε Σ : Η ημεδαπή και η αλλοδαπή';

/** Expected repairs (for documentation / optional snapshot tests). */
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
];
