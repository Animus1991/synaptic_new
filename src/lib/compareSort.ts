import { normalizeFocusTerm } from './workspaceFocus';

export type CompareSortDir = 'asc' | 'desc';

/** Stricter than generic termMatchesFocus — avoids "elastic" matching "inelastic". */
function dimensionMatchesFocus(dim: string, focusTerm?: string): boolean {
  if (!focusTerm?.trim()) return false;
  const a = normalizeFocusTerm(dim);
  const b = normalizeFocusTerm(focusTerm);
  if (a === b) return true;
  return a.startsWith(b) || b.startsWith(a);
}

/** Sort comparison table rows by column; focus-matching dimensions float first when unsorted. */
export function sortCompareRows(
  items: string[][],
  columnIndex: number,
  direction: CompareSortDir,
  focusTerm?: string,
): string[][] {
  if (items.length <= 1) return items;
  const copy = [...items];
  const factor = direction === 'asc' ? 1 : -1;

  copy.sort((a, b) => {
    const aFocus = columnIndex === 0 && focusTerm && dimensionMatchesFocus(a[0] ?? '', focusTerm) ? 1 : 0;
    const bFocus = columnIndex === 0 && focusTerm && dimensionMatchesFocus(b[0] ?? '', focusTerm) ? 1 : 0;
    if (aFocus !== bFocus) return bFocus - aFocus;

    const av = (a[columnIndex] ?? '').trim();
    const bv = (b[columnIndex] ?? '').trim();
    const an = Number(av.replace(/[^0-9.-]/g, ''));
    const bn = Number(bv.replace(/[^0-9.-]/g, ''));
    if (!Number.isNaN(an) && !Number.isNaN(bn) && av !== '' && bv !== '') {
      return (an - bn) * factor;
    }
    return av.localeCompare(bv, undefined, { sensitivity: 'base' }) * factor;
  });

  return copy;
}

export function nextSortDirection(current: CompareSortDir | null): CompareSortDir {
  return current === 'asc' ? 'desc' : 'asc';
}
