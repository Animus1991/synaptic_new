/**
 * Wave 5E — Progress / session export (print-ready HTML + JSON snapshot).
 * Shares spine data: weak spots, tool activity, next actions, workspace recommendation.
 */

import type { Lang } from './i18n';
import type { ToolActivityCount } from './conceptBusPanelModel';
import type { DashboardWeakSpot } from './dashboardWeakSpotsModel';
import type { DashboardSessionContent } from './dashboardSessionModel';
import type { NextActionRecommendation } from './nextActionEngine';
import { nextActionLabel } from './nextActionEngine';
import { workspaceToolLabel } from './workspaceToolRegistry';
import type { WorkspaceToolId } from './taskFlows';

export type ProgressSessionExportPayload = {
  lang: Lang;
  generatedAt: string;
  concept: string;
  courseName?: string;
  sectionLabel?: string;
  readiness: number;
  streak: number;
  reviewsDue: number;
  studyTimeToday: number;
  studyTimeWeek: number;
  conceptsMastered: number;
  totalConcepts: number;
  weakSpots: DashboardWeakSpot[];
  toolActivity: ToolActivityCount[];
  nextActions: { label: string; type: string; minutes: number; xp?: number }[];
  workspaceNextAction: { primary: string; reason: string } | null;
  session: Pick<
    DashboardSessionContent,
    'engagedToolCount' | 'toolActivityCount' | 'weakSpotCount' | 'suggestFocusTool'
  >;
};

