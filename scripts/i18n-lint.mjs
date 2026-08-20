#!/usr/bin/env node
/**
 * CI i18n guard for Synapse Learning (Wave C1).
 *
 * Blocks NEW inline bilingual UI strings in src/components/**:
 * - `isEl ? '…' : '…'` (always legacy — use useI18n().t())
 * - `lang === 'el' ? '…'` / template literals (except exact struct picks + TTS)
 *
 * Existing violations are tracked by stable content fingerprint and occurrence
 * count in scripts/i18n-inline-allowlist.json. Moving a violation to another
 * line is harmless; changing its content, adding a duplicate, or removing an
 * occurrence requires an explicit baseline review.
 *
 * Usage:
 *   node scripts/i18n-lint.mjs          # CI check
 *   node scripts/i18n-lint.mjs --update # replace the reviewed baseline
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const root = resolve(dirname(__filename), '..');
const componentsDir = join(root, 'src/components');
const allowlistPath = join(root, 'scripts/i18n-inline-allowlist.json');

const ALLOWLIST_VERSION = 2;
const LANG_EL_TEST = /lang\s*===\s*['"]el['"]/;
const IS_EL_TERNARY = /\bisEl\s*\?/;
const IS_EL_ASSIGN = /\bconst\s+isEl\s*=\s*lang\s*===\s*['"]el['"]/;
const EL_BOOL_ASSIGN = /\bconst\s+el\s*=\s*lang\s*===\s*['"]el['"]/;
const INLINE_STRING_TERNARY = /lang\s*===\s*['"]el['"]\s*\?\s*(['"`]|\\u)/;
const STRUCT_PICK_TERNARY = /lang\s*===\s*['"]el['"]\s*\?\s*([A-Za-z_$][\w$]*(?:\?*\.[A-Za-z_$][\w$]*)*)\s*:\s*([A-Za-z_$][\w$]*(?:\?*\.[A-Za-z_$][\w$]*)*)(?=\s*(?:[,;})\]]|$))/g;
const TTS_LOCALE_PICK = /lang\s*===\s*['"]el['"]\s*\?\s*['"]el-GR['"]\s*:\s*['"]en-US['"]/g;

const STRUCT_EL_FIELDS = new Set([
  'labelEl', 'groupEl', 'purposeEl', 'titleEl', 'summaryEl', 'descEl',
]);
const STRUCT_EN_FIELDS = new Set([
  'labelEn', 'groupEn', 'purposeEn', 'titleEn', 'summaryEn', 'descEn',
  'label', 'group', 'purpose', 'title', 'summary', 'desc',
]);

function terminalField(expression) {
  return expression.split(/\?*\./).at(-1);
}

function stripExactStructPicks(line) {
  return line.replace(STRUCT_PICK_TERNARY, (match, elExpression, enExpression) => {
    const elField = terminalField(elExpression);
    const enField = terminalField(enExpression);
    return STRUCT_EL_FIELDS.has(elField) && STRUCT_EN_FIELDS.has(enField) ? '' : match;
  });
}

/** Exact labelEl/labelEn-style property selection — not inline UI copy. */
export function isStructLabelPick(line) {
  if (!LANG_EL_TEST.test(line)) return false;
  return !LANG_EL_TEST.test(stripExactStructPicks(line));
}

function isTtsLocalePick(line) {
  if (!LANG_EL_TEST.test(line)) return false;
  return !LANG_EL_TEST.test(line.replace(TTS_LOCALE_PICK, ''));
}

export function violationRule(line) {
  if (IS_EL_TERNARY.test(line)) return 'is-el-ternary';
  if (IS_EL_ASSIGN.test(line)) return 'is-el-assignment';
  if (EL_BOOL_ASSIGN.test(line)) return 'el-bool-assignment';
  if (LANG_EL_TEST.test(line) && isTtsLocalePick(line)) return null;
  if (isStructLabelPick(line)) return null;
  if (INLINE_STRING_TERNARY.test(line)) return 'lang-el-string-ternary';
  if (LANG_EL_TEST.test(line)) return 'lang-el-test';
  return null;
}

