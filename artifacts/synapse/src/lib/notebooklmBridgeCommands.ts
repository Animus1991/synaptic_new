export type NotebookLmBridgeCommandId = 'import' | 'shell' | 'export-review';

export type NotebookLmBridgeCommand = {
  id: NotebookLmBridgeCommandId;
  label: string;
  hint?: string;
};

const COMMANDS: {
  id: NotebookLmBridgeCommandId;
  labelEn: string;
  labelEl: string;
  hintEn: string;
  hintEl: string;
  keywords: string[];
  requiresCourse?: boolean;
}[] = [
  {
    id: 'import',
    labelEn: 'Import from NotebookLM',
    labelEl: 'Εισαγωγή από NotebookLM',
    hintEn: 'Paste study guide, quiz, chat, or audio transcript',
    hintEl: 'Επικόλλησε study guide, quiz, chat ή audio transcript',
    keywords: ['notebooklm', 'nlm', 'import', 'notebook', 'studio'],
  },
  {
    id: 'shell',
    labelEn: 'Open Notebook Shell',
    labelEl: 'Άνοιγμα Notebook Shell',
    hintEn: '3-column bridge hub for the active course',
    hintEl: '3-column bridge hub για το ενεργό μάθημα',
    keywords: ['notebook', 'shell', 'bridge', 'nlm'],
    requiresCourse: true,
  },
  {
    id: 'export-review',
    labelEn: 'Export weak-area review pack → NotebookLM',
    labelEl: 'Εξαγωγή review pack → NotebookLM',
    hintEn: 'Copy markdown for a new NotebookLM source',
    hintEl: 'Αντιγραφή markdown για νέα πηγή στο NotebookLM',
    keywords: ['export', 'review', 'weak', 'notebooklm', 'nlm'],
    requiresCourse: true,
  },
];

function matchesQuery(text: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return text.toLowerCase().includes(q);
}

/** Command palette entries for the NotebookLM bridge workflow (L15). */
export function buildNotebookLmBridgeCommands(
  query: string,
  lang: 'en' | 'el',
  opts?: { hasCourse?: boolean },
): NotebookLmBridgeCommand[] {
  const el = lang === 'el';
  const hasCourse = opts?.hasCourse ?? false;

  return COMMANDS.filter((cmd) => {
    if (cmd.requiresCourse && !hasCourse) return false;
    const label = el ? cmd.labelEl : cmd.labelEn;
    const hint = el ? cmd.hintEl : cmd.hintEn;
    const haystack = [label, hint, ...cmd.keywords].join(' ');
    return matchesQuery(haystack, query) || cmd.keywords.some((k) => matchesQuery(k, query));
  }).map((cmd) => ({
    id: cmd.id,
    label: el ? cmd.labelEl : cmd.labelEn,
    hint: el ? cmd.hintEl : cmd.hintEn,
  }));
}
