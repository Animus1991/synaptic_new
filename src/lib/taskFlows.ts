import type { Task, AgentMode, MistakeRecord } from '../types';

export type TaskAction = 'lesson' | 'practical' | 'workspace' | 'agent' | 'tasks-review' | 'tasks-fix' | 'tasks-prereq' | 'exam-prep';

export type SessionType = '10min' | '25min' | '50min' | 'cram' | 'review';

export function getTaskAction(task: Task): TaskAction {
  if (task.type === 'exam-prep' || task.type === 'timed-test') return 'exam-prep';
  if (task.type === 'practice') return 'practical';
  if (task.isSpacedRepetition || task.type === 'flashcards' || task.type === 'review') return 'tasks-review';
  if (task.type === 'prerequisite-repair') return 'tasks-prereq';
  if (task.type === 'mistake-retry' || task.category === 'fix') return 'tasks-fix';
  if (task.type === 'self-explanation' || task.type === 'comparison') return 'workspace';
  if (task.type === 'oral-exam' || task.type === 'deep-dive') return 'agent';
  return 'lesson';
}

export function getTaskConcept(task: Task): string {
  const fromTitle = task.title
    .replace(/^(Review|Lesson|Practice|Quiz|Concept Check|Retry Mistakes|Flashcard Review|Exam Simulation|Deep Dive|Self-Explain|Prerequisite Repair):\s*/i, '')
    .split('—')[0]
    ?.trim();
  return fromTitle || task.title;
}

export type WorkspaceToolId =
  | 'concept-map' | 'simulator' | 'leitner' | 'compare' | 'whiteboard'
  | 'feynman' | 'timer' | 'debate' | 'reader' | 'scratchpad' | 'annotations';

export function getWorkspaceTool(task: Task): WorkspaceToolId {
  if (task.type === 'self-explanation') return 'feynman';
  if (task.type === 'comparison') return 'compare';
  if (task.type === 'deep-dive') return 'reader';
  return 'concept-map';
}

export function getReviewCards(concept: string): { front: string; back: string }[] {
  return [
    { front: `Define: ${concept}`, back: `State the definition and key properties of ${concept}.` },
    { front: `Apply: ${concept}`, back: `How would you use ${concept} in an exam problem? Outline the steps.` },
    { front: `Compare: ${concept}`, back: `What is ${concept} often confused with? Clarify the difference.` },
  ];
}

export function getAgentMode(task: Task): AgentMode {
  if (task.type === 'oral-exam') return 'oral-exam';
  if (task.type === 'deep-dive') return 'deep-theory';
  if (task.type === 'mistake-retry') return 'error-diagnosis';
  return 'direct';
}

export function getMistakesForTask(task: Task, mistakes: MistakeRecord[]): MistakeRecord[] {
  const concept = getTaskConcept(task).toLowerCase();
  const related = mistakes.filter(
    (m) =>
      !m.resolved &&
      (m.concept.toLowerCase().includes(concept.slice(0, 8)) ||
        concept.includes(m.concept.toLowerCase().slice(0, 8))),
  );
  if (related.length > 0) return related;
  if (task.category === 'fix') return mistakes.filter((m) => !m.resolved).slice(0, 3);
  return [];
}

export type ExamQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
};

export type PrerequisiteStep = {
  title: string;
  body: string;
};

/** Demo timer: ~6 seconds per estimated minute, capped at 5 min */
export function getExamDurationSeconds(estimatedMinutes: number): number {
  return Math.min(Math.max(estimatedMinutes * 6, 90), 300);
}

export function getExamQuestions(concept: string): ExamQuestion[] {
  const topic = concept.toLowerCase();
  if (topic.includes('consumer')) {
    return [
      {
        question: 'A consumer maximizes utility subject to a budget constraint. The optimal bundle satisfies:',
        options: ['MRS = price ratio', 'MU = 0 for all goods', 'Income = expenditure only at corner', 'Demand is always inelastic'],
        correctIndex: 0,
      },
      {
        question: 'Indifference curves are convex to the origin because of:',
        options: ['Increasing marginal utility', 'Diminishing MRS', 'Perfect substitutes', 'Giffen goods'],
        correctIndex: 1,
      },
      {
        question: 'If income rises and demand for a good falls, the good is:',
        options: ['Normal', 'Inferior', 'Luxury', 'Veblen'],
        correctIndex: 1,
      },
    ];
  }
  return [
    {
      question: `Which statement best describes ${concept}?`,
      options: ['Core definition from your notes', 'Unrelated concept', 'Opposite of the correct idea', 'Only applies in edge cases'],
      correctIndex: 0,
    },
    {
      question: `In an exam problem about ${concept}, what should you state first?`,
      options: ['Assumptions and definitions', 'Final numeric answer', 'Unrelated formula', 'Graph only'],
      correctIndex: 0,
    },
    {
      question: `A common mistake with ${concept} is:`,
      options: ['Skipping intermediate steps', 'Always using calculus', 'Ignoring units', 'Drawing a diagram'],
      correctIndex: 0,
    },
  ];
}

