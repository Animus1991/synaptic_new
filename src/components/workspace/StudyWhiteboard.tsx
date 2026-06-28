import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight, Circle, Eraser, Eye, EyeOff, Highlighter, Layers, Lock, Minus, Pen,
  Plus, Redo2, Ruler, Save, Square, Trash2, Type, Undo2, BookOpen, Calculator, X, Unlock, Download,
} from '@/lib/lucide-shim';
import { downloadWhiteboardPng } from '../../lib/whiteboardExport';
import { cn } from '../../utils/cn';
import type { ExtractedFormula } from '../../lib/noteContentExtractors';
import type { ScratchpadExport } from '../../lib/workspaceScratchpadBridge';
import { loadWhiteboardStrokes, saveWhiteboardStrokes } from '../../lib/workspacePersistence';
import {
  isLayerLocked,
  migrateWhiteboardPayload,
  visibleStrokes,
  type LayeredStroke,
  type WhiteboardDocument,
} from '../../lib/whiteboardLayers';
import { FormulaLatexPreview } from './FormulaLatexPreview';
import { buildLatexStampLibrary, stampToInsertText, type LatexStamp } from '../../lib/whiteboardLatexStamps';
import { layoutCoachNodePositions } from '../../lib/whiteboardDiagramCoach';
import { useI18n } from '../../lib/i18n';

type Tool = 'pen' | 'marker' | 'highlighter' | 'eraser' | 'line' | 'rect' | 'ellipse' | 'arrow' | 'ruler' | 'text';
type Point = { x: number; y: number };

const COLORS = ['#f8fafc', '#67e8f9', '#a78bfa', '#6ee7b7', '#fbbf24', '#f87171', '#fb7185', '#1e293b'];
const LEGACY_STORAGE_KEY = 'synapse.whiteboard.v1';

function dist(a: Point, b: Point) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function emptyDoc(lang: 'en' | 'el'): WhiteboardDocument {
  return migrateWhiteboardPayload([], lang);
}

const TOOL_DEFS: { id: Tool; icon: typeof Pen; label: string }[] = [
  { id: 'pen', icon: Pen, label: 'Pen' },
  { id: 'marker', icon: Highlighter, label: 'Marker' },
  { id: 'highlighter', icon: Highlighter, label: 'Highlight' },
  { id: 'eraser', icon: Eraser, label: 'Eraser' },
  { id: 'line', icon: Minus, label: 'Line' },
  { id: 'rect', icon: Square, label: 'Rect' },
  { id: 'ellipse', icon: Circle, label: 'Ellipse' },
  { id: 'arrow', icon: ArrowRight, label: 'Arrow' },
  { id: 'ruler', icon: Ruler, label: 'Ruler' },
  { id: 'text', icon: Type, label: 'Text' },
];

