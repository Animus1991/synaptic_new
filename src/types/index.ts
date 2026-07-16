// Core domain types for Synapse — Adaptive AI Tutoring Platform

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'student' | 'teacher' | 'self-learner' | 'corporate';
  segment: 'university' | 'highschool' | 'selflearner' | 'tutor' | 'company';
  streak: number;
  xp: number;
  level: number;
  joinedAt: string;
  onboardingComplete: boolean;
  settings: UserSettings;
}

export interface UserSettings {
  questionFrequency: 'minimal' | 'moderate' | 'frequent';
  explanationDepth: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  practiceIntensity: 'light' | 'moderate' | 'intense';
  theoryVsPractice: number; // 0=all theory, 100=all practice
  exampleDensity: 'fewer' | 'moderate' | 'many';
  diagramFrequency: 'minimal' | 'moderate' | 'rich';
  teachingStyle: 'socratic' | 'direct' | 'mixed';
  pacing: 'slow' | 'moderate' | 'fast';
  feedbackTone: 'gentle' | 'balanced' | 'strict';
  lessonLength: 'short' | 'medium' | 'long';
  revisionLoops: 'fewer' | 'moderate' | 'more';
  masteryThreshold: number; // 0-100
  challengeLevel: 'low-stress' | 'balanced' | 'high-challenge';
  sourceMode: 'strict' | 'enriched' | 'notes-only';
  language: 'en' | 'el';
  theme: 'dark' | 'light' | 'system' | 'spectrum' | 'blueprint';
  dailyGoalMinutes: number;
  examDate?: string;
  /** Goals selected during onboarding — drives defaults for pacing and task mix. */
  learningGoals?: Array<'exam' | 'understand' | 'review' | 'practice' | 'organize' | 'explore'>;
  /** OpenAI-compatible API key (stored locally). Falls back to VITE_OPENAI_API_KEY. */
  openaiApiKey?: string;
  llmModel?: string;
  llmBaseUrl?: string;
  /** Managed/self-hosted LLM proxy URL (holds the key server-side). */
  llmProxyUrl?: string;
  useLlm?: boolean;
  /**
   * Use the configured vision-capable LLM (the user's own key/subscription) to
   * transcribe scanned pages and handwriting. Dramatically improves Greek
   * handwriting OCR. Defaults to enabled whenever an LLM is available.
   */
  useVisionOcr?: boolean;
  /** Optional override model for vision OCR; defaults to llmModel or gpt-4o-mini. */
  llmVisionModel?: string;
  /** Managed proxy auth token from /auth/login */
  authToken?: string;
  authEmail?: string;
  authProxyBase?: string;
  /** Plan tier from managed proxy (/auth/me). */
  authPlan?: 'free' | 'pro' | 'team';
  /** When true, show seeded demo courses/tasks (MVP showcase). Default: false. */
  showDemoContent?: boolean;
  /** ISO timestamp — activities after this count as unread notifications. */
  notificationsLastSeenAt?: string;
  /** Optional dashboard hero wallpaper (local data URL). */
  dashboardWallpaperDataUrl?: string;
  /** User-defined study milestones shown in hero calendar. */
  personalStudyDates?: PersonalStudyDate[];
}

export type PersonalStudyDate = {
  id: string;
  label: string;
  date: string;
};

export interface UploadedFile {
  id: string;
  name: string;
  type: FileType;
  size: number;
  uploadedAt: string;
  status: 'uploading' | 'processing' | 'analyzed' | 'error';
  progress?: number;
  courseId?: string;
  extractedTopics?: string[];
  extractedText?: string;
  pageCount?: number;
  detectedLanguage?: string;
  /** True when OCR was applied to extract text (scanned PDF / image). */
  ocrUsed?: boolean;
  /** How text was obtained from this file. */
  ingestMethod?: 'text-layer' | 'ocr-server' | 'ocr-client' | 'ocr-ensemble' | 'ocr-vision' | 'paste' | 'youtube' | 'transcript' | 'chatgpt-export' | 'notebooklm-import' | 'notebooklm-chat' | 'notebooklm-audio-transcript';
  /** Pipeline version that processed this file. */
  pipelineVersion?: string;
  /** Server OCR word bounding boxes (percent of page), when available. */
  ocrRegions?: import('../lib/readerOcrOverlay').OcrStoredRegion[];
  /** OCR / repair models that contributed to extraction (e.g. 'trocr-handwritten'). */
  ocrModelsUsed?: string[];
  /** S8 DocumentModel recognition snapshot (text omitted — use extractedText). */
  documentModelSnapshot?: import('../lib/documentModelSnapshot').DocumentModelSnapshot;
  /** Geometry-derived PDF layout blocks (8B-gamma); used during recognition. */
  pdfLayoutBlocks?: import('../lib/pdfLayoutBlocks').PdfLayoutBlockInput[];
  /** Cover page preview metadata; blob in IndexedDB (`thumbnailRef.storageKey`). */
  thumbnailRef?: SourceThumbnailRef;
  thumbnailStatus?: 'pending' | 'ready' | 'failed' | 'unsupported';
}

