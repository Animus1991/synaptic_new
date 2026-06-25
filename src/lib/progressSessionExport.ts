/**
 * Wave 5E έΑΦ Progress / session export (print-ready HTML + JSON snapshot).
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
import type { ConceptBusRow } from './conceptBusPanelModel';

export type ConceptBusExportSnapshot = {
  concept: string;
  tools: string[];
  engagement: number;
  struggling: boolean;
  confident: boolean;
  isFocus: boolean;
};

export function buildConceptBusExportSnapshot(rows: ConceptBusRow[]): ConceptBusExportSnapshot[] {
  return rows.map((row) => ({
    concept: row.concept,
    tools: row.tools,
    engagement: row.engagement,
    struggling: row.struggling,
    confident: row.confident,
    isFocus: row.isFocus,
  }));
}

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
  feynmanActivityCount: number;
  conceptBusSnapshot: ConceptBusExportSnapshot[];
  nextActions: { label: string; type: string; minutes: number; xp?: number }[];
  workspaceNextAction: { primary: string; reason: string } | null;
  session: Pick<
    DashboardSessionContent,
    'engagedToolCount' | 'toolActivityCount' | 'weakSpotCount' | 'suggestFocusTool'
  >;
};

function readinessBand(readiness: number, lang: Lang): string {
  if (readiness >= 80) return lang === 'el' ? '╬β╧Δ╧Θ╧Ζ╧Β╧Ν' : 'Strong';
  if (readiness >= 60) return lang === 'el' ? '╬Χ╧Α╬▒╧Β╬║╬φ╧Γ' : 'Proficient';
  if (readiness >= 40) return lang === 'el' ? '╬Σ╬╜╬▒╧Α╧Ε╧Ζ╧Δ╧Δ╧Ν╬╝╬╡╬╜╬┐' : 'Developing';
  return lang === 'el' ? '╬Σ╬┤╧Ξ╬╜╬▒╬╝╬┐' : 'Weak';
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
  conceptBusSnapshot?: ConceptBusExportSnapshot[];
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
    conceptBusSnapshot = [],
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
    feynmanActivityCount: toolActivity.find((row) => row.tool === 'feynman')?.count ?? 0,
    conceptBusSnapshot,
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
    feynmanActivityCount,
    conceptBusSnapshot,
    nextActions,
    workspaceNextAction,
    session,
  } = payload;
  const isEl = lang === 'el';
  const title = isEl ? '╬Σ╬╜╬▒╧Η╬┐╧Β╬υ ╧Α╧Β╬┐╧Ν╬┤╬┐╧Ζ ╧Δ╧Ζ╬╜╬╡╬┤╧Β╬ψ╬▒╧Γ' : 'Study session progress report';
  const band = readinessBand(readiness, lang);

  const statsRows = [
    [isEl ? '╬Χ╧Ε╬┐╬╣╬╝╧Ν╧Ε╬╖╧Ε╬▒ ╬╡╬╛╬╡╧Ε╬υ╧Δ╬╡╧Κ╬╜' : 'Exam readiness', `${readiness}% (${band})`],
    [isEl ? '╬Ι╬╜╬╜╬┐╬╣╬╡╧Γ' : 'Concepts', `${conceptsMastered}/${totalConcepts}`],
    [isEl ? '╬μ╬╡╬╣╧Β╬υ ╬╖╬╝╬╡╧Β╧Ο╬╜' : 'Streak', `${streak}d`],
    [isEl ? '╬δ╬╖╬╛╬╣╧Α╧Β╧Ν╬╕╬╡╧Δ╬╝╬▒' : 'Due reviews', String(reviewsDue)],
    [isEl ? '╬ε╬╡╬╗╬φ╧Ε╬╖ ╧Δ╬χ╬╝╬╡╧Β╬▒' : 'Study today', `${studyTimeToday}m`],
    [isEl ? '╬ε╬╡╬╗╬φ╧Ε╬╖ ╬╡╬▓╬┤╬┐╬╝╬υ╬┤╬▒╧Γ' : 'Study this week', `${studyTimeWeek}m`],
    [isEl ? '╬Χ╧Β╬│╬▒╬╗╬╡╬ψ╬▒ ╧Δ╧Ζ╬╜╬╡╬┤╧Β╬ψ╬▒╧Γ' : 'Session tools', String(session.engagedToolCount)],
    [isEl ? '╬Χ╬╜╬φ╧Β╬│╬╡╬╣╬╡╧Γ ╬╡╧Β╬│╬▒╬╗╬╡╬ψ╧Κ╬╜' : 'Tool actions', String(session.toolActivityCount)],
  ].map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`).join('');

  const weakBlock = weakSpots.length === 0
    ? `<p>${isEl ? '╬γ╬▒╬╝╬ψ╬▒ ╬▒╬┤╧Ξ╬╜╬▒╬╝╬╖ ╬φ╬╜╬╜╬┐╬╣╬▒.' : 'No weak concepts.'}</p>`
    : `<table><thead><tr>
        <th>${isEl ? '╬Ι╬╜╬╜╬┐╬╣╬▒' : 'Concept'}</th>
        <th>${isEl ? '╬ε╬υ╬╕╬╖╬╝╬▒' : 'Course'}</th>
        <th>${isEl ? '╬Χ╬╛╬┐╬╣╬║╬╡╬ψ╧Κ╧Δ╬╖' : 'Mastery'}</th>
        <th>${isEl ? '╬δ╧Ν╬│╬┐╬╣' : 'Reasons'}</th>
        <th>${isEl ? '╬Χ╧Α╬▒╬╜╧Ν╧Β╬╕╧Κ╧Δ╬╖' : 'Remediation'}</th>
      </tr></thead><tbody>${weakSpots.map((w) => `
        <tr>
          <td>${escapeHtml(w.concept)}</td>
          <td>${escapeHtml(w.course)}</td>
          <td>${w.mastery}%</td>
          <td>${w.reasons.map((r) => escapeHtml(r.label)).join('<br/>') || 'έΑΦ'}</td>
          <td>${w.remediation.map((a) => escapeHtml(a.label)).join(', ') || 'έΑΦ'}</td>
        </tr>`).join('')}</tbody></table>`;

  const toolBlock = toolActivity.length === 0
    ? `<p>${isEl ? '╬Φ╬╡╬╜ ╬║╬▒╧Ε╬▒╬│╧Β╬υ╧Η╬╖╬║╬▒╬╜ ╬╡╧Β╬│╬▒╬╗╬╡╬ψ╬▒.' : 'No tool activity recorded.'}</p>`
    : `<ul>${toolActivity.map((row) =>
      `<li>${escapeHtml(workspaceToolLabel(row.tool as WorkspaceToolId, lang))} ├Ω${row.count}</li>`,
    ).join('')}</ul>`;

  const busBlock = conceptBusSnapshot.length === 0
    ? `<p>${isEl ? 'Concept Bus ╬║╬╡╬╜╧Ν έΑΦ ╬┤╬╡╬╜ ╬║╬▒╧Ε╬▒╬│╧Β╬υ╧Η╬╖╬║╬▒╬╜ ╧Δ╧Ζ╧Δ╧Θ╬╡╧Ε╬ψ╧Δ╬╡╬╣╧Γ ╬╡╬╜╬╜╬┐╬╣╧Ο╬╜.' : 'Concept Bus empty έΑΦ no concept correlations recorded.'}</p>`
    : `<table><thead><tr>
        <th>${isEl ? '╬Ι╬╜╬╜╬┐╬╣╬▒' : 'Concept'}</th>
        <th>${isEl ? '╬Χ╧Β╬│╬▒╬╗╬╡╬ψ╬▒' : 'Tools'}</th>
        <th>${isEl ? 'Engagement' : 'Engagement'}</th>
        <th>${isEl ? '╬γ╬▒╧Ε╬υ╧Δ╧Ε╬▒╧Δ╬╖' : 'Status'}</th>
      </tr></thead><tbody>${conceptBusSnapshot.map((row) => {
        const status = row.struggling
          ? (isEl ? '╬Σ╬┤╧Ξ╬╜╬▒╬╝╬┐' : 'Struggling')
          : row.confident
            ? (isEl ? '╬β╧Δ╧Θ╧Ζ╧Β╧Ν' : 'Confident')
            : 'έΑΦ';
        return `<tr>
          <td>${escapeHtml(row.concept)}${row.isFocus ? ' έαΖ' : ''}</td>
          <td>${row.tools.map((t) => escapeHtml(workspaceToolLabel(t as WorkspaceToolId, lang))).join(', ') || 'έΑΦ'}</td>
          <td>${row.engagement}</td>
          <td>${escapeHtml(status)}</td>
        </tr>`;
      }).join('')}</tbody></table>`;

  const feynmanBlock = feynmanActivityCount > 0
    ? `<p class="meta">${isEl ? 'Feynman ╬╡╬╜╬φ╧Β╬│╬╡╬╣╬╡╧Γ' : 'Feynman actions'}: ${feynmanActivityCount}</p>`
    : '';

  const taskBlock = nextActions.length === 0
    ? `<p>${isEl ? '╬Φ╬╡╬╜ ╧Ζ╧Α╬υ╧Β╧Θ╬┐╧Ζ╬╜ ╬╡╧Β╬│╬▒╧Δ╬ψ╬╡╧Γ.' : 'No scheduled tasks.'}</p>`
    : `<ul>${nextActions.map((a) =>
      `<li><strong>${escapeHtml(a.label)}</strong> έΑΦ ${a.minutes}m${a.xp != null ? ` ┬╖ +${a.xp} XP` : ''}</li>`,
    ).join('')}</ul>`;

  const nextActionBlock = workspaceNextAction
    ? `<section><h2>${isEl ? '╬Χ╧Α╧Ν╬╝╬╡╬╜╬╖ ╬╡╬╜╬φ╧Β╬│╬╡╬╣╬▒ workspace' : 'Workspace next action'}</h2>
       <p><strong>${escapeHtml(workspaceNextAction.primary)}</strong></p>
       <p>${escapeHtml(workspaceNextAction.reason)}</p></section>`
    : '';

  const suggestTool = session.suggestFocusTool
    ? workspaceToolLabel(session.suggestFocusTool, lang)
    : null;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title} έΑΦ ${escapeHtml(concept)}</title>
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
  <strong>${isEl ? '╬Ι╬╜╬╜╬┐╬╣╬▒' : 'Concept'}:</strong> ${escapeHtml(concept)}
  ${courseName ? ` ┬╖ <strong>${isEl ? '╬ε╬υ╬╕╬╖╬╝╬▒' : 'Course'}:</strong> ${escapeHtml(courseName)}` : ''}
  ${sectionLabel ? ` ┬╖ <strong>${isEl ? '╬Χ╬╜╧Ν╧Ε╬╖╧Ε╬▒' : 'Section'}:</strong> ${escapeHtml(sectionLabel)}` : ''}
</p>
<p class="meta">${isEl ? '╬Χ╬╛╬▒╬│╧Κ╬│╬χ' : 'Exported'}: ${generatedAt.slice(0, 19).replace('T', ' ')} UTC</p>
${suggestTool ? `<p class="meta">${isEl ? '╬ι╧Β╬┐╧Ε╬╡╬╣╬╜╧Ν╬╝╬╡╬╜╬┐ ╬╡╧Β╬│╬▒╬╗╬╡╬ψ╬┐' : 'Suggested tool'}: ${escapeHtml(suggestTool)}</p>` : ''}

<h2>${isEl ? '╬μ╧Ξ╬╜╬┐╧Ι╬╖' : 'Summary'}</h2>
<table><tbody>${statsRows}</tbody></table>

<h2>${isEl ? '╬Σ╬┤╧Ξ╬╜╬▒╬╝╬▒ ╧Δ╬╖╬╝╬╡╬ψ╬▒' : 'Weak spots'}</h2>
${weakBlock}

<h2>${isEl ? '╬Χ╧Β╬│╬▒╬╗╬╡╬ψ╬▒ ╧Δ╧Ζ╬╜╬╡╬┤╧Β╬ψ╬▒╧Γ' : 'Session tool activity'}</h2>
${toolBlock}
${feynmanBlock}

<h2>${isEl ? 'Concept Bus (mirror)' : 'Concept Bus mirror'}</h2>
${busBlock}

<h2>${isEl ? '╬Χ╧Α╧Ν╬╝╬╡╬╜╬╡╧Γ ╬╡╧Β╬│╬▒╧Δ╬ψ╬╡╧Γ' : 'Next tasks'}</h2>
${taskBlock}
${nextActionBlock}

<p style="font-size:10px;color:#666;margin-top:2rem">Synapse Study Workspace ┬╖ Concept Bus correlation export</p>
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
