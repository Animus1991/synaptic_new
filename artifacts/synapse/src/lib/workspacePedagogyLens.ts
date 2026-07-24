import type { WorkspaceToolId } from './taskFlows';

export type WorkspacePedagogyLens = 'theory' | 'balanced' | 'practice';

export function defaultPedagogyLens(theoryVsPractice: number): WorkspacePedagogyLens {
  if (theoryVsPractice <= 35) return 'theory';
  if (theoryVsPractice >= 65) return 'practice';
  return 'balanced';
}

export function recommendedToolForPedagogyLens(lens: WorkspacePedagogyLens): WorkspaceToolId {
  if (lens === 'practice') return 'quiz';
  if (lens === 'theory') return 'reader';
  return 'reader';
}

export function pedagogyLensPrefersSplit(lens: WorkspacePedagogyLens): boolean {
  return lens === 'practice';
}