export type SourceThumbnailRef = {
  storageKey: string;
  pageIndex: number;
  width: number;
  height: number;
  format: 'webp' | 'png';
  pipelineVersion: string;
  generatedAt: string;
  /** L19+ server CDN key (file id) when synced for cross-device preview. */
  cdnKey?: string;
  /** ETag from server upload — cache-bust query param on CDN URL. */
  etag?: string;
};

export type FileType = 'pdf' | 'docx' | 'pptx' | 'txt' | 'md' | 'image' | 'csv' | 'code' | 'youtube' | 'audio' | 'video';

export interface CourseSourceQuality {
  score: number;
  band: 'weak' | 'moderate' | 'strong';
  needsMoreMaterial: boolean;
  warnings: string[];
  strengths: string[];
  nextActions: string[];
  recommendedTopicCount: number;
  detectedTopicCount: number;
  finalTopicCount: number;
  outlineAdjusted: boolean;
  metrics: {
    wordCount: number;
    sectionCount: number;
    definitionCount: number;
    glossaryCount: number;
    keyphraseCount: number;
    workedExampleCount: number;
    formulaCount: number;
    comparisonCount: number;
    averageConceptsPerTopic: number;
    textHygieneScore?: number;
    textCorruptionScore?: number;
    textHygieneFlags?: string[];
  };
}

export interface Course {
  id: string;
  title: string;
  description: string;
  subject: string;
  color: string;
  icon: string;
  totalLessons: number;
  completedLessons: number;
  mastery: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'mixed';
  topics: Topic[];
  createdAt: string;
  lastStudied?: string;
  examDate?: string;
  estimatedHours: number;
  sourceFiles: string[];
  status: 'generating' | 'ready' | 'needs_review' | 'in-progress' | 'completed';
  sourceMode: 'strict' | 'enriched' | 'notes-only';
  conceptCount: number;
  glossaryCount: number;
  exerciseCount: number;
  /** Sentence-level provenance linking concepts to source file spans. */
  conceptSpans?: ConceptSpan[];
  /** Upload/course-generation quality signals derived from the source material. */
  sourceQuality?: CourseSourceQuality;
  /** Typed concept graph + prerequisite DAG powering ordering and locking. */
  conceptGraph?: import('../lib/conceptGraph').ConceptGraph;
  /** Other courses sharing concepts with this material (cross-document links). */
  linkedCourseIds?: string[];
  /** Pipeline lineage for reproducibility. */
  pipelineMeta?: {
    version: string;
    generatedAt: string;
    outlineSource: 'llm' | 'embedding' | 'lexical' | 'fallback' | 'extend';
  };
  /** Aggregated DocumentModel recognition metrics (S8). */
  recognitionSummary?: import('../lib/documentModelSnapshot').RecognitionSummary;
  /** §5.B7 automated quality rubric (S9). */
  qualityReport?: import('../lib/courseQualityGates').CourseQualityReport;
  /** MCP write-tool flashcards (create_flashcard). */
  mcpFlashcards?: Array<{
    id: string;
    front: string;
    back: string;
    createdAt: string;
    source?: 'mcp' | string;
  }>;
  /** MCP write-tool annotations (add_annotation). */
  mcpAnnotations?: Array<{
    id: string;
    text: string;
    note?: string;
    createdAt: string;
    source?: 'mcp' | string;
  }>;
}