export function isViolationLine(line) {
  return violationRule(line) !== null;
}

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

function normalizedPath(file, rootDir) {
  const candidate = rootDir ? relative(rootDir, file) : file;
  return candidate.replace(/\\/g, '/');
}

function indentationWidth(line) {
  return line.match(/^\s*/)?.[0].length ?? 0;
}

function hasConditionalArms(value) {
  const question = value.indexOf('?');
  return question >= 0 && value.lastIndexOf(':') > question;
}

function looksTerminated(value) {
  return /[,;})\]]\s*$/.test(value);
}

/**
 * Capture multiline ternary arms without tying identity to source position.
 * Continuation lines are normalized for indentation but literal contents stay
 * byte-for-byte significant, so copy mutations change the fingerprint.
 */
export function extractViolationContent(lines, index) {
  const first = lines[index]?.replace(/\r$/, '') ?? '';
  const parts = [first.trim()];
  if (hasConditionalArms(first) || looksTerminated(first)) return parts[0];

  const baseIndent = indentationWidth(first);
  for (let cursor = index + 1; cursor < lines.length && parts.length < 16; cursor += 1) {
    const line = lines[cursor]?.replace(/\r$/, '') ?? '';
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (indentationWidth(line) <= baseIndent) break;
    parts.push(trimmed);
    const joined = parts.join('\n');
    if (hasConditionalArms(joined) && looksTerminated(trimmed)) break;
  }
  return parts.join('\n');
}

export function fingerprintViolation(rule, content) {
  return createHash('sha256').update(`${rule}\0${content}`, 'utf8').digest('hex');
}

export function scanSource(source, file = 'fixture.tsx') {
  const lines = source.split('\n');
  const hits = [];
  for (let index = 0; index < lines.length; index += 1) {
    const rule = violationRule(lines[index]);
    if (!rule) continue;
    const sample = extractViolationContent(lines, index);
    hits.push({
      file: file.replace(/\\/g, '/'),
      line: index + 1,
      rule,
      fingerprint: fingerprintViolation(rule, sample),
      sample,
    });
  }
  return hits;
}

export function scanComponents(options = {}) {
  const rootDir = options.rootDir ?? root;
  const directory = options.componentsDir ?? componentsDir;
  const hits = [];
  for (const file of findFiles(directory)) {
    const relativeFile = normalizedPath(file, rootDir);
    hits.push(...scanSource(readFileSync(file, 'utf8'), relativeFile));
  }
  return hits.sort((a, b) =>
    a.file.localeCompare(b.file)
    || a.fingerprint.localeCompare(b.fingerprint)
    || a.line - b.line,
  );
}

function entryKey(entry) {
  return `${entry.file}\0${entry.rule}\0${entry.fingerprint}`;
}

export function baselineFromHits(hits) {
  const grouped = new Map();
  for (const hit of hits) {
    const key = entryKey(hit);
    const existing = grouped.get(key);
    if (existing) {
      existing.count += 1;
      existing.lines.push(hit.line);
    } else {
      grouped.set(key, {
        file: hit.file,
        rule: hit.rule,
        fingerprint: hit.fingerprint,
        count: 1,
        sample: hit.sample,
        lines: [hit.line],
      });
    }
  }
  return [...grouped.values()].sort((a, b) =>
    a.file.localeCompare(b.file)
    || a.rule.localeCompare(b.rule)
    || a.fingerprint.localeCompare(b.fingerprint),
  );
}

function validateAllowedEntry(entry) {
  if (!entry || typeof entry !== 'object') return 'entry must be an object';
  if (typeof entry.file !== 'string' || !entry.file) return 'file must be a non-empty string';
  if (typeof entry.rule !== 'string' || !entry.rule) return 'rule must be a non-empty string';
  if (typeof entry.sample !== 'string' || !entry.sample) return 'sample must be a non-empty string';
  if (!Number.isInteger(entry.count) || entry.count < 1) return 'count must be a positive integer';
  if (!/^[a-f0-9]{64}$/.test(entry.fingerprint ?? '')) return 'fingerprint must be a SHA-256 hex digest';
  if (fingerprintViolation(entry.rule, entry.sample) !== entry.fingerprint) {
    return 'fingerprint does not match rule + sample';
  }
  return null;
}

