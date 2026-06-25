/**
 * Wave 6.5 — Whiteboard diagram coach: blueprint + sketch steps grounded in notes & Concept Bus.
 */

import type { Lang } from './i18n';
import type { ExtractedFormula } from './noteContentExtractors';

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
  const isEl = lang === 'el';
  const center = concept.trim() || (isEl ? 'Έννοια' : 'Concept');
  const satellites = nodes.filter((n) => n.toLowerCase() !== center.toLowerCase()).slice(0, 5);

  if (kind === 'formula-web') {
    const labels = nodes.slice(0, 4);
    return [
      {
        id: 'fw-1',
        order: 1,
        label: isEl ? 'Κεντρικός τύπος' : 'Central formula',
        hint: isEl ? 'Γράψε τον κύριο τύπο στο κέντρο.' : 'Write the main formula in the center.',
        toolHint: 'text',
        boardLabel: labels[0],
      },
      {
        id: 'fw-2',
        order: 2,
        label: isEl ? 'Μεταβλητές' : 'Variables',
        hint: isEl ? 'Πρόσθεσε ετικέτες για κάθε σύμβολο.' : 'Add labels for each symbol.',
        toolHint: 'text',
        boardLabel: labels[1],
      },
      {
        id: 'fw-3',
        order: 3,
        label: isEl ? 'Συνδέσεις' : 'Links',
        hint: isEl ? 'Βέλη μεταξύ σχετικών τύπων.' : 'Arrows between related formulas.',
        toolHint: 'arrow',
      },
    ];
  }

  if (kind === 'compare-contrast') {
    const a = satellites[0] ?? (isEl ? 'Α' : 'A');
    const b = satellites[1] ?? (isEl ? 'Β' : 'B');
    return [
      {
        id: 'cc-1',
        order: 1,
        label: isEl ? 'Δύο κουτιά' : 'Two boxes',
        hint: isEl ? `Αριστερά «${a}», δεξιά «${b}».` : `Left "${a}", right "${b}".`,
        toolHint: 'rect',
        boardLabel: a,
      },
      {
        id: 'cc-2',
        order: 2,
        label: isEl ? 'Ομοιότητες' : 'Similarities',
        hint: isEl ? 'Γέφυρα ή λίστα στη μέση.' : 'Bridge or list in the middle.',
        toolHint: 'line',
        boardLabel: center,
      },
      {
        id: 'cc-3',
        order: 3,
        label: isEl ? 'Διαφορές' : 'Differences',
        hint: isEl ? 'Βέλη προς χαρακτηριστικά κάθε πλευράς.' : 'Arrows to traits on each side.',
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
        label: isEl ? 'Κέντρο' : 'Center',
        hint: isEl ? `Κύκλος ή κουτί με «${center}».` : `Circle or box for "${center}".`,
        toolHint: 'ellipse',
        boardLabel: center,
      },
    ];
    satellites.slice(0, 4).forEach((sat, i) => {
      steps.push({
        id: `cm-${i + 2}`,
        order: i + 2,
        label: isEl ? `Δορυφόρος ${i + 1}` : `Satellite ${i + 1}`,
        hint: isEl ? `Σύνδεσε «${sat}» με βέλος.` : `Link "${sat}" with an arrow.`,
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
        label: isEl ? 'Έναρξη' : 'Start',
        hint: isEl ? 'Πρώτο βήμα της διαδικασίας.' : 'First step of the process.',
        toolHint: 'rect',
        boardLabel: satellites[0] ?? center,
      },
    ];
    satellites.slice(1, 4).forEach((sat, i) => {
      steps.push({
        id: `pc-${i + 2}`,
        order: i + 2,
        label: isEl ? `Βήμα ${i + 2}` : `Step ${i + 2}`,
        hint: isEl ? 'Βέλος στο επόμενο στάδιο.' : 'Arrow to the next stage.',
        toolHint: 'arrow',
        boardLabel: sat,
      });
    });
    steps.push({
      id: 'pc-end',
      order: steps.length + 1,
      label: isEl ? 'Κλείσιμο κύκλου' : 'Close the loop',
      hint: isEl ? 'Προαιρετικό βέλος πίσω στην αρχή.' : 'Optional arrow back to the start.',
      toolHint: 'arrow',
    });
    return steps;
  }

  // causal-flow (default)
  return [
    {
      id: 'cf-1',
      order: 1,
      label: isEl ? 'Αιτίες' : 'Causes',
      hint: isEl ? '1–2 κουτιά αριστερά με οδηγούς όρους.' : '1–2 boxes on the left with drivers.',
      toolHint: 'rect',
      boardLabel: satellites[0],
    },
    {
      id: 'cf-2',
      order: 2,
      label: isEl ? 'Κεντρική έννοια' : 'Core concept',
      hint: isEl ? `Κεντρικό κουτί «${center}».` : `Central box "${center}".`,
      toolHint: 'rect',
      boardLabel: center,
    },
    {
      id: 'cf-3',
      order: 3,
      label: isEl ? 'Αποτελέσματα' : 'Effects',
      hint: isEl ? 'Βέλη προς δεξιά — τι προκαλεί;' : 'Arrows to the right — what does it cause?',
      toolHint: 'arrow',
      boardLabel: satellites[1],
    },
    {
      id: 'cf-4',
      order: 4,
      label: isEl ? 'Ετικέτες' : 'Labels',
      hint: isEl ? 'Σύντομες λέξεις-κλειδιά από το απόσπασμα.' : 'Short keywords from the excerpt.',
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

export type WhiteboardDiagramAgentIntent = 'guide' | 'step' | 'critique';

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
