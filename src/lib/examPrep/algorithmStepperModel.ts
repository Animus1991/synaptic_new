export type AlgorithmKind = 'array-scan' | 'stack' | 'queue';

export type AlgorithmStep = {
  index: number;
  labelKey: string;
  highlightIndices?: number[];
  stackContents?: string[];
  queueContents?: string[];
  variables?: Record<string, string | number>;
};

export type AlgorithmScenario = {
  id: string;
  kind: AlgorithmKind;
  titleKey: string;
  initialArray?: number[];
  steps: AlgorithmStep[];
};

export const ALGORITHM_SCENARIOS: AlgorithmScenario[] = [
  {
    id: 'array-max-scan',
    kind: 'array-scan',
    titleKey: 'examPrepAlgoArrayMax',
    initialArray: [3, 7, 2, 9, 1],
    steps: [
      { index: 0, labelKey: 'examPrepAlgoStepInitMax', highlightIndices: [0], variables: { max: 3, i: 0 } },
      { index: 1, labelKey: 'examPrepAlgoStepCompare', highlightIndices: [1], variables: { max: 7, i: 1 } },
      { index: 2, labelKey: 'examPrepAlgoStepCompare', highlightIndices: [2], variables: { max: 7, i: 2 } },
      { index: 3, labelKey: 'examPrepAlgoStepCompare', highlightIndices: [3], variables: { max: 9, i: 3 } },
      { index: 4, labelKey: 'examPrepAlgoStepCompare', highlightIndices: [4], variables: { max: 9, i: 4 } },
      { index: 5, labelKey: 'examPrepAlgoStepDone', variables: { max: 9 } },
    ],
  },
  {
    id: 'stack-push-pop',
    kind: 'stack',
    titleKey: 'examPrepAlgoStackDemo',
    steps: [
      { index: 0, labelKey: 'examPrepAlgoStepPush', stackContents: ['A'] },
      { index: 1, labelKey: 'examPrepAlgoStepPush', stackContents: ['A', 'B'] },
      { index: 2, labelKey: 'examPrepAlgoStepPush', stackContents: ['A', 'B', 'C'] },
      { index: 3, labelKey: 'examPrepAlgoStepPop', stackContents: ['A', 'B'] },
      { index: 4, labelKey: 'examPrepAlgoStepPop', stackContents: ['A'] },
    ],
  },
  {
    id: 'queue-enq-deq',
    kind: 'queue',
    titleKey: 'examPrepAlgoQueueDemo',
    steps: [
      { index: 0, labelKey: 'examPrepAlgoStepEnqueue', queueContents: ['1'] },
      { index: 1, labelKey: 'examPrepAlgoStepEnqueue', queueContents: ['1', '2'] },
      { index: 2, labelKey: 'examPrepAlgoStepEnqueue', queueContents: ['1', '2', '3'] },
      { index: 3, labelKey: 'examPrepAlgoStepDequeue', queueContents: ['2', '3'] },
      { index: 4, labelKey: 'examPrepAlgoStepDequeue', queueContents: ['3'] },
    ],
  },
];

export function getAlgorithmScenario(id: string): AlgorithmScenario | undefined {
  return ALGORITHM_SCENARIOS.find((s) => s.id === id);
}

export function clampStepIndex(scenario: AlgorithmScenario, stepIndex: number): number {
  return Math.max(0, Math.min(stepIndex, scenario.steps.length - 1));
}
