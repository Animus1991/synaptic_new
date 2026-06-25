import { describe, expect, it } from 'vitest';
import { t, type I18nKey } from './i18n';

const ANALYTICS_KEYS: I18nKey[] = [
  'analyticsTabMastery',
  'analyticsStrongAreas',
  'analyticsErrorPatterns',
  'analyticsInsightsLearnedTitle',
  'analyticsRecommendationsEmpty',
];

describe('analytics i18n', () => {
  it('provides Greek strings for mastery/behavior/insights keys', () => {
    for (const key of ANALYTICS_KEYS) {
      const el = t(key, 'el');
      const en = t(key, 'en');
      expect(el).toBeTruthy();
      expect(el).not.toBe(en);
    }
  });
});
