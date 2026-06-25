import { describe, it, expect } from 'vitest';
import {
  detectConversationSections,
  detectDocumentSections,
  looksLikeHeadingLine,
  normalizeDocumentText,
  parseConversationTurnLine,
  splitStructuredParagraphs,
} from './textSegmentation';
import { detectSections } from './contentAnalysis';
import { buildWorkspaceStepsFromNotes } from './noteContentExtractors';
import { analyzeDocumentStructure } from './documentStructureReport';

describe('normalizeDocumentText', () => {
  it('converts form feeds to page break markers', () => {
    const out = normalizeDocumentText('Page one\fPage two');
    expect(out).toContain('--- page break ---');
    expect(out).toContain('Page one');
    expect(out).toContain('Page two');
  });
});

describe('looksLikeHeadingLine', () => {
  it('detects underline-style headings', () => {
    expect(looksLikeHeadingLine('Introduction', '===========')).toBe(true);
  });

  it('detects slide markers', () => {
    expect(looksLikeHeadingLine('Slide 3: Supply curves')).toBe(true);
    expect(looksLikeHeadingLine('Διαφάνεια 2: Ζήτηση')).toBe(true);
  });

  it('detects Greek chapter markers', () => {
    expect(looksLikeHeadingLine('Ενότητα 1: Αγορές')).toBe(true);
  });
});

describe('parseConversationTurnLine', () => {
  it('parses User:/Assistant: turns from chatgpt-organizer-java', () => {
    expect(parseConversationTurnLine('User: What is supply?')).toEqual({
      speaker: 'User',
      text: 'What is supply?',
    });
    expect(parseConversationTurnLine('Assistant: Supply is quantity offered at each price.')).toEqual({
      speaker: 'Assistant',
      text: 'Supply is quantity offered at each price.',
    });
  });

  it('parses markdown-style ChatGPT roles', () => {
    expect(parseConversationTurnLine('### User')).toEqual({ speaker: 'User', text: '' });
    expect(parseConversationTurnLine('### Assistant')).toEqual({ speaker: 'Assistant', text: '' });
  });

  it('parses Greek Q/A labels', () => {
    expect(parseConversationTurnLine('Ερώτηση: Τι είναι η ζήτηση;')).toEqual({
      speaker: 'Ερώτηση',
      text: 'Τι είναι η ζήτηση;',
    });
  });
});

describe('detectConversationSections', () => {
  it('segments labelled chat transcripts into turns', () => {
    const text = `User: Explain elasticity.
Assistant: Elasticity measures responsiveness of quantity to price.
User: Give an example.
Assistant: Luxury goods often have elastic demand.`;

    const sections = detectConversationSections(text);
    expect(sections).not.toBeNull();
    expect(sections!.length).toBeGreaterThanOrEqual(4);
    expect(sections!.some((s) => s.heading === 'User' && /elasticity/i.test(s.text))).toBe(true);
  });
});

describe('detectExplicitQAPairSections', () => {
  it('groups FAQ Q/A pairs into single sections', () => {
    const text = `Q: What is supply?
A: Quantity producers offer at each price.

Q: What is demand?
A: Quantity buyers want at each price.`;

    const sections = detectDocumentSections(text);
    expect(sections.length).toBe(2);
    expect(sections[0]?.heading?.toLowerCase()).toContain('supply');
    expect(sections[0]?.text.toLowerCase()).toContain('producers');
    expect(sections[1]?.heading?.toLowerCase()).toContain('demand');
  });
});

describe('detectDashDialogueSections', () => {
  it('segments dash-prefixed dialogue turns', () => {
    const text = `- What is GDP?
It measures total output.
- How is it calculated?
By summing value added.`;

    const sections = detectDocumentSections(text);
    expect(sections.length).toBeGreaterThanOrEqual(2);
  });
});

describe('code fence awareness', () => {
  it('does not treat # comments inside code fences as headings', () => {
    const text = `# Real Section

\`\`\`python
# not a heading
print("hello")
\`\`\`

## Next Section

Body text here with enough length to pass filters easily.`;

    const sections = detectDocumentSections(text);
    expect(sections.length).toBeGreaterThanOrEqual(2);
    expect(sections.some((s) => /next section/i.test(s.heading ?? ''))).toBe(true);
    expect(sections.every((s) => !/^not a heading$/i.test(s.heading ?? ''))).toBe(true);
  });
});

describe('detectDocumentSections', () => {
  it('prefers conversation turns over paragraph splitting', () => {
    const text = `User: What is GDP?
Assistant: GDP measures total economic output in a country.`;

    const sections = detectDocumentSections(text);
    expect(sections.length).toBe(2);
    expect(sections[0]?.heading).toBe('User');
    expect(sections[1]?.heading).toBe('Assistant');
  });

  it('splits on slide markers', () => {
    const text = `Slide 1: Overview
Markets coordinate buyers and sellers.

Slide 2: Elasticity
Price elasticity measures responsiveness.`;

    const sections = detectDocumentSections(text);
    expect(sections.length).toBeGreaterThanOrEqual(2);
    expect(sections.some((s) => /elastic/i.test(s.heading ?? s.text))).toBe(true);
  });

  it('splits on form-feed page breaks', () => {
    const text = `Supply rises when price increases.\fDemand falls when price rises too high.`;
    const sections = detectDocumentSections(text);
    expect(sections.length).toBeGreaterThanOrEqual(2);
  });

  it('splits on horizontal rules', () => {
    const text = `First topic body with enough text to pass minimum length filters here.

---

Second topic with distinct content about elasticity and demand curves.`;
    const sections = detectDocumentSections(text);
    expect(sections.length).toBeGreaterThanOrEqual(2);
  });

  it('detects markdown and numbered headings', () => {
    const text = `# Introduction

Markets are systems where supply meets demand in equilibrium.

## 2. Elasticity

Elasticity quantifies responsiveness of quantity to price changes.`;
    const sections = detectSections(text);
    expect(sections.length).toBeGreaterThanOrEqual(2);
    expect(sections[0]?.heading?.toLowerCase()).toContain('intro');
  });
});

