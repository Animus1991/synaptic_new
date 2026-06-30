import type { Lang } from './i18n';

export type AgentSlashCommand = 'quiz' | 'explain' | 'compare' | 'summarize';

export type ParsedAgentCommand = {
  command: AgentSlashCommand;
  args: string;
  /** Expanded instruction sent to the LLM (user bubble still shows raw input). */
  expandedPrompt: string;
};

const COMMAND_RE = /^\/(quiz|explain|compare|summarize)\b(?:\s+(.*))?$/i;

const EN: Record<AgentSlashCommand, (args: string) => string> = {
  quiz: (args) =>
    args.trim()
      ? `Create a practice quiz question about "${args.trim()}" grounded in my uploaded sources. Include the question, 4 options (A–D), the correct answer, and a brief explanation citing my material.`
      : 'Create a practice quiz question grounded in my uploaded sources. Include the question, 4 options (A–D), the correct answer, and a brief explanation citing my material.',
  explain: (args) =>
    args.trim()
      ? `Explain "${args.trim()}" clearly using my uploaded sources. Use simple language first, then add nuance. Cite where this appears in my notes.`
      : 'Explain the current topic clearly using my uploaded sources. Use simple language first, then add nuance. Cite where this appears in my notes.',
  compare: (args) => {
    const parts = args.split(/\s+(?:vs\.?|versus|και|vs)\s+/i).map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      return `Compare "${parts[0]}" and "${parts[1]}" using my uploaded sources. Highlight similarities, differences, and when to use each. Cite my material.`;
    }
    return args.trim()
      ? `Compare concepts related to "${args.trim()}" using my uploaded sources. Highlight similarities, differences, and when to use each.`
      : 'Compare the key concepts in my current study focus using my uploaded sources. Highlight similarities, differences, and when to use each.';
  },
  summarize: (args) =>
    args.trim()
      ? `Summarize "${args.trim()}" from my uploaded sources in concise bullet points. Include the most exam-relevant facts and cite sources.`
      : 'Summarize the key points from my uploaded sources for the current study focus in concise bullet points. Include the most exam-relevant facts.',
};

const EL: Record<AgentSlashCommand, (args: string) => string> = {
  quiz: (args) =>
    args.trim()
      ? `Δημιούργησε ερώτηση εξάσκησης για "${args.trim()}" με βάση τα ανεβασμένα αρχεία μου. Συμπερίλαβε την ερώτηση, 4 επιλογές (Α–Δ), τη σωστή απάντηση και σύντομη εξήγηση με παραπομπή στις πηγές μου.`
      : 'Δημιούργησε ερώτηση εξάσκησης με βάση τα ανεβασμένα αρχεία μου. Συμπερίλαβε την ερώτηση, 4 επιλογές (Α–Δ), τη σωστή απάντηση και σύντομη εξήγηση με παραπομπή στις πηγές μου.',
  explain: (args) =>
    args.trim()
      ? `Εξήγησε "${args.trim()}" καθαρά χρησιμοποιώντας τα ανεβασμένα αρχεία μου. Ξεκίνα απλά και πρόσθεσε λεπτομέρειες. Παράθεσε από πού προκύπτει στις σημειώσεις μου.`
      : 'Εξήγησε το τρέχον θέμα καθαρά χρησιμοποιώντας τα ανεβασμένα αρχεία μου. Ξεκίνα απλά και πρόσθεσε λεπτομέρειες. Παράθεσε από πού προκύπτει στις σημειώσεις μου.',
  compare: (args) => {
    const parts = args.split(/\s+(?:vs\.?|versus|και|vs)\s+/i).map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      return `Σύγκρινε "${parts[0]}" και "${parts[1]}" με βάση τα ανεβασμένα αρχεία μου. Τόνισε ομοιότητες, διαφορές και πότε χρησιμοποιείται το καθένα.`;
    }
    return args.trim()
      ? `Σύγκρινε έννοιες σχετικές με "${args.trim()}" με βάση τα ανεβασμένα αρχεία μου.`
      : 'Σύγκρινε τις βασικές έννοιες της τρέχουσας εστίασης με βάση τα ανεβασμένα αρχεία μου.';
  },
  summarize: (args) =>
    args.trim()
      ? `Σύνοψε "${args.trim()}" από τα ανεβασμένα αρχεία μου σε σύντομα bullets. Συμπερίλαβε τα πιο σημαντικά για εξετάσεις και παραπομπές.`
      : 'Σύνοψε τα βασικά σημεία από τα ανεβασμένα αρχεία μου για την τρέχουσα εστίαση σε σύντομα bullets.',
};

export function parseAgentCommand(input: string, lang: Lang = 'en'): ParsedAgentCommand | null {
  const match = input.trim().match(COMMAND_RE);
  if (!match) return null;
  const command = match[1]!.toLowerCase() as AgentSlashCommand;
  const args = (match[2] ?? '').trim();
  const expanders = lang === 'el' ? EL : EN;
  return {
    command,
    args,
    expandedPrompt: expanders[command](args),
  };
}

export function buildNoAnswerHintPrompt(lang: Lang): string {
  return lang === 'el'
    ? 'Μη μου δώσεις την τελική απάντηση. Κάνε καθοδηγούμενες ερωτήσεις και δώσε hints βήμα-βήμα, με βάση τις πηγές μου όπου είναι δυνατόν.'
    : "Don't give me the final answer. Ask guiding questions and give step-by-step hints, grounded in my sources where possible.";
}

export function buildLowRetrievalClarification(lang: Lang): string {
  return lang === 'el'
    ? 'Δεν βρέθηκαν αρκετές σχετικές παρα passages στις πηγές μου. Ρώτησέ με 1–2 διευκρινιστικές ερωτήσεις (ποιο μάθημα, ποιο κεφάλαιο ή έννοια) πριν απαντήσεις.'
    : 'Not enough relevant passages were found in my sources. Ask me 1–2 clarifying questions (which course, chapter, or concept) before answering.';
}
