import type { CommandItem } from '../components/workspace/CommandPalette';
import type { WorkspaceCorrelation } from './workspaceCorrelation';
import type { WorkspaceToolId } from './taskFlows';

export type WorkspaceMacroContext = {
  lang: 'en' | 'el';
  correlation: WorkspaceCorrelation;
  openTool: (tool: WorkspaceToolId) => void;
  openReaderForTerm: (term: string, source: string) => void;
  jumpToStep: (index: number) => void;
  quizStepIndex: number;
  weakStepIndex?: number;
  focusLayout: () => void;
};

/**
 * Cross-tool macro actions — harmonized with correlation bus fields.
 */
export function buildWorkspaceMacroCommands(ctx: WorkspaceMacroContext): CommandItem[] {
  const { lang, correlation: c } = ctx;
  const group = lang === 'el' ? 'Μακροενέργειες' : 'Macros';
  const term = c.focusTerm ?? c.concept;

  const macros: CommandItem[] = [
    {
      id: 'macro:reader-focus',
      group,
      label: lang === 'el' ? `Ανάγνωση: «${term}»` : `Read: «${term}»`,
      hint: lang === 'el' ? 'Reader + focus term' : 'Open reader on focus term',
      run: () => {
        ctx.openTool('reader');
        ctx.openReaderForTerm(term, 'macro');
        ctx.focusLayout();
      },
    },
    {
      id: 'macro:quiz-step',
      group,
      label: lang === 'el' ? 'Έλεγχος γνώσεων' : 'Knowledge check',
      hint: lang === 'el' ? 'Μετάβαση στο κουίζ' : 'Jump to quiz step',
      run: () => ctx.jumpToStep(ctx.quizStepIndex),
    },
  ];

  if (c.leitnerDueCount > 0) {
    macros.push({
      id: 'macro:leitner-due',
      group,
      label: lang === 'el'
        ? `Leitner — ${c.leitnerDueCount} ληξιπρόθεσμα`
        : `Leitner — ${c.leitnerDueCount} due`,
      hint: lang === 'el' ? 'FSRS spacing bus' : 'FSRS due queue',
      run: () => {
        ctx.openTool('leitner');
        ctx.focusLayout();
      },
    });
  }

  if (c.compareRowCount > 0) {
    macros.push({
      id: 'macro:compare-focus',
      group,
      label: lang === 'el' ? 'Σύγκριση εστίασης' : 'Compare focus row',
      hint: lang === 'el' ? 'Πίνακας σύγκρισης + diff' : 'Comparison table + diff highlight',
      run: () => {
        ctx.openTool('compare');
        if (c.focusTerm) ctx.openReaderForTerm(c.focusTerm, 'macro-compare');
        ctx.focusLayout();
      },
    });
  }

  if (c.dueStepIndices.length > 0) {
    macros.push({
      id: 'macro:spaced-step',
      group,
      label: lang === 'el' ? 'Επόμενο spaced βήμα' : 'Next spaced step',
      hint: lang === 'el' ? 'Lesson rail scheduling' : 'Spaced step schedule',
      run: () => ctx.jumpToStep(c.dueStepIndices[0] ?? 0),
    });
  }

  if (ctx.weakStepIndex !== undefined && c.conceptMastery < 75) {
    macros.push({
      id: 'macro:weak-step',
      group,
      label: lang === 'el' ? 'Αδύναμο θέμα — εξάσκηση' : 'Drill weak topic',
      hint: lang === 'el' ? 'Adaptive mastery order' : 'Low-mastery step first',
      run: () => ctx.jumpToStep(ctx.weakStepIndex!),
    });
  }

  if (c.timerExamTarget) {
    macros.push({
      id: 'macro:exam-timer',
      group,
      label: lang === 'el' ? 'Αντίστροφη μέτρηση εξέτασης' : 'Exam countdown',
      run: () => {
        ctx.openTool('timer');
        ctx.focusLayout();
      },
    });
  }

  macros.push(
    {
      id: 'macro:scratchpad',
      group,
      label: lang === 'el' ? 'Τύποι — scratchpad' : 'Formulas — scratchpad',
      run: () => {
        ctx.openTool('scratchpad');
        ctx.focusLayout();
      },
    },
    {
      id: 'macro:annotations',
      group,
      label: lang === 'el' ? 'Κοινές σημειώσεις' : 'Shared annotations',
      run: () => {
        ctx.openTool('annotations');
        ctx.focusLayout();
      },
    },
  );

  return macros;
}
