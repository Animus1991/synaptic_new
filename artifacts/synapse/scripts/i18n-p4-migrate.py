"""Wave C1 P4 — lib helpers + leftover strips → t(key, lang)."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LIB = ROOT / "src/lib"
WS = ROOT / "src/components/workspace"

EN_EXTRA = """
  gotItContinue: 'Got it',
  quizSelContractOk: 'Text selection · {actions} actions · {remediation}',
  quizSelRemediationReady: 'remediation ready',
  quizSelRemediationMistakes: 'remediation ({count} mistakes)',
  quizSelContractFail: 'Text selection · {count} check issue(s)',
  emptyActionQuizCheck: 'Knowledge check (Quiz)',
  emptyActionLeitner: 'Leitner flashcards',
  emptyActionConceptMap: 'Concept map',
  workspaceNoSource: 'Upload your notes to see personalized content from your own material.',
  weakReasonNetStruggle: 'Net struggle this session',
  weakReasonLowMastery: 'Low mastery ({mastery}%)',
  weakReasonWeakSignal: 'Weak signal this session',
  lessonBadgeCoreConcept: 'Core Concept',
  lessonTipTitle: '💡 Tip',
  lessonTipFeynman: 'Use the Feynman Check to verify understanding.',
  lessonBadgeDeepDive: 'Deep Dive',
  lessonTitleMechanism: 'Mechanism',
  lessonTextVariables: 'What variables connect in your notes?',
  lessonBadgePractice: 'Practice',
  lessonTitleWorkedTask: 'Worked Task',
  lessonTextApplyConcept: 'Apply the concept using your uploaded notes.',
  agentStepProgress: 'Step {current}/{total}',
  agentQualityScore: 'Quality {score}/100',
  agentOldPipeline: 'Old pipeline (v{version})',
  agentContextHeading: 'Context:',
  exportReadinessStrong: 'Strong',
  exportReadinessProficient: 'Proficient',
  exportReadinessDeveloping: 'Developing',
  exportReadinessWeak: 'Weak',
  exportReportTitle: 'Study session progress report',
  exportExamReadiness: 'Exam readiness',
  exportConcepts: 'Concepts',
  exportStreak: 'Streak',
  exportDueReviews: 'Due reviews',
  exportStudyToday: 'Study today',
  exportStudyWeek: 'Study this week',
  exportSessionTools: 'Session tools',
  exportToolActions: 'Tool actions',
  exportNoWeakConcepts: 'No weak concepts.',
  exportColConcept: 'Concept',
  exportColCourse: 'Course',
  exportColMastery: 'Mastery',
  exportColReasons: 'Reasons',
  exportColRemediation: 'Remediation',
  exportNoToolActivity: 'No tool activity recorded.',
  exportConceptBusEmpty: 'Concept Bus empty — no concept correlations recorded.',
  exportColTools: 'Tools',
  exportColEngagement: 'Engagement',
  exportColStatus: 'Status',
  exportStatusStruggling: 'Struggling',
  exportStatusConfident: 'Confident',
  exportFeynmanActions: 'Feynman actions',
  exportNoTasks: 'No scheduled tasks.',
  exportWorkspaceNextAction: 'Workspace next action',
  exportLabelConcept: 'Concept',
  exportLabelCourse: 'Course',
  exportLabelSection: 'Section',
  exportLabelExported: 'Exported',
  exportSuggestedTool: 'Suggested tool',
  exportSummary: 'Summary',
  exportWeakSpots: 'Weak spots',
  exportSessionToolActivity: 'Session tool activity',
  exportConceptBusMirror: 'Concept Bus mirror',
  exportNextTasks: 'Next tasks',
  wbcConceptFallback: 'Concept',
  wbcCentralFormula: 'Central formula',
  wbcHintCentralFormula: 'Write the main formula in the center.',
  wbcVariables: 'Variables',
  wbcHintVariables: 'Add labels for each symbol.',
  wbcLinks: 'Links',
  wbcHintLinks: 'Arrows between related formulas.',
  wbcTwoBoxes: 'Two boxes',
  wbcHintTwoBoxes: 'Left "{a}", right "{b}".',
  wbcSimilarities: 'Similarities',
  wbcHintSimilarities: 'Bridge or list in the middle.',
  wbcDifferences: 'Differences',
  wbcHintDifferences: 'Arrows to traits on each side.',
  wbcCenter: 'Center',
  wbcHintCenter: 'Circle or box for "{center}".',
  wbcSatellite: 'Satellite {n}',
  wbcHintSatellite: 'Link "{sat}" with an arrow.',
  wbcStart: 'Start',
  wbcHintStart: 'First step of the process.',
  wbcStepN: 'Step {n}',
  wbcHintNextStage: 'Arrow to the next stage.',
  wbcCloseLoop: 'Close the loop',
  wbcHintCloseLoop: 'Optional arrow back to the start.',
  wbcCauses: 'Causes',
  wbcHintCauses: '1–2 boxes on the left with drivers.',
  wbcCoreConcept: 'Core concept',
  wbcHintCoreBox: 'Central box "{center}".',
  wbcEffects: 'Effects',
  wbcHintEffects: 'Arrows to the right — what does it cause?',
  wbcLabels: 'Labels',
  wbcHintLabels: 'Short keywords from the excerpt.',
