import { useState, useRef, useCallback, useEffect, useMemo, type KeyboardEvent } from 'react';
import { useI18n } from '../../lib/i18n';
import { exportConceptMapPng } from '../../lib/conceptMapExport';
import { computeForceLayout, resolveFocusAnchorId } from '../../lib/conceptMapForceLayout';
import {
  conceptMapLargeGraphMessage,
  resolveConceptMapLayoutPlan,
} from '../../lib/conceptMapLayoutPolicy';
import { lensHighlightsMapNode } from '../../lib/conceptMapLensBridge';
import type { ConceptLensView } from '../../lib/conceptGraphModel';
import {
  assignConceptLayers,
  computeHierarchicalLayout,
  groupNodesByLayer,
  layerColor,
} from '../../lib/conceptMapHierarchy';
import { filterConceptNodes } from '../../lib/conceptGraphModel';
import { WorkspaceToolEmptyState } from './WorkspaceToolEmptyState';
import { WorkspaceSelectionActionBar } from './WorkspaceSelectionActionBar';
import type { WorkspaceSelectionActionId, WorkspaceSelectionContext } from '../../lib/workspaceSelectionActions';
import { ConceptTypeIcon } from '../ui/ConceptTypeIcon';
import { conceptTypeGlyph } from '../../lib/conceptTypeIcons';
import { Map, BookOpen, Pencil, FileText, X, Plus, Trash2, Link2, Undo2 } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import { bandColorVar, masteryColorForValue, accentHighlightVar } from '../../lib/masteryPalette';
import { edgeKey, newCustomNodeId } from '../../lib/conceptMapGraph';
import { connectConceptMapCursors,
  notifyCursorStream,
  type ConceptMapCursor,
} from '../../lib/conceptMapCursorSync';
import { nearestNodeInDirection, type CardinalDirection } from '../../lib/canvasKeyboardA11y';

interface DragNode {
  id: string;
  label: string;
  mastery: number;
  type: 'concept' | 'formula' | 'definition' | 'theory';
  x: number;
  y: number;
  note?: string;
  pinned?: boolean;
}

interface DragEdge {
  from: string;
  to: string;
  relation: 'prerequisite' | 'related' | 'contrasts';
}

const RELATION_LABEL: Record<DragEdge['relation'], string> = {
  prerequisite: '→',
  related: '~',
  contrasts: '≠',
};

type GraphSnapshot = { nodes: DragNode[]; edges: DragEdge[] };

const RELATION_ORDER: DragEdge['relation'][] = ['prerequisite', 'related', 'contrasts'];

function nextRelation(r: DragEdge['relation']): DragEdge['relation'] {
  const i = RELATION_ORDER.indexOf(r);
  return RELATION_ORDER[(i + 1) % RELATION_ORDER.length];
}

function nodeMasteryOpacity(mastery: number): number {
  if (mastery < 40) return 0.48;
  if (mastery < 55) return 0.72;
  return 1;
}

interface Props {
  initialNodes: DragNode[];
  initialEdges: DragEdge[];
  onNodeUpdate?: (nodes: DragNode[]) => void;
  /** Persist nodes + edges after structural edits (Wave B). */
  onGraphUpdate?: (graph: { nodes: DragNode[]; edges: DragEdge[] }) => void;
  emptyMessage?: string;
  hasSource?: boolean;
  onUpload?: () => void;
  /** Open reader with this concept label highlighted. */
  onFocusTerm?: (term: string) => void;
  /** §13.5 unified selection actions for the selected node. */
  onSelectionAction?: (action: WorkspaceSelectionActionId, ctx: WorkspaceSelectionContext) => void;
  /** Workspace focus concept — anchors force layout at center. */
  focusConcept?: string;
  lensConcept?: string;
  conceptLens?: ConceptLensView;
  onConceptSelect?: (label: string) => void;
  /** Collaborative cursor sync (SSE) when proxy + course configured. */
  cursorSync?: { courseId: string; conceptKey: string; baseUrl: string };
  /** Yjs CRDT graph sync when joined to a study room with collab WebSocket. */
  crdt?: {
    nodes: DragNode[];
    edges: DragEdge[];
    synced: boolean;
    connecting: boolean;
    applyLocalGraph: (graph: { nodes: DragNode[]; edges: DragEdge[] }) => void;
  };
}

const MASTERY_COLOR = (m: number) => (m > 0 ? masteryColorForValue(m) : 'var(--color-text-muted)');

