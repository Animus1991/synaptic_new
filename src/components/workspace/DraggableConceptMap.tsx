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
import { WorkspaceSelectionActionBar } from './WorkspaceSelectionActionBar';
import type { WorkspaceSelectionActionId, WorkspaceSelectionContext } from '../../lib/workspaceSelectionActions';
import { ConceptTypeIcon } from '../ui/ConceptTypeIcon';
import { BookOpen, Pencil, FileText, X, Plus, Trash2, Link2 } from '@/lib/lucide-shim';
import { InfoHint } from '../ui/InfoHint';
import { CollapsibleChromeSection } from './CollapsibleChromeSection';
import { PanelOverflowMenu } from './PanelOverflowMenu';
import { useWorkspaceEmptyActions } from './WorkspaceEmptyActionsContext';
import { PrimaryCTA, SecondaryCTA } from '../ui/primitives';
import { cn } from '../../utils/cn';
import { bandColorVar, masteryColorForValue, accentHighlightVar } from '../../lib/masteryPalette';
import { edgeKey, newCustomNodeId } from '../../lib/conceptMapGraph';
import { connectConceptMapCursors,
  notifyCursorStream,
  type ConceptMapCursor,
} from '../../lib/conceptMapCursorSync';
import { nearestNodeInDirection, type CardinalDirection } from '../../lib/canvasKeyboardA11y';
import {
  formatConceptMapEdgeGlyph,
  formatConceptMapPmiPanel,
  formatPmiScore,
} from '../../lib/conceptMapEdgeLabel';

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
  pmi?: number;
}

type GraphSnapshot = { nodes: DragNode[]; edges: DragEdge[] };

const RELATION_ORDER: DragEdge['relation'][] = ['prerequisite', 'related', 'contrasts'];

function nextRelation(r: DragEdge['relation']): DragEdge['relation'] {
  const i = RELATION_ORDER.indexOf(r);
  return RELATION_ORDER[(i + 1) % RELATION_ORDER.length];
}

function nodeMasteryOpacity(mastery: number): number {
  // Weak nodes stay readable — the ring/arc already encodes mastery, so
  // dimming below ~0.7 only punishes label legibility (eye-strain audit).
  if (mastery < 40) return 0.7;
  if (mastery < 55) return 0.85;
  return 1;
}

/** Two-line wrap for text inside map idea chips (friendly label-first nodes). */
function wrapConceptMapLabel(label: string, maxChars: number): string[] {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return ['·'];
  const full = words.join(' ');
  if (full.length <= maxChars) return [full];
  let line1 = words[0]!;
  let i = 1;
  while (i < words.length && `${line1} ${words[i]}`.length <= maxChars) {
    line1 = `${line1} ${words[i]}`;
    i += 1;
  }
  if (line1.length > maxChars) line1 = `${line1.slice(0, maxChars - 1)}…`;
  if (i >= words.length) return [line1];
  let line2 = words[i]!;
  i += 1;
  while (i < words.length && `${line2} ${words[i]}`.length <= maxChars) {
    line2 = `${line2} ${words[i]}`;
    i += 1;
  }
  if (i < words.length || line2.length > maxChars) {
    line2 = `${line2.slice(0, Math.max(1, maxChars - 1))}…`;
  }
  return [line1, line2];
}

function masteryCaption(
  mastery: number,
  t: (key: 'strong' | 'proficient' | 'developing' | 'weakLabel') => string,
): string {
  if (mastery >= 80) return t('strong');
  if (mastery >= 60) return t('proficient');
  if (mastery >= 40) return t('developing');
  return t('weakLabel');
}

/** Chip footprint for readable multi-word idea labels (Wave CM3). */
function nodeChipSize(labelLines: string[]): { w: number; h: number } {
  const longest = Math.max(...labelLines.map((l) => l.length), 5);
  const w = Math.min(156, Math.max(108, Math.round(longest * 7.4 + 32)));
  const h = labelLines.length > 1 ? 58 : 46;
  return { w, h };
}

/** Pointer slop: below this = tap (focus study); above = drag (move only). */
const NODE_CLICK_SLOP_PX = 8;

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

