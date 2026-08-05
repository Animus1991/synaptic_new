import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { GitCommit, Plus, Pencil, BookOpen, Shield, Sparkles } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import { useI18n, type I18nKey } from '../../lib/i18n';
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
import { WorkspaceToolEmptyState } from './WorkspaceToolEmptyState';
import { CollapsibleChromeSection } from './CollapsibleChromeSection';
import { InfoHint } from '../ui/InfoHint';

/* OPT-K101 — residual markup debt: decorative brand type -> ink */
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

/**
 * Theme-aware soft fills — dark jewel nodes (#1e1b4b / #064e3b) were AA on
 * themselves but jarring against the light notebook canvas and washed out
 * under dark themes. Signal lives in the border; body ink stays primary.
 */
const NODE_COLORS: Record<ArgNodeType, { bg: string; border: string; text: string }> = {
  claim: {
    bg: 'color-mix(in srgb, var(--color-brand-600) 14%, var(--color-surface-card))',
    border: 'color-mix(in srgb, var(--color-brand-600) 48%, var(--color-border-subtle))',
    text: 'var(--color-text-primary)',
  },
  premise: {
    bg: 'color-mix(in srgb, var(--palette-cyan, #22d3ee) 12%, var(--color-surface-card))',
    border: 'color-mix(in srgb, var(--palette-cyan, #22d3ee) 42%, var(--color-border-subtle))',
    text: 'var(--color-text-primary)',
  },
  support: {
    bg: 'color-mix(in srgb, var(--mastery-strong) 14%, var(--color-surface-card))',
    border: 'color-mix(in srgb, var(--mastery-strong) 48%, var(--color-border-subtle))',
    text: 'var(--color-text-primary)',
  },
  refutation: {
    bg: 'color-mix(in srgb, var(--color-accent-rose) 12%, var(--color-surface-card))',
    border: 'color-mix(in srgb, var(--color-accent-rose) 48%, var(--color-border-subtle))',
    text: 'var(--color-text-primary)',
  },
};

