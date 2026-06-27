import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
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
import { WorkspaceEmptyState } from './WorkspaceEmptyState';
import { WorkspaceSelectionActionBar } from './WorkspaceSelectionActionBar';
import type { WorkspaceSelectionActionId, WorkspaceSelectionContext } from '../../lib/workspaceSelectionActions';
import { ConceptTypeIcon } from '../ui/ConceptTypeIcon';
import { conceptTypeGlyph } from '../../lib/conceptTypeIcons';
import { Map, BookOpen, Pencil, FileText, X } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import {
  connectConceptMapCursors,
  notifyCursorStream,
  type ConceptMapCursor,
} from '../../lib/conceptMapCursorSync';

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

function nodeMasteryOpacity(mastery: number): number {
  if (mastery < 40) return 0.48;
  if (mastery < 55) return 0.72;
  return 1;
}

interface Props {
  initialNodes: DragNode[];
  initialEdges: DragEdge[];
  onNodeUpdate?: (nodes: DragNode[]) => void;
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
  /** Collaborative cursor sync (W8) — requires proxy + course. */
  cursorSync?: { courseId: string; conceptKey: string; baseUrl: string };
}

const MASTERY_COLOR = (m: number) =>
  m >= 80 ? '#34d399' : m >= 60 ? '#fbbf24' : m >= 40 ? '#38bdf8' : m > 0 ? '#fb7185' : '#4d4870';

