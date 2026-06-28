/**
 * Wave 5A — Progress/Dashboard projection of weak spots + remediation matrix.
 * Reads the same spine as WeakAreasFocusRail + ConceptBusPanel.
 */

import type { Lang } from './i18n';
import { buildConceptBusRows, rowFromActivity, type ConceptBusRow } from './conceptBusPanelModel';
import {
  buildConceptRemediationMatrix,
  type ConceptRemediationAction,
} from './conceptBusRemediation';
import type { WeakSpotWithReasons } from './weakAreaReasons';
import { enrichWeakSpotsWithReasons } from './weakAreaReasons';
import type { WeakSpotRef } from './workspaceWeakAreas';
import { mergeConceptBusState, type ConceptBusMap } from './conceptBusSync';
import { loadAllConceptBuses } from './workspacePersistence';
import { activityFor, type ConceptBusState } from './workspaceConceptBus';
import { normalizeFocusTerm } from './workspaceFocus';

export type DashboardWeakSpot = WeakSpotWithReasons & {
  remediation: ConceptRemediationAction[];
};

export function mergeStoredConceptBuses(maps: ConceptBusMap): ConceptBusState {
  let merged: ConceptBusState = {};
  for (const bus of Object.values(maps)) {
    if (bus && typeof bus === 'object') {
      merged = mergeConceptBusState(merged, bus);
    }
  }
  return merged;
}

export function buildDashboardWeakSpotCards(
  weakAreas: Array<{ concept: string; mastery: number }>,
  lang: Lang,
): WeakSpotWithReasons[] {
  const stored = loadAllConceptBuses() as ConceptBusMap;
  const bus = mergeStoredConceptBuses(stored);
  const spots: WeakSpotRef[] = weakAreas.slice(0, 3).map((area) => ({
    concept: area.concept,
    mastery: area.mastery,
    course: '',
    source: 'model',
  }));
  return enrichWeakSpotsWithReasons(spots, bus, lang);
}

function rowForConcept(bus: ConceptBusState, concept: string): ConceptBusRow | null {
  const activity = activityFor(bus, concept);
  if (activity) return rowFromActivity(activity);
  const rows = buildConceptBusRows(bus, concept, 24);
  const key = normalizeFocusTerm(concept);
  return rows.find((r) => r.key === key || normalizeFocusTerm(r.concept) === key) ?? null;
}

function fallbackRemediationRow(concept: string, mastery: number): ConceptBusRow {
  return {
    key: normalizeFocusTerm(concept),
    concept,
    tools: [],
    signals: mastery < 50 ? [] : [],
    engagement: Math.max(0.1, mastery / 100),
    struggling: mastery < 55,
    confident: mastery >= 75,
    lastAt: Date.now(),
    isFocus: false,
  };
}

export function buildDashboardWeakSpots(
  spots: WeakSpotWithReasons[],
  bus: ConceptBusState,
  lang: Lang,
): DashboardWeakSpot[] {
  return spots.map((spot) => {
    const row = rowForConcept(bus, spot.concept) ?? fallbackRemediationRow(spot.concept, spot.mastery);
    const remediation = buildConceptRemediationMatrix(
      { ...row, struggling: row.struggling || spot.mastery < 55 },
      lang,
    );
    return { ...spot, remediation };
  });
}
