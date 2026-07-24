import type { QuizSelectionRemediationReport } from '../../lib/quizSelectionRemediationQA';
import { useI18n } from '../../lib/i18n';
import { WorkspaceQaStatusStrip } from './WorkspaceQaStatusStrip';

type Props = {
  report: QuizSelectionRemediationReport;
  lang: 'en' | 'el';
};

function buildMessage(
  report: QuizSelectionRemediationReport,
  t: (key: import('../../lib/i18n').I18nKey) => string,
): string {
  if (report.ok) {
    const remediation = report.wrongItemCount > 0
      ? t('quizSelRemediationMistakes').replace('{count}', String(report.wrongItemCount))
      : t('quizSelRemediationReady');
    return t('quizSelContractOk')
      .replace('{actions}', String(report.selectionActionCount))
      .replace('{remediation}', remediation);
  }
  return t('quizSelContractFail').replace('{count}', String(report.issues.length));
}

export function QuizSelectionContractStrip({ report, lang: _lang }: Props) {
  const { t } = useI18n();

  return (
    <WorkspaceQaStatusStrip ok={report.ok} testId="quiz-selection-contract-strip">
      {buildMessage(report, t)}
    </WorkspaceQaStatusStrip>
  );
}
