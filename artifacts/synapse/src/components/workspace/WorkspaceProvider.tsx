import { createContext, useContext, type ReactNode } from 'react';

export type WorkspaceContextValue = {
  progressKey: string;
  lang: 'en' | 'el';
  courseId?: string;
  hasSource: boolean;
  pipelineVersion?: string;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

type Props = WorkspaceContextValue & { children: ReactNode };

/** Phase B foundation — shared session context to reduce prop drilling in tool leaves. */
export function WorkspaceProvider({ children, ...value }: Props) {
  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspaceContext(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error('useWorkspaceContext must be used within WorkspaceProvider');
  }
  return ctx;
}

/** Safe accessor for components that may render outside the provider during migration. */
export function useWorkspaceContextOptional(): WorkspaceContextValue | null {
  return useContext(WorkspaceContext);
}
