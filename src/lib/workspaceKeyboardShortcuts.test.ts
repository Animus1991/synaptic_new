import { describe, expect, it } from 'vitest';
import {
  APP_SHELL_KEYBOARD_SHORTCUTS,
  commandPaletteBadge,
  displayShortcutKeys,
  isApplePlatform,
  resolveShellFocusStudyShortcut,
  resolveWorkspaceShortcutKey,
  workspaceShortcutGroups,
  WORKSPACE_KEYBOARD_SHORTCUTS,
} from './workspaceKeyboardShortcuts';

describe('workspaceKeyboardShortcuts (SW-P3-08)', () => {
  it('resolves ? and layout keys', () => {
    expect(resolveWorkspaceShortcutKey({ key: '?', metaKey: false, ctrlKey: false, altKey: false, shiftKey: false })?.action)
      .toBe('toggle-help');
    expect(resolveWorkspaceShortcutKey({ key: 'L', metaKey: false, ctrlKey: false, altKey: false, shiftKey: false })?.action)
      .toBe('layout-lesson');
    expect(resolveWorkspaceShortcutKey({ key: 'k', metaKey: true, ctrlKey: false, altKey: false, shiftKey: false })?.action)
      .toBe('open-palette');
  });

  it('maps digit keys to tool indices', () => {
    expect(resolveWorkspaceShortcutKey({ key: '3', metaKey: false, ctrlKey: false, altKey: false, shiftKey: false })?.toolIndex)
      .toBe(2);
    expect(resolveWorkspaceShortcutKey({ key: '0', metaKey: false, ctrlKey: false, altKey: false, shiftKey: false })?.toolIndex)
      .toBe(9);
  });

  it('includes Greek group labels', () => {
    const groups = workspaceShortcutGroups('el');
    expect(groups.some((g) => g.group === 'Γενικά')).toBe(true);
    expect(groups.flatMap((g) => g.items).some((i) => i.labelEl.includes('συντομεύσεων'))).toBe(true);
    expect(WORKSPACE_KEYBOARD_SHORTCUTS.every((s) => s.labelEl.length > 0)).toBe(true);
  });

  it('commandPaletteBadge never includes the Mac-only ⌘ glyph on non-Apple platforms', () => {
    const badge = commandPaletteBadge();
    if (!isApplePlatform()) {
      expect(badge).toBe('Ctrl K');
      expect(badge).not.toContain('⌘');
      expect(badge).not.toMatch(/[\u0370-\u03FF]/); // no Greek letters from mojibake
    } else {
      expect(badge).toBe('⌘K');
    }
  });

  it('displayShortcutKeys collapses dual Mac/Windows shortcut strings', () => {
    const dual = '⌘K / Ctrl+K';
    const shown = displayShortcutKeys(dual);
    if (isApplePlatform()) {
      expect(shown).toContain('⌘');
      expect(shown).not.toMatch(/ctrl/i);
    } else {
      expect(shown).toMatch(/ctrl/i);
      expect(shown).not.toContain('⌘');
    }
  });

  it('OPT-K105 — Alt+F resolves Focus study; workspace resolver ignores Alt', () => {
    expect(resolveShellFocusStudyShortcut({
      key: 'f', metaKey: false, ctrlKey: false, altKey: true, shiftKey: false,
    })).toBe('toggle-focus-study');
    expect(resolveWorkspaceShortcutKey({
      key: 'f', metaKey: false, ctrlKey: false, altKey: true, shiftKey: false,
    })).toBeNull();
    expect(APP_SHELL_KEYBOARD_SHORTCUTS.some((s) => s.id === 'toggle-focus-study')).toBe(true);
  });
});