export function getPrerequisiteSteps(concept: string): PrerequisiteStep[] {
  const topic = concept.toLowerCase();
  if (topic.includes('utility') || topic.includes('indifference')) {
    return [
      {
        title: 'What is utility?',
        body: 'Utility U(x,y) ranks consumption bundles. Higher utility = preferred bundle. Ordinal utility only needs ranking, not cardinal measurement.',
      },
      {
        title: 'Indifference curves',
        body: 'An indifference curve shows bundles with equal utility. Properties: downward sloping, convex (diminishing MRS), never cross.',
      },
      {
        title: 'Budget constraint',
        body: 'p₁x₁ + p₂x₂ ≤ m. The slope is −p₁/p₂. Optimum: MRS = p₁/p₂ at the tangency point (interior solution).',
      },
      {
        title: 'Checkpoint',
        body: 'Before returning to indifference curves, you should be able to explain why convexity reflects diminishing marginal rate of substitution.',
      },
    ];
  }
  return [
    {
      title: `Review: ${concept}`,
      body: `Strengthen the foundational ideas behind ${concept} before tackling dependent topics.`,
    },
    {
      title: 'Key definition',
      body: 'State the definition in your own words, then connect it to one worked example from your notes.',
    },
    {
      title: 'Checkpoint',
      body: 'Complete the quick check below to confirm readiness for the main topic.',
    },
  ];
}

export function findPendingTask(tasks: Task[], predicate: (t: Task) => boolean): Task | undefined {
  return tasks.find((t) => t.status === 'pending' && predicate(t));
}

export function findTaskForRepair(tasks: Task[], repair: { concept: string; prerequisite: string }): Task | undefined {
  const preKey = repair.prerequisite.toLowerCase().slice(0, 8);
  const depKey = repair.concept.toLowerCase().slice(0, 8);
  return (
    findPendingTask(
      tasks,
      (t) =>
        t.type === 'prerequisite-repair' &&
        (getTaskConcept(t).toLowerCase().includes(preKey) ||
          getTaskConcept(t).toLowerCase().includes(depKey)),
    ) ?? findPendingTask(tasks, (t) => t.type === 'prerequisite-repair')
  );
}

export function findTaskForConcept(tasks: Task[], concept: string): Task | undefined {
  const key = concept.toLowerCase().slice(0, 8);
  return findPendingTask(
    tasks,
    (t) =>
      getTaskConcept(t).toLowerCase().includes(key) || t.title.toLowerCase().includes(key),
  );
}

/** Filter pending tasks for a study session type */
export function filterTasksForSession(tasks: Task[], session: SessionType): Task[] {
  const pending = tasks.filter((t) => t.status === 'pending');

  switch (session) {
    case '10min':
      return [
        ...pending.filter((t) => t.isSpacedRepetition),
        ...pending.filter((t) => t.type === 'flashcards'),
        ...pending.filter((t) => t.type === 'concept-check'),
      ].slice(0, 4);
    case '25min':
      return pending
        .filter((t) => t.category === 'learn' || t.category === 'practice' || t.type === 'lesson')
        .slice(0, 4);
    case '50min':
      return pending
        .filter((t) => t.category === 'learn' || t.type === 'deep-dive' || t.type === 'exam-prep')
        .slice(0, 5);
    case 'cram':
      return pending
        .filter((t) => t.category === 'exam' || t.priority === 'critical' || t.priority === 'high')
        .slice(0, 6);
    case 'review':
      return pending.filter((t) => t.isSpacedRepetition || t.category === 'review');
    default:
      return pending.slice(0, 3);
  }
}

export function sessionLabel(session: SessionType): string {
  const labels: Record<SessionType, string> = {
    '10min': 'Quick Sprint',
    '25min': 'Focused Session',
    '50min': 'Deep Session',
    cram: 'Exam Cram',
    review: 'Spaced Review',
  };
  return labels[session];
}

export function startButtonLabel(task: Task): string {
  const action = getTaskAction(task);
  switch (action) {
    case 'practical': return 'Start Practice';
    case 'workspace': return 'Open Workspace';
    case 'agent': return 'Open Agent';
    case 'tasks-review': return 'Start Review';
    case 'tasks-fix': return 'Retry Mistakes';
    case 'tasks-prereq': return 'Start Repair';
    case 'exam-prep': return 'Start Exam Prep';
    default:
      if (task.type === 'quiz' || task.type === 'concept-check') return 'Take Quiz';
      if (task.type === 'exam-prep') return 'Start Exam Prep';
      return 'Start Lesson';
  }
}
