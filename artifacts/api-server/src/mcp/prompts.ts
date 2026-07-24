/**
 * MCP prompts — reusable study prompt templates the AI client can surface to
 * the user. Each prompt returns messages that instruct the assistant to use the
 * Synapse tools (list_courses, search_library, get_progress, generate_quiz) so
 * answers stay grounded in the user's own material.
 */
import type { McpContext } from './types';

export interface McpPromptArgument {
  name: string;
  description: string;
  required: boolean;
}

export interface McpPromptDefinition {
  name: string;
  description: string;
  arguments: McpPromptArgument[];
}

export interface McpPromptMessage {
  role: 'user' | 'assistant';
  content: { type: 'text'; text: string };
}

export interface McpPromptResult {
  description: string;
  messages: McpPromptMessage[];
}

export const MCP_PROMPTS: McpPromptDefinition[] = [
  {
    name: 'study_plan',
    description: 'Create a personalized study plan for a course using your progress and weak areas.',
    arguments: [
      { name: 'courseId', description: 'The course to plan for (from list_courses).', required: true },
      { name: 'daysToExam', description: 'Optional number of days until the exam.', required: false },
    ],
  },
  {
    name: 'explain_weak_areas',
    description: 'Explain your weakest topics in a course, grounded in your own notes.',
    arguments: [
      { name: 'courseId', description: 'The course to analyze.', required: true },
    ],
  },
  {
    name: 'quiz_me',
    description: 'Run a grounded quiz session on a topic or course.',
    arguments: [
      { name: 'courseId', description: 'Course to quiz on.', required: false },
      { name: 'topic', description: 'Optional topic focus.', required: false },
      { name: 'count', description: 'Number of questions.', required: false },
    ],
  },
];

const PROMPT_MAP = new Map(MCP_PROMPTS.map((p) => [p.name, p]));

function arg(args: Record<string, unknown>, key: string): string {
  const v = args[key];
  return typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '';
}

function userMessage(text: string): McpPromptMessage {
  return { role: 'user', content: { type: 'text', text } };
}

export function listPrompts(): McpPromptDefinition[] {
  return MCP_PROMPTS;
}

export function getPrompt(
  name: string,
  args: Record<string, unknown>,
  _ctx: McpContext,
): McpPromptResult | { error: string } {
  const def = PROMPT_MAP.get(name);
  if (!def) return { error: `Unknown prompt: ${name}` };

  const missing = def.arguments.filter((a) => a.required && !arg(args, a.name));
  if (missing.length > 0) {
    return { error: `Missing required argument(s): ${missing.map((m) => m.name).join(', ')}` };
  }

  const courseId = arg(args, 'courseId');
  const topic = arg(args, 'topic');
  const count = arg(args, 'count') || '10';
  const daysToExam = arg(args, 'daysToExam');

  switch (name) {
    case 'study_plan':
      return {
        description: def.description,
        messages: [
          userMessage(
            `Build me a study plan for my Synapse course (courseId="${courseId}").` +
              (daysToExam ? ` I have ${daysToExam} days until the exam.` : '') +
              '\n\nSteps:\n' +
              '1. Call get_course_outline and get_progress for this course.\n' +
              '2. Identify weak topics (mastery < 0.5) and lessons not yet completed.\n' +
              '3. Produce a day-by-day plan that front-loads weak topics and schedules spaced review.\n' +
              '4. For each study block, suggest the Synapse tool to use (reader, flashcards, quiz).\n' +
              'Only rely on my own material — do not invent content.',
          ),
        ],
      };
    case 'explain_weak_areas':
      return {
        description: def.description,
        messages: [
          userMessage(
            `Explain my weakest topics in course "${courseId}".\n\n` +
              '1. Call get_progress (courseId) to find topics with the lowest mastery.\n' +
              '2. For each weak topic, call search_library to pull the relevant passages from MY notes.\n' +
              '3. Explain each weak topic clearly, citing the source passages, and give one worked example.\n' +
              'Do not use outside knowledge that contradicts my notes.',
          ),
        ],
      };
    case 'quiz_me':
      return {
        description: def.description,
        messages: [
          userMessage(
            `Quiz me${topic ? ` on "${topic}"` : ''}${courseId ? ` from course "${courseId}"` : ''}.\n\n` +
              `1. Call generate_quiz with count=${count}${courseId ? `, courseId="${courseId}"` : ''}${
                topic ? `, topic="${topic}"` : ''
              }.\n` +
              '2. Ask me the questions one at a time, wait for my answer, then reveal the correct answer with the explanation.\n' +
              '3. At the end, summarize which concepts I should review and offer to create flashcards for my mistakes.',
          ),
        ],
      };
    default:
      return { error: `Unknown prompt: ${name}` };
  }
}
