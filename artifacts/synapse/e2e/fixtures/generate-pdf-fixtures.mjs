/**
 * Generates multi-page and scanned PDF fixtures for L17 thumbnail E2E (no external deps).
 * Usage: node e2e/fixtures/generate-pdf-fixtures.mjs
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

function pdfTextOperand(value) {
  if (/[^\x00-\x7F]/.test(value)) {
    let hex = 'FEFF';
    for (const ch of value) {
      hex += ch.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0');
    }
    return `<${hex}>`;
  }
  return `(${value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')})`;
}

function assemblePdf(objects) {
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

/** Build a text-layer PDF with `pageCount` pages (one line per page). */
export function buildTextPdf(pageCount) {
  const pageRefs = [];
  const pageObjects = [];
  let objId = 5;

  for (let p = 0; p < pageCount; p++) {
    const pageId = objId;
    const contentId = objId + 1;
    pageRefs.push(`${pageId} 0 R`);
    const line = `Page ${p + 1} of ${pageCount} — syllabus excerpt for thumbnail QA.`;
    const ops = `BT /F1 11 Tf 72 720 Td ${pdfTextOperand(line)} Tj ET\n`;
    const streamLen = Buffer.byteLength(ops, 'latin1');
    pageObjects.push(
      `${pageId} 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>/Contents ${contentId} 0 R>>endobj\n`,
      `${contentId} 0 obj<</Length ${streamLen}>>stream\n${ops}endstream\nendobj\n`,
    );
    objId += 2;
  }

  const objects = [
    '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n',
    `2 0 obj<</Type/Pages/Kids[${pageRefs.join(' ')}]/Count ${pageCount}>>endobj\n`,
    '4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n',
    ...pageObjects,
  ];
  return assemblePdf(objects);
}

/** Minimal 1-page PDF with only a raster image (no text layer) — scanned-doc proxy. */
export function buildScannedPdf() {
  const jpegHex =
    'FFD8FFE000104A46494600010100000100010000FFDB004300080606070605080707070909080A0C140D0C0B0B0C1912130F141D1A1F1E1D1A1C1C20242E2720222C231C1C2837292C30313434341F27393D38323C2E333432FFDB0043010909090C0B0C180D0D1832211C213232323232323232323232323232323232323232323232323232323232323232323232323232FFC00011080001000103011100021100031100FFC401000000000000000000000000000000000000000000FFC40014000100000000000000000000000000000000FFDA0008010100003F00D2CF20FFD9';
  const jpegBytes = Buffer.from(jpegHex, 'hex');

  const objects = [
    '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n',
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n',
    `3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<</XObject<</Im1 4 0 R>>>>/Contents 5 0 R>>endobj\n`,
    `4 0 obj<</Type/XObject/Subtype/Image/Width 1/Height 1/ColorSpace/DeviceRGB/BitsPerComponent 8/Filter/DCTDecode/Length ${jpegBytes.length}>>stream\n${jpegBytes.toString('binary')}\nendstream\nendobj\n`,
    '5 0 obj<</Length 44>>stream\nq 200 0 0 200 100 200 cm /Im1 Do Q\nendstream\nendobj\n',
  ];
  return assemblePdf(objects);
}

const outDir = dirname(fileURLToPath(import.meta.url));

writeFileSync(join(outDir, 'syllabus-50page.pdf'), buildTextPdf(50));
writeFileSync(join(outDir, 'syllabus-300page.pdf'), buildTextPdf(300));
writeFileSync(join(outDir, 'scanned-1page.pdf'), buildScannedPdf());

console.log('Wrote syllabus-50page.pdf, syllabus-300page.pdf, scanned-1page.pdf');
