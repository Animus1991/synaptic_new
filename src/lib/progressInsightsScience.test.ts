import { describe, expect, it } from 'vitest';
import { createEmptyLearnerModel, EMPTY_DASHBOARD_STATS } from './emptyLearnerState';
import { buildProgressKpis } from './progressInsights';

describe('progress KPI semantic consistency', () => {
  it('uses one readiness estimate and reports recall as a separate signal', () => {
    const model = createEmptyLearnerModel();
    model.overallMastery = 64;
    model.retentionRate = 0.72;

    const kpis = buildProgressKpis(model, EMPTY_DASHBOARD_STATS, 12, 'en');

    expect(kpis.filter((kpi) => kpi.label === 'Exam Readiness')).toHaveLength(1);
    expect(kpis[0]).toMatchObject({ label: 'Exam Readiness', value: '64%' });
    expect(kpis[2]).toMatchObject({ label: 'Recent Recall', value: '72%' });
  });
});