export function compareBaseline(hits, allowed) {
  const currentEntries = baselineFromHits(hits);
  const currentByKey = new Map(currentEntries.map((entry) => [entryKey(entry), entry]));
  const allowedByKey = new Map(allowed.map((entry) => [entryKey(entry), entry]));
  const differences = [];

  for (const entry of allowed) {
    const validationError = validateAllowedEntry(entry);
    if (validationError) {
      differences.push({ kind: 'invalid', entry, message: validationError });
    }
  }

  for (const current of currentEntries) {
    const expected = allowedByKey.get(entryKey(current));
    const expectedCount = expected?.count ?? 0;
    if (current.count > expectedCount) {
      differences.push({
        kind: 'new',
        entry: current,
        expectedCount,
        actualCount: current.count,
      });
    }
  }

  for (const expected of allowed) {
    const current = currentByKey.get(entryKey(expected));
    const actualCount = current?.count ?? 0;
    if (actualCount < expected.count) {
      differences.push({
        kind: 'stale',
        entry: expected,
        expectedCount: expected.count,
        actualCount,
      });
    }
  }

  return { currentEntries, differences };
}

function serializeBaseline(entries) {
  return `${JSON.stringify({ version: ALLOWLIST_VERSION, allowed: entries.map(({ lines: _lines, ...entry }) => entry) }, null, 2)}\n`;
}

function loadBaseline(file) {
  const parsed = JSON.parse(readFileSync(file, 'utf8'));
  if (parsed.version !== ALLOWLIST_VERSION || !Array.isArray(parsed.allowed)) {
    throw new Error(`Expected i18n inline allowlist version ${ALLOWLIST_VERSION}.`);
  }
  return parsed.allowed;
}

function formatDifference(difference) {
  if (difference.kind === 'invalid') {
    return `Invalid allowlist entry: ${difference.message} — ${JSON.stringify(difference.entry)}`;
  }
  const { entry, expectedCount, actualCount } = difference;
  const digest = entry.fingerprint.slice(0, 12);
  if (difference.kind === 'new') {
    const lines = entry.lines?.join(', ') ?? '?';
    return `New inline i18n violation: ${entry.file}:${lines} [${entry.rule} ${digest}] — current count ${actualCount}, allowlisted ${expectedCount}; use useI18n().t() or t(key, lang) in src/lib/i18n.ts`;
  }
  return `Stale allowlist content (fixed?): ${entry.file} [${entry.rule} ${digest}] — current count ${actualCount}, allowlisted ${expectedCount}; sample ${JSON.stringify(entry.sample)}`;
}

export function runCli(argv = process.argv.slice(2)) {
  const updateMode = argv.includes('--update');
  const currentHits = scanComponents();
  const currentEntries = baselineFromHits(currentHits);

  if (updateMode) {
    writeFileSync(allowlistPath, serializeBaseline(currentEntries));
    console.log(`i18n allowlist updated (${currentHits.length} occurrences, ${currentEntries.length} stable fingerprints).`);
    return 0;
  }

  let allowed;
  try {
    allowed = loadBaseline(allowlistPath);
  } catch (error) {
    console.error(`${error instanceof Error ? error.message : String(error)} Run: npm run i18n-lint:update`);
    return 1;
  }

  const { differences } = compareBaseline(currentHits, allowed);
  if (differences.length > 0) {
    console.error('i18n-lint failed:\n');
    for (const difference of differences) console.error(`  - ${formatDifference(difference)}`);
    return 1;
  }

  console.log(`i18n-lint passed (${currentHits.length} allowlisted occurrences across ${currentEntries.length} stable fingerprints in src/components).`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === __filename) {
  process.exitCode = runCli();
}