"""

EL_EXTRA = """
  gotItContinue: 'Εντάξει, συνέχεια',
  quizSelContractOk: 'Επιλογή κειμένου · {actions} ενέργειες · {remediation}',
  quizSelRemediationReady: 'διόρθωση έτοιμη',
  quizSelRemediationMistakes: 'διόρθωση ({count} λάθη)',
  quizSelContractFail: 'Επιλογή κειμένου · {count} θέμα(τα) ελέγχου',
  emptyActionQuizCheck: 'Έλεγχος γνώσεων (Quiz)',
  emptyActionLeitner: 'Κάρτες Leitner',
  emptyActionConceptMap: 'Χάρτης εννοιών',
  workspaceNoSource: 'Ανέβασε σημειώσεις για να εμφανιστεί εξατομικευμένο περιεχόμενο από το δικό σου υλικό.',
  weakReasonNetStruggle: 'Συνολική δυσκολία στη συνεδρία',
  weakReasonLowMastery: 'Χαμηλό mastery ({mastery}%)',
  weakReasonWeakSignal: 'Αδύναμο σήμα αυτή τη συνεδρία',
  lessonBadgeCoreConcept: 'Βασική Έννοια',
  lessonTipTitle: '💡 Υπόδειξη',
  lessonTipFeynman: 'Χρησιμοποίησε τον Feynman Check.',
  lessonBadgeDeepDive: 'Εμβάθυνση',
  lessonTitleMechanism: 'Μηχανισμός',
  lessonTextVariables: 'Ποιες μεταβλητές συνδέονται;',
  lessonBadgePractice: 'Εξάσκηση',
  lessonTitleWorkedTask: 'Εργασία',
  lessonTextApplyConcept: 'Εφάρμοσε την έννοια από τις σημειώσεις σου.',
  agentStepProgress: 'Βήμα {current}/{total}',
  agentQualityScore: 'Ποιότητα {score}/100',
  agentOldPipeline: 'Παλαιό pipeline (v{version})',
  agentContextHeading: 'Context:',
  exportReadinessStrong: 'Ισχυρό',
  exportReadinessProficient: 'Επαρκές',
  exportReadinessDeveloping: 'Αναπτυσσόμενο',
  exportReadinessWeak: 'Αδύναμο',
  exportReportTitle: 'Αναφορά προόδου συνεδρίας',
  exportExamReadiness: 'Ετοιμότητα εξετάσεων',
  exportConcepts: 'Έννοιες',
  exportStreak: 'Σειρά ημερών',
  exportDueReviews: 'Ληξιπρόθεσμα',
  exportStudyToday: 'Μελέτη σήμερα',
  exportStudyWeek: 'Μελέτη εβδομάδας',
  exportSessionTools: 'Εργαλεία συνεδρίας',
  exportToolActions: 'Ενέργειες εργαλείων',
  exportNoWeakConcepts: 'Καμία αδύναμη έννοια.',
  exportColConcept: 'Έννοια',
  exportColCourse: 'Μάθημα',
  exportColMastery: 'Εξοικείωση',
  exportColReasons: 'Λόγοι',
  exportColRemediation: 'Επανόρθωση',
  exportNoToolActivity: 'Δεν καταγράφηκαν εργαλεία.',
  exportConceptBusEmpty: 'Concept Bus κενό — δεν καταγράφηκαν συσχετίσεις εννοιών.',
  exportColTools: 'Εργαλεία',
  exportColEngagement: 'Engagement',
  exportColStatus: 'Κατάσταση',
  exportStatusStruggling: 'Αδύναμο',
  exportStatusConfident: 'Ισχυρό',
  exportFeynmanActions: 'Feynman ενέργειες',
  exportNoTasks: 'Δεν υπάρχουν εργασίες.',
  exportWorkspaceNextAction: 'Επόμενη ενέργεια workspace',
  exportLabelConcept: 'Έννοια',
  exportLabelCourse: 'Μάθημα',
  exportLabelSection: 'Ενότητα',
  exportLabelExported: 'Εξαγωγή',
  exportSuggestedTool: 'Προτεινόμενο εργαλείο',
  exportSummary: 'Σύνοψη',
  exportWeakSpots: 'Αδύναμα σημεία',
  exportSessionToolActivity: 'Εργαλεία συνεδρίας',
  exportConceptBusMirror: 'Concept Bus (mirror)',
  exportNextTasks: 'Επόμενες εργασίες',
  wbcConceptFallback: 'Έννοια',
  wbcCentralFormula: 'Κεντρικός τύπος',
  wbcHintCentralFormula: 'Γράψε τον κύριο τύπο στο κέντρο.',
  wbcVariables: 'Μεταβλητές',
  wbcHintVariables: 'Πρόσθεσε ετικέτες για κάθε σύμβολο.',
  wbcLinks: 'Συνδέσεις',
  wbcHintLinks: 'Βέλη μεταξύ σχετικών τύπων.',
  wbcTwoBoxes: 'Δύο κουτιά',
  wbcHintTwoBoxes: 'Αριστερά «{a}», δεξιά «{b}».',
  wbcSimilarities: 'Ομοιότητες',
  wbcHintSimilarities: 'Γέφυρα ή λίστα στη μέση.',
  wbcDifferences: 'Διαφορές',
  wbcHintDifferences: 'Βέλη προς χαρακτηριστικά κάθε πλευράς.',
  wbcCenter: 'Κέντρο',
  wbcHintCenter: 'Κύκλος ή κουτί με «{center}».',
  wbcSatellite: 'Δορυφόρος {n}',
  wbcHintSatellite: 'Σύνδεσε «{sat}» με βέλος.',
  wbcStart: 'Έναρξη',
  wbcHintStart: 'Πρώτο βήμα της διαδικασίας.',
  wbcStepN: 'Βήμα {n}',
  wbcHintNextStage: 'Βέλος στο επόμενο στάδιο.',
  wbcCloseLoop: 'Κλείσιμο κύκλου',
  wbcHintCloseLoop: 'Προαιρετικό βέλος πίσω στην αρχή.',
  wbcCauses: 'Αιτίες',
  wbcHintCauses: '1–2 κουτιά αριστερά με οδηγούς όρους.',
  wbcCoreConcept: 'Κεντρική έννοια',
  wbcHintCoreBox: 'Κεντρικό κουτί «{center}».',
  wbcEffects: 'Αποτελέσματα',
  wbcHintEffects: 'Βέλη προς δεξιά — τι προκαλεί;',
  wbcLabels: 'Ετικέτες',
  wbcHintLabels: 'Σύντομες λέξεις-κλειδιά από το απόσπασμα.',
