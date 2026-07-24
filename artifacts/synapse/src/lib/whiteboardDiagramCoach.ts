import { t, type Lang } from './i18n';
/**
 * Wave 6.5 — Whiteboard diagram coach: blueprint + sketch steps grounded in notes & Concept Bus.
 */

import type { ExtractedFormula } from './noteContentExtractors';
import type { WhiteboardDocument } from './whiteboardLayers';
import { visibleStrokes } from './whiteboardLayers';

export type DiagramBlueprintKind =
  | 'concept-map'
  | 'causal-flow'
  | 'compare-contrast'
  | 'formula-web'
  | 'process-cycle';

export type DiagramCoachToolHint = 'text' | 'arrow' | 'rect' | 'ellipse' | 'line';

export type DiagramCoachStep = {
  id: string;
  order: number;
  label: string;
  hint: string;
  toolHint: DiagramCoachToolHint;
  boardLabel?: string;
};

export type DiagramCoachPlan = {
  kind: DiagramBlueprintKind;
  title: string;
  summary: string;
  steps: DiagramCoachStep[];
  nodeLabels: string[];
  weakFocus?: string;
};

const BLUEPRINT_META: Record<
  DiagramBlueprintKind,
  { titleEn: string; titleEl: string; summaryEn: string; summaryEl: string }
> = {
  'concept-map': {
    titleEn: 'Concept map',
    titleEl: 'Χάρτης εννοιών',
    summaryEn: 'Place the core idea in the center and link related terms from your notes.',
    summaryEl: 'Βάλε την κεντρική έννοια στο κέντρο και σύνδεσε σχετικούς όρους από τις σημειώσεις.',
  },
  'causal-flow': {
    titleEn: 'Cause → effect flow',
    titleEl: 'Ροή αιτία → αποτέλεσμα',
    summaryEn: 'Sketch what drives the concept and what it leads to.',
    summaryEl: 'Σκίτσαρε τι οδηγεί την έννοια και τι προκαλεί.',
  },
  'compare-contrast': {
    titleEn: 'Compare & contrast',
    titleEl: 'Σύγκριση & αντίθεση',
    summaryEn: 'Two columns or boxes — similarities in the middle, differences on the sides.',
    summaryEl: 'Δύο στήλες ή κουτιά — ομοιότητες στη μέση, διαφορές στα πλάγια.',
  },
  'formula-web': {
    titleEn: 'Formula web',
    titleEl: 'Δίκτυο τύπων',
    summaryEn: 'Connect formulas with arrows; label what each variable means.',
    summaryEl: 'Σύνδεσε τύπους με βέλη· σημείωσε τι σημαίνει κάθε μεταβλητή.',
  },
  'process-cycle': {
    titleEn: 'Process cycle',
    titleEl: 'Κύκλος διαδικασίας',
    summaryEn: 'Ordered steps in a loop or timeline from your lecture.',
    summaryEl: 'Διαδοχικά βήματα σε κύκλο ή χρονοδιάγραμμα από τη διάλεξη.',
  },
};

function uniqueLabels(items: string[], max = 6): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of items) {
    const label = raw.trim();
    if (!label || label.length < 2) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label.slice(0, 48));
    if (out.length >= max) break;
  }
  return out;
}

/** Pick a diagram blueprint from session + graph context. */
export function inferDiagramBlueprintKind(opts: {
  formulaCount: number;
  relatedCount: number;
  contrastPair?: [string, string];
  weakFocus?: string;
}): DiagramBlueprintKind {
  if (opts.formulaCount >= 2) return 'formula-web';
  if (opts.contrastPair) return 'compare-contrast';
  if (opts.relatedCount >= 3) return 'concept-map';
  if (opts.weakFocus && /confus|compare|versus|vs\.?/i.test(opts.weakFocus)) {
    return 'compare-contrast';
  }
  if (opts.relatedCount >= 1) return 'causal-flow';
  return 'process-cycle';
}

