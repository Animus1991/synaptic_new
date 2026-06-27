/**
 * Phase B — lazy code-split registry for workspace tool panels.
 * Reader & concept-map lazy-loaded; prefetch on workspace mount (B3).
 */

import { lazyWithRetry } from './lazyWithRetry';

export const LazyCognitiveReader = lazyWithRetry(
  () => import('../components/workspace/CognitiveReader').then((m) => ({ default: m.CognitiveReader })),
  'workspace-tool-reader',
);

export const LazyDraggableConceptMap = lazyWithRetry(
  () => import('../components/workspace/DraggableConceptMap').then((m) => ({ default: m.DraggableConceptMap })),
  'workspace-tool-concept-map',
);

export const LazyWhiteboardPanel = lazyWithRetry(
  () => import('../components/workspace/WhiteboardPanel').then((m) => ({ default: m.WhiteboardPanel })),
  'workspace-tool-whiteboard',
);

export const LazyDashboardPanel = lazyWithRetry(
  () => import('../components/workspace/DashboardPanel').then((m) => ({ default: m.DashboardPanel })),
  'workspace-tool-dashboard',
);

export const LazyLeitnerPanel = lazyWithRetry(
  () => import('../components/workspace/LeitnerPanel').then((m) => ({ default: m.LeitnerPanel })),
  'workspace-tool-leitner',
);

export const LazyTimerPanel = lazyWithRetry(
  () => import('../components/workspace/TimerPanel').then((m) => ({ default: m.TimerPanel })),
  'workspace-tool-timer',
);

export const LazySimulatorPanel = lazyWithRetry(
  () => import('../components/workspace/SimulatorPanel').then((m) => ({ default: m.SimulatorPanel })),
  'workspace-tool-simulator',
);

export const LazyComparePanel = lazyWithRetry(
  () => import('../components/workspace/ComparePanel').then((m) => ({ default: m.ComparePanel })),
  'workspace-tool-compare',
);

export const LazyDebatePanel = lazyWithRetry(
  () => import('../components/workspace/DebatePanel').then((m) => ({ default: m.DebatePanel })),
  'workspace-tool-debate',
);

export const LazyFeynmanCheck = lazyWithRetry(
  () => import('../components/workspace/FeynmanCheck').then((m) => ({ default: m.FeynmanCheck })),
  'workspace-tool-feynman',
);

export const LazyAnnotationOverlay = lazyWithRetry(
  () => import('../components/workspace/AnnotationOverlay').then((m) => ({ default: m.AnnotationOverlay })),
  'workspace-tool-annotations',
);

export const LazyQuizPanel = lazyWithRetry(
  () => import('../components/workspace/QuizPanel').then((m) => ({ default: m.QuizPanel })),
  'workspace-tool-quiz',
);

export const LazyWorkspaceDiscoverabilityPanel = lazyWithRetry(
  () => import('../components/workspace/WorkspaceDiscoverabilityPanel').then((m) => ({ default: m.WorkspaceDiscoverabilityPanel })),
  'workspace-intel-discover',
);

export const LazyConceptBusPanel = lazyWithRetry(
  () => import('../components/workspace/ConceptBusPanel').then((m) => ({ default: m.ConceptBusPanel })),
  'workspace-intel-concept-bus',
);

export const LazyWeakAreasFocusRail = lazyWithRetry(
  () => import('../components/workspace/WeakAreasFocusRail').then((m) => ({ default: m.WeakAreasFocusRail })),
  'workspace-intel-weak-areas',
);