export function StudyWhiteboard({
  referenceFormulas = [],
  referenceExcerpt,
  scopeKey,
  scratchpadImport,
  onDismissScratchpadImport,
  onEngage,
  lang = 'en',
  labelInsertKey = 0,
  labelInsertPayload = [],
}: {
  referenceFormulas?: ExtractedFormula[];
  referenceExcerpt?: string;
  scopeKey?: string;
  scratchpadImport?: ScratchpadExport | null;
  onDismissScratchpadImport?: () => void;
  onEngage?: () => void;
  lang?: 'en' | 'el';
  labelInsertKey?: number;
  labelInsertPayload?: string[];
}) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState(COLORS[1]!);
  const [width, setWidth] = useState(3);
  const [doc, setDoc] = useState<WhiteboardDocument>(() => emptyDoc(lang));
  const [redoStack, setRedoStack] = useState<LayeredStroke[]>([]);
  const [draft, setDraft] = useState<LayeredStroke | null>(null);
  const [savedMsg, setSavedMsg] = useState(false);
  const [showLayers, setShowLayers] = useState(true);
  const [showStamps, setShowStamps] = useState(false);
  const drawing = useRef(false);

  const stampLibrary = useMemo(
    () => buildLatexStampLibrary(referenceFormulas, lang),
    [referenceFormulas, lang],
  );

  const activeLayerLocked = isLayerLocked(doc, doc.activeLayerId);

  const redraw = useCallback((list: LayeredStroke[], current?: LayeredStroke | null) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth;
    const h = Math.max(420, container.clientHeight - 8);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--viz-canvas-bg').trim() || '#0f172a';
    ctx.fillRect(0, 0, w, h);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const drawStroke = (s: LayeredStroke) => {
      if (s.points.length === 0) return;
      const strokeTool = s.tool as Tool;
      if (strokeTool === 'text' && s.text) {
        ctx.fillStyle = s.color;
        ctx.font = `${Math.max(14, s.width * 5)}px system-ui, sans-serif`;
        ctx.fillText(s.text, s.points[0]?.x, s.points[0]?.y);
        return;
      }
      if (strokeTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
      } else if (strokeTool === 'highlighter') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = s.color;
        ctx.globalAlpha = 0.35;
      } else if (strokeTool === 'marker') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = s.color;
        ctx.globalAlpha = 0.75;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = s.color;
        ctx.globalAlpha = 1;
      }
      ctx.lineWidth = s.width;

      const p0 = s.points[0]!;
      const p1 = s.points[s.points.length - 1]!;

      if (['line', 'ruler', 'arrow', 'rect', 'ellipse'].includes(strokeTool) && s.points.length >= 2) {
        ctx.beginPath();
        if (strokeTool === 'rect') {
          ctx.strokeRect(p0.x, p0.y, p1.x - p0.x, p1.y - p0.y);
        } else if (strokeTool === 'ellipse') {
          const rx = Math.abs(p1.x - p0.x) / 2;
          const ry = Math.abs(p1.y - p0.y) / 2;
          ctx.ellipse((p0.x + p1.x) / 2, (p0.y + p1.y) / 2, rx, ry, 0, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();
          if (strokeTool === 'arrow') {
            const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x);
            const head = 10 + s.width;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p1.x - head * Math.cos(angle - 0.4), p1.y - head * Math.sin(angle - 0.4));
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p1.x - head * Math.cos(angle + 0.4), p1.y - head * Math.sin(angle + 0.4));
            ctx.stroke();
          }
          if (strokeTool === 'ruler') {
            ctx.fillStyle = s.color;
            ctx.globalAlpha = 1;
            ctx.font = '11px system-ui';
            ctx.fillText(`${Math.round(dist(p0, p1))} px`, (p0.x + p1.x) / 2 + 6, (p0.y + p1.y) / 2 - 6);
          }
        }
      } else {
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i]?.x, s.points[i]?.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    };

    for (const s of list) drawStroke(s);
    if (current) drawStroke(current);
  }, []);

  useEffect(() => {
    try {
      const scope = scopeKey ?? '__global';
      const persisted = loadWhiteboardStrokes<unknown>(scope);
      if (persisted) {
        setDoc(migrateWhiteboardPayload(persisted, lang));
        return;
      }
      if (scope === '__global') {
        const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacy) {
          const parsed = JSON.parse(legacy) as LayeredStroke[];
          const migrated = migrateWhiteboardPayload(parsed, lang);
          setDoc(migrated);
          saveWhiteboardStrokes(scope, migrated);
          localStorage.removeItem(LEGACY_STORAGE_KEY);
        }
      }
    } catch { /* ignore */ }
  }, [scopeKey, lang]);

  const visible = visibleStrokes(doc);
  useEffect(() => { redraw(visible, draft); }, [visible, draft, redraw]);

  useEffect(() => {
    const ro = new ResizeObserver(() => redraw(visible, draft));
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [visible, draft, redraw]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = canvasRef.current?.getBoundingClientRect();
    return { x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) };
  };

  const effectiveWidth = tool === 'marker' ? width * 2.5 : tool === 'highlighter' ? width * 4 : tool === 'eraser' ? width * 3 : width;

  const appendStroke = (stroke: LayeredStroke) => {
    setDoc((d) => ({ ...d, strokes: [...d.strokes, stroke] }));
    setRedoStack([]);
    onEngage?.();
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeLayerLocked) return;
    if (tool === 'text') {
      const p = pos(e);
      const text = window.prompt(t('wbEnterText'));
      if (text?.trim()) {
        appendStroke({
          layerId: doc.activeLayerId,
          tool,
          color,
          width,
          points: [p],
          text: text.trim(),
        });
      }
      return;
    }
    drawing.current = true;
    setDraft({
      layerId: doc.activeLayerId,
      tool,
      color,
      width: effectiveWidth,
      points: [pos(e)],
    });
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
  };

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !draft || activeLayerLocked) return;
    const p = pos(e);
    if (['line', 'ruler', 'arrow', 'rect', 'ellipse'].includes(tool)) {
      setDraft({ ...draft, points: [draft.points[0]!, p] });
    } else {
      setDraft({ ...draft, points: [...draft.points, p] });
    }
  };

  const onUp = () => {
    if (!drawing.current || !draft) return;
    drawing.current = false;
    appendStroke(draft);
    setDraft(null);
  };

  const undo = () => {
    setDoc((d) => {
      if (d.strokes.length === 0) return d;
      const last = d.strokes[d.strokes.length - 1]!;
      setRedoStack((r) => [...r, last]);
      return { ...d, strokes: d.strokes.slice(0, -1) };
    });
  };

  const redo = () => {
    setRedoStack((r) => {
      if (r.length === 0) return r;
      const last = r[r.length - 1]!;
      setDoc((d) => ({ ...d, strokes: [...d.strokes, last] }));
      return r.slice(0, -1);
    });
  };

  const clearActiveLayer = () => {
    setDoc((d) => ({
      ...d,
      strokes: d.strokes.filter((s) => s.layerId !== d.activeLayerId),
    }));
    setRedoStack([]);
    setDraft(null);
  };

  const save = () => {
    try {
      saveWhiteboardStrokes(scopeKey ?? '__global', doc);
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2000);
    } catch { /* ignore */ }
  };

  const insertCoachLabels = useCallback((labels: string[]) => {
    const trimmed = labels.map((l) => l.trim()).filter(Boolean).slice(0, 8);
    if (trimmed.length === 0) return;
    const positions = layoutCoachNodePositions(trimmed.length);
    const strokesToAdd: LayeredStroke[] = trimmed.map((text, i) => ({
      layerId: doc.activeLayerId,
      tool: 'text',
      color: COLORS[1]!,
      width: 2,
      points: [positions[i] ?? { x: 56, y: 72 + i * 48 }],
      text: text.slice(0, 80),
    }));
    setDoc((d) => ({ ...d, strokes: [...d.strokes, ...strokesToAdd] }));
    setRedoStack([]);
    onEngage?.();
  }, [doc.activeLayerId, onEngage]);

  useEffect(() => {
    if (labelInsertKey === 0 || labelInsertPayload.length === 0) return;
    insertCoachLabels(labelInsertPayload);
  }, [labelInsertKey, labelInsertPayload, insertCoachLabels]);

  const insertFormulaLabel = (label: string, formula: string, extraLines?: string[]) => {
    const x = 40 + Math.random() * 80;
    let y = 40 + Math.random() * 60;
    const strokesToAdd: LayeredStroke[] = [{
      layerId: doc.activeLayerId,
      tool: 'text',
      color,
      width: 2,
      points: [{ x, y }],
      text: `${label}: ${formula}`,
    }];
    if (extraLines?.length) {
      for (const line of extraLines.slice(0, 6)) {
        y += 22;
        strokesToAdd.push({
          layerId: doc.activeLayerId,
          tool: 'text',
          color: COLORS[2]!,
          width: 1,
          points: [{ x, y }],
          text: line.slice(0, 120),
        });
      }
    }
    setDoc((d) => ({ ...d, strokes: [...d.strokes, ...strokesToAdd] }));
    setRedoStack([]);
    onEngage?.();
  };

  const insertScratchpadImport = () => {
    if (!scratchpadImport) return;
    insertFormulaLabel(scratchpadImport.name, scratchpadImport.formula, scratchpadImport.steps);
    onDismissScratchpadImport?.();
  };

  const insertLatexStamp = (stamp: LatexStamp) => {
    const x = 48 + Math.random() * 100;
    const y = 48 + Math.random() * 80;
    setDoc((d) => ({
      ...d,
      strokes: [...d.strokes, {
        layerId: d.activeLayerId,
        tool: 'text',
        color: COLORS[2]!,
        width: 2,
        points: [{ x, y }],
        text: stampToInsertText(stamp),
      }],
    }));
    setRedoStack([]);
    onEngage?.();
  };

  const addLayer = () => {
    const id = `layer-${Date.now()}`;
    setDoc((d) => ({
      ...d,
      layers: [
        ...d.layers,
        {
          id,
          name: t('wbLayerN').replace('{n}', String(d.layers.length + 1)),
          visible: true,
          locked: false,
        },
      ],
      activeLayerId: id,
    }));
  };

  const toggleLayerVisibility = (layerId: string) => {
    setDoc((d) => ({
      ...d,
      layers: d.layers.map((l) => (l.id === layerId ? { ...l, visible: !l.visible } : l)),
    }));
  };

  const toggleLayerLock = (layerId: string) => {
    setDoc((d) => ({
      ...d,
      layers: d.layers.map((l) => (l.id === layerId ? { ...l, locked: !l.locked } : l)),
    }));
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden lg:flex-row min-w-0">
      {(referenceFormulas.length > 0 || referenceExcerpt || scratchpadImport) && (
        <aside className="shrink-0 border-b lg:border-b-0 lg:border-r border-border-subtle lg:w-64 overflow-y-auto p-3 space-y-3">
          {scratchpadImport && (
            <div className="p-3 rounded-xl border border-accent-cyan/30 bg-accent-cyan/5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-800">
                  <Calculator className="w-3.5 h-3.5" />
                  {t('wbFromScratchpad')}
                </div>
                <button type="button" onClick={onDismissScratchpadImport} className="text-text-muted hover:text-text-secondary">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[10px] font-medium text-brand-800">{scratchpadImport.name}</p>
              <div className="rounded-lg bg-surface-primary/60 p-2 overflow-x-auto">
                <FormulaLatexPreview formula={scratchpadImport.formula} />
              </div>
              {scratchpadImport.variables && scratchpadImport.variables.length > 0 && (
                <div className="text-[9px] text-text-muted space-y-0.5">
                  {scratchpadImport.variables.map((v) => (
                    <p key={v.symbol}>{v.symbol} = {v.value}{v.unit ? ` ${v.unit}` : ''}</p>
                  ))}
                </div>
              )}
              {scratchpadImport.steps && scratchpadImport.steps.length > 0 && (
                <div className="text-[9px] font-mono text-text-tertiary space-y-0.5 max-h-24 overflow-y-auto">
                  {scratchpadImport.steps.map((s, i) => (
                    <p key={i}>{s}</p>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={insertScratchpadImport}
                className="w-full py-1.5 rounded-lg text-[10px] font-semibold bg-brand-600 text-white hover:bg-brand-500"
              >
                {t('wbInsertOnBoard')}
              </button>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary">
            <BookOpen className="w-3.5 h-3.5 text-brand-700" />
            {t('wbFromNotes')}
          </div>
          {referenceFormulas.map((f) => (
            <div key={f.id} className="p-2 rounded-lg bg-surface-card border border-border-subtle">
              <p className="text-[10px] font-medium text-brand-800 truncate">{f.name}</p>
              <div className="mt-1 overflow-x-auto">
                <FormulaLatexPreview formula={f.formula} display={false} />
              </div>
              <p className="text-[9px] font-mono text-text-muted mt-1 break-all opacity-70">{f.formula}</p>
              <button
                type="button"
                onClick={() => insertFormulaLabel(f.name, f.formula)}
                className="mt-2 text-[9px] font-medium text-brand-700 hover:text-brand-800"
              >
                {t('wbInsertOnBoardArrow')}
              </button>
            </div>
          ))}
          {referenceExcerpt && referenceFormulas.length === 0 && (
            <p className="text-[10px] text-text-tertiary leading-relaxed line-clamp-6">{referenceExcerpt.slice(0, 280)}…</p>
          )}
        </aside>
      )}

      <div className="flex min-h-0 flex-1 flex-col min-w-0">
      <div className="shrink-0 border-b border-border-subtle px-3 py-2">
        <h3 className="text-sm font-semibold">Study Whiteboard</h3>
        <p className="text-[10px] text-text-tertiary">
          {t('wbHintLocalSave')}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border-subtle px-3 py-2">
        {TOOL_DEFS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            type="button"
            title={label}
            disabled={activeLayerLocked}
            onClick={() => setTool(id)}
            className={cn(
              'flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-medium transition-colors',
              tool === id ? 'bg-brand-600/20 text-brand-800' : 'text-text-muted hover:bg-surface-hover',
              activeLayerLocked && 'opacity-40 cursor-not-allowed',
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
        <div className="mx-1 h-5 w-px bg-border-subtle" />
        <button
          type="button"
          data-testid="whiteboard-layers-toggle"
          onClick={() => setShowLayers((v) => !v)}
          className={cn(
            'rounded-lg p-1.5',
            showLayers ? 'bg-brand-600/20 text-brand-800' : 'text-text-muted hover:bg-surface-hover',
          )}
          title={t('wbLayers')}
        >
          <Layers className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          data-testid="whiteboard-latex-stamps"
          onClick={() => setShowStamps((v) => !v)}
          className={cn(
            'rounded-lg px-2 py-1.5 text-[10px] font-medium',
            showStamps ? 'bg-accent-cyan/20 text-brand-800' : 'text-text-muted hover:bg-surface-hover',
          )}
          title={t('wbLatexStamps')}
        >
          <Calculator className="w-3.5 h-3.5 inline" />
          <span className="hidden sm:inline ml-1">LaTeX</span>
        </button>
        <button type="button" onClick={undo} disabled={doc.strokes.length === 0} className="rounded-lg p-1.5 text-text-muted hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed"><Undo2 className="w-3.5 h-3.5" /></button>
        <button type="button" onClick={redo} disabled={redoStack.length === 0} className="rounded-lg p-1.5 text-text-muted hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed"><Redo2 className="w-3.5 h-3.5" /></button>
        <button type="button" onClick={clearActiveLayer} className="rounded-lg p-1.5 text-text-muted hover:bg-surface-hover" title={t('wbClearActiveLayer')}><Trash2 className="w-3.5 h-3.5" /></button>
        <button type="button" onClick={save} className="rounded-lg p-1.5 text-text-muted hover:bg-surface-hover"><Save className="w-3.5 h-3.5" /></button>
        <button
          type="button"
          data-testid="whiteboard-export-png"
          onClick={() => {
            if (canvasRef.current) downloadWhiteboardPng(canvasRef.current, `whiteboard-${scopeKey ?? 'board'}`);
          }}
          className="rounded-lg p-1.5 text-text-muted hover:bg-surface-hover"
          title={t('wbExportPng')}
        >
          <Download className="w-3.5 h-3.5" />
        </button>
        {savedMsg && <span className="text-[10px] text-accent-emerald">{t('wbSaved')}</span>}
        {activeLayerLocked && (
          <span className="text-[10px] text-accent-amber">{t('wbLayerLocked')}</span>
        )}
      </div>

      {showStamps && (
        <div
          className="flex shrink-0 flex-wrap gap-2 border-b border-border-subtle px-3 py-2 max-h-28 overflow-y-auto"
          data-testid="whiteboard-stamp-panel"
        >
          {stampLibrary.map((stamp) => (
            <button
              key={stamp.id}
              type="button"
              onClick={() => insertLatexStamp(stamp)}
              className="rounded-lg border border-border-subtle bg-surface-card px-2 py-1 text-[9px] text-text-secondary hover:border-accent-cyan/40 hover:text-brand-800"
              title={stamp.latex}
            >
              {stamp.label}
            </button>
          ))}
        </div>
      )}

      {showLayers && (
        <div
          className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border-subtle px-3 py-2 text-[10px]"
          data-testid="whiteboard-layers"
        >
          <span className="text-text-tertiary font-semibold">
            {t('wbLayers')}
          </span>
          {doc.layers.map((layer) => {
            const active = layer.id === doc.activeLayerId;
            const strokeCount = doc.strokes.filter((s) => s.layerId === layer.id).length;
            return (
              <div
                key={layer.id}
                className={cn(
                  'flex items-center gap-1 rounded-lg border px-2 py-1',
                  active ? 'border-brand-500/40 bg-brand-600/10' : 'border-border-subtle bg-surface-primary/40',
                )}
              >
                <button
                  type="button"
                  data-testid={`whiteboard-layer-${layer.id}`}
                  onClick={() => setDoc((d) => ({ ...d, activeLayerId: layer.id }))}
                  className="font-medium text-text-secondary hover:text-brand-800"
                >
                  {layer.name}
                  <span className="ml-1 text-text-muted">({strokeCount})</span>
                </button>
                <button type="button" onClick={() => toggleLayerVisibility(layer.id)} className="text-text-muted hover:text-text-secondary">
                  {layer.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                </button>
                <button type="button" onClick={() => toggleLayerLock(layer.id)} className="text-text-muted hover:text-text-secondary">
                  {layer.locked ? <Lock className="w-3 h-3 text-accent-amber" /> : <Unlock className="w-3 h-3" />}
                </button>
              </div>
            );
          })}
          <button
            type="button"
            data-testid="whiteboard-layer-add"
            onClick={addLayer}
            className="inline-flex items-center gap-1 rounded-lg border border-dashed border-border-subtle px-2 py-1 text-text-muted hover:border-brand-500/30 hover:text-brand-800"
          >
            <Plus className="w-3 h-3" />
            {t('wbAddLayer')}
          </button>
        </div>
      )}

      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border-subtle px-3 py-2 text-[10px]">
        <span className="text-text-tertiary">Color</span>
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            className={cn('h-5 w-5 rounded-full border-2', color === c ? 'border-brand-400' : 'border-transparent')}
            style={{ backgroundColor: c }}
          />
        ))}
        <span className="ml-2 text-text-tertiary">Width</span>
        <input type="range" min={1} max={12} value={width} onChange={(e) => setWidth(Number(e.target.value))} className="w-24" />
      </div>

      <div ref={containerRef} className="relative min-h-0 flex-1 p-2">
        <canvas
          ref={canvasRef}
          className={cn(
            'touch-none rounded-xl border border-border-subtle w-full',
            activeLayerLocked && 'cursor-not-allowed opacity-90',
          )}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
        />
      </div>
      </div>
    </div>
  );
}
