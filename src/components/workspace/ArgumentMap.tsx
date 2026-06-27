import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { GitCommit, Plus, Pencil, BookOpen, Shield, Sparkles } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import { suggestCounterArguments } from '../../lib/debateCounterArgs';
import { buildRebuttalGraph } from '../../lib/debateRebuttalGraph';
import { auditDebateRebuttalPersistence } from '../../lib/debateRebuttalGraphPersistQA';
import {
  debateSeedFingerprint,
  loadDebateTreeEnvelope,
  resolveDebateTree,
  saveDebateTreeEnvelope,
} from '../../lib/debateTreePersist';
import { DebateRebuttalPersistStrip } from './DebateRebuttalPersistStrip';
import { WorkspaceEmptyState } from './WorkspaceEmptyState';

export type ArgNodeType = 'claim' | 'premise' | 'support' | 'refutation';

export interface ArgNode {
  id: string;
  type: ArgNodeType;
  text: string;
  x: number;
  y: number;
  expanded?: boolean;
  children?: ArgNode[];
}

const NODE_COLORS: Record<ArgNodeType, { bg: string; border: string; text: string }> = {
  claim: { bg: '#1e1b4b', border: '#818cf8', text: '#e0e7ff' },
  premise: { bg: '#162032', border: '#67e8f9', text: '#cffafe' },
  support: { bg: '#064e3b', border: '#34d399', text: '#d1fae5' },
  refutation: { bg: '#4c1d2e', border: '#fb7185', text: '#ffe4e6' },
};

const TYPE_LABELS: Record<ArgNodeType, string> = {
  claim: 'Claim',
  premise: 'Premise',
  support: 'Support',
  refutation: 'Refutation',
};

function updateNodeText(node: ArgNode, id: string, text: string): ArgNode {
  if (node.id === id) return { ...node, text };
  if (!node.children) return node;
  return { ...node, children: node.children.map((c) => updateNodeText(c, id, text)) };
}

function addChild(node: ArgNode, parentId: string, child: ArgNode): ArgNode {
  if (node.id === parentId) {
    return { ...node, expanded: true, children: [...(node.children ?? []), child] };
  }
  if (!node.children) return node;
  return { ...node, children: node.children.map((c) => addChild(c, parentId, child)) };
}

function findNode(node: ArgNode, id: string): ArgNode | null {
  if (node.id === id) return node;
  for (const c of node.children ?? []) {
    const hit = findNode(c, id);
    if (hit) return hit;
  }
  return null;
}

interface Props {
  tree?: ArgNode | null;
  storageKey?: string;
  concept?: string;
  emptyMessage?: string;
  hasSource?: boolean;
  onUpload?: () => void;
  /** Open reader highlighted at this claim/premise text in source notes. */
  onOpenInReader?: (claimText: string) => void;
  /** Grounded source for counter-argument suggestions. */
  sourceText?: string;
  focusTerm?: string;
  lang?: 'en' | 'el';
  onAskAgent?: (claimText?: string) => void;
  onNodeSelect?: (claimText: string) => void;
  selectedClaim?: string | null;
  onRebuttalPersisted?: (rebuttalText: string) => void;
}

