/**
 * Repair Greek mojibake from reading UTF-8 as ISO-8859-7 / CP1252 hybrid
 * (PowerShell Get-Content on Greek Windows) and re-saving as UTF-8.
 *
 * Ήπιο → Ξ‰Ο€ΞΉΞΏ ;  ·  → Ξ’Β·
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = process.cwd();
const EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css']);
const SKIP_DIRS = new Set([
  'node_modules', 'dist', '.git', 'coverage', 'playwright-report',
  'test-results', '.lighthouseci', 'android', 'ios', 'public', 'artifacts',
]);

function buildReverseMap() {
  const rev = new Map();
  // ISO-8859-7 defined bytes
  try {
    const dec = new TextDecoder('iso-8859-7');
    for (let b = 0; b < 256; b++) {
      const ch = dec.decode(Uint8Array.of(b));
      if (!ch) continue;
      const cp = ch.codePointAt(0);
      if (cp !== undefined && !rev.has(cp)) rev.set(cp, b);
    }
  } catch {
    /* ignore */
  }
  // Latin-1 identity for C1/supplement chars used when ISO-8859-7 left a
  // hole (µ U+00B5, » U+00BB, soft-hyphen U+00AD, middle-dot U+00B7, …).
  // Keys are Latin-1 code points — they do not collide with Greek U+0370+.
  for (let b = 0xa0; b <= 0xff; b++) {
    rev.set(b, b);
  }
  // Windows-1252 best-fit in C1 range (common when 0x80-0x9F leak through)
  const cp1252 = [
    [0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83], [0x201e, 0x84],
    [0x2026, 0x85], [0x2020, 0x86], [0x2021, 0x87], [0x02c6, 0x88],
    [0x2030, 0x89], [0x0160, 0x8a], [0x2039, 0x8b], [0x0152, 0x8c],
    [0x017d, 0x8e], [0x2018, 0x91], [0x2019, 0x92], [0x201c, 0x93],
    [0x201d, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
    [0x02dc, 0x98], [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b],
    [0x0153, 0x9c], [0x017e, 0x9e], [0x0178, 0x9f],
  ];
  for (const [cp, b] of cp1252) rev.set(cp, b); // prefer CP1252 for these
  return rev;
}

const REV = buildReverseMap();

function looksCorrupted(s) {
  return /Ξ[‰€ΉΊΌΎΏ]/.test(s) || /Ο[€„‚]/.test(s) || /β€[”™]/.test(s) || /Ξ’Β·/.test(s);
}

function repairString(s) {
  const bytes = [];
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (cp < 0x80) {
      bytes.push(cp);
      continue;
    }
    const b = REV.get(cp);
    if (b === undefined) {
      // Already-valid Unicode (emoji etc.) — keep UTF-8 bytes
      for (const x of Buffer.from(ch, 'utf8')) bytes.push(x);
    } else {
      bytes.push(b);
    }
  }
  const out = Buffer.from(bytes).toString('utf8');
  if (out.includes('\uFFFD')) return null;
  return out;
}

function corruptionScore(s) {
  return (s.match(/Ξ[‰€ΉΊΌΎΏµ»­·]/g) || []).length
    + (s.match(/Ο[€„‚]/g) || []).length
    + (s.match(/β€[”™]/g) || []).length
    + (s.match(/Ξ’Β·/g) || []).length;
}

function fixSeparators(s) {
  return s
    .replace(/\s*Ξ’Β·\s*/g, ' · ')
    // Greek Beta + middle dot used as separator (not the letter Beta in words)
    .replace(/(\s)Β·(\s)/g, '$1·$2')
    .replace(/([^\s\w])Β·(\s)/g, '$1·$2')
    .replace(/(\s)Β·([^\s\w])/g, '$1·$2')
    .replace(/` Β· \$\{/g, '` · ${')
    .replace(/\} Β· \{/g, '} · {')
    .replace(/\{\s*'Β·'\s*\}/g, "{'·'}")
    .replace(/\?\s*'Β·'\s*:/g, "? '·' :")
    .replace(/===\s*0\s*\?\s*' · '/g, "=== 0 ? '·'");
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) walk(p, out);
    else if (EXTS.has(extname(name))) out.push(p);
  }
  return out;
}

// Restore clean baseline of corrupted tree, then repair
const files = walk(join(ROOT, 'src'));
let changed = 0;

for (const file of files) {
  let text = readFileSync(file, 'utf8');
  const original = text;
  const before = corruptionScore(text);

  if (before > 0 || /Β·/.test(text)) {
    if (before > 0) {
      const repaired = repairString(text);
      if (repaired) {
        const after = corruptionScore(repaired);
        if (after < before) text = repaired;
      }
      // Line-level fallback for mixed files
      if (corruptionScore(text) > 0) {
        text = text.split(/(\r?\n)/).map((line) => {
          const b = corruptionScore(line);
          if (b === 0) return line;
          const r = repairString(line);
          if (!r) return line;
          return corruptionScore(r) < b ? r : line;
        }).join('');
      }
    }
    text = fixSeparators(text);
  }

  if (text !== original) {
    writeFileSync(file, text, 'utf8');
    changed++;
  }
}

console.log(`Changed ${changed} files`);

const app = readFileSync(join(ROOT, 'src', 'App.tsx'), 'utf8');
for (const [needle, label] of [
  ['Ήπιο check-in μελέτης', 'App gentle title'],
  ['Ας κάνουμε ήσυχα', 'App check-in prompt'],
  ['Βοήθησέ με να κατανοήσω', 'App help understand'],
  ['Πλήρες workspace', 'App full workspace'],
]) {
  console.log(app.includes(needle) ? `OK ${label}` : `MISSING ${label}`);
}
console.log(corruptionScore(app) === 0 ? 'OK App.tsx clean' : `FAIL App score=${corruptionScore(app)}`);

const canon = readFileSync(join(ROOT, 'src', 'components', 'AssignmentCanonPanel.tsx'), 'utf8');
console.log(!/Ξ’Β·/.test(canon) && / · /.test(canon) ? 'OK AssignmentCanon separators' : 'FAIL AssignmentCanon');

const agent = readFileSync(join(ROOT, 'src', 'components', 'Agent.tsx'), 'utf8');
console.log(agent.includes('Το κράτησα') ? 'OK Agent ack' : 'MISSING Agent ack');
console.log(corruptionScore(agent) === 0 ? 'OK Agent clean' : `FAIL Agent score=${corruptionScore(agent)}`);

let remaining = 0;
const still = [];
for (const file of files) {
  const sc = corruptionScore(readFileSync(file, 'utf8'));
  if (sc > 0) {
    remaining++;
    if (still.length < 15) still.push(`${file.slice(ROOT.length + 1)} (${sc})`);
  }
}
console.log(`Remaining corrupted files: ${remaining}`);
for (const x of still) console.log(' ', x);
