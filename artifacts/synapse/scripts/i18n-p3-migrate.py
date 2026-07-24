"""Wave C1 P3 — migrate inline isEl to useI18n().t() in workspace panels/strips."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WS = ROOT / "src/components/workspace"
COMP = ROOT / "src/components"

REPLACEMENTS: list[tuple[str, str]] = [
    # shared literals
    ("isEl ? 'Ενότητα:' : 'Section:'", "t('wsSectionColon')"),
    ("isEl ? 'Ενότητα' : 'Section'", "t('wsSectionLabel')"),
    ("isEl ? 'Ανέβασε σημειώσεις για χρονόμετρο μελέτης.' : 'Upload notes to use the study timer.'", "t('panelEmptyTimer')"),
    ("isEl ? 'Ανέβασε σημειώσεις για προσομοίωση.' : 'Upload notes to simulate.'", "t('panelEmptySimulator')"),
    ("isEl ? 'Ανέβασε σημειώσεις για κουίζ.' : 'Upload notes to quiz.'", "t('panelEmptyQuiz')"),
    ("isEl ? 'Ανέβασε σημειώσεις για κάρτες.' : 'Upload notes for flashcards.'", "t('panelEmptyLeitner')"),
    ("isEl ? 'Ανέβασε σημειώσεις για συζήτηση.' : 'Upload notes to debate.'", "t('panelEmptyDebate')"),
    ("isEl ? 'Ανέβασε σημειώσεις για τον πίνακα.' : 'Upload notes for the whiteboard.'", "t('panelEmptyWhiteboard')"),
    ("isEl ? 'Ανέβασε σημειώσεις για εξατομικευμένη πρόοδο.' : 'Upload notes for personalized progress.'", "t('panelEmptyDashboard')"),
    ("isEl ? 'Αναζήτηση συνεδριών…' : 'Search sessions…'", "t('panelSearchSessions')"),
    ("isEl ? 'Αναζήτηση παραμέτρων…' : 'Search parameters…'", "t('panelSearchParameters')"),
    ("isEl ? 'Αναζήτηση ερωτήσεων…' : 'Search questions…'", "t('panelSearchQuestions')"),
    ("isEl ? 'Αναζήτηση καρτών…' : 'Search cards…'", "t('panelSearchCards')"),
    ("isEl ? 'Αναζήτηση επιχειρημάτων…' : 'Search claims…'", "t('panelSearchClaims')"),
    ("isEl ? 'Αναζήτηση επιχειρημάτων' : 'Search claims'", "t('panelSearchClaimsAria')"),
    ("isEl ? 'Αναζήτηση τύπων…' : 'Search formulas…'", "t('panelSearchFormulas')"),
    ("isEl ? 'Αναζήτηση τύπων' : 'Search formulas'", "t('panelSearchFormulasAria')"),
    ("isEl ? 'συνεδρίες' : 'sessions'", "t('panelSessions')"),
    ("isEl ? 'παράμετροι' : 'parameters'", "t('panelParameters')"),
    ("isEl ? 'ερωτήσεις' : 'questions'", "t('panelQuestions')"),
    ("isEl ? 'κάρτες' : 'cards'", "t('panelCards')"),
    ("isEl ? 'κόμβοι' : 'nodes'", "t('panelNodes')"),
    ("isEl ? 'τύποι' : 'formulas'", "t('panelFormulas')"),
    ("isEl ? 'Διάλειμμα → Κάρτες' : 'Break → Flashcards'", "t('panelBreakToFlashcards')"),
    ("isEl ? 'οικονομική λειτουργία' : 'econ mode'", "t('panelEconMode')"),
    ("isEl ? 'Χρονομέτρηση' : 'Timed block'", "t('panelTimedBlock')"),
    ("isEl ? 'Άνοιγμα Reader' : 'Open Reader'", "t('panelOpenReader')"),
    ("isEl ? 'Πηγή' : 'Reader'", "t('panelReaderSource')"),
    ("isEl ? 'αδύναμα' : 'weak'", "t('panelWeakCount')"),
    ("isEl ? 'εργαλεία' : 'tools'", "t('panelTools')"),
    ("isEl ? 'ενέργειες' : 'actions'", "t('panelActions')"),
    ("isEl ? 'Επόμενο:' : 'Next:'", "t('dashboardNextColon')"),
    ("isEl ? 'Λήψη HTML αναφοράς' : 'Download HTML report'", "t('dashDownloadHtml')"),
    ("isEl ? 'Εκτύπωση / PDF' : 'Print / Save as PDF'", "t('dashPrintPdf')"),
    ("isEl ? 'Εξαγωγή JSON συνεδρίας' : 'Session JSON export'", "t('dashSessionJson')"),
    ("isEl ? 'Φίλτρο weak spots / εργαλείων…' : 'Filter weak spots / tools…'", "t('dashFilterPlaceholder')"),
    # concept lens
    ("isEl ? 'Εστίαση σε όλα τα εργαλεία' : 'Focus across all tools'", "t('lensFocusAllTools')"),
    ("isEl ? 'διασύνδεση' : 'cross-tool engagement'", "t('lensCrossToolEngagement')"),
    ("isEl ? 'Προαπαιτούμενα' : 'Prerequisites'", "t('lensPrerequisitesTitle')"),
    ("isEl ? 'Σχετικές' : 'Related'", "t('lensRelatedTitle')"),
    ("isEl ? 'Επόμενες' : 'Follow-up'", "t('lensFollowUpTitle')"),
    ("isEl ? 'Δραστηριότητα εργαλείων' : 'Tool activity'", "t('lensToolActivity')"),
    # concept bus
    ("isEl ? 'Concept Bus · όρος ↔ εργαλείο' : 'Concept Bus · term ↔ tool activity'", "t('busTitle')"),
    ("isEl ? 'Δεν υπάρχει ακόμη cross-tool δραστηριότητα' : 'No cross-tool activity yet'", "t('busNoActivity')"),
    ("isEl ? 'Αδύναμη εξαγωγή — δοκίμασε Reprocess.' : 'Weak extraction — try Reprocess.'", "t('busWeakExtraction')"),
    ("isEl ? 'Ανέβασμα υλικού' : 'Upload material'", "t('busUploadMaterial')"),
    ("isEl ? 'Reprocess υλικού' : 'Reprocess material'", "t('busReprocessMaterial')"),
    ("isEl ? 'Άνοιγμα στο Reader' : 'Open in Reader'", "t('busOpenInReader')"),
    ("isEl ? 'Επόμενο βήμα' : 'Next step'", "t('busNextStep')"),
    # whiteboard coach
    ("isEl ? 'Diagram coach' : 'Diagram coach'", "t('wbDiagramCoach')"),
    ("isEl ? 'Εστίαση:' : 'Focus:'", "t('focusColon')"),
    ("isEl ? 'Ετικέτες στον πίνακα' : 'Insert labels'", "t('wbInsertLabels')"),
    ("isEl ? 'Agent οδηγός' : 'Agent guide'", "t('wbAgentGuide')"),
    ("isEl ? 'Κριτική σκίτσου' : 'Critique sketch'", "t('wbCritiqueSketch')"),
    ("isEl ? 'Ετικέτα' : 'Label'", "t('wbLabel')"),
    # intel + hints
    ("isEl ? 'Intelligence πηγής' : 'Source intelligence'", "t('sourceIntelAria')"),
    ("isEl ? 'Intelligence & πηγή' : 'Source & intelligence'", "t('sourceIntelTitle')"),
    ("isEl ? 'Κλείσιμο πίνακα' : 'Close panel'", "t('closePanel')"),
    ("isEl ? 'Πληροφορίες μάθησης' : 'Learning intelligence'", "t('learningIntelAria')"),
    ("isEl ? 'Νοητική εικόνα' : 'Study intelligence'", "t('studyIntelligence')"),
    ("isEl ? 'Κλείσιμο' : 'Close'", "t('close')"),
    ("isEl ? 'Γιατί τώρα:' : 'Why now:'", "t('whyNowColon')"),
    ("isEl ? 'βελτιώνεται' : 'polish in progress'", "t('toolPolishing')"),
    # outline
    ("isEl ? 'Ανάλυση δομής και προεπισκόπηση outline…' : 'Analyzing structure and building outline preview…'", "t('outlineAnalyzing')"),
    ("isEl ? 'Προεπισκόπηση outline' : 'Outline preview'", "t('outlinePreview')"),
    ("isEl ? 'Προτεινόμενα modules' : 'Proposed modules'", "t('outlineProposedModules')"),
    ("isEl ? 'ακόμη' : 'more'", "t('outlineMore')"),
    # scratchpad
    ("lang === 'el' ? 'Συνδεδεμένο με' : 'Attached to'", "t('scratchAttachedTo')"),
    ("lang === 'el' ? 'Αποθηκεύτηκε!' : 'Saved!'", "t('scratchSaved')"),
    ("lang === 'el' ? 'Αποθήκευση' : 'Save entry'", "t('scratchSaveEntry')"),
    ("lang === 'el' ? 'Αποθηκευμένες' : 'Saved'", "t('scratchSavedEntries')"),
    ("lang === 'el' ? 'Επιλύθηκε' : 'Resolved'", "t('scratchResolved')"),
    ("lang === 'el' ? '→ Κάρτα' : '→ Flashcard'", "t('scratchToFlashcard')"),
    ("lang === 'el' ? '→ Σχόλιο' : '→ Annotation'", "t('scratchToAnnotation')"),
    ("lang === 'el' ? 'Επιλεγμένη καταχώρηση' : 'Selected entry'", "t('scratchSelectedEntry')"),
    # strips
    ("isEl ? 'Βήμα' : 'Step'", "t('heatStep')"),
    ("isEl ? 'χωρίς αντιστοίχιση στο Reader' : 'not linked to Reader section'", "t('heatNotLinked')"),
    ("isEl ? 'Μετάβαση' : 'Jump'", "t('jump')"),
    ("isEl ? 'Dashboard export' : 'Dashboard export'", "t('stripDashboardExport')"),
    ("isEl ? 'Πρόσθεσε βήματα για επικύρωση' : 'Add steps to validate'", "t('stripAddStepsValidate')"),
    ("isEl ? 'Simulator ↔ Timer sync' : 'Simulator ↔ Timer sync'", "t('stripSimTimerSync')"),
    ("isEl ? 'έλεγχος preset' : 'preset check'", "t('stripPresetCheck')"),
    ("isEl ? 'Dashboard ↔ Timer αντίστροφη' : 'Dashboard ↔ Timer countdown'", "t('stripTimerDashCountdown')"),
    ("isEl ? 'έλεγχος ημερομηνίας' : 'date check'", "t('stripDateCheck')"),
    ("isEl ? 'Blueprint coverage' : 'Blueprint coverage'", "t('stripBlueprintCoverage')"),
    ("isEl ? 'Σύγκριση με Reader' : 'Reader parity'", "t('stripReaderParity')"),
]

FILES = [
    WS / "TimerPanel.tsx",
    WS / "SimulatorPanel.tsx",
    WS / "QuizPanel.tsx",
    WS / "LeitnerPanel.tsx",
    WS / "DebatePanel.tsx",
    WS / "ConceptBusPanel.tsx",
    WS / "ConceptLensPanel.tsx",
    WS / "WhiteboardPanel.tsx",
    WS / "WhiteboardDiagramCoach.tsx",
    WS / "DashboardPanel.tsx",
    WS / "ReaderStepHeatSyncStrip.tsx",
    WS / "WorkspaceIntelSideSheet.tsx",
    WS / "WorkspaceMobileIntelligenceBottomSheet.tsx",
    WS / "WorkspaceToolPurposeHint.tsx",
    WS / "ScratchpadNotesPanel.tsx",
    WS / "FeynmanRubricExportDiscoverabilityStrip.tsx",
    WS / "ScratchpadSympyChainStrip.tsx",
    WS / "SimulatorTimerPresetSyncStrip.tsx",
    WS / "TimerExamCountdownDashboardStrip.tsx",
    WS / "WhiteboardBlueprintCoverageStrip.tsx",
    WS / "CompareSelectionParityStrip.tsx",
    COMP / "OutlinePreviewPanel.tsx",
]

I18N_IMPORT_WS = "import { useI18n } from '../../lib/i18n';"
I18N_IMPORT_COMP = "import { useI18n } from '../lib/i18n';"


def ensure_import(text: str, import_line: str) -> str:
    if "useI18n" in text:
        return text
    # after last import
    m = list(re.finditer(r"^import .+$", text, re.M))
    if not m:
        return import_line + "\n" + text
    idx = m[-1].end()
    return text[:idx] + "\n" + import_line + text[idx:]


def patch_file(path: Path) -> bool:
    if not path.exists():
        print(f"SKIP missing {path.name}")
        return False
    text = path.read_text(encoding="utf-8")
    orig = text

    for old, new in REPLACEMENTS:
        text = text.replace(old, new)

    # template replacements
    text = re.sub(
        r"isEl\s*\?\s*`Αλυσίδα — \$\{report\.bannerSummary\}`\s*:\s*`Chain — \$\{report\.bannerSummary\}`",
        "t('stripChainPrefix').replace('{summary}', report.bannerSummary ?? '')",
        text,
    )
    text = re.sub(
        r"isEl\s*\?\s*`Agent βήμα \$\{activeStep\.order\}`\s*:\s*`Agent step \$\{activeStep\.order\}`",
        "t('wbAgentStep').replace('{order}', String(activeStep.order))",
        text,
    )
    text = re.sub(
        r"isEl\s*\?\s*`\$\{engagedCount\} όροι με πραγματική δραστηριότητα αυτή τη συνεδρία`\s*:\s*`\$\{engagedCount\} terms with real activity this session`",
        "t('busTermsActive').replace('{count}', String(engagedCount))",
        text,
    )
    text = re.sub(
        r"isEl\s*\?\s*`\$\{contractIssues\.length\} θέμα\(τα\)`\s*:\s*`\$\{contractIssues\.length\} issue\(s\)`",
        "t('stripIssueCount').replace('{count}', String(contractIssues.length))",
        text,
    )
    text = re.sub(
        r"isEl\s*\?\s*`\$\{session\.daysToExam\} ημ\. μέχρι εξέταση`\s*:\s*`\$\{session\.daysToExam\}d to exam`",
        "t('panelDaysToExam').replace('{days}', String(session.daysToExam))",
        text,
    )

    # multiline bus empty hint
    text = re.sub(
        r"\{isEl\s*\n\s*\? 'Μελέτησε με Reader, Quiz ή Feynman — οι όροι θα εμφανιστούν εδώ με cross-tool δραστηριότητα\.'\s*\n\s*: 'Study with Reader, Quiz, or Feynman — terms will appear here with cross-tool activity\.'\}",
        "{t('busEmptyHint')}",
        text,
    )

    # timer warn strips - add keys inline via t if we add keys
    text = re.sub(
        r"\{session\.passageGrounded\s*\n\s*\? \(isEl\s*\n\s*\? 'Η συνεδρία δένεται σε generic concept — επίλεξε πιο συγκεκριμένο βήμα για καλύτερο tracking\.'\s*\n\s*: 'Session is tied to a generic concept — pick a specific step for better tracking\.'\)\s*\n\s*: \(isEl\s*\n\s*\? 'Γενική έννοια — δοκίμασε Reprocess ή άλλαξε βήμα\.'\s*\n\s*: 'Generic concept — try Reprocess or switch step\.'\)\}",
        "{session.passageGrounded ? t('panelTimerGenericTracking') : t('panelTimerGenericWeak')}",
        text,
        flags=re.S,
    )

    if text == orig:
        print(f"UNCHANGED {path.name}")
        return False

    import_line = I18N_IMPORT_COMP if path.parent.name == "components" else I18N_IMPORT_WS
    text = ensure_import(text, import_line)

    # replace isEl decl with useI18n
    text = re.sub(
        r"const isEl = lang === 'el';\n",
        "const { t } = useI18n();\n",
        text,
    )
    text = re.sub(
        r"const isEl = language === 'el';\n",
        "const { t } = useI18n();\n",
        text,
    )

    path.write_text(text, encoding="utf-8")
    print(f"PATCHED {path.name}")
    return True


def main() -> None:
    # add extra keys if missing
    i18n = ROOT / "src/lib/i18n.ts"
    t = i18n.read_text(encoding="utf-8")
    extra_en = """
  panelDaysToExam: '{days}d to exam',
  panelTimerGenericTracking: 'Session is tied to a generic concept — pick a specific step for better tracking.',
  panelTimerGenericWeak: 'Generic concept — try Reprocess or switch step.',
"""
    extra_el = """
  panelDaysToExam: '{days} ημ. μέχρι εξέταση',
  panelTimerGenericTracking: 'Η συνεδρία δένεται σε generic concept — επίλεξε πιο συγκεκριμένο βήμα για καλύτερο tracking.',
  panelTimerGenericWeak: 'Γενική έννοια — δοκίμασε Reprocess ή άλλαξε βήμα.',
"""
    if "panelDaysToExam:" not in t:
        t = t.replace("  stripIssueCount: '{count} issue(s)',\n  conceptMapDeleteEdge:", extra_en + "  conceptMapDeleteEdge:")
        t = t.replace("  stripIssueCount: '{count} θέμα(τα)',\n  conceptMapDeleteEdge:", extra_el + "  conceptMapDeleteEdge:")
        i18n.write_text(t, encoding="utf-8")
        print("Added extra timer keys")

    n = sum(patch_file(p) for p in FILES)
    print(f"Done: {n} files patched")


if __name__ == "__main__":
    main()
