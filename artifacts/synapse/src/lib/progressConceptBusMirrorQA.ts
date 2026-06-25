/**
 * Wave 6.8m — QA spine for Progress export ↔ Concept Bus mirror parity.
 */

import type { Lang } from './i18n';
import type { ConceptBusRow } from './conceptBusPanelModel';
import type { ToolActivityCount } from './conceptBusPanelModel';
import type { DashboardWeakSpot } from './dashboardWeakSpotsModel';
import type { NextActionRecommendation } from './nextActionEngine';
import type { ProgressSessionExportPayload } from './progressSessionExport';
import {
  buildConceptBusExportSnapshot,
  buildProgressSessionExportPayload,
  buildProgressSessionHtml,
} from './progressSessionExport';
import type { DashboardSessionContent } from './dashboardSessionModel';

export type ProgressConceptBusMirrorIssue = {
  code:
    | 'missing-bus-snapshot'
    | 'feynman-activity-gap'
    | 'weak-spot-mirror-gap'
    | 'next-action-mirror-gap'
    | 'export-html-gap';
  message: string;
};

export type ProgressConceptBusMirrorReport = {
  ok: boolean;
  conceptBusRowCount: number;
  feynmanActivityCount: number;
  weakSpotCount: number;
  hasNextAction: boolean;
  exportIncludesBus: boolean;
  issues: ProgressConceptBusMirrorIssue[];
  bannerSummary: string | null;
};

export function feynmanToolActivityCount(toolActivity: ToolActivityCount[]): number {
  return toolActivity.find((row) => row.tool === 'feynman')?.count ?? 0;
}

export function auditProgressConceptBusMirror(input: {
  lang: Lang;
  concept: string;
  conceptBusRows: ConceptBusRow[];
  toolActivity: ToolActivityCount[];
  weakSpotsDetail: DashboardWeakSpot[];
  session: DashboardSessionContent;
  nextAction?: NextActionRecommendation | null;
  readiness: number;
  streak: number;
  reviewsDue: number;
  conceptsMastered: number;
  totalConcepts: number;
  nextActions: { label: string; type: string; minutes: number; xp?: number }[];
}): ProgressConceptBusMirrorReport {
  const issues: ProgressConceptBusMirrorIssue[] = [];
  const snapshot = buildConceptBusExportSnapshot(input.conceptBusRows);
  const feynmanCount = feynmanToolActivityCount(input.toolActivity);

  const payload: ProgressSessionExportPayload = buildProgressSessionExportPayload({
    lang: input.lang,
    concept: input.concept,
    readiness: input.readiness,
    streak: input.streak,
    reviewsDue: input.reviewsDue,
    conceptsMastered: input.conceptsMastered,
    totalConcepts: input.totalConcepts,
    weakSpots: input.weakSpotsDetail.map((w) => ({
      concept: w.concept,
      mastery: w.mastery,
      course: w.course,
    })),
    weakSpotsDetail: input.weakSpotsDetail,
    toolActivity: input.toolActivity,
    nextActions: input.nextActions,
    session: input.session,
    nextAction: input.nextAction,
    conceptBusSnapshot: snapshot,
  });

  if (snapshot.length === 0 && input.conceptBusRows.length > 0) {
    issues.push({
      code: 'missing-bus-snapshot',
      message: 'Concept Bus rows exist but export snapshot is empty',
    });
  }

  if (payload.conceptBusSnapshot.length !== input.conceptBusRows.length) {
    issues.push({
      code: 'missing-bus-snapshot',
      message: `Snapshot ${payload.conceptBusSnapshot.length} vs bus ${input.conceptBusRows.length}`,
    });
  }

  if (feynmanCount > 0 && payload.feynmanActivityCount !== feynmanCount) {
    issues.push({
      code: 'feynman-activity-gap',
      message: `Feynman activity ${payload.feynmanActivityCount} vs bus ${feynmanCount}`,
    });
  }

  if (input.weakSpotsDetail.length > 0 && payload.weakSpots.length === 0) {
    issues.push({
      code: 'weak-spot-mirror-gap',
      message: 'Weak spots missing from export payload',
    });
  }

  if (input.nextAction && !payload.workspaceNextAction) {
    issues.push({
      code: 'next-action-mirror-gap',
      message: 'Next action not mirrored in export payload',
    });
  }

  const html = buildProgressSessionHtml(payload);
  const exportIncludesBus = html.includes('Concept Bus') || html.includes('Concept bus');
  if (snapshot.length > 0 && !exportIncludesBus) {
    issues.push({
      code: 'export-html-gap',
      message: 'HTML export missing Concept Bus section',
    });
  }

  return {
    ok: issues.length === 0,
    conceptBusRowCount: input.conceptBusRows.length,
    feynmanActivityCount: payload.feynmanActivityCount,
    weakSpotCount: payload.weakSpots.length,
    hasNextAction: Boolean(payload.workspaceNextAction),
    exportIncludesBus,
    issues,
    bannerSummary: formatProgressConceptBusMirrorBanner({
      lang: input.lang,
      rowCount: input.conceptBusRows.length,
      feynmanCount: payload.feynmanActivityCount,
      weakSpotCount: payload.weakSpots.length,
      hasNextAction: Boolean(payload.workspaceNextAction),
      ok: issues.length === 0,
    }),
  };
}

export function formatProgressConceptBusMirrorBanner(input: {
  lang: Lang;
  rowCount: number;
  feynmanCount: number;
  weakSpotCount: number;
  hasNextAction: boolean;
  ok: boolean;
}): string | null {
  const isEl = input.lang === 'el';
  if (input.rowCount === 0 && input.weakSpotCount === 0) {
    return isEl
      ? 'Export συνεδρίας · Concept Bus κενό — μελέτησε εργαλεία για mirror.'
      : 'Session export · Concept Bus empty — use tools to populate mirror.';
  }

  const busNote = isEl
    ? `${input.rowCount} έννοιες στο bus`
    : `${input.rowCount} bus concept${input.rowCount === 1 ? '' : 's'}`;
  const feynmanNote = input.feynmanCount > 0
    ? (isEl ? ` · Feynman ×${input.feynmanCount}` : ` · Feynman ×${input.feynmanCount}`)
    : '';
  const weakNote = input.weakSpotCount > 0
    ? (isEl ? ` · ${input.weakSpotCount} αδύναμα` : ` · ${input.weakSpotCount} weak`)
    : '';
  const nextNote = input.hasNextAction
    ? (isEl ? ' · next action' : ' · next action')
    : '';

  return `${isEl ? 'Export ↔ Concept Bus' : 'Export ↔ Concept Bus'} · ${busNote}${feynmanNote}${weakNote}${nextNote}${input.ok ? '' : (isEl ? ' · έλεγχος' : ' · check')}`;
}