/* OPT-K101 — residual markup debt: decorative brand type -> ink */
export function DraggableConceptMap({ initialNodes, initialEdges, onNodeUpdate, onGraphUpdate, emptyMessage, hasSource = false, onUpload, onFocusTerm, onSelectionAction, focusConcept, lensConcept, conceptLens, onConceptSelect, cursorSync, crdt }: Props) {
  const { t, lang } = useI18n();
  const emptyActions = useWorkspaceEmptyActions('concept-map');
  const [nodes, setNodes] = useState<DragNode[]>(initialNodes);
  const [edges, setEdges] = useState<DragEdge[]>(initialEdges);
  const [selected, setSelected] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState('');
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [selectedEdgeKey, setSelectedEdgeKey] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const undoStack = useRef<GraphSnapshot[]>([]);
  const redoStack = useRef<GraphSnapshot[]>([]);
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
  /** Wave CM3 — tap focuses study; drag only moves (no reader/focus on pointerdown). */
  const nodeGesture = useRef<{
    nodeId: string | null;
    startX: number;
    startY: number;
    dragged: boolean;
  }>({ nodeId: null, startX: 0, startY: 0, dragged: false });
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
    redoStack.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, [nodes, edges]);

  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    redoStack.current.push({
      nodes: structuredClone(nodes),
      edges: structuredClone(edges),
    });
    if (redoStack.current.length > 30) redoStack.current.shift();
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(true);
    setNodes(prev.nodes);
    setEdges(prev.edges);
    publishGraph(prev.nodes, prev.edges);
    setSelected(null);
    setSelectedEdgeKey(null);
    setConnectFrom(null);
  }, [publishGraph, nodes, edges]);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push({
      nodes: structuredClone(nodes),
      edges: structuredClone(edges),
    });
    if (undoStack.current.length > 30) undoStack.current.shift();
    setCanUndo(true);
    setCanRedo(redoStack.current.length > 0);
    setNodes(next.nodes);
    setEdges(next.edges);
    publishGraph(next.nodes, next.edges);
    setSelected(null);
    setSelectedEdgeKey(null);
    setConnectFrom(null);
  }, [publishGraph, nodes, edges]);

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
    dragging.current = nodeId;
    nodeGesture.current = {
      nodeId,
      startX: e.clientX,
      startY: e.clientY,
      dragged: false,
    };
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      /* jsdom / SVG <g> may lack pointer capture */
    }
    const pt = toSvg(e.clientX, e.clientY);
    const node = nodeMap[nodeId];
    dragOffset.current = { x: pt.x - node.x, y: pt.y - node.y };
    setSelected(nodeId);
    setSelectedEdgeKey(null);
    // Do NOT focus notes/reader here — wait for pointerup click vs drag (Wave CM3).
  }, [toSvg, nodeMap, connectFrom, nodes, edges, publishGraph, pushHistory]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragging.current) {
      const gesture = nodeGesture.current;
      const dist = Math.hypot(e.clientX - gesture.startX, e.clientY - gesture.startY);
      if (dist > NODE_CLICK_SLOP_PX) gesture.dragged = true;
      if (!gesture.dragged) return;
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
    const gesture = nodeGesture.current;
    const nodeId = dragging.current ?? gesture.nodeId;
    if (nodeId) {
      if (gesture.dragged) {
        setNodes((prev) => {
          publishGraph(prev, edges);
          return prev;
        });
      } else {
        // Single tap → focus study (notes highlight). Reader stays on explicit CTA.
        const node = nodeMap[nodeId];
        if (node) {
          const linkCount = edges.filter((e) => e.from === nodeId || e.to === nodeId).length;
          const base = t('conceptMapNodeFocused').replace('{label}', node.label);
          setLiveAnnouncement(
            linkCount > 0
              ? `${base}. ${t('conceptMapNodeLinks').replace('{count}', String(linkCount))}`
              : base,
          );
          onConceptSelect?.(node.label);
        }
      }
    }
    dragging.current = null;
    nodeGesture.current = { nodeId: null, startX: 0, startY: 0, dragged: false };
    setIsPanning(false);
  }, [edges, nodeMap, onConceptSelect, publishGraph, t]);

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
    const linkCount = edges.filter((e) => e.from === nodeId || e.to === nodeId).length;
    const base = t('conceptMapNodeFocused').replace('{label}', node.label);
    setLiveAnnouncement(
      linkCount > 0
        ? `${base}. ${t('conceptMapNodeLinks').replace('{count}', String(linkCount))}`
        : base,
    );
    onConceptSelect?.(node.label);
  }, [edges, nodeMap, onConceptSelect, t]);

  const handleTreeKeyDown = useCallback((e: KeyboardEvent<HTMLButtonElement>, nodeId: string) => {
    const idx = visibleNodes.findIndex((n) => n.id === nodeId);
    if (idx < 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = visibleNodes[idx + 1];
      if (next) focusNodeById(next.id);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = visibleNodes[idx - 1];
      if (prev) focusNodeById(prev.id);
      return;
    }
    if (e.key === 'Home') {
      e.preventDefault();
      focusNodeById(visibleNodes[0]!.id);
      return;
    }
    if (e.key === 'End') {
      e.preventDefault();
      focusNodeById(visibleNodes[visibleNodes.length - 1]!.id);
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      focusNodeById(nodeId);
      canvasFocusRef.current?.focus();
    }
  }, [focusNodeById, visibleNodes]);

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
      const next = prev.map((e) => {
        if (edgeKey(e) !== selectedEdgeKey) return e;
        const relation = nextRelation(e.relation);
        return {
          ...e,
          relation,
          pmi: relation === 'related' ? e.pmi : undefined,
        };
      });
      publishGraph(nodes, next);
      return next;
    });
  }, [selectedEdgeKey, nodes, publishGraph, pushHistory]);

  /* Wave CM — work-first empty: start with an idea instead of a cold repo empty */
  if (nodes.length === 0) {
    return (
      <div
        className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto"
        data-testid="concept-map-empty-composer"
      >
        <div className="mx-auto flex w-full max-w-lg flex-col gap-3 px-4 pb-8 pt-3 sm:px-5 sm:pt-4">
          <div className="space-y-1 text-left">
            <h3 className="text-base font-semibold leading-snug text-text-primary sm:text-lg">
              {t('conceptMapEmptyTitle')}
            </h3>
            <p className="type-caption leading-relaxed text-text-secondary">
              {emptyMessage
                ?? (focusConcept
                  ? t('conceptMapEmptyHint').replace('{topic}', focusConcept)
                  : t('conceptMapEmptyHintGeneric'))}
            </p>
          </div>
          <div className="space-y-2 rounded-xl border border-border-subtle bg-surface-secondary/40 p-3">
            <PrimaryCTA
              type="button"
              size="md"
              onClick={addNode}
              data-testid="concept-map-empty-start"
              className="ws-touch-floor w-full min-h-11 rounded-lg"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              {t('conceptMapAddNode')}
            </PrimaryCTA>
          </div>
          {(emptyActions.length > 0 || (!hasSource && onUpload)) && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {!hasSource && onUpload && (
                <SecondaryCTA size="sm" onClick={onUpload} data-testid="workspace-empty-upload">
                  {t('uploadMaterial')}
                </SecondaryCTA>
              )}
              {emptyActions.map((action) => (
                <SecondaryCTA
                  key={`${action.id}-${action.label}`}
                  size="sm"
                  onClick={action.onClick}
                  data-testid={`workspace-empty-${action.id}`}
                >
                  {action.label}
                </SecondaryCTA>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex h-full min-h-0 flex-col overflow-hidden bg-surface-card"
      data-testid="concept-map-root"
      data-bleed="full"
    >
      {/* Wave CM — primary: find + add/link; tidy/zoom/export in ⋯; zoom HUD on canvas */}
      <div
        className="flex flex-wrap items-center gap-1.5 px-3 py-1.5 border-b border-border-subtle bg-surface-secondary/40 shrink-0"
        data-testid="concept-map-toolbar"
      >
        <div className="relative flex min-w-[8rem] max-w-[14rem] flex-1 items-center">
          <label className="sr-only" htmlFor="concept-map-filter-input">
            {t('conceptMapFilterPlaceholder')}
          </label>
          <input
            id="concept-map-filter-input"
            type="search"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder={t('conceptMapFilterPlaceholder')}
            className="w-full min-h-9 rounded-lg border border-border-subtle bg-surface-card px-2.5 py-1.5 type-caption text-text-primary placeholder:text-text-muted focus:border-border-default focus:outline-none"
            data-testid="concept-map-filter"
          />
          {filterQuery && (
            <button
              type="button"
              onClick={() => setFilterQuery('')}
              className="absolute right-1.5 flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:text-text-secondary"
              aria-label={t('close')}
              data-testid="concept-map-filter-clear"
            >
              <X className="h-3 w-3" aria-hidden />
            </button>
          )}
        </div>
        {filterQuery ? (
          <span
            className="type-caption shrink-0 select-none tabular-nums text-text-muted"
            data-testid="concept-map-filter-count"
          >
            {visibleNodes.length}/{nodes.length}
          </span>
        ) : null}
        <div className="ml-auto flex flex-wrap items-center gap-1">
          <button
            type="button"
            data-testid="concept-map-add-node"
            onClick={addNode}
            className="ws-touch-floor inline-flex min-h-9 min-w-9 items-center justify-center gap-1 rounded-lg border border-border-subtle bg-surface-secondary px-2 type-caption font-medium text-text-secondary hover:border-border-default hover:text-text-primary sm:min-w-0 sm:px-2.5"
            aria-label={t('conceptMapAddNode')}
            title={t('conceptMapAddNode')}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">{t('conceptMapAddNode')}</span>
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
              'ws-touch-floor inline-flex min-h-9 min-w-9 items-center justify-center gap-1 rounded-lg border px-2 type-caption font-medium sm:min-w-0 sm:px-2.5',
              connectFrom
                ? 'border-brand-500/40 bg-brand-500/10 text-text-primary'
                : 'border-border-subtle text-text-secondary hover:border-border-default hover:text-text-primary disabled:opacity-40',
            )}
            aria-label={t('conceptMapConnect')}
            title={t('conceptMapConnectHint')}
          >
            <Link2 className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">{t('conceptMapConnect')}</span>
          </button>
          <PanelOverflowMenu
            ariaLabel={t('wsMore')}
            triggerTestId="concept-map-more-menu"
            summaryClassName="ws-touch-floor inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-border-subtle text-text-secondary hover:bg-surface-hover"
          >
            <button
              type="button"
              data-testid="concept-map-undo"
              disabled={!canUndo}
              onClick={undo}
              className="block w-full px-3 py-2 text-left type-caption font-medium text-text-secondary hover:bg-surface-hover disabled:opacity-40"
            >
              {t('conceptMapUndo')}
            </button>
            <button
              type="button"
              data-testid="concept-map-redo"
              disabled={!canRedo}
              onClick={redo}
              className="block w-full px-3 py-2 text-left type-caption font-medium text-text-secondary hover:bg-surface-hover disabled:opacity-40"
            >
              {t('conceptMapRedo')}
            </button>
            <button
              type="button"
              data-testid="concept-map-force-layout"
              disabled={layoutRunning || nodes.length < 2}
              onClick={runForceLayout}
              className="block w-full px-3 py-2 text-left type-caption font-medium text-text-secondary hover:bg-surface-hover disabled:opacity-40"
            >
              {layoutRunning ? '…' : t('conceptMapForce')}
            </button>
            <button
              type="button"
              data-testid="concept-map-hierarchy-layout"
              disabled={layoutRunning || nodes.length < 2}
              onClick={runHierarchyLayout}
              className="block w-full px-3 py-2 text-left type-caption font-medium text-text-secondary hover:bg-surface-hover disabled:opacity-40"
            >
              {layoutRunning && hierarchyMode ? '…' : t('conceptMapHierarchy')}
            </button>
            <button
              type="button"
              data-testid="concept-map-zoom-in"
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
              className="block w-full px-3 py-2 text-left type-caption font-medium text-text-secondary hover:bg-surface-hover"
            >
              {t('conceptMapZoomIn')}
            </button>
            <button
              type="button"
              data-testid="concept-map-zoom-out"
              onClick={() => setZoom((z) => Math.max(0.3, z - 0.2))}
              className="block w-full px-3 py-2 text-left type-caption font-medium text-text-secondary hover:bg-surface-hover"
            >
              {t('conceptMapZoomOut')}
            </button>
            <button
              type="button"
              data-testid="concept-map-reset-view"
              onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
              className="block w-full px-3 py-2 text-left type-caption font-medium text-text-secondary hover:bg-surface-hover"
            >
              {t('conceptMapResetView')}
            </button>
            <button
              type="button"
              data-testid="concept-map-export-png"
              disabled={exporting || nodes.length === 0}
              onClick={() => {
                void (async () => {
                  if (!svgRef.current) return;
                  setExporting(true);
                  try {
                    await exportConceptMapPng(svgRef.current, nodes, edges, 'concept-map');
                  } finally {
                    setExporting(false);
                  }
                })();
              }}
              className="block w-full px-3 py-2 text-left type-caption font-medium text-text-secondary hover:bg-surface-hover disabled:opacity-40"
            >
              {exporting ? '…' : 'PNG'}
            </button>
            <p className="border-t border-border-subtle px-3 py-2 type-caption leading-snug text-text-muted">
              {t('conceptMapLayoutHint')}
            </p>
          </PanelOverflowMenu>
          {crdt && (
            <span
              className={cn(
                'rounded-lg border px-2 py-1 type-caption font-medium',
                crdt.synced
                  ? 'border-accent-emerald/35 bg-accent-emerald/10 text-text-secondary'
                  : 'border-border-subtle bg-surface-hover text-text-secondary',
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
          className="shrink-0 border-b border-accent-amber/25 bg-accent-amber/10 px-4 py-1.5 type-caption text-accent-amber"
          data-testid="concept-map-large-graph-banner"
        >
          {conceptMapLargeGraphMessage(nodes.length, lang)}
        </div>
      )}

      {layerGroups.length > 1 && (
        <CollapsibleChromeSection
          title={t('conceptMapLayersLabel')}
          alwaysCollapse
          data-testid="concept-map-layers-chrome"
        >
          <div className="flex flex-wrap items-center gap-1.5 px-3 py-2" data-testid="concept-map-layers">
            <InfoHint
              triggerAriaLabel={t('conceptMapLayersHelpAria')}
              label={t('conceptMapLayersHint')}
            />
            <button
              type="button"
              onClick={() => setActiveLayerDepth(null)}
              className={cn(
                'min-h-9 rounded-lg px-2.5 py-1 type-caption font-medium border',
                activeLayerDepth === null
                  ? 'border-brand-500/40 bg-surface-secondary text-text-secondary'
                  : 'border-border-subtle text-text-muted',
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
                  'min-h-9 rounded-lg px-2.5 py-1 type-caption font-medium border',
                  activeLayerDepth === g.depth ? 'border-brand-500/40 text-text-secondary' : 'border-border-subtle text-text-muted',
                )}
                style={{ borderColor: activeLayerDepth === g.depth ? layerColor(g.depth) : undefined }}
              >
                {g.label} ({g.nodeIds.length})
              </button>
            ))}
          </div>
        </CollapsibleChromeSection>
      )}

      {connectFrom && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border-subtle bg-surface-secondary/60 px-3 py-1.5" data-testid="concept-map-connect-hint">
          <span className="type-caption text-text-secondary">{t('conceptMapConnectHint')}</span>
          <button
            type="button"
            onClick={() => setConnectFrom(null)}
            className="inline-flex items-center gap-1 type-caption font-medium text-text-secondary hover:text-text-primary shrink-0"
            aria-label={t('cancel')}
          >
            <X className="w-3 h-3" aria-hidden />
            {t('cancel')}
          </button>
        </div>
      )}

      {/* Screen-reader node tree (keyboard-navigable, aria levels from hierarchy) */}
      <ul
        role="tree"
        aria-label={t('conceptMapNodeTree')}
        data-testid="concept-map-node-tree"
        className="sr-only"
      >
        {visibleNodes.map((node, index) => {
          const level = (layerMap.get(node.id) ?? 0) + 1;
          return (
            <li key={node.id} role="none">
              <button
                type="button"
                id={`concept-map-node-${node.id}`}
                role="treeitem"
                aria-level={level}
                aria-posinset={index + 1}
                aria-setsize={visibleNodes.length}
                aria-selected={selected === node.id}
                tabIndex={selected === node.id || (!selected && visibleNodes[0]?.id === node.id) ? 0 : -1}
                onClick={() => {
                  focusNodeById(node.id);
                  canvasFocusRef.current?.focus();
                }}
                onKeyDown={(e) => handleTreeKeyDown(e, node.id)}
              >
                {node.label} ({node.mastery}%)
              </button>
            </li>
          );
        })}
      </ul>

      <div className="relative min-h-0 flex-1">
      <div
        ref={canvasFocusRef}
        className="h-full overflow-hidden cursor-grab active:cursor-grabbing outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50"
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
          <defs>
            <pattern id="cm-dot-grid" width="24" height="24" patternUnits="userSpaceOnUse" x={(pan.x % 24 + 24) % 24} y={(pan.y % 24 + 24) % 24}>
              <circle cx="12" cy="12" r="0.75" fill="var(--color-border-subtle)" opacity="0.45" />
            </pattern>
            <marker id="dm-arrow" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="var(--color-border-strong)" />
            </marker>
            <filter id="cm-node-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="1.5" stdDeviation="2.5" floodOpacity="0.14" />
            </filter>
          </defs>
          <rect width="100%" height="100%" fill="url(#cm-dot-grid)" />
          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>

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
                    stroke={isEdgeSel ? accentHighlightVar() : lit ? accentHighlightVar() : 'var(--color-border-strong, var(--color-text-muted))'}
                    strokeWidth={isEdgeSel ? 3 : lit ? 2.5 : 1.75}
                    strokeDasharray={dash} markerEnd="url(#dm-arrow)"
                    pointerEvents="none"
                    opacity={isEdgeSel || lit ? 1 : 0.85}
                  />
                  <text
                    x={midX}
                    y={midY - 4}
                    textAnchor="middle"
                    fontSize={11}
                    fill={isEdgeSel || lit ? accentHighlightVar() : 'var(--color-text-secondary)'}
                    data-testid="concept-map-edge-label"
                    data-pmi={edge.pmi != null ? formatPmiScore(edge.pmi) : undefined}
                    pointerEvents="none"
                  >
                    {formatConceptMapEdgeGlyph(edge.relation, edge.pmi)}
                  </text>
                </g>
              );
            })}

            {/* Nodes — Wave CM3: rounded idea chips; mastery bar + caption; tap≠drag */}
            {visibleNodes.map(node => {
              const color = hierarchyMode ? layerColor(layerMap.get(node.id) ?? 0) : MASTERY_COLOR(node.mastery);
              const isSel = selected === node.id;
              const lensHit = conceptLens ? lensHighlightsMapNode(node.label, conceptLens) : false;
              const labelLines = wrapConceptMapLabel(node.label, 14);
              const { w, h } = nodeChipSize(labelLines);
              const x0 = node.x - w / 2;
              const y0 = node.y - h / 2;
              const barW = node.mastery > 0 ? Math.max(6, (w - 16) * (node.mastery / 100)) : 0;
              return (
                <g
                  key={node.id}
                  opacity={nodeMasteryOpacity(node.mastery)}
                  onPointerDown={e => handlePointerDown(e, node.id)}
                  className="cursor-grab active:cursor-grabbing"
                  aria-hidden
                  data-testid="concept-map-node"
                  data-mastery={node.mastery}
                >
                  <title>{node.label}</title>
                  {lensHit && !isSel && (
                    <rect
                      x={x0 - 5}
                      y={y0 - 5}
                      width={w + 10}
                      height={h + 10}
                      rx={18}
                      fill="none"
                      stroke="var(--palette-cyan)"
                      strokeWidth={1.5}
                      opacity={0.45}
                      data-testid="concept-map-lens-highlight"
                    />
                  )}
                  {isSel && (
                    <rect
                      x={x0 - 4}
                      y={y0 - 4}
                      width={w + 8}
                      height={h + 8}
                      rx={18}
                      fill="none"
                      stroke={color}
                      strokeWidth={2}
                      opacity={0.4}
                    />
                  )}
                  <rect
                    x={x0}
                    y={y0}
                    width={w}
                    height={h}
                    rx={16}
                    fill={`color-mix(in srgb, ${color} 18%, var(--color-surface-card))`}
                    stroke={color}
                    strokeWidth={isSel ? 2.5 : 1.75}
                    filter="url(#cm-node-shadow)"
                    data-testid="concept-map-node-chip"
                  />
                  {/* Mastery progress along the chip floor */}
                  {node.mastery > 0 && (
                    <>
                      <rect
                        x={x0 + 8}
                        y={y0 + h - 8}
                        width={w - 16}
                        height={3}
                        rx={1.5}
                        fill={color}
                        opacity={0.18}
                      />
                      <rect
                        x={x0 + 8}
                        y={y0 + h - 8}
                        width={barW}
                        height={3}
                        rx={1.5}
                        fill={color}
                        opacity={0.9}
                      />
                    </>
                  )}
                  <text
                    x={node.x}
                    y={node.y - (labelLines.length > 1 ? 8 : 2)}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="var(--color-text-primary)"
                    fontWeight={isSel ? 600 : 500}
                    fontSize={12}
                    data-testid="concept-map-node-inner-label"
                  >
                    {labelLines.map((line, i) => (
                      <tspan key={`${node.id}-l${i}`} x={node.x} dy={i === 0 ? 0 : 14}>
                        {line}
                      </tspan>
                    ))}
                  </text>
                  {node.mastery > 0 && (
                    <g data-testid="concept-map-node-mastery-pill">
                      <rect
                        x={node.x - 28}
                        y={y0 + h + 6}
                        width={56}
                        height={16}
                        rx={8}
                        fill={`color-mix(in srgb, ${color} 14%, var(--color-surface-secondary))`}
                        stroke={`color-mix(in srgb, ${color} 35%, var(--color-border-subtle))`}
                        strokeWidth={1}
                      />
                      <text
                        x={node.x}
                        y={y0 + h + 14}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={10}
                        fill="var(--color-text-secondary)"
                        fontWeight={500}
                        data-testid="concept-map-node-mastery"
                      >
                        {masteryCaption(node.mastery, t)}
                      </text>
                    </g>
                  )}
                  {node.note && (
                    <circle cx={x0 + w - 6} cy={y0 + 6} r={5} fill="var(--palette-amber)" />
                  )}
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
      {/* Wave CM — zoom lives on the canvas (Miro-style), not competing in the toolbar */}
      <div
        className="pointer-events-auto absolute bottom-3 right-3 z-10 flex items-center overflow-hidden rounded-lg border border-border-subtle bg-surface-card/95 shadow-sm"
        data-testid="concept-map-zoom-hud"
        role="group"
        aria-label={t('conceptMapZoomGroup')}
      >
        <button
          type="button"
          data-testid="concept-map-zoom-out-hud"
          onClick={() => setZoom((z) => Math.max(0.3, z - 0.2))}
          className="ws-touch-floor inline-flex min-h-9 w-8 items-center justify-center text-text-secondary hover:bg-surface-hover hover:text-text-primary"
          aria-label={t('conceptMapZoomOut')}
        >
          <span className="text-base font-medium leading-none select-none" aria-hidden>−</span>
        </button>
        <span className="flex h-9 min-w-[2.5rem] items-center justify-center border-x border-border-subtle type-caption tabular-nums text-text-muted select-none">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          data-testid="concept-map-zoom-in-hud"
          onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
          className="ws-touch-floor inline-flex min-h-9 w-8 items-center justify-center text-text-secondary hover:bg-surface-hover hover:text-text-primary"
          aria-label={t('conceptMapZoomIn')}
        >
          <span className="text-base font-medium leading-none select-none" aria-hidden>+</span>
        </button>
        <button
          type="button"
          data-testid="concept-map-fit-view"
          onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
          className="ws-touch-floor inline-flex min-h-9 w-9 items-center justify-center border-l border-border-subtle text-text-secondary hover:bg-surface-hover hover:text-text-primary"
          aria-label={t('conceptMapResetView')}
          title={t('conceptMapResetView')}
        >
          <span className="text-base leading-none select-none" aria-hidden>⤢</span>
        </button>
      </div>
      </div>

      {selectedEdge && !editingNote && !editingLabel && (
        <div className="absolute bottom-0 left-0 right-0 glass-strong border-t border-border-subtle" data-testid="concept-map-edge-panel">
          <div className="flex items-center gap-3 p-3 pb-2">
            <div className="flex-1 min-w-0">
              <p className="type-meta font-semibold truncate">
                {nodeMap[selectedEdge.from]?.label} → {nodeMap[selectedEdge.to]?.label}
              </p>
              <p className="type-caption text-text-muted">
                {relationLabel(selectedEdge.relation)}
                {formatConceptMapPmiPanel(selectedEdge.pmi)
                  ? ` · ${formatConceptMapPmiPanel(selectedEdge.pmi)}`
                  : ''}
              </p>
            </div>
            <button
              type="button"
              data-testid="concept-map-cycle-relation"
              onClick={cycleSelectedEdgeRelation}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg type-caption font-medium border border-border-subtle text-text-secondary hover:text-text-primary"
            >
              {t('conceptMapChangeRelation')}
            </button>
            <button
              type="button"
              data-testid="concept-map-delete-edge"
              onClick={deleteSelectedEdge}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg type-caption font-medium border border-accent-rose/30 bg-accent-rose/10 text-accent-rose hover:bg-accent-rose/15"
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
          <div className="flex items-start gap-2 px-3 pt-3 pb-1.5">
            <ConceptTypeIcon type={selectedNode.type} size="lg" />
            <div className="flex-1 min-w-0">
              <p className="type-meta font-semibold truncate">{selectedNode.label}</p>
              <p className="type-caption text-text-muted">{t('masteryLabel')} {selectedNode.mastery}% • {edges.filter(e => e.to === selectedNode.id).length} {t('prerequisites')}</p>
            </div>
            <button onClick={() => setSelected(null)} className="shrink-0 mt-0.5 p-1 rounded-md text-text-muted hover:text-text-secondary hover:bg-surface-hover" aria-label={t('close')}><X className="w-3.5 h-3.5" /></button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 px-3 pb-3">
            {!onSelectionAction && onFocusTerm && (
              <button
                type="button"
                onClick={() => onFocusTerm(selectedNode.label)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg type-caption font-medium bg-accent-cyan/15 text-text-secondary border border-accent-cyan/30 hover:bg-accent-cyan/25"
              >
                <BookOpen className="w-3 h-3" />
                {t('cognitiveReader')}
              </button>
            )}
            <button onClick={() => startNote(selectedNode.id)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg type-caption font-medium bg-surface-secondary text-text-secondary border border-border-subtle hover:bg-brand-600/30">
              {selectedNode.note ? <><Pencil className="w-3 h-3" /> {t('editNote')}</> : <><FileText className="w-3 h-3" /> {t('addNote')}</>}
            </button>
            <button
              type="button"
              data-testid="concept-map-rename-node"
              onClick={() => { setEditingLabel(selectedNode.id); setLabelDraft(selectedNode.label); }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg type-caption font-medium border border-border-subtle text-text-secondary hover:text-text-primary"
            >
              <Pencil className="w-3 h-3" />
              {t('conceptMapRename')}
            </button>
            <span className="w-px h-4 bg-border-subtle mx-0.5 self-center" aria-hidden />
            <button
              type="button"
              data-testid="concept-map-delete-node"
              onClick={deleteSelectedNode}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg type-caption font-medium border border-accent-rose/30 bg-accent-rose/10 text-accent-rose hover:bg-accent-rose/15"
            >
              <Trash2 className="w-3 h-3" />
              {t('conceptMapDeleteNode')}
            </button>
          </div>
          {selectedNode.note && (
            <p className="mx-3 mb-3 type-caption text-text-secondary bg-surface-hover/50 rounded-lg p-2">{selectedNode.note}</p>
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
          <p className="type-caption font-semibold mb-2">{t('conceptMapRename')}</p>
          <input
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-surface-input border border-border-subtle type-body text-text-primary focus:outline-none focus:border-brand-500/50"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') saveLabel(); if (e.key === 'Escape') setEditingLabel(null); }}
          />
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => setEditingLabel(null)} className="px-3 py-1 type-caption text-text-muted hover:text-text-secondary">{t('cancel')}</button>
            <button onClick={saveLabel} className="px-3 py-1.5 type-caption font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-500">{t('save')}</button>
          </div>
        </div>
      )}

      {/* Note Editor */}
      {editingNote && (
        <div className="absolute bottom-0 left-0 right-0 p-3 glass-strong border-t border-border-subtle">
          <p className="type-caption font-semibold mb-2 inline-flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-text-secondary" />
            {t('noteFor')} "{nodeMap[editingNote]?.label}"
          </p>
          <textarea
            value={noteText} onChange={e => setNoteText(e.target.value)}
            placeholder={t('notePlaceholder')}
            className="w-full px-3 py-2 rounded-lg bg-surface-input border border-border-subtle type-body text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-500/50 resize-none"
            rows={2} autoFocus
          />
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => setEditingNote(null)} className="px-3 py-1 type-caption text-text-muted hover:text-text-secondary">{t('cancel')}</button>
            <button onClick={saveNote} className="px-3 py-1.5 type-caption font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-500">{t('save')}</button>
          </div>
        </div>
      )}

      {/* Wave CM — legend nested so the map stays the hero surface */}
      <details
        className="shrink-0 border-t border-border-subtle bg-surface-secondary/30 px-3"
        data-testid="concept-map-legend"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 py-1.5 type-caption text-text-secondary select-none">
          <span>{t('conceptMapLegendSummary')}</span>
          <span className="flex items-center gap-1.5" aria-hidden>
            {([['strong'], ['proficient'], ['developing'], ['weak']] as const).map(([band]) => (
              <span
                key={band}
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: bandColorVar(band) }}
              />
            ))}
          </span>
        </summary>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pb-2">
          {([['strong', t('strong')], ['proficient', t('proficient')], ['developing', t('developing')], ['weak', t('weakLabel')]] as const).map(([band, l]) => (
            <span key={band} className="inline-flex items-center gap-1 type-caption text-text-secondary">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: bandColorVar(band) }} aria-hidden />
              {l}
            </span>
          ))}
          <span className="type-caption text-text-muted">→ {t('prerequisite')}</span>
          <span className="type-caption text-text-muted">┄ {t('related')}</span>
          <InfoHint
            triggerAriaLabel={t('conceptMapLegendSummary')}
            label={`${t('strong')} · ${t('proficient')} · ${t('developing')} · ${t('weakLabel')}. → ${t('prerequisite')} · ┄ ${t('related')}`}
            data-testid="concept-map-legend-hint"
          />
        </div>
      </details>
    </div>
  );
}