function readinessBand(readiness: number, lang: Lang): string {
  if (readiness >= 80) return lang === 'el' ? 'Ισχυρό' : 'Strong';
  if (readiness >= 60) return lang === 'el' ? 'Επαρκές' : 'Proficient';
  if (readiness >= 40) return lang === 'el' ? 'Αναπτυσσόμενο' : 'Developing';
  return lang === 'el' ? 'Αδύναμο' : 'Weak';
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function slugConcept(concept: string): string {
  return concept.slice(0, 32).replace(/\s+/g, '-').replace(/[^\w-]/g, '') || 'session';
}

export function buildProgressSessionExportPayload(opts: {
  lang: Lang;
  concept: string;
  courseName?: string;
  sectionLabel?: string;
  readiness: number;
  streak: number;
  reviewsDue: number;
  studyTimeToday?: number;
  studyTimeWeek?: number;
  conceptsMastered: number;
  totalConcepts: number;
  weakSpotsDetail?: DashboardWeakSpot[];
  weakSpots: { concept: string; mastery: number; course: string }[];
  toolActivity?: ToolActivityCount[];
  nextActions: { label: string; type: string; minutes: number; xp?: number }[];
  session: DashboardSessionContent;
  nextAction?: NextActionRecommendation | null;
}): ProgressSessionExportPayload {
  const {
    lang,
    concept,
    courseName,
    sectionLabel,
    readiness,
    streak,
    reviewsDue,
    studyTimeToday = 0,
    studyTimeWeek = 0,
    conceptsMastered,
    totalConcepts,
    weakSpotsDetail,
    weakSpots,
    toolActivity = [],
    nextActions,
    session,
    nextAction,
  } = opts;

  const weakExport: DashboardWeakSpot[] = weakSpotsDetail ?? weakSpots.map((w) => ({
    ...w,
    source: 'model' as const,
    reasons: [],
    remediation: [],
  }));

  return {
    lang,
    generatedAt: new Date().toISOString(),
    concept,
    courseName,
    sectionLabel,
    readiness,
    streak,
    reviewsDue,
    studyTimeToday,
    studyTimeWeek,
    conceptsMastered,
    totalConcepts,
    weakSpots: weakExport,
    toolActivity,
    nextActions,
    workspaceNextAction: nextAction
      ? {
        primary: nextActionLabel(nextAction.primary, lang),
        reason: nextAction.reason,
      }
      : null,
    session: {
      engagedToolCount: session.engagedToolCount,
      toolActivityCount: session.toolActivityCount,
      weakSpotCount: session.weakSpotCount,
      suggestFocusTool: session.suggestFocusTool,
    },
  };
}

export function buildProgressSessionJson(payload: ProgressSessionExportPayload): string {
  return JSON.stringify(payload, null, 2);
}

export function buildProgressSessionHtml(payload: ProgressSessionExportPayload): string {
  const {
    lang,
    generatedAt,
    concept,
    courseName,
    sectionLabel,
    readiness,
    streak,
    reviewsDue,
    studyTimeToday,
    studyTimeWeek,
    conceptsMastered,
    totalConcepts,
    weakSpots,
    toolActivity,
    nextActions,
    workspaceNextAction,
    session,
  } = payload;
  const isEl = lang === 'el';
  const title = isEl ? 'Αναφορά προόδου συνεδρίας' : 'Study session progress report';
  const band = readinessBand(readiness, lang);

  const statsRows = [
    [isEl ? 'Ετοιμότητα εξετάσεων' : 'Exam readiness', `${readiness}% (${band})`],
    [isEl ? 'Έννοιες' : 'Concepts', `${conceptsMastered}/${totalConcepts}`],
    [isEl ? 'Σειρά ημερών' : 'Streak', `${streak}d`],
    [isEl ? 'Ληξιπρόθεσμα' : 'Due reviews', String(reviewsDue)],
    [isEl ? 'Μελέτη σήμερα' : 'Study today', `${studyTimeToday}m`],
    [isEl ? 'Μελέτη εβδομάδας' : 'Study this week', `${studyTimeWeek}m`],
    [isEl ? 'Εργαλεία συνεδρίας' : 'Session tools', String(session.engagedToolCount)],
    [isEl ? 'Ενέργειες εργαλείων' : 'Tool actions', String(session.toolActivityCount)],
  ].map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`).join('');

  const weakBlock = weakSpots.length === 0
    ? `<p>${isEl ? 'Καμία αδύναμη έννοια.' : 'No weak concepts.'}</p>`
    : `<table><thead><tr>
        <th>${isEl ? 'Έννοια' : 'Concept'}</th>
        <th>${isEl ? 'Μάθημα' : 'Course'}</th>
        <th>${isEl ? 'Εξοικείωση' : 'Mastery'}</th>
        <th>${isEl ? 'Λόγοι' : 'Reasons'}</th>
        <th>${isEl ? 'Επανόρθωση' : 'Remediation'}</th>
      </tr></thead><tbody>${weakSpots.map((w) => `
        <tr>
          <td>${escapeHtml(w.concept)}</td>
          <td>${escapeHtml(w.course)}</td>
          <td>${w.mastery}%</td>
          <td>${w.reasons.map((r) => escapeHtml(r.label)).join('<br/>') || '—'}</td>
          <td>${w.remediation.map((a) => escapeHtml(a.label)).join(', ') || '—'}</td>
        </tr>`).join('')}</tbody></table>`;

  const toolBlock = toolActivity.length === 0
    ? `<p>${isEl ? 'Δεν καταγράφηκαν εργαλεία.' : 'No tool activity recorded.'}</p>`
    : `<ul>${toolActivity.map((row) =>
      `<li>${escapeHtml(workspaceToolLabel(row.tool as WorkspaceToolId, lang))} ×${row.count}</li>`,
    ).join('')}</ul>`;

  const taskBlock = nextActions.length === 0
    ? `<p>${isEl ? 'Δεν υπάρχουν εργασίες.' : 'No scheduled tasks.'}</p>`
    : `<ul>${nextActions.map((a) =>
      `<li><strong>${escapeHtml(a.label)}</strong> — ${a.minutes}m${a.xp != null ? ` · +${a.xp} XP` : ''}</li>`,
    ).join('')}</ul>`;

  const nextActionBlock = workspaceNextAction
    ? `<section><h2>${isEl ? 'Επόμενη ενέργεια workspace' : 'Workspace next action'}</h2>
       <p><strong>${escapeHtml(workspaceNextAction.primary)}</strong></p>
       <p>${escapeHtml(workspaceNextAction.reason)}</p></section>`
    : '';

  const suggestTool = session.suggestFocusTool
    ? workspaceToolLabel(session.suggestFocusTool, lang)
    : null;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title} — ${escapeHtml(concept)}</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:800px;margin:2rem auto;color:#111;line-height:1.5}
  h1{font-size:1.35rem} h2{font-size:1rem;margin-top:1.5rem}
  table{width:100%;border-collapse:collapse;margin:0.75rem 0;font-size:13px}
  th,td{border:1px solid #ccc;padding:8px;text-align:left;vertical-align:top}
  th{background:#f4f4f5;width:38%}
  .meta{color:#555;font-size:13px}
  @media print{body{margin:1cm}}
</style></head><body>
<h1>${title}</h1>
<p class="meta">
  <strong>${isEl ? 'Έννοια' : 'Concept'}:</strong> ${escapeHtml(concept)}
  ${courseName ? ` · <strong>${isEl ? 'Μάθημα' : 'Course'}:</strong> ${escapeHtml(courseName)}` : ''}
  ${sectionLabel ? ` · <strong>${isEl ? 'Ενότητα' : 'Section'}:</strong> ${escapeHtml(sectionLabel)}` : ''}
</p>
<p class="meta">${isEl ? 'Εξαγωγή' : 'Exported'}: ${generatedAt.slice(0, 19).replace('T', ' ')} UTC</p>
${suggestTool ? `<p class="meta">${isEl ? 'Προτεινόμενο εργαλείο' : 'Suggested tool'}: ${escapeHtml(suggestTool)}</p>` : ''}

<h2>${isEl ? 'Σύνοψη' : 'Summary'}</h2>
<table><tbody>${statsRows}</tbody></table>

<h2>${isEl ? 'Αδύναμα σημεία' : 'Weak spots'}</h2>
${weakBlock}

<h2>${isEl ? 'Εργαλεία συνεδρίας' : 'Session tool activity'}</h2>
${toolBlock}

<h2>${isEl ? 'Επόμενες εργασίες' : 'Next tasks'}</h2>
${taskBlock}
${nextActionBlock}

<p style="font-size:10px;color:#666;margin-top:2rem">Synapse Study Workspace · Concept Bus correlation export</p>
</body></html>`;
}

export function progressSessionFilename(concept: string, ext: 'html' | 'json'): string {
  const date = new Date().toISOString().slice(0, 10);
  return `progress-${slugConcept(concept)}-${date}.${ext}`;
}

export function downloadProgressSessionReport(filename: string, html: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.html') ? filename : `${filename}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadProgressSessionJson(filename: string, json: string): void {
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.json') ? filename : `${filename}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function printProgressSessionReport(html: string): void {
  const win = window.open('', '_blank', 'noopener,noreferrer');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}
