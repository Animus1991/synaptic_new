import type { WorkspaceToolId } from '../../../lib/taskFlows';
import type { Course, GlossaryEntry, LearnerModel, Task, UploadedFile, UserSettings } from '../../../types';
import type { WorkspaceFocus } from '../../../lib/workspaceFocus';
import type { OpenAgentFromWorkspaceOpts } from '../../../lib/agentWorkspaceContext';
import type { WorkspaceLiveSync } from '../../../lib/workspaceStoreSpine';
import type { SourceHighlight } from '../../../lib/conceptProvenance';
import type { FsrsRating } from '../../../lib/pedagogy';

export type WorkspaceTool = WorkspaceToolId;
export type LayoutMode = 'split' | 'focus-lesson' | 'focus-tool' | 'zen';

export interface StudyWorkspaceProps {
  onClose: () => void;
  onOpenAgent: () => void;
  onOpenAgentWithPrompt?: (opts: OpenAgentFromWorkspaceOpts) => void;
  onComplete?: () => void;
  taskTitle?: string;
  courseName?: string;
  quizConcept?: string;
  xpReward?: number;
  initialTool?: WorkspaceTool;
  taskId?: string | null;
  learnerModel?: LearnerModel;
  dashboardStats?: { streak: number; reviewsDue: number; studyTimeToday?: number; studyTimeWeek?: number };
  conceptBars?: { concept: string; mastery: number }[];
  uploadedFiles?: UploadedFile[];
  glossaryEntries?: GlossaryEntry[];
  courses?: Course[];
  courseId?: string;
  onUpload?: () => void;
  onReuploadMaterial?: () => void;
  onReprocessMaterial?: () => boolean | void;
  reprocessingMaterial?: boolean;
  onQuizAttempt?: (concept: string, correct: boolean, confidence: number, stepKey?: string) => void;
  onLeitnerRate?: (concept: string, rating: FsrsRating) => void;
  onLogStudyMinutes?: (minutes: number, label?: string) => void;
  onStartTask?: (taskId: string) => void;
  tasks?: Task[];
  userSettings?: UserSettings;
  openSourceAt?: (highlight: SourceHighlight) => void;
  clearSourceHighlight?: () => void;
  sourceHighlight?: SourceHighlight | null;
  workspaceFocus?: WorkspaceFocus | null;
  setWorkspaceFocus?: (f: WorkspaceFocus | null) => void;
  onConceptBusDirty?: () => void;
  onWorkspaceLiveSync?: (live: WorkspaceLiveSync) => void;
  agentSplit?: boolean;
  workspaceOpenTool?: WorkspaceToolId | null;
  onConsumeWorkspaceOpenTool?: () => void;
}

export const AVAILABLE_TOOLS: WorkspaceTool[] = [
  'reader', 'concept-map', 'scratchpad', 'whiteboard', 'leitner',
  'feynman', 'quiz', 'simulator', 'compare', 'debate', 'timer', 'annotations', 'dashboard'
];
