/**
 * MCP JSON-RPC 2.0 dispatcher. Pure and transport-agnostic so it can be unit
 * tested without HTTP. The Express router (router.ts) wires it to POST /mcp.
 */
import {
  JSONRPC_VERSION,
  JsonRpcErrorCode,
  LATEST_PROTOCOL_VERSION,
  SERVER_INFO,
  SUPPORTED_PROTOCOL_VERSIONS,
  jsonRpcError,
  jsonRpcResult,
  type JsonRpcResponse,
  type McpContext,
} from './types';
import { MCP_TOOL_MAP, listToolDescriptors } from './tools';
import { listResources, readResource, resourceTemplates } from './resources';
import { listPrompts, getPrompt } from './prompts';

interface ParsedMessage {
  jsonrpc?: unknown;
  id?: unknown;
  method?: unknown;
  params?: unknown;
}

function isNotification(msg: ParsedMessage): boolean {
  // A JSON-RPC notification has no `id`.
  return msg.id === undefined;
}

/**
 * Handle a single JSON-RPC message. Returns a response, or `null` for
 * notifications (which must not produce a response body).
 */
export async function handleJsonRpc(
  message: unknown,
  ctx: McpContext,
): Promise<JsonRpcResponse | null> {
  if (typeof message !== 'object' || message === null) {
    return jsonRpcError(null, JsonRpcErrorCode.InvalidRequest, 'Invalid Request');
  }
  const msg = message as ParsedMessage;
  const id = (typeof msg.id === 'string' || typeof msg.id === 'number' ? msg.id : null) as
    | string
    | number
    | null;

  if (msg.jsonrpc !== JSONRPC_VERSION || typeof msg.method !== 'string') {
    if (isNotification(msg)) return null;
    return jsonRpcError(id, JsonRpcErrorCode.InvalidRequest, 'Invalid Request');
  }

  const method = msg.method;
  const params = (typeof msg.params === 'object' && msg.params !== null ? msg.params : {}) as Record<
    string,
    unknown
  >;

  // Notifications: acknowledge without a response body.
  if (isNotification(msg)) {
    return null;
  }

  switch (method) {
    case 'initialize': {
      const requested = typeof params.protocolVersion === 'string' ? params.protocolVersion : '';
      const protocolVersion = (SUPPORTED_PROTOCOL_VERSIONS as readonly string[]).includes(requested)
        ? requested
        : LATEST_PROTOCOL_VERSION;
      return jsonRpcResult(id, {
        protocolVersion,
        capabilities: {
          tools: { listChanged: false },
          resources: { listChanged: false, subscribe: false },
          prompts: { listChanged: false },
        },
        serverInfo: SERVER_INFO,
        instructions:
          'Synapse Learning tools operate on the signed-in user\'s own courses, notes, RAG library and progress.',
      });
    }

    case 'ping':
      return jsonRpcResult(id, {});

    case 'tools/list':
      return jsonRpcResult(id, { tools: listToolDescriptors() });

    case 'resources/list':
      return jsonRpcResult(id, { resources: await listResources(ctx) });

    case 'resources/templates/list':
      return jsonRpcResult(id, { resourceTemplates: resourceTemplates() });

    case 'resources/read': {
      const uri = typeof params.uri === 'string' ? params.uri : '';
      if (!uri) return jsonRpcError(id, JsonRpcErrorCode.InvalidParams, 'uri is required');
      const contents = await readResource(ctx, uri);
      if ('error' in contents) {
        return jsonRpcError(id, JsonRpcErrorCode.InvalidParams, contents.error);
      }
      return jsonRpcResult(id, { contents: [contents] });
    }

    case 'prompts/list':
      return jsonRpcResult(id, { prompts: listPrompts() });

    case 'prompts/get': {
      const name = typeof params.name === 'string' ? params.name : '';
      const promptArgs = (typeof params.arguments === 'object' && params.arguments !== null
        ? params.arguments
        : {}) as Record<string, unknown>;
      const result = getPrompt(name, promptArgs, ctx);
      if ('error' in result) {
        return jsonRpcError(id, JsonRpcErrorCode.InvalidParams, result.error);
      }
      return jsonRpcResult(id, result);
    }

    case 'tools/call': {
      const name = typeof params.name === 'string' ? params.name : '';
      const args = (typeof params.arguments === 'object' && params.arguments !== null
        ? params.arguments
        : {}) as Record<string, unknown>;
      const tool = MCP_TOOL_MAP.get(name);
      if (!tool) {
        return jsonRpcError(id, JsonRpcErrorCode.InvalidParams, `Unknown tool: ${name}`);
      }
      try {
        const result = await tool.handler(args, ctx);
        return jsonRpcResult(id, result);
      } catch (err) {
        // Tool execution errors are reported in-band (isError), per MCP.
        return jsonRpcResult(id, {
          content: [
            { type: 'text', text: `Tool "${name}" failed: ${err instanceof Error ? err.message : 'unknown error'}` },
          ],
          isError: true,
        });
      }
    }

    default:
      return jsonRpcError(id, JsonRpcErrorCode.MethodNotFound, `Method not found: ${method}`);
  }
}

/**
 * Handle a JSON-RPC payload that may be a single message or a batch array.
 * Returns a single response, an array of responses, or `null` if every message
 * was a notification.
 */
export async function handleJsonRpcPayload(
  payload: unknown,
  ctx: McpContext,
): Promise<JsonRpcResponse | JsonRpcResponse[] | null> {
  if (Array.isArray(payload)) {
    if (payload.length === 0) {
      return jsonRpcError(null, JsonRpcErrorCode.InvalidRequest, 'Invalid Request');
    }
    const responses = (await Promise.all(payload.map((m) => handleJsonRpc(m, ctx)))).filter(
      (r): r is JsonRpcResponse => r !== null,
    );
    return responses.length > 0 ? responses : null;
  }
  return handleJsonRpc(payload, ctx);
}
