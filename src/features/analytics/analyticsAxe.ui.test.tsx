/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import * as axe from 'axe-core';
import { ReadinessRing } from '../../components/visuals/ReadinessRing';
import { CalibrationCompareBar } from '../../components/visuals/CalibrationCompareBar';
import { ConceptGraph } from '../../components/visuals/ConceptGraph';
import {
  ProgressKpiRow,
  ConfidenceBucketChart,
  LearningRadarChart,
  LearnerInsightCards,
} from '../../components/analytics/ProgressInsightsSections';
import { SubjectDrillDown } from '../../components/analytics/SubjectDrillDown';
import { SubjectMasteryGrid } from '../../components/analytics/SubjectMasteryGrid';
import type {
  ProgressKpi,
  ConfidenceBucket,
  ProgressInsight,
  RadarDimension,
} from '../../lib/progressInsights';
import type { SubjectMasteryTile } from './subjectMasteryAnalytics';
import { I18nContext, t as translate, type I18nKey } from '../../lib/i18n';

/**
 * Runtime accessibility gate via axe-core (already a dependency; no jest-axe).
 * jsdom has no layout engine, so contrast/landmark-region checks cannot run
 * meaningfully — those rules are disabled. Everything else (roles, names,
 * aria-* validity, duplicate ids, button semantics) runs for real.
 */
async function expectNoAxeViolations(container: HTMLElement): Promise<void> {
  const results = await axe.run(container, {
    rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
    },
  });
  if (results.violations.length > 0) {
    const summary = results.violations
      .map((v) => `${v.id} (${v.impact ?? 'n/a'}): ${v.help} — ${v.nodes.length} node(s)`)
      .join('\n');
    throw new Error(`axe violations found:\n${summary}`);
  }
  expect(results.violations).toHaveLength(0);
}

const kpis: ProgressKpi[] = [
  { label: 'Recall', value: '72%', sub: 'improving', tone: 'good' },
  { label: 'Mastery', value: '61%', sub: 'steady', tone: 'neutral' },
  { label: 'Accuracy', value: '80%', sub: 'watch', tone: 'warn' },
  { label: 'Pace', value: '12m', sub: 'per session', tone: null },
];

const dims: RadarDimension[] = [
  { subject: 'Recall', score: 70 },
  { subject: 'Transfer', score: 55 },
  { subject: 'Speed', score: 60 },
  { subject: 'Confidence', score: 48 },
];

const buckets: ConfidenceBucket[] = [
  { label: '0–20%', rangeLabel: '0–20%', correctPct: 40, wrongPct: 60, sampleCount: 5 },
  { label: '21–40%', rangeLabel: '21–40%', correctPct: 55, wrongPct: 45, sampleCount: 4 },
];

const insights: ProgressInsight[] = [
  { insight: 'Recall is improving', evidence: '3 strong sessions', tone: 'good' },
  { insight: 'Watch pacing on hard sets', evidence: '2 slow sessions', tone: 'warn' },
];

const greekI18n = {
  lang: 'el' as const,
  t: (key: I18nKey) => translate(key, 'el'),
};

function makeTile(): SubjectMasteryTile {
  return {
    courseId: 'c1',
    title: 'Physics',
    mastery: 55,
    pendingConcepts: 2,
    trend: 'up',
    trendDelta: 1,
    color: '#abc',
    icon: 'atom',
    topics: [
      { id: 't1', title: 'Kinematics', mastery: 40 },
    ] as unknown as SubjectMasteryTile['topics'],
  };
}

afterEach(() => {
  cleanup();
  document.body.style.overflow = '';
});

describe('Analytics visuals — runtime axe a11y gate', () => {
  it('ReadinessRing has no axe violations', async () => {
    const { container } = render(<ReadinessRing value={72} sublabel="On track" />);
    await expectNoAxeViolations(container);
  });

  it('CalibrationCompareBar has no axe violations', async () => {
    const { container } = render(
      <CalibrationCompareBar predictedPct={62} actualPct={45} youLabel="You: 62%" actualLabel="Actual: 45%" />,
    );
    await expectNoAxeViolations(container);
  });

  it('ConceptGraph has no axe violations', async () => {
    const { container } = render(
      <ConceptGraph
        nodes={[
          { id: 'a', label: 'Kinematics', mastery: 60, type: 'concept', x: 120, y: 100 },
          { id: 'b', label: 'Dynamics', mastery: 40, type: 'theory', x: 300, y: 160 },
        ]}
        edges={[{ from: 'a', to: 'b', relation: 'prerequisite' }]}
      />,
    );
    await expectNoAxeViolations(container);
  });

  it('ProgressKpiRow has no axe violations', async () => {
    const { container } = render(<ProgressKpiRow kpis={kpis} />);
    await expectNoAxeViolations(container);
  });

  it('ConfidenceBucketChart has no axe violations', async () => {
    const { container } = render(<ConfidenceBucketChart buckets={buckets} title="Calibration" />);
    await expectNoAxeViolations(container);
  });

  it('LearningRadarChart has no axe violations', async () => {
    const { container } = render(<LearningRadarChart dimensions={dims} title="Learning profile" />);
    await expectNoAxeViolations(container);
  });

  it('LearnerInsightCards has no axe violations', async () => {
    const { container } = render(<LearnerInsightCards insights={insights} title="Insights" />);
    await expectNoAxeViolations(container);
  });

  it('SubjectMasteryGrid has no axe violations', async () => {
    const { container } = render(<SubjectMasteryGrid tiles={[makeTile()]} onSelect={vi.fn()} />);
    await expectNoAxeViolations(container);
  });

  it('SubjectDrillDown (open modal) has no axe violations', async () => {
    const { container } = render(
      <SubjectDrillDown tile={makeTile()} onClose={vi.fn()} onStudyConcept={vi.fn()} />,
    );
    await expectNoAxeViolations(container);
  });
});

