#!/usr/bin/env node
/**
 * CI i18n guard for Synapse Learning (Wave C1).
 *
 * Blocks NEW inline bilingual UI strings in src/components/**:
 * - `isEl ? '…' : '…'` (always legacy — use useI18n().t())
 * - `lang === 'el' ? '…'` / template literals (except struct label picks + TTS)
 *
 * Existing violations are tracked in scripts/i18n-inline-allowlist.json.
 * After migrating a file to t(), remove its entries from the allowlist.
 *
 * Usage:
 *   node scripts/i18n-lint.mjs          # CI check
 *   node scripts/i18n-lint.mjs --update # refresh allowlist snapshot
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const root = resolve(dirname(__filename), '..');
const componentsDir = join(root, 'src/components');
const allowlistPath = join(root, 'scripts/i18n-inline-allowlist.json');

const LANG_EL_TEST = /lang\s*===\s*['"]el['"]/;
const IS_EL_TERNARY = /\bisEl\s*\?/;
const IS_EL_ASSIGN = /\bconst\s+isEl\s*=\s*lang\s*===\s*['"]el['"]/;
const EL_BOOL_ASSIGN = /\bconst\s+el\s*=\s*lang\s*===\s*['"]el['"]/;
const INLINE_STRING_TERNARY = /lang\s*===\s*['"]el['"]\s*\?\s*(['"`]|\\u)/;

const STRUCT_PICK_RE =
  /labelEl|labelEn|groupEl|groupEn|purposeEl|purposeEn|titleEl|titleEn|summaryEl|summaryEn|descEl|descEn|\.label\b|\.desc\b/;

function findFiles(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      findFiles(full, acc);
    } else if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

function relPos(file, lineNo) {
  return `${relative(root, file).replace(/\\/g, '/')}:${lineNo}`;
}

function isTtsLocalePick(line) {
  return /el-GR|en-US/.test(line);
}

/** Intentional labelEl/labelEn (and similar) struct picks — not UI copy. */
function isStructLabelPick(line) {
  if (!LANG_EL_TEST.test(line)) return false;
  return STRUCT_PICK_RE.test(line);
}

function isViolationLine(line) {
  if (IS_EL_TERNARY.test(line)) return true;
  if (IS_EL_ASSIGN.test(line)) return true;
  if (EL_BOOL_ASSIGN.test(line)) return true;
  if (LANG_EL_TEST.test(line) && isTtsLocalePick(line)) return false;
  if (isStructLabelPick(line)) return false;
  if (INLINE_STRING_TERNARY.test(line)) return true;
  if (LANG_EL_TEST.test(line)) return true;
  return false;
}

function scanComponents() {
  const hits = [];
  for (const file of findFiles(componentsDir)) {
    const lines = readFileSync(file, 'utf8').split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (isViolationLine(line)) {
        hits.push(relPos(file, i + 1));
      }
    }
  }
  hits.sort();
  return hits;
}

const updateMode = process.argv.includes('--update');
const current = scanComponents();

if (updateMode) {
  writeFileSync(allowlistPath, `${JSON.stringify({ allowed: current }, null, 2)}\n`);
  console.log(`i18n allowlist updated (${current.length} entries).`);
  process.exit(0);
}

let allowed = [];
try {
  allowed = JSON.parse(readFileSync(allowlistPath, 'utf8')).allowed ?? [];
} catch {
  console.error('Missing scripts/i18n-inline-allowlist.json — run: npm run i18n-lint:update');
  process.exit(1);
}

const allowedSet = new Set(allowed);
const errors = [];

for (const hit of current) {
  if (!allowedSet.has(hit)) {
    errors.push(`New inline i18n violation: ${hit} — use useI18n().t() or t(key, lang) in src/lib/i18n.ts`);
  }
}

for (const hit of allowed) {
  if (!current.includes(hit)) {
    errors.push(`Stale allowlist entry (fixed?): ${hit} — run npm run i18n-lint:update`);
  }
}

if (errors.length > 0) {
  console.error('i18n-lint failed:\n');
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  process.exit(1);
}

console.log(`i18n-lint passed (${current.length} allowlisted inline patterns in src/components).`);
