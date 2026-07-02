import type { UploadedFile, GlossaryEntry } from '../types';

/**
 * In-memory demo source material. Seeded only when demo content is enabled so the
 * Study Workspace (Reader, Quiz, Concept Map, RAG agent, etc.) shows real, grounded
 * content instead of an empty "upload your notes" state. Never persisted to the
 * user's real library — injected at runtime alongside the demo courses.
 */

const MICRO_TEXT = `Microeconomics Fundamentals — Lecture Notes

1. Supply and Demand
The law of demand states that, holding everything else constant, the quantity demanded of a good falls as its price rises. The law of supply states the opposite for producers: a higher price raises the quantity supplied. The demand curve slopes downward; the supply curve slopes upward. Market equilibrium occurs where the two curves intersect — at the equilibrium price, the quantity demanded equals the quantity supplied and there is no pressure for the price to change. A surplus appears when price is above equilibrium (quantity supplied exceeds quantity demanded); a shortage appears when price is below equilibrium. Shifts of the whole curve (caused by income, tastes, the price of related goods, expectations, or the number of buyers) must be distinguished from movements along a curve (caused only by a change in the good's own price).

2. Consumer Theory
Consumers are modelled as choosing the bundle of goods that maximises utility subject to a budget constraint. Preferences are assumed to be complete, transitive, and monotonic. An indifference curve connects bundles that give equal satisfaction; its slope is the marginal rate of substitution (MRS), the rate at which a consumer will trade one good for another while staying equally happy. The budget line shows the affordable bundles given income and prices; its slope is the ratio of the two prices. Utility is maximised where the indifference curve is tangent to the budget line, i.e. where MRS equals the price ratio. Diminishing marginal utility explains why indifference curves are convex to the origin.

3. Elasticity
Elasticity measures responsiveness. The price elasticity of demand is the percentage change in quantity demanded divided by the percentage change in price. Demand is elastic when this value exceeds one (quantity responds strongly), inelastic when it is below one, and unit elastic when it equals one. Total revenue rises with a price cut when demand is elastic and falls when demand is inelastic. Determinants of elasticity include the availability of substitutes, whether the good is a necessity or a luxury, the share of income spent on it, and the time horizon. Income elasticity distinguishes normal goods (positive) from inferior goods (negative); cross-price elasticity distinguishes substitutes (positive) from complements (negative).

4. Market Structures
Perfect competition features many small firms selling an identical product, with free entry and exit and perfect information; each firm is a price taker and, in the long run, economic profit is driven to zero. A monopoly is a single seller facing the whole market demand curve; it sets marginal revenue equal to marginal cost and charges a price above marginal cost, creating deadweight loss. Oligopoly is a market with a few interdependent firms. In the Cournot model firms compete by choosing quantities; in the Bertrand model they compete by choosing prices, and with identical products price is driven down to marginal cost — the Bertrand paradox. Monopolistic competition combines many firms with differentiated products.

5. Welfare Economics
Consumer surplus is the difference between what consumers are willing to pay and what they actually pay; producer surplus is the difference between the price received and the minimum a producer would accept. Total surplus is maximised at the competitive equilibrium, which is why that allocation is called efficient. Market failures — externalities, public goods, market power, and asymmetric information — drive a wedge between private and social value and reduce total surplus, providing a rationale for policy intervention.

6. Game Theory Basics
A game describes strategic interaction among players who each choose a strategy and receive a payoff that depends on everyone's choices. A Nash equilibrium is a set of strategies in which no player can do better by unilaterally changing their own strategy. The prisoners' dilemma shows how individually rational choices can lead to a collectively worse outcome: both players defect even though mutual cooperation would make them better off. Dominant strategies, when they exist, are chosen regardless of what the opponent does.`;