export function DraggableConceptMap({ initialNodes, initialEdges, onNodeUpdate, emptyMessage, hasSource = false, onUpload, onFocusTerm, onSelectionAction, focusConcept, lensConcept, conceptLens, onConceptSelect, cursorSync }: Props) {
  const { t, lang } = useI18n();
  const [nodes, setNodes] = useState<DragNode[]>(initialNodes);
  const [edges] = useState<DragEdge[]>(initialEdges);
  const [selected, setSelected] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<string | null>(null);
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
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = nodeId;
    const pt = toSvg(e.clientX, e.clientY);
    const node = nodeMap[nodeId];
    dragOffset.current = { x: pt.x - node.x, y: pt.y - node.y };
    setSelected(nodeId);
    if (node) onConceptSelect?.(node.label);
  }, [toSvg, nodeMap, onConceptSelect]);

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
        onNodeUpdate?.(prev);
        return prev;
      });
    }
    setIsPanning(false);
  }, [onNodeUpdate]);

  const handleBgPointerDown = useCallback((e: React.PointerEvent) => {
    if (dragging.current) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
    setSelected(null);
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
    setNodes(prev => prev.map(n => n.id === editingNote ? { ...n, note: noteText } : n));
    setEditingNote(null);
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
      onNodeUpdate?.(merged);
      setLayoutRunning(false);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    };
    if (plan.deferMs > 0) {
      window.setTimeout(apply, plan.deferMs);
    } else {
      apply();
    }
  }, [nodes, edges, focusConcept, lensConcept, onNodeUpdate]);

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
    onNodeUpdate?.(laid);
    setLayoutRunning(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [nodes, edges, onNodeUpdate]);

  useEffect(() => { setNodes(initialNodes); }, [initialNodes]);

  const selectedNode = selected ? nodeMap[selected] : null;

  if (initialNodes.length === 0) {
    return (
      <WorkspaceEmptyState
        message={emptyMessage ?? 'Upload notes to build a concept map from your course topics and glossary.'}
        hasSource={hasSource}
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
            placeholder={lang === 'el' ? 'Αναζήτηση εννοιών…' : 'Filter concepts…'}
            className="ml-2 w-32 rounded border border-border-subtle bg-surface-card px-2 py-0.5 text-[10px] text-text-secondary placeholder:text-text-muted focus:border-accent-cyan/40 focus:outline-none"
            data-testid="concept-map-filter"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setZoom(z => Math.min(2.5, z + 0.2))} className="w-6 h-6 rounded bg-surface-hover text-text-secondary text-xs flex items-center justify-center hover:bg-surface-active">+</button>
          <span className="text-[10px] text-text-muted w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.max(0.3, z - 0.2))} className="w-6 h-6 rounded bg-surface-hover text-text-secondary text-xs flex items-center justify-center hover:bg-surface-active">−</button>
          <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="ml-1 px-2 py-1 rounded text-[10px] text-text-muted hover:text-text-secondary bg-surface-hover">{t('reset')}</button>
          <button
            type="button"
            data-testid="concept-map-hierarchy-layout"
            disabled={layoutRunning || nodes.length < 2}
            onClick={runHierarchyLayout}
            className="ml-1 px-2 py-1 rounded text-[10px] text-accent-emerald hover:text-accent-emerald/80 bg-accent-emerald/10 border border-accent-emerald/30 disabled:opacity-40"
          >
            {layoutRunning && hierarchyMode ? '…' : (lang === 'el' ? 'Ιεραρχία' : 'Layers')}
          </button>
          <button
            type="button"
            data-testid="concept-map-force-layout"
            disabled={layoutRunning || nodes.length < 2}
            onClick={runForceLayout}
            className="ml-1 px-2 py-1 rounded text-[10px] text-accent-cyan hover:text-accent-cyan/80 bg-accent-cyan/10 border border-accent-cyan/30 disabled:opacity-40"
          >
            {layoutRunning ? '…' : (lang === 'el' ? 'Δύναμη' : 'Force')}
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
            className="ml-1 px-2 py-1 rounded text-[10px] text-brand-300 hover:text-brand-200 bg-brand-600/15 border border-brand-500/30 disabled:opacity-40"
          >
            {exporting ? '…' : 'PNG'}
          </button>
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
          <span className="text-[9px] font-semibold text-text-muted">{lang === 'el' ? 'Επίπεδα' : 'Layers'}</span>
          <button
            type="button"
            onClick={() => setActiveLayerDepth(null)}
            className={cn(
              'rounded-full px-2 py-0.5 text-[9px] font-medium border',
              activeLayerDepth === null ? 'border-brand-500/40 bg-brand-600/15 text-brand-300' : 'border-border-subtle text-text-muted',
            )}
          >
            {lang === 'el' ? 'Όλα' : 'All'}
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

      {/* Canvas */}
      <div className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing" onWheel={handleWheel} data-testid="concept-map-canvas">
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
            {edges.map((edge, i) => {
              const from = nodeMap[edge.from];
              const to = nodeMap[edge.to];
              if (!from || !to) return null;
              if (activeLayerDepth !== null) {
                const fromLayer = layerMap.get(edge.from) ?? 0;
                const toLayer = layerMap.get(edge.to) ?? 0;
                if (fromLayer !== activeLayerDepth && toLayer !== activeLayerDepth) return null;
              }
              const lit = selected === edge.from || selected === edge.to;
              const dash = edge.relation === 'contrasts' ? '8,4' : edge.relation === 'related' ? '4,4' : 'none';
              const midX = (from.x + to.x) / 2;
              const midY = (from.y + to.y) / 2;
              return (
                <g key={i}>
                  <line
                    x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                    stroke={lit ? '#818cf8' : '#2a2252'} strokeWidth={lit ? 2.5 : 1.5}
                    strokeDasharray={dash} markerEnd="url(#dm-arrow)"
                  />
                  <text
                    x={midX}
                    y={midY - 4}
                    textAnchor="middle"
                    fontSize={9}
                    fill={lit ? '#a5b4fc' : '#6b6494'}
                    data-testid="concept-map-edge-label"
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
                >
                  {lensHit && !isSel && (
                    <circle cx={node.x} cy={node.y} r={r + 6} fill="none" stroke="#22d3ee" strokeWidth={1.5} opacity={0.45} data-testid="concept-map-lens-highlight" />
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
                  {node.note && <circle cx={node.x + r - 4} cy={node.y - r + 4} r={5} fill="#fbbf24" />}
                </g>
              );
            })}

            {cursorSync && remoteCursors
              .filter((c) => c.clientId !== clientId.current)
              .map((c) => (
                <g key={c.clientId} data-testid="concept-map-remote-cursor">
                  <circle cx={c.x} cy={c.y} r={8} fill="#22d3ee" opacity={0.35} />
                  <circle cx={c.x} cy={c.y} r={4} fill="#22d3ee" />
                  <text x={c.x + 10} y={c.y - 6} fontSize={9} fill="#22d3ee">{c.label.slice(0, 12)}</text>
                </g>
              ))}
          </g>
        </svg>
      </div>

      {selectedNode && !editingNote && (
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
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 hover:bg-accent-cyan/25"
              >
                <BookOpen className="w-3 h-3" />
                {t('cognitiveReader')}
              </button>
            )}
            <button onClick={() => startNote(selectedNode.id)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-brand-600/20 text-brand-600 border border-brand-500/30 hover:bg-brand-600/30">
              {selectedNode.note ? <><Pencil className="w-3 h-3" /> {t('editNote')}</> : <><FileText className="w-3 h-3" /> {t('addNote')}</>}
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
        {[{ c: '#34d399', l: t('strong') }, { c: '#fbbf24', l: t('proficient') }, { c: '#38bdf8', l: t('developing') }, { c: '#fb7185', l: t('weakLabel') }].map(b => (
          <span key={b.l} className="flex items-center gap-1 text-[9px] text-text-muted">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.c }} />{b.l}
          </span>
        ))}
        <span className="text-[9px] text-text-muted ml-2">→ {t('prerequisite')}</span>
        <span className="text-[9px] text-text-muted">┄ {t('related')}</span>
      </div>
    </div>
  );
}
