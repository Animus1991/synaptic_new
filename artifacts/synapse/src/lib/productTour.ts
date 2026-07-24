import type { AppView } from '../types';
import type { I18nKey } from './i18n';
import { loadJson, saveJson } from './persistence';

const STORAGE_KEY = 'product-tour-complete-v1';

export type ProductTourStepId =
  | 'welcome'
  | 'library-nav'
  | 'library-upload'
  | 'workspace-cta'
  | 'done';

export type ProductTourStep = {
  id: ProductTourStepId;
  /** Required view before highlighting target (auto-navigates on enter). */
  view?: AppView;
  /** Matches `[data-tour="…"]` — first visible match wins. */
  target?: string | string[];
  titleKey: I18nKey;
  bodyKey: I18nKey;
  navigateOnEnter?: AppView;
};

export const PRODUCT_TOUR_STEPS: ProductTourStep[] = [
  {
    id: 'welcome',
    view: 'dashboard',
    titleKey: 'tourWelcomeTitle',
    bodyKey: 'tourWelcomeBody',
  },
  {
    id: 'library-nav',
    view: 'dashboard',
    target: 'nav-library',
    titleKey: 'tourLibraryNavTitle',
    bodyKey: 'tourLibraryNavBody',
  },
  {
    id: 'library-upload',
    view: 'library',
    target: 'library-upload',
    titleKey: 'tourLibraryUploadTitle',
    bodyKey: 'tourLibraryUploadBody',
    navigateOnEnter: 'library',
  },
  {
    id: 'workspace-cta',
    view: 'dashboard',
    target: ['dashboard-workspace-cta', 'dashboard-upload'],
    titleKey: 'tourWorkspaceCtaTitle',
    bodyKey: 'tourWorkspaceCtaBody',
    navigateOnEnter: 'dashboard',
  },
  {
    id: 'done',
    view: 'dashboard',
    titleKey: 'tourDoneTitle',
    bodyKey: 'tourDoneBody',
    navigateOnEnter: 'dashboard',
  },
];

export function isProductTourComplete(): boolean {
  return loadJson(STORAGE_KEY, false);
}

export function markProductTourComplete(): void {
  saveJson(STORAGE_KEY, true);
}

export function clearProductTourComplete(): void {
  saveJson(STORAGE_KEY, false);
}

export function getProductTourStep(index: number): ProductTourStep | null {
  return PRODUCT_TOUR_STEPS[index] ?? null;
}

export function isProductTourStepReady(step: ProductTourStep, currentView: AppView): boolean {
  if (!step.view) return true;
  return step.view === currentView;
}
