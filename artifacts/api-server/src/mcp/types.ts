/**
 * MCP (Model Context Protocol) JSON-RPC 2.0 message and result types.
 * Grounded in the MCP spec (2025-06-18) — only the subset Synapse implements.
 */

export const JSONRPC_VERSION = '2.0' as const;

/** Supported MCP protocol revisions; the newest is preferred on `initialize`. */
export const SUPPORTED_PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26'] as const;
export const LATEST_PROTOCOL_VERSION = SUPPORTED_PROTOCOL_VERSIONS[0];

export const SERVER_INFO = { name: 'synapse-learning', version: '1.0.0' } as const;

/** Standard JSON-RPC 2.0 error codes plus MCP conventions. */
export const JsonRpcErrorCode = {
  ParseError: -32700,
  InvalidRequest: -32600,
  MethodNotFound: -32601,
  InvalidParams: -32602,
  InternalError: -32603,
} as const;

export type JsonRpcId = string | number | null;

export interface JsonRpcRequest {
  jsonrpc: typeof JSONRPC_VERSION;
  id?: JsonRpcId;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcSuccess {
  jsonrpc: typeof JSONRPC_VERSION;
  id: JsonRpcId;
  result: unknown;
}

export interface JsonRpcError {
  jsonrpc: typeof JSONRPC_VERSION;
  id: JsonRpcId;
  error: { code: number; message: string; data?: unknown };
}

export type JsonRpcResponse = JsonRpcSuccess | JsonRpcError;

/** A single content block in a `tools/call` result. */
export interface McpTextContent {
  type: 'text';
  text: string;
}

export interface McpToolResult {
  content: McpTextContent[];
  /** Machine-readable payload mirroring the text block. */
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

/** Per-request context resolved from the authenticated account. */
export interface McpContext {
  /** Full authenticated account (used for usage metering on LLM-backed tools). */
  account: import('../store/accounts').Account;
}

export interface McpToolDefinition {
  name: string;
  description: string;
  /** JSON Schema for the tool arguments. */
  inputSchema: Record<string, unknown>;
  handler: (args: Record<string, unknown>, ctx: McpContext) => Promise<McpToolResult>;
}

export function jsonRpcResult(id: JsonRpcId, result: unknown): JsonRpcSuccess {
  return { jsonrpc: JSONRPC_VERSION, id, result };
}

export function jsonRpcError(
  id: JsonRpcId,
  code: number,
  message: string,
  data?: unknown,
): JsonRpcError {
  return { jsonrpc: JSONRPC_VERSION, id, error: { code, message, ...(data !== undefined ? { data } : {}) } };
}
