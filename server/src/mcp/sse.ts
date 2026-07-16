/**
 * MCP Streamable-HTTP SSE helpers (MCP-01).
 * Emits JSON-RPC messages as `event: message` SSE frames.
 */
import type { Response } from 'express';
import type { JsonRpcResponse } from './types';

export function wantsMcpSse(req: { headers: Record<string, unknown>; body?: unknown }): boolean {
  const accept = String(req.headers.accept ?? '').toLowerCase();
  if (accept.includes('text/event-stream')) return true;
  const body = req.body as { params?: { _meta?: { progressToken?: unknown } } } | undefined;
  // Stream generate_quiz when client asks for streaming via params.arguments.stream
  const args = (req.body as { params?: { arguments?: { stream?: unknown }; name?: string } })?.params;
  if (args?.name === 'generate_quiz' && args.arguments?.stream === true) return true;
  if (body?.params?._meta?.progressToken != null) return true;
  return false;
}

export function beginMcpSse(res: Response): void {
  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();
}

export function writeMcpSseMessage(res: Response, payload: JsonRpcResponse | Record<string, unknown>): void {
  res.write(`event: message\ndata: ${JSON.stringify(payload)}\n\n`);
}

export function writeMcpSseProgress(
  res: Response,
  progressToken: string | number,
  progress: number,
  total?: number,
  message?: string,
): void {
  writeMcpSseMessage(res, {
    jsonrpc: '2.0',
    method: 'notifications/progress',
    params: {
      progressToken,
      progress,
      ...(total != null ? { total } : {}),
      ...(message ? { message } : {}),
    },
  });
}

export function endMcpSse(res: Response): void {
  res.write('event: done\ndata: {}\n\n');
  res.end();
}
