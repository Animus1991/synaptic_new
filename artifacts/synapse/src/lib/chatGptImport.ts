/**
 * ChatGPT export import — ordered message extraction with User:/Assistant: labels.
 * Ported from AI Organizer ChatGPTParser + chatgpt-organizer-java ChatGptParserService.
 */

import JSZip from 'jszip';

export interface ChatGptMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp?: number;
}

export interface ChatGptConversation {
  id: string;
  title: string;
  messages: ChatGptMessage[];
}

export interface ChatGptImportResult {
  text: string;
  conversations: ChatGptConversation[];
  warnings: string[];
}

interface ChatGptNode {
  message?: {
    author?: { role?: string; name?: string };
    content?: { content_type?: string; parts?: unknown[]; text?: string } | string;
    create_time?: number;
  };
  children?: string[];
}

interface ChatGptConversationRaw {
  title?: string;
  create_time?: number;
  update_time?: number;
  mapping?: Record<string, ChatGptNode>;
  conversation_id?: string;
  messages?: { author?: { role?: string }; content?: { parts?: string[] } | string }[];
}

function roleLabel(role: ChatGptMessage['role']): string {
  switch (role) {
    case 'user': return 'User';
    case 'assistant': return 'Assistant';
    case 'system': return 'System';
    case 'tool': return 'Tool';
    default: return 'Assistant';
  }
}

/** Format messages with speaker labels for textSegmentation conversation detection. */
export function formatConversationWithLabels(messages: ChatGptMessage[]): string {
  const parts: string[] = [];
  for (const msg of messages) {
    const body = msg.content.trim();
    if (!body) continue;
    parts.push(`${roleLabel(msg.role)}: ${body}`);
  }
  return parts.join('\n\n');
}

export function isLikelyChatGptExportJson(parsed: unknown): boolean {
  if (!parsed || typeof parsed !== 'object') return false;
  if (Array.isArray(parsed)) {
    return parsed.some((item) => isLikelyChatGptConversation(item));
  }
  return isLikelyChatGptConversation(parsed);
}

function isLikelyChatGptConversation(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false;
  const c = obj as ChatGptConversationRaw;
  if (c.mapping && typeof c.mapping === 'object') return true;
  if (Array.isArray(c.messages) && c.messages.length > 0) return true;
  return false;
}

function normalizeRole(role?: string): ChatGptMessage['role'] {
  const r = (role ?? '').toLowerCase();
  if (r === 'user' || r === 'human') return 'user';
  if (r === 'assistant' || r === 'model' || r === 'chatgpt') return 'assistant';
  if (r === 'system') return 'system';
  if (r === 'tool') return 'tool';
  return 'assistant';
}

function extractMessageContent(content: unknown): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (typeof content !== 'object') return '';
  const c = content as { parts?: unknown[]; text?: string };
  if (Array.isArray(c.parts)) {
    return c.parts
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && 'text' in part) return String((part as { text?: string }).text ?? '');
        if (part && typeof part === 'object' && 'type' in part && (part as { type?: string }).type === 'image') return '[Image]';
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }
  if (c.text) return c.text;
  return '';
}

function findRootNode(mapping: Record<string, ChatGptNode>): string | null {
  const nodeIds = Object.keys(mapping);
  for (const id of nodeIds) {
    const node = mapping[id];
    if (!node) continue;
    if (!node.message || node.message.author?.role === 'system') {
      let isChild = false;
      for (const otherId of nodeIds) {
        if (mapping[otherId]?.children?.includes(id)) {
          isChild = true;
          break;
        }
      }
      if (!isChild) return id;
    }
  }
  return nodeIds[0] ?? null;
}

function traverseMapping(
  mapping: Record<string, ChatGptNode>,
  nodeId: string,
  out: ChatGptMessage[],
  visited = new Set<string>(),
): void {
  if (visited.has(nodeId)) return;
  visited.add(nodeId);
  const node = mapping[nodeId];
  if (!node) return;

  if (node.message) {
    const content = extractMessageContent(node.message.content);
    if (content.trim()) {
      out.push({
        role: normalizeRole(node.message.author?.role),
        content: content.trim(),
        timestamp: node.message.create_time,
      });
    }
  }

  for (const childId of node.children ?? []) {
    traverseMapping(mapping, childId, out, visited);
  }
}

function parseLegacyMessages(conv: ChatGptConversationRaw): ChatGptMessage[] {
  const out: ChatGptMessage[] = [];
  for (const m of conv.messages ?? []) {
    const raw = m.content;
    let content = '';
    if (typeof raw === 'string') content = raw;
    else if (raw && typeof raw === 'object' && Array.isArray(raw.parts)) {
      content = raw.parts.join('\n');
    }
    if (!content.trim()) continue;
    out.push({ role: normalizeRole(m.author?.role), content: content.trim() });
  }
  return out;
}

function parseConversationRaw(conv: ChatGptConversationRaw, index: number): ChatGptConversation {
  let messages: ChatGptMessage[] = [];

  if (conv.mapping && Object.keys(conv.mapping).length > 0) {
    const root = findRootNode(conv.mapping);
    if (root) traverseMapping(conv.mapping, root, messages);
    messages.sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
  } else {
    messages = parseLegacyMessages(conv);
  }

  const title = conv.title?.trim() || `Conversation ${index + 1}`;
  return {
    id: conv.conversation_id ?? `chatgpt-${index}-${title.slice(0, 24)}`,
    title,
    messages,
  };
}

export function parseChatGptExportJson(jsonText: string): ChatGptImportResult {
  const warnings: string[] = [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('Invalid JSON — not a ChatGPT export.');
  }

  if (!isLikelyChatGptExportJson(parsed)) {
    throw new Error('JSON does not look like a ChatGPT export (missing mapping/messages).');
  }

  const rawList: ChatGptConversationRaw[] = Array.isArray(parsed) ? parsed : [parsed as ChatGptConversationRaw];
  const conversations = rawList
    .map((c, i) => parseConversationRaw(c, i))
    .filter((c) => c.messages.length > 0);

  if (conversations.length === 0) {
    throw new Error('No messages found in ChatGPT export.');
  }

  const text = conversations
    .map((c) => {
      const body = formatConversationWithLabels(c.messages);
      return `# ${c.title}\n\n${body}`;
    })
    .join('\n\n---\n\n');

  if (conversations.length > 1) {
    warnings.push(`Merged ${conversations.length} conversations from export.`);
  }

  return { text, conversations, warnings };
}

async function extractJsonFromZip(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(file);
  const names = Object.keys(zip.files).filter((n) => !zip.files[n]!.dir);
  const preferred =
    names.find((n) => /conversations\.json$/i.test(n))
    ?? names.find((n) => n.toLowerCase().endsWith('.json'))
    ?? names[0];
  if (!preferred) throw new Error('ZIP archive contains no JSON files.');
  return zip.files[preferred]!.async('string');
}

export function isChatGptExportFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith('.json') || name.endsWith('.zip');
}

/** Parse ChatGPT export file (JSON or ZIP) into labeled text for segmentation + course pipeline. */
export async function importChatGptExportFile(file: File): Promise<ChatGptImportResult> {
  if (file.name.toLowerCase().endsWith('.zip')) {
    const jsonText = await extractJsonFromZip(file);
    return parseChatGptExportJson(jsonText);
  }
  const jsonText = await file.text();
  return parseChatGptExportJson(jsonText);
}