function buildStepsForKind(
  kind: DiagramBlueprintKind,
  concept: string,
  nodes: string[],
  lang: Lang,
): DiagramCoachStep[] {
    const center = concept.trim() || t('wbcConceptFallback', lang);
  const satellites = nodes.filter((n) => n.toLowerCase() !== center.toLowerCase()).slice(0, 5);

  if (kind === 'formula-web') {
    const labels = nodes.slice(0, 4);
    return [
      {
        id: 'fw-1',
        order: 1,
        label: t('wbcCentralFormula', lang),
        hint: t('wbcHintCentralFormula', lang),
        toolHint: 'text',
        boardLabel: labels[0],
      },
      {
        id: 'fw-2',
        order: 2,
        label: t('wbcVariables', lang),
        hint: t('wbcHintVariables', lang),
        toolHint: 'text',
        boardLabel: labels[1],
      },
      {
        id: 'fw-3',
        order: 3,
        label: t('wbcLinks', lang),
        hint: t('wbcHintLinks', lang),
        toolHint: 'arrow',
      },
    ];
  }

  if (kind === 'compare-contrast') {
    const a = satellites[0] ?? 'A';
    const b = satellites[1] ?? 'B';
    return [
      {
        id: 'cc-1',
        order: 1,
        label: t('wbcTwoBoxes', lang),
        hint: t('wbcHintTwoBoxes', lang).replace('{a}', a).replace('{b}', b),
        toolHint: 'rect',
        boardLabel: a,
      },
      {
        id: 'cc-2',
        order: 2,
        label: t('wbcSimilarities', lang),
        hint: t('wbcHintSimilarities', lang),
        toolHint: 'line',
        boardLabel: center,
      },
      {
        id: 'cc-3',
        order: 3,
        label: t('wbcDifferences', lang),
        hint: t('wbcHintDifferences', lang),
        toolHint: 'arrow',
        boardLabel: b,
      },
    ];
  }

  if (kind === 'concept-map') {
    const steps: DiagramCoachStep[] = [
      {
        id: 'cm-1',
        order: 1,
        label: t('wbcCenter', lang),
        hint: t('wbcHintCenter', lang).replace('{center}', center),
        toolHint: 'ellipse',
        boardLabel: center,
      },
    ];
    satellites.slice(0, 4).forEach((sat, i) => {
      steps.push({
        id: `cm-${i + 2}`,
        order: i + 2,
        label: t('wbcSatellite', lang).replace('{n}', String(i + 1)),
        hint: t('wbcHintSatellite', lang).replace('{sat}', sat),
        toolHint: 'arrow',
        boardLabel: sat,
      });
    });
    return steps;
  }

  if (kind === 'process-cycle') {
    const steps: DiagramCoachStep[] = [
      {
        id: 'pc-1',
        order: 1,
        label: t('wbcStart', lang),
        hint: t('wbcHintStart', lang),
        toolHint: 'rect',
        boardLabel: satellites[0] ?? center,
      },
    ];
    satellites.slice(1, 4).forEach((sat, i) => {
      steps.push({
        id: `pc-${i + 2}`,
        order: i + 2,
        label: t('wbcStepN', lang).replace('{n}', String(i + 2)),
        hint: t('wbcHintNextStage', lang),
        toolHint: 'arrow',
        boardLabel: sat,
      });
    });
    steps.push({
      id: 'pc-end',
      order: steps.length + 1,
      label: t('wbcCloseLoop', lang),
      hint: t('wbcHintCloseLoop', lang),
      toolHint: 'arrow',
    });
    return steps;
  }

  // causal-flow (default)
  return [
    {
      id: 'cf-1',
      order: 1,
      label: t('wbcCauses', lang),
      hint: t('wbcHintCauses', lang),
      toolHint: 'rect',
      boardLabel: satellites[0],
    },
    {
      id: 'cf-2',
      order: 2,
      label: t('wbcCoreConcept', lang),
      hint: t('wbcHintCoreBox', lang).replace('{center}', center),
      toolHint: 'rect',
      boardLabel: center,
    },
    {
      id: 'cf-3',
      order: 3,
      label: t('wbcEffects', lang),
      hint: t('wbcHintEffects', lang),
      toolHint: 'arrow',
      boardLabel: satellites[1],
    },
    {
      id: 'cf-4',
      order: 4,
      label: t('wbcLabels', lang),
      hint: t('wbcHintLabels', lang),
      toolHint: 'text',
      boardLabel: satellites[2],
    },
  ];
}

export function buildDiagramCoachPlan(opts: {
  concept: string;
  lang: Lang;
  sectionLabel?: string;
  referenceExcerpt?: string;
  formulas?: ExtractedFormula[];
  relatedConcepts?: string[];
  prerequisiteConcepts?: string[];
  contrastPair?: [string, string];
  weakFocus?: string;
}): DiagramCoachPlan {
  const {
    concept,
    lang,
    sectionLabel,
    referenceExcerpt = '',
    formulas = [],
    relatedConcepts = [],
    prerequisiteConcepts = [],
    contrastPair,
    weakFocus,
  } = opts;

  const formulaNames = formulas.map((f) => f.name);
  const graphNodes = uniqueLabels([
    concept,
    ...prerequisiteConcepts,
    ...relatedConcepts,
    ...formulaNames,
  ]);

  const excerptTerms = referenceExcerpt
    .split(/[\s,;:.!?]+/)
    .filter((w) => w.length >= 5 && /^[A-Za-zΑ-Ωα-ω]/.test(w))
    .slice(0, 4);

  const nodeLabels = uniqueLabels([...graphNodes, ...excerptTerms], 6);

  const kind = inferDiagramBlueprintKind({
    formulaCount: formulas.length,
    relatedCount: relatedConcepts.length,
    contrastPair,
    weakFocus,
  });

  const meta = BLUEPRINT_META[kind];
  const titleBase = lang === 'el' ? meta.titleEl : meta.titleEn;
  const title = sectionLabel
    ? `${titleBase} · ${sectionLabel}`
    : titleBase;

  return {
    kind,
    title,
    summary: lang === 'el' ? meta.summaryEl : meta.summaryEn,
    steps: buildStepsForKind(kind, concept, nodeLabels, lang),
    nodeLabels,
    weakFocus: weakFocus?.trim() || undefined,
  };
}

