import { describe, it, expect } from 'vitest';

import {
  ankiFieldChecksum,
  noteFieldsToFrontBack,
  parseAnkiTags,
  splitAnkiNoteFields,
  stripAnkiFieldHtml,
} from './ankiApkgFields';

describe('ankiApkgFields', () => {
  it('splits note fields on unit separator', () => {
    expect(splitAnkiNoteFields(`Front${'\u001f'}Back`)).toEqual(['Front', 'Back']);
  });

  it('strips HTML and converts br to newlines', () => {
    expect(stripAnkiFieldHtml('Line1<br>Line2')).toBe('Line1\nLine2');
    expect(stripAnkiFieldHtml('<b>Bold</b> term')).toBe('Bold term');
  });

  it('maps fields to front/back', () => {
    const { front, back } = noteFieldsToFrontBack(['Question', 'Answer']);
    expect(front).toBe('Question');
    expect(back).toBe('Answer');
  });

  it('parses Anki tag strings', () => {
    expect(parseAnkiTags(' synapse:fsrs interval:3 ')).toEqual(['synapse:fsrs', 'interval:3']);
  });

  it('computes stable field checksum', () => {
    expect(ankiFieldChecksum('hello')).toBe(ankiFieldChecksum('hello'));
    expect(ankiFieldChecksum('hello')).not.toBe(ankiFieldChecksum('world'));
  });
});
