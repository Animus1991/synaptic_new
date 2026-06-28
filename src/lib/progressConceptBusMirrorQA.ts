/**
 * Wave 6.8m — QA spine for Progress export ↔ Concept Bus mirror parity.
 */

import { t, type Lang } from './i18n';
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
  const lang = input.lang;
  if (input.rowCount === 0 && input.weakSpotCount === 0) {
    return t('qaExportBusEmpty', lang);
  }

  const busNote = input.rowCount === 1
    ? t('qaExportBusConceptOne', lang)
    : t('qaExportBusConceptMany', lang).replace('{count}', String(input.rowCount));
  const feynmanNote = input.feynmanCount > 0
    ? t('qaExportFeynmanNote', lang).replace('{count}', String(input.feynmanCount))
    : '';
  const weakNote = input.weakSpotCount > 0
    ? t('qaExportWeakNote', lang).replace('{count}', String(input.weakSpotCount))
    : '';
  const nextNote = input.hasNextAction ? t('qaExportNextActionNote', lang) : '';

  return `${t('qaExportSessionPrefix', lang)} · ${busNote}${feynmanNote}${weakNote}${nextNote}${input.ok ? '' : t('qaExportCheckNote', lang)}`;
}
