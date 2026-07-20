import { describe, expect, it } from 'vitest';
import { asAllCapsLabel, stripDiacritics } from './greekTypography';

describe('greekTypography', () => {
  it('strips tonos and uppercases mixed-case Greek', () => {
    expect(asAllCapsLabel('Μελέτη')).toBe('ΜΕΛΕΤΗ');
    expect(asAllCapsLabel('Ανάλυση')).toBe('ΑΝΑΛΥΣΗ');
    expect(asAllCapsLabel('Οργάνωση')).toBe('ΟΡΓΑΝΩΣΗ');
    expect(asAllCapsLabel('Λογαριασμός')).toBe('ΛΟΓΑΡΙΑΣΜΟΣ');
  });

  it('strips tonos from already-uppercase Greek', () => {
    expect(asAllCapsLabel('ΜΕΛΈΤΗ')).toBe('ΜΕΛΕΤΗ');
    expect(asAllCapsLabel('ΠΡΟΤΕΊΝΕΤΑΙ')).toBe('ΠΡΟΤΕΙΝΕΤΑΙ');
  });

  it('uppercases Latin and leaves unaccented Greek caps unchanged', () => {
    expect(asAllCapsLabel('Study')).toBe('STUDY');
    expect(asAllCapsLabel('ΓΛΩΣΣΑ')).toBe('ΓΛΩΣΣΑ');
  });

  it('stripDiacritics removes marks without uppercasing', () => {
    expect(stripDiacritics('Σήμερα')).toBe('Σημερα');
    expect(asAllCapsLabel('Σήμερα')).toBe('ΣΗΜΕΡΑ');
  });
});
