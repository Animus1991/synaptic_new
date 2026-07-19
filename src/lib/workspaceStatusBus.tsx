/**
 * OPT-M9 — Unified workspace status bus.
 * Tool strips (warn / QA / stale) register here; chrome Status panel aggregates them.
 * Zero feature removal: items remain actionable; under minimal/compact in-tool chrome can mirror.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type WorkspaceStatusSeverity = 'ok' | 'info' | 'warn' | 'danger';

export type WorkspaceStatusItem = {
  id: string;
  severity: WorkspaceStatusSeverity;
  /** Plain-text summary for the Status panel. */
  title: string;
  /** Optional richer detail (plain text). */
  detail?: string;
  /** Owning tool / surface hint for grouping. */
  source?: string;
  updatedAt: number;
};

type WorkspaceStatusBusValue = {
  items: WorkspaceStatusItem[];
  upsert: (item: Omit<WorkspaceStatusItem, 'updatedAt'> & { updatedAt?: number }) => void;
  remove: (id: string) => void;
  clear: () => void;
  /** When true, in-tool strips with data-status-mirrored hide visually (content stays in panel). */
  mirrorInPanel: boolean;
  setMirrorInPanel: (v: boolean) => void;
  /** Temporarily show an in-tool strip (reveal-from-Status). */
  revealedIds: ReadonlySet<string>;
  revealInTool: (id: string, ms?: number) => void;
};

const WorkspaceStatusBusContext = createContext<WorkspaceStatusBusValue | null>(null);

export function WorkspaceStatusBusProvider({
  children,
  mirrorInPanel: mirrorProp,
}: {
  children: ReactNode;
  /** Controlled mirror mode (minimal/compact). */
  mirrorInPanel?: boolean;
}) {
  const [map, setMap] = useState<Record<string, WorkspaceStatusItem>>({});
  const [mirrorInternal, setMirrorInternal] = useState(false);
  const [revealedIds, setRevealedIds] = useState<ReadonlySet<string>>(() => new Set());
  const mirrorInPanel = mirrorProp ?? mirrorInternal;

  const upsert = useCallback((item: Omit<WorkspaceStatusItem, 'updatedAt'> & { updatedAt?: number }) => {
    setMap((prev) => {
      const title = item.title.trim() || item.id;
      const existing = prev[item.id];
      if (
        existing
        && existing.title === title
        && existing.severity === item.severity
        && existing.detail === item.detail
        && existing.source === item.source
      ) {
        return prev;
      }
      return {
        ...prev,
        [item.id]: {
          ...item,
          title,
          updatedAt: item.updatedAt ?? Date.now(),
        },
      };
    });
  }, []);

  const remove = useCallback((id: string) => {
    setMap((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const clear = useCallback(() => setMap({}), []);

  const revealInTool = useCallback((id: string, ms = 1600) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    window.setTimeout(() => {
      setRevealedIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, ms);
  }, []);

  const items = useMemo(
    () => Object.values(map).sort((a, b) => {
      const sev = severityRank(b.severity) - severityRank(a.severity);
      if (sev !== 0) return sev;
      return b.updatedAt - a.updatedAt;
    }),
    [map],
  );

  const value = useMemo(
    () => ({
      items,
      upsert,
      remove,
      clear,
      mirrorInPanel,
      setMirrorInPanel: setMirrorInternal,
      revealedIds,
      revealInTool,
    }),
    [items, upsert, remove, clear, mirrorInPanel, revealedIds, revealInTool],
  );

  return (
    <WorkspaceStatusBusContext.Provider value={value}>
      {children}
    </WorkspaceStatusBusContext.Provider>
  );
}

function severityRank(s: WorkspaceStatusSeverity): number {
  switch (s) {
    case 'danger': return 4;
    case 'warn': return 3;
    case 'info': return 2;
    case 'ok': return 1;
    default: return 0;
  }
}

export function useWorkspaceStatusBus(): WorkspaceStatusBusValue | null {
  return useContext(WorkspaceStatusBusContext);
}

/** Register a status item while mounted; auto-remove on unmount. */
export function useRegisterWorkspaceStatus(
  item: {
    id: string;
    severity: WorkspaceStatusSeverity;
    title: string;
    detail?: string;
    source?: string;
    /** When false, remove from bus (e.g. strip not rendered). Default true. */
    active?: boolean;
  } | null,
): void {
  const bus = useWorkspaceStatusBus();
  const upsert = bus?.upsert;
  const remove = bus?.remove;
  const active = item?.active !== false;
  const id = item?.id;
  const severity = item?.severity;
  const title = item?.title;
  const detail = item?.detail;
  const source = item?.source;

  useEffect(() => {
    if (!upsert || !remove || !id || !active) {
      if (remove && id && !active) remove(id);
      return;
    }
    const trimmed = (title ?? '').trim();
    if (!trimmed || !severity) return;
    upsert({
      id,
      severity,
      title: trimmed,
      detail,
      source,
    });
    return () => remove(id);
  }, [upsert, remove, id, severity, title, detail, source, active]);
}

/** Best-effort plain text from React children (for strip → bus titles). */
export function reactNodeToStatusText(node: ReactNode, max = 160): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node).trim();
  if (Array.isArray(node)) {
    return node.map((n) => reactNodeToStatusText(n, max)).filter(Boolean).join(' ').trim().slice(0, max);
  }
  if (typeof node === 'object' && node !== null && 'props' in node) {
    const el = node as { props?: { children?: ReactNode } };
    return reactNodeToStatusText(el.props?.children, max);
  }
  return '';
}
