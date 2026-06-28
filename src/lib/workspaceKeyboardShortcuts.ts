/**
 * Study Workspace keyboard shortcuts — definitions + resolver (SW-P3-08).
 */

export type WorkspaceShortcutAction =
  | 'close-overlay'
  | 'open-palette'
  | 'prev-step'
  | 'next-step'
  | 'tool-index'
  | 'layout-lesson'
  | 'layout-tool'
  | 'layout-split'
  | 'toggle-notes'
  | 'toggle-help';

export type WorkspaceShortcutDef = {
  id: WorkspaceShortcutAction;
  keys: string;
  labelEn: string;
  labelEl: string;
  groupEn: string;
  groupEl: string;
  /** When true, shortcut still fires while focus is in an input/textarea. */
  allowWhileTyping?: boolean;
  toolIndex?: number;
};

export const WORKSPACE_KEYBOARD_SHORTCUTS: WorkspaceShortcutDef[] = [
  {
    id: 'close-overlay',
    keys: 'Esc',
    labelEn: 'Close overlays / workspace',
    labelEl: 'Κλείσιμο overlay / χώρου μελέτης',
    groupEn: 'General',
    groupEl: 'Γενικά',
  },
  {
    id: 'open-palette',
    keys: '⌘K / Ctrl+K',
    labelEn: 'Open command palette',
    labelEl: 'Άνοιγμα παλέτας εντολών',
    groupEn: 'General',
    groupEl: 'Γενικά',
    allowWhileTyping: true,
  },
  {
    id: 'toggle-help',
    keys: '?',
    labelEn: 'Show keyboard shortcuts',
    labelEl: 'Εμφάνιση συντομεύσεων πληκτρολογίου',
    groupEn: 'General',
    groupEl: 'Γενικά',
  },
  {
    id: 'prev-step',
    keys: '←',
    labelEn: 'Previous lesson step',
    labelEl: 'Προηγούμενο βήμα μαθήματος',
    groupEn: 'Navigation',
    groupEl: 'Πλοήγηση',
  },
  {
    id: 'next-step',
    keys: '→',
    labelEn: 'Next lesson step',
    labelEl: 'Επόμενο βήμα μαθήματος',
    groupEn: 'Navigation',
    groupEl: 'Πλοήγηση',
  },
  {
    id: 'tool-index',
    keys: '1…9, 0',
    labelEn: 'Switch tool (0 = 10th tool)',
    labelEl: 'Εναλλαγή εργαλείου (0 = 10ο εργαλείο)',
    groupEn: 'Tools',
    groupEl: 'Εργαλεία',
  },
  {
    id: 'layout-lesson',
    keys: 'L',
    labelEn: 'Focus lesson pane',
    labelEl: 'Εστίαση στο πάνελ μαθήματος',
    groupEn: 'Layout',
    groupEl: 'Διάταξη',
  },
  {
    id: 'layout-tool',
    keys: 'T',
    labelEn: 'Focus tool pane',
    labelEl: 'Εστίαση στο πάνελ εργαλείου',
    groupEn: 'Layout',
    groupEl: 'Διάταξη',
  },
  {
    id: 'layout-split',
    keys: 'S',
    labelEn: 'Split layout',
    labelEl: 'Διχωρισμένη διάταξη',
    groupEn: 'Layout',
    groupEl: 'Διάταξη',
  },
  {
    id: 'toggle-notes',
    keys: 'N',
    labelEn: 'Toggle session notes',
    labelEl: 'Εναλλαγή σημειώσεων συνεδρίας',
    groupEn: 'Session',
    groupEl: 'Συνεδρία',
  },
];

export function workspaceShortcutGroups(lang: 'en' | 'el'): { group: string; items: WorkspaceShortcutDef[] }[] {
  
  const order = ['General', 'Navigation', 'Tools', 'Layout', 'Session'];
  const elOrder = ['Γενικά', 'Πλοήγηση', 'Εργαλεία', 'Διάταξη', 'Συνεδρία'];
  const labels = lang === 'el' ? elOrder : order;
  const map = new Map<string, WorkspaceShortcutDef[]>();
  for (const def of WORKSPACE_KEYBOARD_SHORTCUTS) {
    const g = lang === 'el' ? def.groupEl : def.groupEn;
    if (!map.has(g)) map.set(g, []);
    map.get(g)!.push(def);
  }
  return labels.filter((g) => map.has(g)).map((g) => ({ group: g, items: map.get(g)! }));
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable;
}

export function resolveWorkspaceShortcutKey(
  e: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>,
): { action: WorkspaceShortcutAction; toolIndex?: number } | null {
  if (e.altKey) return null;

  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    return { action: 'open-palette' };
  }

  if (e.key === 'Escape') return { action: 'close-overlay' };
  if (e.key === '?' || (e.shiftKey && e.key === '/')) return { action: 'toggle-help' };
  if (e.key === 'ArrowLeft') return { action: 'prev-step' };
  if (e.key === 'ArrowRight') return { action: 'next-step' };
  if (e.key === 'n' || e.key === 'N') return { action: 'toggle-notes' };

  if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
    if (e.key === 'l' || e.key === 'L') return { action: 'layout-lesson' };
    if (e.key === 't' || e.key === 'T') return { action: 'layout-tool' };
    if (e.key === 's' || e.key === 'S') return { action: 'layout-split' };
    const digit = e.key >= '0' && e.key <= '9' ? Number(e.key) : NaN;
    if (!Number.isNaN(digit)) {
      const toolIndex = digit === 0 ? 9 : digit - 1;
      return { action: 'tool-index', toolIndex };
    }
  }

  return null;
}
