export type ExerciseArchetypeId =
  | 'structured-problem'
  | 'algorithm-design'
  | 'code-trace'
  | 'panhellenic-theme-g'
  | 'panhellenic-theme-d';

export type ExerciseArchetype = {
  id: ExerciseArchetypeId;
  labelKey: string;
  descriptionKey: string;
  rubricKeys: string[];
  solutionStepKeys: string[];
  examStyle?: 'general' | 'panhellenic-cs';
};

export const EXERCISE_ARCHETYPES: ExerciseArchetype[] = [
  {
    id: 'structured-problem',
    labelKey: 'examPrepArchetypeStructuredProblem',
    descriptionKey: 'examPrepArchetypeStructuredProblemDesc',
    rubricKeys: ['examPrepRubricClarity', 'examPrepRubricSteps', 'examPrepRubricCorrectness'],
    solutionStepKeys: ['examPrepStepsReadStatement', 'examPrepStepsIdentifyGiven', 'examPrepStepsPlan', 'examPrepStepsExecute', 'examPrepStepsVerify'],
  },
  {
    id: 'algorithm-design',
    labelKey: 'examPrepArchetypeAlgorithmDesign',
    descriptionKey: 'examPrepArchetypeAlgorithmDesignDesc',
    rubricKeys: ['examPrepRubricAlgorithmCorrect', 'examPrepRubricComplexity', 'examPrepRubricPseudocode'],
    solutionStepKeys: ['examPrepStepsDefineIO', 'examPrepStepsInvariant', 'examPrepStepsWritePseudocode', 'examPrepStepsTraceExample'],
  },
  {
    id: 'code-trace',
    labelKey: 'examPrepArchetypeCodeTrace',
    descriptionKey: 'examPrepArchetypeCodeTraceDesc',
    rubricKeys: ['examPrepRubricTraceAccuracy', 'examPrepRubricFinalState'],
    solutionStepKeys: ['examPrepStepsCopyTable', 'examPrepStepsLineByLine', 'examPrepStepsRecordVariables'],
  },
  {
    id: 'panhellenic-theme-g',
    labelKey: 'examPrepArchetypeThemeG',
    descriptionKey: 'examPrepArchetypeThemeGDesc',
    examStyle: 'panhellenic-cs',
    rubricKeys: ['examPrepRubricFullStatement', 'examPrepRubricGlossaSyntax', 'examPrepRubricEdgeCases'],
    solutionStepKeys: ['examPrepStepsParseRequirements', 'examPrepStepsDataStructures', 'examPrepStepsGlossaAlgorithm', 'examPrepStepsDryRun'],
  },
  {
    id: 'panhellenic-theme-d',
    labelKey: 'examPrepArchetypeThemeD',
    descriptionKey: 'examPrepArchetypeThemeDDesc',
    examStyle: 'panhellenic-cs',
    rubricKeys: ['examPrepRubricModification', 'examPrepRubricJustification', 'examPrepRubricEfficiency'],
    solutionStepKeys: ['examPrepStepsReadBaseAlgorithm', 'examPrepStepsIdentifyChange', 'examPrepStepsAdaptSteps', 'examPrepStepsProveCorrectness'],
  },
];

export function getExerciseArchetype(id: ExerciseArchetypeId): ExerciseArchetype | undefined {
  return EXERCISE_ARCHETYPES.find((a) => a.id === id);
}

export function buildArchetypePromptSuffix(archetype: ExerciseArchetype): string {
  const rubric = archetype.rubricKeys.join(', ');
  const steps = archetype.solutionStepKeys.join(' → ');
  return `[Archetype: ${archetype.id}] Rubric: ${rubric}. Solution steps: ${steps}.`;
}
