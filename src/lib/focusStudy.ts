import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'synapse:focus-study';
const CHANGE_EVENT = 'synapse:focus-study-change';

export function loadFocusStudy(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function persistFocusStudy(next: boolean): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, next ? '1' : '0');
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { focusStudy: next } }));
  }
}

/** OPT-K105 — shared Focus study session flag (Shell + keyboard help). */
export function useFocusStudy() {
  const [focusStudy, setFocusStudyState] = useState(() => loadFocusStudy());

  useEffect(() => {
    const sync = () => setFocusStudyState(loadFocusStudy());
    window.addEventListener(CHANGE_EVENT, sync);
    return () => window.removeEventListener(CHANGE_EVENT, sync);
  }, []);

  const setFocusStudy = useCallback((next: boolean) => {
    persistFocusStudy(next);
    setFocusStudyState(next);
  }, []);

  const toggleFocusStudy = useCallback(() => {
    setFocusStudy(!loadFocusStudy());
  }, [setFocusStudy]);

  return { focusStudy, setFocusStudy, toggleFocusStudy };
}
