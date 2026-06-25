/** Payload sent from Formula Scratchpad → Study Whiteboard. */
export type ScratchpadExport = {
  id: string;
  name: string;
  formula: string;
  /** Latest step-by-step solution lines (if computed). */
  steps?: string[];
  /** Variable values at time of export (for board reference). */
  variables?: { symbol: string; value: string; unit: string }[];
};
