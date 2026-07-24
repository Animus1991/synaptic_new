import type { I18nKey } from './i18n';
import { loadJson, saveJson } from './persistence';

const STORAGE_KEY = 'workspace-tour-complete-v1';

export type WorkspaceTourStepId =
  | 'welcome'
  | 'step-rail'
  | 'theory-practice'
  | 'split-lesson'
  | 'tools'
  | 'discoverability'
  | 'done';

export type WorkspaceTourStep = {
  id: WorkspaceTourStepId;
  target?: string | string[];
  titleKey: I18nKey;
  bodyKey: I18nKey;
};

export const WORKSPACE_TOUR_STEPS: WorkspaceTourStep[] = [
  {
    id: 'welcome',
    titleKey: 'wsTourWelcomeTitle',
    bodyKey: 'wsTourWelcomeBody',
  },
  {
    id: 'step-rail',
    target: 'workspace-step-rail',
    titleKey: 'wsTourStepRailTitle',
    bodyKey: 'wsTourStepRailBody',
  },
  {
    id: 'theory-practice',
    target: 'workspace-theory-practice-lens',
    titleKey: 'wsTourLensTitle',
    bodyKey: 'wsTourLensBody',
  },
  {
    id: 'split-lesson',
    target: 'workspace-split-layout',
    titleKey: 'wsTourSplitTitle',
    bodyKey: 'wsTourSplitBody',
  },
  {
    id: 'tools',
    target: 'workspace-tool-strip',
    titleKey: 'wsTourToolsTitle',
    bodyKey: 'wsTourToolsBody',
  },
  {
    id: 'discoverability',
    target: 'workspace-discoverability',
    titleKey: 'wsTourDiscoverTitle',
    bodyKey: 'wsTourDiscoverBody',
  },
  {
    id: 'done',
    titleKey: 'wsTourDoneTitle',
    bodyKey: 'wsTourDoneBody',
  },
];

export function isWorkspaceTourComplete(): boolean {
  return loadJson(STORAGE_KEY, false);
}

export function markWorkspaceTourComplete(): void {
  saveJson(STORAGE_KEY, true);
}

export function getWorkspaceTourStep(index: number): WorkspaceTourStep | null {
  return WORKSPACE_TOUR_STEPS[index] ?? null;
}