describe('splitStructuredParagraphs', () => {
  it('returns one paragraph per slide section', () => {
    const text = `Slide 1: A
Alpha content here.

Slide 2: B
Beta content here.`;
    const paras = splitStructuredParagraphs(text);
    expect(paras.length).toBeGreaterThanOrEqual(2);
  });
});

describe('buildWorkspaceStepsFromNotes', () => {
  it('uses full-document sections even when BM25 excerpt would drop headings', () => {
    const filler = 'Unrelated filler about astronomy and stars. '.repeat(80);
    const text = `${filler}

Slide 1: Supply
Producers offer goods at each price level in competitive markets.

Slide 2: Demand
Consumers purchase quantities based on willingness to pay.

Slide 3: Equilibrium
Supply and demand intersect at the market-clearing price.`;

    const steps = buildWorkspaceStepsFromNotes(text, 'supply', 'en');
    expect(steps).not.toBeNull();
    expect(steps!.length).toBeGreaterThanOrEqual(3);
    expect(steps!.some((s) => /supply|demand|equilibrium/i.test(s.title))).toBe(true);
  });

  it('prefers real section headings in document order around the best-matching section', () => {
    const text = `# Market Overview
Context about how markets coordinate buyers and sellers.

# Supply
Supply describes how producers respond to price changes.

# Demand
Demand explains how consumers respond to price changes.

# Equilibrium
Market equilibrium is where supply and demand intersect.`;

    const steps = buildWorkspaceStepsFromNotes(text, 'demand', 'en');
    expect(steps).not.toBeNull();
    expect(steps!.slice(0, 4).map((s) => s.title)).toEqual([
      'Market Overview',
      'Supply',
      'Demand',
      'Equilibrium',
    ]);
  });

  it('uses labelled turn previews instead of generic speaker-only titles', () => {
    const text = `User: Explain opportunity cost in simple terms.

Assistant: Opportunity cost is the value of the next best alternative you give up.

User: Give me an example with studying economics.

Assistant: If you study economics for two hours, you give up the next best use of that time.`;

    const steps = buildWorkspaceStepsFromNotes(text, 'opportunity cost', 'en');
    expect(steps).not.toBeNull();
    expect(steps![0]!.title).toMatch(/^User:/);
    expect(steps![1]!.title).toMatch(/^Assistant:/);
  });

  it('infers Greek lecture titles from PDF page breaks instead of page-break markers', () => {
    const page1 = 'ΕΘΝΙΚΟ ΚΑΙ ΚΑΠΟΔΙΣΤΡΙΑΚΟ ΠΑΝΕΠΙΣΤΗΜΙΟ ΑΘΗΝΩΝ\nΤΜΗΜΑ ΟΙΚΟΝΟΜΙΚΩΝ ΕΠΙΣΤΗΜΩΝ\nΔΙΕΘΝΗΣ ΟΙΚΟΝΟΜΙΚΗ';
    const page2 = 'ΔΙΑΛΕΞΗ 1 ΕΙΣΑΓΩΓΗ ΣΤΗ ΔΙΕΘΝΗ ΟΙΚΟΝΟΜΙΚΗ\nΘεματική: εμπορική πολιτική, ισοζύγιο πληρωμών.';
    const page3 = 'ΔΙΑΛΕΞΗ 2 ΘΕΩΡΙΑ ΣΥΓΚΡΙΤΙΚΩΝ ΠΛΕΟΝΕΚΤΗΜΑΤΩΝ\nΑπόλυτα και συγκριτικά πλεονεκτήματα.';
    const text = `${page1}\f${page2}\f${page3}`;

    const sections = detectDocumentSections(text);
    const hasLecture1 = sections.some((s) =>
      (s.heading ?? '').includes('ΔΙΑΛΕΞΗ 1') ||
      (s.text.includes('ΔΙΑΛΕΞΗ 1') && Boolean(s.heading)),
    );
    expect(hasLecture1).toBe(true);
    expect(sections.every((s) => s.heading !== '--- page break ---')).toBe(true);

    const structure = analyzeDocumentStructure(text, 'el');
    expect(structure.sections.some((s) => (s.heading ?? '').includes('ΔΙΑΛΕΞΗ 1'))).toBe(true);
    expect(structure.sections.every((s) => !/page break/i.test(s.heading ?? ''))).toBe(true);

    const steps = buildWorkspaceStepsFromNotes(text, 'διεθνή οικονομική', 'el');
    expect(steps).not.toBeNull();
    expect(steps!.some((s) => s.title.includes('ΔΙΑΛΕΞΗ 1'))).toBe(true);
    expect(steps!.every((s) => !/page break/i.test(s.title))).toBe(true);
  });
});