export function ArgumentMap({
  tree,
  storageKey = 'debate-tree',
  concept,
  emptyMessage,
  hasSource = false,
  onUpload,
  onOpenInReader,
  sourceText = '',
  focusTerm,
  lang = 'en',
  onAskAgent,
  onNodeSelect,
  selectedClaim,
  onRebuttalPersisted,
}: Props) {
  const seedFingerprint = useMemo(() => debateSeedFingerprint(tree ?? null), [tree]);

  const [root, setRoot] = useState<ArgNode | null>(() => {
    const envelope = loadDebateTreeEnvelope(storageKey);
    return resolveDebateTree(
      envelope?.tree ?? null,
      tree ?? null,
      envelope?.seedFingerprint ?? null,
      seedFingerprint,
    );
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    const envelope = loadDebateTreeEnvelope(storageKey);
    const next = resolveDebateTree(
      envelope?.tree ?? null,
      tree ?? null,
      envelope?.seedFingerprint ?? null,
      seedFingerprint,
    );
    setRoot(next);
  }, [tree, storageKey, seedFingerprint]);

  const persistReport = useMemo(() => {
    const envelope = loadDebateTreeEnvelope(storageKey);
    return auditDebateRebuttalPersistence({
      activeTree: root,
      seed: tree ?? null,
      lang,
      envelope,
    });
  }, [root, tree, storageKey, lang]);

  const persist = (next: ArgNode, opts?: { rebuttalText?: string }) => {
    setRoot(next);
    saveDebateTreeEnvelope(storageKey, next, seedFingerprint);
    if (opts?.rebuttalText?.trim()) {
      onRebuttalPersisted?.(opts.rebuttalText.trim());
    }
  };

  const startDebate = () => {
    const seed: ArgNode = {
      id: 'root',
      type: 'claim',
      text: concept?.trim() || (lang === 'el' ? 'Κύριο επιχείρημα' : 'Main claim'),
      x: 320,
      y: 200,
      expanded: true,
      children: [],
    };
    persist(seed);
    setEditingId(seed.id);
    setDraft(seed.text);
  };

  if (!root) {
    return (
      <WorkspaceEmptyState
        message={emptyMessage ?? 'Upload notes to build a debate tree from claims in your material.'}
        hasSource={hasSource}
        onUpload={onUpload}
        secondaryLabel={hasSource ? (lang === 'el' ? 'Ξεκίνα συζήτηση' : 'Start debate tree') : undefined}
        onSecondary={hasSource ? startDebate : undefined}
      />
    );
  }

  const startEdit = (node: ArgNode) => {
    setEditingId(node.id);
    setDraft(node.text);
  };

  const saveEdit = () => {
    if (!editingId) return;
    persist(updateNodeText(root, editingId, draft.trim() || 'New node'));
    setEditingId(null);
  };

  const addNode = (parentId: string, type: ArgNodeType = 'support', text?: string) => {
    const id = `n-${Date.now()}`;
    const label = text ?? (type === 'refutation'
      ? (lang === 'el' ? 'Αντίθετο επιχείρημα' : 'Counter-argument')
      : 'New argument point');
    const child: ArgNode = {
      id,
      type,
      text: label,
      x: 300 + Math.random() * 80,
      y: 280 + Math.random() * 40,
    };
    persist(addChild(root, parentId, child), type === 'refutation' ? { rebuttalText: label } : undefined);
    startEdit(child);
  };

  const addCounterFromNotes = (parentId: string) => {
    const parent = findNode(root, parentId);
    const claim = parent?.text ?? concept ?? '';
    const suggestions = sourceText.trim()
      ? suggestCounterArguments(sourceText, focusTerm ?? concept ?? '', claim)
      : [];
    addNode(parentId, 'refutation', suggestions[0] ?? undefined);
  };

  const counterSuggestions = useMemo(() => {
    if (!sourceText.trim() || !concept) return [];
    const claim = root.text;
    return suggestCounterArguments(sourceText, focusTerm ?? concept, claim, 2);
  }, [sourceText, concept, focusTerm, root.text]);

  const rebuttalGraph = useMemo(() => buildRebuttalGraph(root), [root]);

  const renderEdges = (node: ArgNode): React.ReactNode => {
    if (!node.children || !node.expanded) return null;
    return node.children.map((child) => (
      <g key={`edge-${node.id}-${child.id}`}>
        <motion.line
          x1={node.x} y1={node.y + 40} x2={child.x} y2={child.y - 40}
          stroke={child.type === 'refutation' ? '#fb7185' : child.type === 'support' ? '#34d399' : '#6b6494'}
          strokeWidth={2} strokeLinecap="round"
          strokeDasharray={child.type === 'refutation' ? '4 4' : 'none'}
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5 }}
        />
        {renderEdges(child)}
      </g>
    ));
  };

  const renderNodes = (node: ArgNode): React.ReactNode => {
    const colorStyle = NODE_COLORS[node.type];
    const isEditing = editingId === node.id;
    const isSelected = Boolean(selectedClaim && node.text === selectedClaim);
    return (
      <div key={`wrap-${node.id}`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            'absolute group flex flex-col items-center justify-center rounded-xl border-2 p-3 text-center text-xs font-medium shadow-lg',
            isSelected && 'ring-2 ring-accent-cyan/50',
          )}
          style={{
            width: 150, minHeight: 84, left: node.x - 75, top: node.y - 42,
            backgroundColor: colorStyle.bg, borderColor: colorStyle.border, color: colorStyle.text,
          }}
        >
          {isEditing ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={saveEdit}
              autoFocus
              className="w-full h-14 bg-transparent text-xs resize-none outline-none text-center"
            />
          ) : (
            <>
              <span
                className={cn(onNodeSelect && 'cursor-pointer hover:underline decoration-accent-cyan/40')}
                onClick={(e) => {
                  if (!onNodeSelect || node.text.trim().length < 4) return;
                  e.stopPropagation();
                  onNodeSelect(node.text);
                }}
              >
                {node.text}
              </span>
              <div className="absolute -bottom-7 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {onOpenInReader && node.text.trim().length > 8 && (
                  <button
                    type="button"
                    title={lang === 'el' ? 'Άνοιγμα στον αναγνώστη' : 'Read in source'}
                    onClick={() => onOpenInReader(node.text)}
                    className="p-1 rounded bg-surface-primary/80 border border-border-subtle text-accent-cyan"
                  >
                    <BookOpen className="w-3 h-3" />
                  </button>
                )}
                <button type="button" onClick={() => startEdit(node)} className="p-1 rounded bg-surface-primary/80 border border-border-subtle">
                  <Pencil className="w-3 h-3" />
                </button>
                <button type="button" onClick={() => addNode(node.id, 'support')} className="p-1 rounded bg-surface-primary/80 border border-border-subtle">
                  <Plus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  data-testid="debate-add-counter"
                  title={lang === 'el' ? 'Αντίθετο από σημειώσεις' : 'Counter from notes'}
                  onClick={() => addCounterFromNotes(node.id)}
                  className="p-1 rounded bg-surface-primary/80 border border-accent-rose/40 text-accent-rose"
                >
                  <Shield className="w-3 h-3" />
                </button>
              </div>
            </>
          )}
          <div
            className="absolute -top-2 rounded-full border bg-surface-primary px-2 py-0.5 text-[9px] font-bold"
            style={{ borderColor: colorStyle.border, color: colorStyle.border }}
          >
            {TYPE_LABELS[node.type]}
          </div>
        </motion.div>
        {node.children && node.expanded && node.children.map(renderNodes)}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-border-subtle bg-surface-card px-4 py-2.5">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <GitCommit className="w-4 h-4 text-accent-cyan" />
          Debate Tree{concept ? ` — ${concept}` : ''}
        </span>
        <div className="flex items-center gap-2">
          {onAskAgent && (
            <button
              type="button"
              data-testid="debate-ask-agent"
              onClick={() => onAskAgent(root.text)}
              className="inline-flex items-center gap-1 rounded-lg border border-accent-cyan/30 bg-accent-cyan/10 px-2 py-1 text-[10px] font-medium text-accent-cyan hover:bg-accent-cyan/15"
            >
              <Sparkles className="w-3 h-3" />
              {lang === 'el' ? 'Ρώτα Agent' : 'Ask Agent'}
            </button>
          )}
          <span className="text-[10px] text-text-muted inline-flex items-center gap-2">
            {lang === 'el' ? 'Επεξεργασία · + υποστήριξη ·' : 'Edit · + support ·'}
            <Shield className="w-3 h-3 inline" />
            {lang === 'el' ? 'αντίθετο' : 'counter'}
          </span>
        </div>
      </div>
      {counterSuggestions.length > 0 && (
        <div className="shrink-0 border-b border-border-subtle bg-accent-rose/5 px-4 py-2 text-[10px] text-text-secondary">
          <span className="font-semibold text-accent-rose">{lang === 'el' ? 'Προτεινόμενα αντίθετα:' : 'Suggested counters:'}</span>
          {' '}
          {counterSuggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              className="ml-1 underline hover:text-accent-rose"
              onClick={() => addNode(root.id, 'refutation', s)}
            >
              {s.slice(0, 48)}{s.length > 48 ? '…' : ''}
            </button>
          ))}
        </div>
      )}
      <DebateRebuttalPersistStrip report={persistReport} lang={lang} />
      <div
        className="mx-4 mb-2 rounded-xl border border-border-subtle bg-surface-card p-3"
        data-testid="debate-rebuttal-graph"
      >
        <p className="text-[10px] font-semibold text-text-muted mb-2">
          {lang === 'el' ? 'Rebuttal graph' : 'Rebuttal graph'} · {rebuttalGraph.edges.length} {lang === 'el' ? 'συνδέσεις' : 'edges'}
        </p>
        <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
          {rebuttalGraph.edges.map((e, i) => (
            <span
              key={i}
              className={cn(
                'rounded-full px-2 py-0.5 text-[9px] font-medium border',
                e.kind === 'rebuts' ? 'border-accent-rose/40 text-accent-rose bg-accent-rose/10' : 'border-accent-emerald/40 text-accent-emerald bg-accent-emerald/10',
              )}
            >
              {e.label}: {rebuttalGraph.nodes.find((n) => n.id === e.fromId)?.text.slice(0, 24)}…
            </span>
          ))}
        </div>
      </div>
      <div className="relative flex-1 cursor-grab overflow-auto bg-surface-primary active:cursor-grabbing">
        <div className="relative h-[600px] w-[800px]">
          <svg className="pointer-events-none absolute inset-0 h-full w-full">
            {renderEdges(root)}
          </svg>
          {renderNodes(root)}
        </div>
      </div>
    </div>
  );
}
