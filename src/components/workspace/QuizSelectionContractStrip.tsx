import type { QuizSelectionRemediationReport } from '../../lib/quizSelectionRemediationQA';
import { WorkspaceQaStatusStrip } from './WorkspaceQaStatusStrip';

type Props = {
  report: QuizSelectionRemediationReport;
  lang: 'en' | 'el';
};

export function QuizSelectionContractStrip({ report, lang }: Props) {
  const isEl = lang === 'el';

  const message = report.ok
    ? (isEl
      ? `Επιλογή κειμένου · ${report.selectionActionCount} ενέργειες · ${report.wrongItemCount > 0 ? `διόρθωση (${report.wrongItemCount} λάθη)` : 'διόρθωση έτοιμη'}`
      : `Text selection · ${report.selectionActionCount} actions · ${report.wrongItemCount > 0 ? `remediation (${report.wrongItemCount} mistakes)` : 'remediation ready'}`)
    : (isEl
      ? `Επιλογή κειμένου · ${report.issues.length} θέμα(τα) ελέγχου`
      : `Text selection · ${report.issues.length} check issue(s)`);

  return (
    <WorkspaceQaStatusStrip ok={report.ok} testId="quiz-selection-contract-strip">
      {message}
    </WorkspaceQaStatusStrip>
  );
}
