import type { CoachFeedback } from './feynmanCoach';
import type { RubricDimension, RubricScores } from './feynmanRubric';

const DIM_LABELS: Record<RubricDimension, string> = {
  accuracy: 'Accuracy',
  completeness: 'Completeness',
  simplicity: 'Simplicity',
  structure: 'Structure',
};

export function buildFeynmanRubricHtml(opts: {
  concept: string;
  explanation: string;
  scores: RubricScores;
  weak: RubricDimension[];
  coach?: CoachFeedback | null;
  lang?: 'en' | 'el';
}): string {
  const { concept, explanation, scores, weak, coach, lang = 'en' } = opts;
  const title = lang === 'el' ? 'Αναφορά Feynman' : 'Feynman Rubric Report';
  const dims = (Object.keys(scores) as RubricDimension[]).map((d) => `
    <tr>
      <td>${DIM_LABELS[d]}</td>
      <td style="text-align:right;font-weight:600">${scores[d]}%</td>
    </tr>
  `).join('');

  const weakList = weak.length
    ? `<ul>${weak.map((w) => `<li><strong>${DIM_LABELS[w]}</strong></li>`).join('')}</ul>`
    : `<p>${lang === 'el' ? 'Καμία κρίσιμη αδυναμία.' : 'No critical gaps.'}</p>`;

  const coachBlock = coach
    ? `<section><h2>${lang === 'el' ? 'Προπονητής' : 'Coach'}</h2>
       <p><strong>${escapeHtml(coach.headline)}</strong></p>
       <h3>${lang === 'el' ? 'Δυνατά' : 'Strengths'}</h3><ul>${coach.strengths.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ul>
       <h3>${lang === 'el' ? 'Βελτίωση' : 'Improve'}</h3><ul>${coach.improvements.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ul>
       ${coach.rewrite ? `<p style="white-space:pre-wrap">${escapeHtml(coach.rewrite)}</p>` : ''}
       <p><em>${escapeHtml(coach.nextStep)}</em></p></section>`
    : '';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title} — ${escapeHtml(concept)}</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:720px;margin:2rem auto;color:#111;line-height:1.5}
  h1{font-size:1.25rem} table{width:100%;border-collapse:collapse;margin:1rem 0}
  td,th{border:1px solid #ccc;padding:8px} th{text-align:left;background:#f4f4f5}
  .excerpt{background:#f8fafc;border-left:3px solid #6366f1;padding:12px;white-space:pre-wrap}
  @media print{body{margin:1cm}}
</style></head><body>
<h1>${title}</h1>
<p><strong>${lang === 'el' ? 'Έννοια' : 'Concept'}:</strong> ${escapeHtml(concept)}</p>
<h2>${lang === 'el' ? 'Εξήγηση' : 'Explanation'}</h2>
<div class="excerpt">${escapeHtml(explanation)}</div>
<h2>${lang === 'el' ? 'Ρουμπρίκα' : 'Rubric'}</h2>
<table><thead><tr><th>${lang === 'el' ? 'Διάσταση' : 'Dimension'}</th><th>Score</th></tr></thead><tbody>${dims}</tbody></table>
<h2>${lang === 'el' ? 'Κενά' : 'Gaps'}</h2>${weakList}
${coachBlock}
<p style="font-size:10px;color:#666;margin-top:2rem">Synapse Study Workspace · ${new Date().toISOString().slice(0, 10)}</p>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Download print-ready HTML (Save as PDF via browser print). */
export function downloadFeynmanRubricReport(filename: string, html: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.html') ? filename : `${filename}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

export function printFeynmanRubricReport(html: string): void {
  const win = window.open('', '_blank', 'noopener,noreferrer');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}