const PY_TEXT = `Python for Data Science — Bootcamp Notes

NumPy provides the ndarray, a fast, fixed-type, n-dimensional array. Vectorised operations apply elementwise without explicit Python loops, which is far faster than native lists. Broadcasting lets arrays of different shapes combine in arithmetic: dimensions are compared from the trailing end and are compatible when they are equal or one of them is 1.

pandas builds on NumPy with two core structures: the Series (a labelled 1-D array) and the DataFrame (a labelled 2-D table). Common operations include selection with loc (label-based) and iloc (position-based), filtering with boolean masks, handling missing data with isna/fillna/dropna, and combining tables with merge and concat. The groupby pattern follows split–apply–combine: rows are split into groups, an aggregation (sum, mean, count) is applied to each, and the results are combined into a new table.

Matplotlib draws figures and axes; seaborn provides higher-level statistical plots. A scatter plot reveals relationships between two numeric variables, a histogram shows a distribution, and a box plot summarises spread and outliers. scikit-learn exposes a consistent estimator API: every model implements fit to learn from training data and predict to produce outputs, with a clean train/test split used to estimate generalisation.`;

const PHIL_TEXT = `Intro to Philosophy — Lecture Transcript Excerpts

1. What is Philosophy?
Philosophy is the systematic study of fundamental questions about knowledge, reality, value, and mind, pursued through argument rather than empirical measurement alone. Its main branches are epistemology (the theory of knowledge), metaphysics (the study of what exists), ethics (the study of how we ought to act), and logic (the study of valid inference). Philosophical method centres on making claims explicit, examining the arguments that support them, and testing them with counterexamples and thought experiments.

2. Epistemology
The classical analysis defines knowledge as justified true belief: a subject knows a proposition when the proposition is true, the subject believes it, and the belief is justified. Gettier cases challenge this analysis by describing justified true beliefs that intuitively fail to be knowledge, because the justification and the truth are connected only by luck. Responses add conditions such as reliability (the belief is produced by a truth-conducive process) or safety (the belief could not easily have been false). Scepticism questions whether knowledge is possible at all; foundationalism answers that justification terminates in basic beliefs, while coherentism holds that beliefs are justified by their fit within a coherent system.

3. Ethics
Consequentialism judges actions by their outcomes: an action is right when it produces the best overall consequences, as in utilitarianism, which aims to maximise well-being. Deontology judges actions by rules and duties; Kant's categorical imperative requires acting only on maxims one could will as universal laws, and treating persons as ends rather than mere means. Virtue ethics shifts the question from actions to character, asking what a person with practical wisdom and virtues such as courage and honesty would do. Trolley-style dilemmas expose the tension between maximising good outcomes and respecting duties or rights.

4. Philosophy of Mind
The mind–body problem asks how mental states relate to physical states. Substance dualism holds that mind and body are distinct kinds of things, but struggles to explain their interaction. Physicalism holds that mental states are physical states; identity theory equates them with brain states, while functionalism defines them by their causal roles. The hard problem of consciousness asks why physical processing is accompanied by subjective experience at all, and qualia — the felt qualities of experience — are the standard test case for whether physicalist accounts are complete.`;

export const mockUploadedFiles: UploadedFile[] = [
  {
    id: 'demo-file-c1',
    name: 'Lecture_Notes_Micro.pdf',
    type: 'pdf',
    size: 184_320,
    uploadedAt: '2025-10-15T09:00:00.000Z',
    status: 'analyzed',
    progress: 100,
    courseId: 'c1',
    detectedLanguage: 'en',
    ingestMethod: 'text-layer',
    pipelineVersion: '2.4.0',
    pageCount: 6,
    extractedTopics: [
      'Supply & Demand',
      'Consumer Theory',
      'Elasticity',
      'Market Structures',
      'Welfare Economics',
      'Game Theory Basics',
    ],
    extractedText: MICRO_TEXT,
  },
  {
    id: 'demo-file-c2',
    name: 'DS_Bootcamp_Slides.pptx',
    type: 'pptx',
    size: 142_880,
    uploadedAt: '2025-11-01T09:00:00.000Z',
    status: 'analyzed',
    progress: 100,
    courseId: 'c2',
    detectedLanguage: 'en',
    ingestMethod: 'text-layer',
    pipelineVersion: '2.4.0',
    pageCount: 4,
    extractedTopics: ['NumPy Arrays', 'Pandas DataFrames', 'Data Visualization', 'Machine Learning Intro'],
    extractedText: PY_TEXT,
  },
  {
    id: 'demo-file-c3',
    name: 'Philosophy_Transcripts.pdf',
    type: 'pdf',
    size: 96_256,
    uploadedAt: '2025-11-20T09:00:00.000Z',
    status: 'analyzed',
    progress: 100,
    courseId: 'c3',
    detectedLanguage: 'en',
    ingestMethod: 'text-layer',
    pipelineVersion: '2.4.0',
    pageCount: 4,
    extractedTopics: ['What is Philosophy?', 'Epistemology', 'Ethics', 'Philosophy of Mind'],
    extractedText: PHIL_TEXT,
  },
];