/** Grid positions for inserting coach labels on the canvas. */
export function layoutCoachNodePositions(count: number, originX = 56, originY = 72): { x: number; y: number }[] {
  const cols = Math.min(3, Math.max(1, Math.ceil(Math.sqrt(count))));
  const gapX = 140;
  const gapY = 48;
  const positions: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i += 1) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    positions.push({ x: originX + col * gapX, y: originY + row * gapY });
  }
  return positions;
}

const STROKE_KIND_EN: Record<string, string> = {
  pen: 'freehand',
  marker: 'marker stroke',
  highlighter: 'highlight',
  line: 'line',
  rect: 'rectangle',
  ellipse: 'ellipse',
  arrow: 'arrow',
  ruler: 'measured line',
  text: 'text',
};

const STROKE_KIND_EL: Record<string, string> = {
  pen: 'ελεύθερο σκίτσο',
  marker: 'μαρκαδόρος',
  highlighter: 'επισήμανση',
  line: 'γραμμή',
  rect: 'ορθογώνιο',
  ellipse: 'έλλειψη',
  arrow: 'βέλος',
  ruler: 'μετρημένη γραμμή',
  text: 'κείμενο',
};

/** Serialize visible canvas strokes into a compact agent-readable sketch description. */
export function describeWhiteboardDocument(
  doc: WhiteboardDocument,
  lang: Lang = 'en',
  maxStrokes = 24,
): string {
  const strokes = visibleStrokes(doc).filter((s) => s.tool !== 'eraser');
  if (strokes.length === 0) return '';

  const layerNames = new Map(doc.layers.map((l) => [l.id, l.name]));
  const kindLabels = lang === 'el' ? STROKE_KIND_EL : STROKE_KIND_EN;
  const lines: string[] = [];

  for (const stroke of strokes.slice(0, maxStrokes)) {
    const layer = layerNames.get(stroke.layerId) ?? stroke.layerId;
    if (stroke.tool === 'text' && stroke.text) {
      const p = stroke.points[0];
      lines.push(
        `[${layer}] ${kindLabels.text ?? 'text'} "${stroke.text.slice(0, 80)}" @ (${Math.round(p?.x ?? 0)},${Math.round(p?.y ?? 0)})`,
      );
      continue;
    }
    const p0 = stroke.points[0];
    const p1 = stroke.points[stroke.points.length - 1];
    if (!p0) continue;
    const kind = kindLabels[stroke.tool] ?? stroke.tool;
    if (['line', 'arrow', 'ruler', 'rect', 'ellipse'].includes(stroke.tool) && p1) {
      if (stroke.tool === 'rect' || stroke.tool === 'ellipse') {
        const w = Math.abs(p1.x - p0.x);
        const h = Math.abs(p1.y - p0.y);
        lines.push(
          `[${layer}] ${kind} @ (${Math.round(Math.min(p0.x, p1.x))},${Math.round(Math.min(p0.y, p1.y))}) ${Math.round(w)}×${Math.round(h)}`,
        );
      } else {
        lines.push(
          `[${layer}] ${kind} (${Math.round(p0.x)},${Math.round(p0.y)}) → (${Math.round(p1.x)},${Math.round(p1.y)})`,
        );
      }
    } else {
      lines.push(
        `[${layer}] ${kind} ${stroke.points.length} pts (${Math.round(p0.x)},${Math.round(p0.y)}) → (${Math.round(p1?.x ?? p0.x)},${Math.round(p1?.y ?? p0.y)})`,
      );
    }
  }

  if (strokes.length > maxStrokes) {
    lines.push(
      lang === 'el'
        ? `…και ${strokes.length - maxStrokes} ακόμα στοιχεία`
        : `…and ${strokes.length - maxStrokes} more elements`,
    );
  }
  return lines.join('\n');
}