describe('Analytics SVG interaction and ID hardening', () => {
  const graphNodes = [
    { id: 'a', label: 'Kinematics', mastery: 60, type: 'concept' as const, x: 120, y: 100 },
    { id: 'b', label: 'Dynamics', mastery: 40, type: 'theory' as const, x: 300, y: 160 },
  ];
  const graphEdges = [{ from: 'a', to: 'b', relation: 'prerequisite' as const }];

  it('uses instance-scoped SVG definition IDs for duplicate readiness rings', () => {
    const { container } = render(
      <>
        <ReadinessRing value={72} />
        <ReadinessRing value={72} />
      </>,
    );

    const gradientIds = Array.from(container.querySelectorAll('linearGradient'))
      .map((gradient) => gradient.id);
    expect(gradientIds).toHaveLength(2);
    expect(gradientIds.every(Boolean)).toBe(true);
    expect(new Set(gradientIds).size).toBe(gradientIds.length);

    const gradientReferences = Array.from(container.querySelectorAll('circle'))
      .map((circle) => circle.getAttribute('stroke'))
      .filter((stroke): stroke is string => Boolean(stroke?.startsWith('url(#')));
    expect(gradientReferences).toEqual(gradientIds.map((id) => `url(#${id})`));
  });

  it('uses the localized readiness band in visible and accessible labels', () => {
    render(
      <ReadinessRing
        value={72}
        label="Ετοιμότητα εξέτασης"
        bandLabel="Επαρκής"
        sublabel="Με βάση τις απαντήσεις σου"
      />,
    );

    expect(screen.getByText('Επαρκής')).toBeTruthy();
    expect(screen.getByRole('img', {
      name: 'Ετοιμότητα εξέτασης — 72% — Επαρκής — Με βάση τις απαντήσεις σου',
    })).toBeTruthy();
  });

  it('keeps duplicate concept-graph marker and filter IDs isolated', () => {
    const { container } = render(
      <>
        <ConceptGraph nodes={graphNodes} edges={graphEdges} />
        <ConceptGraph nodes={graphNodes} edges={graphEdges} />
      </>,
    );

    const markerIds = Array.from(container.querySelectorAll('marker')).map((marker) => marker.id);
    const filterIds = Array.from(container.querySelectorAll('filter')).map((filter) => filter.id);
    expect(markerIds).toHaveLength(2);
    expect(filterIds).toHaveLength(2);
    expect(new Set(markerIds).size).toBe(markerIds.length);
    expect(new Set(filterIds).size).toBe(filterIds.length);

    const markerReferences = Array.from(container.querySelectorAll('line[aria-hidden="true"]'))
      .map((line) => line.getAttribute('marker-end'));
    expect(markerReferences).toEqual(markerIds.map((id) => `url(#${id})`));
  });

  it('exposes graph nodes as toggle buttons with keyboard and focus parity', () => {
    const { container } = render(<ConceptGraph nodes={graphNodes} edges={graphEdges} />);
    const graph = screen.getByRole('group', { name: 'Concept graph: 2 concepts' });
    const node = screen.getByRole('button', { name: 'Kinematics, 60% mastery' });
    const edge = container.querySelector('line[aria-hidden="true"]');

    expect(graph).toBeTruthy();
    expect(screen.queryByRole('img', { name: /Concept graph/ })).toBeNull();
    expect(node.getAttribute('tabindex')).toBe('0');
    expect(node.getAttribute('aria-pressed')).toBe('false');
    expect(edge?.getAttribute('focusable')).toBe('false');

    fireEvent.focus(node);
    expect(node.getAttribute('data-node-active')).toBe('true');

    fireEvent.keyDown(node, { key: 'Enter' });
    expect(node.getAttribute('aria-pressed')).toBe('true');

    fireEvent.keyDown(node, { key: ' ' });
    expect(node.getAttribute('aria-pressed')).toBe('false');

    fireEvent.blur(node);
    expect(node.getAttribute('data-node-active')).toBe('false');
  });

  it('uses Greek dictionary templates for graph, mastery, and trend labels', () => {
    render(
      <I18nContext.Provider value={greekI18n}>
        <ConceptGraph nodes={graphNodes.slice(0, 1)} edges={[]} />
        <SubjectMasteryGrid tiles={[makeTile()]} onSelect={vi.fn()} />
        <SubjectDrillDown tile={makeTile()} onClose={vi.fn()} onStudyConcept={vi.fn()} />
      </I18nContext.Provider>,
    );

    const graph = screen.getByRole('group', { name: 'Γράφος εννοιών: 1 έννοιες' });
    const node = screen.getByRole('button', { name: 'Kinematics, κατάκτηση 60%' });
    expect(graph).toBeTruthy();
    fireEvent.click(node);
    expect(screen.getByText('Προαπαιτούμενα: Κανένα')).toBeTruthy();

    expect(screen.getByRole('button', {
      name: 'Physics, 55% κατάκτηση, 2 εκκρεμείς έννοιες, αύξηση πρόσφατης δραστηριότητας (+1)',
    })).toBeTruthy();
    expect(screen.getByText('55% κατάκτηση')).toBeTruthy();
  });
});