const TYPE_LABEL_KEYS: Record<ArgNodeType, I18nKey> = {
  claim: 'argumentClaim',
  premise: 'argumentPremise',
  support: 'argumentSupport',
  refutation: 'argumentRefutation',
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
  const { t } = useI18n();
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
      text: concept?.trim() || t('debateMainClaim'),
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
      <WorkspaceToolEmptyState
        tool="debate"
        concept={concept}
        message={emptyMessage}
        hasSource={hasSource ?? false}
        onUpload={onUpload}
        secondaryLabel={hasSource ? t('debateStartTree') : undefined}
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
      ? t('debateCounterArgument')
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
    addNode(parentId, 'refutation', suggestions[0]?.text ?? undefined);
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
          stroke={
            child.type === 'refutation'
              ? 'var(--color-accent-rose)'
              : child.type === 'support'
                ? 'var(--mastery-strong)'
                : 'var(--color-border-strong, var(--color-text-muted))'
          }
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
    const typeLabel = t(TYPE_LABEL_KEYS[node.type]);
    const isEditing = editingId === node.id;
    const isSelected = Boolean(selectedClaim && node.text === selectedClaim);
    return (
      <div key={`wrap-${node.id}`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            'absolute group flex flex-col items-center justify-center rounded-xl border-2 p-3 text-center type-caption font-medium shadow-sm',
            isSelected && 'ring-2 ring-brand-500/40',
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
              aria-label={`${t('debateEditNode')} — ${typeLabel}`}
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
                    aria-label={t('feynmanReadInSource')}
                    onClick={() => onOpenInReader(node.text)}
                    className="p-1 rounded bg-surface-primary/80 border border-border-subtle text-text-primary"
                  >
                    <BookOpen className="w-3 h-3" aria-hidden />
                  </button>
                )}
                <button
                  type="button"
                  aria-label={`${t('debateEditNode')} — ${typeLabel}`}
                  onClick={() => startEdit(node)}
                  className="p-1 rounded bg-surface-primary/80 border border-border-subtle text-text-primary"
                >
                  <Pencil className="w-3 h-3" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label={t('debateAddSupport')}
                  onClick={() => addNode(node.id, 'support')}
                  className="p-1 rounded bg-surface-primary/80 border border-border-subtle text-text-primary"
                >
                  <Plus className="w-3 h-3" aria-hidden />
                </button>
                <button
                  type="button"
                  data-testid="debate-add-counter"
                  aria-label={t('debateCounterFromNotes')}
                  onClick={() => addCounterFromNotes(node.id)}
                  className="p-1 rounded bg-surface-primary/80 border border-accent-rose/40 text-accent-rose"
                >
                  <Shield className="w-3 h-3" aria-hidden />
                </button>
              </div>
            </>
          )}
          <div
            className="absolute -top-2 z-10 rounded-full border px-2 py-0.5 type-caption font-semibold shadow-[0_0_0_2px_var(--color-surface-primary)]"
            style={{
              backgroundColor: colorStyle.bg,
              borderColor: colorStyle.border,
              color: '#f8fafc',
            }}
          >
            {typeLabel}
          </div>
        </motion.div>
        {node.children && node.expanded && node.children.map(renderNodes)}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Wave G2 — title + Ask Agent; edit legend via InfoHint; counters collapsed */}
      <div
        className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border-subtle bg-surface-card px-3 py-2"
        data-testid="debate-tree-toolbar"
      >
        <span className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold text-text-primary">
          <GitCommit className="h-4 w-4 shrink-0 text-text-secondary" aria-hidden />
          <span className="truncate">
            {t('debateTree')}
            {concept ? ` — ${concept}` : ''}
          </span>
        </span>
        <InfoHint
          triggerAriaLabel={t('debateEditSupport')}
          label={`${t('debateEditSupport')} · ${t('debateCounterLabel')}`}
        />
        {onAskAgent && (
          <button
            type="button"
            data-testid="debate-ask-agent"
            onClick={() => onAskAgent(root.text)}
            className="ws-touch-floor inline-flex min-h-9 items-center gap-1 rounded-lg border border-border-subtle px-2.5 py-1 type-caption font-medium text-text-secondary hover:border-border-default hover:text-text-primary"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">{t('askAgentShort')}</span>
          </button>
        )}
      </div>
      {counterSuggestions.length > 0 && (
        <CollapsibleChromeSection
          title={t('debateSuggestedCounters')}
          alwaysCollapse
          data-testid="debate-suggested-counters-chrome"
        >
          <div className="flex flex-wrap gap-1.5 px-3 py-2 type-caption text-text-primary">
            {counterSuggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                className="ws-touch-floor max-w-full rounded-lg border border-accent-rose/35 bg-accent-rose/10 px-2.5 py-1 text-left text-text-secondary hover:text-text-primary"
                onClick={() => addNode(root.id, 'refutation', s.text)}
                title={s.source}
              >
                {s.text.slice(0, 72)}{s.text.length > 72 ? '…' : ''}
              </button>
            ))}
          </div>
        </CollapsibleChromeSection>
      )}
      <DebateRebuttalPersistStrip report={persistReport} lang={lang} />
      <div
        className="mx-4 mb-2 rounded-xl border border-border-subtle bg-surface-card p-3"
        data-testid="debate-rebuttal-graph"
      >
        <p className="type-caption font-semibold text-text-muted mb-2">
          {t('debateRebuttalGraph')} · {rebuttalGraph.edges.length} {t('debateEdges')}
        </p>
        <ul className="space-y-1.5 max-h-28 overflow-y-auto" data-testid="debate-rebuttal-list">
          {rebuttalGraph.edges.map((e, i) => {
            const fromText = rebuttalGraph.nodes.find((n) => n.id === e.fromId)?.text?.trim() ?? '';
            const toText = rebuttalGraph.nodes.find((n) => n.id === e.toId)?.text?.trim() ?? '';
            return (
              <li
                key={i}
                className={cn(
                  'rounded-lg border px-2.5 py-1.5 type-caption font-medium leading-snug',
                  e.kind === 'rebuts'
                    ? 'border-accent-rose/45 bg-accent-rose/10 text-text-primary'
                    : 'border-accent-emerald/45 bg-accent-emerald/10 text-text-primary',
                )}
              >
                <span className="font-semibold">{e.label ?? e.kind}</span>
                {fromText ? (
                  <span className="text-text-secondary"> — {fromText.slice(0, 96)}{fromText.length > 96 ? '…' : ''}</span>
                ) : null}
                {toText ? (
                  <span className="block mt-0.5 text-text-secondary">→ {toText.slice(0, 96)}{toText.length > 96 ? '…' : ''}</span>
                ) : null}
              </li>
            );
          })}
        </ul>
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