export type WhiteboardDiagramAgentIntent = 'guide' | 'step' | 'critique' | 'explain';

export function buildWhiteboardDiagramAgentPrompt(
  plan: DiagramCoachPlan,
  lang: Lang,
  intent: WhiteboardDiagramAgentIntent,
  opts?: { step?: DiagramCoachStep; sketchDescription?: string; referenceExcerpt?: string },
): string {
  const excerpt = (opts?.referenceExcerpt ?? '').trim().slice(0, 400);
  const stepList = plan.steps
    .map((s) => `${s.order}. ${s.label}: ${s.hint}`)
    .join('\n');

  if (intent === 'explain') {
    const desc = (opts?.sketchDescription ?? '').trim().slice(0, 800);
    if (lang === 'el') {
      return [
        `Εξήγησε το διάγραμμά μου για «${plan.title}»:`,
        plan.summary,
        desc ? `\nΠεριγραφή σκίτσου:\n${desc}` : '\n(Ο πίνακας είναι κενός — πες μου τι θα έπρεπε να σχεδιάσω.)',
        excerpt ? `\nΑπόσπασμα σημειώσεων:\n«${excerpt}»` : '',
        '',
        'Τι δείχνει το διάγραμμα; Είναι σωστό σχετικά με τις σημειώσεις; Τι είναι ασαφές ή λείπει;',
      ].filter(Boolean).join('\n');
    }
    return [
      `Explain my diagram for "${plan.title}":`,
      plan.summary,
      desc ? `\nSketch description:\n${desc}` : '\n(The board is empty — tell me what I should draw.)',
      excerpt ? `\nNotes excerpt:\n"${excerpt}"` : '',
      '',
      'What does this diagram show? Is it correct relative to my notes? What is unclear or missing?',
    ].filter(Boolean).join('\n');
  }

  if (intent === 'critique' && opts?.sketchDescription?.trim()) {
    const desc = opts.sketchDescription.trim().slice(0, 600);
    if (lang === 'el') {
      return [
        `Κριτική διάγραμμα για «${plan.title}»:`,
        '',
        `Περιγραφή σκίτσου μου:\n${desc}`,
        excerpt ? `\nΑπόσπασμα σημειώσεων:\n«${excerpt}»` : '',
        '',
        'Τι λείπει; Ποια βέλη ή ετικέτες πρέπει να προσθέσω;',
      ].filter(Boolean).join('\n');
    }
    return [
      `Critique my diagram for "${plan.title}":`,
      '',
      `My sketch description:\n${desc}`,
      excerpt ? `\nNotes excerpt:\n"${excerpt}"` : '',
      '',
      'What is missing? Which arrows or labels should I add?',
    ].filter(Boolean).join('\n');
  }

  if (intent === 'step' && opts?.step) {
    const s = opts.step;
    if (lang === 'el') {
      return [
        `Coach σκίτσου — βήμα ${s.order}: ${s.label}`,
        `Οδηγία: ${s.hint}`,
        `Blueprint: ${plan.title} (${plan.kind})`,
        excerpt ? `Απόσπασμα: «${excerpt}»` : '',
        'Πες μου ακριβώς τι να σχεδιάσω σε αυτό το βήμα (σχήμα, θέση, βέλη).',
      ].filter(Boolean).join('\n');
    }
    return [
      `Diagram coach — step ${s.order}: ${s.label}`,
      `Instruction: ${s.hint}`,
      `Blueprint: ${plan.title} (${plan.kind})`,
      excerpt ? `Excerpt: "${excerpt}"` : '',
      'Tell me exactly what to draw in this step (shapes, placement, arrows).',
    ].filter(Boolean).join('\n');
  }

  if (lang === 'el') {
    return [
      `Βοήθησέ με να σχεδιάσω διάγραμμα: ${plan.title}`,
      plan.summary,
      plan.weakFocus ? `Εστίαση αδυναμίας: ${plan.weakFocus}` : '',
      excerpt ? `Απόσπασμα σημειώσεων:\n«${excerpt}»` : '',
      '',
      'Προτεινόμενα βήματα:',
      stepList,
      '',
      'Οδήγησέ με βήμα-βήμα τι να σχεδιάσω στον πίνακα.',
    ].filter(Boolean).join('\n');
  }

  return [
    `Help me diagram: ${plan.title}`,
    plan.summary,
    plan.weakFocus ? `Weak-area focus: ${plan.weakFocus}` : '',
    excerpt ? `Notes excerpt:\n"${excerpt}"` : '',
    '',
    'Suggested steps:',
    stepList,
    '',
    'Guide me step-by-step on what to draw on the whiteboard.',
  ].filter(Boolean).join('\n');
}
