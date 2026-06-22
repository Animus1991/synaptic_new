#!/usr/bin/env node
/**
 * CI doc-lint for Synapse Learning.
 *
 * Checks:
 * 1. No broken internal links in .md files.
 * 2. No hardcoded domain-specific vocabulary arrays in src/lib/ (D9 guard).
 * 3. No drift marker tags like [PARTIAL] without a TODO/issue tracker reference.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
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
const libFiles = findFiles(join(root, 'src/lib'), '.ts');
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

if (errors.length > 0) {
  console.error('Doc-lint failed:\n');
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  process.exit(1);
}

console.log('Doc-lint passed.');