"""


def inject_keys() -> None:
    i18n = ROOT / "src/lib/i18n.ts"
    text = i18n.read_text(encoding="utf-8")
    if "gotItContinue:" in text:
        print("P4 keys already present")
        return
    text = text.replace(
        "  conceptMapUndo: 'Undo',\n} as const;",
        "  conceptMapUndo: 'Undo'," + EN_EXTRA + "} as const;",
    )
    text = text.replace(
        "  conceptMapUndo: 'Αναίρεση',\n} as const;",
        "  conceptMapUndo: 'Αναίρεση'," + EL_EXTRA + "} as const;",
    )
    i18n.write_text(text, encoding="utf-8")
    print("Injected P4 keys")


def patch_file(path: Path, content: str) -> None:
    path.write_text(content, encoding="utf-8")
    print(f"PATCHED {path.name}")


def migrate_strips() -> None:
    quiz = (WS / "QuizSelectionContractStrip.tsx").read_text(encoding="utf-8")
    quiz = """import type { QuizSelectionRemediationReport } from '../../lib/quizSelectionRemediationQA';
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
"""
    patch_file(WS / "QuizSelectionContractStrip.tsx", quiz)

    leitner = (WS / "LeitnerStaleArtifactBanner.tsx").read_text(encoding="utf-8")
    leitner = leitner.replace(
        "import { WorkspacePanelWarnStrip } from './WorkspacePanelWarnStrip';",
        "import { WorkspacePanelWarnStrip } from './WorkspacePanelWarnStrip';\nimport { useI18n } from '../../lib/i18n';",
    )
    leitner = leitner.replace("const isEl = lang === 'el';\n  const compact", "const { t } = useI18n();\n  const compact")
    leitner = leitner.replace("{isEl ? 'Εντάξει, συνέχεια' : 'Got it'}", "{t('gotItContinue')}")
    patch_file(WS / "LeitnerStaleArtifactBanner.tsx", leitner)


def migrate_workspace_empty_state() -> None:
    path = LIB / "workspaceEmptyState.ts"
    text = path.read_text(encoding="utf-8")
    if "import { t, type Lang }" in text:
        text = text.replace("import type { Lang } from './i18n';", "import { t, type Lang } from './i18n';")
    else:
        text = text.replace("import type { Lang } from './i18n';", "import { t, type Lang } from './i18n';")
    text = text.replace(
        "export function workspaceNoSourceMessage(lang: Lang): string {\n  return lang === 'el'\n    ? 'Ανέβασε σημειώσεις για να εμφανιστεί εξατομικευμένο περιεχόμενο από το δικό σου υλικό.'\n    : 'Upload your notes to see personalized content from your own material.';\n}",
        "export function workspaceNoSourceMessage(lang: Lang): string {\n  return t('workspaceNoSource', lang);\n}",
    )
    text = re.sub(r"const isEl = lang === 'el';\n\n  if \(!hasSource\)", "if (!hasSource)", text)
    reps = [
        ("label: isEl ? 'Ανέβασμα υλικού' : 'Upload material'", "label: t('busUploadMaterial', lang)"),
        ("label: isEl ? 'Έλεγχος γνώσεων (Quiz)' : 'Knowledge check (Quiz)'", "label: t('emptyActionQuizCheck', lang)"),
        ("label: isEl ? 'Κάρτες Leitner' : 'Leitner flashcards'", "label: t('emptyActionLeitner', lang)"),
        ("label: isEl ? 'Άνοιγμα Reader' : 'Open Reader'", "label: t('panelOpenReader', lang)"),
        ("label: isEl ? 'Χάρτης εννοιών' : 'Concept map'", "label: t('emptyActionConceptMap', lang)"),
        ("label: isEl ? 'Reprocess υλικού' : 'Reprocess material'", "label: t('busReprocessMaterial', lang)"),
        ("label: isEl ? related.labelEl : related.labelEn", "label: lang === 'el' ? related.labelEl : related.labelEn"),
    ]
    for old, new in reps:
        text = text.replace(old, new)
    patch_file(path, text)


def migrate_weak_area_reasons() -> None:
    path = LIB / "weakAreaReasons.ts"
    text = path.read_text(encoding="utf-8")
    if "from './i18n'" not in text:
        text = "import { t, type Lang } from './i18n';\n" + text
    text = re.sub(r"const isEl = lang === 'el';\n", "", text)
    text = text.replace(
        "label: isEl ? 'Συνολική δυσκολία στη συνεδρία' : 'Net struggle this session'",
        "label: t('weakReasonNetStruggle', lang)",
    )
    text = text.replace(
        "label: isEl ? `Χαμηλό mastery (${mastery}%)` : `Low mastery (${mastery}%)`",
        "label: t('weakReasonLowMastery', lang).replace('{mastery}', String(mastery))",
    )
    text = text.replace(
        "label: isEl ? 'Αδύναμο σήμα αυτή τη συνεδρία' : 'Weak signal this session'",
        "label: t('weakReasonWeakSignal', lang)",
    )
    patch_file(path, text)


def migrate_workspace_lesson_panels() -> None:
    path = LIB / "workspaceLessonPanels.ts"
    text = path.read_text(encoding="utf-8")
    if "from './i18n'" not in text:
        text = "import { t, type Lang } from './i18n';\n" + text.replace("const isEl = lang === 'el';", "")
    text = re.sub(r"const isEl = lang === 'el';\n", "", text)
    reps = [
        ("badge: isEl ? 'Βασική Έννοια' : 'Core Concept'", "badge: t('lessonBadgeCoreConcept', lang)"),
        ("title: isEl ? '💡 Υπόδειξη' : '💡 Tip'", "title: t('lessonTipTitle', lang)"),
        ("text: isEl ? 'Χρησιμοποίησε τον Feynman Check.' : 'Use the Feynman Check to verify understanding.'", "text: t('lessonTipFeynman', lang)"),
        ("badge: isEl ? 'Εμβάθυνση' : 'Deep Dive'", "badge: t('lessonBadgeDeepDive', lang)"),
        ("title: isEl ? 'Μηχανισμός' : 'Mechanism'", "title: t('lessonTitleMechanism', lang)"),
        ("text: isEl ? 'Ποιες μεταβλητές συνδέονται;' : 'What variables connect in your notes?'", "text: t('lessonTextVariables', lang)"),
        ("badge: isEl ? 'Εξάσκηση' : 'Practice'", "badge: t('lessonBadgePractice', lang)"),
        ("title: isEl ? 'Εργασία' : 'Worked Task'", "title: t('lessonTitleWorkedTask', lang)"),
        ("text: isEl ? 'Εφάρμοσε την έννοια από τις σημειώσεις σου.' : 'Apply the concept using your uploaded notes.'", "text: t('lessonTextApplyConcept', lang)"),
    ]
    for old, new in reps:
        text = text.replace(old, new)
    patch_file(path, text)


def migrate_agent_workspace_context() -> None:
    path = LIB / "agentWorkspaceContext.ts"
    text = path.read_text(encoding="utf-8")
    if "from './i18n'" not in text or "import { t" not in text:
        text = re.sub(r"import type \{ Lang \} from '\./i18n';", "import { t, type Lang } from './i18n';", text)
    text = re.sub(r"const isEl = lang === 'el';\n", "", text)
    text = text.replace(
        "? (isEl ? `Βήμα ${ctx.stepIndex + 1}/${ctx.stepCount}` : `Step ${ctx.stepIndex + 1}/${ctx.stepCount}`)",
        "? t('agentStepProgress', lang).replace('{current}', String(ctx.stepIndex + 1)).replace('{total}', String(ctx.stepCount))",
    )
    text = text.replace(
        "? (isEl ? `Ποιότητα ${ctx.sourceQuality}/100` : `Quality ${ctx.sourceQuality}/100`)",
        "? t('agentQualityScore', lang).replace('{score}', String(ctx.sourceQuality))",
    )
    text = text.replace(
        "? (isEl ? `Παλαιό pipeline (v${ctx.pipelineVersion ?? '?'})` : `Old pipeline (v${ctx.pipelineVersion ?? '?'})`)",
        "? t('agentOldPipeline', lang).replace('{version}', String(ctx.pipelineVersion ?? '?'))",
    )
    text = text.replace("heading: isEl ? 'Context:' : 'Context:'", "heading: t('agentContextHeading', lang)")
    patch_file(path, text)


def migrate_progress_session_export() -> None:
    path = LIB / "progressSessionExport.ts"
    text = path.read_text(encoding="utf-8")
    text = text.replace("import type { Lang } from './i18n';", "import { t, type Lang } from './i18n';")
    text = text.replace(
        "if (readiness >= 80) return lang === 'el' ? 'Ισχυρό' : 'Strong';\n  if (readiness >= 60) return lang === 'el' ? 'Επαρκές' : 'Proficient';\n  if (readiness >= 40) return lang === 'el' ? 'Αναπτυσσόμενο' : 'Developing';\n  return lang === 'el' ? 'Αδύναμο' : 'Weak';",
        "if (readiness >= 80) return t('exportReadinessStrong', lang);\n  if (readiness >= 60) return t('exportReadinessProficient', lang);\n  if (readiness >= 40) return t('exportReadinessDeveloping', lang);\n  return t('exportReadinessWeak', lang);",
    )
    text = re.sub(r"const isEl = lang === 'el';\n", "", text)
    mapping = [
        ("'Αναφορά προόδου συνεδρίας' : 'Study session progress report'", "'exportReportTitle', lang"),
        ("'Ετοιμότητα εξετάσεων' : 'Exam readiness'", "'exportExamReadiness', lang"),
        ("'Έννοιες' : 'Concepts'", "'exportConcepts', lang"),
        ("'Σειρά ημερών' : 'Streak'", "'exportStreak', lang"),
        ("'Ληξιπρόθεσμα' : 'Due reviews'", "'exportDueReviews', lang"),
        ("'Μελέτη σήμερα' : 'Study today'", "'exportStudyToday', lang"),
        ("'Μελέτη εβδομάδας' : 'Study this week'", "'exportStudyWeek', lang"),
        ("'Εργαλεία συνεδρίας' : 'Session tools'", "'exportSessionTools', lang"),
        ("'Ενέργειες εργαλείων' : 'Tool actions'", "'exportToolActions', lang"),
        ("'Καμία αδύναμη έννοια.' : 'No weak concepts.'", "'exportNoWeakConcepts', lang"),
        ("'Έννοια' : 'Concept'", "'exportColConcept', lang"),
        ("'Μάθημα' : 'Course'", "'exportColCourse', lang"),
        ("'Εξοικείωση' : 'Mastery'", "'exportColMastery', lang"),
        ("'Λόγοι' : 'Reasons'", "'exportColReasons', lang"),
        ("'Επανόρθωση' : 'Remediation'", "'exportColRemediation', lang"),
        ("'Δεν καταγράφηκαν εργαλεία.' : 'No tool activity recorded.'", "'exportNoToolActivity', lang"),
        ("'Concept Bus κενό — δεν καταγράφηκαν συσχετίσεις εννοιών.' : 'Concept Bus empty — no concept correlations recorded.'", "'exportConceptBusEmpty', lang"),
        ("'Εργαλεία' : 'Tools'", "'exportColTools', lang"),
        ("'Engagement' : 'Engagement'", "'exportColEngagement', lang"),
        ("'Κατάσταση' : 'Status'", "'exportColStatus', lang"),
        ("'Αδύναμο' : 'Struggling'", "'exportStatusStruggling', lang"),
        ("'Ισχυρό' : 'Confident'", "'exportStatusConfident', lang"),
        ("'Feynman ενέργειες' : 'Feynman actions'", "'exportFeynmanActions', lang"),
        ("'Δεν υπάρχουν εργασίες.' : 'No scheduled tasks.'", "'exportNoTasks', lang"),
        ("'Επόμενη ενέργεια workspace' : 'Workspace next action'", "'exportWorkspaceNextAction', lang"),
        ("'Έννοια' : 'Concept'", "'exportLabelConcept', lang"),
        ("'Μάθημα' : 'Course'", "'exportLabelCourse', lang"),
        ("'Ενότητα' : 'Section'", "'exportLabelSection', lang"),
        ("'Εξαγωγή' : 'Exported'", "'exportLabelExported', lang"),
        ("'Προτεινόμενο εργαλείο' : 'Suggested tool'", "'exportSuggestedTool', lang"),
        ("'Σύνοψη' : 'Summary'", "'exportSummary', lang"),
        ("'Αδύναμα σημεία' : 'Weak spots'", "'exportWeakSpots', lang"),
        ("'Εργαλεία συνεδρίας' : 'Session tool activity'", "'exportSessionToolActivity', lang"),
        ("'Concept Bus (mirror)' : 'Concept Bus mirror'", "'exportConceptBusMirror', lang"),
        ("'Επόμενες εργασίες' : 'Next tasks'", "'exportNextTasks', lang"),
    ]
    for el_en, key in mapping:
        text = text.replace(f"isEl ? {el_en}", f"t({key}")
    patch_file(path, text)


def migrate_whiteboard_diagram_coach() -> None:
    path = LIB / "whiteboardDiagramCoach.ts"
    text = path.read_text(encoding="utf-8")
    if "import { t" not in text:
        text = "import { t, type Lang } from './i18n';\n" + text
    text = re.sub(r"const isEl = lang === 'el';\n", "", text)
    reps = [
        ("concept.trim() || (isEl ? 'Έννοια' : 'Concept')", "concept.trim() || t('wbcConceptFallback', lang)"),
        ("label: isEl ? 'Κεντρικός τύπος' : 'Central formula'", "label: t('wbcCentralFormula', lang)"),
        ("hint: isEl ? 'Γράψε τον κύριο τύπο στο κέντρο.' : 'Write the main formula in the center.'", "hint: t('wbcHintCentralFormula', lang)"),
        ("label: isEl ? 'Μεταβλητές' : 'Variables'", "label: t('wbcVariables', lang)"),
        ("hint: isEl ? 'Πρόσθεσε ετικέτες για κάθε σύμβολο.' : 'Add labels for each symbol.'", "hint: t('wbcHintVariables', lang)"),
        ("label: isEl ? 'Συνδέσεις' : 'Links'", "label: t('wbcLinks', lang)"),
        ("hint: isEl ? 'Βέλη μεταξύ σχετικών τύπων.' : 'Arrows between related formulas.'", "hint: t('wbcHintLinks', lang)"),
        ("satellites[0] ?? (isEl ? 'Α' : 'A')", "satellites[0] ?? 'A'"),
        ("satellites[1] ?? (isEl ? 'Β' : 'B')", "satellites[1] ?? 'B'"),
        ("label: isEl ? 'Δύο κουτιά' : 'Two boxes'", "label: t('wbcTwoBoxes', lang)"),
        ("hint: isEl ? `Αριστερά «${a}», δεξιά «${b}».` : `Left \"${a}\", right \"${b}\".`", "hint: t('wbcHintTwoBoxes', lang).replace('{a}', a).replace('{b}', b)"),
        ("label: isEl ? 'Ομοιότητες' : 'Similarities'", "label: t('wbcSimilarities', lang)"),
        ("hint: isEl ? 'Γέφυρα ή λίστα στη μέση.' : 'Bridge or list in the middle.'", "hint: t('wbcHintSimilarities', lang)"),
        ("label: isEl ? 'Διαφορές' : 'Differences'", "label: t('wbcDifferences', lang)"),
        ("hint: isEl ? 'Βέλη προς χαρακτηριστικά κάθε πλευράς.' : 'Arrows to traits on each side.'", "hint: t('wbcHintDifferences', lang)"),
        ("label: isEl ? 'Κέντρο' : 'Center'", "label: t('wbcCenter', lang)"),
        ("hint: isEl ? `Κύκλος ή κουτί με «${center}».` : `Circle or box for \"${center}\".`", "hint: t('wbcHintCenter', lang).replace('{center}', center)"),
        ("label: isEl ? `Δορυφόρος ${i + 1}` : `Satellite ${i + 1}`", "label: t('wbcSatellite', lang).replace('{n}', String(i + 1))"),
        ("hint: isEl ? `Σύνδεσε «${sat}» με βέλος.` : `Link \"${sat}\" with an arrow.`", "hint: t('wbcHintSatellite', lang).replace('{sat}', sat)"),
        ("label: isEl ? 'Έναρξη' : 'Start'", "label: t('wbcStart', lang)"),
        ("hint: isEl ? 'Πρώτο βήμα της διαδικασίας.' : 'First step of the process.'", "hint: t('wbcHintStart', lang)"),
        ("label: isEl ? `Βήμα ${i + 2}` : `Step ${i + 2}`", "label: t('wbcStepN', lang).replace('{n}', String(i + 2))"),
        ("hint: isEl ? 'Βέλος στο επόμενο στάδιο.' : 'Arrow to the next stage.'", "hint: t('wbcHintNextStage', lang)"),
        ("label: isEl ? 'Κλείσιμο κύκλου' : 'Close the loop'", "label: t('wbcCloseLoop', lang)"),
        ("hint: isEl ? 'Προαιρετικό βέλος πίσω στην αρχή.' : 'Optional arrow back to the start.'", "hint: t('wbcHintCloseLoop', lang)"),
        ("label: isEl ? 'Αιτίες' : 'Causes'", "label: t('wbcCauses', lang)"),
        ("hint: isEl ? '1–2 κουτιά αριστερά με οδηγούς όρους.' : '1–2 boxes on the left with drivers.'", "hint: t('wbcHintCauses', lang)"),
        ("label: isEl ? 'Κεντρική έννοια' : 'Core concept'", "label: t('wbcCoreConcept', lang)"),
        ("hint: isEl ? `Κεντρικό κουτί «${center}».` : `Central box \"${center}\".`", "hint: t('wbcHintCoreBox', lang).replace('{center}', center)"),
        ("label: isEl ? 'Αποτελέσματα' : 'Effects'", "label: t('wbcEffects', lang)"),
        ("hint: isEl ? 'Βέλη προς δεξιά — τι προκαλεί;' : 'Arrows to the right — what does it cause?'", "hint: t('wbcHintEffects', lang)"),
        ("label: isEl ? 'Ετικέτες' : 'Labels'", "label: t('wbcLabels', lang)"),
        ("hint: isEl ? 'Σύντομες λέξεις-κλειδιά από το απόσπασμα.' : 'Short keywords from the excerpt.'", "hint: t('wbcHintLabels', lang)"),
    ]
    for old, new in reps:
        text = text.replace(old, new)
    patch_file(path, text)


def migrate_keyboard_shortcuts() -> None:
    path = LIB / "workspaceKeyboardShortcuts.ts"
    text = path.read_text(encoding="utf-8")
    text = text.replace("const isEl = lang === 'el';", "")
    text = text.replace("const labels = isEl ? elOrder : order;", "const labels = lang === 'el' ? elOrder : order;")
    text = text.replace("const g = isEl ? def.groupEl : def.groupEn;", "const g = lang === 'el' ? def.groupEl : def.groupEn;")
    patch_file(path, text)


def main() -> None:
    inject_keys()
    migrate_strips()
    migrate_workspace_empty_state()
    migrate_weak_area_reasons()
    migrate_workspace_lesson_panels()
    migrate_agent_workspace_context()
    migrate_progress_session_export()
    migrate_whiteboard_diagram_coach()
    migrate_keyboard_shortcuts()
    print("P4 migration complete")


if __name__ == "__main__":
    main()
