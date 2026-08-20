import { describe, expect, it } from 'vitest';
import { t, type I18nKey } from './i18n';

const ANALYTICS_KEYS: I18nKey[] = [
  'analyticsTabMastery',
  'analyticsStrongAreas',
  'analyticsErrorPatterns',
  'analyticsInsightsLearnedTitle',
  'analyticsRecommendationsEmpty',
  'analyticsRetentionCurveTitle',
  'analyticsRetentionCurveSubtitle',
  'analyticsRetentionCurveHint',
  'analyticsFsrsForecastAria',
  'analyticsHeatmapAria',
  'analyticsStudyBehaviorActivityAria',
  'analyticsStudyBehaviorEffectivenessAria',
  'analyticsStudyBehaviorNoSample',
  'analyticsStudyBehaviorSessionTypesAria',
  'analyticsStudyBehaviorNoEligibleRecall',
  'analyticsMasteryWord',
  'analyticsRecentActivityIncreased',
  'analyticsRecentActivityDecreased',
  'analyticsRecentActivitySteady',
  'analyticsConceptGraphAria',
  'analyticsConceptNodeMasteryAria',
  'analyticsConceptGraphPrerequisites',
  'analyticsConceptGraphNone',
];

const ANALYTICS_TEMPLATE_KEYS: I18nKey[] = [
  'analyticsFsrsForecastAria',
  'analyticsHeatmapAria',
  'analyticsStudyBehaviorActivityAria',
  'analyticsStudyBehaviorEffectivenessAria',
  'analyticsStudyBehaviorSessionTypesAria',
  'analyticsConceptGraphAria',
  'analyticsConceptNodeMasteryAria',
];

function placeholders(value: string): string[] {
  return value.match(/\{[^}]+\}/g)?.sort() ?? [];
}

describe('analytics i18n', () => {
  it('provides Greek strings for mastery/behavior/insights keys', () => {
    for (const key of ANALYTICS_KEYS) {
      const el = t(key, 'el');
      const en = t(key, 'en');
      expect(el).toBeTruthy();
      expect(el).not.toBe(en);
    }
  });

  it('keeps accessible-label placeholders aligned across English and Greek', () => {
    for (const key of ANALYTICS_TEMPLATE_KEYS) {
      expect(placeholders(t(key, 'el'))).toEqual(placeholders(t(key, 'en')));
    }
  });

  it('describes retention as a heuristic no-review projection', () => {
    const englishCopy = [
      t('analyticsRetentionCurveTitle', 'en'),
      t('analyticsRetentionCurveSubtitle', 'en'),
      t('analyticsRetentionCurveHint', 'en'),
    ].join(' ');

    expect(t('analyticsRetentionCurveTitle', 'en')).toBe('Recall projection without review');
    expect(englishCopy).toContain('eligible quiz');
    expect(englishCopy).toContain('rated-review outcomes');
    expect(englishCopy).not.toMatch(/forgetting curve/i);
  });
});
