/**
 * Generates e2e/fixtures/greek-syllabus-min.pdf — minimal PDF with a text layer
 * containing Greek syllabus excerpt (no external deps).
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const LINES = [
  'ΔΙΑΛΕΞΗ 1 ΕΙΣΑΓΩΓΗ ΣΤΗ ΔΙΕΘΝΗ ΟΙΚΟΝΟΜΙΚΗ',
  'Θεματική: εμπορική πολιτική, ισοζύγιο πληρωμών.',
  'Indicator Value Inflation 3.2% Unemployment 6.1%',
  'ΔΙΑΛΕΞΗ 2 ΘΕΩΡΙΑ ΣΥΓΚΡΙΤΙΚΩΝ ΠΛΕΟΝΕΚΤΗΜΑΤΩΝ',
  'Απόλυτα πλεονεκτήματα και διεθνές εμπόριο.',
  'Bibliography Krugman International Economics Pearson.',
];

function toUtf16BeHex(value) {
  let hex = 'FEFF';
  for (const ch of value) {
    hex += ch.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0');
  }
  return `<${hex}>`;
}

function pdfTextOperand(value) {
  if (/[^\x00-\x7F]/.test(value)) return toUtf16BeHex(value);
  return `(${value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')})`;
}

function buildPdf(textLines) {
  let y = 720;
  const ops = textLines
    .map((line) => {
      const op = `BT /F1 11 Tf 72 ${y} Td ${pdfTextOperand(line)} Tj ET\n`;
      y -= 18;
      return op;
    })
    .join('');
  const streamLen = Buffer.byteLength(ops, 'latin1');

  const objects = [
    '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n',
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n',
    '3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj\n',
    '4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n',
    `5 0 obj<</Length ${streamLen}>>stream\n${ops}endstream\nendobj\n`,
  ];

  let body = '%PDF-1.4\n';
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(body, 'latin1'));
    body += obj;
  }
  const xrefStart = Buffer.byteLength(body, 'latin1');
  body += `xref\n0 ${objects.length + 1}\n`;
  body += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i++) {
    body += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  body += `trailer<</Size ${objects.length + 1}/Root 1 0 R>>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(body, 'latin1');
}

const outDir = dirname(fileURLToPath(import.meta.url));
const outPath = join(outDir, 'greek-syllabus-min.pdf');
writeFileSync(outPath, buildPdf(LINES));
console.log(`Wrote ${outPath} (${LINES.length} lines)`);