/** Maps a course concept to a precise span in uploaded source material. */
export interface ConceptSpan {
  conceptId: string;
  concept: string;
  chunkId: string;
  fileId: string;
  fileName?: string;
  charStart: number;
  charEnd: number;
  sentence?: string;
  page?: number;
  heading?: string;
}

export interface Topic {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
  mastery: number;
  prerequisites: string[];
  order: number;
  isLocked: boolean;
  estimatedMinutes: number;
  conceptCount: number;
  retentionPrediction: number;
  /** Key concepts taught in this topic (from content analysis / LLM). */
  keyConcepts?: string[];
  /** Learning objectives for this topic. */
  objectives?: string[];
}

export interface Lesson {
  id: string;
  title: string;
  type: 'theoretical' | 'practical';
  format: LessonFormat;
  duration: number;
  mastery: number;
  status: 'locked' | 'available' | 'in-progress' | 'completed' | 'review-due';
  xpReward: number;
  concepts: string[];
  difficulty: number;
  nextReviewAt?: string;
  completedAt?: string;
  attempts: number;
  bestScore: number;
}

export type LessonFormat =
  | 'explanation'
  | 'guided-practice'
  | 'interactive-exercise'
  | 'quiz'
  | 'exam-simulation'
  | 'coding-challenge'
  | 'socratic-dialogue'
  | 'recall-exercise'
  | 'diagram-labeling'
  | 'comparison'
  | 'case-study'
  | 'flashcard-review'
  | 'feynman-explanation'
  | 'error-analysis'
  | 'concept-mapping';

export interface Task {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  courseId: string;
  courseName: string;
  courseColor: string;
  courseIcon: string;
  lessonId?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedMinutes: number;
  dueAt?: string;
  scheduledFor?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'skipped';
  xpReward: number;
  isSpacedRepetition: boolean;
  masteryBefore?: number;
  retentionPrediction?: number;
  googleCalendarEventId?: string;
  calendarSyncedAt?: string;
  tags: string[];
  category: 'learn' | 'review' | 'practice' | 'exam' | 'fix';
}

export type TaskType =
  | 'lesson'
  | 'quiz'
  | 'review'
  | 'practice'
  | 'exam-prep'
  | 'flashcards'
  | 'mistake-retry'
  | 'concept-check'
  | 'deep-dive'
  | 'timed-test'
  | 'self-explanation'
  | 'comparison'
  | 'prerequisite-repair'
  | 'oral-exam';

export interface LearnerModel {
  userId: string;
  overallMastery: number;
  totalStudyTime: number;
  totalSessions: number;
  averageSessionLength: number;
  averageConfidence: number;
  retentionRate: number;
  strongAreas: SkillNode[];
  weakAreas: SkillNode[];
  almostKnown: SkillNode[];
  misconceptions: Misconception[];
  learningVelocity: number;
  cognitiveLoadPreference: 'low' | 'medium' | 'high';
  preferredSessionLength: number;
  bestTimeOfDay: string;
  streakDays: number;
  errorPatterns: ErrorPattern[];
  spacingIntervals: SpacingData[];
  confidenceCalibration: ConfidencePoint[];
  retrievalPerformance: number;
  transferAbility: number;
  helpSeekingRate: number;
  persistenceScore: number;
  interactionInsights: string[];
  heatmapData: HeatmapDay[];
  weeklyMastery: number[];
}

export interface SkillNode {
  concept: string;
  courseId: string;
  mastery: number;
  lastPracticed: string;
  retentionPrediction: number;
  practiceCount: number;
  averageResponseTime: number;
  errorRate: number;
}

export interface Misconception {
  id: string;
  concept: string;
  description: string;
  frequency: number;
  corrected: boolean;
  relatedErrors: string[];
  suggestedFix: string;
  detectedAt: string;
}

export interface ErrorPattern {
  type: string;
  frequency: number;
  concepts: string[];
  suggestedRemedy: string;
  category: 'calculation' | 'conceptual' | 'procedural' | 'application' | 'recall';
}

export interface SpacingData {
  concept: string;
  interval: number;
  nextReview: string;
  stability: number;
  difficulty: number;
  reviewCount: number;
}

export interface ConfidencePoint {
  predicted: number;
  actual: number;
  concept: string;
  timestamp: string;
}