export const mockGlossaryEntries: GlossaryEntry[] = [
  { term: 'Market equilibrium', definition: 'The price and quantity at which quantity demanded equals quantity supplied, so there is no tendency for price to change.', source: 'Lecture_Notes_Micro.pdf', relatedConcepts: ['Supply & Demand', 'Surplus', 'Shortage'], courseId: 'c1' },
  { term: 'Marginal rate of substitution', definition: 'The rate at which a consumer will trade one good for another while remaining equally satisfied; the slope of an indifference curve.', source: 'Lecture_Notes_Micro.pdf', relatedConcepts: ['Consumer Theory', 'Indifference curve', 'Budget constraint'], courseId: 'c1' },
  { term: 'Price elasticity of demand', definition: 'The percentage change in quantity demanded divided by the percentage change in price; demand is elastic when greater than one.', source: 'Lecture_Notes_Micro.pdf', relatedConcepts: ['Elasticity', 'Total revenue'], courseId: 'c1' },
  { term: 'Deadweight loss', definition: 'The reduction in total surplus that results when a market is not at the efficient competitive equilibrium, e.g. under monopoly.', source: 'Lecture_Notes_Micro.pdf', relatedConcepts: ['Welfare Economics', 'Monopoly', 'Market failure'], courseId: 'c1' },
  { term: 'Nash equilibrium', definition: 'A set of strategies where no player can improve their payoff by unilaterally changing their own strategy.', source: 'Lecture_Notes_Micro.pdf', relatedConcepts: ['Game Theory Basics', 'Prisoners dilemma'], courseId: 'c1' },
  { term: 'Bertrand paradox', definition: 'In price competition with identical products, two firms drive price down to marginal cost, eliminating profit despite there being only two sellers.', source: 'Lecture_Notes_Micro.pdf', relatedConcepts: ['Oligopoly', 'Market Structures'], courseId: 'c1' },
  { term: 'Broadcasting', definition: 'NumPy rule that lets arrays of different shapes combine in arithmetic when trailing dimensions are equal or one of them is 1.', source: 'DS_Bootcamp_Slides.pptx', relatedConcepts: ['NumPy Arrays'], courseId: 'c2' },
  { term: 'Split–apply–combine', definition: 'The groupby pattern in pandas: split rows into groups, apply an aggregation to each, and combine the results into a new table.', source: 'DS_Bootcamp_Slides.pptx', relatedConcepts: ['Pandas DataFrames'], courseId: 'c2' },
  { term: 'Justified true belief', definition: 'The classical analysis of knowledge: a subject knows a proposition when it is true, believed, and the belief is justified.', source: 'Philosophy_Transcripts.pdf', relatedConcepts: ['Epistemology', 'Gettier case'], courseId: 'c3' },
  { term: 'Gettier case', definition: 'A scenario in which a belief is justified and true but intuitively fails to be knowledge because the justification and the truth are connected only by luck.', source: 'Philosophy_Transcripts.pdf', relatedConcepts: ['Epistemology', 'Justified true belief'], courseId: 'c3' },
  { term: 'Categorical imperative', definition: "Kant's principle to act only on maxims one could will as universal laws, and to treat persons as ends rather than mere means.", source: 'Philosophy_Transcripts.pdf', relatedConcepts: ['Ethics', 'Deontology'], courseId: 'c3' },
  { term: 'Qualia', definition: 'The felt, subjective qualities of experience — the standard test case for whether physicalist accounts of mind are complete.', source: 'Philosophy_Transcripts.pdf', relatedConcepts: ['Philosophy of Mind', 'Hard problem of consciousness'], courseId: 'c3' },
];
