import { createContext, useContext, type ReactNode } from 'react';
import type { WorkspaceEmptyAction, WorkspaceEmptyTool } from '../../lib/workspaceEmptyState';

type Value = {
  resolve: (tool: WorkspaceEmptyTool) => WorkspaceEmptyAction[];
};

const WorkspaceEmptyActionsContext = createContext<Value | null>(null);

export function WorkspaceEmptyActionsProvider({
  resolve,
  children,
}: Value & { children: ReactNode }) {
  return (
    <WorkspaceEmptyActionsContext.Provider value={{ resolve }}>
      {children}
    </WorkspaceEmptyActionsContext.Provider>
  );
}

export function useWorkspaceEmptyActions(tool: WorkspaceEmptyTool): WorkspaceEmptyAction[] {
  const ctx = useContext(WorkspaceEmptyActionsContext);
  return ctx?.resolve(tool) ?? [];
}
