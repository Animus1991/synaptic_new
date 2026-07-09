/** Design system entry — re-export platform UI primitives. */
export {
  PrimaryCTA,
  SecondaryCTA,
  Page,
  PageHeader,
  Card,
  AnimatedCard,
  TabBar,
  PlatformSection,
  SectionHeading,
  CardLink,
  StatTile,
  platformBento,
  type PlatformTabItem,
} from './primitives';
export { PlatformEmptyState, PlatformEmptyState as EmptyState } from './PlatformEmptyState';
export { StatusChip, type StatusChipVariant } from './StatusChip';
export { ConfirmDialog, type ConfirmDialogProps } from './ConfirmDialog';
export { PostUploadBanner } from './PostUploadBanner';

/** Re-export workspace empty-state helpers for tool panels (§2.7). */
export {
  buildWorkspaceEmptyActions,
  buildWorkspaceEmptyView,
  workspaceEmptyTitle,
  workspaceEmptyUploadHandler,
  workspaceNoSourceMessage,
  workspaceToolEmptyMessage,
  type WorkspaceEmptyAction,
  type WorkspaceEmptyTool,
  type WorkspaceEmptyView,
} from '../../lib/workspaceEmptyState';
export { WorkspaceToolEmptyState } from '../workspace/WorkspaceToolEmptyState';
export { BlueprintSurface } from './BlueprintSurface';
export {
  SectionHeader,
  UxCallout,
  TrustBadgeRow,
  SessionLauncherCard,
  HeroGlow,
  HeaderLangPill,
  DescriptiveStickyTabBar,
} from './platformChrome';
