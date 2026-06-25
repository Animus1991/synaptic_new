/**
 * First-glance "how to use" guidance for every workspace tool.
 * Complements workspaceToolS20Spine (purpose / learnerProblem) and
 * workspaceToolCrossLinks (next tools) with concrete, new-user-friendly steps.
 *
 * Goal: a brand-new user understands what a tool does, how to use it in 3 steps,
 * and what they will get out of it έΑΦ without hunting.
 */

import type { WorkspaceToolId } from './taskFlows';
import type { BilingualText } from './workspaceToolS20Spine';

export type WorkspaceToolGuide = {
  /** 3 short imperative steps έΑΦ the minimum to be productive. */
  howTo: BilingualText[];
  /** The concrete outcome a learner walks away with. */
  produces: BilingualText;
};

export const WORKSPACE_TOOL_GUIDE: Record<WorkspaceToolId, WorkspaceToolGuide> = {
  reader: {
    howTo: [
      { en: 'Read the source text, section by section.', el: '╬Φ╬╣╬υ╬▓╬▒╧Δ╬╡ ╧Ε╬┐ ╬║╬╡╬ψ╬╝╬╡╬╜╬┐ ╧Α╬╖╬│╬χ╧Γ, ╬╡╬╜╧Ν╧Ε╬╖╧Ε╬▒ ╧Α╧Β╬┐╧Γ ╬╡╬╜╧Ν╧Ε╬╖╧Ε╬▒.' },
      { en: 'Click a highlighted term to see its meaning and focus it everywhere.', el: '╬γ╬υ╬╜╬╡ ╬║╬╗╬╣╬║ ╧Δ╬╡ ╧Ζ╧Α╬┐╬│╧Β╬▒╬╝╬╝╬╣╧Δ╬╝╬φ╬╜╬┐ ╧Ν╧Β╬┐ ╬│╬╣╬▒ ╬╡╧Α╬╡╬╛╬χ╬│╬╖╧Δ╬╖ ╬║╬▒╬╣ ╬╡╧Δ╧Ε╬ψ╬▒╧Δ╬╖ ╧Α╬▒╬╜╧Ε╬┐╧Ξ.' },
      { en: 'Mark passages as understood or confusing to steer your plan.', el: '╬μ╬╖╬╝╬╡╬ψ╧Κ╧Δ╬╡ ╧Δ╬╖╬╝╬╡╬ψ╬▒ ╧Κ╧Γ ╬║╬▒╧Ε╬▒╬╜╬┐╬╖╧Ε╬υ ╬χ ╬╝╧Α╬╡╧Β╬┤╬╡╬╝╬φ╬╜╬▒ ╬│╬╣╬▒ ╬╜╬▒ ╬║╬▒╬╕╬┐╬┤╬╖╬│╬χ╧Δ╬╡╬╣╧Γ ╧Ε╬┐ ╧Α╬╗╬υ╬╜╬┐.' },
    ],
    produces: { en: 'A solid grasp of the original material before you practice.', el: '╬μ╧Ε╬φ╧Β╬╡╬╖ ╬║╬▒╧Ε╬▒╬╜╧Ν╬╖╧Δ╬╖ ╧Ε╬┐╧Ζ ╧Ζ╬╗╬╣╬║╬┐╧Ξ ╧Α╧Β╬╣╬╜ ╧Ε╬╖╬╜ ╬╡╬╛╬υ╧Δ╬║╬╖╧Δ╬╖.' },
  },
  'concept-map': {
    howTo: [
      { en: 'See how concepts connect as a draggable graph.', el: '╬Φ╬╡╧Γ ╧Α╧Ο╧Γ ╧Δ╧Ζ╬╜╬┤╬φ╬┐╬╜╧Ε╬▒╬╣ ╬┐╬╣ ╬φ╬╜╬╜╬┐╬╣╬╡╧Γ ╧Δ╬╡ ╬┤╬╣╬▒╬┤╧Β╬▒╧Δ╧Ε╬╣╬║╧Ν ╬│╧Β╬υ╧Η╬┐.' },
      { en: 'Click a node to focus that concept across every tool.', el: '╬γ╬υ╬╜╬╡ ╬║╬╗╬╣╬║ ╧Δ╬╡ ╬║╧Ν╬╝╬▓╬┐ ╬│╬╣╬▒ ╬╡╧Δ╧Ε╬ψ╬▒╧Δ╬╖ ╧Ε╬╖╧Γ ╬φ╬╜╬╜╬┐╬╣╬▒╧Γ ╧Δ╬╡ ╧Ν╬╗╬▒ ╧Ε╬▒ ╬╡╧Β╬│╬▒╬╗╬╡╬ψ╬▒.' },
      { en: 'Drag nodes to arrange them your way έΑΦ positions are saved.', el: '╬μ╧Ξ╧Β╬╡ ╧Ε╬┐╧Ζ╧Γ ╬║╧Ν╬╝╬▓╬┐╧Ζ╧Γ ╧Ν╧Α╧Κ╧Γ ╬╕╬╡╧Γ έΑΦ ╬┐╬╣ ╬╕╬φ╧Δ╬╡╬╣╧Γ ╬▒╧Α╬┐╬╕╬╖╬║╬╡╧Ξ╬┐╬╜╧Ε╬▒╬╣.' },
    ],
    produces: { en: 'A clear mental model of how the ideas relate.', el: '╬γ╬▒╬╕╬▒╧Β╧Ν ╬╜╬┐╬╖╧Ε╬╣╬║╧Ν ╬╝╬┐╬╜╧Ε╬φ╬╗╬┐ ╬│╬╣╬▒ ╧Ε╬┐ ╧Α╧Ο╧Γ ╧Δ╧Θ╬╡╧Ε╬ψ╬╢╬┐╬╜╧Ε╬▒╬╣ ╬┐╬╣ ╬╣╬┤╬φ╬╡╧Γ.' },
  },
  scratchpad: {
    howTo: [
      { en: 'Write a formula or derivation step by step.', el: '╬Υ╧Β╬υ╧Ι╬╡ ╬φ╬╜╬▒╬╜ ╧Ε╧Ξ╧Α╬┐ ╬χ ╬╝╬╣╬▒ ╧Α╬▒╧Β╬▒╬│╧Κ╬│╬χ ╬▓╬χ╬╝╬▒-╬▓╬χ╬╝╬▒.' },
      { en: 'Assign values to the variables.', el: '╬Φ╧Ο╧Δ╬╡ ╧Ε╬╣╬╝╬φ╧Γ ╧Δ╧Ε╬╣╧Γ ╬╝╬╡╧Ε╬▒╬▓╬╗╬╖╧Ε╬φ╧Γ.' },
      { en: 'Check each line έΑΦ verified math is flagged.', el: '╬Ι╬╗╬╡╬│╬╛╬╡ ╬║╬υ╬╕╬╡ ╬│╧Β╬▒╬╝╬╝╬χ έΑΦ ╧Ε╬▒ ╧Δ╧Κ╧Δ╧Ε╬υ ╬▓╬χ╬╝╬▒╧Ε╬▒ ╬╡╧Α╬╣╧Δ╬╖╬╝╬▒╬ψ╬╜╬┐╬╜╧Ε╬▒╬╣.' },
    ],
    produces: { en: 'Confidence that your working is mathematically correct.', el: '╬μ╬╣╬│╬┐╧Ζ╧Β╬╣╬υ ╧Ν╧Ε╬╣ ╬╖ ╬╗╧Ξ╧Δ╬╖ ╧Δ╬┐╧Ζ ╬╡╬ψ╬╜╬▒╬╣ ╬╝╬▒╬╕╬╖╬╝╬▒╧Ε╬╣╬║╬υ ╧Δ╧Κ╧Δ╧Ε╬χ.' },
  },
  whiteboard: {
    howTo: [
      { en: 'Pick a concept and draw it freely.', el: '╬Φ╬╣╬υ╬╗╬╡╬╛╬╡ ╬╝╬╣╬▒ ╬φ╬╜╬╜╬┐╬╣╬▒ ╬║╬▒╬╣ ╧Δ╧Θ╬╡╬┤╬ψ╬▒╧Δ╬φ ╧Ε╬╖╬╜ ╬╡╬╗╬╡╧Ξ╬╕╬╡╧Β╬▒.' },
      { en: 'Drop concept labels and formulas as stamps.', el: '╬ι╧Β╧Ν╧Δ╬╕╬╡╧Δ╬╡ ╬╡╧Ε╬╣╬║╬φ╧Ε╬╡╧Γ ╬╡╬╜╬╜╬┐╬╣╧Ο╬╜ ╬║╬▒╬╣ ╧Ε╧Ξ╧Α╬┐╧Ζ╧Γ ╧Κ╧Γ ╧Δ╧Η╧Β╬▒╬│╬ψ╬┤╬╡╧Γ.' },
      { en: 'Check coverage έΑΦ see which required labels are still missing.', el: '╬Ι╬╗╬╡╬│╬╛╬╡ ╧Ε╬╖╬╜ ╬║╬υ╬╗╧Ζ╧Ι╬╖ έΑΦ ╬┤╬╡╧Γ ╧Α╬┐╬╣╬╡╧Γ ╬╡╧Ε╬╣╬║╬φ╧Ε╬╡╧Γ ╬╗╬╡╬ψ╧Α╬┐╧Ζ╬╜ ╬▒╬║╧Ν╬╝╬╖.' },
    ],
    produces: { en: 'A diagram that proves you can reconstruct the concept.', el: '╬Ι╬╜╬▒ ╬┤╬╣╬υ╬│╧Β╬▒╬╝╬╝╬▒ ╧Α╬┐╧Ζ ╬▒╧Α╬┐╬┤╬╡╬╣╬║╬╜╧Ξ╬╡╬╣ ╧Ν╧Ε╬╣ ╬▒╬╜╬▒╧Δ╧Ζ╬╜╬╕╬φ╧Ε╬╡╬╣╧Γ ╧Ε╬╖╬╜ ╬φ╬╜╬╜╬┐╬╣╬▒.' },
  },
  leitner: {
    howTo: [
      { en: 'Review the cards that are due today.', el: '╬Χ╧Α╬▒╬╜╬υ╬╗╬▒╬▓╬╡ ╧Ε╬╣╧Γ ╬║╬υ╧Β╧Ε╬╡╧Γ ╧Α╬┐╧Ζ ╬╡╬ψ╬╜╬▒╬╣ ╬│╬╣╬▒ ╧Δ╬χ╬╝╬╡╧Β╬▒.' },
      { en: 'Rate your recall: Again, Hard, Good, or Easy.', el: '╬Τ╬▒╬╕╬╝╬┐╬╗╧Ν╬│╬╖╧Δ╬╡ ╧Ε╬╖╬╜ ╬▒╬╜╬υ╬║╬╗╬╖╧Δ╬╖: ╬η╬▒╬╜╬υ, ╬Φ╧Ξ╧Δ╬║╬┐╬╗╬┐, ╬γ╬▒╬╗╧Ν ╬χ ╬Χ╧Ξ╬║╬┐╬╗╬┐.' },
      { en: 'Cards you struggle with come back sooner.', el: '╬θ╬╣ ╬┤╧Ξ╧Δ╬║╬┐╬╗╬╡╧Γ ╬║╬υ╧Β╧Ε╬╡╧Γ ╬╡╧Α╬▒╬╜╬φ╧Β╧Θ╬┐╬╜╧Ε╬▒╬╣ ╬╜╧Κ╧Β╬ψ╧Ε╬╡╧Β╬▒.' },
    ],
    produces: { en: 'Long-term retention through spaced repetition.', el: '╬ε╬▒╬║╧Β╬┐╧Α╧Β╧Ν╬╕╬╡╧Δ╬╝╬╖ ╧Δ╧Ζ╬│╬║╧Β╬υ╧Ε╬╖╧Δ╬╖ ╬╝╬φ╧Δ╧Κ ╬╡╧Α╬▒╬╜╬υ╬╗╬╖╧Ι╬╖╧Γ ╬╝╬╡ ╬┤╬╣╬▒╧Δ╧Ε╬χ╬╝╬▒╧Ε╬▒.' },
  },
  feynman: {
    howTo: [
      { en: 'Explain the concept in plain words, as if to a beginner.', el: '╬Χ╬╛╬χ╬│╬╖╧Δ╬╡ ╧Ε╬╖╬╜ ╬φ╬╜╬╜╬┐╬╣╬▒ ╬╝╬╡ ╬▒╧Α╬╗╬υ ╬╗╧Ν╬│╬╣╬▒, ╧Δ╬▒╬╜ ╧Δ╬╡ ╬▒╧Β╧Θ╬υ╧Β╬╣╬┐.' },
      { en: 'Get a rubric score on accuracy, simplicity and completeness.', el: '╬ι╬υ╧Β╬╡ ╬▓╬▒╬╕╬╝╬┐╬╗╬┐╬│╬ψ╬▒ rubric ╬│╬╣╬▒ ╬▒╬║╧Β╬ψ╬▓╬╡╬╣╬▒, ╬▒╧Α╬╗╧Ν╧Ε╬╖╧Ε╬▒ ╬║╬▒╬╣ ╧Α╬╗╬╖╧Β╧Ν╧Ε╬╖╧Ε╬▒.' },
      { en: 'Export the rubric report (HTML or PDF) and fix gaps it finds.', el: '╬Χ╬╛╬χ╬│╬▒╬│╬╡ ╧Ε╬╖╬╜ ╬▒╬╜╬▒╧Η╬┐╧Β╬υ rubric (HTML ╬χ PDF) ╬║╬▒╬╣ ╬┤╬╣╧Ν╧Β╬╕╧Κ╧Δ╬╡ ╧Ε╬▒ ╬║╬╡╬╜╬υ.' },
    ],
    produces: { en: 'Real understanding you can actually put into words.', el: '╬ι╧Β╬▒╬│╬╝╬▒╧Ε╬╣╬║╬χ ╬║╬▒╧Ε╬▒╬╜╧Ν╬╖╧Δ╬╖ ╧Α╬┐╧Ζ ╬╝╧Α╬┐╧Β╬╡╬ψ╧Γ ╬╜╬▒ ╬┤╬╣╬▒╧Ε╧Ζ╧Α╧Ο╧Δ╬╡╬╣╧Γ.' },
  },
  quiz: {
    howTo: [
      { en: 'Answer each active-recall question.', el: '╬Σ╧Α╬υ╬╜╧Ε╬╖╧Δ╬╡ ╧Δ╬╡ ╬║╬υ╬╕╬╡ ╬╡╧Β╧Ο╧Ε╬╖╧Δ╬╖ active recall.' },
      { en: 'Rate how confident you were.', el: '╬Τ╬▒╬╕╬╝╬┐╬╗╧Ν╬│╬╖╧Δ╬╡ ╧Α╧Ν╧Δ╬┐ ╧Δ╬ψ╬│╬┐╧Ζ╧Β╬┐╧Γ ╬χ╧Δ╬┐╧Ζ╬╜.' },
      { en: 'Review wrong answers against the source.', el: '╬Φ╬╡╧Γ ╧Ε╬╣╧Γ ╬╗╬υ╬╕╬┐╧Γ ╬▒╧Α╬▒╬╜╧Ε╬χ╧Δ╬╡╬╣╧Γ ╧Δ╬╡ ╧Δ╧Θ╬φ╧Δ╬╖ ╬╝╬╡ ╧Ε╬╖╬╜ ╧Α╬╖╬│╬χ.' },
    ],
    produces: { en: 'Proof of what you truly remember vs. only recognize.', el: '╬Σ╧Α╧Ν╬┤╬╡╬╣╬╛╬╖ ╬│╬╣╬▒ ╧Ε╬┐ ╧Ε╬╣ ╬╕╧Ζ╬╝╬υ╧Δ╬▒╬╣ ╧Α╧Β╬▒╬│╬╝╬▒╧Ε╬╣╬║╬υ ╬║╬╣ ╧Ν╧Θ╬╣ ╬▒╧Α╬╗╧Ο╧Γ ╬▒╬╜╬▒╬│╬╜╧Κ╧Β╬ψ╬╢╬╡╬╣╧Γ.' },
  },
  simulator: {
    howTo: [
      { en: 'Adjust the input parameters with the sliders.', el: '╬κ╧Ξ╬╕╬╝╬╣╧Δ╬╡ ╧Ε╬╣╧Γ ╧Α╬▒╧Β╬▒╬╝╬φ╧Ε╧Β╬┐╧Ζ╧Γ ╬╡╬╣╧Δ╧Ν╬┤╬┐╧Ζ ╬╝╬╡ ╧Ε╬┐╧Ζ╧Γ sliders.' },
      { en: 'Watch the outputs and sensitivity update live.', el: '╬Φ╬╡╧Γ ╧Ε╬▒ ╬▒╧Α╬┐╧Ε╬╡╬╗╬φ╧Δ╬╝╬▒╧Ε╬▒ ╬║╬▒╬╣ ╧Ε╬╖╬╜ ╬╡╧Ζ╬▒╬╣╧Δ╬╕╬╖╧Δ╬ψ╬▒ ╬╜╬▒ ╬╡╬╜╬╖╬╝╬╡╧Β╧Ο╬╜╬┐╬╜╧Ε╬▒╬╣ ╬╢╧Κ╬╜╧Ε╬▒╬╜╬υ.' },
      { en: 'Test "what-if" scenarios against your notes.', el: '╬Φ╬┐╬║╬ψ╬╝╬▒╧Δ╬╡ ╧Δ╬╡╬╜╬υ╧Β╬╣╬▒ "╧Ε╬╣-╬▒╬╜" ╧Δ╬╡ ╧Δ╧Θ╬φ╧Δ╬╖ ╬╝╬╡ ╧Ε╬╣╧Γ ╧Δ╬╖╬╝╬╡╬╣╧Ο╧Δ╬╡╬╣╧Γ ╧Δ╬┐╧Ζ.' },
    ],
    produces: { en: 'Intuition for how each variable drives the result.', el: '╬Φ╬╣╬▒╬ψ╧Δ╬╕╬╖╧Δ╬╖ ╬│╬╣╬▒ ╧Ε╬┐ ╧Α╧Ο╧Γ ╬║╬υ╬╕╬╡ ╬╝╬╡╧Ε╬▒╬▓╬╗╬╖╧Ε╬χ ╬╡╧Α╬╖╧Β╬╡╬υ╬╢╬╡╬╣ ╧Ε╬┐ ╬▒╧Α╬┐╧Ε╬φ╬╗╬╡╧Δ╬╝╬▒.' },
  },
  compare: {
    howTo: [
      { en: 'Pick two related concepts.', el: '╬Φ╬╣╬υ╬╗╬╡╬╛╬╡ ╬┤╧Ξ╬┐ ╧Δ╧Θ╬╡╧Ε╬╣╬║╬φ╧Γ ╬φ╬╜╬╜╬┐╬╣╬╡╧Γ.' },
      { en: 'See them side by side across key dimensions.', el: '╬Φ╬╡╧Γ ╧Ε╬╡╧Γ ╬┤╬ψ╧Α╬╗╬▒-╬┤╬ψ╧Α╬╗╬▒ ╧Δ╧Ε╬╣╧Γ ╬▓╬▒╧Δ╬╣╬║╬φ╧Γ ╬┤╬╣╬▒╧Δ╧Ε╬υ╧Δ╬╡╬╣╧Γ.' },
      { en: 'Study the differences that trip you up.', el: '╬ε╬╡╬╗╬φ╧Ε╬╖╧Δ╬╡ ╧Ε╬╣╧Γ ╬┤╬╣╬▒╧Η╬┐╧Β╬φ╧Γ ╧Α╬┐╧Ζ ╧Δ╬╡ ╬╝╧Α╬╡╧Β╬┤╬╡╧Ξ╬┐╧Ζ╬╜.' },
    ],
    produces: { en: 'Clear separation of easily-confused terms.', el: '╬γ╬▒╬╕╬▒╧Β╧Ν╧Γ ╬┤╬╣╬▒╧Θ╧Κ╧Β╬╣╧Δ╬╝╧Ν╧Γ ╬╡╧Ξ╬║╬┐╬╗╬▒ ╬╝╧Α╬╡╧Β╬┤╬╡╬╝╬φ╬╜╧Κ╬╜ ╧Ν╧Β╧Κ╬╜.' },
  },
  debate: {
    howTo: [
      { en: 'Pick a claim from your material.', el: '╬Φ╬╣╬υ╬╗╬╡╬╛╬╡ ╬φ╬╜╬▒╬╜ ╬╣╧Δ╧Θ╧Ζ╧Β╬╣╧Δ╬╝╧Ν ╬▒╧Α╧Ν ╧Ε╬┐ ╧Ζ╬╗╬╣╬║╧Ν ╧Δ╬┐╧Ζ.' },
      { en: 'Read its support and the counter-arguments.', el: '╬Φ╬╣╬υ╬▓╬▒╧Δ╬╡ ╧Ε╬╖╬╜ ╧Ε╬╡╬║╬╝╬╖╧Β╬ψ╧Κ╧Δ╬╖ ╬║╬▒╬╣ ╧Ε╬▒ ╬▒╬╜╧Ε╬╡╧Α╬╣╧Θ╬╡╬╣╧Β╬χ╬╝╬▒╧Ε╬▒.' },
      { en: 'Write your own rebuttal έΑΦ it is saved.', el: '╬Υ╧Β╬υ╧Ι╬╡ ╧Ε╬╖ ╬┤╬╣╬║╬χ ╧Δ╬┐╧Ζ ╬▒╬╜╧Ε╬ψ╬║╧Β╬┐╧Ζ╧Δ╬╖ έΑΦ ╬▒╧Α╬┐╬╕╬╖╬║╬╡╧Ξ╬╡╧Ε╬▒╬╣.' },
    ],
    produces: { en: 'Understanding that survives challenge, not just recall.', el: '╬γ╬▒╧Ε╬▒╬╜╧Ν╬╖╧Δ╬╖ ╧Α╬┐╧Ζ ╬▒╬╜╧Ε╬φ╧Θ╬╡╬╣ ╧Δ╧Ε╬╖╬╜ ╬▒╬╝╧Η╬╣╧Δ╬▓╬χ╧Ε╬╖╧Δ╬╖, ╧Ν╧Θ╬╣ ╬▒╧Α╬╗╬χ ╬▒╬╜╬υ╬║╬╗╬╖╧Δ╬╖.' },
  },
  timer: {
    howTo: [
      { en: 'Set a focus goal and pick a preset.', el: '╬Ν╧Β╬╣╧Δ╬╡ ╧Δ╧Ε╧Ν╧Θ╬┐ ╬╡╧Δ╧Ε╬ψ╬▒╧Δ╬╖╧Γ ╬║╬▒╬╣ ╬┤╬╣╬υ╬╗╬╡╬╛╬╡ preset.' },
      { en: 'Study until the timer ends.', el: '╬ε╬╡╬╗╬φ╧Ε╬╖╧Δ╬╡ ╬╝╬φ╧Θ╧Β╬╣ ╬╜╬▒ ╬╗╬χ╬╛╬╡╬╣ ╧Ε╬┐ ╧Θ╧Β╬┐╬╜╧Ν╬╝╬╡╧Ε╧Β╬┐.' },
      { en: 'Log a quick reflection έΑΦ minutes feed your analytics.', el: '╬γ╬▒╧Ε╬υ╬│╧Β╬▒╧Ι╬╡ ╬φ╬╜╬▒╬╜ ╧Δ╧Ξ╬╜╧Ε╬┐╬╝╬┐ ╬▒╬╜╬▒╧Δ╧Ε╬┐╧Θ╬▒╧Δ╬╝╧Ν έΑΦ ╧Ε╬▒ ╬╗╬╡╧Α╧Ε╬υ ╧Ε╧Β╬┐╧Η╬┐╬┤╬┐╧Ε╬┐╧Ξ╬╜ ╧Ε╬▒ analytics.' },
    ],
    produces: { en: 'Focused sessions with measured, exam-ready pacing.', el: '╬Χ╧Δ╧Ε╬╣╬▒╧Δ╬╝╬φ╬╜╬╡╧Γ ╧Δ╧Ζ╬╜╬╡╬┤╧Β╬ψ╬╡╧Γ ╬╝╬╡ ╬╝╬╡╧Ε╧Β╬╖╬╝╬φ╬╜╬┐ ╧Β╧Ζ╬╕╬╝╧Ν ╬╡╬╛╬φ╧Ε╬▒╧Δ╬╖╧Γ.' },
  },
  annotations: {
    howTo: [
      { en: 'Highlight passages in the source.', el: '╬ξ╧Α╬┐╬│╧Β╬υ╬╝╬╝╬╣╧Δ╬╡ ╬▒╧Α╬┐╧Δ╧Α╬υ╧Δ╬╝╬▒╧Ε╬▒ ╧Δ╧Ε╬╖╬╜ ╧Α╬╖╬│╬χ.' },
      { en: 'Add a margin note or pin.', el: '╬ι╧Β╧Ν╧Δ╬╕╬╡╧Δ╬╡ ╧Δ╬╖╬╝╬╡╬ψ╧Κ╧Δ╬╖ ╧Α╬╡╧Β╬╣╬╕╧Κ╧Β╬ψ╬┐╧Ζ ╬χ pin.' },
      { en: 'Revisit your marks any time έΑΦ they survive reprocessing.', el: '╬Φ╬╡╧Γ ╬╛╬▒╬╜╬υ ╧Ε╬╣╧Γ ╧Δ╬╖╬╝╬╡╬╣╧Ο╧Δ╬╡╬╣╧Γ ╧Δ╬┐╧Ζ έΑΦ ╬╡╧Α╬╣╬▓╬╣╧Ο╬╜╬┐╧Ζ╬╜ ╬╝╬╡╧Ε╬υ ╧Ε╬╖╬╜ ╬╡╧Α╬▒╬╜╬╡╧Α╬╡╬╛╬╡╧Β╬│╬▒╧Δ╬ψ╬▒.' },
    ],
    produces: { en: 'A personal layer of marks anchored to the material.', el: '╬Ι╬╜╬▒ ╧Α╧Β╬┐╧Δ╧Κ╧Α╬╣╬║╧Ν ╧Δ╧Ε╧Β╧Ο╬╝╬▒ ╧Δ╬╖╬╝╬╡╬╣╧Ο╧Δ╬╡╧Κ╬╜ ╧Α╬υ╬╜╧Κ ╧Δ╧Ε╬┐ ╧Ζ╬╗╬╣╬║╧Ν.' },
  },
  dashboard: {
    howTo: [
      { en: 'See your mastery and weak spots at a glance.', el: '╬Φ╬╡╧Γ ╧Ε╬╖╬╜ ╬║╧Ζ╧Β╬╣╬▒╧Β╧Θ╬ψ╬▒ ╬║╬▒╬╣ ╧Ε╬▒ ╬▒╬┤╧Ξ╬╜╬▒╬╝╬▒ ╧Δ╬╖╬╝╬╡╬ψ╬▒ ╬╝╬╡ ╬╝╬╣╬▒ ╬╝╬▒╧Ε╬╣╬υ.' },
      { en: 'Read what changed in this session.', el: '╬Φ╬╡╧Γ ╧Ε╬╣ ╬υ╬╗╬╗╬▒╬╛╬╡ ╧Δ╬╡ ╬▒╧Ζ╧Ε╬χ ╧Ε╬╖ ╧Δ╧Ζ╬╜╬╡╬┤╧Β╬ψ╬▒.' },
      { en: 'Follow the recommended next action.', el: '╬Σ╬║╬┐╬╗╬┐╧Ξ╬╕╬╖╧Δ╬╡ ╧Ε╬╖╬╜ ╧Α╧Β╬┐╧Ε╬╡╬╣╬╜╧Ν╬╝╬╡╬╜╬╖ ╬╡╧Α╧Ν╬╝╬╡╬╜╬╖ ╬╡╬╜╬φ╧Β╬│╬╡╬╣╬▒.' },
    ],
    produces: { en: 'Always knowing what to study next, and why.', el: '╬ζ╬▒ ╬╛╬φ╧Β╬╡╬╣╧Γ ╧Α╬υ╬╜╧Ε╬▒ ╧Ε╬╣ ╬╜╬▒ ╬╝╬╡╬╗╬╡╧Ε╬χ╧Δ╬╡╬╣╧Γ ╬╝╬╡╧Ε╬υ, ╬║╬▒╬╣ ╬│╬╣╬▒╧Ε╬ψ.' },
  },
};

export function getToolGuide(toolId: WorkspaceToolId): WorkspaceToolGuide {
  return WORKSPACE_TOOL_GUIDE[toolId];
}

export function toolHowToSteps(toolId: WorkspaceToolId, lang: 'en' | 'el'): string[] {
  return WORKSPACE_TOOL_GUIDE[toolId].howTo.map((s) => (lang === 'el' ? s.el : s.en));
}

export function toolProduces(toolId: WorkspaceToolId, lang: 'en' | 'el'): string {
  const p = WORKSPACE_TOOL_GUIDE[toolId].produces;
  return lang === 'el' ? p.el : p.en;
}
