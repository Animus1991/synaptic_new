#!/usr/bin/env node
/**
 * CI doc-lint for Synapse Learning.
 *
 * Checks:
 * 1. No broken internal links in .md files.
 * 2. No hardcoded domain-specific vocabulary arrays in src/lib/ (D9 guard).
 * 3. No drift marker tags like [PARTIAL] without a TODO/issue tracker reference.
 * 4. Shipped-capability assertions (docs ↔ code parity, S8 §12).
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const root = resolve(dirname(__filename), '..');

const errors = [];

function findFiles(dir, ext, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist') {
      findFiles(full, ext, acc);
    } else if (entry.isFile() && entry.name.endsWith(ext)) {
      acc.push(full);
    }
  }
  return acc;
}

function normalizePath(p) {
  return p.replace(/\\/g, '/');
}

function resolveRelativeLink(href, md) {
  const target = href.split('#')[0];
  if (!target) return null;
  const mdDir = dirname(md);
  return normalizePath(join(mdDir, target));
}

// 1. Internal markdown link check.
const mdFiles = findFiles(root, '.md').map((p) => normalizePath(p.slice(root.length + 1)));
const mdSet = new Set(mdFiles);
for (const md of mdFiles) {
  const text = readFileSync(join(root, md), 'utf8');
  const linkMatches = text.matchAll(/\[([^\]]*)\]\(([^)]+)\)/g);
  for (const m of linkMatches) {
    const href = m[2];
    if (href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) continue;
    const target = resolveRelativeLink(href, md);
    if (target && !mdSet.has(target)) {
      errors.push(`Broken link in ${md}: ${href}`);
    }
  }
}

// 2. D9 guard: hardcoded domain vocabulary arrays in src/lib.
const libFiles = findFiles(join(root, 'src/lib'), '.ts').filter((f) => !f.endsWith('.test.ts'));
const bannedPatterns = [
  /TOPIC_KEYWORDS\s*=/,
  /ECON_CONCEPT_EDGES\s*=/,
  /const\s+\w*ECON\w*\s*=/,
  /const\s+\w*ECONOMICS\w*\s*=/,
];
for (const file of libFiles) {
  const text = readFileSync(file, 'utf8');
  for (const re of bannedPatterns) {
    if (re.test(text)) {
      errors.push(`Hardcoded domain vocabulary array in ${file.slice(root.length + 1)} matches ${re.source}`);
    }
  }
}

// 3. Drift marker: [PARTIAL] in implementation docs must be followed by a tracker reference.
// Planning documents (PRODUCT_SCALE_PLAN.md, EXHAUSTIVE_PRODUCT_SCALE_BLUEPRINT.md) use
// [PARTIAL] as a status marker; those are allowed.
const planningFiles = new Set(['PRODUCT_SCALE_PLAN.md', 'EXHAUSTIVE_PRODUCT_SCALE_BLUEPRINT.md']);
for (const md of mdFiles) {
  if (planningFiles.has(md)) continue;
  const text = readFileSync(join(root, md), 'utf8');
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.includes('[PARTIAL]') && !/(#\d+|TODO|FIXME|issue)/i.test(line)) {
      errors.push(`Untracked [PARTIAL] marker in ${md}: ${line.trim()}`);
    }
  }
}

// 4. Shipped-capability assertions — docs must mention key S8 substrate modules.
const capabilityAssertions = [
  {
    doc: 'ALGORITHMS.md',
    patterns: [/documentModel\.ts/, /localEmbedder\.ts/],
    label: 'DocumentModel + offline embedder',
  },
  {
    doc: 'ARCHITECTURE.md',
    patterns: [/recognition\.worker/, /documentModelSnapshot/],
    label: 'recognition worker + snapshot persistence',
  },
  {
    doc: 'README.md',
    patterns: [/npm run eval/, /Recognition report/i],
    label: 'eval script + recognition report',
  },
];

for (const { doc, patterns, label } of capabilityAssertions) {
  const path = join(root, doc);
  if (!existsSync(path)) {
    errors.push(`Missing doc for capability check: ${doc}`);
    continue;
  }
  const text = readFileSync(path, 'utf8');
  for (const pattern of patterns) {
    if (!pattern.test(text)) {
      errors.push(`${doc} missing ${label} reference (expected ${pattern})`);
    }
  }
}

// 5. Code presence — documented substrate files must exist.
const requiredModules = [
  'src/lib/documentModel.ts',
  'src/workers/recognition.worker.ts',
  'src/lib/documentModelSnapshot.ts',
  'src/eval/baseline.json',
];
for (const rel of requiredModules) {
  if (!existsSync(join(root, rel))) {
    errors.push(`Documented module missing on disk: ${rel}`);
  }
}

if (errors.length > 0) {
  console.error('Doc-lint failed:\n');
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  process.exit(1);
}

console.log('Doc-lint passed.');
