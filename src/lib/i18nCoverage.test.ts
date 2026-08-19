import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { i18nDictionaries } from './i18n';

/**
 * Wave D1 — i18n coverage gate.
 *
 * TypeScript already enforces key parity (`EL: Record<I18nKey, string>` fails
 * `tsc` if a key is missing/extra). This runtime gate adds the two guarantees
 * the type system can't express:
 *   1. no EL value is empty/whitespace, and
 *   2. no EL value is silently left equal to its EN source (untranslated),
 *      except for an explicit ratchet allowlist of proper nouns / brand names /
 *      cognates that are intentionally identical in both languages.
 *
 * When a genuinely-identical string is added, refresh the allowlist:
 *   scripts/i18n-identical-allowlist.json  ({ "allowed": [ ...keys ] })
 * When you translate a previously-identical value, remove its key from the list
 * (the "stale allowlist" assertion below flags leftovers).
 */
const allowlist: string[] = JSON.parse(
  readFileSync(resolve(process.cwd(), 'scripts/i18n-identical-allowlist.json'), 'utf8'),
).allowed;

const { en, el } = i18nDictionaries as {
  en: Record<string, string>;
  el: Record<string, string>;
};

describe('Wave D1 — i18n coverage gate (EN/EL)', () => {
  it('EN and EL expose exactly the same key set', () => {
    const enKeys = new Set(Object.keys(en));
    const elKeys = new Set(Object.keys(el));
    const missingInEl = [...enKeys].filter((k) => !elKeys.has(k));
    const extraInEl = [...elKeys].filter((k) => !enKeys.has(k));
    expect(missingInEl, `EL missing keys: ${missingInEl.join(', ')}`).toEqual([]);
    expect(extraInEl, `EL has orphan keys: ${extraInEl.join(', ')}`).toEqual([]);
  });

  it('every EL value is non-empty', () => {
    const empty = Object.keys(en).filter((k) => !el[k] || el[k]!.trim() === '');
    expect(empty, `empty EL values: ${empty.join(', ')}`).toEqual([]);
  });

  it('no NEW untranslated EL value (EL === EN only where allowlisted)', () => {
    const allowed = new Set(allowlist);
    const newIdentical = Object.keys(en).filter(
      (k) => el[k] === en[k] && !allowed.has(k),
    );
    expect(
      newIdentical,
      `EL left identical to EN (translate, or add to scripts/i18n-identical-allowlist.json): ${newIdentical.join(', ')}`,
    ).toEqual([]);
  });

  it('no stale allowlist entries (translated values must leave the list)', () => {
    const stale = allowlist.filter((k) => !(k in en) || el[k] !== en[k]);
    expect(
      stale,
      `stale allowlist entries — remove from scripts/i18n-identical-allowlist.json: ${stale.join(', ')}`,
    ).toEqual([]);
  });
});