export function DraggableConceptMap({ initialNodes, initialEdges, onNodeUpdate, onGraphUpdate, emptyMessage, hasSource = false, onUpload, onFocusTerm, onSelectionAction, focusConcept, lensConcept, conceptLens, onConceptSelect, cursorSync, crdt }: Props) {
  const { t, lang } = useI18n();
  const [nodes, setNodes] = useState<DragNode[]>(initialNodes);
  const [edges, setEdges] = useState<DragEdge[]>(initialEdges);
  const [selected, setSelected] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState('');
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [selectedEdgeKey, setSelectedEdgeKey] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const undoStack = useRef<GraphSnapshot[]>([]);
  const [noteText, setNoteText] = useState('');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [exporting, setExporting] = useState(false);
  const [layoutRunning, setLayoutRunning] = useState(false);
  const [hierarchyMode, setHierarchyMode] = useState(false);
  const [activeLayerDepth, setActiveLayerDepth] = useState<number | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [remoteCursors, setRemoteCursors] = useState<ConceptMapCursor[]>([]);
  const [filterQuery, setFilterQuery] = useState('');
  const panStart = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const dragging = useRef<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasFocusRef = useRef<HTMLDivElement>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');
  const clientId = useRef(
    typeof sessionStorage !== 'undefined'
      ? (sessionStorage.getItem('synapse.concept-map.clientId') ?? (() => {
        const id = `cm-${Math.random().toString(36).slice(2, 10)}`;
        sessionStorage.setItem('synapse.concept-map.clientId', id);
        return id;
      })())
      : `cm-${Math.random().toString(36).slice(2, 10)}`,
  );
  const lastCursorPost = useRef(0);

  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));

  const publishGraph = useCallback((nextNodes: DragNode[], nextEdges: DragEdge[]) => {
    if (crdt?.synced) {
      crdt.applyLocalGraph({ nodes: nextNodes, edges: nextEdges });
    }
    onNodeUpdate?.(nextNodes);
    onGraphUpdate?.({ nodes: nextNodes, edges: nextEdges });
  }, [onNodeUpdate, onGraphUpdate, crdt]);

  useEffect(() => {
    if (!crdt?.synced) return;
    setNodes(crdt.nodes);
    setEdges(crdt.edges);
  }, [crdt?.synced, crdt?.nodes, crdt?.edges]);

  const pushHistory = useCallback(() => {
    undoStack.current.push({
      nodes: structuredClone(nodes),
      edges: structuredClone(edges),
    });
    if (undoStack.current.length > 30) undoStack.current.shift();
    setCanUndo(true);
  }, [nodes, edges]);

  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    setCanUndo(undoStack.current.length > 0);
    setNodes(prev.nodes);
    setEdges(prev.edges);
    publishGraph(prev.nodes, prev.edges);
    setSelected(null);
    setSelectedEdgeKey(null);
    setConnectFrom(null);
  }, [publishGraph]);

  const publishCursor = useCallback((nodeId: string, x: number, y: number, label: string) => {
    if (!cursorSync) return;
    const now = Date.now();
    if (now - lastCursorPost.current < 120) return;
    lastCursorPost.current = now;
    const cursor: ConceptMapCursor = {
      clientId: clientId.current,
      nodeId,
      x,
      y,
      label,
      at: new Date().toISOString(),
    };
    notifyCursorStream(fetch, cursorSync.baseUrl, cursorSync.courseId, cursorSync.conceptKey, cursor);
  }, [cursorSync]);

  useEffect(() => {
    if (!cursorSync) return;
    return connectConceptMapCursors(
      cursorSync.courseId,
      cursorSync.conceptKey,
      cursorSync.baseUrl,
      setRemoteCursors,
    );
  }, [cursorSync?.courseId, cursorSync?.conceptKey, cursorSync?.baseUrl]);

  const toSvg = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: clientX, y: clientY };
    const rect = svg.getBoundingClientRect();
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  }, [zoom, pan]);

  const handlePointerDown = useCallback((e: React.PointerEvent, nodeId: string) => {
    e.stopPropagation();
    if (connectFrom) {
      if (connectFrom !== nodeId) {
        const candidate: DragEdge = { from: connectFrom, to: nodeId, relation: 'prerequisite' };
        const key = edgeKey(candidate);
        if (!edges.some((edge) => edgeKey(edge) === key)) {
          pushHistory();
          const next = [...edges, candidate];
          setEdges(next);
          publishGraph(nodes, next);
        }
      }
      setConnectFrom(null);
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = nodeId;
    const pt = toSvg(e.clientX, e.clientY);
    const node = nodeMap[nodeId];
    dragOffset.current = { x: pt.x - node.x, y: pt.y - node.y };
    setSelected(nodeId);
    setSelectedEdgeKey(null);
    if (node) onConceptSelect?.(node.label);
  }, [toSvg, nodeMap, onConceptSelect, connectFrom, nodes, edges, publishGraph, pushHistory]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragging.current) {
      const pt = toSvg(e.clientX, e.clientY);
      const nx = pt.x - dragOffset.current.x;
      const ny = pt.y - dragOffset.current.y;
      setNodes(prev => prev.map(n =>
        n.id === dragging.current
          ? { ...n, x: nx, y: ny }
          : n
      ));
      const node = nodeMap[dragging.current];
      if (node) publishCursor(dragging.current, nx, ny, node.label);
    } else if (isPanning) {
      setPan({
        x: panStart.current.px + (e.clientX - panStart.current.x),
        y: panStart.current.py + (e.clientY - panStart.current.y),
      });
    }
  }, [toSvg, isPanning, nodeMap, publishCursor]);

  const handlePointerUp = useCallback(() => {
    if (dragging.current) {
      dragging.current = null;
      setNodes((prev) => {
        publishGraph(prev, edges);
        return prev;
      });
    }
    setIsPanning(false);
  }, [onNodeUpdate, edges, publishGraph]);

  const handleBgPointerDown = useCallback((e: React.PointerEvent) => {
    if (dragging.current) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
    setSelected(null);
    setSelectedEdgeKey(null);
    setEditingNote(null);
  }, [pan]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(prev => Math.max(0.3, Math.min(2.5, prev - e.deltaY * 0.001)));
  }, []);

  const startNote = (id: string) => {
    setEditingNote(id);
    setNoteText(nodeMap[id]?.note || '');
  };

  const saveNote = () => {
    if (!editingNote) return;
    pushHistory();
    setNodes(prev => {
      const next = prev.map(n => n.id === editingNote ? { ...n, note: noteText } : n);
      publishGraph(next, edges);
      return next;
    });
    setEditingNote(null);
  };

  const addNode = () => {
    pushHistory();
    const id = newCustomNodeId();
    const label = t('conceptMapNewNodeLabel');
    const cx = 320 - pan.x / zoom;
    const cy = 200 - pan.y / zoom;
    setNodes((prev) => {
      const next = [...prev, { id, label, type: 'concept' as const, x: cx, y: cy, mastery: 0 }];
      publishGraph(next, edges);
      return next;
    });
    setSelected(id);
    setEditingLabel(id);
    setLabelDraft(label);
  };

  const deleteSelectedNode = () => {
    if (!selected) return;
    pushHistory();
    const nextNodes = nodes.filter((n) => n.id !== selected);
    const nextEdges = edges.filter((e) => e.from !== selected && e.to !== selected);
    setNodes(nextNodes);
    setEdges(nextEdges);
    publishGraph(nextNodes, nextEdges);
    setSelected(null);
    setEditingLabel(null);
    setConnectFrom(null);
  };

  const saveLabel = () => {
    if (!editingLabel || !labelDraft.trim()) {
      setEditingLabel(null);
      return;
    }
    pushHistory();
    setNodes((prev) => {
      const next = prev.map((n) => n.id === editingLabel ? { ...n, label: labelDraft.trim() } : n);
      publishGraph(next, edges);
      return next;
    });
    setEditingLabel(null);
  };

  const runForceLayout = useCallback(() => {
    if (nodes.length === 0) return;
    setLayoutRunning(true);
    setHierarchyMode(false);
    const plan = resolveConceptMapLayoutPlan(nodes.length);
    const anchorId = resolveFocusAnchorId(nodes, focusConcept ?? lensConcept);
    const apply = () => {
      const laid = computeForceLayout(nodes, edges, {
        width: 640,
        height: 400,
        anchorId,
        iterations: plan.iterations,
      });
      const merged = nodes.map((n) => {
        const pos = laid.find((p) => p.id === n.id);
        return pos ? { ...n, x: pos.x, y: pos.y } : n;
      });
      setNodes(merged);
      publishGraph(merged, edges);
      setLayoutRunning(false);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    };
    if (plan.deferMs > 0) {
      window.setTimeout(apply, plan.deferMs);
    } else {
      apply();
    }
  }, [nodes, edges, focusConcept, lensConcept, publishGraph]);

  const layerMap = useMemo(() => assignConceptLayers(nodes, edges), [nodes, edges]);
  const layerGroups = useMemo(() => groupNodesByLayer(nodes, layerMap, lang), [nodes, layerMap, lang]);
  const visibleNodes = useMemo(() => {
    const filtered = filterConceptNodes(nodes, filterQuery);
    if (activeLayerDepth === null) return filtered;
    return filtered.filter((n) => (layerMap.get(n.id) ?? 0) === activeLayerDepth);
  }, [nodes, layerMap, activeLayerDepth, filterQuery]);

  const runHierarchyLayout = useCallback(() => {
    if (nodes.length === 0) return;
    setLayoutRunning(true);
    setHierarchyMode(true);
    setActiveLayerDepth(null);
    const laid = computeHierarchicalLayout(nodes, edges, { width: 640, height: 400 }) as DragNode[];
    setNodes(laid);
    publishGraph(laid, edges);
    setLayoutRunning(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [nodes, edges, publishGraph]);

  useEffect(() => { setNodes(initialNodes); }, [initialNodes]);
  useEffect(() => { setEdges(initialEdges); }, [initialEdges]);

  const selectedNode = selected ? nodeMap[selected] : null;
  const selectedEdge = useMemo(
    () => (selectedEdgeKey ? edges.find((e) => edgeKey(e) === selectedEdgeKey) ?? null : null),
    [edges, selectedEdgeKey],
  );

  const relationLabel = useCallback((relation: DragEdge['relation']) => {
    if (relation === 'prerequisite') return t('conceptMapRelationPrerequisite');
    if (relation === 'related') return t('conceptMapRelationRelated');
    return t('conceptMapRelationContrasts');
  }, [t]);

  const focusNodeById = useCallback((nodeId: string) => {
    const node = nodeMap[nodeId];
    if (!node) return;
    setSelected(nodeId);
    setSelectedEdgeKey(null);
    setConnectFrom(null);
    setLiveAnnouncement(t('conceptMapNodeFocused').replace('{label}', node.label));
    onConceptSelect?.(node.label);
  }, [nodeMap, onConceptSelect, t]);

  const handleCanvasKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (editingNote || editingLabel) return;
    const navPoints = visibleNodes.map((n) => ({ id: n.id, x: n.x, y: n.y }));
    if (navPoints.length === 0) return;

    const dirMap: Record<string, CardinalDirection> = {
      ArrowRight: 'right',
      ArrowLeft: 'left',
      ArrowDown: 'down',
      ArrowUp: 'up',
    };

    if (dirMap[e.key]) {
      e.preventDefault();
      const nextId = nearestNodeInDirection(navPoints, selected, dirMap[e.key]!);
      if (nextId) focusNodeById(nextId);
      return;
    }

    if (e.key === 'Home') {
      e.preventDefault();
      focusNodeById(navPoints[0]!.id);
      return;
    }
    if (e.key === 'End') {
      e.preventDefault();
      focusNodeById(navPoints[navPoints.length - 1]!.id);
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!selected) focusNodeById(navPoints[0]!.id);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setSelected(null);
      setSelectedEdgeKey(null);
      setConnectFrom(null);
      return;
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && selected && !connectFrom) {
      e.preventDefault();
      deleteSelectedNode();
      return;
    }
    if ((e.key === 'c' || e.key === 'C') && selected) {
      e.preventDefault();
      setConnectFrom((prev) => (prev ? null : selected));
    }
  }, [connectFrom, deleteSelectedNode, editingLabel, editingNote, focusNodeById, selected, visibleNodes]);

  const deleteSelectedEdge = useCallback(() => {
    if (!selectedEdgeKey) return;
    pushHistory();
    setEdges((prev) => {
      const next = prev.filter((e) => edgeKey(e) !== selectedEdgeKey);
      publishGraph(nodes, next);
      return next;
    });
    setSelectedEdgeKey(null);
  }, [selectedEdgeKey, nodes, publishGraph, pushHistory]);

  const cycleSelectedEdgeRelation = useCallback(() => {
    if (!selectedEdgeKey) return;
    pushHistory();
    setEdges((prev) => {
      const next = prev.map((e) =>
        edgeKey(e) === selectedEdgeKey ? { ...e, relation: nextRelation(e.relation) } : e,
      );
      publishGraph(nodes, next);
      return next;
    });
  }, [selectedEdgeKey, nodes, publishGraph, pushHistory]);

  if (initialNodes.length === 0) {
    return (
      <WorkspaceToolEmptyState
        tool="concept-map"
        concept={focusConcept}
        message={emptyMessage}
        hasSource={hasSource ?? false}
        onUpload={onUpload}
      />
    );
  }

  return (
    <div className="relative ws-bento overflow-hidden flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle bg-surface-secondary/40 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-text-secondary inline-flex items-center gap-1.5">
            <Map className="w-3.5 h-3.5 text-brand-600" />
            {t('conceptMap')}
          </span>
          <span className="text-[10px] text-text-muted">{t('dragHint')}</span>
          <input
            type="search"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder={t('conceptMapFilterPlaceholder')}
            className="ml-2 w-32 rounded border border-border-subtle bg-surface-card px-2 py-0.5 text-[10px] text-text-secondary placeholder:text-text-muted focus:border-accent-cyan/40 focus:outline-none"
            data-testid="concept-map-filter"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            data-testid="concept-map-add-node"
            onClick={addNode}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-brand-600/15 text-brand-700 border border-brand-500/30 hover:bg-brand-600/25"
            title={t('conceptMapAddNode')}
          >
            <Plus className="w-3 h-3" />
            {t('conceptMapAddNode')}
          </button>
          <button
            type="button"
            data-testid="concept-map-connect"
            onClick={() => {
              if (connectFrom) setConnectFrom(null);
              else if (selected) setConnectFrom(selected);
            }}
            disabled={!selected && !connectFrom}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium border',
              connectFrom ? 'border-accent-cyan/40 bg-accent-cyan/15 text-brand-800' : 'border-border-subtle text-text-muted hover:text-text-secondary',
            )}
            title={t('conceptMapConnectHint')}
          >
            <Link2 className="w-3 h-3" />
            {t('conceptMapConnect')}
          </button>
          <button
            type="button"
            data-testid="concept-map-undo"
            disabled={!canUndo}
            onClick={undo}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium border border-border-subtle text-text-muted hover:text-text-secondary disabled:opacity-40"
            title={t('conceptMapUndo')}
          >
            <Undo2 className="w-3 h-3" />
            {t('conceptMapUndo')}
          </button>
          <button
            type="button"
            aria-label={t('conceptMapZoomIn')}
            onClick={() => setZoom(z => Math.min(2.5, z + 0.2))}
            className="w-6 h-6 rounded bg-surface-hover text-text-secondary text-xs flex items-center justify-center hover:bg-surface-active"
          >
            +
          </button>
          <span className="text-[10px] text-text-muted w-10 text-center" aria-live="polite">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            aria-label={t('conceptMapZoomOut')}
            onClick={() => setZoom(z => Math.max(0.3, z - 0.2))}
            className="w-6 h-6 rounded bg-surface-hover text-text-secondary text-xs flex items-center justify-center hover:bg-surface-active"
          >
            −
          </button>
          <button
            type="button"
            aria-label={t('conceptMapResetView')}
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            className="ml-1 px-2 py-1 rounded text-[10px] text-text-muted hover:text-text-secondary bg-surface-hover"
          >
            {t('reset')}
          </button>
          <button
            type="button"
            data-testid="concept-map-hierarchy-layout"
            disabled={layoutRunning || nodes.length < 2}
            onClick={runHierarchyLayout}
            className="ml-1 px-2 py-1 rounded text-[10px] text-accent-emerald hover:text-accent-emerald/80 bg-accent-emerald/10 border border-accent-emerald/30 disabled:opacity-40"
          >
            {layoutRunning && hierarchyMode ? '…' : t('conceptMapHierarchy')}
          </button>
          <button
            type="button"
            data-testid="concept-map-force-layout"
            disabled={layoutRunning || nodes.length < 2}
            onClick={runForceLayout}
            className="ml-1 px-2 py-1 rounded text-[10px] text-brand-800 hover:opacity-80 bg-accent-cyan/10 border border-accent-cyan/30 disabled:opacity-40"
          >
            {layoutRunning ? '…' : t('conceptMapForce')}
          </button>
          <button
            type="button"
            data-testid="concept-map-export-png"
            disabled={exporting || nodes.length === 0}
            onClick={async () => {
              if (!svgRef.current) return;
              setExporting(true);
              try {
                await exportConceptMapPng(svgRef.current, nodes, edges, 'concept-map');
              } finally {
                setExporting(false);
              }
            }}
            className="ml-1 px-2 py-1 rounded text-[10px] text-brand-800 hover:text-brand-800 bg-brand-600/15 border border-brand-500/30 disabled:opacity-40"
          >
            {exporting ? '…' : 'PNG'}
          </button>
          {crdt && (
            <span
              className={cn(
                'ml-2 rounded-full px-2 py-0.5 text-[9px] font-semibold border',
                crdt.synced
                  ? 'border-accent-emerald/40 bg-accent-emerald/10 text-accent-emerald'
                  : 'border-border-subtle bg-surface-hover text-text-muted',
              )}
              data-testid="concept-map-crdt-status"
            >
              {crdt.synced ? t('conceptMapCollabSynced') : t('conceptMapCollabConnecting')}
            </span>
          )}
        </div>
      </div>

      {conceptMapLargeGraphMessage(nodes.length, lang) && (
        <div
          className="shrink-0 border-b border-accent-amber/25 bg-accent-amber/10 px-4 py-1.5 text-[10px] text-accent-amber"
          data-testid="concept-map-large-graph-banner"
        >
          {conceptMapLargeGraphMessage(nodes.length, lang)}
        </div>
      )}

      {layerGroups.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5 px-4 py-1.5 border-b border-border-subtle bg-surface-secondary/20 shrink-0" data-testid="concept-map-layers">
          <span className="text-[9px] font-semibold text-text-muted">{t('conceptMapLayersLabel')}</span>
          <button
            type="button"
            onClick={() => setActiveLayerDepth(null)}
            className={cn(
              'rounded-full px-2 py-0.5 text-[9px] font-medium border',
              activeLayerDepth === null ? 'border-brand-500/40 bg-brand-600/15 text-brand-800' : 'border-border-subtle text-text-muted',
            )}
          >
            {t('conceptMapAll')}
          </button>
          {layerGroups.map((g) => (
            <button
              key={g.depth}
              type="button"
              data-testid={`concept-map-layer-${g.depth}`}
              onClick={() => setActiveLayerDepth(g.depth)}
              className={cn(
                'rounded-full px-2 py-0.5 text-[9px] font-medium border',
                activeLayerDepth === g.depth ? 'border-brand-500/40 text-text-primary' : 'border-border-subtle text-text-muted',
              )}
              style={{ borderColor: activeLayerDepth === g.depth ? layerColor(g.depth) : undefined }}
            >
              {g.label} ({g.nodeIds.length})
            </button>
          ))}
        </div>
      )}

      {/* Screen-reader node tree (keyboard-focusable list) */}
      <ul
        role="tree"
        aria-label={t('conceptMapNodeTree')}
        data-testid="concept-map-node-tree"
        className="sr-only"
      >
        {visibleNodes.map((node) => (
          <li key={node.id} role="none">
            <button
              type="button"
              id={`concept-map-node-${node.id}`}
              role="treeitem"
              aria-selected={selected === node.id}
              tabIndex={selected === node.id || (!selected && visibleNodes[0]?.id === node.id) ? 0 : -1}
              onClick={() => focusNodeById(node.id)}
              onFocus={() => canvasFocusRef.current?.focus()}
            >
              {node.label} ({node.mastery}%)
            </button>
          </li>
        ))}
      </ul>

      <div
        ref={canvasFocusRef}
        className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50"
        onWheel={handleWheel}
        data-testid="concept-map-canvas"
        role="application"
        tabIndex={0}
        aria-label={t('conceptMapCanvasLabel')}
        aria-activedescendant={selected ? `concept-map-node-${selected}` : undefined}
        onKeyDown={handleCanvasKeyDown}
      >
        <span className="sr-only" aria-live="polite" aria-atomic="true">{liveAnnouncement}</span>
        <svg
          ref={svgRef}
          width="100%" height="100%"
          onPointerDown={handleBgPointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="block select-none"
        >
          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
            <defs>
              <marker id="dm-arrow" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#4d4870" />
              </marker>
            </defs>

            {/* Edges */}
            {edges.map((edge) => {
              const from = nodeMap[edge.from];
              const to = nodeMap[edge.to];
              if (!from || !to) return null;
              if (activeLayerDepth !== null) {
                const fromLayer = layerMap.get(edge.from) ?? 0;
                const toLayer = layerMap.get(edge.to) ?? 0;
                if (fromLayer !== activeLayerDepth && toLayer !== activeLayerDepth) return null;
              }
              const ek = edgeKey(edge);
              const lit = selected === edge.from || selected === edge.to;
              const isEdgeSel = selectedEdgeKey === ek;
              const dash = edge.relation === 'contrasts' ? '8,4' : edge.relation === 'related' ? '4,4' : 'none';
              const midX = (from.x + to.x) / 2;
              const midY = (from.y + to.y) / 2;
              return (
                <g
                  key={ek}
                  data-testid="concept-map-edge"
                  className="cursor-pointer"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setSelectedEdgeKey(ek);
                    setSelected(null);
                    setConnectFrom(null);
                  }}
                >
                  <line
                    x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                    stroke="transparent" strokeWidth={14}
                    pointerEvents="stroke"
                  />
                  <line
                    x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                    stroke={isEdgeSel ? accentHighlightVar() : lit ? accentHighlightVar() : 'var(--color-border-subtle)'}
                    strokeWidth={isEdgeSel ? 3 : lit ? 2.5 : 1.5}
                    strokeDasharray={dash} markerEnd="url(#dm-arrow)"
                    pointerEvents="none"
                  />
                  <text
                    x={midX}
                    y={midY - 4}
                    textAnchor="middle"
                    fontSize={9}
                    fill={isEdgeSel ? '#a5b4fc' : lit ? '#a5b4fc' : '#6b6494'}
                    data-testid="concept-map-edge-label"
                    pointerEvents="none"
                  >
                    {RELATION_LABEL[edge.relation]}
                  </text>
                </g>
              );
            })}

            {/* Nodes */}
            {visibleNodes.map(node => {
              const color = hierarchyMode ? layerColor(layerMap.get(node.id) ?? 0) : MASTERY_COLOR(node.mastery);
              const isSel = selected === node.id;
              const lensHit = conceptLens ? lensHighlightsMapNode(node.label, conceptLens) : false;
              const r = 30;
              return (
                <g
                  key={node.id}
                  opacity={nodeMasteryOpacity(node.mastery)}
                  onPointerDown={e => handlePointerDown(e, node.id)}
                  className="cursor-move"
                  aria-hidden
                >
                  {lensHit && !isSel && (
                    <circle cx={node.x} cy={node.y} r={r + 6} fill="none" stroke="var(--palette-cyan)" strokeWidth={1.5} opacity={0.45} data-testid="concept-map-lens-highlight" />
                  )}
                  {isSel && <circle cx={node.x} cy={node.y} r={r + 8} fill="none" stroke={color} strokeWidth={2} opacity={0.35} />}
                  <circle cx={node.x} cy={node.y} r={r} fill="#0f0a1e" stroke={color} strokeWidth={isSel ? 3 : 2} />
                  {/* mastery arc */}
                  <circle cx={node.x} cy={node.y} r={r} fill="none" stroke={color} strokeWidth={3} opacity={0.4}
                    strokeDasharray={`${(node.mastery / 100) * 2 * Math.PI * r} ${2 * Math.PI * r}`}
                    transform={`rotate(-90 ${node.x} ${node.y})`}
                  />
                  <text x={node.x} y={node.y - 4} textAnchor="middle" dominantBaseline="central" fontSize={12} fill={MASTERY_COLOR(node.mastery)} fontWeight="600">{conceptTypeGlyph(node.type)}</text>
                  <text x={node.x} y={node.y + 15} textAnchor="middle" fontSize={9} fill={color} fontWeight="700">{node.mastery}%</text>
                  <text x={node.x} y={node.y + r + 14} textAnchor="middle" fontSize={11} fill={isSel ? '#f1f0f7' : '#a8a3c4'} fontWeight={isSel ? '600' : '400'}>
                    {node.label.length > 16 ? node.label.slice(0, 14) + '…' : node.label}
                  </text>
                  {node.note && <circle cx={node.x + r - 4} cy={node.y - r + 4} r={5} fill="var(--palette-amber)" />}
                </g>
              );
            })}

            {cursorSync && remoteCursors
              .filter((c) => c.clientId !== clientId.current)
              .map((c) => (
                <g key={c.clientId} data-testid="concept-map-remote-cursor">
                  <circle cx={c.x} cy={c.y} r={8} fill="var(--palette-cyan)" opacity={0.35} />
                  <circle cx={c.x} cy={c.y} r={4} fill="var(--palette-cyan)" />
                  <text x={c.x + 10} y={c.y - 6} fontSize={9} fill="var(--palette-cyan)">{c.label.slice(0, 12)}</text>
                </g>
              ))}
          </g>
        </svg>
      </div>

      {connectFrom && (
        <div className="shrink-0 border-b border-accent-cyan/25 bg-accent-cyan/10 px-4 py-1.5 text-[10px] text-brand-800" data-testid="concept-map-connect-hint">
          {t('conceptMapConnectHint')}
        </div>
      )}

      {selectedEdge && !editingNote && !editingLabel && (
        <div className="absolute bottom-0 left-0 right-0 glass-strong border-t border-border-subtle" data-testid="concept-map-edge-panel">
          <div className="flex items-center gap-3 p-3 pb-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">
                {nodeMap[selectedEdge.from]?.label} → {nodeMap[selectedEdge.to]?.label}
              </p>
              <p className="text-[10px] text-text-muted">{relationLabel(selectedEdge.relation)}</p>
            </div>
            <button
              type="button"
              data-testid="concept-map-cycle-relation"
              onClick={cycleSelectedEdgeRelation}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium border border-border-subtle text-text-secondary hover:text-text-primary"
            >
              {t('conceptMapChangeRelation')}
            </button>
            <button
              type="button"
              data-testid="concept-map-delete-edge"
              onClick={deleteSelectedEdge}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium border border-accent-rose/30 bg-accent-rose/10 text-accent-rose hover:bg-accent-rose/15"
            >
              <Trash2 className="w-3 h-3" />
              {t('conceptMapDeleteEdge')}
            </button>
            <button onClick={() => setSelectedEdgeKey(null)} className="text-text-muted hover:text-text-secondary" aria-label={t('close')}><X className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      )}

      {selectedNode && !selectedEdge && !editingNote && !editingLabel && (
        <div className="absolute bottom-0 left-0 right-0 glass-strong border-t border-border-subtle">
          <div className="flex items-center gap-3 p-3 pb-2">
            <ConceptTypeIcon type={selectedNode.type} size="lg" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{selectedNode.label}</p>
              <p className="text-[10px] text-text-muted">{t('masteryLabel')} {selectedNode.mastery}% • {edges.filter(e => e.to === selectedNode.id).length} {t('prerequisites')}</p>
            </div>
            {!onSelectionAction && onFocusTerm && (
              <button
                type="button"
                onClick={() => onFocusTerm(selectedNode.label)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-accent-cyan/15 text-brand-800 border border-accent-cyan/30 hover:bg-accent-cyan/25"
              >
                <BookOpen className="w-3 h-3" />
                {t('cognitiveReader')}
              </button>
            )}
            <button onClick={() => startNote(selectedNode.id)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-brand-600/20 text-brand-600 border border-brand-500/30 hover:bg-brand-600/30">
              {selectedNode.note ? <><Pencil className="w-3 h-3" /> {t('editNote')}</> : <><FileText className="w-3 h-3" /> {t('addNote')}</>}
            </button>
            <button
              type="button"
              data-testid="concept-map-rename-node"
              onClick={() => { setEditingLabel(selectedNode.id); setLabelDraft(selectedNode.label); }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium border border-border-subtle text-text-secondary hover:text-text-primary"
            >
              <Pencil className="w-3 h-3" />
              {t('conceptMapRename')}
            </button>
            <button
              type="button"
              data-testid="concept-map-delete-node"
              onClick={deleteSelectedNode}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium border border-accent-rose/30 bg-accent-rose/10 text-accent-rose hover:bg-accent-rose/15"
            >
              <Trash2 className="w-3 h-3" />
              {t('conceptMapDeleteNode')}
            </button>
            <button onClick={() => setSelected(null)} className="text-text-muted hover:text-text-secondary" aria-label="Close"><X className="w-3.5 h-3.5" /></button>
          </div>
          {selectedNode.note && (
            <p className="px-3 pb-2 text-xs text-text-secondary bg-surface-hover/50 mx-3 rounded-lg p-2 mb-2">{selectedNode.note}</p>
          )}
          {onSelectionAction && (
            <WorkspaceSelectionActionBar
              lang={lang}
              excerpt={selectedNode.note?.trim() || selectedNode.label}
              originTool="concept-map"
              onAction={(action) => {
                onSelectionAction(action, {
                  text: selectedNode.note?.trim() || selectedNode.label,
                  term: selectedNode.label,
                  originTool: 'concept-map',
                });
                setSelected(null);
              }}
              onDismiss={() => setSelected(null)}
              data-testid="concept-map-selection-actions"
            />
          )}
        </div>
      )}

      {editingLabel && (
        <div className="absolute bottom-0 left-0 right-0 p-3 glass-strong border-t border-border-subtle">
          <p className="text-xs font-semibold mb-2">{t('conceptMapRename')}</p>
          <input
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-surface-input border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-brand-500/50"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') saveLabel(); if (e.key === 'Escape') setEditingLabel(null); }}
          />
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => setEditingLabel(null)} className="px-3 py-1 text-xs text-text-muted hover:text-text-secondary">{t('cancel')}</button>
            <button onClick={saveLabel} className="px-3 py-1.5 text-xs font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-500">{t('save')}</button>
          </div>
        </div>
      )}

      {/* Note Editor */}
      {editingNote && (
        <div className="absolute bottom-0 left-0 right-0 p-3 glass-strong border-t border-border-subtle">
          <p className="text-xs font-semibold mb-2 inline-flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-brand-600" />
            {t('noteFor')} "{nodeMap[editingNote]?.label}"
          </p>
          <textarea
            value={noteText} onChange={e => setNoteText(e.target.value)}
            placeholder={t('notePlaceholder')}
            className="w-full px-3 py-2 rounded-lg bg-surface-input border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-500/50 resize-none"
            rows={2} autoFocus
          />
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => setEditingNote(null)} className="px-3 py-1 text-xs text-text-muted hover:text-text-secondary">{t('cancel')}</button>
            <button onClick={saveNote} className="px-3 py-1.5 text-xs font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-500">{t('save')}</button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 py-2 border-t border-border-subtle bg-surface-secondary/30 shrink-0">
        {([['strong', t('strong')], ['proficient', t('proficient')], ['developing', t('developing')], ['weak', t('weakLabel')]] as const).map(([band, l]) => (
          <span key={band} className="flex items-center gap-1 text-[9px] text-text-muted">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: bandColorVar(band) }} />{l}
          </span>
        ))}
        <span className="text-[9px] text-text-muted ml-2">→ {t('prerequisite')}</span>
        <span className="text-[9px] text-text-muted">┄ {t('related')}</span>
      </div>
    </div>
  );
}