export interface MistakeRecord {
  id: string;
  concept: string;
  questionSummary: string;
  wrongAnswer?: string;
  correctAnswer?: string;
  courseId: string;
  createdAt: string;
  resolved: boolean;
}

export type ActivityType =
  | 'lesson_complete'
  | 'quiz_passed'
  | 'quiz_failed'
  | 'review_done'
  | 'streak'
  | 'mastery_up'
  | 'xp_earned'
  | 'mistake_fixed'
  | 'task_complete'
  | 'study_time'
  | 'upload';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  description: string;
  xp?: number;
  timestamp: string;
}

export interface HeatmapDay {
  date: string;
  minutes: number;
  xp: number;
  tasksCompleted: number;
  conceptsReviewed: number;
}

export interface MessageCitation {
  chunkId: string;
  fileId: string;
  fileName: string;
  locator: string;
  charStart: number;
  charEnd: number;
  page?: number;
  heading?: string;
  snippet: string;
}

export interface AgentMessage {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: string;
  type?: 'text' | 'question' | 'hint' | 'feedback' | 'exercise' | 'code' | 'diagram' | 'citation' | 'quiz';
  sourceReference?: string;
  /** Structured, precise citations for "show me where this came from". */
  citations?: MessageCitation[];
  confidence?: number;
  isStreaming?: boolean;
  metadata?: {
    sourceGrounded: boolean;
    enrichmentUsed: boolean;
    inferenceUsed: boolean;
    /** Post-hoc citation overlap check (strict / notes-only). */
    groundingVerified?: boolean;
    groundingCoverage?: number;
    /** Span-level faithfulness score from grounding.ts (0–1). */
    groundingFaithfulness?: number;
    /** Strict-mode span gate outcome (S9). */
    groundingGatePassed?: boolean;
    /** Sentences that failed span verification. */
    ungroundedClaims?: string[];
    /** Per-claim grounding with optional source spans for click-to-source. */
    groundingClaims?: Array<{
      claim: string;
      grounded: boolean;
      score: number;
      source?: { fileId: string; charStart: number; charEnd: number };
    }>;
    /** Retrieval came from server global index vs local BM25/hybrid. */
    globalRag?: boolean;
    /** GraphRAG concept boosting was used on the server. */
    graphRag?: boolean;
    /** Agent slash command that triggered this turn, if any. */
    agentCommand?: 'quiz' | 'explain' | 'compare' | 'summarize';
    /** Low-confidence retrieval — agent should clarify before answering. */
    lowRetrieval?: boolean;
  };
}

export type AgentMode =
  | 'socratic'
  | 'direct'
  | 'beginner'
  | 'exam-coach'
  | 'deep-theory'
  | 'practical'
  | 'error-diagnosis'
  | 'feynman'
  | 'debate'
  | 'oral-exam'
  | 'math-tutor'
  | 'coding-tutor'
  | 'writing-coach'
  | 'memory-coach'
  | 'motivation';

export interface StudySession {
  id: string;
  type: '10min' | '25min' | '50min' | 'cram' | 'review' | 'custom';
  startedAt: string;
  endedAt?: string;
  tasksCompleted: number;
  xpEarned: number;
  conceptsPracticed: string[];
  accuracyRate: number;
}

export interface DashboardStats {
  todayXP: number;
  weeklyXP: number;
  streak: number;
  tasksToday: number;
  tasksCompleted: number;
  reviewsDue: number;
  weakConcepts: number;
  upcomingExams: number;
  studyTimeToday: number;
  studyTimeWeek: number;
  masteryTrend: number[];
  conceptsMastered: number;
  totalConcepts: number;
  antiPassiveAlert: boolean;
}

export interface GlossaryEntry {
  term: string;
  definition: string;
  source: string;
  relatedConcepts: string[];
  courseId: string;
}

export interface ConceptNode {
  id: string;
  label: string;
  mastery: number;
  type: 'concept' | 'formula' | 'definition' | 'theory' | 'example';
  connections: { to: string; relation: string }[];
}

export type AppView = 'landing' | 'onboarding' | 'dashboard' | 'library' | 'tasks' | 'agent' | 'course' | 'lesson' | 'settings' | 'analytics' | 'teacher' | 'student-org' | 'note-analysis';
