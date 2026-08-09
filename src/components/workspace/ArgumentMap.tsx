import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, BookOpen } from '@/lib/lucide-shim';
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
import { PanelOverflowMenu } from './PanelOverflowMenu';
import { InfoHint } from '../ui/InfoHint';
import { PrimaryCTA } from '../ui/primitives';

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
 * Theme-aware soft fills — OPT-K156/K158: signal lives in wash hue only
 * (no outline cage); body ink stays primary.
 */
const NODE_COLORS: Record<ArgNodeType, { bg: string; text: string }> = {
  claim: {
    bg: 'color-mix(in srgb, var(--color-brand-600) 12%, var(--color-surface-card))',
    text: 'var(--color-text-primary)',
  },
  premise: {
    bg: 'color-mix(in srgb, var(--palette-cyan, #22d3ee) 11%, var(--color-surface-card))',
    text: 'var(--color-text-primary)',
  },
  support: {
    bg: 'color-mix(in srgb, var(--mastery-strong) 12%, var(--color-surface-card))',
    text: 'var(--color-text-primary)',
  },
  refutation: {
    bg: 'color-mix(in srgb, var(--color-accent-rose) 11%, var(--color-surface-card))',
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
      : t('debateNewPoint'));
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
            'absolute group flex flex-col items-center justify-center rounded-xl border-0 p-2.5 text-center type-caption font-medium',
            isSelected && 'ring-2 ring-brand-500/35',
          )}
          style={{
            width: 148, minHeight: 68, left: node.x - 74, top: node.y - 34,
            backgroundColor: colorStyle.bg, color: colorStyle.text,
          }}
        >
          {isEditing ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={saveEdit}
              autoFocus
              aria-label={`${t('debateEditNode')} — ${typeLabel}`}
              className="w-full h-14 bg-transparent type-caption resize-none outline-none text-center"
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
                    className="p-1 rounded border-0 bg-surface-primary/90 text-text-secondary"
                  >
                    <BookOpen className="w-3 h-3" aria-hidden />
                  </button>
                )}
                <button
                  type="button"
                  aria-label={`${t('debateEditNode')} — ${typeLabel}`}
                  onClick={() => startEdit(node)}
                  className="p-1 rounded border-0 bg-surface-primary/90 text-text-secondary"
                >
                  <Pencil className="w-3 h-3" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label={t('debateAddSupport')}
                  onClick={() => addNode(node.id, 'support')}
                  className="p-1 rounded border-0 bg-surface-primary/90 text-text-secondary"
                >
                  <Plus className="w-3 h-3" aria-hidden />
                </button>
                <button
                  type="button"
                  data-testid="debate-add-counter"
                  aria-label={t('debateCounterFromNotes')}
                  onClick={() => addCounterFromNotes(node.id)}
                  className="rounded border-0 bg-accent-rose/15 px-1.5 py-0.5 type-caption font-semibold text-accent-rose"
                >
                  {t('debateCounterLabel')}
                </button>
              </div>
            </>
          )}
          <div
            className="absolute -top-2 z-10 rounded-md border-0 px-1.5 py-0.5 type-caption font-semibold text-text-secondary"
            style={{ backgroundColor: colorStyle.bg }}
          >
            {typeLabel}
          </div>
        </motion.div>
        {node.children && node.expanded && node.children.map(renderNodes)}
      </div>
    );
  };

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden bg-surface-card"
      data-testid="argument-map"
      data-bleed="full"
      data-clarity-pass="k158"
    >
      {/* Wave DB / OPT-K158 — primary CTA; topic already in Guide/section (no echo) */}
      <div
        className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-transparent bg-surface-secondary/25 px-3 py-1.5"
        data-testid="debate-tree-toolbar"
      >
        <span className="min-w-0 flex-1 truncate type-caption font-medium text-text-secondary">
          {t('debateTree')}
        </span>
        <PrimaryCTA
          type="button"
          size="sm"
          data-testid="debate-add-counter-primary"
          onClick={() => addCounterFromNotes(root.id)}
          className="ws-touch-floor min-h-8 rounded-md px-2.5"
        >
          {t('debateAddCounter')}
        </PrimaryCTA>
        <InfoHint
          triggerAriaLabel={t('debateEditSupport')}
          label={`${t('debateEditSupport')} · ${t('debateCounterLabel')}`}
        />
        {onAskAgent && (
          <PanelOverflowMenu
            ariaLabel={t('wsMore')}
            triggerTestId="debate-more-menu"
            summaryClassName="ws-touch-floor inline-flex min-h-8 min-w-8 items-center justify-center rounded-md border-0 bg-surface-secondary/55 text-text-secondary hover:bg-surface-hover"
          >
            <button
              type="button"
              data-testid="debate-ask-agent"
              onClick={() => onAskAgent(root.text)}
              className="flex w-full items-center px-3 py-2 text-left type-caption font-medium text-text-secondary hover:bg-surface-hover"
            >
              {t('askAgentShort')}
            </button>
          </PanelOverflowMenu>
        )}
      </div>
      {counterSuggestions.length > 0 && (
        <CollapsibleChromeSection
          title={t('debateSuggestedCounters')}
          alwaysCollapse
          data-testid="debate-suggested-counters-chrome"
        >
          <div className="flex flex-wrap gap-1.5 px-3 py-2 type-caption text-text-secondary">
            {counterSuggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                className="ws-touch-floor max-w-full rounded-md border-0 bg-surface-secondary/50 px-2.5 py-1 text-left text-text-secondary hover:bg-surface-hover hover:text-text-primary"
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
      {rebuttalGraph.edges.length > 0 && (
        <CollapsibleChromeSection
          title={`${t('debateRebuttalGraph')} · ${rebuttalGraph.edges.length} ${t('debateEdges')}`}
          alwaysCollapse
          data-testid="debate-links-chrome"
        >
          <div className="px-3 pb-2" data-testid="debate-rebuttal-graph">
            <ul className="max-h-28 space-y-1.5 overflow-y-auto" data-testid="debate-rebuttal-list">
              {rebuttalGraph.edges.map((e, i) => {
                const fromText = rebuttalGraph.nodes.find((n) => n.id === e.fromId)?.text?.trim() ?? '';
                const toText = rebuttalGraph.nodes.find((n) => n.id === e.toId)?.text?.trim() ?? '';
                return (
                  <li
                    key={i}
                    className={cn(
                      'rounded-md border-0 px-2.5 py-1.5 type-caption font-medium leading-snug',
                      e.kind === 'rebuts'
                        ? 'bg-accent-rose/10 text-text-secondary'
                        : 'bg-surface-secondary/40 text-text-secondary',
                    )}
                  >
                    <span className="font-semibold text-text-primary">{e.label ?? e.kind}</span>
                    {fromText ? (
                      <span> — {fromText.slice(0, 96)}{fromText.length > 96 ? '…' : ''}</span>
                    ) : null}
                    {toText ? (
                      <span className="mt-0.5 block">→ {toText.slice(0, 96)}{toText.length > 96 ? '…' : ''}</span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        </CollapsibleChromeSection>
      )}
      <div
        className="relative min-h-0 flex-1 cursor-grab overflow-auto bg-surface-secondary/15 active:cursor-grabbing"
        data-testid="debate-canvas"
      >
        <div className="relative h-[600px] w-full min-w-[800px]">
          <svg className="pointer-events-none absolute inset-0 h-full w-full">
            {renderEdges(root)}
          </svg>
          {renderNodes(root)}
        </div>
      </div>
    </div>
  );
}
