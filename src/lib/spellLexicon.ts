/**
 * Wave 8B-β — Compact offline spell lexicons (EL + EN) for token validation.
 * Domain vocabulary from economics/syllabus PDFs; extendable per-course via glossary union.
 */

export type SpellLang = 'el' | 'en' | 'mixed';

const GREEK_DOMAIN = `
και για στο στη στην στον στους στις στα της του των την τον με σε από που δεν ότι είναι έχει
σήμερα μήνες μήνα μπορεί δοθεί δωθεί υπόσχεση σαμπουάν κομμωτήριο πιθανότητα αποφάσεις
απώλεια ζωής πλήρη καθαρισμό λαμβάνει τρεις αποδίδει δολάριο πληρώνατε χάσετε
αυτό αυτή αυτά άλλο άλλη άλλα ένα έναν ένας μία μια μετά πριν επί κατά υπό προς μεταξύ
συνήθως επομένως συνεπώς γενικά όταν εάν ενώ αλλά άρα όπου
οικονομία οικονομίας οικονομική οικονομικές παραγωγή παραγωγής προσφορά προσφοράς ζήτηση ζήτησης
εισόδημα εισοδήματος διανομή διανομής εμπόριο εμπορίου διεθνές διεθνής χώρα χώρες χώρας
πλεονεκτήματα πλεονεκτημάτων απόλυτα συγκριτικά ανταγωνισμός ανταγωνισμό μισθός μισθό
καταναλωτής καταναλωτή συνάρτηση συνάρτησης κόστος κόστους αξία αξίας παρούσα
επιλογή επιλογής επιλογές ορθολογική ορθολογικής πραγματικά αποφάσεις αποφάσεων
διάλεξη ενότητα μάθημα σημείωση ορισμός παράδειγμα θεωρία ανάλυση μελέτη
εθνικό πανεπιστήμιο σχολή τμήμα εξάμηνο εξέταση βιβλιογραφία
`.trim().split(/\s+/);

const ENGLISH_DOMAIN = `
the and for with from that this these those when where which while because into over under
between through during before after about against within without above below whole wholly
page pages slide sheet figure table user assistant system question answer
economics economic market markets price prices demand supply equilibrium elasticity revenue
cost costs consumer consumers producers producer production income distribution trade international domestic
theory model models example examples definition definitions chapter section lecture
university course syllabus analysis study student students exam equation formula
increase decreases change changes quantity quantities percent percentage rate rates ratio ratios
opportunity explain verify understanding

firm firms curve curves line lines state states rise rises falls fall demanded supplied
choose chooses chosen choice choices worse better best good bad
game games player players strategy strategies payoff payoffs dominant equilibria
opponent opponents regardless cooperation cooperate cooperative mutual mutually unilaterally
seller sellers buyer buyers shift shifts entry exit exits barrier barriers
monopoly monopolies monopolistic oligopoly oligopolies competition competitive competitor competitors
perfect imperfect differentiated differentiation identical homogeneous heterogeneous
marginal average total surplus deadweight welfare efficient efficiency inefficient allocation
externality externalities public private social intervention rational irrational framework
boundary boundaries condition conditions variable variables identify apply core relevant practice
factor factors output outputs input inputs labor labour capital wage wages interest tax taxes
subsidy subsidies utility preference preferences indifference budget constraint constraints
optimal optimum maximize maximise minimize minimise function functions slope elastic inelastic
substitute substitutes complement complements normal inferior scarce scarcity resource resources
short long run fixed scale returns diminishing law laws curve product products charge charges
level levels point points value values amount amounts effect effects result results reason reasons
way ways form forms part parts kind kinds type types group groups number numbers order orders
place places case cases fact facts world area areas work works life hand hands side sides end ends
right rights left own only just also more most less least many much some any each every both few
several other others such same different new old first last next high higher highest low lower
lowest large larger largest small smaller smallest long longer longest short shorter shortest
great greater greatest general particular specific certain possible likely unlikely clear simple
complex important significant common usual normal actual real true false similar various single
full empty free open close closed near far among across along around behind beyond inside outside
toward towards upon given based according due despite unless until since although though however
therefore thus hence moreover furthermore nevertheless meanwhile instead rather quite almost nearly
especially particularly generally usually often sometimes always never still yet already soon
later earlier recently currently now then here there everywhere somewhere anywhere nowhere

analysis argument evidence hypothesis method methods conclusion conclusions summary process
processes concept concepts principle principles structure structures system systems approach
approaches perspective perspectives assumption assumptions implication implications outcome outcomes
`.trim().split(/\s+/);

function normalizeEl(word: string): string {
  return word.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

function normalizeEn(word: string): string {
  return word.toLowerCase().replace(/['']/g, "'");
}

function buildSet(words: string[], normalizer: (w: string) => string): Set<string> {
  const set = new Set<string>();
  for (const w of words) {
    const n = normalizer(w);
    if (n.length >= 2) set.add(n);
  }
  return set;
}

let elLexicon = buildSet(GREEK_DOMAIN, normalizeEl);
let enLexicon = buildSet(ENGLISH_DOMAIN, normalizeEn);

export function extendSpellLexicon(terms: string[]): void {
  for (const t of terms) {
    const w = t.trim();
    if (!w) continue;
    if (/\p{Script=Greek}/u.test(w)) elLexicon.add(normalizeEl(w));
    else if (/[A-Za-z]/.test(w)) enLexicon.add(normalizeEn(w));
  }
}

export function resetSpellLexiconForTests(): void {
  elLexicon = buildSet(GREEK_DOMAIN, normalizeEl);
  enLexicon = buildSet(ENGLISH_DOMAIN, normalizeEn);
}

export function detectTokenLang(token: string): SpellLang {
  const hasGreek = /\p{Script=Greek}/u.test(token);
  const hasLatin = /[A-Za-z]/.test(token);
  if (hasGreek && hasLatin) return 'mixed';
  if (hasGreek) return 'el';
  if (hasLatin) return 'en';
  return 'mixed';
}

export function isKnownWord(token: string, lang?: SpellLang): boolean {
  const bare = token.replace(/^[^\p{L}]+|[^\p{L}'’-]+$/gu, '');
  if (!bare || bare.length < 2) return true;
  if (/^\d+([.,]\d+)*$/.test(bare)) return true;

  const resolved = lang ?? detectTokenLang(bare);
  if (resolved === 'el' || (resolved === 'mixed' && /\p{Script=Greek}/u.test(bare))) {
    return elLexicon.has(normalizeEl(bare));
  }
  if (resolved === 'en' || resolved === 'mixed') {
    return enLexicon.has(normalizeEn(bare));
  }
  return true;
}

export function allLexiconWords(lang: SpellLang): string[] {
  if (lang === 'el') return [...elLexicon];
  if (lang === 'en') return [...enLexicon];
  return [...elLexicon, ...enLexicon];
}
